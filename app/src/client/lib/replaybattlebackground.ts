// Deterministic live-ink arena backdrop for Replay. It only presents the
// already-selected matchup; transcript events and simulation state never enter.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import type { ReplayBattleLayout } from './battlepresentation';
import { ELEMENT_STYLES, UI } from './theme';

type PaperPoint = Readonly<{ x: number; y: number }>;

export type ReplayBattleBackdrop = Readonly<{
  /** Applies presentation motion for the absolute elapsed scene time. */
  update: (elapsedMilliseconds: number) => void;
}>;

export type ReplayBattleBackgroundInput = Readonly<{
  layout: ReplayBattleLayout;
  fighterAElement: Element;
  fighterBElement: Element;
  battleSeed: string;
  reduceMotion: boolean;
}>;

const FULL_CIRCLE_RADIANS = Math.PI * 2;

const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

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
  points: ReadonlyArray<PaperPoint>,
  offsetX = 0,
  offsetY = 0
): void => {
  const firstPoint = points[0];
  if (!firstPoint) return;

  graphics.beginPath();
  graphics.moveTo(firstPoint.x + offsetX, firstPoint.y + offsetY);
  for (let index = 1; index < points.length; index += 1) {
    const currentPoint = points[index];
    if (!currentPoint) continue;
    graphics.lineTo(currentPoint.x + offsetX, currentPoint.y + offsetY);
  }
  graphics.closePath();
};

const buildTornPagePoints = (
  layout: ReplayBattleLayout,
  seed: number
): ReadonlyArray<PaperPoint> => {
  const pageRight = layout.pageLeft + layout.pageWidth;
  const pageBottom = layout.pageTop + layout.pageHeight;
  const horizontalSegments = 18;
  const verticalSegments = 14;
  const points: PaperPoint[] = [];

  for (let index = 0; index <= horizontalSegments; index += 1) {
    points.push({
      x: layout.pageLeft + (layout.pageWidth * index) / horizontalSegments,
      y:
        layout.pageTop +
        stableJitter(
          seed,
          index,
          index === 0 || index === horizontalSegments ? 2 : 5
        ),
    });
  }
  for (let index = 1; index <= verticalSegments; index += 1) {
    points.push({
      x:
        pageRight +
        stableJitter(seed, 30 + index, index === verticalSegments ? 2 : 5),
      y: layout.pageTop + (layout.pageHeight * index) / verticalSegments,
    });
  }
  for (let index = 1; index <= horizontalSegments; index += 1) {
    points.push({
      x: pageRight - (layout.pageWidth * index) / horizontalSegments,
      y:
        pageBottom +
        stableJitter(seed, 60 + index, index === horizontalSegments ? 2 : 5),
    });
  }
  for (let index = 1; index < verticalSegments; index += 1) {
    points.push({
      x: layout.pageLeft + stableJitter(seed, 90 + index, 5),
      y: pageBottom - (layout.pageHeight * index) / verticalSegments,
    });
  }

  return points;
};

const drawBrushArc = (
  graphics: Phaser.GameObjects.Graphics,
  input: {
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
    startAngle: number;
    endAngle: number;
    color: number;
    alpha: number;
    width: number;
    seed: number;
    jitterIndex: number;
  }
): void => {
  const pointCount = 20;
  graphics.lineStyle(input.width, input.color, input.alpha);
  graphics.beginPath();

  for (let index = 0; index <= pointCount; index += 1) {
    const progress = index / pointCount;
    const angle =
      input.startAngle + (input.endAngle - input.startAngle) * progress;
    const radiusJitter = stableJitter(input.seed, input.jitterIndex + index, 4);
    const x = input.centerX + Math.cos(angle) * (input.radiusX + radiusJitter);
    const y =
      input.centerY + Math.sin(angle) * (input.radiusY + radiusJitter * 0.6);
    if (index === 0) graphics.moveTo(x, y);
    else graphics.lineTo(x, y);
  }

  graphics.strokePath();
};

