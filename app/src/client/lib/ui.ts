// Reusable UI builders. Small, composable factories that return Phaser objects
// or lightweight containers. Kept framework-thin so scenes stay readable.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { FONT_STACK, MIN_TOUCH, UI } from './theme';

export type ProgressBar = {
  container: Phaser.GameObjects.Container;
  setValue: (percent: number) => void;
};

export type ErrorPanel = {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
};

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
  color = UI.ink,
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

// Horizontal progress bar with a label baked in. Percent is 0..100.
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
  width = 240
): Phaser.GameObjects.Container {
  const height = Math.max(MIN_TOUCH, 96);
  const container = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, UI.coral, 1)
    .setStrokeStyle(4, 0x2b2016, 1);
  bg.setInteractive({ useHandCursor: true });
  const txt = label(scene, 0, 0, text, 34, '#ffffff', true);
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
// toast would violate the "client effects must be user-initiated" platform rule.
export function errorPanel(
  scene: Scene,
  x: number,
  y: number,
  message: string,
  onRetry: () => void
): ErrorPanel {
  const width = 560;
  const height = 320;
  const container = scene.add.container(x, y);

  const card = roundedPanel(scene, 0, 0, width, height);
  const text = label(scene, 0, -60, message, 30, UI.ink, true);
  text.setWordWrapWidth(width - 80);
  const retry = button(scene, 0, 70, '↻ Retry', onRetry, width - 120);
  container.add([card, text, retry]);

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
  fill = UI.panel,
  stroke = UI.panelStroke
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, 1);
  graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 20);
  graphics.lineStyle(4, stroke, 1);
  graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 20);
  return graphics;
}
