import type { Element, ScribbitStats } from './arena';
import { STAT_BUDGET, STAT_MAX, STAT_MIN } from './arena';

export type RgbaPixelData = Uint8Array | Uint8ClampedArray | readonly number[];

export type PixelField = {
  data: RgbaPixelData;
  width: number;
  height: number;
};

export type AnalyzerResult = {
  stats: ScribbitStats;
  element: Element;
  inkRatio: number;
  inkedPixels: number;
};

const alphaInkThreshold = 32;
const hueBucketDegrees = 30;
const hueCoverageMin = 0.02;
const maxDistinctHues = 6;
const bucketCount = 360 / hueBucketDegrees;

export const MIN_INK_PIXELS = 250;

export type ScanResult = {
  inkedPixels: number;
  totalPixels: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hueBuckets: number[];
  inked: Uint8Array;
};

export function hueToElement(hueDegrees: number): Element {
  const hue = ((hueDegrees % 360) + 360) % 360;
  if (hue < 45 || hue >= 330) {
    return 'ember';
  }
  if (hue < 75) {
    return 'storm';
  }
  if (hue < 165) {
    return 'moss';
  }
  if (hue < 255) {
    return 'tide';
  }
  return 'storm';
}

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
    if (max === rn) {
      hue = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      hue = (bn - rn) / delta + 2;
    } else {
      hue = (rn - gn) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  const sat = max === 0 ? 0 : delta / max;
  return { hue, sat, val: max };
}

