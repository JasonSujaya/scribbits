import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, redis, scheduler } from '@devvit/web/server';
import { deleteObsoleteAppPosts, ensureMainAppPost } from '../core/post';

export const triggers = new Hono();
const arenaMaintenanceStartDelayMilliseconds = 1_000;

const handleAppSetup = async (c: HonoContext) => {
  try {
    const input = await c.req.json<OnAppInstallRequest | OnAppUpgradeRequest>();
    const post = await ensureMainAppPost(redis, {
      recoverExistingPost: input.type !== 'AppInstall',
    });
    const deletedObsoletePostCount = await deleteObsoleteAppPosts(post.id);
    const runAt = new Date(Date.now() + arenaMaintenanceStartDelayMilliseconds);
    const jobId = await scheduler.runJob({
      name: 'nightly-arena',
      data: { attempt: 0, reason: `app-${input.type}` },
      runAt,
    });
    console.log(
      JSON.stringify({
        appVersion: context.appVersion,
        event: 'scribbits.app_setup.ready',
        deletedObsoletePostCount,
        jobId,
        postId: post.id,
        runAt: runAt.toISOString(),
        subreddit: context.subredditName,
        trigger: input.type,
      })
    );

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Scribbits is ready in ${context.subredditName} with one app post (${post.id}); removed ${deletedObsoletePostCount} obsolete app posts and scheduled recovery job ${jobId} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error preparing the Scribbits app post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to prepare the Scribbits app post',
      },
      400
    );
  }
};

triggers.post('/on-app-install', handleAppSetup);
triggers.post('/on-app-upgrade', handleAppSetup);
