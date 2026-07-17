// One browser-safe runtime contract for authoritative combat transcripts.
// Storage and Replay both fail closed through this parser before trusting data.

import { isElement } from '../elements';
import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_TICK_RATE,
  FIXED_POINT_SCALE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_TIMELINE_EVENTS,
} from './config';
import { battleResultFinishIsConsistent } from './resultvalidation';
import { isGearCombatSnapshot } from './gearsnapshot';
import { isShapePowerId } from './shapepowercontent';
import { isCombatRole, isCurrentCombatRole } from './roles';
import { selectCombatRole, selectLegacyCombatRole } from './selection';
import { isCombatUpgradeId, MAXIMUM_COMBAT_UPGRADES } from './upgrades';
import { isPowerUpId, validatePowerUpBuild } from './powerups';
import {
  isSupportedBattleTranscriptVersion,
  type SupportedBattleTranscriptVersion,
} from './transcriptversion';
import type {
  AbilityPhase,
  BattleCheckpoint,
  BattleEndReason,
  BattleTimelineEvent,
  BattleTranscript,
  DamageSource,
  FighterCheckpoint,
  FighterResult,
  FighterSlot,
  FixedVector,
  PaintZoneCheckpoint,
  ProjectileCheckpoint,
} from './types';

const MAXIMUM_TRANSCRIPT_VALUE = 1_000_000;
type TranscriptVersion = SupportedBattleTranscriptVersion;
type LegacyTranscriptVersion = Extract<TranscriptVersion, 1 | 2 | 3 | 4>;
const MAXIMUM_CHECKPOINT_GAP = COMBAT_TICK_RATE / 2;
// A battle may end while a persistent projectile or paint zone still points a
// short distance beyond the final simulation tick. Ability schedules remain
// capped at two seconds so malformed replays cannot park combat indefinitely.
const MAXIMUM_SCHEDULE_AHEAD_TICKS = COMBAT_TICK_RATE * 4;
const MAXIMUM_ABILITY_SCHEDULE_AHEAD_TICKS = COMBAT_TICK_RATE * 2;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBoundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number
): value is number => {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
};

const isNonEmptyText = (
  value: unknown,
  maximumLength: number
): value is string => {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
};

const isFighterSlot = (value: unknown): value is FighterSlot => {
  return value === 'a' || value === 'b';
};

const isAbilityPhase = (value: unknown): value is AbilityPhase => {
  return value === 'cooldown' || value === 'telegraph' || value === 'active';
};

const isBattleEndReason = (value: unknown): value is BattleEndReason => {
  return (
    value === 'knockout' ||
    value === 'double_knockout' ||
    value === 'timeout_hp_percentage' ||
    value === 'timeout_damage_dealt' ||
    value === 'timeout_stable_tiebreak'
  );
};

const isDamageSource = (value: unknown): value is DamageSource => {
  return (
    isShapePowerId(value) ||
    value === 'colorburst_echo' ||
    value === 'brawler_slam' ||
    value === 'longshot_quill' ||
    value === 'gunner_shot' ||
    value === 'mage_bolt' ||
    value === 'paint_zone' ||
    value === 'contact' ||
    value === 'ember_burn' ||
    value === 'power_up' ||
    value === 'nib_wall_recoil'
  );
};

const isCurrentPrimaryPower = (value: unknown): boolean => {
  return value === 'inkquake' || value === 'nib_halo' || value === 'colorburst';
};

const combatRoleIsUsable = (
  value: unknown,
  version: TranscriptVersion
): boolean => {
  return version >= 7 ? isCurrentCombatRole(value) : isCombatRole(value);
};

const isVector = (value: unknown): value is FixedVector => {
  return (
    isRecord(value) &&
    isBoundedInteger(
      value.x,
      -MAXIMUM_TRANSCRIPT_VALUE,
      MAXIMUM_TRANSCRIPT_VALUE
    ) &&
    isBoundedInteger(
      value.y,
      -MAXIMUM_TRANSCRIPT_VALUE,
      MAXIMUM_TRANSCRIPT_VALUE
    )
  );
};

const isScheduledTick = (
  value: unknown,
  eventTick: unknown,
  maximumAheadTicks = MAXIMUM_SCHEDULE_AHEAD_TICKS
): value is number => {
  return (
    isBoundedInteger(eventTick, 0, COMBAT_MAXIMUM_TICKS) &&
    isBoundedInteger(
      value,
      eventTick,
      Math.min(MAXIMUM_TRANSCRIPT_VALUE, eventTick + maximumAheadTicks)
    )
  );
};

