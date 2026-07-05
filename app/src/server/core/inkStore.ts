import type {
  CapsulePull,
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
};

export type CapsulePullInsufficientInk = {
  status: 'insufficientInk';
  ink: number;
  cost: number;
};

export type CapsulePullResult =
  | CapsulePullSuccess
  | CapsulePullInsufficientInk;

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
  nextPullsSinceEpic: number
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
  day: number
): Promise<CapsulePullResult> => {
  const dailyPullKey = getCapsuleDailyPullKey(userId, day);
  const watchedKeys = [
    getInkKey(userId),
    getInventoryKey(userId),
    getCapsulePullCountKey(userId),
    getPullsSinceEpicKey(userId),
    dailyPullKey,
  ];

  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: InkTransaction | undefined;

    try {
      if (storage.watch) {
        transaction = await storage.watch(...watchedKeys);
      }

      const inkBalance = await getInkBalance(storage, userId);
      const pulledToday = (await storage.get(dailyPullKey)) !== undefined;
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

      const pullCount = await readPullCount(storage, userId);
      const pullsSinceEpic = await readPullsSinceEpic(storage, userId);
      const inventoryEntries = await storage.hGetAll(getInventoryKey(userId));
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

      if (transaction) {
        const committed = await applyCapsulePullWithTransaction(
          transaction,
          userId,
          selectedEntry,
          isNew,
          capsuleCost,
          dailyPullKey,
          nextPullCount,
          nextPullsSinceEpic
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

      return {
        status: 'pulled',
        pull: createCapsulePull(selectedEntry, isNew, ownedCount),
        ink: inkBalance - capsuleCost,
        inventory: await loadInventory(storage, userId),
      };
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
