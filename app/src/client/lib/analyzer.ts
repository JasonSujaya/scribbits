// Deterministic drawing analyzer — the SHAPE of a drawing becomes its stat sheet.
// Spec of record: plans/v3-scribbits-arena.md ("Analyzer spec").
//
// This is pure UX: it must agree with the server's intent, but the server always
// re-normalizes whatever the client submits (clamp to [10,55], sum to 100). We
// still normalize here so the live preview matches the final card as closely as
// possible.
//
// Every function is a pure function of its inputs (ImageData / numbers) so the
// whole pipeline is unit-testable without a browser: build a fake ImageData-like
// { data, width, height } and call analyze().

import type { Element, ScribbitStats } from '../../shared/arena';
import { STAT_BUDGET, STAT_MAX, STAT_MIN } from '../../shared/arena';

// A minimal structural view of ImageData so tests can pass plain objects.
export type PixelField = {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
};

export type AnalyzerResult = {
  stats: ScribbitStats;
  element: Element;
  inkRatio: number; // 0..1 fraction of canvas that is inked
  inkedPixels: number; // absolute inked pixel count (submit-gate uses this)
};

// A pixel counts as "inked" when it is opaque enough to be a real stroke.
const ALPHA_INK_THRESHOLD = 32;

// Hue buckets are 30° wide; a hue is "present" if it covers >2% of the ink.
const HUE_BUCKET_DEGREES = 30;
const HUE_COVERAGE_MIN = 0.02;
const MAX_DISTINCT_HUES = 6;

// Below this many inked pixels the canvas is effectively empty — the Draw scene
// uses this to block submission with a playful nudge instead of shipping a blank.
export const MIN_INK_PIXELS = 250;

// ---------------------------------------------------------------------------
// Element mapping. Dominant hue bucket → element.
//   ember  reds/oranges     (~   0°..45°  and 330°..360°)
//   storm  yellows/purples  (~  45°..75°  and 255°..330°)
//   moss   greens           (~  75°..165°)
//   tide   blues/cyans      (~ 165°..255°)
// ---------------------------------------------------------------------------
export function hueToElement(hueDegrees: number): Element {
  const hue = ((hueDegrees % 360) + 360) % 360;
  if (hue < 45 || hue >= 330) return 'ember';
  if (hue < 75) return 'storm'; // yellow
  if (hue < 165) return 'moss';
  if (hue < 255) return 'tide';
  return 'storm'; // purple
}

// Standard RGB→HSV hue in degrees; saturation/value in 0..1.
export function rgbToHsv(
  r: number,
  g: number,
  b: number
): { hue: number; sat: number; val: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === rn) hue = ((gn - bn) / delta) % 6;
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const sat = max === 0 ? 0 : delta / max;
  return { hue, sat, val: max };
}

type ScanResult = {
  inkedPixels: number;
  totalPixels: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hueBuckets: number[]; // count of inked, colorful px per 30° bucket (12 buckets)
  // Per-pixel inked flags, row-major, for the outline pass.
  inked: Uint8Array;
};

const BUCKET_COUNT = 360 / HUE_BUCKET_DEGREES;

// Single pass over the pixels: ink count, bounding box, and hue histogram.
export function scanPixels(field: PixelField): ScanResult {
  const { data, width, height } = field;
  const totalPixels = width * height;
  const inked = new Uint8Array(totalPixels);
  const hueBuckets = new Array<number>(BUCKET_COUNT).fill(0);

  let inkedPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 4;
      const alpha = data[offset + 3] ?? 0;
      if (alpha < ALPHA_INK_THRESHOLD) continue;

      inked[pixelIndex] = 1;
      inkedPixels += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      const r = data[offset] ?? 0;
      const g = data[offset + 1] ?? 0;
      const b = data[offset + 2] ?? 0;
      const { hue, sat, val } = rgbToHsv(r, g, b);
      // Ignore near-black outline ink and near-white/gray from hue counting;
      // element comes from actual color, not the black outline pen.
      if (sat >= 0.25 && val >= 0.2) {
        const bucket = Math.min(
          BUCKET_COUNT - 1,
          Math.floor(hue / HUE_BUCKET_DEGREES)
        );
        hueBuckets[bucket] = (hueBuckets[bucket] ?? 0) + 1;
      }
    }
  }

  return {
    inkedPixels,
    totalPixels,
    minX,
    minY,
    maxX,
    maxY,
    hueBuckets,
    inked,
  };
}

