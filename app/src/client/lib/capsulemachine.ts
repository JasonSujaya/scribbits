// The Mystery Ink capsule machine — a hand-drawn gacha panel in the sketchbook
// aesthetic (Phaser-drawn, no image assets). Opened as a pinned overlay from
// ArenaHome. The player spends ink to crank the machine: it shakes, a capsule
// drops and pops open with a rarity-tiered ceremony:
//   common → a soft puff
//   rare   → a gold burst
//   epic   → a full-screen rainbow moment + hand-lettered banner
// Duplicate accessories stack; duplicate permanent unlocks report "already got it".

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  CAPSULE_COST,
  CAPSULE_FIRST_DAILY_COST,
  CAPSULE_RARITY_PERCENTAGES,
} from '../../shared/arena';
import type {
  CapsuleProgress,
  CapsulePull,
  CapsulePullResponse,
  CapsuleRarity,
} from '../../shared/arena';
import { UI, TYPE } from './theme';
import { label, handLettered, button, ghostButton } from './ui';
import { RARITY_STYLE } from './pens';
import { COSMETIC_BY_ID } from '../../shared/cosmetics';
import { renderCosmeticPreview } from './cosmeticpreview';

const DEPTH = 2500;
const COLLECTION_BAR_WIDTH = 480;
const COLLECTION_BAR_HEIGHT = 22;
const CAPSULE_ODDS_COPY =
  `ODDS · ${CAPSULE_RARITY_PERCENTAGES.common}% common · ` +
  `${CAPSULE_RARITY_PERCENTAGES.rare}% rare · ` +
  `${CAPSULE_RARITY_PERCENTAGES.epic}% epic`;

// Collector ranks are presentation-only milestones. Pull rewards, rarity, and
// pity remain entirely server-authoritative.
const COLLECTOR_RANKS = [
  { minimumPullCount: 0, name: 'Ink Rookie' },
  { minimumPullCount: 5, name: 'Capsule Scout' },
  { minimumPullCount: 15, name: 'Curio Keeper' },
  { minimumPullCount: 30, name: 'Ink Curator' },
  { minimumPullCount: 60, name: 'Master Archivist' },
] as const;

