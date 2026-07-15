import type {
  CapsuleProgress,
  CapsulePull,
  CapsulePullResponse,
  CapsuleRarity,
  DrawingSupplySelection,
  GearInventoryEntry,
  GearRank,
  Inventory,
  MergeGearResponse,
} from '../../shared/arena';
import {
  CAPSULE_COST,
  CAPSULE_FIRST_DAILY_COST,
  CAPSULE_PITY,
  CAPSULE_RARITY_PERCENTAGES,
  GEAR_MERGE_COPY_COST,
  getGearMergeCopyCost,
  isCapsuleRarity,
  isEpicOrBetterCapsuleRarity,
  isGearRank,
  MAX_GEAR_RANK,
} from '../../shared/arena';
import { createMulberry32, hashTextToSeed } from './random';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import {
  pruneExpiredPayoutReceipts,
  trackPayoutReceipt,
} from './payoutReceipt';
import {
  INK_ACCESSORY_CATALOG,
  INK_BRUSH_CATALOG,
  INK_CATALOG,
  INK_DRAWING_INK_CATALOG,
  INK_PEN_CATALOG,
  INK_TITLE_CATALOG,
  findInkCatalogEntry,
  isAccessoryCatalogEntry,
  isBrushCatalogEntry,
  isConsumableCatalogEntry,
  isDrawingInkCatalogEntry,
  isPermanentCatalogEntry,
  type InkCatalogEntry,
} from './ink';

export type CapsulePullSuccess = {
  status: 'pulled';
  pull: CapsulePull;
  ink: number;
  inventory: Inventory;
  nextCost: number;
  progress: CapsuleProgress;
};

export type CapsulePullInsufficientInk = {
  status: 'insufficientInk';
  ink: number;
  cost: number;
};

export type CapsulePullResult = CapsulePullSuccess | CapsulePullInsufficientInk;

export type CapsuleOperationCommit = {
  operationKey: string;
  expectedPendingValue: string;
  selectionEntropy: string;
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
  entropy?: string;
};

type InkRewardClaimOptions = {
  payoutKey: string;
  payoutField: string;
  userId: string;
  amount: number;
  paidAtMs: number;
};

type StoredCounterParseResult =
  | { status: 'missing' }
  | { status: 'valid'; value: number }
  | { status: 'invalid' };

const capsuleDailyFlagTtlSeconds = 3 * 24 * 60 * 60;
const capsuleOperationTtlSeconds = 3 * 24 * 60 * 60;
const capsuleOperationPendingPrefix = 'pending:';
const capsuleOperationKeyPrefix = 'capsule:operation:';
const userOperationReceiptIndexSuffix = 'operation-receipts';
const inventoryDiscoveryFieldPrefix = 'discovered:';
const inventoryGearRankFieldPrefix = 'gear-rank:';
const inventoryEquippedTitleField = 'equipped-title';
const gearMergeOperationKeyPrefix = 'gear:merge:operation:';

export const getInkKey = (userId: string): string => {
  return `ink:${userId}`;
};

export const getInventoryKey = (userId: string): string => {
  return `inventory:${userId}`;
};

export const getInventoryDiscoveryField = (catalogId: string): string => {
  return `${inventoryDiscoveryFieldPrefix}${catalogId}`;
};

export const getInventoryGearRankField = (catalogId: string): string => {
  return `${inventoryGearRankFieldPrefix}${catalogId}`;
};

export const getGearMergeOperationKey = (
  userId: string,
  operationId: string
): string => {
  return `${gearMergeOperationKeyPrefix}${userId}:${operationId}`;
};

export const getPullsSinceEpicKey = (userId: string): string => {
  return `pullsSinceEpic:${userId}`;
};

export const getCapsulePullCountKey = (userId: string): string => {
  return `capsulePulls:${userId}`;
};

export const getCapsuleDailyPullKey = (userId: string, day: number): string => {
  return `capsuleDaily:${userId}:${day}`;
};

export const getCapsuleOperationKey = (
  userId: string,
  operationId: string
): string => {
  return `${capsuleOperationKeyPrefix}${userId}:${operationId}`;
};

export const getUserOperationReceiptIndexKey = (userId: string): string => {
  return `user:${userId}:${userOperationReceiptIndexSuffix}`;
};

export const loadUserOperationReceiptKeys = async (
  storage: ArenaStorage,
  userId: string
): Promise<string[]> => {
  const entries = await storage.zRange(
    getUserOperationReceiptIndexKey(userId),
    0,
    -1,
    { by: 'rank' }
  );
  const capsulePrefix = `${capsuleOperationKeyPrefix}${userId}:`;
  const gearMergePrefix = `${gearMergeOperationKeyPrefix}${userId}:`;
  return entries
    .map((entry) => entry.member)
    .filter(
      (operationKey) =>
        operationKey.startsWith(capsulePrefix) ||
        operationKey.startsWith(gearMergePrefix)
    );
};

const trackOperationReceipt = async (
  transaction: Pick<ArenaTransaction, 'zAdd' | 'expire'>,
  userId: string,
  operationKey: string,
  expiresAtMs: number
): Promise<void> => {
  const indexKey = getUserOperationReceiptIndexKey(userId);
  await transaction.zAdd(indexKey, {
    member: operationKey,
    score: expiresAtMs,
  });
  await transaction.expire(indexKey, capsuleOperationTtlSeconds);
};

const pruneExpiredOperationReceipts = async (
  storage: ArenaStorage,
  userId: string,
  nowMs: number
): Promise<void> => {
  const indexKey = getUserOperationReceiptIndexKey(userId);
  const expiredEntries = await storage.zRange(indexKey, 0, nowMs, {
    by: 'score',
  });
  if (expiredEntries.length > 0) {
    await storage.zRem(
      indexKey,
      expiredEntries.map((entry) => entry.member)
    );
  }
};

export const getCapsuleCostForDailyState = (pulledToday: boolean): number => {
  return pulledToday ? CAPSULE_COST : CAPSULE_FIRST_DAILY_COST;
};

export const getNextCapsuleCost = async (
  storage: ArenaStorage,
  userId: string,
  day: number
): Promise<number> => {
  const pulledToday =
    (await storage.get(getCapsuleDailyPullKey(userId, day))) !== undefined;
  return getCapsuleCostForDailyState(pulledToday);
};

export const getRumbleWinInkPayoutKey = (day: number): string => {
  return `ink:payout:rumbleWin:${day}`;
};

