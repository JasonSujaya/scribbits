// Phaser renderer for the pure plan in proceduraldoodleplan.ts. Founding
// Scribbits use their stats here; ordinary image failures stay neutral so a
// temporary network miss never invents a build for a player's drawing.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element, ScribbitStats } from '../../shared/arena';
import { ELEMENT_STYLES } from './theme';
import {
  createProceduralDoodlePlan,
  doodleStatsSignature,
  PROCEDURAL_DOODLE_SIZE,
} from './proceduraldoodleplan';
import type {
  DoodleCircle,
  DoodlePoint,
  DoodleTriangle,
  ProceduralDoodlePlan,
} from './proceduraldoodleplan';

const INK = 0x2b2016;
const PAPER = 0xfff7e8;
const PATCHWORK_COLORS = [
  ELEMENT_STYLES.ember.primary,
  ELEMENT_STYLES.tide.primary,
  ELEMENT_STYLES.moss.primary,
  ELEMENT_STYLES.storm.primary,
] as const;

const asVector = (point: DoodlePoint): Phaser.Math.Vector2 => {
  return new Phaser.Math.Vector2(point.x, point.y);
};

const drawCircle = (
  graphics: Phaser.GameObjects.Graphics,
  circle: DoodleCircle,
  color: number,
  alpha = 1
): void => {
  graphics.fillStyle(color, alpha);
  graphics.fillCircle(circle.center.x, circle.center.y, circle.radius);
};

const drawTriangle = (
  graphics: Phaser.GameObjects.Graphics,
  triangle: DoodleTriangle,
  fillColor: number
): void => {
  const [first, second, third] = triangle;
  graphics.fillStyle(fillColor, 1);
  graphics.fillTriangle(first.x, first.y, second.x, second.y, third.x, third.y);
  graphics.lineStyle(7, INK, 1);
  graphics.strokeTriangle(
    first.x,
    first.y,
    second.x,
    second.y,
    third.x,
    third.y
  );
};

const drawAnatomyBehindBody = (
  graphics: Phaser.GameObjects.Graphics,
  plan: ProceduralDoodlePlan,
  primaryColor: number
): void => {
  for (const leg of plan.legs) {
    drawCircle(graphics, leg, INK);
  }

  const anatomy = plan.anatomy;
  if (anatomy.kind === 'quill-crest') {
    anatomy.quills.forEach((quill) =>
      drawTriangle(graphics, quill, primaryColor)
    );
    return;
  }

  if (anatomy.kind === 'streamer-tail') {
    const tailPoints = anatomy.tailPoints.map(asVector);
    graphics.fillStyle(primaryColor, 0.9);
    graphics.fillPoints(tailPoints, true);
    graphics.lineStyle(9, INK, 1);
    graphics.strokePoints(tailPoints, true);
    return;
  }

  if (anatomy.kind === 'patchwork-crest') {
    anatomy.crest.forEach((petal, index) => {
      drawCircle(
        graphics,
        petal,
        PATCHWORK_COLORS[index % PATCHWORK_COLORS.length] ?? primaryColor
      );
      graphics.lineStyle(6, INK, 1);
      graphics.strokeCircle(petal.center.x, petal.center.y, petal.radius);
    });
  }
};

const drawBody = (
  graphics: Phaser.GameObjects.Graphics,
  plan: ProceduralDoodlePlan,
  bodyColor: number
): void => {
  const bodyPoints = plan.bodyPoints.map(asVector);
  graphics.fillStyle(bodyColor, 1);
  graphics.fillPoints(bodyPoints, true);
  graphics.lineStyle(10, INK, 1);
  graphics.strokePoints(bodyPoints, true);
};

const drawAnatomyOnBody = (
  graphics: Phaser.GameObjects.Graphics,
  plan: ProceduralDoodlePlan,
  primaryColor: number
): void => {
  const anatomy = plan.anatomy;
  if (anatomy.kind === 'grounded-belly') {
    graphics.lineStyle(8, primaryColor, 0.72);
    for (const [start, middle, end] of anatomy.bellyBands) {
      graphics.beginPath();
      graphics.moveTo(start.x, start.y);
      graphics.lineTo(middle.x, middle.y);
      graphics.lineTo(end.x, end.y);
      graphics.strokePath();
    }
    return;
  }

  if (anatomy.kind === 'patchwork-crest') {
    anatomy.patches.forEach((patch, index) => {
      drawCircle(
        graphics,
        patch,
        PATCHWORK_COLORS[(index + 1) % PATCHWORK_COLORS.length] ?? primaryColor,
        0.82
      );
      graphics.lineStyle(4, INK, 0.65);
      graphics.strokeCircle(patch.center.x, patch.center.y, patch.radius);
    });
  }
};

const drawFace = (
  graphics: Phaser.GameObjects.Graphics,
  plan: ProceduralDoodlePlan
): void => {
  for (const eye of plan.eyes) {
    drawCircle(graphics, eye.white, PAPER);
    graphics.lineStyle(5, INK, 1);
    graphics.strokeCircle(
      eye.white.center.x,
      eye.white.center.y,
      eye.white.radius
    );
    drawCircle(graphics, eye.pupil, INK);
  }

  const [mouthStart, mouthMiddle, mouthEnd] = plan.mouth;
  graphics.lineStyle(6, INK, 1);
  graphics.beginPath();
  graphics.moveTo(mouthStart.x, mouthStart.y);
  graphics.lineTo(mouthMiddle.x, mouthMiddle.y);
  graphics.lineTo(mouthEnd.x, mouthEnd.y);
  graphics.strokePath();
};

export function doodleKey(
  spriteKey: string,
  element: Element,
  stats?: ScribbitStats
): string {
  return `doodle-${element}-${doodleStatsSignature(stats)}-${spriteKey}`;
}

// Bake one transparent 512px mascot texture. The dominant stat controls its
// anatomical archetype while all four stats continuously tune the proportions.
export function generateDoodleTexture(
  scene: Scene,
  spriteKey: string,
  element: Element,
  stats?: ScribbitStats
): string {
  const key = doodleKey(spriteKey, element, stats);
  if (scene.textures.exists(key)) return key;

  const style = ELEMENT_STYLES[element];
  const plan = createProceduralDoodlePlan(spriteKey, stats);
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  drawAnatomyBehindBody(graphics, plan, style.primary);
  drawBody(graphics, plan, style.soft);
  drawAnatomyOnBody(graphics, plan, style.primary);
  drawFace(graphics, plan);

  graphics.generateTexture(key, PROCEDURAL_DOODLE_SIZE, PROCEDURAL_DOODLE_SIZE);
  graphics.destroy();
  return key;
}
