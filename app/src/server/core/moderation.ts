import type { ArenaStorage } from './storage';
import type {
  BannedPlayerSummary,
  ModerationQueueEntry,
  ModerationQueuePage,
  ModerationReportReason,
} from '../../shared/moderation';
import { isModerationReportReason } from '../../shared/moderation';
import { getScribbitOwner, loadScribbit } from './scribbit';

const moderationRecordTtlSeconds = 30 * 24 * 60 * 60;
const moderationQueueMaximumPageSize = 50;
const moderationReportIndexKey = 'moderation:scribbit:report-index:v1';
const bannedPlayersKey = 'moderation:banned-players:v1';
const bannedPlayerIndexKey = 'moderation:banned-player-index:v1';

type StoredReport = Readonly<{
  version: 1;
  reportedAtMs: number;
  reason: ModerationReportReason;
}>;

export type BannedPlayerRecord = Readonly<{
  version: 1;
  userId: string;
  username: string;
  moderatorUserId: string;
  moderatorUsername: string;
  sourceScribbitId: string;
  bannedAtMs: number;
}>;

const parseBannedPlayerRecord = (
  value: string | undefined
): BannedPlayerRecord | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const version = Reflect.get(parsed, 'version');
    const userId = Reflect.get(parsed, 'userId');
    const username = Reflect.get(parsed, 'username');
    const moderatorUserId = Reflect.get(parsed, 'moderatorUserId');
    const moderatorUsername = Reflect.get(parsed, 'moderatorUsername');
    const sourceScribbitId = Reflect.get(parsed, 'sourceScribbitId');
    const bannedAtMs = Reflect.get(parsed, 'bannedAtMs');
    if (
      version !== 1 ||
      typeof userId !== 'string' ||
      typeof username !== 'string' ||
      typeof moderatorUserId !== 'string' ||
      typeof moderatorUsername !== 'string' ||
      typeof sourceScribbitId !== 'string' ||
      typeof bannedAtMs !== 'number' ||
      !Number.isSafeInteger(bannedAtMs)
    ) {
      return null;
    }
    return {
      version,
      userId,
      username,
      moderatorUserId,
      moderatorUsername,
      sourceScribbitId,
      bannedAtMs,
    };
  } catch {
    return null;
  }
};

const parseStoredReport = (value: string): StoredReport | null => {
  if (/^\d+$/.test(value)) {
    const reportedAtMs = Number(value);
    return Number.isSafeInteger(reportedAtMs)
      ? { version: 1, reportedAtMs, reason: 'other' }
      : null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const version = Reflect.get(parsed, 'version');
    const reportedAtMs = Reflect.get(parsed, 'reportedAtMs');
    const reason = Reflect.get(parsed, 'reason');
    if (
      version !== 1 ||
      typeof reportedAtMs !== 'number' ||
      !Number.isSafeInteger(reportedAtMs) ||
      !isModerationReportReason(reason)
    ) {
      return null;
    }
    return {
      version,
      reportedAtMs,
      reason: reason as ModerationReportReason,
    };
  } catch {
    return null;
  }
};

export const getScribbitReportIndexKey = (): string => {
  return moderationReportIndexKey;
};

export const getBannedPlayersKey = (): string => bannedPlayersKey;

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
  reportedAtMs: number,
  reason: ModerationReportReason = 'other'
): Promise<{ created: boolean; reportCount: number }> => {
  const reportsKey = getScribbitReportsKey(scribbitId);
  const hiddenKey = getUserHiddenScribbitsKey(userId);
  const reportedKey = getUserReportedScribbitsKey(userId);
  const storedReport: StoredReport = {
    version: 1,
    reportedAtMs,
    reason,
  };
  const created =
    (await storage.hSetNX(reportsKey, userId, JSON.stringify(storedReport))) ===
    1;

  await storage.hSet(hiddenKey, {
    [scribbitId]: reportedAtMs.toString(),
  });
  await storage.hSet(reportedKey, {
    [scribbitId]: reportedAtMs.toString(),
  });
  await storage.expire(reportsKey, moderationRecordTtlSeconds);
  await storage.expire(hiddenKey, moderationRecordTtlSeconds);
  await storage.expire(reportedKey, moderationRecordTtlSeconds);
  if (created) {
    await storage.zAdd(moderationReportIndexKey, {
      member: scribbitId,
      score: reportedAtMs,
    });
  }

  return {
    created,
    reportCount: Object.keys(await storage.hGetAll(reportsKey)).length,
  };
};

export const banPlayer = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    username: string;
    moderatorUserId: string;
    moderatorUsername: string;
    sourceScribbitId: string;
    bannedAtMs: number;
  }>
): Promise<BannedPlayerRecord> => {
  const record: BannedPlayerRecord = { version: 1, ...input };
  await storage.hSet(bannedPlayersKey, {
    [input.userId]: JSON.stringify(record),
  });
  await storage.zAdd(bannedPlayerIndexKey, {
    member: input.userId,
    score: input.bannedAtMs,
  });
  return record;
};

