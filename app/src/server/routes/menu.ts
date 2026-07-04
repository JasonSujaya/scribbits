import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import { ensureSpawnScheduleForDate } from '../core/spawnEngine';
import { launchSpecies } from '../core/species';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const now = new Date();
    const schedule = await ensureSpawnScheduleForDate(redis, now, launchSpecies);
    const post = await createPost({ date: now, weather: schedule.weather });

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});
