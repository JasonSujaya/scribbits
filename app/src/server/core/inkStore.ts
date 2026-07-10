import type {
  CapsulePull,
  CapsulePullResponse,
  CapsuleRarity,
  Inventory,
} from '../../shared/arena';
import {
  CAPSULE_COST,
  CAPSULE_FIRST_DAILY_COST,
  CAPSULE_PITY,
} from '../../shared/arena';
import { createSeededNumberGenerator, hashTextToSeed } from './random';
import type { ArenaStorage } from './scribbit';
import {
  INK_ACCESSORY_CATALOG,
  INK_CATALOG,
  INK_PEN_CATALOG,
  INK_TITLE_CATALOG,
  findInkCatalogEntry,
  isAccessoryCatalogEntry,
  type InkCatalogEntry,
} from './ink';

type InkTransaction = {
  multi: () => Promise<void>;
  exec: () => Promise<unknown[]>;
  discard: () => Promise<void>;
  unwatch: () => Promise<unknown>;
  incrBy: (key: string, value: number) => Promise<unknown>;
  set: (key: string, value: string) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
  hIncrBy: (key: string, field: string, value: number) => Promise<unknown>;
};

export type InkStorage = ArenaStorage & {
  watch?: (...keys: string[]) => Promise<InkTransaction>;
};

export type CapsulePullSuccess = {
  status: 'pulled';
  pull: CapsulePull;
  ink: number;
  inventory: Inventory;
  nextCost: number;
};

export type CapsulePullInsufficientInk = {
  status: 'insufficientInk';
  ink: number;
  cost: number;
};

export type CapsulePullResult =
  | CapsulePullSuccess
  | CapsulePullInsufficientInk;

export type CapsuleOperationCommit = {
  operationKey: string;
  expectedPendingValue: string;
};

export type CapsuleOperationClaim =
  | { status: 'claimed'; pendingValue: string }
  | { status: 'pending' }
  | { status: 'completed'; response: CapsulePullResponse };

type CapsuleSelectionOptions = {
  userId: string;
  day: number;
  pullCount: number;
  pullsSinceEpic: number;
};

type InkRewardClaimOptions = {
  payoutKey: string;
  payoutField: string;
  userId: string;
  amount: number;
  paidAtMs: number;
};

const maximumTransactionAttempts = 5;
const capsuleDailyFlagTtlSeconds = 3 * 24 * 60 * 60;
const capsuleOperationTtlSeconds = 3 * 24 * 60 * 60;
const capsuleOperationPendingPrefix = 'pending:';

export const getInkKey = (userId: string): string => {
  return `ink:${userId}`;
};

export const getInventoryKey = (userId: string): string => {
  return `inventory:${userId}`;
};

export const getPullsSinceEpicKey = (userId: string): string => {
  return `pullsSinceEpic:${userId}`;
};

export const getCapsulePullCountKey = (userId: string): string => {
  return `capsulePulls:${userId}`;
};

export const getCapsuleDailyPullKey = (
  userId: string,
  day: number
): string => {
  return `capsuleDaily:${userId}:${day}`;
};

export const getCapsuleOperationKey = (
  userId: string,
  operationId: string
): string => {
  return `capsule:operation:${userId}:${operationId}`;
};

export const getNextCapsuleCost = async (
  storage: ArenaStorage,
  userId: string,
  day: number
): Promise<number> => {
  const pulledToday = (await storage.get(
    getCapsuleDailyPullKey(userId, day)
  )) !== undefined;
  return pulledToday ? CAPSULE_COST : CAPSULE_FIRST_DAILY_COST;
};

export const getRumbleWinInkPayoutKey = (day: number): string => {
  return `ink:payout:rumbleWin:${day}`;
};

const parseStoredNonNegativeInteger = (
  storedValue: string | undefined
): number => {
  if (storedValue === undefined) {
    return 0;
  }

  const parsedValue = Number(storedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
};

export const getInkBalance = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  return parseStoredNonNegativeInteger(await storage.get(getInkKey(userId)));
};

export const awardInk = async (
  storage: ArenaStorage,
  userId: string,
  amount: number
): Promise<number> => {
  if (!Number.isInteger(amount) || amount <= 0) {
    return await getInkBalance(storage, userId);
  }

  return await storage.incrBy(getInkKey(userId), amount);
};