const parseStoredCounter = (
  storedValue: string | undefined,
  maximumValue: number
): StoredCounterParseResult => {
  if (storedValue === undefined) return { status: 'missing' };
  if (!/^(0|[1-9]\d*)$/.test(storedValue)) return { status: 'invalid' };
  const parsedValue = Number(storedValue);
  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > maximumValue
  ) {
    return { status: 'invalid' };
  }
  return { status: 'valid', value: parsedValue };
};

const readStoredCounter = async (
  storage: ArenaStorage,
  key: string,
  counterName: string,
  maximumValue = Number.MAX_SAFE_INTEGER
): Promise<number> => {
  const parsed = parseStoredCounter(await storage.get(key), maximumValue);
  if (parsed.status === 'missing') return 0;
  if (parsed.status === 'valid') return parsed.value;
  throw new Error(`Stored ${counterName} is invalid.`);
};

const parseStoredInventoryCount = (storedValue: string | undefined): number => {
  const parsedValue = Number(storedValue);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
};

export const getInkBalance = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  return await readStoredCounter(storage, getInkKey(userId), 'Ink balance');
};

const readPullCount = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  return await readStoredCounter(
    storage,
    getCapsulePullCountKey(userId),
    'capsule pull count'
  );
};

const readPullsSinceEpic = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  return await readStoredCounter(
    storage,
    getPullsSinceEpicKey(userId),
    'capsule pity counter',
    CAPSULE_PITY - 1
  );
};

export const awardInk = async (
  storage: ArenaStorage,
  userId: string,
  amount: number
): Promise<number> => {
  if (!Number.isInteger(amount) || amount <= 0) {
    return await getInkBalance(storage, userId);
  }

  await getInkBalance(storage, userId);
  return await storage.incrBy(getInkKey(userId), amount);
};

export const claimInkReward = async (
  storage: ArenaStorage,
  options: InkRewardClaimOptions
): Promise<boolean> => {
  if (options.amount <= 0) {
    return false;
  }

  if (!storage.watch) {
    throw new Error('Atomic Ink rewards require transaction support.');
  }

  const inkKey = getInkKey(options.userId);
  const receiptValue = `${options.userId}:${options.amount}:${options.paidAtMs}`;
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(options.payoutKey, inkKey);
      if (
        (await storage.hGet(options.payoutKey, options.payoutField)) !==
        undefined
      ) {
        await transaction.unwatch();
        return false;
      }
      await getInkBalance(storage, options.userId);
      await pruneExpiredPayoutReceipts(
        storage,
        options.userId,
        options.paidAtMs
      );

      await transaction.multi();
      await transaction.hSet(options.payoutKey, {
        [options.payoutField]: receiptValue,
      });
      await trackPayoutReceipt(
        transaction,
        options.userId,
        {
          payoutKey: options.payoutKey,
          payoutField: options.payoutField,
        },
        options.paidAtMs
      );
      await transaction.incrBy(inkKey, options.amount);
      const transactionResults = await transaction.exec();
      if (Array.isArray(transactionResults) && transactionResults.length > 0) {
        return true;
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Mystery Ink');
      try {
        const storedReceipt = await storage.hGet(
          options.payoutKey,
          options.payoutField
        );
        if (storedReceipt !== undefined) {
          return storedReceipt === receiptValue;
        }
      } catch {
        // Preserve the original transaction error when recovery cannot read.
      }
      throw error;
    }
  }

  throw new Error('Ink reward claim did not settle.');
};

const parseInkRewardReceipt = (
  stored: string
): Readonly<{ userId: string; amount: number }> | null => {
  const paidAtSeparator = stored.lastIndexOf(':');
  const amountSeparator = stored.lastIndexOf(':', paidAtSeparator - 1);
  if (paidAtSeparator <= amountSeparator || amountSeparator < 1) return null;
  const userId = stored.slice(0, amountSeparator);
  const amount = Number(stored.slice(amountSeparator + 1, paidAtSeparator));
  const paidAtMilliseconds = Number(stored.slice(paidAtSeparator + 1));
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(paidAtMilliseconds) ||
    paidAtMilliseconds < 0
  ) {
    return null;
  }
  return { userId, amount };
};

export const inkRewardReceiptBelongsToUser = (
  stored: string,
  userId: string
): boolean => parseInkRewardReceipt(stored)?.userId === userId;

export const loadClaimedInkRewardAmount = async (
  storage: ArenaStorage,
  input: Readonly<{
    payoutKey: string;
    payoutField: string;
    userId: string;
  }>
): Promise<number> => {
  const stored = await storage.hGet(input.payoutKey, input.payoutField);
  if (stored === undefined) return 0;
  const receipt = parseInkRewardReceipt(stored);
  return receipt?.userId === input.userId ? receipt.amount : 0;
};

const hasPermanentDiscovery = (
  entry: InkCatalogEntry,
  storedInventory: Record<string, string>
): boolean => {
  if (storedInventory[getInventoryDiscoveryField(entry.id)] !== undefined) {
    return true;
  }

  if (entry.kind === 'accessory') {
    return parseStoredInventoryCount(storedInventory[entry.id]) > 0;
  }

  return storedInventory[entry.id] !== undefined;
};

const getDiscoveredCatalogIds = (
  storedInventory: Record<string, string>
): string[] => {
  return INK_CATALOG.filter((entry) => {
    return hasPermanentDiscovery(entry, storedInventory);
  }).map((entry) => entry.id);
};

const parseStoredGearRank = (storedValue: string | undefined): GearRank => {
  const parsedRank = Number(storedValue);
  return isGearRank(parsedRank) ? parsedRank : 1;
};

const inventoryFromStoredEntries = (
  storedInventory: Record<string, string>
): Inventory => {
  const items: Record<string, number> = {};
  const gear: Record<string, GearInventoryEntry> = {};

  for (const entry of INK_ACCESSORY_CATALOG) {
    const ownedCount = parseStoredInventoryCount(storedInventory[entry.id]);

    if (ownedCount > 0) {
      items[entry.id] = ownedCount;
    }
    if (hasPermanentDiscovery(entry, storedInventory)) {
      gear[entry.id] = {
        rank: parseStoredGearRank(
          storedInventory[getInventoryGearRankField(entry.id)]
        ),
        copies: ownedCount,
        rarity: entry.rarity,
      };
    }
  }

  for (const entry of [...INK_DRAWING_INK_CATALOG, ...INK_BRUSH_CATALOG]) {
    const ownedCount = parseStoredInventoryCount(storedInventory[entry.id]);
    if (ownedCount > 0) items[entry.id] = ownedCount;
  }

  const titles = INK_TITLE_CATALOG.filter((entry) => {
    return storedInventory[entry.id] !== undefined;
  }).map((entry) => {
    return entry.id;
  });
  const storedEquippedTitle = storedInventory[inventoryEquippedTitleField];

  return {
    items,
    gear,
    pens: INK_PEN_CATALOG.filter((entry) => {
      return storedInventory[entry.id] !== undefined;
    }).map((entry) => {
      return entry.id;
    }),
    titles,
    equippedTitle:
      storedEquippedTitle && titles.includes(storedEquippedTitle)
        ? storedEquippedTitle
        : null,
    discovered: getDiscoveredCatalogIds(storedInventory),
  };
};

