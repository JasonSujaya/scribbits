import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { UI } from './theme';
import { screenTitle } from './screentitle';
import { translate } from './localization';
import {
  COMMON_GEAR_ART_TEXTURE,
  LEGENDARY_GEAR_ART_TEXTURE,
  RARE_EPIC_GEAR_ART_TEXTURE,
} from './gearart';
export const SCRIBBITS_STAGE_TEXTURE = 'scribbits-stage';
export const PAPER_STAGE_TEXTURE = SCRIBBITS_STAGE_TEXTURE;
export const BATTLE_STAGE_TEXTURE = SCRIBBITS_STAGE_TEXTURE;
export const FIGHT_START_TEXTURE = 'ui-fight-start';
export const BRAND_LOGO_TEXTURE = 'scribbits-logo';
export const HOME_STAGE_TEXTURE = 'scribbits-home-stage';
export const HOME_TITLE_TEXTURE = 'scribbits-home-title';
export const BATTLE_TITLE_TEXTURE = 'scribbits-battle-title';
export const MATURITY_GEAR_TEXTURE = 'scribbits-maturity-gear-icons';
export const BAG_BINDER_SHELL_TEXTURE = 'scribbits-bag-binder-base-shell-v7';
export const HOME_PROP_TEXTURES = {
  window: 'scribbits-home-window',
  shelf: 'scribbits-home-shelf',
} as const;
export const SHOP_STAGE_TEXTURE = 'scribbits-shop-stage';
export const SHOP_CLAW_MACHINE_SHELL_TEXTURE =
  'scribbits-shop-claw-machine-shell';
export const SHOP_CAPSULE_SHELL_TEXTURE = 'scribbits-shop-capsule-shell';
export const SHOP_CHEST_TEXTURES = {
  closed: 'scribbits-shop-chest-closed',
  open: 'scribbits-shop-chest-open',
} as const;
export const INK_TOKEN_TEXTURE = 'scribbits-ink-token';
const SHOP_VISUAL_TEXTURES = [
  SHOP_STAGE_TEXTURE,
  SHOP_CLAW_MACHINE_SHELL_TEXTURE,
  SHOP_CAPSULE_SHELL_TEXTURE,
  SHOP_CHEST_TEXTURES.closed,
  SHOP_CHEST_TEXTURES.open,
  INK_TOKEN_TEXTURE,
] as const;

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

