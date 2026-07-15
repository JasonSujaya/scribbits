import {
  COMBAT_PHASE_ORDER,
  DEFAULT_COMBAT_RULES,
  DOMINANT_STAT_TIE_ORDER,
} from './config';
import {
  DIRECTION_SCALE,
  circleCenterIsInsideCone,
  circlesOverlap,
  clampInteger,
  clampVectorComponents,
  divideRounded,
  expandingRingIntersectsCircle,
  integerSquareRoot,
  midpoint,
  normalizeVector,
  squaredDistance,
} from './fixed-math';
import {
  createStableBattleId,
  deterministicInteger,
  normalizeCombatSeed,
} from './random';
import {
  selectCombatRole,
  selectPrimaryPower as selectPrimaryPowerForStats,
} from './selection';
import {
  getCombatRoleAdvantage,
  getCombatRoleRules,
  toCurrentCombatRole,
} from './roles';
import { freezeGearCombatSnapshot, isGearCombatSnapshot } from './gearsnapshot';
import { applyBattleArenaModifier } from '../battlearena';
import {
  MAXIMUM_POWER_UP_BONUS_DAMAGE,
  MAXIMUM_POWER_UP_HEALING_PERMILLE,
  MAXIMUM_POWER_UP_TRIGGER_EVENTS,
  POWER_UP_CATALOG,
  parsePowerUpBuild,
  validatePowerUpBuild,
} from './powerups';
import type { PowerUpId } from './powerups';
import type {
  AbilityPhase,
  AuthoritativeBattleResult,
  BattleCheckpoint,
  BattleEndReason,
  BattleTimelineEvent,
  BattleTranscript,
  CombatFighterInput,
  CombatPhase,
  CombatRole,
  CombatRules,
  CombatSimulationInput,
  DamageSource,
  FighterCheckpoint,
  FighterResult,
  FighterSlot,
  FixedVector,
  GearCombatModifiers,
  NibHaloAbilityConfig,
  PrimaryPower,
  RawCombatStats,
  SmearstepAbilityConfig,
} from './types';

// Preserve the direct engine-module API while keeping the selectors in a tiny
// dependency that client previews can import without pulling in the simulator.
export { selectDominantStat, selectPrimaryPower } from './selection';

type MutableVector = {
  x: number;
  y: number;
};

type EchoState = {
  position: MutableVector;
  aimDirection: MutableVector;
  firesAtTick: number;
  expiresAtTick: number;
};

type ScheduledPowerUpEffect = {
  tick: number;
  powerUpId: PowerUpId;
  target: FighterSlot;
  damage: number;
};

type MutableFighterState = {
  slot: FighterSlot;
  input: CombatFighterInput;
  combatModifiers: GearCombatModifiers;
  powerUpIds: readonly PowerUpId[];
  powerUpActivations: Map<PowerUpId, number>;
  powerUpTriggerCount: number;
  powerUpBonusDamageSpent: number;
  powerUpAdvantageDamageRemainderPermille: number;
  powerUpHealingSpent: number;
  triggeredNonLegendaryPowerUps: Set<PowerUpId>;
  endlessDraftExtraPowerUpId: PowerUpId | null;
  scheduledPowerUpEffects: ScheduledPowerUpEffect[];
  basicHitStreak: number;
  successfulNormalHitCount: number;
  incomingNormalAttackCount: number;
  currentBasicAttackHit: boolean;
  currentBasicAttackDamage: number;
  movementOverrideUntilTick: number;
  paperTwinAttacksRemaining: number;
  echoMarkAttacksRemaining: number;
  edgeSpringAttacksRemaining: number;
  inkRageAttacksRemaining: number;
  lastKnockbackBy: FighterSlot | null;
  lastKnockbackTick: number;
  combatRole: CombatRole;
  primaryPower: PrimaryPower;
  position: MutableVector;
  velocity: MutableVector;
  radius: number;
  baseMovementPerTick: number;
  hitPoints: number;
  maxHitPoints: number;
  inkPressureLostHitPointThreshold: number;
  inkPressureThresholdReachedBeforePowerUpHealing: boolean;
  damageDealt: number;
  roleDamageRemainderPermille: number;
  basicAttackReadyAtTick: number;
  basicAttackNumber: number;
  burstShotsRemaining: number;
  nextBurstShotTick: number;
  resolvedAttackCount: number;
  defenseUntilTick: number;
  contactReadyTick: number;
  barrierHitPoints: number;
  abilityPhase: AbilityPhase;
  abilityPhaseEndsAtTick: number;
  abilityReadyAtTick: number;
  abilityActivatedAtTick: number;
  activationNumber: number;
  telegraphOrigin: MutableVector;
  aimDirection: MutableVector;
  abilityOrigin: MutableVector;
  abilityHitOpponent: boolean;
  haloNextTargetHitTick: number;
  haloNextWallRiskTick: number;
  smearstepHitMask: number;
  roleSpecialShotMask: number;
  smearstepCurrentDash: number;
  colorburstFired: boolean;
  inkPressureUsed: boolean;
  inkPressureRefreshPending: boolean;
  echo: EchoState | null;
};

type SimulationContext = {
  rules: CombatRules;
  seed: string;
  battleId: string;
  tick: number;
  arenaHalfWidth: number;
  arenaHalfHeight: number;
  fighters: [MutableFighterState, MutableFighterState];
  timeline: BattleTimelineEvent[];
  checkpoints: BattleCheckpoint[];
  eventsTruncated: boolean;
  fighterCollisionThisTick: boolean;
  lastFighterCollisionEventTick: number;
  result: AuthoritativeBattleResult | null;
};

type DamageOptions = Readonly<{
  applyElementPayload: boolean;
  bypassDefense: boolean;
  bypassBarrier: boolean;
  critical: boolean;
}>;

const orbitDirections: readonly FixedVector[] = Object.freeze([
  Object.freeze({ x: 1_024, y: 0 }),
  Object.freeze({ x: 989, y: 265 }),
  Object.freeze({ x: 887, y: 512 }),
  Object.freeze({ x: 724, y: 724 }),
  Object.freeze({ x: 512, y: 887 }),
  Object.freeze({ x: 265, y: 989 }),
  Object.freeze({ x: 0, y: 1_024 }),
  Object.freeze({ x: -265, y: 989 }),
  Object.freeze({ x: -512, y: 887 }),
  Object.freeze({ x: -724, y: 724 }),
  Object.freeze({ x: -887, y: 512 }),
  Object.freeze({ x: -989, y: 265 }),
  Object.freeze({ x: -1_024, y: 0 }),
  Object.freeze({ x: -989, y: -265 }),
  Object.freeze({ x: -887, y: -512 }),
  Object.freeze({ x: -724, y: -724 }),
  Object.freeze({ x: -512, y: -887 }),
  Object.freeze({ x: -265, y: -989 }),
  Object.freeze({ x: 0, y: -1_024 }),
  Object.freeze({ x: 265, y: -989 }),
  Object.freeze({ x: 512, y: -887 }),
  Object.freeze({ x: 724, y: -724 }),
  Object.freeze({ x: 887, y: -512 }),
  Object.freeze({ x: 989, y: -265 }),
]);

function copyVector(vector: FixedVector): MutableVector {
  return { x: vector.x, y: vector.y };
}

function freezeVector(vector: FixedVector): FixedVector {
  return Object.freeze({ x: vector.x, y: vector.y });
}

function freezePair<Value>(
  first: Value,
  second: Value
): readonly [Value, Value] {
  const pair: [Value, Value] = [first, second];
  return Object.freeze(pair);
}

function otherSlot(slot: FighterSlot): FighterSlot {
  return slot === 'a' ? 'b' : 'a';
}

function assertUnhandledShapePower(power: never): never {
  throw new Error(`Unhandled Shape Power: ${String(power)}`);
}

function assertUnhandledCombatPhase(phase: never): never {
  throw new Error(`Unhandled combat phase: ${String(phase)}`);
}

function getFighter(
  context: SimulationContext,
  slot: FighterSlot
): MutableFighterState {
  return slot === 'a' ? context.fighters[0] : context.fighters[1];
}

function getOpponent(
  context: SimulationContext,
  fighter: MutableFighterState
): MutableFighterState {
  return getFighter(context, otherSlot(fighter.slot));
}

function validateText(
  value: string,
  label: string,
  maximumLength: number
): void {
  if (value.trim().length === 0 || value.length > maximumLength) {
    throw new Error(`${label} must contain 1 to ${maximumLength} characters.`);
  }
}

function validateStats(stats: RawCombatStats): void {
  for (const stat of DOMINANT_STAT_TIE_ORDER) {
    const value = stats[stat];
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000) {
      throw new Error(`Combat stat ${stat} must be an integer from 0 to 1000.`);
    }
  }
}

function validateFighterInput(fighter: CombatFighterInput): void {
  validateText(fighter.id, 'Fighter id', 120);
  validateText(fighter.name, 'Fighter name', 80);
  validateStats(fighter.stats);
  if (
    fighter.damageModifierPermille !== undefined &&
    (!Number.isSafeInteger(fighter.damageModifierPermille) ||
      fighter.damageModifierPermille < 850 ||
      fighter.damageModifierPermille > 1_250)
  ) {
    throw new Error('Combat damage modifier must be 850 to 1250 permille.');
  }
  const powerUpValidation = validatePowerUpBuild(fighter.powerUpIds ?? []);
  if (!powerUpValidation.valid) {
    throw new Error(
      `Combat Power-Up build is invalid: ${powerUpValidation.reason}.`
    );
  }
  if (fighter.gear !== undefined && !isGearCombatSnapshot(fighter.gear)) {
    throw new Error('Combat Gear snapshot is malformed or outside its caps.');
  }
}

function freezeFighterInput(fighter: CombatFighterInput): CombatFighterInput {
  return Object.freeze({
    id: fighter.id,
    name: fighter.name,
    stats: Object.freeze({ ...fighter.stats }),
    powerUpIds: Object.freeze([...(fighter.powerUpIds ?? [])]),
    damageModifierPermille: fighter.damageModifierPermille ?? 1_000,
    ...(fighter.gear ? { gear: freezeGearCombatSnapshot(fighter.gear) } : {}),
  });
}

function getGearCombatModifiers(
  input: CombatFighterInput
): GearCombatModifiers {
  const gear = input.gear?.modifiers;
  return (
    gear ??
    Object.freeze({
      damagePermille: 1_000,
      maximumHitPointsPermille: 1_000,
      cooldownPermille: 1_000,
      criticalChanceBonusPermille: 0,
      telegraphTicksDelta: 0,
      initialDelayTicksDelta: 0,
    })
  );
}

