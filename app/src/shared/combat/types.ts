/**
 * Pure combat-domain types. Coordinates and velocities are fixed-point integers;
 * no renderer or transport types are allowed in this module.
 */

import type { Element } from '../elements';
import type { BattleArenaId } from '../battlearena';
import type { AccessoryEffectFamily } from '../accessoryeffects';
import type { GearRank } from '../arena';
import type { EquipmentCategory } from '../equipment';
import type { CombatUpgradeId } from './upgrades';
import type { PowerUpId } from './powerups';

export type FighterSlot = 'a' | 'b';

export type CombatElement = Element;

export type RawCombatStats = Readonly<{
  chonk: number;
  spike: number;
  zip: number;
  charm: number;
}>;

export type GearCombatModifiers = Readonly<{
  damagePermille: number;
  maximumHitPointsPermille: number;
  cooldownPermille: number;
  criticalChanceBonusPermille: number;
  telegraphTicksDelta: number;
  initialDelayTicksDelta: number;
}>;

export type GearCombatTechniqueSnapshot = Readonly<{
  category: EquipmentCategory;
  effectFamily: AccessoryEffectFamily;
  leadGearId: string;
  leadRank: GearRank;
  supportGearId: string | null;
  supportRank: GearRank | null;
}>;

export type GearCombatSnapshot = Readonly<{
  version: 1;
  techniques: readonly GearCombatTechniqueSnapshot[];
  modifiers: GearCombatModifiers;
}>;

export type DominantStat = keyof RawCombatStats;

export type PrimaryPower = 'inkquake' | 'nib_halo' | 'smearstep' | 'colorburst';

// Gunner is retained only so archived v4-v6 reports can still be parsed.
// Every newly analyzed or simulated Scribbit resolves to one of the three
// current roles below.
export type CombatRole = 'brawler' | 'longshot' | 'gunner' | 'mage';
export type CurrentCombatRole = Exclude<CombatRole, 'gunner'>;

export type FixedVector = Readonly<{
  x: number;
  y: number;
}>;

export type CombatFighterInput = Readonly<{
  id: string;
  name: string;
  stats: RawCombatStats;
  // The active v5 combat build. The simulator freezes an empty build when the
  // caller has not earned a Power-Up yet.
  powerUpIds?: readonly PowerUpId[];
  // Legacy-only transcript fields. Newly simulated fights ignore and omit
  // these so archived v1-v4 battles can remain readable without preserving
  // Element or Ink Mod behavior in the live ruleset.
  element?: CombatElement;
  upgrades?: readonly CombatUpgradeId[];
  // Server-owned daily forecast + capped level bonus. It changes damage only,
  // never the drawing-selected power, body, movement, or collision geometry.
  damageModifierPermille?: number;
  // Server-resolved from the frozen Scribbit loadout. Raw drawing stats remain
  // untouched so Gear cannot change role selection or the 100-point rule.
  gear?: GearCombatSnapshot;
}>;

export type CombatSimulationInput = Readonly<{
  seed: string | number;
  battleArenaId?: BattleArenaId;
  fighters: readonly [CombatFighterInput, CombatFighterInput];
}>;

export type AbilityPhase = 'cooldown' | 'telegraph' | 'active';

export type DamageSource =
  | PrimaryPower
  | 'brawler_slam'
  | 'longshot_quill'
  | 'gunner_shot'
  | 'mage_bolt'
  | 'colorburst_echo'
  | 'contact'
  | 'ember_burn'
  | 'power_up'
  | 'nib_wall_recoil';

export type BattleEndReason =
  | 'knockout'
  | 'double_knockout'
  | 'timeout_hp_percentage'
  | 'timeout_damage_dealt'
  | 'timeout_stable_tiebreak';

export type CombatPhase =
  | 'arena_rules'
  | 'ability_transitions'
  | 'movement'
  | 'wall_constraints'
  | 'fighter_collision'
  | 'role_attacks'
  | 'ability_collisions'
  | 'status_effects'
  | 'ink_pressure'
  | 'defeat_resolution'
  | 'checkpoint';