const persistLegacyDiscoveryMarkers = async (
  storage: ArenaStorage,
  inventoryKey: string,
  storedInventory: Record<string, string>,
  discoveredCatalogIds: string[]
): Promise<void> => {
  const missingMarkers: Record<string, string> = {};

  for (const catalogId of discoveredCatalogIds) {
    const discoveryField = getInventoryDiscoveryField(catalogId);
    if (storedInventory[discoveryField] === undefined) {
      missingMarkers[discoveryField] = '1';
    }
    const catalogEntry = findInkCatalogEntry(catalogId);
    const rankField = getInventoryGearRankField(catalogId);
    if (
      catalogEntry?.kind === 'accessory' &&
      storedInventory[rankField] === undefined
    ) {
      missingMarkers[rankField] = '1';
    }
  }

  await Promise.all(
    Object.entries(missingMarkers).map(async ([field, value]) => {
      await storage.hSetNX(inventoryKey, field, value);
    })
  );
};

export const loadInventory = async (
  storage: ArenaStorage,
  userId: string
): Promise<Inventory> => {
  const inventoryKey = getInventoryKey(userId);
  const storedInventory = await storage.hGetAll(inventoryKey);
  const inventory = inventoryFromStoredEntries(storedInventory);
  await persistLegacyDiscoveryMarkers(
    storage,
    inventoryKey,
    storedInventory,
    inventory.discovered
  );
  return inventory;
};

export const projectEquippedTitle = (
  inventory: Inventory,
  titleId: string | null
): Inventory | undefined => {
  if (titleId !== null && !inventory.titles.includes(titleId)) {
    return undefined;
  }

  return {
    items: { ...inventory.items },
    gear: Object.fromEntries(
      Object.entries(inventory.gear ?? {}).map(([gearId, gear]) => [
        gearId,
        { ...gear },
      ])
    ),
    pens: [...inventory.pens],
    titles: [...inventory.titles],
    equippedTitle: titleId,
    discovered: [...inventory.discovered],
  };
};

export const setEquippedTitle = async (
  storage: ArenaStorage,
  userId: string,
  titleId: string | null
): Promise<Inventory | undefined> => {
  const inventory = await loadInventory(storage, userId);
  const projectedInventory = projectEquippedTitle(inventory, titleId);
  if (!projectedInventory) return undefined;

  const inventoryKey = getInventoryKey(userId);
  if (titleId === null) {
    await storage.hDel(inventoryKey, [inventoryEquippedTitleField]);
  } else {
    await storage.hSet(inventoryKey, {
      [inventoryEquippedTitleField]: titleId,
    });
  }

  return projectedInventory;
};

export const createCapsuleProgress = (
  pullCount: number,
  pullsSinceEpic: number,
  discoveredCount: number
): CapsuleProgress => {
  return {
    pullCount,
    pityRemaining: Math.max(1, CAPSULE_PITY - pullsSinceEpic),
    discoveredCount,
    collectionTotal: INK_CATALOG.length,
  };
};

export const loadCapsuleProgress = async (
  storage: ArenaStorage,
  userId: string,
  loadedInventory?: Inventory
): Promise<CapsuleProgress> => {
  const [pullCount, pullsSinceEpic, inventory] = await Promise.all([
    readPullCount(storage, userId),
    readPullsSinceEpic(storage, userId),
    loadedInventory ?? loadInventory(storage, userId),
  ]);

  return createCapsuleProgress(
    pullCount,
    pullsSinceEpic,
    inventory.discovered.length
  );
};

export const chooseCapsuleRarity = (roll: number): CapsuleRarity => {
  const commonThreshold = CAPSULE_RARITY_PERCENTAGES.common / 100;
  const rareThreshold =
    (CAPSULE_RARITY_PERCENTAGES.common + CAPSULE_RARITY_PERCENTAGES.rare) / 100;
  const epicThreshold =
    (CAPSULE_RARITY_PERCENTAGES.common +
      CAPSULE_RARITY_PERCENTAGES.rare +
      CAPSULE_RARITY_PERCENTAGES.epic) /
    100;

  if (roll < commonThreshold) {
    return 'common';
  }

  if (roll < rareThreshold) {
    return 'rare';
  }

  return roll < epicThreshold ? 'epic' : 'legendary';
};

export const isCapsulePityPull = (pullsSinceEpic: number): boolean => {
  return pullsSinceEpic + 1 >= CAPSULE_PITY;
};

export const advanceCapsulePity = (
  pullsSinceEpic: number,
  pulledRarity: CapsuleRarity
): number => {
  return isEpicOrBetterCapsuleRarity(pulledRarity) ? 0 : pullsSinceEpic + 1;
};

const chooseEntryForRarity = (
  rarity: CapsuleRarity,
  roll: number,
  discoveredCatalogIds: ReadonlySet<string>,
  unusableCatalogIds: ReadonlySet<string>,
  gearOnly = false
): InkCatalogEntry => {
  const catalog = gearOnly ? INK_ACCESSORY_CATALOG : INK_CATALOG;
  const matchingEntries = catalog.filter((entry) => {
    return entry.rarity === rarity;
  });
  const selectedEntry =
    matchingEntries[Math.floor(roll * matchingEntries.length)];

  if (!selectedEntry) {
    throw new Error(`No Mystery Ink catalog entries for ${rarity}.`);
  }

  // Consumable duplicates are useful charges. A duplicate permanent pen or
  // title would be a paid no-op, so redirect only those permanent kinds.
  // This keeps rarity odds and pity unchanged while removing dead pulls.
  if (
    (isPermanentCatalogEntry(selectedEntry) &&
      discoveredCatalogIds.has(selectedEntry.id)) ||
    unusableCatalogIds.has(selectedEntry.id)
  ) {
    const protectedEntries = matchingEntries.filter((entry) => {
      if (unusableCatalogIds.has(entry.id)) return false;
      return isConsumableCatalogEntry(entry)
        ? true
        : !discoveredCatalogIds.has(entry.id);
    });
    const protectedEntry =
      protectedEntries[Math.floor(roll * protectedEntries.length)];
    if (protectedEntry) return protectedEntry;
  }

  return selectedEntry;
};

