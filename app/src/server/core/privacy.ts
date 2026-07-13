import type { ArenaStorage } from './storage';
import {
  getDailyFlagsKey,
  getUserDailySparWinRewardsKey,
  getUserAliveScribbitsKey,
  getUserBeliefTargetsKey,
  getUserLegacyCardsKey,
  getUserScribbitsKey,
  loadScribbits,
  removeUserBeliefReceipts,
} from './scribbit';
import { getBattleReportKey, getUserBattlesKey } from './battleStore';
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
  getUserOperationReceiptIndexKey,
  loadUserOperationReceiptKeys,
} from './inkStore';
import {
  getScribbitReportsKey,
  getUserHiddenScribbitsKey,
  getUserReportedScribbitsKey,
} from './moderation';
import { removeScribbitCompletely } from './removal';
import { getUserPlayStreakKey } from './streak';
import { getLegacyIndexVersionKey, getLegacySeenDayKey } from './legacy';
import {
  getFounderChronicleKey,
  getLegacyFounderChronicleKey,
  getPendingFounderChronicleKey,
} from './founderChronicle';
import {
  acquirePlayerDataDeletion,
  releasePlayerDataDeletion,
  renewPlayerDataDeletion,
  withPlayerDataDeletionHeartbeat,
  type PlayerDataDeletionLease,
} from './dataDeletion';
import { getRivalRunKey } from './rivalRun';

const requireDeletionOwnership = async (
  storage: ArenaStorage,
  lease: PlayerDataDeletionLease
): Promise<void> => {
  if ((await renewPlayerDataDeletion(storage, lease)) !== 'renewed') {
    throw new Error('Player data deletion lost ownership of its lock.');
  }
};

const deletePlayerDataRecords = async (
  storage: ArenaStorage,
  userId: string,
  currentDay: number,
  currentUtcDateKey: string,
  operationStartedAtMs: number,
  deletionLease: PlayerDataDeletionLease
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
    await requireDeletionOwnership(storage, deletionLease);
    await removeScribbitCompletely(storage, {
      ownerUserId: userId,
      scribbitId: scribbit.id,
      currentDay,
    });
  }

  const reportedTargets = await storage.hGetAll(
    getUserReportedScribbitsKey(userId)
  );
  for (const scribbitId of Object.keys(reportedTargets)) {
    await requireDeletionOwnership(storage, deletionLease);
    await storage.hDel(getScribbitReportsKey(scribbitId), [userId]);
  }

  await requireDeletionOwnership(storage, deletionLease);
  await removeUserBeliefReceipts(
    storage,
    userId,
    currentUtcDateKey,
    operationStartedAtMs
  );

  for (let day = Math.max(1, currentDay - 12); day <= currentDay; day += 1) {
    await requireDeletionOwnership(storage, deletionLease);
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
    await requireDeletionOwnership(storage, deletionLease);
    await storage.del(
      ...battleEntries.map((entry) => getBattleReportKey(entry.member))
    );
  }

  await requireDeletionOwnership(storage, deletionLease);
  const operationReceiptKeys = await loadUserOperationReceiptKeys(
    storage,
    userId
  );

  await requireDeletionOwnership(storage, deletionLease);
  await storage.del(
    getUserScribbitsKey(userId),
    getUserAliveScribbitsKey(userId),
    getUserLegacyCardsKey(userId),
    getLegacyIndexVersionKey(userId),
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
    getUserBeliefTargetsKey(userId),
    getFounderChronicleKey(userId),
    getLegacyFounderChronicleKey(userId),
    getPendingFounderChronicleKey(userId),
    getRivalRunKey(userId),
    getUserOperationReceiptIndexKey(userId),
    ...operationReceiptKeys
  );
  await storage.zRem(getCloutKey(), [userId]);
  await storage.hDel(getCloutUsernameKey(), [userId]);

  return { removedScribbits: scribbits.length };
};

export type DeletePlayerDataResult =
  | Readonly<{ status: 'deleted'; removedScribbits: number }>
  | Readonly<{ status: 'busy'; removedScribbits: 0 }>;

export const deletePlayerData = async (
  storage: ArenaStorage,
  userId: string,
  currentDay: number,
  currentUtcDateKey: string,
  operationStartedAtMs: number,
  operationId: string
): Promise<DeletePlayerDataResult> => {
  const deletion = await acquirePlayerDataDeletion(
    storage,
    userId,
    operationId
  );
  if (deletion.status === 'busy') {
    return { status: 'busy', removedScribbits: 0 };
  }

  let deletionResult: { removedScribbits: number };
  try {
    deletionResult = await withPlayerDataDeletionHeartbeat(
      storage,
      deletion.lease,
      () =>
        deletePlayerDataRecords(
          storage,
          userId,
          currentDay,
          currentUtcDateKey,
          operationStartedAtMs,
          deletion.lease
        )
    );
  } catch (error) {
    const release = await releasePlayerDataDeletion(storage, deletion.lease);
    if (release !== 'released') {
      throw new Error('Player data deletion lost ownership of its lock.', {
        cause: error,
      });
    }
    throw error;
  }

  const release = await releasePlayerDataDeletion(storage, deletion.lease);
  if (release !== 'released') {
    throw new Error('Player data deletion lost ownership of its lock.');
  }
  return { status: 'deleted', ...deletionResult };
};
