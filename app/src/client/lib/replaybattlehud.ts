// Stateful Phaser HUD for Replay. The scene supplies authoritative fighter
// powers, HP values, ticks, and callbacks; this adapter only presents them.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { BattleReport, Scribbit } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import { formatCombatUpgradeSummary } from '../../shared/combat/upgrades';
import {
  getReplayBattleKindLabel,
  planReplayBattleClock,
  planReplayHitPointBar,
} from './battlepresentation';
import type {
  ReplayBattleLayout,
  ReplayBattleSide,
} from './battlepresentation';
import { getShapePowerSignatureName } from './shapepowerpresentation';
import { ELEMENT_STYLES, UI } from './theme';
import { bindPressInteractionEvents } from './pressinteraction';
import { label } from './ui';
import { BATTLE_CONTROL_BUTTON_TEXTURE } from './visualassets';

export type ReplayShapePowerState = 'ready' | 'telegraph' | 'active';

type ShapePowerChipView = {
  container: Phaser.GameObjects.Container;
  stateBackground: Phaser.GameObjects.Rectangle;
  stateLabel: Phaser.GameObjects.Text;
  powerLabel: Phaser.GameObjects.Text;
  fighterName: string;
  powerName: string;
};

type FighterBarView = {
  container: Phaser.GameObjects.Container;
  hitPointTrack: Phaser.GameObjects.Rectangle;
  hitPointTrail: Phaser.GameObjects.Rectangle;
  hitPointBar: Phaser.GameObjects.Rectangle;
  hitPointValue: Phaser.GameObjects.Text;
  shapePower: ShapePowerChipView;
  revision: number;
  displayedHitPoints: number | null;
  displayedMaximumHitPoints: number | null;
};

type BattleClockView = {
  container: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Arc;
  seconds: Phaser.GameObjects.Text;
  progressFill: Phaser.GameObjects.Rectangle;
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
  setHitPointBarsVisible: (visible: boolean) => void;
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
  battleKind: BattleReport['kind'];
  battleLabel?: string | null;
  showPlaybackControls: boolean;
  reduceMotion: boolean;
  initialPlaybackSpeed: number;
  initialSoundEnabled: boolean;
  onSelectFighter: (side: ReplayBattleSide) => void;
  onSkip: () => void;
  onCycleSpeed: () => void;
  onToggleSound: () => void;
};