export const selectCapsuleDrop = (
  options: CapsuleSelectionOptions,
  discoveredCatalogIds: ReadonlySet<string> = new Set(),
  unusableCatalogIds: ReadonlySet<string> = new Set()
): InkCatalogEntry => {
  const deterministicSeedInput = `capsule:${options.userId}:${options.day}:${options.pullCount}`;
  const seedInput =
    options.entropy === undefined
      ? deterministicSeedInput
      : `${deterministicSeedInput}:entropy:${options.entropy}`;
  const seed = hashTextToSeed(seedInput);
  const randomNumber = createMulberry32(seed);
  const rarity = isCapsulePityPull(options.pullsSinceEpic)
    ? 'epic'
    : chooseCapsuleRarity(randomNumber());

  // The first chest always starts progression with equippable Gear. Rarity
  // odds remain unchanged; only the eligible item pool is narrowed.
  return chooseEntryForRarity(
    rarity,
    randomNumber(),
    discoveredCatalogIds,
    unusableCatalogIds,
    options.pullCount === 1
  );
};

const createCapsulePull = (
  entry: InkCatalogEntry,
  isNew: boolean,
  ownedCount: number,
  gear: GearInventoryEntry | undefined
): CapsulePull => {
  return {
    rarity: entry.rarity,
    kind: entry.kind,
    id: entry.id,
    name: entry.name,
    description: entry.description,
    isNew,
    ownedCount,
    gearRank: gear?.rank ?? null,
    mergeReady:
      gear !== undefined &&
      gear.rank < MAX_GEAR_RANK &&
      gear.copies >= GEAR_MERGE_COPY_COST,
  };
};

export type CapsuleInventoryGrant = Readonly<{
  inventory: Inventory;
  isNew: boolean;
  ownedCount: number;
}>;

export const projectCapsuleInventoryGrant = (
  inventory: Inventory,
  entry: InkCatalogEntry
): CapsuleInventoryGrant => {
  const isNew = !inventory.discovered.includes(entry.id);
  const nextInventory: Inventory = {
    items: { ...inventory.items },
    gear: Object.fromEntries(
      Object.entries(inventory.gear ?? {}).map(([gearId, gear]) => [
        gearId,
        { ...gear },
      ])
    ),
    pens: [...inventory.pens],
    titles: [...inventory.titles],
    equippedTitle: inventory.equippedTitle,
    discovered: isNew
      ? [...inventory.discovered, entry.id]
      : [...inventory.discovered],
  };

  let ownedCount = 1;
  if (isConsumableCatalogEntry(entry)) {
    ownedCount = (nextInventory.items[entry.id] ?? 0) + 1;
    nextInventory.items[entry.id] = ownedCount;
    if (entry.kind === 'accessory') {
      const currentGear = nextInventory.gear[entry.id];
      nextInventory.gear[entry.id] = {
        rank: currentGear?.rank ?? 1,
        copies: ownedCount,
        rarity: entry.rarity,
      };
    }
  } else {
    const permanentInventory =
      entry.kind === 'pen' ? nextInventory.pens : nextInventory.titles;
    if (!permanentInventory.includes(entry.id)) {
      permanentInventory.push(entry.id);
    }
  }

  return { inventory: nextInventory, isNew, ownedCount };
};

const applyCapsulePullWithoutTransaction = async (
  storage: ArenaStorage,
  userId: string,
  entry: InkCatalogEntry,
  isNew: boolean,
  capsuleCost: number,
  dailyPullKey: string,
  nextPullCount: number,
  nextPullsSinceEpic: number
): Promise<void> => {
  const inventoryKey = getInventoryKey(userId);
  await storage.incrBy(getInkKey(userId), -capsuleCost);

  await storage.set(getCapsulePullCountKey(userId), nextPullCount.toString());
  await storage.set(dailyPullKey, '1');
  await storage.expire(dailyPullKey, capsuleDailyFlagTtlSeconds);
  await storage.set(
    getPullsSinceEpicKey(userId),
    nextPullsSinceEpic.toString()
  );

  await storage.hSet(inventoryKey, {
    [getInventoryDiscoveryField(entry.id)]: '1',
    ...(entry.kind === 'accessory' && isNew
      ? { [getInventoryGearRankField(entry.id)]: '1' }
      : {}),
    ...(isPermanentCatalogEntry(entry) && isNew
      ? { [entry.id]: entry.kind }
      : {}),
  });

  if (isConsumableCatalogEntry(entry)) {
    await storage.hIncrBy(inventoryKey, entry.id, 1);
  }
};

const applyCapsulePullWithTransaction = async (
  transaction: ArenaTransaction,
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
    expiresAtMs: number;
  }
): Promise<boolean> => {
  const inventoryKey = getInventoryKey(userId);
  await transaction.multi();
  await transaction.incrBy(getInkKey(userId), -capsuleCost);

  await transaction.set(
    getCapsulePullCountKey(userId),
    nextPullCount.toString()
  );
  await transaction.set(dailyPullKey, '1');
  await transaction.expire(dailyPullKey, capsuleDailyFlagTtlSeconds);
  await transaction.set(
    getPullsSinceEpicKey(userId),
    nextPullsSinceEpic.toString()
  );

  await transaction.hSet(inventoryKey, {
    [getInventoryDiscoveryField(entry.id)]: '1',
    ...(entry.kind === 'accessory' && isNew
      ? { [getInventoryGearRankField(entry.id)]: '1' }
      : {}),
    ...(isPermanentCatalogEntry(entry) && isNew
      ? { [entry.id]: entry.kind }
      : {}),
  });

  if (isConsumableCatalogEntry(entry)) {
    await transaction.hIncrBy(inventoryKey, entry.id, 1);
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
    await trackOperationReceipt(
      transaction,
      userId,
      operationCommit.operationKey,
      operationCommit.expiresAtMs
    );
  }

  const execResult: unknown = await transaction.exec();
  return Array.isArray(execResult) && execResult.length > 0;
};

const isNonNegativeInteger = (value: unknown): value is number => {
  return Number.isInteger(value) && Number(value) >= 0;
};

type ParsedCapsuleOperationResponse = {
  response: CapsulePullResponse;
  needsCurrentProgress: boolean;
  needsCurrentDiscoveries: boolean;
};

