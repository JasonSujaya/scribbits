import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error(
    'Run draw charge UI tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const {
  drawChargeCountLabel,
  drawChargeRefreshLabel,
  formatDrawChargeCountdown,
} = require(join(compiledClientRoot, 'lib', 'drawcharges.js'));

const MINUTE = 60 * 1_000;
const HOUR = 60 * MINUTE;

test('draw charge countdown is compact and rounds partial minutes up', () => {
  const now = Date.UTC(2026, 6, 14, 13, 0, 0);

  assert.equal(formatDrawChargeCountdown(now + 8 * HOUR, now), '8H 00M');
  assert.equal(
    formatDrawChargeCountdown(now + 2 * HOUR + 5 * MINUTE, now),
    '2H 05M'
  );
  assert.equal(formatDrawChargeCountdown(now + 90_001, now), '2M');
  assert.equal(formatDrawChargeCountdown(now + 1, now), '1M');
});

test('draw charge countdown reports ready for missing or elapsed refreshes', () => {
  const now = Date.UTC(2026, 6, 14, 13, 0, 0);

  assert.equal(formatDrawChargeCountdown(null, now), 'READY');
  assert.equal(formatDrawChargeCountdown(now, now), 'READY');
  assert.equal(formatDrawChargeCountdown(now - MINUTE, now), 'READY');
});

test('draw charge labels separate the count from refill timing', () => {
  const now = Date.UTC(2026, 6, 14, 13, 0, 0);
  const partialState = {
    available: 2,
    capacity: 3,
    nextRefreshAt: now + 3 * HOUR + 12 * MINUTE,
  };

  assert.equal(drawChargeCountLabel(partialState), '2/3');
  assert.equal(drawChargeRefreshLabel(partialState, now), '+1 IN 3H 12M');
  assert.equal(
    drawChargeRefreshLabel(
      { available: 3, capacity: 3, nextRefreshAt: null },
      now
    ),
    'FULL'
  );
  assert.equal(
    drawChargeRefreshLabel(
      { available: 0, capacity: 3, nextRefreshAt: now },
      now
    ),
    '+1 READY'
  );
});

test('draw charge labels stay safe for malformed client snapshots', () => {
  const now = Date.UTC(2026, 6, 14, 13, 0, 0);

  assert.equal(drawChargeCountLabel({ available: 8, capacity: 3 }), '3/3');
  assert.equal(drawChargeCountLabel({ available: -2, capacity: 3 }), '0/3');
  assert.equal(
    drawChargeRefreshLabel(
      { available: 0, capacity: 0, nextRefreshAt: null },
      now
    ),
    'UNAVAILABLE'
  );
});
