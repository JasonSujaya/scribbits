import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_PHASE_ORDER,
  COMBAT_TICK_RATE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_COMBAT_ENTITIES,
  MAXIMUM_TIMELINE_EVENTS,
  circleCenterIsInsideCone,
  deterministicRoll,
  getCombatRoleAdvantage,
  getOrbitingNibPosition,
  integerSquareRoot,
  isFixedVector,
  selectCombatRole,
  selectPrimaryPower,
  simulateCombat,
} from './index';
import {
  COMBAT_UPGRADE_CATALOG,
  COMBAT_UPGRADE_IDS,
  formatCombatUpgradeEffectLines,
  getCombatUpgradeModifiers,
  MAXIMUM_COMBAT_UPGRADES,
} from './upgrades';
import type { CombatUpgradeId } from './upgrades';
import { parseBattleTranscript } from './transcriptvalidation';
import type {
  BattleTranscript,
  BattleTimelineEvent,
  CombatElement,
  CombatFighterInput,
  CombatSimulationInput,
  DominantStat,
  RawCombatStats,
} from './types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Combat engine test failed: ${message}`);
  }
}

function assertEqual<Value>(
  actual: Value,
  expected: Value,
  message: string
): void {
  assert(Object.is(actual, expected), `${message}; got ${String(actual)}`);
}

function makeStats(dominantStat: DominantStat): RawCombatStats {
  return Object.freeze({
    chonk: dominantStat === 'chonk' ? 55 : 15,
    spike: dominantStat === 'spike' ? 55 : 15,
    zip: dominantStat === 'zip' ? 55 : 15,
    charm: dominantStat === 'charm' ? 55 : 15,
  });
}

function makeFighter(
  id: string,
  dominantStat: DominantStat,
  element: CombatElement
): CombatFighterInput {
  return Object.freeze({
    id,
    name: id,
    element,
    stats: makeStats(dominantStat),
  });
}

function assertTranscriptInvariants(transcript: BattleTranscript): void {
  assertEqual(
    transcript.tickRate,
    COMBAT_TICK_RATE,
    'engine must run at 20 Hz'
  );
  assert(
    transcript.result.completedTick <= COMBAT_MAXIMUM_TICKS,
    'battle must finish by tick 400'
  );
  assert(
    transcript.result.completedTick >= 13 * COMBAT_TICK_RATE,
    'fresh ink must keep the rendered fight inside its minimum pacing band'
  );
  assert(
    transcript.timeline.length <= MAXIMUM_TIMELINE_EVENTS,
    'timeline must obey its hard cap'
  );
  assert(
    !transcript.eventsTruncated,
    'normal fights must retain every sparse event'
  );
  assert(
    transcript.checkpoints.length <= MAXIMUM_CHECKPOINTS,
    'checkpoints must obey their hard cap'
  );
  assert(
    transcript.timeline[0]?.kind === 'battle_started',
    'timeline must begin with battle_started'
  );
  assert(
    transcript.timeline.at(-1)?.kind === 'battle_ended',
    'timeline must reserve room for battle_ended'
  );
  assertEqual(
    transcript.checkpoints[0]?.tick,
    0,
    'checkpoint path must start at tick zero'
  );
  assertEqual(
    transcript.checkpoints.at(-1)?.tick,
    transcript.result.completedTick,
    'checkpoint path must include the authoritative final tick'
  );

  for (let index = 1; index < transcript.timeline.length; index += 1) {
    const previous = transcript.timeline[index - 1];
    const current = transcript.timeline[index];
    assert(
      previous !== undefined &&
        current !== undefined &&
        previous.tick <= current.tick,
      'timeline ticks must be monotonic'
    );
  }
  for (let index = 1; index < transcript.checkpoints.length; index += 1) {
    const previous = transcript.checkpoints[index - 1];
    const current = transcript.checkpoints[index];
    assert(
      previous !== undefined &&
        current !== undefined &&
        current.tick - previous.tick <= 10,
      'motion checkpoints must never be more than 0.5 seconds apart'
    );
  }
  for (const checkpoint of transcript.checkpoints) {
    const echoCount = checkpoint.fighters.reduce(
      (count, fighter) => count + (fighter.echoPosition === null ? 0 : 1),
      0
    );
    assert(
      2 + echoCount <= MAXIMUM_COMBAT_ENTITIES,
      'two fighters plus echoes must obey the entity cap'
    );
    for (const fighter of checkpoint.fighters) {
      assert(
        isFixedVector(fighter.position),
        'positions must stay integer fixed-point'
      );
      assert(
        isFixedVector(fighter.velocity),
        'velocities must stay integer fixed-point'
      );
      assert(
        fighter.hitPoints >= 0 && fighter.hitPoints <= fighter.maxHitPoints,
        'checkpoint hit points must stay bounded'
      );
    }
  }

  for (const slot of ['a', 'b'] as const) {
    const pressureEvents = transcript.timeline.filter(
      (event) => event.kind === 'ink_pressure' && event.actor === slot
    );
    assert(
      pressureEvents.length <= 1,
      'Ink Pressure must refresh at most once per fighter'
    );
  }
  const emberDamageBySource = transcript.timeline.reduce(
    (totals, event) => {
      if (event.kind === 'damage' && event.source === 'ember_burn') {
        totals[event.sourceFighter] += event.amount;
      }
      return totals;
    },
    { a: 0, b: 0 }
  );
  assert(
    emberDamageBySource.a <= 10 && emberDamageBySource.b <= 10,
    'Ember damage must obey its per-fight cap'
  );
}

