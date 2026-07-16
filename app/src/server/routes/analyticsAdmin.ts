import { Hono, type Context as HonoContext } from 'hono';
import { redis } from '@devvit/web/server';
import type { ProgressionAnalyticsResponse } from '../../shared/progressionanalytics';
import {
  analyticsAdminCss,
  analyticsAdminHtml,
  analyticsAdminJavaScript,
} from '../admin/analyticsPage';
import { loadProgressionAnalytics } from '../core/progressionAnalytics';
import { getAuthorizedSeasonAdmin } from '../core/seasonAdminAuthorization';
import { addUtcDays, formatUtcDateKey, parseUtcDateKey } from '../core/day';

export const analyticsAdmin = new Hono();

const requireAnalyticsAdmin = async (
  c: HonoContext
): Promise<Response | undefined> => {
  try {
    if (await getAuthorizedSeasonAdmin()) return undefined;
  } catch (error) {
    console.error('Analytics authorization failed:', error);
  }
  return c.text('Not found.', 404);
};

const readDateKey = (value: string | undefined): string | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const dateKey = value.replaceAll('-', '');
  return parseUtcDateKey(dateKey) ? dateKey : undefined;
};

analyticsAdmin.get('/', async (c) => {
  const rejected = await requireAnalyticsAdmin(c);
  if (rejected) return rejected;
  return c.html(analyticsAdminHtml);
});

analyticsAdmin.get('/assets/analytics.css', async (c) => {
  const rejected = await requireAnalyticsAdmin(c);
  if (rejected) return rejected;
  return c.body(analyticsAdminCss, 200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/css; charset=utf-8',
  });
});

analyticsAdmin.get('/assets/analytics.js', async (c) => {
  const rejected = await requireAnalyticsAdmin(c);
  if (rejected) return rejected;
  return c.body(analyticsAdminJavaScript, 200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/javascript; charset=utf-8',
  });
});

analyticsAdmin.get('/query', async (c) => {
  const rejected = await requireAnalyticsAdmin(c);
  if (rejected) return rejected;

  const now = new Date();
  const defaultTo = formatUtcDateKey(now);
  const defaultFrom = formatUtcDateKey(addUtcDays(now, -13));
  const fromDateKey = c.req.query('from')
    ? readDateKey(c.req.query('from'))
    : defaultFrom;
  const toDateKey = c.req.query('to')
    ? readDateKey(c.req.query('to'))
    : defaultTo;
  if (!fromDateKey || !toDateKey) {
    return c.json(
      { message: 'Use valid UTC dates in YYYY-MM-DD format.' },
      400
    );
  }

  try {
    return c.json<ProgressionAnalyticsResponse>(
      await loadProgressionAnalytics(redis, fromDateKey, toDateKey, now)
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('date range')) {
      return c.json({ message: error.message }, 400);
    }
    console.error('Analytics query failed:', error);
    return c.json({ message: 'Analytics could not be loaded.' }, 500);
  }
});
