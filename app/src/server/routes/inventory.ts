import type { Context as HonoContext, Handler } from 'hono';
import { randomUUID } from 'node:crypto';
import type {
  ArenaErrorResponse,
  CapsulePullResponse,
  EquipTitleRequest,
  Inventory,
  MergeGearResponse,
  Scribbit,
} from '../../shared/arena';
import type {
  DrawingInkRefillRequest,
  DrawingInkRefillResponse,
} from '../../shared/drawingink';
import {
  isEquipmentCategory,
  type EquipGearRequest,
} from '../../shared/equipment';
import { ensureCurrentArenaDay } from '../core/arenaStore';
import { getArenaDayNumber } from '../core/day';
import {
  claimCapsuleOperation,
  getCapsuleOperationKey,
  loadInventory,
  mergeGearForUser,
  pullCapsuleForUser,
  refillDrawingInkForUser,
  releaseCapsuleOperation,
  setEquippedTitle,
} from '../core/inkStore';
import { equipGearForScribbit, type CurrentPlayer } from '../core/scribbit';
import type { ArenaStorage } from '../core/storage';

const capsuleOperationPendingTimeoutMs = 15_000;
const scribbitIdPattern = /^[A-Za-z0-9:_-]{4,90}$/;

type InventoryRouteDependencies = Readonly<{
  storage: ArenaStorage;
  getCurrentPlayer: () => Promise<CurrentPlayer | undefined>;
  now?: () => Date;
  createSelectionEntropy?: () => string;
}>;