function testDomainSeparatedRandomness(): void {
  const firstDamageRoll = deterministicRoll(
    'domain-test',
    'damage-variance',
    'a',
    10
  );
  deterministicRoll('domain-test', 'new-unrelated-feature', 'anything');
  const secondDamageRoll = deterministicRoll(
    'domain-test',
    'damage-variance',
    'a',
    10
  );
  assertEqual(
    secondDamageRoll,
    firstDamageRoll,
    'an unrelated roll must not shift an existing roll'
  );
  assert(
    deterministicRoll('domain-test', 'critical-hit', 'a', 10) !==
      firstDamageRoll,
    'different random domains should produce different rolls'
  );
}

function testAbilitySelectionAndGeometry(): void {
  assertEqual(
    selectPrimaryPower(makeStats('chonk')),
    'inkquake',
    'chonk power'
  );
  assertEqual(
    selectPrimaryPower(makeStats('spike')),
    'nib_halo',
    'spike power'
  );
  assertEqual(selectPrimaryPower(makeStats('zip')), 'smearstep', 'zip power');
  assertEqual(
    selectPrimaryPower(makeStats('charm')),
    'colorburst',
    'charm power'
  );
  assertEqual(
    selectPrimaryPower({ chonk: 25, spike: 25, zip: 25, charm: 25 }),
    'inkquake',
    'raw-stat ties must use the documented stable order'
  );
  assertEqual(integerSquareRoot(15), 3, 'integer square root floors');
  assertEqual(integerSquareRoot(16), 4, 'integer square root exact value');
  assert(
    circleCenterIsInsideCone(
      { x: 0, y: 0 },
      { x: 1_024, y: 0 },
      5_000,
      819,
      { x: 3_000, y: 500 },
      300
    ),
    'forward target should be inside Colorburst cone'
  );
  assert(
    !circleCenterIsInsideCone(
      { x: 0, y: 0 },
      { x: 1_024, y: 0 },
      5_000,
      819,
      { x: -3_000, y: 0 },
      300
    ),
    'rear target should be outside Colorburst cone'
  );
  const nibPositions = [0, 1, 2].map((nibIndex) => {
    return getOrbitingNibPosition({ x: 100, y: -100 }, 0, nibIndex);
  });
  assert(
    new Set(nibPositions.map((position) => `${position.x}:${position.y}`))
      .size === 3,
    'Nib Halo must create three distinct procedural nib positions'
  );
  assert(
    nibPositions.every(isFixedVector),
    'procedural nib positions must stay fixed-point integers'
  );
}

function testDeterministicTranscript(): BattleTranscript {
  const input: CombatSimulationInput = {
    seed: 'repeatable-fight',
    fighters: [
      makeFighter('Paper Tank', 'chonk', 'moss'),
      makeFighter('Quick Ember', 'zip', 'ember'),
    ],
  };
  const first = simulateCombat(input);
  const second = simulateCombat(input);
  assertEqual(
    JSON.stringify(second),
    JSON.stringify(first),
    'same inputs must produce byte-equivalent JSON'
  );
  assert(
    simulateCombat({ ...input, seed: 'different-seed' }).battleId !==
      first.battleId,
    'seed must affect the stable battle identity'
  );
  assertTranscriptInvariants(first);
  return first;
}

