// Phaser adapter for the server-authored rival slate. Rival Run flow owns
// networking; this file owns the paper-native draft layout and no battle rules.

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
import { CanvasModalOverlay } from './overlay';
import {
  planRivalRunChallengeCopy,
  planRivalRunDraftHeading,
} from './rivalrunpresentation';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from './theme';
import { ghostButton, iconButton, label, stickerCard } from './ui';

export type SparRivalDraftOptions = Readonly<{
  challenger: Scribbit;
  choices: readonly RivalRunChoice[];
  rivalRun: RivalRunState;
  forecast: Forecast;
  founderChronicle: FounderChronicle;
  currentDay: number;
  trigger?: HTMLElement | null;
  closeLabel?: string;
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
  let inputReady = reduceMotion;
  let modalActions: CanvasModalOverlay | null = null;
  let detailModalActions: CanvasModalOverlay | null = null;
  let initialControl: HTMLButtonElement | undefined;
  const closeDraft = (): void => {
    if (!inputReady) return;
    modalActions?.setVisible(false);
    options.onClose();
  };
  const heading = planRivalRunDraftHeading(options.rivalRun);
  const challengeCopy = planRivalRunChallengeCopy(options.rivalRun);
  modalActions = new CanvasModalOverlay(
    scene,
    'Choose your next rival',
    closeDraft,
    `${challengeCopy.accessibleSummary} ${heading.subtitle}`,
    options.trigger
  );
  const draftModalActions = modalActions;
  const draftStatus = draftModalActions.addStatus(
    reduceMotion ? '' : 'Opening the rival board.'
  );
  const setInteractionReady = (ready: boolean): void => {
    inputReady = ready;
    draftStatus.textContent = ready
      ? ''
      : 'Starting the selected rival fight. Please wait.';
    if (ready) draftModalActions.focusInitial(initialControl);
  };
  const backdrop = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.deskHex, 0.88)
    .setDepth(2_000)
    .setInteractive();
  const cardWidth = width - 64;
  const cardHeight = 940;
  const card = stickerCard(
    scene,
    width / 2,
    height / 2,
    cardWidth,
    cardHeight,
    { tapeColor: UI.tapeAlt, tapeWidth: 92 }
  );
  card.setDepth(2_001).setScale(reduceMotion ? 1 : 0.78);
  if (!reduceMotion) {
    scene.tweens.add({
      targets: card,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        setInteractionReady(true);
      },
    });
  }

  card.add(label(scene, 0, -420, heading.title, 38, UI.ink, true));
  card.add(label(scene, 0, -380, heading.subtitle, 20, UI.inkSoft, true));
  card.add(
    scene.add
      .rectangle(0, -330, cardWidth - 120, 48, UI.tape, 0.82)
      .setStrokeStyle(2, UI.inkHex, 0.3)
  );
  card.add(
    label(
      scene,
      0,
      -330,
      `${challengeCopy.goal} • ${challengeCopy.progress}`,
      20,
      UI.goldText,
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
    detailModalActions?.destroy();
    detailModalActions = null;
  };

  const showRivalInfo = (
    plan: SparRivalCardPlan,
    choice: RivalRunChoice
  ): void => {
    if (!inputReady) return;
    detailModalActions?.destroy();
    detailModalActions = new CanvasModalOverlay(
      scene,
      `${plan.name} rival details`,
      closeRivalInfo,
      `${plan.signatureName}. ${plan.element}, level ${plan.level}. ${riskLabel(choice.tier)} risk for ${choice.winPoints} ${choice.winPoints === 1 ? 'point' : 'points'}. ${plan.levelLine}. ${plan.forecastLine}.`
    );
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
    const nativeDetailClose = detailModalActions.add({
      label: 'Close rival details',
      rect: {
        x: width / 2 + 176,
        y: height / 2 - 264,
        width: 100,
        height: 100,
      },
      onActivate: closeRivalInfo,
    });

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
    detailModalActions.focusInitial(nativeDetailClose);
  };

  const plans = planSparRivalCards(
    options.challenger,
    options.choices.map((choice) => choice.rival),
    options.forecast,
    options.founderChronicle,
    options.currentDay
  );
  const rowCenters = [-205, 25, 255] as const;

  plans.slice(0, rowCenters.length).forEach((plan, index) => {
    const choice = options.choices[index];
    const rival = choice?.rival;
    const rowY = rowCenters[index];
    if (!rival || !choice || rowY === undefined) return;
    const style = ELEMENT_STYLES[plan.element];
    const background = scene.add
      .rectangle(0, rowY, cardWidth - 88, 190, style.soft, 0.3)
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
    draftModalActions.add({
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
      setInteractionReady(false);
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
    const nativeFight = draftModalActions.add({
      label: `Fight ${plan.name}: ${riskLabel(choice.tier).toLowerCase()}, win ${choice.winPoints} ${choice.winPoints === 1 ? 'point' : 'points'}. Challenge: ${challengeCopy.name}, ${challengeCopy.goal}, ${challengeCopy.progress}.`,
      rect: {
        x: width / 2 + 180 - 85,
        y: height / 2 + rowY + 58 - 50,
        width: 170,
        height: 100,
      },
      onActivate: chooseRival,
    });
    initialControl ??= nativeFight;
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

  const close = ghostButton(scene, 0, 408, '‹', closeDraft, 100, 100);
  card.add(close);
  draftModalActions.add({
    label: options.closeLabel ?? 'Back',
    rect: {
      x: width / 2 - 50,
      y: height / 2 + 358,
      width: 100,
      height: 100,
    },
    onActivate: closeDraft,
  });

  card.add(detailLayer);
  if (reduceMotion) draftModalActions.focusInitial(initialControl);

  let destroyed = false;
  return {
    container: card,
    setAccessibleVisible: (visible) => {
      setInteractionReady(visible);
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      detailModalActions?.destroy();
      detailModalActions = null;
      draftModalActions.destroy();
      modalActions = null;
      if (backdrop.scene) backdrop.destroy();
      if (card.scene) card.destroy(true);
    },
  };
}
