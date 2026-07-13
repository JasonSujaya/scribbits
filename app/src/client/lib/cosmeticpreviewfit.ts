export type CosmeticPreviewBounds = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type CosmeticPreviewFit = Readonly<{
  scale: number;
  offsetX: number;
  offsetY: number;
}>;

export function fitCosmeticPreviewBounds(
  bounds: CosmeticPreviewBounds,
  maxWidth: number,
  maxHeight: number,
  maxScale = 1
): CosmeticPreviewFit {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { scale: 1, offsetX: -centerX, offsetY: -centerY };
  }

  const scale = Math.min(
    Math.max(1, maxWidth) / bounds.width,
    Math.max(1, maxHeight) / bounds.height,
    Math.max(0.01, maxScale)
  );
  return {
    scale,
    offsetX: -centerX * scale,
    offsetY: -centerY * scale,
  };
}
