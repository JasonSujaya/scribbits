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

const UNCOMMON_CARD_COLOR = 0x49a36d;
const UNCOMMON_CARD_TEXT = '#2f7650';
const RARE_CARD_COLOR = 0x4f9dcc;
const RARE_CARD_TEXT = '#276789';
const LEGENDARY_CARD_BORDER = 0xc58b10;
const IDLE_SHAKE_DELAY_MINIMUM_MS = 1_300;
const IDLE_SHAKE_DELAY_MAXIMUM_MS = 2_800;

type IdleCardMotion = Readonly<{
  canWiggle: () => boolean;
  reset: () => void;
  wiggle: (direction: -1 | 1) => void;
}>;

const rarityColor = (rarity: string): number => {
  if (rarity === 'legendary') return LEGENDARY_CARD_BORDER;
  if (rarity === 'epic') return 0xa96bd8;
  if (rarity === 'rare') return RARE_CARD_COLOR;
  if (rarity === 'uncommon') return UNCOMMON_CARD_COLOR;
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
    `${isBirthOffer ? 'New Scribbit bonus.' : 'Battle reward.'} Choose one of three behavioral Power-Ups. ${ownedPowerUpCount} of 5 slots are filled.`
  );
  const controls: HTMLButtonElement[] = [];
  const resetCardVisuals: Array<() => void> = [];
  const idleCardMotions: IdleCardMotion[] = [];
  const cardHeight = 186;
  const cardWidth = width - 110;
  let idleShakeTimer: ReturnType<typeof scene.time.delayedCall> | null = null;

  const randomInteger = (minimum: number, maximum: number): number =>
    minimum + Math.floor(Math.random() * (maximum - minimum + 1));

  const stopIdleMotion = (): void => {
    idleShakeTimer?.remove(false);
    idleShakeTimer = null;
    idleCardMotions.forEach((motion) => motion.reset());
  };

  const scheduleIdleMotion = (): void => {
    if (reduceMotion || destroyed || busy) return;
    const delay = randomInteger(
      IDLE_SHAKE_DELAY_MINIMUM_MS,
      IDLE_SHAKE_DELAY_MAXIMUM_MS
    );
    idleShakeTimer = scene.time.delayedCall(delay, () => {
      idleShakeTimer = null;
      if (reduceMotion || destroyed || busy) return;
      const availableMotions = idleCardMotions.filter((motion) =>
        motion.canWiggle()
      );
      if (availableMotions.length > 0) {
        const motion =
          availableMotions[randomInteger(0, availableMotions.length - 1)];
        motion?.wiggle(Math.random() < 0.5 ? -1 : 1);
      }
      scheduleIdleMotion();
    });
  };

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    stopIdleMotion();
    modal.destroy();
    sheet.destroy(true);
    backdrop.destroy();
  };

  const selectPowerUp = async (selectedId: PowerUpId): Promise<void> => {
    if (busy || destroyed) return;
    busy = true;
    stopIdleMotion();
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
      scheduleIdleMotion();
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
    const isUncommon = definition.rarity === 'uncommon';
    const isRare = definition.rarity === 'rare';
    const hasTierAccent = isUncommon || isRare;
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
    const tierRail = scene.add.rectangle(
      -cardWidth / 2 + 7,
      0,
      9,
      cardHeight - 14,
      frameColor,
      hasTierAccent ? 0.72 : 0
    );
    const tierIconBacking = scene.add.circle(
      -cardWidth / 2 + 72,
      0,
      39,
      frameColor,
      hasTierAccent ? 0.11 : 0
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
      if (hasTierAccent) {
        const chipWidth = isUncommon ? 126 : 96;
        rarityChip.fillStyle(frameColor, active ? 0.24 : 0.16);
        rarityChip.fillRoundedRect(
          cardWidth / 2 - chipWidth - 16,
          -63,
          chipWidth,
          30,
          10
        );
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
        : isUncommon
          ? UNCOMMON_CARD_TEXT
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
      tierRail,
      tierIconBacking,
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
    const rarityMotionIntensity =
      definition.rarity === 'legendary'
        ? 1.65
        : definition.rarity === 'epic'
          ? 1.45
          : definition.rarity === 'rare'
            ? 1.25
            : definition.rarity === 'uncommon'
              ? 1.12
              : 1;

    const updateCardVisual = (): void => {
      const active = (hovered || keyboardFocused) && !control.disabled;
      hoverShadow.setFillStyle(UI.inkHex, active ? 0.12 : 0);
      frame.setFillStyle(active ? UI.paper : UI.creamHex, 1);
      tierRail.setAlpha(hasTierAccent ? (active ? 0.9 : 0.72) : 0);
      tierIconBacking.setAlpha(hasTierAccent ? (active ? 0.17 : 0.11) : 0);
      legendaryIconHalo.setAlpha(isLegendary ? (active ? 0.32 : 0.22) : 0);
      legendaryGlint.setAlpha(isLegendary ? (active ? 1 : 0.9) : 0);
      drawRarityChip(active);

      const targetScale = pressed && active ? 0.995 : 1;
      const targetY = pressed && active ? y - 1 : active ? y - 3 : y;
      scene.tweens.killTweensOf(card);
      card.setX(0).setAngle(0);
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
    idleCardMotions.push({
      canWiggle: () =>
        !busy &&
        !destroyed &&
        !hovered &&
        !keyboardFocused &&
        !pressed &&
        !control.disabled,
      reset: () => {
        scene.tweens.killTweensOf(card);
        if (card.active) card.setPosition(0, y).setAngle(0).setScale(1);
      },
      wiggle: (direction) => {
        scene.tweens.killTweensOf(card);
        card.setPosition(0, y).setAngle(0).setScale(1);
        scene.tweens.add({
          targets: card,
          x: direction * 2.1 * rarityMotionIntensity,
          angle: direction * 0.5 * rarityMotionIntensity,
          duration: 90,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (card.active) card.setPosition(0, y).setAngle(0);
          },
        });
      },
    });
    resetCardVisuals.push(resetCardVisual);
    controls.push(control);
  });

  if (!reduceMotion) {
    scene.tweens.add({
      targets: sheet,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        modal.focusInitial(controls[0]);
        scheduleIdleMotion();
      },
    });
  } else {
    modal.focusInitial(controls[0]);
  }

  return Object.freeze({ destroy });
};
