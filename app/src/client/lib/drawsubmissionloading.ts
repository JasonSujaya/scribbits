import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { fitDrawing } from './scribbits';
import { label } from './ui';
import { prefersReducedMotion, TYPE, UI } from './theme';
import { BRAND_LOGO_TEXTURE } from './visualassets';

const OVERLAY_DEPTH = 2_400;
const SLOW_STATUS_DELAY_MILLISECONDS = 7_000;
const SHEET_MARGIN = 32;
const PREVIEW_FRAME_SIZE = 440;
const PREVIEW_ART_SIZE = 400;

let nextPreviewTextureId = 1;

export type DrawSubmissionMode = 'scribbit' | 'free-draw' | 'practice';

export type DrawSubmissionLoadingOverlay = Readonly<{
  showReconciliationStatus: () => void;
  destroy: () => void;
}>;

type DrawSubmissionLoadingOptions = Readonly<{
  mode: DrawSubmissionMode;
  name: string;
  previewDataUrl: string;
}>;

type SubmissionStatusCopy = Readonly<{
  kicker: string;
  title: string;
  detail: string;
}>;

const initialStatusCopy = (
  mode: DrawSubmissionMode,
  name: string
): SubmissionStatusCopy => {
  if (mode === 'practice') {
    return {
      kicker: 'PREPARING A PRACTICE MATCH',
      title: 'SETTING THE STAGE',
      detail: 'Getting your drawing ready for a quick test.',
    };
  }
  if (mode === 'free-draw') {
    return {
      kicker: 'SAVING TO YOUR SKETCHBOOK',
      title: 'PRESSING THE LAST INK',
      detail: 'Keeping every line exactly where you left it.',
    };
  }
  return {
    kicker: 'SAVING TO TODAY’S RUMBLE',
    title: `${name.toUpperCase()} IS WAKING UP`,
    detail: 'Your drawing is safe while we finish the handoff.',
  };
};

const slowStatusCopy = (): SubmissionStatusCopy => ({
  kicker: 'REDDIT IS TAKING A MOMENT',
  title: 'STILL WITH YOU',
  detail: 'Your drawing is safe. Please keep this window open.',
});

const reconciliationStatusCopy = (): SubmissionStatusCopy => ({
  kicker: 'VERIFYING THE SAVE',
  title: 'FOLLOWING THE INK TRAIL',
  detail: 'The reply was late. We’re checking that it landed safely.',
});

