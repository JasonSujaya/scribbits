import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { maintainArena } from '../core/arenaMaintenance';

export const triggers = new Hono();

const handleAppSetup = async (c: HonoContext) => {
  try {
    const input = await c.req.json<OnAppInstallRequest | OnAppUpgradeRequest>();
    const maintenance = await maintainArena(redis, {
      actor: {
        userId: context.userId ?? 'system',
        username: context.username ?? 'Scribbits',
      },
    });
    if (maintenance.status === 'busy') {
      throw new Error('Arena maintenance is already running.');
    }
    const { currentPostId, result } = maintenance.result;
    console.log(
      JSON.stringify({
        appVersion: context.appVersion,
        arenaDay: result.newDay,
        event: 'scribbits.app_setup.ready',
        postId: currentPostId,
        subreddit: context.subredditName,
        trigger: input.type,
      })
    );

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Arena ready in subreddit ${context.subredditName} with post ${currentPostId} (trigger: ${input.type})`,
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