function testEveryPrimaryPowerActivates(): void {
  const cases: readonly DominantStat[] = ['chonk', 'spike', 'zip', 'charm'];
  for (const dominantStat of cases) {
    const transcript = simulateCombat({
      seed: `activate-${dominantStat}`,
      fighters: [
        makeFighter(`actor-${dominantStat}`, dominantStat, 'storm'),
        makeFighter(`target-${dominantStat}`, 'chonk', 'moss'),
      ],
    });
    const expectedPower = selectPrimaryPower(makeStats(dominantStat));
    assert(
      transcript.timeline.some(
        (event) =>
          event.kind === 'ability_activated' &&
          event.actor === 'a' &&
          event.power === expectedPower
      ),
      `${expectedPower} must activate during a normal fight`
    );
    assertTranscriptInvariants(transcript);
  }
}

function testEveryCombatRoleUsesItsBasicAttack(): void {
  const cases = Object.freeze([
    Object.freeze({
      stat: 'chonk',
      role: 'brawler',
      attack: 'body_slam',
      damageSource: 'brawler_slam',
    }),
    Object.freeze({
      stat: 'spike',
      role: 'longshot',
      attack: 'piercing_quill',
      damageSource: 'longshot_quill',
    }),
    Object.freeze({
      stat: 'zip',
      role: 'gunner',
      attack: 'ink_shot',
      damageSource: 'gunner_shot',
    }),
    Object.freeze({
      stat: 'charm',
      role: 'mage',
      attack: 'color_bolt',
      damageSource: 'mage_bolt',
    }),
  ] as const);

  for (const roleCase of cases) {
    assertEqual(
      selectCombatRole(makeStats(roleCase.stat)),
      roleCase.role,
      `${roleCase.stat} combat role`
    );
    const transcript = simulateCombat({
      seed: `role-attack-${roleCase.role}`,
      fighters: [
        makeFighter(`actor-${roleCase.role}`, roleCase.stat, 'tide'),
        makeFighter(`target-${roleCase.role}`, 'chonk', 'moss'),
      ],
    });
    const attackEvents = transcript.timeline.filter(
      (event): event is Extract<BattleTimelineEvent, { kind: 'role_attack' }> =>
        event.kind === 'role_attack' &&
        event.actor === 'a' &&
        event.role === roleCase.role
    );
    assert(
      attackEvents.some((event) => event.attack === roleCase.attack),
      `${roleCase.role} must emit its authoritative basic attack`
    );
    assert(
      transcript.timeline.some(
        (event) =>
          event.kind === 'damage' &&
          event.sourceFighter === 'a' &&
          event.source === roleCase.damageSource
      ),
      `${roleCase.role} must resolve basic-attack damage`
    );
    assertTranscriptInvariants(transcript);
  }

  const gunnerTranscript = simulateCombat({
    seed: 'role-attack-gunner-burst',
    fighters: [
      makeFighter('burst-gunner', 'zip', 'tide'),
      makeFighter('burst-target', 'chonk', 'tide'),
    ],
  });
  const firstBurst = gunnerTranscript.timeline.filter(
    (event): event is Extract<BattleTimelineEvent, { kind: 'role_attack' }> =>
      event.kind === 'role_attack' &&
      event.actor === 'a' &&
      event.attack === 'ink_shot' &&
      event.attackNumber === 1
  );
  assertEqual(
    firstBurst.length,
    3,
    'Gunner basic attack must fire three shots'
  );
  assertEqual(firstBurst[0]?.shotNumber, 1, 'Gunner burst first shot');
  assertEqual(firstBurst[1]?.shotNumber, 2, 'Gunner burst second shot');
  assertEqual(firstBurst[2]?.shotNumber, 3, 'Gunner burst third shot');
  assertEqual(
    (firstBurst[1]?.tick ?? 0) - (firstBurst[0]?.tick ?? 0),
    4,
    'Gunner burst shot interval'
  );
  assertEqual(
    (firstBurst[2]?.tick ?? 0) - (firstBurst[1]?.tick ?? 0),
    4,
    'Gunner burst shot interval remains stable'
  );
}

