import { randomUUID } from 'node:crypto';
import {
  acknowledgeArenaResolution,
  loadPendingArenaResolutions,
  runNightlyArenaJob,
} from './dailyJob';
import { ensureForecastForDay, getCurrentChampion } from './arenaStore';
import { getArenaDayNumber } from './day';
import {
  runWithNightlyFence,
  type RunWithNightlyFenceResult,
} from './nightlyStorageFence';
import { getOrCreateArenaPost, publishRumbleResultComment } from './post';
import { ensureInitialSeason } from './season';
import type { ArenaStorage } from './storage';

type MaintenanceActor = Readonly<{
  userId: string;
  username: string;
}>;

type MaintenanceSummary = Readonly<{
  currentPostId: string;
  result: Awaited<ReturnType<typeof runNightlyArenaJob>>;
}>;

export type ArenaMaintenanceResult =
  RunWithNightlyFenceResult<MaintenanceSummary>;

/**
 * Advances stale arena state and publishes every pending result before player
 * traffic is accepted. Scheduler runs use this daily; install and upgrade
 * triggers use the same path so a missed cron cannot strand the game.
 */
export const maintainArena = async (
  storage: ArenaStorage,
  options: Readonly<{
    now?: Date;
    operationId?: string;
    actor?: MaintenanceActor;
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
      now,
    });
    const currentForecast = await ensureForecastForDay(
      fencedStorage,
      result.newDay
    );
    const currentChampion = await getCurrentChampion(fencedStorage);
    const currentPost = await getOrCreateArenaPost(fencedStorage, {
      day: result.newDay,
      forecast: currentForecast,
      champion: currentChampion,
    });

    const pendingResolutions = await loadPendingArenaResolutions(fencedStorage);
    for (const resolution of pendingResolutions) {
      await getOrCreateArenaPost(fencedStorage, {
        day: resolution.resolvedDay,
        forecast: resolution.resolvedForecast,
        champion: resolution.champion,
      });
      const commentId = await publishRumbleResultComment(
        fencedStorage,
        resolution
      );
      if (!commentId) {
        throw new Error(
          `Rumble #${resolution.resolvedDay} result is still pending publication.`
        );
      }
      await acknowledgeArenaResolution(fencedStorage, resolution.resolvedDay);
    }

    return { result, currentPostId: currentPost.id };
  });
};
