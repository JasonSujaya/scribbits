// Calm paper arena backdrop for Replay. The fixed-tick transcript owns every
// gameplay fact; this layer only gives the submitted drawings a quiet stage.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import { hashStringToUint32 } from '../../shared/stablehash';
import type {
  ReplayBattleLayout,
  ReplayBattleSide,
} from './battlepresentation';
import { ELEMENT_STYLES, UI } from './theme';
import { paperStage } from './visualassets';

type PaperPoint = Readonly<{ x: number; y: number }>;

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
  reduceMotion: boolean;
}>;

const stableJitter = (
  seed: number,
  index: number,
  amplitude: number
): number => {
  const mixed = Math.imul(seed ^ (index + 1), 2_654_435_761) >>> 0;
  return ((mixed % 2_001) / 1_000 - 1) * amplitude;
};

const traceClosedShape = (
  graphics: Phaser.GameObjects.Graphics,
  points: readonly PaperPoint[],
  offsetX = 0,
  offsetY = 0
): void => {
  const firstPoint = points[0];
  if (!firstPoint) return;

  graphics.beginPath();
  graphics.moveTo(firstPoint.x + offsetX, firstPoint.y + offsetY);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point) graphics.lineTo(point.x + offsetX, point.y + offsetY);
  }
  graphics.closePath();
};

const buildTornPagePoints = (
  layout: ReplayBattleLayout,
  seed: number
): readonly PaperPoint[] => {
  const pageRight = layout.pageLeft + layout.pageWidth;
  const pageBottom = layout.pageTop + layout.pageHeight;
  const horizontalSegments = 18;
  const verticalSegments = 14;
  const points: PaperPoint[] = [];

  for (let index = 0; index <= horizontalSegments; index += 1) {
    points.push({
      x: layout.pageLeft + (layout.pageWidth * index) / horizontalSegments,
      y: layout.pageTop + stableJitter(seed, index, 4),
    });
  }
  for (let index = 1; index <= verticalSegments; index += 1) {
    points.push({
      x: pageRight + stableJitter(seed, 30 + index, 4),
      y: layout.pageTop + (layout.pageHeight * index) / verticalSegments,
    });
  }
  for (let index = 1; index <= horizontalSegments; index += 1) {
    points.push({
      x: pageRight - (layout.pageWidth * index) / horizontalSegments,
      y: pageBottom + stableJitter(seed, 60 + index, 4),
    });
  }
  for (let index = 1; index < verticalSegments; index += 1) {
    points.push({
      x: layout.pageLeft + stableJitter(seed, 90 + index, 4),
      y: pageBottom - (layout.pageHeight * index) / verticalSegments,
    });
  }

  return points;
};

const drawPaperPage = (
  scene: Scene,
  layout: ReplayBattleLayout,
  seed: number
): void => {
  paperStage(scene, -21);
  const page = scene.add.graphics().setDepth(-20);
  page.fillStyle(UI.deskHex, 0.08);
  page.fillRect(0, 0, layout.viewportWidth, layout.viewportHeight);

  const tornPagePoints = buildTornPagePoints(layout, seed);
  page.fillStyle(0x000000, 0.22);
  traceClosedShape(page, tornPagePoints, 8, 10);
  page.fillPath();
  page.fillStyle(UI.paper, 1);
  traceClosedShape(page, tornPagePoints);
  page.fillPath();
  page.lineStyle(5, UI.inkHex, 0.58);
  traceClosedShape(page, tornPagePoints);
  page.strokePath();
};

const drawQuietArenaMarks = (
  scene: Scene,
  input: ReplayBattleBackgroundInput,
  seed: number
): void => {
  const { layout } = input;
  const centerY = (layout.arenaTop + layout.arenaBottom) / 2;
  const leftStyle = ELEMENT_STYLES[input.fighterAElement];
  const rightStyle = ELEMENT_STYLES[input.fighterBElement];
  const marks = scene.add.graphics().setDepth(-19);

  // Small edge washes identify the matchup without splitting the whole page
  // into colored lanes. The center remains almost blank for moving drawings.
  marks.fillStyle(leftStyle.soft, 0.07);
  marks.fillEllipse(
    layout.pageLeft + 18,
    centerY,
    Math.max(84, layout.pageWidth * 0.25),
    Math.max(300, (layout.arenaBottom - layout.arenaTop) * 0.72)
  );
  marks.fillStyle(rightStyle.soft, 0.07);
  marks.fillEllipse(
    layout.pageLeft + layout.pageWidth - 18,
    centerY,
    Math.max(84, layout.pageWidth * 0.25),
    Math.max(300, (layout.arenaBottom - layout.arenaTop) * 0.72)
  );

  for (let speckIndex = 0; speckIndex < 12; speckIndex += 1) {
    const x =
      layout.pageLeft +
      36 +
      ((seed >>> (speckIndex % 16)) % Math.max(1, layout.pageWidth - 72));
    const y =
      layout.arenaTop +
      40 +
      ((seed >>> ((speckIndex + 5) % 16)) %
        Math.max(1, layout.arenaBottom - layout.arenaTop - 80));
    marks.fillStyle(UI.inkHex, 0.035);
    marks.fillCircle(x, y, 2 + (speckIndex % 2));
  }
};

export function drawReplayBattleBackground(
  scene: Scene,
  input: ReplayBattleBackgroundInput
): ReplayBattleBackdrop {
  const { layout } = input;
  const seed = hashStringToUint32(input.battleSeed);

  drawPaperPage(scene, layout, seed);
  drawQuietArenaMarks(scene, input, seed);

  // Shape Power effects already render at their exact authoritative positions
  // in Replay. Keeping this background static avoids a second, disconnected
  // animation layer and gives those foreground effects room to read.
  return {
    update: () => {},
    signalShapePower: () => {},
  };
}