export type InventoryRouteHandlers = Readonly<{
  inventory: Handler;
  equipGear: Handler;
  equipTitle: Handler;
  mergeGear: Handler;
  refillDrawingInk: Handler;
  capsule: Handler;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readJsonBody = async (c: HonoContext): Promise<unknown> => {
  try {
    return (await c.req.json()) as unknown;
  } catch {
    return undefined;
  }
};

const errorResponse = (
  c: HonoContext,
  status: 400 | 401 | 402 | 404 | 409 | 500,
  code: ArenaErrorResponse['code'],
  message: string
) => c.json<ArenaErrorResponse>({ status: 'error', code, message }, status);

const badRequest = (c: HonoContext, message: string) =>
  errorResponse(c, 400, 'bad_request', message);
const unauthorized = (c: HonoContext, message: string) =>
  errorResponse(c, 401, 'unauthorized', message);
const paymentRequired = (c: HonoContext, message: string) =>
  errorResponse(c, 402, 'payment_required', message);
const notFound = (c: HonoContext, message: string) =>
  errorResponse(c, 404, 'not_found', message);
const conflict = (c: HonoContext, message: string) =>
  errorResponse(c, 409, 'conflict', message);
const serverError = (c: HonoContext, message: string) =>
  errorResponse(c, 500, 'server_error', message);

const readEquipGearRequest = (value: unknown): EquipGearRequest | undefined => {
  if (!isRecord(value)) return undefined;
  const fields = Object.keys(value);
  if (
    fields.length !== 4 ||
    !fields.includes('scribbitId') ||
    !fields.includes('category') ||
    !fields.includes('slotIndex') ||
    !fields.includes('gearId')
  ) {
    return undefined;
  }

  const scribbitId =
    typeof value.scribbitId === 'string' ? value.scribbitId.trim() : '';
  if (
    !scribbitIdPattern.test(scribbitId) ||
    !isEquipmentCategory(value.category) ||
    (value.slotIndex !== 0 && value.slotIndex !== 1) ||
    (value.gearId !== null && typeof value.gearId !== 'string')
  ) {
    return undefined;
  }

  const gearId =
    typeof value.gearId === 'string' ? value.gearId.trim() : value.gearId;
  if (gearId !== null && !/^[a-z0-9-]{2,64}$/.test(gearId)) {
    return undefined;
  }

  return {
    scribbitId,
    category: value.category,
    slotIndex: value.slotIndex,
    gearId,
  };
};

export const createInventoryRouteHandlers = ({
  storage,
  getCurrentPlayer,
  now = () => new Date(),
  createSelectionEntropy = randomUUID,
}: InventoryRouteDependencies): InventoryRouteHandlers => {
  const inventory: Handler = async (c) => {
    const player = await getCurrentPlayer();
    if (!player) {
      return c.json<Inventory>({
        items: {},
        gear: {},
        pens: [],
        titles: [],
        equippedTitle: null,
        discovered: [],
      });
    }
    try {
      return c.json<Inventory>(await loadInventory(storage, player.userId));
    } catch (error) {
      console.error('Inventory route failed:', error);
      return serverError(c, 'The ink drawer is stuck. Try again soon.');
    }
  };

  const equipGear: Handler = async (c) => {
    const player = await getCurrentPlayer();
    if (!player) return unauthorized(c, 'Sign in to equip Gear.');
    const request = readEquipGearRequest(await readJsonBody(c));
    if (!request) {
      return badRequest(c, 'Choose a valid living Scribbit and Gear slot.');
    }
    try {
      const result = await equipGearForScribbit(
        storage,
        player.userId,
        request
      );
      if (
        result.status === 'scribbit-unavailable' ||
        result.status === 'not-owned'
      ) {
        return notFound(c, 'That Scribbit is not in your active roster.');
      }
      if (result.status === 'invalid-gear') {
        return badRequest(c, 'Choose Gear that matches that slot category.');
      }
      if (result.status === 'gear-undiscovered') {
        return badRequest(c, 'Discover that Gear before equipping it.');
      }
      return c.json<Scribbit>(result.scribbit);
    } catch (error) {
      console.error('Equip Gear route failed:', error);
      return serverError(c, 'The Gear rack jammed. Try again soon.');
    }
  };

  const equipTitle: Handler = async (c) => {
    const player = await getCurrentPlayer();
    if (!player) return unauthorized(c, 'Sign in to wear a creator title.');
    const body = await readJsonBody(c);
    if (
      !isRecord(body) ||
      (body.titleId !== null && typeof body.titleId !== 'string')
    ) {
      return badRequest(
        c,
        'Choose an owned title or remove your current title.'
      );
    }
    const request: EquipTitleRequest = {
      titleId:
        typeof body.titleId === 'string' ? body.titleId.trim() : body.titleId,
    };
    if (
      request.titleId !== null &&
      !/^[a-z0-9-]{2,64}$/.test(request.titleId)
    ) {
      return badRequest(c, 'Choose a valid creator title.');
    }
    try {
      const nextInventory = await setEquippedTitle(
        storage,
        player.userId,
        request.titleId
      );
      if (!nextInventory) {
        return badRequest(c, 'Discover that title before wearing it.');
      }
      return c.json<Inventory>(nextInventory);
    } catch (error) {
      console.error('Equip title route failed:', error);
      return serverError(c, 'The title ribbon slipped. Try again soon.');
    }
  };

  const mergeGear: Handler = async (c) => {
    const player = await getCurrentPlayer();
    if (!player) return unauthorized(c, 'Sign in to forge your Gear.');
    const body = await readJsonBody(c);
    const operationId =
      isRecord(body) && typeof body.operationId === 'string'
        ? body.operationId.trim()
        : '';
    const gearId =
      isRecord(body) && typeof body.gearId === 'string'
        ? body.gearId.trim()
        : '';
    if (!/^[A-Za-z0-9-]{16,80}$/.test(operationId)) {
      return badRequest(c, 'Forge Gear with a valid operation id.');
    }
    if (!/^[a-z0-9-]{2,64}$/.test(gearId)) {
      return badRequest(c, 'Choose valid Gear to forge.');
    }
    try {
      const result = await mergeGearForUser(
        storage,
        player.userId,
        gearId,
        operationId
      );
      if (result.status === 'invalid') {
        return badRequest(c, 'Discover that Gear before forging it.');
      }
      if (result.status === 'insufficientCopies') {
        return conflict(c, 'You need three copies to forge this Gear.');
      }
      if (result.status === 'maxRank') {
        return conflict(c, 'That Gear is already at max rank.');
      }
      if (result.status === 'operationConflict') {
        return conflict(c, 'That forge operation was already used.');
      }
      return c.json<MergeGearResponse>(result.response);
    } catch (error) {
      console.error('Merge gear route failed:', error);
      return serverError(c, 'The Gear forge jammed. Try again soon.');
    }
  };

  const refillDrawingInk: Handler = async (c) => {
    const player = await getCurrentPlayer();
    if (!player) return unauthorized(c, 'Sign in to refill special colors.');
    const body = await readJsonBody(c);
    const itemId =
      isRecord(body) && typeof body.itemId === 'string'
        ? body.itemId.trim()
        : '';
    const operationId =
      isRecord(body) && typeof body.operationId === 'string'
        ? body.operationId.trim()
        : '';
    if (
      !/^[a-z0-9-]{3,80}$/.test(itemId) ||
      !/^[A-Za-z0-9-]{16,80}$/.test(operationId)
    ) {
      return badRequest(c, 'Refill a valid special color.');
    }
    const request: DrawingInkRefillRequest = { itemId, operationId };
    try {
      const result = await refillDrawingInkForUser(
        storage,
        player.userId,
        request.itemId,
        request.operationId
      );
      if (result.status === 'invalid') {
        return badRequest(c, 'Discover that special color before refilling it.');
      }
      if (result.status === 'operationConflict') {
        return conflict(c, 'That refill operation was already used.');
      }
      if (result.status === 'insufficientInk') {
        return paymentRequired(
          c,
          `You need ${result.cost} Ink to add one use.`
        );
      }
      return c.json<DrawingInkRefillResponse>(result.response);
    } catch (error) {
      console.error('Drawing Ink refill route failed:', error);
      return serverError(c, 'The color refill jammed. Try again soon.');
    }
  };

  const capsule: Handler = async (c) => {
    const player = await getCurrentPlayer();
    if (!player) {
      return unauthorized(c, 'Sign in to open a Mystery Ink capsule.');
    }
    const request = await readJsonBody(c);
    const operationId =
      isRecord(request) && typeof request.operationId === 'string'
        ? request.operationId.trim()
        : '';
    if (!/^[A-Za-z0-9-]{16,80}$/.test(operationId)) {
      return badRequest(c, 'Open the capsule with a valid operation id.');
    }
    const operationKey = getCapsuleOperationKey(player.userId, operationId);
    try {
      const currentDate = now();
      const storedDay = await ensureCurrentArenaDay(storage, currentDate);
      if (storedDay < getArenaDayNumber(currentDate)) {
        return conflict(c, 'The Rumble is resolving. Try again in a moment.');
      }
      const operationClaim = await claimCapsuleOperation(
        storage,
        operationKey,
        currentDate.getTime(),
        capsuleOperationPendingTimeoutMs
      );
      if (operationClaim.status === 'pending') {
        return conflict(
          c,
          'That capsule is already opening. Try again in a moment.'
        );
      }
      if (operationClaim.status === 'completed') {
        return c.json<CapsulePullResponse>(operationClaim.response);
      }
      const result = await pullCapsuleForUser(
        storage,
        player.userId,
        storedDay,
        {
          operationKey,
          expectedPendingValue: operationClaim.pendingValue,
          selectionEntropy: createSelectionEntropy(),
        }
      );
      if (result.status === 'insufficientInk') {
        await releaseCapsuleOperation(
          storage,
          operationKey,
          operationClaim.pendingValue
        );
        return paymentRequired(
          c,
          `You need ${result.cost} Mystery Ink to open a capsule.`
        );
      }
      const response: CapsulePullResponse = {
        pull: result.pull,
        ink: result.ink,
        inventory: result.inventory,
        nextCost: result.nextCost,
        progress: result.progress,
      };
      return c.json<CapsulePullResponse>(response);
    } catch (error) {
      // Do not release an indeterminate claim here. A failure before commit must
      // age out, while a lost reply after commit is recovered from the atomic
      // operation receipt on the client's retry.
      console.error('Capsule route failed:', error);
      return serverError(c, 'The capsule machine jammed. Try again soon.');
    }
  };

  return Object.freeze({
    inventory,
    equipGear,
    equipTitle,
    mergeGear,
    refillDrawingInk,
    capsule,
  });
};
