import type { Scene } from 'phaser';
import {
  POWER_UP_CATALOG,
  type PowerUpId,
  type PowerUpOffer,
} from '../../shared/combat/powerups';
import { choosePowerUp } from './api';
import { CanvasModalOverlay } from './overlay';
import { paperIcon, type PaperIconKey } from './papericons';
import { prefersReducedMotion, UI } from './theme';
import { label, stickerCard } from './ui';
import { playSfx } from './sfx';

const iconByPowerUpId: Readonly<Record<PowerUpId, PaperIconKey>> = {
  'v1-edge-spring': 'resize',
  'v1-smudge-step': 'boots',
  'v1-paper-shield': 'shield',
  'v1-combo-spark': 'spark',
  'v1-center-fold': 'target',
  'v1-double-doodle': 'replay',
  'v1-backup-plan': 'replay',
  'v1-counter-sketch': 'sword',
  'v1-wallop': 'gun',
  'v1-echo-mark': 'target',
  'v1-last-scribble': 'heart',
  'v1-second-draft': 'pencil',
  'v1-paper-twin': 'paw',
  'v1-masterpiece': 'trophy',
  'v1-endless-draft': 'replay',
};

const rarityColor = (rarity: string): number => {
  if (rarity === 'legendary') return UI.gold;
  if (rarity === 'epic') return 0xa96bd8;
  if (rarity === 'rare') return UI.coral;
  return UI.inkHex;
};

export type PowerUpDraftHandle = Readonly<{ destroy: () => void }>;

export const openPowerUpDraft = (
  scene: Scene,
  offer: PowerUpOffer,
  ownedPowerUpCount: number,
  onClaimed: (selectedId: PowerUpId) => void
): PowerUpDraftHandle => {
  const { width, height } = scene.scale;
  const reduceMotion = prefersReducedMotion();
  let busy = false;
  let destroyed = false;
  const backdrop = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.deskHex, 0.94)
    .setDepth(4_000)
    .setInteractive();
  const sheet = stickerCard(scene, width / 2, height / 2, width - 42, 850, {
    tapeColor: UI.tapeAlt,
    tapeWidth: 100,
  });
  sheet.setDepth(4_001).setScale(reduceMotion ? 1 : 0.86);
  const status = label(scene, 0, 374, '', 18, UI.coralText, true);
  sheet.add([
    label(scene, 0, -374, 'POWER-UP! · CHOOSE 1', 36, UI.ink, true),
    label(
      scene,
      0,
      -334,
      `${ownedPowerUpCount}/5 SLOTS FILLED · 1 LEGENDARY MAX`,
      18,
      UI.inkSoft,
      true
    ),
    status,
  ]);

  const modal = new CanvasModalOverlay(
    scene,
    'Choose one Power-Up',
    () => undefined,
    `Victory reward. Choose one of three behavioral Power-Ups. ${ownedPowerUpCount} of 5 slots are filled.`
  );
  const controls: HTMLButtonElement[] = [];
  const cardHeight = 186;
  const cardWidth = width - 110;

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    modal.destroy();
    sheet.destroy(true);
    backdrop.destroy();
  };

  const selectPowerUp = async (selectedId: PowerUpId): Promise<void> => {
    if (busy || destroyed) return;
    busy = true;
    controls.forEach((control) => {
      control.disabled = true;
    });
    status.setText('STAMPING YOUR CHOICE…');
    const result = await choosePowerUp({
      scribbitId: offer.scribbitId,
      offerId: offer.id,
      selectedId,
      expectedPowerUpCount: ownedPowerUpCount,
    });
    if (!result.ok) {
      busy = false;
      controls.forEach((control) => {
        control.disabled = false;
      });
      status.setText(result.error.toUpperCase());
      return;
    }
    playSfx('reward.ink');
    onClaimed(selectedId);
    destroy();
  };

  offer.choices.forEach((powerUpId, index) => {
    const definition = POWER_UP_CATALOG[powerUpId];
    const y = -202 + index * 202;
    const frameColor = rarityColor(definition.rarity);
    const frame = scene.add
      .rectangle(0, y, cardWidth, cardHeight, UI.creamHex, 1)
      .setStrokeStyle(definition.rarity === 'common' ? 3 : 6, frameColor, 1);
    const icon = paperIcon(scene, iconByPowerUpId[powerUpId], -cardWidth / 2 + 72, y, {
      size: 58,
      fill: frameColor,
    });
    const name = label(
      scene,
      -cardWidth / 2 + 120,
      y - 48,
      definition.name.toUpperCase(),
      27,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    const rarity = label(
      scene,
      cardWidth / 2 - 22,
      y - 48,
      definition.rarity.toUpperCase(),
      16,
      definition.rarity === 'common' ? UI.inkSoft : `#${frameColor.toString(16).padStart(6, '0')}`,
      true
    ).setOrigin(1, 0.5);
    const description = label(
      scene,
      -cardWidth / 2 + 120,
      y + 18,
      definition.description,
      19,
      UI.inkSoft,
      false
    )
      .setOrigin(0, 0.5)
      .setWordWrapWidth(cardWidth - 165, true)
      .setAlign('left');
    sheet.add([frame, icon, name, rarity, description]);
    const control = modal.add({
      label: `Choose ${definition.name}, ${definition.rarity}. ${definition.description}`,
      rect: {
        x: width / 2 - cardWidth / 2,
        y: height / 2 + y - cardHeight / 2,
        width: cardWidth,
        height: cardHeight,
      },
      onActivate: () => void selectPowerUp(powerUpId),
    });
    controls.push(control);
  });

  if (!reduceMotion) {
    scene.tweens.add({
      targets: sheet,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => modal.focusInitial(controls[0]),
    });
  } else {
    modal.focusInitial(controls[0]);
  }

  return Object.freeze({ destroy });
};
