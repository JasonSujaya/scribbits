import type {
  PracticeBattleReport,
  PracticeBattleRequest,
} from '../../shared/arena';
import {
  analyze as analyzeDrawing,
  hasMinimumDrawingInk,
} from '../../shared/analyzer-core';
import { simulate } from './battle';
import { generateForecastForDay } from './forecast';
import { hashTextToSeed } from './random';
import {
  createScribbit,
  decodePngDataUrl,
  validateScribbitName,
} from './scribbit';
import { chooseFoundingSparOpponent } from './species';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import {
  ROLLOUT_OVERLAP_MILLISECONDS,
  ensureMigrationStartedAt,
  migrationWindowIsOpen,
} from './migrations';

const practiceRequestLimitPerMinute = 6;
const practiceRequestGuardTtlSeconds = 30;
const practiceRequestRateTtlSeconds = 120;
const legacyPracticeRequestGuardKey = 'guard:practice:active:v1';

export type PracticeRequestLease = Readonly<{
  playerId: string;
  token: string;
  legacyGuardWritten: boolean;
}>;

export type AcquirePracticeRequestResult =
  | Readonly<{ status: 'acquired'; lease: PracticeRequestLease }>
  | Readonly<{ status: 'busy' }>
  | Readonly<{ status: 'rate-limited' }>;

export const getPracticeRequestGuardKey = (playerId: string): string => {
  return `guard:practice:active:v2:${playerId}`;
};

export const getLegacyPracticeRequestGuardKey = (): string => {
  return legacyPracticeRequestGuardKey;
};

export const getPracticeRequestRateKey = (
  playerId: string,
  minute: number
): string => {
  return `guard:practice:rate:v1:${playerId}:${minute}`;
};

export const acquirePracticeRequest = async (
  storage: ArenaStorage,
  input: Readonly<{
    playerId: string;
    token: string;
    requestedAtMs: number;
  }>
): Promise<AcquirePracticeRequestResult> => {
  if (!storage.watch) {
    throw new Error('Practice request leases require transaction support.');
  }

  const minute = Math.floor(input.requestedAtMs / 60_000);
  const rateKey = getPracticeRequestRateKey(input.playerId, minute);
  const guardKey = getPracticeRequestGuardKey(input.playerId);
  const migrationStartedAtMs = await ensureMigrationStartedAt(
    storage,
    'practice-lease-v2',
    input.requestedAtMs
  );
  const shouldWriteLegacyGuard = migrationWindowIsOpen(
    migrationStartedAtMs,
    input.requestedAtMs,
    ROLLOUT_OVERLAP_MILLISECONDS
  );
  const shouldReadLegacyGuard = migrationWindowIsOpen(
    migrationStartedAtMs,
    input.requestedAtMs,
    ROLLOUT_OVERLAP_MILLISECONDS + practiceRequestGuardTtlSeconds * 1000
  );
  const lease: PracticeRequestLease = {
    playerId: input.playerId,
    token: input.token,
    legacyGuardWritten: shouldWriteLegacyGuard,
  };

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        rateKey,
        guardKey,
        ...(shouldReadLegacyGuard ? [legacyPracticeRequestGuardKey] : [])
      );
      const [storedRequestCount, activeToken, legacyActiveToken] =
        await Promise.all([
          storage.get(rateKey),
          storage.get(guardKey),
          shouldReadLegacyGuard
            ? storage.hGet(legacyPracticeRequestGuardKey, input.playerId)
            : Promise.resolve(undefined),
        ]);
      const requestCount = Number(storedRequestCount ?? '0');

      if (activeToken === input.token) {
        await transaction.unwatch();
        return { status: 'acquired', lease };
      }
      if (activeToken !== undefined || legacyActiveToken !== undefined) {
        await transaction.unwatch();
        return { status: 'busy' };
      }
      if (
        !Number.isFinite(requestCount) ||
        requestCount >= practiceRequestLimitPerMinute
      ) {
        await transaction.unwatch();
        return { status: 'rate-limited' };
      }

      await transaction.multi();
      await transaction.incrBy(rateKey, 1);
      await transaction.expire(rateKey, practiceRequestRateTtlSeconds);
      await transaction.set(guardKey, input.token);
      await transaction.expire(guardKey, practiceRequestGuardTtlSeconds);
      if (shouldWriteLegacyGuard) {
        await transaction.hSet(legacyPracticeRequestGuardKey, {
          [input.playerId]: input.token,
        });
        await transaction.expire(
          legacyPracticeRequestGuardKey,
          practiceRequestGuardTtlSeconds
        );
      }
      const result = await transaction.exec();
      const expectedResultCount = shouldWriteLegacyGuard ? 6 : 4;
      if (Array.isArray(result) && result.length >= expectedResultCount) {
        return { status: 'acquired', lease };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Practice request');
      if ((await storage.get(guardKey)) === input.token) {
        return { status: 'acquired', lease };
      }
      if ((await storage.get(guardKey)) !== undefined)
        return { status: 'busy' };
      throw error;
    }
  }

  throw new Error(
    'Practice request lease changed too often to acquire safely.'
  );
};

