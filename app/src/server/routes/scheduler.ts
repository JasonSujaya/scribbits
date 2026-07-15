import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import { maintainArena } from '../core/arenaMaintenance';

export const scheduledTasks = new Hono();

scheduledTasks.post('/nightly-arena', async (c) => {
  const taskRequest: TaskRequest | undefined = await c.req
    .json<TaskRequest>()
    .catch(() => undefined);

  try {
    const nightlyOperationId = randomUUID();
    const nightlyRun = await maintainArena(redis, {
      operationId: nightlyOperationId,
    });
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
