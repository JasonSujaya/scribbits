import type * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { FONT_STACK, UI } from './theme';

const TITLE_TEXTURE_VERSION = 1;
const TITLE_FONT_SIZE = 86;
const TITLE_HORIZONTAL_PADDING = 32;
const TITLE_LOGICAL_HEIGHT = 122;
const TITLE_TEXTURE_SCALE = 2;

export type ScreenTitleOptions = Readonly<{
  maxWidth?: number;
  maxHeight?: number;
  angle?: number;
}>;

/**
 * Renders a main screen heading into one cached bitmap texture. Every primary
 * scene gets the same outlined, shadowed title treatment without duplicating
 * layered text objects or relying on image-generator spelling.
 */
export function screenTitle(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  options: ScreenTitleOptions = {}
): Phaser.GameObjects.Image {
  const normalizedTitle = text.trim().toUpperCase();
  const { textureKey, logicalWidth } = ensureScreenTitleTexture(
    scene,
    normalizedTitle
  );
  const displayScale = Math.min(
    1,
    (options.maxWidth ?? 430) / logicalWidth,
    (options.maxHeight ?? TITLE_LOGICAL_HEIGHT) / TITLE_LOGICAL_HEIGHT
  );

  return scene.add
    .image(x, y, textureKey)
    .setOrigin(0.5, 0)
    .setDisplaySize(
      logicalWidth * displayScale,
      TITLE_LOGICAL_HEIGHT * displayScale
    )
    .setAngle(options.angle ?? -0.5);
}

function ensureScreenTitleTexture(
  scene: Scene,
  title: string
): { textureKey: string; logicalWidth: number } {
  const textureKey = `screen-title-v${TITLE_TEXTURE_VERSION}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
  const font = `700 ${TITLE_FONT_SIZE}px ${FONT_STACK}`;
  const measurementCanvas = document.createElement('canvas');
  const measurementContext = measurementCanvas.getContext('2d');
  if (!measurementContext) {
    throw new Error('Screen title canvas is unavailable.');
  }
  measurementContext.font = font;
  const logicalWidth = Math.ceil(
    measurementContext.measureText(title).width + TITLE_HORIZONTAL_PADDING * 2
  );
  if (scene.textures.exists(textureKey)) return { textureKey, logicalWidth };

  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * TITLE_TEXTURE_SCALE;
  canvas.height = TITLE_LOGICAL_HEIGHT * TITLE_TEXTURE_SCALE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Screen title canvas is unavailable.');

  context.scale(TITLE_TEXTURE_SCALE, TITLE_TEXTURE_SCALE);
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.miterLimit = 2;
  const centerX = logicalWidth / 2;
  const centerY = TITLE_LOGICAL_HEIGHT / 2 - 2;

  // Warm offset ink makes the bitmap feel stamped onto the craft desk.
  context.lineWidth = 15;
  context.strokeStyle = UI.ink;
  context.strokeText(title, centerX + 6, centerY + 8);
  context.fillStyle = '#b77b42';
  context.fillText(title, centerX + 6, centerY + 8);

  context.lineWidth = 13;
  context.strokeStyle = UI.ink;
  context.strokeText(title, centerX, centerY);
  context.fillStyle = UI.cream;
  context.fillText(title, centerX, centerY);

  scene.textures.addCanvas(textureKey, canvas);
  return { textureKey, logicalWidth };
}