export function getOrbitingNibPosition(
  ownerPosition: FixedVector,
  activeAgeTicks: number,
  nibIndex: number,
  config: NibHaloAbilityConfig = DEFAULT_COMBAT_RULES.abilities.nib_halo
): FixedVector {
  if (
    !Number.isInteger(nibIndex) ||
    nibIndex < 0 ||
    nibIndex >= config.nibCount
  ) {
    throw new Error('Nib index is outside the configured halo.');
  }
  const indexOffset = orbitDirections.length / config.nibCount;
  const directionIndex =
    (activeAgeTicks * config.orbitTableStepsPerTick + nibIndex * indexOffset) %
    orbitDirections.length;
  const direction = orbitDirections[directionIndex] ?? orbitDirections[0];
  if (!direction) {
    throw new Error('Nib Halo direction table is empty.');
  }
  return Object.freeze({
    x:
      ownerPosition.x +
      divideRounded(direction.x * config.orbitRadius, DIRECTION_SCALE),
    y:
      ownerPosition.y +
      divideRounded(direction.y * config.orbitRadius, DIRECTION_SCALE),
  });
}

function appendEvent(
  context: SimulationContext,
  event: BattleTimelineEvent,
  terminal = false
): void {
  const reservedLimit = terminal
    ? context.rules.maximumEventCount
    : context.rules.maximumEventCount - 1;
  if (context.timeline.length < reservedLimit) {
    context.timeline.push(Object.freeze(event));
  } else {
    context.eventsTruncated = true;
  }
}

function fighterOwnsPowerUp(
  fighter: MutableFighterState,
  powerUpId: PowerUpId
): boolean {
  return fighter.powerUpIds.includes(powerUpId);
}

function triggerPowerUp(
  context: SimulationContext,
  fighter: MutableFighterState,
  powerUpId: PowerUpId,
  target?: MutableFighterState,
  bonusDamage?: number
): boolean {
  if (!fighterOwnsPowerUp(fighter, powerUpId)) return false;
  const definition = POWER_UP_CATALOG[powerUpId];
  const activations = fighter.powerUpActivations.get(powerUpId) ?? 0;
  const activationLimit =
    definition.maximumActivations +
    (fighterOwnsPowerUp(fighter, 'v1-endless-draft') &&
    (definition.rarity === 'common' ||
      definition.rarity === 'uncommon' ||
      definition.rarity === 'rare')
      ? (POWER_UP_CATALOG['v1-endless-draft'].extraActivations ?? 0)
      : 0);
  if (
    activations >= activationLimit ||
    fighter.powerUpTriggerCount >= MAXIMUM_POWER_UP_TRIGGER_EVENTS
  ) {
    return false;
  }

  fighter.powerUpActivations.set(powerUpId, activations + 1);
  fighter.powerUpTriggerCount += 1;
  appendEvent(context, {
    tick: context.tick,
    kind: 'power_up_triggered',
    actor: fighter.slot,
    powerUpId,
    ...(target ? { target: target.slot } : {}),
    ...(bonusDamage !== undefined ? { bonusDamage } : {}),
  });

  if (definition.rarity !== 'legendary') {
    fighter.triggeredNonLegendaryPowerUps.add(powerUpId);
  }
  if (
    (definition.rarity === 'common' ||
      definition.rarity === 'uncommon' ||
      definition.rarity === 'rare') &&
    fighter.endlessDraftExtraPowerUpId === null &&
    triggerPowerUp(context, fighter, 'v1-endless-draft')
  ) {
    fighter.endlessDraftExtraPowerUpId = powerUpId;
  }
  if (
    fighter.triggeredNonLegendaryPowerUps.size >= 3 &&
    fighterOwnsPowerUp(fighter, 'v1-masterpiece')
  ) {
    const opponent = getOpponent(context, fighter);
    dealPowerUpDamage(
      context,
      fighter,
      opponent,
      'v1-masterpiece',
      POWER_UP_CATALOG['v1-masterpiece'].bonusDamage ?? 0
    );
  }
  return true;
}

function dealPowerUpDamage(
  context: SimulationContext,
  fighter: MutableFighterState,
  target: MutableFighterState,
  powerUpId: PowerUpId,
  requestedDamage: number
): number {
  if (!triggerPowerUp(context, fighter, powerUpId, target, requestedDamage)) {
    return 0;
  }
  const actualDamage = applyBudgetedPowerUpDamage(
    context,
    fighter,
    target,
    requestedDamage
  );
  healFighterFromPowerUp(context, fighter, powerUpId);
  return actualDamage;
}

function healFighterFromPowerUp(
  context: SimulationContext,
  fighter: MutableFighterState,
  powerUpId: PowerUpId
): number {
  const healingPermille =
    POWER_UP_CATALOG[powerUpId].maximumHitPointHealingPermille ?? 0;
  const requestedHealing = divideRounded(
    fighter.maxHitPoints * healingPermille,
    1_000
  );
  const maximumPowerUpHealing = divideRounded(
    fighter.maxHitPoints * MAXIMUM_POWER_UP_HEALING_PERMILLE,
    1_000
  );
  const actualHealing = Math.min(
    requestedHealing,
    fighter.maxHitPoints - fighter.hitPoints,
    maximumPowerUpHealing - fighter.powerUpHealingSpent
  );
  if (actualHealing <= 0) return 0;
  if (
    !fighter.inkPressureUsed &&
    fighter.maxHitPoints - fighter.hitPoints >=
      fighter.inkPressureLostHitPointThreshold
  ) {
    fighter.inkPressureThresholdReachedBeforePowerUpHealing = true;
  }
  fighter.hitPoints += actualHealing;
  fighter.powerUpHealingSpent += actualHealing;
  appendEvent(context, {
    tick: context.tick,
    kind: 'healing',
    actor: fighter.slot,
    source: 'power_up',
    powerUpId,
    amount: actualHealing,
    targetHitPoints: fighter.hitPoints,
  });
  return actualHealing;
}

function applyBudgetedPowerUpDamage(
  context: SimulationContext,
  fighter: MutableFighterState,
  target: MutableFighterState,
  requestedDamage: number
): number {
  const remainingBudget =
    MAXIMUM_POWER_UP_BONUS_DAMAGE - fighter.powerUpBonusDamageSpent;
  const budgetedDamage = Math.max(
    0,
    Math.min(requestedDamage, remainingBudget)
  );
  if (budgetedDamage <= 0) return 0;
  fighter.powerUpBonusDamageSpent += budgetedDamage;
  const advantageMultiplierPermille =
    getCombatRoleAdvantage(fighter.combatRole, target.combatRole) ===
    'advantage'
      ? 1_100
      : 1_000;
  const scaledPowerUpDamage =
    budgetedDamage * advantageMultiplierPermille +
    fighter.powerUpAdvantageDamageRemainderPermille;
  const resolvedPowerUpDamage = Math.max(
    1,
    Math.floor(scaledPowerUpDamage / 1_000)
  );
  fighter.powerUpAdvantageDamageRemainderPermille =
    scaledPowerUpDamage % 1_000;
  return applyResolvedDamage(
    context,
    fighter,
    target,
    'power_up',
    resolvedPowerUpDamage,
    {
      applyElementPayload: false,
      bypassDefense: true,
      bypassBarrier: false,
      critical: false,
    }
  );
}

function schedulePowerUpDamage(
  context: SimulationContext,
  fighter: MutableFighterState,
  powerUpId: PowerUpId,
  target: MutableFighterState,
  delayTicks: number,
  damage: number
): void {
  if (!triggerPowerUp(context, fighter, powerUpId, target)) return;
  fighter.scheduledPowerUpEffects.push({
    tick: context.tick + delayTicks,
    powerUpId,
    target: target.slot,
    damage,
  });
}

function createFighterState(
  input: CombatFighterInput,
  slot: FighterSlot,
  _seed: string,
  rules: CombatRules
): MutableFighterState {
  const combatModifiers = getGearCombatModifiers(input);
  const powerUpIds = parsePowerUpBuild(input.powerUpIds ?? []) ?? [];
  const combatRole = selectCombatRole(input.stats);
  const horizontalDirection = slot === 'a' ? 1 : -1;
  const verticalDirectionByRole: Readonly<Record<CombatRole, number>> = {
    brawler: 0,
    longshot: 0,
    gunner: 0,
    mage: 0,
  };
  const baseMovementPerTick =
    rules.fighter.baseMovementPerTick +
    input.stats.zip * rules.fighter.movementPerZip;
  const movementPerTick =
    combatRole === 'brawler'
      ? divideRounded(baseMovementPerTick * 1_200, 1_000)
      : baseMovementPerTick;
  const velocity = normalizeVector(
    {
      x: horizontalDirection * DIRECTION_SCALE,
      y: verticalDirectionByRole[combatRole],
    },
    movementPerTick,
    { x: horizontalDirection * DIRECTION_SCALE, y: 0 }
  );
  const initialAbilityDelayByRole: Readonly<Record<CombatRole, number>> = {
    brawler: 18,
    longshot: 28,
    gunner: 20,
    mage: 32,
  };
  const initialBasicAttackDelayByRole: Readonly<Record<CombatRole, number>> = {
    brawler: 8,
    longshot: 22,
    gunner: 14,
    mage: 26,
  };
  const initialDelay =
    initialAbilityDelayByRole[combatRole] +
    combatModifiers.initialDelayTicksDelta;
  const baseMaxHitPoints =
    rules.fighter.baseHitPoints +
    input.stats.chonk * rules.fighter.hitPointsPerChonk;
  const maxHitPoints = divideRounded(
    baseMaxHitPoints * combatModifiers.maximumHitPointsPermille,
    1_000
  );

  return {
    slot,
    input,
    combatModifiers,
    powerUpIds,
    powerUpActivations: new Map(),
    powerUpTriggerCount: 0,
    powerUpBonusDamageSpent: 0,
    powerUpAdvantageDamageRemainderPermille: 0,
    powerUpHealingSpent: 0,
    triggeredNonLegendaryPowerUps: new Set(),
    endlessDraftExtraPowerUpId: null,
    scheduledPowerUpEffects: [],
    basicHitStreak: 0,
    successfulNormalHitCount: 0,
    incomingNormalAttackCount: 0,
    currentBasicAttackHit: false,
    currentBasicAttackDamage: 0,
    movementOverrideUntilTick: 0,
    paperTwinAttacksRemaining: 0,
    echoMarkAttacksRemaining: 0,
    edgeSpringAttacksRemaining: 0,
    inkRageAttacksRemaining: 0,
    lastKnockbackBy: null,
    lastKnockbackTick: -1,
    combatRole,
    primaryPower: selectPrimaryPowerForStats(input.stats),
    position: {
      x: (slot === 'a' ? -1 : 1) * rules.fighter.startingHorizontalOffset,
      y: 0,
    },
    velocity: copyVector(velocity),
    radius:
      rules.fighter.baseRadius +
      input.stats.chonk * rules.fighter.radiusPerChonk,
    baseMovementPerTick: movementPerTick,
    hitPoints: maxHitPoints,
    maxHitPoints,
    inkPressureLostHitPointThreshold: divideRounded(
      baseMaxHitPoints * rules.inkPressure.lostHitPointPercentage,
      100
    ),
    inkPressureThresholdReachedBeforePowerUpHealing: false,
    damageDealt: 0,
    roleDamageRemainderPermille: 0,
    basicAttackReadyAtTick: initialBasicAttackDelayByRole[combatRole],
    basicAttackNumber: 0,
    burstShotsRemaining: 0,
    nextBurstShotTick: 0,
    resolvedAttackCount: 0,
    defenseUntilTick: 0,
    contactReadyTick: 0,
    barrierHitPoints: 0,
    abilityPhase: 'cooldown',
    abilityPhaseEndsAtTick: 0,
    abilityReadyAtTick: initialDelay,
    abilityActivatedAtTick: -1,
    activationNumber: 0,
    telegraphOrigin: { x: 0, y: 0 },
    aimDirection: { x: horizontalDirection * DIRECTION_SCALE, y: 0 },
    abilityOrigin: { x: 0, y: 0 },
    abilityHitOpponent: false,
    haloNextTargetHitTick: 0,
    haloNextWallRiskTick: 0,
    smearstepHitMask: 0,
    roleSpecialShotMask: 0,
    smearstepCurrentDash: -1,
    colorburstFired: false,
    inkPressureUsed: false,
    inkPressureRefreshPending: false,
    echo: null,
  };
}

