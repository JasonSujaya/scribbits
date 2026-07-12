export type SortedSetEntry = {
  member: string;
  score: number;
};

export type ArenaTransaction = {
  multi: () => Promise<void>;
  exec: () => Promise<unknown[]>;
  discard: () => Promise<void>;
  unwatch: () => Promise<unknown>;
  incrBy: (key: string, value: number) => Promise<unknown>;
  set: (key: string, value: string) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
  hSetNX: (key: string, field: string, value: string) => Promise<unknown>;
  hDel: (key: string, fields: string[]) => Promise<unknown>;
  hIncrBy: (key: string, field: string, value: number) => Promise<unknown>;
  zAdd: (key: string, ...members: SortedSetEntry[]) => Promise<unknown>;
  zRem: (key: string, members: string[]) => Promise<unknown>;
  zIncrBy: (key: string, member: string, value: number) => Promise<unknown>;
};

export type ArenaStorage = {
  watch?: (...keys: string[]) => Promise<ArenaTransaction>;
  get: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  incrBy: (key: string, value: number) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  hGet: (key: string, field: string) => Promise<string | undefined>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hKeys: (key: string) => Promise<string[]>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
  hSetNX: (key: string, field: string, value: string) => Promise<number>;
  hDel: (key: string, fields: string[]) => Promise<number>;
  hIncrBy: (key: string, field: string, value: number) => Promise<number>;
  zAdd: (key: string, ...members: SortedSetEntry[]) => Promise<unknown>;
  zCard: (key: string) => Promise<number>;
  zRange: (
    key: string,
    start: number | string,
    stop: number | string,
    options?: { by: 'rank' | 'score' | 'lex'; reverse?: boolean }
  ) => Promise<SortedSetEntry[]>;
  zRem: (key: string, members: string[]) => Promise<unknown>;
  zScore: (key: string, member: string) => Promise<number | undefined>;
  zRank: (key: string, member: string) => Promise<number | undefined>;
  zIncrBy: (key: string, member: string, value: number) => Promise<number>;
};

// Every optimistic Redis workflow gets the same bounded retry budget. Domain
// modules still own conflict interpretation and ambiguous-commit recovery.
export const MAX_WATCH_TRANSACTION_ATTEMPTS = 5;

// DISCARD is best-effort after EXEC, connection, or domain failures because the
// transaction may already be closed. Cleanup failure must never replace the
// original operation error, but it should remain visible for diagnostics.
export const discardWatchedTransaction = async (
  transaction: ArenaTransaction | undefined,
  operationName: string
): Promise<void> => {
  if (!transaction) return;
  try {
    await transaction.discard();
  } catch (error) {
    console.warn(`${operationName} transaction cleanup failed:`, error);
  }
};

/** Atomically replaces one hash field only while its exact value is unchanged. */
export const replaceHashFieldIfEqual = async (
  storage: ArenaStorage,
  key: string,
  field: string,
  expectedValue: string,
  replacementValue: string,
  operationName: string
): Promise<boolean> => {
  if (!storage.watch) {
    throw new Error(`${operationName} requires transaction support.`);
  }
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(key);
      if ((await storage.hGet(key, field)) !== expectedValue) {
        await transaction.unwatch();
        return false;
      }
      await transaction.multi();
      await transaction.hSet(key, { [field]: replacementValue });
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 1) return true;
    } catch (error) {
      await discardWatchedTransaction(transaction, operationName);
      const currentValue = await storage.hGet(key, field);
      if (currentValue === replacementValue) return true;
      if (currentValue !== expectedValue) return false;
      throw error;
    }
  }
  throw new Error(`${operationName} changed too often to update safely.`);
};
