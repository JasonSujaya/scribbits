// Pure geometry for deterministic community-art fallbacks. Named founders use
// authored canvas characters; this keeps unknown/missing player art readable
// without inventing nondeterministic shapes.

import type { ScribbitStats } from '../../shared/arena';
import { hashStringToUint32 } from '../../shared/stablehash';
import { selectDominantStat } from '../../shared/combat/selection';
import type { DominantStat } from '../../shared/combat/types';

export const PROCEDURAL_DOODLE_SIZE = 512;

export type DoodlePoint = Readonly<{ x: number; y: number }>;
export type DoodleCircle = Readonly<{
  center: DoodlePoint;
  radius: number;
}>;
export type DoodleTriangle = readonly [DoodlePoint, DoodlePoint, DoodlePoint];

export type DoodleEye = Readonly<{
  white: DoodleCircle;
  pupil: DoodleCircle;
}>;

export type DoodleAnatomy =
  | Readonly<{ kind: 'neutral' }>
  | Readonly<{
      kind: 'grounded-belly';
      bellyBands: readonly (readonly [DoodlePoint, DoodlePoint, DoodlePoint])[];
    }>
  | Readonly<{
      kind: 'quill-crest';
      quills: readonly DoodleTriangle[];
    }>
  | Readonly<{
      kind: 'streamer-tail';
      tailPoints: readonly DoodlePoint[];
    }>
  | Readonly<{
      kind: 'patchwork-crest';
      crest: readonly DoodleCircle[];
      patches: readonly DoodleCircle[];
    }>;

export type ProceduralDoodlePlan = Readonly<{
  trait: DominantStat | 'neutral';
  stats: ScribbitStats;
  statsSignature: string;
  bodyCenter: DoodlePoint;
  bodyRadiusX: number;
  bodyRadiusY: number;
  bodyPoints: readonly DoodlePoint[];
  facing: -1 | 1;
  legs: readonly DoodleCircle[];
  eyes: readonly DoodleEye[];
  mouth: readonly [DoodlePoint, DoodlePoint, DoodlePoint];
  anatomy: DoodleAnatomy;
}>;

const NEUTRAL_STATS: ScribbitStats = Object.freeze({
  chonk: 25,
  spike: 25,
  zip: 25,
  charm: 25,
});

const clamp = (value: number, minimum: number, maximum: number): number => {
  return Math.max(minimum, Math.min(maximum, value));
};

const safeStat = (value: number): number => {
  return Number.isFinite(value) ? Math.round(clamp(value, 0, 100)) : 25;
};

const sanitizeDoodleStats = (stats?: ScribbitStats): ScribbitStats => {
  if (!stats) return { ...NEUTRAL_STATS };
  return {
    chonk: safeStat(stats.chonk),
    spike: safeStat(stats.spike),
    zip: safeStat(stats.zip),
    charm: safeStat(stats.charm),
  };
};

export function doodleStatsSignature(stats?: ScribbitStats): string {
  if (!stats) return 'neutral';
  const safeStats = sanitizeDoodleStats(stats);
  return [
    safeStats.chonk,
    safeStats.spike,
    safeStats.zip,
    safeStats.charm,
  ].join('-');
}

// Mulberry32 keeps every fallback identity visually stable across sessions.
const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const clampPoint = (point: DoodlePoint): DoodlePoint => {
  const safeMargin = 24;
  return {
    x: clamp(point.x, safeMargin, PROCEDURAL_DOODLE_SIZE - safeMargin),
    y: clamp(point.y, safeMargin, PROCEDURAL_DOODLE_SIZE - safeMargin),
  };
};

const createBodyPoints = (
  trait: ProceduralDoodlePlan['trait'],
  center: DoodlePoint,
  radiusX: number,
  radiusY: number,
  stats: ScribbitStats,
  facing: -1 | 1,
  random: () => number
): DoodlePoint[] => {
  const steps = trait === 'spike' ? 24 : 48;
  const lobeCount = 3 + Math.floor(stats.charm / 18);
  const phase = random() * Math.PI * 2;
  const points: DoodlePoint[] = [];

  for (let step = 0; step < steps; step += 1) {
    const angle = (Math.PI * 2 * step) / steps - Math.PI / 2;
    const baseWobble =
      Math.sin(angle * lobeCount + phase) *
      (0.025 + stats.charm / 1_100 + stats.spike / 2_000);
    let radialScale = 1 + baseWobble;
    let horizontalScale = 1;
    let verticalScale = 1;

    if (trait === 'spike') {
      radialScale *= step % 2 === 0 ? 1.13 + stats.spike / 340 : 0.84;
    } else if (trait === 'zip') {
      const facesFront = Math.cos(angle) * facing;
      horizontalScale *=
        1 + Math.max(0, facesFront) * 0.16 - Math.max(0, -facesFront) * 0.07;
    } else if (trait === 'charm') {
      radialScale *=
        1 +
        Math.sin(angle * (6 + Math.floor(stats.charm / 25)) + phase) *
          (0.07 + stats.charm / 650);
    } else if (trait === 'chonk' && Math.sin(angle) > 0) {
      verticalScale *= 0.95;
    }

    points.push(
      clampPoint({
        x: center.x + Math.cos(angle) * radiusX * radialScale * horizontalScale,
        y: center.y + Math.sin(angle) * radiusY * radialScale * verticalScale,
      })
    );
  }

  return points;
};