const drawCrowdSilhouette = (
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  direction: -1 | 1,
  variation: number
): void => {
  const headRadius = 5 + variation * 2;
  const bodyHeight = 21 + variation * 8;
  const shoulderWidth = 17 + variation * 7;
  const silhouetteAlpha = 0.14 + variation * 0.05;

  graphics.fillStyle(UI.inkHex, silhouetteAlpha);
  graphics.fillCircle(x, y - bodyHeight * 0.54, headRadius);
  graphics.fillEllipse(x, y, shoulderWidth, bodyHeight);
  graphics.lineStyle(5, UI.inkHex, silhouetteAlpha);
  graphics.lineBetween(
    x + direction * shoulderWidth * 0.18,
    y - bodyHeight * 0.28,
    x + direction * (shoulderWidth * 0.62),
    y - bodyHeight * (0.78 + variation * 0.18)
  );
};

const drawDirectionalBrushMarks = (
  graphics: Phaser.GameObjects.Graphics,
  input: {
    side: 'left' | 'right';
    layout: ReplayBattleLayout;
    centerX: number;
    arenaCenterY: number;
    clearCenterHalfWidth: number;
    color: number;
    seed: number;
  }
): void => {
  const direction = input.side === 'left' ? 1 : -1;
  const edgeX =
    input.side === 'left'
      ? input.layout.pageLeft + 74
      : input.layout.pageLeft + input.layout.pageWidth - 74;
  const innerX = input.centerX - direction * (input.clearCenterHalfWidth + 34);
  const horizontalSpan = Math.abs(innerX - edgeX);

  for (let groupIndex = 0; groupIndex < 4; groupIndex += 1) {
    const progress = (groupIndex + 0.5) / 4;
    const x = edgeX + direction * horizontalSpan * progress;
    const yOffset =
      (groupIndex % 2 === 0 ? -1 : 1) *
      (72 + groupIndex * 25 + stableJitter(input.seed, 180 + groupIndex, 12));
    const y = input.arenaCenterY + yOffset;
    const markLength = 22 + groupIndex * 5;

    graphics.lineStyle(7, input.color, 0.2 - groupIndex * 0.018);
    graphics.lineBetween(
      x - direction * markLength * 0.5,
      y + 8,
      x + direction * markLength * 0.5,
      y - 8
    );
    graphics.lineStyle(4, UI.inkHex, 0.13);
    graphics.lineBetween(
      x - direction * markLength * 0.32,
      y + 19,
      x + direction * markLength * 0.38,
      y + 10
    );
  }
};

