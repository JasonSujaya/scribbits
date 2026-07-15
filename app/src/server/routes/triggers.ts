import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, redis, scheduler } from '@devvit/web/server';
import { maintainArena } from '../core/arenaMaintenance';

export const triggers = new Hono();
const arenaMaintenanceRetryDelayMilliseconds = 16 * 60 * 1000;

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
      const retryAt = new Date(
        Date.now() + arenaMaintenanceRetryDelayMilliseconds
      );
      const retryJobId = await scheduler.runJob({
        name: 'nightly-arena',
        data: { reason: 'app-setup-busy' },
        runAt: retryAt,
      });
      console.log(
        JSON.stringify({
          appVersion: context.appVersion,
          event: 'scribbits.app_setup.deferred',
          retryAt: retryAt.toISOString(),
          retryJobId,
          subreddit: context.subredditName,
          trigger: input.type,
        })
      );
      return c.json<TriggerResponse>(
        {
          status: 'success',
          message: `Arena maintenance is active; recovery job ${retryJobId} is scheduled.`,
        },
        200
      );
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
