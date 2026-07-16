// Pure battle-theater presentation plans. The server transcript owns truth;
// these helpers only decide how strongly an already-authored event should read.

import { MAX_LEVEL } from '../../shared/arena';
import type { BattleReport } from '../../shared/arena';
import { getLevelDamageBonusPercent } from '../../shared/battle';
import {
  getBattleArenaDefinition,
  type BattleArenaChallengeProgress,
  type BattleArenaId,
} from '../../shared/battlearena';
import {
  getCombatRoleRules,
  type CombatRole,
  type FighterSlot,
  type FixedVector,
} from '../../shared/combat';

export type BattleImpactTier = 'light' | 'solid' | 'heavy' | 'critical';

export type BattleImpactPlan = Readonly<{
  tier: BattleImpactTier;
  damageRatio: number;
  hitStopMilliseconds: number;
  cameraShake: number;
  particleCount: number;
  ringCount: number;
  damageText: string;
  damageTextDurationMilliseconds: number;
  damageTextScale: number;
}>;

export type BattleImpactInput = Readonly<{
  damage: number;
  maximumHitPoints: number;
  critical: boolean;
  playbackSpeed: number;
  reduceMotion: boolean;
}>;

export type ArenaPresentationPlan = Readonly<{
  centerX: number;
  centerY: number;
  maximumHalfWidth: number;
  maximumHalfHeight: number;
  currentHalfWidth: number;
  currentHalfHeight: number;
  startingCombatHalfWidth: number;
  startingCombatHalfHeight: number;
}>;

export type ArenaPresentationInput = Readonly<{
  viewportWidth: number;
  arenaTop: number;
  arenaBottom: number;
  horizontalPadding: number;
  verticalPadding: number;
  currentCombatHalfWidth: number;
  currentCombatHalfHeight: number;
  startingCombatHalfWidth: number;
  startingCombatHalfHeight: number;
}>;

export type MasteryPresentation = Readonly<{
  level: number;
  bonusPercent: number;
  auraMarks: number;
  label: string;
}>;

export type MasteryAuraSegment = Readonly<{
  start: Readonly<{ x: number; y: number }>;
  end: Readonly<{ x: number; y: number }>;
  alpha: number;
}>;

export type ReplayBattleSide = FighterSlot;

export type ReplayFighterLayout = Readonly<{
  homeX: number;
  homeY: number;
  facing: -1 | 1;
  chipCenterX: number;
  panelLeft: number;
}>;

export type FighterScreenPosition = Readonly<{ x: number; y: number }>;

export type SeparatedFighterPositions = Readonly<{
  a: FighterScreenPosition;
  b: FighterScreenPosition;
  distance: number;
}>;

export type FighterPresentationSeparationInput = Readonly<{
  fighterDisplaySize: number;
  combatDistance: number;
  fighterRoles: readonly [CombatRole, CombatRole];
}>;

export type ReplayBattleLayout = Readonly<{
  viewportWidth: number;
  viewportHeight: number;
  pageLeft: number;
  pageTop: number;
  pageWidth: number;
  pageHeight: number;
  toolbarY: number;
  soundButtonX: number;
  speedButtonX: number;
  skipButtonX: number;
  soundButtonWidth: number;
  speedButtonWidth: number;
  skipButtonWidth: number;
  fighterPanelTop: number;
  fighterPanelHeight: number;
  battleTitleY: number;
  heartRowY: number;
  heartRowWidth: number;
  heartRowHeight: number;
  fighterNameOffsetY: number;
  fighterHealthOffsetY: number;
  arenaCaptionY: number;
  battleClockX: number;
  battleClockY: number;
  arenaTop: number;
  arenaBottom: number;
  arenaHorizontalPadding: number;
  arenaVerticalPadding: number;
  tickerX: number;
  tickerY: number;
  tickerWidth: number;
  tickerHeight: number;
  tickerTagWidth: number;
  fighterDisplaySize: number;
  fighterGhostDisplaySize: number;
  fighters: Readonly<Record<ReplayBattleSide, ReplayFighterLayout>>;
}>;

export type ReplayHeartState = 'full' | 'half' | 'empty';

export type ReplayHeartMeterPlan = Readonly<{
  ratio: number;
  states: readonly ReplayHeartState[];
  filledUnits: number;
  useDangerColor: boolean;
  isLastHeart: boolean;
  accessibleLabel: string;
}>;

