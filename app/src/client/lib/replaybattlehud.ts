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
  hitPointTrack: Phaser.GameObjects.Rectangle;
  hitPointTrail: Phaser.GameObjects.Rectangle;
  hitPointBar: Phaser.GameObjects.Rectangle;
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
  const panel = scene.add.graphics().setDepth(20);
  panel.fillStyle(style.soft, 0.22);
  panel.fillRoundedRect(
    fighterLayout.panelLeft,
    layout.fighterPanelTop,
    layout.healthBarWidth + 12,
    layout.fighterPanelHeight,
    18
  );
  panel.lineStyle(4, style.primary, 0.8);
  panel.strokeRoundedRect(
    fighterLayout.panelLeft,
    layout.fighterPanelTop,
    layout.healthBarWidth + 12,
    layout.fighterPanelHeight,
    18
  );

  const name = label(
    scene,
    fighterLayout.nameX,
    layout.fighterNameY,
    scribbit.name,
    26,
    UI.ink,
    true
  )
    .setOrigin(fighterLayout.nameOriginX, 0.5)
    .setDepth(22);
  const availableNameWidth = layout.healthBarWidth - 58;
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

  levelBadge(
    scene,
    fighterLayout.levelBadgeX,
    layout.fighterNameY,
    levelOf(scribbit),
    0.48
  ).setDepth(22);

  const hitPointTrack = scene.add
    .rectangle(
      fighterLayout.healthBarAnchorX,
      layout.healthBarY,
      layout.healthBarWidth,
      28,
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
      20,
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
      20,
      style.primary,
      1
    )
    .setOrigin(fighterLayout.healthBarOriginX, 0.5)
    .setDepth(24);

  const chipWidth = layout.healthBarWidth - 10;
  scene.add
    .rectangle(
      fighterLayout.chipCenterX,
      layout.fighterChipY,
      chipWidth,
      30,
      style.primary,
      0.16
    )
    .setStrokeStyle(2, style.primary, 0.72)
    .setDepth(21);
  const powerLabel = label(
    scene,
    fighterLayout.chipCenterX,
    layout.fighterChipY,
    `${style.emoji} ${getShapePowerSignatureName(
      scribbit.element,
      primaryPower
    ).toUpperCase()}`,
    18,
    style.primaryText,
    true
  ).setDepth(22);
  if (powerLabel.width > chipWidth - 12) {
    powerLabel.setScale((chipWidth - 12) / powerLabel.width);
  }
  const mastery = getMasteryPresentation(levelOf(scribbit));
  label(
    scene,
    fighterLayout.chipCenterX,
    layout.fighterChipY + 23,
    mastery.label.toUpperCase(),
    14,
    UI.inkSoft,
    true
  ).setDepth(22);

  return {
    hitPointTrack,
    hitPointTrail,
    hitPointBar,
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
  const shadow = scene.add.circle(4, 6, 44, 0x000000, 0.22);
  const face = scene.add
    .circle(0, 0, 43, UI.creamHex, 1)
    .setStrokeStyle(6, UI.inkHex, 1);
  const inkLabel = label(scene, 0, -19, 'INK', 13, UI.inkSoft, true);
  const seconds = label(scene, 0, 4, '25', 34, UI.ink, true);
  const progressTrack = scene.add.rectangle(0, 36, 70, 7, UI.inkHex, 0.18);
  const progressFill = scene.add
    .rectangle(-35, 36, 70, 7, UI.gold, 1)
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

  const kind = label(
    scene,
    layout.kindLabelX,
    layout.toolbarY,
    `${getReplayBattleKindLabel(input.battleKind)} · SERVER REPLAY`,
    18,
    UI.paperText,
    true
  )
    .setOrigin(0, 0.5)
    .setDepth(80);
  if (kind.width > layout.soundButtonX - layout.kindLabelX - 48) {
    kind.setScale((layout.soundButtonX - layout.kindLabelX - 48) / kind.width);
  }

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
  tickerGraphics.lineStyle(5, UI.gold, 0.92);
  tickerGraphics.strokeRoundedRect(
    -layout.tickerWidth / 2,
    -layout.tickerHeight / 2,
    layout.tickerWidth,
    layout.tickerHeight,
    18
  );
  ticker.add(tickerGraphics);
  const tickerTag = label(scene, 0, -22, 'INKCAST', 14, '#ffd447', true);
  const announcer = label(scene, 0, 9, 'Get ready…', 24, UI.cream, true);
  announcer.setWordWrapWidth(layout.tickerWidth - 44);
  ticker.add([tickerTag, announcer]);

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
  };

  return {
    announce: (text: string): void => {
      announcer.setText(text);
      scene.tweens.add({
        targets: announcer,
        scale: 1.06,
        duration: input.reduceMotion ? 0 : 100,
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
      clock.progressFill.width = 70 * clockPlan.remainingRatio;
      clock.progressFill.setFillStyle(clockPlan.urgent ? UI.coral : UI.gold, 1);
      clock.face.setStrokeStyle(
        6,
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
