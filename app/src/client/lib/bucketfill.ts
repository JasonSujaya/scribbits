import type { RgbColor } from './coloreraser';

const TRANSPARENT_ALPHA_MAX = 8;
const COLOR_CHANNEL_TOLERANCE = 8;

const isNear = (first: number, second: number): boolean =>
  Math.abs(first - second) <= COLOR_CHANNEL_TOLERANCE;

/**
 * Flood-fills one four-way-connected pixel region in-place.
 *
 * The Draw canvas keeps blank paper transparent, so every visible stroke pixel
 * becomes a hard boundary when filling blank space. Existing solid fills can
 * also be recolored without crossing differently colored outlines.
 */
export function floodFillRegion(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillColor: RgbColor
): number {
  if (
    width <= 0 ||
    height <= 0 ||
    pixels.length < width * height * 4 ||
    !Number.isFinite(startX) ||
    !Number.isFinite(startY)
  ) {
    return 0;
  }

  const x = Math.floor(startX);
  const y = Math.floor(startY);
  if (x < 0 || x >= width || y < 0 || y >= height) return 0;

  const startPixel = y * width + x;
  const startOffset = startPixel * 4;
  const targetRed = pixels[startOffset] ?? 0;
  const targetGreen = pixels[startOffset + 1] ?? 0;
  const targetBlue = pixels[startOffset + 2] ?? 0;
  const targetAlpha = pixels[startOffset + 3] ?? 0;
  const targetIsBlank = targetAlpha <= TRANSPARENT_ALPHA_MAX;

  if (
    !targetIsBlank &&
    targetAlpha === 255 &&
    targetRed === fillColor[0] &&
    targetGreen === fillColor[1] &&
    targetBlue === fillColor[2]
  ) {
    return 0;
  }

  const matchesTarget = (pixel: number): boolean => {
    const offset = pixel * 4;
    const alpha = pixels[offset + 3] ?? 0;
    if (targetIsBlank) return alpha <= TRANSPARENT_ALPHA_MAX;
    return (
      isNear(pixels[offset] ?? 0, targetRed) &&
      isNear(pixels[offset + 1] ?? 0, targetGreen) &&
      isNear(pixels[offset + 2] ?? 0, targetBlue) &&
      isNear(alpha, targetAlpha)
    );
  };

  const pixelCount = width * height;
  const queue = new Uint32Array(pixelCount);
  const queued = new Uint8Array(pixelCount);
  let queueHead = 0;
  let queueTail = 0;
  let changedPixels = 0;

  queue[queueTail] = startPixel;
  queueTail += 1;
  queued[startPixel] = 1;

  const enqueue = (pixel: number): void => {
    if (queued[pixel] === 1) return;
    queued[pixel] = 1;
    queue[queueTail] = pixel;
    queueTail += 1;
  };

  while (queueHead < queueTail) {
    const pixel = queue[queueHead];
    queueHead += 1;
    if (pixel === undefined || !matchesTarget(pixel)) continue;

    const offset = pixel * 4;
    pixels[offset] = fillColor[0];
    pixels[offset + 1] = fillColor[1];
    pixels[offset + 2] = fillColor[2];
    pixels[offset + 3] = 255;
    changedPixels += 1;

    const pixelX = pixel % width;
    if (pixelX > 0) enqueue(pixel - 1);
    if (pixelX + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < pixelCount) enqueue(pixel + width);
  }

  return changedPixels;
}