export function createDrawSubmissionLoadingOverlay(
  scene: Scene,
  options: DrawSubmissionLoadingOptions
): DrawSubmissionLoadingOverlay {
  const { width, height } = scene.scale;
  const centerX = width / 2;
  const sheetTop = 36;
  const sheetWidth = width - SHEET_MARGIN * 2;
  const sheetHeight = height - sheetTop * 2;
  const heroCenterY = sheetTop + sheetHeight * 0.4;
  const statusTitleY = sheetTop + sheetHeight * 0.71;
  const reduceMotion = prefersReducedMotion();
  const initialCopy = initialStatusCopy(options.mode, options.name);
  const container = scene.add
    .container(0, 0)
    .setDepth(OVERLAY_DEPTH)
    .setScrollFactor(0);

  const desk = scene.add
    .rectangle(centerX, height / 2, width + 8, height + 8, UI.deskHex, 1)
    .setInteractive();
  const sheetShadow = scene.add.rectangle(
    centerX + 10,
    height / 2 + 10,
    sheetWidth,
    sheetHeight,
    0x000000,
    0.36
  );
  const sheet = scene.add.tileSprite(
    centerX,
    height / 2,
    sheetWidth,
    sheetHeight,
    'paper'
  );
  const sheetKeyline = scene.add.graphics();
  sheetKeyline.lineStyle(3, UI.gold, 0.9);
  sheetKeyline.strokeRect(
    SHEET_MARGIN + 8,
    sheetTop + 8,
    sheetWidth - 16,
    sheetHeight - 16
  );

  const logo = scene.add
    .image(centerX, sheetTop + 76, BRAND_LOGO_TEXTURE)
    .setDisplaySize(190, 78);
  const kicker = label(
    scene,
    centerX,
    sheetTop + 158,
    initialCopy.kicker,
    TYPE.caption,
    UI.coralText,
    true
  );

  const halo = scene.add.container(centerX, heroCenterY);
  const haloGraphics = scene.add.graphics();
  haloGraphics.lineStyle(7, UI.gold, 0.38);
  haloGraphics.strokeCircle(0, 0, 250);
  haloGraphics.lineStyle(14, UI.coral, 1);
  haloGraphics.beginPath();
  haloGraphics.arc(0, 0, 250, -Math.PI * 0.72, Math.PI * 0.72, false);
  haloGraphics.strokePath();
  halo.add(haloGraphics);

  const previewCard = scene.add.container(centerX, heroCenterY);
  const previewShadow = scene.add.rectangle(
    10,
    14,
    PREVIEW_FRAME_SIZE,
    PREVIEW_FRAME_SIZE,
    0x000000,
    0.2
  );
  const previewPaper = scene.add
    .rectangle(0, 0, PREVIEW_FRAME_SIZE, PREVIEW_FRAME_SIZE, UI.creamHex, 1)
    .setStrokeStyle(5, UI.inkHex, 0.92);
  previewCard.add([previewShadow, previewPaper]);

  const title = label(
    scene,
    centerX,
    statusTitleY,
    initialCopy.title,
    42,
    UI.ink,
    true
  );
  title.setWordWrapWidth(sheetWidth - 100);
  const detail = label(
    scene,
    centerX,
    statusTitleY + 88,
    initialCopy.detail,
    TYPE.body,
    UI.inkSoft,
    true
  );
  detail.setWordWrapWidth(sheetWidth - 120);

  container.add([
    desk,
    sheetShadow,
    sheet,
    sheetKeyline,
    logo,
    kicker,
    halo,
    previewCard,
    title,
    detail,
  ]);

  const loopingTweens: Phaser.Tweens.Tween[] = [];
  if (!reduceMotion) {
    sheet.setAlpha(0);
    sheetKeyline.setAlpha(0);
    previewCard
      .setY(heroCenterY + 18)
      .setScale(0.97)
      .setAlpha(0);
    scene.tweens.add({
      targets: [sheet, sheetKeyline],
      alpha: 1,
      duration: 120,
      ease: 'Quad.easeOut',
    });
    scene.tweens.add({
      targets: previewCard,
      y: heroCenterY,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: 'Quad.easeOut',
    });
    loopingTweens.push(
      scene.tweens.add({
        targets: halo,
        angle: 360,
        duration: 3_200,
        repeat: -1,
        ease: 'Linear',
      }),
      scene.tweens.add({
        targets: previewCard,
        scale: 1.012,
        duration: 1_800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    );
  }

  const liveStatus = document.createElement('output');
  liveStatus.setAttribute('role', 'status');
  liveStatus.setAttribute('aria-live', 'polite');
  liveStatus.textContent = `${initialCopy.title}. ${initialCopy.detail}`;
  Object.assign(liveStatus.style, {
    position: 'fixed',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  });
  document.body.append(liveStatus);
  const gameCanvas = scene.game.canvas;
  const previousAriaBusy = gameCanvas.getAttribute('aria-busy');
  gameCanvas.setAttribute('aria-busy', 'true');

  let previewTextureLoaded = false;
  const previewTextureKey = `draw-submission-loading-${nextPreviewTextureId}`;
  nextPreviewTextureId += 1;
  const previewSource = new Image();
  previewSource.onload = () => {
    if (!container.active || !scene.scene.isActive()) return;
    scene.textures.addImage(previewTextureKey, previewSource);
    previewTextureLoaded = true;
    const preview = fitDrawing(
      scene.add.image(0, 0, previewTextureKey),
      PREVIEW_ART_SIZE
    );
    previewCard.add(preview);
  };
  previewSource.src = options.previewDataUrl;

  const applyStatusCopy = (copy: SubmissionStatusCopy): void => {
    kicker.setText(copy.kicker);
    title.setText(copy.title);
    detail.setText(copy.detail);
    liveStatus.textContent = `${copy.title}. ${copy.detail}`;
  };

  const slowStatusTimer = scene.time.delayedCall(
    SLOW_STATUS_DELAY_MILLISECONDS,
    () => {
      if (!container.active) return;
      applyStatusCopy(slowStatusCopy());
    }
  );

  const showReconciliationStatus = (): void => {
    if (!container.active) return;
    slowStatusTimer.remove(false);
    applyStatusCopy(reconciliationStatusCopy());
  };

  const destroy = (): void => {
    slowStatusTimer.remove(false);
    loopingTweens.forEach((tween) => tween.remove());
    liveStatus.remove();
    if (previousAriaBusy === null) gameCanvas.removeAttribute('aria-busy');
    else gameCanvas.setAttribute('aria-busy', previousAriaBusy);
    container.destroy(true);
    if (previewTextureLoaded && scene.textures.exists(previewTextureKey)) {
      scene.textures.remove(previewTextureKey);
    }
  };

  return Object.freeze({ showReconciliationStatus, destroy });
}
