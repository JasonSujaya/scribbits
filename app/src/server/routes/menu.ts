import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getCurrentChampion,
} from '../core/arenaStore';
import { getOrCreateArenaPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const now = new Date();
    const day = await ensureCurrentArenaDay(redis, now);
    const forecast = await ensureForecastForDay(redis, day);
    const champion = await getCurrentChampion(redis);
    const post = await getOrCreateArenaPost(redis, {
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
