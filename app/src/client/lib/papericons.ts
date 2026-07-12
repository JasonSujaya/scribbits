import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import { ELEMENT_STYLES, UI } from './theme';

export type PaperIconKey =
  | 'book'
  | 'clock'
  | 'heart'
  | 'info'
  | 'ink'
  | 'lock'
  | 'spark'
  | 'sword';
export type PaperToolIconKey =
  | 'sticker'
  | 'eraser'
  | 'undo';

export type PaperIconOptions = Readonly<{
  size?: number;
  fill?: number;
  stroke?: number;
}>;

/** Small semantic icons with one shared cardstock-and-ink construction. */
export function paperIcon(
  scene: Scene,
  key: PaperIconKey,
  x: number,
  y: number,
  options: PaperIconOptions = {}
): Phaser.GameObjects.Container {
  const size = options.size ?? 32;
  const fill = options.fill ?? UI.coral;
  const stroke = options.stroke ?? UI.inkHex;
  const scale = size / 32;
  const container = scene.add.container(x, y);
  const shadow = scene.add.graphics().setPosition(2 * scale, 3 * scale);
  const face = scene.add.graphics();

  drawIcon(shadow, key, scale, 0x9b754d, 0x9b754d);
  drawIcon(face, key, scale, fill, stroke);
  container.add([shadow, face]);
  return container;
}

export function elementPaperIcon(
  scene: Scene,
  element: Element,
  x: number,
  y: number,
  size = 34
): Phaser.GameObjects.Container {
  const style = ELEMENT_STYLES[element];
  const scale = size / 34;
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  graphics.fillStyle(UI.creamHex, 1);
  graphics.fillCircle(0, 0, 16 * scale);
  graphics.lineStyle(3 * scale, UI.inkHex, 1);
  graphics.strokeCircle(0, 0, 16 * scale);
  graphics.lineStyle(4 * scale, style.primary, 1);

  if (element === 'ember') {
    graphics.strokePoints(
      [
        new Phaser.Math.Vector2(0, -12 * scale),
        new Phaser.Math.Vector2(-3 * scale, -3 * scale),
        new Phaser.Math.Vector2(-9 * scale, 2 * scale),
        new Phaser.Math.Vector2(-6 * scale, 10 * scale),
        new Phaser.Math.Vector2(0, 13 * scale),
        new Phaser.Math.Vector2(8 * scale, 7 * scale),
        new Phaser.Math.Vector2(9 * scale, -1 * scale),
        new Phaser.Math.Vector2(4 * scale, -7 * scale),
        new Phaser.Math.Vector2(0, -12 * scale),
      ],
      true
    );
  } else if (element === 'tide') {
    [-5, 3].forEach((offset) => {
      graphics.strokePoints(
        [
          new Phaser.Math.Vector2(-10 * scale, offset * scale),
          new Phaser.Math.Vector2(-5 * scale, (offset - 4) * scale),
          new Phaser.Math.Vector2(0, offset * scale),
          new Phaser.Math.Vector2(5 * scale, (offset + 4) * scale),
          new Phaser.Math.Vector2(10 * scale, offset * scale),
        ],
        false
      );
    });
  } else if (element === 'moss') {
    graphics.fillStyle(style.soft, 0.7);
    graphics.fillEllipse(0, 0, 20 * scale, 25 * scale);
    graphics.strokeEllipse(0, 0, 20 * scale, 25 * scale);
    graphics.lineBetween(-7 * scale, 7 * scale, 7 * scale, -6 * scale);
  } else {
    graphics.beginPath();
    graphics.moveTo(4 * scale, -12 * scale);
    graphics.lineTo(-7 * scale, 1 * scale);
    graphics.lineTo(1 * scale, 1 * scale);
    graphics.lineTo(-4 * scale, 12 * scale);
    graphics.lineTo(9 * scale, -3 * scale);
    graphics.lineTo(1 * scale, -3 * scale);
    graphics.closePath();
    graphics.strokePath();
  }

  container.add(graphics);
  return container;
}

/** Compact drawing-tool marks that share the same inked-paper silhouette. */
export function paperToolIcon(
  scene: Scene,
  key: PaperToolIconKey,
  x: number,
  y: number,
  size = 34
): Phaser.GameObjects.Container {
  const scale = size / 34;
  const container = scene.add.container(x, y);
  const backing = scene.add.graphics().setPosition(2 * scale, 3 * scale);
  const face = scene.add.graphics();
  drawTool(backing, key, scale, 0x9b754d, 0x9b754d);
  drawTool(face, key, scale, UI.creamHex, UI.inkHex);
  container.add([backing, face]);
  return container;
}

function drawTool(
  graphics: Phaser.GameObjects.Graphics,
  key: PaperToolIconKey,
  scale: number,
  fill: number,
  stroke: number
): void {
  graphics.fillStyle(fill, 1);
  graphics.lineStyle(3 * scale, stroke, 1);

  if (key === 'sticker') {
    const points: Phaser.Math.Vector2[] = [];
    for (let point = 0; point < 10; point += 1) {
      const radius = (point % 2 === 0 ? 14 : 7) * scale;
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      points.push(
        new Phaser.Math.Vector2(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius
        )
      );
    }
    graphics.fillPoints(points, true);
    graphics.strokePoints(points, true);
    return;
  }

  if (key === 'eraser') {
    const points = [
      new Phaser.Math.Vector2(-13 * scale, 6 * scale),
      new Phaser.Math.Vector2(3 * scale, -12 * scale),
      new Phaser.Math.Vector2(13 * scale, -3 * scale),
      new Phaser.Math.Vector2(-3 * scale, 14 * scale),
    ];
    graphics.fillPoints(points, true);
    graphics.strokePoints(points, true);
    graphics.lineBetween(-7 * scale, 0, 4 * scale, 10 * scale);
    return;
  }

  if (key === 'undo') {
    graphics.beginPath();
    graphics.arc(2 * scale, 2 * scale, 11 * scale, -2.5, 1.5, false);
    graphics.strokePath();
    graphics.fillTriangle(
      -14 * scale,
      -5 * scale,
      -3 * scale,
      -11 * scale,
      -4 * scale,
      1 * scale
    );
    return;
  }
}

