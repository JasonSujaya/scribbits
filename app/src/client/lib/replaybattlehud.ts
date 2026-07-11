// Stateful Phaser HUD for Replay. The scene supplies authoritative fighter
// powers, HP values, ticks, and callbacks; this adapter only presents them.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { BattleReport, Scribbit } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import {
  getMasteryPresentation,
  getReplayBattleKindLabel,
  planReplayBattleClock,
  planReplayHitPointBar,
} from './battlepresentation';
import type {
  ReplayBattleLayout,
  ReplayBattleSide,
} from './battlepresentation';
import { levelOf } from './scribbits';
import { getShapePowerSignatureName } from './shapepowerpresentation';
import { ELEMENT_STYLES, UI } from './theme';
import { ghostButton, label, levelBadge } from './ui';

type FighterBarView = {
  container: Phaser.GameObjects.Container;
  hitPointTrack: Phaser.GameObjects.Rectangle;
  hitPointTrail: Phaser.GameObjects.Rectangle;
  hitPointBar: Phaser.GameObjects.Rectangle;
  hitPointValue: Phaser.GameObjects.Text;
  revision: number;
};

type BattleClockView = {
  container: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Arc;
  seconds: Phaser.GameObjects.Text;
  progressFill: Phaser.GameObjects.Rectangle;
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
  const panelBottom = layout.fighterPanelTop + layout.fighterPanelHeight;
  const clippedCorner = 18;
  const panel = scene.add.graphics();
  panel.fillStyle(0x000000, 0.2);
  panel.beginPath();
  panel.moveTo(fighterLayout.panelLeft + 4, layout.fighterPanelTop + 5);
  if (side === 'a') {
    panel.lineTo(panelRight - clippedCorner + 4, layout.fighterPanelTop + 5);
    panel.lineTo(panelRight + 4, layout.fighterPanelTop + clippedCorner + 5);
  } else {
    panel.lineTo(panelRight + 4, layout.fighterPanelTop + 5);
    panel.lineTo(panelRight + 4, panelBottom + 5);
    panel.lineTo(fighterLayout.panelLeft + clippedCorner + 4, panelBottom + 5);
    panel.lineTo(fighterLayout.panelLeft + 4, panelBottom - clippedCorner + 5);
  }
  if (side === 'a') {
    panel.lineTo(panelRight + 4, panelBottom + 5);
    panel.lineTo(fighterLayout.panelLeft + 4, panelBottom + 5);
  } else {
    panel.lineTo(
      fighterLayout.panelLeft + 4,
      layout.fighterPanelTop + clippedCorner + 5
    );
  }
  panel.closePath();
  panel.fillPath();

  panel.fillStyle(UI.creamHex, 0.96);
  panel.beginPath();
  if (side === 'a') {
    panel.moveTo(fighterLayout.panelLeft, layout.fighterPanelTop);
    panel.lineTo(panelRight - clippedCorner, layout.fighterPanelTop);
    panel.lineTo(panelRight, layout.fighterPanelTop + clippedCorner);
    panel.lineTo(panelRight, panelBottom);
    panel.lineTo(fighterLayout.panelLeft, panelBottom);
  } else {
    panel.moveTo(
      fighterLayout.panelLeft + clippedCorner,
      layout.fighterPanelTop
    );
    panel.lineTo(panelRight, layout.fighterPanelTop);
    panel.lineTo(panelRight, panelBottom);
    panel.lineTo(fighterLayout.panelLeft + clippedCorner, panelBottom);
    panel.lineTo(fighterLayout.panelLeft, panelBottom - clippedCorner);
    panel.lineTo(
      fighterLayout.panelLeft,
      layout.fighterPanelTop + clippedCorner
    );
  }
  panel.closePath();
  panel.fillPath();
  panel.lineStyle(3, UI.inkHex, 0.84);
  panel.strokePath();
  panel.lineStyle(7, style.primary, 0.92);
  panel.lineBetween(
    fighterLayout.panelLeft + (side === 'a' ? 0 : clippedCorner),
    layout.fighterPanelTop + 4,
    panelRight - (side === 'a' ? clippedCorner : 0),
    layout.fighterPanelTop + 4
  );

  const name = label(
    scene,
    fighterLayout.nameX,
    layout.fighterNameY,
    scribbit.name,
    27,
    UI.ink,
    true
  )
    .setOrigin(fighterLayout.nameOriginX, 0.5)
    .setDepth(22);
  const availableNameWidth = layout.healthBarWidth - 72;
  if (name.width > availableNameWidth) {
    name.setScale(availableNameWidth / name.width);
  }
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

  const level = levelBadge(
    scene,
    fighterLayout.levelBadgeX,
    layout.fighterNameY,
    levelOf(scribbit),
    0.44
  );

  const mastery = getMasteryPresentation(levelOf(scribbit));
  const masteryLabel = label(
    scene,
    fighterLayout.nameX,
    layout.fighterMetaY,
    mastery.label.toUpperCase(),
    14,
    UI.inkSoft,
    true
  ).setOrigin(fighterLayout.nameOriginX, 0.5);
  const masteryMaximumWidth = layout.healthBarWidth - 24;
  if (masteryLabel.width > masteryMaximumWidth) {
    masteryLabel.setScale(masteryMaximumWidth / masteryLabel.width);
  }

  const hitPointTrack = scene.add
    .rectangle(
      fighterLayout.healthBarAnchorX,
      layout.healthBarY,
      layout.healthBarWidth,
      layout.healthBarHeight,
      UI.inkHex,
      0.2
    )
    .setOrigin(fighterLayout.healthBarOriginX, 0.5)
    .setStrokeStyle(3, UI.inkHex, 0.72)
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
    18,
    UI.ink,
    true
  );
  hitPointValue.setStroke(UI.cream, 4);

  const chipWidth = layout.healthBarWidth - 12;
  const powerChip = scene.add
    .rectangle(
      fighterLayout.chipCenterX,
      layout.fighterChipY,
      chipWidth,
      layout.fighterChipHeight,
      UI.inkHex,
      0.92
    )
    .setStrokeStyle(3, style.primary, 0.95);
  const powerLabel = label(
    scene,
    fighterLayout.chipCenterX,
    layout.fighterChipY,
    `${style.emoji} ${getShapePowerSignatureName(
      scribbit.element,
      primaryPower
    ).toUpperCase()}`,
    18,
    UI.cream,
    true
  );
  if (powerLabel.width > chipWidth - 12) {
    powerLabel.setScale((chipWidth - 12) / powerLabel.width);
  }

  const container = scene.add
    .container(0, 0, [
      panel,
      name,
      level,
      masteryLabel,
      hitPointTrack,
      hitPointTrail,
      hitPointBar,
      hitPointValue,
      powerChip,
      powerLabel,
    ])
    .setDepth(20);

  return {
    container,
    hitPointTrack,
    hitPointTrail,
    hitPointBar,
    hitPointValue,
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
  const inkLabel = label(scene, 0, -13, 'SEC', 10, UI.inkSoft, true);
  const seconds = label(scene, 0, 2, '25', 25, UI.ink, true);
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
  container.add([shadow, face, inkLabel, seconds, progressTrack, progressFill]);
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

  const broadcastRail = scene.add.graphics().setDepth(78);
  broadcastRail.fillStyle(0x000000, 0.28);
  broadcastRail.fillRoundedRect(
    layout.broadcastRailLeft + 4,
    layout.broadcastRailTop + 6,
    layout.broadcastRailWidth,
    layout.broadcastRailHeight,
    16
  );
  broadcastRail.fillStyle(UI.deskHex, 0.98);
  broadcastRail.fillRoundedRect(
    layout.broadcastRailLeft,
    layout.broadcastRailTop,
    layout.broadcastRailWidth,
    layout.broadcastRailHeight,
    16
  );
  broadcastRail.lineStyle(3, UI.gold, 0.82);
  broadcastRail.strokeRoundedRect(
    layout.broadcastRailLeft,
    layout.broadcastRailTop,
    layout.broadcastRailWidth,
    layout.broadcastRailHeight,
    16
  );

  const livePillWidth = 56;
  scene.add
    .rectangle(
      layout.kindLabelX + livePillWidth / 2,
      layout.battleKindY,
      livePillWidth,
      28,
      UI.coral,
      1
    )
    .setStrokeStyle(2, UI.creamHex, 0.86)
    .setDepth(79);
  const livePillLabel = label(
    scene,
    layout.kindLabelX + livePillWidth / 2,
    layout.battleKindY,
    input.showPlaybackControls ? 'LIVE' : 'FINAL',
    14,
    UI.cream,
    true
  ).setDepth(80);
  const kind = label(
    scene,
    layout.kindLabelX + livePillWidth + 10,
    layout.battleKindY,
    getReplayBattleKindLabel(input.battleKind),
    20,
    UI.paperText,
    true
  )
    .setOrigin(0, 0.5)
    .setDepth(80);
  const kindMaximumWidth = Math.max(
    40,
    layout.kindLabelMaximumWidth - livePillWidth - 10
  );
  if (kind.width > kindMaximumWidth) {
    kind.setScale(kindMaximumWidth / kind.width);
  }
  const serverTruth = label(
    scene,
    layout.kindLabelX,
    layout.serverTruthY,
    input.battleKind === 'practice'
      ? 'SERVER REPLAY · NO REWARDS'
      : 'OUTCOME LOCKED · SERVER REPLAY',
    14,
    '#ffd447',
    true
  )
    .setOrigin(0, 0.5)
    .setDepth(80);
  if (serverTruth.width > layout.kindLabelMaximumWidth) {
    serverTruth.setScale(layout.kindLabelMaximumWidth / serverTruth.width);
  }
  const resultLabelX =
    (layout.soundButtonX -
      layout.soundButtonWidth / 2 +
      layout.skipButtonX +
      layout.skipButtonWidth / 2) /
    2;
  const resultLabel = label(
    scene,
    resultLabelX,
    layout.toolbarY,
    'FINAL · SERVER LOCKED',
    20,
    '#ffd447',
    true
  )
    .setDepth(80)
    .setVisible(!input.showPlaybackControls);

  let speedButtonLabel: Phaser.GameObjects.Text | null = null;
  let soundButtonLabel: Phaser.GameObjects.Text | null = null;
  const toolbarControls: Phaser.GameObjects.Container[] = [];
  if (input.showPlaybackControls) {
    const soundButton = ghostButton(
      scene,
      layout.soundButtonX,
      layout.toolbarY,
      input.initialSoundEnabled ? 'SFX' : 'OFF',
      input.onToggleSound,
      layout.soundButtonWidth
    ).setDepth(80);
    toolbarControls.push(soundButton);
    soundButtonLabel = soundButton.list[1] as Phaser.GameObjects.Text;

    const speedButton = ghostButton(
      scene,
      layout.speedButtonX,
      layout.toolbarY,
      `${input.initialPlaybackSpeed}×`,
      input.onCycleSpeed,
      layout.speedButtonWidth
    ).setDepth(80);
    toolbarControls.push(speedButton);
    speedButtonLabel = speedButton.list[1] as Phaser.GameObjects.Text;

    const skipButton = ghostButton(
      scene,
      layout.skipButtonX,
      layout.toolbarY,
      'Skip ⏭',
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
    .setDepth(30);
  const tickerGraphics = scene.add.graphics();
  tickerGraphics.fillStyle(0x000000, 0.28);
  tickerGraphics.fillRoundedRect(
    -layout.tickerWidth / 2 + 5,
    -layout.tickerHeight / 2 + 7,
    layout.tickerWidth,
    layout.tickerHeight,
    18
  );
  tickerGraphics.fillStyle(UI.deskHex, 0.97);
  tickerGraphics.fillRoundedRect(
    -layout.tickerWidth / 2,
    -layout.tickerHeight / 2,
    layout.tickerWidth,
    layout.tickerHeight,
    18
  );
  tickerGraphics.lineStyle(4, UI.gold, 0.92);
  tickerGraphics.strokeRoundedRect(
    -layout.tickerWidth / 2,
    -layout.tickerHeight / 2,
    layout.tickerWidth,
    layout.tickerHeight,
    18
  );
  tickerGraphics.fillStyle(UI.coralDeep, 1);
  tickerGraphics.fillRoundedRect(
    -layout.tickerWidth / 2,
    -layout.tickerHeight / 2,
    layout.tickerTagWidth,
    layout.tickerHeight,
    18
  );
  tickerGraphics.fillRect(
    -layout.tickerWidth / 2 + layout.tickerTagWidth - 18,
    -layout.tickerHeight / 2,
    18,
    layout.tickerHeight
  );
  tickerGraphics.lineStyle(3, UI.gold, 0.9);
  tickerGraphics.lineBetween(
    -layout.tickerWidth / 2 + layout.tickerTagWidth,
    -layout.tickerHeight / 2 + 10,
    -layout.tickerWidth / 2 + layout.tickerTagWidth,
    layout.tickerHeight / 2 - 10
  );
  ticker.add(tickerGraphics);
  const tickerTagX = -layout.tickerWidth / 2 + layout.tickerTagWidth / 2;
  const tickerTag = label(
    scene,
    tickerTagX,
    -11,
    'INKCAST',
    16,
    UI.cream,
    true
  );
  const tickerLive = label(
    scene,
    tickerTagX,
    15,
    '● LIVE',
    13,
    '#ffd447',
    true
  );
  const announcerWidth = layout.tickerWidth - layout.tickerTagWidth - 28;
  const announcer = label(
    scene,
    layout.tickerTagWidth / 2,
    0,
    'Get ready…',
    23,
    UI.cream,
    true
  );
  announcer.setWordWrapWidth(announcerWidth);
  ticker.add([tickerTag, tickerLive, announcer]);

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
      announcer.setText(text);
      if (input.reduceMotion) return;
      scene.tweens.add({
        targets: announcer,
        scale: 1.06,
        duration: 100,
        yoyo: true,
      });
    },
    setAnnouncerText: (text: string): void => {
      announcer.setText(text);
    },
    setAnnouncerVisible: (visible: boolean): void => {
      ticker.setVisible(visible);
    },
    setPlaybackSpeed: (speed: number): void => {
      speedButtonLabel?.setText(`${speed}×`);
    },
    setSoundEnabled: (enabled: boolean): void => {
      soundButtonLabel?.setText(enabled ? 'SFX' : 'OFF');
    },
    setFighterHitPoints,
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
      livePillLabel.setText(visible ? 'LIVE' : 'FINAL');
      resultLabel.setVisible(!visible);
    },
  };
}
