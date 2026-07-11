import { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import { fitDrawing, loadDrawing } from './scribbits';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from './theme';
import { label, stickerCard } from './ui';
import type { CareMomentPlan } from './caremoment';

const CARE_MOMENT_DEPTH = 2450;
const CARE_MOMENT_VISIBLE_MILLISECONDS = 5200;

export type CareMomentOverlay = Readonly<{
  destroy: () => void;
}>;

/**
 * Opens a short, paper-native care receipt over the rebuilt Arena. The server
 * has already accepted the care action; this layer only celebrates that truth.
 */
export function openCareMomentOverlay(
  scene: Scene,
  scribbit: Scribbit,
  plan: CareMomentPlan
): CareMomentOverlay {
  const { width, height } = scene.scale;
  const style = ELEMENT_STYLES[scribbit.element];
  const reduceMotion = prefersReducedMotion();
  const cardWidth = width - 86;
  const cardHeight = 340;
  const cardCenterY = height - 278;
  let destroyed = false;

  const layer = scene.add
    .container(0, 0)
    .setDepth(CARE_MOMENT_DEPTH)
    .setScrollFactor(0);
  const dismissSurface = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.24)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  layer.add(dismissSurface);

  const card = stickerCard(
    scene,
    width / 2,
    cardCenterY,
    cardWidth,
    cardHeight,
    {
      tapeColor: style.soft,
      tilt: -0.35,
    }
  )
    .setAlpha(0)
    .setScale(0.94)
    .setScrollFactor(0);
  card.y += 34;
  layer.add(card);

  const left = -cardWidth / 2;
  const artCenterX = left + 104;
  const copyLeftX = left + 198;
  const copyWidth = cardWidth - 232;

  card.add(
    label(scene, 0, -134, plan.eyebrow, TYPE.caption, style.primaryText, true)
  );
  const headline = label(scene, copyLeftX, -82, plan.headline, 30, UI.ink, true)
    .setOrigin(0, 0.5)
    .setWordWrapWidth(copyWidth);
  card.add(headline);

  const artHalo = scene.add
    .circle(artCenterX, 5, 74, style.soft, 0.52)
    .setStrokeStyle(4, style.primary, 0.9);
  card.add(artHalo);

  const reaction = label(
    scene,
    copyLeftX,
    8,
    `“${plan.reaction}”`,
    TYPE.body,
    UI.ink,
    true
  )
    .setOrigin(0, 0.5)
    .setWordWrapWidth(copyWidth)
    .setLineSpacing(5);
  card.add(reaction);

  const rewardTape = scene.add
    .rectangle(0, 104, cardWidth - 66, 44, style.soft, 0.88)
    .setStrokeStyle(2, UI.inkHex, 0.45)
    .setAngle(0.25);
  const reward = label(scene, 0, 104, plan.rewardLine, 20, UI.ink, true);
  const progress = label(
    scene,
    0,
    145,
    `${plan.progressLine}  •  TAP TO KEEP GOING`,
    18,
    UI.inkSoft,
    true
  );
  card.add([rewardTape, reward, progress]);

  void loadDrawing(scene, scribbit).then((textureKey) => {
    if (destroyed || !layer.active || !scene.scene.isActive()) return;
    const drawing = fitDrawing(scene.add.image(artCenterX, 5, textureKey), 126);
    card.add(drawing);
    drawing.setAlpha(0);
    if (reduceMotion) {
      drawing.setAlpha(1);
    } else {
      drawing.setAlpha(1);
      scene.tweens.add({
        targets: drawing,
        scaleX: drawing.scaleX * 1.05,
        scaleY: drawing.scaleY * 1.05,
        duration: 220,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }
  });

  if (reduceMotion) {
    card.setPosition(card.x, cardCenterY).setAlpha(1).setScale(1);
  } else {
    scene.tweens.add({
      targets: card,
      y: cardCenterY,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  const autoDismiss = scene.time.delayedCall(
    CARE_MOMENT_VISIBLE_MILLISECONDS,
    () => dismiss()
  );

  const dismiss = (): void => {
    if (destroyed) return;
    destroyed = true;
    autoDismiss.remove();
    if (reduceMotion) {
      layer.destroy(true);
      return;
    }
    scene.tweens.add({
      targets: card,
      y: cardCenterY + 30,
      alpha: 0,
      duration: 150,
      ease: 'Cubic.easeIn',
      onComplete: () => layer.destroy(true),
    });
    dismissSurface.disableInteractive();
  };

  dismissSurface.on('pointerup', dismiss);

  return Object.freeze({
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      autoDismiss.remove();
      layer.destroy(true);
    },
  });
}
