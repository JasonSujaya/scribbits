import type { ArenaStorage, ArenaTransaction, SortedSetEntry } from './storage';
import { discardWatchedTransaction } from './storage';
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

const executeLeaseCheckedMutation = async <Result>(
  storage: ArenaStorage,
  lease: NightlyPlayerMutationLease,
  mutate: () => Promise<Result>
): Promise<Result> => {
  // The global lease prevents deletion and another nightly worker from running
  // concurrently. Check it at both operation boundaries so direct Redis writes
  // do not consume a WATCH transaction apiece; Devvit limits transaction
  // concurrency and the resolver legitimately performs many small writes.
  // Domain operations that need atomicity still use the fenced watch() below.
  await requireCurrentFence(storage, lease);
  const result = await mutate();
  await requireCurrentFence(storage, lease);
  return result;
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
    type: storage.type ? (key) => storage.type!(key) : undefined,
    get: (key) => storage.get(key),
    set: (key, value) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.set(key, value)
      ),
    del: (...keys) =>
      executeLeaseCheckedMutation(storage, lease, () => storage.del(...keys)),
    incrBy: (key, value) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.incrBy(key, value)
      ),
    expire: (key, seconds) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.expire(key, seconds)
      ),
    hGet: (key, field) => storage.hGet(key, field),
    hGetAll: (key) => storage.hGetAll(key),
    hKeys: (key) => storage.hKeys(key),
    hSet: (key, fieldValues) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.hSet(key, fieldValues)
      ),
    hSetNX: (key, field, value) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.hSetNX(key, field, value)
      ),
    hDel: (key, fields) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.hDel(key, fields)
      ),
    hIncrBy: (key, field, value) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.hIncrBy(key, field, value)
      ),
    zAdd: (key, ...members: SortedSetEntry[]) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.zAdd(key, ...members)
      ),
    zCard: (key) => storage.zCard(key),
    zRange: (key, start, stop, options) =>
      storage.zRange(key, start, stop, options),
    zRem: (key, members) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.zRem(key, members)
      ),
    zScore: (key, member) => storage.zScore(key, member),
    zRank: (key, member) => storage.zRank(key, member),
    zIncrBy: (key, member, value) =>
      executeLeaseCheckedMutation(storage, lease, () =>
        storage.zIncrBy(key, member, value)
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
