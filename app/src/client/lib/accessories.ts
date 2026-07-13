// Accessory doodles — the vector art for every Mystery Ink accessory catalog id.
// Each accessory is drawn as a charming wobbly-ink doodle, NOT an image asset,
// so it renders two ways from ONE definition:
//   • drawAccessoryGraphics — into a Phaser Graphics (the sticker drawer preview
//     + the on-canvas draggable sticker in the Draw scene).
//   • drawAccessoryCanvas — into a 2D canvas context (baked into the exported
//     512x512 PNG at submit so the accessory is welded into the drawing).
//
// The catalog ids MUST match the server/mock accessory catalog. A doodle is
// authored in a local 100x100 unit box centered on (50,50); both renderers scale
// that box to the requested size, so placement math stays identical everywhere.

import type * as Phaser from 'phaser';
import {
  ACCESSORY_CATALOG_ENTRIES,
  findAccessoryCosmetic,
} from '../../shared/cosmetics';
import { SHAPE_POWER_RELIC_PAINT_BY_ID } from './shapepowerrelicart';

const INK = '#2b2016';
const INK_HEX = 0x2b2016;

// The authored unit box each doodle draws inside.
export const ACCESSORY_UNIT = 100;

// A minimal drawing surface both renderers implement, so a single doodle
// function paints to either a Phaser Graphics or a 2D canvas context.
export type DoodlePen = {
  stroke: (width: number, color: string) => void;
  fill: (color: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  poly: (
    points: Array<[number, number]>,
    close: boolean,
    filled: boolean
  ) => void;
  circle: (x: number, y: number, r: number, filled: boolean) => void;
  arc: (x: number, y: number, r: number, from: number, to: number) => void;
};

type AccessoryPaintDefinition = { paint: (pen: DoodlePen) => void };
type AccessoryDef = AccessoryPaintDefinition & { label: string };

// Convenience: a wobbly-ink outline color + weight used by most pieces.
function outline(pen: DoodlePen, weight = 5): void {
  pen.stroke(weight, INK);
}

const ACCESSORY_PAINT_BY_ID: Record<string, AccessoryPaintDefinition> = {
  bowtie: {
    paint: (pen) => {
      pen.fill('#ff6b4a');
      outline(pen);
      pen.poly(
        [
          [50, 50],
          [18, 32],
          [18, 68],
        ],
        true,
        true
      );
      pen.poly(
        [
          [50, 50],
          [82, 32],
          [82, 68],
        ],
        true,
        true
      );
      pen.fill('#e0512f');
      pen.circle(50, 50, 9, true);
      outline(pen);
      pen.circle(50, 50, 9, false);
    },
  },
  'flower-crown': {
    paint: (pen) => {
      const petals: Array<[number, number, string]> = [
        [22, 40, '#ff8fae'],
        [40, 30, '#ffd447'],
        [60, 30, '#8fd8ef'],
        [78, 40, '#a8dd8f'],
      ];
      pen.stroke(4, INK);
      petals.forEach(([x, y, color]) => {
        pen.fill(color);
        for (let index = 0; index < 5; index += 1) {
          const angle = (Math.PI * 2 * index) / 5;
          pen.circle(x + Math.cos(angle) * 7, y + Math.sin(angle) * 7, 5, true);
        }
        pen.fill('#fff3c0');
        pen.circle(x, y, 4, true);
      });
    },
  },
  monocle: {
    paint: (pen) => {
      pen.stroke(5, INK);
      pen.circle(45, 45, 22, false);
      pen.fill('#bfe3f2');
      pen.circle(45, 45, 19, true);
      pen.stroke(5, INK);
      pen.circle(45, 45, 19, false);
      pen.line(64, 60, 70, 92);
    },
  },
  beanie: {
    paint: (pen) => {
      pen.fill('#4faa4f');
      pen.arc(50, 56, 34, Math.PI, Math.PI * 2);
      outline(pen);
      pen.arc(50, 56, 34, Math.PI, Math.PI * 2);
      pen.fill('#3a7f3a');
      pen.poly(
        [
          [16, 56],
          [84, 56],
          [84, 66],
          [16, 66],
        ],
        true,
        true
      );
      pen.fill('#ffd447');
      pen.circle(50, 22, 8, true);
      outline(pen, 4);
      pen.circle(50, 22, 8, false);
    },
  },
  'round-glasses': {
    paint: (pen) => {
      pen.stroke(5, INK);
      pen.fill('#bfe3f2');
      pen.circle(32, 50, 18, true);
      pen.circle(68, 50, 18, true);
      pen.stroke(5, INK);
      pen.circle(32, 50, 18, false);
      pen.circle(68, 50, 18, false);
      pen.line(50, 50, 50, 50);
      pen.line(46, 48, 54, 48);
    },
  },
  'tiny-sword': {
    paint: (pen) => {
      pen.fill('#d8dde6');
      pen.poly(
        [
          [50, 8],
          [56, 20],
          [56, 64],
          [44, 64],
          [44, 20],
        ],
        true,
        true
      );
      outline(pen, 4);
      pen.poly(
        [
          [50, 8],
          [56, 20],
          [56, 64],
          [44, 64],
          [44, 20],
        ],
        true,
        false
      );
      pen.fill('#ffd447');
      pen.poly(
        [
          [32, 64],
          [68, 64],
          [68, 72],
          [32, 72],
        ],
        true,
        true
      );
      outline(pen, 4);
      pen.fill('#8a5a2b');
      pen.poly(
        [
          [45, 72],
          [55, 72],
          [55, 92],
          [45, 92],
        ],
        true,
        true
      );
      outline(pen, 4);
    },
  },
  'snail-shell-backpack': {
    paint: (pen) => {
      pen.fill('#ff9a5a');
      pen.circle(50, 50, 34, true);
      pen.stroke(5, INK);
      pen.circle(50, 50, 34, false);
      pen.stroke(4, INK);
      // Inward spiral.
      let radius = 30;
      let angle = 0;
      let px = 50 + radius;
      let py = 50;
      for (let step = 0; step < 22; step += 1) {
        angle += 0.6;
        radius -= 1.2;
        const nx = 50 + Math.cos(angle) * radius;
        const ny = 50 + Math.sin(angle) * radius;
        pen.line(px, py, nx, ny);
        px = nx;
        py = ny;
      }
    },
  },
  'party-hat': {
    paint: (pen) => {
      pen.fill('#8a5cd8');
      pen.poly(
        [
          [50, 10],
          [26, 78],
          [74, 78],
        ],
        true,
        true
      );
      outline(pen);
      pen.poly(
        [
          [50, 10],
          [26, 78],
          [74, 78],
        ],
        true,
        false
      );
      pen.fill('#ffd447');
      pen.circle(50, 12, 7, true);
      outline(pen, 4);
      pen.circle(50, 12, 7, false);
      pen.fill('#ff6b4a');
      pen.circle(40, 44, 5, true);
      pen.fill('#4faa4f');
      pen.circle(58, 34, 5, true);
      pen.fill('#8fd8ef');
      pen.circle(56, 60, 5, true);
    },
  },
  mustache: {
    paint: (pen) => {
      pen.fill(INK);
      pen.poly(
        [
          [50, 46],
          [30, 40],
          [14, 46],
          [22, 58],
          [40, 54],
          [50, 58],
          [60, 54],
          [78, 58],
          [86, 46],
          [70, 40],
        ],
        true,
        true
      );
    },
  },
  'top-hat': {
    paint: (pen) => {
      pen.fill(INK);
      pen.poly(
        [
          [30, 16],
          [70, 16],
          [70, 60],
          [30, 60],
        ],
        true,
        true
      );
      pen.poly(
        [
          [14, 60],
          [86, 60],
          [86, 70],
          [14, 70],
        ],
        true,
        true
      );
      pen.stroke(5, '#e0512f');
      pen.line(30, 52, 70, 52);
    },
  },
  cape: {
    paint: (pen) => {
      pen.fill('#8a1f3d');
      pen.poly(
        [
          [28, 18],
          [72, 18],
          [86, 88],
          [50, 78],
          [14, 88],
        ],
        true,
        true
      );
      outline(pen);
      pen.poly(
        [
          [28, 18],
          [72, 18],
          [86, 88],
          [50, 78],
          [14, 88],
        ],
        true,
        false
      );
      pen.fill('#ffd447');
      pen.circle(36, 22, 6, true);
      pen.circle(64, 22, 6, true);
      pen.stroke(4, INK);
      pen.line(36, 22, 64, 22);
    },
  },
  headphones: {
    paint: (pen) => {
      pen.stroke(7, INK);
      pen.arc(50, 50, 34, Math.PI, Math.PI * 2);
      pen.fill('#ff6b4a');
      pen.poly(
        [
          [10, 46],
          [26, 46],
          [26, 74],
          [10, 74],
        ],
        true,
        true
      );
      pen.poly(
        [
          [74, 46],
          [90, 46],
          [90, 74],
          [74, 74],
        ],
        true,
        true
      );
      outline(pen, 4);
      pen.poly(
        [
          [10, 46],
          [26, 46],
          [26, 74],
          [10, 74],
        ],
        true,
        false
      );
      pen.poly(
        [
          [74, 46],
          [90, 46],
          [90, 74],
          [74, 74],
        ],
        true,
        false
      );
    },
  },
  'eyepatch-scar': {
    paint: (pen) => {
      pen.fill(INK);
      pen.poly(
        [
          [30, 34],
          [70, 34],
          [66, 64],
          [34, 64],
        ],
        true,
        true
      );
      pen.stroke(4, INK);
      pen.line(20, 30, 80, 40);
      // A little scar mark.
      pen.stroke(4, '#e0512f');
      pen.line(74, 26, 82, 46);
      pen.line(72, 34, 84, 36);
    },
  },
  'propeller-cap': {
    paint: (pen) => {
      pen.fill('#3ba0e0');
      pen.arc(50, 60, 30, Math.PI, Math.PI * 2);
      outline(pen);
      pen.arc(50, 60, 30, Math.PI, Math.PI * 2);
      pen.fill('#ffd447');
      pen.poly(
        [
          [20, 60],
          [80, 60],
          [80, 68],
          [20, 68],
        ],
        true,
        true
      );
      pen.stroke(5, INK);
      pen.line(50, 30, 50, 16);
      pen.fill('#ff6b4a');
      pen.poly(
        [
          [50, 16],
          [24, 10],
          [50, 20],
        ],
        true,
        true
      );
      pen.fill('#4faa4f');
      pen.poly(
        [
          [50, 16],
          [76, 10],
          [50, 20],
        ],
        true,
        true
      );
      pen.fill(INK);
      pen.circle(50, 16, 4, true);
    },
  },
  'golden-crown': {
    paint: (pen) => {
      pen.fill('#ffd447');
      pen.poly(
        [
          [18, 72],
          [18, 40],
          [34, 56],
          [50, 30],
          [66, 56],
          [82, 40],
          [82, 72],
        ],
        true,
        true
      );
      outline(pen);
      pen.poly(
        [
          [18, 72],
          [18, 40],
          [34, 56],
          [50, 30],
          [66, 56],
          [82, 40],
          [82, 72],
        ],
        true,
        false
      );
      const gems: Array<[number, string]> = [
        [26, '#ff6b4a'],
        [50, '#3ba0e0'],
        [74, '#4faa4f'],
      ];
      gems.forEach(([x, color]) => {
        pen.fill(color);
        pen.circle(x, 66, 4, true);
      });
    },
  },
  'dragon-wings': {
    paint: (pen) => {
      pen.fill('#8a5cd8');
      // Left wing.
      pen.poly(
        [
          [50, 50],
          [8, 24],
          [16, 48],
          [4, 56],
          [22, 62],
          [50, 70],
        ],
        true,
        true
      );
      // Right wing.
      pen.poly(
        [
          [50, 50],
          [92, 24],
          [84, 48],
          [96, 56],
          [78, 62],
          [50, 70],
        ],
        true,
        true
      );
      pen.stroke(4, INK);
      pen.poly(
        [
          [50, 50],
          [8, 24],
          [16, 48],
          [4, 56],
          [22, 62],
          [50, 70],
        ],
        true,
        false
      );
      pen.poly(
        [
          [50, 50],
          [92, 24],
          [84, 48],
          [96, 56],
          [78, 62],
          [50, 70],
        ],
        true,
        false
      );
      pen.line(50, 52, 20, 34);
      pen.line(50, 58, 18, 52);
      pen.line(50, 52, 80, 34);
      pen.line(50, 58, 82, 52);
    },
  },
  'comet-crayon-blade': {
    paint: (pen) => {
      pen.stroke(4, '#ff8a3d');
      pen.line(7, 82, 26, 65);
      pen.stroke(3, '#ffd447');
      pen.line(7, 70, 25, 58);

      pen.fill('#ff6b4a');
      pen.poly(
        [
          [21, 73],
          [67, 13],
          [78, 7],
          [74, 20],
          [35, 79],
        ],
        true,
        true
      );
      outline(pen, 5);
      pen.poly(
        [
          [21, 73],
          [67, 13],
          [78, 7],
          [74, 20],
          [35, 79],
        ],
        true,
        false
      );
      pen.fill('#ffd447');
      pen.poly(
        [
          [17, 67],
          [42, 85],
          [36, 93],
          [11, 75],
        ],
        true,
        true
      );
      outline(pen, 4);
      pen.fill('#8a5cd8');
      pen.circle(27, 80, 5, true);
      outline(pen, 3);
      pen.circle(27, 80, 5, false);
      pen.stroke(3, '#fff0b0');
      pen.line(38, 68, 69, 23);
    },
  },
  'rocket-eraser-boots': {
    paint: (pen) => {
      const boot = (offsetX: number, color: string): void => {
        pen.fill(color);
        pen.poly(
          [
            [offsetX, 22],
            [offsetX + 25, 22],
            [offsetX + 28, 55],
            [offsetX + 38, 64],
            [offsetX + 36, 76],
            [offsetX - 2, 76],
          ],
          true,
          true
        );
        outline(pen, 4);
        pen.poly(
          [
            [offsetX, 22],
            [offsetX + 25, 22],
            [offsetX + 28, 55],
            [offsetX + 38, 64],
            [offsetX + 36, 76],
            [offsetX - 2, 76],
          ],
          true,
          false
        );
        pen.fill('#fff0c2');
        pen.poly(
          [
            [offsetX + 4, 27],
            [offsetX + 21, 27],
            [offsetX + 22, 40],
            [offsetX + 3, 40],
          ],
          true,
          true
        );
        pen.fill('#ffd447');
        pen.poly(
          [
            [offsetX + 4, 78],
            [offsetX + 13, 94],
            [offsetX + 20, 78],
          ],
          true,
          true
        );
      };
      boot(12, '#ff6b4a');
      boot(52, '#4f9fcb');
      pen.stroke(3, '#ff9a3d');
      pen.line(20, 80, 25, 92);
      pen.line(60, 80, 65, 92);
    },
  },
  ...SHAPE_POWER_RELIC_PAINT_BY_ID,
};

const buildAccessoryCatalog = (): Record<string, AccessoryDef> => {
  const catalog: Record<string, AccessoryDef> = {};

  for (const metadata of ACCESSORY_CATALOG_ENTRIES) {
    const paintDefinition = ACCESSORY_PAINT_BY_ID[metadata.id];
    if (paintDefinition) {
      catalog[metadata.id] = {
        label: metadata.label,
        paint: paintDefinition.paint,
      };
    }
  }

  return catalog;
};

// Backward-compatible client catalog: shared labels joined to client-only paint.
export const ACCESSORY_CATALOG: Record<string, AccessoryDef> =
  buildAccessoryCatalog();

export function accessoryLabel(id: string): string {
  return findAccessoryCosmetic(id)?.label ?? id;
}

export function isKnownAccessory(id: string): boolean {
  return findAccessoryCosmetic(id) !== undefined;
}

// --- Phaser Graphics renderer ----------------------------------------------
// Paint an accessory into a Phaser Graphics, scaled so its 100-unit box maps to
// `size` px, centered on the Graphics origin (the doodle is authored around
// (50,50), so we translate by -size/2 in unit space).
export function drawAccessoryGraphics(
  graphics: Phaser.GameObjects.Graphics,
  id: string,
  size: number
): void {
  const def = ACCESSORY_CATALOG[id];
  if (!def) return;
  const k = size / ACCESSORY_UNIT;
  const tx = (x: number): number => (x - ACCESSORY_UNIT / 2) * k;
  const ty = (y: number): number => (y - ACCESSORY_UNIT / 2) * k;

  let strokeWidth = 4;
  let strokeColor = INK_HEX;
  const pen: DoodlePen = {
    stroke: (width, color) => {
      strokeWidth = width * k;
      strokeColor = hexToInt(color);
      graphics.lineStyle(strokeWidth, strokeColor, 1);
    },
    fill: (color) => graphics.fillStyle(hexToInt(color), 1),
    line: (x1, y1, x2, y2) => {
      graphics.lineStyle(strokeWidth, strokeColor, 1);
      graphics.beginPath();
      graphics.moveTo(tx(x1), ty(y1));
      graphics.lineTo(tx(x2), ty(y2));
      graphics.strokePath();
    },
    poly: (points, close, filled) => {
      const vecs = points.map(([x, y]) => ({
        x: tx(x),
        y: ty(y),
      })) as Phaser.Math.Vector2[];
      if (filled) graphics.fillPoints(vecs, close);
      else graphics.strokePoints(vecs, close);
    },
    circle: (x, y, r, filled) => {
      if (filled) graphics.fillCircle(tx(x), ty(y), r * k);
      else graphics.strokeCircle(tx(x), ty(y), r * k);
    },
    arc: (x, y, r, from, to) => {
      graphics.beginPath();
      graphics.arc(tx(x), ty(y), r * k, from, to, false);
      graphics.fillPath();
    },
  };
  def.paint(pen);
}

// --- 2D canvas renderer -----------------------------------------------------
// Paint an accessory into a canvas 2D context at (cx, cy) with rotation and a
// scale where `size` px is the box edge. Used to bake the sticker into the
// exported PNG so the accessory is permanently part of the drawing.
export function drawAccessoryCanvas(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  cy: number,
  size: number,
  rotation: number
): void {
  const def = ACCESSORY_CATALOG[id];
  if (!def) return;
  const k = size / ACCESSORY_UNIT;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const tx = (x: number): number => (x - ACCESSORY_UNIT / 2) * k;
  const ty = (y: number): number => (y - ACCESSORY_UNIT / 2) * k;

  const pen: DoodlePen = {
    stroke: (width, color) => {
      ctx.lineWidth = width * k;
      ctx.strokeStyle = color;
    },
    fill: (color) => {
      ctx.fillStyle = color;
    },
    line: (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(tx(x1), ty(y1));
      ctx.lineTo(tx(x2), ty(y2));
      ctx.stroke();
    },
    poly: (points, close, filled) => {
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(tx(x), ty(y));
        else ctx.lineTo(tx(x), ty(y));
      });
      if (close) ctx.closePath();
      if (filled) ctx.fill();
      else ctx.stroke();
    },
    circle: (x, y, r, filled) => {
      ctx.beginPath();
      ctx.arc(tx(x), ty(y), r * k, 0, Math.PI * 2);
      if (filled) ctx.fill();
      else ctx.stroke();
    },
    arc: (x, y, r, from, to) => {
      ctx.beginPath();
      ctx.arc(tx(x), ty(y), r * k, from, to, false);
      ctx.fill();
    },
  };
  def.paint(pen);
  ctx.restore();
}

function hexToInt(color: string): number {
  if (color.startsWith('#')) return parseInt(color.slice(1), 16);
  return INK_HEX;
}