const createFighterBarView = (
  scene: Scene,
  layout: ReplayBattleLayout,
  side: ReplayBattleSide,
  scribbit: Scribbit,
  primaryPower: PrimaryPower,
  onSelect: () => void
): FighterBarView => {
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
  const availableNameWidth = layout.healthBarWidth - 62;
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

  const level = label(
    scene,
    fighterLayout.levelBadgeX,
    layout.fighterNameY,
    `LV${scribbit.level}`,
    17,
    UI.inkSoft,
    true
  )
    .setOrigin(side === 'a' ? 1 : 0, 0.5)
    .setDepth(22);

  const upgradeSummary = formatCombatUpgradeSummary(scribbit.upgrades, '', 2);
  const fighterMeta = label(
    scene,
    fighterLayout.nameX,
    layout.fighterMetaY,
    upgradeSummary,
    15,
    UI.inkSoft,
    true
  )
    .setOrigin(fighterLayout.nameOriginX, 0.5)
    .setDepth(22)
    .setVisible(upgradeSummary.length > 0)
    .setName(`${scribbit.name} Ink Mods: ${upgradeSummary}`)
    .setData(
      'accessibilityLabel',
      `${scribbit.name} Ink Mods: ${upgradeSummary}`
    );
  fitTextToWidth(fighterMeta, layout.healthBarWidth);

  const hitPointTrack = scene.add
    .rectangle(
      fighterLayout.healthBarAnchorX,
      layout.healthBarY,
      layout.healthBarWidth,
      layout.healthBarHeight,
      UI.creamHex,
      0.98
    )
    .setOrigin(fighterLayout.healthBarOriginX, 0.5)
    .setStrokeStyle(3, UI.inkHex, 0.96)
    .setDepth(22);
  const hitPointTrail = scene.add
    .rectangle(
      fighterLayout.healthBarAnchorX + (side === 'a' ? 5 : -5),
      layout.healthBarY,
      layout.healthBarFillWidth,
      layout.healthBarFillHeight,
      UI.gold,
      0.78
    )
    .setOrigin(fighterLayout.healthBarOriginX, 0.5)
    .setDepth(23);
  const hitPointBar = scene.add
    .rectangle(
      fighterLayout.healthBarAnchorX + (side === 'a' ? 5 : -5),
      layout.healthBarY,
      layout.healthBarFillWidth,
      layout.healthBarFillHeight,
      style.primary,
      1
    )
    .setOrigin(fighterLayout.healthBarOriginX, 0.5)
    .setDepth(24);

  const hitPointValue = label(
    scene,
    fighterLayout.chipCenterX,
    layout.healthBarY,
    '— / —',
    23,
    UI.ink,
    true
  );
  hitPointValue.setStroke(UI.cream, 3);

  const chipWidth = layout.healthBarWidth;
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
    .setSize(chipWidth, chipHeight);
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
    .container(0, 0, [
      name,
      level,
      fighterMeta,
      hitPointTrack,
      hitPointTrail,
      hitPointBar,
      hitPointValue,
      shapePowerContainer,
    ])
    .setDepth(20);

  return {
    container,
    hitPointTrack,
    hitPointTrail,
    hitPointBar,
    hitPointValue,
    shapePower: {
      container: shapePowerContainer,
      stateBackground,
      stateLabel,
      powerLabel,
      fighterName: scribbit.name,
      powerName,
    },
    revision: 0,
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
  const shadow = scene.add.circle(
    3,
    5,
    layout.battleClockRadius + 1,
    0x000000,
    0.22
  );
  const face = scene.add
    .circle(0, 0, layout.battleClockRadius, UI.creamHex, 1)
    .setStrokeStyle(4, UI.inkHex, 1);
  const seconds = label(scene, 0, 0, '25', 28, UI.ink, true);
  const progressTrack = scene.add.rectangle(
    0,
    23,
    layout.battleClockProgressWidth,
    5,
    UI.inkHex,
    0.18
  );
  const progressFill = scene.add
    .rectangle(
      -layout.battleClockProgressWidth / 2,
      23,
      layout.battleClockProgressWidth,
      5,
      UI.gold,
      1
    )
    .setOrigin(0, 0.5);
  container.add([shadow, face, seconds, progressTrack, progressFill]);
  return { container, face, seconds, progressFill };
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
    .image(0, 0, BATTLE_CONTROL_BUTTON_TEXTURE)
    .setDisplaySize(80, 80);
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
    const ink = scene.add.graphics();
    ink.fillStyle(UI.inkHex, 1);
    ink.lineStyle(4, UI.inkHex, 1);

    if (kind === 'sound') {
      ink.fillRect(-18, -6, 8, 12);
      ink.fillTriangle(-10, -7, 2, -15, 2, 15);
      if (value === false) {
        ink.lineBetween(8, -12, 22, 12);
      } else {
        ink.beginPath();
        ink.arc(2, 0, 13, -0.7, 0.7, false);
        ink.strokePath();
        ink.beginPath();
        ink.arc(2, 0, 21, -0.65, 0.65, false);
        ink.strokePath();
      }
      iconLayer.add(ink);
      return;
    }

    if (kind === 'skip') {
      ink.fillTriangle(-22, -13, -22, 13, -3, 0);
      ink.fillTriangle(-3, -13, -3, 13, 16, 0);
      ink.fillRect(19, -14, 4, 28);
      iconLayer.add(ink);
      return;
    }

    ink.fillTriangle(-28, -11, -28, 11, -13, 0);
    ink.fillTriangle(-12, -11, -12, 11, 3, 0);
    const speed = label(scene, 23, 0, `${Number(value)}×`, 21, UI.ink, true);
    iconLayer.add([ink, speed]);
  };

  render(initialValue);
  return { container, render };
};

