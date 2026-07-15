import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { BattleArenaId } from '../../shared/battlearena';
import { UI } from './theme';

export type BattleArenaPaint = Readonly<{
  background: number;
  floor: number;
  accent: number;
  detail: number;
  ink: number;
}>;

const BATTLE_ARENA_PAINTS: Readonly<Record<BattleArenaId, BattleArenaPaint>> =
  Object.freeze({
    'v1-sticker-stadium': {
      background: 0xf29a3d,
      floor: 0xf6c344,
      accent: 0xff6f61,
      detail: 0xfff4d6,
      ink: 0x5b2b1b,
    },
    'v1-ink-playground': {
      background: 0xff8b75,
      floor: 0xfff0c9,
      accent: 0x16a6bf,
      detail: 0xf5c542,
      ink: 0x24334a,
    },
    'v1-element-clash': {
      background: 0x2f74d8,
      floor: 0xffe7b8,
      accent: 0xef5f5f,
      detail: 0x53c7d2,
      ink: 0x1e2941,
    },
    'v1-chalkboard-court': {
      background: 0x087b72,
      floor: 0x0b8e83,
      accent: 0xff7967,
      detail: 0xc3f3d8,
      ink: 0x173b3b,
    },
    'v1-garden-patch': {
      background: 0xa8df32,
      floor: 0xcdf052,
      accent: 0xf0588b,
      detail: 0x1c9c62,
      ink: 0x205739,
    },
    'v1-neon-arcade': {
      background: 0x241043,
      floor: 0x33145a,
      accent: 0x1dc6e5,
      detail: 0xff4f8b,
      ink: 0xf8e7b5,
    },
    'v1-candy-gym': {
      background: 0x77d4d0,
      floor: 0xfff0d2,
      accent: 0xff7967,
      detail: 0xf4bf45,
      ink: 0x26394a,
    },
    'v1-moonlight-puddle': {
      background: 0x102b59,
      floor: 0x27b8d0,
      accent: 0x8369d8,
      detail: 0xf6ca4a,
      ink: 0xdcecf4,
    },
    'v1-tournament-ring': {
      background: 0xff6557,
      floor: 0xfff4db,
      accent: 0xf4b82f,
      detail: 0x3677d7,
      ink: 0x472522,
    },
    'v1-scribble-lab': {
      background: 0x1788e4,
      floor: 0xa7e8c8,
      accent: 0xff7868,
      detail: 0xffd23f,
      ink: 0x173957,
    },
  });

export function battleArenaPaint(arenaId: BattleArenaId): BattleArenaPaint {
  return BATTLE_ARENA_PAINTS[arenaId];
}