export type ReplayHeartDamageReactionPlan = Readonly<{
  shakeDistance: number;
  rotationDegrees: number;
  durationMilliseconds: number;
  repeats: number;
}>;

export type ReplayBattleClockPlan = Readonly<{
  remainingSeconds: number;
  label: string;
  remainingRatio: number;
  urgent: boolean;
}>;

export type ReplayOutcomeLayout = Readonly<{
  heroY: number;
  recapY: number;
  lifeY: number;
  actionY: number;
}>;

export type ReplayArenaChallengeResultPlan = Readonly<{
  label: string;
  accessibleLabel: string;
}>;

export type ReplayPostFightActionKind =
  | 'rivals'
  | 'powerUp'
  | 'firstChest'
  | 'backContender'
  | 'share'
  | 'replay'
  | 'return';

export type ReplayPostFightAction = Readonly<{
  kind: ReplayPostFightActionKind;
  label: string;
  accessibleLabel: string;
  tone: 'coral' | 'gold' | 'ghost';
}>;

export type ReplayPostFightActionPlan = Readonly<{
  primary: ReplayPostFightAction | null;
  replayAction: ReplayPostFightAction | null;
  shareAction?: ReplayPostFightAction;
  returnAction: ReplayPostFightAction;
  buttonHeight: number;
}>;

const clamp = (value: number, minimum: number, maximum: number): number => {
  return Math.min(maximum, Math.max(minimum, value));
};

export function planReplayBattleLayout(input: {
  viewportWidth: number;
  viewportHeight: number;
}): ReplayBattleLayout {
  const viewportWidth = Math.max(480, input.viewportWidth);
  const viewportHeight = Math.max(800, input.viewportHeight);
  const pageLeft = Math.round(clamp(viewportWidth * 0.028, 16, 20));
  const pageTop = 8;
  const toolbarY = viewportHeight - 140;
  const controlGap = 16;
  const soundButtonWidth = 112;
  const speedButtonWidth = 112;
  const skipButtonWidth = 112;
  const controlsWidth =
    soundButtonWidth + speedButtonWidth + skipButtonWidth + controlGap * 2;
  const soundButtonX =
    (viewportWidth - controlsWidth) / 2 + soundButtonWidth / 2;
  const speedButtonX =
    soundButtonX + soundButtonWidth / 2 + controlGap + speedButtonWidth / 2;
  const skipButtonX =
    speedButtonX + speedButtonWidth / 2 + controlGap + skipButtonWidth / 2;
  const horizontalMargin = Math.round(clamp(viewportWidth * 0.034, 18, 24));
  const fighterCenterGap = 84;
  const heartRowWidth = Math.round(
    (viewportWidth - horizontalMargin * 2 - fighterCenterGap) / 2
  );
  const fighterPanelTop = 88;
  const fighterPanelHeight = 96;
  const battleTitleY = 48;
  const heartRowY = 122;
  const fighterNameOffsetY = -36;
  const fighterHealthOffsetY = 38;
  const arenaCaptionY = 194;
  const tickerHeight = 56;
  const tickerY = 255;
  const arenaTop = 295;
  const arenaBottom = toolbarY - 62;
  const homeY = (arenaTop + arenaBottom) / 2;
  const leftPanelLeft = horizontalMargin;
  const rightPanelLeft = viewportWidth - horizontalMargin - heartRowWidth;

  return {
    viewportWidth,
    viewportHeight,
    pageLeft,
    pageTop,
    pageWidth: viewportWidth - pageLeft * 2,
    pageHeight: viewportHeight - pageTop - 18,
    toolbarY,
    soundButtonX,
    speedButtonX,
    skipButtonX,
    soundButtonWidth,
    speedButtonWidth,
    skipButtonWidth,
    fighterPanelTop,
    fighterPanelHeight,
    battleTitleY,
    heartRowY,
    heartRowWidth,
    heartRowHeight: 40,
    fighterNameOffsetY,
    fighterHealthOffsetY,
    arenaCaptionY,
    battleClockX: viewportWidth / 2,
    battleClockY: heartRowY,
    arenaTop,
    arenaBottom,
    arenaHorizontalPadding: Math.round(clamp(viewportWidth * 0.18, 104, 120)),
    arenaVerticalPadding: 140,
    tickerX: viewportWidth / 2,
    tickerY,
    tickerWidth: Math.min(viewportWidth - 64, 632),
    tickerHeight,
    tickerTagWidth: 0,
    fighterDisplaySize: 208,
    fighterGhostDisplaySize: 184,
    fighters: {
      a: {
        homeX: Math.round(viewportWidth * 0.24),
        homeY,
        facing: 1,
        chipCenterX: horizontalMargin + heartRowWidth / 2,
        panelLeft: leftPanelLeft,
      },
      b: {
        homeX: Math.round(viewportWidth * 0.76),
        homeY,
        facing: -1,
        chipCenterX: viewportWidth - horizontalMargin - heartRowWidth / 2,
        panelLeft: rightPanelLeft,
      },
    },
  };
}