export const releasePracticeRequest = async (
  storage: ArenaStorage,
  lease: PracticeRequestLease
): Promise<'released' | 'not-owner'> => {
  if (!storage.watch) {
    throw new Error('Practice request leases require transaction support.');
  }
  const guardKey = getPracticeRequestGuardKey(lease.playerId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        guardKey,
        ...(lease.legacyGuardWritten ? [legacyPracticeRequestGuardKey] : [])
      );
      const [activeToken, legacyActiveToken] = await Promise.all([
        storage.get(guardKey),
        lease.legacyGuardWritten
          ? storage.hGet(legacyPracticeRequestGuardKey, lease.playerId)
          : Promise.resolve(undefined),
      ]);
      if (
        activeToken !== lease.token ||
        (lease.legacyGuardWritten && legacyActiveToken !== lease.token)
      ) {
        await transaction.unwatch();
        return 'not-owner';
      }
      await transaction.multi();
      await transaction.del(guardKey);
      if (lease.legacyGuardWritten) {
        await transaction.hDel(legacyPracticeRequestGuardKey, [lease.playerId]);
      }
      const result = await transaction.exec();
      const expectedResultCount = lease.legacyGuardWritten ? 2 : 1;
      if (Array.isArray(result) && result.length >= expectedResultCount) {
        return 'released';
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Practice request');
      const [activeToken, legacyActiveToken] = await Promise.all([
        storage.get(guardKey),
        lease.legacyGuardWritten
          ? storage.hGet(legacyPracticeRequestGuardKey, lease.playerId)
          : Promise.resolve(undefined),
      ]);
      if (
        activeToken === undefined &&
        (!lease.legacyGuardWritten || legacyActiveToken === undefined)
      ) {
        return 'released';
      }
      if (
        activeToken !== lease.token ||
        (lease.legacyGuardWritten && legacyActiveToken !== lease.token)
      ) {
        return 'not-owner';
      }
      continue;
    }
  }

  throw new Error(
    'Practice request lease changed too often to release safely.'
  );
};

export type CreatePracticeBattleInput = Readonly<{
  request: unknown;
  artist: string;
  playerId: string;
  canonicalDay: number;
  nonce: string;
}>;

export type CreatePracticeBattleResult =
  | { status: 'created'; report: PracticeBattleReport }
  | { status: 'invalid-request' }
  | { status: 'invalid-png' }
  | { status: 'too-small' };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parsePracticeBattleRequest = (
  request: unknown
): PracticeBattleRequest | undefined => {
  if (!isRecord(request)) return undefined;

  const fields = Object.keys(request);
  if (
    fields.length !== 2 ||
    !fields.includes('name') ||
    !fields.includes('baseImageDataUrl')
  ) {
    return undefined;
  }

  const name = validateScribbitName(request.name);
  if (!name || typeof request.baseImageDataUrl !== 'string') return undefined;

  return {
    name,
    baseImageDataUrl: request.baseImageDataUrl,
  };
};

export const createPracticeBattle = (
  input: CreatePracticeBattleInput
): CreatePracticeBattleResult => {
  const request = parsePracticeBattleRequest(input.request);
  if (!request) return { status: 'invalid-request' };

  const decodedDrawing = decodePngDataUrl(request.baseImageDataUrl);
  if (!decodedDrawing) return { status: 'invalid-png' };

  const drawingAnalysis = analyzeDrawing({
    data: decodedDrawing.rgba,
    width: decodedDrawing.width,
    height: decodedDrawing.height,
  });
  if (!hasMinimumDrawingInk(drawingAnalysis)) {
    return { status: 'too-small' };
  }

  const seedContext = JSON.stringify({
    playerId: input.playerId,
    day: input.canonicalDay,
    nonce: input.nonce,
    name: request.name,
    drawingFingerprint: hashTextToSeed(request.baseImageDataUrl),
  });
  const practiceScribbitIdSeed = hashTextToSeed(
    `practice-scribbit:${seedContext}`
  );

  // Zero-persistence boundary: this Scribbit exists only in the returned report.
  // The caller must never upload, store, reward, or progress it.
  const practiceScribbit = createScribbit({
    id: `practice-${input.canonicalDay}-${practiceScribbitIdSeed.toString(36)}`,
    draft: {
      name: request.name,
      stats: drawingAnalysis.stats,
      element: drawingAnalysis.element,
      accessories: [],
    },
    artist: input.artist,
    imageUrl: request.baseImageDataUrl,
    day: input.canonicalDay,
  });
  const opponentSeed = hashTextToSeed(`practice-opponent:${seedContext}`);
  const battleSeed = hashTextToSeed(`practice-battle:${seedContext}`);
  const opponent = chooseFoundingSparOpponent(practiceScribbit, opponentSeed);
  const forecast = generateForecastForDay(input.canonicalDay);

  const simulatedReport = simulate(
    practiceScribbit,
    opponent,
    battleSeed,
    forecast,
    'practice'
  );
  if (!simulatedReport.simulation) {
    throw new Error('Practice simulation did not produce a transcript.');
  }
  return {
    status: 'created',
    report: {
      id: simulatedReport.id,
      kind: 'practice',
      day: simulatedReport.day,
      a: simulatedReport.a,
      b: simulatedReport.b,
      winner: simulatedReport.winner,
      simulation: simulatedReport.simulation,
    },
  };
};
