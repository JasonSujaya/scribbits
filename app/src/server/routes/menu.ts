import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { getCurrentSubredditModerator } from '../core/moderatorAuthorization';
import { ensureCurrentArenaPost } from '../core/post';
import { seasonAdmin } from './seasonAdmin';

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
        { showToast: 'Invalid Create Rumble request.' },
        200
      );
    }
    if (!(await getCurrentSubredditModerator())) {
      return c.json<UiResponse>(
        { showToast: 'Create Rumble is restricted to moderators.' },
        200
      );
    }

    const now = new Date();
    const post = await ensureCurrentArenaPost(redis, now);

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