export const claimInkReward = async (
  storage: ArenaStorage,
  options: InkRewardClaimOptions
): Promise<boolean> => {
  if (options.amount <= 0) {
    return false;
  }

  const createdClaim = await storage.hSetNX(
    options.payoutKey,
    options.payoutField,
    `${options.userId}:${options.amount}:${options.paidAtMs}`
  );

  if (createdClaim !== 1) {
    return false;
  }

  await awardInk(storage, options.userId, options.amount);
  return true;
};

export const loadInventory = async (
  storage: ArenaStorage,
  userId: string
): Promise<Inventory> => {
  const storedInventory = await storage.hGetAll(getInventoryKey(userId));
  return inventoryFromStoredEntries(storedInventory);
};

const inventoryFromStoredEntries = (
  storedInventory: Record<string, string>
): Inventory => {
  const items: Record<string, number> = {};

  for (const entry of INK_ACCESSORY_CATALOG) {
    const ownedCount = parseStoredNonNegativeInteger(storedInventory[entry.id]);

    if (ownedCount > 0) {
      items[entry.id] = ownedCount;
    }
  }

  return {
    items,
    pens: INK_PEN_CATALOG.filter((entry) => {
      return storedInventory[entry.id] !== undefined;
    }).map((entry) => {
      return entry.id;
    }),
    titles: INK_TITLE_CATALOG.filter((entry) => {
      return storedInventory[entry.id] !== undefined;
    }).map((entry) => {
      return entry.id;
    }),
  };
};

export const chooseCapsuleRarity = (roll: number): CapsuleRarity => {
  if (roll < 0.7) {
    return 'common';
  }

  if (roll < 0.95) {
    return 'rare';
  }

  return 'epic';
};

export const isCapsulePityPull = (pullsSinceEpic: number): boolean => {
  return pullsSinceEpic + 1 >= CAPSULE_PITY;
};

const chooseEntryForRarity = (
  rarity: CapsuleRarity,
  roll: number
): InkCatalogEntry => {
  const matchingEntries = INK_CATALOG.filter((entry) => {
    return entry.rarity === rarity;
  });
  const selectedEntry = matchingEntries[Math.floor(roll * matchingEntries.length)];

  if (!selectedEntry) {
    throw new Error(`No Mystery Ink catalog entries for ${rarity}.`);
  }

  return selectedEntry;
};

export const selectCapsuleDrop = (
  options: CapsuleSelectionOptions
): InkCatalogEntry => {
  const seed = hashTextToSeed(
    `capsule:${options.userId}:${options.day}:${options.pullCount}`
  );
  const randomNumber = createSeededNumberGenerator(seed);
  const rarity = isCapsulePityPull(options.pullsSinceEpic)
    ? 'epic'
    : chooseCapsuleRarity(randomNumber());

  return chooseEntryForRarity(rarity, randomNumber());
};

const createCapsulePull = (
  entry: InkCatalogEntry,
  isNew: boolean,
  ownedCount: number
): CapsulePull => {
  return {
    rarity: entry.rarity,
    kind: entry.kind,
    id: entry.id,
    name: entry.name,
    description: entry.description,
    isNew,
    ownedCount,
  };
};

const unlockInventoryEntry = async (
  storage: ArenaStorage,
  userId: string,
  entry: InkCatalogEntry
): Promise<void> => {
  await storage.hSet(getInventoryKey(userId), {
    [entry.id]: entry.kind,
  });
};

const getStoredOwnedCount = (
  entry: InkCatalogEntry,
  inventoryEntries: Record<string, string>
): number => {
  if (entry.kind === 'accessory') {
    return parseStoredNonNegativeInteger(inventoryEntries[entry.id]);
  }

  return inventoryEntries[entry.id] === undefined ? 0 : 1;
};

const getNextOwnedCount = (
  entry: InkCatalogEntry,
  inventoryEntries: Record<string, string>
): number => {
  if (entry.kind === 'accessory') {
    return getStoredOwnedCount(entry, inventoryEntries) + 1;
  }

  return 1;
};

