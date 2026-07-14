// Stateful Phaser HUD for Replay. The scene supplies authoritative fighter
// powers, HP values, ticks, and callbacks; this adapter only presents them.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import { getShapePowerContent } from '../../shared/combat/shapepowercontent';
import { getCombatRoleContent } from '../../shared/combat/roles';
import type { CombatRole, PrimaryPower } from '../../shared/combat/types';
import {
  planReplayBattleClock,
  planReplayHeartDamageReaction,
  planReplayHeartMeter,
} from './battlepresentation';
import type {
  BattleImpactTier,
  ReplayBattleLayout,
  ReplayBattleSide,
  ReplayHeartMeterPlan,
} from './battlepresentation';
import { UI } from './theme';
import { bindPressInteractionEvents } from './pressinteraction';
import { translate } from './localization';
import { label } from './ui';
import { BATTLE_CONTROL_BUTTON_TEXTURES } from './visualassets';

export type ReplayShapePowerState = 'ready' | 'telegraph' | 'active';

type ShapePowerStatusView = {
  fighterName: string;
  effectDescription: string;
};

type FighterVitalsView = {
  container: Phaser.GameObjects.Container;
  heartMeter: Phaser.GameObjects.Container;
  heartWarning: Phaser.GameObjects.Container;
  heartGraphics: Phaser.GameObjects.Graphics;
  healthLabel: Phaser.GameObjects.Text;
  floatingVitals: Phaser.GameObjects.Container;
  floatingVitalsFeedback: Phaser.GameObjects.Container;
  floatingHealthFill: Phaser.GameObjects.Rectangle;
  floatingHealthBarWidth: number;
  shapePower: ShapePowerStatusView;
  displayedHeartUnits: number | null;
  displayedDanger: boolean;
  displayedLastHeart: boolean;
  displayedHitPoints: number | null;
  displayedMaximumHitPoints: number | null;
  warningEvent: Phaser.Time.TimerEvent | null;
};

type BattleClockView = {
  container: Phaser.GameObjects.Container;
  seconds: Phaser.GameObjects.Text;
};

type ShapePowerStatePresentation = Readonly<{
  accessibleLabel: string;
}>;

const SHAPE_POWER_STATE_PRESENTATIONS: Record<
  ReplayShapePowerState,
  ShapePowerStatePresentation
> = {
  ready: {
    accessibleLabel: 'ready',
  },
  telegraph: {
    accessibleLabel: 'winding up',
  },
  active: {
    accessibleLabel: 'active',
  },
};

const fitTextToWidth = (
  text: Phaser.GameObjects.Text,
  maximumWidth: number
): void => {
  text.setScale(1);
  if (text.width > maximumWidth) {
    text.setScale(maximumWidth / text.width);
  }
};

const HEART_COUNT = 6;
const MIN_HEART_SIZE = 26;
const MAX_HEART_SIZE = 40;
const EMPTY_HEART_FILL = 0xd9ccb5;
const HEALTHY_HEART_COLOR = UI.coral;
const FLOATING_VITALS_WIDTH = 190;
const FLOATING_VITALS_HEIGHT = 58;
const FLOATING_HEALTH_BAR_HEIGHT = 10;

type HeartFill = 'full' | 'left' | 'right';

const traceHeart = (
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  fill: HeartFill = 'full'
): void => {
  const scale = size / 32;
  graphics.beginPath();
  graphics.moveTo(x, y + 13 * scale);
  if (fill !== 'right') {
    graphics.lineTo(x - 13 * scale, y + 3 * scale);
    graphics.lineTo(x - 13 * scale, y - 6 * scale);
    graphics.lineTo(x - 8 * scale, y - 12 * scale);
    graphics.lineTo(x - 2 * scale, y - 12 * scale);
  }
  graphics.lineTo(x, y - 8 * scale);
  if (fill !== 'left') {
    graphics.lineTo(x + 2 * scale, y - 12 * scale);
    graphics.lineTo(x + 8 * scale, y - 12 * scale);
    graphics.lineTo(x + 13 * scale, y - 6 * scale);
    graphics.lineTo(x + 13 * scale, y + 3 * scale);
  }
  graphics.closePath();
};

