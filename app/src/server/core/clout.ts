import type { CloutBoard, CloutEntry } from '../../shared/arena';
import { INK_REWARDS } from '../../shared/arena';
import { getSeasonParticipationMilestone } from '../../shared/season';
import { getInkKey } from './inkStore';
import type { CurrentPlayer } from './scribbit';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import {
  getSeasonCatalogKey,
  getSeasonMilestoneEntitlementsKey,
  getSeasonParticipationCount,
  getSeasonParticipationKey,
  getSeasonRankingKey,
  loadSeasonScoringContext,
  settleSeasonMilestoneRewards,
  type SeasonScoringContext,
} from './season';
import {
  pruneExpiredPayoutReceipts,
  trackPayoutReceipt,
} from './payoutReceipt';

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
  seasonId: string | null;
  seasonPicksMade: number;
  unlockedMilestoneId: string | null;
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
  if (!storage.watch) {
    throw new Error('Atomic Rumble predictions require transactions.');
  }

  const completeClaim = async (
    claimed: boolean,
    backedScribbitId: string,
    scoring: SeasonScoringContext | null,
    picksMade: number,
    unlockedMilestoneId: string | null
  ): Promise<DailyBackClaim> => {
    if (scoring) {
      await settleSeasonMilestoneRewards(
        storage,
        scoring.seasonId,
        player.userId,
        Date.now()
      );
    }
    return {
      claimed,
      backedScribbitId,
      seasonId: scoring?.seasonId ?? null,
      seasonPicksMade: picksMade,
      unlockedMilestoneId,
    };
  };

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      const scoringBeforeWatch = await loadSeasonScoringContext(storage, day);
      const participationKey = scoringBeforeWatch
        ? getSeasonParticipationKey(scoringBeforeWatch.seasonId)
        : null;
      const entitlementKey = scoringBeforeWatch
        ? getSeasonMilestoneEntitlementsKey(scoringBeforeWatch.seasonId)
        : null;
      transaction = await storage.watch(
        backKey,
        getSeasonCatalogKey(),
        ...(participationKey ? [participationKey] : []),
        ...(entitlementKey ? [entitlementKey] : [])
      );
      const scoring = await loadSeasonScoringContext(storage, day);
      if (JSON.stringify(scoring) !== JSON.stringify(scoringBeforeWatch)) {
        await transaction.unwatch();
        continue;
      }
      const existingBack = await storage.hGet(backKey, player.userId);
      const currentPicks = scoring
        ? await getSeasonParticipationCount(
            storage,
            scoring.seasonId,
            player.userId
          )
        : 0;
      if (existingBack !== undefined) {
        await transaction.unwatch();
        return await completeClaim(
          false,
          existingBack,
          scoring,
          currentPicks,
          null
        );
      }

      const nextPicks = scoring ? currentPicks + 1 : 0;
      const milestone = scoring
        ? getSeasonParticipationMilestone(nextPicks)
        : null;
      await transaction.multi();
      await transaction.hSet(backKey, { [player.userId]: scribbitId });
      await transaction.expire(backKey, backTtlSeconds);
      if (scoring && participationKey) {
        await transaction.zIncrBy(participationKey, player.userId, 1);
      }
      if (scoring && entitlementKey && milestone) {
        await transaction.hSet(entitlementKey, {
          [`${player.userId}:${milestone.id}`]: JSON.stringify({
            seasonId: scoring.seasonId,
            userId: player.userId,
            milestoneId: milestone.id,
            picksMade: nextPicks,
            reward: milestone.reward,
          }),
        });
      }
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return await completeClaim(
          true,
          scribbitId,
          scoring,
          nextPicks,
          milestone?.id ?? null
        );
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Rumble prediction');
      const existingBack = await storage.hGet(backKey, player.userId);
      if (existingBack !== undefined) {
        const scoring = await loadSeasonScoringContext(storage, day);
        const picksMade = scoring
          ? await getSeasonParticipationCount(
              storage,
              scoring.seasonId,
              player.userId
            )
          : 0;
        return await completeClaim(
          existingBack === scribbitId,
          existingBack,
          scoring,
          picksMade,
          null
        );
      }
      throw error;
    }
  }

  throw new Error('Rumble prediction changed too often.');
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

      await pruneExpiredPayoutReceipts(storage, userId, paidAtMs);

      await transaction.multi();
      await transaction.hSet(payoutKey, { [userId]: receiptValue });
      await trackPayoutReceipt(
        transaction,
        userId,
        { payoutKey, payoutField: userId },
        paidAtMs
      );
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
