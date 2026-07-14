import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import {
  acknowledgeArenaResolution,
  loadPendingArenaResolutions,
  runNightlyArenaJob,
} from '../core/dailyJob';
import { ensureForecastForDay, getCurrentChampion } from '../core/arenaStore';
import { getOrCreateArenaPost, publishRumbleResultComment } from '../core/post';
import { runWithNightlyFence } from '../core/nightlyStorageFence';
import { getArenaDayNumber } from '../core/day';
import { ensureInitialSeason } from '../core/season';

export const scheduledTasks = new Hono();

scheduledTasks.post('/nightly-arena', async (c) => {
  const taskRequest: TaskRequest | undefined = await c.req
    .json<TaskRequest>()
    .catch(() => undefined);

  try {
    const nightlyOperationId = randomUUID();
    const nightlyRun = await runWithNightlyFence(
      redis,
      nightlyOperationId,
      async (fencedStorage) => {
        const now = new Date();
        await ensureInitialSeason(
          fencedStorage,
          getArenaDayNumber(now),
          now.getTime()
        );
        const result = await runNightlyArenaJob(fencedStorage, {
          claimId: nightlyOperationId,
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

        const pendingResolutions =
          await loadPendingArenaResolutions(fencedStorage);
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
          await acknowledgeArenaResolution(
            fencedStorage,
            resolution.resolvedDay
          );
        }

        return { result, currentPostId: currentPost.id };
      }
    );
    if (nightlyRun.status === 'busy') {
      throw new Error(
        'Player data deletion is active; retry nightly resolution.'
      );
    }
    const { result, currentPostId } = nightlyRun.result;

    if (result.skipped) {
      console.log(
        `Skipped arena advance at day ${result.previousDay}; task ${taskRequest?.name ?? 'nightly-arena'} is current for canonical day ${result.canonicalDay}`
      );
    } else {
      console.log(
        `Advanced arena from day ${result.previousDay} to ${result.newDay}; task ${taskRequest?.name ?? 'nightly-arena'} ensured post ${currentPostId}`
      );
    }

    return c.json<TaskResponse>({}, 200);
  } catch (error) {
    console.error('Nightly Arena scheduler failed:', error);
    return c.json<TaskResponse>({}, 500);
  }
});
