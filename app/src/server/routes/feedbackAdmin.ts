import { redis } from '@devvit/web/server';
import { Hono, type Context as HonoContext } from 'hono';
import type { FeedbackPage } from '../../shared/feedback';
import {
  feedbackAdminCss,
  feedbackAdminHtml,
  feedbackAdminJavaScript,
} from '../admin/feedbackPage';
import { loadFeedbackPage } from '../core/feedback';
import { getAuthorizedSeasonAdmin } from '../core/seasonAdminAuthorization';

export const feedbackAdmin = new Hono();

const requireFeedbackAdmin = async (
  context: HonoContext
): Promise<Response | undefined> => {
  try {
    if (await getAuthorizedSeasonAdmin()) return undefined;
  } catch (error) {
    console.error('Feedback authorization failed:', error);
  }
  return context.text('Not found.', 404);
};

feedbackAdmin.get('/', async (context) => {
  const rejected = await requireFeedbackAdmin(context);
  if (rejected) return rejected;
  return context.html(feedbackAdminHtml);
});

feedbackAdmin.get('/assets/feedback.css', async (context) => {
  const rejected = await requireFeedbackAdmin(context);
  if (rejected) return rejected;
  return context.body(feedbackAdminCss, 200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/css; charset=utf-8',
  });
});

feedbackAdmin.get('/assets/feedback.js', async (context) => {
  const rejected = await requireFeedbackAdmin(context);
  if (rejected) return rejected;
  return context.body(feedbackAdminJavaScript, 200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/javascript; charset=utf-8',
  });
});

feedbackAdmin.get('/query', async (context) => {
  const rejected = await requireFeedbackAdmin(context);
  if (rejected) return rejected;

  try {
    return context.json<FeedbackPage>(
      await loadFeedbackPage(redis, {
        cursor: context.req.query('cursor'),
        limit: 50,
      })
    );
  } catch (error) {
    console.error('Feedback query failed:', error);
    return context.json({ message: 'Feedback could not be loaded.' }, 500);
  }
});