export type BattleTimelineEvent =
  | Readonly<{
      tick: number;
      kind: 'battle_started';
      battleId: string;
    }>
  | Readonly<{
      tick: number;
      kind: 'arena_shrink_started';
      targetHalfWidth: number;
      targetHalfHeight: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'late_fight_started';
      cooldownMultiplierPermille: number;
      defenseTicks: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'ability_telegraphed';
      actor: FighterSlot;
      power: PrimaryPower;
      activationNumber: number;
      origin: FixedVector;
      aimDirection: FixedVector;
      activatesAtTick: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'ability_activated';
      actor: FighterSlot;
      power: PrimaryPower;
      activationNumber: number;
      activeUntilTick: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'ability_finished';
      actor: FighterSlot;
      power: PrimaryPower;
      activationNumber: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'ability_interrupted';
      actor: FighterSlot;
      interruptedBy: FighterSlot;
      power: PrimaryPower;
      activationNumber: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'role_attack';
      actor: FighterSlot;
      role: CombatRole;
      attack:
        | 'body_slam'
        | 'piercing_quill'
        | 'ink_shot'
        | 'color_bolt'
        | 'nib_volley'
        | 'smearstep_barrage';
      attackNumber: number;
      shotNumber: number;
      origin: FixedVector;
      target: FixedVector;
      hit: boolean;
    }>
  | Readonly<{
      tick: number;
      kind: 'damage';
      sourceFighter: FighterSlot;
      targetFighter: FighterSlot;
      source: DamageSource;
      amount: number;
      targetHitPoints: number;
      critical: boolean;
      position: FixedVector;
    }>
  | Readonly<{
      tick: number;
      kind: 'healing';
      actor: FighterSlot;
      source: 'power_up';
      powerUpId: PowerUpId;
      amount: number;
      targetHitPoints: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'burn_applied';
      sourceFighter: FighterSlot;
      targetFighter: FighterSlot;
      remainingCappedDamage: number;
      nextPulseTick: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'barrier_created';
      actor: FighterSlot;
      hitPoints: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'barrier_hit';
      actor: FighterSlot;
      sourceFighter?: FighterSlot;
      source?: DamageSource;
      sourceActivationNumber?: number;
      absorbedDamage: number;
      remainingHitPoints: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'barrier_broken';
      actor: FighterSlot;
    }>
  | Readonly<{
      tick: number;
      kind: 'wall_bounce';
      actor: FighterSlot;
      axis: 'x' | 'y' | 'both';
      position: FixedVector;
    }>
  | Readonly<{
      tick: number;
      kind: 'nib_wall_ejection';
      actor: FighterSlot;
      selfDamage: number;
      position: FixedVector;
    }>
  | Readonly<{
      tick: number;
      kind: 'fighter_collision';
      position: FixedVector;
    }>
  | Readonly<{
      tick: number;
      kind: 'echo_created';
      actor: FighterSlot;
      position: FixedVector;
      aimDirection: FixedVector;
      firesAtTick: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'echo_shattered';
      owner: FighterSlot;
      shatteredBy: FighterSlot;
      position: FixedVector;
    }>
  | Readonly<{
      tick: number;
      kind: 'echo_fired';
      actor: FighterSlot;
      position: FixedVector;
      aimDirection: FixedVector;
    }>
  | Readonly<{
      tick: number;
      kind: 'ink_pressure';
      actor: FighterSlot;
      refreshedImmediately: boolean;
    }>
  | Readonly<{
      tick: number;
      kind: 'power_up_triggered';
      actor: FighterSlot;
      powerUpId: PowerUpId;
      target?: FighterSlot;
      bonusDamage?: number;
    }>
  | Readonly<{
      tick: number;
      kind: 'fighter_defeated';
      actor: FighterSlot;
    }>
  | Readonly<{
      tick: number;
      kind: 'battle_ended';
      winner: FighterSlot;
      reason: BattleEndReason;
    }>;

export type FighterCheckpoint = Readonly<{
  slot: FighterSlot;
  combatRole?: CombatRole;
  hitPoints: number;
  maxHitPoints: number;
  position: FixedVector;
  velocity: FixedVector;
  primaryPower: PrimaryPower;
  abilityPhase: AbilityPhase;
  barrierHitPoints: number;
  echoPosition: FixedVector | null;
}>;

export type BattleCheckpoint = Readonly<{
  tick: number;
  arenaHalfWidth: number;
  arenaHalfHeight: number;
  fighters: readonly [FighterCheckpoint, FighterCheckpoint];
}>;

export type FighterResult = Readonly<{
  slot: FighterSlot;
  id: string;
  finalHitPoints: number;
  maxHitPoints: number;
  hitPointPermille: number;
  damageDealt: number;
  primaryPower: PrimaryPower;
  combatRole?: CombatRole;
  inkPressureUsed: boolean;
}>;

export type AuthoritativeBattleResult = Readonly<{
  winner: FighterSlot;
  loser: FighterSlot;
  reason: BattleEndReason;
  completedTick: number;
  completedMilliseconds: number;
  fighters: readonly [FighterResult, FighterResult];
}>;

