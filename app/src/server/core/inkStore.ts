import type {
  CapsuleProgress,
  CapsulePull,
  CapsulePullResponse,
  CapsuleRarity,
  Inventory,
} from '../../shared/arena';
import {
  CAPSULE_COST,
  CAPSULE_FIRST_DAILY_COST,
  CAPSULE_PITY,
  CAPSULE_RARITY_PERCENTAGES,
} from '../../shared/arena';
import { createSeededNumberGenerator, hashTextToSeed } from './random';
import type { ArenaStorage, ArenaTransaction } from './scribbit';
import {
  INK_ACCESSORY_CATALOG,
  INK_CATALOG,
  INK_PEN_CATALOG,
  INK_TITLE_CATALOG,
  findInkCatalogEntry,
  isAccessoryCatalogEntry,
  type InkCatalogEntry,
} from './ink';

type InkTransaction = ArenaTransaction;

export type InkStorage = ArenaStorage;

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

const maximumTransactionAttempts = 5;
const capsuleDailyFlagTtlSeconds = 3 * 24 * 60 * 60;
const capsuleOperationTtlSeconds = 3 * 24 * 60 * 60;
const capsuleOperationPendingPrefix = 'pending:';
const capsuleOperationKeyPrefix = 'capsule:operation:';
const inventoryDiscoveryFieldPrefix = 'discovered:';
const inventoryEquippedTitleField = 'equipped-title';

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

export const getInkKey = (userId: string): string => {
  return `ink:${userId}`;
};

export const getInventoryKey = (userId: string): string => {
  return `inventory:${userId}`;
};

