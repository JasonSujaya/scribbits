import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [page, route, server, publicApi, splash, configSource, mock] =
  await Promise.all([
    readFile(
      new URL('../src/server/admin/analyticsPage.ts', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../src/server/routes/analyticsAdmin.ts', import.meta.url),
      'utf8'
    ),
    readFile(new URL('../src/server/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/server/routes/api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/client/splash.ts', import.meta.url), 'utf8'),
    readFile(new URL('../devvit.json', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/dev-mock.mjs', import.meta.url), 'utf8'),
  ]);

const config = JSON.parse(configSource);

test('analytics is a backend-only internal admin surface', () => {
  assert.equal(config.post.entrypoints.analytics, undefined);
  assert.doesNotMatch(splash, /analytics/i);
  assert.doesNotMatch(publicApi, /api\.get\('\/analytics/);
  assert.match(server, /internal\.route\('\/analytics', analyticsAdmin\)/);
  assert.match(route, /getAuthorizedSeasonAdmin\(\)/);
  assert.match(route, /analyticsAdmin\.get\('\/query'/);
});

test('internal analytics page provides bounded queries without inline scripts', () => {
  assert.match(page, /id="from-date"/);
  assert.match(page, /id="to-date"/);
  assert.match(page, /id="metric"/);
  assert.match(page, /id="search"/);
  assert.match(page, /src="\/internal\/analytics\/assets\/analytics\.js"/);
  assert.doesNotMatch(page, /<script>(?!<\/script>)/);
  assert.match(mock, /path === '\/internal\/analytics\/query'/);
  assert.doesNotMatch(mock, /path === '\/api\/analytics/);
});
