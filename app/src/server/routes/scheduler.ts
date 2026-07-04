import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import {
  addUtcDays,
  ensureSpawnScheduleForDate,
  formatUtcDateKey,
} from '../core/spawnEngine';
import { launchSpecies } from '../core/species';

export const scheduledTasks = new Hono();

const getWildsPostKey = (dateKey: string): string => {
  return `wilds:post:${dateKey}`;
};

scheduledTasks.post('/nightly-wilds', async (c) => {
  const taskRequest: TaskRequest | undefined = await c.req
    .json<TaskRequest>()
    .catch(() => undefined);

  try {
    const now = new Date();
    const todayDateKey = formatUtcDateKey(now);
    const tomorrow = addUtcDays(now, 1);
    const todaySchedule = await ensureSpawnScheduleForDate(
      redis,
      now,
      launchSpecies
    );
    await ensureSpawnScheduleForDate(redis, tomorrow, launchSpecies);

    const wildsPostKey = getWildsPostKey(todayDateKey);
    const existingPostId = await redis.get(wildsPostKey);

    if (!existingPostId) {
      const post = await createPost({
        date: now,
        weather: todaySchedule.weather,
      });
      await redis.set(wildsPostKey, post.id);
      console.log(
        `Created Wilds #${todaySchedule.dayNumber} post ${post.id} from ${taskRequest?.name ?? 'nightly-wilds'}`
      );
    }

    return c.json<TaskResponse>({}, 200);
  } catch (error) {
    console.error('Nightly Wilds scheduler failed:', error);
    return c.json<TaskResponse>({}, 500);
  }
});
