import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { menu } from './routes/menu';
import { scheduledTasks } from './routes/scheduler';
import { triggers } from './routes/triggers';
import { analyticsAdmin } from './routes/analyticsAdmin';
import { feedbackAdmin } from './routes/feedbackAdmin';
import { moderationAdmin } from './routes/moderationAdmin';

export const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/triggers', triggers);
internal.route('/scheduler', scheduledTasks);
internal.route('/analytics', analyticsAdmin);
internal.route('/feedback', feedbackAdmin);
internal.route('/moderation', moderationAdmin);

app.route('/api', api);
app.route('/internal', internal);

app.get('/api/health', (c) => c.json({ status: 'ok' as const }));

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
