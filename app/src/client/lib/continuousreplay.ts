import type { BattleReport } from '../../shared/arena';
import { battleResultFinishIsConsistent } from '../../shared/combat/resultvalidation';
import { isShapePowerId } from '../../shared/combat/shapepowercontent';
import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_TICK_RATE,
  FIXED_POINT_SCALE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_TIMELINE_EVENTS,
} from '../../shared/combat/config';
import type {
  AbilityPhase,
  BattleEndReason,
  BattleCheckpoint,
  BattleTimelineEvent,
  BattleTranscript,
  DamageSource,
  FighterCheckpoint,
  FighterResult,
  FighterSlot,
  FixedVector,
  PrimaryPower,
} from '../../shared/combat';

const MAXIMUM_REPLAY_VALUE = 1_000_000;
const MAXIMUM_CHECKPOINT_GAP = COMBAT_TICK_RATE / 2;
// A battle may end while an already-authored telegraph, active phase, burn, or
// echo still points a short distance beyond the final simulation tick. Accept
// that bounded future schedule without accepting arbitrary client timers.
const MAXIMUM_SCHEDULE_AHEAD_TICKS = COMBAT_TICK_RATE * 2;

export type ReplayVector = Readonly<{ x: number; y: number }>;

export type ReplayFighterFrame = Readonly<{
  slot: FighterSlot;
  hitPoints: number;
  maxHitPoints: number;
  position: ReplayVector;
  velocity: ReplayVector;
  primaryPower: PrimaryPower;
  abilityPhase: AbilityPhase;
  barrierHitPoints: number;
  echoPosition: ReplayVector | null;
}>;

/** Coordinates remain in combat fixed-point units for the renderer to scale. */
export type ReplayFrame = Readonly<{
  tick: number;
  completedTick: number;
  fixedPointScale: number;
  arenaHalfWidth: number;
  arenaHalfHeight: number;
  fighters: readonly [ReplayFighterFrame, ReplayFighterFrame];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isNonEmptyText(
  value: unknown,
  maximumLength: number
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
}

function isFighterSlot(value: unknown): value is FighterSlot {
  return value === 'a' || value === 'b';
}

function isAbilityPhase(value: unknown): value is AbilityPhase {
  return value === 'cooldown' || value === 'telegraph' || value === 'active';
}

function isDamageSource(value: unknown): value is DamageSource {
  return (
    isShapePowerId(value) ||
    value === 'colorburst_echo' ||
    value === 'contact' ||
    value === 'ember_burn' ||
    value === 'nib_wall_recoil'
  );
}

function barrierHitSourceMetadataIsUsable(
  value: Record<string, unknown>
): boolean {
  const metadataFields = [
    'sourceFighter',
    'source',
    'sourceActivationNumber',
  ] as const;
  const presentFieldCount = metadataFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(value, field)
  ).length;

  return (
    presentFieldCount === 0 ||
    (presentFieldCount === metadataFields.length &&
      isFighterSlot(value.sourceFighter) &&
      value.sourceFighter !== value.actor &&
      isDamageSource(value.source) &&
      isBoundedInteger(value.sourceActivationNumber, 0, MAXIMUM_REPLAY_VALUE))
  );
}

function isBattleEndReason(value: unknown): value is BattleEndReason {
  return (
    value === 'knockout' ||
    value === 'double_knockout' ||
    value === 'timeout_hp_percentage' ||
    value === 'timeout_damage_dealt' ||
    value === 'timeout_stable_tiebreak'
  );
}

function isVector(value: unknown): value is FixedVector {
  return (
    isRecord(value) &&
    isBoundedInteger(value.x, -MAXIMUM_REPLAY_VALUE, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.y, -MAXIMUM_REPLAY_VALUE, MAXIMUM_REPLAY_VALUE)
  );
}

function isScheduledTick(value: unknown, eventTick: unknown): value is number {
  return (
    isBoundedInteger(eventTick, 0, COMBAT_MAXIMUM_TICKS) &&
    isBoundedInteger(
      value,
      eventTick,
      Math.min(MAXIMUM_REPLAY_VALUE, eventTick + MAXIMUM_SCHEDULE_AHEAD_TICKS)
    )
  );
}