const normalizeReceiptDiscoveries = (
  inventoryRecord: Record<string, unknown>,
  itemCounts: Record<string, unknown>,
  pulledCatalogId: string
): string[] => {
  const discoveredIds = new Set<string>();
  const storedDiscoveries = inventoryRecord.discovered;

  if (Array.isArray(storedDiscoveries)) {
    for (const catalogId of storedDiscoveries) {
      if (typeof catalogId === 'string') discoveredIds.add(catalogId);
    }
  }

  for (const [catalogId, ownedCount] of Object.entries(itemCounts)) {
    if (isNonNegativeInteger(ownedCount) && ownedCount > 0) {
      discoveredIds.add(catalogId);
    }
  }

  for (const catalogId of inventoryRecord.pens as string[]) {
    discoveredIds.add(catalogId);
  }
  for (const catalogId of inventoryRecord.titles as string[]) {
    discoveredIds.add(catalogId);
  }
  discoveredIds.add(pulledCatalogId);

  return INK_CATALOG.filter((entry) => discoveredIds.has(entry.id)).map(
    (entry) => entry.id
  );
};

const normalizeReceiptGear = (
  inventoryRecord: Record<string, unknown>,
  itemCounts: Record<string, unknown>,
  discovered: readonly string[]
): Record<string, GearInventoryEntry> => {
  const storedGear =
    typeof inventoryRecord.gear === 'object' &&
    inventoryRecord.gear !== null &&
    !Array.isArray(inventoryRecord.gear)
      ? (inventoryRecord.gear as Record<string, unknown>)
      : {};
  const discoveredIds = new Set(discovered);
  const gear: Record<string, GearInventoryEntry> = {};

  for (const entry of INK_ACCESSORY_CATALOG) {
    if (!discoveredIds.has(entry.id)) continue;
    const storedEntry = storedGear[entry.id];
    const storedEntryRecord =
      typeof storedEntry === 'object' &&
      storedEntry !== null &&
      !Array.isArray(storedEntry)
        ? (storedEntry as Record<string, unknown>)
        : {};
    const storedRank = Number(storedEntryRecord.rank);
    const rank: GearRank = isGearRank(storedRank) ? storedRank : 1;
    const copies = isNonNegativeInteger(itemCounts[entry.id])
      ? Number(itemCounts[entry.id])
      : 0;
    gear[entry.id] = { rank, copies, rarity: entry.rarity };
  }

  return gear;
};

const parseStoredCapsuleProgress = (
  storedProgress: unknown,
  discoveredCount: number
): CapsuleProgress | undefined => {
  if (
    typeof storedProgress !== 'object' ||
    storedProgress === null ||
    Array.isArray(storedProgress)
  ) {
    return undefined;
  }

  const progressRecord = storedProgress as Record<string, unknown>;
  if (
    !isNonNegativeInteger(progressRecord.pullCount) ||
    !isNonNegativeInteger(progressRecord.discoveredCount) ||
    !isNonNegativeInteger(progressRecord.collectionTotal) ||
    !Number.isInteger(progressRecord.pityRemaining) ||
    Number(progressRecord.pityRemaining) < 1 ||
    Number(progressRecord.pityRemaining) > CAPSULE_PITY
  ) {
    return undefined;
  }

  return {
    pullCount: progressRecord.pullCount,
    pityRemaining: Number(progressRecord.pityRemaining),
    discoveredCount,
    collectionTotal: INK_CATALOG.length,
  };
};

const parseCapsuleOperationResponse = (
  storedValue: string
): ParsedCapsuleOperationResponse | undefined => {
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
    const storedDiscoveries = inventoryRecord.discovered;
    if (
      typeof itemCounts !== 'object' ||
      itemCounts === null ||
      Array.isArray(itemCounts)
    ) {
      return undefined;
    }
    if (
      !isCapsuleRarity(pullRecord.rarity) ||
      !['accessory', 'pen', 'title', 'drawing-ink', 'brush'].includes(
        String(pullRecord.kind)
      ) ||
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
      !Object.values(itemCounts).every(isNonNegativeInteger) ||
      (storedDiscoveries !== undefined &&
        (!Array.isArray(storedDiscoveries) ||
          !storedDiscoveries.every((value) => typeof value === 'string')))
    ) {
      return undefined;
    }

    const discovered = normalizeReceiptDiscoveries(
      inventoryRecord,
      itemCounts as Record<string, unknown>,
      pullRecord.id
    );
    const gear = normalizeReceiptGear(
      inventoryRecord,
      itemCounts as Record<string, unknown>,
      discovered
    );
    const needsCurrentProgress = record.progress === undefined;
    const progress = needsCurrentProgress
      ? createCapsuleProgress(0, 0, discovered.length)
      : parseStoredCapsuleProgress(record.progress, discovered.length);
    if (!progress) return undefined;
    const receiptTitles = inventoryRecord.titles as string[];
    const equippedTitle =
      typeof inventoryRecord.equippedTitle === 'string' &&
      receiptTitles.includes(inventoryRecord.equippedTitle)
        ? inventoryRecord.equippedTitle
        : null;

    return {
      response: {
        pull: {
          ...(pullRecord as Omit<CapsulePull, 'gearRank' | 'mergeReady'>),
          gearRank:
            pullRecord.kind === 'accessory'
              ? (gear[String(pullRecord.id)]?.rank ?? 1)
              : null,
          mergeReady:
            pullRecord.kind === 'accessory' &&
            (gear[String(pullRecord.id)]?.rank ?? 1) < MAX_GEAR_RANK &&
            Number(pullRecord.ownedCount) >= GEAR_MERGE_COPY_COST,
        },
        ink: record.ink,
        inventory: {
          items: itemCounts as Record<string, number>,
          gear,
          pens: inventoryRecord.pens,
          titles: receiptTitles,
          equippedTitle,
          discovered,
        },
        nextCost: record.nextCost,
        progress,
      },
      needsCurrentProgress,
      needsCurrentDiscoveries: storedDiscoveries === undefined,
    };
  } catch {
    return undefined;
  }
};

const getUserIdFromOperationKey = (
  operationKey: string,
  operationKeyPrefix: string
): string | undefined => {
  if (!operationKey.startsWith(operationKeyPrefix)) return undefined;
  const keySuffix = operationKey.slice(operationKeyPrefix.length);
  const operationSeparatorIndex = keySuffix.lastIndexOf(':');
  if (operationSeparatorIndex <= 0) return undefined;
  return keySuffix.slice(0, operationSeparatorIndex);
};

const getUserIdFromCapsuleOperationKey = (
  operationKey: string
): string | undefined => {
  return getUserIdFromOperationKey(operationKey, capsuleOperationKeyPrefix);
};

