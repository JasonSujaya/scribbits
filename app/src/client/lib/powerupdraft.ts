import type { Scene } from 'phaser';
import {
  POWER_UP_CATALOG,
  type PowerUpId,
  type PowerUpOffer,
} from '../../shared/combat/powerups';
import { choosePowerUp } from './api';
import { CanvasModalOverlay, canvasFocusIsKeyboardDriven } from './overlay';
import { powerUpPaperIcon } from './papericons';
import { prefersReducedMotion, UI } from './theme';
import { label, stickerCard } from './ui';
import { playSfx } from './sfx';

const RARE_CARD_COLOR = 0x4f9dcc;
const RARE_CARD_TEXT = '#276789';
const LEGENDARY_CARD_BORDER = 0xc58b10;

const rarityColor = (rarity: string): number => {
  if (rarity === 'legendary') return LEGENDARY_CARD_BORDER;
  if (rarity === 'epic') return 0xa96bd8;
  if (rarity === 'rare') return RARE_CARD_COLOR;
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
  const isBirthOffer = offer.source === 'birth';
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
    label(
      scene,
      0,
      -374,
      isBirthOffer ? 'FIRST POWER-UP · CHOOSE 1' : 'POWER-UP! · CHOOSE 1',
      36,
      UI.ink,
      true
    ),
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
    `${isBirthOffer ? 'New Scribbit bonus.' : 'Victory reward.'} Choose one of three behavioral Power-Ups. ${ownedPowerUpCount} of 5 slots are filled.`
  );
  const controls: HTMLButtonElement[] = [];
  const resetCardVisuals: Array<() => void> = [];
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
    resetCardVisuals.forEach((resetCardVisual) => resetCardVisual());
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
    const isRare = definition.rarity === 'rare';
    const isLegendary = definition.rarity === 'legendary';
    const restingStrokeWidth =
      definition.rarity === 'common' ? 3 : isLegendary ? 5 : 4;
    const hoverShadow = scene.add.rectangle(
      0,
      6,
      cardWidth,
      cardHeight,
      UI.inkHex,
      0
    );
    const frame = scene.add
      .rectangle(0, 0, cardWidth, cardHeight, UI.creamHex, 1)
      .setStrokeStyle(restingStrokeWidth, frameColor, 1);
    const rareRail = scene.add.rectangle(
      -cardWidth / 2 + 7,
      0,
      9,
      cardHeight - 14,
      RARE_CARD_COLOR,
      isRare ? 0.72 : 0
    );
    const rareIconBacking = scene.add.circle(
      -cardWidth / 2 + 72,
      0,
      39,
      RARE_CARD_COLOR,
      isRare ? 0.11 : 0
    );
    const legendaryIconHalo = scene.add.star(
      -cardWidth / 2 + 72,
      0,
      12,
      34,
      46,
      UI.goldHex,
      isLegendary ? 0.22 : 0
    );
    const legendaryGlint = scene.add.star(
      cardWidth / 2 - 166,
      -48,
      4,
      3,
      10,
      UI.goldHex,
      isLegendary ? 0.9 : 0
    );
    const rarityChip = scene.add.graphics();
    const drawRarityChip = (active: boolean): void => {
      rarityChip.clear();
      if (isRare) {
        rarityChip.fillStyle(RARE_CARD_COLOR, active ? 0.24 : 0.16);
        rarityChip.fillRoundedRect(cardWidth / 2 - 112, -63, 96, 30, 10);
      } else if (isLegendary) {
        rarityChip.fillStyle(UI.goldHex, active ? 0.55 : 0.42);
        rarityChip.fillRoundedRect(cardWidth / 2 - 154, -65, 140, 34, 11);
      }
    };
    drawRarityChip(false);
    const icon = powerUpPaperIcon(scene, powerUpId, -cardWidth / 2 + 72, 0, {
      size: 58,
      fill: frameColor,
    });
    const name = label(
      scene,
      -cardWidth / 2 + 120,
      -48,
      definition.name.toUpperCase(),
      27,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    const rarityTextColor =
      definition.rarity === 'common'
        ? UI.inkSoft
        : isRare
          ? RARE_CARD_TEXT
          : isLegendary
            ? UI.goldText
            : `#${frameColor.toString(16).padStart(6, '0')}`;
    const rarity = label(
      scene,
      cardWidth / 2 - 22,
      -48,
      `${definition.rarity.toUpperCase()} · ${definition.buildPath === 'wildcard' ? 'ANY BUILD' : definition.buildPath.toUpperCase()}`,
      14,
      rarityTextColor,
      true
    ).setOrigin(1, 0.5);
    const description = label(
      scene,
      -cardWidth / 2 + 120,
      18,
      definition.description,
      19,
      UI.inkSoft,
      false
    )
      .setOrigin(0, 0.5)
      .setWordWrapWidth(cardWidth - 165, true)
      .setAlign('left');
    const card = scene.add.container(0, y, [
      hoverShadow,
      frame,
      rareRail,
      rareIconBacking,
      legendaryIconHalo,
      rarityChip,
      legendaryGlint,
      icon,
      name,
      rarity,
      description,
    ]);
    sheet.add(card);
    const control = modal.add({
      label: `Choose ${definition.name}, ${definition.rarity}, ${definition.buildPath} build. ${definition.description}`,
      rect: {
        x: width / 2 - cardWidth / 2,
        y: height / 2 + y - cardHeight / 2,
        width: cardWidth,
        height: cardHeight,
      },
      onActivate: () => void selectPowerUp(powerUpId),
    });
    let hovered = false;
    let keyboardFocused = false;
    let pressed = false;

    const updateCardVisual = (): void => {
      const active = (hovered || keyboardFocused) && !control.disabled;
      hoverShadow.setFillStyle(UI.inkHex, active ? 0.12 : 0);
      frame.setFillStyle(active ? UI.paper : UI.creamHex, 1);
      rareRail.setAlpha(isRare ? (active ? 0.9 : 0.72) : 0);
      rareIconBacking.setAlpha(isRare ? (active ? 0.17 : 0.11) : 0);
      legendaryIconHalo.setAlpha(isLegendary ? (active ? 0.32 : 0.22) : 0);
      legendaryGlint.setAlpha(isLegendary ? (active ? 1 : 0.9) : 0);
      drawRarityChip(active);

      const targetScale = pressed && active ? 0.995 : 1;
      const targetY = pressed && active ? y - 1 : active ? y - 3 : y;
      scene.tweens.killTweensOf(card);
      if (reduceMotion) {
        card.setPosition(0, y).setScale(1);
        return;
      }
      scene.tweens.add({
        targets: card,
        y: targetY,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: pressed ? 70 : 130,
        ease: active ? 'Quad.easeOut' : 'Quad.easeInOut',
      });
    };
    const resetCardVisual = (): void => {
      hovered = false;
      keyboardFocused = false;
      pressed = false;
      updateCardVisual();
    };
    const resetPointerVisual = (): void => {
      hovered = false;
      pressed = false;
      updateCardVisual();
    };
    const activateCardHover = (): void => {
      if (hovered) return;
      hovered = true;
      updateCardVisual();
    };
    control.addEventListener('pointerenter', activateCardHover);
    control.addEventListener('pointerleave', resetPointerVisual);
    control.addEventListener('focus', () => {
      keyboardFocused = canvasFocusIsKeyboardDriven();
      updateCardVisual();
    });
    control.addEventListener('blur', () => {
      keyboardFocused = false;
      updateCardVisual();
    });
    control.addEventListener('pointerdown', () => {
      pressed = true;
      updateCardVisual();
    });
    control.addEventListener('pointerup', () => {
      pressed = false;
      updateCardVisual();
    });
    control.addEventListener('pointercancel', resetPointerVisual);
    resetCardVisuals.push(resetCardVisual);
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
