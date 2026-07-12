import type * as Phaser from 'phaser';
import type { Scene } from 'phaser';
export const PAPER_STAGE_TEXTURE = 'scribbits-paper-stage';

export const UI_BUTTON_TEXTURES = {
  back: 'ui-button-back',
  close: 'ui-button-close',
  next: 'ui-button-next',
  previous: 'ui-button-previous',
  primary: 'ui-button-primary',
  secondary: 'ui-button-secondary',
} as const;

const assetUrl = (fileName: string): string => {
  return new URL(`../assets/${fileName}`, import.meta.url).href;
};

export function preloadVisualAssets(scene: Scene): void {
  scene.load.image(
    PAPER_STAGE_TEXTURE,
    assetUrl('scribbits-paper-stage.jpg')
  );
  Object.entries(UI_BUTTON_TEXTURES).forEach(([kind, texture]) => {
    scene.load.image(texture, assetUrl(`ui-button-${kind}.png`));
  });
}

export function paperStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Image {
  const { width, height } = scene.scale;
  return scene.add
    .image(0, 0, PAPER_STAGE_TEXTURE)
    .setOrigin(0)
    .setDisplaySize(width, height)
    .setScrollFactor(0)
    .setDepth(depth);
}