export function scanPixels(field: PixelField): ScanResult {
  const { data, width, height } = field;
  const totalPixels = width * height;
  const inked = new Uint8Array(totalPixels);
  const hueBuckets = new Array<number>(bucketCount).fill(0);

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
      if (alpha < alphaInkThreshold) {
        continue;
      }

      inked[pixelIndex] = 1;
      inkedPixels += 1;
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }

      const r = data[offset] ?? 0;
      const g = data[offset + 1] ?? 0;
      const b = data[offset + 2] ?? 0;
      const { hue, sat, val } = rgbToHsv(r, g, b);

      if (sat >= 0.25 && val >= 0.2) {
        const bucket = Math.min(
          bucketCount - 1,
          Math.floor(hue / hueBucketDegrees)
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

export function countOutlinePixels(
  inked: Uint8Array,
  width: number,
  height: number
): number {
  let outline = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (inked[y * width + x] !== 1) {
        continue;
      }

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

export function jaggednessFrom(outlinePx: number, inkArea: number): number {
  if (inkArea <= 0) {
    return 1;
  }

  const smoothPerimeter = 2 * Math.sqrt(Math.PI * inkArea);
  if (smoothPerimeter <= 0) {
    return 1;
  }

  return clamp(outlinePx / smoothPerimeter, 1, 3);
}

export function distinctHues(hueBuckets: number[]): number {
  const coloredTotal = hueBuckets.reduce((sum, count) => sum + count, 0);
  if (coloredTotal <= 0) {
    return 1;
  }

  let distinct = 0;
  for (const count of hueBuckets) {
    if (count / coloredTotal > hueCoverageMin) {
      distinct += 1;
    }
  }

  return Math.max(1, Math.min(maxDistinctHues, distinct));
}

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

  if (bestCount <= 0) {
    return 'ember';
  }

  const hueDegrees = bestBucket * hueBucketDegrees + hueBucketDegrees / 2;
  return hueToElement(hueDegrees);
}

export function normalizeStats(raw: {
  chonk: number;
  spike: number;
  zip: number;
  charm: number;
}): ScribbitStats {
  const keys = ['chonk', 'spike', 'zip', 'charm'] as const;
  const rawValues = keys.map((key) => Math.max(0, raw[key]));
  const rawSum = rawValues.reduce((sum, value) => sum + value, 0);
  const fractions =
    rawSum > 0
      ? rawValues.map((value) => value / rawSum)
      : rawValues.map(() => 0.25);

  let scaled = fractions.map((fraction) => {
    return clamp(fraction * STAT_BUDGET, STAT_MIN, STAT_MAX);
  });
  scaled = repairSum(scaled, STAT_BUDGET);

  const rounded = largestRemainderRound(scaled, STAT_BUDGET);

  return {
    chonk: rounded[0] ?? STAT_MIN,
    spike: rounded[1] ?? STAT_MIN,
    zip: rounded[2] ?? STAT_MIN,
    charm: rounded[3] ?? STAT_MIN,
  };
}

export function analyze(field: PixelField): AnalyzerResult {
  const scan = scanPixels(field);
  const { inkedPixels, totalPixels, hueBuckets, inked } = scan;

  if (inkedPixels < MIN_INK_PIXELS) {
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
  const bboxArea = Math.max(1, bboxWidth * bboxHeight);
  const footprint = bboxArea / totalPixels;
  const fillDensity = inkedPixels / bboxArea;
  const outlinePx = countOutlinePixels(inked, field.width, field.height);
  const jaggedness = jaggednessFrom(outlinePx, inkedPixels);
  const hues = distinctHues(hueBuckets);
  const spikeShape = (jaggedness - 1) / 2;
  const strokeWeight = clamp(fillDensity / 0.25, 0.22, 1);
  const raw = {
    // Big filled blobs and thick strokes should read as CHONK. Raw ink ratio
    // alone made normal line art too tiny to compete.
    chonk: clamp(inkRatio * 2.4 + fillDensity * 0.55, 0, 1),
    // The old outline/area ratio treated every thin line drawing as max SPIKE.
    // Keep jagged pointy silhouettes valuable, but dampen plain outline strokes.
    spike: clamp(spikeShape * strokeWeight, 0, 0.72),
    zip: 1 - clamp(footprint, 0, 1),
    charm: hues / maxDistinctHues,
  };

  return {
    stats: normalizeStats(raw),
    element: dominantElement(hueBuckets),
    inkRatio,
    inkedPixels,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function repairSum(values: number[], target: number): number[] {
  const result = [...values];
  const headroomUp = (value: number): number => STAT_MAX - value;
  const headroomDown = (value: number): number => value - STAT_MIN;

  for (let guard = 0; guard < 64; guard += 1) {
    const sum = result.reduce((total, value) => total + value, 0);
    const diff = target - sum;
    if (Math.abs(diff) < 1e-6) {
      break;
    }

    if (diff > 0) {
      const totalHeadroom = result.reduce((total, value) => {
        return total + headroomUp(value);
      }, 0);
      if (totalHeadroom <= 1e-6) {
        break;
      }
      for (let index = 0; index < result.length; index += 1) {
        const current = result[index] ?? 0;
        const share = (headroomUp(current) / totalHeadroom) * diff;
        result[index] = clamp(current + share, STAT_MIN, STAT_MAX);
      }
    } else {
      const totalHeadroom = result.reduce((total, value) => {
        return total + headroomDown(value);
      }, 0);
      if (totalHeadroom <= 1e-6) {
        break;
      }
      for (let index = 0; index < result.length; index += 1) {
        const current = result[index] ?? 0;
        const share = (headroomDown(current) / totalHeadroom) * diff;
        result[index] = clamp(current + share, STAT_MIN, STAT_MAX);
      }
    }
  }

  return result;
}

function largestRemainderRound(values: number[], target: number): number[] {
  const floors = values.map((value) => Math.floor(value));
  let remaining = target - floors.reduce((sum, value) => sum + value, 0);
  const remainders = values.map((value, index) => {
    return {
      index,
      frac: value - Math.floor(value),
    };
  });
  remainders.sort((left, right) => right.frac - left.frac);

  const result = [...floors];
  let cursor = 0;
  while (remaining > 0 && remainders.length > 0) {
    const targetRemainder = remainders[cursor % remainders.length];
    if (targetRemainder) {
      const current = result[targetRemainder.index] ?? 0;
      if (current < STAT_MAX) {
        result[targetRemainder.index] = current + 1;
        remaining -= 1;
      }
    }
    cursor += 1;
    if (cursor > remainders.length * 4) {
      break;
    }
  }

  return result;
}
