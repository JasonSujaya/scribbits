import { randomUUID } from 'node:crypto';
import {
  acknowledgeArenaResolution,
  loadPendingArenaResolutions,
  runNightlyArenaJob,
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
 * Advances stale arena state and acknowledges pending results without creating
 * daily Reddit posts. Scheduler runs use this daily; install and upgrade
 * triggers schedule the same path so a missed cron cannot strand the game.
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
      claimRecoveryStorage: storage,
      now,
    });
    const pendingResolutions = await loadPendingArenaResolutions(fencedStorage);
    for (const resolution of pendingResolutions) {
      await acknowledgeArenaResolution(fencedStorage, resolution.resolvedDay);
    }

    return { result };
  });
};