type TimelineEventFieldValidator = (value: Record<string, unknown>) => boolean;

const TIMELINE_EVENT_FIELD_VALIDATORS = {
  battle_started: (value) => isNonEmptyText(value.battleId, 240),
  arena_shrink_started: (value) =>
    isBoundedInteger(value.targetHalfWidth, 1, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.targetHalfHeight, 1, MAXIMUM_REPLAY_VALUE),
  late_fight_started: (value) =>
    isBoundedInteger(value.cooldownMultiplierPermille, 1, 1_000) &&
    isBoundedInteger(value.defenseTicks, 0, COMBAT_MAXIMUM_TICKS),
  ability_telegraphed: (value) =>
    isFighterSlot(value.actor) &&
    isShapePowerId(value.power) &&
    isBoundedInteger(value.activationNumber, 1, MAXIMUM_REPLAY_VALUE) &&
    isVector(value.origin) &&
    isVector(value.aimDirection) &&
    isScheduledTick(value.activatesAtTick, value.tick),
  ability_activated: (value) =>
    isFighterSlot(value.actor) &&
    isShapePowerId(value.power) &&
    isBoundedInteger(value.activationNumber, 1, MAXIMUM_REPLAY_VALUE) &&
    isScheduledTick(value.activeUntilTick, value.tick),
  ability_finished: (value) =>
    isFighterSlot(value.actor) &&
    isShapePowerId(value.power) &&
    isBoundedInteger(value.activationNumber, 1, MAXIMUM_REPLAY_VALUE),
  damage: (value) =>
    isFighterSlot(value.sourceFighter) &&
    isFighterSlot(value.targetFighter) &&
    isDamageSource(value.source) &&
    (value.sourceFighter !== value.targetFighter ||
      value.source === 'nib_wall_recoil') &&
    isBoundedInteger(value.amount, 1, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.targetHitPoints, 0, MAXIMUM_REPLAY_VALUE) &&
    typeof value.critical === 'boolean' &&
    isVector(value.position),
  burn_applied: (value) =>
    isFighterSlot(value.sourceFighter) &&
    isFighterSlot(value.targetFighter) &&
    value.sourceFighter !== value.targetFighter &&
    isBoundedInteger(value.remainingCappedDamage, 1, MAXIMUM_REPLAY_VALUE) &&
    isScheduledTick(value.nextPulseTick, value.tick),
  barrier_created: (value) =>
    isFighterSlot(value.actor) &&
    isBoundedInteger(value.hitPoints, 1, MAXIMUM_REPLAY_VALUE),
  barrier_hit: (value) =>
    isFighterSlot(value.actor) &&
    isBoundedInteger(value.absorbedDamage, 1, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.remainingHitPoints, 0, MAXIMUM_REPLAY_VALUE) &&
    barrierHitSourceMetadataIsUsable(value),
  barrier_broken: (value) => isFighterSlot(value.actor),
  wall_bounce: (value) =>
    isFighterSlot(value.actor) &&
    (value.axis === 'x' || value.axis === 'y' || value.axis === 'both') &&
    isVector(value.position),
  nib_wall_ejection: (value) =>
    isFighterSlot(value.actor) &&
    // Before knockout protection lifts, a Nib Halo can still be pushed back
    // from the wall while its recoil is clamped to zero at 1 HP.
    isBoundedInteger(value.selfDamage, 0, MAXIMUM_REPLAY_VALUE) &&
    isVector(value.position),
  fighter_collision: (value) => isVector(value.position),
  echo_created: (value) =>
    isFighterSlot(value.actor) &&
    isVector(value.position) &&
    isVector(value.aimDirection) &&
    isScheduledTick(value.firesAtTick, value.tick),
  echo_shattered: (value) =>
    isFighterSlot(value.owner) &&
    isFighterSlot(value.shatteredBy) &&
    value.owner !== value.shatteredBy &&
    isVector(value.position),
  echo_fired: (value) =>
    isFighterSlot(value.actor) &&
    isVector(value.position) &&
    isVector(value.aimDirection),
  ink_pressure: (value) =>
    isFighterSlot(value.actor) &&
    typeof value.refreshedImmediately === 'boolean',
  fighter_defeated: (value) => isFighterSlot(value.actor),
  battle_ended: (value) =>
    isFighterSlot(value.winner) && isBattleEndReason(value.reason),
} satisfies Record<BattleTimelineEvent['kind'], TimelineEventFieldValidator>;

