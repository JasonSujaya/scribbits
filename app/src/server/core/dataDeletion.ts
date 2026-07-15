import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';

const deletionLockTtlSeconds = 5 * 60;
const deletionHeartbeatMilliseconds = 30 * 1000;
const playerMutationLockTtlSeconds = 5 * 60;
const playerMutationHeartbeatMilliseconds = 30 * 1000;
const nightlyPlayerMutationLockTtlSeconds = 5 * 60;
const nightlyPlayerMutationHeartbeatMilliseconds = 30 * 1000;
const globalDataDeletionLockKey = 'arena:data-deletion:lock';
const nightlyPlayerMutationLockKey = 'arena:nightly-player-mutation:lock';
const nightlyPlayerMutationEpochKey = 'arena:nightly-player-mutation:epoch';

export type PlayerDataDeletionLease = Readonly<{
  userId: string;
  token: string;
  generation: number;
}>;

export type AcquirePlayerDataDeletionResult =
  | Readonly<{ status: 'acquired'; lease: PlayerDataDeletionLease }>
  | Readonly<{ status: 'busy' }>;

export type PlayerMutationLease = Readonly<{
  userId: string;
  token: string;
}>;

export type AcquirePlayerMutationResult =
  | Readonly<{ status: 'acquired'; lease: PlayerMutationLease }>
  | Readonly<{ status: 'busy' }>;

export type NightlyPlayerMutationLease = Readonly<{
  token: string;
  epoch: number;
}>;

export type AcquireNightlyPlayerMutationResult =
  | Readonly<{ status: 'acquired'; lease: NightlyPlayerMutationLease }>
  | Readonly<{ status: 'busy' }>;

export const getPlayerDataDeletionLockKey = (userId: string): string => {
  return `user:${userId}:data-deletion:lock`;
};

export const getPlayerDataGenerationKey = (userId: string): string => {
  return `user:${userId}:data-generation`;
};

export const getPlayerMutationLockKey = (userId: string): string => {
  return `user:${userId}:mutation:lock`;
};

export const getGlobalDataDeletionLockKey = (): string => {
  return globalDataDeletionLockKey;
};

export const getNightlyPlayerMutationLockKey = (): string => {
  return nightlyPlayerMutationLockKey;
};

export const getNightlyPlayerMutationEpochKey = (): string => {
  return nightlyPlayerMutationEpochKey;
};

export const readPlayerDataGeneration = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  const storedGeneration = await storage.get(
    getPlayerDataGenerationKey(userId)
  );
  if (storedGeneration === undefined) return 0;
  const generation = Number(storedGeneration);
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new Error('Player data generation is invalid.');
  }
  return generation;
};

export const readNightlyPlayerMutationEpoch = async (
  storage: ArenaStorage
): Promise<number> => {
  const storedEpoch = await storage.get(nightlyPlayerMutationEpochKey);
  if (storedEpoch === undefined) return 0;
  const epoch = Number(storedEpoch);
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw new Error('Nightly player mutation epoch is invalid.');
  }
  return epoch;
};

const withLeaseHeartbeat = async <Result>(
  heartbeatMilliseconds: number,
  renew: () => Promise<'renewed' | 'not-owner'>,
  operation: () => Promise<Result>,
  lostOwnershipMessage: string
): Promise<Result> => {
  let renewalInFlight: Promise<void> = Promise.resolve();
  let renewalError: unknown;
  let heartbeatStopped = false;
  const heartbeat = setInterval(() => {
    if (heartbeatStopped) return;
    renewalInFlight = renewalInFlight.then(async () => {
      if (renewalError !== undefined) return;
      try {
        if ((await renew()) !== 'renewed') {
          throw new Error(lostOwnershipMessage);
        }
      } catch (error) {
        renewalError = error;
      }
    });
  }, heartbeatMilliseconds);

  let result: Result | undefined;
  let operationError: unknown;
  try {
    result = await operation();
  } catch (error) {
    operationError = error;
  }

  heartbeatStopped = true;
  clearInterval(heartbeat);
  await renewalInFlight;
  if (renewalError !== undefined) throw renewalError;
  if (operationError !== undefined) throw operationError;
  if ((await renew()) !== 'renewed') {
    throw new Error(lostOwnershipMessage);
  }
  return result as Result;
};

