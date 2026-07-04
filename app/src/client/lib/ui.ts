// Reusable UI builders. Small, composable factories that return Phaser objects
// or lightweight controllers. Kept framework-thin so scenes stay readable.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element, Scribbit, ScribbitStats } from '../../shared/arena';
import {
  ELEMENT_STYLES,
  FONT_STACK,
  MIN_TOUCH,
  STAT_STYLES,
  UI,
} from './theme';

export type ProgressBar = {
  container: Phaser.GameObjects.Container;
  setValue: (percent: number) => void;
};

export type ErrorPanel = {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
};

export type StatBars = {
  container: Phaser.GameObjects.Container;
  setStats: (stats: ScribbitStats, animate: boolean) => void;
};

const STAT_KEYS = ['chonk', 'spike', 'zip', 'charm'] as const;
type StatKey = (typeof STAT_KEYS)[number];

// A rounded panel via nine-slice from the generated `ui-panel` texture.
export function panel(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.NineSlice {
  return scene.add
    .nineslice(x, y, 'ui-panel', undefined, width, height, 18, 18, 18, 18)
    .setOrigin(0.5);
}

export function label(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string = UI.ink,
  bold = false
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_STACK,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? 'bold' : 'normal',
      align: 'center',
    })
    .setOrigin(0.5);
}

// Horizontal progress bar with animated fill. Percent is 0..100.
export function progressBar(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number
): ProgressBar {
  const container = scene.add.container(x, y);
  const track = scene.add
    .rectangle(0, 0, width, height, UI.progressTrack, 0.18)
    .setOrigin(0, 0.5);
  track.setStrokeStyle(2, UI.progressTrack, 0.4);
  const fill = scene.add
    .rectangle(0, 0, 1, height - 6, fillColor, 1)
    .setOrigin(0, 0.5);
  fill.x = 3;
  container.add([track, fill]);

  const setValue = (percent: number): void => {
    const clamped = Math.max(0, Math.min(100, percent));
    const target = Math.max(1, ((width - 6) * clamped) / 100);
    scene.tweens.add({
      targets: fill,
      width: target,
      duration: 400,
      ease: 'Cubic.easeOut',
    });
  };

  return { container, setValue };
}

// A tappable pill button. onClick fires on pointerup. Includes a press tween.
export function button(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  width = 240,
  fill: number = UI.coral
): Phaser.GameObjects.Container {
  const height = Math.max(MIN_TOUCH, 96);
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, fill, 1)
    .setStrokeStyle(4, 0x2b2016, 1);
  bg.setInteractive({ useHandCursor: true });
  const txt = label(scene, 0, 0, text, 32, '#ffffff', true);
  txt.setWordWrapWidth(width - 24);
  container.add([bg, txt]);

  bg.on('pointerover', () => container.setScale(1.03));
  bg.on('pointerout', () => container.setScale(1));
  bg.on('pointerdown', () => container.setScale(0.95));
  bg.on('pointerup', () => {
    container.setScale(1);
    onClick();
  });

  return container;
}

// A smaller secondary button (outline style), for nav rows.
export function ghostButton(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  width = 200
): Phaser.GameObjects.Container {
  const height = MIN_TOUCH;
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, UI.creamHex, 1)
    .setStrokeStyle(4, 0x2b2016, 1);
  bg.setInteractive({ useHandCursor: true });
  const txt = label(scene, 0, 0, text, 26, UI.ink, true);
  txt.setWordWrapWidth(width - 20);
  container.add([bg, txt]);

  bg.on('pointerover', () => container.setScale(1.03));
  bg.on('pointerout', () => container.setScale(1));
  bg.on('pointerdown', () => container.setScale(0.95));
  bg.on('pointerup', () => {
    container.setScale(1);
    onClick();
  });
  return container;
}

// An in-game error panel: a rounded card with a friendly message and a
// tappable Retry button. Used for background/load failures where a spontaneous
// toast would violate the "client effects must be user-initiated" rule.
export function errorPanel(
  scene: Scene,
  x: number,
  y: number,
  message: string,
  onRetry: () => void
): ErrorPanel {
  const width = 560;
  const height = 320;
  const container = scene.add.container(x, y).setDepth(1000);
  const shade = scene.add
    .rectangle(0, 0, 2000, 2000, 0x1a1320, 0.55)
    .setInteractive();
  const card = roundedPanel(scene, 0, 0, width, height);
  const text = label(scene, 0, -60, message, 30, UI.ink, true);
  text.setWordWrapWidth(width - 80);
  const retry = button(scene, 0, 70, '↻ Retry', onRetry, width - 120);
  container.add([shade, card, text, retry]);

  const destroy = (): void => container.destroy(true);
  return { container, destroy };
}

// Rounded-rectangle helper for arbitrary panels drawn directly.
export function roundedPanel(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number = UI.panel,
  stroke: number = UI.panelStroke
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, 1);
  graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 20);
  graphics.lineStyle(4, stroke, 1);
  graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 20);
  return graphics;
}

