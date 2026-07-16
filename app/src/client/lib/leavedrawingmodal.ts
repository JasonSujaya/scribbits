import { Scene } from 'phaser';
import { CanvasModalOverlay } from './overlay';
import { paperIcon } from './papericons';
import { markSfxManaged, playSfx } from './sfx';
import { fitDrawing } from './scribbits';
import { UI } from './theme';
import { button, iconButton, label, stickerCard } from './ui';

let nextLeaveDrawingPreviewTextureId = 1;

export type LeaveDrawingModal = Readonly<{ destroy: () => void }>;

type LeaveDrawingModalOptions = Readonly<{
  previewDataUrl: string;
  onContinue: () => void;
  onDiscard: () => void;
}>;

export const createLeaveDrawingModal = (
  scene: Scene,
  options: LeaveDrawingModalOptions
): LeaveDrawingModal => {
  const { width, height } = scene.scale;
  const cardWidth = width - 100;
  const cardHeight = 850;
  const cardCenterY = height / 2;
  const cardTop = cardCenterY - cardHeight / 2;
  const previewSize = 320;
  const previewTextureKey = `leave-drawing-preview-${nextLeaveDrawingPreviewTextureId}`;
  nextLeaveDrawingPreviewTextureId += 1;
  let previewTextureLoaded = false;
  let destroyed = false;

  const actions = new CanvasModalOverlay(
    scene,
    'Leave your doodle?',
    options.onContinue,
    "Leave now and this doodle won't be saved."
  );
  const layer = scene.add.container(0, 0).setDepth(2800).setScrollFactor(0);
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    layer.destroy(true);
  };
  layer.once('destroy', () => {
    destroyed = true;
    actions.destroy();
    if (previewTextureLoaded && scene.textures.exists(previewTextureKey)) {
      scene.textures.remove(previewTextureKey);
    }
  });

  const shade = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.76)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  markSfxManaged(shade);
  shade.on('pointerup', () => {
    playSfx('ui.close');
    options.onContinue();
  });
  const card = stickerCard(
    scene,
    width / 2,
    cardCenterY,
    cardWidth,
    cardHeight,
    { tapeColor: UI.tapeAlt, tapeWidth: 96 }
  ).setScrollFactor(0);
  const cardInputBlocker = scene.add
    .rectangle(width / 2, cardCenterY, cardWidth, cardHeight, 0xffffff, 0.001)
    .setScrollFactor(0)
    .setInteractive();
  layer.add([shade, card, cardInputBlocker]);

  layer.add([
    paperIcon(scene, 'pencil', width / 2, cardTop + 76, {
      size: 58,
      fill: UI.gold,
      stroke: UI.inkHex,
    }).setScrollFactor(0),
    label(
      scene,
      width / 2,
      cardTop + 132,
      'LEAVE YOUR DOODLE?',
      34,
      UI.ink,
      true
    ).setScrollFactor(0),
    label(
      scene,
      width / 2,
      cardTop + 178,
      "IT WON'T BE SAVED",
      20,
      UI.coralText,
      true
    ).setScrollFactor(0),
  ]);

  const previewY = cardTop + 380;
  const previewCard = scene.add
    .container(width / 2, previewY)
    .setAngle(-1.5)
    .setScrollFactor(0);
  const previewFrame = scene.add.graphics();
  previewFrame.fillStyle(UI.creamHex, 1);
  previewFrame.fillRoundedRect(
    -previewSize / 2,
    -previewSize / 2,
    previewSize,
    previewSize,
    14
  );
  previewFrame.lineStyle(4, UI.inkHex, 0.9);
  previewFrame.strokeRoundedRect(
    -previewSize / 2,
    -previewSize / 2,
    previewSize,
    previewSize,
    14
  );
  previewCard.add(previewFrame);
  layer.add(previewCard);

  const previewSource = new Image();
  previewSource.onload = () => {
    if (destroyed || !scene.scene.isActive() || !previewCard.active) return;
    scene.textures.addImage(previewTextureKey, previewSource);
    previewTextureLoaded = true;
    previewCard.add(
      fitDrawing(scene.add.image(0, 0, previewTextureKey), previewSize - 24)
    );
  };
  previewSource.onerror = () => {
    if (destroyed || !previewCard.active) return;
    previewCard.add(
      label(scene, 0, 0, 'PREVIEW UNAVAILABLE', 18, UI.inkSoft, true)
    );
  };
  previewSource.src = options.previewDataUrl;

  const primaryLabel = 'CONTINUE DRAWING';
  const primaryY = cardTop + 625;
  layer.add(
    button(
      scene,
      width / 2,
      primaryY,
      primaryLabel,
      options.onContinue,
      cardWidth - 100,
      UI.gold,
      UI.ink,
      84
    ).setScrollFactor(0)
  );
  const primaryControl = actions.add({
    label: primaryLabel,
    rect: {
      x: 100,
      y: primaryY - 44,
      width: width - 200,
      height: 88,
    },
    onActivate: options.onContinue,
  });

  const discardY = cardTop + 742;
  layer.add(
    iconButton(
      scene,
      width / 2,
      discardY,
      'trash',
      'DISCARD DRAWING',
      options.onDiscard,
      cardWidth - 140,
      UI.creamHex,
      UI.ink,
      72,
      UI.coralDeep
    ).setScrollFactor(0)
  );
  actions.add({
    label: 'Leave and discard drawing',
    rect: {
      x: 120,
      y: discardY - 38,
      width: width - 240,
      height: 76,
    },
    onActivate: options.onDiscard,
  });
  actions.focusInitial(primaryControl);

  return Object.freeze({ destroy });
};