export function createReplayBattleHud(
  scene: Scene,
  input: CreateReplayBattleHudInput
): ReplayBattleHud {
  const { layout } = input;
  const fighterBars: Record<ReplayBattleSide, FighterBarView> = {
    a: createFighterBarView(
      scene,
      layout,
      'a',
      input.fighterA,
      input.fighterAPrimaryPower,
      () => input.onSelectFighter('a')
    ),
    b: createFighterBarView(
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
    const shapePower = fighterBars[side].shapePower;
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
    const shapePower = fighterBars[side].shapePower;
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

  const broadcastRail = scene.add.graphics().setDepth(78);
  broadcastRail.fillStyle(0x000000, 0.28);
  broadcastRail.fillRoundedRect(
    layout.broadcastRailLeft + 4,
    layout.broadcastRailTop + 6,
    layout.broadcastRailWidth,
    layout.broadcastRailHeight,
    16
  );
  broadcastRail.fillStyle(UI.creamHex, 0.98);
  broadcastRail.fillRoundedRect(
    layout.broadcastRailLeft,
    layout.broadcastRailTop,
    layout.broadcastRailWidth,
    layout.broadcastRailHeight,
    16
  );
  broadcastRail.lineStyle(3, UI.inkHex, 0.9);
  broadcastRail.strokeRoundedRect(
    layout.broadcastRailLeft,
    layout.broadcastRailTop,
    layout.broadcastRailWidth,
    layout.broadcastRailHeight,
    16
  );

  const livePillWidth = 18;
  const livePill = scene.add
    .rectangle(
      layout.kindLabelX + livePillWidth / 2,
      layout.battleKindY,
      livePillWidth,
      18,
      UI.coral,
      1
    )
    .setStrokeStyle(2, UI.creamHex, 0.86)
    .setDepth(79);
  const kind = label(
    scene,
    layout.kindLabelX + livePillWidth + 8,
    layout.battleKindY,
    input.battleLabel ?? getReplayBattleKindLabel(input.battleKind),
    26,
    UI.ink,
    true
  )
    .setOrigin(0, 0.5)
    .setDepth(80);
  const kindMaximumWidth = Math.max(
    40,
    layout.kindLabelMaximumWidth - livePillWidth - 8
  );
  if (kind.width > kindMaximumWidth) {
    kind.setScale(kindMaximumWidth / kind.width);
  }
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

  const clock = createBattleClockView(
    scene,
    layout,
    input.showPlaybackControls
  );
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
    playbackSpeed: number
  ): void => {
    const bars = fighterBars[side];
    const safeMaximumHitPoints = Math.max(0, Math.round(maximumHitPoints));
    const safeHitPoints = Math.min(
      safeMaximumHitPoints,
      Math.max(0, Math.round(hitPoints))
    );
    if (
      bars.displayedHitPoints === safeHitPoints &&
      bars.displayedMaximumHitPoints === safeMaximumHitPoints
    ) {
      return;
    }
    bars.displayedHitPoints = safeHitPoints;
    bars.displayedMaximumHitPoints = safeMaximumHitPoints;
    const plan = planReplayHitPointBar({
      hitPoints: safeHitPoints,
      maximumHitPoints: safeMaximumHitPoints,
      fullWidth: layout.healthBarFillWidth,
    });
    const previousWidth = bars.hitPointBar.width;
    if (plan.width < previousWidth - 0.5) {
      bars.revision += 1;
      const revision = bars.revision;
      bars.hitPointTrail.width = Math.max(
        bars.hitPointTrail.width,
        previousWidth
      );
      scene.tweens.killTweensOf(bars.hitPointTrail);
      scene.time.delayedCall(
        input.reduceMotion ? 0 : 110 / Math.max(1, playbackSpeed),
        () => {
          if (!bars.hitPointTrail.active || revision !== bars.revision) return;
          scene.tweens.add({
            targets: bars.hitPointTrail,
            width: plan.width,
            // Replay applies playback speed globally through TweenManager.
            duration: input.reduceMotion ? 0 : 320,
            ease: 'Cubic.easeOut',
          });
        }
      );
    } else if (plan.width > bars.hitPointTrail.width) {
      bars.revision += 1;
      bars.hitPointTrail.width = plan.width;
    }
    bars.hitPointBar.width = plan.width;
    bars.hitPointBar.setFillStyle(
      plan.useDangerColor
        ? 0xe8555c
        : ELEMENT_STYLES[
            side === 'a' ? input.fighterA.element : input.fighterB.element
          ].primary,
      1
    );
    bars.hitPointValue.setText(`${safeHitPoints} / ${safeMaximumHitPoints}`);
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
    setHitPointBarsVisible: (visible: boolean): void => {
      Object.values(fighterBars).forEach((bars) => {
        bars.hitPointTrack.setVisible(visible);
        bars.hitPointTrail.setVisible(visible);
        bars.hitPointBar.setVisible(visible);
        bars.hitPointValue.setVisible(visible);
      });
    },
    setBattleChromeVisible: (visible: boolean): void => {
      broadcastRail.setVisible(visible);
      livePill.setVisible(visible);
      kind.setVisible(visible);
      Object.values(fighterBars).forEach((bars) => {
        bars.container.setVisible(visible);
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
        clock.seconds.setText(clockPlan.label);
      }
      clock.progressFill.width =
        layout.battleClockProgressWidth * clockPlan.remainingRatio;
      if (displayedClockUrgent !== clockPlan.urgent) {
        displayedClockUrgent = clockPlan.urgent;
        clock.seconds.setColor(clockPlan.urgent ? UI.coralText : UI.ink);
        clock.progressFill.setFillStyle(
          clockPlan.urgent ? UI.coral : UI.gold,
          1
        );
        clock.face.setStrokeStyle(
          4,
          clockPlan.urgent ? UI.coralDeep : UI.inkHex,
          1
        );
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
