import type { BattleReport } from '../../shared/arena';
import { parseBattleTranscript } from '../../shared/combat/transcriptvalidation';
import type {
  AbilityPhase,
  BattleCheckpoint,
  BattleTimelineEvent,
  BattleTranscript,
  FighterCheckpoint,
  FighterSlot,
  FixedVector,
  PrimaryPower,
} from '../../shared/combat/types';

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** Adds report-envelope identity checks to the shared transcript parser. */
export function getUsableBattleTranscript(
  source: BattleReport | unknown
): BattleTranscript | undefined {
  const candidate =
    isRecord(source) && 'simulation' in source ? source.simulation : source;
  const transcript = parseBattleTranscript(candidate);
  if (!transcript) return undefined;
  if (!isRecord(source) || !('simulation' in source)) return transcript;

  return isRecord(source.a) &&
    isRecord(source.b) &&
    source.a.id === transcript.fighters[0].id &&
    source.b.id === transcript.fighters[1].id &&
    source.winner === transcript.result.winner
    ? transcript
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
  abilityPhase: AbilityPhase;
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
    abilityPhase: checkpoint.abilityPhase,
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

  // Checkpoints are captured after that tick's combat phases. Binary-searching
  // the ordered event stream avoids rescanning the entire replay every frame.
  const firstEventIndex = findFirstEventIndexAfterTick(
    transcript.timeline,
    baselineCheckpoint.tick
  );
  const finalEventIndex = findFirstEventIndexAfterTick(
    transcript.timeline,
    tick
  );
  for (let index = firstEventIndex; index < finalEventIndex; index += 1) {
    const event = transcript.timeline[index];
    if (!event) continue;
    if (event.kind === 'damage') {
      getFighterReplayState(states, event.targetFighter).hitPoints =
        event.targetHitPoints;
    } else if (event.kind === 'ability_telegraphed') {
      getFighterReplayState(states, event.actor).abilityPhase = 'telegraph';
    } else if (event.kind === 'ability_activated') {
      getFighterReplayState(states, event.actor).abilityPhase = 'active';
    } else if (event.kind === 'ability_finished') {
      getFighterReplayState(states, event.actor).abilityPhase = 'cooldown';
    } else if (event.kind === 'ability_interrupted') {
      getFighterReplayState(states, event.actor).abilityPhase = 'cooldown';
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

function findFirstEventIndexAfterTick(
  timeline: readonly BattleTimelineEvent[],
  tick: number
): number {
  let startIndex = 0;
  let endIndex = timeline.length;
  while (startIndex < endIndex) {
    const middleIndex = Math.floor((startIndex + endIndex) / 2);
    const event = timeline[middleIndex];
    if (event && event.tick <= tick) {
      startIndex = middleIndex + 1;
    } else {
      endIndex = middleIndex;
    }
  }
  return startIndex;
}

function calculateEchoPosition(
  earlier: FixedVector | null,
  later: FixedVector | null,
  progress: number,
  authoritativePosition: FixedVector | null
): ReplayVector | null {
  if (authoritativePosition === null) return null;
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
  return {
    slot: earlier.slot,
    hitPoints: eventDrivenState.hitPoints,
    maxHitPoints: earlier.maxHitPoints,
    position: interpolateVector(earlier.position, later.position, progress),
    velocity: interpolateVector(earlier.velocity, later.velocity, progress),
    primaryPower: earlier.primaryPower,
    abilityPhase: eventDrivenState.abilityPhase,
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
  const firstEventIndex = findFirstEventIndexAfterTick(
    transcript.timeline,
    startTick
  );
  const finalEventIndex = findFirstEventIndexAfterTick(
    transcript.timeline,
    endTick
  );
  return transcript.timeline.slice(firstEventIndex, finalEventIndex);
}
