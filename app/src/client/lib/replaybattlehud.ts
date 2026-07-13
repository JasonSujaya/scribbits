// Stateful Phaser HUD for Replay. The scene supplies authoritative fighter
// powers, HP values, ticks, and callbacks; this adapter only presents them.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import {
  planReplayBattleClock,
  planReplayHeartMeter,
} from './battlepresentation';
import type {
  ReplayBattleLayout,
  ReplayBattleSide,
  ReplayHeartMeterPlan,
} from './battlepresentation';
import { getShapePowerSignatureName } from './shapepowerpresentation';
import { ELEMENT_STYLES, UI } from './theme';
import { bindPressInteractionEvents } from './pressinteraction';
import { label } from './ui';
import { BATTLE_CONTROL_BUTTON_TEXTURES } from './visualassets';

export type ReplayShapePowerState = 'ready' | 'telegraph' | 'active';

type ShapePowerChipView = {
  container: Phaser.GameObjects.Container;
  stateBackground: Phaser.GameObjects.Rectangle;
  stateLabel: Phaser.GameObjects.Text;
  powerLabel: Phaser.GameObjects.Text;
  fighterName: string;
  powerName: string;
};

type FighterVitalsView = {
  container: Phaser.GameObjects.Container;
  heartMeter: Phaser.GameObjects.Container;
  heartGraphics: Phaser.GameObjects.Graphics;
  shapePower: ShapePowerChipView;
  displayedHeartUnits: number | null;
  displayedDanger: boolean;
  displayedHitPoints: number | null;
  displayedMaximumHitPoints: number | null;
};

type BattleClockView = {
  container: Phaser.GameObjects.Container;
  seconds: Phaser.GameObjects.Text;
};

type ShapePowerStatePresentation = Readonly<{
  visibleLabel: string;
  accessibleLabel: string;
  stateBackgroundColor: number;
  stateTextColor: string;
  powerTextColor: string;
}>;

const SHAPE_POWER_STATE_PRESENTATIONS: Record<
  ReplayShapePowerState,
  ShapePowerStatePresentation
