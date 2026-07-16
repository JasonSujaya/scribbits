import { randomUUID } from 'node:crypto';
import {
  acknowledgeArenaResolution,
  loadPendingArenaResolutions,
  runNightlyArenaJob,
  type ResolvedArenaDay,
} from './dailyJob';
import { getArenaDayNumber } from './day';
import {
  runWithNightlyFence,
  type RunWithNightlyFenceResult,
} from './nightlyStorageFence';
import { ensureInitialSeason } from './season';
import type { ArenaStorage } from './storage';

type MaintenanceActor = Readonly<{
  userId: string;
  username: string;
}>;

type MaintenanceSummary = Readonly<{
  result: Awaited<ReturnType<typeof runNightlyArenaJob>>;
}>;

export type ArenaMaintenanceResult =
  RunWithNightlyFenceResult<MaintenanceSummary>;

/**
 * Advances stale arena state, publishes due community updates, and only then
 * acknowledges pending results. Install and upgrade triggers schedule the same
 * path so a missed cron cannot strand the game or lose an announcement.
 */
export const maintainArena = async (
  storage: ArenaStorage,
  options: Readonly<{
    now?: Date;
    operationId?: string;
    actor?: MaintenanceActor;
    publishCommunityPosts?: (
      input: Readonly<{
        currentArenaDay: number;
        resolutions: readonly ResolvedArenaDay[];
      }>
    ) => Promise<void>;
  }> = {}
): Promise<ArenaMaintenanceResult> => {
  const now = options.now ?? new Date();
  const operationId = options.operationId ?? randomUUID();

  return runWithNightlyFence(storage, operationId, async (fencedStorage) => {
    await ensureInitialSeason(
      fencedStorage,
      getArenaDayNumber(now),
      now.getTime(),
      options.actor
    );
    const result = await runNightlyArenaJob(fencedStorage, {
      claimId: operationId,
      claimRecoveryStorage: storage,
      now,
    });
    const pendingResolutions = await loadPendingArenaResolutions(fencedStorage);
    await options.publishCommunityPosts?.({
      currentArenaDay: result.newDay,
      resolutions: pendingResolutions,
    });
    for (const resolution of pendingResolutions) {
      await acknowledgeArenaResolution(fencedStorage, resolution.resolvedDay);
    }

    return { result };
  });
};
