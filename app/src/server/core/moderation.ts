import type { ArenaStorage } from './storage';

const moderationRecordTtlSeconds = 30 * 24 * 60 * 60;
export const SCRIBBIT_REPORT_REMOVAL_THRESHOLD = 3;

export const getScribbitReportsKey = (scribbitId: string): string => {
  return `moderation:scribbit:${scribbitId}:reports`;
};

export const getUserHiddenScribbitsKey = (userId: string): string => {
  return `user:${userId}:hidden-scribbits`;
};

export const getUserReportedScribbitsKey = (userId: string): string => {
  return `user:${userId}:reported-scribbits`;
};

export const reportAndHideScribbit = async (
  storage: ArenaStorage,
  userId: string,
  scribbitId: string,
  reportedAtMs: number
): Promise<{ created: boolean; reportCount: number }> => {
  const reportsKey = getScribbitReportsKey(scribbitId);
  const hiddenKey = getUserHiddenScribbitsKey(userId);
  const reportedKey = getUserReportedScribbitsKey(userId);
  const created =
    (await storage.hSetNX(reportsKey, userId, reportedAtMs.toString())) === 1;

  await storage.hSet(hiddenKey, {
    [scribbitId]: reportedAtMs.toString(),
  });
  await storage.hSet(reportedKey, {
    [scribbitId]: reportedAtMs.toString(),
  });
  await storage.expire(reportsKey, moderationRecordTtlSeconds);
  await storage.expire(hiddenKey, moderationRecordTtlSeconds);
  await storage.expire(reportedKey, moderationRecordTtlSeconds);

  return {
    created,
    reportCount: Object.keys(await storage.hGetAll(reportsKey)).length,
  };
};

export const getHiddenScribbitIds = async (
  storage: ArenaStorage,
  userId: string
): Promise<Set<string>> => {
  return new Set(
    Object.keys(await storage.hGetAll(getUserHiddenScribbitsKey(userId)))
  );
};

export const isScribbitHidden = async (
  storage: ArenaStorage,
  userId: string,
  scribbitId: string
): Promise<boolean> => {
  return (
    (await storage.hGet(getUserHiddenScribbitsKey(userId), scribbitId)) !==
    undefined
  );
};

export const clearScribbitReports = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<void> => {
  await storage.del(getScribbitReportsKey(scribbitId));
};