> = {
  ready: {
    visibleLabel: 'READY',
    accessibleLabel: 'ready',
    stateBackgroundColor: UI.inkHex,
    stateTextColor: UI.cream,
    powerTextColor: UI.ink,
  },
  telegraph: {
    visibleLabel: 'WINDUP',
    accessibleLabel: 'telegraphing',
    stateBackgroundColor: UI.goldHex,
    stateTextColor: UI.ink,
    powerTextColor: UI.ink,
  },
  active: {
    visibleLabel: 'ACTIVE',
    accessibleLabel: 'active',
    stateBackgroundColor: UI.coral,
    stateTextColor: UI.cream,
    powerTextColor: UI.ink,
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
const MIN_HEART_SIZE = 24;
const MAX_HEART_SIZE = 34;
const EMPTY_HEART_FILL = 0xd9ccb5;

const traceHeart = (
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  leftHalfOnly = false
): void => {
  const scale = size / 32;
  graphics.beginPath();
  graphics.moveTo(x, y + 13 * scale);
  graphics.lineTo(x - 13 * scale, y + 3 * scale);
  graphics.lineTo(x - 13 * scale, y - 6 * scale);
  graphics.lineTo(x - 8 * scale, y - 12 * scale);
  graphics.lineTo(x - 2 * scale, y - 12 * scale);
  graphics.lineTo(x, y - 8 * scale);
  if (!leftHalfOnly) {
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
  healthyColor: number,
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
  const activeColor = plan.useDangerColor ? 0xe8555c : healthyColor;

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
      traceHeart(graphics, x, 0, heartSize, state === 'half');
      graphics.fillPath();
    }
    graphics.lineStyle(3, UI.inkHex, 0.96);
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
  battleLabel?: string | null;
  arenaName: string;
  arenaRule: string;
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
  onSelect: () => void
): FighterVitalsView => {
  const fighterLayout = layout.fighters[side];
  const style = ELEMENT_STYLES[scribbit.element];

  const name = label(
    scene,
    fighterLayout.nameX,
    layout.fighterNameY,
    scribbit.name,
    30,
    UI.ink,
    true
  )
    .setOrigin(fighterLayout.nameOriginX, 0.5)
    .setDepth(22);
  const availableNameWidth = layout.heartRowWidth;
  fitTextToWidth(name, availableNameWidth);
  name.setInteractive({ useHandCursor: true });
  name.on(
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
  renderHeartMeter(
    heartGraphics,
    initialHeartPlan,
    side,
    style.primary,
    layout.heartRowWidth
  );
  const heartMeter = scene.add
    .container(fighterLayout.chipCenterX, layout.heartRowY, [heartGraphics])
    .setSize(layout.heartRowWidth, layout.heartRowHeight)
    .setDepth(24)
    .setName(initialHeartPlan.accessibleLabel)
    .setData('accessibilityLabel', initialHeartPlan.accessibleLabel)
    .setData('heartStates', initialHeartPlan.states);

  const chipWidth = layout.heartRowWidth;
  const chipHeight = layout.fighterChipHeight;
  const stateWidth = Math.min(82, Math.round(chipWidth * 0.32));
  const stateCenterX = chipWidth / 2 - stateWidth / 2;
  const powerWidth = chipWidth - stateWidth - 10;
  const powerCenterX = -chipWidth / 2 + powerWidth / 2;
  const readyPresentation = SHAPE_POWER_STATE_PRESENTATIONS.ready;
  const powerName = getShapePowerSignatureName(
    scribbit.element,
    primaryPower
  ).toUpperCase();
  const shapePowerContainer = scene.add
    .container(fighterLayout.chipCenterX, layout.fighterChipY)
    .setSize(chipWidth, chipHeight)
    .setVisible(false);
  const stateBackground = scene.add.rectangle(
    stateCenterX,
    0,
    stateWidth,
    chipHeight - 4,
    readyPresentation.stateBackgroundColor,
    1
  );
  const stateLabel = label(
    scene,
    stateCenterX,
    0,
    readyPresentation.visibleLabel,
    18,
    readyPresentation.stateTextColor,
    true
  );
  const powerLabel = label(
    scene,
    powerCenterX,
    0,
    powerName,
    23,
    readyPresentation.powerTextColor,
    true
  );
  fitTextToWidth(stateLabel, stateWidth - 12);
  fitTextToWidth(powerLabel, powerWidth - 8);
  shapePowerContainer.add([stateBackground, stateLabel, powerLabel]);

  const container = scene.add
    .container(0, 0, [name, heartMeter, shapePowerContainer])
    .setDepth(20);

  return {
    container,
    heartMeter,
    heartGraphics,
    shapePower: {
      container: shapePowerContainer,
      stateBackground,
      stateLabel,
      powerLabel,
      fighterName: scribbit.name,
      powerName,
    },
    displayedHeartUnits: null,
    displayedDanger: false,
    displayedHitPoints: null,
    displayedMaximumHitPoints: null,
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
    .setDisplaySize(82, 82);
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
      mutedSlash.lineBetween(-18, -18, 18, 18);
      mutedSlash.lineStyle(4, UI.coralDeep, 1);
      mutedSlash.lineBetween(-18, -18, 18, 18);
      iconLayer.add(mutedSlash);
      return;
    }

    if (kind === 'speed') {
      const speedBadge = scene.add
        .circle(24, 24, 15, UI.creamHex, 0.98)
        .setStrokeStyle(2, UI.inkHex, 1);
      const speed = label(scene, 24, 24, `${Number(value)}×`, 16, UI.ink, true);
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
      () => input.onSelectFighter('a')
    ),
    b: createFighterVitalsView(
      scene,
      layout,
      'b',
      input.fighterB,
      input.fighterBPrimaryPower,
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
    return `${shapePower.fighterName}: Shape Power ${shapePower.powerName} is ${state.accessibleLabel}`;
  };
  let shapePowerLiveRegion: HTMLParagraphElement | null = null;
  const applyFighterShapePowerState = (
    side: ReplayBattleSide,
    state: ReplayShapePowerState,
    announceChange: boolean
  ): void => {
    if (announceChange && shapePowerStates[side] === state) return;

    shapePowerStates[side] = state;
    const shapePower = fighterVitals[side].shapePower;
    const presentation = SHAPE_POWER_STATE_PRESENTATIONS[state];
    scene.tweens.killTweensOf(shapePower.stateBackground);
    shapePower.stateBackground.setAlpha(1);
    shapePower.stateBackground.setFillStyle(
      presentation.stateBackgroundColor,
      1
    );
    shapePower.stateLabel
      .setText(presentation.visibleLabel)
      .setColor(presentation.stateTextColor);
    shapePower.powerLabel.setColor(presentation.powerTextColor);
    fitTextToWidth(
      shapePower.stateLabel,
      shapePower.stateBackground.width - 10
    );
    const accessibleDescription = describeShapePowerState(side);
    shapePower.container
      .setVisible(state !== 'ready')
      .setName(accessibleDescription)
      .setData('shapePowerState', state)
      .setData('accessibilityLabel', accessibleDescription);

    if (!input.reduceMotion && state === 'telegraph') {
      scene.tweens.add({
        targets: shapePower.stateBackground,
        alpha: 0.58,
        duration: 300,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else if (!input.reduceMotion && state === 'active') {
      scene.tweens.add({
        targets: shapePower.stateBackground,
        alpha: 0.5,
        duration: 110,
        ease: 'Cubic.easeOut',
        yoyo: true,
      });
    }

    // Announce the actionable wind-up once; active/ready transitions can fire
    // rapidly at 4× and would otherwise flood a polite assistive live region.
    if (announceChange && state === 'telegraph' && shapePowerLiveRegion) {
      shapePowerLiveRegion.textContent = `${describeShapePowerState('a')}. ${describeShapePowerState('b')}.`;
    }
  };
  applyFighterShapePowerState('a', 'ready', false);
  applyFighterShapePowerState('b', 'ready', false);
  shapePowerLiveRegion = createShapePowerLiveRegion(
    scene,
    `${describeShapePowerState('a')}. ${describeShapePowerState('b')}.`
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
    282,
    input.arenaName.toUpperCase(),
    21,
    UI.cream,
    true
  )
    .setOrigin(0.5)
    .setStroke(UI.ink, 5)
    .setDepth(80);
  fitTextToWidth(arenaCaption, layout.viewportWidth - 96);
  const arenaRule = label(
    scene,
    layout.viewportWidth / 2,
    309,
    input.arenaRule.toUpperCase(),
    17,
    UI.cream,
    true
  )
    .setOrigin(0.5)
    .setStroke(UI.ink, 4)
    .setDepth(80);
  fitTextToWidth(arenaRule, layout.viewportWidth - 110);
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
  const announcer = label(scene, 10, 0, 'Get ready…', 26, UI.ink, true);
  announcer.setWordWrapWidth(announcerWidth);
  ticker.add(announcer);
  let tickerHideEvent: Phaser.Time.TimerEvent | null = null;
  let displayedClockLabel = '';
  let displayedClockUrgent: boolean | null = null;

  const showTransientAnnouncement = (text: string): void => {
    tickerHideEvent?.remove(false);
    tickerHideEvent = null;
    scene.tweens.killTweensOf(ticker);
    ticker.setVisible(true).setAlpha(1);
    announcer.setText(text);
    if (!input.reduceMotion) {
      scene.tweens.add({
        targets: ticker,
        scale: 1.025,
        duration: 90,
        yoyo: true,
      });
    }
    tickerHideEvent = scene.time.delayedCall(980, () => {
      tickerHideEvent = null;
      if (input.reduceMotion) {
        ticker.setVisible(false);
        return;
      }
      scene.tweens.add({
        targets: ticker,
        alpha: 0,
        duration: 150,
        onComplete: () => ticker.setVisible(false).setAlpha(1),
      });
    });
  };

  const setFighterHitPoints = (
    side: ReplayBattleSide,
    hitPoints: number,
    maximumHitPoints: number,
    _playbackSpeed: number
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
    const wasDanger = vitals.displayedDanger;
    const fighterName =
      side === 'a' ? input.fighterA.name : input.fighterB.name;
    const accessibilityLabel = `${fighterName}: ${plan.accessibleLabel}`;
    vitals.displayedHitPoints = safeHitPoints;
    vitals.displayedMaximumHitPoints = safeMaximumHitPoints;
    vitals.displayedHeartUnits = plan.filledUnits;
    vitals.displayedDanger = plan.useDangerColor;
    renderHeartMeter(
      vitals.heartGraphics,
      plan,
      side,
      ELEMENT_STYLES[
        side === 'a' ? input.fighterA.element : input.fighterB.element
      ].primary,
      layout.heartRowWidth
    );
    vitals.heartMeter
      .setName(accessibilityLabel)
      .setData('accessibilityLabel', accessibilityLabel)
      .setData('heartStates', plan.states)
      .setData('hitPoints', safeHitPoints)
      .setData('maximumHitPoints', safeMaximumHitPoints);
    const datasetPrefix = side === 'a' ? 'fighterA' : 'fighterB';
    scene.game.canvas.dataset[`${datasetPrefix}Hearts`] = plan.states.join(',');
    scene.game.canvas.dataset[`${datasetPrefix}HitPoints`] =
      `${safeHitPoints}/${safeMaximumHitPoints}`;

    if (
      shapePowerLiveRegion &&
      previousHeartUnits !== null &&
      !wasDanger &&
      plan.useDangerColor
    ) {
      shapePowerLiveRegion.textContent = `${fighterName} is in danger. ${plan.accessibleLabel}.`;
    }

    if (
      !input.reduceMotion &&
      previousHeartUnits !== null &&
      plan.filledUnits < previousHeartUnits
    ) {
      scene.tweens.killTweensOf(vitals.heartMeter);
      vitals.heartMeter.setScale(1.09);
      scene.tweens.add({
        targets: vitals.heartMeter,
        scale: 1,
        duration: 180,
        ease: 'Back.easeOut',
      });
    }
  };

  return {
    announce: (text: string): void => {
      showTransientAnnouncement(text);
    },
    announceResult: (text: string): void => {
      if (shapePowerLiveRegion) shapePowerLiveRegion.textContent = text;
    },
    setAnnouncerText: (text: string): void => {
      announcer.setText(text);
      ticker.setVisible(true).setAlpha(1);
    },
    setAnnouncerVisible: (visible: boolean): void => {
      if (!visible) {
        tickerHideEvent?.remove(false);
        tickerHideEvent = null;
      }
      ticker.setVisible(visible);
    },
    setPlaybackSpeed: (speed: number): void => {
      renderSpeedButton?.(speed);
    },
    setSoundEnabled: (enabled: boolean): void => {
      renderSoundButton?.(enabled);
    },
    setFighterHitPoints,
    setFighterShapePowerState,
    setHeartsVisible: (visible: boolean): void => {
      Object.values(fighterVitals).forEach((vitals) => {
        vitals.heartMeter.setVisible(visible);
      });
    },
    setBattleChromeVisible: (visible: boolean): void => {
      arenaCaption.setVisible(visible);
      arenaRule.setVisible(visible);
      Object.values(fighterVitals).forEach((vitals) => {
        vitals.container.setVisible(visible);
      });
      if (!visible && shapePowerLiveRegion) {
        shapePowerLiveRegion.textContent = '';
      }
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