const VISUAL_ASSET_URLS: Readonly<Record<string, string>> = Object.freeze({
  'bag-binder-base-shell-v7.webp': new URL(
    '../assets/bag-binder-base-shell-v7.webp',
    import.meta.url
  ).href,
  'gear-common-atlas.json': new URL(
    '../assets/gear-common-atlas.json',
    import.meta.url
  ).href,
  'gear-common-atlas.webp': new URL(
    '../assets/gear-common-atlas.webp',
    import.meta.url
  ).href,
  'gear-rare-epic-atlas.json': new URL(
    '../assets/gear-rare-epic-atlas.json',
    import.meta.url
  ).href,
  'gear-rare-epic-atlas.webp': new URL(
    '../assets/gear-rare-epic-atlas.webp',
    import.meta.url
  ).href,
  'gear-legendary-atlas.json': new URL(
    '../assets/gear-legendary-atlas.json',
    import.meta.url
  ).href,
  'gear-legendary-atlas.webp': new URL(
    '../assets/gear-legendary-atlas.webp',
    import.meta.url
  ).href,
  'maturity-gear-icons.webp': new URL(
    '../assets/maturity-gear-icons.webp',
    import.meta.url
  ).href,
  'scribbits-home-shelf.webp': new URL(
    '../assets/scribbits-home-shelf.webp',
    import.meta.url
  ).href,
  'scribbits-home-stage.webp': new URL(
    '../assets/scribbits-home-stage.webp',
    import.meta.url
  ).href,
  'scribbits-home-title.webp': new URL(
    '../assets/scribbits-home-title.webp',
    import.meta.url
  ).href,
  'scribbits-battle-title.webp': new URL(
    '../assets/scribbits-battle-title.webp',
    import.meta.url
  ).href,
  'scribbits-home-window.webp': new URL(
    '../assets/scribbits-home-window.webp',
    import.meta.url
  ).href,
  'scribbits-ink-token.webp': new URL(
    '../assets/scribbits-ink-token.webp',
    import.meta.url
  ).href,
  'scribbits-logo.webp': new URL(
    '../assets/scribbits-logo.webp',
    import.meta.url
  ).href,
  'scribbits-shop-chest-closed.webp': new URL(
    '../assets/scribbits-shop-chest-closed.webp',
    import.meta.url
  ).href,
  'scribbits-shop-chest-open.webp': new URL(
    '../assets/scribbits-shop-chest-open.webp',
    import.meta.url
  ).href,
  'scribbits-shop-claw-machine-shell.webp': new URL(
    '../assets/scribbits-shop-claw-machine-shell.webp',
    import.meta.url
  ).href,
  'scribbits-shop-capsule-shell.png': new URL(
    '../assets/scribbits-shop-capsule-shell.png',
    import.meta.url
  ).href,
  'scribbits-shop-stage.webp': new URL(
    '../assets/scribbits-shop-stage.webp',
    import.meta.url
  ).href,
  'scribbits-stage.webp': new URL(
    '../assets/scribbits-stage.webp',
    import.meta.url
  ).href,
  'ui-button-back.webp': new URL(
    '../assets/ui-button-back.webp',
    import.meta.url
  ).href,
  'ui-button-battle-skip.webp': new URL(
    '../assets/ui-button-battle-skip.webp',
    import.meta.url
  ).href,
  'ui-button-battle-sound.webp': new URL(
    '../assets/ui-button-battle-sound.webp',
    import.meta.url
  ).href,
  'ui-button-battle-speed.webp': new URL(
    '../assets/ui-button-battle-speed.webp',
    import.meta.url
  ).href,
  'ui-button-close.webp': new URL(
    '../assets/ui-button-close.webp',
    import.meta.url
  ).href,
  'ui-button-next.webp': new URL(
    '../assets/ui-button-next.webp',
    import.meta.url
  ).href,
  'ui-button-previous.webp': new URL(
    '../assets/ui-button-previous.webp',
    import.meta.url
  ).href,
  'ui-button-primary.webp': new URL(
    '../assets/ui-button-primary.webp',
    import.meta.url
  ).href,
  'ui-button-secondary.webp': new URL(
    '../assets/ui-button-secondary.webp',
    import.meta.url
  ).href,
  'ui-fight-start.webp': new URL(
    '../assets/ui-fight-start.webp',
    import.meta.url
  ).href,
});

const assetUrl = (fileName: string): string => {
  const url = VISUAL_ASSET_URLS[fileName];
  if (!url) throw new Error(`Unknown visual asset: ${fileName}`);
  return url;
};

export function preloadVisualAssets(scene: Scene): void {
  scene.load.image(SCRIBBITS_STAGE_TEXTURE, assetUrl('scribbits-stage.webp'));
  scene.load.image(BRAND_LOGO_TEXTURE, assetUrl('scribbits-logo.webp'));
  scene.load.atlas(
    COMMON_GEAR_ART_TEXTURE,
    assetUrl('gear-common-atlas.webp'),
    assetUrl('gear-common-atlas.json')
  );
  scene.load.atlas(
    RARE_EPIC_GEAR_ART_TEXTURE,
    assetUrl('gear-rare-epic-atlas.webp'),
    assetUrl('gear-rare-epic-atlas.json')
  );
  scene.load.atlas(
    LEGENDARY_GEAR_ART_TEXTURE,
    assetUrl('gear-legendary-atlas.webp'),
    assetUrl('gear-legendary-atlas.json')
  );
  Object.entries(UI_BUTTON_TEXTURES).forEach(([kind, texture]) => {
    scene.load.image(texture, assetUrl(`ui-button-${kind}.webp`));
  });
}

export function preloadGalleryVisualAssets(scene: Scene): void {
  scene.load.image(
    BAG_BINDER_SHELL_TEXTURE,
    assetUrl('bag-binder-base-shell-v7.webp')
  );
}

export function preloadReplayVisualAssets(scene: Scene): void {
  scene.load.image(FIGHT_START_TEXTURE, assetUrl('ui-fight-start.webp'));
  scene.load.image(
    BATTLE_TITLE_TEXTURE,
    assetUrl('scribbits-battle-title.webp')
  );
  Object.entries(BATTLE_CONTROL_BUTTON_TEXTURES).forEach(([kind, texture]) => {
    scene.load.image(texture, assetUrl(`ui-button-battle-${kind}.webp`));
  });
}

