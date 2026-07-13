// Pure battle-theater presentation plans. The server transcript owns truth;
// these helpers only decide how strongly an already-authored event should read.

import { MAX_LEVEL } from '../../shared/arena';
import type { BattleReport } from '../../shared/arena';
import { getLevelDamageBonusPercent } from '../../shared/battle';
import type { FighterSlot, FixedVector } from '../../shared/combat';

export type BattleImpactTier = 'light' | 'solid' | 'heavy' | 'critical';

export type BattleImpactPlan = Readonly<{
  tier: BattleImpactTier;
  damageRatio: number;
  hitStopMilliseconds: number;
  cameraShake: number;
  particleCount: number;
  ringCount: number;
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
  healthBarAnchorX: number;
  healthBarOriginX: 0 | 1;
  nameX: number;
  nameOriginX: 0 | 1;
  levelBadgeX: number;
  chipCenterX: number;
  panelLeft: number;
}>;

export type ReplayBattleLayout = Readonly<{
  viewportWidth: number;
  viewportHeight: number;
  broadcastRailLeft: number;
  broadcastRailTop: number;
  broadcastRailWidth: number;
  broadcastRailHeight: number;
  pageLeft: number;
  pageTop: number;
  pageWidth: number;
  pageHeight: number;
  toolbarY: number;
  kindLabelX: number;
  battleKindY: number;
  kindLabelMaximumWidth: number;
  soundButtonX: number;
  speedButtonX: number;
  skipButtonX: number;
  soundButtonWidth: number;
  speedButtonWidth: number;
  skipButtonWidth: number;
  fighterPanelTop: number;
  fighterPanelHeight: number;
  healthBarY: number;
  healthBarWidth: number;
  healthBarFillWidth: number;
  healthBarHeight: number;
  healthBarFillHeight: number;
  fighterNameY: number;
  fighterMetaY: number;
  fighterChipY: number;
  fighterChipHeight: number;
  battleClockX: number;
  battleClockY: number;
  battleClockRadius: number;
  battleClockProgressWidth: number;
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

export type ReplayHitPointBarPlan = Readonly<{
  ratio: number;
  width: number;
  useDangerColor: boolean;
}>;

export type ReplayBattleClockPlan = Readonly<{
  remainingSeconds: number;
  label: string;
  remainingRatio: number;
  urgent: boolean;
}>;

export type ReplayOutcomeLayout = Readonly<{
  recapY: number;
  actionY: number;
}>;

export type ReplayPostFightActionKind =
  | 'rivals'
  | 'backContender'
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
  const broadcastRailLeft = Math.round(clamp(viewportWidth * 0.017, 8, 12));
  const broadcastRailTop = 8;
  const broadcastRailHeight = 134;
  const broadcastRailWidth = viewportWidth - broadcastRailLeft * 2;
  const pageTop = broadcastRailTop + broadcastRailHeight + 2;
  const toolbarY = broadcastRailTop + 86;
  const controlGap = 8;
  const soundButtonWidth = 96;
  const speedButtonWidth = 96;
  const skipButtonWidth = 96;
  const controlsWidth =
    soundButtonWidth + speedButtonWidth + skipButtonWidth + controlGap * 2;
  const soundButtonX =
    (viewportWidth - controlsWidth) / 2 + soundButtonWidth / 2;
  const speedButtonX =
    soundButtonX + soundButtonWidth / 2 + controlGap + speedButtonWidth / 2;
  const skipButtonX =
    speedButtonX + speedButtonWidth / 2 + controlGap + skipButtonWidth / 2;
  const kindLabelX = broadcastRailLeft + 16;
  const kindLabelMaximumWidth = broadcastRailWidth - 32;
  const horizontalMargin = Math.round(clamp(viewportWidth * 0.034, 18, 24));
  const fighterCenterGap = Math.round(clamp(viewportWidth * 0.15, 84, 108));
  const healthBarWidth = Math.round(
    (viewportWidth - horizontalMargin * 2 - fighterCenterGap) / 2
  );
  const healthBarFillWidth = healthBarWidth - 10;
  const fighterPanelTop = 148;
  const fighterPanelHeight = 130;
  const fighterNameY = 164;
  const healthBarY = 201;
  const fighterChipY = 239;
  const fighterMetaY = 266;
  const tickerHeight = 72;
  const tickerY = viewportHeight - 54;
  const arenaTop = 280;
  const arenaBottom = Math.max(arenaTop + 420, viewportHeight - 30);
  const homeY = (arenaTop + arenaBottom) / 2;
  const leftPanelLeft = horizontalMargin;
  const rightPanelLeft = viewportWidth - horizontalMargin - healthBarWidth;

  return {
    viewportWidth,
    viewportHeight,
    broadcastRailLeft,
    broadcastRailTop,
    broadcastRailWidth,
    broadcastRailHeight,
    pageLeft,
    pageTop,
    pageWidth: viewportWidth - pageLeft * 2,
    pageHeight: viewportHeight - pageTop - 18,
    toolbarY,
    kindLabelX,
    battleKindY: broadcastRailTop + 26,
    kindLabelMaximumWidth,
    soundButtonX,
    speedButtonX,
    skipButtonX,
    soundButtonWidth,
    speedButtonWidth,
    skipButtonWidth,
    fighterPanelTop,
    fighterPanelHeight,
    healthBarY,
    healthBarWidth,
    healthBarFillWidth,
    healthBarHeight: 34,
    healthBarFillHeight: 24,
    fighterNameY,
    fighterMetaY,
    fighterChipY,
    fighterChipHeight: 28,
    battleClockX: viewportWidth / 2,
    battleClockY: healthBarY,
    battleClockRadius: 25,
    battleClockProgressWidth: 34,
    arenaTop,
    arenaBottom,
    arenaHorizontalPadding: Math.round(clamp(viewportWidth * 0.164, 96, 118)),
    arenaVerticalPadding: 106,
    tickerX: viewportWidth / 2,
    tickerY,
    tickerWidth: Math.min(viewportWidth - 40, 664),
    tickerHeight,
    tickerTagWidth: 0,
    fighterDisplaySize: 232,
    fighterGhostDisplaySize: 204,
    fighters: {
      a: {
        homeX: Math.round(viewportWidth * 0.27),
        homeY,
        facing: 1,
        healthBarAnchorX: horizontalMargin,
        healthBarOriginX: 0,
        nameX: horizontalMargin + 12,
        nameOriginX: 0,
        levelBadgeX: horizontalMargin + healthBarWidth,
        chipCenterX: horizontalMargin + healthBarWidth / 2,
        panelLeft: leftPanelLeft,
      },
      b: {
        homeX: Math.round(viewportWidth * 0.73),
        homeY,
        facing: -1,
        healthBarAnchorX: viewportWidth - horizontalMargin,
        healthBarOriginX: 1,
        nameX: viewportWidth - horizontalMargin - 12,
        nameOriginX: 1,
        levelBadgeX: viewportWidth - horizontalMargin - healthBarWidth,
        chipCenterX: viewportWidth - horizontalMargin - healthBarWidth / 2,
        panelLeft: rightPanelLeft,
      },
    },
  };
}