function testElementPayloadsAndStormTiming(): void {
  const normal = simulateCombat({
    seed: 'storm-timing',
    fighters: [
      makeFighter('timing-a', 'charm', 'tide'),
      makeFighter('timing-b', 'chonk', 'moss'),
    ],
  });
  const storm = simulateCombat({
    seed: 'storm-timing',
    fighters: [
      makeFighter('timing-a', 'charm', 'storm'),
      makeFighter('timing-b', 'chonk', 'moss'),
    ],
  });
  const normalActivation = normal.timeline.find(
    (event) => event.kind === 'ability_activated' && event.actor === 'a'
  );
  const stormActivation = storm.timeline.find(
    (event) => event.kind === 'ability_activated' && event.actor === 'a'
  );
  assert(
    normalActivation?.kind === 'ability_activated' &&
      stormActivation?.kind === 'ability_activated' &&
      stormActivation.tick === normalActivation.tick - 1,
    'Storm must reduce activation telegraph by one tick'
  );
  assert(
    normal.timeline.some(
      (event) => event.kind === 'barrier_created' && event.actor === 'b'
    ),
    'Moss must create its one breakable barrier'
  );

  let emberWasObserved = false;
  for (let seed = 0; seed < 20 && !emberWasObserved; seed += 1) {
    const transcript = simulateCombat({
      seed: `ember-${seed}`,
      fighters: [
        makeFighter('ember-dasher', 'zip', 'ember'),
        makeFighter('ember-target', 'chonk', 'tide'),
      ],
    });
    emberWasObserved = transcript.timeline.some(
      (event) => event.kind === 'burn_applied'
    );
    assertTranscriptInvariants(transcript);
  }
  assert(emberWasObserved, 'an Ember primary hit must apply capped burn');
}

function testVersionFourTranscriptValidation(): void {
  const transcript = simulateCombat({
    seed: 'v4-parser',
    fighters: [
      makeFighter('parser-brawler', 'chonk', 'tide'),
      makeFighter('parser-mage', 'charm', 'moss'),
    ],
  });
  assertEqual(transcript.version, 4, 'new simulations must use transcript v4');
  assert(
    parseBattleTranscript(transcript) === transcript,
    'v4 parser must accept a valid Gear-free transcript'
  );
  const firstCheckpoint = transcript.checkpoints[0];
  if (!firstCheckpoint) {
    throw new Error('v4 parser fixture needs its opening checkpoint.');
  }
  const mismatchedRole = {
    ...transcript,
    checkpoints: [
      {
        ...firstCheckpoint,
        fighters: [
          { ...firstCheckpoint.fighters[0], combatRole: 'mage' },
          firstCheckpoint.fighters[1],
        ],
      },
      ...transcript.checkpoints.slice(1),
    ],
  };
  assert(
    parseBattleTranscript(mismatchedRole) === undefined,
    'v4 parser must reject a role that disagrees with drawing stats'
  );
}

function testImmutablePhaseOrderAndValidation(): void {
  assertEqual(
    COMBAT_PHASE_ORDER.length,
    11,
    'phase order must remain complete'
  );
  assert(Object.isFrozen(COMBAT_PHASE_ORDER), 'phase order must be immutable');
  let rejectedDuplicateIds = false;
  try {
    simulateCombat({
      seed: 'invalid',
      fighters: [
        makeFighter('duplicate', 'chonk', 'moss'),
        makeFighter('duplicate', 'spike', 'storm'),
      ],
    });
  } catch {
    rejectedDuplicateIds = true;
  }
  assert(rejectedDuplicateIds, 'duplicate fighter ids must be rejected');
}

