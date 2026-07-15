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

const divideRounded = (value, divisor) =>
  Math.floor((value + Math.floor(divisor / 2)) / divisor);

const canonicalOutcomeQuantum = (modifiers) => {
  const baseHitPoints = 235;
  const baseSignatureCooldownTicks = 72;
  const baseCriticalChancePermille = 30;
  const criticalChancePermille = Math.min(
    180,
    baseCriticalChancePermille + modifiers.criticalChanceBonusPermille
  );
  return {
    damagePermille: modifiers.damagePermille,
    maximumHitPoints: divideRounded(
      baseHitPoints * modifiers.maximumHitPointsPermille,
      1_000
    ),
    signatureCooldownTicks: divideRounded(
      baseSignatureCooldownTicks * modifiers.cooldownPermille,
      1_000
    ),
    criticalInterval: Math.ceil(1_000 / criticalChancePermille),
    telegraphTicksDelta: modifiers.telegraphTicksDelta,
    initialDelayTicksDelta: modifiers.initialDelayTicksDelta,
  };
};

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
  assert.equal(report.simulation.version, 7);
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
  assert.equal(rumble.simulation.version, 7);
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
  assert.doesNotMatch(rush.summary, /HEARTS/);
  assert.doesNotMatch(rush.summary, /COOLDOWN/);
  assert.match(aim.summary, /IMPACT/);
  assert.doesNotMatch(aim.summary, /HEARTS/);
  assert.doesNotMatch(aim.summary, /COOLDOWN/);
  assert.match(focus.summary, /FOCUS/);
  assert.match(focus.summary, /RECOVERY/);
  assert.doesNotMatch(focus.summary, /OPENING/);
});

test('health Gear cannot delay the Ink Pressure comeback trigger', () => {
  const plainTarget = makeFighter(
    'ink-pressure-target',
    builds.inkquake,
    equipment.createEmptyEquipmentLoadout()
  );
  const gearedTarget = fighterWithGear(
    'ink-pressure-target',
    builds.inkquake,
    'inkquake-crater-crown',
    6
  );
  const opponent = makeFighter(
    'ink-pressure-opponent',
    builds.nib_halo,
    equipment.createEmptyEquipmentLoadout()
  );
  let comparedTriggers = 0;

  for (let seed = 0; seed < 32; seed += 1) {
    const plainReport = battle.simulate(
      plainTarget,
      opponent,
      seed,
      balancedForecast,
      'exhibition'
    );
    const gearedReport = battle.simulate(
      gearedTarget,
      opponent,
      seed,
      balancedForecast,
      'exhibition'
    );
    const plainTrigger = plainReport.simulation.timeline.find(
      (event) => event.kind === 'ink_pressure' && event.actor === 'a'
    );
    const gearedTrigger = gearedReport.simulation.timeline.find(
      (event) => event.kind === 'ink_pressure' && event.actor === 'a'
    );
    if (!plainTrigger || !gearedTrigger) continue;
    assert.ok(
      gearedTrigger.tick <= plainTrigger.tick,
      `health Gear delayed Ink Pressure at seed ${seed}`
    );
    comparedTriggers += 1;
  }

  assert.ok(comparedTriggers > 0, 'expected comparable Ink Pressure triggers');
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
  assert.equal(rushSummary.impact.value, '+2.4%');
  assert.equal(rushSummary.hearts.value, '0.0%');
  assert.equal(rushSummary.cooldown.value, 'NORMAL');
  assert.equal(rushSummary.start.value, 'NORMAL');
  assert.equal(rushSummary.cooldown.tone, 'neutral');
  assert.equal(rushSummary.start.tone, 'neutral');
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
  assert.equal(resolved.techniques[0].supportEffectFamily, 'aim');
  assert.match(resolved.techniques[0].effect.summary, /TRUE AIM SUPPORT/);
  assert.equal(resolved.snapshot.techniques.length, 1);
  assert.ok(resolved.modifiers.damagePermille >= 970);
  assert.ok(resolved.modifiers.initialDelayTicksDelta >= -2);
});

test('mixed-family support contributes its own bounded technique identity', () => {
  const sameFamilyLoadout = {
    ...equipment.createEmptyEquipmentLoadout(),
    weapon: ['tiny-sword', 'wooden-spoon'],
  };
  const mixedFamilyLoadout = {
    ...equipment.createEmptyEquipmentLoadout(),
    weapon: ['tiny-sword', 'inkquake-rumble-belt'],
  };
  const sameFamily = gearCombat.resolveGearCombatLoadout(
    makeFighter('same-family-support', builds.nib_halo, sameFamilyLoadout, {
      'tiny-sword': 6,
      'wooden-spoon': 3,
    })
  );
  const mixedFamily = gearCombat.resolveGearCombatLoadout(
    makeFighter('mixed-family-support', builds.nib_halo, mixedFamilyLoadout, {
      'tiny-sword': 6,
      'inkquake-rumble-belt': 3,
    })
  );

  assert.equal(sameFamily.techniques[0].supportEffectFamily, 'aim');
  assert.equal(mixedFamily.techniques[0].supportEffectFamily, 'ready');
  assert.notDeepEqual(sameFamily.modifiers, mixedFamily.modifiers);
  assert.match(mixedFamily.techniques[0].effect.summary, /QUICK DRAW SUPPORT/);
  assertBoundedModifiers(sameFamily.modifiers);
  assertBoundedModifiers(mixedFamily.modifiers);
});