// Outline pixels = inked pixels that touch at least one non-inked 4-neighbor.
// Used to measure jaggedness (perimeter relative to a smooth blob's perimeter).
export function countOutlinePixels(
  inked: Uint8Array,
  width: number,
  height: number
): number {
  let outline = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (inked[y * width + x] !== 1) continue;
      const up = y > 0 ? inked[(y - 1) * width + x] : 0;
      const down = y < height - 1 ? inked[(y + 1) * width + x] : 0;
      const left = x > 0 ? inked[y * width + (x - 1)] : 0;
      const right = x < width - 1 ? inked[y * width + (x + 1)] : 0;
      if (up !== 1 || down !== 1 || left !== 1 || right !== 1) {
        outline += 1;
      }
    }
  }
  return outline;
}

// jaggedness = outlinePx / (2·√(π·inkArea)) clamped 1..3.
// The denominator is the perimeter of a perfect disk of the same area, so a
// smooth blob scores ~1 and a spiky/scattered shape scores higher.
export function jaggednessFrom(outlinePx: number, inkArea: number): number {
  if (inkArea <= 0) return 1;
  const smoothPerimeter = 2 * Math.sqrt(Math.PI * inkArea);
  if (smoothPerimeter <= 0) return 1;
  return clamp(outlinePx / smoothPerimeter, 1, 3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Count hue buckets whose coverage exceeds HUE_COVERAGE_MIN of colored ink.
export function distinctHues(hueBuckets: number[]): number {
  const coloredTotal = hueBuckets.reduce((sum, count) => sum + count, 0);
  if (coloredTotal <= 0) return 1;
  let distinct = 0;
  for (const count of hueBuckets) {
    if (count / coloredTotal > HUE_COVERAGE_MIN) distinct += 1;
  }
  return Math.max(1, Math.min(MAX_DISTINCT_HUES, distinct));
}

// Dominant hue bucket → element. Ties broken by "charm order": lowest bucket
// index wins (deterministic, and stated in the spec as the tie rule).
export function dominantElement(hueBuckets: number[]): Element {
  let bestBucket = 0;
  let bestCount = -1;
  for (let bucket = 0; bucket < hueBuckets.length; bucket += 1) {
    const count = hueBuckets[bucket] ?? 0;
    if (count > bestCount) {
      bestCount = count;
      bestBucket = bucket;
    }
  }
  if (bestCount <= 0) return 'ember'; // black-only drawing → default ember
  const hueDegrees = bestBucket * HUE_BUCKET_DEGREES + HUE_BUCKET_DEGREES / 2;
  return hueToElement(hueDegrees);
}

// Normalize four raw non-negative scores into integer stats that sum to exactly
// STAT_BUDGET, with each clamped to [STAT_MIN, STAT_MAX]. Deterministic: excess
// from rounding is assigned to the largest-fractional-remainder stats.
export function normalizeStats(raw: {
  chonk: number;
  spike: number;
  zip: number;
  charm: number;
}): ScribbitStats {
  const keys = ['chonk', 'spike', 'zip', 'charm'] as const;
  const rawValues = keys.map((key) => Math.max(0, raw[key]));
  const rawSum = rawValues.reduce((sum, value) => sum + value, 0);

  // All-zero raw → even split.
  const fractions =
    rawSum > 0
      ? rawValues.map((value) => value / rawSum)
      : rawValues.map(() => 0.25);

  // Scale to budget, clamp, then repair the sum so it lands exactly on budget.
  let scaled = fractions.map((fraction) =>
    clamp(fraction * STAT_BUDGET, STAT_MIN, STAT_MAX)
  );
  scaled = repairSum(scaled, STAT_BUDGET);

  // Round to integers while preserving the sum via largest-remainder.
  const rounded = largestRemainderRound(scaled, STAT_BUDGET);

  return {
    chonk: rounded[0] ?? STAT_MIN,
    spike: rounded[1] ?? STAT_MIN,
    zip: rounded[2] ?? STAT_MIN,
    charm: rounded[3] ?? STAT_MIN,
  };
}

// Nudge a clamped vector so it sums to target, respecting [STAT_MIN, STAT_MAX].
function repairSum(values: number[], target: number): number[] {
  const result = [...values];
  const headroomUp = (value: number): number => STAT_MAX - value;
  const headroomDown = (value: number): number => value - STAT_MIN;

  for (let guard = 0; guard < 64; guard += 1) {
    const sum = result.reduce((total, value) => total + value, 0);
    const diff = target - sum;
    if (Math.abs(diff) < 1e-6) break;

    if (diff > 0) {
      const totalHeadroom = result.reduce((t, v) => t + headroomUp(v), 0);
      if (totalHeadroom <= 1e-6) break;
      for (let index = 0; index < result.length; index += 1) {
        const share = (headroomUp(result[index] ?? 0) / totalHeadroom) * diff;
        result[index] = clamp((result[index] ?? 0) + share, STAT_MIN, STAT_MAX);
      }
    } else {
      const totalHeadroom = result.reduce((t, v) => t + headroomDown(v), 0);
      if (totalHeadroom <= 1e-6) break;
      for (let index = 0; index < result.length; index += 1) {
        const share = (headroomDown(result[index] ?? 0) / totalHeadroom) * diff;
        result[index] = clamp((result[index] ?? 0) + share, STAT_MIN, STAT_MAX);
      }
    }
  }
  return result;
}

// Round floats to integers summing to target (Hamilton / largest-remainder).
function largestRemainderRound(values: number[], target: number): number[] {
  const floors = values.map((value) => Math.floor(value));
  let remaining = target - floors.reduce((sum, value) => sum + value, 0);
  const remainders = values.map((value, index) => ({
    index,
    frac: value - Math.floor(value),
  }));
  remainders.sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  let cursor = 0;
  while (remaining > 0 && remainders.length > 0) {
    const target2 = remainders[cursor % remainders.length];
    if (target2) {
      const current = result[target2.index] ?? 0;
      if (current < STAT_MAX) {
        result[target2.index] = current + 1;
        remaining -= 1;
      }
    }
    cursor += 1;
    if (cursor > remainders.length * 4) break; // safety
  }
  return result;
}

// The whole pipeline: raw ImageData-like field → stats + element.
export function analyze(field: PixelField): AnalyzerResult {
  const scan = scanPixels(field);
  const { inkedPixels, totalPixels, hueBuckets, inked, width, height } = {
    ...scan,
    width: field.width,
    height: field.height,
  };

  if (inkedPixels < MIN_INK_PIXELS) {
    // Empty-ish canvas: return an even split so bars sit at rest; caller blocks
    // submission using inkedPixels < MIN_INK_PIXELS.
    return {
      stats: normalizeStats({ chonk: 1, spike: 1, zip: 1, charm: 1 }),
      element: 'ember',
      inkRatio: totalPixels > 0 ? inkedPixels / totalPixels : 0,
      inkedPixels,
    };
  }

  const inkRatio = inkedPixels / totalPixels;
  const bboxWidth = scan.maxX - scan.minX + 1;
  const bboxHeight = scan.maxY - scan.minY + 1;
  const footprint = (bboxWidth * bboxHeight) / totalPixels;

  const outlinePx = countOutlinePixels(inked, width, height);
  const jaggedness = jaggednessFrom(outlinePx, inkedPixels);
  const hues = distinctHues(hueBuckets);

  // Raw scores per spec:
  const raw = {
    chonk: inkRatio, // more ink coverage → more HP
    spike: (jaggedness - 1) / 2, // jaggedness 1..3 → 0..1
    zip: 1 - clamp(footprint, 0, 1), // smaller footprint → faster
    charm: hues / MAX_DISTINCT_HUES, // more distinct hues → more crit
  };

  return {
    stats: normalizeStats(raw),
    element: dominantElement(hueBuckets),
    inkRatio,
    inkedPixels,
  };
}