function testPrimaryPowerBalance(): void {
  const builds: readonly DominantStat[] = ['chonk', 'spike', 'zip', 'charm'];
  const elements: readonly CombatElement[] = ['ember', 'tide', 'moss', 'storm'];
  const dominantValues = [43, 49, 55, 61] as const;
  for (let firstIndex = 0; firstIndex < builds.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < builds.length;
      secondIndex += 1
    ) {
      const firstBuild = builds[firstIndex];
      const secondBuild = builds[secondIndex];
      if (firstBuild === undefined || secondBuild === undefined) {
        throw new Error('Balance test build table is incomplete.');
      }
      let firstBuildWins = 0;
      let fightCount = 0;
      for (const dominantValue of dominantValues) {
        const secondaryValue = Math.floor((100 - dominantValue) / 3);
        const statsFor = (dominantStat: DominantStat): RawCombatStats => {
          return Object.freeze({
            chonk: dominantStat === 'chonk' ? dominantValue : secondaryValue,
            spike: dominantStat === 'spike' ? dominantValue : secondaryValue,
            zip: dominantStat === 'zip' ? dominantValue : secondaryValue,
            charm: dominantStat === 'charm' ? dominantValue : secondaryValue,
          });
        };
        for (const firstElement of elements) {
          for (const secondElement of elements) {
            for (const swapSlots of [false, true]) {
              const firstFighter: CombatFighterInput = Object.freeze({
                id: `balance-${firstBuild}`,
                name: firstBuild,
                element: firstElement,
                stats: statsFor(firstBuild),
              });
              const secondFighter: CombatFighterInput = Object.freeze({
                id: `balance-${secondBuild}`,
                name: secondBuild,
                element: secondElement,
                stats: statsFor(secondBuild),
              });
              const fighters = swapSlots
                ? ([secondFighter, firstFighter] as const)
                : ([firstFighter, secondFighter] as const);
              const transcript = simulateCombat({
                seed: `role-balance-${dominantValue}-${firstElement}-${secondElement}`,
                fighters,
              });
              const winner = fighters[transcript.result.winner === 'a' ? 0 : 1];
              if (winner?.id === firstFighter.id) firstBuildWins += 1;
              fightCount += 1;
            }
          }
        }
      }
      const firstRole = selectCombatRole(makeStats(firstBuild));
      const secondRole = selectCombatRole(makeStats(secondBuild));
      const edge = getCombatRoleAdvantage(firstRole, secondRole);
      const favoredWins =
        edge === 'advantage'
          ? firstBuildWins
          : edge === 'disadvantage'
            ? fightCount - firstBuildWins
            : Math.max(firstBuildWins, fightCount - firstBuildWins);
      const favoredRate = favoredWins / fightCount;
      assert(
        favoredRate <= 0.65,
        `${firstBuild}/${secondBuild} must preserve the 65% hard ceiling; got ${favoredWins}/${fightCount}`
      );
      if (edge === 'neutral') {
        assert(
          favoredRate <= 0.55,
          `${firstBuild}/${secondBuild} neutral matchup must stay within 45-55%; got ${favoredWins}/${fightCount}`
        );
      } else {
        assert(
          favoredRate >= 0.53,
          `${firstBuild}/${secondBuild} role edge must remain visible; got ${favoredWins}/${fightCount}`
        );
      }
    }
  }
}

function testPrimaryPowerDurationMatrix(): void {
  const builds: readonly DominantStat[] = ['chonk', 'spike', 'zip', 'charm'];
  let promptMatchupCount = 0;

  for (let firstIndex = 0; firstIndex < builds.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex;
      secondIndex < builds.length;
      secondIndex += 1
    ) {
      const firstBuild = builds[firstIndex];
      const secondBuild = builds[secondIndex];
      if (firstBuild === undefined || secondBuild === undefined) {
        throw new Error('Duration test build table is incomplete.');
      }

      const fightCount = 100;
      let cappedFightCount = 0;
      for (let seed = 0; seed < fightCount / 2; seed += 1) {
        for (const swapSlots of [false, true]) {
          const transcript = simulateCombat({
            seed: `duration-${firstBuild}-${secondBuild}-${seed}`,
            fighters: [
              makeFighter(
                swapSlots ? 'duration-y' : 'duration-x',
                swapSlots ? secondBuild : firstBuild,
                'tide'
              ),
              makeFighter(
                swapSlots ? 'duration-x' : 'duration-y',
                swapSlots ? firstBuild : secondBuild,
                'tide'
              ),
            ],
          });
          assert(
            transcript.result.completedTick <= COMBAT_MAXIMUM_TICKS,
            `${firstBuild}/${secondBuild} must finish inside the 20-second replay`
          );
          if (transcript.result.completedTick === COMBAT_MAXIMUM_TICKS) {
            cappedFightCount += 1;
          }
        }
      }

      if (cappedFightCount <= fightCount * 0.2) {
        promptMatchupCount += 1;
      }
      if (firstBuild !== secondBuild) {
        assert(
          cappedFightCount <= fightCount * 0.75,
          `${firstBuild}/${secondBuild} must not become a mostly stalled cross-power matchup`
        );
      }
    }
  }

  assert(
    promptMatchupCount >= 5,
    'at least half of the ten power matchups must end before the clock in 80% of fights'
  );
}

