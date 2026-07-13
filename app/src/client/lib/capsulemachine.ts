// The Mystery Ink chest — a satisfying, non-predatory reward screen in the
// sketchbook aesthetic. Shop supplies the generated stage while this module
// owns the code-rendered chest, controls, and ceremony. The player spends
// battle-earned Ink, taps the chest, and gets a rarity-tiered ceremony:
//   common → a soft puff
//   rare   → a gold burst
//   epic   → a full-screen rainbow moment + hand-lettered banner
// One or ten opens are supported; there is deliberately no 100-open action,
// auto-repeat, near-miss reel, or paid banner. Duplicate Gear feeds Forge.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  CAPSULE_MAX_BATCH_SIZE,
  CAPSULE_RARITY_PERCENTAGES,
} from '../../shared/arena';
import type {
  CapsuleProgress,
  CapsulePull,
  CapsulePullResponse,
  CapsuleRarity,
} from '../../shared/arena';
import { NAV_SAFE, UI, TYPE, prefersReducedMotion } from './theme';
import { label, handLettered, button, ghostButton, iconButton } from './ui';
import { RARITY_STYLE } from './pens';
import { COSMETIC_BY_ID } from '../../shared/cosmetics';
import type { CosmeticGearCatalogEntry } from '../../shared/cosmetics';
import { renderCosmeticPreview } from './cosmeticpreview';
import {
  openFeaturedGearDetail as showFeaturedGearDetail,
  type FeaturedGearDetail,
} from './featuredgeardetail';
import { gearRankStars } from './gearrankstars';
import { CanvasActionOverlay, CanvasModalOverlay } from './overlay';
import type { CanvasActionOverlayInput } from './overlay';
import { bindPressInteractionEvents } from './pressinteraction';
import { createStickerShine } from './stickerfxshader';
import {
  capsuleOpenCost,
  planCapsuleOpenAffordance,
  planCapsulePrizeLayout,
  prizeOwnershipAnnouncement,
  prizeOwnershipLabel,
  summarizeCapsuleBatch,
} from './capsulepresentation';

const DEPTH = 2500;
const COLLECTION_BAR_WIDTH = 480;
const COLLECTION_BAR_HEIGHT = 22;
const CAPSULE_ODDS_ACCESSIBLE_COPY =
  `Odds are ${CAPSULE_RARITY_PERCENTAGES.common} percent common, ` +
  `${CAPSULE_RARITY_PERCENTAGES.rare} percent rare, and ` +
  `${CAPSULE_RARITY_PERCENTAGES.epic} percent epic.`;

const FEATURED_GEAR_ID = 'comet-crayon-blade';

type ChestOpenCount = 1 | typeof CAPSULE_MAX_BATCH_SIZE;

type ChestArt = Readonly<{
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  lid: Phaser.GameObjects.Container;
}>;

