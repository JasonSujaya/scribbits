import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getCurrentChampion,
} from '../core/arenaStore';
import { runNightlyArenaJob } from '../core/dailyJob';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const now = new Date();
    const day = await ensureCurrentArenaDay(redis, now);
    const forecast = await ensureForecastForDay(redis, day);
    const champion = await getCurrentChampion(redis);
    const post = await createPost({
      date: now,
      day,
      forecast,
      champion,
    });

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating arena post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create arena post',
      },
      400
    );
  }
});

menu.post('/advance-day-debug', async (c) => {
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

    return c.json<UiResponse>(
      {
        showToast: `Advanced to day ${result.newDay}; champion: ${result.champion.name}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error advancing arena day: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to advance arena day',
      },
      400
    );
  }
});
