import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error('Run Power-Up catalog tests through run-test-suites.mjs.');
}
const require = createRequire(import.meta.url);
const powerUps = require(join(compiledSharedRoot, 'combat', 'powerups.js'));

const raritiesFor = (ids) =>
  ids.map((id) => powerUps.POWER_UP_CATALOG[id].rarity);

test('launch catalog contains the balanced 15 behavioral Power-Ups', () => {
  assert.equal(powerUps.POWER_UP_IDS.length, 15);
  assert.deepEqual(
    Object.values(powerUps.POWER_UP_CATALOG).reduce(
      (counts, entry) => {
        counts[entry.rarity] += 1;
        return counts;
      },
      { common: 0, rare: 0, epic: 0, legendary: 0 }
    ),
    { common: 5, rare: 5, epic: 3, legendary: 2 }
  );
  assert.equal(powerUps.MAXIMUM_POWER_UP_BONUS_DAMAGE, 36);
  assert.equal(powerUps.MAXIMUM_POWER_UP_TRIGGER_EVENTS, 32);
});

test('build validation enforces unique five-card, one-Legendary, and exclusivity caps', () => {
  const legal = [
    'v1-edge-spring',
    'v1-paper-shield',
    'v1-double-doodle',
    'v1-last-scribble',
    'v1-masterpiece',
  ];
  assert.deepEqual(powerUps.parsePowerUpBuild(legal), legal);
  assert.equal(
    powerUps.validatePowerUpBuild([...legal, 'v1-wallop']).reason,
    'too-many'
  );
  assert.equal(
    powerUps.validatePowerUpBuild(['v1-edge-spring', 'v1-edge-spring']).reason,
    'duplicate'
  );
  assert.equal(
    powerUps.validatePowerUpBuild(['v1-masterpiece', 'v1-endless-draft'])
      .reason,
    'too-many-legendary'
  );
  assert.equal(
    powerUps.validatePowerUpBuild(['v1-backup-plan', 'v1-second-draft']).reason,
    'exclusive-conflict'
  );
  assert.equal(powerUps.parsePowerUpBuild(['not-real']), undefined);
});

test('offer generation is deterministic, unowned, distinct, and follows exact source patterns', () => {
  const sources = {
    'exhibition-win': ['common', 'common', 'rare'],
    'rival-run-win': ['common', 'common', 'rare'],
    'rival-run-final-win': ['common', 'rare', 'epic'],
    'rumble-day-win': ['common', 'rare', 'epic'],
    'champion-win': ['rare', 'epic', 'legendary'],
  };
  for (const [source, expectedRarities] of Object.entries(sources)) {
    const input = { seed: 'fixed-offer', source, ownedPowerUpIds: [] };
    const first = powerUps.createDeterministicPowerUpOffer(input);
    const second = powerUps.createDeterministicPowerUpOffer(input);
    assert.deepEqual(first, second);
    assert.equal(new Set(first).size, 3);
    assert.deepEqual(raritiesFor(first), expectedRarities);
  }
});

test('offers exclude owned and incompatible cards and respect full and Legendary caps', () => {
  const owned = ['v1-backup-plan', 'v1-masterpiece'];
  const championOffer = powerUps.createDeterministicPowerUpOffer({
    seed: 42,
    source: 'champion-win',
    ownedPowerUpIds: owned,
  });
  assert.ok(championOffer.every((id) => !owned.includes(id)));
  assert.ok(!championOffer.includes('v1-second-draft'));
  assert.deepEqual(raritiesFor(championOffer), ['rare', 'epic', 'epic']);

  assert.equal(
    powerUps.createDeterministicPowerUpOffer({
      seed: 42,
      source: 'champion-win',
      ownedPowerUpIds: [
        'v1-edge-spring',
        'v1-paper-shield',
        'v1-wallop',
        'v1-last-scribble',
        'v1-masterpiece',
      ],
    }),
    undefined
  );
});