function calculateArenaHalfExtent(
  tick: number,
  startingExtent: number,
  finalExtent: number,
  rules: CombatRules
): number {
  if (tick <= rules.arena.shrinkStartsAtTick) {
    return startingExtent;
  }
  const shrinkDuration = rules.maximumTicks - rules.arena.shrinkStartsAtTick;
  const shrinkAge = Math.min(
    shrinkDuration,
    tick - rules.arena.shrinkStartsAtTick
  );
  const removedExtent = divideRounded(
    (startingExtent - finalExtent) * shrinkAge,
    shrinkDuration
  );
  return startingExtent - removedExtent;
}

function executeArenaRules(context: SimulationContext): void {
  context.fighterCollisionThisTick = false;
  context.arenaHalfWidth = calculateArenaHalfExtent(
    context.tick,
    context.rules.arena.startingHalfWidth,
    context.rules.arena.finalHalfWidth,
    context.rules
  );
  context.arenaHalfHeight = calculateArenaHalfExtent(
    context.tick,
    context.rules.arena.startingHalfHeight,
    context.rules.arena.finalHalfHeight,
    context.rules
  );

  if (context.tick === context.rules.arena.shrinkStartsAtTick) {
    appendEvent(context, {
      tick: context.tick,
      kind: 'arena_shrink_started',
      targetHalfWidth: context.rules.arena.finalHalfWidth,
      targetHalfHeight: context.rules.arena.finalHalfHeight,
    });
  }

  if (context.tick === context.rules.lateFight.startsAtTick) {
    for (const fighter of context.fighters) {
      if (
        fighter.abilityPhase === 'cooldown' &&
        fighter.abilityReadyAtTick > context.tick
      ) {
        const remaining = fighter.abilityReadyAtTick - context.tick;
        fighter.abilityReadyAtTick =
          context.tick +
          Math.max(
            1,
            divideRounded(
              remaining * context.rules.lateFight.cooldownMultiplierPermille,
              1_000
            )
          );
      }
    }
    appendEvent(context, {
      tick: context.tick,
      kind: 'late_fight_started',
      cooldownMultiplierPermille:
        context.rules.lateFight.cooldownMultiplierPermille,
      defenseTicks: context.rules.lateFight.shortenedDefenseTicks,
    });
  }
}

function getPowerTiming(
  fighter: MutableFighterState,
  rules: CombatRules
): Readonly<{
  telegraphTicks: number;
  activeTicks: number;
  cooldownTicks: number;
}> {
  return rules.abilities[fighter.primaryPower];
}

function getEffectiveTelegraphTicks(
  fighter: MutableFighterState,
  rules: CombatRules
): number {
  const timing = getPowerTiming(fighter, rules);
  return Math.max(
    1,
    timing.telegraphTicks + fighter.combatModifiers.telegraphTicksDelta
  );
}

function getEffectiveCooldownTicks(
  context: SimulationContext,
  fighter: MutableFighterState
): number {
  const baseCooldown = divideRounded(
    getPowerTiming(fighter, context.rules).cooldownTicks *
      fighter.combatModifiers.cooldownPermille,
    1_000
  );
  if (context.tick < context.rules.lateFight.startsAtTick) {
    return baseCooldown;
  }
  return Math.max(
    1,
    divideRounded(
      baseCooldown * context.rules.lateFight.cooldownMultiplierPermille,
      1_000
    )
  );
}

function clampPositionInsideArena(
  context: SimulationContext,
  position: FixedVector,
  radius: number
): MutableVector {
  return {
    x: clampInteger(
      position.x,
      -context.arenaHalfWidth + radius,
      context.arenaHalfWidth - radius
    ),
    y: clampInteger(
      position.y,
      -context.arenaHalfHeight + radius,
      context.arenaHalfHeight - radius
    ),
  };
}

function createColorburstEcho(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  if (fighter.echo !== null) {
    return;
  }
  const config = context.rules.abilities.colorburst;
  const rawPosition = {
    x:
      fighter.position.x -
      divideRounded(
        fighter.aimDirection.x * config.echoOffsetDistance,
        DIRECTION_SCALE
      ),
    y:
      fighter.position.y -
      divideRounded(
        fighter.aimDirection.y * config.echoOffsetDistance,
        DIRECTION_SCALE
      ),
  };
  const position = clampPositionInsideArena(
    context,
    rawPosition,
    config.echoRadius
  );
  fighter.echo = {
    position,
    aimDirection: copyVector(fighter.aimDirection),
    firesAtTick: context.tick + config.echoDelayTicks,
    expiresAtTick: context.tick + config.echoLifetimeTicks,
  };
  appendEvent(context, {
    tick: context.tick,
    kind: 'echo_created',
    actor: fighter.slot,
    position: freezeVector(position),
    aimDirection: freezeVector(fighter.aimDirection),
    firesAtTick: fighter.echo.firesAtTick,
  });
}

function aimSmearstepDash(
  context: SimulationContext,
  fighter: MutableFighterState,
  dashIndex: number
): void {
  const config = context.rules.abilities.smearstep;
  const opponent = getOpponent(context, fighter);
  const predicted = clampPositionInsideArena(
    context,
    {
      x: opponent.position.x + opponent.velocity.x * config.predictionTicks,
      y: opponent.position.y + opponent.velocity.y * config.predictionTicks,
    },
    opponent.radius
  );
  const awayX = fighter.position.x - predicted.x;
  const awayY = fighter.position.y - predicted.y;
  const strafeSign =
    (fighter.slot === 'a' ? 1 : -1) * (dashIndex % 2 === 0 ? 1 : -1);
  const dashVelocity = normalizeVector(
    {
      x: awayX * 2 - awayY * strafeSign,
      y: awayY * 2 + awayX * strafeSign,
    },
    config.dashSpeed,
    { x: -fighter.aimDirection.x, y: -fighter.aimDirection.y }
  );
  fighter.velocity = copyVector(dashVelocity);
  fighter.smearstepCurrentDash = dashIndex;
}

function beginAbilityTelegraph(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  const opponent = getOpponent(context, fighter);
  const telegraphTicks = getEffectiveTelegraphTicks(fighter, context.rules);
  fighter.activationNumber += 1;
  fighter.abilityPhase = 'telegraph';
  fighter.abilityPhaseEndsAtTick = context.tick + telegraphTicks;
  fighter.telegraphOrigin = copyVector(fighter.position);
  fighter.aimDirection = copyVector(
    normalizeVector(
      {
        x: opponent.position.x - fighter.position.x,
        y: opponent.position.y - fighter.position.y,
      },
      DIRECTION_SCALE,
      { x: fighter.slot === 'a' ? DIRECTION_SCALE : -DIRECTION_SCALE, y: 0 }
    )
  );
  if (fighter.combatRole === 'mage' && fighter.barrierHitPoints <= 0) {
    fighter.barrierHitPoints = 6;
    appendEvent(context, {
      tick: context.tick,
      kind: 'barrier_created',
      actor: fighter.slot,
      hitPoints: fighter.barrierHitPoints,
    });
  }
  appendEvent(context, {
    tick: context.tick,
    kind: 'ability_telegraphed',
    actor: fighter.slot,
    power: fighter.primaryPower,
    activationNumber: fighter.activationNumber,
    origin: freezeVector(fighter.telegraphOrigin),
    aimDirection: freezeVector(fighter.aimDirection),
    activatesAtTick: fighter.abilityPhaseEndsAtTick,
  });
}

function activateAbility(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  const timing = getPowerTiming(fighter, context.rules);
  fighter.abilityPhase = 'active';
  fighter.abilityActivatedAtTick = context.tick;
  fighter.abilityPhaseEndsAtTick = context.tick + timing.activeTicks;
  fighter.abilityOrigin = copyVector(fighter.position);
  fighter.abilityHitOpponent = false;
  fighter.haloNextTargetHitTick = context.tick;
  fighter.haloNextWallRiskTick = context.tick;
  fighter.smearstepHitMask = 0;
  fighter.roleSpecialShotMask = 0;
  fighter.smearstepCurrentDash = -1;
  fighter.colorburstFired = false;

  if (fighter.primaryPower === 'smearstep') {
    aimSmearstepDash(context, fighter, 0);
  } else if (fighter.primaryPower === 'colorburst') {
    createColorburstEcho(context, fighter);
  }

  appendEvent(context, {
    tick: context.tick,
    kind: 'ability_activated',
    actor: fighter.slot,
    power: fighter.primaryPower,
    activationNumber: fighter.activationNumber,
    activeUntilTick: fighter.abilityPhaseEndsAtTick,
  });
}

function finishAbility(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  appendEvent(context, {
    tick: context.tick,
    kind: 'ability_finished',
    actor: fighter.slot,
    power: fighter.primaryPower,
    activationNumber: fighter.activationNumber,
  });
  if (fighter.primaryPower === 'smearstep') {
    fighter.velocity = copyVector(
      normalizeVector(
        fighter.velocity,
        fighter.baseMovementPerTick,
        fighter.aimDirection
      )
    );
    fighter.smearstepCurrentDash = -1;
  }
  fighter.abilityPhase = 'cooldown';
  if (fighter.inkPressureRefreshPending) {
    fighter.inkPressureRefreshPending = false;
    fighter.abilityReadyAtTick = context.tick;
  } else {
    fighter.abilityReadyAtTick =
      context.tick + getEffectiveCooldownTicks(context, fighter);
  }
}

function executeAbilityTransitions(context: SimulationContext): void {
  for (const fighter of context.fighters) {
    if (fighter.hitPoints <= 0) {
      continue;
    }
    if (
      fighter.abilityPhase === 'active' &&
      context.tick >= fighter.abilityPhaseEndsAtTick
    ) {
      finishAbility(context, fighter);
    } else if (
      fighter.abilityPhase === 'telegraph' &&
      context.tick >= fighter.abilityPhaseEndsAtTick
    ) {
      activateAbility(context, fighter);
    } else if (
      fighter.abilityPhase === 'cooldown' &&
      context.tick >= fighter.abilityReadyAtTick
    ) {
      beginAbilityTelegraph(context, fighter);
    }
  }
  assertEntityCap(context);
}

