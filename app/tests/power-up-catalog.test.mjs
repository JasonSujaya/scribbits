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
      { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
    ),
    { common: 5, uncommon: 3, rare: 2, epic: 3, legendary: 2 }
  );
  assert.equal(powerUps.MAXIMUM_POWER_UP_BONUS_DAMAGE, 36);
  assert.equal(powerUps.MAXIMUM_POWER_UP_HEALING_PERMILLE, 200);
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
  assert.equal(
    powerUps.POWER_UP_CATALOG['v1-combo-spark'].maximumHitPointHealingPermille,
    10
  );
  assert.equal(
    powerUps.POWER_UP_CATALOG['v1-center-fold'].maximumHitPointHealingPermille,
    10
  );
  Object.values(powerUps.POWER_UP_CATALOG).forEach((entry) => {
    assert.equal('healingAmount' in entry, false);
    if (entry.maximumHitPointHealingPermille === undefined) return;
    assert.ok(entry.maximumHitPointHealingPermille >= 5);
    assert.ok(entry.maximumHitPointHealingPermille <= 30);
    assert.match(entry.effect, /% max health/);
  });
  assert.equal(
    powerUps.POWER_UP_CATALOG['v1-last-scribble'].survivingHitPoints,
    1
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
    powerUps.scorePowerUpFit('v1-combo-spark', 'mage', ['rush']) >
      powerUps.scorePowerUpFit('v1-combo-spark', 'mage', ['guard'])
  );
  powerUps.POWER_UP_IDS.forEach((id) => {
    assert.ok(powerUps.POWER_UP_CATALOG[id].buildPath);
  });
  assert.equal(
    powerUps.powerUpIsOfferableForRole('v1-counter-sketch', 'brawler'),
    false
  );
  const excludedRoleOffers = {
    brawler: [
      'v1-edge-spring',
      'v1-center-fold',
      'v1-backup-plan',
      'v1-counter-sketch',
    ],
    longshot: [
      'v1-edge-spring',
      'v1-paper-shield',
      'v1-wallop',
      'v1-second-draft',
      'v1-paper-twin',
    ],
    mage: ['v1-smudge-step', 'v1-wallop'],
  };
  for (const [combatRole, excludedIds] of Object.entries(excludedRoleOffers)) {
    for (const powerUpId of excludedIds) {
      assert.equal(
        powerUps.powerUpIsOfferableForRole(powerUpId, combatRole),
        false,
        `${powerUpId} should not be offered to ${combatRole}`
      );
    }
  }
  assert.equal(
    powerUps.powerUpIsOfferableForRole('v1-combo-spark', 'longshot'),
    true
  );
  assert.equal(
    powerUps.powerUpIsOfferableForRole('v1-combo-spark', 'mage'),
    true
  );
  assert.equal(
    powerUps.powerUpIsOfferableForRole('v1-paper-shield', 'longshot', 3),
    true
  );
  assert.equal(
    powerUps.powerUpIsOfferableForRole('v1-backup-plan', 'brawler', 3),
    true
  );
  assert.ok(
    powerUps.scorePowerUpFit('v1-combo-spark', 'mage', [], ['v1-backup-plan']) >
      powerUps.scorePowerUpFit('v1-combo-spark', 'mage')
  );
  for (const combatRole of ['brawler', 'longshot', 'mage']) {
    assert.ok(
      powerUps.POWER_UP_IDS.filter((id) =>
        powerUps.powerUpIsOfferableForRole(id, combatRole)
      ).length >= 8,
      `${combatRole} should keep a broad offer pool`
    );
  }
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

