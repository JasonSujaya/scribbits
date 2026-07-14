import {
  createDeterministicPowerUpOffer,
  isPowerUpId,
  POWER_UP_OFFER_SOURCES,
  validatePowerUpBuild,
  type ChoosePowerUpRequest,
  type ChoosePowerUpResponse,
  type PowerUpId,
  type PowerUpOffer,
  type PowerUpOfferSource,
} from '../../shared/combat/powerups';
import type { Scribbit } from '../../shared/arena';
import {
  getScribbitKey,
  parseScribbit,
  serializeScribbit,
} from './scribbit';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
  type ArenaStorage,
  type ArenaTransaction,
} from './storage';

const offerTtlSeconds = 8 * 24 * 60 * 60;

export const getPowerUpOfferKey = (
  userId: string,
  scribbitId: string
): string => `user:${userId}:scribbit:${scribbitId}:power-up-offer`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  }>
): Promise<PowerUpOffer | null> => {
  if (!storage.watch || input.scribbit.status !== 'alive') return null;
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
      const choices = createDeterministicPowerUpOffer({
        seed: `power-up-offer:v1:${input.reportId}:${input.scribbit.id}`,
        source: input.source,
        ownedPowerUpIds: input.scribbit.powerUpIds ?? [],
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
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(offerKey, scribbitKey);
      const [storedOffer, storedScribbit] = await Promise.all([
        storage.get(offerKey),
        storage.get(scribbitKey),
      ]);
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
      await transaction.multi();
      await transaction.set(scribbitKey, serializeScribbit(nextScribbit));
      await transaction.del(offerKey);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length === 2) {
        return Object.freeze({
          scribbitId: scribbit.id,
          selectedId: input.request.selectedId,
          powerUpIds: Object.freeze(nextPowerUpIds),
        });
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Power-Up claim');
      if (attempt === MAX_WATCH_TRANSACTION_ATTEMPTS - 1) throw error;
    }
  }
  return null;
};