function isTimelineEventKind(
  value: unknown
): value is BattleTimelineEvent['kind'] {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(TIMELINE_EVENT_FIELD_VALIDATORS, value)
  );
}

function isTimelineEvent(
  value: unknown,
  completedTick: number
): value is BattleTimelineEvent {
  return (
    isRecord(value) &&
    isBoundedInteger(value.tick, 0, completedTick) &&
    isTimelineEventKind(value.kind) &&
    TIMELINE_EVENT_FIELD_VALIDATORS[value.kind](value)
  );
}

function isTranscriptFighter(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.stats)) {
    return false;
  }
  return (
    isNonEmptyText(value.id, 120) &&
    isNonEmptyText(value.name, 80) &&
    (value.element === 'ember' ||
      value.element === 'tide' ||
      value.element === 'moss' ||
      value.element === 'storm') &&
    isBoundedInteger(value.stats.chonk, 0, 1_000) &&
    isBoundedInteger(value.stats.spike, 0, 1_000) &&
    isBoundedInteger(value.stats.zip, 0, 1_000) &&
    isBoundedInteger(value.stats.charm, 0, 1_000)
  );
}

function isFighterCheckpoint(
  value: unknown,
  expectedSlot: FighterSlot
): value is FighterCheckpoint {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.slot === expectedSlot &&
    isBoundedInteger(value.maxHitPoints, 1, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.hitPoints, 0, value.maxHitPoints) &&
    isVector(value.position) &&
    isVector(value.velocity) &&
    isShapePowerId(value.primaryPower) &&
    isAbilityPhase(value.abilityPhase) &&
    isBoundedInteger(value.barrierHitPoints, 0, MAXIMUM_REPLAY_VALUE) &&
    (value.echoPosition === null || isVector(value.echoPosition))
  );
}

function isCheckpoint(value: unknown): value is BattleCheckpoint {
  if (!isRecord(value) || !Array.isArray(value.fighters)) {
    return false;
  }
  return (
    isBoundedInteger(value.tick, 0, COMBAT_MAXIMUM_TICKS) &&
    isBoundedInteger(value.arenaHalfWidth, 1, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.arenaHalfHeight, 1, MAXIMUM_REPLAY_VALUE) &&
    value.fighters.length === 2 &&
    isFighterCheckpoint(value.fighters[0], 'a') &&
    isFighterCheckpoint(value.fighters[1], 'b')
  );
}

function isResultFighter(
  value: unknown,
  expectedSlot: FighterSlot,
  expectedId: string
): boolean {
  return (
    isRecord(value) &&
    value.slot === expectedSlot &&
    value.id === expectedId &&
    isBoundedInteger(value.maxHitPoints, 1, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.finalHitPoints, 0, value.maxHitPoints) &&
    isBoundedInteger(value.hitPointPermille, 0, 1_000) &&
    isBoundedInteger(value.damageDealt, 0, MAXIMUM_REPLAY_VALUE) &&
    isShapePowerId(value.primaryPower) &&
    typeof value.inkPressureUsed === 'boolean'
  );
}

function transcriptResultIsUsable(
  value: unknown,
  fighterAId: string,
  fighterBId: string
): value is BattleTranscript['result'] {
  if (!isRecord(value) || !Array.isArray(value.fighters)) {
    return false;
  }
  if (
    !(
      isFighterSlot(value.winner) &&
      isFighterSlot(value.loser) &&
      value.winner !== value.loser &&
      isBattleEndReason(value.reason) &&
      isBoundedInteger(value.completedTick, 1, COMBAT_MAXIMUM_TICKS) &&
      value.completedMilliseconds ===
        Math.floor((value.completedTick * 1_000) / COMBAT_TICK_RATE) &&
      value.fighters.length === 2 &&
      isResultFighter(value.fighters[0], 'a', fighterAId) &&
      isResultFighter(value.fighters[1], 'b', fighterBId)
    )
  ) {
    return false;
  }

  return battleResultFinishIsConsistent(
    value as BattleTranscript['result'],
    COMBAT_MAXIMUM_TICKS
  );
}

