// Phaser adapter for the server-authored rival slate. Replay owns networking;
// this file owns the paper-native draft layout and nothing about battle rules.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type {
  Forecast,
  FounderChronicle,
  RivalRunChoice,
  RivalRunState,
  Scribbit,
} from '../../shared/arena';
import { generateDoodleTexture } from './proceduraldoodleart';
import { elementPaperIcon, paperIcon } from './papericons';
import { planSparRivalCards } from './sparrivals';
import type { SparRivalCardPlan } from './sparrivals';
import { CanvasActionOverlay } from './overlay';
import { planRivalRunDraftHeading } from './rivalrunpresentation';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from './theme';
import { ghostButton, iconButton, label, stickerCard } from './ui';

export type SparRivalDraftOptions = Readonly<{
  challenger: Scribbit;
  choices: readonly RivalRunChoice[];
  rivalRun: RivalRunState;
  forecast: Forecast;
  founderChronicle: FounderChronicle;
  currentDay: number;
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

function riskLabel(tier: RivalRunChoice['tier']): string {
  if (tier === 'safe') return 'SAFE';
  if (tier === 'even') return 'EVEN';
  return 'BOLD';
}

export function createSparRivalDraft(
  scene: Scene,
  options: SparRivalDraftOptions
): SparRivalDraft {
  const { width, height } = scene.scale;
  const reduceMotion = prefersReducedMotion();
  const accessibleOverlay = new CanvasActionOverlay(scene);
  const detailAccessibleOverlay = new CanvasActionOverlay(scene);
  detailAccessibleOverlay.setVisible(false);
  let inputReady = reduceMotion;
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
    accessibleOverlay.setVisible(false);
    scene.tweens.add({
      targets: card,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        inputReady = true;
        accessibleOverlay.setVisible(true);
      },
    });
  }

  const heading = planRivalRunDraftHeading(options.rivalRun);
  card.add(label(scene, 0, -472, heading.title, 42, UI.ink, true));
  card.add(
    label(
      scene,
      0,
      -420,
      heading.subtitle,
      TYPE.caption,
      UI.inkSoft,
      true
    )
  );

  const detailLayer = scene.add.container(0, 0).setVisible(false);
  const detailBlocker = scene.add
    .rectangle(0, 0, cardWidth, cardHeight, UI.inkHex, 0.2)
    .setInteractive();
  detailLayer.add(detailBlocker);
  let detailContent: Phaser.GameObjects.Container | null = null;

  const closeRivalInfo = (): void => {
    detailLayer.setVisible(false);
    detailAccessibleOverlay.setVisible(false);
    accessibleOverlay.setVisible(true);
  };
  detailAccessibleOverlay.add({
    label: 'Close rival details',
    rect: {
      x: width / 2 + 176,
      y: height / 2 - 264,
      width: 100,
      height: 100,
    },
    onActivate: closeRivalInfo,
  });

  const showRivalInfo = (
    plan: SparRivalCardPlan,
    choice: RivalRunChoice
  ): void => {
    if (!inputReady) return;
    detailContent?.destroy(true);
    detailContent = scene.add.container(0, 0);
    const detailWidth = cardWidth - 112;
    const infoCard = stickerCard(scene, 0, 0, detailWidth, 560, {
      tape: false,
    });
    detailContent.add(infoCard);
    const closeInfo = ghostButton(
      scene,
      detailWidth / 2 - 58,
      -222,
      '×',
      closeRivalInfo,
      90,
      90
    );
    detailContent.add(closeInfo);

    const name = label(scene, 0, -186, plan.name, 38, UI.ink, true);
    if (name.width > detailWidth - 150) {
      name.setScale((detailWidth - 150) / name.width);
    }
    detailContent.add(name);

    detailContent.add(
      paperIcon(scene, 'sword', -190, -92, {
        size: 34,
        fill: UI.coral,
      })
    );
    detailContent.add(
      leftLabel(
        scene,
        -154,
        -92,
        plan.signatureName.toUpperCase(),
        26,
        UI.ink,
        335,
        true
      )
    );

    detailContent.add(elementPaperIcon(scene, plan.element, -190, -12, 36));
    detailContent.add(
      leftLabel(
        scene,
        -154,
        -12,
        `${plan.element.toUpperCase()} • LV ${plan.level}`,
        26,
        ELEMENT_STYLES[plan.element].primaryText,
        335,
        true
      )
    );

    detailContent.add(
      paperIcon(scene, 'spark', -190, 68, {
        size: 32,
        fill: UI.gold,
      })
    );
    detailContent.add(
      leftLabel(
        scene,
        -154,
        68,
        `${riskLabel(choice.tier)} • +${choice.winPoints} PT${choice.winPoints === 1 ? '' : 'S'}`,
        26,
        UI.coralText,
        335,
        true
      )
    );
    detailContent.add(
      label(
        scene,
        0,
        154,
        `${plan.levelLine} • ${plan.forecastLine}`,
        TYPE.caption,
        UI.inkSoft,
        true
      ).setWordWrapWidth(detailWidth - 90)
    );
    detailLayer.add(detailContent);
    detailLayer.setVisible(true);
    accessibleOverlay.setVisible(false);
    detailAccessibleOverlay.setVisible(true);
  };

  const plans = planSparRivalCards(
    options.challenger,
    options.choices.map((choice) => choice.rival),
    options.forecast,
    options.founderChronicle,
    options.currentDay
  );
  const rowCenters = [-270, -30, 210] as const;

  plans.slice(0, rowCenters.length).forEach((plan, index) => {
    const choice = options.choices[index];
    const rival = choice?.rival;
    const rowY = rowCenters[index];
    if (!rival || !choice || rowY === undefined) return;
    const style = ELEMENT_STYLES[plan.element];
    const background = scene.add
      .rectangle(
        0,
        rowY,
        cardWidth - 88,
        216,
        style.soft,
        0.3
      )
      .setStrokeStyle(4, style.primary, 0.95);
    card.add(background);

    const texture = generateDoodleTexture(
      scene,
      rival.id,
      rival.element,
      rival.stats
    );
    const mascot = scene.add.image(-186, rowY + 4, texture);
    mascot.setDisplaySize(124, 124);
    card.add(mascot);

    card.add(
      leftLabel(scene, -100, rowY - 52, plan.name, 32, UI.ink, 290, true)
    );
    card.add(elementPaperIcon(scene, plan.element, -82, rowY + 1, 36));
    card.add(
      leftLabel(
        scene,
        -54,
        rowY + 1,
        `LV ${plan.level}`,
        23,
        style.primaryText,
        90,
        true
      )
    );

    const riskChip = scene.add
      .rectangle(58, rowY + 1, 88, 42, UI.creamHex, 0.96)
      .setStrokeStyle(3, style.primary, 0.95);
    card.add(riskChip);
    card.add(label(scene, 58, rowY, riskLabel(choice.tier), 19, UI.ink, true));
    card.add(
      paperIcon(scene, 'spark', 127, rowY + 1, {
        size: 27,
        fill: UI.gold,
      })
    );
    card.add(
      leftLabel(
        scene,
        148,
        rowY + 1,
        `+${choice.winPoints}`,
        25,
        UI.coralText,
        52,
        true
      )
    );

    const openInfo = (): void => showRivalInfo(plan, choice);
    const infoControl = scene.add.container(232, rowY - 52);
    const infoMark = paperIcon(scene, 'info', 0, 0, {
      size: 54,
      fill: UI.creamHex,
      stroke: UI.inkHex,
    });
    const infoHit = scene.add
      .rectangle(0, 0, 100, 100, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    infoHit.on('pointerup', openInfo);
    infoControl.add([infoMark, infoHit]);
    card.add(infoControl);
    accessibleOverlay.add({
      label: `More about ${plan.name}`,
      rect: {
        x: width / 2 + 232 - 50,
        y: height / 2 + rowY - 52 - 50,
        width: 100,
        height: 100,
      },
      onActivate: openInfo,
    });

    const chooseRival = (): void => {
      if (!inputReady) return;
      accessibleOverlay.setVisible(false);
      options.onChoose(rival, plan);
    };
    const fightLabel = options.rivalRun.boutsCompleted === 2 ? 'FINAL' : 'SPAR';
    const fight = iconButton(
      scene,
      180,
      rowY + 58,
      'sword',
      fightLabel,
      chooseRival,
      170,
      style.primary,
      UI.ink,
      100
    );
    card.add(fight);
    accessibleOverlay.add({
      label: `Fight ${plan.name}: ${riskLabel(choice.tier).toLowerCase()}, win ${choice.winPoints} ${choice.winPoints === 1 ? 'point' : 'points'}`,
      rect: {
        x: width / 2 + 180 - 85,
        y: height / 2 + rowY + 58 - 50,
        width: 170,
        height: 100,
      },
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
    if (!inputReady) return;
    accessibleOverlay.setVisible(false);
    options.onClose();
  };
  const close = ghostButton(
    scene,
    0,
    445,
    '‹',
    closeDraft,
    100,
    100
  );
  card.add(close);
  accessibleOverlay.add({
    label: 'Back to result',
    rect: {
      x: width / 2 - 50,
      y: height / 2 + 395,
      width: 100,
      height: 100,
    },
    onActivate: closeDraft,
  });

  card.add(detailLayer);

  let destroyed = false;
  return {
    container: card,
    setAccessibleVisible: (visible) => accessibleOverlay.setVisible(visible),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      accessibleOverlay.destroy();
      detailAccessibleOverlay.destroy();
      if (backdrop.scene) backdrop.destroy();
      if (card.scene) card.destroy(true);
    },
  };
}
