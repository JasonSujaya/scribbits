import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_PHASE_ORDER,
  COMBAT_TICK_RATE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_COMBAT_ENTITIES,
  MAXIMUM_POWER_UP_BONUS_DAMAGE_PERMILLE,
  MAXIMUM_TIMELINE_EVENTS,
  POWER_UP_IDS,
  circleCenterIsInsideCone,
  deterministicRoll,
  getCombatRoleRules,
  getOrbitingNibPosition,
  integerSquareRoot,
  isFixedVector,
  selectCombatRole,
  selectPrimaryPower,
  simulateCombat,
} from './index';
import { parseBattleTranscript } from './transcriptvalidation';
import {
  POWER_UP_CATALOG,
  POWER_UP_RARITY_STRENGTH_PERMILLE,
  type PowerUpId,
} from './powerups';
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
    chonk: dominantStat === 'chonk' ? 40 : 20,
    spike: dominantStat === 'spike' ? 40 : 20,
    zip: dominantStat === 'zip' ? 40 : 20,
    charm: dominantStat === 'charm' ? 40 : 20,
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
    transcript.result.completedTick >= 10 * COMBAT_TICK_RATE,
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
    const projectileCount = checkpoint.projectiles?.length ?? 0;
    const paintZoneCount = checkpoint.paintZones?.length ?? 0;
    assert(
      2 + echoCount + projectileCount + paintZoneCount <=
        MAXIMUM_COMBAT_ENTITIES,
      'fighters plus spawned combat entities must obey the entity cap'
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
  for (const slot of ['a', 'b'] as const) {
    const opponent = transcript.result.fighters[slot === 'a' ? 1 : 0];
    // The budget is spent pre-advantage; the resolved damage may add the 10%
    // class-advantage multiplier plus one point of integer rounding.
    const maximumPowerUpDamage =
      Math.ceil(
        (opponent.maxHitPoints * MAXIMUM_POWER_UP_BONUS_DAMAGE_PERMILLE * 1.1) /
          1_000
      ) + 1;
    assert(
      powerUpDamageBySource[slot] <= maximumPowerUpDamage,
      'Power-Up damage must obey its percentage-based per-fighter fight cap'
    );
  }
  for (const slot of ['a', 'b'] as const) {
    assert(
      transcript.timeline.filter(
        (event) => event.kind === 'power_up_triggered' && event.actor === slot
      ).length <= 32,
      'Power-Up triggers must obey their per-fighter fight cap'
    );
  }
  for (const event of transcript.timeline) {
    if (event.kind !== 'healing') continue;
    const fighter = transcript.result.fighters[event.actor === 'a' ? 0 : 1];
    assert(event.amount > 0, 'healing events must restore positive health');
    assert(
      event.targetHitPoints <= fighter.maxHitPoints,
      'Power-Up healing must not exceed maximum health'
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
  assertEqual(selectPrimaryPower(makeStats('zip')), 'nib_halo', 'zip power');
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
      role: 'longshot',
      attack: 'piercing_quill',
      damageSource: 'longshot_quill',
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
}

function testAuthoritativeProjectileAndZonePrimitives(): void {
  const projectileTypes = Object.freeze(['quill', 'color_bolt'] as const);
  const projectileSpawns = new Set<(typeof projectileTypes)[number]>();
  const projectileHits = new Set<(typeof projectileTypes)[number]>();
  let paintZonePulseObserved = false;
  let orbitingNibHitObserved = false;
  let naturalRicochetObserved = false;
  for (let seed = 0; seed < 16; seed += 1) {
    const projectileTranscript = simulateCombat({
      seed: `projectile-primitives-${seed}`,
      fighters: [
        makeFighter('projectile-longshot', 'spike'),
        makeFighter('projectile-mage', 'charm'),
      ],
    });
    const spawnedIds = new Set(
      projectileTranscript.timeline
        .filter((event) => event.kind === 'projectile_spawned')
        .map((event) => event.projectileId)
    );
    assert(
      spawnedIds.size > 0,
      'ranged roles must spawn in-flight projectiles'
    );
    for (const event of projectileTranscript.timeline) {
      if (event.kind === 'projectile_spawned') {
        projectileSpawns.add(event.projectile);
      }
      if (
        event.kind === 'projectile_hit' &&
        spawnedIds.has(event.projectileId)
      ) {
        projectileHits.add(event.projectile);
      }
      if (
        event.kind === 'projectile_bounced' &&
        event.reason === 'natural_ricochet'
      ) {
        naturalRicochetObserved = true;
        const attackNumber = Number(event.projectileId.split(':')[2]);
        assertEqual(
          attackNumber % 3,
          0,
          'only every third unpowered quill may ricochet naturally'
        );
      }
      if (event.kind === 'projectile_bounced') {
        const spawn = projectileTranscript.timeline.find(
          (candidate) =>
            candidate.kind === 'projectile_spawned' &&
            candidate.projectileId === event.projectileId
        );
        assert(
          spawn?.kind === 'projectile_spawned' && spawn.projectile === 'quill',
          'color bolts must never ricochet'
        );
      }
    }
    assert(
      projectileTranscript.checkpoints.every(
        (checkpoint) =>
          Array.isArray(checkpoint.projectiles) &&
          Array.isArray(checkpoint.paintZones)
      ),
      'v8 checkpoints must snapshot projectiles and paint zones'
    );

    const zoneTranscript = simulateCombat({
      seed: `paint-zone-primitives-${seed}`,
      fighters: [
        makeFighter('zone-mage', 'charm'),
        makeFighter('zone-brawler', 'chonk'),
      ],
    });
    assert(
      zoneTranscript.timeline.some(
        (event) => event.kind === 'paint_zone_created'
      ),
      'Colorburst must create a persistent paint zone'
    );
    paintZonePulseObserved ||= zoneTranscript.timeline.some(
      (event) => event.kind === 'paint_zone_pulsed'
    );

    const haloTranscript = simulateCombat({
      seed: `orbiting-nib-primitives-${seed}`,
      fighters: [
        makeFighter('halo-longshot', 'spike'),
        makeFighter('halo-brawler', 'chonk'),
      ],
    });
    orbitingNibHitObserved ||= haloTranscript.timeline.some(
      (event) =>
        event.kind === 'role_attack' &&
        event.attack === 'nib_volley' &&
        event.hit
    );
  }
  for (const projectile of projectileTypes) {
    assert(
      projectileSpawns.has(projectile),
      `${projectile} must spawn as an authoritative in-flight projectile`
    );
    assert(
      projectileHits.has(projectile),
      `${projectile} must resolve an authoritative physical hit`
    );
  }
  assert(
    paintZonePulseObserved,
    'paint zones must pulse bounded authoritative damage when occupied'
  );
  assert(
    orbitingNibHitObserved,
    'orbiting nib geometry must be able to collide during active ticks'
  );
  assert(
    naturalRicochetObserved,
    'an unpowered Longshot must visibly bank every third missed quill'
  );
}

function testLongshotKitesBeforeItGetsCornered(): void {
  const transcript = simulateCombat({
    seed: 'longshot-kiting',
    fighters: [
      makeFighter('kiting-longshot', 'spike'),
      makeFighter('chasing-brawler', 'chonk'),
    ],
  });
  const openingLongshot = transcript.checkpoints[0]?.fighters[0];
  assert(
    openingLongshot?.combatRole === 'longshot',
    'kiting fixture must start with a Longshot'
  );
  const halfSecond = transcript.checkpoints.find(
    (checkpoint) => checkpoint.tick === 10
  );
  const halfSecondLongshot = halfSecond?.fighters[0];
  const halfSecondBrawler = halfSecond?.fighters[1];
  if (halfSecondLongshot === undefined || halfSecondBrawler === undefined) {
    throw new Error(
      'Combat engine test failed: kiting fixture must include the half-second checkpoint'
    );
  }
  const halfSecondDistance = integerSquareRoot(
    (halfSecondBrawler.position.x - halfSecondLongshot.position.x) ** 2 +
      (halfSecondBrawler.position.y - halfSecondLongshot.position.y) ** 2
  );
  assert(
    halfSecondDistance >= 4_800,
    'Longshot must preserve a readable opening lane against a charging Brawler'
  );
  assert(
    halfSecondLongshot.velocity.y !== 0,
    'Longshot must open by strafing across its firing lane instead of charging forward'
  );

  const preferredMinimum = getCombatRoleRules('longshot').preferredRangeMinimum;
  const retreatCheckpoint = transcript.checkpoints.find((checkpoint) => {
    const longshot = checkpoint.fighters[0];
    const brawler = checkpoint.fighters[1];
    if (!longshot || !brawler) return false;
    const towardX = brawler.position.x - longshot.position.x;
    const towardY = brawler.position.y - longshot.position.y;
    const distance = integerSquareRoot(towardX ** 2 + towardY ** 2);
    const awayDot =
      longshot.velocity.x * -towardX + longshot.velocity.y * -towardY;
    return distance < preferredMinimum && awayDot > 0;
  });
  if (retreatCheckpoint === undefined) {
    throw new Error(
      'Combat engine test failed: Longshot must turn away when a threat enters its preferred firing lane'
    );
  }
  const retreatingLongshot = retreatCheckpoint.fighters[0];
  const retreatSpeed = integerSquareRoot(
    retreatingLongshot.velocity.x ** 2 + retreatingLongshot.velocity.y ** 2
  );
  assert(
    retreatSpeed >= 190,
    'Longshot close-range retreat must be faster than its ordinary strafe'
  );
}

function testMageRetreatsAfterCasting(): void {
  const transcript = simulateCombat({
    seed: 'mage-retreat',
    fighters: [
      makeFighter('retreating-mage', 'charm'),
      makeFighter('chasing-brawler', 'chonk'),
    ],
  });
  const castFinished = transcript.timeline.find(
    (event) => event.kind === 'ability_finished' && event.actor === 'a'
  );
  if (castFinished === undefined) {
    throw new Error(
      'Combat engine test failed: Mage fixture must finish a cast'
    );
  }
  const retreatCheckpoint = transcript.checkpoints.find(
    (checkpoint) =>
      checkpoint.tick >= castFinished.tick &&
      checkpoint.tick < castFinished.tick + 6
  );
  if (retreatCheckpoint === undefined) {
    throw new Error(
      'Combat engine test failed: Mage fixture must checkpoint its post-cast retreat'
    );
  }
  const mage = retreatCheckpoint.fighters[0];
  const brawler = retreatCheckpoint.fighters[1];
  const towardX = brawler.position.x - mage.position.x;
  const towardY = brawler.position.y - mage.position.y;
  const awayDot = mage.velocity.x * -towardX + mage.velocity.y * -towardY;
  const retreatSpeed = integerSquareRoot(
    mage.velocity.x ** 2 + mage.velocity.y ** 2
  );
  assert(
    awayDot > 0,
    'Mage must create distance immediately after releasing a cast'
  );
  assert(
    retreatSpeed >= 152,
    'Mage post-cast retreat must be faster than its ordinary repositioning'
  );
}

function testCurrentTranscriptValidation(): void {
  const transcript = simulateCombat({
    seed: 'v8-parser',
    fighters: [
      makeFighter('parser-brawler', 'chonk', 'tide'),
      makeFighter('parser-mage', 'charm', 'moss'),
    ],
  });
  assertEqual(transcript.version, 8, 'new simulations must use transcript v8');
  assert(
    parseBattleTranscript(transcript) === transcript,
    'v8 parser must accept a valid Gear-free transcript'
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
    'v1-combo-spark',
    'v1-center-fold',
    'v1-double-doodle',
    'v1-last-scribble',
    'v1-masterpiece',
  ] as const);
  let triggerObserved = false;
  let healingObserved = false;
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
    healingObserved ||= transcript.timeline.some(
      (event) => event.kind === 'healing'
    );
  }
  assert(triggerObserved, 'a launch Power-Up must trigger in the fight matrix');
  assert(
    healingObserved,
    'a sustain Power-Up must restore health in the fight matrix'
  );

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
    ['v2-bank-shot', 'v2-orbiting-nib', 'v2-wider-halo'],
    ['v2-returning-stroke'],
    ['v2-paint-splash', 'v2-wet-paint'],
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
  const lastScribbleTranscript = simulateCombat({
    seed: 'last-scribble-trigger-coverage',
    fighters: [
      {
        ...makeFighter('last-scribble-owner', 'charm'),
        stats: Object.freeze({ chonk: 0, spike: 0, zip: 0, charm: 40 }),
        powerUpIds: Object.freeze(['v1-last-scribble']),
      },
      {
        ...makeFighter('last-scribble-rival', 'chonk'),
        stats: Object.freeze({ chonk: 200, spike: 0, zip: 0, charm: 0 }),
      },
    ],
  });
  for (const event of lastScribbleTranscript.timeline) {
    if (event.kind === 'power_up_triggered') {
      triggeredPowerUpIds.add(event.powerUpId);
    }
  }
  const untriggeredPowerUpIds = POWER_UP_IDS.filter(
    (powerUpId) => !triggeredPowerUpIds.has(powerUpId)
  );
  assertEqual(
    untriggeredPowerUpIds.length,
    0,
    `the combat matrix must exercise every launch Power-Up trigger (${untriggeredPowerUpIds.join(', ')})`
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
    12,
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
        const rivalResult = transcript.result.fighters.find(
          (fighter) => fighter.id === rival.id
        );
        const rarityStrength =
          POWER_UP_RARITY_STRENGTH_PERMILLE[POWER_UP_CATALOG[powerUpId].rarity];
        assert(
          (ownerResult?.maxHitPoints ?? 0) >= (rivalResult?.maxHitPoints ?? 0),
          `${powerUpId} rarity resilience must never reduce maximum hearts`
        );
        assert(
          rarityStrength === 0 ||
            (ownerResult?.maxHitPoints ?? 0) > (rivalResult?.maxHitPoints ?? 0),
          `${powerUpId} rarity resilience must increase maximum hearts`
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
      let stalledCappedFightCount = 0;
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
            const exchangedDamage = transcript.result.fighters.reduce(
              (total, fighter) => total + fighter.damageDealt,
              0
            );
            const combinedMaximumHitPoints = transcript.result.fighters.reduce(
              (total, fighter) => total + fighter.maxHitPoints,
              0
            );
            if (exchangedDamage * 2 < combinedMaximumHitPoints) {
              stalledCappedFightCount += 1;
            }
          }
        }
      }

      if (cappedFightCount <= fightCount * 0.2) {
        promptMatchupCount += 1;
      }
      // Longshot versus Mage is the intentional ranged-spacing duel: both
      // kite, fire physical projectiles, and may use the full replay clock.
      // Zip/Gunner remains only for archived transcript compatibility and is
      // not part of the current three-role pacing gate.
      if (
        selectPrimaryPower(makeStats(firstBuild)) !==
          selectPrimaryPower(makeStats(secondBuild)) &&
        firstBuild !== 'zip' &&
        secondBuild !== 'zip' &&
        !(
          (firstBuild === 'spike' && secondBuild === 'charm') ||
          (firstBuild === 'charm' && secondBuild === 'spike')
        )
      ) {
        assert(
          stalledCappedFightCount <= fightCount * 0.75,
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

function testCompetitiveCurrentRoleCycle(): void {
  const edges = Object.freeze([
    Object.freeze({ target: 'chonk', rival: 'charm', label: 'Brawler > Mage' }),
    Object.freeze({
      target: 'charm',
      rival: 'spike',
      label: 'Mage > Longshot',
    }),
    Object.freeze({
      target: 'spike',
      rival: 'chonk',
      label: 'Longshot > Brawler',
    }),
  ] as const satisfies readonly Readonly<{
    target: DominantStat;
    rival: DominantStat;
    label: string;
  }>[]);
  const fightCount = 600;

  for (const edge of edges) {
    let targetWins = 0;
    for (let sample = 0; sample < fightCount / 2; sample += 1) {
      for (const swapSlots of [false, true]) {
        const target = makeFighter(`cycle-target-${edge.target}`, edge.target);
        const rival = makeFighter(`cycle-rival-${edge.rival}`, edge.rival);
        const transcript = simulateCombat({
          seed: `role-cycle:${edge.target}:${edge.rival}:${sample}:${swapSlots}`,
          fighters: swapSlots ? [rival, target] : [target, rival],
        });
        const targetSlot = swapSlots ? 'b' : 'a';
        if (transcript.result.winner === targetSlot) targetWins += 1;
      }
    }
    const targetWinRate = targetWins / fightCount;
    assert(
      targetWinRate >= 0.5 && targetWinRate <= 0.65,
      `${edge.label} must remain a competitive direct-engine edge; got ${(targetWinRate * 100).toFixed(1)}%`
    );
  }
}

/** Runs without a test framework so server and client build environments can use it. */
export function runCombatEngineTests(): readonly string[] {
  testDomainSeparatedRandomness();
  testAbilitySelectionAndGeometry();
  const deterministicTranscript = testDeterministicTranscript();
  testEveryPrimaryPowerActivates();
  testEveryCombatRoleUsesItsBasicAttack();
  testLongshotKitesBeforeItGetsCornered();
  testMageRetreatsAfterCasting();
  testAuthoritativeProjectileAndZonePrimitives();
  testCurrentTranscriptValidation();
  testCompetitiveCurrentRoleCycle();
  testPowerUpRuntimeAndLegacyRemoval();
  testImmutablePhaseOrderAndValidation();
  testPowerUpBalanceSafetyMatrix();
  testPrimaryPowerDurationMatrix();
  testSlotOrderNeutrality();

  return Object.freeze([
    'domain-separated randomness',
    'fixed-point ability geometry',
    `deterministic transcript (${deterministicTranscript.result.reason})`,
    'all three current primary powers across four stored stats',
    'all three role basic attacks plus Zip-to-Longshot compatibility',
    'Longshot lateral opening and emergency kiting',
    'Mage post-cast retreat',
    'authoritative projectiles, orbiting nibs, and paint zones',
    'v8 parser and derived-role validation',
    'behavioral Power-Up runtime and legacy removal',
    'immutable phases, caps, and validation',
    '15-card Power-Up balance safety matrix',
    'ten-matchup replay duration matrix',
    'slot-order neutrality',
    'competitive three-role counter cycle',
  ]);
}