function getSmearstepDashStrideTicks(config: SmearstepAbilityConfig): number {
  return config.dashTicks + config.pauseTicks;
}

function getSmearstepDashIndexAtAge(
  config: SmearstepAbilityConfig,
  activeAge: number
): number {
  if (activeAge < 0) return -1;
  const dashIndex = Math.floor(activeAge / getSmearstepDashStrideTicks(config));
  return dashIndex < config.dashCount ? dashIndex : -1;
}

function fighterIsDashing(
  context: SimulationContext,
  fighter: MutableFighterState
): boolean {
  if (
    fighter.primaryPower !== 'smearstep' ||
    fighter.abilityPhase !== 'active'
  ) {
    return false;
  }
  const config = context.rules.abilities.smearstep;
  const age = context.tick - fighter.abilityActivatedAtTick;
  const dashIndex = getSmearstepDashIndexAtAge(config, age);
  if (dashIndex < 0) return false;
  const dashAge = age - dashIndex * getSmearstepDashStrideTicks(config);
  return dashAge < config.dashTicks;
}

function updateMovementIntent(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  if (context.tick < fighter.movementOverrideUntilTick) return;
  if (
    fighter.primaryPower === 'smearstep' &&
    fighter.abilityPhase === 'active'
  ) {
    const config = context.rules.abilities.smearstep;
    const age = context.tick - fighter.abilityActivatedAtTick;
    const dashIndex = getSmearstepDashIndexAtAge(config, age);
    const dashAge =
      dashIndex < 0
        ? -1
        : age - dashIndex * getSmearstepDashStrideTicks(config);
    if (dashAge === config.dashTicks) {
      fighter.velocity = copyVector(
        normalizeVector(
          fighter.velocity,
          fighter.baseMovementPerTick,
          fighter.aimDirection
        )
      );
      fighter.smearstepCurrentDash = -1;
    } else if (dashIndex > 0 && dashAge === 0) {
      aimSmearstepDash(context, fighter, dashIndex);
    }
  }

  if (
    !fighterIsDashing(context, fighter) &&
    context.tick % context.rules.fighter.steeringIntervalTicks === 0
  ) {
    const opponent = getOpponent(context, fighter);
    const towardOpponent = {
      x: opponent.position.x - fighter.position.x,
      y: opponent.position.y - fighter.position.y,
    };
    const distance = integerSquareRoot(
      squaredDistance(fighter.position, opponent.position)
    );
    const roleRules = getCombatRoleRules(fighter.combatRole);
    let movementIntent: FixedVector;
    if (fighter.combatRole === 'brawler') {
      movementIntent = towardOpponent;
    } else if (
      fighter.combatRole === 'mage' &&
      (fighter.abilityPhase === 'telegraph' ||
        fighter.abilityPhase === 'active')
    ) {
      fighter.velocity = { x: 0, y: 0 };
      return;
    } else if (distance < roleRules.preferredRangeMinimum) {
      movementIntent = {
        x: -towardOpponent.x,
        y: -towardOpponent.y,
      };
    } else if (distance > roleRules.preferredRangeMaximum) {
      movementIntent = towardOpponent;
    } else {
      const strafeSign = fighter.slot === 'a' ? 1 : -1;
      movementIntent = {
        x: -towardOpponent.y * strafeSign,
        y: towardOpponent.x * strafeSign,
      };
    }
    const movementSpeed = fighter.baseMovementPerTick;
    fighter.velocity = copyVector(
      normalizeVector(movementIntent, movementSpeed, fighter.aimDirection)
    );
  }
}

function executeMovement(context: SimulationContext): void {
  for (const fighter of context.fighters) {
    updateMovementIntent(context, fighter);
    fighter.position.x += fighter.velocity.x;
    fighter.position.y += fighter.velocity.y;
  }
}

function constrainFighterToArena(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  const minimumX = -context.arenaHalfWidth + fighter.radius;
  const maximumX = context.arenaHalfWidth - fighter.radius;
  const minimumY = -context.arenaHalfHeight + fighter.radius;
  const maximumY = context.arenaHalfHeight - fighter.radius;
  let bouncedX = false;
  let bouncedY = false;

  if (fighter.position.x < minimumX) {
    fighter.position.x = minimumX;
    fighter.velocity.x = Math.abs(fighter.velocity.x);
    bouncedX = true;
  } else if (fighter.position.x > maximumX) {
    fighter.position.x = maximumX;
    fighter.velocity.x = -Math.abs(fighter.velocity.x);
    bouncedX = true;
  }
  if (fighter.position.y < minimumY) {
    fighter.position.y = minimumY;
    fighter.velocity.y = Math.abs(fighter.velocity.y);
    bouncedY = true;
  } else if (fighter.position.y > maximumY) {
    fighter.position.y = maximumY;
    fighter.velocity.y = -Math.abs(fighter.velocity.y);
    bouncedY = true;
  }

  if (bouncedX || bouncedY) {
    appendEvent(context, {
      tick: context.tick,
      kind: 'wall_bounce',
      actor: fighter.slot,
      axis: bouncedX && bouncedY ? 'both' : bouncedX ? 'x' : 'y',
      position: freezeVector(fighter.position),
    });
    if (triggerPowerUp(context, fighter, 'v1-edge-spring')) {
      healFighterFromPowerUp(context, fighter, 'v1-edge-spring');
      fighter.edgeSpringAttacksRemaining = Math.max(
        fighter.edgeSpringAttacksRemaining,
        POWER_UP_CATALOG['v1-edge-spring'].repeatedAttacks ?? 0
      );
      fighter.velocity = copyVector(
        normalizeVector(
          { x: -fighter.position.x, y: -fighter.position.y },
          divideRounded(fighter.baseMovementPerTick * 3, 2),
          fighter.velocity
        )
      );
      fighter.movementOverrideUntilTick = context.tick + 3;
    }
    if (
      fighter.lastKnockbackBy !== null &&
      context.tick - fighter.lastKnockbackTick <= 2
    ) {
      const wallopOwner = getFighter(context, fighter.lastKnockbackBy);
      dealPowerUpDamage(
        context,
        wallopOwner,
        fighter,
        'v1-wallop',
        POWER_UP_CATALOG['v1-wallop'].bonusDamage ?? 0
      );
    }
  }
}

function executeWallConstraints(context: SimulationContext): void {
  for (const fighter of context.fighters) {
    constrainFighterToArena(context, fighter);
    if (fighter.echo !== null) {
      fighter.echo.position = clampPositionInsideArena(
        context,
        fighter.echo.position,
        context.rules.abilities.colorburst.echoRadius
      );
    }
  }
}

function shatterEcho(
  context: SimulationContext,
  owner: MutableFighterState,
  shatteredBy: FighterSlot
): void {
  const echo = owner.echo;
  if (echo === null) {
    return;
  }
  appendEvent(context, {
    tick: context.tick,
    kind: 'echo_shattered',
    owner: owner.slot,
    shatteredBy,
    position: freezeVector(echo.position),
  });
  owner.echo = null;
}

function resolveFighterBodyCollision(context: SimulationContext): void {
  const fighterA = context.fighters[0];
  const fighterB = context.fighters[1];
  if (
    !circlesOverlap(
      fighterA.position,
      fighterA.radius,
      fighterB.position,
      fighterB.radius
    )
  ) {
    return;
  }

  context.fighterCollisionThisTick = true;
  let differenceX = fighterB.position.x - fighterA.position.x;
  const differenceY = fighterB.position.y - fighterA.position.y;
  if (differenceX === 0 && differenceY === 0) {
    differenceX = 1;
  }
  const distanceSquared = differenceX * differenceX + differenceY * differenceY;
  const distance = Math.max(1, integerSquareRoot(distanceSquared));
  const overlap = Math.max(0, fighterA.radius + fighterB.radius - distance);
  const correction = Math.max(1, Math.ceil(overlap / 2));
  const correctionX = divideRounded(differenceX * correction, distance);
  const correctionY = divideRounded(differenceY * correction, distance);
  fighterA.position.x -= correctionX;
  fighterA.position.y -= correctionY;
  fighterB.position.x += correctionX;
  fighterB.position.y += correctionY;

  const relativeVelocityX = fighterB.velocity.x - fighterA.velocity.x;
  const relativeVelocityY = fighterB.velocity.y - fighterA.velocity.y;
  const relativeNormalSpeed =
    relativeVelocityX * differenceX + relativeVelocityY * differenceY;
  if (relativeNormalSpeed < 0) {
    const adjustmentX = divideRounded(
      relativeNormalSpeed * differenceX,
      Math.max(1, distanceSquared)
    );
    const adjustmentY = divideRounded(
      relativeNormalSpeed * differenceY,
      Math.max(1, distanceSquared)
    );
    const velocityA = clampVectorComponents(
      {
        x: fighterA.velocity.x + adjustmentX,
        y: fighterA.velocity.y + adjustmentY,
      },
      context.rules.fighter.maximumVelocityPerAxis
    );
    const velocityB = clampVectorComponents(
      {
        x: fighterB.velocity.x - adjustmentX,
        y: fighterB.velocity.y - adjustmentY,
      },
      context.rules.fighter.maximumVelocityPerAxis
    );
    fighterA.velocity = copyVector(velocityA);
    fighterB.velocity = copyVector(velocityB);
  }

  constrainFighterToArena(context, fighterA);
  constrainFighterToArena(context, fighterB);
  if (context.tick - context.lastFighterCollisionEventTick >= 4) {
    appendEvent(context, {
      tick: context.tick,
      kind: 'fighter_collision',
      position: midpoint(fighterA.position, fighterB.position),
    });
    context.lastFighterCollisionEventTick = context.tick;
  }
}

function executeFighterCollision(context: SimulationContext): void {
  resolveFighterBodyCollision(context);
  for (const echoOwner of context.fighters) {
    const opponent = getOpponent(context, echoOwner);
    if (
      echoOwner.echo !== null &&
      circlesOverlap(
        echoOwner.echo.position,
        context.rules.abilities.colorburst.echoRadius,
        opponent.position,
        opponent.radius
      )
    ) {
      shatterEcho(context, echoOwner, opponent.slot);
    }
  }
}

function getDefenseTicks(context: SimulationContext): number {
  return context.tick >= context.rules.lateFight.startsAtTick
    ? context.rules.lateFight.shortenedDefenseTicks
    : context.rules.lateFight.normalDefenseTicks;
}

function isSignatureDamageSource(
  fighter: MutableFighterState,
  damageSource: DamageSource
): boolean {
  return (
    damageSource === fighter.primaryPower ||
    (fighter.primaryPower === 'colorburst' &&
      damageSource === 'colorburst_echo')
  );
}

function isNormalAttackDamageSource(damageSource: DamageSource): boolean {
  return (
    damageSource === 'brawler_slam' ||
    damageSource === 'longshot_quill' ||
    damageSource === 'gunner_shot' ||
    damageSource === 'mage_bolt'
  );
}

