import type { BattleReport } from '../../shared/arena';
import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_TICK_RATE,
  FIXED_POINT_SCALE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_TIMELINE_EVENTS,
} from '../../shared/combat/config';
import type {
  AbilityPhase,
  BattleCheckpoint,
  BattleTimelineEvent,
  BattleTranscript,
  FighterCheckpoint,
  FighterSlot,
  FixedVector,
  PrimaryPower,
} from '../../shared/combat';

const MAXIMUM_REPLAY_VALUE = 1_000_000;
const MAXIMUM_CHECKPOINT_GAP = COMBAT_TICK_RATE / 2;
const TIMELINE_EVENT_KINDS: ReadonlySet<unknown> = new Set([
  'battle_started',
  'arena_shrink_started',
  'late_fight_started',
  'ability_telegraphed',
  'ability_activated',
  'ability_finished',
  'damage',
  'burn_applied',
  'barrier_created',
  'barrier_hit',
  'barrier_broken',
  'wall_bounce',
  'nib_wall_ejection',
  'fighter_collision',
  'echo_created',
  'echo_shattered',
  'echo_fired',
  'ink_pressure',
  'fighter_defeated',
  'battle_ended',
]);

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

function isNonEmptyText(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
}

function isFighterSlot(value: unknown): value is FighterSlot {
  return value === 'a' || value === 'b';
}

function isPrimaryPower(value: unknown): value is PrimaryPower {
  return (
    value === 'inkquake' ||
    value === 'nib_halo' ||
    value === 'smearstep' ||
    value === 'colorburst'
  );
}

function isAbilityPhase(value: unknown): value is AbilityPhase {
  return value === 'cooldown' || value === 'telegraph' || value === 'active';
}

function isVector(value: unknown): value is FixedVector {
  return (
    isRecord(value) &&
    isBoundedInteger(value.x, -MAXIMUM_REPLAY_VALUE, MAXIMUM_REPLAY_VALUE) &&
    isBoundedInteger(value.y, -MAXIMUM_REPLAY_VALUE, MAXIMUM_REPLAY_VALUE)
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
    isPrimaryPower(value.primaryPower) &&
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
    isPrimaryPower(value.primaryPower) &&
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
  return (
    isFighterSlot(value.winner) &&
    isFighterSlot(value.loser) &&
    value.winner !== value.loser &&
    typeof value.reason === 'string' &&
    isBoundedInteger(value.completedTick, 1, COMBAT_MAXIMUM_TICKS) &&
    value.completedMilliseconds ===
      Math.floor((value.completedTick * 1_000) / COMBAT_TICK_RATE) &&
    value.fighters.length === 2 &&
    isResultFighter(value.fighters[0], 'a', fighterAId) &&
    isResultFighter(value.fighters[1], 'b', fighterBId)
  );
}

function checkpointsAreUsable(
  values: readonly unknown[],
  completedTick: number
): values is readonly BattleCheckpoint[] {
  const first = values[0];
  const last = values.at(-1);
  if (
    values.length < 2 ||
    values.length > MAXIMUM_CHECKPOINTS ||
    !isCheckpoint(first) ||
    first.tick !== 0 ||
    !isCheckpoint(last) ||
    last.tick !== completedTick
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
  return true;
}

function timelineIsUsable(
  values: readonly unknown[],
  battleId: string,
  completedTick: number
): values is readonly BattleTimelineEvent[] {
  if (values.length < 2 || values.length > MAXIMUM_TIMELINE_EVENTS) {
    return false;
  }
  let previousTick = -1;
  for (const value of values) {
    if (
      !isRecord(value) ||
      !isBoundedInteger(value.tick, 0, completedTick) ||
      !TIMELINE_EVENT_KINDS.has(value.kind) ||
      value.tick < previousTick
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
    last.tick === completedTick
  );
}

/** Checks only the authoritative fields required by continuous replay. */
export function isUsableBattleTranscript(value: unknown): value is BattleTranscript {
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
    checkpointsAreUsable(value.checkpoints, value.result.completedTick) &&
    timelineIsUsable(value.timeline, value.battleId, value.result.completedTick)
  );
}

export function getUsableBattleTranscript(
  source: BattleReport | unknown
): BattleTranscript | undefined {
  const candidate =
    isRecord(source) && 'simulation' in source ? source.simulation : source;
  return isUsableBattleTranscript(candidate) ? candidate : undefined;
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

function interpolateEcho(
  start: FixedVector | null,
  end: FixedVector | null,
  progress: number
): ReplayVector | null {
  if (start !== null && end !== null) {
    return interpolateVector(start, end, progress);
  }
  const current = progress >= 1 ? end : start;
  return current === null ? null : { ...current };
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
  progress: number
): ReplayFighterFrame {
  const discrete = progress >= 1 ? later : earlier;
  return {
    slot: earlier.slot,
    hitPoints: interpolate(earlier.hitPoints, later.hitPoints, progress),
    maxHitPoints: earlier.maxHitPoints,
    position: interpolateVector(earlier.position, later.position, progress),
    velocity: interpolateVector(earlier.velocity, later.velocity, progress),
    primaryPower: discrete.primaryPower,
    abilityPhase: discrete.abilityPhase,
    barrierHitPoints: interpolate(
      earlier.barrierHitPoints,
      later.barrierHitPoints,
      progress
    ),
    echoPosition: interpolateEcho(
      earlier.echoPosition,
      later.echoPosition,
      progress
    ),
  };
}

/** Interpolates continuous values; power and phase change only at checkpoints. */
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
  const progress = tickDistance === 0 ? 0 : (tick - earlier.tick) / tickDistance;

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
      calculateFighterFrame(earlier.fighters[0], later.fighters[0], progress),
      calculateFighterFrame(earlier.fighters[1], later.fighters[1], progress),
    ],
  };
}

/** Returns events where startTick < event.tick <= endTick. */
export function getTimelineEventsInRange(
  transcript: BattleTranscript,
  startTick: number,
  endTick: number
): readonly BattleTimelineEvent[] {
  if (Number.isNaN(startTick) || Number.isNaN(endTick) || endTick <= startTick) {
    return [];
  }
  return transcript.timeline.filter(
    (event) => event.tick > startTick && event.tick <= endTick
  );
}