function finalCheckpointFighterMatchesResult(
  checkpointFighter: FighterCheckpoint,
  resultFighter: FighterResult,
  expectedSlot: FighterSlot,
  expectedFighterId: string
): boolean {
  return (
    checkpointFighter.slot === expectedSlot &&
    resultFighter.slot === expectedSlot &&
    resultFighter.id === expectedFighterId &&
    checkpointFighter.hitPoints === resultFighter.finalHitPoints &&
    checkpointFighter.maxHitPoints === resultFighter.maxHitPoints
  );
}

function checkpointsAreUsable(
  values: readonly unknown[],
  result: BattleTranscript['result'],
  fighterAId: string,
  fighterBId: string
): values is readonly BattleCheckpoint[] {
  const first = values[0];
  const last = values.at(-1);
  if (
    values.length < 2 ||
    values.length > MAXIMUM_CHECKPOINTS ||
    !isCheckpoint(first) ||
    first.tick !== 0 ||
    !isCheckpoint(last) ||
    last.tick !== result.completedTick
  ) {
    return false;
  }
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      !isCheckpoint(previous) ||
      !isCheckpoint(current) ||
      current.tick <= previous.tick ||
      current.tick - previous.tick > MAXIMUM_CHECKPOINT_GAP
    ) {
      return false;
    }
  }
  return (
    finalCheckpointFighterMatchesResult(
      last.fighters[0],
      result.fighters[0],
      'a',
      fighterAId
    ) &&
    finalCheckpointFighterMatchesResult(
      last.fighters[1],
      result.fighters[1],
      'b',
      fighterBId
    )
  );
}

function timelineIsUsable(
  values: readonly unknown[],
  battleId: string,
  result: BattleTranscript['result']
): values is readonly BattleTimelineEvent[] {
  if (values.length < 2 || values.length > MAXIMUM_TIMELINE_EVENTS) {
    return false;
  }
  let previousTick = -1;
  for (const value of values) {
    if (
      !isTimelineEvent(value, result.completedTick) ||
      value.tick < previousTick
    ) {
      return false;
    }
    if (
      value.kind === 'battle_started' &&
      (value.tick !== 0 || value.battleId !== battleId)
    ) {
      return false;
    }
    if (
      value.kind === 'damage' &&
      value.targetHitPoints >
        result.fighters[value.targetFighter === 'a' ? 0 : 1].maxHitPoints
    ) {
      return false;
    }
    if (
      value.kind === 'battle_ended' &&
      (value.tick !== result.completedTick ||
        value.winner !== result.winner ||
        value.reason !== result.reason)
    ) {
      return false;
    }
    previousTick = value.tick;
  }
  const first = values[0];
  const last = values.at(-1);
  return (
    isRecord(first) &&
    first.kind === 'battle_started' &&
    first.tick === 0 &&
    first.battleId === battleId &&
    isRecord(last) &&
    last.kind === 'battle_ended' &&
    last.tick === result.completedTick
  );
}

/** Checks only the authoritative fields required by continuous replay. */
export function isUsableBattleTranscript(
  value: unknown
): value is BattleTranscript {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.tickRate !== COMBAT_TICK_RATE ||
    value.fixedPointScale !== FIXED_POINT_SCALE ||
    value.maxTicks !== COMBAT_MAXIMUM_TICKS ||
    !isNonEmptyText(value.battleId, 240) ||
    !isNonEmptyText(value.seed, 240) ||
    typeof value.eventsTruncated !== 'boolean' ||
    !Array.isArray(value.fighters) ||
    value.fighters.length !== 2 ||
    !Array.isArray(value.timeline) ||
    !Array.isArray(value.checkpoints)
  ) {
    return false;
  }

  const fighterA = value.fighters[0];
  const fighterB = value.fighters[1];
  if (
    !isTranscriptFighter(fighterA) ||
    !isTranscriptFighter(fighterB) ||
    !isRecord(fighterA) ||
    !isRecord(fighterB) ||
    typeof fighterA.id !== 'string' ||
    typeof fighterB.id !== 'string' ||
    fighterA.id === fighterB.id ||
    !transcriptResultIsUsable(value.result, fighterA.id, fighterB.id)
  ) {
    return false;
  }

  return (
    checkpointsAreUsable(
      value.checkpoints,
      value.result,
      fighterA.id,
      fighterB.id
    ) && timelineIsUsable(value.timeline, value.battleId, value.result)
  );
}