const createCapsuleOperationId = (): string => {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `capsule-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
  );
};

const collectorProgressForPullCount = (
  pullCount: number
): {
  currentRankName: string;
  nextRankName: string | null;
  pullsUntilNextRank: number;
} => {
  let currentRankIndex = 0;
  for (let index = COLLECTOR_RANKS.length - 1; index >= 0; index -= 1) {
    const rank = COLLECTOR_RANKS[index];
    if (rank && pullCount >= rank.minimumPullCount) {
      currentRankIndex = index;
      break;
    }
  }

  const currentRank = COLLECTOR_RANKS[currentRankIndex] ?? COLLECTOR_RANKS[0];
  const nextRank = COLLECTOR_RANKS[currentRankIndex + 1];
  return {
    currentRankName: currentRank.name,
    nextRankName: nextRank?.name ?? null,
    pullsUntilNextRank: nextRank
      ? Math.max(0, nextRank.minimumPullCount - pullCount)
      : 0,
  };
};

export type CapsuleMachineOpts = {
  ink: number; // current ink balance
  nextCost: number; // server-authoritative current price
  progress: CapsuleProgress; // server-authoritative collection and pity snapshot
  // Perform the pull. The server owns costs, discounts, and final inventory; the
  // machine only mirrors the returned presentation snapshot.
  onPull: (
    operationId: string
  ) => Promise<CapsulePullResponse | { error: string }>;
  onClose: (finalInk: number) => void;
  // Optional terminal action used by ArenaHome. Draw omits it so closing the
  // machine always restores the live drawing canvas exactly as before.
  onViewCollection?: (finalInk: number) => void;
};

export type CapsuleMachine = { destroy: () => void };

type PrizeRevealOptions = {
  acknowledgementLabel: 'GOT IT' | 'KEEP DRAWING';
  onDismiss: () => void;
  onViewCollection?: () => void;
};

export function openCapsuleMachine(
  scene: Scene,
  opts: CapsuleMachineOpts
): CapsuleMachine {
  const { width, height } = scene.scale;
  let ink = opts.ink;
  let nextCost = opts.nextCost;
  let progress = opts.progress;
  let pulling = false;
  let prizeOpen = false;
  let pendingOperationId: string | null = null;
  let closeRequested = false;

  const layer = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);
  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.72)
    .setScrollFactor(0)
    .setInteractive();
  layer.add(scrim);

  const title = handLettered(
    scene,
    width / 2,
    150,
    'MYSTERY INK',
    56,
    UI.goldText,
    true
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 1);
  layer.add(title);

  // Ink balance chip.
  const inkChip = label(
    scene,
    width / 2,
    210,
    `🫙 Ink: ${ink}`,
    TYPE.title,
    UI.ink,
    true
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add(inkChip);

  // Permanent collection progress lives above the machine so it remains
  // readable while prize cards animate over the lower half of the portrait UI.
  const progressCard = scene.add
    .container(width / 2, 310)
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  const progressPaper = scene.add
    .rectangle(0, 0, width - 150, 140, UI.creamHex, 0.96)
    .setStrokeStyle(3, UI.inkHex, 0.85);
  const collectorRankText = label(scene, 0, -54, '', 20, UI.goldText, true);
  const collectionText = label(scene, 0, -28, '', TYPE.caption, UI.ink, true);
  const collectionTrack = scene.add
    .rectangle(
      -COLLECTION_BAR_WIDTH / 2,
      0,
      COLLECTION_BAR_WIDTH,
      COLLECTION_BAR_HEIGHT,
      UI.progressTrack,
      0.16
    )
    .setOrigin(0, 0.5)
    .setStrokeStyle(3, UI.inkHex, 0.7);
  const collectionFill = scene.add
    .rectangle(
      -COLLECTION_BAR_WIDTH / 2 + 3,
      0,
      6,
      COLLECTION_BAR_HEIGHT - 8,
      UI.gold,
      1
    )
    .setOrigin(0, 0.5);
  const pityText = label(scene, 0, 28, '', TYPE.caption, UI.coralText, true);
  const oddsText = label(scene, 0, 55, CAPSULE_ODDS_COPY, 17, UI.inkSoft, true);
  progressCard.add([
    progressPaper,
    collectorRankText,
    collectionText,
    collectionTrack,
    collectionFill,
    pityText,
    oddsText,
  ]);
  layer.add(progressCard);

  function refreshProgress(animate: boolean): void {
    const pullCount = Math.max(0, Math.floor(progress.pullCount));
    const collectionTotal = Math.max(0, Math.floor(progress.collectionTotal));
    const discoveredCount = Phaser.Math.Clamp(
      Math.floor(progress.discoveredCount),
      0,
      collectionTotal
    );
    const collectionRatio =
      collectionTotal === 0 ? 0 : discoveredCount / collectionTotal;
    const pityRemaining = Math.max(1, Math.floor(progress.pityRemaining));
    const pullCountWord = pullCount === 1 ? 'pull' : 'pulls';
    const pullWord = pityRemaining === 1 ? 'pull' : 'pulls';
    const fillWidth = Math.max(6, (COLLECTION_BAR_WIDTH - 6) * collectionRatio);
    const collectorProgress = collectorProgressForPullCount(pullCount);
    const collectorProgressCopy = collectorProgress.nextRankName
      ? `${collectorProgress.currentRankName} · ${collectorProgress.pullsUntilNextRank} ` +
        `${collectorProgress.pullsUntilNextRank === 1 ? 'pull' : 'pulls'} to ` +
        collectorProgress.nextRankName
      : `${collectorProgress.currentRankName} · ${pullCount} lifetime ${pullCountWord}`;

    collectorRankText.setText(`COLLECTOR · ${collectorProgressCopy}`);
    collectionText.setText(
      `PERMANENT COLLECTION · ${discoveredCount} / ${collectionTotal}`
    );
    pityText.setText(`✨ EPIC guaranteed in ${pityRemaining} ${pullWord}`);
    collectionFill.setVisible(collectionRatio > 0);
    scene.tweens.killTweensOf(collectionFill);

    if (animate && collectionRatio > 0) {
      scene.tweens.add({
        targets: collectionFill,
        width: fillWidth,
        duration: 360,
        ease: 'Cubic.easeOut',
      });
      scene.tweens.add({
        targets: progressCard,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 130,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    } else {
      collectionFill.width = fillWidth;
    }
  }

  refreshProgress(false);

  // --- The machine (hand-drawn) --------------------------------------------
  const machineX = width / 2;
  const machineY = height * 0.46;
  const machine = scene.add
    .container(machineX, machineY)
    .setScrollFactor(0)
    .setDepth(DEPTH + 1);
  layer.add(machine);
  drawMachine(scene, machine);

  // The capsule sits inside the dome; revealed on pull.
  const capsule = scene.add.container(0, -70).setScale(0);
  drawCapsule(scene, capsule, 0xff6b4a);
  machine.add(capsule);

  // --- Pull button + copy ---------------------------------------------------
  const brokeCopy = [
    'Out of ink! Care for a scribbit to earn more 🫙',
    'Your jar is a little dry. Care or spar for more Ink 🖊️',
    'No ink, no magic — go win a spar first! ✏️',
  ];

  const priceCard = scene.add
    .rectangle(width / 2, height * 0.7, width - 150, 78, UI.creamHex, 0.96)
    .setStrokeStyle(3, UI.inkHex, 0.85)
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add(priceCard);

  const helper = label(
    scene,
    width / 2,
    height * 0.7,
    '',
    TYPE.caption,
    UI.inkSoft,
    true
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  helper.setWordWrapWidth(width - 190);
  layer.add(helper);

  const pullBtn = button(
    scene,
    width / 2,
    height * 0.82,
    '🎰 PULL',
    () => void doPull(),
    width - 160,
    UI.coral
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add(pullBtn);

  function refreshAffordance(): void {
    inkChip.setText(`🫙 Ink: ${ink}`);
    const canAfford = ink >= nextCost;
    pullBtn.setAlpha(canAfford ? 1 : 0.55);
    if (!canAfford && !pulling) {
      helper.setText(brokeCopy[ink % brokeCopy.length] ?? brokeCopy[0] ?? '');
      helper.setColor(UI.coralText);
    } else if (!pulling) {
      helper.setText(
        nextCost === CAPSULE_FIRST_DAILY_COST
          ? `Next: ${nextCost} Ink — daily discount (then ${CAPSULE_COST})`
          : `Next capsule: ${nextCost} Ink.`
      );
      helper.setColor(UI.inkSoft);
    }
  }

  const closeBtn = ghostButton(
    scene,
    width / 2,
    height - 80,
    'Done',
    () => close(),
    220
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add(closeBtn);

  refreshAffordance();

  async function doPull(): Promise<void> {
    if (pulling || prizeOpen) return;
    if (ink < nextCost) {
      // Playful shake + copy already shown; give a tiny nudge.
      scene.tweens.add({
        targets: pullBtn,
        x: pullBtn.x + 6,
        duration: 60,
        yoyo: true,
        repeat: 3,
      });
      return;
    }
    pulling = true;
    helper.setText('Cranking…');
    helper.setColor(UI.inkSoft);

    // Crank + shake the machine.
    await shakeMachine(scene, machine);

    pendingOperationId ??= createCapsuleOperationId();
    const result = await opts.onPull(pendingOperationId);
    if ('error' in result) {
      pulling = false;
      helper.setText(`${result.error} Tap PULL to safely retry.`);
      helper.setColor(UI.coralText);
      return;
    }
    ink = result.ink;
    nextCost = result.nextCost;
    progress = result.progress;
    refreshProgress(true);
    pendingOperationId = null;
    await dropAndPop(scene, capsule, result.pull.rarity);
    pulling = false;
    refreshAffordance();
    if (closeRequested) {
      close();
      return;
    }
    prizeOpen = true;
    const onPrizeDismissed = (): void => {
      prizeOpen = false;
      if (!opts.onViewCollection) close();
    };
    const prizeActions: PrizeRevealOptions = opts.onViewCollection
      ? {
          acknowledgementLabel: 'GOT IT',
          onDismiss: onPrizeDismissed,
          onViewCollection: () => close('collection'),
        }
      : {
          acknowledgementLabel: 'KEEP DRAWING',
          onDismiss: onPrizeDismissed,
        };
    revealPrize(scene, layer, result.pull, result.progress, prizeActions);
  }

  scrim.on('pointerup', () => {
    if (!prizeOpen) close();
  });

  function close(destination: 'machine' | 'collection' = 'machine'): void {
    if (!layer.active) return;
    if (prizeOpen && destination === 'machine') return;
    if (pulling || pendingOperationId) {
      closeRequested = true;
      helper.setText(
        pulling
          ? 'Finishing this paid pull before closing…'
          : 'Tap PULL once to safely reconcile this pull.'
      );
      helper.setColor(UI.coralText);
      return;
    }
    const onClosed =
      destination === 'collection' && opts.onViewCollection
        ? opts.onViewCollection
        : opts.onClose;
    layer.destroy(true);
    onClosed(ink);
  }

  return { destroy: () => close() };
}

// --- Drawing helpers --------------------------------------------------------

function drawMachine(scene: Scene, parent: Phaser.GameObjects.Container): void {
  const g = scene.add.graphics();
  // Glass dome (a wobbly circle) full of tiny capsules.
  g.fillStyle(0xbfe3f2, 0.5);
  g.fillCircle(0, -70, 130);
  g.lineStyle(6, UI.inkHex, 1);
  g.strokeCircle(0, -70, 130);
  // A scatter of capsule dots inside the dome.
  const dotColors = [0xff6b4a, 0xffd447, 0x4faa4f, 0x2f9fd8, 0x8a5cd8];
  for (let index = 0; index < 22; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 100;
    g.fillStyle(dotColors[index % dotColors.length] ?? 0xff6b4a, 0.9);
    g.fillCircle(Math.cos(angle) * radius, -70 + Math.sin(angle) * radius, 12);
  }
  // Body / base.
  g.fillStyle(UI.creamHex, 1);
  g.fillRoundedRect(-120, 40, 240, 150, 20);
  g.lineStyle(6, UI.inkHex, 1);
  g.strokeRoundedRect(-120, 40, 240, 150, 20);
  // Dispenser slot.
  g.fillStyle(UI.inkHex, 1);
  g.fillRoundedRect(-46, 150, 92, 26, 8);
  parent.add(g);

  // The crank knob (a coin with a handle) that spins on pull.
  const knob = scene.add.container(0, 96);
  const kg = scene.add.graphics();
  kg.fillStyle(UI.gold, 1);
  kg.fillCircle(0, 0, 34);
  kg.lineStyle(5, UI.inkHex, 1);
  kg.strokeCircle(0, 0, 34);
  kg.lineStyle(8, UI.inkHex, 1);
  kg.beginPath();
  kg.moveTo(0, 0);
  kg.lineTo(0, -22);
  kg.strokePath();
  knob.add(kg);
  knob.setData('isKnob', true);
  parent.add(knob);
}

function drawCapsule(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  topColor: number
): void {
  const g = scene.add.graphics();
  // Bottom half (cream), top half (colored), split line.
  g.fillStyle(0xfff2d8, 1);
  g.fillCircle(0, 0, 40);
  g.fillStyle(topColor, 1);
  g.beginPath();
  g.arc(0, 0, 40, Math.PI, 0, false);
  g.closePath();
  g.fillPath();
  g.lineStyle(5, UI.inkHex, 1);
  g.strokeCircle(0, 0, 40);
  g.beginPath();
  g.moveTo(-40, 0);
  g.lineTo(40, 0);
  g.strokePath();
  parent.add(g);
}

function shakeMachine(
  scene: Scene,
  machine: Phaser.GameObjects.Container
): Promise<void> {
  return new Promise((resolve) => {
    // Spin the crank knob.
    const knob = machine.list.find((o) =>
      (o as Phaser.GameObjects.Container).getData?.('isKnob')
    ) as Phaser.GameObjects.Container | undefined;
    if (knob)
      scene.tweens.add({
        targets: knob,
        angle: 360,
        duration: 520,
        ease: 'Cubic.easeInOut',
      });
    scene.tweens.add({
      targets: machine,
      angle: 3,
      duration: 70,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        machine.setAngle(0);
        resolve();
      },
    });
  });
}

function dropAndPop(
  scene: Scene,
  capsule: Phaser.GameObjects.Container,
  rarity: CapsuleRarity
): Promise<void> {
  return new Promise((resolve) => {
    const tint = RARITY_STYLE[rarity].color;
    // Re-tint the capsule top to match rarity.
    capsule.removeAll(true);
    drawCapsule(scene, capsule, tint);
    capsule.setScale(0).setPosition(0, -70);
    scene.tweens.add({
      targets: capsule,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
    // Drop into the dispenser then bob.
    scene.tweens.chain({
      targets: capsule,
      tweens: [
        { y: 120, duration: 380, ease: 'Bounce.easeOut', delay: 160 },
        { y: 108, scaleX: 1.1, scaleY: 0.9, duration: 120, yoyo: true },
      ],
      onComplete: () => resolve(),
    });
  });
}

// The prize reveal + rarity ceremony. It owns a full-screen interactive blocker
// until the player chooses an action, so taps cannot reach the machine beneath.
function revealPrize(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  pull: CapsulePull,
  postPullProgress: CapsuleProgress,
  options: PrizeRevealOptions
): void {
  const { width, height } = scene.scale;
  const rarityStyle = RARITY_STYLE[pull.rarity];

  if (pull.rarity === 'common') puff(scene, layer, width / 2, height * 0.46);
  else if (pull.rarity === 'rare') {
    goldBurst(scene, layer, width / 2, height * 0.46);
  } else {
    rainbowMoment(scene, layer);
  }

  const revealLayer = scene.add
    .container(0, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH + 5);
  const inputBlocker = scene.add
    .rectangle(width / 2, height / 2, width, height, 0xffffff, 0.001)
    .setScrollFactor(0)
    .setInteractive();
  inputBlocker.on('pointerdown', stopPointerPropagation);
  inputBlocker.on('pointerup', stopPointerPropagation);
  revealLayer.add(inputBlocker);
  layer.add(revealLayer);

  const cardWidth = Math.min(600, width - 64);
  const cardHeight = 600;
  const cardCenterY = Phaser.Math.Clamp(
    height * 0.52,
    cardHeight / 2 + 24,
    height - cardHeight / 2 - 24
  );
  const card = scene.add.container(width / 2, cardCenterY).setScrollFactor(0);
  const cardPaper = scene.add.graphics();
  cardPaper.fillStyle(UI.paper, 1);
  cardPaper.fillRoundedRect(
    -cardWidth / 2,
    -cardHeight / 2,
    cardWidth,
    cardHeight,
    24
  );
  cardPaper.lineStyle(6, rarityStyle.color, 1);
  cardPaper.strokeRoundedRect(
    -cardWidth / 2,
    -cardHeight / 2,
    cardWidth,
    cardHeight,
    24
  );
  const cardInputBlocker = scene.add
    .rectangle(0, 0, cardWidth, cardHeight, 0xffffff, 0.001)
    .setInteractive();
  cardInputBlocker.on('pointerdown', stopPointerPropagation);
  cardInputBlocker.on('pointerup', stopPointerPropagation);
  card.add([cardPaper, cardInputBlocker]);
  revealLayer.add(card);

  const rarityColor = `#${rarityStyle.color.toString(16).padStart(6, '0')}`;
  card.add(
    label(scene, 0, -264, rarityStyle.label, TYPE.caption, rarityColor, true)
  );
  card.add(
    label(scene, 0, -232, pull.kind.toUpperCase(), 18, UI.inkSoft, true)
  );

  const catalogEntry = COSMETIC_BY_ID.get(pull.id);
  if (catalogEntry?.kind === pull.kind) {
    const preview = renderCosmeticPreview({
      scene,
      parent: card,
      entry: catalogEntry,
      y: -145,
      size: 138,
      width: cardWidth - 120,
    }).setScale(0.15);
    scene.tweens.add({
      targets: preview,
      scaleX: 1,
      scaleY: 1,
      duration: 420,
      delay: 100,
      ease: 'Back.easeOut',
    });
  } else {
    card.add(
      label(scene, 0, -145, `YOUR ${pull.kind.toUpperCase()}`, 28, UI.ink, true)
    );
  }

  card.add(
    label(
      scene,
      0,
      -50,
      pull.name,
      pull.rarity === 'epic' ? 40 : 34,
      UI.ink,
      true
    ).setWordWrapWidth(cardWidth - 72)
  );
  const description = label(
    scene,
    0,
    18,
    pull.description,
    TYPE.body,
    UI.inkSoft,
    true
  )
    .setWordWrapWidth(cardWidth - 80)
    .setLineSpacing(3);
  card.add(description);

  const footer = pull.isNew ? newPrizeFooter(pull) : duplicatePrizeFooter(pull);
  card.add(
    label(
      scene,
      0,
      112,
      footer,
      21,
      pull.isNew ? UI.coralText : UI.goldText,
      true
    ).setWordWrapWidth(cardWidth - 72)
  );
  card.add(
    label(
      scene,
      0,
      158,
      `COLLECTION NOW · ${postPullProgress.discoveredCount} / ` +
        `${postPullProgress.collectionTotal} DISCOVERED`,
      20,
      UI.goldText,
      true
    )
  );

  let closingPrize = false;
  const dismissPrize = (): void => {
    if (closingPrize || !revealLayer.active) return;
    closingPrize = true;
    scene.tweens.add({
      targets: card,
      alpha: 0,
      scaleX: 0.82,
      scaleY: 0.82,
      duration: 220,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        revealLayer.destroy(true);
        options.onDismiss();
      },
    });
  };

  if (options.onViewCollection) {
    const viewCollection = button(
      scene,
      -98,
      238,
      'VIEW COLLECTION',
      () => {
        if (closingPrize) return;
        closingPrize = true;
        options.onViewCollection?.();
      },
      336,
      UI.gold
    );
    const pullAgain = ghostButton(
      scene,
      178,
      238,
      options.acknowledgementLabel,
      dismissPrize,
      184
    );
    card.add([viewCollection, pullAgain]);
  } else {
    card.add(
      button(
        scene,
        0,
        238,
        options.acknowledgementLabel,
        dismissPrize,
        320,
        UI.coral
      )
    );
  }

  card.setScale(0.68).setAlpha(0);
  scene.tweens.add({
    targets: card,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    duration: 360,
    ease: 'Back.easeOut',
  });
}

