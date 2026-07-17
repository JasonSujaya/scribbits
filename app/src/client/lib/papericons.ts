import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import type { PowerUpId } from '../../shared/combat/powerups';
import { ELEMENT_STYLES, UI } from './theme';

export type PaperIconKey =
  | 'armor'
  | 'archive'
  | 'back'
  | 'berry'
  | 'book'
  | 'boots'
  | 'clock'
  | 'defeat'
  | 'eye'
  | 'forge'
  | 'gift'
  | 'gun'
  | 'heart'
  | 'paw'
  | 'replay'
  | 'resize'
  | 'info'
  | 'ink'
  | 'lock'
  | 'pencil'
  | 'shield'
  | 'spark'
  | 'settings'
  | 'sword'
  | 'target'
  | 'train'
  | 'trash'
  | 'trophy';
export type PaperToolIconKey =
  | 'sticker'
  | 'pencil'
  | 'contrast'
  | 'bucket'
  | 'eraser'
  | 'clear'
  | 'undo'
  | 'redo'
  | 'tools';
export type PaperStatIconKey = 'chonk' | 'spike' | 'zip' | 'charm';
export type PaperDockIconKey =
  | 'home'
  | 'arena'
  | 'bag'
  | 'shop'
  | 'draw'
  | 'battles';

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

  if (key === 'ink') {
    drawInkBottle(shadow, scale, 0x9b754d, 0x9b754d, true);
    drawInkBottle(face, scale, fill, stroke, false);
  } else {
    drawIcon(shadow, key, scale, 0x9b754d, 0x9b754d);
    drawIcon(face, key, scale, fill, stroke);
  }
  container.add([shadow, face]);
  return container;
}

function drawInkBottle(
  graphics: Phaser.GameObjects.Graphics,
  scale: number,
  liquidFill: number,
  stroke: number,
  shadowOnly: boolean
): void {
  graphics.lineStyle(3 * scale, stroke, 1);
  if (shadowOnly) {
    graphics.fillStyle(liquidFill, 1);
    graphics.fillRoundedRect(
      -12 * scale,
      -7 * scale,
      24 * scale,
      21 * scale,
      7 * scale
    );
    graphics.fillRoundedRect(
      -8 * scale,
      -15 * scale,
      16 * scale,
      9 * scale,
      2 * scale
    );
    return;
  }

  graphics.fillStyle(UI.creamHex, 1);
  graphics.fillRoundedRect(
    -12 * scale,
    -7 * scale,
    24 * scale,
    21 * scale,
    7 * scale
  );
  graphics.fillRect(-7 * scale, -11 * scale, 14 * scale, 7 * scale);

  graphics.fillStyle(liquidFill, 1);
  graphics.fillRoundedRect(-9 * scale, 0, 18 * scale, 11 * scale, 4 * scale);
  graphics.fillRect(-9 * scale, 0, 18 * scale, 4 * scale);

  graphics.lineStyle(3 * scale, stroke, 1);
  graphics.strokeRoundedRect(
    -12 * scale,
    -7 * scale,
    24 * scale,
    21 * scale,
    7 * scale
  );
  graphics.strokeRect(-7 * scale, -11 * scale, 14 * scale, 7 * scale);

  graphics.fillStyle(stroke, 1);
  graphics.fillRoundedRect(
    -9 * scale,
    -16 * scale,
    18 * scale,
    6 * scale,
    2 * scale
  );
  graphics.fillStyle(UI.creamHex, 0.92);
  graphics.fillRoundedRect(
    -6 * scale,
    -3 * scale,
    4 * scale,
    9 * scale,
    2 * scale
  );
  graphics.fillCircle(4 * scale, 7 * scale, 1.8 * scale);
}

/** Distinct combat marks for the roguelite catalog and reward draft. */
export function powerUpPaperIcon(
  scene: Scene,
  key: PowerUpId,
  x: number,
  y: number,
  options: PaperIconOptions = {}
): Phaser.GameObjects.Container {
  const size = options.size ?? 32;
  const fill = options.fill ?? UI.coral;
  const stroke = options.stroke ?? UI.inkHex;
  const scale = size / 32;
  const container = scene.add.container(x, y).setData('power-up-id', key);
  const shadow = scene.add.graphics().setPosition(2 * scale, 3 * scale);
  const face = scene.add.graphics();

  drawPowerUpIcon(shadow, key, scale, 0x9b754d, 0x9b754d);
  drawPowerUpIcon(face, key, scale, fill, stroke);
  container.add([shadow, face]);
  return container;
}