function drawIcon(
  graphics: Phaser.GameObjects.Graphics,
  key: PaperIconKey,
  scale: number,
  fill: number,
  stroke: number
): void {
  graphics.fillStyle(fill, 1);
  graphics.lineStyle(3 * scale, stroke, 1);

  if (key === 'clock') {
    graphics.fillCircle(0, 0, 13 * scale);
    graphics.strokeCircle(0, 0, 13 * scale);
    graphics.lineBetween(0, 0, 0, -7 * scale);
    graphics.lineBetween(0, 0, 6 * scale, 3 * scale);
    return;
  }

  if (key === 'book') {
    graphics.fillRoundedRect(
      -14 * scale,
      -11 * scale,
      28 * scale,
      23 * scale,
      3 * scale
    );
    graphics.strokeRoundedRect(
      -14 * scale,
      -11 * scale,
      28 * scale,
      23 * scale,
      3 * scale
    );
    graphics.lineBetween(0, -10 * scale, 0, 11 * scale);
    graphics.lineBetween(-10 * scale, -5 * scale, -4 * scale, -3 * scale);
    graphics.lineBetween(4 * scale, -3 * scale, 10 * scale, -5 * scale);
    return;
  }

  if (key === 'ink') {
    graphics.fillRoundedRect(
      -10 * scale,
      -9 * scale,
      20 * scale,
      20 * scale,
      5 * scale
    );
    graphics.strokeRoundedRect(
      -10 * scale,
      -9 * scale,
      20 * scale,
      20 * scale,
      5 * scale
    );
    graphics.fillRect(-7 * scale, -14 * scale, 14 * scale, 5 * scale);
    graphics.strokeRect(-7 * scale, -14 * scale, 14 * scale, 5 * scale);
    return;
  }

  if (key === 'lock') {
    graphics.beginPath();
    graphics.arc(0, -4 * scale, 8 * scale, Math.PI, 0, false);
    graphics.strokePath();
    graphics.fillRoundedRect(
      -12 * scale,
      -3 * scale,
      24 * scale,
      17 * scale,
      3 * scale
    );
    graphics.strokeRoundedRect(
      -12 * scale,
      -3 * scale,
      24 * scale,
      17 * scale,
      3 * scale
    );
    graphics.fillCircle(0, 5 * scale, 2 * scale);
    graphics.lineBetween(0, 6 * scale, 0, 10 * scale);
    return;
  }

  if (key === 'spark') {
    graphics.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = (point % 2 === 0 ? 13 : 6) * scale;
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (point === 0) graphics.moveTo(px, py);
      else graphics.lineTo(px, py);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    return;
  }

  if (key === 'info') {
    graphics.fillCircle(0, 0, 13 * scale);
    graphics.strokeCircle(0, 0, 13 * scale);
    graphics.lineBetween(0, -1 * scale, 0, 8 * scale);
    graphics.fillCircle(0, -7 * scale, 1.8 * scale);
    return;
  }

  if (key === 'sword') {
    graphics.fillPoints(
      [
        new Phaser.Math.Vector2(-3 * scale, 5 * scale),
        new Phaser.Math.Vector2(7 * scale, -11 * scale),
        new Phaser.Math.Vector2(14 * scale, -14 * scale),
        new Phaser.Math.Vector2(11 * scale, -7 * scale),
        new Phaser.Math.Vector2(3 * scale, 7 * scale),
      ],
      true
    );
    graphics.strokePoints(
      [
        new Phaser.Math.Vector2(-3 * scale, 5 * scale),
        new Phaser.Math.Vector2(7 * scale, -11 * scale),
        new Phaser.Math.Vector2(14 * scale, -14 * scale),
        new Phaser.Math.Vector2(11 * scale, -7 * scale),
        new Phaser.Math.Vector2(3 * scale, 7 * scale),
      ],
      true
    );
    graphics.lineBetween(-7 * scale, 1 * scale, 6 * scale, 10 * scale);
    graphics.lineBetween(-2 * scale, 8 * scale, -9 * scale, 14 * scale);
    graphics.strokeCircle(-11 * scale, 16 * scale, 2.5 * scale);
    return;
  }

  const heart: Phaser.Math.Vector2[] = [
    new Phaser.Math.Vector2(0, 13 * scale),
    new Phaser.Math.Vector2(-13 * scale, 3 * scale),
    new Phaser.Math.Vector2(-13 * scale, -6 * scale),
    new Phaser.Math.Vector2(-8 * scale, -12 * scale),
    new Phaser.Math.Vector2(-2 * scale, -12 * scale),
    new Phaser.Math.Vector2(0, -8 * scale),
    new Phaser.Math.Vector2(2 * scale, -12 * scale),
    new Phaser.Math.Vector2(8 * scale, -12 * scale),
    new Phaser.Math.Vector2(13 * scale, -6 * scale),
    new Phaser.Math.Vector2(13 * scale, 3 * scale),
  ];
  graphics.fillPoints(heart, true);
  graphics.strokePoints(heart, true);
}
