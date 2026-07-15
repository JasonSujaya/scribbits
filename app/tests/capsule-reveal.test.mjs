import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error(
    'Run capsule reveal tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const capsuleReveal = require(
  join(compiledClientRoot, 'lib', 'capsulereveal.js')
);

const pulls = [
  'common',
  'legendary',
  'rare',
  'common',
  'epic',
  'common',
  'rare',
  'common',
  'common',
  'common',
].map((rarity, index) => ({
  rarity,
  name: `Reward ${index + 1}`,
}));

test('ten rewards reveal in paid order with rarity-scaled pauses', () => {
  const plan = capsuleReveal.planCapsuleBatchReveal(pulls, false);
  assert.equal(plan.steps.length, 10);
  assert.deepEqual(
    plan.steps.map((step) => step.index),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  );
  const gaps = plan.steps.map((step, index) =>
    index === 0
      ? step.delayMs - 120
      : step.delayMs - plan.steps[index - 1].delayMs
  );
  assert.equal(gaps[0], 90);
  assert.equal(gaps[1], 420);
  assert.equal(gaps[2], 170);
  assert.equal(gaps[4], 280);
  assert.ok(plan.completionDelayMs > plan.steps.at(-1).delayMs);
});

test('reduced motion reveals the complete ten-reward grid immediately', () => {
  const plan = capsuleReveal.planCapsuleBatchReveal(pulls, true);
  assert.equal(plan.completionDelayMs, 0);
  assert.ok(plan.steps.every((step) => step.delayMs === 0));
});

test('batch reveal validation and announcements stay exact', () => {
  assert.throws(() =>
    capsuleReveal.planCapsuleBatchReveal(pulls.slice(0, 9), false)
  );
  assert.equal(
    capsuleReveal.capsuleRevealAnnouncement(pulls[2], 2),
    '3 of 10. rare reward: Reward 3.'
  );
  assert.throws(() => capsuleReveal.capsuleRevealAnnouncement(pulls[0], 10));
});