function getBasicAttackDamage(fighter: MutableFighterState): number {
  const roleRules = getCombatRoleRules(fighter.combatRole);
  return (
    roleRules.basicAttackBaseDamage +
    Math.floor(getRoleStat(fighter) / roleRules.basicAttackStatDivisor)
  );
}

function applyResolvedDamage(
  context: SimulationContext,
  source: MutableFighterState,
  target: MutableFighterState,
  damageSource: DamageSource,
  requestedDamage: number,
  options: DamageOptions
): number {
  if (!options.bypassDefense && context.tick < target.defenseUntilTick) {
    return 0;
  }
  const incomingSignature =
    source.slot !== target.slot &&
    isSignatureDamageSource(source, damageSource);
  let damageAfterSmudgeStep = requestedDamage;
  if (source.slot !== target.slot && isNormalAttackDamageSource(damageSource)) {
    target.incomingNormalAttackCount += 1;
    if (
      target.incomingNormalAttackCount % 4 === 0 &&
      triggerPowerUp(context, target, 'v1-smudge-step', source)
    ) {
      const strafeSign = target.slot === 'a' ? 1 : -1;
      target.velocity = copyVector(
        normalizeVector(
          {
            x: -target.velocity.y * strafeSign,
            y: target.velocity.x * strafeSign,
          },
          target.baseMovementPerTick * 2,
          target.aimDirection
        )
      );
      target.movementOverrideUntilTick = context.tick + 3;
      damageAfterSmudgeStep = Math.max(
        0,
        damageAfterSmudgeStep -
          (POWER_UP_CATALOG['v1-smudge-step'].preventedDamage ?? 0)
      );
    }
  }
  let damageAfterPowerUpDefense = damageAfterSmudgeStep;
  if (incomingSignature && fighterOwnsPowerUp(target, 'v1-paper-shield')) {
    const preventedDamage = Math.min(
      damageAfterSmudgeStep,
      POWER_UP_CATALOG['v1-paper-shield'].preventedDamage ?? 0
    );
    if (
      preventedDamage > 0 &&
      triggerPowerUp(context, target, 'v1-paper-shield', source)
    ) {
      damageAfterPowerUpDefense -= preventedDamage;
    }
  }
  const haloInterceptsAreaDamage =
    target.primaryPower === 'nib_halo' &&
    target.abilityPhase === 'active' &&
    (damageSource === 'inkquake' ||
      damageSource === 'colorburst' ||
      damageSource === 'colorburst_echo');
  const damageAfterHaloInterception = haloInterceptsAreaDamage
    ? divideRounded(
        damageAfterPowerUpDefense *
          (1_000 -
            context.rules.abilities.nib_halo.areaDamageReductionPermille),
        1_000
      )
    : damageAfterPowerUpDefense;
  if (damageAfterHaloInterception <= 0) {
    return 0;
  }

  let remainingDamage = damageAfterHaloInterception;
  if (!options.bypassBarrier && target.barrierHitPoints > 0) {
    const absorbedDamage = Math.min(target.barrierHitPoints, remainingDamage);
    target.barrierHitPoints -= absorbedDamage;
    remainingDamage -= absorbedDamage;
    appendEvent(context, {
      tick: context.tick,
      kind: 'barrier_hit',
      actor: target.slot,
      sourceFighter: source.slot,
      source: damageSource,
      sourceActivationNumber: source.activationNumber,
      absorbedDamage,
      remainingHitPoints: target.barrierHitPoints,
    });
    if (target.barrierHitPoints === 0) {
      appendEvent(context, {
        tick: context.tick,
        kind: 'barrier_broken',
        actor: target.slot,
      });
    }
  }

  if (remainingDamage <= 0) {
    return 0;
  }
  const protectedHitPoints =
    context.tick < context.rules.fighter.knockoutsEnabledAtTick ? 1 : 0;
  const damageableHitPoints = Math.max(
    0,
    target.hitPoints - protectedHitPoints
  );
  let actualDamage = Math.min(damageableHitPoints, remainingDamage);
  if (
    context.tick >= context.rules.fighter.knockoutsEnabledAtTick &&
    actualDamage >= target.hitPoints &&
    remainingDamage <=
      (POWER_UP_CATALOG['v1-last-scribble'].lethalDamageCap ??
        Number.MAX_SAFE_INTEGER) &&
    triggerPowerUp(context, target, 'v1-last-scribble', source)
  ) {
    const survivingHitPoints = Math.max(
      1,
      POWER_UP_CATALOG['v1-last-scribble'].survivingHitPointPermille ===
        undefined
        ? (POWER_UP_CATALOG['v1-last-scribble'].survivingHitPoints ?? 1)
        : divideRounded(
            target.maxHitPoints *
              POWER_UP_CATALOG['v1-last-scribble'].survivingHitPointPermille,
            1_000
          )
    );
    actualDamage = Math.max(0, target.hitPoints - survivingHitPoints);
    target.defenseUntilTick = Math.max(
      target.defenseUntilTick,
      context.tick + (POWER_UP_CATALOG['v1-last-scribble'].durationTicks ?? 0)
    );
  }
  if (actualDamage <= 0) {
    return 0;
  }
  const hitPointsBeforeDamage = target.hitPoints;
  target.hitPoints -= actualDamage;
  if (source.slot !== target.slot) {
    source.damageDealt += actualDamage;
  }
  if (!options.bypassDefense) {
    target.defenseUntilTick = Math.max(
      target.defenseUntilTick,
      context.tick + getDefenseTicks(context)
    );
  }
  appendEvent(context, {
    tick: context.tick,
    kind: 'damage',
    sourceFighter: source.slot,
    targetFighter: target.slot,
    source: damageSource,
    amount: actualDamage,
    targetHitPoints: target.hitPoints,
    critical: options.critical,
    position: freezeVector(target.position),
  });

  if (incomingSignature && actualDamage > 0) {
    source.abilityHitOpponent = true;
    const doubleDoodle = POWER_UP_CATALOG['v1-double-doodle'];
    schedulePowerUpDamage(
      context,
      source,
      'v1-double-doodle',
      target,
      doubleDoodle.delayTicks ?? 0,
      Math.min(
        doubleDoodle.bonusDamageCap ?? Number.MAX_SAFE_INTEGER,
        Math.max(
          1,
          divideRounded(actualDamage * (doubleDoodle.powerPermille ?? 0), 1_000)
        )
      )
    );
    if (
      fighterOwnsPowerUp(source, 'v1-echo-mark') &&
      (source.powerUpActivations.get('v1-echo-mark') ?? 0) <
        POWER_UP_CATALOG['v1-echo-mark'].maximumActivations
    ) {
      source.echoMarkAttacksRemaining = Math.max(
        source.echoMarkAttacksRemaining,
        POWER_UP_CATALOG['v1-echo-mark'].repeatedAttacks ?? 0
      );
    }
    const counterSketch = POWER_UP_CATALOG['v1-counter-sketch'];
    schedulePowerUpDamage(
      context,
      target,
      'v1-counter-sketch',
      source,
      1,
      Math.min(
        counterSketch.bonusDamageCap ?? Number.MAX_SAFE_INTEGER,
        Math.max(
          1,
          divideRounded(
            getBasicAttackDamage(target) * (counterSketch.powerPermille ?? 0),
            1_000
          )
        )
      )
    );
  }
  if (
    hitPointsBeforeDamage * 2 > target.maxHitPoints &&
    target.hitPoints * 2 <= target.maxHitPoints
  ) {
    if (triggerPowerUp(context, target, 'v1-center-fold')) {
      healFighterFromPowerUp(context, target, 'v1-center-fold');
      target.defenseUntilTick = Math.max(
        target.defenseUntilTick,
        context.tick + (POWER_UP_CATALOG['v1-center-fold'].durationTicks ?? 0)
      );
    }
    if (triggerPowerUp(context, target, 'v1-second-draft')) {
      target.inkRageAttacksRemaining =
        POWER_UP_CATALOG['v1-second-draft'].repeatedAttacks ?? 0;
    }
  }
  return actualDamage;
}

const ROLE_MATCHUP_DAMAGE_MULTIPLIERS: Readonly<
  Record<
    Exclude<CombatRole, 'gunner'>,
    Readonly<Record<Exclude<CombatRole, 'gunner'>, number>>
  >
> = Object.freeze({
  // These are small counterweights for each role's native range, cadence, and
  // shielding—not the player-facing edge by themselves. The complete engine
  // targets 60% for Brawler > Mage > Longshot > Brawler and 50% for mirrors.
  brawler: Object.freeze({
    brawler: 1_000,
    longshot: 1_005,
    mage: 760,
  }),
  longshot: Object.freeze({
    brawler: 1_400,
    longshot: 1_000,
    mage: 1_100,
  }),
  mage: Object.freeze({
    brawler: 1_127,
    longshot: 941,
    mage: 1_000,
  }),
});

function getRoleMatchupDamageMultiplierPermille(
  attacker: CombatRole,
  defender: CombatRole
): number {
  return ROLE_MATCHUP_DAMAGE_MULTIPLIERS[toCurrentCombatRole(attacker)][
    toCurrentCombatRole(defender)
  ];
}

function rollAndApplyDamage(
  context: SimulationContext,
  source: MutableFighterState,
  target: MutableFighterState,
  damageSource: DamageSource,
  baseDamage: number,
  _rollCoordinate: string | number,
  applyElementPayload: boolean
): number {
  const criticalChance = Math.min(
    context.rules.fighter.maximumCriticalChancePermille,
    source.input.stats.charm *
      context.rules.fighter.criticalChancePermillePerCharm +
      source.combatModifiers.criticalChanceBonusPermille
  );
  source.resolvedAttackCount += 1;
  const criticalInterval =
    criticalChance <= 0
      ? Number.MAX_SAFE_INTEGER
      : Math.ceil(1_000 / criticalChance);
  const critical = source.resolvedAttackCount % criticalInterval === 0;
  const roleMultiplierPermille =
    source.slot === target.slot
      ? 1_000
      : getRoleMatchupDamageMultiplierPermille(
          source.combatRole,
          target.combatRole
        );
  const scaledRoleDamage =
    baseDamage * roleMultiplierPermille +
    (source.slot === target.slot ? 0 : source.roleDamageRemainderPermille);
  let damage = Math.max(1, Math.floor(scaledRoleDamage / 1_000));
  if (source.slot !== target.slot) {
    source.roleDamageRemainderPermille = scaledRoleDamage % 1_000;
  }
  damage = Math.max(
    1,
    divideRounded(
      damage * (source.input.damageModifierPermille ?? 1_000),
      1_000
    )
  );
  damage = Math.max(
    1,
    divideRounded(damage * source.combatModifiers.damagePermille, 1_000)
  );
  const minimumVariance = context.rules.fighter.minimumDamageVariancePermille;
  const maximumVariance = context.rules.fighter.maximumDamageVariancePermille;
  if (minimumVariance !== 1_000 || maximumVariance !== 1_000) {
    const varianceRange = maximumVariance - minimumVariance + 1;
    const variancePermille =
      minimumVariance +
      deterministicInteger(
        context.seed,
        'combat-damage-variance',
        varianceRange,
        source.slot,
        target.slot,
        context.tick,
        damageSource,
        _rollCoordinate
      );
    damage = Math.max(1, divideRounded(damage * variancePermille, 1_000));
  }
  if (critical) {
    damage = Math.max(
      1,
      divideRounded(
        damage * context.rules.fighter.criticalDamageMultiplierPermille,
        1_000
      )
    );
  }
  return applyResolvedDamage(context, source, target, damageSource, damage, {
    applyElementPayload,
    bypassDefense: false,
    bypassBarrier: false,
    critical,
  });
}