export function drawReplayBattleBackground(
  scene: Scene,
  input: ReplayBattleBackgroundInput
): ReplayBattleBackdrop {
  const { layout } = input;
  const leftStyle = ELEMENT_STYLES[input.fighterAElement];
  const rightStyle = ELEMENT_STYLES[input.fighterBElement];
  const seed = hashSeed(input.battleSeed);
  const reduceMotion = input.reduceMotion;
  const centerX = layout.viewportWidth / 2;
  const arenaCenterY = (layout.arenaTop + layout.arenaBottom) / 2;
  const arenaHeight = layout.arenaBottom - layout.arenaTop;
  const pageRight = layout.pageLeft + layout.pageWidth;
  const pageBottom = layout.pageTop + layout.pageHeight;
  const clearCenterHalfWidth = Math.max(106, layout.pageWidth * 0.18);
  const leftZoneEdge = centerX - clearCenterHalfWidth;
  const rightZoneEdge = centerX + clearCenterHalfWidth;

  const pageGraphics = scene.add.graphics().setDepth(-20);
  pageGraphics.fillStyle(UI.deskHex, 1);
  pageGraphics.fillRect(0, 0, layout.viewportWidth, layout.viewportHeight);

  // Loose desk strokes sit behind the page and read as a physical tabletop,
  // never as lanes or combat boundaries.
  pageGraphics.lineStyle(18, UI.inkHex, 0.1);
  pageGraphics.lineBetween(
    -24,
    layout.pageTop + 42,
    layout.pageLeft + 34,
    layout.pageTop + 14
  );
  pageGraphics.lineBetween(
    pageRight - 22,
    pageBottom + 28,
    layout.viewportWidth + 28,
    pageBottom - 4
  );

  const tornPagePoints = buildTornPagePoints(layout, seed);
  pageGraphics.fillStyle(0x000000, 0.3);
  traceClosedShape(pageGraphics, tornPagePoints, 9, 11);
  pageGraphics.fillPath();
  pageGraphics.fillStyle(UI.paper, 1);
  traceClosedShape(pageGraphics, tornPagePoints);
  pageGraphics.fillPath();
  pageGraphics.lineStyle(6, UI.inkHex, 0.72);
  traceClosedShape(pageGraphics, tornPagePoints);
  pageGraphics.strokePath();

  const arenaGraphics = scene.add.graphics().setDepth(-19);

  // Broad opposing element washes establish the broadcast matchup while
  // stopping well short of the active combat center.
  arenaGraphics.fillStyle(leftStyle.soft, 0.3);
  traceClosedShape(arenaGraphics, [
    { x: layout.pageLeft + 3, y: layout.arenaTop + 16 },
    { x: leftZoneEdge - 36, y: layout.arenaTop + 50 },
    {
      x: leftZoneEdge + 12,
      y: arenaCenterY - 68 + stableJitter(seed, 120, 20),
    },
    { x: leftZoneEdge - 8, y: arenaCenterY + 92 },
    { x: leftZoneEdge - 52, y: layout.arenaBottom - 24 },
    { x: layout.pageLeft + 3, y: layout.arenaBottom + 12 },
  ]);
  arenaGraphics.fillPath();
  arenaGraphics.fillStyle(leftStyle.primary, 0.11);
  traceClosedShape(arenaGraphics, [
    { x: layout.pageLeft + 4, y: layout.arenaTop + 86 },
    { x: leftZoneEdge - 22, y: arenaCenterY - 54 },
    { x: leftZoneEdge - 42, y: arenaCenterY + 6 },
    { x: layout.pageLeft + 4, y: arenaCenterY + 94 },
  ]);
  arenaGraphics.fillPath();

  arenaGraphics.fillStyle(rightStyle.soft, 0.3);
  traceClosedShape(arenaGraphics, [
    { x: pageRight - 3, y: layout.arenaTop + 34 },
    { x: rightZoneEdge + 54, y: layout.arenaTop + 68 },
    { x: rightZoneEdge + 8, y: arenaCenterY - 94 },
    {
      x: rightZoneEdge - 12,
      y: arenaCenterY + 62 + stableJitter(seed, 122, 20),
    },
    { x: rightZoneEdge + 30, y: layout.arenaBottom - 56 },
    { x: pageRight - 3, y: layout.arenaBottom + 18 },
  ]);
  arenaGraphics.fillPath();
  arenaGraphics.fillStyle(rightStyle.primary, 0.11);
  traceClosedShape(arenaGraphics, [
    { x: pageRight - 4, y: arenaCenterY - 116 },
    { x: rightZoneEdge + 36, y: arenaCenterY - 36 },
    { x: rightZoneEdge + 24, y: arenaCenterY + 32 },
    { x: pageRight - 4, y: layout.arenaBottom - 72 },
  ]);
  arenaGraphics.fillPath();

  // Dry-brush seams break up the washes without introducing a grid.
  arenaGraphics.lineStyle(16, UI.paper, 0.38);
  arenaGraphics.beginPath();
  arenaGraphics.moveTo(layout.pageLeft + 8, arenaCenterY + 126);
  arenaGraphics.lineTo(leftZoneEdge - 40, arenaCenterY + 78);
  arenaGraphics.strokePath();
  arenaGraphics.beginPath();
  arenaGraphics.moveTo(rightZoneEdge + 48, arenaCenterY - 112);
  arenaGraphics.lineTo(pageRight - 6, arenaCenterY - 70);
  arenaGraphics.strokePath();

  const arcGraphics = scene.add.graphics().setDepth(-18);
  drawBrushArc(arcGraphics, {
    centerX: centerX - 22,
    centerY: arenaCenterY + 10,
    radiusX: layout.pageWidth * 0.42,
    radiusY: arenaHeight * 0.37,
    startAngle: Math.PI * 0.6,
    endAngle: Math.PI * 1.19,
    color: leftStyle.primary,
    alpha: 0.2,
    width: 12,
    seed,
    jitterIndex: 230,
  });
  drawBrushArc(arcGraphics, {
    centerX: centerX + 36,
    centerY: arenaCenterY - 18,
    radiusX: layout.pageWidth * 0.4,
    radiusY: arenaHeight * 0.32,
    startAngle: -Math.PI * 0.2,
    endAngle: Math.PI * 0.39,
    color: rightStyle.primary,
    alpha: 0.2,
    width: 13,
    seed,
    jitterIndex: 260,
  });
  drawBrushArc(arcGraphics, {
    centerX: centerX + 12,
    centerY: arenaCenterY + 6,
    radiusX: layout.pageWidth * 0.46,
    radiusY: arenaHeight * 0.43,
    startAngle: Math.PI * 1.34,
    endAngle: Math.PI * 1.62,
    color: UI.inkHex,
    alpha: 0.1,
    width: 7,
    seed,
    jitterIndex: 290,
  });

  const crowdGraphics = scene.add.graphics().setDepth(-17);
  for (let crowdIndex = 0; crowdIndex < 8; crowdIndex += 1) {
    const progress = (crowdIndex + 0.5) / 8;
    const y = layout.arenaTop + progress * arenaHeight;
    const variation = ((seed >>> (crowdIndex % 16)) & 3) / 3;
    const stagger = crowdIndex % 2 === 0 ? 0 : 12;
    drawCrowdSilhouette(
      crowdGraphics,
      layout.pageLeft + 12 + stagger,
      y,
      1,
      variation
    );
    drawCrowdSilhouette(
      crowdGraphics,
      pageRight - 12 - stagger,
      y + stableJitter(seed, 320 + crowdIndex, 10),
      -1,
      1 - variation
    );
  }

  const leftMotionGraphics = scene.add.graphics().setDepth(-16);
  const rightMotionGraphics = scene.add.graphics().setDepth(-16);
  drawDirectionalBrushMarks(leftMotionGraphics, {
    side: 'left',
    layout,
    centerX,
    arenaCenterY,
    clearCenterHalfWidth,
    color: leftStyle.primary,
    seed,
  });
  drawDirectionalBrushMarks(rightMotionGraphics, {
    side: 'right',
    layout,
    centerX,
    arenaCenterY,
    clearCenterHalfWidth,
    color: rightStyle.primary,
    seed: seed ^ 0x9e3779b9,
  });

  scene.add
    .rectangle(layout.pageLeft + 64, layout.pageTop + 3, 104, 32, UI.tape, 0.76)
    .setAngle(-6)
    .setDepth(-15);
  scene.add
    .rectangle(pageRight - 66, layout.pageTop + 5, 100, 32, UI.tapeAlt, 0.76)
    .setAngle(5)
    .setDepth(-15);

  const useStaticBackdrop = (): void => {
    leftMotionGraphics.setPosition(0, 0).setAlpha(0.84);
    rightMotionGraphics.setPosition(0, 0).setAlpha(0.84);
    arcGraphics.setAlpha(0.9);
    crowdGraphics.setAlpha(0.9);
  };

  const update = (elapsedMilliseconds: number): void => {
    if (reduceMotion) return;

    const safeElapsedMilliseconds = Number.isFinite(elapsedMilliseconds)
      ? Math.max(0, elapsedMilliseconds)
      : 0;
    const cycleMilliseconds = 3_600;
    const seedPhase = ((seed % 360) / 360) * FULL_CIRCLE_RADIANS;
    const phase =
      ((safeElapsedMilliseconds % cycleMilliseconds) / cycleMilliseconds) *
        FULL_CIRCLE_RADIANS +
      seedPhase;
    const horizontalDrift = Math.sin(phase) * 4;
    const verticalDrift = Math.cos(phase * 2) * 1.5;

    leftMotionGraphics
      .setPosition(horizontalDrift, verticalDrift)
      .setAlpha(0.78 + Math.sin(phase) * 0.09);
    rightMotionGraphics
      .setPosition(-horizontalDrift, -verticalDrift)
      .setAlpha(0.78 - Math.sin(phase) * 0.09);
    arcGraphics.setAlpha(0.86 + Math.cos(phase) * 0.06);
    crowdGraphics.setAlpha(0.87 + Math.sin(phase * 2) * 0.04);
  };

  useStaticBackdrop();
  if (!reduceMotion) update(0);

  return { update };
}