function stopPointerPropagation(
  _pointer: unknown,
  _localX: unknown,
  _localY: unknown,
  event: Phaser.Types.Input.EventData
): void {
  event.stopPropagation?.();
}

function newPrizeFooter(pull: CapsulePull): string {
  if (pull.kind === 'accessory') {
    return `✨ New accessory! ${pull.ownedCount} owned.`;
  }

  return `✨ New ${pull.kind} unlocked!`;
}

function duplicatePrizeFooter(pull: CapsulePull): string {
  if (pull.kind === 'accessory') {
    return `Stacked copy — ${pull.ownedCount} owned.`;
  }

  return 'Already unlocked.';
}

function puff(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number
): void {
  const emitter = scene.add.particles(x, y, 'dot', {
    speed: { min: 40, max: 140 },
    scale: { start: 0.7, end: 0 },
    lifespan: 600,
    quantity: 16,
    tint: 0xcbb79a,
    emitting: false,
  });
  emitter.setScrollFactor(0).setDepth(DEPTH + 4);
  emitter.explode(16);
  layer.add(emitter);
  scene.time.delayedCall(800, () => emitter.destroy());
}

function goldBurst(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number
): void {
  const emitter = scene.add.particles(x, y, 'spark', {
    speed: { min: 120, max: 340 },
    scale: { start: 0.7, end: 0 },
    lifespan: 1100,
    quantity: 28,
    tint: [UI.gold, 0xffe9a8],
    emitting: false,
  });
  emitter.setScrollFactor(0).setDepth(DEPTH + 4);
  emitter.explode(28);
  layer.add(emitter);
  scene.time.delayedCall(1300, () => emitter.destroy());
}

