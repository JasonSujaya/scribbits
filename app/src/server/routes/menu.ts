import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { getCurrentSubredditModerator } from '../core/moderatorAuthorization';
import { ensureMainAppPost } from '../core/post';
import { seasonAdmin } from './seasonAdmin';
import { getAuthorizedSeasonAdmin } from '../core/seasonAdminAuthorization';

export const menu = new Hono();

menu.route('/', seasonAdmin);

menu.post('/post-create', async (c) => {
  try {
    const request = await c.req.json<MenuItemRequest>().catch(() => undefined);
    if (
      request?.location !== 'subreddit' ||
      !context.subredditId ||
      request.targetId !== context.subredditId
    ) {
      return c.json<UiResponse>(
        { showToast: 'Invalid Open Scribbits request.' },
        200
      );
    }
    if (!(await getCurrentSubredditModerator())) {
      return c.json<UiResponse>(
        { showToast: 'Opening Scribbits is restricted to moderators.' },
        200
      );
    }

    const post = await ensureMainAppPost(redis);

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error opening the Scribbits app post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to open the Scribbits app post',
      },
      400
    );
  }
});

menu.post('/feedback-view', async (c) => {
  try {
    const request = await c.req.json<MenuItemRequest>().catch(() => undefined);
    if (
      request?.location !== 'subreddit' ||
      !context.subredditId ||
      request.targetId !== context.subredditId
    ) {
      return c.json<UiResponse>(
        { showToast: 'Invalid feedback admin request.' },
        200
      );
    }
    if (!(await getAuthorizedSeasonAdmin())) {
      return c.json<UiResponse>(
        { showToast: 'Player feedback is restricted to Scribbits admins.' },
        200
      );
    }
    return c.json<UiResponse>(
      { navigateTo: new URL('/internal/feedback', c.req.url).toString() },
      200
    );
  } catch (error) {
    console.error(`Error opening player feedback: ${error}`);
    return c.json<UiResponse>(
      { showToast: 'Failed to open player feedback.' },
      400
    );
  }
});

menu.post('/moderation-view', async (c) => {
  try {
    const request = await c.req.json<MenuItemRequest>().catch(() => undefined);
    if (
      request?.location !== 'subreddit' ||
      !context.subredditId ||
      request.targetId !== context.subredditId
    ) {
      return c.json<UiResponse>(
        { showToast: 'Invalid moderation desk request.' },
        200
      );
    }
    if (!(await getAuthorizedSeasonAdmin())) {
      return c.json<UiResponse>(
        { showToast: 'Moderation tools are restricted to Scribbits admins.' },
        200
      );
    }
    return c.json<UiResponse>(
      { navigateTo: new URL('/internal/moderation', c.req.url).toString() },
      200
    );
  } catch (error) {
    console.error(`Error opening the moderation desk: ${error}`);
    return c.json<UiResponse>(
      { showToast: 'Failed to open the moderation desk.' },
      400
    );
  }
});