const createCapsuleOperationId = (): string => {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `capsule-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
  );
};

export type CapsuleMachineOpts = {
  ink: number; // current ink balance
  nextCost: number; // server-authoritative current price
  progress: CapsuleProgress; // server-authoritative collection and pity snapshot
  // Perform the pull. The server owns price, inventory, and the final reward; the
  // machine only mirrors the returned presentation snapshot.
  onPull: (
    operationId: string
  ) => Promise<CapsulePullResponse | { error: string }>;
  onClose: (finalInk: number) => void;
  embedded?: boolean;
  onTransactionLockChange?: (locked: boolean) => void;
  // Optional terminal action used by inventory hosts. Draw omits it so closing the
  // machine always restores the live drawing canvas exactly as before.
  onViewCollection?: (finalInk: number) => void;
};

export type CapsuleMachine = { destroy: () => void };

type PrizeRevealOptions = {
  acknowledgementLabel: 'GOT IT' | 'KEEP DRAWING';
  onDismiss: () => void;
  onViewCollection?: () => void;
};

type CapsuleActionSurface = Readonly<{
  add: (input: CanvasActionOverlayInput) => HTMLButtonElement;
  addStatus: (initialMessage?: string) => HTMLElement;
  destroy: () => void;
  focusInitial: (control?: HTMLElement) => void;
}>;

function createEmbeddedCapsuleActions(scene: Scene): CapsuleActionSurface {
  const overlay = new CanvasActionOverlay(scene, 'shop-chest');
  const descriptionId = 'shop-chest-description';
  overlay.addDescription(
    descriptionId,
    `Spend battle-earned Ink to open one or ten reward chests containing Gear and styles. Tap the featured Loot Gear to preview its battle effect. Ten is the largest batch. The server owns every price, reward, and pity step. Reddit Gold Styles is disabled, cosmetic only, and coming soon. ${CAPSULE_ODDS_ACCESSIBLE_COPY}`
  );
  overlay.setRootAttributes({
    role: 'region',
    'aria-label': 'Mystery Ink chest',
    'aria-describedby': descriptionId,
  });
  return {
    add: (input) => overlay.add(input),
    addStatus: (initialMessage) => overlay.addStatus(initialMessage),
    destroy: () => overlay.destroy(),
    focusInitial: (control) => {
      requestAnimationFrame(() => {
        if (
          control?.isConnected &&
          !control.hidden &&
          !control.matches(':disabled')
        ) {
          control.focus();
        }
      });
    },
  };
}

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
  let pendingBatchTarget: ChestOpenCount | null = null;
  let completedBatchPulls: CapsulePull[] = [];
  let closeRequested = false;
  let destroyed = false;
  let dismissPrizeAction: (() => void) | null = null;
  let featuredGearDetail: FeaturedGearDetail | null = null;

  const layer = scene.add
    .container(0, 0)
    .setDepth(opts.embedded ? 1000 : DEPTH)
    .setScrollFactor(0);
  const modalActions: CapsuleActionSurface = opts.embedded
    ? createEmbeddedCapsuleActions(scene)
    : new CanvasModalOverlay(
        scene,
        'Mystery Ink chest',
        () => {
          if (prizeOpen) dismissPrizeAction?.();
          else close();
        },
        `Spend battle-earned Ink to open one or ten reward chests containing Gear and styles. Tap the featured Loot Gear to preview its battle effect. Ten is the largest batch. The server owns every price, reward, and pity step. Reddit Gold Styles is disabled, cosmetic only, and coming soon. ${CAPSULE_ODDS_ACCESSIBLE_COPY}`
      );
  layer.once('destroy', () => {
    destroyed = true;
    modalActions.destroy();
  });
  const scrim = opts.embedded
    ? null
    : scene.add
        .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.72)
        .setScrollFactor(0)
        .setInteractive();
  if (scrim) layer.add(scrim);

  const title = handLettered(
    scene,
    width / 2,
    82,
    opts.embedded ? 'SHOP' : 'MYSTERY INK CHEST',
    opts.embedded ? 62 : 43,
    '#ffd447',
    true
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 1);
  layer.add(title);

  // Ink balance chip.
  const inkChip = label(
    scene,
    width / 2,
    137,
    `${ink} INK`,
    TYPE.title,
    UI.cream,
    true
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add(inkChip);

  const featuredGearControl = drawBannerDeck(
    scene,
    layer,
    modalActions,
    width,
    242,
    openFeaturedGearDetail
  );

  // Permanent collection progress lives above the chest so it remains
  // readable while prize cards animate over the lower half of the portrait UI.
  const progressCard = scene.add
    .container(width / 2, 410)
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  const progressPaper = scene.add
    .rectangle(0, 0, width - 150, 92, UI.creamHex, 0.96)
    .setStrokeStyle(3, UI.inkHex, 0.85);
  const collectorRankText = label(scene, 0, -29, '', 19, UI.goldText, true);
  const collectionTrack = scene.add
    .rectangle(
      -COLLECTION_BAR_WIDTH / 2,
      1,
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
      1,
      6,
      COLLECTION_BAR_HEIGHT - 8,
      UI.gold,
      1
    )
    .setOrigin(0, 0.5);
  const pityText = label(scene, 0, 31, '', 19, UI.coralText, true);
  progressCard.add([
    progressPaper,
    collectorRankText,
    collectionTrack,
    collectionFill,
    pityText,
  ]);
  layer.add(progressCard);

  function refreshProgress(animate: boolean): void {
    const collectionTotal = Math.max(0, Math.floor(progress.collectionTotal));
    const discoveredCount = Phaser.Math.Clamp(
      Math.floor(progress.discoveredCount),
      0,
      collectionTotal
    );
    const collectionRatio =
      collectionTotal === 0 ? 0 : discoveredCount / collectionTotal;
    const pityRemaining = Math.max(1, Math.floor(progress.pityRemaining));
    const fillWidth = Math.max(6, (COLLECTION_BAR_WIDTH - 6) * collectionRatio);
    collectorRankText.setText(
      `${discoveredCount}/${collectionTotal} STYLES FOUND`
    );
    pityText.setText(`EPIC IN ${pityRemaining} OR SOONER`);
    collectionFill.setVisible(collectionRatio > 0);
    scene.tweens.killTweensOf(collectionFill);

    if (animate && collectionRatio > 0 && !prefersReducedMotion()) {
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

  // --- The hand-drawn chest -------------------------------------------------
  const chestY = Math.min(
    height - NAV_SAFE - 360,
    Math.max(720, height * 0.52)
  );
  const chest = createChestArt(scene, width / 2, chestY);
  chest.container.setDepth(DEPTH + 1).setScrollFactor(0);
  layer.add(chest.container);
  chest.container.setSize(380, 310).setInteractive({ useHandCursor: true });
  bindPressInteractionEvents(
    chest.container,
    {
      press: () => chest.container.setScale(0.96),
      release: () => chest.container.setScale(1),
      activate: () => void openChests(1),
      pressOnHover: false,
    },
    { gameTarget: scene.input, shutdownTarget: scene.events }
  );

  // --- Open buttons + copy --------------------------------------------------
  const actionY = Math.min(height - NAV_SAFE - 84, chestY + 345);
  const helper = label(
    scene,
    width / 2,
    actionY - 112,
    '',
    TYPE.caption,
    UI.inkSoft,
    true
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  helper.setStroke(UI.ink, 4);
  helper.setWordWrapWidth(width - 190);
  layer.add(helper);

  const actionGap = 18;
  const actionWidth = (width - 178 - actionGap) / 2;
  const oneButtonX = 80 + actionWidth / 2;
  const tenButtonX = width - 80 - actionWidth / 2;
  let primaryActionEnabled = ink >= nextCost;
  let secondaryActionEnabled =
    ink >= capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost);
  const openOneButton = iconButton(
    scene,
    oneButtonX,
    actionY,
    'spark',
    `OPEN 1 · ${nextCost}`,
    () => {
      if (primaryActionEnabled) void openChests(1);
    },
    actionWidth,
    UI.coral
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  const openTenButton = iconButton(
    scene,
    tenButtonX,
    actionY,
    'spark',
    `OPEN 10 · ${capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost)}`,
    () => {
      if (secondaryActionEnabled) void openChests(CAPSULE_MAX_BATCH_SIZE);
    },
    actionWidth,
    UI.gold
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add([openOneButton, openTenButton]);

  const openOneControl = modalActions.add({
    label: `Open one Mystery Ink chest for ${nextCost} Ink`,
    rect: {
      x: 80,
      y: actionY - 50,
      width: actionWidth,
      height: 100,
    },
    enabled: ink >= nextCost,
    pointerPassthrough: true,
    onActivate: () => void openChests(1),
  });
  const openTenControl = modalActions.add({
    label: `Open ten Mystery Ink chests for ${capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost)} Ink`,
    rect: {
      x: 80 + actionWidth + actionGap,
      y: actionY - 50,
      width: actionWidth,
      height: 100,
    },
    enabled: ink >= capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost),
    pointerPassthrough: true,
    onActivate: () => void openChests(CAPSULE_MAX_BATCH_SIZE),
  });
  const closeControl = opts.embedded
    ? null
    : modalActions.add({
        label: 'Close Mystery Ink chest',
        rect: {
          x: width / 2 - 110,
          y: height - 130,
          width: 220,
          height: 100,
        },
        onActivate: () => close(),
      });
  const statusAnnouncement = modalActions.addStatus();
  const prizeLayout = planCapsulePrizeLayout(
    width,
    height,
    Boolean(opts.onViewCollection)
  );
  const viewCollectionControl = opts.onViewCollection
    ? modalActions.add({
        label: 'View Bag',
        rect: {
          x: prizeLayout.viewCollection?.overlayX ?? 0,
          y: prizeLayout.overlayY,
          width: prizeLayout.viewCollection?.width ?? 0,
          height: 100,
        },
        onActivate: () => close('collection'),
      })
    : null;
  const acknowledgementControl = modalActions.add({
    label: opts.onViewCollection ? 'Got it' : 'Keep drawing',
    rect: {
      x: prizeLayout.acknowledgement.overlayX,
      y: prizeLayout.overlayY,
      width: prizeLayout.acknowledgement.width,
      height: 100,
    },
    onActivate: () => dismissPrizeAction?.(),
  });

  const setPrizeControlsVisible = (visible: boolean): void => {
    openOneControl.hidden = visible;
    openTenControl.hidden = visible;
    if (featuredGearControl) {
      featuredGearControl.hidden = visible;
      featuredGearControl.disabled = visible;
    }
    if (closeControl) closeControl.hidden = visible;
    if (visible) {
      openOneControl.disabled = true;
      openTenControl.disabled = true;
      if (closeControl) closeControl.disabled = true;
    } else {
      if (closeControl) closeControl.disabled = false;
    }
    if (viewCollectionControl) {
      viewCollectionControl.hidden = !visible;
      viewCollectionControl.disabled = !visible;
    }
    acknowledgementControl.hidden = !visible;
    acknowledgementControl.disabled = !visible;
  };
  setPrizeControlsVisible(false);

  const setActionButtonLabel = (
    actionButton: Phaser.GameObjects.Container,
    text: string
  ): void => {
    const textLabel = actionButton.list.find(
      (child): child is Phaser.GameObjects.Text =>
        child instanceof Phaser.GameObjects.Text
    );
    const actionIcon = actionButton.list[1];
    if (!textLabel || !actionIcon) return;
    textLabel.setText(text);
    const iconSize = 38;
    const contentWidth = iconSize + 12 + textLabel.width;
    const iconX = -contentWidth / 2 + iconSize / 2;
    (actionIcon as Phaser.GameObjects.Container).setX(iconX);
    textLabel.setX(iconX + iconSize / 2 + 12 + textLabel.width / 2);
  };

  function refreshAffordance(): void {
    inkChip.setText(`${ink} INK`);
    const affordance = planCapsuleOpenAffordance(
      ink,
      nextCost,
      pendingBatchTarget,
      completedBatchPulls.length
    );
    setActionButtonLabel(openOneButton, affordance.primaryLabel);
    setActionButtonLabel(openTenButton, affordance.secondaryLabel);
    primaryActionEnabled = affordance.primaryEnabled;
    secondaryActionEnabled = affordance.secondaryEnabled;
    openOneButton.setAlpha(affordance.primaryEnabled ? 1 : 0.55);
    openTenButton.setAlpha(affordance.secondaryEnabled ? 1 : 0.55);
    openOneControl.disabled =
      pulling || prizeOpen || !affordance.primaryEnabled;
    openTenControl.disabled =
      pulling || prizeOpen || !affordance.secondaryEnabled;
    if (featuredGearControl) {
      featuredGearControl.disabled = pulling || prizeOpen;
    }
    openOneControl.setAttribute(
      'aria-label',
      affordance.primaryAccessibleLabel
    );
    openTenControl.setAttribute(
      'aria-label',
      affordance.secondaryAccessibleLabel
    );
    if (!affordance.primaryEnabled && !pulling) {
      helper.setText(
        `WIN A BATTLE · NEED ${Math.max(0, affordance.requiredInk - ink)} MORE INK`
      );
      helper.setColor(UI.coralText);
    } else if (affordance.retrying && !pulling) {
      helper.setText(
        `RETRY ${affordance.remainingCount} · SAFE PROGRESS ${completedBatchPulls.length}/${pendingBatchTarget}`
      );
      helper.setColor(UI.cream);
    } else if (!pulling) {
      helper.setText(`${nextCost} INK EACH · TEN IS THE MAX BATCH`);
      helper.setColor(UI.cream);
    }
  }

  if (!opts.embedded) {
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
  }

  refreshAffordance();
  modalActions.focusInitial(
    ink >= nextCost ? openOneControl : (closeControl ?? openOneControl)
  );

  async function openChests(requestedCount: ChestOpenCount): Promise<void> {
    if (pulling || prizeOpen) return;
    const targetCount = pendingBatchTarget ?? requestedCount;
    const remainingCount = targetCount - completedBatchPulls.length;
    const requiredInk = capsuleOpenCost(remainingCount, nextCost);
    if (ink < requiredInk) {
      await nudgeChest(scene, chest.container);
      return;
    }
    pendingBatchTarget = targetCount;
    pulling = true;
    opts.onTransactionLockChange?.(true);
    openOneControl.disabled = true;
    openTenControl.disabled = true;
    if (featuredGearControl) featuredGearControl.disabled = true;
    helper.setText(targetCount === 1 ? 'SHAKE THE CHEST…' : 'OPENING TEN…');
    helper.setColor(UI.cream);
    statusAnnouncement.textContent = `Opening ${targetCount} Mystery Ink ${targetCount === 1 ? 'chest' : 'chests'}.`;

    await shakeChest(scene, chest.container);
    if (destroyed || !scene.sys.isActive()) return;

    while (completedBatchPulls.length < targetCount) {
      pendingOperationId ??= createCapsuleOperationId();
      let result: CapsulePullResponse | { error: string };
      try {
        result = await opts.onPull(pendingOperationId);
      } catch {
        result = { error: 'The chest reply slipped.' };
      }
      if (destroyed || !scene.sys.isActive()) return;
      if ('error' in result) {
        pulling = false;
        refreshAffordance();
        helper.setText(
          `${completedBatchPulls.length}/${targetCount} OPENED · RETRY ${targetCount - completedBatchPulls.length}`
        );
        helper.setColor(UI.coralText);
        statusAnnouncement.textContent = `${result.error} ${completedBatchPulls.length} of ${targetCount} opens are safely recorded. Retry resumes the same open.`;
        return;
      }
      ink = result.ink;
      nextCost = result.nextCost;
      progress = result.progress;
      completedBatchPulls.push(result.pull);
      pendingOperationId = null;
      helper.setText(`${completedBatchPulls.length}/${targetCount} OPENED`);
      statusAnnouncement.textContent = `Opened ${completedBatchPulls.length} of ${targetCount}.`;
    }
    refreshProgress(true);
    const revealedPulls = [...completedBatchPulls];
    completedBatchPulls = [];
    pendingBatchTarget = null;
    opts.onTransactionLockChange?.(false);
    await openChest(scene, chest, highestRarity(revealedPulls));
    if (destroyed || !scene.sys.isActive()) return;
    pulling = false;
    refreshAffordance();
    if (closeRequested) {
      close();
      return;
    }
    prizeOpen = true;
    const onPrizeDismissed = (): void => {
      dismissPrizeAction = null;
      prizeOpen = false;
      resetChest(chest);
      if (!opts.onViewCollection) {
        close();
        return;
      }
      setPrizeControlsVisible(false);
      refreshAffordance();
      modalActions.focusInitial(
        openOneControl.disabled
          ? (closeControl ?? openOneControl)
          : openOneControl
      );
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
    const singlePull =
      revealedPulls.length === 1 ? revealedPulls[0] : undefined;
    if (singlePull) {
      statusAnnouncement.textContent =
        `${singlePull.rarity} ${singlePull.kind}: ${singlePull.name}. ` +
        `${singlePull.description} ${prizeOwnershipAnnouncement(singlePull)} ` +
        `Your Bag now has ${progress.discoveredCount} found styles.`;
    } else {
      const summary = summarizeCapsuleBatch(revealedPulls);
      statusAnnouncement.textContent =
        `Ten chests opened: ${summary.common} common, ${summary.rare} rare, ` +
        `${summary.epic} epic, and ${summary.newItems} new styles. ` +
        `Your Bag now has ${progress.discoveredCount} found styles.`;
    }
    setPrizeControlsVisible(true);
    acknowledgementControl.setAttribute(
      'aria-label',
      prizeActions.acknowledgementLabel
    );
    dismissPrizeAction = singlePull
      ? revealPrize(scene, layer, singlePull, prizeActions)
      : revealBatchPrizes(scene, layer, revealedPulls, prizeActions);
    modalActions.focusInitial(viewCollectionControl ?? acknowledgementControl);
  }

  scrim?.on('pointerup', () => {
    if (!prizeOpen) close();
  });

  function openFeaturedGearDetail(
    entry: CosmeticGearCatalogEntry,
    trigger: HTMLButtonElement
  ): void {
    if (destroyed || pulling || prizeOpen) return;
    featuredGearDetail?.destroy();
    featuredGearDetail = showFeaturedGearDetail(scene, entry, trigger, () => {
      featuredGearDetail = null;
    });
  }

  function close(destination: 'machine' | 'collection' = 'machine'): void {
    if (destroyed || !layer.active) return;
    if (prizeOpen && destination === 'machine') return;
    if (pulling || pendingOperationId || pendingBatchTarget) {
      closeRequested = true;
      helper.setText(
        pulling
          ? 'Finishing the paid chest before closing…'
          : 'Tap RETRY once to safely reconcile this chest.'
      );
      helper.setColor(UI.coralText);
      statusAnnouncement.textContent = pulling
        ? 'Finishing the paid chest before closing.'
        : 'Retry the same open to reconcile it before closing.';
      return;
    }
    const onClosed =
      destination === 'collection' && opts.onViewCollection
        ? opts.onViewCollection
        : opts.onClose;
    teardown();
    onClosed(ink);
  }

  function teardown(): void {
    if (destroyed) return;
    destroyed = true;
    dismissPrizeAction = null;
    const detail = featuredGearDetail;
    featuredGearDetail = null;
    detail?.destroy();
    modalActions.destroy();
    opts.onTransactionLockChange?.(false);
    if (layer.active) layer.destroy(true);
  }

  return { destroy: teardown };
}

// --- Drawing helpers --------------------------------------------------------

function drawBannerDeck(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  actions: CapsuleActionSurface,
  width: number,
  y: number,
  onInspect: (
    entry: CosmeticGearCatalogEntry,
    trigger: HTMLButtonElement
  ) => void
): HTMLButtonElement | null {
  const margin = 42;
  const activeWidth = width - margin * 2;
  const active = scene.add
    .container(margin + activeWidth / 2, y)
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  const activePaper = scene.add
    .rectangle(0, 0, activeWidth, 126, UI.creamHex, 0.98)
    .setStrokeStyle(4, UI.goldHex, 1);
  const activeTitle = label(
    scene,
    -activeWidth / 2 + 104,
    -31,
    'LOOT',
    34,
    UI.ink,
    true
  );
  const activeSubhead = label(
    scene,
    -activeWidth / 2 + 166,
    5,
    'EARNED INK · TAP FEATURED GEAR',
    16,
    UI.coralText,
    true
  );
  const odds = label(
    scene,
    0,
    45,
    `${CAPSULE_RARITY_PERCENTAGES.common}% COMMON · ${CAPSULE_RARITY_PERCENTAGES.rare}% RARE · ${CAPSULE_RARITY_PERCENTAGES.epic}% EPIC`,
    17,
    UI.inkSoft,
    true
  );
  active.add([activePaper, activeTitle, activeSubhead, odds]);
  const featuredEntry = COSMETIC_BY_ID.get(FEATURED_GEAR_ID);
  let featuredControl: HTMLButtonElement | null = null;
  if (featuredEntry?.kind === 'accessory') {
    const featuredX = activeWidth / 2 - 83;
    const featuredY = -10;
    const featured = scene.add.container(featuredX, featuredY);
    const aura = scene.add
      .circle(0, 0, 49, UI.gold, 0.13)
      .setStrokeStyle(3, UI.goldHex, 0.44);
    const backing = scene.add
      .circle(0, 0, 39, UI.creamHex, 0.97)
      .setStrokeStyle(4, UI.goldHex, 0.98);
    const innerRing = scene.add
      .circle(0, 0, 31, UI.gold, 0.08)
      .setStrokeStyle(2, UI.coral, 0.7);
    const upperSparkle = scene.add.star(-38, -35, 4, 4, 15, UI.goldHex, 1);
    const lowerSparkle = scene.add.star(40, 29, 4, 3, 11, UI.creamHex, 0.96);
    const featuredBadge = label(
      scene,
      0,
      -48,
      'FEATURED',
      13,
      UI.goldText,
      true
    );
    const effectHint = label(
      scene,
      0,
      48,
      'SEE EFFECT',
      13,
      UI.coralText,
      true
    );
    const hitTarget = scene.add
      .circle(0, 0, 50, 0xffffff, 0.001)
      .setInteractive();
    featured.add([
      aura,
      backing,
      innerRing,
      upperSparkle,
      lowerSparkle,
      featuredBadge,
      effectHint,
    ]);
    renderCosmeticPreview({
      scene,
      parent: featured,
      entry: featuredEntry,
      x: 0,
      y: 0,
      size: 70,
      width: 76,
      height: 76,
    });
    featured.add(hitTarget);
    active.add(featured);

    featuredControl = actions.add({
      label: `Inspect featured Gear: ${featuredEntry.name}. ${featuredEntry.rarity} ${featuredEntry.category}.`,
      rect: {
        x: width / 2 + featuredX - 50,
        y: y + featuredY - 50,
        width: 100,
        height: 100,
      },
      pointerPassthrough: true,
      onActivate: () => {
        if (featuredControl) onInspect(featuredEntry, featuredControl);
      },
    });
    bindPressInteractionEvents(
      hitTarget,
      {
        press: () => featured.setScale(0.94),
        release: () => featured.setScale(1),
        activate: () => {
          if (featuredControl) onInspect(featuredEntry, featuredControl);
        },
        pressOnHover: false,
      },
      { gameTarget: scene.input, shutdownTarget: scene.events }
    );

    const shine = createStickerShine({
      scene,
      x: width / 2 + featuredX,
      y: y + featuredY,
      width: 120,
      height: 120,
      depth: layer.depth + 3,
      reduceMotion: prefersReducedMotion(),
      tint: [1, 0.78, 0.24],
      intensity: 0.72,
    });
    scene.time.delayedCall(260, () => shine?.play(680));
    layer.once('destroy', () => shine?.destroy());
  }
  layer.add(active);

  const futureWidth = width - 190;
  const future = scene.add
    .container(width / 2, y + 94)
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  const futurePaper = scene.add
    .rectangle(0, 0, futureWidth, 48, 0x3b263c, 0.94)
    .setStrokeStyle(3, 0x9a7b8f, 0.9);
  future.add([
    futurePaper,
    label(
      scene,
      0,
      0,
      'REDDIT GOLD STYLES · COSMETIC ONLY · COMING SOON',
      16,
      '#fff2d8',
      true
    ),
  ]);
  future.setAlpha(0.78);
  layer.add(future);
  return featuredControl;
}

function createChestArt(scene: Scene, x: number, y: number): ChestArt {
  const container = scene.add.container(x, y);
  const glow = scene.add.circle(0, -12, 178, UI.gold, 0.12);
  const shadow = scene.add.ellipse(8, 128, 340, 62, 0x160d16, 0.38);
  const stickerEdge = scene.add.graphics();
  stickerEdge.fillStyle(UI.creamHex, 0.96);
  stickerEdge.fillRoundedRect(-174, -106, 348, 242, 30);

  const body = scene.add.graphics();
  const bodyShape = [
    new Phaser.Math.Vector2(-160, -22),
    new Phaser.Math.Vector2(160, -22),
    new Phaser.Math.Vector2(139, 120),
    new Phaser.Math.Vector2(-139, 120),
  ];
  body.fillStyle(0x7441b8, 1);
  body.fillPoints(bodyShape, true);
  body.lineStyle(7, UI.inkHex, 1);
  body.strokePoints(bodyShape, true);
  body.fillStyle(0x8f58d2, 1);
  body.fillRoundedRect(-139, 18, 278, 86, 12);
  body.lineStyle(3, 0xc6a9ee, 0.78);
  body.lineBetween(-126, 44, 126, 44);
  body.lineBetween(-120, 76, 120, 76);
  body.fillStyle(0x5b2f98, 0.7);
  body.fillTriangle(139, 18, 160, -22, 139, 104);

  const cornerPlates = scene.add.graphics();
  cornerPlates.fillStyle(UI.gold, 1);
  cornerPlates.lineStyle(4, UI.inkHex, 1);
  [
    [-139, 86],
    [101, 86],
  ].forEach(([plateX, plateY]) => {
    cornerPlates.fillRoundedRect(plateX ?? 0, plateY ?? 0, 38, 34, 6);
    cornerPlates.strokeRoundedRect(plateX ?? 0, plateY ?? 0, 38, 34, 6);
  });

  const lid = scene.add.container(0, -62);
  const lidGraphics = scene.add.graphics();
  const lidShape = [
    new Phaser.Math.Vector2(-163, 26),
    new Phaser.Math.Vector2(-138, -58),
    new Phaser.Math.Vector2(138, -58),
    new Phaser.Math.Vector2(163, 26),
  ];
  lidGraphics.fillStyle(0x9b68d8, 1);
  lidGraphics.fillPoints(lidShape, true);
  lidGraphics.lineStyle(7, UI.inkHex, 1);
  lidGraphics.strokePoints(lidShape, true);
  lidGraphics.lineStyle(3, 0xc6a9ee, 0.72);
  lidGraphics.lineBetween(-116, -36, 116, -36);
  lidGraphics.lineBetween(-136, -10, 136, -10);
  lidGraphics.fillStyle(UI.gold, 1);
  lidGraphics.fillRoundedRect(-168, 12, 336, 36, 12);
  lidGraphics.lineStyle(6, UI.inkHex, 1);
  lidGraphics.strokeRoundedRect(-168, 12, 336, 36, 12);
  const lidCorners = scene.add.graphics();
  lidCorners.fillStyle(UI.gold, 1);
  lidCorners.lineStyle(4, UI.inkHex, 1);
  lidCorners.fillRoundedRect(-151, -42, 30, 56, 8);
  lidCorners.strokeRoundedRect(-151, -42, 30, 56, 8);
  lidCorners.fillRoundedRect(121, -42, 30, 56, 8);
  lidCorners.strokeRoundedRect(121, -42, 30, 56, 8);
  lid.add([lidGraphics, lidCorners]);

  const straps = scene.add.graphics();
  straps.fillStyle(UI.gold, 1);
  straps.fillRoundedRect(-108, -20, 28, 134, 8);
  straps.fillRoundedRect(80, -20, 28, 134, 8);
  straps.lineStyle(4, UI.inkHex, 1);
  straps.strokeRoundedRect(-108, -20, 28, 134, 8);
  straps.strokeRoundedRect(80, -20, 28, 134, 8);
  const lock = scene.add.graphics();
  lock.fillStyle(UI.gold, 1);
  lock.fillRoundedRect(-40, 7, 80, 72, 16);
  lock.lineStyle(5, UI.inkHex, 1);
  lock.strokeRoundedRect(-40, 7, 80, 72, 16);
  lock.fillStyle(UI.inkHex, 1);
  lock.fillCircle(0, 35, 9);
  lock.fillRoundedRect(-5, 35, 10, 20, 3);

  const sparkles = scene.add.graphics();
  sparkles.fillStyle(UI.gold, 1);
  sparkles.fillCircle(-175, -38, 6);
  sparkles.fillCircle(176, 24, 5);
  sparkles.fillStyle(0x8a5cd8, 1);
  sparkles.fillCircle(-164, 43, 4);
  sparkles.fillCircle(164, -56, 4);
  container.add([
    glow,
    shadow,
    stickerEdge,
    body,
    cornerPlates,
    straps,
    lid,
    lock,
    sparkles,
  ]);
  return { container, glow, lid };
}

function highestRarity(pulls: readonly CapsulePull[]): CapsuleRarity {
  if (pulls.some((pull) => pull.rarity === 'epic')) return 'epic';
  if (pulls.some((pull) => pull.rarity === 'rare')) return 'rare';
  return 'common';
}

function nudgeChest(
  scene: Scene,
  chest: Phaser.GameObjects.Container
): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: chest,
      x: chest.x + 7,
      duration: 55,
      yoyo: true,
      repeat: 2,
      onComplete: () => resolve(),
    });
  });
}

function shakeChest(
  scene: Scene,
  chest: Phaser.GameObjects.Container
): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  const startY = chest.y;
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: chest,
      angle: 4,
      y: chest.y - 6,
      duration: 62,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        chest.setAngle(0).setY(startY);
        resolve();
      },
    });
  });
}

function openChest(
  scene: Scene,
  chest: ChestArt,
  rarity: CapsuleRarity
): Promise<void> {
  const rarityColor = RARITY_STYLE[rarity].color;
  chest.glow.setFillStyle(rarityColor, 0.18);
  chest.lid.setPosition(0, -62).setAngle(0);
  if (prefersReducedMotion()) {
    chest.lid.setPosition(-8, -126).setAngle(-9);
    chest.glow.setAlpha(0.68);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: chest.glow,
      alpha: 0.72,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: 260,
      ease: 'Sine.easeOut',
    });
    scene.tweens.add({
      targets: chest.lid,
      y: -126,
      x: -8,
      angle: -9,
      duration: 330,
      ease: 'Back.easeOut',
      onComplete: () => resolve(),
    });
  });
}

function resetChest(chest: ChestArt): void {
  chest.lid.setPosition(0, -62).setAngle(0);
  chest.glow.setScale(1).setAlpha(1).setFillStyle(UI.gold, 0.1);
}

// The prize reveal + rarity ceremony. It owns a full-screen interactive blocker
// until the player chooses an action, so taps cannot reach the machine beneath.
function revealPrize(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  pull: CapsulePull,
  options: PrizeRevealOptions
): () => void {
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

  const prizeLayout = planCapsulePrizeLayout(
    width,
    height,
    Boolean(options.onViewCollection)
  );
  const { cardWidth, cardHeight, cardCenterY } = prizeLayout;
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
  const kindLabel =
    pull.kind === 'drawing-ink'
      ? 'DRAWING INK'
      : pull.kind === 'accessory'
        ? 'GEAR'
        : pull.kind.toUpperCase();
  card.add(
    label(
      scene,
      0,
      -232,
      `${rarityStyle.label} ${kindLabel}`,
      20,
      rarityColor,
      true
    )
  );

  const catalogEntry = COSMETIC_BY_ID.get(pull.id);
  if (catalogEntry?.kind === pull.kind) {
    const preview = renderCosmeticPreview({
      scene,
      parent: card,
      entry: catalogEntry,
      y: -128,
      size: 132,
      width: cardWidth - 120,
    }).setScale(prefersReducedMotion() ? 1 : 0.15);
    if (!prefersReducedMotion()) {
      scene.tweens.add({
        targets: preview,
        scaleX: 1,
        scaleY: 1,
        duration: 420,
        delay: 100,
        ease: 'Back.easeOut',
      });
    }
  } else {
    card.add(label(scene, 0, -128, `YOUR ${kindLabel}`, 28, UI.ink, true));
  }

  card.add(
    label(
      scene,
      0,
      -35,
      pull.name,
      pull.rarity === 'epic' ? 40 : 34,
      UI.ink,
      true
    ).setWordWrapWidth(cardWidth - 72)
  );
  const description = label(
    scene,
    0,
    30,
    pull.description,
    TYPE.body,
    UI.inkSoft,
    true
  )
    .setWordWrapWidth(cardWidth - 80)
    .setLineSpacing(3);
  card.add(description);

  if (catalogEntry?.kind === 'accessory') {
    gearRankStars(scene, card, 0, 92, pull.gearRank ?? 1, 1.15);
  }

  card.add(
    label(
      scene,
      0,
      catalogEntry?.kind === 'accessory' ? 135 : 120,
      prizeOwnershipLabel(pull),
      catalogEntry?.kind === 'accessory' ? 18 : 22,
      pull.isNew ? UI.coralText : UI.goldText,
      true
    ).setWordWrapWidth(cardWidth - 72)
  );

  let closingPrize = false;
  const dismissPrize = (): void => {
    if (closingPrize || !revealLayer.active) return;
    closingPrize = true;
    if (prefersReducedMotion()) {
      revealLayer.destroy(true);
      options.onDismiss();
      return;
    }
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
    const openCollection = (): void => {
      if (closingPrize) return;
      closingPrize = true;
      options.onViewCollection?.();
    };
    const viewCollection = button(
      scene,
      prizeLayout.viewCollection?.centerX ?? 0,
      prizeLayout.actionCenterY,
      pull.mergeReady ? 'FORGE IN BAG' : 'VIEW BAG',
      openCollection,
      prizeLayout.viewCollection?.width ?? 0,
      UI.gold
    );
    const continueButton = ghostButton(
      scene,
      prizeLayout.acknowledgement.centerX,
      prizeLayout.actionCenterY,
      options.acknowledgementLabel,
      dismissPrize,
      prizeLayout.acknowledgement.width
    );
    card.add([viewCollection, continueButton]);
  } else {
    card.add(
      button(
        scene,
        0,
        prizeLayout.actionCenterY,
        options.acknowledgementLabel,
        dismissPrize,
        prizeLayout.acknowledgement.width,
        UI.coral
      )
    );
  }

  if (prefersReducedMotion()) card.setScale(1).setAlpha(1);
  else {
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
  return dismissPrize;
}

function revealBatchPrizes(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  pulls: readonly CapsulePull[],
  options: PrizeRevealOptions
): () => void {
  const { width, height } = scene.scale;
  const topRarity = highestRarity(pulls);
  const rarityStyle = RARITY_STYLE[topRarity];
  if (topRarity === 'epic') rainbowMoment(scene, layer);
  else if (topRarity === 'rare')
    goldBurst(scene, layer, width / 2, height * 0.46);
  else puff(scene, layer, width / 2, height * 0.46);

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

  const prizeLayout = planCapsulePrizeLayout(
    width,
    height,
    Boolean(options.onViewCollection)
  );
  const { cardWidth, cardHeight, cardCenterY } = prizeLayout;
  const card = scene.add.container(width / 2, cardCenterY).setScrollFactor(0);
  const paper = scene.add.graphics();
  paper.fillStyle(UI.paper, 1);
  paper.fillRoundedRect(
    -cardWidth / 2,
    -cardHeight / 2,
    cardWidth,
    cardHeight,
    24
  );
  paper.lineStyle(6, rarityStyle.color, 1);
  paper.strokeRoundedRect(
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
  card.add([paper, cardInputBlocker]);
  revealLayer.add(card);

  const summary = summarizeCapsuleBatch(pulls);
  card.add([
    handLettered(scene, 0, -230, 'TEN CHESTS OPENED', 32, UI.ink, true),
    label(
      scene,
      0,
      -194,
      `${summary.epic} EPIC · ${summary.rare} RARE · ${summary.newItems} NEW`,
      17,
      UI.coralText,
      true
    ),
  ]);

  const columns = 5;
  const tileGap = 8;
  const gridWidth = cardWidth - 42;
  const tileWidth = (gridWidth - tileGap * (columns - 1)) / columns;
  pulls.slice(0, CAPSULE_MAX_BATCH_SIZE).forEach((pull, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const tileX =
      -gridWidth / 2 + tileWidth / 2 + column * (tileWidth + tileGap);
    const tileY = -90 + row * 146;
    const tile = scene.add.container(tileX, tileY);
    const tileRarity = RARITY_STYLE[pull.rarity];
    tile.add(
      scene.add
        .rectangle(0, 0, tileWidth, 132, UI.creamHex, 1)
        .setStrokeStyle(4, tileRarity.color, 1)
    );
    const catalogEntry = COSMETIC_BY_ID.get(pull.id);
    if (catalogEntry?.kind === pull.kind) {
      renderCosmeticPreview({
        scene,
        parent: tile,
        entry: catalogEntry,
        y: -27,
        size: 62,
        width: tileWidth - 14,
        height: 62,
      });
    }
    const itemName = label(scene, 0, 32, pull.name, 13, UI.ink, true)
      .setWordWrapWidth(tileWidth - 8)
      .setLineSpacing(-4);
    const ownership = label(
      scene,
      0,
      57,
      pull.isNew ? 'NEW' : pull.kind === 'accessory' ? 'FORGE +1' : 'OWNED',
      12,
      pull.isNew ? UI.coralText : UI.goldText,
      true
    );
    tile.add([itemName, ownership]);
    card.add(tile);
  });

  let closingPrize = false;
  const dismissPrize = (): void => {
    if (closingPrize || !revealLayer.active) return;
    closingPrize = true;
    if (prefersReducedMotion()) {
      revealLayer.destroy(true);
      options.onDismiss();
      return;
    }
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
    const openCollection = (): void => {
      if (closingPrize) return;
      closingPrize = true;
      options.onViewCollection?.();
    };
    card.add([
      button(
        scene,
        prizeLayout.viewCollection?.centerX ?? 0,
        prizeLayout.actionCenterY,
        'VIEW BAG',
        openCollection,
        prizeLayout.viewCollection?.width ?? 0,
        UI.gold
      ),
      ghostButton(
        scene,
        prizeLayout.acknowledgement.centerX,
        prizeLayout.actionCenterY,
        options.acknowledgementLabel,
        dismissPrize,
        prizeLayout.acknowledgement.width
      ),
    ]);
  } else {
    card.add(
      button(
        scene,
        0,
        prizeLayout.actionCenterY,
        options.acknowledgementLabel,
        dismissPrize,
        prizeLayout.acknowledgement.width,
        UI.coral
      )
    );
  }

  if (prefersReducedMotion()) card.setScale(1).setAlpha(1);
  else {
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
  return dismissPrize;
}

function stopPointerPropagation(
  _pointer: unknown,
  _localX: unknown,
  _localY: unknown,
  event: Phaser.Types.Input.EventData
): void {
  event.stopPropagation?.();
}

function puff(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number
): void {
  if (prefersReducedMotion()) return;
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
  if (prefersReducedMotion()) return;
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
  if (prefersReducedMotion()) return;
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
    'EPIC FIND!',
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
