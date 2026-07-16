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

  assert.deepEqual(
    await analytics.recordProgressionEvent(memory.storage, event),
    {
      duplicate: false,
    }
  );
  assert.deepEqual(
    await analytics.recordProgressionEvent(memory.storage, event),
    {
      duplicate: true,
    }
  );
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

  const report = await analytics.loadProgressionAnalytics(
    memory.storage,
    '19700101',
    '19700101',
    new Date('1970-01-02T00:00:00.000Z')
  );
  assert.equal(report.rangeEventCounts.draw_started, 1);
  assert.equal(report.lifetimeEventCounts.draw_started, 1);
  assert.equal(report.activePlayerDays, 1);
  assert.equal(report.sessionDays, 1);
  assert.deepEqual(report.days[0], {
    date: '1970-01-01',
    uniquePlayers: 1,
    sessions: 1,
    eventCounts: {
      draw_started: 1,
      draw_submitted: 0,
      power_up_offer_shown: 0,
      power_up_chosen: 0,
      founding_replay_started: 0,
      founding_replay_completed: 0,
      permanent_reward_earned: 0,
      maturity_shown: 0,
      maturity_acknowledged: 0,
      mature_competition_entered: 0,
      progress_receipt: 0,
      screen_exit_without_next_action: 0,
    },
  });

  await analytics.removeUserFromProgressionAnalytics(
    memory.storage,
    event.userId
  );
  assert.equal(
    await memory.storage.zCard(
      analytics.getDailyProgressionUsersKey('19700101')
    ),
    0
  );
  assert.equal(
    await memory.storage.zCard(
      analytics.getDailyProgressionSessionsKey('19700101')
    ),
    0
  );
});

test('analytics queries reject reversed and oversized date ranges', async () => {
  const memory = createMemoryStorage();
  await assert.rejects(
    analytics.loadProgressionAnalytics(memory.storage, '20260716', '20260715'),
    /date range is invalid/
  );
  await assert.rejects(
    analytics.loadProgressionAnalytics(memory.storage, '20260601', '20260716'),
    /cannot exceed 31 days/
  );
});