function rainbowMoment(
  scene: Scene,
  layer: Phaser.GameObjects.Container
): void {
  const { width, height } = scene.scale;
  // Full-screen rainbow wash sweeping through hues.
  const hues = [0xff5a3d, 0xff9a3d, 0xf2cf3d, 0x4faa4f, 0x3ba0e0, 0x8a5cd8];
  hues.forEach((hue, index) => {
    const band = scene.add
      .rectangle(width / 2, height / 2, width, height, hue, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 3);
    layer.add(band);
    scene.tweens.add({
      targets: band,
      alpha: 0.5,
      duration: 220,
      delay: index * 90,
      yoyo: true,
      onComplete: () => band.destroy(),
    });
  });
  // Hand-lettered EPIC banner.
  const banner = handLettered(
    scene,
    width / 2,
    height * 0.28,
    'EPIC PULL!',
    64,
    UI.goldText,
    true
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 7)
    .setScale(0);
  layer.add(banner);
  scene.tweens.add({
    targets: banner,
    scale: 1,
    duration: 420,
    ease: 'Back.easeOut',
    yoyo: true,
    hold: 900,
    onComplete: () => banner.destroy(),
  });
  const emitter = scene.add.particles(width / 2, -20, 'spark', {
    x: { min: 0, max: width },
    speedY: { min: 200, max: 460 },
    scale: { start: 0.6, end: 0 },
    lifespan: 1600,
    quantity: 3,
    frequency: 80,
    tint: hues,
  });
  emitter.setScrollFactor(0).setDepth(DEPTH + 5);
  layer.add(emitter);
  scene.time.delayedCall(1600, () => emitter.destroy());
}
