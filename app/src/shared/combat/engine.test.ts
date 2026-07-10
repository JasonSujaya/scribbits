import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_PHASE_ORDER,
  COMBAT_TICK_RATE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_COMBAT_ENTITIES,
  MAXIMUM_TIMELINE_EVENTS,
  circleCenterIsInsideCone,
  deterministicRoll,
  getOrbitingNibPosition,
  integerSquareRoot,
  isFixedVector,
  selectPrimaryPower,
  simulateCombat,
} from './index';
import type {
  BattleTranscript,
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
  assertEqual(transcript.tickRate, COMBAT_TICK_RATE, 'engine must run at 20 Hz');
  assert(
    transcript.result.completedTick <= COMBAT_MAXIMUM_TICKS,
    'battle must finish by tick 500'
  );
  assert(
    transcript.result.completedTick >= 13 * COMBAT_TICK_RATE,
    'fresh ink must keep the rendered fight inside its minimum pacing band'
  );
  assert(
    transcript.timeline.length <= MAXIMUM_TIMELINE_EVENTS,
    'timeline must obey its hard cap'
  );
  assert(!transcript.eventsTruncated, 'normal fights must retain every sparse event');
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
      previous !== undefined && current !== undefined && previous.tick <= current.tick,
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
      assert(isFixedVector(fighter.position), 'positions must stay integer fixed-point');
      assert(isFixedVector(fighter.velocity), 'velocities must stay integer fixed-point');
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
    deterministicRoll('domain-test', 'critical-hit', 'a', 10) !== firstDamageRoll,
    'different random domains should produce different rolls'
  );
}

function testAbilitySelectionAndGeometry(): void {
  assertEqual(selectPrimaryPower(makeStats('chonk')), 'inkquake', 'chonk power');
  assertEqual(selectPrimaryPower(makeStats('spike')), 'nib_halo', 'spike power');
  assertEqual(selectPrimaryPower(makeStats('zip')), 'smearstep', 'zip power');
  assertEqual(selectPrimaryPower(makeStats('charm')), 'colorburst', 'charm power');
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
    new Set(nibPositions.map((position) => `${position.x}:${position.y}`)).size === 3,
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
    simulateCombat({ ...input, seed: 'different-seed' }).battleId !== first.battleId,
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

function testImmutablePhaseOrderAndValidation(): void {
  assertEqual(COMBAT_PHASE_ORDER.length, 10, 'phase order must remain complete');
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
      const fightCount = 200;
      for (let seed = 0; seed < fightCount / 2; seed += 1) {
        for (const swapSlots of [false, true]) {
          const transcript = simulateCombat({
            seed: `regression-${seed}`,
            fighters: [
              makeFighter(
                swapSlots ? 'balance-y' : 'balance-x',
                swapSlots ? secondBuild : firstBuild,
                'tide'
              ),
              makeFighter(
                swapSlots ? 'balance-x' : 'balance-y',
                swapSlots ? firstBuild : secondBuild,
                'tide'
              ),
            ],
          });
          const winnerBuild: DominantStat =
            transcript.result.winner === 'a'
              ? swapSlots
                ? secondBuild
                : firstBuild
              : swapSlots
                ? firstBuild
                : secondBuild;
          if (winnerBuild === firstBuild) {
            firstBuildWins += 1;
          }
        }
      }
      const strongerBuildWins = Math.max(
        firstBuildWins,
        fightCount - firstBuildWins
      );
      assert(
        strongerBuildWins <= fightCount * 0.65,
        `${firstBuild}/${secondBuild} must stay at or below a 65% dominant matchup`
      );
    }
  }
}

function testSlotOrderNeutrality(): void {
  let firstSlotWins = 0;
  const fightCount = 400;
  for (let seed = 0; seed < fightCount; seed += 1) {
    const transcript = simulateCombat({
      seed: `slot-neutrality-${seed}`,
      fighters: [
        makeFighter('neutral-a', 'spike', 'tide'),
        makeFighter('neutral-b', 'spike', 'tide'),
      ],
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
  testElementPayloadsAndStormTiming();
  testImmutablePhaseOrderAndValidation();
  testPrimaryPowerBalance();
  testSlotOrderNeutrality();

  return Object.freeze([
    'domain-separated randomness',
    'fixed-point ability geometry',
    `deterministic transcript (${deterministicTranscript.result.reason})`,
    'all four primary powers',
    'element payloads and Storm timing',
    'immutable phases, caps, and validation',
    'primary-power matchup balance',
    'slot-order neutrality',
  ]);
}
