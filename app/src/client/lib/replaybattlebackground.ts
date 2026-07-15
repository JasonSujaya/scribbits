// Full-bleed arena skins for Replay. Gameplay geometry and the closing death
// zone remain transcript-owned; this module only paints the selected arena.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import {
  DEFAULT_BATTLE_ARENA_ID,
  type BattleArenaId,
} from '../../shared/battlearena';
import type {
  ReplayBattleLayout,
  ReplayBattleSide,
} from './battlepresentation';
import { ELEMENT_STYLES, UI } from './theme';
import { battleStage } from './visualassets';
import {
  battleArenaPaint,
  type BattleArenaPaint,
} from './battlearenapresentation';

export type ReplayBattleBackdrop = Readonly<{
  update: (elapsedMilliseconds: number) => void;
  signalShapePower: (
    side: ReplayBattleSide,
    phase: 'telegraph' | 'active'
  ) => void;
}>;

export type ReplayBattleBackgroundInput = Readonly<{
  layout: ReplayBattleLayout;
  fighterAElement: Element;
  fighterBElement: Element;
  battleSeed: string;
  battleArenaId?: BattleArenaId;
  reduceMotion: boolean;
}>;

const drawOvalCourt = (
  graphics: Phaser.GameObjects.Graphics,
  layout: ReplayBattleLayout,
  paint: BattleArenaPaint,
  widthScale = 0.88
): void => {
  const centerY = (layout.arenaTop + layout.arenaBottom) / 2;
  const courtWidth = layout.pageWidth * widthScale;
  const courtHeight = (layout.arenaBottom - layout.arenaTop) * 0.84;
  graphics.fillStyle(paint.floor, 1);
  graphics.fillEllipse(
    layout.viewportWidth / 2,
    centerY,
    courtWidth,
    courtHeight
  );
  graphics.lineStyle(10, paint.accent, 0.95);
  graphics.strokeEllipse(
    layout.viewportWidth / 2,
    centerY,
    courtWidth,
    courtHeight
  );
};

const drawCornerGlyphs = (
  graphics: Phaser.GameObjects.Graphics,
  layout: ReplayBattleLayout,
  paint: BattleArenaPaint
): void => {
  const positions = [
    [68, layout.arenaTop + 48],
    [layout.viewportWidth - 68, layout.arenaTop + 48],
    [68, layout.arenaBottom - 48],
    [layout.viewportWidth - 68, layout.arenaBottom - 48],
  ] as const;
  for (const [x, y] of positions) {
    graphics.fillStyle(paint.detail, 0.9);
    graphics.fillCircle(x, y, 12);
    graphics.lineStyle(7, paint.ink, 0.75);
    graphics.lineBetween(x - 20, y, x + 20, y);
    graphics.lineBetween(x, y - 20, x, y + 20);
  }
};