const createLegs = (
  trait: ProceduralDoodlePlan['trait'],
  center: DoodlePoint,
  radiusX: number,
  radiusY: number,
  stats: ScribbitStats,
  random: () => number
): DoodleCircle[] => {
  const legCount =
    trait === 'chonk' ? 4 : trait === 'zip' ? 2 : 2 + Math.floor(random() * 2);
  const footRadius = 13 + stats.chonk * 0.1;
  return Array.from({ length: legCount }, (_, legIndex) => {
    const horizontalPosition =
      legCount === 1 ? 0 : legIndex / (legCount - 1) - 0.5;
    return {
      center: clampPoint({
        x: center.x + horizontalPosition * radiusX * 1.15,
        y: center.y + radiusY * 0.9,
      }),
      radius: footRadius,
    };
  });
};

const createEyes = (
  center: DoodlePoint,
  radiusX: number,
  radiusY: number,
  stats: ScribbitStats,
  facing: -1 | 1,
  random: () => number
): DoodleEye[] => {
  const eyeRadius = 27 + random() * 7 + stats.charm * 0.04;
  const eyeGap = radiusX * 0.29;
  const forwardShift = facing * stats.zip * 0.12;
  return [-1, 1].map((direction) => {
    const eyeCenter = {
      x: center.x + direction * eyeGap + forwardShift,
      y: center.y - radiusY * 0.2,
    };
    const pupilRadius = eyeRadius * 0.4;
    return {
      white: { center: eyeCenter, radius: eyeRadius },
      pupil: {
        center: {
          x: eyeCenter.x + facing * eyeRadius * 0.2,
          y: eyeCenter.y + (random() - 0.5) * eyeRadius * 0.22,
        },
        radius: pupilRadius,
      },
    };
  });
};

const createGroundedBelly = (
  center: DoodlePoint,
  radiusX: number,
  radiusY: number
): DoodleAnatomy => {
  const bellyBands = [0.27, 0.43].map((verticalPosition) => {
    const y = center.y + radiusY * verticalPosition;
    return [
      { x: center.x - radiusX * 0.42, y },
      { x: center.x, y: y + radiusY * 0.055 },
      { x: center.x + radiusX * 0.42, y },
    ] as const;
  });
  return { kind: 'grounded-belly', bellyBands };
};

const createQuillCrest = (
  center: DoodlePoint,
  radiusX: number,
  radiusY: number,
  stats: ScribbitStats
): DoodleAnatomy => {
  const quillCount = 3 + Math.floor(stats.spike / 28);
  const angles = Array.from({ length: quillCount }, (_, index) => {
    const progress = quillCount === 1 ? 0.5 : index / (quillCount - 1);
    return -Math.PI * 0.82 + progress * Math.PI * 0.64;
  });
  const quills = angles.map((angle): DoodleTriangle => {
    const baseCenter = {
      x: center.x + Math.cos(angle) * radiusX * 0.78,
      y: center.y + Math.sin(angle) * radiusY * 0.78,
    };
    const perpendicularX = -Math.sin(angle) * 15;
    const perpendicularY = Math.cos(angle) * 15;
    const tipDistance = 1.13 + stats.spike / 420;
    return [
      clampPoint({
        x: baseCenter.x + perpendicularX,
        y: baseCenter.y + perpendicularY,
      }),
      clampPoint({
        x: center.x + Math.cos(angle) * radiusX * tipDistance,
        y: center.y + Math.sin(angle) * radiusY * tipDistance,
      }),
      clampPoint({
        x: baseCenter.x - perpendicularX,
        y: baseCenter.y - perpendicularY,
      }),
    ];
  });
  return { kind: 'quill-crest', quills };
};

const createStreamerTail = (
  center: DoodlePoint,
  radiusX: number,
  radiusY: number,
  stats: ScribbitStats,
  facing: -1 | 1
): DoodleAnatomy => {
  const rearX = center.x - facing * radiusX * 0.8;
  const tailLength = 44 + stats.zip * 0.35;
  return {
    kind: 'streamer-tail',
    tailPoints: [
      clampPoint({ x: rearX, y: center.y - radiusY * 0.3 }),
      clampPoint({
        x: rearX - facing * tailLength,
        y: center.y - radiusY * 0.48,
      }),
      clampPoint({
        x: rearX - facing * tailLength * 0.72,
        y: center.y,
      }),
      clampPoint({
        x: rearX - facing * tailLength,
        y: center.y + radiusY * 0.45,
      }),
      clampPoint({ x: rearX, y: center.y + radiusY * 0.28 }),
    ],
  };
};

