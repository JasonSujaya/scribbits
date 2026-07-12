// Stateful Phaser HUD for Replay. The scene supplies authoritative fighter
// powers, HP values, ticks, and callbacks; this adapter only presents them.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { BattleReport, Scribbit } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
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
import { ghostButton, label } from './ui';

export type ReplayShapePowerState = 'ready' | 'telegraph' | 'active';

type ShapePowerChipView = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
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
  backgroundColor: number;
  borderColor: number;
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
    backgroundColor: UI.creamHex,
    borderColor: UI.inkHex,
    stateBackgroundColor: UI.inkHex,
    stateTextColor: UI.cream,
    powerTextColor: UI.ink,
  },
  telegraph: {
    visibleLabel: 'WINDUP',
    accessibleLabel: 'telegraphing',
    backgroundColor: UI.tape,
    borderColor: UI.inkHex,
    stateBackgroundColor: UI.inkHex,
    stateTextColor: UI.cream,
    powerTextColor: UI.ink,
  },
  active: {
    visibleLabel: 'ACTIVE',
    accessibleLabel: 'active',
    backgroundColor: UI.inkHex,
    borderColor: UI.goldHex,
    stateBackgroundColor: UI.goldHex,
    stateTextColor: UI.ink,
    powerTextColor: UI.cream,
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
  const panelRight = fighterLayout.panelLeft + layout.healthBarWidth;
  const namePlateBottom = layout.fighterPanelTop + 48;
  const clippedCorner = 14;
  const panel = scene.add.graphics();
  panel.fillStyle(UI.creamHex, 0.94);
  panel.beginPath();
  if (side === 'a') {
    panel.moveTo(fighterLayout.panelLeft, layout.fighterPanelTop);
    panel.lineTo(panelRight - clippedCorner, layout.fighterPanelTop);
    panel.lineTo(panelRight, layout.fighterPanelTop + clippedCorner);
    panel.lineTo(panelRight, namePlateBottom);
    panel.lineTo(fighterLayout.panelLeft, namePlateBottom);
  } else {
    panel.moveTo(
      fighterLayout.panelLeft + clippedCorner,
      layout.fighterPanelTop
    );
    panel.lineTo(panelRight, layout.fighterPanelTop);
    panel.lineTo(panelRight, namePlateBottom);
    panel.lineTo(fighterLayout.panelLeft, namePlateBottom);
    panel.lineTo(
      fighterLayout.panelLeft,
      layout.fighterPanelTop + clippedCorner
    );
  }
  panel.closePath();
  panel.fillPath();
  panel.lineStyle(2, UI.inkHex, 0.72);
  panel.lineBetween(
    fighterLayout.panelLeft + 8,
    namePlateBottom - 2,
    panelRight - 8,
    namePlateBottom - 2
  );
  panel.lineStyle(6, style.primary, 0.96);
  panel.lineBetween(
    fighterLayout.panelLeft + (side === 'a' ? 8 : clippedCorner + 6),
    layout.fighterPanelTop + 3,
    panelRight - (side === 'a' ? clippedCorner + 6 : 8),
    layout.fighterPanelTop + 3
  );

  const name = label(
    scene,
    fighterLayout.nameX,
    layout.fighterNameY + 4,
    scribbit.name,
    28,
    UI.ink,
    true
  )
    .setOrigin(fighterLayout.nameOriginX, 0.5)
    .setDepth(22);
  const availableNameWidth = layout.healthBarWidth - 72;
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
      fighterLayout.healthBarAnchorX,
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
      fighterLayout.healthBarAnchorX,
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
    19,
    UI.ink,
    true
  );
  hitPointValue.setStroke(UI.cream, 5);

  const chipWidth = layout.healthBarWidth - 12;
  const chipHeight = layout.fighterChipHeight;
  const stateWidth = Math.min(102, Math.round(chipWidth * 0.38));
  const powerWidth = chipWidth - stateWidth;
  const innerDirection = side === 'a' ? 1 : -1;
  const stateCenterX = (innerDirection * powerWidth) / 2;
  const powerCenterX = (-innerDirection * stateWidth) / 2;
  const dividerX = innerDirection * (chipWidth / 2 - stateWidth);
  const elementAccentX = -innerDirection * (chipWidth / 2 - 5);
  const readyPresentation = SHAPE_POWER_STATE_PRESENTATIONS.ready;
  const powerName = getShapePowerSignatureName(
    scribbit.element,
    primaryPower
  ).toUpperCase();
  const shapePowerContainer = scene.add
    .container(fighterLayout.chipCenterX, layout.fighterChipY)
    .setSize(chipWidth, chipHeight);
  const powerChip = scene.add
    .rectangle(
      0,
      0,
      chipWidth,
      chipHeight,
      readyPresentation.backgroundColor,
      1
    )
    .setStrokeStyle(3, readyPresentation.borderColor, 1);
  const stateBackground = scene.add.rectangle(
    stateCenterX,
    0,
    stateWidth - 4,
    chipHeight - 6,
    readyPresentation.stateBackgroundColor,
    1
  );
  const divider = scene.add.rectangle(
    dividerX,
    0,
    3,
    chipHeight - 8,
    UI.inkHex,
    0.92
  );
  const elementAccent = scene.add.rectangle(
    elementAccentX,
    0,
    5,
    chipHeight - 9,
    style.primary,
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
    19,
    readyPresentation.powerTextColor,
    true
  );
  fitTextToWidth(stateLabel, stateWidth - 14);
  fitTextToWidth(powerLabel, powerWidth - 20);
  shapePowerContainer.add([
    powerChip,
    stateBackground,
    divider,
    elementAccent,
    stateLabel,
    powerLabel,
  ]);

  const container = scene.add
    .container(0, 0, [
      panel,
      name,
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
      background: powerChip,
      stateBackground,
      stateLabel,
      powerLabel,
      fighterName: scribbit.name,
      powerName,
    },
    revision: 0,
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
  const seconds = label(scene, 0, 0, '25', 25, UI.ink, true);
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
    scene.tweens.killTweensOf(shapePower.container);
    shapePower.container.setScale(1).setAlpha(1);
    shapePower.background
      .setFillStyle(presentation.backgroundColor, 1)
      .setStrokeStyle(state === 'active' ? 4 : 3, presentation.borderColor, 1);
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
        targets: shapePower.container,
        scaleX: 1.02,
        scaleY: 1.08,
        duration: 260,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else if (!input.reduceMotion && state === 'active') {
      scene.tweens.add({
        targets: shapePower.container,
        scaleX: 1.04,
        scaleY: 1.12,
        duration: 100,
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
  scene.add
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
    20,
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
  const serverTruth = label(
    scene,
    layout.kindLabelX,
    layout.serverTruthY,
    input.battleKind === 'practice'
      ? 'NO REWARDS · SERVER LOCKED'
      : 'SERVER LOCKED',
    20,
    UI.coralText,
    true
  )
    .setOrigin(0, 0.5)
    .setDepth(80);
  if (serverTruth.width > layout.kindLabelMaximumWidth) {
    serverTruth.setScale(layout.kindLabelMaximumWidth / serverTruth.width);
  }
  let speedButtonLabel: Phaser.GameObjects.Text | null = null;
  let soundButtonLabel: Phaser.GameObjects.Text | null = null;
  const toolbarControls: Phaser.GameObjects.Container[] = [];
  if (input.showPlaybackControls) {
    const soundButton = ghostButton(
      scene,
      layout.soundButtonX,
      layout.toolbarY,
      input.initialSoundEnabled ? '🔊' : '🔇',
      input.onToggleSound,
      layout.soundButtonWidth
    ).setDepth(80);
    toolbarControls.push(soundButton);
    soundButtonLabel = soundButton.list[1] as Phaser.GameObjects.Text;

    const speedButton = ghostButton(
      scene,
      layout.speedButtonX,
      layout.toolbarY,
      `⏩ ${input.initialPlaybackSpeed}×`,
      input.onCycleSpeed,
      layout.speedButtonWidth
    ).setDepth(80);
    toolbarControls.push(speedButton);
    speedButtonLabel = speedButton.list[1] as Phaser.GameObjects.Text;

    const skipButton = ghostButton(
      scene,
      layout.skipButtonX,
      layout.toolbarY,
      '⏭',
      input.onSkip,
      layout.skipButtonWidth
    ).setDepth(80);
    toolbarControls.push(skipButton);
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
  const announcer = label(scene, 10, 0, 'Get ready…', 22, UI.ink, true);
  announcer.setWordWrapWidth(announcerWidth);
  ticker.add(announcer);
  let tickerHideEvent: Phaser.Time.TimerEvent | null = null;

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
    const plan = planReplayHitPointBar({
      hitPoints,
      maximumHitPoints,
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
    const safeMaximumHitPoints = Math.max(0, Math.round(maximumHitPoints));
    const safeHitPoints = Math.min(
      safeMaximumHitPoints,
      Math.max(0, Math.round(hitPoints))
    );
    bars.hitPointValue.setText(`${safeHitPoints} / ${safeMaximumHitPoints}`);
  };

  return {
    announce: (text: string): void => {
      showTransientAnnouncement(text);
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
      speedButtonLabel?.setText(`⏩ ${speed}×`);
    },
    setSoundEnabled: (enabled: boolean): void => {
      soundButtonLabel?.setText(enabled ? '🔊' : '🔇');
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
      clock.seconds.setText(clockPlan.label);
      clock.seconds.setColor(clockPlan.urgent ? UI.coralText : UI.ink);
      clock.progressFill.width =
        layout.battleClockProgressWidth * clockPlan.remainingRatio;
      clock.progressFill.setFillStyle(clockPlan.urgent ? UI.coral : UI.gold, 1);
      clock.face.setStrokeStyle(
        4,
        clockPlan.urgent ? UI.coralDeep : UI.inkHex,
        1
      );
    },
    setClockVisible: (visible: boolean): void => {
      clock.container.setVisible(visible);
    },
    setControlsVisible: (visible: boolean): void => {
      toolbarControls.forEach((control) => control.setVisible(visible));
    },
  };
}
