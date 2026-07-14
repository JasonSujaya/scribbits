import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_PHASE_ORDER,
  COMBAT_TICK_RATE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_COMBAT_ENTITIES,
  MAXIMUM_TIMELINE_EVENTS,
  POWER_UP_IDS,
  circleCenterIsInsideCone,
  deterministicRoll,
  getOrbitingNibPosition,
  integerSquareRoot,
  isFixedVector,
  selectCombatRole,
  selectPrimaryPower,
  simulateCombat,
} from './index';
import { parseBattleTranscript } from './transcriptvalidation';
import type { PowerUpId } from './powerups';
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
  _legacyElement?: CombatElement
): CombatFighterInput {
  return Object.freeze({
    id,
    name: id,
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
  const powerUpDamageBySource = transcript.timeline.reduce(
    (totals, event) => {
      if (event.kind === 'damage' && event.source === 'power_up') {
        totals[event.sourceFighter] += event.amount;
      }
      return totals;
    },
    { a: 0, b: 0 }
  );
  assert(
    powerUpDamageBySource.a <= 36 && powerUpDamageBySource.b <= 36,
    'Power-Up damage must obey its per-fighter fight cap'
  );
  for (const slot of ['a', 'b'] as const) {
    assert(
      transcript.timeline.filter(
        (event) => event.kind === 'power_up_triggered' && event.actor === slot
      ).length <= 32,
      'Power-Up triggers must obey their per-fighter fight cap'
    );
  }
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

function testVersionFiveTranscriptValidation(): void {
  const transcript = simulateCombat({
    seed: 'v5-parser',
    fighters: [
      makeFighter('parser-brawler', 'chonk', 'tide'),
      makeFighter('parser-mage', 'charm', 'moss'),
    ],
  });
  assertEqual(transcript.version, 5, 'new simulations must use transcript v5');
  assert(
    parseBattleTranscript(transcript) === transcript,
    'v5 parser must accept a valid Gear-free transcript'
  );
  const firstCheckpoint = transcript.checkpoints[0];
  if (!firstCheckpoint) {
    throw new Error('v5 parser fixture needs its opening checkpoint.');
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
    'v5 parser must reject a role that disagrees with drawing stats'
  );

  const legacyGear = Object.freeze({
    version: 1 as const,
    techniques: Object.freeze([
      Object.freeze({
        category: 'weapon' as const,
        effectFamily: 'guard' as const,
        leadGearId: 'legacy-gear',
        leadRank: 1 as const,
        supportGearId: null,
        supportRank: null,
      }),
    ]),
    modifiers: Object.freeze({
      damagePermille: 1_000,
      maximumHitPointsPermille: 1_000,
      cooldownPermille: 1_000,
      criticalChanceBonusPermille: 0,
      telegraphTicksDelta: 0,
      initialDelayTicksDelta: 0,
    }),
  });
  for (const legacyVersion of [1, 2, 3, 4] as const) {
    const legacyFighters = transcript.fighters.map((fighter, fighterIndex) => {
      const { powerUpIds: _powerUpIds, ...sharedFighter } = fighter;
      return {
        ...sharedFighter,
        element: fighterIndex === 0 ? ('ember' as const) : ('moss' as const),
        ...(legacyVersion >= 2 ? { upgrades: [] } : {}),
        ...(legacyVersion === 3 && fighterIndex === 0
          ? { gear: legacyGear }
          : {}),
      };
    });
    const legacyTranscript = {
      ...transcript,
      version: legacyVersion,
      fighters: legacyFighters,
    };
    assert(
      parseBattleTranscript(legacyTranscript) !== undefined,
      `parser must preserve archived v${legacyVersion} transcript readability`
    );
  }
}

function testPowerUpRuntimeAndLegacyRemoval(): void {
  const build = Object.freeze([
    'v1-smudge-step',
    'v1-paper-shield',
    'v1-double-doodle',
    'v1-last-scribble',
    'v1-masterpiece',
  ] as const);
  let triggerObserved = false;
  for (let seed = 0; seed < 24; seed += 1) {
    const transcript = simulateCombat({
      seed: `power-up-runtime-${seed}`,
      fighters: [
        { ...makeFighter('power-up-owner', 'charm'), powerUpIds: build },
        makeFighter('power-up-target', 'chonk'),
      ],
    });
    assertTranscriptInvariants(transcript);
    assert(
      transcript.fighters.every(
        (fighter) =>
          fighter.element === undefined && fighter.upgrades === undefined
      ),
      'v5 fighters must omit legacy Element and Ink Mod fields'
    );
    triggerObserved ||= transcript.timeline.some(
      (event) => event.kind === 'power_up_triggered'
    );
  }
  assert(triggerObserved, 'a launch Power-Up must trigger in the fight matrix');

  const triggerCoverageBuilds = [
    [
      'v1-edge-spring',
      'v1-smudge-step',
      'v1-combo-spark',
      'v1-center-fold',
      'v1-endless-draft',
    ],
    [
      'v1-paper-shield',
      'v1-double-doodle',
      'v1-counter-sketch',
      'v1-echo-mark',
      'v1-masterpiece',
    ],
    ['v1-wallop', 'v1-last-scribble', 'v1-second-draft', 'v1-paper-twin'],
    ['v1-backup-plan'],
  ] as const satisfies readonly (readonly PowerUpId[])[];
  const triggeredPowerUpIds = new Set<string>();
  const roles: readonly DominantStat[] = ['chonk', 'spike', 'zip', 'charm'];
  for (const coverageBuild of triggerCoverageBuilds) {
    for (const ownerRole of roles) {
      for (const rivalRole of roles) {
        const coverageTranscript = simulateCombat({
          seed: `trigger-coverage:${coverageBuild[0]}:${ownerRole}:${rivalRole}`,
          fighters: [
            {
              ...makeFighter('coverage-owner', ownerRole),
              powerUpIds: coverageBuild,
            },
            makeFighter('coverage-rival', rivalRole),
          ],
        });
        for (const event of coverageTranscript.timeline) {
          if (event.kind === 'power_up_triggered') {
            triggeredPowerUpIds.add(event.powerUpId);
          }
        }
      }
    }
  }
  assertEqual(
    POWER_UP_IDS.filter((powerUpId) => !triggeredPowerUpIds.has(powerUpId))
      .length,
    0,
    'the combat matrix must exercise every launch Power-Up trigger'
  );

  const base = makeFighter('legacy-ignored', 'chonk');
  const target = makeFighter('legacy-target', 'spike');
  const clean = simulateCombat({
    seed: 'legacy-ignored',
    fighters: [base, target],
  });
  const legacyFields = simulateCombat({
    seed: 'legacy-ignored',
    fighters: [
      { ...base, element: 'ember', upgrades: ['v1-bold-tip'] },
      { ...target, element: 'moss', upgrades: ['v1-thick-paper'] },
    ],
  });
  assertEqual(
    JSON.stringify(legacyFields),
    JSON.stringify(clean),
    'new simulations must ignore and omit legacy Element and Ink Mod fields'
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

function testPowerUpBalanceSafetyMatrix(): void {
  const roles: readonly DominantStat[] = ['chonk', 'spike', 'zip', 'charm'];
  for (const powerUpId of POWER_UP_IDS) {
    for (const role of roles) {
      for (const swapSlots of [false, true]) {
        const owner: CombatFighterInput = Object.freeze({
          ...makeFighter(`power-up-${powerUpId}`, role),
          powerUpIds: Object.freeze([powerUpId]),
        });
        const rival = makeFighter(`power-up-rival-${role}`, role);
        const transcript = simulateCombat({
          seed: `power-up-balance:${powerUpId}:${role}:${swapSlots}`,
          fighters: swapSlots ? [rival, owner] : [owner, rival],
        });
        assertTranscriptInvariants(transcript);
        const ownerResult = transcript.result.fighters.find(
          (fighter) => fighter.id === owner.id
        );
        assertEqual(
          ownerResult?.maxHitPoints,
          transcript.result.fighters.find((fighter) => fighter.id === rival.id)
            ?.maxHitPoints,
          `${powerUpId} must not overlap Gear by changing raw maximum hearts`
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

/** Runs without a test framework so server and client build environments can use it. */
export function runCombatEngineTests(): readonly string[] {
  testDomainSeparatedRandomness();
  testAbilitySelectionAndGeometry();
  const deterministicTranscript = testDeterministicTranscript();
  testEveryPrimaryPowerActivates();
  testEveryCombatRoleUsesItsBasicAttack();
  testVersionFiveTranscriptValidation();
  testPowerUpRuntimeAndLegacyRemoval();
  testImmutablePhaseOrderAndValidation();
  testPowerUpBalanceSafetyMatrix();
  testPrimaryPowerDurationMatrix();
  testSlotOrderNeutrality();

  return Object.freeze([
    'domain-separated randomness',
    'fixed-point ability geometry',
    `deterministic transcript (${deterministicTranscript.result.reason})`,
    'all four primary powers',
    'all four role basic attacks and Gunner burst cadence',
    'v5 parser and derived-role validation',
    'behavioral Power-Up runtime and legacy removal',
    'immutable phases, caps, and validation',
    '15-card Power-Up balance safety matrix',
    'ten-matchup replay duration matrix',
    'slot-order neutrality',
  ]);
}