export const isPlayerBanned = async (
  storage: ArenaStorage,
  userId: string
): Promise<boolean> => {
  return (await storage.hGet(bannedPlayersKey, userId)) !== undefined;
};

export const loadBannedPlayers = async (
  storage: ArenaStorage,
  limit = 50
): Promise<readonly BannedPlayerSummary[]> => {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const indexedPlayers = await storage.zRange(
    bannedPlayerIndexKey,
    0,
    safeLimit - 1,
    { by: 'rank', reverse: true }
  );
  const records = await Promise.all(
    indexedPlayers.map(({ member: userId }) =>
      storage.hGet(bannedPlayersKey, userId)
    )
  );
  const parsedRecords = records.map(parseBannedPlayerRecord);
  const staleUserIds = indexedPlayers
    .filter((_, index) => parsedRecords[index] === null)
    .map(({ member }) => member);
  if (staleUserIds.length > 0) {
    await storage.zRem(bannedPlayerIndexKey, staleUserIds);
  }
  return parsedRecords
    .filter((record): record is BannedPlayerRecord => record !== null)
    .map(({ userId, username, bannedAtMs, moderatorUsername }) => ({
      userId,
      username,
      bannedAtMs,
      moderatorUsername,
    }));
};

export const getBannedPlayer = async (
  storage: ArenaStorage,
  userId: string
): Promise<BannedPlayerRecord | null> => {
  return parseBannedPlayerRecord(await storage.hGet(bannedPlayersKey, userId));
};

export const unbanPlayer = async (
  storage: ArenaStorage,
  userId: string
): Promise<void> => {
  await storage.hDel(bannedPlayersKey, [userId]);
  await storage.zRem(bannedPlayerIndexKey, [userId]);
};

export const dismissScribbitReports = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<void> => {
  await storage.del(getScribbitReportsKey(scribbitId));
  await storage.zRem(moderationReportIndexKey, [scribbitId]);
};

const parseQueueCursor = (cursor: string | undefined): number => {
  if (!cursor || !/^\d+$/.test(cursor)) return 0;
  const offset = Number(cursor);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
};

export const loadModerationQueue = async (
  storage: ArenaStorage,
  options: Readonly<{ cursor?: string; limit?: number }> = {}
): Promise<ModerationQueuePage> => {
  const offset = parseQueueCursor(options.cursor);
  const limit = Math.min(
    moderationQueueMaximumPageSize,
    Math.max(1, Math.floor(options.limit ?? 25))
  );
  const indexedEntries = await storage.zRange(
    moderationReportIndexKey,
    offset,
    offset + limit,
    { by: 'rank', reverse: true }
  );
  const visibleEntries = indexedEntries.slice(0, limit);
  const queueEntries = await Promise.all(
    visibleEntries.map(async ({ member: scribbitId }) => {
      const [scribbit, ownerUserId, rawReports] = await Promise.all([
        loadScribbit(storage, scribbitId),
        getScribbitOwner(storage, scribbitId),
        storage.hGetAll(getScribbitReportsKey(scribbitId)),
      ]);
      const reports = Object.values(rawReports)
        .map(parseStoredReport)
        .filter((report): report is StoredReport => report !== null);
      if (!scribbit || !ownerUserId || reports.length === 0) return null;

      const reasons: Partial<Record<ModerationReportReason, number>> = {};
      reports.forEach((report) => {
        reasons[report.reason] = (reasons[report.reason] ?? 0) + 1;
      });
      const entry: ModerationQueueEntry = {
        scribbit: {
          id: scribbit.id,
          name: scribbit.name,
          artist: scribbit.artist,
          imageUrl: scribbit.imageUrl,
        },
        reportCount: reports.length,
        reasons,
        latestReportedAtMs: Math.max(
          ...reports.map((report) => report.reportedAtMs)
        ),
        playerBanned: await isPlayerBanned(storage, ownerUserId),
      };
      return entry;
    })
  );
  const staleScribbitIds = visibleEntries
    .filter((_, index) => queueEntries[index] === null)
    .map(({ member }) => member);
  if (staleScribbitIds.length > 0) {
    await storage.zRem(moderationReportIndexKey, staleScribbitIds);
  }
  return {
    entries: queueEntries.filter(
      (entry): entry is ModerationQueueEntry => entry !== null
    ),
    nextCursor: indexedEntries.length > limit ? String(offset + limit) : null,
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

export const purgeScribbitModerationRecords = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<void> => {
  const reportsKey = getScribbitReportsKey(scribbitId);
  const reporterUserIds = await storage.hKeys(reportsKey);

  for (const reporterUserId of reporterUserIds) {
    await storage.hDel(getUserHiddenScribbitsKey(reporterUserId), [scribbitId]);
    await storage.hDel(getUserReportedScribbitsKey(reporterUserId), [
      scribbitId,
    ]);
  }

  await storage.del(reportsKey);
  await storage.zRem(moderationReportIndexKey, [scribbitId]);
};