function testSlotOrderNeutrality(): void {
  let firstSlotWins = 0;
  const fightCount = 400;
  for (let sample = 0; sample < fightCount; sample += 1) {
    const fighterA = makeFighter('neutral-a', 'spike', 'tide');
    const fighterB = makeFighter('neutral-b', 'spike', 'tide');
    const transcript = simulateCombat({
      seed: `slot-neutrality-${sample}`,
      fighters: sample % 2 === 0 ? [fighterA, fighterB] : [fighterB, fighterA],
    });
    if (transcript.result.winner === 'a') firstSlotWins += 1;
  }
  assert(
    firstSlotWins >= fightCount * 0.4 && firstSlotWins <= fightCount * 0.6,
    `identical builds must stay slot-neutral; slot A won ${firstSlotWins}/${fightCount}`
  );
}

function fighterWithUpgrade(
  upgrade: CombatUpgradeId | undefined
): CombatFighterInput {
  return Object.freeze({
    ...makeFighter('mod-actor', 'chonk', 'tide'),
    upgrades:
      upgrade === undefined ? Object.freeze([]) : Object.freeze([upgrade]),
  });
}

function testInkModPrimitives(): void {
  const expectedModifiers = Object.freeze({
    'v1-bold-tip': ['damagePermille', 1_012],
    'v1-quick-dry': ['cooldownPermille', 988],
    'v1-thick-paper': ['maximumHitPointsPermille', 1_010],
    'v1-first-mark': ['initialDelayTicksDelta', -1],
    'v1-lucky-splash': ['criticalChanceBonusPermille', 4],
    'v1-steady-hand': ['telegraphTicksDelta', -1],
  } as const satisfies Readonly<
    Record<
      CombatUpgradeId,
      readonly [keyof ReturnType<typeof getCombatUpgradeModifiers>, number]
    >
  >);
  for (const id of COMBAT_UPGRADE_IDS) {
    const [primitive, expectedValue] = expectedModifiers[id];
    assertEqual(
      getCombatUpgradeModifiers([id])[primitive],
      expectedValue,
      `${id} must change its authored integer combat primitive`
    );
    assertEqual(
      formatCombatUpgradeEffectLines([{ id }])[0],
      `${COMBAT_UPGRADE_CATALOG[id].shortName} · ${COMBAT_UPGRADE_CATALOG[id].description}`,
      `${id} details must reuse its exact authored effect description`
    );
  }

  const target = makeFighter('mod-target', 'chonk', 'tide');
  const simulate = (seed: string, upgrade?: CombatUpgradeId) =>
    simulateCombat({ seed, fighters: [fighterWithUpgrade(upgrade), target] });
  const timingBase = simulate('primitive-timing');
  const firstActorEvent = (
    transcript: BattleTranscript,
    kind: 'ability_telegraphed' | 'ability_activated',
    activationNumber: number
  ) =>
    transcript.timeline.find(
      (event) =>
        event.kind === kind &&
        event.actor === 'a' &&
        event.activationNumber === activationNumber
    );

  let boldTipIncreasedDamage = false;
  for (let seed = 0; seed < 128 && !boldTipIncreasedDamage; seed += 1) {
    const seedLabel = `primitive-v1-bold-tip-${seed}`;
    const boldBase = simulate(seedLabel);
    const bold = simulate(seedLabel, 'v1-bold-tip');
    const baseBoldHit = boldBase.timeline.find(
      (event) =>
        event.kind === 'damage' &&
        event.sourceFighter === 'a' &&
        event.source === 'inkquake' &&
        !event.critical
    );
    const boldHit = bold.timeline.find(
      (event) =>
        event.kind === 'damage' &&
        event.sourceFighter === 'a' &&
        event.source === 'inkquake' &&
        !event.critical
    );
    boldTipIncreasedDamage =
      baseBoldHit?.kind === 'damage' &&
      boldHit?.kind === 'damage' &&
      boldHit.amount > baseBoldHit.amount;
  }
  assert(
    boldTipIncreasedDamage,
    'Bold Tip must increase resolved integer damage'
  );

  const thickPaper = simulate('primitive-hp', 'v1-thick-paper');
  const baseHitPoints =
    simulate('primitive-hp').result.fighters[0].maxHitPoints;
  assert(
    thickPaper.result.fighters[0].maxHitPoints > baseHitPoints,
    'Thick Paper must increase integer maximum health'
  );

  const firstMark = simulate('primitive-timing', 'v1-first-mark');
  assert(
    (firstActorEvent(firstMark, 'ability_telegraphed', 1)?.tick ?? Infinity) <
      (firstActorEvent(timingBase, 'ability_telegraphed', 1)?.tick ??
        -Infinity),
    'First Mark must advance the first Shape Power start'
  );

  const steadyHand = simulate('primitive-timing', 'v1-steady-hand');
  assert(
    (firstActorEvent(steadyHand, 'ability_activated', 1)?.tick ?? Infinity) <
      (firstActorEvent(timingBase, 'ability_activated', 1)?.tick ?? -Infinity),
    'Steady Hand must shorten the first Shape Power wind-up'
  );
}

