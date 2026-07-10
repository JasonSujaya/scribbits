import type { ArenaStorage } from './scribbit';
import {
  deleteStoredScribbit,
  getDailyFlagsKey,
  getUserDailySparWinRewardsKey,
  getUserAliveScribbitsKey,
  getUserLegacyCardsKey,
  getUserScribbitsKey,
  loadScribbits,
} from './scribbit';
import {
  getBattleReportKey,
  getUserBattlesKey,
  purgeBattleReportsForScribbit,
} from './battleStore';
import { removeCurrentChampionIfMatches } from './arenaStore';
import {
  getBackKey,
  getCloutKey,
  getCloutPayoutKey,
  getCloutUsernameKey,
} from './clout';
import {
  getCapsuleDailyPullKey,
  getCapsulePullCountKey,
  getInkKey,
  getInventoryKey,
  getPullsSinceEpicKey,
  getRumbleWinInkPayoutKey,
} from './inkStore';
import {
  getScribbitReportsKey,
  getUserHiddenScribbitsKey,
  getUserReportedScribbitsKey,
} from './moderation';
import { getUserPlayStreakKey } from './streak';
import { getLegacyIndexVersionStorageKey, getLegacySeenDayKey } from './legacy';

const userBeliefTargetsTtlSeconds = 30 * 24 * 60 * 60;

export const getUserBeliefTargetsKey = (userId: string): string => {
  return `user:${userId}:belief-targets`;
};

export const recordUserBeliefTarget = async (
  storage: ArenaStorage,
  userId: string,
  scribbitId: string,
  utcDateKey: string
): Promise<void> => {
  const key = getUserBeliefTargetsKey(userId);
  await storage.hSet(key, { [scribbitId]: utcDateKey });
  await storage.expire(key, userBeliefTargetsTtlSeconds);
};

export const deletePlayerData = async (
  storage: ArenaStorage,
  userId: string,
  currentDay: number
): Promise<{ removedScribbits: number }> => {
  const scribbitEntries = await storage.zRange(
    getUserScribbitsKey(userId),
    0,
    -1,
    { by: 'rank' }
  );
  const scribbits = await loadScribbits(
    storage,
    scribbitEntries.map((entry) => entry.member)
  );

  for (const scribbit of scribbits) {
    await purgeBattleReportsForScribbit(storage, scribbit.id);
    await deleteStoredScribbit(storage, userId, scribbit.id, currentDay);
    await removeCurrentChampionIfMatches(storage, scribbit.id);
  }

  const reportedTargets = await storage.hGetAll(
    getUserReportedScribbitsKey(userId)
  );
  for (const scribbitId of Object.keys(reportedTargets)) {
    await storage.hDel(getScribbitReportsKey(scribbitId), [userId]);
  }

  const beliefTargets = await storage.hGetAll(getUserBeliefTargetsKey(userId));
  for (const [scribbitId, utcDateKey] of Object.entries(beliefTargets)) {
    await storage.hDel(`belief:${scribbitId}`, [`${userId}:${utcDateKey}`]);
  }

  for (let day = Math.max(1, currentDay - 12); day <= currentDay; day += 1) {
    await storage.hDel(getBackKey(day), [userId]);
    await storage.hDel(getCloutPayoutKey(day), [userId]);
    await storage.del(getDailyFlagsKey(userId, day));
    await storage.del(getCapsuleDailyPullKey(userId, day));
    if (scribbits.length > 0) {
      await storage.hDel(
        getRumbleWinInkPayoutKey(day),
        scribbits.map((scribbit) => scribbit.id)
      );
    }
  }

  const battleEntries = await storage.zRange(getUserBattlesKey(userId), 0, -1, {
    by: 'rank',
  });
  if (battleEntries.length > 0) {
    await storage.del(
      ...battleEntries.map((entry) => getBattleReportKey(entry.member))
    );
  }

  await storage.del(
    getUserScribbitsKey(userId),
    getUserAliveScribbitsKey(userId),
    getUserLegacyCardsKey(userId),
    getLegacyIndexVersionStorageKey(userId),
    getLegacySeenDayKey(userId),
    getUserBattlesKey(userId),
    getInkKey(userId),
    getInventoryKey(userId),
    getPullsSinceEpicKey(userId),
    getCapsulePullCountKey(userId),
    getUserDailySparWinRewardsKey(userId),
    getUserPlayStreakKey(userId),
    getUserHiddenScribbitsKey(userId),
    getUserReportedScribbitsKey(userId),
    getUserBeliefTargetsKey(userId)
  );
  await storage.zRem(getCloutKey(), [userId]);
  await storage.hDel(getCloutUsernameKey(), [userId]);

  return { removedScribbits: scribbits.length };
};
