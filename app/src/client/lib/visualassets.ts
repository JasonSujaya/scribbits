import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { UI } from './theme';
import { screenTitle } from './screentitle';
import { translate } from './localization';
import { COMMON_GEAR_ART_TEXTURE, RARE_EPIC_GEAR_ART_TEXTURE } from './gearart';
export const SCRIBBITS_STAGE_TEXTURE = 'scribbits-stage';
export const PAPER_STAGE_TEXTURE = SCRIBBITS_STAGE_TEXTURE;
export const BATTLE_STAGE_TEXTURE = SCRIBBITS_STAGE_TEXTURE;
export const FIGHT_START_TEXTURE = 'ui-fight-start';
export const BRAND_LOGO_TEXTURE = 'scribbits-logo';
export const SHOP_STAGE_TEXTURE = 'scribbits-shop-stage';
export const SHOP_CHEST_TEXTURES = {
  closed: 'scribbits-shop-chest-closed',
  open: 'scribbits-shop-chest-open',
} as const;
export const INK_TOKEN_TEXTURE = 'scribbits-ink-token';

export const BATTLE_CONTROL_BUTTON_TEXTURES = {
  sound: 'ui-button-battle-sound',
  speed: 'ui-button-battle-speed',
  skip: 'ui-button-battle-skip',
} as const;

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
  scene.load.image(SCRIBBITS_STAGE_TEXTURE, assetUrl('scribbits-stage.png'));
  scene.load.image(FIGHT_START_TEXTURE, assetUrl('ui-fight-start.png'));
  scene.load.image(BRAND_LOGO_TEXTURE, assetUrl('scribbits-logo.png'));
  scene.load.atlas(
    COMMON_GEAR_ART_TEXTURE,
    assetUrl('gear-common-atlas.png'),
    assetUrl('gear-common-atlas.json')
  );
  scene.load.atlas(
    RARE_EPIC_GEAR_ART_TEXTURE,
    assetUrl('gear-rare-epic-atlas.png'),
    assetUrl('gear-rare-epic-atlas.json')
  );
  Object.entries(BATTLE_CONTROL_BUTTON_TEXTURES).forEach(([kind, texture]) => {
    scene.load.image(texture, assetUrl(`ui-button-battle-${kind}.png`));
  });
  Object.entries(UI_BUTTON_TEXTURES).forEach(([kind, texture]) => {
    scene.load.image(texture, assetUrl(`ui-button-${kind}.png`));
  });
}

export function preloadShopVisualAssets(scene: Scene): void {
  scene.load.image(SHOP_STAGE_TEXTURE, assetUrl('scribbits-shop-stage.png'));
  scene.load.image(
    SHOP_CHEST_TEXTURES.closed,
    assetUrl('scribbits-shop-chest-closed.png')
  );
  scene.load.image(
    SHOP_CHEST_TEXTURES.open,
    assetUrl('scribbits-shop-chest-open.png')
  );
  scene.load.image(INK_TOKEN_TEXTURE, assetUrl('scribbits-ink-token.png'));
}

export function paperStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Image {
  return fixedStage(scene, PAPER_STAGE_TEXTURE, depth);
}

