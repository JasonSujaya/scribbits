import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import { ELEMENT_STYLES, UI } from './theme';

export type PaperIconKey =
  | 'armor'
  | 'back'
  | 'berry'
  | 'book'
  | 'boots'
  | 'clock'
  | 'defeat'
  | 'forge'
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
  | 'sword'
  | 'target'
  | 'train'
  | 'trash'
  | 'trophy';
export type PaperToolIconKey = 'sticker' | 'eraser' | 'clear' | 'undo' | 'redo';
export type PaperDockIconKey =
  | 'arena'
  | 'gallery'
  | 'draw'
  | 'battles'
  | 'scout';

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

  if (key === 'arena' && accented) {
    graphics.fillStyle(UI.gold, 1);
    drawFivePointStar(graphics, 0, 0, 17 * scale, 8 * scale, true);
    graphics.lineStyle(3 * scale, color, 1);
    drawFivePointStar(graphics, 0, 0, 17 * scale, 8 * scale, false);
  } else if (key === 'gallery' && accented) {
    const leftPage = [
      new Phaser.Math.Vector2(-18 * scale, -14 * scale),
      new Phaser.Math.Vector2(-2 * scale, -11 * scale),
      new Phaser.Math.Vector2(-2 * scale, 17 * scale),
      new Phaser.Math.Vector2(-18 * scale, 13 * scale),
    ];
    const rightPage = [
      new Phaser.Math.Vector2(2 * scale, -11 * scale),
      new Phaser.Math.Vector2(18 * scale, -14 * scale),
      new Phaser.Math.Vector2(18 * scale, 13 * scale),
      new Phaser.Math.Vector2(2 * scale, 17 * scale),
    ];
    graphics.fillStyle(UI.tapeAlt, 0.72);
    graphics.fillPoints(leftPage, true);
    graphics.fillPoints(rightPage, true);
    graphics.lineStyle(3 * scale, color, 1);
    graphics.strokePoints(leftPage, true);
    graphics.strokePoints(rightPage, true);
    graphics.fillStyle(0x8fcf72, 1);
    graphics.fillCircle(8 * scale, 2 * scale, 4 * scale);
    graphics.lineBetween(-14 * scale, -5 * scale, -6 * scale, -3 * scale);
    graphics.lineBetween(-14 * scale, 2 * scale, -6 * scale, 4 * scale);
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
    graphics.fillStyle(0xd8ad78, 1);
    drawDockSword(graphics, scale, false, true);
    graphics.fillStyle(0xbfd8e0, 1);
    drawDockSword(graphics, scale, true, true);
  } else if (key === 'scout' && accented) {
    graphics.fillStyle(UI.gold, 0.18);
    graphics.fillCircle(-4 * scale, -4 * scale, 13 * scale);
    graphics.lineStyle(3 * scale, color, 1);
    graphics.strokeCircle(-4 * scale, -4 * scale, 13 * scale);
    graphics.lineBetween(7 * scale, 7 * scale, 18 * scale, 18 * scale);
    graphics.fillStyle(UI.gold, 1);
    graphics.fillCircle(-4 * scale, -4 * scale, 3.5 * scale);
    graphics.fillStyle(0x5fa85c, 1);
    graphics.fillEllipse(17 * scale, 14 * scale, 7 * scale, 4 * scale);
  } else if (key === 'arena') {
    graphics.strokeCircle(0, 0, 18 * scale);
    drawFivePointStar(graphics, 0, 0, 10 * scale, 4.5 * scale, false);
  } else if (key === 'gallery') {
    graphics.strokeRoundedRect(
      -18 * scale,
      -16 * scale,
      36 * scale,
      32 * scale,
      4 * scale
    );
    graphics.lineBetween(-18 * scale, -4 * scale, 18 * scale, -4 * scale);
    graphics.lineBetween(0, -16 * scale, 0, 16 * scale);
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
    drawDockSword(graphics, scale, false);
    drawDockSword(graphics, scale, true);
  } else {
    graphics.strokeCircle(-4 * scale, -4 * scale, 13 * scale);
    graphics.lineBetween(6 * scale, 6 * scale, 17 * scale, 17 * scale);
    graphics.fillCircle(-4 * scale, -4 * scale, 2 * scale);
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

function drawDockSword(
  graphics: Phaser.GameObjects.Graphics,
  scale: number,
  mirrored: boolean,
  fillBlade = false
): void {
  const direction = mirrored ? -1 : 1;
  const blade = [
    new Phaser.Math.Vector2(-11 * direction * scale, 13 * scale),
    new Phaser.Math.Vector2(10 * direction * scale, -8 * scale),
    new Phaser.Math.Vector2(18 * direction * scale, -18 * scale),
    new Phaser.Math.Vector2(14 * direction * scale, -5 * scale),
  ];
  if (fillBlade) graphics.fillPoints(blade, true);
  graphics.strokePoints(blade, true);
  graphics.fillTriangle(
    11 * direction * scale,
    -9 * scale,
    18 * direction * scale,
    -18 * scale,
    15 * direction * scale,
    -5 * scale
  );
  graphics.lineBetween(
    -17 * direction * scale,
    8 * scale,
    -7 * direction * scale,
    18 * scale
  );
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
  if (key !== 'undo' && key !== 'redo') {
    drawTool(backing, key, scale, 0x9b754d, 0x9b754d);
  }
  const faceFill =
    key === 'eraser' ? UI.coral : key === 'clear' ? UI.tapeAlt : UI.creamHex;
  drawTool(face, key, scale, faceFill, UI.inkHex);
  if (key === 'redo') face.setScale(-1, 1);
  container.add(key === 'undo' || key === 'redo' ? [face] : [backing, face]);
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
    graphics.lineBetween(0, -1 * scale, 0, 8 * scale);
    graphics.fillCircle(0, -7 * scale, 1.8 * scale);
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