export function planReplayOutcomeLayout(input: {
  viewportHeight: number;
}): ReplayOutcomeLayout {
  const viewportHeight = Math.max(1_280, input.viewportHeight);
  return {
    heroY: Math.round(viewportHeight * 0.35),
    recapY: viewportHeight - 450,
    lifeY: viewportHeight - 265,
    actionY: viewportHeight - 120,
  };
}

/** Compact result copy for the server-scored arena mini-goal. */
export function planReplayArenaChallengeResult(input: {
  arenaId?: BattleArenaId;
  progress?: BattleArenaChallengeProgress;
}): ReplayArenaChallengeResultPlan | null {
  if (!input.progress) return null;
  const arena = getBattleArenaDefinition(input.arenaId);
  const progress = Math.min(
    input.progress.target,
    Math.max(0, input.progress.progress)
  );
  const goal = arena.challengeLabel.toUpperCase();
  return Object.freeze({
    label: input.progress.completed
      ? `GOAL CLEARED • ${goal}`
      : `${goal} • ${progress}/${input.progress.target}`,
    accessibleLabel: input.progress.completed
      ? `Arena goal cleared: ${arena.challengeLabel}.`
      : `Arena goal: ${arena.challengeLabel}. ${progress} of ${input.progress.target}.`,
  });
}

/** One obvious next move, with optional utilities kept visually secondary. */
export function planReplayPostFightActions(input: {
  canChooseRival: boolean;
  canBackContender: boolean;
  canReplay: boolean;
  canShareClip?: boolean;
  returnLabel: string;
  primaryAction?: ReplayPostFightAction;
  rivalActionCopy?: Readonly<{
    label: string;
    accessibleLabel: string;
  }>;
}): ReplayPostFightActionPlan {
  const buttonHeight = 100;
  const returnAction: ReplayPostFightAction = Object.freeze({
    kind: 'return',
    label: input.returnLabel,
    accessibleLabel: input.returnLabel.replace(/\s*›\s*$/, ''),
    tone: 'ghost',
  });
  const replayAction: ReplayPostFightAction | null = input.canReplay
    ? Object.freeze({
        kind: 'replay',
        label: 'REPLAY',
        accessibleLabel: 'Replay this fight',
        tone: 'ghost',
      })
    : null;
  const shareAction: ReplayPostFightAction | undefined = input.canShareClip
    ? Object.freeze({
        kind: 'share',
        label: 'SHARE CLIP',
        accessibleLabel:
          'Share this recorded battle clip. The clip is hosted by Reddit.',
        tone: 'ghost',
      })
    : undefined;
  const sharedPlan = shareAction ? { shareAction } : {};

  if (input.primaryAction) {
    return Object.freeze({
      primary: Object.freeze({ ...input.primaryAction }),
      replayAction,
      ...sharedPlan,
      returnAction,
      buttonHeight,
    });
  }

  if (input.canChooseRival) {
    const rivalActionCopy = input.rivalActionCopy ?? {
      label: 'CHOOSE A RIVAL',
      accessibleLabel: 'Choose a rival',
    };
    return Object.freeze({
      primary: Object.freeze({
        kind: 'rivals',
        ...rivalActionCopy,
        tone: 'coral',
      }),
      replayAction,
      ...sharedPlan,
      returnAction,
      buttonHeight,
    });
  }

  if (input.canBackContender) {
    return Object.freeze({
      primary: Object.freeze({
        kind: 'backContender',
        label: 'PICK RUMBLE',
        accessibleLabel: 'Pick a Rumble contender',
        tone: 'gold',
      }),
      replayAction,
      ...sharedPlan,
      returnAction,
      buttonHeight,
    });
  }

  return Object.freeze({
    primary: null,
    replayAction,
    ...sharedPlan,
    returnAction,
    buttonHeight,
  });
}

