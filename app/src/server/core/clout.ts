import type { CloutBoard, CloutEntry } from '../../shared/arena';
import { INK_REWARDS } from '../../shared/arena';
import { getInkKey } from './inkStore';
import type { CurrentPlayer } from './scribbit';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import {
  getSeasonRankingKey,
  type SeasonScoringContext,
} from './season';

const backTtlSeconds = 8 * 24 * 60 * 60;

export const getBackKey = (day: number): string => {
  return `back:${day}`;
};

export const getCloutKey = (): string => {
  return 'clout';
};

export const getCloutUsernameKey = (): string => {
  return 'clout:usernames';
};

export const getCloutPayoutKey = (day: number): string => {
  return `clout:payout:${day}`;
};

export type DailyBackClaim = {
  claimed: boolean;
  backedScribbitId: string;
};

export type CloutPayoutResult = {
  championBackers: number;
  runnerUpBackers: number;
  paidBackers: number;
};

export const recordCloutUsername = async (
  storage: ArenaStorage,
  player: CurrentPlayer
): Promise<void> => {
  await storage.hSet(getCloutUsernameKey(), {
    [player.userId]: player.username,
  });
};

export const claimDailyBack = async (
  storage: ArenaStorage,
  day: number,
  player: CurrentPlayer,
  scribbitId: string
): Promise<DailyBackClaim> => {
  const backKey = getBackKey(day);
  await recordCloutUsername(storage, player);
  const createdBack = await storage.hSetNX(backKey, player.userId, scribbitId);
  await storage.expire(backKey, backTtlSeconds);

  if (createdBack === 1) {
    return {
      claimed: true,
      backedScribbitId: scribbitId,
    };
  }

  return {
    claimed: false,
    backedScribbitId:
      (await storage.hGet(backKey, player.userId)) ?? scribbitId,
  };
};

export const getBackedScribbitId = async (
  storage: ArenaStorage,
  day: number,
  userId: string
): Promise<string | null> => {
  return (await storage.hGet(getBackKey(day), userId)) ?? null;
};

export const getUserClout = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  return Math.floor((await storage.zScore(getCloutKey(), userId)) ?? 0);
};

export const getUserCloutPayout = async (
  storage: ArenaStorage,
  day: number,
  userId: string
): Promise<number> => {
  const storedPayout = await storage.hGet(getCloutPayoutKey(day), userId);
  if (!storedPayout) return 0;
  const points = Number(storedPayout.split(':')[0]);
  return Number.isInteger(points) && points > 0 ? points : 0;
};

const readDisplayUsername = async (
  storage: ArenaStorage,
  userId: string
): Promise<string> => {
  return (await storage.hGet(getCloutUsernameKey(), userId)) ?? userId;
};

const readCloutEntry = async (
  storage: ArenaStorage,
  userId: string,
  clout: number
): Promise<CloutEntry> => {
  return {
    username: await readDisplayUsername(storage, userId),
    clout: Math.floor(clout),
  };
};

const getReverseRank = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  const ascendingRank = await storage.zRank(getCloutKey(), userId);

  if (ascendingRank === undefined) {
    return 0;
  }

  return (await storage.zCard(getCloutKey())) - ascendingRank;
};

export const loadCloutBoard = async (
  storage: ArenaStorage,
  player?: CurrentPlayer
): Promise<CloutBoard> => {
  if (player) {
    await recordCloutUsername(storage, player);
  }

  const topEntries = await storage.zRange(getCloutKey(), 0, 19, {
    by: 'rank',
    reverse: true,
  });
  const top: CloutEntry[] = [];

  for (const entry of topEntries) {
    top.push(await readCloutEntry(storage, entry.member, entry.score));
  }

  if (!player) {
    return {
      top,
      me: {
        username: 'you',
        clout: 0,
        rank: 0,
      },
    };
  }

  return {
    top,
    me: {
      username: player.username,
      clout: await getUserClout(storage, player.userId),
      rank: await getReverseRank(storage, player.userId),
    },
  };
};

const commitBackPayout = async (
  storage: ArenaStorage,
  payoutKey: string,
  userId: string,
  points: number,
  paidAtMs: number,
  seasonScoring: SeasonScoringContext | null
): Promise<boolean> => {
  if (!storage.watch) {
    throw new Error('Atomic Back payouts require transaction support.');
  }

  const seasonPoints = seasonScoring
    ? points * seasonScoring.scoreMultiplier
    : 0;
  const receiptValue = seasonScoring
    ? `${points}:${paidAtMs}:${seasonScoring.seasonId}:${seasonPoints}`
    : `${points}:${paidAtMs}`;
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(payoutKey);
      if ((await storage.hGet(payoutKey, userId)) !== undefined) {
        await transaction.unwatch();
        return false;
      }

      await transaction.multi();
      await transaction.hSet(payoutKey, { [userId]: receiptValue });
      await transaction.zIncrBy(getCloutKey(), userId, points);
      if (seasonScoring) {
        await transaction.zIncrBy(
          getSeasonRankingKey(seasonScoring.seasonId),
          userId,
          seasonPoints
        );
      }
      if (points === 3) {
        await transaction.incrBy(getInkKey(userId), INK_REWARDS.backedChampion);
      }
      const transactionResults = await transaction.exec();
      if (Array.isArray(transactionResults) && transactionResults.length > 0) {
        return true;
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Clout payout');
      try {
        const storedReceipt = await storage.hGet(payoutKey, userId);
        if (storedReceipt !== undefined) {
          return storedReceipt === receiptValue;
        }
      } catch {
        // Preserve the original transaction error when recovery cannot read.
      }
      throw error;
    }
  }

  throw new Error(`Back payout for ${userId} did not settle.`);
};

export const payCloutForRumble = async (
  storage: ArenaStorage,
  options: {
    day: number;
    championScribbitId: string;
    runnerUpScribbitId: string | null;
    paidAtMs: number;
    seasonScoring?: SeasonScoringContext | null;
  }
): Promise<CloutPayoutResult> => {
  const backEntries = await storage.hGetAll(getBackKey(options.day));
  const payoutKey = getCloutPayoutKey(options.day);
  let championBackers = 0;
  let runnerUpBackers = 0;
  let paidBackers = 0;

  for (const [userId, backedScribbitId] of Object.entries(backEntries)) {
    const points =
      backedScribbitId === options.championScribbitId
        ? 3
        : backedScribbitId === options.runnerUpScribbitId
          ? 1
          : 0;

    if (points <= 0) {
      continue;
    }

    const createdPayout = await commitBackPayout(
      storage,
      payoutKey,
      userId,
      points,
      options.paidAtMs,
      options.seasonScoring ?? null
    );

    if (!createdPayout) {
      continue;
    }

    paidBackers += 1;

    if (points === 3) {
      championBackers += 1;
    } else {
      runnerUpBackers += 1;
    }
  }

  return {
    championBackers,
    runnerUpBackers,
    paidBackers,
  };
};