function chooseInkModLoadouts(
  count: number,
  startIndex = 0,
  prefix: readonly CombatUpgradeId[] = []
): readonly (readonly CombatUpgradeId[])[] {
  if (count === 0) return [prefix];
  return COMBAT_UPGRADE_IDS.slice(startIndex).flatMap((id, offset) =>
    chooseInkModLoadouts(count - 1, startIndex + offset + 1, [...prefix, id])
  );
}

function testBoundedInkModAggregate(): void {
  const dominantStats: readonly DominantStat[] = [
    'chonk',
    'spike',
    'zip',
    'charm',
  ];
  const fullLoadouts = chooseInkModLoadouts(MAXIMUM_COMBAT_UPGRADES);
  const configurations: readonly (readonly CombatUpgradeId[])[] = [
    ...COMBAT_UPGRADE_IDS.map((id) => Object.freeze([id])),
    ...fullLoadouts,
  ];

  for (const upgrades of configurations) {
    const modifiers = getCombatUpgradeModifiers(upgrades);
    assert(
      modifiers.damagePermille >= 970 && modifiers.damagePermille <= 1_030,
      `${upgrades.join(',')} damage modifier must stay inside its authored cap`
    );
    assert(
      modifiers.maximumHitPointsPermille >= 970 &&
        modifiers.maximumHitPointsPermille <= 1_030,
      `${upgrades.join(',')} heart modifier must stay inside its authored cap`
    );
    assert(
      modifiers.cooldownPermille >= 970 && modifiers.cooldownPermille <= 1_030,
      `${upgrades.join(',')} cooldown modifier must stay inside its authored cap`
    );
    for (const dominantStat of dominantStats) {
      const subject = Object.freeze({
        ...makeFighter('ink-mod-subject', dominantStat, 'tide'),
        upgrades: Object.freeze([...upgrades]),
      });
      const rival = makeFighter('ink-mod-rival', dominantStat, 'moss');
      const first = simulateCombat({
        seed: `ink-mod-determinism-a:${dominantStat}`,
        fighters: [subject, rival],
      });
      const second = simulateCombat({
        seed: `ink-mod-determinism-b:${dominantStat}`,
        fighters: [subject, rival],
      });
      assert(
        JSON.stringify(first.result) === JSON.stringify(second.result),
        `${upgrades.join(',')} mechanics must not change with cosmetic seed`
      );
    }
  }
}

/** Runs without a test framework so server and client build environments can use it. */
export function runCombatEngineTests(): readonly string[] {
  testDomainSeparatedRandomness();
  testAbilitySelectionAndGeometry();
  const deterministicTranscript = testDeterministicTranscript();
  testEveryPrimaryPowerActivates();
  testEveryCombatRoleUsesItsBasicAttack();
  testElementPayloadsAndStormTiming();
  testVersionFourTranscriptValidation();
  testImmutablePhaseOrderAndValidation();
  testPrimaryPowerBalance();
  testPrimaryPowerDurationMatrix();
  testSlotOrderNeutrality();
  testInkModPrimitives();
  testBoundedInkModAggregate();

  return Object.freeze([
    'domain-separated randomness',
    'fixed-point ability geometry',
    `deterministic transcript (${deterministicTranscript.result.reason})`,
    'all four primary powers',
    'all four role basic attacks and Gunner burst cadence',
    'element payloads and Storm timing',
    'v4 parser and derived-role validation',
    'immutable phases, caps, and validation',
    'primary-power matchup balance',
    'ten-matchup replay duration matrix',
    'slot-order neutrality',
    'six measurable Ink Mod primitives',
    'bounded mirrored Ink Mod aggregate',
  ]);
}
