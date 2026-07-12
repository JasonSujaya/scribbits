import type { ArenaStorage, ArenaTransaction, SortedSetEntry } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import {
  acquireNightlyPlayerMutation,
  getNightlyPlayerMutationEpochKey,
  getNightlyPlayerMutationLockKey,
  readNightlyPlayerMutationEpoch,
  releaseNightlyPlayerMutation,
  withNightlyPlayerMutationHeartbeat,
  type NightlyPlayerMutationLease,
} from './dataDeletion';

const nightlyFenceBrand: unique symbol = Symbol('nightlyFence');

export type NightlyFencedStorage = ArenaStorage & {
  readonly [nightlyFenceBrand]: true;
};

export type RunWithNightlyFenceResult<Result> =
  | Readonly<{ status: 'completed'; result: Result }>
  | Readonly<{ status: 'busy' }>;

export class StaleNightlyWorkerError extends Error {
  constructor() {
    super('Nightly player mutation was fenced by a newer operation.');
    this.name = 'StaleNightlyWorkerError';
  }
}

const requireCurrentFence = async (
  storage: ArenaStorage,
  lease: NightlyPlayerMutationLease
): Promise<void> => {
  const [epoch, token] = await Promise.all([
    readNightlyPlayerMutationEpoch(storage),
    storage.get(getNightlyPlayerMutationLockKey()),
  ]);
  if (epoch !== lease.epoch || token !== lease.token) {
    throw new StaleNightlyWorkerError();
  }
};

const wrapTransaction = (
  storage: ArenaStorage,
  transaction: ArenaTransaction,
  lease: NightlyPlayerMutationLease
): ArenaTransaction => ({
  multi: () => transaction.multi(),
  exec: async () => {
    const result = await transaction.exec();
    if (Array.isArray(result) && result.length === 0) {
      await requireCurrentFence(storage, lease);
    }
    return result;
  },
  discard: () => transaction.discard(),
  unwatch: () => transaction.unwatch(),
  incrBy: (key, value) => transaction.incrBy(key, value),
  set: (key, value) => transaction.set(key, value),
  del: (...keys) => transaction.del(...keys),
  expire: (key, seconds) => transaction.expire(key, seconds),
  hSet: (key, fieldValues) => transaction.hSet(key, fieldValues),
  hSetNX: (key, field, value) => transaction.hSetNX(key, field, value),
  hDel: (key, fields) => transaction.hDel(key, fields),
  hIncrBy: (key, field, value) => transaction.hIncrBy(key, field, value),
  zAdd: (key, ...members) => transaction.zAdd(key, ...members),
  zRem: (key, members) => transaction.zRem(key, members),
  zIncrBy: (key, member, value) => transaction.zIncrBy(key, member, value),
});

const executeFencedMutation = async <Result>(
  storage: ArenaStorage,
  lease: NightlyPlayerMutationLease,
  queueMutation: (transaction: ArenaTransaction) => Promise<unknown>
): Promise<Result> => {
  if (!storage.watch) {
    throw new Error('Nightly mutation fencing requires transaction support.');
  }
  const epochKey = getNightlyPlayerMutationEpochKey();
  const lockKey = getNightlyPlayerMutationLockKey();

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(epochKey, lockKey);
      await requireCurrentFence(storage, lease);
      await transaction.multi();
      await queueMutation(transaction);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return result[0] as Result;
      }
      await requireCurrentFence(storage, lease);
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Nightly storage fence');
      throw error;
    }
  }

  throw new Error('Nightly fenced mutation changed too often to commit.');
};

export const createNightlyFencedStorage = (
  storage: ArenaStorage,
  lease: NightlyPlayerMutationLease
): NightlyFencedStorage => {
  if (!storage.watch) {
    throw new Error('Nightly mutation fencing requires transaction support.');
  }
  const epochKey = getNightlyPlayerMutationEpochKey();
  const lockKey = getNightlyPlayerMutationLockKey();

  return {
    [nightlyFenceBrand]: true,
    watch: async (...keys) => {
      const transaction = await storage.watch!(
        ...new Set([...keys, epochKey, lockKey])
      );
      try {
        await requireCurrentFence(storage, lease);
        return wrapTransaction(storage, transaction, lease);
      } catch (error) {
        await discardWatchedTransaction(transaction, 'Nightly storage fence');
        throw error;
      }
    },
    get: (key) => storage.get(key),
    set: (key, value) =>
      executeFencedMutation(storage, lease, (transaction) =>
        transaction.set(key, value)
      ),
    del: (...keys) =>
      executeFencedMutation(storage, lease, (transaction) =>
        transaction.del(...keys)
      ),
    incrBy: (key, value) =>
      executeFencedMutation<number>(storage, lease, (transaction) =>
        transaction.incrBy(key, value)
      ),
    expire: (key, seconds) =>
      executeFencedMutation(storage, lease, (transaction) =>
        transaction.expire(key, seconds)
      ),
    hGet: (key, field) => storage.hGet(key, field),
    hGetAll: (key) => storage.hGetAll(key),
    hKeys: (key) => storage.hKeys(key),
    hSet: (key, fieldValues) =>
      executeFencedMutation(storage, lease, (transaction) =>
        transaction.hSet(key, fieldValues)
      ),
    hSetNX: (key, field, value) =>
      executeFencedMutation<number>(storage, lease, (transaction) =>
        transaction.hSetNX(key, field, value)
      ),
    hDel: (key, fields) =>
      executeFencedMutation<number>(storage, lease, (transaction) =>
        transaction.hDel(key, fields)
      ),
    hIncrBy: (key, field, value) =>
      executeFencedMutation<number>(storage, lease, (transaction) =>
        transaction.hIncrBy(key, field, value)
      ),
    zAdd: (key, ...members: SortedSetEntry[]) =>
      executeFencedMutation(storage, lease, (transaction) =>
        transaction.zAdd(key, ...members)
      ),
    zCard: (key) => storage.zCard(key),
    zRange: (key, start, stop, options) =>
      storage.zRange(key, start, stop, options),
    zRem: (key, members) =>
      executeFencedMutation(storage, lease, (transaction) =>
        transaction.zRem(key, members)
      ),
    zScore: (key, member) => storage.zScore(key, member),
    zRank: (key, member) => storage.zRank(key, member),
    zIncrBy: (key, member, value) =>
      executeFencedMutation<number>(storage, lease, (transaction) =>
        transaction.zIncrBy(key, member, value)
      ),
  };
};

export const runWithNightlyFence = async <Result>(
  storage: ArenaStorage,
  token: string,
  operation: (fencedStorage: NightlyFencedStorage) => Promise<Result>
): Promise<RunWithNightlyFenceResult<Result>> => {
  const acquisition = await acquireNightlyPlayerMutation(storage, token);
  if (acquisition.status === 'busy') return { status: 'busy' };

  const fencedStorage = createNightlyFencedStorage(storage, acquisition.lease);
  let result: Result;
  try {
    result = await withNightlyPlayerMutationHeartbeat(
      storage,
      acquisition.lease,
      () => operation(fencedStorage)
    );
  } catch (error) {
    const release = await releaseNightlyPlayerMutation(
      storage,
      acquisition.lease
    );
    if (release !== 'released' && !(error instanceof StaleNightlyWorkerError)) {
      throw new Error('Nightly mutation lost ownership of its safety lock.', {
        cause: error,
      });
    }
    throw error;
  }

  if (
    (await releaseNightlyPlayerMutation(storage, acquisition.lease)) !==
    'released'
  ) {
    throw new Error('Nightly mutation lost ownership of its safety lock.');
  }
  return { status: 'completed', result };
};