export const acquirePlayerDataDeletion = async (
  storage: ArenaStorage,
  userId: string,
  token: string
): Promise<AcquirePlayerDataDeletionResult> => {
  if (!storage.watch) {
    throw new Error('Player data deletion requires transaction support.');
  }
  const lockKey = getPlayerDataDeletionLockKey(userId);
  const generationKey = getPlayerDataGenerationKey(userId);
  const mutationLockKey = getPlayerMutationLockKey(userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        lockKey,
        generationKey,
        mutationLockKey,
        globalDataDeletionLockKey,
        nightlyPlayerMutationLockKey,
        nightlyPlayerMutationEpochKey
      );
      const [
        activeToken,
        generation,
        activeMutationToken,
        activeGlobalDeletionToken,
        activeNightlyMutationToken,
      ] = await Promise.all([
        storage.get(lockKey),
        readPlayerDataGeneration(storage, userId),
        storage.get(mutationLockKey),
        storage.get(globalDataDeletionLockKey),
        storage.get(nightlyPlayerMutationLockKey),
      ]);
      if (activeToken === token && activeGlobalDeletionToken === token) {
        await transaction.unwatch();
        return {
          status: 'acquired',
          lease: { userId, token, generation },
        };
      }
      if (
        activeMutationToken !== undefined ||
        activeNightlyMutationToken !== undefined ||
        activeGlobalDeletionToken !== undefined ||
        activeToken !== undefined
      ) {
        await transaction.unwatch();
        return { status: 'busy' };
      }
      await transaction.multi();
      await transaction.set(lockKey, token);
      await transaction.expire(lockKey, deletionLockTtlSeconds);
      await transaction.set(globalDataDeletionLockKey, token);
      await transaction.expire(
        globalDataDeletionLockKey,
        deletionLockTtlSeconds
      );
      await transaction.incrBy(generationKey, 1);
      await transaction.incrBy(nightlyPlayerMutationEpochKey, 1);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 6) {
        const nextGeneration = Number(result[4]);
        const nextNightlyEpoch = Number(result[5]);
        if (!Number.isSafeInteger(nextGeneration) || nextGeneration < 1) {
          throw new Error(
            'Player data deletion returned an invalid generation.'
          );
        }
        if (!Number.isSafeInteger(nextNightlyEpoch) || nextNightlyEpoch < 1) {
          throw new Error('Player data deletion returned an invalid epoch.');
        }
        return {
          status: 'acquired',
          lease: { userId, token, generation: nextGeneration },
        };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Player data deletion');
      if (
        (await storage.get(lockKey)) === token &&
        (await storage.get(globalDataDeletionLockKey)) === token
      ) {
        return {
          status: 'acquired',
          lease: {
            userId,
            token,
            generation: await readPlayerDataGeneration(storage, userId),
          },
        };
      }
      throw error;
    }
  }

  throw new Error('Player data deletion changed too often to start safely.');
};

export const releasePlayerDataDeletion = async (
  storage: ArenaStorage,
  lease: PlayerDataDeletionLease
): Promise<'released' | 'not-owner'> => {
  if (!storage.watch) {
    throw new Error('Player data deletion requires transaction support.');
  }
  const lockKey = getPlayerDataDeletionLockKey(lease.userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(lockKey, globalDataDeletionLockKey);
      const [activeToken, activeGlobalToken] = await Promise.all([
        storage.get(lockKey),
        storage.get(globalDataDeletionLockKey),
      ]);
      if (activeToken !== lease.token || activeGlobalToken !== lease.token) {
        await transaction.unwatch();
        return 'not-owner';
      }
      await transaction.multi();
      // Devvit Redis 0.13.7 rejects a variadic DEL during EXEC. Queue each key
      // separately while keeping both removals in this one atomic transaction.
      await transaction.del(lockKey);
      await transaction.del(globalDataDeletionLockKey);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 2) return 'released';
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Player data deletion');
      const [activeToken, activeGlobalToken] = await Promise.all([
        storage.get(lockKey),
        storage.get(globalDataDeletionLockKey),
      ]);
      if (activeToken === undefined && activeGlobalToken === undefined) {
        return 'released';
      }
      if (activeToken !== lease.token || activeGlobalToken !== lease.token) {
        return 'not-owner';
      }
      continue;
    }
  }

  throw new Error('Player data deletion changed too often to release safely.');
};