export function planReplayOutcomeLayout(input: {
  viewportHeight: number;
}): ReplayOutcomeLayout {
  const viewportHeight = Math.max(800, input.viewportHeight);
  return {
    recapY: viewportHeight - 330,
    actionY: viewportHeight - 96,
  };
}

/** One obvious next move, with optional utilities kept visually secondary. */
export function planReplayPostFightActions(input: {
  canChooseRival: boolean;
  canBackContender: boolean;
  canReplay: boolean;
  returnLabel: string;
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
      returnAction,
      buttonHeight,
    });
  }

  if (input.canBackContender) {
    return Object.freeze({
      primary: Object.freeze({
        kind: 'backContender',
        label: "PICK TONIGHT'S WINNER",
        accessibleLabel: "Pick tonight's winner",
        tone: 'gold',
      }),
      replayAction,
      returnAction,
      buttonHeight,
    });
  }

  return Object.freeze({
    primary: null,
    replayAction,
    returnAction,
    buttonHeight,
  });
}

export function planReplayHitPointBar(input: {
  hitPoints: number;
  maximumHitPoints: number;
  fullWidth: number;
}): ReplayHitPointBarPlan {
  const maximumHitPoints =
    Number.isFinite(input.maximumHitPoints) && input.maximumHitPoints > 0
      ? input.maximumHitPoints
      : 0;
  const hitPoints = Number.isFinite(input.hitPoints) ? input.hitPoints : 0;
  const fullWidth =
    Number.isFinite(input.fullWidth) && input.fullWidth > 0
      ? input.fullWidth
      : 0;
  const ratio =
    maximumHitPoints > 0 ? clamp(hitPoints / maximumHitPoints, 0, 1) : 0;
  return {
    ratio,
    width: fullWidth * ratio,
    useDangerColor: ratio <= 0.28,
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
    light: 28,
    solid: 46,
    heavy: 70,
    critical: 96,
  }[tier];
  const speed = clamp(input.playbackSpeed, 1, 4);

  return {
    tier,
    damageRatio,
    hitStopMilliseconds: input.reduceMotion
      ? 0
      : Math.round(baseHitStop / Math.sqrt(speed)),
    cameraShake: input.reduceMotion
      ? 0
      : { light: 0.005, solid: 0.009, heavy: 0.014, critical: 0.019 }[tier],
    particleCount: input.reduceMotion
      ? 0
      : { light: 8, solid: 14, heavy: 20, critical: 28 }[tier],
    ringCount: input.reduceMotion
      ? 0
      : { light: 1, solid: 1, heavy: 2, critical: 3 }[tier],
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
