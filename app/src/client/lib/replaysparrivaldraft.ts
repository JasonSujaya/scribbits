// Phaser adapter for the server-authored rival slate. Replay owns networking;
// this file owns the paper-native draft layout and nothing about battle rules.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Forecast, Scribbit } from '../../shared/arena';
import { generateDoodleTexture } from './proceduraldoodleart';
import { planSparRivalCards } from './sparrivals';
import { ELEMENT_STYLES, TYPE, UI } from './theme';
import { button, elementBadge, ghostButton, label, stickerCard } from './ui';

export type SparRivalDraftOptions = Readonly<{
  challenger: Scribbit;
  rivals: readonly Scribbit[];
  forecast: Forecast;
  onChoose: (rival: Scribbit) => void;
  onClose: () => void;
}>;

export type SparRivalDraft = Readonly<{
  container: Phaser.GameObjects.Container;
  destroy: () => void;
}>;

function leftLabel(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string,
  width: number,
  bold = false
): Phaser.GameObjects.Text {
  return label(scene, x, y, text, size, color, bold)
    .setOrigin(0, 0.5)
    .setWordWrapWidth(width, true)
    .setAlign('left');
}

export function createSparRivalDraft(
  scene: Scene,
  options: SparRivalDraftOptions
): SparRivalDraft {
  const { width, height } = scene.scale;
  const backdrop = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.deskHex, 0.88)
    .setDepth(99)
    .setInteractive();
  const cardWidth = width - 64;
  const cardHeight = 1_060;
  const card = stickerCard(
    scene,
    width / 2,
    height / 2,
    cardWidth,
    cardHeight,
    { tapeColor: UI.tapeAlt, tapeWidth: 92 }
  );
  card.setDepth(100).setScale(0.78);
  scene.tweens.add({
    targets: card,
    scale: 1,
    duration: 260,
    ease: 'Back.easeOut',
  });

  card.add(label(scene, 0, -468, 'PICK YOUR NEXT RIVAL', 40, UI.ink, true));
  card.add(
    label(
      scene,
      0,
      -420,
      'Server-picked fair slate • you choose the style',
      TYPE.caption,
      UI.inkSoft,
      true
    )
  );

  const plans = planSparRivalCards(
    options.challenger,
    options.rivals,
    options.forecast
  );
  const rowCenters = [-260, -25, 210] as const;

  plans.slice(0, rowCenters.length).forEach((plan, index) => {
    const rival = options.rivals[index];
    const rowY = rowCenters[index];
    if (!rival || rowY === undefined) return;
    const style = ELEMENT_STYLES[plan.element];
    const background = scene.add
      .rectangle(0, rowY, cardWidth - 70, 205, style.soft, 0.3)
      .setStrokeStyle(4, style.primary, 0.95);
    card.add(background);

    const texture = generateDoodleTexture(
      scene,
      rival.id,
      rival.element,
      rival.stats
    );
    const mascot = scene.add.image(-230, rowY + 4, texture);
    mascot.setDisplaySize(150, 150);
    card.add(mascot);

    const badge = elementBadge(scene, -95, rowY - 64, plan.element, 0.62);
    card.add(badge);
    card.add(
      leftLabel(scene, -138, rowY - 17, plan.name, 30, UI.ink, 260, true)
    );
    card.add(
      leftLabel(
        scene,
        -138,
        rowY + 22,
        `Lv${plan.level} • ${plan.signatureName.toUpperCase()}`,
        21,
        style.primaryText,
        285,
        true
      )
    );
    card.add(
      leftLabel(
        scene,
        -138,
        rowY + 58,
        plan.powerLine,
        18,
        UI.inkSoft,
        300,
        true
      )
    );

    const relationship = label(
      scene,
      218,
      rowY - 46,
      `${plan.levelLine}\n${plan.forecastLine}`,
      18,
      plan.forecastLine === 'FORECAST BOOST'
        ? UI.goldText
        : plan.forecastLine === 'FORECAST DRAG'
          ? UI.coralText
          : UI.inkSoft,
      true
    ).setLineSpacing(3);
    relationship.setWordWrapWidth(180, true);
    card.add(relationship);

    const fight = button(
      scene,
      218,
      rowY + 55,
      'FIGHT →',
      () => options.onChoose(rival),
      210,
      style.primary,
      UI.ink
    );
    fight.setScale(0.78);
    card.add(fight);
  });

  if (plans.length === 0) {
    card.add(
      label(
        scene,
        0,
        -20,
        'The rival board is empty. Try again in a moment.',
        TYPE.body,
        UI.inkSoft,
        true
      ).setWordWrapWidth(cardWidth - 100)
    );
  }

  const close = ghostButton(
    scene,
    0,
    445,
    'Not now — back to result',
    options.onClose,
    390
  );
  card.add(close);

  return {
    container: card,
    destroy: () => {
      backdrop.destroy();
      card.destroy(true);
    },
  };
}
