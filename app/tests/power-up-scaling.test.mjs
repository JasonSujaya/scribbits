import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error('Run Power-Up scaling tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const combat = require(join(compiledSharedRoot, 'combat', 'index.js'));

const stats = (dominantStat) => ({
  chonk: dominantStat === 'chonk' ? 55 : 15,
  spike: dominantStat === 'spike' ? 55 : 15,
  zip: 15,
  charm: dominantStat === 'charm' ? 55 : 15,
});

const makeFightInput = (seed, ownerRole, rivalRole, powerUpIds) => ({
  seed,
  fighters: [
    {
      id: 'scaling-owner',
      name: 'Scaling Owner',
      stats: stats(ownerRole),
      powerUpIds,
    },
    {
      id: 'scaling-rival',
      name: 'Scaling Rival',
      stats: stats(rivalRole),
    },
  ],
});

test('special repeat and counter damage scale beyond their retired flat caps', () => {
  const cases = [
    { id: 'v1-double-doodle', retiredCap: 1 },
    { id: 'v1-counter-sketch', retiredCap: 2 },
  ];

  for (const powerUpCase of cases) {
    let largestDamage = 0;
    for (const ownerRole of ['chonk', 'spike', 'charm']) {
      for (const rivalRole of ['chonk', 'spike', 'charm']) {
        const transcript = combat.simulateCombat(
          makeFightInput(
            `power-up-scaling:${powerUpCase.id}:${ownerRole}:${rivalRole}`,
            ownerRole,
            rivalRole,
            [powerUpCase.id]
          )
        );
        for (const event of transcript.timeline) {
          if (
            event.kind === 'damage' &&
            event.source === 'power_up' &&
            event.sourceFighter === 'a'
          ) {
            largestDamage = Math.max(largestDamage, event.amount);
          }
        }
      }
    }

    assert.ok(
      largestDamage > powerUpCase.retiredCap,
      `${powerUpCase.id} should scale beyond its retired flat cap`
    );
  }
});

test('Paper Shield blocks one quarter of the incoming special hit', () => {
  const seed = 'power-up-scaling:paper-shield';
  const baseline = combat.simulateCombat(
    makeFightInput(seed, 'chonk', 'chonk', [])
  );
  const shielded = combat.simulateCombat(
    makeFightInput(seed, 'chonk', 'chonk', ['v1-paper-shield'])
  );
  const shieldTrigger = shielded.timeline.find(
    (event) =>
      event.kind === 'power_up_triggered' &&
      event.powerUpId === 'v1-paper-shield'
  );

  assert.ok(shieldTrigger);
  const findIncomingDamageAtTrigger = (transcript) =>
    transcript.timeline.find(
      (event) =>
        event.kind === 'damage' &&
        event.tick === shieldTrigger.tick &&
        event.sourceFighter === 'b' &&
        event.targetFighter === 'a'
    );
  const baselineDamage = findIncomingDamageAtTrigger(baseline);
  const shieldedDamage = findIncomingDamageAtTrigger(shielded);

  assert.ok(baselineDamage);
  assert.ok(shieldedDamage);
  assert.equal(
    baselineDamage.amount - shieldedDamage.amount,
    Math.max(1, Math.round(baselineDamage.amount * 0.25))
  );
});