const applyCapsulePullWithoutTransaction = async (
  storage: InkStorage,
  userId: string,
  entry: InkCatalogEntry,
  isNew: boolean,
  capsuleCost: number,
  dailyPullKey: string,
  nextPullCount: number,
  nextPullsSinceEpic: number
): Promise<void> => {
  await storage.incrBy(getInkKey(userId), -capsuleCost);

  await storage.set(getCapsulePullCountKey(userId), nextPullCount.toString());
  await storage.set(dailyPullKey, '1');
  await storage.expire(dailyPullKey, capsuleDailyFlagTtlSeconds);
  await storage.set(
    getPullsSinceEpicKey(userId),
    nextPullsSinceEpic.toString()
  );

  if (entry.kind === 'accessory') {
    await storage.hIncrBy(getInventoryKey(userId), entry.id, 1);
  } else if (isNew) {
    await unlockInventoryEntry(storage, userId, entry);
  }
};

const applyCapsulePullWithTransaction = async (
  transaction: InkTransaction,
  userId: string,
  entry: InkCatalogEntry,
  isNew: boolean,
  capsuleCost: number,
  dailyPullKey: string,
  nextPullCount: number,
  nextPullsSinceEpic: number,
  operationCommit?: {
    operationKey: string;
    responseJson: string;
  }
): Promise<boolean> => {
  await transaction.multi();
  await transaction.incrBy(getInkKey(userId), -capsuleCost);

  await transaction.set(getCapsulePullCountKey(userId), nextPullCount.toString());
  await transaction.set(dailyPullKey, '1');
  await transaction.expire(dailyPullKey, capsuleDailyFlagTtlSeconds);
  await transaction.set(
    getPullsSinceEpicKey(userId),
    nextPullsSinceEpic.toString()
  );

  if (entry.kind === 'accessory') {
    await transaction.hIncrBy(getInventoryKey(userId), entry.id, 1);
  } else if (isNew) {
    await transaction.hSet(getInventoryKey(userId), {
      [entry.id]: entry.kind,
    });
  }

  if (operationCommit) {
    await transaction.set(
      operationCommit.operationKey,
      operationCommit.responseJson
    );
    await transaction.expire(
      operationCommit.operationKey,
      capsuleOperationTtlSeconds
    );
  }

  const execResult: unknown = await transaction.exec();
  return Array.isArray(execResult) && execResult.length > 0;
};

const discardTransaction = async (
  transaction: InkTransaction | undefined
): Promise<void> => {
  if (!transaction) {
    return;
  }

  try {
    await transaction.discard();
  } catch (error) {
    console.warn('Mystery Ink transaction cleanup failed:', error);
  }
};

const isNonNegativeInteger = (value: unknown): value is number => {
  return Number.isInteger(value) && Number(value) >= 0;
};

const parseCapsuleOperationResponse = (
  storedValue: string
): CapsulePullResponse | undefined => {
  try {
    const response: unknown = JSON.parse(storedValue);
    if (typeof response !== 'object' || response === null) return undefined;
    const record = response as Record<string, unknown>;
    const pull = record.pull;
    const inventory = record.inventory;
    if (typeof pull !== 'object' || pull === null || Array.isArray(pull)) {
      return undefined;
    }
    if (
      typeof inventory !== 'object' ||
      inventory === null ||
      Array.isArray(inventory)
    ) {
      return undefined;
    }

    const pullRecord = pull as Record<string, unknown>;
    const inventoryRecord = inventory as Record<string, unknown>;
    const itemCounts = inventoryRecord.items;
    if (
      typeof itemCounts !== 'object' ||
      itemCounts === null ||
      Array.isArray(itemCounts)
    ) {
      return undefined;
    }
    if (
      !['common', 'rare', 'epic'].includes(String(pullRecord.rarity)) ||
      !['accessory', 'pen', 'title'].includes(String(pullRecord.kind)) ||
      typeof pullRecord.id !== 'string' ||
      typeof pullRecord.name !== 'string' ||
      typeof pullRecord.description !== 'string' ||
      typeof pullRecord.isNew !== 'boolean' ||
      !isNonNegativeInteger(pullRecord.ownedCount) ||
      !isNonNegativeInteger(record.ink) ||
      !isNonNegativeInteger(record.nextCost) ||
      !Array.isArray(inventoryRecord.pens) ||
      !inventoryRecord.pens.every((value) => typeof value === 'string') ||
      !Array.isArray(inventoryRecord.titles) ||
      !inventoryRecord.titles.every((value) => typeof value === 'string') ||
      !Object.values(itemCounts).every(isNonNegativeInteger)
    ) {
      return undefined;
    }

    return response as CapsulePullResponse;
  } catch {
    return undefined;
  }
};

