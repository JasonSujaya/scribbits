export type RgbColor = readonly [red: number, green: number, blue: number];

export type ColorEraserSegment = Readonly<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  radius: number;
}>;

export const COLOR_ERASER_TOLERANCE = 48;

export function parseHexColor(hexColor: string): RgbColor | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hexColor.trim());
  if (!match?.[1]) return null;
  const packedColor = Number.parseInt(match[1], 16);
  return [
    (packedColor >> 16) & 0xff,
    (packedColor >> 8) & 0xff,
    packedColor & 0xff,
  ];
}

export function pixelMatchesColor(
  red: number,
  green: number,
  blue: number,
  targetColor: RgbColor,
  tolerance = COLOR_ERASER_TOLERANCE
): boolean {
  const redDistance = red - targetColor[0];
  const greenDistance = green - targetColor[1];
  const blueDistance = blue - targetColor[2];
  return (
    redDistance * redDistance +
      greenDistance * greenDistance +
      blueDistance * blueDistance <=
    tolerance * tolerance
  );
}

// Mutates a bounded ImageData byte array. Callers crop the canvas to the
// segment bounds first, keeping pointer-move work proportional to brush size.
export function eraseMatchingColorSegment(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  segment: ColorEraserSegment,
  targetColor: RgbColor,
  tolerance = COLOR_ERASER_TOLERANCE
): number {
  if (width <= 0 || height <= 0 || segment.radius <= 0) return 0;

  const deltaX = segment.endX - segment.startX;
  const deltaY = segment.endY - segment.startY;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;
  const radiusSquared = segment.radius * segment.radius;
  let erasedPixels = 0;

  for (let pixelY = 0; pixelY < height; pixelY += 1) {
    for (let pixelX = 0; pixelX < width; pixelX += 1) {
      const sampleX = pixelX + 0.5;
      const sampleY = pixelY + 0.5;
      const projection =
        segmentLengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((sampleX - segment.startX) * deltaX +
                  (sampleY - segment.startY) * deltaY) /
                  segmentLengthSquared
              )
            );
      const nearestX = segment.startX + deltaX * projection;
      const nearestY = segment.startY + deltaY * projection;
      const distanceX = sampleX - nearestX;
      const distanceY = sampleY - nearestY;
      if (distanceX * distanceX + distanceY * distanceY > radiusSquared) {
        continue;
      }

      const pixelIndex = (pixelY * width + pixelX) * 4;
      const alpha = pixels[pixelIndex + 3] ?? 0;
      if (
        alpha === 0 ||
        !pixelMatchesColor(
          pixels[pixelIndex] ?? 0,
          pixels[pixelIndex + 1] ?? 0,
          pixels[pixelIndex + 2] ?? 0,
          targetColor,
          tolerance
        )
      ) {
        continue;
      }

      pixels[pixelIndex + 3] = 0;
      erasedPixels += 1;
    }
  }

  return erasedPixels;
}
