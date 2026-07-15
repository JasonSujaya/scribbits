import {
  getScribbitLifecycleStage,
  type BattleReport,
  type VenueBoard,
  type VenueBoardEntry,
  type VenueStampState,
} from '../../shared/arena';
import {
  getBattleArenaForDay,
  getNextBattleArenaUnlock,
} from '../../shared/battlearena';
import type { BattleArenaId } from '../../shared/battlearena';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';

const venueStampTtlSeconds = 30 * 24 * 60 * 60;

type StoredVenueAttempt = Readonly<{
  username: string;
  progress: number;
  target: number;
  cleared: boolean;
  clearMilliseconds: number | null;
  reportId: string;
}>;

const boardKeySuffix = (day: number, arenaId: BattleArenaId): string =>
  `${day}:${arenaId}`;

export const getVenueRankingKey = (
  day: number,
  arenaId: BattleArenaId
): string => `venue:${boardKeySuffix(day, arenaId)}:ranking`;

export const getVenueAttemptsKey = (
  day: number,
  arenaId: BattleArenaId
): string => `venue:${boardKeySuffix(day, arenaId)}:attempts`;

export const getUserVenueBoardsKey = (userId: string): string =>
  `venue:user:${userId}:boards`;

const userBoardMember = (day: number, arenaId: BattleArenaId): string =>
  `${day}|${arenaId}`;

const parseUserBoardMember = (
  value: string
): Readonly<{ day: number; arenaId: BattleArenaId }> | null => {
  const divider = value.indexOf('|');
  const day = Number(value.slice(0, divider));
  const arenaId = value.slice(divider + 1) as BattleArenaId;
  const arena = getBattleArenaForDay(day);
  return divider > 0 &&
    Number.isSafeInteger(day) &&
    day >= 1 &&
    arena.id === arenaId
    ? { day, arenaId }
    : null;
};

const parseAttempt = (value: string | undefined): StoredVenueAttempt | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const attempt = parsed as Partial<StoredVenueAttempt>;
    const progress = Number(attempt.progress);
    const target = Number(attempt.target);
    const clearMilliseconds = attempt.clearMilliseconds;
    if (
      typeof attempt.username !== 'string' ||
      attempt.username.length === 0 ||
      !Number.isSafeInteger(progress) ||
      progress < 0 ||
      !Number.isSafeInteger(target) ||
      target < 1 ||
      progress > target ||
      attempt.cleared !== (progress === target) ||
      (clearMilliseconds !== null &&
        (!Number.isSafeInteger(Number(clearMilliseconds)) ||
          Number(clearMilliseconds) < 1)) ||
      attempt.cleared !== (clearMilliseconds !== null) ||
      typeof attempt.reportId !== 'string' ||
      attempt.reportId.length === 0
    ) {
      return null;
    }
    return attempt as StoredVenueAttempt;
  } catch {
    return null;
  }
};

const attemptIsBetter = (
  incoming: StoredVenueAttempt,
  existing: StoredVenueAttempt | null
): boolean => {
  if (!existing) return true;
  if (incoming.progress !== existing.progress) {
    return incoming.progress > existing.progress;
  }
  if (incoming.cleared !== existing.cleared) return incoming.cleared;
  if (
    incoming.clearMilliseconds !== null &&
    existing.clearMilliseconds !== null &&
    incoming.clearMilliseconds !== existing.clearMilliseconds
  ) {
    return incoming.clearMilliseconds < existing.clearMilliseconds;
  }
  return false;
};

const attemptFromReport = (
  report: BattleReport,
  username: string
): StoredVenueAttempt | null => {
  if (
    (report.kind !== 'boss' && report.kind !== 'exhibition') ||
    !report.battleArenaId ||
    !report.arenaChallenge ||
    !report.simulation ||
    getScribbitLifecycleStage(report.a, report.day) !== 'mature' ||
    getBattleArenaForDay(report.day).id !== report.battleArenaId
  ) {
    return null;
  }
  const challenge = report.arenaChallenge;
  return {
    username,
    progress: challenge.progress,
    target: challenge.target,
    cleared: challenge.completed,
    clearMilliseconds: challenge.completed
      ? Math.max(1, report.simulation.result.completedMilliseconds)
      : null,
    reportId: report.id,
  };
};