const createPatchworkCrest = (
  center: DoodlePoint,
  radiusX: number,
  radiusY: number,
  stats: ScribbitStats,
  random: () => number
): DoodleAnatomy => {
  const crest = [-1, 0, 1].map((offset) => ({
    center: clampPoint({
      x: center.x + offset * radiusX * 0.23,
      y: center.y - radiusY * (0.88 + (offset === 0 ? 0.08 : 0)),
    }),
    radius: 27 + stats.charm * 0.08,
  }));
  const patchCount = 3 + Math.floor(stats.charm / 18);
  const patches = Array.from({ length: patchCount }, (_, patchIndex) => {
    const angle =
      (Math.PI * 2 * patchIndex) / patchCount + random() * 0.45 + 0.25;
    const distance = 0.3 + random() * 0.22;
    return {
      center: {
        x: center.x + Math.cos(angle) * radiusX * distance,
        y: center.y + Math.sin(angle) * radiusY * distance + radiusY * 0.08,
      },
      radius: 19 + random() * 12,
    };
  });
  return { kind: 'patchwork-crest', crest, patches };
};

const createAnatomy = (
  trait: ProceduralDoodlePlan['trait'],
  center: DoodlePoint,
  radiusX: number,
  radiusY: number,
  stats: ScribbitStats,
  facing: -1 | 1,
  random: () => number
): DoodleAnatomy => {
  switch (trait) {
    case 'chonk':
      return createGroundedBelly(center, radiusX, radiusY);
    case 'spike':
      return createQuillCrest(center, radiusX, radiusY, stats);
    case 'zip':
      return createStreamerTail(center, radiusX, radiusY, stats, facing);
    case 'charm':
      return createPatchworkCrest(center, radiusX, radiusY, stats, random);
    default:
      return { kind: 'neutral' };
  }
};

export function createProceduralDoodlePlan(
  spriteKey: string,
  stats?: ScribbitStats
): ProceduralDoodlePlan {
  const safeStats = sanitizeDoodleStats(stats);
  const statsSignature = doodleStatsSignature(stats);
  const random = seededRandom(
    hashStringToUint32(`${spriteKey}:${statsSignature}`)
  );
  const trait = stats ? selectDominantStat(safeStats) : 'neutral';
  const facing: -1 | 1 = random() < 0.5 ? -1 : 1;
  const center = {
    x: PROCEDURAL_DOODLE_SIZE / 2 + (trait === 'zip' ? facing * 10 : 0),
    y: PROCEDURAL_DOODLE_SIZE / 2 + 12 + (random() - 0.5) * 10,
  };

  const traitWidthMultiplier =
    trait === 'chonk'
      ? 1.08
      : trait === 'zip'
        ? 1.1
        : trait === 'charm'
          ? 0.96
          : 0.98;
  const traitHeightMultiplier =
    trait === 'chonk'
      ? 1.03
      : trait === 'zip'
        ? 0.78
        : trait === 'spike'
          ? 1.02
          : 1;
  const bodyRadiusX = clamp(
    (132 + safeStats.chonk * 0.75 + safeStats.zip * 0.18) *
      traitWidthMultiplier,
    126,
    184
  );
  const bodyRadiusY = clamp(
    (136 +
      safeStats.chonk * 0.24 +
      safeStats.charm * 0.2 -
      safeStats.zip * 0.35) *
      traitHeightMultiplier,
    104,
    166
  );

  const eyes = createEyes(
    center,
    bodyRadiusX,
    bodyRadiusY,
    safeStats,
    facing,
    random
  );
  const mouthY = center.y + bodyRadiusY * 0.28;
  const mouthWidth = bodyRadiusX * 0.34;

  return {
    trait,
    stats: safeStats,
    statsSignature,
    bodyCenter: center,
    bodyRadiusX,
    bodyRadiusY,
    bodyPoints: createBodyPoints(
      trait,
      center,
      bodyRadiusX,
      bodyRadiusY,
      safeStats,
      facing,
      random
    ),
    facing,
    legs: createLegs(
      trait,
      center,
      bodyRadiusX,
      bodyRadiusY,
      safeStats,
      random
    ),
    eyes,
    mouth: [
      { x: center.x - mouthWidth, y: mouthY },
      { x: center.x, y: mouthY + 16 + safeStats.charm * 0.08 },
      { x: center.x + mouthWidth, y: mouthY },
    ],
    anatomy: createAnatomy(
      trait,
      center,
      bodyRadiusX,
      bodyRadiusY,
      safeStats,
      facing,
      random
    ),
  };
}
