import type {
  AbilityConfigByPower,
  CombatPhase,
  CombatRules,
  DominantStat,
  PrimaryPower,
} from './types';

export const COMBAT_TICK_RATE = 20;
export const COMBAT_MAXIMUM_SECONDS = 25;
export const COMBAT_MAXIMUM_TICKS =
  COMBAT_TICK_RATE * COMBAT_MAXIMUM_SECONDS;
export const FIXED_POINT_SCALE = 100;
export const MAXIMUM_COMBAT_ENTITIES = 4;
export const MAXIMUM_TIMELINE_EVENTS = 384;
// Tick 0 plus every 10 ticks through tick 500 is exactly 51 checkpoints.
export const MAXIMUM_CHECKPOINTS = 51;

/**
 * Every tick executes this exact order. The frozen tuple is both documentation
 * and a guard against inserting a phase in only one code path.
 */
export const COMBAT_PHASE_ORDER: readonly CombatPhase[] = Object.freeze([
  'arena_rules',
  'ability_transitions',
  'movement',
  'wall_constraints',
  'fighter_collision',
  'ability_collisions',
  'status_effects',
  'ink_pressure',
  'defeat_resolution',
  'checkpoint',
]);

export const DOMINANT_STAT_TIE_ORDER: readonly DominantStat[] = Object.freeze([
  'chonk',
  'spike',
  'zip',
  'charm',
]);

export const PRIMARY_POWER_BY_DOMINANT_STAT: Readonly<
  Record<DominantStat, PrimaryPower>
> = Object.freeze({
  chonk: 'inkquake',
  spike: 'nib_halo',
  zip: 'smearstep',
  charm: 'colorburst',
});

const abilityConfigByPower: AbilityConfigByPower = Object.freeze({
  inkquake: Object.freeze({
    power: 'inkquake',
    displayName: 'Inkquake',
    dominantStat: 'chonk',
    telegraphTicks: 10,
    activeTicks: 14,
    cooldownTicks: 72,
    startingRadius: 500,
    endingRadius: 4_900,
    waveThickness: 700,
    baseDamage: 17,
    chonkDamageDivisor: 2,
    knockbackSpeed: 310,
    softCounterNotes: Object.freeze([
      'The expanding ring can be crossed before it reaches full radius.',
      'The wave clears fragile echoes but its fixed origin can be outrun.',
    ]),
  }),
  nib_halo: Object.freeze({
    power: 'nib_halo',
    displayName: 'Nib Halo',
    dominantStat: 'spike',
    telegraphTicks: 8,
    activeTicks: 36,
    cooldownTicks: 72,
    nibCount: 3,
    orbitRadius: 2_100,
    nibRadius: 460,
    innerDeadZoneRadius: 850,
    orbitTableStepsPerTick: 1,
    targetRehitLockTicks: 8,
    baseDamage: 19,
    spikeDamageDivisor: 5,
    targetMaxHitPointDamageDivisor: 12,
    areaDamageReductionPermille: 350,
    wallRiskLockTicks: 12,
    wallEjectionSpeed: 360,
    wallSelfDamage: 3,
    softCounterNotes: Object.freeze([
      'The center is a real dead zone that a close-range fighter can occupy.',
      'Nib impacts include a small max-HP cut, making slow tanks easier to shred.',
      'Active nibs intercept part of broad shockwave and cone damage.',
      'Orbiting near a wall ejects and damages the halo owner.',
    ]),
  }),
  smearstep: Object.freeze({
    power: 'smearstep',
    displayName: 'Smearstep',
    dominantStat: 'zip',
    telegraphTicks: 7,
    activeTicks: 14,
    cooldownTicks: 68,
    dashCount: 2,
    dashTicks: 5,
    pauseTicks: 4,
    predictionTicks: 5,
    overshootDistance: 1_100,
    dashSpeed: 760,
    collisionRadiusBonus: 220,
    baseDamage: 21,
    zipDamageDivisor: 4,
    softCounterNotes: Object.freeze([
      'Each dash predicts current motion, so a wall bounce can spoil its line.',
      'Overshoot dives through a halo but can finish inside a cone or wall.',
    ]),
  }),
  colorburst: Object.freeze({
    power: 'colorburst',
    displayName: 'Colorburst',
    dominantStat: 'charm',
    telegraphTicks: 11,
    activeTicks: 2,
    cooldownTicks: 76,
    coneRange: 5_300,
    coneHalfAngleCosinePermille: 819,
    baseDamage: 26,
    charmDamageDivisor: 3,
    echoDelayTicks: 8,
    echoLifetimeTicks: 13,
    echoDamagePermille: 550,
    echoRadius: 360,
    echoOffsetDistance: 900,
    softCounterNotes: Object.freeze([
      'The cone direction locks during its telegraph and can be sidestepped.',
      'The single delayed echo has one hit point and shatters on contact.',
    ]),
  }),
});