/** Shared dock icons, with an optional scrapbook-color treatment for the tabs. */
export function paperDockIcon(
  scene: Scene,
  key: PaperDockIconKey,
  x: number,
  y: number,
  size = 42,
  color: number = UI.inkHex,
  accented = false
): Phaser.GameObjects.Container {
  const scale = size / 42;
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  graphics.lineStyle(3 * scale, color, 1);
  graphics.fillStyle(color, 1);

  if (key === 'home' && accented) {
    const roof = [
      new Phaser.Math.Vector2(-19 * scale, -4 * scale),
      new Phaser.Math.Vector2(0, -21 * scale),
      new Phaser.Math.Vector2(19 * scale, -4 * scale),
    ];
    graphics.fillStyle(UI.coral, 0.92);
    graphics.fillTriangle(
      roof[0]?.x ?? 0,
      roof[0]?.y ?? 0,
      roof[1]?.x ?? 0,
      roof[1]?.y ?? 0,
      roof[2]?.x ?? 0,
      roof[2]?.y ?? 0
    );
    graphics.lineStyle(3 * scale, color, 1);
    graphics.strokePoints(roof, false);
    graphics.fillStyle(UI.creamHex, 1);
    graphics.fillRoundedRect(
      -14 * scale,
      -4 * scale,
      28 * scale,
      23 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -14 * scale,
      -4 * scale,
      28 * scale,
      23 * scale,
      2 * scale
    );
    graphics.fillStyle(UI.gold, 1);
    graphics.fillRoundedRect(-4 * scale, 6 * scale, 8 * scale, 13 * scale, 2);
    graphics.strokeRoundedRect(-4 * scale, 6 * scale, 8 * scale, 13 * scale, 2);
  } else if (key === 'arena' && accented) {
    graphics.fillStyle(UI.gold, 1);
    drawFivePointStar(graphics, 0, 0, 17 * scale, 8 * scale, true);
    graphics.lineStyle(3 * scale, color, 1);
    drawFivePointStar(graphics, 0, 0, 17 * scale, 8 * scale, false);
  } else if (key === 'bag' && accented) {
    graphics.fillStyle(UI.coral, 0.82);
    graphics.fillRoundedRect(
      -18 * scale,
      -11 * scale,
      36 * scale,
      27 * scale,
      5 * scale
    );
    graphics.lineStyle(3 * scale, color, 1);
    graphics.strokeRoundedRect(
      -18 * scale,
      -11 * scale,
      36 * scale,
      27 * scale,
      5 * scale
    );
    graphics.strokeRoundedRect(
      -10 * scale,
      -20 * scale,
      20 * scale,
      15 * scale,
      7 * scale
    );
    graphics.fillStyle(UI.gold, 1);
    graphics.fillRoundedRect(-5 * scale, -3 * scale, 10 * scale, 8 * scale, 2);
  } else if (key === 'shop' && accented) {
    graphics.fillStyle(0x8a5cd8, 0.9);
    graphics.fillRoundedRect(
      -18 * scale,
      -10 * scale,
      36 * scale,
      27 * scale,
      5 * scale
    );
    graphics.lineStyle(3 * scale, color, 1);
    graphics.strokeRoundedRect(
      -18 * scale,
      -10 * scale,
      36 * scale,
      27 * scale,
      5 * scale
    );
    graphics.beginPath();
    graphics.arc(0, -9 * scale, 10 * scale, Math.PI, 0, false);
    graphics.strokePath();
    graphics.fillStyle(UI.gold, 1);
    drawFivePointStar(graphics, 0, 4 * scale, 7 * scale, 3 * scale, true);
    graphics.lineStyle(2 * scale, color, 1);
    drawFivePointStar(graphics, 0, 4 * scale, 7 * scale, 3 * scale, false);
  } else if (key === 'draw' && accented) {
    const pencilBody = [
      new Phaser.Math.Vector2(-13 * scale, 10 * scale),
      new Phaser.Math.Vector2(9 * scale, -15 * scale),
      new Phaser.Math.Vector2(17 * scale, -8 * scale),
      new Phaser.Math.Vector2(-6 * scale, 17 * scale),
    ];
    graphics.fillStyle(UI.gold, 1);
    graphics.fillPoints(pencilBody, true);
    graphics.strokePoints(pencilBody, true);
    graphics.fillStyle(UI.coral, 1);
    graphics.fillTriangle(
      9 * scale,
      -15 * scale,
      17 * scale,
      -8 * scale,
      14 * scale,
      -18 * scale
    );
    graphics.lineBetween(-13 * scale, 10 * scale, -18 * scale, 21 * scale);
    graphics.lineBetween(-18 * scale, 21 * scale, -6 * scale, 17 * scale);
  } else if (key === 'battles' && accented) {
    drawDockBattleGlove(graphics, scale, UI.coral, UI.gold, color);
  } else if (key === 'home') {
    graphics.beginPath();
    graphics.moveTo(-19 * scale, -4 * scale);
    graphics.lineTo(0, -21 * scale);
    graphics.lineTo(19 * scale, -4 * scale);
    graphics.strokePath();
    graphics.strokeRoundedRect(
      -14 * scale,
      -4 * scale,
      28 * scale,
      23 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -4 * scale,
      6 * scale,
      8 * scale,
      13 * scale,
      2 * scale
    );
  } else if (key === 'arena') {
    graphics.strokeCircle(0, 0, 18 * scale);
    drawFivePointStar(graphics, 0, 0, 10 * scale, 4.5 * scale, false);
  } else if (key === 'bag') {
    graphics.strokeRoundedRect(
      -18 * scale,
      -11 * scale,
      36 * scale,
      27 * scale,
      5 * scale
    );
    graphics.strokeRoundedRect(
      -10 * scale,
      -20 * scale,
      20 * scale,
      15 * scale,
      7 * scale
    );
    graphics.fillRoundedRect(-5 * scale, -3 * scale, 10 * scale, 8 * scale, 2);
  } else if (key === 'shop') {
    graphics.strokeRoundedRect(
      -18 * scale,
      -10 * scale,
      36 * scale,
      27 * scale,
      5 * scale
    );
    graphics.beginPath();
    graphics.arc(0, -9 * scale, 10 * scale, Math.PI, 0, false);
    graphics.strokePath();
    drawFivePointStar(graphics, 0, 4 * scale, 7 * scale, 3 * scale, false);
  } else if (key === 'draw') {
    const pencilBody = [
      new Phaser.Math.Vector2(-15 * scale, 10 * scale),
      new Phaser.Math.Vector2(10 * scale, -15 * scale),
      new Phaser.Math.Vector2(17 * scale, -8 * scale),
      new Phaser.Math.Vector2(-8 * scale, 17 * scale),
    ];
    graphics.strokePoints(pencilBody, true);
    graphics.lineBetween(-15 * scale, 10 * scale, -19 * scale, 21 * scale);
    graphics.lineBetween(-19 * scale, 21 * scale, -8 * scale, 17 * scale);
    graphics.lineBetween(10 * scale, -15 * scale, 17 * scale, -8 * scale);
  } else if (key === 'battles') {
    drawDockBattleGlove(graphics, scale, UI.creamHex, UI.gold, color);
  }

  container.add(graphics);
  return container;
}

function drawFivePointStar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  fill: boolean
): void {
  const points: Phaser.Math.Vector2[] = [];
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    points.push(
      new Phaser.Math.Vector2(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius
      )
    );
  }
  if (fill) graphics.fillPoints(points, true);
  else graphics.strokePoints(points, true);
}

function drawDockBattleGlove(
  graphics: Phaser.GameObjects.Graphics,
  scale: number,
  gloveFill: number,
  cuffFill: number,
  stroke: number
): void {
  const cuff = [
    new Phaser.Math.Vector2(-11 * scale, 8 * scale),
    new Phaser.Math.Vector2(8 * scale, 8 * scale),
    new Phaser.Math.Vector2(10 * scale, 20 * scale),
    new Phaser.Math.Vector2(-9 * scale, 21 * scale),
  ];
  graphics.fillStyle(cuffFill, 1);
  graphics.fillPoints(cuff, true);
  graphics.strokePoints(cuff, true);

  const glove = [
    new Phaser.Math.Vector2(-11 * scale, 10 * scale),
    new Phaser.Math.Vector2(-16 * scale, 9 * scale),
    new Phaser.Math.Vector2(-20 * scale, 5 * scale),
    new Phaser.Math.Vector2(-21 * scale, 0),
    new Phaser.Math.Vector2(-19 * scale, -4 * scale),
    new Phaser.Math.Vector2(-15 * scale, -5 * scale),
    new Phaser.Math.Vector2(-11 * scale, -2 * scale),
    new Phaser.Math.Vector2(-12 * scale, -9 * scale),
    new Phaser.Math.Vector2(-10 * scale, -14 * scale),
    new Phaser.Math.Vector2(-5 * scale, -18 * scale),
    new Phaser.Math.Vector2(2 * scale, -20 * scale),
    new Phaser.Math.Vector2(10 * scale, -18 * scale),
    new Phaser.Math.Vector2(16 * scale, -13 * scale),
    new Phaser.Math.Vector2(19 * scale, -7 * scale),
    new Phaser.Math.Vector2(19 * scale, 0),
    new Phaser.Math.Vector2(16 * scale, 6 * scale),
    new Phaser.Math.Vector2(11 * scale, 9 * scale),
    new Phaser.Math.Vector2(7 * scale, 10 * scale),
  ];
  graphics.fillStyle(gloveFill, 1);
  graphics.fillPoints(glove, true);
  graphics.strokePoints(glove, true);

  const thumbSeam = [
    new Phaser.Math.Vector2(-11 * scale, -2 * scale),
    new Phaser.Math.Vector2(-8 * scale, 1 * scale),
    new Phaser.Math.Vector2(-7 * scale, 6 * scale),
  ];
  graphics.lineStyle(2.4 * scale, stroke, 1);
  graphics.strokePoints(thumbSeam, false);
  graphics.lineBetween(-3 * scale, -13 * scale, 7 * scale, -12 * scale);
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
  if (key !== 'undo' && key !== 'redo' && key !== 'contrast') {
    drawTool(backing, key, scale, 0x9b754d, 0x9b754d);
  }
  const faceFill =
    key === 'contrast'
      ? UI.tapeAlt
      : key === 'pencil'
        ? 0x7fd8e6
        : key === 'eraser'
          ? UI.coral
          : key === 'bucket'
            ? UI.gold
            : key === 'clear'
              ? UI.tapeAlt
              : UI.creamHex;
  drawTool(face, key, scale, faceFill, UI.inkHex);
  if (key === 'redo') face.setScale(-1, 1);
  container.add(key === 'undo' || key === 'redo' ? [face] : [backing, face]);
  return container;
}

