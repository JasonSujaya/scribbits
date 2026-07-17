import {
  createDeterministicPowerUpOffer,
  isPowerUpId,
  MAXIMUM_GROWING_POWER_UPS,
  MAXIMUM_POWER_UPS,
  POWER_UP_OFFER_SOURCES,
  validatePowerUpBuild,
  type ChoosePowerUpRequest,
  type ChoosePowerUpResponse,
  type PowerUpId,
  type PowerUpOffer,
  type PowerUpOfferSource,
} from '../../shared/combat/powerups';
import type { Scribbit } from '../../shared/arena';
import { selectCombatRole } from '../../shared/combat/selection';
import { resolveGearCombatLoadout } from '../../shared/gearcombat';
import { getScribbitKey, parseScribbit, serializeScribbit } from './scribbit';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
  type ArenaStorage,
  type ArenaTransaction,
} from './storage';

const offerTtlSeconds = 8 * 24 * 60 * 60;
const claimReceiptTtlSeconds = offerTtlSeconds;

export const getPowerUpOfferKey = (
  userId: string,
  scribbitId: string
): string => `user:${userId}:scribbit:${scribbitId}:power-up-offer`;

export const getPowerUpDiscoveriesKey = (userId: string): string =>
  `user:${userId}:power-up-discoveries`;

export const getPowerUpClaimReceiptsKey = (
  userId: string,
  scribbitId: string
): string => `user:${userId}:scribbit:${scribbitId}:power-up-claim-receipts`;

const POWER_UP_DISCOVERIES_SCHEMA_VERSION = 1;

export type StoredPowerUpDiscoveries =
  | Readonly<{ status: 'missing' }>
  | Readonly<{
      status: 'valid';
      storedIds: readonly string[];
      recognizedIds: readonly PowerUpId[];
      needsMigration: boolean;
    }>
  | Readonly<{ status: 'invalid' }>
  | Readonly<{ status: 'unsupported'; schemaVersion: number }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parsePowerUpDiscoveries = (
  storedValue: string | undefined
): StoredPowerUpDiscoveries => {
  if (storedValue === undefined) return Object.freeze({ status: 'missing' });
  try {
    const value: unknown = JSON.parse(storedValue);
    let candidateIds: unknown;
    let needsMigration = false;
    if (Array.isArray(value)) {
      candidateIds = value;
      needsMigration = true;
    } else {
      if (
        !isRecord(value) ||
        typeof value.schemaVersion !== 'number' ||
        !Number.isSafeInteger(value.schemaVersion)
      ) {
        return Object.freeze({ status: 'invalid' });
      }
      if (value.schemaVersion !== POWER_UP_DISCOVERIES_SCHEMA_VERSION) {
        return Object.freeze({
          status: 'unsupported',
          schemaVersion: value.schemaVersion,
        });
      }
      candidateIds = value.ids;
    }
    if (
      !Array.isArray(candidateIds) ||
      candidateIds.some((candidate) => typeof candidate !== 'string')
    ) {
      return Object.freeze({ status: 'invalid' });
    }
    const storedIds = Object.freeze([...new Set(candidateIds)]);
    const recognizedIds = Object.freeze(storedIds.filter(isPowerUpId));
    return Object.freeze({
      status: 'valid',
      storedIds,
      recognizedIds,
      needsMigration,
    });
  } catch {
    return Object.freeze({ status: 'invalid' });
  }
};

const serializePowerUpDiscoveries = (storedIds: readonly string[]): string =>
  JSON.stringify({
    schemaVersion: POWER_UP_DISCOVERIES_SCHEMA_VERSION,
    ids: [...new Set(storedIds)],
  });

type PowerUpClaimReceipt = Readonly<{
  schemaVersion: 1;
  offerId: string;
  selectedId: PowerUpId;
  expectedPowerUpCount: number;
  response: ChoosePowerUpResponse;
}>;