export function preloadHomeVisualAssets(scene: Scene): void {
  scene.load.image(HOME_STAGE_TEXTURE, assetUrl('scribbits-home-stage.webp'));
  scene.load.image(HOME_TITLE_TEXTURE, assetUrl('scribbits-home-title.webp'));
  Object.values(HOME_PROP_TEXTURES).forEach((texture) => {
    scene.load.image(texture, assetUrl(`${texture}.webp`));
  });
  scene.load.spritesheet(
    MATURITY_GEAR_TEXTURE,
    assetUrl('maturity-gear-icons.webp'),
    { frameWidth: 128, frameHeight: 128 }
  );
}

export function preloadShopVisualAssets(scene: Scene): void {
  if (!scene.textures.exists(SHOP_STAGE_TEXTURE)) {
    scene.load.image(SHOP_STAGE_TEXTURE, assetUrl('scribbits-shop-stage.webp'));
  }
  if (!scene.textures.exists(SHOP_CHEST_TEXTURES.closed)) {
    scene.load.image(
      SHOP_CHEST_TEXTURES.closed,
      assetUrl('scribbits-shop-chest-closed.webp')
    );
  }
  if (!scene.textures.exists(SHOP_CLAW_MACHINE_SHELL_TEXTURE)) {
    scene.load.image(
      SHOP_CLAW_MACHINE_SHELL_TEXTURE,
      assetUrl('scribbits-shop-claw-machine-shell.webp')
    );
  }
  if (!scene.textures.exists(SHOP_CAPSULE_SHELL_TEXTURE)) {
    scene.load.image(
      SHOP_CAPSULE_SHELL_TEXTURE,
      assetUrl('scribbits-shop-capsule-shell.png')
    );
  }
  if (!scene.textures.exists(SHOP_CHEST_TEXTURES.open)) {
    scene.load.image(
      SHOP_CHEST_TEXTURES.open,
      assetUrl('scribbits-shop-chest-open.webp')
    );
  }
  if (!scene.textures.exists(INK_TOKEN_TEXTURE)) {
    scene.load.image(INK_TOKEN_TEXTURE, assetUrl('scribbits-ink-token.webp'));
  }
}

export function shopVisualAssetsReady(scene: Scene): boolean {
  return SHOP_VISUAL_TEXTURES.every((texture) =>
    scene.textures.exists(texture)
  );
}

export function paperStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Image {
  return fixedStage(scene, PAPER_STAGE_TEXTURE, depth);
}

