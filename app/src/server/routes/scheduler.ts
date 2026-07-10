import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import {
  acknowledgeArenaResolution,
  loadPendingArenaResolutions,
  runNightlyArenaJob,
} from '../core/dailyJob';
import { ensureForecastForDay, getCurrentChampion } from '../core/arenaStore';
import { getOrCreateArenaPost, publishRumbleResultComment } from '../core/post';

export const scheduledTasks = new Hono();

scheduledTasks.post('/nightly-arena', async (c) => {
  const taskRequest: TaskRequest | undefined = await c.req
    .json<TaskRequest>()
    .catch(() => undefined);

  try {
    const result = await runNightlyArenaJob(redis);

    const currentForecast = await ensureForecastForDay(redis, result.newDay);
    const currentChampion = await getCurrentChampion(redis);
    const currentPost = await getOrCreateArenaPost(redis, {
      day: result.newDay,
      forecast: currentForecast,
      champion: currentChampion,
    });

    const pendingResolutions = await loadPendingArenaResolutions(redis);
    for (const resolution of pendingResolutions) {
      await getOrCreateArenaPost(redis, {
        day: resolution.resolvedDay,
        forecast: resolution.resolvedForecast,
        champion: resolution.champion,
      });
      const commentId = await publishRumbleResultComment(redis, resolution);
      if (!commentId) {
        throw new Error(`Rumble #${resolution.resolvedDay} result is still pending publication.`);
      }
      await acknowledgeArenaResolution(redis, resolution.resolvedDay);
    }

    if (result.skipped) {
      console.log(
        `Skipped arena advance at day ${result.previousDay}; task ${taskRequest?.name ?? 'nightly-arena'} is current for canonical day ${result.canonicalDay}`
      );
    } else {
      console.log(
        `Advanced arena from day ${result.previousDay} to ${result.newDay}; task ${taskRequest?.name ?? 'nightly-arena'} ensured post ${currentPost.id}`
      );
    }

    return c.json<TaskResponse>({}, 200);
  } catch (error) {
    console.error('Nightly Arena scheduler failed:', error);
    return c.json<TaskResponse>({}, 500);
  }
});