// Claim one unique operation key with WATCH/MULTI instead of deleting a stale
// shared-hash field. If a delayed request commits between our read and write,
// EXEC aborts and the next attempt returns its receipt rather than charging a
// second time. Corrupt receipts are replaced through the same fenced path.
export const claimCapsuleOperation = async (
  storage: InkStorage,
  operationKey: string,
  claimedAtMs: number,
  pendingTimeoutMs: number
): Promise<CapsuleOperationClaim> => {
  if (!storage.watch) {
    throw new Error('Atomic capsule operations require transaction support.');
  }
  const pendingValue = `${capsuleOperationPendingPrefix}${claimedAtMs}`;

  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: InkTransaction | undefined;
    try {
      transaction = await storage.watch(operationKey);
      const storedValue = await storage.get(operationKey);
      if (storedValue?.startsWith(capsuleOperationPendingPrefix)) {
        const pendingAtMs = Number(
          storedValue.slice(capsuleOperationPendingPrefix.length)
        );
        if (
          Number.isFinite(pendingAtMs) &&
          claimedAtMs - pendingAtMs < pendingTimeoutMs
        ) {
          await transaction.unwatch();
          return { status: 'pending' };
        }
      } else if (storedValue !== undefined) {
        const response = parseCapsuleOperationResponse(storedValue);
        if (response) {
          await transaction.unwatch();
          return { status: 'completed', response };
        }
      }

      await transaction.multi();
      await transaction.set(operationKey, pendingValue);
      await transaction.expire(operationKey, capsuleOperationTtlSeconds);
      const execResult: unknown = await transaction.exec();
      if (Array.isArray(execResult) && execResult.length > 0) {
        return { status: 'claimed', pendingValue };
      }
    } catch (error) {
      await discardTransaction(transaction);
      throw error;
    }
  }

  throw new Error('Mystery Ink operation claim did not settle.');
};

// Release only the exact pending value owned by this request. A stale worker
// can never delete a newer pending claim or a committed response receipt.
export const releaseCapsuleOperation = async (
  storage: InkStorage,
  operationKey: string,
  expectedPendingValue: string
): Promise<boolean> => {
  if (!storage.watch) {
    throw new Error('Atomic capsule operations require transaction support.');
  }

  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: InkTransaction | undefined;
    try {
      transaction = await storage.watch(operationKey);
      if ((await storage.get(operationKey)) !== expectedPendingValue) {
        await transaction.unwatch();
        return false;
      }

      await transaction.multi();
      await transaction.del(operationKey);
      const execResult: unknown = await transaction.exec();
      if (Array.isArray(execResult) && execResult.length > 0) return true;
    } catch (error) {
      await discardTransaction(transaction);
      throw error;
    }
  }

  throw new Error('Mystery Ink operation release did not settle.');
};

const readPullCount = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  return parseStoredNonNegativeInteger(
    await storage.get(getCapsulePullCountKey(userId))
  );
};

const readPullsSinceEpic = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  return parseStoredNonNegativeInteger(
    await storage.get(getPullsSinceEpicKey(userId))
  );
};

