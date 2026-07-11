// Deterministic live-ink arena backdrop for Replay. It only presents the
// already-selected matchup; transcript events and simulation state never enter.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import type {
  ReplayBattleLayout,
  ReplayBattleSide,
} from './battlepresentation';
import { ELEMENT_STYLES, UI } from './theme';

type PaperPoint = Readonly<{ x: number; y: number }>;

export type ReplayBattleBackdrop = Readonly<{
  /** Applies presentation motion for the absolute elapsed scene time. */
  update: (elapsedMilliseconds: number) => void;
  /** Lets an authoritative transcript beat tint the stage without changing it. */
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

const drawPowerSurge = (
  graphics: Phaser.GameObjects.Graphics,
  input: {
    side: ReplayBattleSide;
    layout: ReplayBattleLayout;
    centerX: number;
    arenaCenterY: number;
    color: number;
    seed: number;
  }
): void => {
  const direction = input.side === 'a' ? 1 : -1;
  const pageEdgeX =
    input.side === 'a'
      ? input.layout.pageLeft + 24
      : input.layout.pageLeft + input.layout.pageWidth - 24;
  const tipX = input.centerX - direction * 30;
  const halfHeight = Math.max(
    170,
    (input.layout.arenaBottom - input.layout.arenaTop) * 0.3
  );

  graphics.fillStyle(input.color, 0.24);
  graphics.fillTriangle(
    pageEdgeX,
    input.arenaCenterY - halfHeight,
    pageEdgeX,
    input.arenaCenterY + halfHeight,
    tipX,
    input.arenaCenterY
  );

  for (let markIndex = 0; markIndex < 4; markIndex += 1) {
    const verticalOffset =
      (markIndex - 1.5) * 72 + stableJitter(input.seed, 410 + markIndex, 12);
    const startX = pageEdgeX + direction * (28 + markIndex * 9);
    const endX = tipX - direction * (42 + markIndex * 22);
    graphics.lineStyle(12 - markIndex, input.color, 0.28 - markIndex * 0.04);
    graphics.lineBetween(
      startX,
      input.arenaCenterY + verticalOffset,
      endX,
      input.arenaCenterY + verticalOffset * 0.28
    );
  }

  graphics.lineStyle(7, UI.creamHex, 0.7);
  graphics.strokeCircle(
    input.centerX - direction * 118,
    input.arenaCenterY,
    68
  );
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

  // Localized corner stains identify each fighter without turning the arena
  // into two lanes. The center stays neutral so movement and telegraphs win.
  arenaGraphics.fillStyle(leftStyle.soft, 0.24);
  traceClosedShape(arenaGraphics, [
    { x: layout.pageLeft + 3, y: layout.arenaTop + 16 },
    { x: leftZoneEdge - 10, y: layout.arenaTop + 48 },
    {
      x: leftZoneEdge + 22,
      y: arenaCenterY - 112 + stableJitter(seed, 120, 18),
    },
    { x: leftZoneEdge - 34, y: arenaCenterY - 20 },
    { x: layout.pageLeft + 3, y: arenaCenterY + 76 },
  ]);
  arenaGraphics.fillPath();
  arenaGraphics.fillStyle(leftStyle.primary, 0.11);
  traceClosedShape(arenaGraphics, [
    { x: layout.pageLeft + 4, y: arenaCenterY + 18 },
    { x: leftZoneEdge - 26, y: arenaCenterY + 86 },
    { x: leftZoneEdge - 54, y: layout.arenaBottom - 78 },
    { x: layout.pageLeft + 4, y: layout.arenaBottom - 26 },
  ]);
  arenaGraphics.fillPath();

  arenaGraphics.fillStyle(rightStyle.soft, 0.24);
  traceClosedShape(arenaGraphics, [
    { x: pageRight - 3, y: arenaCenterY - 78 },
    { x: rightZoneEdge + 32, y: arenaCenterY - 20 },
    {
      x: rightZoneEdge - 20,
      y: arenaCenterY + 108 + stableJitter(seed, 122, 18),
    },
    { x: rightZoneEdge + 16, y: layout.arenaBottom - 54 },
    { x: pageRight - 3, y: layout.arenaBottom + 18 },
  ]);
  arenaGraphics.fillPath();
  arenaGraphics.fillStyle(rightStyle.primary, 0.11);
  traceClosedShape(arenaGraphics, [
    { x: pageRight - 4, y: layout.arenaTop + 24 },
    { x: rightZoneEdge + 52, y: layout.arenaTop + 80 },
    { x: rightZoneEdge + 24, y: arenaCenterY - 72 },
    { x: pageRight - 4, y: arenaCenterY - 18 },
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

  // A quiet center seal makes this read as a live stage instead of another
  // card. It remains subdued until a transcript power beat surges through it.
  const stageSealGraphics = scene.add.graphics().setDepth(-17.8);
  stageSealGraphics.fillStyle(UI.creamHex, 0.23);
  stageSealGraphics.fillEllipse(
    centerX,
    arenaCenterY,
    layout.pageWidth * 0.56,
    arenaHeight * 0.58
  );
  drawBrushArc(stageSealGraphics, {
    centerX,
    centerY: arenaCenterY,
    radiusX: layout.pageWidth * 0.28,
    radiusY: arenaHeight * 0.29,
    startAngle: Math.PI * 0.08,
    endAngle: Math.PI * 0.92,
    color: UI.inkHex,
    alpha: 0.1,
    width: 5,
    seed,
    jitterIndex: 360,
  });
  drawBrushArc(stageSealGraphics, {
    centerX,
    centerY: arenaCenterY,
    radiusX: layout.pageWidth * 0.28,
    radiusY: arenaHeight * 0.29,
    startAngle: Math.PI * 1.05,
    endAngle: Math.PI * 1.9,
    color: UI.inkHex,
    alpha: 0.1,
    width: 5,
    seed,
    jitterIndex: 390,
  });
  stageSealGraphics.lineStyle(4, UI.inkHex, 0.08);
  stageSealGraphics.lineBetween(
    centerX - 32,
    arenaCenterY,
    centerX + 32,
    arenaCenterY
  );
  stageSealGraphics.lineBetween(
    centerX,
    arenaCenterY - 32,
    centerX,
    arenaCenterY + 32
  );
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

  const leftPowerSurge = scene.add.graphics().setDepth(-15.5).setAlpha(0);
  const rightPowerSurge = scene.add.graphics().setDepth(-15.5).setAlpha(0);
  drawPowerSurge(leftPowerSurge, {
    side: 'a',
    layout,
    centerX,
    arenaCenterY,
    color: leftStyle.primary,
    seed,
  });
  drawPowerSurge(rightPowerSurge, {
    side: 'b',
    layout,
    centerX,
    arenaCenterY,
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

  const powerStrength: Record<ReplayBattleSide, number> = { a: 0, b: 0 };
  let previousElapsedMilliseconds = 0;

  const applyPowerSurges = (phase: number): void => {
    const pulse = reduceMotion ? 1 : 0.92 + Math.sin(phase * 3) * 0.08;
    leftPowerSurge.setAlpha(powerStrength.a * 0.72 * pulse);
    rightPowerSurge.setAlpha(powerStrength.b * 0.72 * pulse);
  };

  const useStaticBackdrop = (): void => {
    leftMotionGraphics.setPosition(0, 0).setAlpha(0.84);
    rightMotionGraphics.setPosition(0, 0).setAlpha(0.84);
    arcGraphics.setAlpha(0.9);
    crowdGraphics.setAlpha(0.9);
    applyPowerSurges(0);
  };

  const update = (elapsedMilliseconds: number): void => {
    const safeElapsedMilliseconds = Number.isFinite(elapsedMilliseconds)
      ? Math.max(0, elapsedMilliseconds)
      : 0;
    const elapsedDelta = Math.min(
      120,
      Math.max(0, safeElapsedMilliseconds - previousElapsedMilliseconds)
    );
    previousElapsedMilliseconds = safeElapsedMilliseconds;
    powerStrength.a = Math.max(0, powerStrength.a - elapsedDelta / 1_050);
    powerStrength.b = Math.max(0, powerStrength.b - elapsedDelta / 1_050);
    const cycleMilliseconds = 3_600;
    const seedPhase = ((seed % 360) / 360) * FULL_CIRCLE_RADIANS;
    const phase =
      ((safeElapsedMilliseconds % cycleMilliseconds) / cycleMilliseconds) *
        FULL_CIRCLE_RADIANS +
      seedPhase;
    applyPowerSurges(phase);
    if (reduceMotion) return;

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

  return {
    update,
    signalShapePower: (side, phase) => {
      powerStrength[side] = Math.max(
        powerStrength[side],
        phase === 'active' ? 1 : 0.66
      );
      applyPowerSurges(0);
    },
  };
}
