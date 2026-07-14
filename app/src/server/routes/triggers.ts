import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { ensureCurrentArenaPost } from '../core/post';
import { ensureCurrentArenaDay } from '../core/arenaStore';
import { ensureInitialSeason } from '../core/season';

export const triggers = new Hono();

const handleAppSetup = async (c: HonoContext) => {
  try {
    const input = await c.req.json<
      OnAppInstallRequest | OnAppUpgradeRequest
    >();
    const now = new Date();
    const arenaDay = await ensureCurrentArenaDay(redis, now);
    await ensureInitialSeason(redis, arenaDay, now.getTime(), {
      userId: context.userId ?? 'system',
      username: context.username ?? 'Scribbits',
    });
    const post = await ensureCurrentArenaPost(redis, now);
    console.log(
      JSON.stringify({
        appVersion: context.appVersion,
        event: 'scribbits.app_setup.ready',
        postId: post.id,
        subreddit: context.subredditName,
        trigger: input.type,
      })
    );

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
};

triggers.post('/on-app-install', handleAppSetup);
triggers.post('/on-app-upgrade', handleAppSetup);
