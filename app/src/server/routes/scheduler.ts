import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import { runNightlyArenaJob } from '../core/dailyJob';
import { createPost } from '../core/post';

export const scheduledTasks = new Hono();

scheduledTasks.post('/nightly-arena', async (c) => {
  const taskRequest: TaskRequest | undefined = await c.req
    .json<TaskRequest>()
    .catch(() => undefined);

  try {
    const result = await runNightlyArenaJob(redis, {
      createPost: async ({ day, forecast, champion }) => {
        return await createPost({
          day,
          forecast,
          champion,
        });
      },
    });

    if (result.skipped) {
      console.log(
        `Skipped arena advance at day ${result.previousDay}; task ${taskRequest?.name ?? 'nightly-arena'} is current for canonical day ${result.canonicalDay}`
      );
    } else {
      console.log(
        `Advanced arena from day ${result.previousDay} to ${result.newDay}; task ${taskRequest?.name ?? 'nightly-arena'} created post ${result.postId ?? 'none'}`
      );
    }

    return c.json<TaskResponse>({}, 200);
  } catch (error) {
    console.error('Nightly Arena scheduler failed:', error);
    return c.json<TaskResponse>({}, 500);
  }
});