/** Four readable combat-stat marks for compact build previews. */
export function paperStatIcon(
  scene: Scene,
  key: PaperStatIconKey,
  x: number,
  y: number,
  size: number,
  color: number,
  showShadow = true
): Phaser.GameObjects.Container {
  const scale = size / 34;
  const container = scene.add.container(x, y);
  const face = scene.add.graphics();
  if (showShadow) {
    const shadow = scene.add.graphics().setPosition(2 * scale, 3 * scale);
    drawStatIcon(shadow, key, scale, 0x9b754d, 0x9b754d);
    container.add(shadow);
  }
  drawStatIcon(face, key, scale, color, UI.inkHex);
  container.add(face);
  return container;
}

function drawStatIcon(
  graphics: Phaser.GameObjects.Graphics,
  key: PaperStatIconKey,
  scale: number,
  fill: number,
  stroke: number
): void {
  graphics.fillStyle(fill, 1);
  graphics.lineStyle(2.2 * scale, stroke, 1);

  if (key === 'chonk') {
    graphics.fillEllipse(0, 2 * scale, 28 * scale, 23 * scale);
    graphics.strokeEllipse(0, 2 * scale, 28 * scale, 23 * scale);
    graphics.lineBetween(-9 * scale, 13 * scale, -5 * scale, 9 * scale);
    graphics.lineBetween(9 * scale, 13 * scale, 5 * scale, 9 * scale);
    return;
  }

  if (key === 'spike') {
    const spikes = [
      [
        new Phaser.Math.Vector2(-14 * scale, 12 * scale),
        new Phaser.Math.Vector2(-8 * scale, -10 * scale),
        new Phaser.Math.Vector2(-2 * scale, 12 * scale),
      ],
      [
        new Phaser.Math.Vector2(-6 * scale, 12 * scale),
        new Phaser.Math.Vector2(0, -15 * scale),
        new Phaser.Math.Vector2(6 * scale, 12 * scale),
      ],
      [
        new Phaser.Math.Vector2(2 * scale, 12 * scale),
        new Phaser.Math.Vector2(9 * scale, -8 * scale),
        new Phaser.Math.Vector2(14 * scale, 12 * scale),
      ],
    ];
    spikes.forEach((spike) => {
      graphics.fillPoints(spike, true);
      graphics.strokePoints(spike, true);
    });
    return;
  }

  if (key === 'zip') {
    const bolt = [
      new Phaser.Math.Vector2(3 * scale, -16 * scale),
      new Phaser.Math.Vector2(-11 * scale, 2 * scale),
      new Phaser.Math.Vector2(-2 * scale, 2 * scale),
      new Phaser.Math.Vector2(-7 * scale, 16 * scale),
      new Phaser.Math.Vector2(12 * scale, -5 * scale),
      new Phaser.Math.Vector2(3 * scale, -5 * scale),
    ];
    graphics.fillPoints(bolt, true);
    graphics.strokePoints(bolt, true);
    return;
  }

  const heart = [
    new Phaser.Math.Vector2(0, 15 * scale),
    new Phaser.Math.Vector2(-13 * scale, 3 * scale),
    new Phaser.Math.Vector2(-13 * scale, -5 * scale),
    new Phaser.Math.Vector2(-7 * scale, -12 * scale),
    new Phaser.Math.Vector2(0, -7 * scale),
    new Phaser.Math.Vector2(7 * scale, -12 * scale),
    new Phaser.Math.Vector2(13 * scale, -5 * scale),
    new Phaser.Math.Vector2(13 * scale, 3 * scale),
  ];
  graphics.fillPoints(heart, true);
  graphics.strokePoints(heart, true);
}

function drawTool(
  graphics: Phaser.GameObjects.Graphics,
  key: PaperToolIconKey,
  scale: number,
  fill: number,
  stroke: number
): void {
  graphics.fillStyle(fill, 1);
  graphics.lineStyle(4 * scale, stroke, 1);

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

  if (key === 'pencil') {
    const body = [
      new Phaser.Math.Vector2(-14 * scale, 8 * scale),
      new Phaser.Math.Vector2(7 * scale, -13 * scale),
      new Phaser.Math.Vector2(14 * scale, -6 * scale),
      new Phaser.Math.Vector2(-7 * scale, 15 * scale),
    ];
    graphics.fillPoints(body, true);
    graphics.strokePoints(body, true);
    graphics.lineBetween(7 * scale, -13 * scale, 14 * scale, -6 * scale);
    graphics.lineBetween(-14 * scale, 8 * scale, -17 * scale, 17 * scale);
    graphics.lineBetween(-17 * scale, 17 * scale, -7 * scale, 15 * scale);
    return;
  }

  if (key === 'contrast') {
    graphics.fillCircle(-2 * scale, 0, 13 * scale);
    graphics.strokeCircle(-2 * scale, 0, 13 * scale);
    graphics.fillStyle(UI.creamHex, 1);
    graphics.fillCircle(5 * scale, -5 * scale, 11 * scale);
    return;
  }

  if (key === 'eraser') {
    const points = [
      new Phaser.Math.Vector2(-15 * scale, 4 * scale),
      new Phaser.Math.Vector2(2 * scale, -14 * scale),
      new Phaser.Math.Vector2(15 * scale, -2 * scale),
      new Phaser.Math.Vector2(-2 * scale, 15 * scale),
    ];
    graphics.fillPoints(points, true);
    graphics.strokePoints(points, true);
    graphics.lineBetween(-7 * scale, -4 * scale, 7 * scale, 9 * scale);
    graphics.fillCircle(-12 * scale, 13 * scale, 2.2 * scale);
    graphics.fillCircle(-5 * scale, 16 * scale, 1.5 * scale);
    return;
  }

  if (key === 'bucket') {
    graphics.beginPath();
    graphics.moveTo(-13 * scale, -5 * scale);
    graphics.lineTo(13 * scale, -5 * scale);
    graphics.lineTo(9 * scale, 13 * scale);
    graphics.lineTo(-9 * scale, 13 * scale);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(0, -5 * scale, 10 * scale, Math.PI, Math.PI * 2);
    graphics.strokePath();
    graphics.lineBetween(-11 * scale, 2 * scale, 11 * scale, 2 * scale);
    graphics.fillCircle(15 * scale, 10 * scale, 3 * scale);
    return;
  }

  if (key === 'clear') {
    graphics.fillRoundedRect(
      -10 * scale,
      -10 * scale,
      20 * scale,
      24 * scale,
      3 * scale
    );
    graphics.strokeRoundedRect(
      -10 * scale,
      -10 * scale,
      20 * scale,
      24 * scale,
      3 * scale
    );
    graphics.lineBetween(-14 * scale, -13 * scale, 14 * scale, -13 * scale);
    graphics.lineBetween(-6 * scale, -17 * scale, 6 * scale, -17 * scale);
    graphics.lineBetween(-4 * scale, -6 * scale, -3 * scale, 9 * scale);
    graphics.lineBetween(4 * scale, -6 * scale, 3 * scale, 9 * scale);
    return;
  }

  if (key === 'tools') {
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.lineBetween(-15 * scale, -10 * scale, 15 * scale, -10 * scale);
    graphics.lineBetween(-15 * scale, 0, 15 * scale, 0);
    graphics.lineBetween(-15 * scale, 10 * scale, 15 * scale, 10 * scale);
    graphics.fillCircle(-5 * scale, -10 * scale, 4.5 * scale);
    graphics.strokeCircle(-5 * scale, -10 * scale, 4.5 * scale);
    graphics.fillCircle(7 * scale, 0, 4.5 * scale);
    graphics.strokeCircle(7 * scale, 0, 4.5 * scale);
    graphics.fillCircle(-1 * scale, 10 * scale, 4.5 * scale);
    graphics.strokeCircle(-1 * scale, 10 * scale, 4.5 * scale);
    return;
  }

  if (key === 'undo' || key === 'redo') {
    // A joined, heavy return arrow reads as Undo at mobile size. The previous
    // offset double-arc looked like a question mark once letterboxed.
    graphics.lineStyle(5 * scale, stroke, 1);
    graphics.beginPath();
    graphics.moveTo(-9 * scale, -6 * scale);
    graphics.lineTo(5 * scale, -6 * scale);
    graphics.arc(5 * scale, 3 * scale, 9 * scale, -Math.PI / 2, Math.PI / 2);
    graphics.lineTo(2 * scale, 12 * scale);
    graphics.strokePath();
    graphics.fillStyle(stroke, 1);
    graphics.fillTriangle(
      -15 * scale,
      -6 * scale,
      -4 * scale,
      -15 * scale,
      -4 * scale,
      3 * scale
    );
    return;
  }
}

