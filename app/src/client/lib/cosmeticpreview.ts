import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type {
  CosmeticCatalogEntry,
  CosmeticPenCatalogEntry,
} from '../../shared/cosmetics';
import { drawAccessoryGraphics } from './accessories';
import { UI } from './theme';
import { label } from './ui';

export type CosmeticPreviewOptions = {
  scene: Scene;
  parent: Phaser.GameObjects.Container;
  entry: CosmeticCatalogEntry;
  x?: number;
  y: number;
  size: number;
  width: number;
};

// Shared vector presentation for Collection cards, Collection details, and the
// Mystery Ink prize reveal. Keeping all three cosmetic kinds here prevents the
// capsule ceremony from drifting away from the catalog players browse later.
export function renderCosmeticPreview(
  options: CosmeticPreviewOptions
): Phaser.GameObjects.Container {
  const preview = options.scene.add.container(options.x ?? 0, options.y);
  options.parent.add(preview);

  if (options.entry.kind === 'accessory') {
    const graphics = options.scene.add.graphics();
    drawAccessoryGraphics(graphics, options.entry.id, options.size);
    preview.add(graphics);
    return preview;
  }

  if (options.entry.kind === 'pen') {
    renderPenPreview(
      options.scene,
      preview,
      options.entry,
      options.size,
      options.width
    );
    return preview;
  }

  renderTitlePreview(
    options.scene,
    preview,
    options.entry.name,
    options.size,
    options.width
  );
  return preview;
}

function renderPenPreview(
  scene: Scene,
  preview: Phaser.GameObjects.Container,
  entry: CosmeticPenCatalogEntry,
  size: number,
  availableWidth: number
): void {
  const colors = entry.colors.length > 0 ? entry.colors : ['#2b2016'];
  const previewWidth = Math.min(availableWidth, Math.max(120, size * 1.75));
  const strokeWidth = Math.max(10, Math.min(18, size * 0.13));
  const graphics = scene.add.graphics();
  const segmentWidth = previewWidth / colors.length;

  colors.forEach((color, index) => {
    const startX = -previewWidth / 2 + segmentWidth * index;
    graphics.lineStyle(strokeWidth, hexColorNumber(color), 1);
    graphics.lineBetween(startX, 12, startX + segmentWidth + 1, 12);
  });
  graphics.lineStyle(3, UI.inkHex, 0.78);
  graphics.strokeRoundedRect(
    -previewWidth / 2 - 5,
    12 - strokeWidth / 2 - 5,
    previewWidth + 10,
    strokeWidth + 10,
    (strokeWidth + 10) / 2
  );

  const swatchDiameter = Math.min(28, Math.max(16, size * 0.23));
  const swatchGap = Math.min(8, swatchDiameter * 0.25);
  const totalSwatchWidth =
    colors.length * swatchDiameter + (colors.length - 1) * swatchGap;
  colors.forEach((color, index) => {
    preview.add(
      scene.add
        .circle(
          -totalSwatchWidth / 2 +
            swatchDiameter / 2 +
            index * (swatchDiameter + swatchGap),
          -18,
          swatchDiameter / 2,
          hexColorNumber(color),
          1
        )
        .setStrokeStyle(2, UI.inkHex, 0.78)
    );
  });
  preview.add(graphics);
}

function renderTitlePreview(
  scene: Scene,
  preview: Phaser.GameObjects.Container,
  title: string,
  size: number,
  availableWidth: number
): void {
  const badgeWidth = Math.min(availableWidth, Math.max(180, size * 2.1));
  const badgeHeight = Math.min(72, Math.max(54, size * 0.48));
  const fontSize = Math.min(26, Math.max(18, size * 0.18));
  const badge = scene.add
    .rectangle(0, 0, badgeWidth, badgeHeight, UI.gold, 0.28)
    .setStrokeStyle(3, UI.goldHex, 1);
  const badgeText = label(
    scene,
    0,
    0,
    `★ ${title} ★`,
    fontSize,
    UI.goldText,
    true
  )
    .setWordWrapWidth(badgeWidth - 16)
    .setLineSpacing(-5);
  preview.add([badge, badgeText]);
}

function hexColorNumber(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}