export function homeStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Image {
  return fixedStage(scene, HOME_STAGE_TEXTURE, depth);
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

const SHOP_ARCADE_COLORS = {
  wall: 0x35243f,
  wallSoft: 0x543b61,
  plum: 0x654875,
  coral: 0xef6a4d,
  gold: 0xf6c64d,
  paper: 0xf8e9ca,
  ink: 0x251a24,
  floorDark: 0x5e456d,
  floorLight: 0xc9a886,
} as const;

function drawShopArcadeCabinet(
  scene: Scene,
  x: number,
  y: number,
  accent: number,
  icon: 'car' | 'planet'
): Phaser.GameObjects.Container {
  const cabinet = scene.add.container(x, y);
  const body = scene.add.graphics();
  body.fillStyle(SHOP_ARCADE_COLORS.ink, 0.98);
  body.fillRoundedRect(-78, -246, 156, 492, 20);
  body.fillStyle(accent, 0.94);
  body.fillRoundedRect(-68, -236, 136, 472, 16);
  body.fillStyle(SHOP_ARCADE_COLORS.ink, 0.92);
  body.fillRoundedRect(-61, -181, 122, 188, 12);
  body.fillStyle(0xb7c8c6, 0.92);
  body.fillRoundedRect(-52, -164, 104, 145, 8);
  body.lineStyle(4, SHOP_ARCADE_COLORS.ink, 0.9);
  body.strokeRoundedRect(-52, -164, 104, 145, 8);
  body.fillStyle(SHOP_ARCADE_COLORS.paper, 0.96);
  body.fillRoundedRect(-53, 32, 106, 76, 12);
  body.lineStyle(4, SHOP_ARCADE_COLORS.ink, 0.88);
  body.strokeRoundedRect(-53, 32, 106, 76, 12);
  body.fillStyle(SHOP_ARCADE_COLORS.ink, 0.96);
  body.fillRect(-5, 47, 10, 30);
  body.fillStyle(SHOP_ARCADE_COLORS.coral, 1);
  body.fillCircle(0, 44, 14);
  body.fillStyle(SHOP_ARCADE_COLORS.gold, 1);
  body.fillCircle(-27, 78, 8);
  body.fillCircle(28, 78, 8);
  body.fillStyle(SHOP_ARCADE_COLORS.ink, 0.82);
  body.fillRoundedRect(-22, 148, 44, 72, 5);

  const screenIcon = scene.add.graphics().setPosition(0, -90);
  screenIcon.lineStyle(4, SHOP_ARCADE_COLORS.ink, 0.9);
  if (icon === 'car') {
    screenIcon.fillStyle(SHOP_ARCADE_COLORS.coral, 1);
    screenIcon.fillRoundedRect(-34, -9, 68, 27, 9);
    screenIcon.fillTriangle(-20, -9, -7, -28, 16, -9);
    screenIcon.fillStyle(SHOP_ARCADE_COLORS.ink, 1);
    screenIcon.fillCircle(-22, 19, 9);
    screenIcon.fillCircle(23, 19, 9);
  } else {
    screenIcon.fillStyle(SHOP_ARCADE_COLORS.plum, 1);
    screenIcon.fillCircle(0, 0, 27);
    screenIcon.strokeEllipse(0, 0, 76, 24);
    screenIcon.fillStyle(SHOP_ARCADE_COLORS.gold, 1);
    screenIcon.fillCircle(-26, -30, 5);
    screenIcon.fillCircle(30, 24, 4);
  }
  cabinet.add([body, screenIcon]);
  return cabinet;
}

function drawShopArcadeTicket(
  scene: Scene,
  x: number,
  y: number,
  angle: number,
  fill: number
): Phaser.GameObjects.Container {
  const ticket = scene.add.container(x, y).setAngle(angle);
  const paper = scene.add.graphics();
  paper.fillStyle(SHOP_ARCADE_COLORS.ink, 0.32);
  paper.fillRoundedRect(-55, -25, 116, 56, 8);
  paper.fillStyle(fill, 0.96);
  paper.fillRoundedRect(-59, -29, 116, 56, 8);
  paper.lineStyle(3, SHOP_ARCADE_COLORS.ink, 0.88);
  paper.strokeRoundedRect(-59, -29, 116, 56, 8);
  paper.lineBetween(-38, -16, -38, 14);
  paper.lineBetween(36, -16, 36, 14);
  paper.lineBetween(-25, 0, 24, 0);
  ticket.add(paper);
  return ticket;
}

export function shopStage(
  scene: Scene,
  depth = -100
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const stage = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
  const paperTexture = fixedStage(scene, SHOP_STAGE_TEXTURE, 0)
    .setTint(0x806a86)
    .setAlpha(0.62);
  const wall = scene.add
    .rectangle(0, 0, width, height, SHOP_ARCADE_COLORS.wall, 0.9)
    .setOrigin(0);

  const grain = scene.add.graphics();
  for (let mark = 0; mark < 64; mark += 1) {
    const x = (mark * 113 + 19) % width;
    const y = (mark * 79 + 37) % Math.max(1, height - 120);
    grain.fillStyle(
      mark % 3 === 0 ? SHOP_ARCADE_COLORS.paper : SHOP_ARCADE_COLORS.wallSoft,
      mark % 3 === 0 ? 0.05 : 0.12
    );
    grain.fillCircle(x, y, 2 + (mark % 3));
  }

  const titleBacking = scene.add.graphics();
  titleBacking.fillStyle(SHOP_ARCADE_COLORS.ink, 0.34);
  titleBacking.fillPoints(
    [
      [205, 17],
      [505, 12],
      [527, 74],
      [494, 127],
      [226, 123],
      [188, 73],
    ].map(([x, y]) => new Phaser.Math.Vector2(x ?? 0, (y ?? 0) + 7)),
    true
  );
  titleBacking.fillStyle(SHOP_ARCADE_COLORS.plum, 1);
  titleBacking.fillPoints(
    [
      [205, 17],
      [505, 12],
      [527, 74],
      [494, 127],
      [226, 123],
      [188, 73],
    ].map(([x, y]) => new Phaser.Math.Vector2(x ?? 0, y ?? 0)),
    true
  );
  titleBacking.lineStyle(4, SHOP_ARCADE_COLORS.paper, 0.82);
  titleBacking.strokePoints(
    [
      [205, 17],
      [505, 12],
      [527, 74],
      [494, 127],
      [226, 123],
      [188, 73],
    ].map(([x, y]) => new Phaser.Math.Vector2(x ?? 0, y ?? 0)),
    true
  );

  const marquee = scene.add.graphics();
  marquee.fillStyle(SHOP_ARCADE_COLORS.coral, 0.92);
  marquee.lineStyle(5, SHOP_ARCADE_COLORS.gold, 0.9);
  marquee.fillTriangle(0, 246, 118, 298, 0, 352);
  marquee.strokeTriangle(0, 246, 118, 298, 0, 352);
  marquee.fillTriangle(width, 244, width - 118, 298, width, 354);
  marquee.strokeTriangle(width, 244, width - 118, 298, width, 354);
  for (let bulb = 0; bulb < 4; bulb += 1) {
    marquee.fillStyle(SHOP_ARCADE_COLORS.paper, 0.92);
    marquee.fillCircle(20 + bulb * 28, 298, 6);
    marquee.fillCircle(width - 20 - bulb * 28, 298, 6);
  }

  const lightCord = scene.add.graphics();
  lightCord.lineStyle(4, 0xb98a4f, 0.9);
  lightCord.lineBetween(0, 24, 128, 58);
  lightCord.lineBetween(128, 58, 208, 38);
  lightCord.lineBetween(width - 208, 38, width - 128, 58);
  lightCord.lineBetween(width - 128, 58, width, 24);
  const stringLights = [
    { x: 26, y: 36, size: 16 },
    { x: 104, y: 58, size: 12 },
    { x: 164, y: 45, size: 18 },
    { x: width - 164, y: 45, size: 18 },
    { x: width - 104, y: 58, size: 12 },
    { x: width - 26, y: 36, size: 16 },
  ].map(({ x, y, size }, index) =>
    scene.add
      .star(
        x,
        y,
        5,
        size * 0.45,
        size,
        index % 2 === 0 ? SHOP_ARCADE_COLORS.gold : SHOP_ARCADE_COLORS.coral,
        1
      )
      .setStrokeStyle(3, SHOP_ARCADE_COLORS.ink, 0.75)
  );

  const floorTop = height - 250;
  const floor = scene.add.graphics();
  floor.fillStyle(SHOP_ARCADE_COLORS.floorDark, 1);
  floor.fillRect(0, floorTop, width, 250);
  const checkerSize = 72;
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 11; column += 1) {
      if ((row + column) % 2 === 0) {
        floor.fillStyle(SHOP_ARCADE_COLORS.floorLight, 0.88);
        floor.fillRect(
          column * checkerSize - 36,
          floorTop + row * checkerSize,
          checkerSize,
          checkerSize
        );
      }
    }
  }
  floor.fillStyle(SHOP_ARCADE_COLORS.paper, 0.08);
  floor.fillEllipse(width / 2, 720, 650, 900);

  const leftCabinet = drawShopArcadeCabinet(
    scene,
    -34,
    Math.min(720, height - 470),
    SHOP_ARCADE_COLORS.coral,
    'car'
  );
  const rightCabinet = drawShopArcadeCabinet(
    scene,
    width + 34,
    Math.min(720, height - 470),
    SHOP_ARCADE_COLORS.plum,
    'planet'
  );
  const leftTicket = drawShopArcadeTicket(
    scene,
    42,
    330,
    -10,
    SHOP_ARCADE_COLORS.coral
  );
  const rightTicket = drawShopArcadeTicket(
    scene,
    width - 36,
    382,
    12,
    SHOP_ARCADE_COLORS.plum
  );

  const confetti = scene.add.graphics();
  for (let piece = 0; piece < 22; piece += 1) {
    const leftSide = piece % 2 === 0;
    const x = leftSide
      ? 18 + ((piece * 31) % 68)
      : width - 18 - ((piece * 31) % 68);
    const y = 390 + ((piece * 67) % Math.max(1, height - 520));
    confetti.fillStyle(
      piece % 3 === 0
        ? SHOP_ARCADE_COLORS.gold
        : piece % 3 === 1
          ? SHOP_ARCADE_COLORS.coral
          : SHOP_ARCADE_COLORS.paper,
      0.46
    );
    confetti.fillRect(x, y, 8 + (piece % 3) * 3, 5);
  }

  stage.add([
    paperTexture,
    wall,
    grain,
    floor,
    marquee,
    leftCabinet,
    rightCabinet,
    leftTicket,
    rightTicket,
    lightCord,
    ...stringLights,
    titleBacking,
    confetti,
  ]);
  return stage;
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
