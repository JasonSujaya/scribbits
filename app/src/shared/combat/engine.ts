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
import { createStableBattleId, normalizeCombatSeed } from './random';
import {
  selectCombatRole,
  selectPrimaryPower as selectPrimaryPowerForStats,
} from './selection';
import { getCombatRoleRules } from './roles';
import {
  getCombatUpgradeModifiers,
  isCombatUpgradeId,
  MAXIMUM_COMBAT_UPGRADES,
} from './upgrades';
import { freezeGearCombatSnapshot, isGearCombatSnapshot } from './gearsnapshot';
import { isElement } from '../elements';
import { applyBattleArenaModifier } from '../battlearena';
import type { CombatUpgradeModifiers } from './upgrades';
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

type BurnState = {
  sourceFighter: FighterSlot;
  remainingDamage: number;
  nextPulseTick: number;
};

type EchoState = {
  position: MutableVector;
  aimDirection: MutableVector;
  firesAtTick: number;
  expiresAtTick: number;
};

type MutableFighterState = {
  slot: FighterSlot;
  input: CombatFighterInput;
  upgradeModifiers: CombatUpgradeModifiers;
  combatRole: CombatRole;
  primaryPower: PrimaryPower;
  position: MutableVector;
  velocity: MutableVector;
  radius: number;
  baseMovementPerTick: number;
  hitPoints: number;
  maxHitPoints: number;
  damageDealt: number;
  basicAttackReadyAtTick: number;
  basicAttackNumber: number;
  burstShotsRemaining: number;
  nextBurstShotTick: number;
  resolvedAttackCount: number;
  defenseUntilTick: number;
  contactReadyTick: number;
  barrierCreated: boolean;
  barrierHitPoints: number;
  burn: BurnState | null;
  emberBurnDamageSpent: number;
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
  if (!isElement(fighter.element)) {
    throw new Error(`Unsupported combat element: ${fighter.element}.`);
  }
  if (
    fighter.damageModifierPermille !== undefined &&
    (!Number.isSafeInteger(fighter.damageModifierPermille) ||
      fighter.damageModifierPermille < 850 ||
      fighter.damageModifierPermille > 1_250)
  ) {
    throw new Error('Combat damage modifier must be 850 to 1250 permille.');
  }
  const upgrades = fighter.upgrades ?? [];
  if (
    upgrades.length > MAXIMUM_COMBAT_UPGRADES ||
    upgrades.some((upgradeId) => !isCombatUpgradeId(upgradeId)) ||
    new Set(upgrades).size !== upgrades.length
  ) {
    throw new Error(
      `Combat upgrades must contain up to ${MAXIMUM_COMBAT_UPGRADES} unique Ink Mods.`
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
    element: fighter.element,
    stats: Object.freeze({ ...fighter.stats }),
    upgrades: Object.freeze([...(fighter.upgrades ?? [])]),
    damageModifierPermille: fighter.damageModifierPermille ?? 1_000,
    ...(fighter.gear ? { gear: freezeGearCombatSnapshot(fighter.gear) } : {}),
  });
}