export function getUsableBattleTranscript(
  source: BattleReport | unknown
): BattleTranscript | undefined {
  const candidate =
    isRecord(source) && 'simulation' in source ? source.simulation : source;
  if (!isUsableBattleTranscript(candidate)) return undefined;
  if (!isRecord(source) || !('simulation' in source)) return candidate;

  return isRecord(source.a) &&
    isRecord(source.b) &&
    source.a.id === candidate.fighters[0].id &&
    source.b.id === candidate.fighters[1].id &&
    source.winner === candidate.result.winner
    ? candidate
    : undefined;
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function interpolateVector(
  start: FixedVector,
  end: FixedVector,
  progress: number
): ReplayVector {
  return {
    x: interpolate(start.x, end.x, progress),
    y: interpolate(start.y, end.y, progress),
  };
}

type MutableFighterReplayState = {
  hitPoints: number;
  barrierHitPoints: number;
  echoPosition: FixedVector | null;
};

type MutableReplayStatePair = [
  MutableFighterReplayState,
  MutableFighterReplayState,
];

function createFighterReplayState(
  checkpoint: FighterCheckpoint
): MutableFighterReplayState {
  return {
    hitPoints: checkpoint.hitPoints,
    barrierHitPoints: checkpoint.barrierHitPoints,
    echoPosition:
      checkpoint.echoPosition === null ? null : { ...checkpoint.echoPosition },
  };
}

function getFighterReplayState(
  states: MutableReplayStatePair,
  slot: FighterSlot
): MutableFighterReplayState {
  return states[slot === 'a' ? 0 : 1];
}

function calculateEventDrivenFighterStates(
  transcript: BattleTranscript,
  tick: number,
  baselineCheckpoint: BattleCheckpoint
): MutableReplayStatePair {
  const states: MutableReplayStatePair = [
    createFighterReplayState(baselineCheckpoint.fighters[0]),
    createFighterReplayState(baselineCheckpoint.fighters[1]),
  ];

  for (const event of transcript.timeline) {
    if (event.tick > tick) {
      break;
    }
    // Every checkpoint is captured after that tick's combat phases. Starting
    // from the nearest prior checkpoint keeps replay state authoritative even
    // when an event-dense fight reaches the bounded timeline cap.
    if (event.tick <= baselineCheckpoint.tick) {
      continue;
    }
    if (event.kind === 'damage') {
      getFighterReplayState(states, event.targetFighter).hitPoints =
        event.targetHitPoints;
    } else if (event.kind === 'barrier_created') {
      getFighterReplayState(states, event.actor).barrierHitPoints =
        event.hitPoints;
    } else if (event.kind === 'barrier_hit') {
      getFighterReplayState(states, event.actor).barrierHitPoints =
        event.remainingHitPoints;
    } else if (event.kind === 'barrier_broken') {
      getFighterReplayState(states, event.actor).barrierHitPoints = 0;
    } else if (event.kind === 'echo_created') {
      getFighterReplayState(states, event.actor).echoPosition = {
        ...event.position,
      };
    } else if (event.kind === 'echo_shattered') {
      getFighterReplayState(states, event.owner).echoPosition = null;
    } else if (event.kind === 'echo_fired') {
      getFighterReplayState(states, event.actor).echoPosition = null;
    }
  }

  return states;
}

function calculateEchoPosition(
  earlier: FixedVector | null,
  later: FixedVector | null,
  progress: number,
  authoritativePosition: FixedVector | null
): ReplayVector | null {
  if (authoritativePosition === null) {
    return null;
  }
  if (earlier !== null && later !== null) {
    return interpolateVector(earlier, later, progress);
  }
  return { ...authoritativePosition };
}

function findCheckpointPair(
  checkpoints: readonly BattleCheckpoint[],
  tick: number
): readonly [BattleCheckpoint, BattleCheckpoint] {
  const first = checkpoints[0];
  const last = checkpoints.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error('Continuous replay requires at least one checkpoint.');
  }
  if (tick <= first.tick) return [first, first];
  if (tick >= last.tick) return [last, last];

  let startIndex = 0;
  let endIndex = checkpoints.length - 1;
  while (startIndex <= endIndex) {
    const middleIndex = Math.floor((startIndex + endIndex) / 2);
    const checkpoint = checkpoints[middleIndex];
    if (checkpoint?.tick === tick) return [checkpoint, checkpoint];
    if (checkpoint !== undefined && checkpoint.tick < tick) {
      startIndex = middleIndex + 1;
    } else {
      endIndex = middleIndex - 1;
    }
  }

  const earlier = checkpoints[startIndex - 1];
  const later = checkpoints[startIndex];
  if (earlier === undefined || later === undefined) {
    throw new Error('Continuous replay could not bracket the requested tick.');
  }
  return [earlier, later];
}