export const pullCapsuleForUser = async (
  storage: InkStorage,
  userId: string,
  day: number,
  operation?: CapsuleOperationCommit
): Promise<CapsulePullResult> => {
  if (operation && !storage.watch) {
    throw new Error('Atomic capsule operations require transaction support.');
  }
  const dailyPullKey = getCapsuleDailyPullKey(userId, day);
  const watchedKeys = [
    getInkKey(userId),
    getInventoryKey(userId),
    getCapsulePullCountKey(userId),
    getPullsSinceEpicKey(userId),
    dailyPullKey,
    ...(operation ? [operation.operationKey] : []),
  ];

  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: InkTransaction | undefined;

    try {
      if (storage.watch) {
        transaction = await storage.watch(...watchedKeys);
      }

      if (
        operation &&
        (await storage.get(operation.operationKey)) !==
          operation.expectedPendingValue
      ) {
        if (transaction) await transaction.unwatch();
        throw new Error('Capsule operation claim changed before commit.');
      }

      const [
        inkBalance,
        storedDailyPull,
        pullCount,
        pullsSinceEpic,
        inventoryEntries,
      ] = await Promise.all([
        getInkBalance(storage, userId),
        storage.get(dailyPullKey),
        readPullCount(storage, userId),
        readPullsSinceEpic(storage, userId),
        storage.hGetAll(getInventoryKey(userId)),
      ]);
      const pulledToday = storedDailyPull !== undefined;
      const capsuleCost = pulledToday ? CAPSULE_COST : CAPSULE_FIRST_DAILY_COST;

      if (inkBalance < capsuleCost) {
        if (transaction) {
          await transaction.unwatch();
        }

        return {
          status: 'insufficientInk',
          ink: inkBalance,
          cost: capsuleCost,
        };
      }

      const nextPullCount = pullCount + 1;
      const selectedEntry = selectCapsuleDrop({
        userId,
        day,
        pullCount: nextPullCount,
        pullsSinceEpic,
      });
      const isNew = inventoryEntries[selectedEntry.id] === undefined;
      const ownedCount = getNextOwnedCount(selectedEntry, inventoryEntries);
      const nextPullsSinceEpic =
        selectedEntry.rarity === 'epic' ? 0 : pullsSinceEpic + 1;
      const nextInventoryEntries = { ...inventoryEntries };
      if (selectedEntry.kind === 'accessory') {
        nextInventoryEntries[selectedEntry.id] = ownedCount.toString();
      } else if (isNew) {
        nextInventoryEntries[selectedEntry.id] = selectedEntry.kind;
      }
      const pull = createCapsulePull(selectedEntry, isNew, ownedCount);
      const success: CapsulePullSuccess = {
        status: 'pulled',
        pull,
        ink: inkBalance - capsuleCost,
        inventory: inventoryFromStoredEntries(nextInventoryEntries),
        nextCost: CAPSULE_COST,
      };
      const operationResponse: CapsulePullResponse = {
        pull: success.pull,
        ink: success.ink,
        inventory: success.inventory,
        nextCost: success.nextCost,
      };

      if (transaction) {
        const committed = await applyCapsulePullWithTransaction(
          transaction,
          userId,
          selectedEntry,
          isNew,
          capsuleCost,
          dailyPullKey,
          nextPullCount,
          nextPullsSinceEpic,
          operation
            ? {
                operationKey: operation.operationKey,
                responseJson: JSON.stringify(operationResponse),
              }
            : undefined
        );

        if (!committed) {
          continue;
        }
      } else {
        await applyCapsulePullWithoutTransaction(
          storage,
          userId,
          selectedEntry,
          isNew,
          capsuleCost,
          dailyPullKey,
          nextPullCount,
          nextPullsSinceEpic
        );
      }

      return success;
    } catch (error) {
      await discardTransaction(transaction);
      throw error;
    }
  }

  throw new Error('Mystery Ink capsule pull did not settle.');
};

type RequiredAccessoryCounts = Map<string, number>;

export type AccessoryConsumeResult =
  | {
      status: 'consumed';
      rollback: () => Promise<void>;
    }
  | {
      status: 'insufficient';
      accessoryId: string;
    }
  | {
      status: 'race';
      accessoryId: string;
    }
  | {
      status: 'invalid';
      accessoryId: string;
    };

const createRequiredAccessoryCounts = (
  accessoryIds: string[]
): RequiredAccessoryCounts | undefined => {
  const requiredCounts: RequiredAccessoryCounts = new Map();

  for (const accessoryId of accessoryIds) {
    if (!isAccessoryCatalogEntry(findInkCatalogEntry(accessoryId))) {
      return undefined;
    }

    requiredCounts.set(
      accessoryId,
      (requiredCounts.get(accessoryId) ?? 0) + 1
    );
  }

  return requiredCounts;
};

const getFirstRequiredAccessoryId = (
  requiredCounts: RequiredAccessoryCounts
): string => {
  for (const accessoryId of requiredCounts.keys()) {
    return accessoryId;
  }

  return 'accessory';
};

const findMissingAccessory = (
  inventoryEntries: Record<string, string>,
  requiredCounts: RequiredAccessoryCounts
): string | undefined => {
  for (const [accessoryId, requiredCount] of requiredCounts.entries()) {
    const ownedCount = parseStoredNonNegativeInteger(
      inventoryEntries[accessoryId]
    );

    if (ownedCount < requiredCount) {
      return accessoryId;
    }
  }

  return undefined;
};

