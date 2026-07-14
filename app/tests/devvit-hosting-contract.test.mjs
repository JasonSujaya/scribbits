import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [configSource, splashSource, gameHtml, gameSource, drawSource, serverSource] =
  await Promise.all([
    readFile(new URL('../devvit.json', import.meta.url), 'utf8'),
    readFile(new URL('../src/client/splash.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/client/game.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/client/game.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/client/scenes/Draw.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/server/index.ts', import.meta.url), 'utf8'),
  ]);

const config = JSON.parse(configSource);

test('Devvit maps inline, expanded, and server entrypoints to production files', () => {
  assert.deepEqual(config.post.entrypoints.default, {
    inline: true,
    entry: 'splash.html',
  });
  assert.deepEqual(config.post.entrypoints.game, { entry: 'game.html' });
  assert.equal(config.server.entry, 'index.cjs');
  assert.equal(config.dev.subreddit, 'scribbits_dev');
});

test('the trusted Continue gesture awaits expanded mode and reports rejection', () => {
  assert.match(splashSource, /await requestExpandedMode\(event, 'game'\)/);
  assert.match(splashSource, /showToast\(translate\('splash\.error\.expand'\)\)/);
});

test('expanded boot remains visible through startup and can fall back to Canvas', () => {
  assert.match(gameHtml, /id="game-boot-status"/);
  assert.match(gameSource, /StartGame\('game-container', CANVAS\)/);
  assert.match(gameSource, /reportGameBootError/);
});

test('hosted Draw inlines its analyzer worker and the server exposes health', () => {
  assert.match(drawSource, /analyzer\.worker\?worker&inline/);
  assert.match(serverSource, /app\.get\('\/api\/health'/);
});
