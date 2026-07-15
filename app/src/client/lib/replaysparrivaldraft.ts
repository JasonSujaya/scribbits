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
import { getCombatRoleContent } from '../../shared/combat/roles';
import { generateDoodleTexture } from './proceduraldoodleart';
import { paperIcon } from './papericons';
import { planSparRivalCards } from './sparrivals';
import type { SparRivalCardPlan } from './sparrivals';
import { CanvasModalOverlay } from './overlay';
import {
  planRivalRunChallengeCopy,
  planRivalRunDraftHeading,
} from './rivalrunpresentation';
import { prefersReducedMotion, ROLE_STYLES, TYPE, UI } from './theme';
import { addCardPressInteraction, ghostButton, label, stickerCard } from './ui';

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
  if (tier === 'safe') return 'LOW RISK';
  if (tier === 'even') return 'MEDIUM RISK';
  return 'HIGH RISK';
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
      `${plan.roleName}, ${plan.rangeLabel}, using ${plan.weaponName} and ${plan.signatureName}. ${choice.matchup.label}. ${choice.matchup.detail}. Level ${plan.level}. ${riskLabel(choice.tier)} rival. Win to earn ${choice.winPoints} ${choice.winPoints === 1 ? 'point' : 'points'}. ${plan.levelLine}.`
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
        `${plan.roleName.toUpperCase()} · ${plan.rangeLabel}`,
        26,
        UI.ink,
        335,
        true
      )
    );

    detailContent.add(
      paperIcon(scene, 'spark', -190, -12, {
        size: 36,
        fill: UI.coral,
      })
    );
    detailContent.add(
      leftLabel(
        scene,
        -154,
        -12,
        `POWER-UPS ${choice.rival.powerUpIds?.length ?? 0}/5 • LV ${plan.level}`,
        26,
        UI.coralText,
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
        `${riskLabel(choice.tier)} • WIN ${choice.winPoints} ${choice.winPoints === 1 ? 'POINT' : 'POINTS'}`,
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
        `${choice.matchup.label} • ${plan.levelLine} • ${plan.forecastLine}`,
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
    const roleStyle = ROLE_STYLES[plan.role];
    const rowWidth = cardWidth - 88;
    const rowHeight = 190;
    const row = scene.add.container(0, rowY);
    card.add(row);

    const chooseRival = (): void => {
      if (!inputReady) return;
      setInteractionReady(false);
      options.onChoose(rival, plan);
    };

    const background = scene.add.graphics();
    background.fillStyle(UI.creamHex, 0.98);
    background.fillRoundedRect(
      -rowWidth / 2,
      -rowHeight / 2,
      rowWidth,
      rowHeight,
      22
    );
    background.lineStyle(3, roleStyle.color, 0.78);
    background.strokeRoundedRect(
      -rowWidth / 2,
      -rowHeight / 2,
      rowWidth,
      rowHeight,
      22
    );
    row.add(background);

    addCardPressInteraction({
      scene,
      card: row,
      width: rowWidth,
      height: rowHeight,
      onActivate: chooseRival,
    });

    const roleStripe = scene.add.graphics();
    roleStripe.fillStyle(roleStyle.color, 1);
    roleStripe.fillRoundedRect(-rowWidth / 2 + 10, -66, 10, 132, 5);
    row.add(roleStripe);

    const mascotBacking = scene.add
      .circle(-218, 0, 60, roleStyle.soft, 0.32)
      .setStrokeStyle(2, roleStyle.color, 0.42);
    row.add(mascotBacking);

    const texture = generateDoodleTexture(
      scene,
      rival.id,
      rival.element,
      rival.stats
    );
    const mascot = scene.add.image(-218, 0, texture);
    mascot.setDisplaySize(102, 102);
    row.add(mascot);

    row.add(leftLabel(scene, -146, -42, plan.name, 30, UI.ink, 244, true));
    row.add(
      paperIcon(scene, getCombatRoleContent(plan.role).icon, -132, 4, {
        size: 28,
        fill: roleStyle.color,
        stroke: UI.inkHex,
      })
    );
    row.add(
      leftLabel(
        scene,
        -108,
        4,
        plan.roleName.toUpperCase(),
        21,
        roleStyle.colorText,
        196,
        true
      )
    );
    row.add(
      leftLabel(
        scene,
        -132,
        40,
        `${choice.matchup.label} · WIN +${choice.winPoints}`,
        16,
        roleStyle.colorText,
        220,
        true
      )
    );
    const riskChip = scene.add.graphics();
    riskChip.fillStyle(UI.tape, 0.72);
    riskChip.fillRoundedRect(104, -45, 144, 44, 16);
    riskChip.lineStyle(2, UI.inkHex, 0.42);
    riskChip.strokeRoundedRect(104, -45, 144, 44, 16);
    row.add(riskChip);
    row.add(label(scene, 176, -23, riskLabel(choice.tier), 20, UI.ink, true));

    const fightPlate = scene.add.graphics();
    fightPlate.fillStyle(roleStyle.color, 1);
    fightPlate.fillRoundedRect(104, 19, 144, 62, 18);
    fightPlate.lineStyle(3, UI.inkHex, 0.72);
    fightPlate.strokeRoundedRect(104, 19, 144, 62, 18);
    row.add(fightPlate);
    row.add(
      paperIcon(scene, 'sword', 130, 50, {
        size: 28,
        fill: UI.creamHex,
        stroke: UI.inkHex,
      })
    );
    row.add(label(scene, 197, 50, 'FIGHT', 22, UI.cream, true));

    const openInfo = (): void => showRivalInfo(plan, choice);
    const infoControl = scene.add.container(252, -58);
    const infoMark = paperIcon(scene, 'info', 0, 0, {
      size: 42,
      fill: UI.creamHex,
      stroke: UI.inkHex,
    });
    const infoHit = scene.add
      .rectangle(0, 0, 84, 84, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    infoHit.on('pointerup', openInfo);
    infoControl.add([infoMark, infoHit]);
    row.add(infoControl);
    draftModalActions.add({
      label: `More about ${plan.name}`,
      rect: {
        x: width / 2 + 252 - 42,
        y: height / 2 + rowY - 58 - 42,
        width: 84,
        height: 84,
      },
      onActivate: openInfo,
    });

    const nativeFight = draftModalActions.add({
      label: `Fight ${plan.name}: ${choice.matchup.label}. ${choice.matchup.detail}. ${riskLabel(choice.tier).toLowerCase()}, win ${choice.winPoints} ${choice.winPoints === 1 ? 'point' : 'points'}. Challenge: ${challengeCopy.name}, ${challengeCopy.goal}, ${challengeCopy.progress}.`,
      rect: {
        x: width / 2 + 104,
        y: height / 2 + rowY + 19,
        width: 144,
        height: 62,
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

  const backControlSize = 84;
  const backInsetX = 58;
  const backInsetY = 62;
  const backCenterX = -cardWidth / 2 + backInsetX;
  const backCenterY = -cardHeight / 2 + backInsetY;
  card.add(
    ghostButton(
      scene,
      backCenterX,
      backCenterY,
      '‹',
      closeDraft,
      backControlSize,
      backControlSize
    )
  );
  draftModalActions.add({
    label: options.closeLabel ?? 'Back',
    rect: {
      x: width / 2 + backCenterX - backControlSize / 2,
      y: height / 2 + backCenterY - backControlSize / 2,
      width: backControlSize,
      height: backControlSize,
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
