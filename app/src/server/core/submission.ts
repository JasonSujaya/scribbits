import { MAX_ALIVE_PER_USER, type Scribbit } from '../../shared/arena';
import {
  getActiveScribbitSubmissionsKey,
  getCurrentArenaDayKey,
  getNightlyResolutionClaimsKey,
} from './arenaStore';
import { formatUtcDateKey } from './day';
import {
  findUnavailableAccessory,
  getInkKey,
  getInventoryDiscoveryField,
  getInventoryKey,
  planRequiredAccessoryCounts,
} from './inkStore';
import {
  DAILY_FLAG_TTL_SECONDS,
  getDailyFlagsKey,
  getExpiringScribbitsKey,
  getRumbleKey,
  getScribbitKey,
  getScribbitOwnerKey,
  getUserAliveScribbitsKey,
  getUserScribbitsKey,
  queueStoredScribbit,
} from './scribbit';
import {
  advancePlayStreak,
  getUserPlayStreakKey,
  parsePlayStreak,
} from './streak';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';

export type ScribbitSubmissionCommitResult =
  | Readonly<{ status: 'committed'; recovered: boolean }>
  | Readonly<{ status: 'rollover' }>
  | Readonly<{ status: 'already-drawn' }>
  | Readonly<{ status: 'already-entered' }>
  | Readonly<{ status: 'alive-limit' }>
  | Readonly<{ status: 'id-collision' }>
  | Readonly<{ status: 'invalid-accessory'; accessoryId: string }>
  | Readonly<{ status: 'insufficient-accessory'; accessoryId: string }>;

export type ScribbitSubmissionCommitInput = Readonly<{
  userId: string;
  scribbit: Scribbit;
  currentDate: Date;
  accessoryIds: string[];
  rumbleScore: number;
  inkAward: number;
}>;

type ExpectedSubmissionState = Readonly<{
  inkBalance: number;
  accessoryCounts: ReadonlyMap<string, number>;
  currentDateKey: string;
  streakDays: number;
}>;

type StorageTypeExpectation = readonly [key: string, type: string];

const activeSubmissionLeaseMilliseconds = 5 * 60 * 1000;
const activeSubmissionKeyTtlSeconds = 10 * 60;

const isStoredNonNegativeSafeInteger = (
  storedValue: string | undefined
): boolean => {
  if (storedValue === undefined) return true;
  const value = Number(storedValue);
  return Number.isSafeInteger(value) && value >= 0;
};

const assertStorageTypes = async (
  storage: ArenaStorage,
  expectations: readonly StorageTypeExpectation[]
): Promise<void> => {
  if (!storage.type) {
    throw new Error('Atomic Scribbit submission requires Redis type checks.');
  }

  const storedTypes = await Promise.all(
    expectations.map(([key]) => storage.type!(key))
  );
  for (let index = 0; index < expectations.length; index += 1) {
    const expectedType = expectations[index]?.[1];
    const storedType = storedTypes[index];
    if (storedType !== 'none' && storedType !== expectedType) {
      throw new Error(
        `Scribbit submission found ${storedType ?? 'unknown'} data where ${expectedType ?? 'valid'} data was required.`
      );
    }
  }
};

const acquireActiveSubmission = async (
  storage: ArenaStorage,
  input: ScribbitSubmissionCommitInput
): Promise<'acquired' | 'rollover'> => {
  const currentArenaDayKey = getCurrentArenaDayKey();
  const resolutionClaimsKey = getNightlyResolutionClaimsKey();
  const activeSubmissionsKey = getActiveScribbitSubmissionsKey(
    input.scribbit.bornDay
  );
  const leaseExpiresAt = Date.now() + activeSubmissionLeaseMilliseconds;
  const typeExpectations = [
    [currentArenaDayKey, 'string'],
    [resolutionClaimsKey, 'hash'],
    [activeSubmissionsKey, 'zset'],
  ] as const satisfies readonly StorageTypeExpectation[];

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch!(
        currentArenaDayKey,
        resolutionClaimsKey,
        activeSubmissionsKey
      );
      await assertStorageTypes(storage, typeExpectations);
      const [storedDay, activeResolutionClaim] = await Promise.all([
        storage.get(currentArenaDayKey),
        storage.hGet(resolutionClaimsKey, input.scribbit.bornDay.toString()),
      ]);
      if (
        storedDay !== input.scribbit.bornDay.toString() ||
        activeResolutionClaim !== undefined
      ) {
        await transaction.unwatch();
        return 'rollover';
      }

      await transaction.multi();
      await transaction.zAdd(activeSubmissionsKey, {
        member: input.scribbit.id,
        score: leaseExpiresAt,
      });
      await transaction.expire(
        activeSubmissionsKey,
        activeSubmissionKeyTtlSeconds
      );
      const result = await transaction.exec();
      if (
        Array.isArray(result) &&
        result.length > 0 &&
        (await storage.zScore(activeSubmissionsKey, input.scribbit.id)) ===
          leaseExpiresAt
      ) {
        return 'acquired';
      }
    } catch (error) {
      await discardWatchedTransaction(
        transaction,
        'Active Scribbit submission'
      );
      if (
        (await storage.zScore(activeSubmissionsKey, input.scribbit.id)) ===
        leaseExpiresAt
      ) {
        return 'acquired';
      }
      throw error;
    }
  }

  throw new Error('Active Scribbit submission changed too often to register.');
};