export const renewPlayerDataDeletion = async (
  storage: ArenaStorage,
  lease: PlayerDataDeletionLease
): Promise<'renewed' | 'not-owner'> => {
  if (!storage.watch) {
    throw new Error('Player data deletion requires transaction support.');
  }
  const lockKey = getPlayerDataDeletionLockKey(lease.userId);
  const generationKey = getPlayerDataGenerationKey(lease.userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        lockKey,
        generationKey,
        globalDataDeletionLockKey
      );
      const [activeToken, generation, activeGlobalToken] = await Promise.all([
        storage.get(lockKey),
        readPlayerDataGeneration(storage, lease.userId),
        storage.get(globalDataDeletionLockKey),
      ]);
      if (
        activeToken !== lease.token ||
        activeGlobalToken !== lease.token ||
        generation !== lease.generation
      ) {
        await transaction.unwatch();
        return 'not-owner';
      }
      await transaction.multi();
      await transaction.expire(lockKey, deletionLockTtlSeconds);
      await transaction.expire(
        globalDataDeletionLockKey,
        deletionLockTtlSeconds
      );
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 2) return 'renewed';
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Player data deletion');
      if (
        (await storage.get(lockKey)) !== lease.token ||
        (await storage.get(globalDataDeletionLockKey)) !== lease.token ||
        (await readPlayerDataGeneration(storage, lease.userId)) !==
          lease.generation
      ) {
        return 'not-owner';
      }
      throw error;
    }
  }

  throw new Error('Player data deletion changed too often to renew safely.');
};

export const withPlayerDataDeletionHeartbeat = async <Result>(
  storage: ArenaStorage,
  lease: PlayerDataDeletionLease,
  operation: () => Promise<Result>
): Promise<Result> => {
  return withLeaseHeartbeat(
    deletionHeartbeatMilliseconds,
    () => renewPlayerDataDeletion(storage, lease),
    operation,
    'Player data deletion lost ownership of its lock.'
  );
};

export const acquirePlayerMutation = async (
  storage: ArenaStorage,
  userId: string,
  token: string
): Promise<AcquirePlayerMutationResult> => {
  if (!storage.watch) {
    throw new Error('Player mutations require transaction support.');
  }
  const mutationLockKey = getPlayerMutationLockKey(userId);
  const deletionLockKey = getPlayerDataDeletionLockKey(userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(mutationLockKey, deletionLockKey);
      const [activeMutationToken, activeDeletionToken] = await Promise.all([
        storage.get(mutationLockKey),
        storage.get(deletionLockKey),
      ]);
      if (activeMutationToken === token) {
        await transaction.unwatch();
        return { status: 'acquired', lease: { userId, token } };
      }
      if (
        activeMutationToken !== undefined ||
        activeDeletionToken !== undefined
      ) {
        await transaction.unwatch();
        return { status: 'busy' };
      }

      await transaction.multi();
      await transaction.set(mutationLockKey, token);
      await transaction.expire(mutationLockKey, playerMutationLockTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 2) {
        return { status: 'acquired', lease: { userId, token } };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Player mutation');
      if ((await storage.get(mutationLockKey)) === token) {
        return { status: 'acquired', lease: { userId, token } };
      }
      throw error;
    }
  }

  throw new Error('Player mutation changed too often to start safely.');
};

export const renewPlayerMutation = async (
  storage: ArenaStorage,
  lease: PlayerMutationLease
): Promise<'renewed' | 'not-owner'> => {
  if (!storage.watch) {
    throw new Error('Player mutations require transaction support.');
  }
  const mutationLockKey = getPlayerMutationLockKey(lease.userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(mutationLockKey);
      if ((await storage.get(mutationLockKey)) !== lease.token) {
        await transaction.unwatch();
        return 'not-owner';
      }
      await transaction.multi();
      await transaction.expire(mutationLockKey, playerMutationLockTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 1) return 'renewed';
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Player mutation');
      if ((await storage.get(mutationLockKey)) !== lease.token) {
        return 'not-owner';
      }
      throw error;
    }
  }

  throw new Error('Player mutation changed too often to renew safely.');
};