export function planReplayHeartMeter(input: {
  hitPoints: number;
  maximumHitPoints: number;
  heartCount?: number;
}): ReplayHeartMeterPlan {
  const maximumHitPoints =
    Number.isFinite(input.maximumHitPoints) && input.maximumHitPoints > 0
      ? Math.round(input.maximumHitPoints)
      : 0;
  const hitPoints = Math.round(
    maximumHitPoints > 0 && Number.isFinite(input.hitPoints)
      ? clamp(input.hitPoints, 0, maximumHitPoints)
      : 0
  );
  const heartCount = Math.max(
    1,
    Number.isFinite(input.heartCount) ? Math.floor(input.heartCount ?? 6) : 6
  );
  const ratio =
    maximumHitPoints > 0 ? clamp(hitPoints / maximumHitPoints, 0, 1) : 0;
  // Two visual units per heart preserve meaningful damage steps without
  // pretending that the server's continuous HP has become discrete combat.
  const filledUnits =
    hitPoints > 0 ? Math.max(1, Math.ceil(ratio * heartCount * 2)) : 0;
  const states = Object.freeze(
    Array.from({ length: heartCount }, (_, heartIndex): ReplayHeartState => {
      const unitsInHeart = filledUnits - heartIndex * 2;
      if (unitsInHeart >= 2) return 'full';
      if (unitsInHeart === 1) return 'half';
      return 'empty';
    })
  );
  const fullHearts = Math.floor(filledUnits / 2);
  const halfHeart = filledUnits % 2 === 1;
  const visibleHeartLabel = halfHeart
    ? fullHearts === 0
      ? 'half a heart'
      : `${fullHearts} and a half hearts`
    : fullHearts === 1
      ? '1 heart'
      : `${fullHearts} hearts`;
  return {
    ratio,
    states,
    filledUnits,
    useDangerColor: hitPoints > 0 && ratio <= 0.28,
    isLastHeart: hitPoints > 0 && filledUnits <= 2,
    accessibleLabel: `${hitPoints} of ${maximumHitPoints} health; ${visibleHeartLabel} out of ${heartCount}`,
  };
}

export function planReplayHeartDamageReaction(input: {
  tier: BattleImpactTier;
  playbackSpeed: number;
  reduceMotion: boolean;
}): ReplayHeartDamageReactionPlan {
  if (input.reduceMotion) {
    return {
      shakeDistance: 0,
      rotationDegrees: 0,
      durationMilliseconds: 0,
      repeats: 0,
    };
  }

  const speed = clamp(input.playbackSpeed, 1, 4);
  const tierPlan = {
    light: { distance: 0, rotation: 0, duration: 0, repeats: 0 },
    solid: { distance: 3, rotation: 0.7, duration: 100, repeats: 0 },
    heavy: { distance: 6, rotation: 1.4, duration: 160, repeats: 1 },
    critical: { distance: 9, rotation: 2.1, duration: 210, repeats: 1 },
  }[input.tier];
  return {
    shakeDistance: tierPlan.distance,
    rotationDegrees: tierPlan.rotation,
    // Replay speeds Phaser's TweenManager up. This compensation keeps faster
    // playback crisp without collapsing the hit response into one frame.
    durationMilliseconds: Math.round(tierPlan.duration * Math.sqrt(speed)),
    repeats: tierPlan.repeats,
  };
}

export function planReplayBattleClock(input: {
  currentTick: number;
  completedTick: number;
  tickRate: number;
}): ReplayBattleClockPlan {
  const completedTick =
    Number.isFinite(input.completedTick) && input.completedTick > 0
      ? Math.max(1, Math.floor(input.completedTick))
      : 1;
  const currentTick = Number.isFinite(input.currentTick)
    ? clamp(Math.floor(input.currentTick), 0, completedTick)
    : 0;
  const tickRate =
    Number.isFinite(input.tickRate) && input.tickRate > 0
      ? Math.max(1, Math.floor(input.tickRate))
      : 1;
  const remainingTicks = completedTick - currentTick;
  const remainingSeconds = Math.ceil(remainingTicks / tickRate);
  return {
    remainingSeconds,
    label: String(remainingSeconds).padStart(2, '0'),
    remainingRatio: remainingTicks / completedTick,
    urgent: remainingSeconds <= 5,
  };
}