const releaseActiveSubmission = async (
  storage: ArenaStorage,
  input: ScribbitSubmissionCommitInput
): Promise<void> => {
  const activeSubmissionsKey = getActiveScribbitSubmissionsKey(
    input.scribbit.bornDay
  );
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await storage.zRem(activeSubmissionsKey, [input.scribbit.id]);
      if (
        (await storage.zScore(activeSubmissionsKey, input.scribbit.id)) ===
        undefined
      ) {
        return;
      }
    } catch (error) {
      if (
        (await storage.zScore(activeSubmissionsKey, input.scribbit.id)) ===
        undefined
      ) {
        return;
      }
      if (attempt === MAX_WATCH_TRANSACTION_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error('Active Scribbit submission could not be released.');
};

const submissionWasCommitted = async (
  storage: ArenaStorage,
  input: ScribbitSubmissionCommitInput,
  expected: ExpectedSubmissionState
): Promise<boolean> => {
  const scribbit = input.scribbit;
  const [
    storedJson,
    ownerUserId,
    dailyFlags,
    userScore,
    aliveScore,
    expiryScore,
    rumbleScore,
    inkBalance,
    inventory,
    streak,
  ] = await Promise.all([
    storage.get(getScribbitKey(scribbit.id)),
    storage.get(getScribbitOwnerKey(scribbit.id)),
    storage.hGetAll(getDailyFlagsKey(input.userId, scribbit.bornDay)),
    storage.zScore(getUserScribbitsKey(input.userId), scribbit.id),
    storage.zScore(getUserAliveScribbitsKey(input.userId), scribbit.id),
    storage.zScore(getExpiringScribbitsKey(), scribbit.id),
    storage.zScore(getRumbleKey(scribbit.bornDay), scribbit.id),
    storage.get(getInkKey(input.userId)),
    storage.hGetAll(getInventoryKey(input.userId)),
    storage.hGetAll(getUserPlayStreakKey(input.userId)),
  ]);

  if (
    storedJson !== JSON.stringify(scribbit) ||
    ownerUserId !== input.userId ||
    dailyFlags.drawn !== '1' ||
    dailyFlags.entered !== '1' ||
    userScore !== scribbit.bornDay ||
    aliveScore !== scribbit.bornDay ||
    expiryScore !== scribbit.expiresDay ||
    rumbleScore !== input.rumbleScore ||
    inkBalance !== expected.inkBalance.toString() ||
    streak.lastPlayedDateKey !== expected.currentDateKey ||
    streak.streakDays !== expected.streakDays.toString()
  ) {
    return false;
  }

  for (const [accessoryId, count] of expected.accessoryCounts) {
    if (
      inventory[accessoryId] !== count.toString() ||
      inventory[getInventoryDiscoveryField(accessoryId)] !== '1'
    ) {
      return false;
    }
  }

  return true;
};

const queueSubmission = async (
  transaction: ArenaTransaction,
  input: ScribbitSubmissionCommitInput,
  expected: ExpectedSubmissionState
): Promise<void> => {
  const dailyFlagsKey = getDailyFlagsKey(input.userId, input.scribbit.bornDay);
  const inventoryUpdates: Record<string, string> = {};

  await queueStoredScribbit(transaction, input.userId, input.scribbit);
  await transaction.zAdd(getRumbleKey(input.scribbit.bornDay), {
    member: input.scribbit.id,
    score: input.rumbleScore,
  });
  await transaction.hSet(dailyFlagsKey, { drawn: '1', entered: '1' });
  await transaction.expire(dailyFlagsKey, DAILY_FLAG_TTL_SECONDS);
  await transaction.set(
    getInkKey(input.userId),
    expected.inkBalance.toString()
  );
  await transaction.hSet(getUserPlayStreakKey(input.userId), {
    lastPlayedDateKey: expected.currentDateKey,
    streakDays: expected.streakDays.toString(),
  });

  for (const [accessoryId, count] of expected.accessoryCounts) {
    inventoryUpdates[accessoryId] = count.toString();
    inventoryUpdates[getInventoryDiscoveryField(accessoryId)] = '1';
  }
  if (Object.keys(inventoryUpdates).length > 0) {
    await transaction.hSet(getInventoryKey(input.userId), inventoryUpdates);
  }
};

const repairSubmission = async (
  storage: ArenaStorage,
  input: ScribbitSubmissionCommitInput,
  expected: ExpectedSubmissionState,
  watchedKeys: string[],
  typeExpectations: readonly StorageTypeExpectation[]
): Promise<boolean> => {
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch!(...watchedKeys);
      await assertStorageTypes(storage, typeExpectations);
      const [storedDay, activeResolutionClaim] = await Promise.all([
        storage.get(getCurrentArenaDayKey()),
        storage.hGet(
          getNightlyResolutionClaimsKey(),
          input.scribbit.bornDay.toString()
        ),
      ]);
      if (
        storedDay !== input.scribbit.bornDay.toString() ||
        activeResolutionClaim !== undefined
      ) {
        await transaction.unwatch();
        return false;
      }
      await transaction.multi();
      await queueSubmission(transaction, input, expected);
      const result = await transaction.exec();
      if (
        Array.isArray(result) &&
        result.length > 0 &&
        (await submissionWasCommitted(storage, input, expected))
      ) {
        return true;
      }
    } catch (error) {
      await discardWatchedTransaction(
        transaction,
        'Scribbit submission repair'
      );
      if (await submissionWasCommitted(storage, input, expected)) return true;
      if (attempt === MAX_WATCH_TRANSACTION_ATTEMPTS - 1) throw error;
    }
  }
  return false;
};