function getCombinedCombatModifiers(
  input: CombatFighterInput
): CombatUpgradeModifiers {
  const upgrades = getCombatUpgradeModifiers(input.upgrades);
  const gear = input.gear?.modifiers;
  if (!gear) return upgrades;
  return Object.freeze({
    damagePermille: upgrades.damagePermille + gear.damagePermille - 1_000,
    maximumHitPointsPermille:
      upgrades.maximumHitPointsPermille + gear.maximumHitPointsPermille - 1_000,
    cooldownPermille: upgrades.cooldownPermille + gear.cooldownPermille - 1_000,
    criticalChanceBonusPermille:
      upgrades.criticalChanceBonusPermille + gear.criticalChanceBonusPermille,
    telegraphTicksDelta:
      upgrades.telegraphTicksDelta + gear.telegraphTicksDelta,
    initialDelayTicksDelta:
      upgrades.initialDelayTicksDelta + gear.initialDelayTicksDelta,
  });
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

function createFighterState(
  input: CombatFighterInput,
  slot: FighterSlot,
  _seed: string,
  rules: CombatRules
): MutableFighterState {
  const upgradeModifiers = getCombinedCombatModifiers(input);
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
    upgradeModifiers.initialDelayTicksDelta;
  const baseMaxHitPoints =
    rules.fighter.baseHitPoints +
    input.stats.chonk * rules.fighter.hitPointsPerChonk;
  const maxHitPoints = divideRounded(
    baseMaxHitPoints * upgradeModifiers.maximumHitPointsPermille,
    1_000
  );

  return {
    slot,
    input,
    upgradeModifiers,
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
    damageDealt: 0,
    basicAttackReadyAtTick: initialBasicAttackDelayByRole[combatRole],
    basicAttackNumber: 0,
    burstShotsRemaining: 0,
    nextBurstShotTick: 0,
    resolvedAttackCount: 0,
    defenseUntilTick: 0,
    contactReadyTick: 0,
    barrierCreated: false,
    barrierHitPoints: 0,
    burn: null,
    emberBurnDamageSpent: 0,
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
  const stormReduction =
    fighter.input.element === 'storm'
      ? rules.elements.storm.telegraphReductionTicks
      : 0;
  return Math.max(
    1,
    timing.telegraphTicks -
      stormReduction +
      fighter.upgradeModifiers.telegraphTicksDelta
  );
}

function getEffectiveCooldownTicks(
  context: SimulationContext,
  fighter: MutableFighterState
): number {
  const baseCooldown = divideRounded(
    getPowerTiming(fighter, context.rules).cooldownTicks *
      fighter.upgradeModifiers.cooldownPermille,
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

function createMossBarrierIfAvailable(
  context: SimulationContext,
  fighter: MutableFighterState
): void {
  if (fighter.input.element !== 'moss' || fighter.barrierCreated) {
    return;
  }
  fighter.barrierCreated = true;
  fighter.barrierHitPoints = context.rules.elements.moss.barrierHitPoints;
  appendEvent(context, {
    tick: context.tick,
    kind: 'barrier_created',
    actor: fighter.slot,
    hitPoints: fighter.barrierHitPoints,
  });
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

  createMossBarrierIfAvailable(context, fighter);
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
    const movementSpeed =
      fighter.combatRole === 'brawler' && opponent.combatRole === 'gunner'
        ? divideRounded(fighter.baseMovementPerTick * 1_375, 1_000)
        : fighter.baseMovementPerTick;
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

function applyTideKnockback(
  context: SimulationContext,
  source: MutableFighterState,
  target: MutableFighterState
): void {
  const knockback = normalizeVector(
    {
      x: target.position.x - source.position.x,
      y: target.position.y - source.position.y,
    },
    context.rules.elements.tide.knockbackSpeed,
    source.aimDirection
  );
  target.velocity = copyVector(
    clampVectorComponents(
      {
        x: target.velocity.x + knockback.x,
        y: target.velocity.y + knockback.y,
      },
      context.rules.fighter.maximumVelocityPerAxis
    )
  );
}

function applyEmberBurn(
  context: SimulationContext,
  source: MutableFighterState,
  target: MutableFighterState
): void {
  const config = context.rules.elements.ember;
  const fightBudget =
    config.maximumDamagePerFight - source.emberBurnDamageSpent;
  if (fightBudget <= 0) {
    return;
  }
  const applicationDamage = Math.min(
    config.maximumDamagePerApplication,
    fightBudget
  );
  const existingDamage = target.burn?.remainingDamage ?? 0;
  const nextPulseTick = Math.min(
    target.burn?.nextPulseTick ?? Number.MAX_SAFE_INTEGER,
    context.tick + config.pulseIntervalTicks
  );
  target.burn = {
    sourceFighter: source.slot,
    remainingDamage: Math.max(existingDamage, applicationDamage),
    nextPulseTick,
  };
  appendEvent(context, {
    tick: context.tick,
    kind: 'burn_applied',
    sourceFighter: source.slot,
    targetFighter: target.slot,
    remainingCappedDamage: target.burn.remainingDamage,
    nextPulseTick: target.burn.nextPulseTick,
  });
}

function applyResolvedDamage(
  context: SimulationContext,
  source: MutableFighterState,
  target: MutableFighterState,
  damageSource: DamageSource,
  requestedDamage: number,
  options: DamageOptions
): number {
  const haloInterceptsAreaDamage =
    target.primaryPower === 'nib_halo' &&
    target.abilityPhase === 'active' &&
    (damageSource === 'inkquake' ||
      damageSource === 'colorburst' ||
      damageSource === 'colorburst_echo');
  const damageAfterHaloInterception = haloInterceptsAreaDamage
    ? divideRounded(
        requestedDamage *
          (1_000 -
            context.rules.abilities.nib_halo.areaDamageReductionPermille),
        1_000
      )
    : requestedDamage;
  if (
    damageAfterHaloInterception <= 0 ||
    (!options.bypassDefense && context.tick < target.defenseUntilTick)
  ) {
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
  const actualDamage = Math.min(damageableHitPoints, remainingDamage);
  if (actualDamage <= 0) {
    return 0;
  }
  target.hitPoints -= actualDamage;
  if (source.slot !== target.slot) {
    source.damageDealt += actualDamage;
  }
  if (!options.bypassDefense) {
    target.defenseUntilTick = context.tick + getDefenseTicks(context);
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

  if (
    options.applyElementPayload &&
    source.slot !== target.slot &&
    target.hitPoints > 0
  ) {
    if (source.input.element === 'ember') {
      applyEmberBurn(context, source, target);
    } else if (source.input.element === 'tide') {
      applyTideKnockback(context, source, target);
    }
  }
  return actualDamage;
}

const ROLE_MATCHUP_DAMAGE_MULTIPLIERS: Readonly<
  Record<CombatRole, Readonly<Record<CombatRole, number>>>
> = Object.freeze({
  brawler: Object.freeze({
    brawler: 1_000,
    longshot: 965,
    gunner: 1_000,
    mage: 800,
  }),
  longshot: Object.freeze({
    brawler: 1_075,
    longshot: 1_000,
    gunner: 965,
    mage: 900,
  }),
  gunner: Object.freeze({
    brawler: 1_000,
    longshot: 1_070,
    gunner: 1_000,
    mage: 950,
  }),
  mage: Object.freeze({
    brawler: 1_200,
    longshot: 1_100,
    gunner: 1_100,
    mage: 1_000,
  }),
});

function getRoleMatchupDamageMultiplierPermille(
  attacker: CombatRole,
  defender: CombatRole
): number {
  return ROLE_MATCHUP_DAMAGE_MULTIPLIERS[attacker][defender];
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
      source.upgradeModifiers.criticalChanceBonusPermille
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
  let damage = Math.max(
    1,
    divideRounded(baseDamage * roleMultiplierPermille, 1_000)
  );
  damage = Math.max(
    1,
    divideRounded(
      damage * (source.input.damageModifierPermille ?? 1_000),
      1_000
    )
  );
  damage = Math.max(
    1,
    divideRounded(damage * source.upgradeModifiers.damagePermille, 1_000)
  );
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
      return fighter.input.stats.spike;
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
      ? 2_400
      : fighter.combatRole === 'mage'
        ? 400
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
  if (actualDamage > 0 && fighter.combatRole === 'longshot') {
    pushAwayFrom(context, fighter.position, opponent, 180);
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
          Math.floor(fighter.input.stats.spike / 12),
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
    pushAwayFrom(context, fighter.position, opponent, 260);
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
  for (const target of context.fighters) {
    const burn = target.burn;
    if (burn === null || context.tick < burn.nextPulseTick) {
      continue;
    }
    const source = getFighter(context, burn.sourceFighter);
    const config = context.rules.elements.ember;
    const fightBudget =
      config.maximumDamagePerFight - source.emberBurnDamageSpent;
    const pulseDamage = Math.min(
      config.pulseDamage,
      burn.remainingDamage,
      Math.max(0, fightBudget)
    );
    if (pulseDamage <= 0) {
      target.burn = null;
      continue;
    }
    source.emberBurnDamageSpent += pulseDamage;
    burn.remainingDamage -= pulseDamage;
    applyResolvedDamage(context, source, target, 'ember_burn', pulseDamage, {
      applyElementPayload: false,
      bypassDefense: true,
      bypassBarrier: false,
      critical: false,
    });
    if (
      burn.remainingDamage <= 0 ||
      source.emberBurnDamageSpent >= config.maximumDamagePerFight
    ) {
      target.burn = null;
    } else {
      burn.nextPulseTick = context.tick + config.pulseIntervalTicks;
    }
  }
}

function executeInkPressure(context: SimulationContext): void {
  for (const fighter of context.fighters) {
    if (fighter.inkPressureUsed || fighter.hitPoints <= 0) {
      continue;
    }
    const lostHitPoints = fighter.maxHitPoints - fighter.hitPoints;
    if (
      lostHitPoints * 100 <
      fighter.maxHitPoints * context.rules.inkPressure.lostHitPointPercentage
    ) {
      continue;
    }
    fighter.inkPressureUsed = true;
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
