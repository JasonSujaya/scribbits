import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { redis, scheduler } from '@devvit/web/server';
import { maintainArena } from '../core/arenaMaintenance';
import { publishArenaCommunityPosts } from '../core/communityPosts';

export const scheduledTasks = new Hono();
const arenaMaintenanceRetryDelayMilliseconds = 30_000;
const maximumArenaMaintenanceRetries = 3;

type ArenaMaintenanceTaskData = {
  attempt?: number;
  reason?: string;
};

scheduledTasks.post('/nightly-arena', async (c) => {
  const taskRequest: TaskRequest<ArenaMaintenanceTaskData> | undefined =
    await c.req
      .json<TaskRequest<ArenaMaintenanceTaskData>>()
      .catch(() => undefined);
  const attempt = Math.max(0, Math.trunc(taskRequest?.data?.attempt ?? 0));

  try {
    const nightlyOperationId = randomUUID();
    const nightlyRun = await maintainArena(redis, {
      operationId: nightlyOperationId,
      publishCommunityPosts: ({ currentArenaDay, resolutions }) =>
        publishArenaCommunityPosts(redis, {
          currentArenaDay,
          resolvedArenaDays: resolutions.map(
            (resolution) => resolution.resolvedDay
          ),
        }),
    });
    if (nightlyRun.status === 'busy') {
      throw new Error('Arena maintenance lease is busy.');
    }
    const result = nightlyRun.result.result;

    if (result.skipped) {
      console.log(
        `Skipped arena advance at day ${result.previousDay}; task ${taskRequest?.name ?? 'nightly-arena'} is current for canonical day ${result.canonicalDay}`
      );
    } else {
      console.log(
        `Advanced arena from day ${result.previousDay} to ${result.newDay}; task ${taskRequest?.name ?? 'nightly-arena'} published due community updates`
      );
    }

    return c.json<TaskResponse>({}, 200);
  } catch (error) {
    console.error('Nightly Arena scheduler failed:', error);
    if (attempt < maximumArenaMaintenanceRetries) {
      await scheduler.runJob({
        name: 'nightly-arena',
        data: {
          attempt: attempt + 1,
          reason: taskRequest?.data?.reason ?? 'nightly-retry',
        },
        runAt: new Date(Date.now() + arenaMaintenanceRetryDelayMilliseconds),
      });
      return c.json<TaskResponse>({}, 200);
    }
    return c.json<TaskResponse>({}, 500);
  }
});