const restoreAccessoryCounts = async (
  storage: ArenaStorage,
  inventoryKey: string,
  requiredCounts: RequiredAccessoryCounts
): Promise<void> => {
  for (const [accessoryId, requiredCount] of requiredCounts.entries()) {
    await storage.hIncrBy(inventoryKey, accessoryId, requiredCount);
  }
};

const createAccessoryRollback = (
  storage: ArenaStorage,
  inventoryKey: string,
  requiredCounts: RequiredAccessoryCounts
): (() => Promise<void>) => {
  return async () => {
    await restoreAccessoryCounts(storage, inventoryKey, requiredCounts);
  };
};

const consumeAccessoriesWithTransaction = async (
  storage: InkStorage,
  userId: string,
  requiredCounts: RequiredAccessoryCounts
): Promise<AccessoryConsumeResult> => {
  const inventoryKey = getInventoryKey(userId);

  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: InkTransaction | undefined;

    try {
      if (storage.watch) {
        transaction = await storage.watch(inventoryKey);
      }

      const inventoryEntries = await storage.hGetAll(inventoryKey);
      const missingAccessory = findMissingAccessory(
        inventoryEntries,
        requiredCounts
      );

      if (missingAccessory) {
        if (transaction) {
          await transaction.unwatch();
        }

        return {
          status: 'insufficient',
          accessoryId: missingAccessory,
        };
      }

      if (!transaction) {
        break;
      }

      await transaction.multi();

      for (const [accessoryId, requiredCount] of requiredCounts.entries()) {
        await transaction.hIncrBy(inventoryKey, accessoryId, -requiredCount);
      }

      const execResult: unknown = await transaction.exec();

      if (Array.isArray(execResult) && execResult.length > 0) {
        return {
          status: 'consumed',
          rollback: createAccessoryRollback(
            storage,
            inventoryKey,
            requiredCounts
          ),
        };
      }
    } catch (error) {
      await discardTransaction(transaction);
      throw error;
    }
  }

  return {
    status: 'race',
    accessoryId: getFirstRequiredAccessoryId(requiredCounts),
  };
};

const consumeAccessoriesWithoutTransaction = async (
  storage: ArenaStorage,
  userId: string,
  requiredCounts: RequiredAccessoryCounts
): Promise<AccessoryConsumeResult> => {
  const inventoryKey = getInventoryKey(userId);
  const inventoryEntries = await storage.hGetAll(inventoryKey);
  const missingAccessory = findMissingAccessory(
    inventoryEntries,
    requiredCounts
  );

  if (missingAccessory) {
    return {
      status: 'insufficient',
      accessoryId: missingAccessory,
    };
  }

  const decrementedCounts: RequiredAccessoryCounts = new Map();

  for (const [accessoryId, requiredCount] of requiredCounts.entries()) {
    const nextCount = await storage.hIncrBy(
      inventoryKey,
      accessoryId,
      -requiredCount
    );
    decrementedCounts.set(accessoryId, requiredCount);

    if (nextCount < 0) {
      await restoreAccessoryCounts(storage, inventoryKey, decrementedCounts);
      return {
        status: 'race',
        accessoryId,
      };
    }
  }

  return {
    status: 'consumed',
    rollback: createAccessoryRollback(storage, inventoryKey, requiredCounts),
  };
};

export const consumeAccessoriesForSubmit = async (
  storage: InkStorage,
  userId: string,
  accessoryIds: string[]
): Promise<AccessoryConsumeResult> => {
  const requiredCounts = createRequiredAccessoryCounts(accessoryIds);

  if (!requiredCounts) {
    return {
      status: 'invalid',
      accessoryId: accessoryIds[0] ?? 'accessory',
    };
  }

  if (requiredCounts.size === 0) {
    return {
      status: 'consumed',
      rollback: async () => {},
    };
  }

  if (storage.watch) {
    return await consumeAccessoriesWithTransaction(
      storage,
      userId,
      requiredCounts
    );
  }

  return await consumeAccessoriesWithoutTransaction(
    storage,
    userId,
    requiredCounts
  );
};
