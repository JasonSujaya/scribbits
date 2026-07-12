// Phaser adapter for the server-authored rival slate. Replay owns networking;
// this file owns the paper-native draft layout and nothing about battle rules.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Forecast, FounderChronicle, Scribbit } from '../../shared/arena';
import { generateDoodleTexture } from './proceduraldoodleart';
import { formatSparRivalDraftSummary, planSparRivalCards } from './sparrivals';
import type { SparRivalCardPlan } from './sparrivals';
import type { BattleRecapHighlight } from './battlerecap';
import { CanvasActionOverlay } from './overlay';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from './theme';
import { button, elementBadge, ghostButton, label, stickerCard } from './ui';

export type SparRivalDraftOptions = Readonly<{
  challenger: Scribbit;
  rivals: readonly Scribbit[];
  forecast: Forecast;
  founderChronicle: FounderChronicle;
  currentDay: number;
  lastBoutHighlight: BattleRecapHighlight | null;
  onChoose: (rival: Scribbit, plan: SparRivalCardPlan) => void;
  onClose: () => void;
}>;

export type SparRivalDraft = Readonly<{
  container: Phaser.GameObjects.Container;
  setAccessibleVisible: (visible: boolean) => void;
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
  const reduceMotion = prefersReducedMotion();
  const accessibleOverlay = new CanvasActionOverlay(scene);
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
  card.setDepth(100).setScale(reduceMotion ? 1 : 0.78);
  if (!reduceMotion) {
    scene.tweens.add({
      targets: card,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  card.add(label(scene, 0, -468, 'PICK YOUR NEXT RIVAL', 40, UI.ink, true));
  card.add(
    label(
      scene,
      0,
      -420,
      formatSparRivalDraftSummary(options.lastBoutHighlight),
      TYPE.caption,
      UI.inkSoft,
      true
    ).setWordWrapWidth(cardWidth - 100)
  );

  const plans = planSparRivalCards(
    options.challenger,
    options.rivals,
    options.forecast,
    options.founderChronicle,
    options.currentDay
  );
  const rowCenters = [-260, -25, 210] as const;

  plans.slice(0, rowCenters.length).forEach((plan, index) => {
    const rival = options.rivals[index];
    const rowY = rowCenters[index];
    if (!rival || rowY === undefined) return;
    const style = ELEMENT_STYLES[plan.element];
    const activeThread = plan.rivalryState.startsWith('active-');
    const background = scene.add
      .rectangle(
        0,
        rowY,
        cardWidth - 70,
        205,
        activeThread ? UI.tapeAlt : style.soft,
        activeThread ? 0.5 : 0.3
      )
      .setStrokeStyle(
        activeThread ? 6 : 4,
        activeThread ? UI.inkHex : style.primary,
        0.95
      );
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
      leftLabel(scene, -138, rowY - 35, plan.name, 28, UI.ink, 260, true)
    );
    if (plan.epithet) {
      card.add(
        leftLabel(
          scene,
          -138,
          rowY - 4,
          plan.epithet.toUpperCase(),
          18,
          UI.coralText,
          285,
          true
        )
      );
    }
    card.add(
      leftLabel(
        scene,
        -138,
        rowY + 21,
        `Lv${plan.level} • ${plan.signatureName.toUpperCase()}`,
        20,
        style.primaryText,
        285,
        true
      )
    );
    card.add(
      leftLabel(
        scene,
        -138,
        rowY + 70,
        plan.challengeLine ? `“${plan.challengeLine}”` : plan.powerLine,
        18,
        UI.inkSoft,
        250,
        false
      )
    );

    const relationship = label(
      scene,
      218,
      rowY - 46,
      plan.rivalryLine,
      activeThread ? 20 : 18,
      activeThread
        ? UI.ink
        : plan.rivalryState === 'available'
          ? UI.coralText
          : UI.inkSoft,
      true
    ).setLineSpacing(3);
    relationship.setWordWrapWidth(180, true);
    card.add(relationship);

    const chooseRival = (): void => {
      if (!plan.buttonEnabled) return;
      accessibleOverlay.setVisible(false);
      options.onChoose(rival, plan);
    };
    const fight = button(
      scene,
      218,
      rowY + 55,
      plan.buttonLabel,
      chooseRival,
      210,
      plan.buttonEnabled ? style.primary : UI.tapeAlt,
      UI.ink,
      100
    );
    if (!plan.buttonEnabled) fight.setAlpha(0.62);
    card.add(fight);
    accessibleOverlay.add({
      label: `Fight ${plan.name}: ${plan.buttonLabel}`,
      rect: {
        x: width / 2 + 218 - 105,
        y: height / 2 + rowY + 55 - 50,
        width: 210,
        height: 100,
      },
      enabled: plan.buttonEnabled,
      onActivate: chooseRival,
    });
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

  const closeDraft = (): void => {
    accessibleOverlay.setVisible(false);
    options.onClose();
  };
  const close = ghostButton(
    scene,
    0,
    445,
    'Not now — back to result',
    closeDraft,
    390,
    100
  );
  card.add(close);
  accessibleOverlay.add({
    label: 'Not now, back to result',
    rect: {
      x: width / 2 - 195,
      y: height / 2 + 395,
      width: 390,
      height: 100,
    },
    onActivate: closeDraft,
  });

  let destroyed = false;
  return {
    container: card,
    setAccessibleVisible: (visible) => accessibleOverlay.setVisible(visible),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      accessibleOverlay.destroy();
      if (backdrop.scene) backdrop.destroy();
      if (card.scene) card.destroy(true);
    },
  };
}