export const releasePlayerMutation = async (
  storage: ArenaStorage,
  lease: PlayerMutationLease
): Promise<'released' | 'not-owner'> => {
  if (!storage.watch) {
    throw new Error('Player mutations require transaction support.');
  }
  const mutationLockKey = getPlayerMutationLockKey(lease.userId);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(mutationLockKey);
      if ((await storage.get(mutationLockKey)) !== lease.token) {
        await transaction.unwatch();
        return 'not-owner';
      }
      await transaction.multi();
      await transaction.del(mutationLockKey);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 1) return 'released';
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Player mutation');
      const activeToken = await storage.get(mutationLockKey);
      if (activeToken === undefined) return 'released';
      if (activeToken !== lease.token) return 'not-owner';
      continue;
    }
  }

  throw new Error('Player mutation changed too often to release safely.');
};

export const withPlayerMutationHeartbeat = async <Result>(
  storage: ArenaStorage,
  lease: PlayerMutationLease,
  operation: () => Promise<Result>
): Promise<Result> => {
  return withLeaseHeartbeat(
    playerMutationHeartbeatMilliseconds,
    () => renewPlayerMutation(storage, lease),
    operation,
    'Player mutation lost ownership of its lock.'
  );
};

export type RunPlayerMutationResult<Result> =
  | Readonly<{ status: 'busy' }>
  | Readonly<{ status: 'lost'; cause: unknown | null }>
  | Readonly<{ status: 'completed'; value: Result }>;

/** One acquire/heartbeat/release owner for request and cross-owner mutations. */
export const runWithPlayerMutationLease = async <Result>(
  storage: ArenaStorage,
  userId: string,
  token: string,
  operation: () => Promise<Result>
): Promise<RunPlayerMutationResult<Result>> => {
  const acquisition = await acquirePlayerMutation(storage, userId, token);
  if (acquisition.status === 'busy') return { status: 'busy' };

  let value: Result | undefined;
  let operationError: unknown;
  try {
    value = await withPlayerMutationHeartbeat(
      storage,
      acquisition.lease,
      operation
    );
  } catch (error) {
    operationError = error;
  }

  let release: 'released' | 'not-owner' = 'not-owner';
  let releaseError: unknown;
  try {
    release = await releasePlayerMutation(storage, acquisition.lease);
  } catch (error) {
    releaseError = error;
  }
  if (releaseError !== undefined) {
    return {
      status: 'lost',
      cause:
        operationError === undefined
          ? releaseError
          : new AggregateError(
              [operationError, releaseError],
              'Player mutation failed and its lease could not be released.'
            ),
    };
  }
  if (release !== 'released') {
    return { status: 'lost', cause: operationError ?? null };
  }
  if (operationError !== undefined) throw operationError;
  return { status: 'completed', value: value as Result };
};

export const acquireNightlyPlayerMutation = async (
  storage: ArenaStorage,
  token: string
): Promise<AcquireNightlyPlayerMutationResult> => {
  if (!storage.watch) {
    throw new Error('Nightly player mutation requires transaction support.');
  }

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        nightlyPlayerMutationLockKey,
        globalDataDeletionLockKey,
        nightlyPlayerMutationEpochKey
      );
      const [activeNightlyToken, activeDeletionToken, epoch] =
        await Promise.all([
          storage.get(nightlyPlayerMutationLockKey),
          storage.get(globalDataDeletionLockKey),
          readNightlyPlayerMutationEpoch(storage),
        ]);
      if (activeNightlyToken === token) {
        await transaction.unwatch();
        return { status: 'acquired', lease: { token, epoch } };
      }
      if (
        activeNightlyToken !== undefined ||
        activeDeletionToken !== undefined
      ) {
        await transaction.unwatch();
        return { status: 'busy' };
      }

      await transaction.multi();
      await transaction.set(nightlyPlayerMutationLockKey, token);
      await transaction.expire(
        nightlyPlayerMutationLockKey,
        nightlyPlayerMutationLockTtlSeconds
      );
      await transaction.incrBy(nightlyPlayerMutationEpochKey, 1);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 3) {
        const nextEpoch = Number(result[2]);
        if (!Number.isSafeInteger(nextEpoch) || nextEpoch < 1) {
          throw new Error('Nightly player mutation returned an invalid epoch.');
        }
        return { status: 'acquired', lease: { token, epoch: nextEpoch } };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Nightly player mutation');
      if ((await storage.get(nightlyPlayerMutationLockKey)) === token) {
        return {
          status: 'acquired',
          lease: {
            token,
            epoch: await readNightlyPlayerMutationEpoch(storage),
          },
        };
      }
      throw error;
    }
  }

  throw new Error('Nightly player mutation changed too often to start safely.');
};