const normalizeLegacyCapsuleOperationResponse = async (
  storage: ArenaStorage,
  operationKey: string,
  parsedReceipt: ParsedCapsuleOperationResponse
): Promise<CapsulePullResponse> => {
  if (
    !parsedReceipt.needsCurrentProgress &&
    !parsedReceipt.needsCurrentDiscoveries
  ) {
    return parsedReceipt.response;
  }

  const userId = getUserIdFromCapsuleOperationKey(operationKey);
  if (!userId) return parsedReceipt.response;

  const currentInventory = await loadInventory(storage, userId);
  const discoveredIds = new Set([
    ...parsedReceipt.response.inventory.discovered,
    ...currentInventory.discovered,
  ]);
  const discovered = INK_CATALOG.filter((entry) => {
    return discoveredIds.has(entry.id);
  }).map((entry) => entry.id);
  const progress = parsedReceipt.needsCurrentProgress
    ? await loadCapsuleProgress(storage, userId, currentInventory)
    : parsedReceipt.response.progress;

  return {
    ...parsedReceipt.response,
    inventory: {
      ...parsedReceipt.response.inventory,
      gear: {
        ...parsedReceipt.response.inventory.gear,
        ...currentInventory.gear,
      },
      equippedTitle: currentInventory.equippedTitle,
      discovered,
    },
    progress: {
      ...progress,
      discoveredCount: discovered.length,
      collectionTotal: INK_CATALOG.length,
    },
  };
};

// Claim one unique operation key with WATCH/MULTI instead of deleting a stale
// shared-hash field. If a delayed request commits between our read and write,
// EXEC aborts and the next attempt returns its receipt rather than charging a
// second time. Corrupt receipts are replaced through the same fenced path.
export const claimCapsuleOperation = async (
  storage: ArenaStorage,
  operationKey: string,
  claimedAtMs: number,
  pendingTimeoutMs: number
): Promise<CapsuleOperationClaim> => {
  if (!storage.watch) {
    throw new Error('Atomic capsule operations require transaction support.');
  }
  const userId = getUserIdFromCapsuleOperationKey(operationKey);
  if (!userId) {
    throw new Error('Capsule operation key is invalid.');
  }
  await pruneExpiredOperationReceipts(storage, userId, claimedAtMs);
  const pendingValue = `${capsuleOperationPendingPrefix}${claimedAtMs}`;
  const expiresAtMs = claimedAtMs + capsuleOperationTtlSeconds * 1000;

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
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
          await trackOperationReceipt(
            storage,
            userId,
            operationKey,
            pendingAtMs + capsuleOperationTtlSeconds * 1000
          );
          return { status: 'pending' };
        }
      } else if (storedValue !== undefined) {
        const parsedReceipt = parseCapsuleOperationResponse(storedValue);
        if (parsedReceipt) {
          const response = await normalizeLegacyCapsuleOperationResponse(
            storage,
            operationKey,
            parsedReceipt
          );
          if (
            parsedReceipt.needsCurrentProgress ||
            parsedReceipt.needsCurrentDiscoveries
          ) {
            await transaction.multi();
            await transaction.set(operationKey, JSON.stringify(response));
            await transaction.expire(operationKey, capsuleOperationTtlSeconds);
            await trackOperationReceipt(
              transaction,
              userId,
              operationKey,
              expiresAtMs
            );
            const execResult: unknown = await transaction.exec();
            if (Array.isArray(execResult) && execResult.length > 0) {
              return { status: 'completed', response };
            }
            continue;
          }

          await transaction.unwatch();
          await trackOperationReceipt(
            storage,
            userId,
            operationKey,
            expiresAtMs
          );
          return { status: 'completed', response };
        }
      }

      await transaction.multi();
      await transaction.set(operationKey, pendingValue);
      await transaction.expire(operationKey, capsuleOperationTtlSeconds);
      await trackOperationReceipt(
        transaction,
        userId,
        operationKey,
        expiresAtMs
      );
      const execResult: unknown = await transaction.exec();
      if (Array.isArray(execResult) && execResult.length > 0) {
        return { status: 'claimed', pendingValue };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Mystery Ink');
      throw error;
    }
  }

  throw new Error('Mystery Ink operation claim did not settle.');
};

// Release only the exact pending value owned by this request. A stale worker
// can never delete a newer pending claim or a committed response receipt.
export const releaseCapsuleOperation = async (
  storage: ArenaStorage,
  operationKey: string,
  expectedPendingValue: string
): Promise<boolean> => {
  if (!storage.watch) {
    throw new Error('Atomic capsule operations require transaction support.');
  }
  const userId = getUserIdFromCapsuleOperationKey(operationKey);
  if (!userId) {
    throw new Error('Capsule operation key is invalid.');
  }

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(operationKey);
      if ((await storage.get(operationKey)) !== expectedPendingValue) {
        await transaction.unwatch();
        return false;
      }

      await transaction.multi();
      await transaction.del(operationKey);
      await transaction.zRem(getUserOperationReceiptIndexKey(userId), [
        operationKey,
      ]);
      const execResult: unknown = await transaction.exec();
      if (Array.isArray(execResult) && execResult.length > 0) return true;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Mystery Ink');
      throw error;
    }
  }

  throw new Error('Mystery Ink operation release did not settle.');
};

export const pullCapsuleForUser = async (
  storage: ArenaStorage,
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

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;

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
      const capsuleCost = getCapsuleCostForDailyState(pulledToday);

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
      const discoveredCatalogIds = new Set(
        getDiscoveredCatalogIds(inventoryEntries)
      );
      const currentInventory = inventoryFromStoredEntries(inventoryEntries);
      const maxedGearIds = new Set(
        Object.entries(currentInventory.gear)
          .filter(([, gear]) => gear.rank >= MAX_GEAR_RANK)
          .map(([gearId]) => gearId)
      );
      const selectedEntry = selectCapsuleDrop(
        {
          userId,
          day,
          pullCount: nextPullCount,
          pullsSinceEpic,
          entropy: operation?.selectionEntropy,
        },
        discoveredCatalogIds,
        maxedGearIds
      );
      const inventoryGrant = projectCapsuleInventoryGrant(
        currentInventory,
        selectedEntry
      );
      const { isNew, ownedCount } = inventoryGrant;
      const nextPullsSinceEpic = advanceCapsulePity(
        pullsSinceEpic,
        selectedEntry.rarity
      );
      const pull = createCapsulePull(
        selectedEntry,
        isNew,
        ownedCount,
        inventoryGrant.inventory.gear[selectedEntry.id]
      );
      const inventory = inventoryGrant.inventory;
      const progress = createCapsuleProgress(
        nextPullCount,
        nextPullsSinceEpic,
        inventory.discovered.length
      );
      const success: CapsulePullSuccess = {
        status: 'pulled',
        pull,
        ink: inkBalance - capsuleCost,
        inventory,
        nextCost: CAPSULE_COST,
        progress,
      };
      const operationResponse: CapsulePullResponse = {
        pull: success.pull,
        ink: success.ink,
        inventory: success.inventory,
        nextCost: success.nextCost,
        progress: success.progress,
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
                expiresAtMs: Date.now() + capsuleOperationTtlSeconds * 1000,
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
      await discardWatchedTransaction(transaction, 'Mystery Ink');
      throw error;
    }
  }

  throw new Error('Mystery Ink capsule pull did not settle.');
};