function pushAwayFrom(
  context: SimulationContext,
  source: MutableFighterState,
  sourcePosition: FixedVector,
  target: MutableFighterState,
  speed: number
): void {
  const impulse = normalizeVector(
    {
      x: target.position.x - sourcePosition.x,
      y: target.position.y - sourcePosition.y,
    },
    speed,
    target.aimDirection
  );
  target.velocity = copyVector(
    clampVectorComponents(
      {
        x: target.velocity.x + impulse.x,
        y: target.velocity.y + impulse.y,
      },
      context.rules.fighter.maximumVelocityPerAxis
    )
  );
  target.lastKnockbackBy = source.slot;
  target.lastKnockbackTick = context.tick;
}

function interruptTelegraphedAbility(
  context: SimulationContext,
  target: MutableFighterState,
  interrupter: MutableFighterState
): void {
  if (target.abilityPhase !== 'telegraph') {
    return;
  }
  appendEvent(context, {
    tick: context.tick,
    kind: 'ability_interrupted',
    actor: target.slot,
    interruptedBy: interrupter.slot,
    power: target.primaryPower,
    activationNumber: target.activationNumber,
  });
  target.abilityPhase = 'cooldown';
  target.abilityPhaseEndsAtTick = context.tick;
  target.abilityReadyAtTick =
    context.tick +
    Math.max(10, Math.floor(getEffectiveCooldownTicks(context, target) / 2));
}

function getRoleStat(fighter: MutableFighterState): number {
  switch (fighter.combatRole) {
    case 'brawler':
      return fighter.input.stats.chonk;
    case 'longshot':
      return Math.max(fighter.input.stats.spike, fighter.input.stats.zip);
    case 'gunner':
      return fighter.input.stats.zip;
    case 'mage':
      return fighter.input.stats.charm;
  }
}

function appendRoleAttack(
  context: SimulationContext,
  fighter: MutableFighterState,
  attack: Extract<BattleTimelineEvent, { kind: 'role_attack' }>['attack'],
  attackNumber: number,
  shotNumber: number,
  targetPosition: FixedVector,
  hit: boolean
): void {
  appendEvent(context, {
    tick: context.tick,
    kind: 'role_attack',
    actor: fighter.slot,
    role: fighter.combatRole,
    attack,
    attackNumber,
    shotNumber,
    origin: freezeVector(fighter.position),
    target: freezeVector(targetPosition),
    hit,
  });
}

function finalizeBasicAttack(
  context: SimulationContext,
  fighter: MutableFighterState,
  target: MutableFighterState,
  hit: boolean,
  landedDamage: number
): void {
  if (!hit) {
    fighter.basicHitStreak = 0;
    return;
  }

  fighter.basicHitStreak += 1;
  fighter.successfulNormalHitCount += 1;
  if (fighter.edgeSpringAttacksRemaining > 0) {
    fighter.edgeSpringAttacksRemaining -= 1;
    applyBudgetedPowerUpDamage(
      context,
      fighter,
      target,
      POWER_UP_CATALOG['v1-edge-spring'].bonusDamage ?? 0
    );
  }
  const comboSparkRequiredHits =
    POWER_UP_CATALOG['v1-combo-spark'].requiredConsecutiveHits ?? 3;
  if (
    comboSparkRequiredHits > 0 &&
    fighter.basicHitStreak % comboSparkRequiredHits === 0
  ) {
    dealPowerUpDamage(
      context,
      fighter,
      target,
      'v1-combo-spark',
      Math.min(
        POWER_UP_CATALOG['v1-combo-spark'].bonusDamageCap ??
          Number.MAX_SAFE_INTEGER,
        Math.max(
          1,
          divideRounded(
            landedDamage *
              (POWER_UP_CATALOG['v1-combo-spark'].powerPermille ?? 0),
            1_000
          )
        )
      )
    );
  }
  const heartInkRequiredHits =
    POWER_UP_CATALOG['v1-backup-plan'].requiredConsecutiveHits ?? 4;
  if (
    heartInkRequiredHits > 0 &&
    fighter.successfulNormalHitCount % heartInkRequiredHits === 0 &&
    triggerPowerUp(context, fighter, 'v1-backup-plan')
  ) {
    healFighterFromPowerUp(context, fighter, 'v1-backup-plan');
  }
  if (fighter.echoMarkAttacksRemaining > 0) {
    fighter.echoMarkAttacksRemaining -= 1;
    dealPowerUpDamage(
      context,
      fighter,
      target,
      'v1-echo-mark',
      Math.min(
        POWER_UP_CATALOG['v1-echo-mark'].bonusDamageCap ??
          Number.MAX_SAFE_INTEGER,
        Math.max(
          1,
          divideRounded(
            landedDamage *
              (POWER_UP_CATALOG['v1-echo-mark'].powerPermille ?? 0),
            1_000
          )
        )
      )
    );
  }
  if (fighter.inkRageAttacksRemaining > 0) {
    fighter.inkRageAttacksRemaining -= 1;
    applyBudgetedPowerUpDamage(
      context,
      fighter,
      target,
      POWER_UP_CATALOG['v1-second-draft'].bonusDamage ?? 0
    );
    healFighterFromPowerUp(context, fighter, 'v1-second-draft');
  }
  if (
    fighter.paperTwinAttacksRemaining === 0 &&
    triggerPowerUp(context, fighter, 'v1-paper-twin')
  ) {
    fighter.paperTwinAttacksRemaining =
      POWER_UP_CATALOG['v1-paper-twin'].repeatedAttacks ?? 0;
  }
  if (fighter.paperTwinAttacksRemaining > 0) {
    fighter.paperTwinAttacksRemaining -= 1;
    const paperTwin = POWER_UP_CATALOG['v1-paper-twin'];
    applyBudgetedPowerUpDamage(
      context,
      fighter,
      target,
      Math.min(
        paperTwin.bonusDamageCap ?? Number.MAX_SAFE_INTEGER,
        Math.max(
          1,
          divideRounded(landedDamage * (paperTwin.powerPermille ?? 0), 1_000)
        )
      )
    );
  }
}

function executeSingleRoleAttack(
  context: SimulationContext,
  fighter: MutableFighterState,
  attackNumber: number,
  shotNumber: number
): void {
  const opponent = getOpponent(context, fighter);
  const roleRules = getCombatRoleRules(fighter.combatRole);
  const distance = integerSquareRoot(
    squaredDistance(fighter.position, opponent.position)
  );
  const maximumRange =
    roleRules.preferredRangeMaximum +
    (fighter.combatRole === 'gunner'
      ? 1_200
      : fighter.combatRole === 'mage'
        ? 1_600
        : fighter.combatRole === 'longshot'
          ? 700
          : 1_000);
  const damage =
    roleRules.basicAttackBaseDamage +
    Math.floor(getRoleStat(fighter) / roleRules.basicAttackStatDivisor);
  let attack: Extract<BattleTimelineEvent, { kind: 'role_attack' }>['attack'];
  let source: DamageSource;
  switch (fighter.combatRole) {
    case 'longshot':
      attack = 'piercing_quill';
      source = 'longshot_quill';
      break;
    case 'gunner':
      attack = 'ink_shot';
      source = 'gunner_shot';
      break;
    case 'mage':
      attack = 'color_bolt';
      source = 'mage_bolt';
      break;
    case 'brawler':
      return;
  }
  const inRange = distance <= maximumRange;
  const actualDamage = inRange
    ? rollAndApplyDamage(
        context,
        fighter,
        opponent,
        source,
        damage,
        attackNumber,
        true
      )
    : 0;
  appendRoleAttack(
    context,
    fighter,
    attack,
    attackNumber,
    shotNumber,
    opponent.position,
    actualDamage > 0
  );
  fighter.currentBasicAttackHit ||= actualDamage > 0;
  fighter.currentBasicAttackDamage = Math.max(
    fighter.currentBasicAttackDamage,
    actualDamage
  );
  const basicAttackFinished =
    fighter.combatRole !== 'gunner' ||
    shotNumber === getCombatRoleRules('gunner').burstShotCount;
  if (basicAttackFinished) {
    finalizeBasicAttack(
      context,
      fighter,
      opponent,
      fighter.currentBasicAttackHit,
      fighter.currentBasicAttackDamage
    );
    fighter.currentBasicAttackHit = false;
    fighter.currentBasicAttackDamage = 0;
  }
  if (actualDamage > 0 && fighter.combatRole === 'longshot') {
    pushAwayFrom(context, fighter, fighter.position, opponent, 180);
  }
  if (
    actualDamage > 0 &&
    fighter.combatRole === 'gunner' &&
    opponent.combatRole === 'longshot'
  ) {
    opponent.basicAttackReadyAtTick = Math.max(
      opponent.basicAttackReadyAtTick,
      context.tick + 5
    );
    interruptTelegraphedAbility(context, opponent, fighter);
  }
}

function executeRoleAttacks(context: SimulationContext): void {
  const fightersByStableIdentity = [...context.fighters].sort((left, right) =>
    left.input.id.localeCompare(right.input.id)
  );
  for (const fighter of fightersByStableIdentity) {
    if (fighter.hitPoints <= 0 || fighter.combatRole === 'brawler') {
      continue;
    }
    const roleRules = getCombatRoleRules(fighter.combatRole);
    if (fighter.combatRole === 'gunner' && fighter.burstShotsRemaining > 0) {
      if (context.tick < fighter.nextBurstShotTick) {
        continue;
      }
      const shotNumber =
        roleRules.burstShotCount - fighter.burstShotsRemaining + 1;
      executeSingleRoleAttack(
        context,
        fighter,
        fighter.basicAttackNumber,
        shotNumber
      );
      fighter.burstShotsRemaining -= 1;
      fighter.nextBurstShotTick =
        context.tick + roleRules.burstShotIntervalTicks;
      if (fighter.burstShotsRemaining === 0) {
        fighter.basicAttackReadyAtTick =
          context.tick + roleRules.basicAttackCooldownTicks;
      }
      continue;
    }
    if (fighter.abilityPhase !== 'cooldown') {
      continue;
    }
    if (context.tick < fighter.basicAttackReadyAtTick) {
      continue;
    }
    if (fighter.combatRole === 'gunner') {
      fighter.basicAttackNumber += 1;
      fighter.burstShotsRemaining = roleRules.burstShotCount;
      fighter.nextBurstShotTick = context.tick;
      executeSingleRoleAttack(context, fighter, fighter.basicAttackNumber, 1);
      fighter.burstShotsRemaining -= 1;
      fighter.nextBurstShotTick =
        context.tick + roleRules.burstShotIntervalTicks;
      if (fighter.burstShotsRemaining === 0) {
        fighter.basicAttackReadyAtTick =
          context.tick + roleRules.basicAttackCooldownTicks;
      }
    } else {
      fighter.basicAttackNumber += 1;
      executeSingleRoleAttack(context, fighter, fighter.basicAttackNumber, 1);
      fighter.basicAttackReadyAtTick =
        context.tick + roleRules.basicAttackCooldownTicks;
    }
  }
}