export type BattleTranscript = Readonly<{
  version: number;
  battleId: string;
  seed: string;
  tickRate: number;
  fixedPointScale: number;
  maxTicks: number;
  fighters: readonly [CombatFighterInput, CombatFighterInput];
  timeline: readonly BattleTimelineEvent[];
  checkpoints: readonly BattleCheckpoint[];
  result: AuthoritativeBattleResult;
  eventsTruncated: boolean;
}>;

type AbilityConfigBase = Readonly<{
  power: PrimaryPower;
  displayName: string;
  dominantStat: DominantStat;
  telegraphTicks: number;
  activeTicks: number;
  cooldownTicks: number;
}>;

export type InkquakeAbilityConfig = AbilityConfigBase &
  Readonly<{
    power: 'inkquake';
    startingRadius: number;
    endingRadius: number;
    waveThickness: number;
    baseDamage: number;
    chonkDamageDivisor: number;
    knockbackSpeed: number;
  }>;

export type NibHaloAbilityConfig = AbilityConfigBase &
  Readonly<{
    power: 'nib_halo';
    nibCount: 3;
    orbitRadius: number;
    nibRadius: number;
    innerDeadZoneRadius: number;
    orbitTableStepsPerTick: number;
    targetRehitLockTicks: number;
    baseDamage: number;
    spikeDamageDivisor: number;
    targetMaxHitPointDamageDivisor: number;
    areaDamageReductionPermille: number;
    wallRiskLockTicks: number;
    wallEjectionSpeed: number;
    wallSelfDamage: number;
  }>;

export type SmearstepAbilityConfig = AbilityConfigBase &
  Readonly<{
    power: 'smearstep';
    dashCount: 2;
    dashTicks: number;
    pauseTicks: number;
    predictionTicks: number;
    overshootDistance: number;
    dashSpeed: number;
    collisionRadiusBonus: number;
    baseDamage: number;
    zipDamageDivisor: number;
  }>;

export type ColorburstAbilityConfig = AbilityConfigBase &
  Readonly<{
    power: 'colorburst';
    coneRange: number;
    coneHalfAngleCosinePermille: number;
    baseDamage: number;
    charmDamageDivisor: number;
    echoDelayTicks: number;
    echoLifetimeTicks: number;
    echoDamagePermille: number;
    echoRadius: number;
    echoOffsetDistance: number;
  }>;

export type AbilityConfigByPower = Readonly<{
  inkquake: InkquakeAbilityConfig;
  nib_halo: NibHaloAbilityConfig;
  smearstep: SmearstepAbilityConfig;
  colorburst: ColorburstAbilityConfig;
}>;

export type ElementPayloadConfig = Readonly<{
  ember: Readonly<{
    pulseDamage: number;
    pulseIntervalTicks: number;
    maximumDamagePerApplication: number;
    maximumDamagePerFight: number;
  }>;
  tide: Readonly<{
    knockbackSpeed: number;
  }>;
  moss: Readonly<{
    barrierHitPoints: number;
  }>;
  storm: Readonly<{
    telegraphReductionTicks: number;
  }>;
}>;

export type CombatRules = Readonly<{
  version: number;
  tickRate: number;
  maximumSeconds: number;
  maximumTicks: number;
  fixedPointScale: number;
  maximumEntityCount: number;
  maximumEventCount: number;
  maximumCheckpointCount: number;
  checkpointIntervalTicks: number;
  arena: Readonly<{
    startingHalfWidth: number;
    startingHalfHeight: number;
    finalHalfWidth: number;
    finalHalfHeight: number;
    shrinkStartsAtTick: number;
  }>;
  lateFight: Readonly<{
    startsAtTick: number;
    cooldownMultiplierPermille: number;
    normalDefenseTicks: number;
    shortenedDefenseTicks: number;
  }>;
  inkPressure: Readonly<{
    lostHitPointPercentage: number;
  }>;
  fighter: Readonly<{
    baseHitPoints: number;
    hitPointsPerChonk: number;
    baseRadius: number;
    radiusPerChonk: number;
    baseMovementPerTick: number;
    movementPerZip: number;
    maximumVelocityPerAxis: number;
    startingHorizontalOffset: number;
    steeringIntervalTicks: number;
    steeringStrength: number;
    contactCooldownTicks: number;
    contactBaseDamage: number;
    contactSpikeDivisor: number;
    knockoutsEnabledAtTick: number;
    criticalChancePermillePerCharm: number;
    maximumCriticalChancePermille: number;
    criticalDamageMultiplierPermille: number;
    minimumDamageVariancePermille: number;
    maximumDamageVariancePermille: number;
    initialAbilityDelayMinimumTicks: number;
    initialAbilityDelayRangeTicks: number;
  }>;
  abilities: AbilityConfigByPower;
  elements: ElementPayloadConfig;
}>;