export type RequiredAccessoryCounts = ReadonlyMap<string, number>;
export type RequiredConsumableCounts = ReadonlyMap<string, number>;

export const planRequiredAccessoryCounts = (
  accessoryIds: string[]
): RequiredAccessoryCounts | undefined => {
  const requiredCounts = new Map<string, number>();

  for (const accessoryId of accessoryIds) {
    if (!isAccessoryCatalogEntry(findInkCatalogEntry(accessoryId))) {
      return undefined;
    }

    requiredCounts.set(accessoryId, (requiredCounts.get(accessoryId) ?? 0) + 1);
  }

  return requiredCounts;
};

export const planRequiredDrawingSupplyCounts = (
  drawingSupplies: DrawingSupplySelection
): RequiredConsumableCounts | undefined => {
  const requiredCounts = new Map<string, number>();
  if (drawingSupplies.drawingInkId !== null) {
    const entry = findInkCatalogEntry(drawingSupplies.drawingInkId);
    if (!isDrawingInkCatalogEntry(entry)) return undefined;
    requiredCounts.set(entry.id, 1);
  }
  if (drawingSupplies.brushId !== null) {
    const entry = findInkCatalogEntry(drawingSupplies.brushId);
    if (!isBrushCatalogEntry(entry)) return undefined;
    requiredCounts.set(entry.id, 1);
  }
  return requiredCounts;
};

export const planRequiredSubmissionConsumableCounts = (
  accessoryIds: string[],
  drawingSupplies: DrawingSupplySelection
): RequiredConsumableCounts | undefined => {
  const accessoryCounts = planRequiredAccessoryCounts(accessoryIds);
  const drawingSupplyCounts = planRequiredDrawingSupplyCounts(drawingSupplies);
  if (!accessoryCounts || !drawingSupplyCounts) return undefined;
  return new Map([...accessoryCounts, ...drawingSupplyCounts]);
};

export type AccessoryInventoryProjection =
  | { status: 'consumed'; inventory: Inventory }
  | { status: 'insufficient'; accessoryId: string }
  | { status: 'invalid'; accessoryId: string };

export const projectAccessoryInventoryConsumption = (
  inventory: Inventory,
  accessoryIds: string[]
): AccessoryInventoryProjection => {
  const requiredCounts = planRequiredAccessoryCounts(accessoryIds);
  if (!requiredCounts) {
    return {
      status: 'invalid',
      accessoryId: accessoryIds[0] ?? 'accessory',
    };
  }

  const nextItems = { ...inventory.items };
  for (const [accessoryId, requiredCount] of requiredCounts.entries()) {
    const ownedCount = nextItems[accessoryId] ?? 0;
    if (ownedCount < requiredCount) {
      return { status: 'insufficient', accessoryId };
    }
    const nextCount = ownedCount - requiredCount;
    if (nextCount > 0) nextItems[accessoryId] = nextCount;
    else delete nextItems[accessoryId];
  }

  return {
    status: 'consumed',
    inventory: {
      items: nextItems,
      gear: Object.fromEntries(
        Object.entries(inventory.gear ?? {}).map(([gearId, gear]) => [
          gearId,
          {
            ...gear,
            copies: nextItems[gearId] ?? 0,
          },
        ])
      ),
      pens: [...inventory.pens],
      titles: [...inventory.titles],
      equippedTitle: inventory.equippedTitle,
      discovered: [...inventory.discovered],
    },
  };
};

export type SubmissionConsumableInventoryProjection =
  | { status: 'consumed'; inventory: Inventory }
  | { status: 'insufficient'; consumableId: string }
  | { status: 'invalid'; consumableId: string };

export const projectSubmissionConsumableInventoryConsumption = (
  inventory: Inventory,
  accessoryIds: string[],
  drawingSupplies: DrawingSupplySelection
): SubmissionConsumableInventoryProjection => {
  const requiredCounts = planRequiredSubmissionConsumableCounts(
    accessoryIds,
    drawingSupplies
  );
  if (!requiredCounts) {
    return {
      status: 'invalid',
      consumableId:
        drawingSupplies.drawingInkId ??
        drawingSupplies.brushId ??
        accessoryIds[0] ??
        'drawing-supply',
    };
  }

  const nextItems = { ...inventory.items };
  for (const [consumableId, requiredCount] of requiredCounts) {
    const ownedCount = nextItems[consumableId] ?? 0;
    if (ownedCount < requiredCount) {
      return { status: 'insufficient', consumableId };
    }
    const nextCount = ownedCount - requiredCount;
    if (nextCount > 0) nextItems[consumableId] = nextCount;
    else delete nextItems[consumableId];
  }

  return {
    status: 'consumed',
    inventory: {
      items: nextItems,
      gear: Object.fromEntries(
        Object.entries(inventory.gear ?? {}).map(([gearId, gear]) => [
          gearId,
          { ...gear, copies: nextItems[gearId] ?? 0 },
        ])
      ),
      pens: [...inventory.pens],
      titles: [...inventory.titles],
      equippedTitle: inventory.equippedTitle,
      discovered: [...inventory.discovered],
    },
  };
};

export type GearMergeProjection =
  | { status: 'merged'; response: MergeGearResponse }
  | { status: 'invalid' }
  | { status: 'insufficientCopies' }
  | { status: 'maxRank' };