const getInventoryDiscoveryField = (catalogId: string): string => {
  return `${inventoryDiscoveryFieldPrefix}${catalogId}`;
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

export const getNextCapsuleCost = async (
  storage: ArenaStorage,
  userId: string,
  day: number
): Promise<number> => {
  const pulledToday =
    (await storage.get(getCapsuleDailyPullKey(userId, day))) !== undefined;
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

  if (!storage.watch) {
    throw new Error('Atomic Ink rewards require transaction support.');
  }

  const receiptValue = `${options.userId}:${options.amount}:${options.paidAtMs}`;
  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: InkTransaction | undefined;
    try {
      transaction = await storage.watch(options.payoutKey);
      if (
        (await storage.hGet(options.payoutKey, options.payoutField)) !==
        undefined
      ) {
        await transaction.unwatch();
        return false;
      }

      await transaction.multi();
      await transaction.hSet(options.payoutKey, {
        [options.payoutField]: receiptValue,
      });
      await transaction.incrBy(getInkKey(options.userId), options.amount);
      const transactionResults = await transaction.exec();
      if (Array.isArray(transactionResults) && transactionResults.length > 0) {
        return true;
      }
    } catch (error) {
      await discardTransaction(transaction);
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
  const paidAtSeparator = stored.lastIndexOf(':');
  const amountSeparator = stored.lastIndexOf(':', paidAtSeparator - 1);
  if (paidAtSeparator <= amountSeparator || amountSeparator < 1) return 0;
  const storedUserId = stored.slice(0, amountSeparator);
  const amount = Number(stored.slice(amountSeparator + 1, paidAtSeparator));
  const paidAtMilliseconds = Number(stored.slice(paidAtSeparator + 1));
  if (
    storedUserId !== input.userId ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(paidAtMilliseconds) ||
    paidAtMilliseconds < 0
  ) {
    return 0;
  }
  return amount;
};

const hasPermanentDiscovery = (
  entry: InkCatalogEntry,
  storedInventory: Record<string, string>
): boolean => {
  if (storedInventory[getInventoryDiscoveryField(entry.id)] !== undefined) {
    return true;
  }

  if (entry.kind === 'accessory') {
    return parseStoredNonNegativeInteger(storedInventory[entry.id]) > 0;
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

  const titles = INK_TITLE_CATALOG.filter((entry) => {
    return storedInventory[entry.id] !== undefined;
  }).map((entry) => {
    return entry.id;
  });
  const storedEquippedTitle = storedInventory[inventoryEquippedTitleField];

  return {
    items,
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
  }

  if (Object.keys(missingMarkers).length > 0) {
    await storage.hSet(inventoryKey, missingMarkers);
  }
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

export const setEquippedTitle = async (
  storage: ArenaStorage,
  userId: string,
  titleId: string | null
): Promise<Inventory | undefined> => {
  const inventory = await loadInventory(storage, userId);
  if (titleId !== null && !inventory.titles.includes(titleId)) {
    return undefined;
  }

  const inventoryKey = getInventoryKey(userId);
  if (titleId === null) {
    await storage.hDel(inventoryKey, [inventoryEquippedTitleField]);
  } else {
    await storage.hSet(inventoryKey, {
      [inventoryEquippedTitleField]: titleId,
    });
  }

  return {
    ...inventory,
    equippedTitle: titleId,
  };
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

  if (roll < commonThreshold) {
    return 'common';
  }

  if (roll < rareThreshold) {
    return 'rare';
  }

  return 'epic';
};

export const isCapsulePityPull = (pullsSinceEpic: number): boolean => {
  return pullsSinceEpic + 1 >= CAPSULE_PITY;
};

const chooseEntryForRarity = (
  rarity: CapsuleRarity,
  roll: number,
  discoveredCatalogIds: ReadonlySet<string>
): InkCatalogEntry => {
  const matchingEntries = INK_CATALOG.filter((entry) => {
    return entry.rarity === rarity;
  });
  const selectedEntry =
    matchingEntries[Math.floor(roll * matchingEntries.length)];

  if (!selectedEntry) {
    throw new Error(`No Mystery Ink catalog entries for ${rarity}.`);
  }

  // Accessory duplicates are useful consumable copies. A duplicate pen or
  // title would be a paid no-op, so deterministically redirect it within the
  // same rarity toward an undiscovered permanent or a usable accessory copy.
  // This keeps rarity odds and pity unchanged while removing dead pulls.
  if (
    selectedEntry.kind !== 'accessory' &&
    discoveredCatalogIds.has(selectedEntry.id)
  ) {
    const protectedEntries = matchingEntries.filter((entry) => {
      return entry.kind === 'accessory' || !discoveredCatalogIds.has(entry.id);
    });
    const protectedEntry =
      protectedEntries[Math.floor(roll * protectedEntries.length)];
    if (protectedEntry) return protectedEntry;
  }

  return selectedEntry;
};

export const selectCapsuleDrop = (
  options: CapsuleSelectionOptions,
  discoveredCatalogIds: ReadonlySet<string> = new Set()
): InkCatalogEntry => {
  const deterministicSeedInput = `capsule:${options.userId}:${options.day}:${options.pullCount}`;
  const seedInput =
    options.entropy === undefined
      ? deterministicSeedInput
      : `${deterministicSeedInput}:entropy:${options.entropy}`;
  const seed = hashTextToSeed(seedInput);
  const randomNumber = createSeededNumberGenerator(seed);
  const rarity = isCapsulePityPull(options.pullsSinceEpic)
    ? 'epic'
    : chooseCapsuleRarity(randomNumber());

  return chooseEntryForRarity(rarity, randomNumber(), discoveredCatalogIds);
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
    ...(entry.kind !== 'accessory' && isNew ? { [entry.id]: entry.kind } : {}),
  });

  if (entry.kind === 'accessory') {
    await storage.hIncrBy(inventoryKey, entry.id, 1);
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
    ...(entry.kind !== 'accessory' && isNew ? { [entry.id]: entry.kind } : {}),
  });

  if (entry.kind === 'accessory') {
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
        pull: pullRecord as CapsulePull,
        ink: record.ink,
        inventory: {
          items: itemCounts as Record<string, number>,
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

const getUserIdFromCapsuleOperationKey = (
  operationKey: string
): string | undefined => {
  if (!operationKey.startsWith(capsuleOperationKeyPrefix)) return undefined;
  const keySuffix = operationKey.slice(capsuleOperationKeyPrefix.length);
  const operationSeparatorIndex = keySuffix.lastIndexOf(':');
  if (operationSeparatorIndex <= 0) return undefined;
  return keySuffix.slice(0, operationSeparatorIndex);
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
            const execResult: unknown = await transaction.exec();
            if (Array.isArray(execResult) && execResult.length > 0) {
              return { status: 'completed', response };
            }
            continue;
          }

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
      const discoveredCatalogIds = new Set(
        getDiscoveredCatalogIds(inventoryEntries)
      );
      const selectedEntry = selectCapsuleDrop(
        {
          userId,
          day,
          pullCount: nextPullCount,
          pullsSinceEpic,
          entropy: operation?.selectionEntropy,
        },
        discoveredCatalogIds
      );
      const isNew = !hasPermanentDiscovery(selectedEntry, inventoryEntries);
      const ownedCount = getNextOwnedCount(selectedEntry, inventoryEntries);
      const nextPullsSinceEpic =
        selectedEntry.rarity === 'epic' ? 0 : pullsSinceEpic + 1;
      const nextInventoryEntries = { ...inventoryEntries };
      nextInventoryEntries[getInventoryDiscoveryField(selectedEntry.id)] = '1';
      if (selectedEntry.kind === 'accessory') {
        nextInventoryEntries[selectedEntry.id] = ownedCount.toString();
      } else if (isNew) {
        nextInventoryEntries[selectedEntry.id] = selectedEntry.kind;
      }
      const pull = createCapsulePull(selectedEntry, isNew, ownedCount);
      const inventory = inventoryFromStoredEntries(nextInventoryEntries);
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

    requiredCounts.set(accessoryId, (requiredCounts.get(accessoryId) ?? 0) + 1);
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
        await transaction.hSet(inventoryKey, {
          [getInventoryDiscoveryField(accessoryId)]: '1',
        });
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
    await storage.hSet(inventoryKey, {
      [getInventoryDiscoveryField(accessoryId)]: '1',
    });
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