function calculateFighterFrame(
  earlier: FighterCheckpoint,
  later: FighterCheckpoint,
  progress: number,
  eventDrivenState: MutableFighterReplayState
): ReplayFighterFrame {
  const discrete = progress >= 1 ? later : earlier;
  return {
    slot: earlier.slot,
    hitPoints: eventDrivenState.hitPoints,
    maxHitPoints: earlier.maxHitPoints,
    position: interpolateVector(earlier.position, later.position, progress),
    velocity: interpolateVector(earlier.velocity, later.velocity, progress),
    primaryPower: discrete.primaryPower,
    abilityPhase: discrete.abilityPhase,
    barrierHitPoints: eventDrivenState.barrierHitPoints,
    echoPosition: calculateEchoPosition(
      earlier.echoPosition,
      later.echoPosition,
      progress,
      eventDrivenState.echoPosition
    ),
  };
}

/** Interpolates movement while combat state changes on authoritative events. */
export function calculateReplayFrame(
  transcript: BattleTranscript,
  elapsedTick: number
): ReplayFrame {
  const completedTick = transcript.result.completedTick;
  const tick = Number.isNaN(elapsedTick)
    ? 0
    : Math.min(completedTick, Math.max(0, elapsedTick));
  const [earlier, later] = findCheckpointPair(transcript.checkpoints, tick);
  const tickDistance = later.tick - earlier.tick;
  const progress =
    tickDistance === 0 ? 0 : (tick - earlier.tick) / tickDistance;
  const fighterStates = calculateEventDrivenFighterStates(
    transcript,
    tick,
    earlier
  );

  return {
    tick,
    completedTick,
    fixedPointScale: transcript.fixedPointScale,
    arenaHalfWidth: interpolate(
      earlier.arenaHalfWidth,
      later.arenaHalfWidth,
      progress
    ),
    arenaHalfHeight: interpolate(
      earlier.arenaHalfHeight,
      later.arenaHalfHeight,
      progress
    ),
    fighters: [
      calculateFighterFrame(
        earlier.fighters[0],
        later.fighters[0],
        progress,
        fighterStates[0]
      ),
      calculateFighterFrame(
        earlier.fighters[1],
        later.fighters[1],
        progress,
        fighterStates[1]
      ),
    ],
  };
}

/** Returns events where startTick < event.tick <= endTick. */
export function getTimelineEventsInRange(
  transcript: BattleTranscript,
  startTick: number,
  endTick: number
): readonly BattleTimelineEvent[] {
  if (
    Number.isNaN(startTick) ||
    Number.isNaN(endTick) ||
    endTick <= startTick
  ) {
    return [];
  }
  return transcript.timeline.filter(
    (event) => event.tick > startTick && event.tick <= endTick
  );
}