const drawArenaSkin = (
  scene: Scene,
  input: ReplayBattleBackgroundInput
): void => {
  const arenaId = input.battleArenaId ?? DEFAULT_BATTLE_ARENA_ID;
  const paint = battleArenaPaint(arenaId);
  const { layout } = input;
  const graphics = scene.add.graphics().setDepth(-20);
  const centerX = layout.viewportWidth / 2;
  const centerY = (layout.arenaTop + layout.arenaBottom) / 2;
  const arenaHeight = layout.arenaBottom - layout.arenaTop;

  // The rendered paper stage is the scene background. Arena-specific colors
  // live only inside the ring so they never replace the Scribbits visual
  // system with a full-screen game-board color.
  graphics.fillStyle(paint.background, 0.12);
  graphics.fillRoundedRect(
    38,
    layout.arenaTop + 8,
    layout.viewportWidth - 76,
    arenaHeight - 16,
    54
  );

  switch (arenaId) {
    case 'v1-sticker-stadium': {
      drawOvalCourt(graphics, layout, paint);
      drawCornerGlyphs(graphics, layout, paint);
      break;
    }
    case 'v1-ink-playground':
      drawOvalCourt(graphics, layout, paint, 0.82);
      graphics.fillStyle(paint.accent, 0.82);
      graphics.fillCircle(92, centerY - 180, 42);
      graphics.fillCircle(layout.viewportWidth - 84, centerY + 170, 52);
      graphics.fillStyle(paint.detail, 0.86);
      graphics.fillCircle(118, centerY + 230, 24);
      graphics.fillCircle(layout.viewportWidth - 120, centerY - 220, 30);
      break;
    case 'v1-element-clash': {
      const leftStyle = ELEMENT_STYLES[input.fighterAElement];
      const rightStyle = ELEMENT_STYLES[input.fighterBElement];
      graphics.fillStyle(leftStyle.soft, 0.82);
      graphics.fillTriangle(
        0,
        layout.arenaTop,
        centerX + 95,
        centerY,
        0,
        layout.arenaBottom
      );
      graphics.fillStyle(rightStyle.soft, 0.82);
      graphics.fillTriangle(
        layout.viewportWidth,
        layout.arenaTop,
        centerX - 95,
        centerY,
        layout.viewportWidth,
        layout.arenaBottom
      );
      graphics.lineStyle(12, paint.detail, 0.9);
      graphics.lineBetween(
        centerX - 42,
        layout.arenaTop + 24,
        centerX + 42,
        layout.arenaBottom - 24
      );
      break;
    }
    case 'v1-chalkboard-court':
      graphics.fillStyle(paint.floor, 1);
      graphics.fillRoundedRect(
        38,
        layout.arenaTop + 18,
        layout.viewportWidth - 76,
        arenaHeight - 36,
        34
      );
      graphics.lineStyle(8, paint.detail, 0.78);
      graphics.strokeRoundedRect(
        38,
        layout.arenaTop + 18,
        layout.viewportWidth - 76,
        arenaHeight - 36,
        34
      );
      graphics.lineBetween(
        centerX,
        layout.arenaTop + 24,
        centerX,
        layout.arenaBottom - 24
      );
      graphics.strokeCircle(centerX, centerY, 82);
      break;
    case 'v1-garden-patch':
      drawOvalCourt(graphics, layout, paint, 0.8);
      for (const [x, y] of [
        [60, centerY - 220],
        [layout.viewportWidth - 62, centerY - 170],
        [72, centerY + 220],
        [layout.viewportWidth - 78, centerY + 210],
      ] as const) {
        graphics.fillStyle(paint.detail, 0.88);
        graphics.fillEllipse(x, y, 30, 54);
        graphics.fillEllipse(x + 22, y + 8, 30, 54);
        graphics.fillStyle(paint.accent, 0.94);
        graphics.fillCircle(x + 10, y + 6, 10);
      }
      break;
    case 'v1-neon-arcade':
      drawOvalCourt(graphics, layout, paint, 0.86);
      graphics.lineStyle(3, paint.detail, 0.34);
      for (let x = 150; x < layout.viewportWidth - 100; x += 90)
        graphics.lineBetween(
          x,
          layout.arenaTop + 90,
          x,
          layout.arenaBottom - 90
        );
      for (let y = layout.arenaTop + 100; y < layout.arenaBottom - 70; y += 90)
        graphics.lineBetween(120, y, layout.viewportWidth - 120, y);
      drawCornerGlyphs(graphics, layout, paint);
      break;
    case 'v1-candy-gym':
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          graphics.fillStyle(
            (row + column) % 2 === 0 ? paint.accent : paint.detail,
            0.34
          );
          graphics.fillRect(
            column * 180,
            layout.arenaTop + row * (arenaHeight / 5),
            180,
            arenaHeight / 5
          );
        }
      }
      drawOvalCourt(graphics, layout, paint, 0.82);
      break;
    case 'v1-moonlight-puddle':
      graphics.fillStyle(paint.floor, 1);
      graphics.fillEllipse(
        centerX,
        centerY,
        layout.pageWidth * 0.8,
        arenaHeight * 0.78
      );
      for (const [x, y, radius] of [
        [92, centerY - 190, 24],
        [layout.viewportWidth - 86, centerY + 210, 34],
        [116, centerY + 250, 15],
      ] as const) {
        graphics.fillCircle(x, y, radius);
      }
      graphics.lineStyle(8, paint.accent, 0.72);
      graphics.strokeEllipse(
        centerX,
        centerY,
        layout.pageWidth * 0.83,
        arenaHeight * 0.81
      );
      drawCornerGlyphs(graphics, layout, paint);
      break;
    case 'v1-tournament-ring':
      drawOvalCourt(graphics, layout, paint, 0.88);
      graphics.lineStyle(5, paint.detail, 0.7);
      graphics.strokeCircle(centerX, centerY, 74);
      graphics.lineBetween(
        centerX,
        layout.arenaTop + 58,
        centerX,
        layout.arenaBottom - 58
      );
      drawCornerGlyphs(graphics, layout, paint);
      break;
    case 'v1-scribble-lab':
      graphics.fillStyle(paint.floor, 1);
      graphics.fillRoundedRect(
        58,
        layout.arenaTop + 42,
        layout.viewportWidth - 116,
        arenaHeight - 84,
        48
      );
      graphics.lineStyle(9, paint.ink, 0.72);
      graphics.strokeRoundedRect(
        58,
        layout.arenaTop + 42,
        layout.viewportWidth - 116,
        arenaHeight - 84,
        48
      );
      graphics.lineStyle(12, paint.accent, 0.88);
      graphics.lineBetween(38, centerY - 250, 112, centerY - 210);
      graphics.lineBetween(
        layout.viewportWidth - 120,
        centerY + 220,
        layout.viewportWidth - 40,
        centerY + 260
      );
      drawCornerGlyphs(graphics, layout, paint);
      break;
  }

  graphics.fillStyle(UI.inkHex, 0.035);
  for (let index = 0; index < 16; index += 1) {
    const x = 32 + ((index * 137) % Math.max(1, layout.viewportWidth - 64));
    const y =
      layout.arenaTop + 20 + ((index * 83) % Math.max(1, arenaHeight - 40));
    graphics.fillCircle(x, y, 2 + (index % 3));
  }
};

export function drawReplayBattleBackground(
  scene: Scene,
  input: ReplayBattleBackgroundInput
): ReplayBattleBackdrop {
  battleStage(scene, -1000);
  drawArenaSkin(scene, input);
  return {
    update: () => {},
    signalShapePower: () => {},
  };
}