export function getReplayBattleKindLabel(kind: BattleReport['kind']): string {
  if (kind === 'boss') return 'CHAMPION CHALLENGE';
  if (kind === 'rumble') return 'DAILY RUMBLE';
  if (kind === 'practice') return 'POWER PRACTICE';
  return 'EXHIBITION SPAR';
}

export function planBattleImpact(input: BattleImpactInput): BattleImpactPlan {
  const maximumHitPoints = Math.max(1, input.maximumHitPoints);
  const damageRatio = clamp(input.damage / maximumHitPoints, 0, 1);
  const tier: BattleImpactTier = input.critical
    ? 'critical'
    : damageRatio >= 0.12
      ? 'heavy'
      : damageRatio >= 0.07
        ? 'solid'
        : 'light';
  const baseHitStop = {
    light: 0,
    solid: 0,
    heavy: 38,
    critical: 54,
  }[tier];
  const speed = clamp(input.playbackSpeed, 1, 4);
  const damage = Math.max(0, Math.round(input.damage));

  return {
    tier,
    damageRatio,
    // Routine contact keeps flowing. Only the two strongest tiers briefly hold
    // the entire presentation so hit-stop reads as emphasis instead of jitter.
    hitStopMilliseconds: input.reduceMotion ? 0 : baseHitStop,
    cameraShake: input.reduceMotion
      ? 0
      : { light: 0, solid: 0, heavy: 0.01, critical: 0.016 }[tier],
    particleCount: input.reduceMotion
      ? 0
      : { light: 2, solid: 6, heavy: 14, critical: 22 }[tier],
    ringCount: input.reduceMotion
      ? 0
      : { light: 0, solid: 0, heavy: 1, critical: 2 }[tier],
    damageText: `-${damage}${input.critical ? '!' : ''}`,
    // Replay accelerates Phaser's TweenManager at 2x and 4x. Compensating the
    // authored duration keeps exact damage readable at every playback speed.
    damageTextDurationMilliseconds: input.reduceMotion
      ? 640
      : Math.round(900 * speed),
    damageTextScale: {
      light: 0.9,
      solid: 1,
      heavy: 1.18,
      critical: 1.4,
    }[tier],
  };
}

export function planArenaPresentation(
  input: ArenaPresentationInput
): ArenaPresentationPlan {
  const arenaHeight = Math.max(1, input.arenaBottom - input.arenaTop);
  const maximumHalfWidth = Math.max(
    1,
    input.viewportWidth / 2 - input.horizontalPadding
  );
  const maximumHalfHeight = Math.max(
    1,
    arenaHeight / 2 - input.verticalPadding
  );
  const startingCombatHalfWidth = Math.max(1, input.startingCombatHalfWidth);
  const startingCombatHalfHeight = Math.max(1, input.startingCombatHalfHeight);
  const widthRatio = clamp(
    input.currentCombatHalfWidth / startingCombatHalfWidth,
    0,
    1
  );
  const heightRatio = clamp(
    input.currentCombatHalfHeight / startingCombatHalfHeight,
    0,
    1
  );

  return {
    centerX: input.viewportWidth / 2,
    centerY: (input.arenaTop + input.arenaBottom) / 2,
    maximumHalfWidth,
    maximumHalfHeight,
    currentHalfWidth: maximumHalfWidth * widthRatio,
    currentHalfHeight: maximumHalfHeight * heightRatio,
    startingCombatHalfWidth,
    startingCombatHalfHeight,
  };
}

export function projectCombatPosition(
  position: FixedVector,
  arena: ArenaPresentationPlan
): Readonly<{ x: number; y: number }> {
  return {
    x:
      arena.centerX +
      (position.x / arena.startingCombatHalfWidth) * arena.maximumHalfWidth,
    y:
      arena.centerY +
      (position.y / arena.startingCombatHalfHeight) * arena.maximumHalfHeight,
  };
}

/**
 * Submitted drawings are intentionally much larger than their combat bodies.
 * Preserve normal close combat, but open a smooth visible projectile lane while
 * a Longshot is still fighting at its authoritative preferred distance.
 */
