import type { ArenaTransaction, ArenaStorage } from './storage';
import { trackMigrationStartedAt } from './migrations';

export const PAYOUT_RECEIPT_TTL_SECONDS = 8 * 24 * 60 * 60;

export type IndexedPayoutReceipt = Readonly<{
  payoutKey: string;
  payoutField: string;
}>;

const payoutReceiptIndexSuffix = 'payout-receipts';
const payoutReceiptMigrationKey = 'arena:migrations:payout-receipt-index-v1';
const legacyCutoffDayField = 'legacy-cutoff-day';

const payoutDayFromKey = (payoutKey: string): number => {
  const separator = payoutKey.lastIndexOf(':');
  const day = Number(payoutKey.slice(separator + 1));
  if (!Number.isSafeInteger(day) || day < 1) {
    throw new Error('Payout receipt keys must end with an Arena day.');
  }
  return day;
};

export const getUserPayoutReceiptIndexKey = (userId: string): string =>
  `user:${userId}:${payoutReceiptIndexSuffix}`;

const serializePayoutReceipt = (receipt: IndexedPayoutReceipt): string =>
  JSON.stringify([receipt.payoutKey, receipt.payoutField]);

const parsePayoutReceipt = (stored: string): IndexedPayoutReceipt | null => {
  try {
    const parsed: unknown = JSON.parse(stored);
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== 'string' ||
      typeof parsed[1] !== 'string' ||
      parsed[0].length === 0 ||
      parsed[1].length === 0
    ) {
      return null;
    }
    return { payoutKey: parsed[0], payoutField: parsed[1] };
  } catch {
    return null;
  }
};

export const trackPayoutReceipt = async (
  transaction: Pick<ArenaTransaction, 'expire' | 'hSetNX' | 'zAdd'>,
  userId: string,
  receipt: IndexedPayoutReceipt,
  paidAtMs: number
): Promise<void> => {
  const indexKey = getUserPayoutReceiptIndexKey(userId);
  await trackMigrationStartedAt(
    transaction,
    'payout-receipt-index-v1',
    paidAtMs
  );
  await transaction.hSetNX(
    payoutReceiptMigrationKey,
    legacyCutoffDayField,
    (payoutDayFromKey(receipt.payoutKey) + 1).toString()
  );
  await transaction.expire(receipt.payoutKey, PAYOUT_RECEIPT_TTL_SECONDS);
  await transaction.zAdd(indexKey, {
    member: serializePayoutReceipt(receipt),
    score: paidAtMs + PAYOUT_RECEIPT_TTL_SECONDS * 1000,
  });
  await transaction.expire(indexKey, PAYOUT_RECEIPT_TTL_SECONDS);
};

export const loadUserPayoutReceipts = async (
  storage: ArenaStorage,
  userId: string
): Promise<IndexedPayoutReceipt[]> => {
  const entries = await storage.zRange(
    getUserPayoutReceiptIndexKey(userId),
    0,
    -1,
    { by: 'rank' }
  );
  return entries.flatMap((entry) => {
    const receipt = parsePayoutReceipt(entry.member);
    return receipt ? [receipt] : [];
  });
};

export const pruneExpiredPayoutReceipts = async (
  storage: ArenaStorage,
  userId: string,
  observedAtMs: number
): Promise<void> => {
  const indexKey = getUserPayoutReceiptIndexKey(userId);
  const expiredEntries = await storage.zRange(indexKey, 0, observedAtMs, {
    by: 'score',
  });
  if (expiredEntries.length > 0) {
    await storage.zRem(
      indexKey,
      expiredEntries.map((entry) => entry.member)
    );
  }
};

export const ensurePayoutReceiptLegacyCutoffDay = async (
  storage: ArenaStorage,
  currentDay: number
): Promise<number> => {
  if (!Number.isSafeInteger(currentDay) || currentDay < 1) {
    throw new Error('Payout receipt migration requires a valid Arena day.');
  }
  await storage.hSetNX(
    payoutReceiptMigrationKey,
    legacyCutoffDayField,
    (currentDay + 1).toString()
  );
  const stored = await storage.hGet(
    payoutReceiptMigrationKey,
    legacyCutoffDayField
  );
  const cutoffDay = Number(stored);
  if (!Number.isSafeInteger(cutoffDay) || cutoffDay < 1) {
    throw new Error('Payout receipt migration has an invalid cutoff day.');
  }
  return cutoffDay;
};
