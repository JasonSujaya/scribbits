import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
if (!compiledServerRoot) {
  throw new Error('Run analytics tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const analytics = require(
  join(compiledServerRoot, 'core', 'progressionAnalytics.js')
);

test('progression events are versioned, countable, and idempotent', async () => {
  const memory = createMemoryStorage();
  const event = {
    userId: 'analytics-player',
    eventId: 'event-0001',
    eventName: 'draw_started',
    sessionId: 'session-0001',
    arenaDay: 7,
    occurredAtMs: 1_000,
    source: 'first-scribbit',
  };

  assert.deepEqual(await analytics.recordProgressionEvent(memory.storage, event), {
    duplicate: false,
  });
  assert.deepEqual(await analytics.recordProgressionEvent(memory.storage, event), {
    duplicate: true,
  });
  assert.deepEqual(
    await memory.storage.hGetAll(analytics.getProgressionEventCountersKey()),
    { draw_started: '1' }
  );
  const stored = await memory.storage.hGet(
    analytics.getUserProgressionEventsKey(event.userId),
    event.eventId
  );
  assert.deepEqual(JSON.parse(stored), {
    version: 1,
    eventName: 'draw_started',
    sessionId: 'session-0001',
    arenaDay: 7,
    occurredAtMs: 1_000,
    source: 'first-scribbit',
  });
});