export const renewNightlyPlayerMutation = async (
  storage: ArenaStorage,
  lease: NightlyPlayerMutationLease
): Promise<'renewed' | 'not-owner'> => {
  if (!storage.watch) {
    throw new Error('Nightly player mutation requires transaction support.');
  }

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        nightlyPlayerMutationLockKey,
        nightlyPlayerMutationEpochKey
      );
      const [activeToken, epoch] = await Promise.all([
        storage.get(nightlyPlayerMutationLockKey),
        readNightlyPlayerMutationEpoch(storage),
      ]);
      if (activeToken !== lease.token || epoch !== lease.epoch) {
        await transaction.unwatch();
        return 'not-owner';
      }
      await transaction.multi();
      await transaction.expire(
        nightlyPlayerMutationLockKey,
        nightlyPlayerMutationLockTtlSeconds
      );
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 1) return 'renewed';
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Nightly player mutation');
      if (
        (await storage.get(nightlyPlayerMutationLockKey)) !== lease.token ||
        (await readNightlyPlayerMutationEpoch(storage)) !== lease.epoch
      ) {
        return 'not-owner';
      }
      throw error;
    }
  }

  throw new Error('Nightly player mutation changed too often to renew safely.');
};

export const releaseNightlyPlayerMutation = async (
  storage: ArenaStorage,
  lease: NightlyPlayerMutationLease
): Promise<'released' | 'not-owner'> => {
  if (!storage.watch) {
    throw new Error('Nightly player mutation requires transaction support.');
  }

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        nightlyPlayerMutationLockKey,
        nightlyPlayerMutationEpochKey
      );
      const [activeToken, epoch] = await Promise.all([
        storage.get(nightlyPlayerMutationLockKey),
        readNightlyPlayerMutationEpoch(storage),
      ]);
      if (activeToken !== lease.token || epoch !== lease.epoch) {
        await transaction.unwatch();
        return 'not-owner';
      }
      await transaction.multi();
      await transaction.del(nightlyPlayerMutationLockKey);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 1) return 'released';
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Nightly player mutation');
      const [activeToken, epoch] = await Promise.all([
        storage.get(nightlyPlayerMutationLockKey),
        readNightlyPlayerMutationEpoch(storage),
      ]);
      if (activeToken === undefined) return 'released';
      if (activeToken !== lease.token || epoch !== lease.epoch) {
        return 'not-owner';
      }
      continue;
    }
  }

  const [activeToken, epoch] = await Promise.all([
    storage.get(nightlyPlayerMutationLockKey),
    readNightlyPlayerMutationEpoch(storage),
  ]);
  if (activeToken === undefined) return 'released';
  if (activeToken !== lease.token || epoch !== lease.epoch) return 'not-owner';

  // Devvit Redis can report repeated WATCH conflicts here even after the
  // owner's heartbeat has stopped. The lease was just renewed, so no valid
  // takeover can occur during this bounded owner-checked cleanup fallback.
  await storage.del(nightlyPlayerMutationLockKey);
  const remainingToken = await storage.get(nightlyPlayerMutationLockKey);
  if (remainingToken === undefined) {
    console.warn(
      'Nightly player mutation used owner-checked fallback lock cleanup.'
    );
    return 'released';
  }
  if (remainingToken !== lease.token) return 'not-owner';
  throw new Error('Nightly player mutation could not release its safety lock.');
};

export const withNightlyPlayerMutationHeartbeat = async <Result>(
  storage: ArenaStorage,
  lease: NightlyPlayerMutationLease,
  operation: () => Promise<Result>
): Promise<Result> => {
  return withLeaseHeartbeat(
    nightlyPlayerMutationHeartbeatMilliseconds,
    () => renewNightlyPlayerMutation(storage, lease),
    operation,
    'Nightly player mutation lost ownership of its lock.'
  );
};