const renderHeartMeter = (
  graphics: Phaser.GameObjects.Graphics,
  plan: ReplayHeartMeterPlan,
  side: ReplayBattleSide,
  availableWidth: number
): void => {
  graphics.clear();
  const gap = Phaser.Math.Clamp(availableWidth * 0.025, 4, 8);
  const heartSize = Phaser.Math.Clamp(
    (availableWidth - gap * (plan.states.length - 1)) / plan.states.length,
    MIN_HEART_SIZE,
    MAX_HEART_SIZE
  );
  const step = heartSize + gap;
  const firstX = -((plan.states.length - 1) * step) / 2;
  const activeColor = plan.useDangerColor ? 0xe8555c : HEALTHY_HEART_COLOR;
  const halfFill = side === 'a' ? 'left' : 'right';

  for (let position = 0; position < plan.states.length; position += 1) {
    const stateIndex =
      side === 'a' ? position : plan.states.length - 1 - position;
    const state = plan.states[stateIndex] ?? 'empty';
    const x = firstX + position * step;

    graphics.fillStyle(0x9b754d, 0.38);
    traceHeart(graphics, x + 2, 3, heartSize);
    graphics.fillPath();
    graphics.fillStyle(EMPTY_HEART_FILL, 0.94);
    traceHeart(graphics, x, 0, heartSize);
    graphics.fillPath();
    if (state !== 'empty') {
      graphics.fillStyle(activeColor, 1);
      traceHeart(
        graphics,
        x,
        0,
        heartSize,
        state === 'half' ? halfFill : 'full'
      );
      graphics.fillPath();
    }
    graphics.lineStyle(plan.isLastHeart ? 4 : 3, UI.inkHex, 0.96);
    traceHeart(graphics, x, 0, heartSize);
    graphics.strokePath();
  }
};

const createShapePowerLiveRegion = (
  scene: Scene,
  initialText: string
): HTMLParagraphElement | null => {
  if (typeof document === 'undefined') return null;
  const canvasParent = scene.game.canvas.parentElement;
  if (!canvasParent) return null;

  const liveRegion = document.createElement('p');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.position = 'absolute';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.padding = '0';
  liveRegion.style.margin = '-1px';
  liveRegion.style.overflow = 'hidden';
  liveRegion.style.clip = 'rect(0, 0, 0, 0)';
  liveRegion.style.whiteSpace = 'nowrap';
  liveRegion.style.border = '0';
  liveRegion.style.pointerEvents = 'none';
  liveRegion.textContent = initialText;
  canvasParent.append(liveRegion);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => liveRegion.remove());
  return liveRegion;
};

