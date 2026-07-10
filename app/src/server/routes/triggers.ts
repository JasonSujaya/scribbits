import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getCurrentChampion,
} from '../core/arenaStore';
import { getOrCreateArenaPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
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
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Arena post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating install arena post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create arena post',
      },
      400
    );
  }
});