const barrierHitSourceMetadataIsUsable = (
  value: Record<string, unknown>
): boolean => {
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
      isBoundedInteger(
        value.sourceActivationNumber,
        0,
        MAXIMUM_TRANSCRIPT_VALUE
      ))
  );
};

type TimelineEventFieldValidator = (value: Record<string, unknown>) => boolean;

const TIMELINE_EVENT_FIELD_VALIDATORS = {
  battle_started: (value) => isNonEmptyText(value.battleId, 240),
  arena_shrink_started: (value) =>
    isBoundedInteger(value.targetHalfWidth, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.targetHalfHeight, 1, MAXIMUM_TRANSCRIPT_VALUE),
  late_fight_started: (value) =>
    isBoundedInteger(value.cooldownMultiplierPermille, 1, 1_000) &&
    isBoundedInteger(value.defenseTicks, 0, COMBAT_MAXIMUM_TICKS),
  ability_telegraphed: (value) =>
    isFighterSlot(value.actor) &&
    isShapePowerId(value.power) &&
    isBoundedInteger(value.activationNumber, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isVector(value.origin) &&
    isVector(value.aimDirection) &&
    isScheduledTick(
      value.activatesAtTick,
      value.tick,
      MAXIMUM_ABILITY_SCHEDULE_AHEAD_TICKS
    ),
  ability_activated: (value) =>
    isFighterSlot(value.actor) &&
    isShapePowerId(value.power) &&
    isBoundedInteger(value.activationNumber, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isScheduledTick(
      value.activeUntilTick,
      value.tick,
      MAXIMUM_ABILITY_SCHEDULE_AHEAD_TICKS
    ),
  ability_finished: (value) =>
    isFighterSlot(value.actor) &&
    isShapePowerId(value.power) &&
    isBoundedInteger(value.activationNumber, 1, MAXIMUM_TRANSCRIPT_VALUE),
  ability_interrupted: (value) =>
    isFighterSlot(value.actor) &&
    isFighterSlot(value.interruptedBy) &&
    value.actor !== value.interruptedBy &&
    isShapePowerId(value.power) &&
    isBoundedInteger(value.activationNumber, 1, MAXIMUM_TRANSCRIPT_VALUE),
  role_attack: (value) =>
    isFighterSlot(value.actor) &&
    isCombatRole(value.role) &&
    (value.attack === 'body_slam' ||
      value.attack === 'piercing_quill' ||
      value.attack === 'ink_shot' ||
      value.attack === 'color_bolt' ||
      value.attack === 'nib_volley' ||
      value.attack === 'smearstep_barrage') &&
    isBoundedInteger(value.attackNumber, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.shotNumber, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isVector(value.origin) &&
    isVector(value.target) &&
    typeof value.hit === 'boolean',
  projectile_spawned: (value) =>
    isNonEmptyText(value.projectileId, 120) &&
    isFighterSlot(value.actor) &&
    (value.projectile === 'quill' || value.projectile === 'color_bolt') &&
    isBoundedInteger(value.attackNumber, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.shotNumber, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isVector(value.position) &&
    isVector(value.velocity) &&
    isBoundedInteger(value.radius, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isScheduledTick(value.expiresAtTick, value.tick),
  projectile_bounced: (value) =>
    isNonEmptyText(value.projectileId, 120) &&
    isFighterSlot(value.actor) &&
    (value.axis === 'x' || value.axis === 'y' || value.axis === 'both') &&
    (value.reason === undefined ||
      value.reason === 'natural_ricochet' ||
      value.reason === 'bank_shot' ||
      value.reason === 'returning_stroke') &&
    isVector(value.position) &&
    isVector(value.velocity),
  projectile_hit: (value) =>
    isNonEmptyText(value.projectileId, 120) &&
    isFighterSlot(value.actor) &&
    isFighterSlot(value.target) &&
    value.actor !== value.target &&
    (value.projectile === 'quill' || value.projectile === 'color_bolt') &&
    isVector(value.position),
  projectile_expired: (value) =>
    isNonEmptyText(value.projectileId, 120) &&
    isFighterSlot(value.actor) &&
    isVector(value.position),
  paint_zone_created: (value) =>
    isNonEmptyText(value.zoneId, 120) &&
    isFighterSlot(value.actor) &&
    isVector(value.position) &&
    isBoundedInteger(value.radius, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isScheduledTick(value.expiresAtTick, value.tick),
  paint_zone_pulsed: (value) =>
    isNonEmptyText(value.zoneId, 120) &&
    isFighterSlot(value.actor) &&
    isFighterSlot(value.target) &&
    value.actor !== value.target &&
    isVector(value.position) &&
    isBoundedInteger(value.damage, 1, MAXIMUM_TRANSCRIPT_VALUE),
  paint_zone_expired: (value) =>
    isNonEmptyText(value.zoneId, 120) &&
    isFighterSlot(value.actor) &&
    isVector(value.position),
  damage: (value) =>
    isFighterSlot(value.sourceFighter) &&
    isFighterSlot(value.targetFighter) &&
    isDamageSource(value.source) &&
    (value.sourceFighter !== value.targetFighter ||
      value.source === 'nib_wall_recoil') &&
    isBoundedInteger(value.amount, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.targetHitPoints, 0, MAXIMUM_TRANSCRIPT_VALUE) &&
    typeof value.critical === 'boolean' &&
    isVector(value.position),
  healing: (value) =>
    isFighterSlot(value.actor) &&
    value.source === 'power_up' &&
    isPowerUpId(value.powerUpId) &&
    isBoundedInteger(value.amount, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.targetHitPoints, 1, MAXIMUM_TRANSCRIPT_VALUE),
  burn_applied: (value) =>
    isFighterSlot(value.sourceFighter) &&
    isFighterSlot(value.targetFighter) &&
    value.sourceFighter !== value.targetFighter &&
    isBoundedInteger(
      value.remainingCappedDamage,
      1,
      MAXIMUM_TRANSCRIPT_VALUE
    ) &&
    isScheduledTick(value.nextPulseTick, value.tick),
  barrier_created: (value) =>
    isFighterSlot(value.actor) &&
    isBoundedInteger(value.hitPoints, 1, MAXIMUM_TRANSCRIPT_VALUE),
  barrier_hit: (value) =>
    isFighterSlot(value.actor) &&
    isBoundedInteger(value.absorbedDamage, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.remainingHitPoints, 0, MAXIMUM_TRANSCRIPT_VALUE) &&
    barrierHitSourceMetadataIsUsable(value),
  barrier_broken: (value) => isFighterSlot(value.actor),
  wall_bounce: (value) =>
    isFighterSlot(value.actor) &&
    (value.axis === 'x' || value.axis === 'y' || value.axis === 'both') &&
    isVector(value.position),
  nib_wall_ejection: (value) =>
    isFighterSlot(value.actor) &&
    // Before knockout protection lifts, recoil can be truthfully clamped to 0.
    isBoundedInteger(value.selfDamage, 0, MAXIMUM_TRANSCRIPT_VALUE) &&
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
  power_up_triggered: (value) =>
    isFighterSlot(value.actor) &&
    isPowerUpId(value.powerUpId) &&
    (value.target === undefined || isFighterSlot(value.target)) &&
    (value.bonusDamage === undefined ||
      isBoundedInteger(value.bonusDamage, 0, MAXIMUM_TRANSCRIPT_VALUE)),
  fighter_defeated: (value) => isFighterSlot(value.actor),
  battle_ended: (value) =>
    isFighterSlot(value.winner) && isBattleEndReason(value.reason),
} satisfies Record<BattleTimelineEvent['kind'], TimelineEventFieldValidator>;

const isTimelineEventKind = (
  value: unknown
): value is BattleTimelineEvent['kind'] => {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(TIMELINE_EVENT_FIELD_VALIDATORS, value)
  );
};

const isTimelineEvent = (
  value: unknown,
  completedTick: number
): value is BattleTimelineEvent => {
  return (
    isRecord(value) &&
    isBoundedInteger(value.tick, 0, completedTick) &&
    isTimelineEventKind(value.kind) &&
    TIMELINE_EVENT_FIELD_VALIDATORS[value.kind](value)
  );
};

const transcriptUpgradesAreUsable = (
  value: unknown,
  version: LegacyTranscriptVersion
): boolean => {
  if (version === 1) return value === undefined;
  return (
    Array.isArray(value) &&
    value.length <= MAXIMUM_COMBAT_UPGRADES &&
    value.every(isCombatUpgradeId) &&
    new Set(value).size === value.length
  );
};

const transcriptGearIsUsable = (
  value: unknown,
  version: TranscriptVersion
): boolean => {
  if (version < 3) return value === undefined;
  return value === undefined || isGearCombatSnapshot(value);
};

const transcriptDamageModifierIsUsable = (value: unknown): boolean => {
  if (value === undefined) return true;
  return isBoundedInteger(value, 850, 1_250);
};

const isTranscriptFighter = (
  value: unknown,
  version: TranscriptVersion
): boolean => {
  if (!isRecord(value) || !isRecord(value.stats)) return false;
  let versionedBuildIsUsable: boolean;
  if (version >= 5) {
    versionedBuildIsUsable =
      value.element === undefined &&
      value.upgrades === undefined &&
      validatePowerUpBuild(value.powerUpIds).valid;
  } else {
    const legacyVersion = version as LegacyTranscriptVersion;
    versionedBuildIsUsable =
      value.powerUpIds === undefined &&
      isElement(value.element) &&
      transcriptUpgradesAreUsable(value.upgrades, legacyVersion);
  }
  return (
    isNonEmptyText(value.id, 120) &&
    isNonEmptyText(value.name, 80) &&
    versionedBuildIsUsable &&
    isBoundedInteger(value.stats.chonk, 0, 1_000) &&
    isBoundedInteger(value.stats.spike, 0, 1_000) &&
    isBoundedInteger(value.stats.zip, 0, 1_000) &&
    isBoundedInteger(value.stats.charm, 0, 1_000) &&
    transcriptDamageModifierIsUsable(value.damageModifierPermille) &&
    transcriptGearIsUsable(value.gear, version)
  );
};

const isFighterCheckpoint = (
  value: unknown,
  expectedSlot: FighterSlot,
  version: TranscriptVersion
): value is FighterCheckpoint => {
  return (
    isRecord(value) &&
    value.slot === expectedSlot &&
    (version < 4 || combatRoleIsUsable(value.combatRole, version)) &&
    isBoundedInteger(value.maxHitPoints, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.hitPoints, 0, value.maxHitPoints) &&
    isVector(value.position) &&
    isVector(value.velocity) &&
    isShapePowerId(value.primaryPower) &&
    (version < 7 || isCurrentPrimaryPower(value.primaryPower)) &&
    isAbilityPhase(value.abilityPhase) &&
    isBoundedInteger(value.barrierHitPoints, 0, MAXIMUM_TRANSCRIPT_VALUE) &&
    (value.echoPosition === null || isVector(value.echoPosition))
  );
};

const isProjectileCheckpoint = (
  value: unknown,
  checkpointTick: number
): value is ProjectileCheckpoint => {
  return (
    isRecord(value) &&
    isNonEmptyText(value.projectileId, 120) &&
    isFighterSlot(value.actor) &&
    (value.projectile === 'quill' || value.projectile === 'color_bolt') &&
    isVector(value.position) &&
    isVector(value.velocity) &&
    isBoundedInteger(value.radius, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isScheduledTick(value.expiresAtTick, checkpointTick)
  );
};

const isPaintZoneCheckpoint = (
  value: unknown,
  checkpointTick: number
): value is PaintZoneCheckpoint => {
  return (
    isRecord(value) &&
    isNonEmptyText(value.zoneId, 120) &&
    isFighterSlot(value.actor) &&
    isVector(value.position) &&
    isBoundedInteger(value.radius, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isScheduledTick(value.expiresAtTick, checkpointTick)
  );
};

const isCheckpoint = (
  value: unknown,
  version: TranscriptVersion
): value is BattleCheckpoint => {
  if (!isRecord(value)) return false;
  const v8StateIsUsable =
    version < 8 ||
    (Array.isArray(value.projectiles) &&
      value.projectiles.length <= 8 &&
      value.projectiles.every((projectile) =>
        isProjectileCheckpoint(
          projectile,
          typeof value.tick === 'number' ? value.tick : -1
        )
      ) &&
      Array.isArray(value.paintZones) &&
      value.paintZones.length <= 4 &&
      value.paintZones.every((zone) =>
        isPaintZoneCheckpoint(
          zone,
          typeof value.tick === 'number' ? value.tick : -1
        )
      ));
  return (
    Array.isArray(value.fighters) &&
    isBoundedInteger(value.tick, 0, COMBAT_MAXIMUM_TICKS) &&
    isBoundedInteger(value.arenaHalfWidth, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.arenaHalfHeight, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    value.fighters.length === 2 &&
    isFighterCheckpoint(value.fighters[0], 'a', version) &&
    isFighterCheckpoint(value.fighters[1], 'b', version) &&
    v8StateIsUsable
  );
};

const isResultFighter = (
  value: unknown,
  expectedSlot: FighterSlot,
  expectedId: string,
  version: TranscriptVersion
): value is FighterResult => {
  return (
    isRecord(value) &&
    value.slot === expectedSlot &&
    value.id === expectedId &&
    isBoundedInteger(value.maxHitPoints, 1, MAXIMUM_TRANSCRIPT_VALUE) &&
    isBoundedInteger(value.finalHitPoints, 0, value.maxHitPoints) &&
    isBoundedInteger(value.hitPointPermille, 0, 1_000) &&
    isBoundedInteger(value.damageDealt, 0, MAXIMUM_TRANSCRIPT_VALUE) &&
    isShapePowerId(value.primaryPower) &&
    (version < 7 || isCurrentPrimaryPower(value.primaryPower)) &&
    (version < 4 || combatRoleIsUsable(value.combatRole, version)) &&
    typeof value.inkPressureUsed === 'boolean'
  );
};

const transcriptResultIsUsable = (
  value: unknown,
  fighterAId: string,
  fighterBId: string,
  version: TranscriptVersion
): value is BattleTranscript['result'] => {
  if (!isRecord(value) || !Array.isArray(value.fighters)) return false;
  if (
    !isFighterSlot(value.winner) ||
    !isFighterSlot(value.loser) ||
    value.winner === value.loser ||
    !isBattleEndReason(value.reason) ||
    !isBoundedInteger(value.completedTick, 1, COMBAT_MAXIMUM_TICKS) ||
    value.completedMilliseconds !==
      Math.floor((value.completedTick * 1_000) / COMBAT_TICK_RATE) ||
    value.fighters.length !== 2 ||
    !isResultFighter(value.fighters[0], 'a', fighterAId, version) ||
    !isResultFighter(value.fighters[1], 'b', fighterBId, version)
  ) {
    return false;
  }
  return battleResultFinishIsConsistent(
    value as BattleTranscript['result'],
    COMBAT_MAXIMUM_TICKS,
    version >= 8
  );
};

const finalCheckpointFighterMatchesResult = (
  checkpointFighter: FighterCheckpoint,
  resultFighter: FighterResult,
  expectedSlot: FighterSlot,
  expectedFighterId: string
): boolean => {
  return (
    checkpointFighter.slot === expectedSlot &&
    resultFighter.slot === expectedSlot &&
    resultFighter.id === expectedFighterId &&
    checkpointFighter.hitPoints === resultFighter.finalHitPoints &&
    checkpointFighter.maxHitPoints === resultFighter.maxHitPoints
  );
};

const checkpointsAreUsable = (
  values: readonly unknown[],
  result: BattleTranscript['result'],
  fighterAId: string,
  fighterBId: string,
  version: TranscriptVersion
): values is readonly BattleCheckpoint[] => {
  const first = values[0];
  const last = values.at(-1);
  if (
    values.length < 2 ||
    values.length > MAXIMUM_CHECKPOINTS ||
    !isCheckpoint(first, version) ||
    first.tick !== 0 ||
    !isCheckpoint(last, version) ||
    last.tick !== result.completedTick
  ) {
    return false;
  }
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      !isCheckpoint(previous, version) ||
      !isCheckpoint(current, version) ||
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
};

const timelineIsUsable = (
  values: readonly unknown[],
  battleId: string,
  result: BattleTranscript['result'],
  version: TranscriptVersion
): values is readonly BattleTimelineEvent[] => {
  if (values.length < 2 || values.length > MAXIMUM_TIMELINE_EVENTS) {
    return false;
  }
  let previousTick = -1;
  for (const value of values) {
    if (!isTimelineEvent(value, result.completedTick)) return false;
    if (
      version >= 7 &&
      isRecord(value) &&
      ((value.kind === 'role_attack' &&
        (!isCurrentCombatRole(value.role) ||
          value.attack === 'ink_shot' ||
          value.attack === 'smearstep_barrage')) ||
        ((value.kind === 'ability_telegraphed' ||
          value.kind === 'ability_activated' ||
          value.kind === 'ability_finished' ||
          value.kind === 'ability_interrupted') &&
          !isCurrentPrimaryPower(value.power)) ||
        (value.kind === 'damage' &&
          (value.source === 'smearstep' || value.source === 'gunner_shot')))
    ) {
      return false;
    }
    if (value.tick < previousTick) return false;
    if (
      (version >= 5 &&
        (value.kind === 'burn_applied' ||
          (value.kind === 'damage' && value.source === 'ember_burn'))) ||
      (version < 5 &&
        (value.kind === 'power_up_triggered' ||
          value.kind === 'healing' ||
          (value.kind === 'damage' && value.source === 'power_up')))
    ) {
      return false;
    }
    if (value.kind === 'battle_started') {
      if (value.tick !== 0 || value.battleId !== battleId) return false;
    }
    if (
      value.kind === 'damage' &&
      value.targetHitPoints >
        result.fighters[value.targetFighter === 'a' ? 0 : 1].maxHitPoints
    ) {
      return false;
    }
    if (
      value.kind === 'healing' &&
      value.targetHitPoints >
        result.fighters[value.actor === 'a' ? 0 : 1].maxHitPoints
    ) {
      return false;
    }
    if (value.kind === 'battle_ended') {
      if (
        value.tick !== result.completedTick ||
        value.winner !== result.winner ||
        value.reason !== result.reason
      ) {
        return false;
      }
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
};

/** Returns the original immutable-compatible value only when every field agrees. */
export function parseBattleTranscript(
  value: unknown
): BattleTranscript | undefined {
  if (
    !isRecord(value) ||
    !isSupportedBattleTranscriptVersion(value.version) ||
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
    return undefined;
  }

  const version = value.version as TranscriptVersion;
  const fighterA = value.fighters[0];
  const fighterB = value.fighters[1];
  if (
    !isTranscriptFighter(fighterA, version) ||
    !isTranscriptFighter(fighterB, version) ||
    !isRecord(fighterA) ||
    !isRecord(fighterB) ||
    typeof fighterA.id !== 'string' ||
    typeof fighterB.id !== 'string' ||
    fighterA.id === fighterB.id ||
    (version === 3 &&
      fighterA.gear === undefined &&
      fighterB.gear === undefined) ||
    !transcriptResultIsUsable(value.result, fighterA.id, fighterB.id, version)
  ) {
    return undefined;
  }

  if (
    !checkpointsAreUsable(
      value.checkpoints,
      value.result,
      fighterA.id,
      fighterB.id,
      version
    )
  ) {
    return undefined;
  }
  if (
    !timelineIsUsable(value.timeline, value.battleId, value.result, version)
  ) {
    return undefined;
  }
  if (version >= 4) {
    if (!isRecord(fighterA.stats) || !isRecord(fighterB.stats)) {
      return undefined;
    }
    const selectRoleForVersion =
      version >= 7 ? selectCombatRole : selectLegacyCombatRole;
    const roleA = selectRoleForVersion({
      chonk: Number(fighterA.stats.chonk),
      spike: Number(fighterA.stats.spike),
      zip: Number(fighterA.stats.zip),
      charm: Number(fighterA.stats.charm),
    });
    const roleB = selectRoleForVersion({
      chonk: Number(fighterB.stats.chonk),
      spike: Number(fighterB.stats.spike),
      zip: Number(fighterB.stats.zip),
      charm: Number(fighterB.stats.charm),
    });
    const rolesMatchCheckpoints = value.checkpoints.every((checkpoint) => {
      return (
        isRecord(checkpoint) &&
        Array.isArray(checkpoint.fighters) &&
        isRecord(checkpoint.fighters[0]) &&
        isRecord(checkpoint.fighters[1]) &&
        checkpoint.fighters[0].combatRole === roleA &&
        checkpoint.fighters[1].combatRole === roleB
      );
    });
    if (
      !rolesMatchCheckpoints ||
      value.result.fighters[0].combatRole !== roleA ||
      value.result.fighters[1].combatRole !== roleB
    ) {
      return undefined;
    }
  }
  return value as unknown as BattleTranscript;
}