test('all Gear families progress through six distinct monotonic combat quanta', () => {
  const familyCases = [
    {
      family: 'guard',
      gearId: 'beanie',
      increasing: ['maximumHitPointsPermille'],
      decreasing: [],
    },
    {
      family: 'rush',
      gearId: 'smearstep-speed-scarf',
      increasing: ['damagePermille'],
      decreasing: [],
    },
    {
      family: 'focus',
      gearId: 'monocle',
      increasing: ['criticalChanceBonusPermille'],
      decreasing: ['cooldownPermille'],
    },
    {
      family: 'ready',
      gearId: 'bowtie',
      increasing: ['criticalChanceBonusPermille'],
      decreasing: [],
    },
    {
      family: 'fortune',
      gearId: 'flower-crown',
      increasing: ['maximumHitPointsPermille', 'criticalChanceBonusPermille'],
      decreasing: [],
    },
    {
      family: 'aim',
      gearId: 'tiny-sword',
      increasing: ['damagePermille', 'criticalChanceBonusPermille'],
      decreasing: [],
    },
  ];

  for (const familyCase of familyCases) {
    const resolvedByRank = arena.GEAR_RANKS.map((rank) =>
      gearCombat.resolveGearCombatLoadout(
        fighterWithGear(
          `${familyCase.family}-rank-${rank}`,
          builds.nib_halo,
          familyCase.gearId,
          rank
        )
      )
    );
    const outcomeQuanta = resolvedByRank.map((resolved) =>
      canonicalOutcomeQuantum(resolved.modifiers)
    );

    assert.equal(
      new Set(outcomeQuanta.map((outcome) => JSON.stringify(outcome))).size,
      arena.GEAR_RANKS.length,
      `${familyCase.family} needs a distinct canonical combat outcome at every rank`
    );

    for (let index = 1; index < resolvedByRank.length; index += 1) {
      const previous = resolvedByRank[index - 1].modifiers;
      const current = resolvedByRank[index].modifiers;
      assert.notDeepEqual(
        current,
        previous,
        `${familyCase.family} rank ${index + 1} must change its modifiers`
      );
      for (const key of familyCase.increasing) {
        assert.ok(
          current[key] > previous[key],
          `${familyCase.family} ${key} must increase at rank ${index + 1}`
        );
      }
      for (const key of familyCase.decreasing) {
        assert.ok(
          current[key] < previous[key],
          `${familyCase.family} ${key} must decrease at rank ${index + 1}`
        );
      }
      assert.equal(
        current.telegraphTicksDelta,
        0,
        `${familyCase.family} must not introduce a rank timing cliff`
      );
      assertBoundedModifiers(current);
    }
  }
});

test('rank-six Ready and Fortune supports add a real same-family benefit', () => {
  const resolveAccessoryPair = (id, leadGearId, supportGearId) => {
    const loadout = {
      ...equipment.createEmptyEquipmentLoadout(),
      accessory: [leadGearId, supportGearId],
    };
    return gearCombat.resolveGearCombatLoadout(
      makeFighter(id, builds.nib_halo, loadout, {
        [leadGearId]: 6,
        [supportGearId]: 6,
      })
    );
  };

  const readyLead = gearCombat.resolveGearCombatLoadout(
    fighterWithGear('ready-lead', builds.nib_halo, 'bowtie', 6)
  );
  const readySupported = resolveAccessoryPair(
    'ready-supported',
    'bowtie',
    'party-hat'
  );
  assert.ok(
    readySupported.modifiers.criticalChanceBonusPermille >
      readyLead.modifiers.criticalChanceBonusPermille
  );

  const fortuneLead = gearCombat.resolveGearCombatLoadout(
    fighterWithGear('fortune-lead', builds.nib_halo, 'flower-crown', 6)
  );
  const fortuneSupported = resolveAccessoryPair(
    'fortune-supported',
    'flower-crown',
    'button-badge'
  );
  assert.ok(
    fortuneSupported.modifiers.criticalChanceBonusPermille >
      fortuneLead.modifiers.criticalChanceBonusPermille
  );
  assert.ok(
    fortuneSupported.modifiers.maximumHitPointsPermille >
      fortuneLead.modifiers.maximumHitPointsPermille
  );
  assertBoundedModifiers(readySupported.modifiers);
  assertBoundedModifiers(fortuneSupported.modifiers);
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
        assert.deepEqual(
          repeated.simulation.events,
          repeatedAgain.simulation.events
        );
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
