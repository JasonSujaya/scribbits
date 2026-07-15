import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, scheduler } from '@devvit/web/server';

export const triggers = new Hono();
const arenaMaintenanceStartDelayMilliseconds = 1_000;

const handleAppSetup = async (c: HonoContext) => {
  try {
    const input = await c.req.json<OnAppInstallRequest | OnAppUpgradeRequest>();
    const runAt = new Date(Date.now() + arenaMaintenanceStartDelayMilliseconds);
    const jobId = await scheduler.runJob({
      name: 'nightly-arena',
      data: { attempt: 0, reason: `app-${input.type}` },
      runAt,
    });
    console.log(
      JSON.stringify({
        appVersion: context.appVersion,
        event: 'scribbits.app_setup.scheduled',
        jobId,
        runAt: runAt.toISOString(),
        subreddit: context.subredditName,
        trigger: input.type,
      })
    );

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Arena recovery job ${jobId} scheduled for subreddit ${context.subredditName}.`,
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
