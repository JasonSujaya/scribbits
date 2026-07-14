import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error(
    'Run maturity countdown tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const {
  maturityCountdownHeadline,
  maturityDeadlineMilliseconds,
} = require(join(compiledClientRoot, 'lib', 'maturitycountdown.js'));

const HOUR = 60 * 60 * 1_000;
const DAY = 24 * HOUR;

test('maturity countdown includes days, hours, and minutes', () => {
  const now = Date.UTC(2026, 6, 14, 6, 0, 0);
  const nextArenaDayStartsAt = now + 18 * HOUR;
  const scribbit = { expiresDay: 11 };

  assert.equal(
    maturityDeadlineMilliseconds(scribbit, 9, nextArenaDayStartsAt),
    now + DAY + 18 * HOUR
  );
  assert.equal(
    maturityCountdownHeadline(scribbit, 9, nextArenaDayStartsAt, now),
    'MATURES IN 1D 18H 00M'
  );
});

test('maturity countdown rounds partial minutes up and never shows zero early', () => {
  const now = Date.UTC(2026, 6, 14, 23, 58, 30);
  const nextArenaDayStartsAt = Date.UTC(2026, 6, 15);

  assert.equal(
    maturityCountdownHeadline(
      { expiresDay: 10 },
      9,
      nextArenaDayStartsAt,
      now
    ),
    'MATURES IN 0D 00H 02M'
  );
});

test('maturity countdown uses stable mature states at and after the deadline', () => {
  const nextArenaDayStartsAt = Date.UTC(2026, 6, 15);

  assert.equal(
    maturityCountdownHeadline(
      { expiresDay: 9 },
      9,
      nextArenaDayStartsAt,
      nextArenaDayStartsAt - HOUR
    ),
    'MATURE • STATS LOCKED'
  );
  assert.equal(
    maturityCountdownHeadline(
      { expiresDay: 10 },
      9,
      nextArenaDayStartsAt,
      nextArenaDayStartsAt
    ),
    'MATURE • STATS LOCKED'
  );
});