const parsePowerUpClaimReceipt = (
  storedValue: string | undefined
): PowerUpClaimReceipt | null => {
  if (storedValue === undefined) return null;
  try {
    const value: unknown = JSON.parse(storedValue);
    if (
      !isRecord(value) ||
      value.schemaVersion !== 1 ||
      typeof value.offerId !== 'string' ||
      !isPowerUpId(value.selectedId) ||
      !Number.isSafeInteger(value.expectedPowerUpCount) ||
      Number(value.expectedPowerUpCount) < 0 ||
      !isRecord(value.response) ||
      typeof value.response.scribbitId !== 'string' ||
      value.response.selectedId !== value.selectedId ||
      !Array.isArray(value.response.powerUpIds) ||
      !validatePowerUpBuild(value.response.powerUpIds).valid ||
      !Array.isArray(value.response.discoveredPowerUpIds) ||
      value.response.discoveredPowerUpIds.some(
        (powerUpId) => !isPowerUpId(powerUpId)
      ) ||
      value.response.powerUpIds.length !==
        Number(value.expectedPowerUpCount) + 1 ||
      value.response.powerUpIds.at(-1) !== value.selectedId ||
      !value.response.discoveredPowerUpIds.includes(value.selectedId) ||
      new Set(value.response.discoveredPowerUpIds).size !==
        value.response.discoveredPowerUpIds.length
    ) {
      return null;
    }
    const response: ChoosePowerUpResponse = Object.freeze({
      scribbitId: value.response.scribbitId,
      selectedId: value.selectedId,
      powerUpIds: Object.freeze([...value.response.powerUpIds]),
      discoveredPowerUpIds: Object.freeze([
        ...value.response.discoveredPowerUpIds,
      ]),
    });
    return Object.freeze({
      schemaVersion: 1,
      offerId: value.offerId,
      selectedId: value.selectedId,
      expectedPowerUpCount: Number(value.expectedPowerUpCount),
      response,
    });
  } catch {
    return null;
  }
};

const receiptMatchesRequest = (
  receipt: PowerUpClaimReceipt,
  request: ChoosePowerUpRequest,
  scribbitId: string
): boolean =>
  receipt.offerId === request.offerId &&
  receipt.selectedId === request.selectedId &&
  receipt.expectedPowerUpCount === request.expectedPowerUpCount &&
  receipt.response.scribbitId === scribbitId;

export const loadPowerUpDiscoveries = async (
  storage: ArenaStorage,
  userId: string
): Promise<readonly PowerUpId[]> => {
  const storedValue = await storage.get(getPowerUpDiscoveriesKey(userId));
  const parsed = parsePowerUpDiscoveries(storedValue);
  if (parsed.status === 'missing') return Object.freeze([]);
  if (parsed.status === 'valid') return parsed.recognizedIds;
  throw new Error(
    parsed.status === 'unsupported'
      ? `Power-Up discoveries use unsupported schema ${parsed.schemaVersion}.`
      : 'Stored Power-Up discoveries are invalid and were preserved.'
  );
};

const isPowerUpOfferSource = (value: unknown): value is PowerUpOfferSource =>
  typeof value === 'string' &&
  POWER_UP_OFFER_SOURCES.some((source) => source === value);

export const parsePowerUpOffer = (
  storedValue: string | undefined
): PowerUpOffer | null => {
  if (storedValue === undefined) return null;
  try {
    const value: unknown = JSON.parse(storedValue);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      typeof value.id !== 'string' ||
      typeof value.scribbitId !== 'string' ||
      typeof value.sourceReportId !== 'string' ||
      !isPowerUpOfferSource(value.source) ||
      !Array.isArray(value.choices) ||
      value.choices.length !== 3 ||
      value.choices.some((choice) => !isPowerUpId(choice)) ||
      new Set(value.choices).size !== 3 ||
      !Number.isSafeInteger(value.createdAtMs) ||
      Number(value.createdAtMs) < 0
    ) {
      return null;
    }
    const [first, second, third] = value.choices as PowerUpId[];
    if (!first || !second || !third) return null;
    return Object.freeze({
      version: 1,
      id: value.id,
      scribbitId: value.scribbitId,
      sourceReportId: value.sourceReportId,
      source: value.source,
      choices: Object.freeze([first, second, third] as const),
      createdAtMs: Number(value.createdAtMs),
    });
  } catch {
    return null;
  }
};