function resolveInkquake(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  const config = context.rules.abilities.inkquake;
  const opponent = getOpponent(context, fighter);
  const age = context.tick - fighter.abilityActivatedAtTick;
  const radius =
    config.startingRadius +
    divideRounded(
      (config.endingRadius - config.startingRadius) * age,
      Math.max(1, config.activeTicks - 1)
    );

  if (
    !fighter.abilityHitOpponent &&
    expandingRingIntersectsCircle(
      fighter.abilityOrigin,
      radius,
      config.waveThickness,
      opponent.position,
      opponent.radius
    )
  ) {
    fighter.abilityHitOpponent = true;
    rollAndApplyDamage(
      context,
      fighter,
      opponent,
      'inkquake',
      config.baseDamage +
        Math.floor(fighter.input.stats.chonk / config.chonkDamageDivisor),
      age,
      true
    );
    pushAwayFrom(
      context,
      fighter,
      fighter.abilityOrigin,
      opponent,
      config.knockbackSpeed
    );
  }

  if (
    opponent.echo !== null &&
    expandingRingIntersectsCircle(
      fighter.abilityOrigin,
      radius,
      config.waveThickness,
      opponent.echo.position,
      context.rules.abilities.colorburst.echoRadius
    )
  ) {
    shatterEcho(context, opponent, fighter.slot);
  }
}

function resolveNibHalo(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  const config = context.rules.abilities.nib_halo;
  const opponent = getOpponent(context, fighter);
  const age = context.tick - fighter.abilityActivatedAtTick;
  const shotAges = [0, 10, 20] as const;
  const shotIndex = shotAges.indexOf(age as 0 | 10 | 20);
  if (shotIndex < 0) return;
  const shotMask = 1 << shotIndex;
  if ((fighter.roleSpecialShotMask & shotMask) !== 0) return;
  fighter.roleSpecialShotMask |= shotMask;

  const distance = integerSquareRoot(
    squaredDistance(fighter.position, opponent.position)
  );
  const inRange = distance <= 7_500;
  const actualDamage = inRange
    ? rollAndApplyDamage(
        context,
        fighter,
        opponent,
        'nib_halo',
        Math.max(1, Math.floor(config.baseDamage / 2)) +
          Math.floor(getRoleStat(fighter) / 12),
        `${fighter.activationNumber}:${shotIndex}`,
        true
      )
    : 0;
  appendRoleAttack(
    context,
    fighter,
    'nib_volley',
    fighter.activationNumber,
    shotIndex + 1,
    opponent.position,
    actualDamage > 0
  );
  if (actualDamage > 0 && opponent.combatRole === 'brawler') {
    pushAwayFrom(context, fighter, fighter.position, opponent, 260);
  }
}

function resolveSmearstep(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  if (!fighterIsDashing(context, fighter)) {
    return;
  }
  const config = context.rules.abilities.smearstep;
  const opponent = getOpponent(context, fighter);
  const dashIndex = fighter.smearstepCurrentDash;
  if (dashIndex < 0) {
    return;
  }
  const dashMask = 1 << dashIndex;
  const activeAge = context.tick - fighter.abilityActivatedAtTick;
  const dashAge = activeAge - dashIndex * getSmearstepDashStrideTicks(config);
  if (dashAge === 0 && (fighter.roleSpecialShotMask & dashMask) === 0) {
    fighter.roleSpecialShotMask |= dashMask;
    const inRange =
      integerSquareRoot(squaredDistance(fighter.position, opponent.position)) <=
      5_400;
    const actualDamage = inRange
      ? rollAndApplyDamage(
          context,
          fighter,
          opponent,
          'smearstep',
          Math.max(1, config.baseDamage - 6) +
            Math.floor(fighter.input.stats.zip / 6),
          dashIndex,
          true
        )
      : 0;
    appendRoleAttack(
      context,
      fighter,
      'smearstep_barrage',
      fighter.activationNumber,
      dashIndex + 1,
      opponent.position,
      actualDamage > 0
    );
    if (actualDamage > 0 && opponent.combatRole === 'longshot') {
      interruptTelegraphedAbility(context, opponent, fighter);
    }
  }
  if (
    opponent.echo !== null &&
    circlesOverlap(
      fighter.position,
      fighter.radius + config.collisionRadiusBonus,
      opponent.echo.position,
      context.rules.abilities.colorburst.echoRadius
    )
  ) {
    shatterEcho(context, opponent, fighter.slot);
  }
}

function resolveColorburst(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  if (fighter.colorburstFired) {
    return;
  }
  fighter.colorburstFired = true;
  const config = context.rules.abilities.colorburst;
  const opponent = getOpponent(context, fighter);
  if (
    circleCenterIsInsideCone(
      fighter.abilityOrigin,
      fighter.aimDirection,
      config.coneRange,
      config.coneHalfAngleCosinePermille,
      opponent.position,
      opponent.radius
    )
  ) {
    rollAndApplyDamage(
      context,
      fighter,
      opponent,
      'colorburst',
      Math.max(1, config.baseDamage - 6) +
        Math.floor(fighter.input.stats.charm / 4),
      0,
      true
    );
  }
  if (
    opponent.echo !== null &&
    circleCenterIsInsideCone(
      fighter.abilityOrigin,
      fighter.aimDirection,
      config.coneRange,
      config.coneHalfAngleCosinePermille,
      opponent.echo.position,
      config.echoRadius
    )
  ) {
    shatterEcho(context, opponent, fighter.slot);
  }
}

function resolvePrimaryAbility(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  if (fighter.abilityPhase !== 'active') {
    return;
  }
  const primaryPower = fighter.primaryPower;
  switch (primaryPower) {
    case 'inkquake':
      resolveInkquake(context, fighter);
      return;
    case 'nib_halo':
      resolveNibHalo(context, fighter);
      return;
    case 'smearstep':
      resolveSmearstep(context, fighter);
      return;
    case 'colorburst':
      resolveColorburst(context, fighter);
      return;
    default:
      assertUnhandledShapePower(primaryPower);
  }
}

function resolveEchoes(context: SimulationContext): void {
  const config = context.rules.abilities.colorburst;
  for (const fighter of context.fighters) {
    const echo = fighter.echo;
    if (echo === null) {
      continue;
    }
    if (context.tick >= echo.expiresAtTick) {
      fighter.echo = null;
      continue;
    }
    if (context.tick < echo.firesAtTick) {
      continue;
    }
    appendEvent(context, {
      tick: context.tick,
      kind: 'echo_fired',
      actor: fighter.slot,
      position: freezeVector(echo.position),
      aimDirection: freezeVector(echo.aimDirection),
    });
    const opponent = getOpponent(context, fighter);
    if (
      circleCenterIsInsideCone(
        echo.position,
        echo.aimDirection,
        config.coneRange,
        config.coneHalfAngleCosinePermille,
        opponent.position,
        opponent.radius
      )
    ) {
      const fullDamage =
        Math.max(1, config.baseDamage - 6) +
        Math.floor(fighter.input.stats.charm / 4);
      rollAndApplyDamage(
        context,
        fighter,
        opponent,
        'colorburst_echo',
        Math.max(
          1,
          divideRounded(fullDamage * config.echoDamagePermille, 1_000)
        ),
        'echo',
        true
      );
    }
    fighter.echo = null;
  }
}

function resolveContactDamage(context: SimulationContext): void {
  if (!context.fighterCollisionThisTick) {
    return;
  }
  const eligibleAtStart = context.fighters.map((fighter) => {
    return (
      fighter.hitPoints > 0 &&
      fighter.combatRole === 'brawler' &&
      context.tick >= fighter.contactReadyTick
    );
  });
  for (let index = 0; index < context.fighters.length; index += 1) {
    if (eligibleAtStart[index] !== true) {
      continue;
    }
    const fighter = context.fighters[index];
    if (!fighter) {
      continue;
    }
    const opponent = getOpponent(context, fighter);
    fighter.contactReadyTick =
      context.tick + context.rules.fighter.contactCooldownTicks;
    fighter.basicAttackNumber += 1;
    const actualDamage = rollAndApplyDamage(
      context,
      fighter,
      opponent,
      'brawler_slam',
      getCombatRoleRules('brawler').basicAttackBaseDamage +
        Math.floor(
          fighter.input.stats.chonk /
            getCombatRoleRules('brawler').basicAttackStatDivisor
        ),
      context.tick,
      false
    );
    appendRoleAttack(
      context,
      fighter,
      'body_slam',
      fighter.basicAttackNumber,
      1,
      opponent.position,
      actualDamage > 0
    );
    finalizeBasicAttack(
      context,
      fighter,
      opponent,
      actualDamage > 0,
      actualDamage
    );
    if (actualDamage > 0 && opponent.combatRole === 'mage') {
      interruptTelegraphedAbility(context, opponent, fighter);
    }
  }
}

function executeAbilityCollisions(context: SimulationContext): void {
  const aliveAtStart = context.fighters.map((fighter) => fighter.hitPoints > 0);
  for (let index = 0; index < context.fighters.length; index += 1) {
    const fighter = context.fighters[index];
    if (fighter && aliveAtStart[index] === true) {
      resolvePrimaryAbility(context, fighter);
    }
  }
  resolveEchoes(context);
  resolveContactDamage(context);
}

function executeStatusEffects(context: SimulationContext): void {
  for (const fighter of context.fighters) {
    const pendingEffects: ScheduledPowerUpEffect[] = [];
    for (const effect of fighter.scheduledPowerUpEffects) {
      if (effect.tick > context.tick) {
        pendingEffects.push(effect);
        continue;
      }
      const target = getFighter(context, effect.target);
      if (fighter.hitPoints > 0 && target.hitPoints > 0) {
        applyBudgetedPowerUpDamage(context, fighter, target, effect.damage);
        healFighterFromPowerUp(context, fighter, effect.powerUpId);
      }
    }
    fighter.scheduledPowerUpEffects = pendingEffects;
  }
}

function executeInkPressure(context: SimulationContext): void {
  for (const fighter of context.fighters) {
    if (fighter.inkPressureUsed || fighter.hitPoints <= 0) {
      continue;
    }
    const lostHitPoints = fighter.maxHitPoints - fighter.hitPoints;
    if (
      lostHitPoints < fighter.inkPressureLostHitPointThreshold &&
      !fighter.inkPressureThresholdReachedBeforePowerUpHealing
    ) {
      continue;
    }
    fighter.inkPressureUsed = true;
    fighter.inkPressureThresholdReachedBeforePowerUpHealing = false;
    const refreshedImmediately = fighter.abilityPhase === 'cooldown';
    if (refreshedImmediately) {
      fighter.abilityReadyAtTick = context.tick;
    } else {
      fighter.inkPressureRefreshPending = true;
    }
    appendEvent(context, {
      tick: context.tick,
      kind: 'ink_pressure',
      actor: fighter.slot,
      refreshedImmediately,
    });
  }
}