export function arenaStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const stage = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
  const desk = scene.add
    .rectangle(0, 0, width, height, 0x93643d, 1)
    .setOrigin(0);

  // Quiet, deterministic cork grain. It supplies material without becoming a
  // second illustration behind the controls.
  const grain = scene.add.graphics();
  grain.lineStyle(2, 0x50331f, 0.16);
  for (let mark = 0; mark < 54; mark += 1) {
    const x = (mark * 137 + 29) % width;
    const y = (mark * 83 + 41) % height;
    const length = 20 + (mark % 5) * 9;
    grain.lineBetween(x, y, Math.min(width, x + length), y + (mark % 3) - 1);
    grain.fillStyle(mark % 2 === 0 ? 0xd19b63 : 0x573722, 0.19);
    grain.fillCircle(x + 8, y + 11, 2 + (mark % 3));
  }

  const kraftLayers = scene.add.graphics();
  kraftLayers.fillStyle(0xc79a62, 1);
  kraftLayers.fillPoints(
    [
      { x: 30, y: 177 },
      { x: width - 80, y: 150 },
      { x: width - 18, y: 238 },
      { x: 42, y: 274 },
    ].map(({ x, y }) => new Phaser.Math.Vector2(x, y)),
    true
  );
  kraftLayers.fillStyle(0xa86d3e, 0.92);
  kraftLayers.fillPoints(
    [
      { x: 72, y: 220 },
      { x: width - 24, y: 198 },
      { x: width - 56, y: height - 30 },
      { x: 24, y: height - 70 },
    ].map(({ x, y }) => new Phaser.Math.Vector2(x, y)),
    true
  );

  // Reuse the neutral paper texture for real fiber and wear. The live stage
  // supplies the arena marks, cork desk, and title.
  const paperTexture = scene.add
    .image(width / 2, height / 2, PAPER_STAGE_TEXTURE)
    .setOrigin(0.5)
    .setCrop(64, 205, 592, 990)
    .setScale(Math.max(width / 592, height / 990));
  const paperMaskPoints = [
    { x: 66, y: 238 },
    { x: 118, y: 226 },
    { x: width / 2 - 38, y: 233 },
    { x: width - 110, y: 224 },
    { x: width - 65, y: 242 },
    { x: width - 72, y: height - 100 },
    { x: width - 126, y: height - 86 },
    { x: width / 2 + 24, y: height - 95 },
    { x: 118, y: height - 85 },
    { x: 64, y: height - 106 },
  ].map(({ x, y }) => new Phaser.Math.Vector2(x, y));
  const paperShadow = scene.add.graphics().setPosition(7, 9);
  paperShadow.fillStyle(0x4f321f, 0.35);
  paperShadow.fillPoints(paperMaskPoints, true);
  const paperMaskShape = scene.add.graphics();
  paperMaskShape.fillStyle(0xffffff, 1);
  paperMaskShape.fillPoints(paperMaskPoints, true);
  if (scene.game.renderer.type === Phaser.WEBGL) {
    paperTexture.enableFilters();
    const paperMask = paperTexture.filters?.internal.addMask(
      paperMaskShape,
      false,
      scene.cameras.main
    );
    if (paperMask) paperMask.autoUpdate = false;
  } else {
    paperTexture.setMask(paperMaskShape.createGeometryMask());
  }
  paperMaskShape.setVisible(false);
  const arenaMarks = scene.add.graphics();
  arenaMarks.lineStyle(2, UI.inkHex, 0.15);
  arenaMarks.strokeCircle(width / 2, 680, Math.min(width * 0.405, 292));
  arenaMarks.strokeCircle(width / 2, 680, Math.min(width * 0.388, 280));
  arenaMarks.lineBetween(72, 680, 101, 680);
  arenaMarks.lineBetween(width - 101, 680, width - 72, 680);
  arenaMarks.lineBetween(width / 2, 390, width / 2, 420);
  arenaMarks.lineBetween(width / 2, 940, width / 2, 970);
  arenaMarks.lineStyle(3, UI.inkHex, 0.13);
  arenaMarks.strokeCircle(width / 2, 230, 26);
  arenaMarks.lineBetween(width / 2 - 21, 219, width / 2 - 34, 207);
  arenaMarks.lineBetween(width / 2 + 21, 219, width / 2 + 34, 207);
  arenaMarks.lineBetween(width / 2, 256, width / 2, 273);
  arenaMarks.lineBetween(width / 2 - 18, 273, width / 2 + 18, 273);

  const title = screenTitle(scene, width / 2, 24, translate('screen.arena'), {
    maxWidth: 430,
    maxHeight: 112,
  });
  const leftTape = scene.add
    .rectangle(96, 154, 118, 38, UI.tape, 0.75)
    .setAngle(-13);
  const rightTape = scene.add
    .rectangle(width - 76, height - 70, 116, 34, UI.tapeAlt, 0.55)
    .setAngle(9);

  stage.add([
    desk,
    grain,
    kraftLayers,
    paperShadow,
    paperTexture,
    paperMaskShape,
    arenaMarks,
    title,
    leftTape,
    rightTape,
  ]);
  return stage;
}

export function battleStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Image {
  return fixedStage(scene, BATTLE_STAGE_TEXTURE, depth);
}

export function shopStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Image {
  return fixedStage(scene, SHOP_STAGE_TEXTURE, depth);
}

function fixedStage(
  scene: Scene,
  texture: string,
  depth: number
): Phaser.GameObjects.Image {
  const { width, height } = scene.scale;
  const stage = scene.add.image(width / 2, height / 2, texture);
  const coverScale = Math.max(width / stage.width, height / stage.height);
  return stage
    .setOrigin(0.5)
    .setScale(coverScale)
    .setScrollFactor(0)
    .setDepth(depth);
}