export const loadPendingPowerUpOffer = async (
  storage: ArenaStorage,
  userId: string,
  scribbitId: string
): Promise<PowerUpOffer | null> =>
  parsePowerUpOffer(await storage.get(getPowerUpOfferKey(userId, scribbitId)));

export const getOrCreatePowerUpOffer = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    scribbit: Scribbit;
    reportId: string;
    source: PowerUpOfferSource;
    createdAtMs: number;
    currentArenaDay: number;
  }>
): Promise<PowerUpOffer | null> => {
  if (
    !storage.watch ||
    input.scribbit.status !== 'alive' ||
    !Number.isSafeInteger(input.currentArenaDay) ||
    input.currentArenaDay < input.scribbit.bornDay
  ) {
    return null;
  }
  const offerKey = getPowerUpOfferKey(input.userId, input.scribbit.id);
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(offerKey);
      const storedOffer = await storage.get(offerKey);
      if (storedOffer !== undefined) {
        await transaction.unwatch();
        return parsePowerUpOffer(storedOffer);
      }
      const resolvedGear = resolveGearCombatLoadout(input.scribbit);
      const gearFamilies = [
        ...new Set(
          resolvedGear.techniques.flatMap((technique) => [
            technique.effectFamily,
            ...(technique.supportEffectFamily
              ? [technique.supportEffectFamily]
              : []),
          ])
        ),
      ];
      const choices = createDeterministicPowerUpOffer({
        seed: `power-up-offer:v1:${input.reportId}:${input.scribbit.id}`,
        source: input.source,
        ownedPowerUpIds: input.scribbit.powerUpIds ?? [],
        combatRole: selectCombatRole(input.scribbit.stats),
        gearFamilies,
        maxPowerUps:
          input.currentArenaDay < input.scribbit.expiresDay
            ? MAXIMUM_GROWING_POWER_UPS
            : MAXIMUM_POWER_UPS,
      });
      if (!choices || choices.length !== 3) {
        await transaction.unwatch();
        return null;
      }
      const [first, second, third] = choices;
      if (!first || !second || !third) {
        await transaction.unwatch();
        return null;
      }
      const offer: PowerUpOffer = Object.freeze({
        version: 1,
        id: `power-up-offer:v1:${input.reportId}:${input.scribbit.id}`,
        scribbitId: input.scribbit.id,
        sourceReportId: input.reportId,
        source: input.source,
        choices: Object.freeze([first, second, third] as const),
        createdAtMs: Math.max(0, Math.floor(input.createdAtMs)),
      });
      await transaction.multi();
      await transaction.set(offerKey, JSON.stringify(offer));
      await transaction.expire(offerKey, offerTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length === 2) return offer;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Power-Up offer creation');
      const committed = await loadPendingPowerUpOffer(
        storage,
        input.userId,
        input.scribbit.id
      );
      if (committed) return committed;
      if (attempt === MAX_WATCH_TRANSACTION_ATTEMPTS - 1) throw error;
    }
  }
  return null;
};