export const recordVenueStampAttempt = async (
  storage: ArenaStorage,
  userId: string,
  username: string,
  report: BattleReport
): Promise<void> => {
  const incoming = attemptFromReport(report, username);
  if (!incoming || !report.battleArenaId) return;
  if (!storage.watch) {
    throw new Error('Venue Stamp updates require transaction support.');
  }
  const attemptsKey = getVenueAttemptsKey(report.day, report.battleArenaId);
  const rankingKey = getVenueRankingKey(report.day, report.battleArenaId);
  const userBoardsKey = getUserVenueBoardsKey(userId);

  for (
    let attemptNumber = 0;
    attemptNumber < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attemptNumber += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(attemptsKey);
      const existing = parseAttempt(await storage.hGet(attemptsKey, userId));
      if (!attemptIsBetter(incoming, existing)) {
        await transaction.unwatch();
        return;
      }
      await transaction.multi();
      await transaction.hSet(attemptsKey, {
        [userId]: JSON.stringify(incoming),
      });
      if (incoming.clearMilliseconds !== null) {
        await transaction.zAdd(rankingKey, {
          member: userId,
          score: -incoming.clearMilliseconds,
        });
      }
      await transaction.zAdd(userBoardsKey, {
        member: userBoardMember(report.day, report.battleArenaId),
        score: report.day,
      });
      await transaction.expire(attemptsKey, venueStampTtlSeconds);
      await transaction.expire(rankingKey, venueStampTtlSeconds);
      await transaction.expire(userBoardsKey, venueStampTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Venue Stamp update');
      const stored = parseAttempt(await storage.hGet(attemptsKey, userId));
      if (stored && !attemptIsBetter(incoming, stored)) return;
      throw error;
    }
  }
  throw new Error('Venue Stamp changed too often to update safely.');
};

const getReverseRank = async (
  storage: ArenaStorage,
  rankingKey: string,
  userId: string
): Promise<number | null> => {
  const ascendingRank = await storage.zRank(rankingKey, userId);
  if (ascendingRank === undefined) return null;
  return (await storage.zCard(rankingKey)) - ascendingRank;
};

export const loadVenueStampState = async (
  storage: ArenaStorage,
  day: number,
  userId?: string
): Promise<VenueStampState> => {
  const arena = getBattleArenaForDay(day);
  const attemptsKey = getVenueAttemptsKey(day, arena.id);
  const rankingKey = getVenueRankingKey(day, arena.id);
  const [attempt, dailyRank, clearCount] = await Promise.all([
    userId
      ? storage.hGet(attemptsKey, userId).then(parseAttempt)
      : Promise.resolve(null),
    userId
      ? getReverseRank(storage, rankingKey, userId)
      : Promise.resolve(null),
    storage.zCard(rankingKey),
  ]);
  return {
    arenaId: arena.id,
    arenaName: arena.name,
    challengeLabel: arena.challengeLabel,
    progress: attempt?.progress ?? 0,
    target: arena.challenge.target,
    cleared: attempt?.cleared ?? false,
    bestClearMilliseconds: attempt?.clearMilliseconds ?? null,
    dailyRank: attempt?.cleared ? dailyRank : null,
    clearCount,
    nextUnlock: getNextBattleArenaUnlock(day),
  };
};

export const loadVenueBoard = async (
  storage: ArenaStorage,
  day: number,
  user?: Readonly<{ userId: string; username: string }>
): Promise<VenueBoard> => {
  const arena = getBattleArenaForDay(day);
  const rankingKey = getVenueRankingKey(day, arena.id);
  const attemptsKey = getVenueAttemptsKey(day, arena.id);
  const [rankingEntries, clearCount] = await Promise.all([
    storage.zRange(rankingKey, 0, 9, { by: 'rank', reverse: true }),
    storage.zCard(rankingKey),
  ]);
  const top: VenueBoardEntry[] = [];
  for (let index = 0; index < rankingEntries.length; index += 1) {
    const rankingEntry = rankingEntries[index];
    if (!rankingEntry) continue;
    const attempt = parseAttempt(
      await storage.hGet(attemptsKey, rankingEntry.member)
    );
    if (!attempt?.cleared || attempt.clearMilliseconds === null) continue;
    top.push({
      username: attempt.username,
      rank: index + 1,
      clearMilliseconds: attempt.clearMilliseconds,
    });
  }
  let me: VenueBoardEntry | null = null;
  if (user) {
    const [attempt, rank] = await Promise.all([
      storage.hGet(attemptsKey, user.userId).then(parseAttempt),
      getReverseRank(storage, rankingKey, user.userId),
    ]);
    if (
      attempt?.cleared &&
      attempt.clearMilliseconds !== null &&
      rank !== null
    ) {
      me = {
        username: user.username,
        rank,
        clearMilliseconds: attempt.clearMilliseconds,
      };
    }
  }
  return {
    dayNumber: day,
    arenaId: arena.id,
    arenaName: arena.name,
    challengeLabel: arena.challengeLabel,
    clearCount,
    top,
    me,
  };
};

export const removeVenueStampDataForUser = async (
  storage: ArenaStorage,
  userId: string
): Promise<void> => {
  const userBoardsKey = getUserVenueBoardsKey(userId);
  const boardEntries = await storage.zRange(userBoardsKey, 0, -1, {
    by: 'rank',
  });
  for (const entry of boardEntries) {
    const board = parseUserBoardMember(entry.member);
    if (!board) continue;
    await storage.zRem(getVenueRankingKey(board.day, board.arenaId), [userId]);
    await storage.hDel(getVenueAttemptsKey(board.day, board.arenaId), [userId]);
  }
  await storage.del(userBoardsKey);
};