test('offer rarity weights are explicit percentages for every reward source', () => {
  const expectedWeights = {
    birth: { common: 65, uncommon: 29, rare: 5, epic: 1, legendary: 0 },
    'exhibition-win': {
      common: 65,
      uncommon: 29,
      rare: 5,
      epic: 1,
      legendary: 0,
    },
    'rival-run-win': {
      common: 65,
      uncommon: 29,
      rare: 5,
      epic: 1,
      legendary: 0,
    },
    'rival-run-final-win': {
      common: 35,
      uncommon: 42,
      rare: 15,
      epic: 8,
      legendary: 0,
    },
    'rumble-day-win': {
      common: 35,
      uncommon: 42,
      rare: 15,
      epic: 8,
      legendary: 0,
    },
    'champion-win': {
      common: 5,
      uncommon: 20,
      rare: 40,
      epic: 30,
      legendary: 5,
    },
  };
  assert.deepEqual(powerUps.POWER_UP_OFFER_RARITY_WEIGHTS, expectedWeights);
  Object.values(expectedWeights).forEach((weights) => {
    assert.equal(
      Object.values(weights).reduce((sum, value) => sum + value),
      100
    );
  });
});

test('offer generation is deterministic, distinct, and randomizes card order', () => {
  const positionsByRarity = new Map(
    powerUps.POWER_UP_RARITIES.map((rarity) => [rarity, new Set()])
  );
  for (let seed = 0; seed < 512; seed += 1) {
    const source = 'exhibition-win';
    const input = { seed: `offer-${seed}`, source, ownedPowerUpIds: [] };
    const first = powerUps.createDeterministicPowerUpOffer(input);
    const second = powerUps.createDeterministicPowerUpOffer(input);
    assert.deepEqual(first, second);
    assert.equal(new Set(first).size, 3);
    raritiesFor(first).forEach((rarity, index) =>
      positionsByRarity.get(rarity).add(index)
    );
  }
  assert.deepEqual([...positionsByRarity.get('common')].sort(), [0, 1, 2]);
  assert.deepEqual([...positionsByRarity.get('uncommon')].sort(), [0, 1, 2]);
  assert.deepEqual([...positionsByRarity.get('rare')].sort(), [0, 1, 2]);
});

test('basic offer rarity distribution follows the published weights', () => {
  const counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  const offerCount = 10_000;
  for (let seed = 0; seed < offerCount; seed += 1) {
    const offer = powerUps.createDeterministicPowerUpOffer({
      seed: `distribution-${seed}`,
      source: 'birth',
      ownedPowerUpIds: [],
    });
    raritiesFor(offer).forEach((rarity) => {
      counts[rarity] += 1;
    });
  }
  const totalCards = offerCount * 3;
  assert.ok(counts.common / totalCards > 0.63);
  assert.ok(counts.common / totalCards < 0.67);
  assert.ok(counts.uncommon / totalCards > 0.27);
  assert.ok(counts.uncommon / totalCards < 0.31);
  assert.ok(counts.rare / totalCards > 0.04);
  assert.ok(counts.rare / totalCards < 0.06);
  assert.ok(counts.epic / totalCards > 0.005);
  assert.ok(counts.epic / totalCards < 0.015);
  assert.equal(counts.legendary, 0);
});

test('role-aware offers prefer fitting cards without collapsing offer variety', () => {
  const cases = [
    ['brawler', ['guard', 'ready']],
    ['longshot', ['aim']],
    ['mage', ['fortune']],
  ];
  for (const [combatRole, gearFamilies] of cases) {
    const seen = new Set();
    let positiveFitCount = 0;
    let offeredCount = 0;
    for (let seedIndex = 0; seedIndex < 120; seedIndex += 1) {
      const input = {
        seed: `fit-${combatRole}-${seedIndex}`,
        source: 'exhibition-win',
        ownedPowerUpIds: [],
        combatRole,
        gearFamilies,
      };
      const first = powerUps.createDeterministicPowerUpOffer(input);
      assert.deepEqual(powerUps.createDeterministicPowerUpOffer(input), first);
      for (const id of first) {
        seen.add(id);
        offeredCount += 1;
        if (powerUps.scorePowerUpFit(id, combatRole, gearFamilies) > 0) {
          positiveFitCount += 1;
        }
      }
    }
    assert.ok(seen.size >= 4);
    assert.ok(positiveFitCount / offeredCount > 0.5);
  }
});

test('role-aware offers exclude skills that cannot trigger for that role', () => {
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
  assert.equal(new Set(championOffer).size, 3);
  assert.ok(
    championOffer.every(
      (id) => powerUps.POWER_UP_CATALOG[id].rarity !== 'legendary'
    )
  );

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