export type ReplayBattleHud = {
  announce: (text: string) => void;
  announceResult: (text: string) => void;
  setAnnouncerText: (text: string) => void;
  setAnnouncerVisible: (visible: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setFighterHitPoints: (
    side: ReplayBattleSide,
    hitPoints: number,
    maximumHitPoints: number,
    playbackSpeed: number
  ) => void;
  setFighterScreenPosition: (
    side: ReplayBattleSide,
    x: number,
    y: number
  ) => void;
  playFighterDamage: (
    side: ReplayBattleSide,
    tier: BattleImpactTier,
    playbackSpeed: number
  ) => void;
  stopHeartAnimations: () => void;
  setFighterShapePowerState: (
    side: ReplayBattleSide,
    state: ReplayShapePowerState
  ) => void;
  setHeartsVisible: (visible: boolean) => void;
  setBattleChromeVisible: (visible: boolean) => void;
  updateClock: (
    currentTick: number,
    completedTick: number,
    tickRate: number
  ) => void;
  setClockVisible: (visible: boolean) => void;
  setControlsVisible: (visible: boolean) => void;
};

export type CreateReplayBattleHudInput = {
  layout: ReplayBattleLayout;
  fighterA: Scribbit;
  fighterB: Scribbit;
  fighterAPrimaryPower: PrimaryPower;
  fighterBPrimaryPower: PrimaryPower;
  fighterARole?: CombatRole;
  fighterBRole?: CombatRole;
  arenaName: string;
  showPlaybackControls: boolean;
  reduceMotion: boolean;
  initialPlaybackSpeed: number;
  initialSoundEnabled: boolean;
  onSelectFighter: (side: ReplayBattleSide) => void;
  onSkip: () => void;
  onCycleSpeed: () => void;
  onToggleSound: () => void;
};

const createFighterVitalsView = (
  scene: Scene,
  layout: ReplayBattleLayout,
  side: ReplayBattleSide,
  scribbit: Scribbit,
  primaryPower: PrimaryPower,
  combatRole: CombatRole | undefined,
  onSelect: () => void
): FighterVitalsView => {
  const fighterLayout = layout.fighters[side];

  const floatingVitalsWidth = Math.min(
    FLOATING_VITALS_WIDTH,
    layout.fighterDisplaySize - 20
  );
  const floatingHealthBarWidth = floatingVitalsWidth - 24;
  const floatingVitals = scene.add.container(
    fighterLayout.homeX,
    fighterLayout.homeY + layout.fighterDisplaySize / 2 + 22
  );
  const floatingVitalsBackground = scene.add
    .rectangle(
      0,
      0,
      floatingVitalsWidth,
      FLOATING_VITALS_HEIGHT,
      UI.paper,
      0.94
    )
    .setStrokeStyle(2, UI.inkHex, 0.92);
  const floatingName = label(
    scene,
    0,
    combatRole ? -2 : -11,
    scribbit.name.toUpperCase(),
    18,
    UI.ink,
    true
  ).setOrigin(0.5);
  fitTextToWidth(floatingName, floatingVitalsWidth - 24);
  const floatingRole = combatRole
    ? label(
        scene,
        0,
        -19,
        getCombatRoleContent(combatRole).displayName.toUpperCase(),
        12,
        UI.coralText,
        true
      ).setOrigin(0.5)
    : null;
  const floatingHealthTrack = scene.add
    .rectangle(
      -floatingHealthBarWidth / 2,
      15,
      floatingHealthBarWidth,
      FLOATING_HEALTH_BAR_HEIGHT,
      UI.progressTrack,
      0.24
    )
    .setOrigin(0, 0.5)
    .setStrokeStyle(2, UI.inkHex, 0.9);
  const floatingHealthFill = scene.add
    .rectangle(
      -floatingHealthBarWidth / 2,
      15,
      floatingHealthBarWidth,
      FLOATING_HEALTH_BAR_HEIGHT,
      HEALTHY_HEART_COLOR,
      1
    )
    .setOrigin(0, 0.5);
  const floatingVitalsFeedback = scene.add.container(0, 0, [
    floatingVitalsBackground,
    floatingName,
    ...(floatingRole ? [floatingRole] : []),
    floatingHealthTrack,
    floatingHealthFill,
  ]);
  floatingVitals
    .add(floatingVitalsFeedback)
    .setSize(floatingVitalsWidth, FLOATING_VITALS_HEIGHT)
    .setInteractive({ useHandCursor: true })
    .setDepth(23)
    .on(
      'pointerup',
      (
        _pointer: unknown,
        _localX: unknown,
        _localY: unknown,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation?.();
        onSelect();
      }
    );

  const initialHeartPlan = planReplayHeartMeter({
    hitPoints: 1,
    maximumHitPoints: 1,
    heartCount: HEART_COUNT,
  });
  const heartGraphics = scene.add.graphics();
  renderHeartMeter(heartGraphics, initialHeartPlan, side, layout.heartRowWidth);
  const heartWarning = scene.add.container(0, 0, [heartGraphics]);
  const healthLabel = label(
    scene,
    0,
    38,
    translate('battle.health', { current: 1, maximum: 1 }),
    24,
    UI.ink,
    true
  )
    .setOrigin(0.5)
    .setDepth(25);
  const heartMeter = scene.add
    .container(fighterLayout.chipCenterX, layout.heartRowY, [
      heartWarning,
      healthLabel,
    ])
    .setSize(layout.heartRowWidth, layout.heartRowHeight + 34)
    .setDepth(24)
    .setName(initialHeartPlan.accessibleLabel)
    .setData('accessibilityLabel', initialHeartPlan.accessibleLabel)
    .setData('heartStates', initialHeartPlan.states);

  const container = scene.add
    .container(0, 0, [floatingVitals, heartMeter])
    .setDepth(20);

  return {
    container,
    heartMeter,
    heartWarning,
    heartGraphics,
    healthLabel,
    floatingVitals,
    floatingVitalsFeedback,
    floatingHealthFill,
    floatingHealthBarWidth,
    shapePower: {
      fighterName: scribbit.name,
      effectDescription: combatRole
        ? `${getCombatRoleContent(combatRole).displayName}: ${getCombatRoleContent(combatRole).behavior}`
        : getShapePowerContent(primaryPower).receiptEffect,
    },
    displayedHeartUnits: null,
    displayedDanger: false,
    displayedLastHeart: false,
    displayedHitPoints: null,
    displayedMaximumHitPoints: null,
    warningEvent: null,
  };
};

const createBattleClockView = (
  scene: Scene,
  layout: ReplayBattleLayout,
  visible: boolean
): BattleClockView => {
  const container = scene.add
    .container(layout.battleClockX, layout.battleClockY)
    .setDepth(28)
    .setVisible(visible);
  const seconds = label(scene, 0, 0, '25s', 19, UI.inkSoft, true);
  container.add(seconds);
  return { container, seconds };
};

type ToolbarIconKind = 'sound' | 'speed' | 'skip';

const toolbarIconButton = (
  scene: Scene,
  x: number,
  y: number,
  width: number,
  kind: ToolbarIconKind,
  onClick: () => void,
  initialValue?: number | boolean
): Readonly<{
  container: Phaser.GameObjects.Container;
  render: (value?: number | boolean) => void;
}> => {
  const container = scene.add.container(x, y);
  const buttonFace = scene.add
    .image(0, 0, BATTLE_CONTROL_BUTTON_TEXTURES[kind])
    .setDisplaySize(104, 104);
  const iconLayer = scene.add.container(0, 0);
  const hitTarget = scene.add
    .rectangle(0, 0, width, width, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  container.add([buttonFace, iconLayer, hitTarget]);
  bindPressInteractionEvents(
    hitTarget,
    {
      press: () => container.setScale(0.92),
      release: () => container.setScale(1),
      activate: onClick,
      pressOnHover: false,
    },
    { gameTarget: scene.game.events, shutdownTarget: scene.events }
  );

  const render = (value: number | boolean = initialValue ?? true): void => {
    iconLayer.removeAll(true);

    if (kind === 'sound' && value === false) {
      const mutedSlash = scene.add.graphics();
      mutedSlash.lineStyle(7, UI.creamHex, 1);
      mutedSlash.lineBetween(-22, -22, 22, 22);
      mutedSlash.lineStyle(4, UI.coralDeep, 1);
      mutedSlash.lineBetween(-22, -22, 22, 22);
      iconLayer.add(mutedSlash);
      return;
    }

    if (kind === 'speed') {
      const speedBadge = scene.add
        .circle(31, 31, 17, UI.creamHex, 0.98)
        .setStrokeStyle(2, UI.inkHex, 1);
      const speed = label(scene, 31, 31, `${Number(value)}×`, 17, UI.ink, true);
      iconLayer.add([speedBadge, speed]);
    }
  };

  render(initialValue);
  return { container, render };
};

export function createReplayBattleHud(
  scene: Scene,
  input: CreateReplayBattleHudInput
): ReplayBattleHud {
  const { layout } = input;
  const fighterVitals: Record<ReplayBattleSide, FighterVitalsView> = {
    a: createFighterVitalsView(
      scene,
      layout,
      'a',
      input.fighterA,
      input.fighterAPrimaryPower,
      input.fighterARole,
      () => input.onSelectFighter('a')
    ),
    b: createFighterVitalsView(
      scene,
      layout,
      'b',
      input.fighterB,
      input.fighterBPrimaryPower,
      input.fighterBRole,
      () => input.onSelectFighter('b')
    ),
  };

  const shapePowerStates: Record<ReplayBattleSide, ReplayShapePowerState> = {
    a: 'ready',
    b: 'ready',
  };
  const describeShapePowerState = (side: ReplayBattleSide): string => {
    const shapePower = fighterVitals[side].shapePower;
    const state = SHAPE_POWER_STATE_PRESENTATIONS[shapePowerStates[side]];
    const effectDescription = shapePower.effectDescription.replace(
      /[.!?]+$/,
      ''
    );
    return `${shapePower.fighterName}'s signature move is ${state.accessibleLabel}. ${effectDescription}.`;
  };
  let shapePowerLiveRegion: HTMLParagraphElement | null = null;
  const applyFighterShapePowerState = (
    side: ReplayBattleSide,
    state: ReplayShapePowerState,
    announceChange: boolean
  ): void => {
    if (announceChange && shapePowerStates[side] === state) return;

    shapePowerStates[side] = state;
    const accessibleDescription = describeShapePowerState(side);
    const fighter = fighterVitals[side];
    fighter.container
      .setName(accessibleDescription)
      .setData('shapePowerState', state)
      .setData('accessibilityLabel', accessibleDescription);
    const datasetPrefix = side === 'a' ? 'fighterA' : 'fighterB';
    scene.game.canvas.dataset[`${datasetPrefix}ShapePowerState`] = state;

    // Announce the actionable wind-up once; active/ready transitions can fire
    // rapidly at 4× and would otherwise flood a polite assistive live region.
    if (announceChange && state === 'telegraph' && shapePowerLiveRegion) {
      shapePowerLiveRegion.textContent = describeShapePowerState(side);
    }
  };
  applyFighterShapePowerState('a', 'ready', false);
  applyFighterShapePowerState('b', 'ready', false);
  shapePowerLiveRegion = createShapePowerLiveRegion(
    scene,
    `${describeShapePowerState('a')} ${describeShapePowerState('b')}`
  );

  const setFighterShapePowerState = (
    side: ReplayBattleSide,
    state: ReplayShapePowerState
  ): void => {
    applyFighterShapePowerState(side, state, true);
  };

  const arenaCaption = label(
    scene,
    layout.viewportWidth / 2,
    layout.arenaCaptionY,
    input.arenaName.toUpperCase(),
    17,
    UI.inkSoft,
    true
  )
    .setOrigin(0.5)
    .setAlpha(0.72)
    .setDepth(26);
  fitTextToWidth(arenaCaption, layout.viewportWidth - 96);
  const clock = createBattleClockView(
    scene,
    layout,
    input.showPlaybackControls
  );
  let renderSpeedButton: ((value?: number | boolean) => void) | null = null;
  let renderSoundButton: ((value?: number | boolean) => void) | null = null;
  const toolbarControls: Phaser.GameObjects.Container[] = [];
  if (input.showPlaybackControls) {
    const soundButton = toolbarIconButton(
      scene,
      layout.soundButtonX,
      layout.toolbarY,
      layout.soundButtonWidth,
      'sound',
      input.onToggleSound,
      input.initialSoundEnabled
    );
    soundButton.container.setDepth(80);
    toolbarControls.push(soundButton.container);
    renderSoundButton = soundButton.render;

    const speedButton = toolbarIconButton(
      scene,
      layout.speedButtonX,
      layout.toolbarY,
      layout.speedButtonWidth,
      'speed',
      input.onCycleSpeed,
      input.initialPlaybackSpeed
    );
    speedButton.container.setDepth(80);
    toolbarControls.push(speedButton.container);
    renderSpeedButton = speedButton.render;

    const skipButton = toolbarIconButton(
      scene,
      layout.skipButtonX,
      layout.toolbarY,
      layout.skipButtonWidth,
      'skip',
      input.onSkip
    );
    skipButton.container.setDepth(80);
    toolbarControls.push(skipButton.container);
  }

  const ticker = scene.add
    .container(layout.tickerX, layout.tickerY)
    .setDepth(30)
    .setVisible(false);
  const tickerGraphics = scene.add.graphics();
  tickerGraphics.fillStyle(0x000000, 0.28);
  tickerGraphics.fillRoundedRect(
    -layout.tickerWidth / 2 + 5,
    -layout.tickerHeight / 2 + 7,
    layout.tickerWidth,
    layout.tickerHeight,
    18
  );
  tickerGraphics.fillStyle(UI.creamHex, 0.96);
  tickerGraphics.fillRoundedRect(
    -layout.tickerWidth / 2,
    -layout.tickerHeight / 2,
    layout.tickerWidth,
    layout.tickerHeight,
    18
  );
  tickerGraphics.lineStyle(3, UI.inkHex, 0.88);
  tickerGraphics.strokeRoundedRect(
    -layout.tickerWidth / 2,
    -layout.tickerHeight / 2,
    layout.tickerWidth,
    layout.tickerHeight,
    18
  );
  tickerGraphics.lineStyle(8, UI.coralDeep, 0.82);
  tickerGraphics.lineBetween(
    -layout.tickerWidth / 2 + 13,
    -layout.tickerHeight / 2 + 13,
    -layout.tickerWidth / 2 + 13,
    layout.tickerHeight / 2 - 13
  );
  ticker.add(tickerGraphics);
  const announcerWidth = layout.tickerWidth - 56;
  const announcer = label(scene, 10, 0, 'Get ready…', 22, UI.ink, true);
  announcer.setWordWrapWidth(announcerWidth);
  ticker.add(announcer);
  let displayedClockLabel = '';
  let displayedClockUrgent: boolean | null = null;
  let playbackSpeed = input.initialPlaybackSpeed;
  let heartsVisible = true;

  const showBattleAnnouncement = (text: string): void => {
    const announcement = text.trim();
    if (!announcement) {
      scene.tweens.killTweensOf(ticker);
      ticker.setVisible(false).setAlpha(1).setScale(1);
      return;
    }
    scene.tweens.killTweensOf(ticker);
    ticker.setVisible(true).setAlpha(1);
    announcer.setText(announcement);
    if (!input.reduceMotion) {
      scene.tweens.add({
        targets: ticker,
        scale: 1.025,
        duration: 90,
        yoyo: true,
      });
    }
  };

  const setHeartFxState = (
    side: ReplayBattleSide,
    state: 'idle' | 'hit' | 'last'
  ): void => {
    const datasetPrefix = side === 'a' ? 'fighterA' : 'fighterB';
    scene.game.canvas.dataset[`${datasetPrefix}HeartFx`] = state;
    fighterVitals[side].heartMeter.setData('heartFx', state);
  };

  const resetHeartTransforms = (side: ReplayBattleSide): void => {
    const vitals = fighterVitals[side];
    vitals.heartMeter
      .setPosition(layout.fighters[side].chipCenterX, layout.heartRowY)
      .setAngle(0)
      .setScale(1);
    vitals.heartWarning.setPosition(0, 0).setAngle(0).setScale(1);
  };

  const stopLastHeartWarning = (side: ReplayBattleSide): void => {
    const vitals = fighterVitals[side];
    vitals.warningEvent?.remove(false);
    vitals.warningEvent = null;
    scene.tweens.killTweensOf(vitals.heartWarning);
    vitals.heartWarning.setPosition(0, 0).setAngle(0).setScale(1);
  };

  const scheduleLastHeartWarning = (side: ReplayBattleSide): void => {
    const vitals = fighterVitals[side];
    vitals.warningEvent?.remove(false);
    vitals.warningEvent = null;
    if (!vitals.displayedLastHeart || !heartsVisible) return;
    if (vitals.heartMeter.getData('heartFx') !== 'hit') {
      setHeartFxState(side, 'last');
    }
    if (input.reduceMotion) return;

    // Replay leaves Phaser's Clock at real time, so warning cadence remains
    // calm and consistent even when only its TweenManager runs at 2x or 4x.
    vitals.warningEvent = scene.time.delayedCall(900, () => {
      vitals.warningEvent = null;
      if (!vitals.displayedLastHeart || !heartsVisible) return;
      const direction = side === 'a' ? -1 : 1;
      vitals.heartWarning.setPosition(0, 0).setAngle(0).setScale(1);
      scene.tweens.add({
        targets: vitals.heartWarning,
        x: direction * 2,
        angle: direction * 1.2,
        scale: 1.045,
        duration: 70 * playbackSpeed,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          vitals.heartWarning.setPosition(0, 0).setAngle(0).setScale(1);
        },
      });
      scheduleLastHeartWarning(side);
    });
  };

  const stopHeartAnimations = (): void => {
    (['a', 'b'] as const).forEach((side) => {
      const vitals = fighterVitals[side];
      stopLastHeartWarning(side);
      scene.tweens.killTweensOf(vitals.heartMeter);
      scene.tweens.killTweensOf(vitals.healthLabel);
      scene.tweens.killTweensOf(vitals.floatingVitalsFeedback);
      vitals.healthLabel.setAngle(0).setScale(1);
      vitals.floatingVitalsFeedback.setPosition(0, 0).setAngle(0).setScale(1);
      resetHeartTransforms(side);
      setHeartFxState(side, 'idle');
    });
  };

  const playFighterDamage = (
    side: ReplayBattleSide,
    tier: BattleImpactTier,
    eventPlaybackSpeed: number
  ): void => {
    const vitals = fighterVitals[side];
    const reaction = planReplayHeartDamageReaction({
      tier,
      playbackSpeed: eventPlaybackSpeed,
      reduceMotion: input.reduceMotion,
    });
    setHeartFxState(side, 'hit');
    scene.tweens.killTweensOf(vitals.heartMeter);
    scene.tweens.killTweensOf(vitals.floatingVitalsFeedback);
    vitals.heartMeter
      .setPosition(layout.fighters[side].chipCenterX, layout.heartRowY)
      .setAngle(0)
      .setScale(1);
    vitals.floatingVitalsFeedback.setPosition(0, 0).setAngle(0).setScale(1);

    if (reaction.durationMilliseconds === 0) {
      setHeartFxState(side, vitals.displayedLastHeart ? 'last' : 'idle');
      return;
    }

    const direction = side === 'a' ? -1 : 1;
    const segmentDuration = Math.max(
      24,
      Math.round(reaction.durationMilliseconds / ((reaction.repeats + 1) * 2))
    );
    scene.tweens.add({
      targets: vitals.heartMeter,
      x: layout.fighters[side].chipCenterX + direction * reaction.shakeDistance,
      angle: direction * reaction.rotationDegrees,
      scale: 1.055,
      duration: segmentDuration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: reaction.repeats,
      onComplete: () => {
        vitals.heartMeter
          .setPosition(layout.fighters[side].chipCenterX, layout.heartRowY)
          .setAngle(0)
          .setScale(1);
        setHeartFxState(side, vitals.displayedLastHeart ? 'last' : 'idle');
      },
    });
    scene.tweens.add({
      targets: vitals.floatingVitalsFeedback,
      x: direction * Math.max(3, reaction.shakeDistance * 0.7),
      angle: direction * reaction.rotationDegrees,
      scale: 1.045,
      duration: segmentDuration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: reaction.repeats,
      onComplete: () => {
        vitals.floatingVitalsFeedback.setPosition(0, 0).setAngle(0).setScale(1);
      },
    });
  };

  const setFighterScreenPosition = (
    side: ReplayBattleSide,
    x: number,
    y: number
  ): void => {
    const horizontalPadding = FLOATING_VITALS_WIDTH / 2 + 12;
    const verticalOffset = layout.fighterDisplaySize / 2 + 22;
    fighterVitals[side].floatingVitals.setPosition(
      Phaser.Math.Clamp(
        x,
        horizontalPadding,
        layout.viewportWidth - horizontalPadding
      ),
      Phaser.Math.Clamp(
        y + verticalOffset,
        layout.arenaTop + FLOATING_VITALS_HEIGHT / 2,
        layout.arenaBottom - FLOATING_VITALS_HEIGHT / 2
      )
    );
  };

  const setFighterHitPoints = (
    side: ReplayBattleSide,
    hitPoints: number,
    maximumHitPoints: number,
    playbackSpeed: number
  ): void => {
    const vitals = fighterVitals[side];
    const safeMaximumHitPoints = Math.max(0, Math.round(maximumHitPoints));
    const safeHitPoints = Math.min(
      safeMaximumHitPoints,
      Math.max(0, Math.round(hitPoints))
    );
    if (
      vitals.displayedHitPoints === safeHitPoints &&
      vitals.displayedMaximumHitPoints === safeMaximumHitPoints
    ) {
      return;
    }
    const plan = planReplayHeartMeter({
      hitPoints: safeHitPoints,
      maximumHitPoints: safeMaximumHitPoints,
      heartCount: HEART_COUNT,
    });
    const previousHeartUnits = vitals.displayedHeartUnits;
    const previousHitPoints = vitals.displayedHitPoints;
    const wasDanger = vitals.displayedDanger;
    const wasLastHeart = vitals.displayedLastHeart;
    const fighterName =
      side === 'a' ? input.fighterA.name : input.fighterB.name;
    const accessibilityLabel = `${fighterName}: ${plan.accessibleLabel}`;
    vitals.displayedHitPoints = safeHitPoints;
    vitals.displayedMaximumHitPoints = safeMaximumHitPoints;
    vitals.displayedHeartUnits = plan.filledUnits;
    vitals.displayedDanger = plan.useDangerColor;
    vitals.displayedLastHeart = plan.isLastHeart;
    renderHeartMeter(vitals.heartGraphics, plan, side, layout.heartRowWidth);
    vitals.heartMeter
      .setName(accessibilityLabel)
      .setData('accessibilityLabel', accessibilityLabel)
      .setData('heartStates', plan.states)
      .setData('lastHeart', plan.isLastHeart)
      .setData('hitPoints', safeHitPoints)
      .setData('maximumHitPoints', safeMaximumHitPoints);
    vitals.healthLabel
      .setText(
        translate('battle.health', {
          current: safeHitPoints,
          maximum: safeMaximumHitPoints,
        })
      )
      .setColor(plan.useDangerColor ? UI.coralText : UI.ink);
    const floatingHealthRatio = plan.ratio;
    vitals.floatingHealthFill
      .setDisplaySize(
        vitals.floatingHealthBarWidth * floatingHealthRatio,
        FLOATING_HEALTH_BAR_HEIGHT
      )
      .setFillStyle(plan.useDangerColor ? 0xe8555c : HEALTHY_HEART_COLOR, 1)
      .setVisible(floatingHealthRatio > 0);
    const hitPointsChanged =
      previousHitPoints !== null && previousHitPoints !== safeHitPoints;
    scene.tweens.killTweensOf(vitals.healthLabel);
    vitals.healthLabel.setAngle(0).setScale(1);
    if (hitPointsChanged && !input.reduceMotion) {
      const changeDirection = side === 'a' ? -1 : 1;
      const isDamage = safeHitPoints < previousHitPoints;
      vitals.healthLabel
        .setAngle(changeDirection * (isDamage ? 2 : 1))
        .setScale(isDamage ? 1.2 : 1.12);
      scene.tweens.add({
        targets: vitals.healthLabel,
        angle: 0,
        scale: 1,
        duration: Math.round(
          170 * Math.sqrt(Phaser.Math.Clamp(playbackSpeed, 1, 4))
        ),
        ease: 'Back.easeOut',
      });
    }
    const datasetPrefix = side === 'a' ? 'fighterA' : 'fighterB';
    scene.game.canvas.dataset[`${datasetPrefix}Hearts`] = plan.states.join(',');
    scene.game.canvas.dataset[`${datasetPrefix}HitPoints`] =
      `${safeHitPoints}/${safeMaximumHitPoints}`;

    if (shapePowerLiveRegion && previousHeartUnits !== null) {
      if (!wasLastHeart && plan.isLastHeart) {
        shapePowerLiveRegion.textContent = `${fighterName} is on their last heart. ${plan.accessibleLabel}.`;
      } else if (!wasDanger && plan.useDangerColor) {
        shapePowerLiveRegion.textContent = `${fighterName} is in danger. ${plan.accessibleLabel}.`;
      }
    }

    if (!wasLastHeart && plan.isLastHeart) {
      scheduleLastHeartWarning(side);
    } else if (wasLastHeart && !plan.isLastHeart) {
      stopLastHeartWarning(side);
      setHeartFxState(side, 'idle');
    }
  };

  return {
    announce: (text: string): void => {
      showBattleAnnouncement(text);
    },
    announceResult: (text: string): void => {
      if (shapePowerLiveRegion) shapePowerLiveRegion.textContent = text;
    },
    setAnnouncerText: (text: string): void => {
      const announcement = text.trim();
      scene.tweens.killTweensOf(ticker);
      ticker.setAlpha(1).setScale(1);
      if (!announcement) {
        ticker.setVisible(false);
        return;
      }
      announcer.setText(announcement);
      ticker.setVisible(true);
    },
    setAnnouncerVisible: (visible: boolean): void => {
      if (!visible) {
        scene.tweens.killTweensOf(ticker);
        ticker.setAlpha(1).setScale(1);
      }
      ticker.setVisible(visible);
    },
    setPlaybackSpeed: (speed: number): void => {
      playbackSpeed = speed;
      renderSpeedButton?.(speed);
      (['a', 'b'] as const).forEach((side) => {
        if (fighterVitals[side].displayedLastHeart && heartsVisible) {
          scheduleLastHeartWarning(side);
        }
      });
    },
    setSoundEnabled: (enabled: boolean): void => {
      renderSoundButton?.(enabled);
    },
    setFighterHitPoints,
    setFighterScreenPosition,
    playFighterDamage,
    stopHeartAnimations,
    setFighterShapePowerState,
    setHeartsVisible: (visible: boolean): void => {
      heartsVisible = visible;
      Object.values(fighterVitals).forEach((vitals) => {
        vitals.heartMeter.setVisible(visible);
        vitals.healthLabel.setVisible(visible);
        vitals.floatingVitals.setVisible(visible);
      });
      if (!visible) {
        stopHeartAnimations();
      } else {
        (['a', 'b'] as const).forEach((side) => {
          if (fighterVitals[side].displayedLastHeart) {
            scheduleLastHeartWarning(side);
          }
        });
      }
    },
    setBattleChromeVisible: (visible: boolean): void => {
      arenaCaption.setVisible(visible);
      Object.values(fighterVitals).forEach((vitals) => {
        vitals.container.setVisible(visible);
      });
      if (!visible && shapePowerLiveRegion) {
        shapePowerLiveRegion.textContent = '';
      }
      if (!visible) stopHeartAnimations();
    },
    updateClock: (
      currentTick: number,
      completedTick: number,
      tickRate: number
    ): void => {
      const clockPlan = planReplayBattleClock({
        currentTick,
        completedTick,
        tickRate,
      });
      if (displayedClockLabel !== clockPlan.label) {
        displayedClockLabel = clockPlan.label;
        clock.seconds.setText(`${clockPlan.label}s`);
      }
      if (displayedClockUrgent !== clockPlan.urgent) {
        displayedClockUrgent = clockPlan.urgent;
        clock.seconds.setColor(clockPlan.urgent ? UI.coralText : UI.ink);
      }
    },
    setClockVisible: (visible: boolean): void => {
      clock.container.setVisible(visible);
    },
    setControlsVisible: (visible: boolean): void => {
      toolbarControls.forEach((control) => control.setVisible(visible));
    },
  };
}
