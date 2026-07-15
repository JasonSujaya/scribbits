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
  assert.equal(powerUps.MAXIMUM_POWER_UP_BONUS_DAMAGE, 60);
  assert.equal(powerUps.MAXIMUM_POWER_UP_TRIGGER_EVENTS, 32);
  Object.values(powerUps.POWER_UP_CATALOG).forEach((entry) => {
    assert.ok(entry.when.length >= 10);
    assert.ok(entry.effect.length >= 10);
    assert.equal(entry.description, `${entry.when}. ${entry.effect}.`);
  });
});

test('player-facing Power-Up descriptions avoid combat-engine jargon', () => {
  Object.values(powerUps.POWER_UP_CATALOG).forEach((entry) => {
    assert.doesNotMatch(entry.description, /\bticks?\b|\bpermille\b/i);
    assert.doesNotMatch(entry.description, /\bsignature\b|\bbasic attack\b/i);
    assert.match(entry.description, /^[A-Z].+\. [A-Z].+\.$/);
  });
  assert.equal(powerUps.POWER_UP_CATALOG['v1-combo-spark'].healingAmount, 4);
  assert.equal(powerUps.POWER_UP_CATALOG['v1-center-fold'].healingAmount, 12);
  assert.equal(
    powerUps.POWER_UP_CATALOG['v1-last-scribble'].survivingHitPointPermille,
    300
  );
});

test('every Power-Up has one centralized playstyle profile', () => {
  assert.deepEqual(
    Object.keys(powerUps.POWER_UP_PLAYSTYLE_PROFILES).sort(),
    [...powerUps.POWER_UP_IDS].sort()
  );
  Object.values(powerUps.POWER_UP_PLAYSTYLE_PROFILES).forEach((profile) => {
    assert.ok(profile.recommendedRoles.length >= 1);
    assert.ok(profile.gearFamilies.length >= 1);
    assert.equal(Object.isFrozen(profile), true);
    assert.equal(Object.isFrozen(profile.recommendedRoles), true);
    assert.equal(Object.isFrozen(profile.avoidedRoles), true);
    assert.equal(Object.isFrozen(profile.gearFamilies), true);
  });
  assert.ok(
    powerUps.scorePowerUpFit('v1-wallop', 'brawler', ['guard']) >
      powerUps.scorePowerUpFit('v1-wallop', 'longshot', ['aim'])
  );
  assert.ok(
    powerUps.scorePowerUpFit('v1-combo-spark', 'longshot', ['rush']) >
      powerUps.scorePowerUpFit('v1-combo-spark', 'mage', ['guard'])
  );
  powerUps.POWER_UP_IDS.forEach((id) => {
    assert.equal(powerUps.powerUpIsOfferableForRole(id, 'brawler'), true);
    assert.equal(powerUps.powerUpIsOfferableForRole(id, 'longshot'), true);
    assert.equal(powerUps.powerUpIsOfferableForRole(id, 'mage'), true);
    assert.ok(powerUps.POWER_UP_CATALOG[id].buildPath);
  });
  assert.ok(
    powerUps.scorePowerUpFit('v1-combo-spark', 'mage', [], ['v1-backup-plan']) >
      powerUps.scorePowerUpFit('v1-combo-spark', 'mage')
  );
});

test('build validation enforces unique five-card and one-Legendary caps', () => {
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
    powerUps.validatePowerUpBuild(['v1-backup-plan', 'v1-second-draft']).valid,
    true
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

test('role-aware offers guarantee a highest-fit first choice without changing rarity', () => {
  const cases = [
    ['brawler', ['guard', 'ready']],
    ['longshot', ['aim']],
    ['mage', ['fortune']],
  ];
  for (const [combatRole, gearFamilies] of cases) {
    const input = {
      seed: `fit-${combatRole}`,
      source: 'exhibition-win',
      ownedPowerUpIds: [],
      combatRole,
      gearFamilies,
    };
    const first = powerUps.createDeterministicPowerUpOffer(input);
    const repeated = powerUps.createDeterministicPowerUpOffer(input);
    assert.deepEqual(repeated, first);
    assert.deepEqual(raritiesFor(first), ['common', 'common', 'rare']);
    const eligibleCommonScores = powerUps.POWER_UP_IDS.filter(
      (id) => powerUps.POWER_UP_CATALOG[id].rarity === 'common'
    ).map((id) => powerUps.scorePowerUpFit(id, combatRole, gearFamilies));
    assert.equal(
      powerUps.scorePowerUpFit(first[0], combatRole, gearFamilies),
      Math.max(...eligibleCommonScores)
    );
  }
});

test('role-aware offers keep every skill universally usable', () => {
  for (let seed = 0; seed < 24; seed += 1) {
    const mageOffer = powerUps.createDeterministicPowerUpOffer({
      seed: `mage-trap-filter-${seed}`,
      source: 'exhibition-win',
      ownedPowerUpIds: [],
      combatRole: 'mage',
      gearFamilies: ['rush', 'focus'],
    });
    assert.ok(mageOffer);
    assert.ok(
      mageOffer.every((id) => powerUps.powerUpIsOfferableForRole(id, 'mage'))
    );
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