export const claimPowerUpOffer = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    scribbitId: string;
    request: ChoosePowerUpRequest;
  }>
): Promise<ChoosePowerUpResponse | null> => {
  if (!storage.watch) throw new Error('Power-Up claims require transactions.');
  const offerKey = getPowerUpOfferKey(input.userId, input.scribbitId);
  const scribbitKey = getScribbitKey(input.scribbitId);
  const discoveriesKey = getPowerUpDiscoveriesKey(input.userId);
  const receiptsKey = getPowerUpClaimReceiptsKey(
    input.userId,
    input.scribbitId
  );
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        offerKey,
        scribbitKey,
        discoveriesKey,
        receiptsKey
      );
      const [storedOffer, storedScribbit, storedDiscoveries, storedReceipt] =
        await Promise.all([
          storage.get(offerKey),
          storage.get(scribbitKey),
          storage.get(discoveriesKey),
          storage.hGet(receiptsKey, input.request.offerId),
        ]);
      const receipt = parsePowerUpClaimReceipt(storedReceipt);
      if (storedReceipt !== undefined) {
        await transaction.unwatch();
        if (!receipt) {
          throw new Error('Stored Power-Up claim receipt is invalid.');
        }
        return receiptMatchesRequest(receipt, input.request, input.scribbitId)
          ? receipt.response
          : null;
      }
      const offer = parsePowerUpOffer(storedOffer);
      const scribbit = parseScribbit(storedScribbit);
      const ownedPowerUpIds = scribbit?.powerUpIds ?? [];
      if (
        !offer ||
        !scribbit ||
        scribbit.status !== 'alive' ||
        offer.scribbitId !== input.scribbitId ||
        offer.id !== input.request.offerId ||
        !offer.choices.includes(input.request.selectedId) ||
        ownedPowerUpIds.length !== input.request.expectedPowerUpCount
      ) {
        await transaction.unwatch();
        return null;
      }
      const nextPowerUpIds = [...ownedPowerUpIds, input.request.selectedId];
      if (!validatePowerUpBuild(nextPowerUpIds).valid) {
        await transaction.unwatch();
        return null;
      }
      const nextScribbit: Scribbit = {
        ...scribbit,
        powerUpIds: nextPowerUpIds,
      };
      const parsedDiscoveries = parsePowerUpDiscoveries(storedDiscoveries);
      if (
        parsedDiscoveries.status === 'invalid' ||
        parsedDiscoveries.status === 'unsupported'
      ) {
        await transaction.unwatch();
        throw new Error(
          'Stored Power-Up discoveries are unreadable and were preserved.'
        );
      }
      const storedDiscoveryIds =
        parsedDiscoveries.status === 'valid' ? parsedDiscoveries.storedIds : [];
      const nextStoredDiscoveryIds = [
        ...new Set([...storedDiscoveryIds, input.request.selectedId]),
      ];
      const discoveredPowerUpIds = nextStoredDiscoveryIds.filter(isPowerUpId);
      const response: ChoosePowerUpResponse = Object.freeze({
        scribbitId: scribbit.id,
        selectedId: input.request.selectedId,
        powerUpIds: Object.freeze(nextPowerUpIds),
        discoveredPowerUpIds: Object.freeze(discoveredPowerUpIds),
      });
      const claimReceipt: PowerUpClaimReceipt = Object.freeze({
        schemaVersion: 1,
        offerId: offer.id,
        selectedId: input.request.selectedId,
        expectedPowerUpCount: input.request.expectedPowerUpCount,
        response,
      });
      await transaction.multi();
      await transaction.set(scribbitKey, serializeScribbit(nextScribbit));
      await transaction.del(offerKey);
      await transaction.set(
        discoveriesKey,
        serializePowerUpDiscoveries(nextStoredDiscoveryIds)
      );
      await transaction.hSet(receiptsKey, {
        [offer.id]: JSON.stringify(claimReceipt),
      });
      await transaction.expire(receiptsKey, claimReceiptTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length === 5) {
        return response;
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Power-Up claim');
      const committedReceipt = parsePowerUpClaimReceipt(
        await storage.hGet(receiptsKey, input.request.offerId)
      );
      if (
        committedReceipt &&
        receiptMatchesRequest(committedReceipt, input.request, input.scribbitId)
      ) {
        return committedReceipt.response;
      }
      if (attempt === MAX_WATCH_TRANSACTION_ATTEMPTS - 1) throw error;
    }
  }
  return null;
};