export function planFighterPresentationMinimumDistance(
  input: FighterPresentationSeparationInput
): number {
  const displaySize = Math.max(0, input.fighterDisplaySize);
  const closeCombatMinimum = displaySize * 0.82;
  if (!input.fighterRoles.includes('longshot')) return closeCombatMinimum;

  const preferredMinimum = getCombatRoleRules('longshot').preferredRangeMinimum;
  const blendStart = preferredMinimum * 0.75;
  const blendProgress = clamp(
    (Math.max(0, input.combatDistance) - blendStart) /
      (preferredMinimum - blendStart),
    0,
    1
  );
  const rangedMinimum = displaySize * 1.35;
  return (
    closeCombatMinimum + (rangedMinimum - closeCombatMinimum) * blendProgress
  );
}

// Combat bodies are intentionally much smaller than player drawings. Preserve
// authoritative simulation coordinates while keeping the two drawings
// visually readable in presentation space.
export function separateFighterScreenPositions(input: {
  a: FighterScreenPosition;
  b: FighterScreenPosition;
  minimumDistance: number;
  minimumX: number;
  maximumX: number;
}): SeparatedFighterPositions {
  const deltaY = input.b.y - input.a.y;
  const deltaX = input.b.x - input.a.x;
  const currentDistance = Math.hypot(deltaX, deltaY);
  const boundedMinimumDistance = Math.max(0, input.minimumDistance);
  if (currentDistance >= boundedMinimumDistance) {
    return { a: input.a, b: input.b, distance: currentDistance };
  }

  const requiredHorizontalDistance = Math.min(
    Math.max(0, input.maximumX - input.minimumX),
    Math.sqrt(Math.max(0, boundedMinimumDistance ** 2 - deltaY ** 2))
  );
  const midpointX = (input.a.x + input.b.x) / 2;
  const aIsLeft = deltaX <= 0;
  let leftX = midpointX - requiredHorizontalDistance / 2;
  let rightX = midpointX + requiredHorizontalDistance / 2;
  if (leftX < input.minimumX) {
    rightX += input.minimumX - leftX;
    leftX = input.minimumX;
  }
  if (rightX > input.maximumX) {
    leftX -= rightX - input.maximumX;
    rightX = input.maximumX;
  }
  leftX = Math.max(input.minimumX, leftX);
  rightX = Math.min(input.maximumX, rightX);
  const a = { x: aIsLeft ? leftX : rightX, y: input.a.y };
  const b = { x: aIsLeft ? rightX : leftX, y: input.b.y };
  return { a, b, distance: Math.hypot(b.x - a.x, b.y - a.y) };
}

export function getMasteryPresentation(level: number): MasteryPresentation {
  const normalizedLevel = Number.isFinite(level)
    ? clamp(Math.floor(level), 1, MAX_LEVEL)
    : 1;
  const bonusPercent = getLevelDamageBonusPercent(normalizedLevel);
  const title =
    ['Fresh ink', 'Practiced', 'Seasoned', 'Veteran', 'Mastered'][
      normalizedLevel - 1
    ] ?? 'Fresh ink';
  return {
    level: normalizedLevel,
    bonusPercent,
    auraMarks: normalizedLevel - 1,
    label: `${title} · +${bonusPercent.toFixed(1)}% impact`,
  };
}

export function buildMasteryAuraSegments(input: {
  center: Readonly<{ x: number; y: number }>;
  level: number;
  frameTick: number;
  reduceMotion: boolean;
}): readonly MasteryAuraSegment[] {
  const mastery = getMasteryPresentation(input.level);
  if (mastery.auraMarks === 0) return [];
  const rotation = input.reduceMotion ? 0 : input.frameTick * 0.012;
  const radius = 72;

  return Array.from({ length: mastery.auraMarks }, (_, index) => {
    const angle =
      rotation + (Math.PI * 2 * index) / Math.max(1, mastery.auraMarks);
    const tangent = angle + Math.PI / 2;
    const center = {
      x: input.center.x + Math.cos(angle) * radius,
      y: input.center.y + Math.sin(angle) * radius,
    };
    return {
      start: {
        x: center.x - Math.cos(tangent) * 9,
        y: center.y - Math.sin(tangent) * 9,
      },
      end: {
        x: center.x + Math.cos(tangent) * 9,
        y: center.y + Math.sin(tangent) * 9,
      },
      alpha: 0.3 + index * 0.08,
    };
  });
}