export const DEFAULT_COMBAT_RULES: CombatRules = Object.freeze({
  version: 1,
  tickRate: COMBAT_TICK_RATE,
  maximumSeconds: COMBAT_MAXIMUM_SECONDS,
  maximumTicks: COMBAT_MAXIMUM_TICKS,
  fixedPointScale: FIXED_POINT_SCALE,
  maximumEntityCount: MAXIMUM_COMBAT_ENTITIES,
  maximumEventCount: MAXIMUM_TIMELINE_EVENTS,
  maximumCheckpointCount: MAXIMUM_CHECKPOINTS,
  checkpointIntervalTicks: 10,
  arena: Object.freeze({
    startingHalfWidth: 8_000,
    startingHalfHeight: 5_000,
    finalHalfWidth: 6_200,
    finalHalfHeight: 3_800,
    shrinkStartsAtTick: 14 * COMBAT_TICK_RATE,
  }),
  lateFight: Object.freeze({
    startsAtTick: 18 * COMBAT_TICK_RATE,
    cooldownMultiplierPermille: 750,
    normalDefenseTicks: 5,
    shortenedDefenseTicks: 2,
  }),
  inkPressure: Object.freeze({
    lostHitPointPercentage: 45,
  }),
  fighter: Object.freeze({
    baseHitPoints: 170,
    hitPointsPerChonk: 1,
    baseRadius: 430,
    radiusPerChonk: 4,
    baseMovementPerTick: 88,
    movementPerZip: 2,
    maximumVelocityPerAxis: 900,
    startingHorizontalOffset: 3_200,
    steeringIntervalTicks: 12,
    steeringStrength: 25,
    contactCooldownTicks: 16,
    contactBaseDamage: 6,
    contactSpikeDivisor: 8,
    // The replay has roughly two seconds of entrance/FIGHT ceremony. Fresh ink
    // cannot fully fold before tick 260, keeping the visible match in the
    // intended 15-25 second band without changing who dealt the damage.
    knockoutsEnabledAtTick: 13 * COMBAT_TICK_RATE,
    criticalChancePermillePerCharm: 2,
    maximumCriticalChancePermille: 180,
    criticalDamageMultiplierPermille: 1_500,
    minimumDamageVariancePermille: 950,
    maximumDamageVariancePermille: 1_050,
    initialAbilityDelayMinimumTicks: 18,
    initialAbilityDelayRangeTicks: 13,
  }),
  abilities: abilityConfigByPower,
  elements: Object.freeze({
    ember: Object.freeze({
      pulseDamage: 2,
      pulseIntervalTicks: 8,
      maximumDamagePerApplication: 6,
      maximumDamagePerFight: 10,
    }),
    tide: Object.freeze({
      knockbackSpeed: 80,
    }),
    moss: Object.freeze({
      barrierHitPoints: 14,
    }),
    storm: Object.freeze({
      telegraphReductionTicks: 1,
    }),
  }),
});

export const ABILITY_CONFIG_BY_POWER = DEFAULT_COMBAT_RULES.abilities;
export const ELEMENT_PAYLOAD_CONFIG = DEFAULT_COMBAT_RULES.elements;