// A cream "paper card" with a hand-drawn wobbly border — the frame for drawings.
// Returns a graphics object centered on (x, y). `gold` swaps the border to the
// legend gold used in the Hall of Legends.
export function paperCard(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  gold = false
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const left = x - width / 2;
  const top = y - height / 2;

  // Cream page.
  graphics.fillStyle(UI.paper, 1);
  graphics.fillRoundedRect(left, top, width, height, 18);

  // Hand-drawn wobbly border: a rounded rect traced with small jitter so it
  // reads as ink drawn by hand rather than a crisp vector.
  const stroke = gold ? UI.gold : UI.panelStroke;
  graphics.lineStyle(gold ? 6 : 5, stroke, 1);
  drawWobblyRect(graphics, left + 6, top + 6, width - 12, height - 12);
  if (gold) {
    // Inner thin line for a framed-poster look.
    graphics.lineStyle(2, UI.panelStroke, 0.6);
    drawWobblyRect(graphics, left + 14, top + 14, width - 28, height - 28);
  }
  return graphics;
}

// Trace a rounded rectangle path with per-segment jitter for a hand-drawn feel.
function drawWobblyRect(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const wobble = 2.2;
  const steps = 14; // per edge
  const jitter = (): number => (Math.random() - 0.5) * wobble * 2;
  graphics.beginPath();
  graphics.moveTo(x, y);
  const edge = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void => {
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      graphics.lineTo(
        fromX + (toX - fromX) * t + jitter(),
        fromY + (toY - fromY) * t + jitter()
      );
    }
  };
  edge(x, y, x + width, y);
  edge(x + width, y, x + width, y + height);
  edge(x + width, y + height, x, y + height);
  edge(x, y + height, x, y);
  graphics.closePath();
  graphics.strokePath();
}

// A small rounded element badge with emoji + label.
export function elementBadge(
  scene: Scene,
  x: number,
  y: number,
  element: Element,
  scale = 1
): Phaser.GameObjects.Container {
  const style = ELEMENT_STYLES[element];
  const width = 150 * scale;
  const height = 56 * scale;
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, style.primary, 1)
    .setStrokeStyle(3, 0x2b2016, 1);
  const text = label(
    scene,
    0,
    0,
    `${style.emoji} ${style.label}`,
    24 * scale,
    '#ffffff',
    true
  );
  container.add([bg, text]);
  return container;
}

// Four labeled stat bars (chonk/spike/zip/charm). setStats animates the fills.
export function statBars(
  scene: Scene,
  x: number,
  y: number,
  width: number
): StatBars {
  const container = scene.add.container(x, y);
  const rowHeight = 46;
  const bars = new Map<StatKey, Phaser.GameObjects.Rectangle>();
  const values = new Map<StatKey, Phaser.GameObjects.Text>();
  const barWidth = width - 210;

  STAT_KEYS.forEach((key, index) => {
    const style = STAT_STYLES[key];
    const rowY = index * rowHeight;
    const name = label(
      scene,
      0,
      rowY,
      `${style.emoji} ${style.label}`,
      22,
      style.colorText,
      true
    ).setOrigin(0, 0.5);
    const track = scene.add
      .rectangle(160, rowY, barWidth, 22, UI.progressTrack, 0.16)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, UI.progressTrack, 0.35);
    const fill = scene.add
      .rectangle(162, rowY, 1, 16, style.color, 1)
      .setOrigin(0, 0.5);
    const valueText = label(
      scene,
      width,
      rowY,
      '0',
      22,
      UI.ink,
      true
    ).setOrigin(1, 0.5);
    container.add([name, track, fill, valueText]);
    bars.set(key, fill);
    values.set(key, valueText);
  });

  const setStats = (stats: ScribbitStats, animate: boolean): void => {
    STAT_KEYS.forEach((key) => {
      const fill = bars.get(key);
      const valueText = values.get(key);
      if (!fill || !valueText) return;
      const value = stats[key];
      // Bars are relative to STAT_MAX (55) so differences read clearly.
      const target = Math.max(2, (barWidth - 4) * Math.min(1, value / 55));
      if (animate) {
        scene.tweens.add({
          targets: fill,
          width: target,
          duration: 260,
          ease: 'Cubic.easeOut',
        });
      } else {
        fill.width = target;
      }
      valueText.setText(String(value));
    });
  };

  return { container, setStats };
}

// A lifespan pill "⏳ 2 days left" / "⏳ last day!" colored by urgency.
export function lifespanPill(
  scene: Scene,
  x: number,
  y: number,
  daysLeft: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const urgent = daysLeft <= 1;
  const text =
    daysLeft <= 0
      ? '⏳ fades tonight'
      : daysLeft === 1
        ? '⏳ last day!'
        : `⏳ ${daysLeft} days left`;
  const width = 200;
  const bg = scene.add
    .rectangle(0, 0, width, 44, urgent ? 0xe8555c : 0x2b2016, urgent ? 1 : 0.14)
    .setStrokeStyle(2, 0x2b2016, 0.5);
  const txt = label(
    scene,
    0,
    0,
    text,
    20,
    urgent ? '#ffffff' : UI.ink,
    true
  );
  container.add([bg, txt]);
  return container;
}

// Days-left helper shared by scenes.
export function daysLeftFor(scribbit: Scribbit, currentDay: number): number {
  return Math.max(0, scribbit.expiresDay - currentDay);
}
