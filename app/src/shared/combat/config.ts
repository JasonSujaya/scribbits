import type {
  AbilityConfigByPower,
  CombatPhase,
  CombatRules,
  DominantStat,
  PrimaryPower,
} from './types';
import { SHAPE_POWER_CONTENT_BY_POWER } from './shapepowercontent';
import { SCRIBBIT_STAT_KEYS } from '../arena';

export const COMBAT_TICK_RATE = 20;
export const COMBAT_MAXIMUM_SECONDS = 20;
export const COMBAT_MAXIMUM_TICKS = COMBAT_TICK_RATE * COMBAT_MAXIMUM_SECONDS;
export const FIXED_POINT_SCALE = 100;
export const MAXIMUM_COMBAT_ENTITIES = 4;
export const MAXIMUM_TIMELINE_EVENTS = 384;
// Tick 0 plus every 10 ticks through tick 400 is exactly 41 checkpoints.
export const MAXIMUM_CHECKPOINTS = 41;

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

export const DOMINANT_STAT_TIE_ORDER: readonly DominantStat[] =
  SCRIBBIT_STAT_KEYS;

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
    displayName: SHAPE_POWER_CONTENT_BY_POWER.inkquake.displayName,
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
  }),
  nib_halo: Object.freeze({
    power: 'nib_halo',
    displayName: SHAPE_POWER_CONTENT_BY_POWER.nib_halo.displayName,
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
  }),
  smearstep: Object.freeze({
    power: 'smearstep',
    displayName: SHAPE_POWER_CONTENT_BY_POWER.smearstep.displayName,
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
  }),
  colorburst: Object.freeze({
    power: 'colorburst',
    displayName: SHAPE_POWER_CONTENT_BY_POWER.colorburst.displayName,
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
  }),
});

export const DEFAULT_COMBAT_RULES: CombatRules = Object.freeze({
  version: 2,
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
    finalHalfWidth: 5_000,
    finalHalfHeight: 3_000,
    shrinkStartsAtTick: 14 * COMBAT_TICK_RATE,
  }),
  lateFight: Object.freeze({
    startsAtTick: 15 * COMBAT_TICK_RATE,
    cooldownMultiplierPermille: 500,
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
    // intended 15-20 second band without changing who dealt the damage.
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