function chooseStableWinner(context: SimulationContext): FighterSlot {
  const fighterA = context.fighters[0];
  const fighterB = context.fighters[1];
  return fighterA.input.id <= fighterB.input.id ? 'a' : 'b';
}

function chooseWinnerByDamageThenStable(
  context: SimulationContext
): FighterSlot {
  const fighterA = context.fighters[0];
  const fighterB = context.fighters[1];
  if (fighterA.damageDealt !== fighterB.damageDealt) {
    return fighterA.damageDealt > fighterB.damageDealt ? 'a' : 'b';
  }
  return chooseStableWinner(context);
}

function chooseTimeoutWinner(
  context: SimulationContext
): Readonly<{ winner: FighterSlot; reason: BattleEndReason }> {
  const fighterA = context.fighters[0];
  const fighterB = context.fighters[1];
  const percentageComparison =
    fighterA.hitPoints * fighterB.maxHitPoints -
    fighterB.hitPoints * fighterA.maxHitPoints;
  if (percentageComparison !== 0) {
    return Object.freeze({
      winner: percentageComparison > 0 ? 'a' : 'b',
      reason: 'timeout_hp_percentage',
    });
  }
  if (fighterA.damageDealt !== fighterB.damageDealt) {
    return Object.freeze({
      winner: fighterA.damageDealt > fighterB.damageDealt ? 'a' : 'b',
      reason: 'timeout_damage_dealt',
    });
  }
  return Object.freeze({
    winner: chooseStableWinner(context),
    reason: 'timeout_stable_tiebreak',
  });
}

function createFighterResult(fighter: MutableFighterState): FighterResult {
  return Object.freeze({
    slot: fighter.slot,
    id: fighter.input.id,
    finalHitPoints: fighter.hitPoints,
    maxHitPoints: fighter.maxHitPoints,
    hitPointPermille: Math.floor(
      (fighter.hitPoints * 1_000) / fighter.maxHitPoints
    ),
    damageDealt: fighter.damageDealt,
    primaryPower: fighter.primaryPower,
    combatRole: fighter.combatRole,
    inkPressureUsed: fighter.inkPressureUsed,
  });
}

function completeBattle(
  context: SimulationContext,
  winner: FighterSlot,
  reason: BattleEndReason
): void {
  if (context.result !== null) {
    return;
  }
  for (const fighter of context.fighters) {
    if (fighter.hitPoints <= 0) {
      appendEvent(context, {
        tick: context.tick,
        kind: 'fighter_defeated',
        actor: fighter.slot,
      });
    }
  }
  const loser = otherSlot(winner);
  context.result = Object.freeze({
    winner,
    loser,
    reason,
    completedTick: context.tick,
    completedMilliseconds: Math.floor(
      (context.tick * 1_000) / context.rules.tickRate
    ),
    fighters: freezePair(
      createFighterResult(context.fighters[0]),
      createFighterResult(context.fighters[1])
    ),
  });
  appendEvent(
    context,
    {
      tick: context.tick,
      kind: 'battle_ended',
      winner,
      reason,
    },
    true
  );
}

function executeDefeatResolution(context: SimulationContext): void {
  const fighterA = context.fighters[0];
  const fighterB = context.fighters[1];
  if (fighterA.hitPoints <= 0 && fighterB.hitPoints <= 0) {
    completeBattle(
      context,
      chooseWinnerByDamageThenStable(context),
      'double_knockout'
    );
  } else if (fighterA.hitPoints <= 0) {
    completeBattle(context, 'b', 'knockout');
  } else if (fighterB.hitPoints <= 0) {
    completeBattle(context, 'a', 'knockout');
  } else if (context.tick >= context.rules.maximumTicks) {
    const timeout = chooseTimeoutWinner(context);
    completeBattle(context, timeout.winner, timeout.reason);
  }
}

function createFighterCheckpoint(
  fighter: MutableFighterState
): FighterCheckpoint {
  return Object.freeze({
    slot: fighter.slot,
    combatRole: fighter.combatRole,
    hitPoints: fighter.hitPoints,
    maxHitPoints: fighter.maxHitPoints,
    position: freezeVector(fighter.position),
    velocity: freezeVector(fighter.velocity),
    primaryPower: fighter.primaryPower,
    abilityPhase: fighter.abilityPhase,
    barrierHitPoints: fighter.barrierHitPoints,
    echoPosition:
      fighter.echo === null ? null : freezeVector(fighter.echo.position),
  });
}

function captureCheckpoint(context: SimulationContext, forced: boolean): void {
  const lastCheckpoint = context.checkpoints.at(-1);
  if (lastCheckpoint?.tick === context.tick) {
    return;
  }
  const periodic = context.tick % context.rules.checkpointIntervalTicks === 0;
  if (!forced && !periodic) {
    return;
  }
  const reservedLimit = forced
    ? context.rules.maximumCheckpointCount
    : context.rules.maximumCheckpointCount - 1;
  if (context.checkpoints.length >= reservedLimit) {
    return;
  }
  context.checkpoints.push(
    Object.freeze({
      tick: context.tick,
      arenaHalfWidth: context.arenaHalfWidth,
      arenaHalfHeight: context.arenaHalfHeight,
      fighters: freezePair(
        createFighterCheckpoint(context.fighters[0]),
        createFighterCheckpoint(context.fighters[1])
      ),
    })
  );
}

function executeCheckpoint(context: SimulationContext): void {
  captureCheckpoint(context, context.result !== null);
}

function assertEntityCap(context: SimulationContext): void {
  const echoCount = context.fighters.reduce(
    (count, fighter) => count + (fighter.echo === null ? 0 : 1),
    0
  );
  const entityCount = 2 + echoCount;
  if (entityCount > context.rules.maximumEntityCount) {
    throw new Error('Combat entity cap exceeded.');
  }
}

function executePhase(context: SimulationContext, phase: CombatPhase): void {
  switch (phase) {
    case 'arena_rules':
      executeArenaRules(context);
      return;
    case 'ability_transitions':
      executeAbilityTransitions(context);
      return;
    case 'movement':
      executeMovement(context);
      return;
    case 'wall_constraints':
      executeWallConstraints(context);
      return;
    case 'fighter_collision':
      executeFighterCollision(context);
      return;
    case 'role_attacks':
      executeRoleAttacks(context);
      return;
    case 'ability_collisions':
      executeAbilityCollisions(context);
      return;
    case 'status_effects':
      executeStatusEffects(context);
      return;
    case 'ink_pressure':
      executeInkPressure(context);
      return;
    case 'defeat_resolution':
      executeDefeatResolution(context);
      return;
    case 'checkpoint':
      executeCheckpoint(context);
      return;
    default:
      assertUnhandledCombatPhase(phase);
  }
}

function validateRules(rules: CombatRules): void {
  if (rules.tickRate !== 20) {
    throw new Error('Scribbits combat must run at exactly 20 Hz.');
  }
  if (
    rules.maximumSeconds !== 20 ||
    rules.maximumTicks !== rules.tickRate * rules.maximumSeconds
  ) {
    throw new Error('Scribbits combat must end by 20 seconds.');
  }
  if (rules.maximumEntityCount < 4) {
    throw new Error('Combat entity cap must fit two fighters and two echoes.');
  }
  if (rules.maximumEventCount < 2 || rules.maximumCheckpointCount < 2) {
    throw new Error('Combat transcript caps are too small for terminal state.');
  }
  const smearstep = rules.abilities.smearstep;
  if (
    !Number.isSafeInteger(smearstep.dashCount) ||
    smearstep.dashCount !== 2 ||
    !Number.isSafeInteger(smearstep.dashTicks) ||
    smearstep.dashTicks < 1 ||
    !Number.isSafeInteger(smearstep.pauseTicks) ||
    smearstep.pauseTicks < 1 ||
    !Number.isSafeInteger(smearstep.activeTicks) ||
    smearstep.activeTicks < 1
  ) {
    throw new Error(
      'Smearstep needs exactly two positive, integer, separated dashes.'
    );
  }
  const smearstepScheduledActiveTicks =
    smearstep.dashCount * smearstep.dashTicks +
    (smearstep.dashCount - 1) * smearstep.pauseTicks;
  if (smearstep.activeTicks !== smearstepScheduledActiveTicks) {
    throw new Error(
      'Smearstep active ticks must exactly fit its configured dash schedule.'
    );
  }
}

/**
 * Computes the complete authoritative fight synchronously. The caller can save
 * the returned sparse timeline/result and let any renderer play it later.
 */
export function simulateCombat(input: CombatSimulationInput): BattleTranscript {
  const rules = applyBattleArenaModifier(
    DEFAULT_COMBAT_RULES,
    input.battleArenaId
  );
  validateRules(rules);
  const seed = normalizeCombatSeed(input.seed);
  const fighterAInput = freezeFighterInput(input.fighters[0]);
  const fighterBInput = freezeFighterInput(input.fighters[1]);
  validateFighterInput(fighterAInput);
  validateFighterInput(fighterBInput);
  if (fighterAInput.id === fighterBInput.id) {
    throw new Error('Combat fighter ids must be unique.');
  }
  const transcriptVersion = rules.version;
  const battleId = createStableBattleId(
    seed,
    fighterAInput.id,
    fighterBInput.id,
    transcriptVersion
  );
  const context: SimulationContext = {
    rules,
    seed,
    battleId,
    tick: 0,
    arenaHalfWidth: rules.arena.startingHalfWidth,
    arenaHalfHeight: rules.arena.startingHalfHeight,
    fighters: [
      createFighterState(fighterAInput, 'a', seed, rules),
      createFighterState(fighterBInput, 'b', seed, rules),
    ],
    timeline: [],
    checkpoints: [],
    eventsTruncated: false,
    fighterCollisionThisTick: false,
    lastFighterCollisionEventTick: -4,
    result: null,
  };
  appendEvent(context, { tick: 0, kind: 'battle_started', battleId });
  captureCheckpoint(context, true);

  for (let tick = 1; tick <= rules.maximumTicks; tick += 1) {
    context.tick = tick;
    for (const phase of COMBAT_PHASE_ORDER) {
      executePhase(context, phase);
    }
    if (context.result !== null) {
      break;
    }
  }

  if (context.result === null) {
    throw new Error('Combat ended without an authoritative result.');
  }
  assertEntityCap(context);

  return Object.freeze({
    version: transcriptVersion,
    battleId,
    seed,
    tickRate: rules.tickRate,
    fixedPointScale: rules.fixedPointScale,
    maxTicks: rules.maximumTicks,
    fighters: freezePair(fighterAInput, fighterBInput),
    timeline: Object.freeze(context.timeline),
    checkpoints: Object.freeze(context.checkpoints),
    result: context.result,
    eventsTruncated: context.eventsTruncated,
  });
}
