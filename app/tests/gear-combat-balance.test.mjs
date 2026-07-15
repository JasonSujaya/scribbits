import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error(
    'Run Gear balance tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const combat = require(join(compiledSharedRoot, 'combat', 'index.js'));
const combatSelection = require(
  join(compiledSharedRoot, 'combat', 'selection.js')
);
const combatTranscript = require(
  join(compiledSharedRoot, 'combat', 'transcriptvalidation.js')
);
const cosmetics = require(join(compiledSharedRoot, 'cosmetics.js'));
const equipment = require(join(compiledSharedRoot, 'equipment.js'));
const gearCombat = require(join(compiledSharedRoot, 'gearcombat.js'));
const battle = require(join(compiledServerRoot, 'core', 'battle.js'));
const battleStore = require(join(compiledServerRoot, 'core', 'battleStore.js'));
const forecast = require(join(compiledServerRoot, 'core', 'forecast.js'));

const builds = {
  inkquake: { chonk: 55, spike: 15, zip: 15, charm: 15 },
  nib_halo: { chonk: 15, spike: 55, zip: 15, charm: 15 },
  smearstep: { chonk: 15, spike: 15, zip: 55, charm: 15 },
  colorburst: { chonk: 15, spike: 15, zip: 15, charm: 55 },
};

const makeFighter = (id, stats, loadout, gearRanks = {}) => ({
  id,
  name: id,
  artist: 'gear-balance',
  element: 'tide',
  stats,
  imageUrl: `/api/drawing/${id}`,
  bornDay: 8,
  expiresDay: 11,
  belief: 0,
  wins: 0,
  losses: 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  gearRanks,
  equipmentLoadout: loadout,
  upgrades: [],
  level: 1,
  xp: 0,
  mood: 'happy',
  careDoneToday: [],
  legacy: null,
});

const fighterWithGear = (id, stats, gearId, rank) => {
  const gear = cosmetics.findGearCosmetic(gearId);
  assert.ok(gear, `Missing Gear ${gearId}`);
  return makeFighter(
    id,
    stats,
    equipment.equipGearInLoadout(equipment.createEmptyEquipmentLoadout(), {
      category: gear.category,
      slotIndex: 0,
      gearId,
    }),
    { [gearId]: rank }
  );
};

const balancedForecast = forecast.generateForecastForDay(9);

test('Gear resolution keeps the 100-point drawing identity in current transcripts', () => {
  const stats = builds.nib_halo;
  const geared = fighterWithGear('gear-v3', stats, 'tiny-sword', 6);
  const plain = makeFighter(
    'plain-v3',
    stats,
    equipment.createEmptyEquipmentLoadout()
  );
  const report = battle.simulate(
    geared,
    plain,
    41,
    balancedForecast,
    'exhibition'
  );

  assert.equal(
    Object.values(geared.stats).reduce((sum, value) => sum + value),
    100
  );
  assert.equal(combatSelection.selectPrimaryPower(geared.stats), 'nib_halo');
  assert.equal(report.simulation.version, 6);
  assert.equal(
    report.simulation.fighters[0].gear.techniques[0].leadGearId,
    'tiny-sword'
  );
  assert.ok(combatTranscript.parseBattleTranscript(report.simulation));
  assert.equal(battleStore.isBattleReport(report), true);
  assert.equal(
    battleStore.isBattleReport({ ...report, kind: 'rumble' }),
    false
  );
  assert.equal(battleStore.isBattleReport({ ...report, kind: 'boss' }), false);

  const rumble = battle.simulate(geared, plain, 41, balancedForecast, 'rumble');
  assert.equal(rumble.simulation.version, 6);
  assert.equal(rumble.simulation.fighters[0].gear, undefined);
  assert.equal(battleStore.isBattleReport(rumble), true);
});

test('Gear summaries expose every applied benefit and tradeoff', () => {
  const rush = gearCombat.getGearTechniqueEffect(
    cosmetics.findGearCosmetic('smearstep-speed-scarf'),
    6
  );
  const aim = gearCombat.getGearTechniqueEffect(
    cosmetics.findGearCosmetic('tiny-sword'),
    6
  );
  const focus = gearCombat.getGearTechniqueEffect(
    cosmetics.findGearCosmetic('monocle'),
    1
  );

  assert.match(rush.summary, /DASH IMPACT/);
  assert.match(rush.summary, /HEARTS/);
  assert.match(rush.summary, /COOLDOWN/);
  assert.match(aim.summary, /IMPACT/);
  assert.match(aim.summary, /HEARTS/);
  assert.match(aim.summary, /COOLDOWN/);
  assert.match(focus.summary, /FOCUS/);
  assert.match(focus.summary, /RECOVERY/);
  assert.doesNotMatch(focus.summary, /OPENING/);
});

test('loadout summary presents all six authoritative combat modifiers', () => {
  const emptySummary = gearCombat.summarizeGearCombatModifiers(
    gearCombat.EMPTY_GEAR_COMBAT_MODIFIERS
  );
  assert.deepEqual(
    emptySummary.map(({ key, value, tone }) => ({ key, value, tone })),
    [
      { key: 'impact', value: '0.0%', tone: 'neutral' },
      { key: 'hearts', value: '0.0%', tone: 'neutral' },
      { key: 'crit', value: '0.0%', tone: 'neutral' },
      { key: 'cooldown', value: 'NORMAL', tone: 'neutral' },
      { key: 'windup', value: 'NORMAL', tone: 'neutral' },
      { key: 'start', value: 'NORMAL', tone: 'neutral' },
    ]
  );

  const rush = gearCombat.getGearTechniqueEffect(
    cosmetics.findGearCosmetic('smearstep-speed-scarf'),
    6
  );
  const rushSummary = Object.fromEntries(
    gearCombat
      .summarizeGearCombatModifiers(rush.modifiers)
      .map((item) => [item.key, item])
  );
  assert.equal(rushSummary.impact.value, '+2.0%');
  assert.equal(rushSummary.hearts.value, '-2.0%');
  assert.equal(rushSummary.cooldown.value, '2.0% SLOWER');
  assert.equal(rushSummary.start.value, '1T FASTER');
  assert.equal(rushSummary.cooldown.tone, 'tradeoff');
  assert.equal(rushSummary.start.tone, 'benefit');
});

test('one strongest lead and one support resolve into a bounded category technique', () => {
  const loadout = {
    ...equipment.createEmptyEquipmentLoadout(),
    weapon: ['tiny-sword', 'inkquake-rumble-belt'],
  };
  const fighter = makeFighter('lead-support', builds.inkquake, loadout, {
    'tiny-sword': 3,
    'inkquake-rumble-belt': 6,
  });
  const resolved = gearCombat.resolveGearCombatLoadout(fighter);

  assert.equal(resolved.techniques.length, 1);
  assert.equal(resolved.techniques[0].leadGearId, 'inkquake-rumble-belt');
  assert.equal(resolved.techniques[0].supportGearId, 'tiny-sword');
  assert.equal(resolved.techniques[0].effectFamily, 'ready');
  assert.equal(resolved.snapshot.techniques.length, 1);
  assert.ok(resolved.modifiers.damagePermille >= 970);
  assert.ok(resolved.modifiers.initialDelayTicksDelta >= -2);
});

const assertBoundedModifiers = (modifiers) => {
  assert.ok(modifiers.damagePermille >= 970);
  assert.ok(modifiers.damagePermille <= 1_030);
  assert.ok(modifiers.maximumHitPointsPermille >= 970);
  assert.ok(modifiers.maximumHitPointsPermille <= 1_030);
  assert.ok(modifiers.cooldownPermille >= 970);
  assert.ok(modifiers.cooldownPermille <= 1_030);
  assert.ok(modifiers.criticalChanceBonusPermille >= 0);
  assert.ok(modifiers.criticalChanceBonusPermille <= 30);
  assert.ok(modifiers.telegraphTicksDelta >= -1);
  assert.ok(modifiers.telegraphTicksDelta <= 1);
  assert.ok(modifiers.initialDelayTicksDelta >= -1);
  assert.ok(modifiers.initialDelayTicksDelta <= 1);
};

test('all six Gear families stay bounded and combat stays deterministic per seed', () => {
  const representativeGearIds = [
    'beanie',
    'smearstep-speed-scarf',
    'monocle',
    'bowtie',
    'flower-crown',
    'tiny-sword',
  ];
  let checkedLoadouts = 0;

  for (const gearId of representativeGearIds) {
    for (const rank of arena.GEAR_RANKS) {
      for (const [power, stats] of Object.entries(builds)) {
        const geared = fighterWithGear(
          `${gearId}-${rank}-${power}-gear`,
          stats,
          gearId,
          rank
        );
        const plain = makeFighter(
          `${gearId}-${rank}-${power}-plain`,
          stats,
          equipment.createEmptyEquipmentLoadout()
        );
        const resolved = gearCombat.resolveGearCombatLoadout(geared);
        assertBoundedModifiers(resolved.modifiers);

        const first = battle.simulate(
          geared,
          plain,
          1,
          balancedForecast,
          'exhibition'
        );
        const repeated = battle.simulate(
          geared,
          plain,
          600,
          balancedForecast,
          'exhibition'
        );
        const repeatedAgain = battle.simulate(
          geared,
          plain,
          600,
          balancedForecast,
          'exhibition'
        );
        assert.equal(repeated.winner, repeatedAgain.winner);
        assert.equal(
          repeated.simulation.durationMs,
          repeatedAgain.simulation.durationMs
        );
        assert.deepEqual(repeated.simulation.events, repeatedAgain.simulation.events);
        assert.ok(combatTranscript.parseBattleTranscript(first.simulation));
        assert.ok(combatTranscript.parseBattleTranscript(repeated.simulation));
        checkedLoadouts += 1;
      }
    }
  }

  assert.equal(checkedLoadouts, 144);
});

test('full Red Star builds cover all families and remain bounded against one-star', () => {
  const familyCoveringBuilds = [
    ['tiny-sword', 'beanie', 'smearstep-speed-scarf', 'flower-crown'],
    ['inkquake-rumble-belt', 'beanie', 'smearstep-speed-scarf', 'monocle'],
  ];
  const makeFullBuild = (id, rank, gearIds) => {
    let loadout = equipment.createEmptyEquipmentLoadout();
    const gearRanks = {};
    for (const gearId of gearIds) {
      const gear = cosmetics.findGearCosmetic(gearId);
      loadout = equipment.equipGearInLoadout(loadout, {
        category: gear.category,
        slotIndex: 0,
        gearId,
      });
      gearRanks[gearId] = rank;
    }
    return makeFighter(id, builds.colorburst, loadout, gearRanks);
  };

  const coveredFamilies = new Set();
  for (const gearIds of familyCoveringBuilds) {
    for (const gearId of gearIds) {
      coveredFamilies.add(cosmetics.findGearCosmetic(gearId).effectFamily);
    }
  }
  assert.deepEqual([...coveredFamilies].sort(), [
    'aim',
    'focus',
    'fortune',
    'guard',
    'ready',
    'rush',
  ]);

  for (const [buildIndex, gearIds] of familyCoveringBuilds.entries()) {
    const red = makeFullBuild(`full-red-${buildIndex}`, 6, gearIds);
    const oneStar = makeFullBuild(`full-one-star-${buildIndex}`, 1, gearIds);
    const redResolved = gearCombat.resolveGearCombatLoadout(red);
    const oneStarResolved = gearCombat.resolveGearCombatLoadout(oneStar);

    assert.equal(redResolved.techniques.length, 4);
    assert.equal(oneStarResolved.techniques.length, 4);
    assertBoundedModifiers(redResolved.modifiers);
    assertBoundedModifiers(oneStarResolved.modifiers);
    assert.notDeepEqual(redResolved.modifiers, oneStarResolved.modifiers);

    const modifierDistance = (modifiers) =>
      Math.abs(modifiers.damagePermille - 1_000) +
      Math.abs(modifiers.maximumHitPointsPermille - 1_000) +
      Math.abs(modifiers.cooldownPermille - 1_000) +
      modifiers.criticalChanceBonusPermille;
    assert.ok(
      modifierDistance(redResolved.modifiers) >=
        modifierDistance(oneStarResolved.modifiers)
    );
  }
});

test('Gear identity changes report ids and malformed snapshots fail closed', () => {
  const stats = builds.inkquake;
  const rankOne = fighterWithGear('identity-gear', stats, 'beanie', 1);
  const red = fighterWithGear('identity-gear', stats, 'beanie', 6);
  const plain = makeFighter(
    'identity-plain',
    stats,
    equipment.createEmptyEquipmentLoadout()
  );
  const first = battle.simulate(
    rankOne,
    plain,
    9,
    balancedForecast,
    'exhibition'
  );
  const second = battle.simulate(red, plain, 9, balancedForecast, 'exhibition');
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.simulation.seed, second.simulation.seed);

  const invalidGear = {
    ...first.simulation.fighters[0].gear,
    modifiers: {
      ...first.simulation.fighters[0].gear.modifiers,
      damagePermille: 1_200,
    },
  };
  assert.throws(
    () =>
      combat.simulateCombat({
        seed: 'invalid-gear',
        fighters: [
          {
            id: 'invalid-a',
            name: 'Invalid A',
            element: 'tide',
            stats,
            upgrades: [],
            gear: invalidGear,
          },
          {
            id: 'invalid-b',
            name: 'Invalid B',
            element: 'tide',
            stats,
            upgrades: [],
          },
        ],
      }),
    /Gear snapshot/
  );
});
