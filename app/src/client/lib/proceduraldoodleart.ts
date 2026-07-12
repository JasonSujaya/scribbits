// Phaser renderer for the pure plan in proceduraldoodleplan.ts. Founding
// Scribbits use their stats here; ordinary image failures stay neutral so a
// temporary network miss never invents a build for a player's drawing.

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

const colorHex = (color: number): string => {
  return `#${color.toString(16).padStart(6, '0')}`;
};

const drawCircle = (
  context: CanvasRenderingContext2D,
  circle: DoodleCircle,
  color: number,
  alpha = 1
): void => {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = colorHex(color);
  context.beginPath();
  context.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const drawTriangle = (
  context: CanvasRenderingContext2D,
  triangle: DoodleTriangle,
  fillColor: number
): void => {
  const [first, second, third] = triangle;
  context.fillStyle = colorHex(fillColor);
  context.strokeStyle = colorHex(INK);
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(first.x, first.y);
  context.lineTo(second.x, second.y);
  context.lineTo(third.x, third.y);
  context.closePath();
  context.fill();
  context.stroke();
};

const drawPolygon = (
  context: CanvasRenderingContext2D,
  points: readonly DoodlePoint[],
  fillColor: number,
  strokeColor: number,
  strokeWidth: number,
  alpha = 1
): void => {
  const first = points[0];
  if (!first) return;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = colorHex(fillColor);
  context.strokeStyle = colorHex(strokeColor);
  context.lineWidth = strokeWidth;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(first.x, first.y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
};

const drawAnatomyBehindBody = (
  context: CanvasRenderingContext2D,
  plan: ProceduralDoodlePlan,
  primaryColor: number
): void => {
  for (const leg of plan.legs) {
    drawCircle(context, leg, INK);
  }

  const anatomy = plan.anatomy;
  if (anatomy.kind === 'quill-crest') {
    anatomy.quills.forEach((quill) =>
      drawTriangle(context, quill, primaryColor)
    );
    return;
  }

  if (anatomy.kind === 'streamer-tail') {
    drawPolygon(context, anatomy.tailPoints, primaryColor, INK, 9, 0.9);
    return;
  }

  if (anatomy.kind === 'patchwork-crest') {
    anatomy.crest.forEach((petal, index) => {
      drawCircle(
        context,
        petal,
        PATCHWORK_COLORS[index % PATCHWORK_COLORS.length] ?? primaryColor
      );
      context.strokeStyle = colorHex(INK);
      context.lineWidth = 6;
      context.beginPath();
      context.arc(petal.center.x, petal.center.y, petal.radius, 0, Math.PI * 2);
      context.stroke();
    });
  }
};

const drawBody = (
  context: CanvasRenderingContext2D,
  plan: ProceduralDoodlePlan,
  bodyColor: number
): void => {
  drawPolygon(context, plan.bodyPoints, bodyColor, INK, 10);
};

const drawAnatomyOnBody = (
  context: CanvasRenderingContext2D,
  plan: ProceduralDoodlePlan,
  primaryColor: number
): void => {
  const anatomy = plan.anatomy;
  if (anatomy.kind === 'grounded-belly') {
    context.save();
    context.globalAlpha = 0.72;
    context.strokeStyle = colorHex(primaryColor);
    context.lineWidth = 8;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    for (const [start, middle, end] of anatomy.bellyBands) {
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(middle.x, middle.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    context.restore();
    return;
  }

  if (anatomy.kind === 'patchwork-crest') {
    anatomy.patches.forEach((patch, index) => {
      drawCircle(
        context,
        patch,
        PATCHWORK_COLORS[(index + 1) % PATCHWORK_COLORS.length] ?? primaryColor,
        0.82
      );
      context.save();
      context.globalAlpha = 0.65;
      context.strokeStyle = colorHex(INK);
      context.lineWidth = 4;
      context.beginPath();
      context.arc(patch.center.x, patch.center.y, patch.radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    });
  }
};

const drawFace = (
  context: CanvasRenderingContext2D,
  plan: ProceduralDoodlePlan
): void => {
  for (const eye of plan.eyes) {
    drawCircle(context, eye.white, PAPER);
    context.strokeStyle = colorHex(INK);
    context.lineWidth = 5;
    context.beginPath();
    context.arc(
      eye.white.center.x,
      eye.white.center.y,
      eye.white.radius,
      0,
      Math.PI * 2
    );
    context.stroke();
    drawCircle(context, eye.pupil, INK);
  }

  const [mouthStart, mouthMiddle, mouthEnd] = plan.mouth;
  context.strokeStyle = colorHex(INK);
  context.lineWidth = 6;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(mouthStart.x, mouthStart.y);
  context.lineTo(mouthMiddle.x, mouthMiddle.y);
  context.lineTo(mouthEnd.x, mouthEnd.y);
  context.stroke();
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
  const canvas = document.createElement('canvas');
  canvas.width = PROCEDURAL_DOODLE_SIZE;
  canvas.height = PROCEDURAL_DOODLE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Procedural doodle canvas is unavailable.');

  drawAnatomyBehindBody(context, plan, style.primary);
  drawBody(context, plan, style.soft);
  drawAnatomyOnBody(context, plan, style.primary);
  drawFace(context, plan);

  scene.textures.addCanvas(key, canvas);
  return key;
}