/** A small literal ring preview that shares Replay's authoritative venue palette. */
export function battleArenaPreview(
  scene: Scene,
  arenaId: BattleArenaId,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Container {
  const paint = battleArenaPaint(arenaId);
  const preview = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  const left = -width / 2;
  const top = -height / 2;
  const drawOval = (widthScale = 0.78, heightScale = 0.68): void => {
    graphics.fillStyle(paint.floor, 1);
    graphics.fillEllipse(0, 5, width * widthScale, height * heightScale);
    graphics.lineStyle(5, paint.accent, 0.95);
    graphics.strokeEllipse(0, 5, width * widthScale, height * heightScale);
  };
  const drawCornerMarks = (): void => {
    for (const [cornerX, cornerY] of [
      [-width * 0.4, -height * 0.36],
      [width * 0.4, -height * 0.36],
      [-width * 0.4, height * 0.36],
      [width * 0.4, height * 0.36],
    ] as const) {
      graphics.fillStyle(paint.detail, 0.92);
      graphics.fillCircle(cornerX, cornerY, 6);
      graphics.lineStyle(3, paint.ink, 0.54);
      graphics.lineBetween(cornerX - 9, cornerY, cornerX + 9, cornerY);
      graphics.lineBetween(cornerX, cornerY - 9, cornerX, cornerY + 9);
    }
  };

  graphics.fillStyle(paint.background, 0.24);
  graphics.fillRoundedRect(left, top, width, height, 18);

  switch (arenaId) {
    case 'v1-sticker-stadium':
      drawOval(0.82, 0.72);
      drawCornerMarks();
      break;
    case 'v1-ink-playground':
      drawOval(0.78, 0.7);
      graphics.fillStyle(paint.accent, 0.84);
      graphics.fillCircle(-width * 0.38, -height * 0.18, 18);
      graphics.fillCircle(width * 0.38, height * 0.2, 24);
      graphics.fillStyle(paint.detail, 0.9);
      graphics.fillCircle(width * 0.34, -height * 0.27, 13);
      graphics.fillCircle(-width * 0.32, height * 0.3, 10);
      break;
    case 'v1-element-clash':
      graphics.fillStyle(paint.accent, 0.58);
      graphics.fillTriangle(left, top, width * 0.12, 5, left, -top);
      graphics.fillStyle(paint.detail, 0.62);
      graphics.fillTriangle(-left, top, -width * 0.12, 5, -left, -top);
      graphics.lineStyle(6, paint.ink, 0.76);
      graphics.lineBetween(-16, top + 12, 16, -top - 12);
      break;
    case 'v1-chalkboard-court':
      graphics.fillStyle(paint.floor, 1);
      graphics.fillRoundedRect(
        left + 12,
        top + 12,
        width - 24,
        height - 24,
        14
      );
      graphics.lineStyle(5, paint.detail, 0.82);
      graphics.strokeRoundedRect(
        left + 12,
        top + 12,
        width - 24,
        height - 24,
        14
      );
      graphics.lineBetween(0, top + 15, 0, -top - 15);
      graphics.strokeCircle(0, 0, Math.min(width, height) * 0.2);
      break;
    case 'v1-garden-patch':
      drawOval(0.78, 0.7);
      for (const [flowerX, flowerY] of [
        [-width * 0.4, -height * 0.24],
        [width * 0.4, -height * 0.18],
        [-width * 0.38, height * 0.25],
        [width * 0.38, height * 0.28],
      ] as const) {
        graphics.fillStyle(paint.detail, 0.92);
        graphics.fillEllipse(flowerX - 6, flowerY, 12, 22);
        graphics.fillEllipse(flowerX + 6, flowerY, 12, 22);
        graphics.fillStyle(paint.accent, 0.96);
        graphics.fillCircle(flowerX, flowerY, 5);
      }
      break;
    case 'v1-neon-arcade':
      drawOval(0.82, 0.72);
      graphics.lineStyle(2, paint.detail, 0.36);
      for (let gridX = -width * 0.3; gridX <= width * 0.3; gridX += width * 0.15)
        graphics.lineBetween(gridX, top + 26, gridX, -top - 26);
      for (
        let gridY = top + height * 0.25;
        gridY <= -top - height * 0.2;
        gridY += height * 0.2
      )
        graphics.lineBetween(left + 42, gridY, -left - 42, gridY);
      drawCornerMarks();
      break;
    case 'v1-candy-gym':
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 6; column += 1) {
          graphics.fillStyle(
            (row + column) % 2 === 0 ? paint.accent : paint.detail,
            0.3
          );
          graphics.fillRect(
            left + column * (width / 6),
            top + row * (height / 4),
            width / 6,
            height / 4
          );
        }
      }
      drawOval(0.78, 0.7);
      break;
    case 'v1-moonlight-puddle':
      graphics.fillStyle(paint.floor, 1);
      graphics.fillEllipse(0, 5, width * 0.8, height * 0.72);
      graphics.lineStyle(5, paint.accent, 0.78);
      graphics.strokeEllipse(0, 5, width * 0.82, height * 0.75);
      graphics.fillStyle(paint.floor, 0.9);
      graphics.fillCircle(-width * 0.38, -height * 0.2, 12);
      graphics.fillCircle(width * 0.38, height * 0.24, 17);
      drawCornerMarks();
      break;
    case 'v1-tournament-ring':
      drawOval(0.84, 0.72);
      graphics.lineStyle(3, paint.detail, 0.72);
      graphics.lineBetween(0, top + 18, 0, -top - 18);
      graphics.strokeCircle(0, 5, Math.min(width, height) * 0.16);
      drawCornerMarks();
      break;
    case 'v1-scribble-lab':
      graphics.fillStyle(paint.floor, 1);
      graphics.fillRoundedRect(
        left + 20,
        top + 16,
        width - 40,
        height - 32,
        20
      );
      graphics.lineStyle(5, paint.ink, 0.72);
      graphics.strokeRoundedRect(
        left + 20,
        top + 16,
        width - 40,
        height - 32,
        20
      );
      graphics.lineStyle(7, paint.accent, 0.9);
      graphics.lineBetween(left + 8, -height * 0.2, left + 48, -height * 0.08);
      graphics.lineBetween(-left - 48, height * 0.18, -left - 8, height * 0.3);
      drawCornerMarks();
      break;
  }

  graphics.lineStyle(3, UI.inkHex, 0.55);
  graphics.strokeRoundedRect(left, top, width, height, 18);
  preview.add(graphics);
  return preview;
}