export const commitScribbitSubmission = async (
  storage: ArenaStorage,
  input: ScribbitSubmissionCommitInput
): Promise<ScribbitSubmissionCommitResult> => {
  if (!storage.watch || !storage.type) {
    throw new Error(
      'Atomic Scribbit submission requires transaction support and Redis type checks.'
    );
  }
  if (input.scribbit.status !== 'alive') {
    throw new Error('Only a living Scribbit can enter a new Rumble.');
  }
  if (
    !Number.isFinite(input.rumbleScore) ||
    !Number.isSafeInteger(input.inkAward) ||
    input.inkAward < 0
  ) {
    throw new Error('Scribbit submission rewards or Rumble score are invalid.');
  }

  const requiredAccessoryCounts = planRequiredAccessoryCounts(
    input.accessoryIds
  );
  if (!requiredAccessoryCounts) {
    return {
      status: 'invalid-accessory',
      accessoryId: input.accessoryIds[0] ?? 'accessory',
    };
  }

  if ((await acquireActiveSubmission(storage, input)) === 'rollover') {
    return { status: 'rollover' };
  }

  try {
    const dailyFlagsKey = getDailyFlagsKey(
      input.userId,
      input.scribbit.bornDay
    );
    const aliveIndexKey = getUserAliveScribbitsKey(input.userId);
    const inventoryKey = getInventoryKey(input.userId);
    const streakKey = getUserPlayStreakKey(input.userId);
    const inkKey = getInkKey(input.userId);
    const scribbitKey = getScribbitKey(input.scribbit.id);
    const currentArenaDayKey = getCurrentArenaDayKey();
    const resolutionClaimsKey = getNightlyResolutionClaimsKey();
    const watchedKeys = [
      currentArenaDayKey,
      resolutionClaimsKey,
      dailyFlagsKey,
      aliveIndexKey,
      inventoryKey,
      streakKey,
      inkKey,
      scribbitKey,
    ];
    const typeExpectations = [
      [currentArenaDayKey, 'string'],
      [resolutionClaimsKey, 'hash'],
      [dailyFlagsKey, 'hash'],
      [aliveIndexKey, 'zset'],
      [inventoryKey, 'hash'],
      [streakKey, 'hash'],
      [inkKey, 'string'],
      [scribbitKey, 'string'],
      [getUserScribbitsKey(input.userId), 'zset'],
      [getExpiringScribbitsKey(), 'zset'],
      [getRumbleKey(input.scribbit.bornDay), 'zset'],
    ] as const satisfies readonly StorageTypeExpectation[];
    const currentDateKey = formatUtcDateKey(input.currentDate);

    for (
      let attempt = 0;
      attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
      attempt += 1
    ) {
      let transaction: ArenaTransaction | undefined;
      let expected: ExpectedSubmissionState | undefined;
      try {
        transaction = await storage.watch(...watchedKeys);
        await assertStorageTypes(storage, typeExpectations);
        const [
          storedDay,
          activeResolutionClaim,
          dailyFlags,
          aliveCount,
          inventoryEntries,
          storedStreak,
          storedInk,
          storedJson,
        ] = await Promise.all([
          storage.get(currentArenaDayKey),
          storage.hGet(resolutionClaimsKey, input.scribbit.bornDay.toString()),
          storage.hGetAll(dailyFlagsKey),
          storage.zCard(aliveIndexKey),
          storage.hGetAll(inventoryKey),
          storage.hGetAll(streakKey),
          storage.get(inkKey),
          storage.get(scribbitKey),
        ]);

        if (
          storedDay !== input.scribbit.bornDay.toString() ||
          activeResolutionClaim !== undefined
        ) {
          await transaction.unwatch();
          return { status: 'rollover' };
        }
        if (dailyFlags.drawn !== undefined) {
          await transaction.unwatch();
          return { status: 'already-drawn' };
        }
        if (dailyFlags.entered !== undefined) {
          await transaction.unwatch();
          return { status: 'already-entered' };
        }
        if (aliveCount >= MAX_ALIVE_PER_USER) {
          await transaction.unwatch();
          return { status: 'alive-limit' };
        }
        if (storedJson !== undefined) {
          await transaction.unwatch();
          return { status: 'id-collision' };
        }
        if (!isStoredNonNegativeSafeInteger(storedInk)) {
          throw new Error('Stored Ink balance is invalid.');
        }

        const unavailableAccessory = findUnavailableAccessory(
          inventoryEntries,
          requiredAccessoryCounts
        );
        if (unavailableAccessory) {
          await transaction.unwatch();
          return {
            status: 'insufficient-accessory',
            accessoryId: unavailableAccessory,
          };
        }

        const inkBalance = Number(storedInk ?? '0') + input.inkAward;
        if (!Number.isSafeInteger(inkBalance)) {
          throw new Error(
            'Scribbit submission would overflow the Ink balance.'
          );
        }
        const previousStreak = parsePlayStreak(storedStreak);
        const nextStreak = advancePlayStreak(previousStreak, currentDateKey);
        const accessoryCounts = new Map<string, number>();
        for (const [accessoryId, requiredCount] of requiredAccessoryCounts) {
          const ownedCount = Number(inventoryEntries[accessoryId] ?? '0');
          if (!Number.isSafeInteger(ownedCount) || ownedCount < requiredCount) {
            throw new Error('Stored accessory count is invalid.');
          }
          accessoryCounts.set(accessoryId, ownedCount - requiredCount);
        }
        expected = {
          inkBalance,
          accessoryCounts,
          currentDateKey,
          streakDays: nextStreak.days,
        };

        await transaction.multi();
        await queueSubmission(transaction, input, expected);
        const result = await transaction.exec();
        if (Array.isArray(result) && result.length > 0) {
          if (await submissionWasCommitted(storage, input, expected)) {
            return { status: 'committed', recovered: false };
          }
          if (
            await repairSubmission(
              storage,
              input,
              expected,
              watchedKeys,
              typeExpectations
            )
          ) {
            return { status: 'committed', recovered: true };
          }
          throw new Error('Scribbit submission did not fully commit.');
        }
      } catch (error) {
        await discardWatchedTransaction(transaction, 'Scribbit submission');
        if (expected) {
          if (await submissionWasCommitted(storage, input, expected)) {
            return { status: 'committed', recovered: true };
          }
          if (
            await repairSubmission(
              storage,
              input,
              expected,
              watchedKeys,
              typeExpectations
            )
          ) {
            return { status: 'committed', recovered: true };
          }
        }
        throw error;
      }
    }

    throw new Error('Scribbit submission changed too often to save safely.');
  } finally {
    await releaseActiveSubmission(storage, input);
  }
};