function drawPowerUpIcon(
  graphics: Phaser.GameObjects.Graphics,
  key: PowerUpId,
  scale: number,
  fill: number,
  stroke: number
): void {
  graphics.fillStyle(fill, 1);
  graphics.lineStyle(3 * scale, stroke, 1);

  if (key === 'v1-edge-spring') {
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.lineBetween(-13 * scale, -14 * scale, -13 * scale, 14 * scale);
    [-10, 0, 10].forEach((offsetY) => {
      graphics.lineBetween(
        -16 * scale,
        offsetY * scale,
        -11 * scale,
        offsetY * scale
      );
    });
    graphics.beginPath();
    graphics.moveTo(-8 * scale, 8 * scale);
    graphics.lineTo(-3 * scale, 2 * scale);
    graphics.lineTo(2 * scale, 8 * scale);
    graphics.lineTo(7 * scale, 2 * scale);
    graphics.strokePath();
    graphics.fillTriangle(
      6 * scale,
      -5 * scale,
      15 * scale,
      2 * scale,
      6 * scale,
      9 * scale
    );
    return;
  }

  if (key === 'v1-smudge-step') {
    [-9, -2, 5].forEach((offsetY, index) => {
      graphics.lineBetween(
        (-15 + index * 2) * scale,
        offsetY * scale,
        (-7 + index * 2) * scale,
        offsetY * scale
      );
    });
    const boot = [
      new Phaser.Math.Vector2(-3 * scale, -13 * scale),
      new Phaser.Math.Vector2(8 * scale, -13 * scale),
      new Phaser.Math.Vector2(8 * scale, 3 * scale),
      new Phaser.Math.Vector2(15 * scale, 7 * scale),
      new Phaser.Math.Vector2(13 * scale, 13 * scale),
      new Phaser.Math.Vector2(-5 * scale, 13 * scale),
      new Phaser.Math.Vector2(-8 * scale, 7 * scale),
      new Phaser.Math.Vector2(-3 * scale, 3 * scale),
    ];
    graphics.fillPoints(boot, true);
    graphics.strokePoints(boot, true);
    graphics.lineBetween(-4 * scale, 7 * scale, 12 * scale, 7 * scale);
    return;
  }

  if (key === 'v1-paper-shield') {
    const shield = [
      new Phaser.Math.Vector2(0, -15 * scale),
      new Phaser.Math.Vector2(13 * scale, -10 * scale),
      new Phaser.Math.Vector2(11 * scale, 5 * scale),
      new Phaser.Math.Vector2(0, 15 * scale),
      new Phaser.Math.Vector2(-11 * scale, 5 * scale),
      new Phaser.Math.Vector2(-13 * scale, -10 * scale),
    ];
    graphics.fillPoints(shield, true);
    graphics.strokePoints(shield, true);
    graphics.fillStyle(UI.creamHex, 1);
    drawFivePointStar(graphics, 0, 0, 7 * scale, 3 * scale, true);
    graphics.lineStyle(2 * scale, stroke, 1);
    drawFivePointStar(graphics, 0, 0, 7 * scale, 3 * scale, false);
    return;
  }

  if (key === 'v1-combo-spark') {
    [-11, -1].forEach((offsetX, index) => {
      graphics.fillCircle(offsetX * scale, (7 - index * 6) * scale, 4 * scale);
      graphics.strokeCircle(
        offsetX * scale,
        (7 - index * 6) * scale,
        4 * scale
      );
    });
    graphics.lineBetween(-7 * scale, 5 * scale, -4 * scale, 3 * scale);
    graphics.lineBetween(3 * scale, -1 * scale, 6 * scale, -5 * scale);
    drawFivePointStar(
      graphics,
      10 * scale,
      -8 * scale,
      8 * scale,
      3.5 * scale,
      true
    );
    graphics.lineStyle(2 * scale, stroke, 1);
    drawFivePointStar(
      graphics,
      10 * scale,
      -8 * scale,
      8 * scale,
      3.5 * scale,
      false
    );
    return;
  }

  if (key === 'v1-center-fold') {
    graphics.fillRoundedRect(
      -14 * scale,
      -12 * scale,
      28 * scale,
      24 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -14 * scale,
      -12 * scale,
      28 * scale,
      24 * scale,
      2 * scale
    );
    graphics.lineBetween(0, -12 * scale, 0, 12 * scale);
    graphics.lineBetween(-11 * scale, -8 * scale, 0, 0);
    graphics.lineBetween(-11 * scale, 8 * scale, 0, 0);
    graphics.lineBetween(11 * scale, -8 * scale, 0, 0);
    graphics.lineBetween(11 * scale, 8 * scale, 0, 0);
    graphics.fillStyle(stroke, 1);
    graphics.fillCircle(0, 0, 3 * scale);
    return;
  }

  if (key === 'v1-double-doodle') {
    [-5, 6].forEach((offsetX) => {
      const pencil = [
        new Phaser.Math.Vector2((offsetX - 4) * scale, 10 * scale),
        new Phaser.Math.Vector2((offsetX + 4) * scale, 10 * scale),
        new Phaser.Math.Vector2((offsetX + 4) * scale, -9 * scale),
        new Phaser.Math.Vector2(offsetX * scale, -15 * scale),
        new Phaser.Math.Vector2((offsetX - 4) * scale, -9 * scale),
      ];
      graphics.fillPoints(pencil, true);
      graphics.strokePoints(pencil, true);
      graphics.lineBetween(
        (offsetX - 4) * scale,
        5 * scale,
        (offsetX + 4) * scale,
        5 * scale
      );
    });
    graphics.fillStyle(stroke, 1);
    graphics.fillCircle(-11 * scale, 14 * scale, 2 * scale);
    graphics.fillCircle(13 * scale, 13 * scale, 2 * scale);
    return;
  }

  if (key === 'v1-backup-plan') {
    graphics.fillRoundedRect(
      -10 * scale,
      -13 * scale,
      20 * scale,
      26 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -10 * scale,
      -13 * scale,
      20 * scale,
      26 * scale,
      2 * scale
    );
    graphics.lineBetween(-6 * scale, -7 * scale, 6 * scale, -7 * scale);
    graphics.beginPath();
    graphics.arc(1 * scale, 4 * scale, 8 * scale, -0.4, Math.PI * 1.35, false);
    graphics.strokePath();
    graphics.fillStyle(stroke, 1);
    graphics.fillTriangle(
      -9 * scale,
      0,
      -2 * scale,
      -2 * scale,
      -5 * scale,
      6 * scale
    );
    return;
  }

  if (key === 'v1-counter-sketch') {
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.lineBetween(-13 * scale, 10 * scale, 8 * scale, -11 * scale);
    graphics.fillTriangle(
      8 * scale,
      -11 * scale,
      15 * scale,
      -15 * scale,
      12 * scale,
      -7 * scale
    );
    graphics.beginPath();
    graphics.moveTo(13 * scale, 9 * scale);
    graphics.lineTo(-5 * scale, 9 * scale);
    graphics.arc(
      -5 * scale,
      2 * scale,
      7 * scale,
      Math.PI / 2,
      Math.PI * 1.5,
      false
    );
    graphics.strokePath();
    graphics.fillTriangle(
      11 * scale,
      3 * scale,
      16 * scale,
      9 * scale,
      11 * scale,
      15 * scale
    );
    return;
  }

  if (key === 'v1-wallop') {
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.lineBetween(13 * scale, -15 * scale, 13 * scale, 15 * scale);
    [-10, 0, 10].forEach((offsetY) => {
      graphics.lineBetween(
        10 * scale,
        offsetY * scale,
        16 * scale,
        offsetY * scale
      );
    });
    const impact = [
      new Phaser.Math.Vector2(7 * scale, -10 * scale),
      new Phaser.Math.Vector2(3 * scale, -4 * scale),
      new Phaser.Math.Vector2(-3 * scale, -8 * scale),
      new Phaser.Math.Vector2(-2 * scale, -1 * scale),
      new Phaser.Math.Vector2(-11 * scale, 1 * scale),
      new Phaser.Math.Vector2(-3 * scale, 5 * scale),
      new Phaser.Math.Vector2(-6 * scale, 13 * scale),
      new Phaser.Math.Vector2(2 * scale, 8 * scale),
      new Phaser.Math.Vector2(7 * scale, 12 * scale),
    ];
    graphics.fillPoints(impact, true);
    graphics.strokePoints(impact, true);
    return;
  }

  if (key === 'v1-echo-mark') {
    graphics.fillCircle(-2 * scale, 0, 5 * scale);
    graphics.strokeCircle(-2 * scale, 0, 5 * scale);
    graphics.beginPath();
    graphics.arc(-2 * scale, 0, 10 * scale, -1.15, 1.15, false);
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(-2 * scale, 0, 15 * scale, -1.05, 1.05, false);
    graphics.strokePath();
    graphics.fillTriangle(
      10 * scale,
      -4 * scale,
      16 * scale,
      0,
      10 * scale,
      4 * scale
    );
    return;
  }

  if (key === 'v1-last-scribble') {
    const heart = [
      new Phaser.Math.Vector2(0, 15 * scale),
      new Phaser.Math.Vector2(-13 * scale, 3 * scale),
      new Phaser.Math.Vector2(-13 * scale, -5 * scale),
      new Phaser.Math.Vector2(-7 * scale, -12 * scale),
      new Phaser.Math.Vector2(0, -7 * scale),
      new Phaser.Math.Vector2(7 * scale, -12 * scale),
      new Phaser.Math.Vector2(13 * scale, -5 * scale),
      new Phaser.Math.Vector2(13 * scale, 3 * scale),
    ];
    graphics.fillPoints(heart, true);
    graphics.strokePoints(heart, true);
    graphics.lineStyle(3 * scale, UI.creamHex, 1);
    graphics.lineBetween(-3 * scale, -4 * scale, 2 * scale, 0);
    graphics.lineBetween(2 * scale, 0, -1 * scale, 5 * scale);
    graphics.lineStyle(2 * scale, stroke, 1);
    graphics.strokeRoundedRect(
      -8 * scale,
      8 * scale,
      16 * scale,
      6 * scale,
      2 * scale
    );
    return;
  }

  if (key === 'v1-second-draft') {
    graphics.fillRoundedRect(
      -13 * scale,
      -10 * scale,
      19 * scale,
      22 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -13 * scale,
      -10 * scale,
      19 * scale,
      22 * scale,
      2 * scale
    );
    graphics.fillRoundedRect(
      -5 * scale,
      -14 * scale,
      18 * scale,
      22 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -5 * scale,
      -14 * scale,
      18 * scale,
      22 * scale,
      2 * scale
    );
    graphics.beginPath();
    graphics.arc(5 * scale, 5 * scale, 9 * scale, 0.1, Math.PI * 1.45, false);
    graphics.strokePath();
    graphics.fillStyle(stroke, 1);
    graphics.fillTriangle(
      -6 * scale,
      3 * scale,
      1 * scale,
      1 * scale,
      -2 * scale,
      9 * scale
    );
    return;
  }

  if (key === 'v1-paper-twin') {
    [-7, 7].forEach((offsetX) => {
      graphics.fillRoundedRect(
        (offsetX - 7) * scale,
        -11 * scale,
        14 * scale,
        23 * scale,
        3 * scale
      );
      graphics.strokeRoundedRect(
        (offsetX - 7) * scale,
        -11 * scale,
        14 * scale,
        23 * scale,
        3 * scale
      );
      graphics.fillStyle(stroke, 1);
      graphics.fillCircle((offsetX - 3) * scale, -3 * scale, 1.5 * scale);
      graphics.fillCircle((offsetX + 3) * scale, -3 * scale, 1.5 * scale);
      graphics.lineBetween(
        (offsetX - 3) * scale,
        4 * scale,
        (offsetX + 3) * scale,
        4 * scale
      );
      graphics.fillStyle(fill, 1);
    });
    return;
  }

  if (key === 'v1-masterpiece') {
    graphics.fillRoundedRect(
      -15 * scale,
      -14 * scale,
      30 * scale,
      28 * scale,
      3 * scale
    );
    graphics.strokeRoundedRect(
      -15 * scale,
      -14 * scale,
      30 * scale,
      28 * scale,
      3 * scale
    );
    graphics.fillStyle(UI.creamHex, 1);
    graphics.fillRoundedRect(
      -10 * scale,
      -9 * scale,
      20 * scale,
      18 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -10 * scale,
      -9 * scale,
      20 * scale,
      18 * scale,
      2 * scale
    );
    graphics.fillStyle(fill, 1);
    drawFivePointStar(graphics, 0, 0, 8 * scale, 3.5 * scale, true);
    graphics.lineStyle(2 * scale, stroke, 1);
    drawFivePointStar(graphics, 0, 0, 8 * scale, 3.5 * scale, false);
    return;
  }

  if (key === 'v2-bank-shot') {
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.lineBetween(13 * scale, -15 * scale, 13 * scale, 15 * scale);
    graphics.beginPath();
    graphics.moveTo(-15 * scale, 9 * scale);
    graphics.lineTo(9 * scale, 0);
    graphics.lineTo(-5 * scale, -12 * scale);
    graphics.strokePath();
    graphics.fillTriangle(
      -5 * scale,
      -12 * scale,
      4 * scale,
      -10 * scale,
      -1 * scale,
      -3 * scale
    );
    return;
  }

  if (key === 'v2-returning-stroke') {
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.beginPath();
    graphics.arc(0, 1 * scale, 13 * scale, -0.25, Math.PI * 1.35, false);
    graphics.strokePath();
    graphics.fillTriangle(
      -13 * scale,
      -6 * scale,
      -4 * scale,
      -8 * scale,
      -8 * scale,
      0
    );
    graphics.fillStyle(fill, 1);
    graphics.fillTriangle(
      8 * scale,
      2 * scale,
      17 * scale,
      7 * scale,
      7 * scale,
      12 * scale
    );
    graphics.strokeTriangle(
      8 * scale,
      2 * scale,
      17 * scale,
      7 * scale,
      7 * scale,
      12 * scale
    );
    return;
  }

  if (key === 'v2-orbiting-nib' || key === 'v2-wider-halo') {
    const radius = (key === 'v2-wider-halo' ? 15 : 11) * scale;
    graphics.lineStyle(2.5 * scale, stroke, 0.8);
    graphics.strokeCircle(0, 0, radius);
    if (key === 'v2-wider-halo') graphics.strokeCircle(0, 0, 8 * scale);
    graphics.fillStyle(stroke, 1).fillCircle(0, 0, 3 * scale);
    const nibCount = key === 'v2-orbiting-nib' ? 4 : 3;
    for (let index = 0; index < nibCount; index += 1) {
      const angle = (index / nibCount) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      graphics.fillStyle(fill, 1);
      graphics.fillTriangle(
        x + Math.cos(angle) * 5 * scale,
        y + Math.sin(angle) * 5 * scale,
        x + Math.cos(angle + 2.25) * 4 * scale,
        y + Math.sin(angle + 2.25) * 4 * scale,
        x + Math.cos(angle - 2.25) * 4 * scale,
        y + Math.sin(angle - 2.25) * 4 * scale
      );
    }
    return;
  }

  if (key === 'v2-paint-splash') {
    graphics.fillTriangle(
      -14 * scale,
      -12 * scale,
      6 * scale,
      -2 * scale,
      -9 * scale,
      4 * scale
    );
    graphics.strokeTriangle(
      -14 * scale,
      -12 * scale,
      6 * scale,
      -2 * scale,
      -9 * scale,
      4 * scale
    );
    graphics.fillEllipse(3 * scale, 9 * scale, 28 * scale, 10 * scale);
    graphics.strokeEllipse(3 * scale, 9 * scale, 28 * scale, 10 * scale);
    graphics.fillCircle(12 * scale, -8 * scale, 3 * scale);
    return;
  }

  if (key === 'v2-wet-paint') {
    graphics.fillEllipse(0, 8 * scale, 31 * scale, 12 * scale);
    graphics.strokeEllipse(0, 8 * scale, 31 * scale, 12 * scale);
    graphics.beginPath();
    graphics.moveTo(0, -16 * scale);
    graphics.lineTo(9 * scale, -3 * scale);
    graphics.arc(0, -3 * scale, 9 * scale, 0, Math.PI, false);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.lineBetween(-9 * scale, 8 * scale, -3 * scale, 8 * scale);
    graphics.lineBetween(3 * scale, 8 * scale, 10 * scale, 8 * scale);
    return;
  }

  graphics.lineStyle(4 * scale, stroke, 1);
  graphics.beginPath();
  graphics.moveTo(-14 * scale, 0);
  graphics.arc(-7 * scale, 0, 7 * scale, Math.PI, 0, false);
  graphics.lineTo(7 * scale, 7 * scale);
  graphics.arc(7 * scale, 0, 7 * scale, Math.PI / 2, Math.PI * 1.5, true);
  graphics.lineTo(-7 * scale, -7 * scale);
  graphics.arc(-7 * scale, 0, 7 * scale, -Math.PI / 2, Math.PI / 2, false);
  graphics.lineTo(14 * scale, 0);
  graphics.strokePath();
  graphics.fillStyle(fill, 1);
  graphics.fillTriangle(
    12 * scale,
    -4 * scale,
    17 * scale,
    0,
    12 * scale,
    4 * scale
  );
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

  if (key === 'back') {
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.lineBetween(-12 * scale, 0, 13 * scale, 0);
    graphics.lineBetween(-12 * scale, 0, -2 * scale, -10 * scale);
    graphics.lineBetween(-12 * scale, 0, -2 * scale, 10 * scale);
    return;
  }

  if (key === 'clock') {
    graphics.fillCircle(0, 0, 13 * scale);
    graphics.strokeCircle(0, 0, 13 * scale);
    graphics.lineBetween(0, 0, 0, -7 * scale);
    graphics.lineBetween(0, 0, 6 * scale, 3 * scale);
    return;
  }

  if (key === 'eye') {
    graphics.fillEllipse(0, 0, 28 * scale, 18 * scale);
    graphics.strokeEllipse(0, 0, 28 * scale, 18 * scale);
    graphics.fillStyle(UI.creamHex, 1);
    graphics.fillCircle(0, 0, 6 * scale);
    graphics.strokeCircle(0, 0, 6 * scale);
    graphics.fillStyle(stroke, 1);
    graphics.fillCircle(0, 0, 2.5 * scale);
    return;
  }

  if (key === 'target') {
    graphics.fillCircle(0, 0, 13 * scale);
    graphics.strokeCircle(0, 0, 13 * scale);
    graphics.fillStyle(UI.creamHex, 1);
    graphics.fillCircle(0, 0, 8 * scale);
    graphics.strokeCircle(0, 0, 8 * scale);
    graphics.fillStyle(fill, 1);
    graphics.fillCircle(0, 0, 3.5 * scale);
    graphics.lineBetween(-16 * scale, 0, -10 * scale, 0);
    graphics.lineBetween(10 * scale, 0, 16 * scale, 0);
    graphics.lineBetween(0, -16 * scale, 0, -10 * scale);
    graphics.lineBetween(0, 10 * scale, 0, 16 * scale);
    return;
  }

  if (key === 'gun') {
    const barrel = [
      new Phaser.Math.Vector2(-14 * scale, -8 * scale),
      new Phaser.Math.Vector2(14 * scale, -8 * scale),
      new Phaser.Math.Vector2(14 * scale, 2 * scale),
      new Phaser.Math.Vector2(2 * scale, 2 * scale),
      new Phaser.Math.Vector2(-2 * scale, 7 * scale),
      new Phaser.Math.Vector2(-8 * scale, 7 * scale),
      new Phaser.Math.Vector2(-8 * scale, 2 * scale),
      new Phaser.Math.Vector2(-14 * scale, 2 * scale),
    ];
    const grip = [
      new Phaser.Math.Vector2(0, 2 * scale),
      new Phaser.Math.Vector2(10 * scale, 2 * scale),
      new Phaser.Math.Vector2(7 * scale, 14 * scale),
      new Phaser.Math.Vector2(-2 * scale, 14 * scale),
    ];
    graphics.fillPoints(barrel, true);
    graphics.strokePoints(barrel, true);
    graphics.fillPoints(grip, true);
    graphics.strokePoints(grip, true);
    graphics.fillStyle(UI.creamHex, 1);
    graphics.fillRoundedRect(
      5 * scale,
      -5 * scale,
      6 * scale,
      4 * scale,
      scale
    );
    graphics.strokeRoundedRect(
      5 * scale,
      -5 * scale,
      6 * scale,
      4 * scale,
      scale
    );
    return;
  }

  if (key === 'defeat') {
    const tornBanner = [
      new Phaser.Math.Vector2(-13 * scale, -12 * scale),
      new Phaser.Math.Vector2(13 * scale, -12 * scale),
      new Phaser.Math.Vector2(13 * scale, 9 * scale),
      new Phaser.Math.Vector2(6 * scale, 13 * scale),
      new Phaser.Math.Vector2(0, 9 * scale),
      new Phaser.Math.Vector2(-6 * scale, 13 * scale),
      new Phaser.Math.Vector2(-13 * scale, 9 * scale),
    ];
    graphics.fillPoints(tornBanner, true);
    graphics.strokePoints(tornBanner, true);
    graphics.lineBetween(-7 * scale, -6 * scale, 7 * scale, 7 * scale);
    graphics.lineBetween(7 * scale, -6 * scale, -7 * scale, 7 * scale);
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

  if (key === 'archive') {
    graphics.fillRoundedRect(
      -13 * scale,
      -3 * scale,
      26 * scale,
      16 * scale,
      3 * scale
    );
    graphics.strokeRoundedRect(
      -13 * scale,
      -3 * scale,
      26 * scale,
      16 * scale,
      3 * scale
    );
    graphics.fillRoundedRect(
      -15 * scale,
      -9 * scale,
      30 * scale,
      7 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -15 * scale,
      -9 * scale,
      30 * scale,
      7 * scale,
      2 * scale
    );
    graphics.lineBetween(-5 * scale, 3 * scale, 5 * scale, 3 * scale);
    graphics.lineBetween(0, -17 * scale, 0, -7 * scale);
    graphics.lineBetween(-4 * scale, -11 * scale, 0, -7 * scale);
    graphics.lineBetween(4 * scale, -11 * scale, 0, -7 * scale);
    return;
  }

  if (key === 'berry') {
    const berry = [
      new Phaser.Math.Vector2(-10 * scale, -5 * scale),
      new Phaser.Math.Vector2(-6 * scale, -10 * scale),
      new Phaser.Math.Vector2(0, -7 * scale),
      new Phaser.Math.Vector2(6 * scale, -10 * scale),
      new Phaser.Math.Vector2(10 * scale, -5 * scale),
      new Phaser.Math.Vector2(8 * scale, 6 * scale),
      new Phaser.Math.Vector2(0, 14 * scale),
      new Phaser.Math.Vector2(-8 * scale, 6 * scale),
    ];
    graphics.fillPoints(berry, true);
    graphics.strokePoints(berry, true);
    graphics.lineBetween(-8 * scale, -8 * scale, 0, -14 * scale);
    graphics.lineBetween(0, -14 * scale, 8 * scale, -8 * scale);
    graphics.strokeCircle(-4 * scale, 0, 1.3 * scale);
    graphics.strokeCircle(4 * scale, 1 * scale, 1.3 * scale);
    graphics.strokeCircle(0, 7 * scale, 1.3 * scale);
    return;
  }

  if (key === 'gift') {
    graphics.fillRoundedRect(
      -13 * scale,
      -4 * scale,
      26 * scale,
      17 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -13 * scale,
      -4 * scale,
      26 * scale,
      17 * scale,
      2 * scale
    );
    graphics.fillRoundedRect(
      -15 * scale,
      -10 * scale,
      30 * scale,
      7 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -15 * scale,
      -10 * scale,
      30 * scale,
      7 * scale,
      2 * scale
    );
    graphics.fillStyle(UI.creamHex, 0.9);
    graphics.fillRect(-3 * scale, -9 * scale, 6 * scale, 21 * scale);
    graphics.strokeRect(-3 * scale, -9 * scale, 6 * scale, 21 * scale);
    graphics.beginPath();
    graphics.arc(-6 * scale, -12 * scale, 6 * scale, -0.2, Math.PI, true);
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(6 * scale, -12 * scale, 6 * scale, 0, Math.PI + 0.2, false);
    graphics.strokePath();
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

  if (key === 'pencil') {
    graphics.fillPoints(
      [
        new Phaser.Math.Vector2(-12 * scale, 8 * scale),
        new Phaser.Math.Vector2(7 * scale, -11 * scale),
        new Phaser.Math.Vector2(13 * scale, -5 * scale),
        new Phaser.Math.Vector2(-6 * scale, 14 * scale),
      ],
      true
    );
    graphics.strokePoints(
      [
        new Phaser.Math.Vector2(-12 * scale, 8 * scale),
        new Phaser.Math.Vector2(7 * scale, -11 * scale),
        new Phaser.Math.Vector2(13 * scale, -5 * scale),
        new Phaser.Math.Vector2(-6 * scale, 14 * scale),
      ],
      true
    );
    graphics.lineBetween(7 * scale, -11 * scale, 13 * scale, -5 * scale);
    graphics.lineBetween(-12 * scale, 8 * scale, -15 * scale, 15 * scale);
    graphics.lineBetween(-15 * scale, 15 * scale, -6 * scale, 14 * scale);
    return;
  }

  if (key === 'shield') {
    const shield = [
      new Phaser.Math.Vector2(0, -14 * scale),
      new Phaser.Math.Vector2(12 * scale, -9 * scale),
      new Phaser.Math.Vector2(10 * scale, 5 * scale),
      new Phaser.Math.Vector2(0, 14 * scale),
      new Phaser.Math.Vector2(-10 * scale, 5 * scale),
      new Phaser.Math.Vector2(-12 * scale, -9 * scale),
    ];
    graphics.fillPoints(shield, true);
    graphics.strokePoints(shield, true);
    graphics.lineBetween(0, -10 * scale, 0, 10 * scale);
    graphics.lineBetween(-7 * scale, -5 * scale, 7 * scale, -5 * scale);
    return;
  }

  if (key === 'armor') {
    const armor = [
      new Phaser.Math.Vector2(-14 * scale, -9 * scale),
      new Phaser.Math.Vector2(-6 * scale, -14 * scale),
      new Phaser.Math.Vector2(0, -8 * scale),
      new Phaser.Math.Vector2(6 * scale, -14 * scale),
      new Phaser.Math.Vector2(14 * scale, -9 * scale),
      new Phaser.Math.Vector2(10 * scale, 13 * scale),
      new Phaser.Math.Vector2(-10 * scale, 13 * scale),
    ];
    graphics.fillPoints(armor, true);
    graphics.strokePoints(armor, true);
    graphics.lineBetween(-8 * scale, -6 * scale, 8 * scale, -6 * scale);
    graphics.lineBetween(0, -7 * scale, 0, 11 * scale);
    graphics.lineBetween(-9 * scale, 6 * scale, 9 * scale, 6 * scale);
    return;
  }

  if (key === 'boots') {
    const boot = [
      new Phaser.Math.Vector2(-9 * scale, -14 * scale),
      new Phaser.Math.Vector2(4 * scale, -14 * scale),
      new Phaser.Math.Vector2(3 * scale, 3 * scale),
      new Phaser.Math.Vector2(13 * scale, 7 * scale),
      new Phaser.Math.Vector2(13 * scale, 13 * scale),
      new Phaser.Math.Vector2(-10 * scale, 13 * scale),
      new Phaser.Math.Vector2(-10 * scale, 4 * scale),
      new Phaser.Math.Vector2(-7 * scale, 2 * scale),
    ];
    graphics.fillPoints(boot, true);
    graphics.strokePoints(boot, true);
    graphics.lineBetween(-8 * scale, -7 * scale, 3 * scale, -7 * scale);
    graphics.lineBetween(-9 * scale, 8 * scale, 11 * scale, 8 * scale);
    return;
  }

  if (key === 'trash') {
    graphics.fillRoundedRect(
      -9 * scale,
      -7 * scale,
      18 * scale,
      20 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -9 * scale,
      -7 * scale,
      18 * scale,
      20 * scale,
      2 * scale
    );
    graphics.lineBetween(-12 * scale, -9 * scale, 12 * scale, -9 * scale);
    graphics.lineBetween(-5 * scale, -13 * scale, 5 * scale, -13 * scale);
    graphics.lineBetween(-4 * scale, -3 * scale, -4 * scale, 8 * scale);
    graphics.lineBetween(4 * scale, -3 * scale, 4 * scale, 8 * scale);
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
    graphics.fillStyle(stroke, 1);
    graphics.fillCircle(0, -7 * scale, 2.2 * scale);
    graphics.fillRoundedRect(
      -2 * scale,
      -2 * scale,
      4 * scale,
      11 * scale,
      2 * scale
    );
    return;
  }

  if (key === 'settings') {
    const teeth: Phaser.Math.Vector2[] = [];
    for (let tooth = 0; tooth < 16; tooth += 1) {
      const radius = (tooth % 2 === 0 ? 14 : 11) * scale;
      const angle = -Math.PI / 2 + (tooth * Math.PI) / 8;
      teeth.push(
        new Phaser.Math.Vector2(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius
        )
      );
    }
    graphics.fillPoints(teeth, true);
    graphics.strokePoints(teeth, true);
    graphics.fillStyle(UI.creamHex, 1);
    graphics.fillCircle(0, 0, 6 * scale);
    graphics.strokeCircle(0, 0, 6 * scale);
    return;
  }

  if (key === 'paw') {
    graphics.fillEllipse(0, 6 * scale, 19 * scale, 17 * scale);
    graphics.strokeEllipse(0, 6 * scale, 19 * scale, 17 * scale);
    [
      [-8, -5, 4.4],
      [-3, -10, 4.7],
      [3, -10, 4.7],
      [8, -5, 4.4],
    ].forEach(([fingerX, fingerY, radius]) => {
      graphics.fillCircle(
        (fingerX ?? 0) * scale,
        (fingerY ?? 0) * scale,
        (radius ?? 4) * scale
      );
      graphics.strokeCircle(
        (fingerX ?? 0) * scale,
        (fingerY ?? 0) * scale,
        (radius ?? 4) * scale
      );
    });
    return;
  }

  if (key === 'replay') {
    graphics.beginPath();
    graphics.arc(1 * scale, 1 * scale, 11 * scale, -2.45, 1.65, false);
    graphics.strokePath();
    graphics.fillTriangle(
      -14 * scale,
      -5 * scale,
      -3 * scale,
      -12 * scale,
      -4 * scale,
      1 * scale
    );
    graphics.fillTriangle(
      -3 * scale,
      -6 * scale,
      -3 * scale,
      7 * scale,
      8 * scale,
      1 * scale
    );
    return;
  }

  if (key === 'resize') {
    graphics.lineBetween(-11 * scale, 11 * scale, 11 * scale, -11 * scale);
    graphics.lineBetween(-11 * scale, 11 * scale, -11 * scale, 3 * scale);
    graphics.lineBetween(-11 * scale, 11 * scale, -3 * scale, 11 * scale);
    graphics.lineBetween(11 * scale, -11 * scale, 11 * scale, -3 * scale);
    graphics.lineBetween(11 * scale, -11 * scale, 3 * scale, -11 * scale);
    return;
  }

  if (key === 'forge') {
    const anvilTop = [
      new Phaser.Math.Vector2(-15 * scale, -2 * scale),
      new Phaser.Math.Vector2(8 * scale, -2 * scale),
      new Phaser.Math.Vector2(15 * scale, -7 * scale),
      new Phaser.Math.Vector2(15 * scale, -11 * scale),
      new Phaser.Math.Vector2(-10 * scale, -11 * scale),
      new Phaser.Math.Vector2(-15 * scale, -7 * scale),
    ];
    graphics.fillPoints(anvilTop, true);
    graphics.strokePoints(anvilTop, true);
    graphics.fillPoints(
      [
        new Phaser.Math.Vector2(-5 * scale, -2 * scale),
        new Phaser.Math.Vector2(6 * scale, -2 * scale),
        new Phaser.Math.Vector2(4 * scale, 8 * scale),
        new Phaser.Math.Vector2(11 * scale, 13 * scale),
        new Phaser.Math.Vector2(-10 * scale, 13 * scale),
        new Phaser.Math.Vector2(-3 * scale, 8 * scale),
      ],
      true
    );
    graphics.strokePoints(
      [
        new Phaser.Math.Vector2(-5 * scale, -2 * scale),
        new Phaser.Math.Vector2(6 * scale, -2 * scale),
        new Phaser.Math.Vector2(4 * scale, 8 * scale),
        new Phaser.Math.Vector2(11 * scale, 13 * scale),
        new Phaser.Math.Vector2(-10 * scale, 13 * scale),
        new Phaser.Math.Vector2(-3 * scale, 8 * scale),
      ],
      true
    );
    graphics.lineStyle(4 * scale, stroke, 1);
    graphics.lineBetween(-11 * scale, -14 * scale, 8 * scale, 8 * scale);
    graphics.fillRoundedRect(
      -15 * scale,
      -17 * scale,
      13 * scale,
      8 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -15 * scale,
      -17 * scale,
      13 * scale,
      8 * scale,
      2 * scale
    );
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

  if (key === 'train') {
    graphics.fillRoundedRect(
      -15 * scale,
      -8 * scale,
      7 * scale,
      16 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      -15 * scale,
      -8 * scale,
      7 * scale,
      16 * scale,
      2 * scale
    );
    graphics.fillRoundedRect(
      8 * scale,
      -8 * scale,
      7 * scale,
      16 * scale,
      2 * scale
    );
    graphics.strokeRoundedRect(
      8 * scale,
      -8 * scale,
      7 * scale,
      16 * scale,
      2 * scale
    );
    graphics.fillRect(-8 * scale, -3 * scale, 16 * scale, 6 * scale);
    graphics.strokeRect(-8 * scale, -3 * scale, 16 * scale, 6 * scale);
    return;
  }

  if (key === 'trophy') {
    graphics.fillRoundedRect(
      -10 * scale,
      -13 * scale,
      20 * scale,
      18 * scale,
      3 * scale
    );
    graphics.strokeRoundedRect(
      -10 * scale,
      -13 * scale,
      20 * scale,
      18 * scale,
      3 * scale
    );
    graphics.beginPath();
    graphics.arc(
      -10 * scale,
      -6 * scale,
      8 * scale,
      Math.PI / 2,
      Math.PI * 1.5
    );
    graphics.strokePath();
    graphics.beginPath();
    graphics.arc(10 * scale, -6 * scale, 8 * scale, -Math.PI / 2, Math.PI / 2);
    graphics.strokePath();
    graphics.lineBetween(0, 5 * scale, 0, 12 * scale);
    graphics.lineBetween(-8 * scale, 13 * scale, 8 * scale, 13 * scale);
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