export const projectGearMerge = (
  inventory: Inventory,
  gearId: string
): GearMergeProjection => {
  const catalogEntry = findInkCatalogEntry(gearId);
  if (catalogEntry?.kind !== 'accessory') {
    return { status: 'invalid' };
  }
  const currentGear =
    inventory.gear?.[gearId] ??
    (inventory.discovered.includes(gearId)
      ? {
          rank: 1 as const,
          copies: inventory.items[gearId] ?? 0,
          rarity: catalogEntry.rarity,
        }
      : undefined);
  if (!currentGear) return { status: 'invalid' };
  if (currentGear.rank >= MAX_GEAR_RANK) {
    return { status: 'maxRank' };
  }
  const copiesRequired = getGearMergeCopyCost(currentGear.rank);
  if (currentGear.copies < copiesRequired) {
    return { status: 'insufficientCopies' };
  }

  const fromRank = currentGear.rank;
  const toRank = (fromRank + 1) as GearRank;
  const nextCopies = currentGear.copies - copiesRequired;
  const nextItems = { ...inventory.items };
  if (nextCopies > 0) nextItems[gearId] = nextCopies;
  else delete nextItems[gearId];
  const nextInventory: Inventory = {
    items: nextItems,
    gear: {
      ...(inventory.gear ?? {}),
      [gearId]: {
        ...currentGear,
        rank: toRank,
        copies: nextCopies,
      },
    },
    pens: [...inventory.pens],
    titles: [...inventory.titles],
    equippedTitle: inventory.equippedTitle,
    discovered: [...inventory.discovered],
  };
  return {
    status: 'merged',
    response: {
      gearId,
      fromRank,
      toRank,
      copiesSpent: copiesRequired,
      inventory: nextInventory,
    },
  };
};

export type GearMergeResult =
  | { status: 'merged'; response: MergeGearResponse }
  | { status: 'invalid' }
  | { status: 'insufficientCopies' }
  | { status: 'maxRank' }
  | { status: 'operationConflict' };

const parseGearMergeReceipt = (
  storedValue: string | undefined
): MergeGearResponse | undefined => {
  if (!storedValue) return undefined;
  try {
    const parsed = JSON.parse(storedValue) as Partial<MergeGearResponse>;
    const fromRank = Number(parsed.fromRank);
    const toRank = Number(parsed.toRank);
    if (
      typeof parsed.gearId !== 'string' ||
      !isGearRank(fromRank) ||
      !isGearRank(toRank) ||
      toRank !== fromRank + 1 ||
      parsed.copiesSpent !== getGearMergeCopyCost(fromRank) ||
      typeof parsed.inventory !== 'object' ||
      parsed.inventory === null
    ) {
      return undefined;
    }
    return parsed as MergeGearResponse;
  } catch {
    return undefined;
  }
};

export const mergeGearForUser = async (
  storage: ArenaStorage,
  userId: string,
  gearId: string,
  operationId: string
): Promise<GearMergeResult> => {
  if (!storage.watch) {
    throw new Error('Atomic gear merges require transaction support.');
  }
  const inventoryKey = getInventoryKey(userId);
  const operationKey = getGearMergeOperationKey(userId, operationId);
  const operationExpiresAtMs = Date.now() + capsuleOperationTtlSeconds * 1000;
  await pruneExpiredOperationReceipts(storage, userId, Date.now());

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(inventoryKey, operationKey);
      const storedReceipt = parseGearMergeReceipt(
        await storage.get(operationKey)
      );
      if (storedReceipt) {
        await transaction.unwatch();
        await trackOperationReceipt(
          storage,
          userId,
          operationKey,
          operationExpiresAtMs
        );
        return storedReceipt.gearId === gearId
          ? { status: 'merged', response: storedReceipt }
          : { status: 'operationConflict' };
      }

      const projection = projectGearMerge(
        inventoryFromStoredEntries(await storage.hGetAll(inventoryKey)),
        gearId
      );
      if (projection.status !== 'merged') {
        await transaction.unwatch();
        return projection;
      }

      await transaction.multi();
      await transaction.hSet(inventoryKey, {
        [getInventoryGearRankField(gearId)]:
          projection.response.toRank.toString(),
      });
      await transaction.hIncrBy(
        inventoryKey,
        gearId,
        -projection.response.copiesSpent
      );
      await transaction.set(operationKey, JSON.stringify(projection.response));
      await transaction.expire(operationKey, capsuleOperationTtlSeconds);
      await trackOperationReceipt(
        transaction,
        userId,
        operationKey,
        operationExpiresAtMs
      );
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return { status: 'merged', response: projection.response };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Gear merge');
      const recoveredReceipt = parseGearMergeReceipt(
        await storage.get(operationKey)
      );
      if (recoveredReceipt?.gearId === gearId) {
        return { status: 'merged', response: recoveredReceipt };
      }
      throw error;
    }
  }

  throw new Error('Gear merge did not settle.');
};

export const findUnavailableAccessory = (
  inventoryEntries: Record<string, string>,
  requiredCounts: RequiredAccessoryCounts
): string | undefined => {
  return findUnavailableConsumable(inventoryEntries, requiredCounts);
};

export const findUnavailableConsumable = (
  inventoryEntries: Record<string, string>,
  requiredCounts: RequiredConsumableCounts
): string | undefined => {
  for (const [consumableId, requiredCount] of requiredCounts.entries()) {
    const ownedCount = parseStoredInventoryCount(
      inventoryEntries[consumableId]
    );

    if (ownedCount < requiredCount) {
      return consumableId;
    }
  }

  return undefined;
};

export type AccessoryAvailability =
  | { status: 'available' }
  | { status: 'insufficient'; accessoryId: string }
  | { status: 'invalid'; accessoryId: string };

export const checkAccessoriesForSubmit = async (
  storage: ArenaStorage,
  userId: string,
  accessoryIds: string[]
): Promise<AccessoryAvailability> => {
  const requiredCounts = planRequiredAccessoryCounts(accessoryIds);

  if (!requiredCounts) {
    return {
      status: 'invalid',
      accessoryId: accessoryIds[0] ?? 'accessory',
    };
  }

  const missingAccessory = findUnavailableAccessory(
    await storage.hGetAll(getInventoryKey(userId)),
    requiredCounts
  );
  return missingAccessory
    ? { status: 'insufficient', accessoryId: missingAccessory }
    : { status: 'available' };
};

export type SubmissionConsumableAvailability =
  | { status: 'available' }
  | { status: 'insufficient'; consumableId: string }
  | { status: 'invalid'; consumableId: string };

export const checkSubmissionConsumablesForSubmit = async (
  storage: ArenaStorage,
  userId: string,
  accessoryIds: string[],
  drawingSupplies: DrawingSupplySelection
): Promise<SubmissionConsumableAvailability> => {
  const requiredCounts = planRequiredSubmissionConsumableCounts(
    accessoryIds,
    drawingSupplies
  );
  if (!requiredCounts) {
    return {
      status: 'invalid',
      consumableId:
        drawingSupplies.drawingInkId ??
        drawingSupplies.brushId ??
        accessoryIds[0] ??
        'drawing-supply',
    };
  }
  const unavailable = findUnavailableConsumable(
    await storage.hGetAll(getInventoryKey(userId)),
    requiredCounts
  );
  return unavailable
    ? { status: 'insufficient', consumableId: unavailable }
    : { status: 'available' };
};
