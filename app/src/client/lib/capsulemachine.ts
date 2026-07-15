// The Mystery Ink chest — a satisfying, non-predatory reward screen in the
// sketchbook aesthetic. Shop supplies the generated stage and chest states while
// this module owns the controls and ceremony. The player spends
// battle-earned Ink, taps the chest, and gets a rarity-tiered ceremony:
//   common → a soft puff
//   rare   → a gold burst
//   epic   → a full-screen rainbow moment + hand-lettered banner
//   legendary → the longest reveal with a crimson rarity frame
// One or ten opens are supported; there is deliberately no 100-open action,
// auto-repeat, near-miss reel, or paid banner. Duplicate Gear feeds Forge.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  CAPSULE_MAX_BATCH_SIZE,
  CAPSULE_RARITY_PERCENTAGES,
  capsuleRarityRank,
} from '../../shared/arena';
import type {
  CapsuleProgress,
  CapsulePull,
  CapsulePullResponse,
  CapsuleRarity,
} from '../../shared/arena';
import { NAV_SAFE, UI, TYPE, prefersReducedMotion } from './theme';
import {
  label,
  handLettered,
  button,
  ghostButton,
  paperButtonPlate,
  paperIconButton,
  stickerCard,
} from './ui';
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
  INK_TOKEN_TEXTURE,
  SHOP_CHEST_TEXTURES,
  SHOP_CLAW_MACHINE_SHELL_TEXTURE,
} from './visualassets';
import {
  capsuleOpenCost,
  planCapsuleOpenAffordance,
  planCapsulePrizeLayout,
  prizeOwnershipAnnouncement,
  prizeOwnershipLabel,
  summarizeCapsuleBatch,
} from './capsulepresentation';
import {
  capsuleRevealAnnouncement,
  planCapsuleBatchReveal,
} from './capsulereveal';
import { playSfx, setSfxCue } from './sfx';
import { openInkEarningGuide, type InkEarningGuide } from './inkearningguide';
import {
  openCapsulePrizeGuide,
  type CapsulePrizeGuide,
} from './capsuleprizeguide';

const DEPTH = 2500;
const COLLECTION_BAR_WIDTH = 480;
const COLLECTION_BAR_HEIGHT = 22;
const CAPSULE_ODDS_ACCESSIBLE_COPY =
  `Odds are ${CAPSULE_RARITY_PERCENTAGES.common} percent common, ` +
  `${CAPSULE_RARITY_PERCENTAGES.rare} percent rare, and ` +
  `${CAPSULE_RARITY_PERCENTAGES.epic} percent epic, and ` +
  `${CAPSULE_RARITY_PERCENTAGES.legendary} percent legendary.`;

const FEATURED_GEAR_ID = 'comet-crayon-blade';
const CLAW_MACHINE_SAMPLE_IDS = [
  'tiny-sword',
  'top-hat',
  'comet-crayon-blade',
  'star-eye-mask',
  'party-hat',
  'round-glasses',
  'cardboard-shield',
] as const;
const CHEST_DISPLAY_WIDTH = 410;
const CHEST_DISPLAY_HEIGHT = 430;
const OPEN_CHEST_HORIZONTAL_SCALE = 1.086;
const CLAW_MACHINE_SCALE = 1.1;
const OPEN_CHEST_Y_OFFSET = -47;

type ChestOpenCount = 1 | typeof CAPSULE_MAX_BATCH_SIZE;

type ChestArt = Readonly<{
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  image: Phaser.GameObjects.Image;
  closedScaleX: number;
  closedScaleY: number;
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
  seasonName?: string | undefined; // current authoritative season shown by the prize guide
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
  acknowledgementLabel: 'GOT IT' | 'KEEP DRAWING' | 'VIEW BAG';
  onDismiss: () => void;
  onViewCollection?: () => void;
  onBatchItemRevealed?: (
    pull: CapsulePull,
    index: number,
    total: number
  ) => void;
  onBatchRevealComplete?: () => void;
};

type InkWallet = Readonly<{
  container: Phaser.GameObjects.Container;
  balance: Phaser.GameObjects.Text;
}>;

type InkOpenButton = Readonly<{
  container: Phaser.GameObjects.Container;
  setContent: (actionLabel: string, cost: number | null) => void;
  setEnabled: (enabled: boolean) => void;
}>;

type ClawMachine = Readonly<{
  pullControl: InkOpenButton;
  message: Phaser.GameObjects.Text;
  actionButton: Phaser.GameObjects.Container;
  actionRect: Readonly<{ x: number; y: number; width: number; height: number }>;
  clawRig: Phaser.GameObjects.Container;
  cable: Phaser.GameObjects.Rectangle;
  clawHead: Phaser.GameObjects.Container;
  leftArm: Phaser.GameObjects.Container;
  rightArm: Phaser.GameObjects.Container;
  windowContent: Phaser.GameObjects.Container;
  controlGlow: Phaser.GameObjects.Arc;
  homeX: number;
  chuteX: number;
}>;

type CapsuleActionSurface = Readonly<{
  add: (input: CanvasActionOverlayInput) => HTMLButtonElement;
  addStatus: (initialMessage?: string) => HTMLElement;
  destroy: () => void;
  focusInitial: (control?: HTMLElement) => void;
}>;

function createEmbeddedCapsuleActions(
  scene: Scene,
  firstChestVisit: boolean
): CapsuleActionSurface {
  const overlay = new CanvasActionOverlay(scene, 'shop-chest');
  const descriptionId = 'shop-chest-description';
  overlay.addDescription(
    descriptionId,
    firstChestVisit
      ? `Play the First Gear claw machine for your first earned-Ink reward. The visible Gear are possible examples, not a prediction. The first reward is equippable Gear and the server owns the price and reward. ${CAPSULE_ODDS_ACCESSIBLE_COPY}`
      : `Spend battle-earned Ink at the Mystery Gear claw machine for one reward or a batch of ten. Ten is the largest batch. The server owns every price, reward, and pity step. ${CAPSULE_ODDS_ACCESSIBLE_COPY}`
  );
  overlay.setRootAttributes({
    role: 'region',
    'aria-label': firstChestVisit
      ? 'First Gear claw machine'
      : 'Mystery Gear claw machine',
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

function createInkWallet(
  scene: Scene,
  x: number,
  y: number,
  ink: number
): InkWallet {
  const container = scene.add.container(x, y);
  const shadow = scene.add
    .rectangle(3, 4, 196, 58, 0x1b1020, 0.42)
    .setStrokeStyle(0);
  const paper = scene.add
    .rectangle(0, 0, 196, 58, 0x3b263c, 0.96)
    .setStrokeStyle(4, UI.goldHex, 0.96);
  const token = scene.add
    .image(-66, 0, INK_TOKEN_TEXTURE)
    .setDisplaySize(48, 48);
  const balance = label(scene, 24, -1, `${ink} INK`, 26, UI.cream, true);
  container.add([shadow, paper, token, balance]);
  return { container, balance };
}

function createInkOpenButton(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  variant: 'primary' | 'secondary',
  actionLabel: string,
  cost: number,
  onActivate: () => void
): InkOpenButton {
  const container = scene.add.container(x, y);
  const isPrimary = variant === 'primary';
  const plate = paperButtonPlate(scene, variant, width, height);
  const actionText = label(scene, 0, -20, actionLabel, 29, UI.ink, true);
  const token = scene.add
    .image(0, 22, INK_TOKEN_TEXTURE)
    .setDisplaySize(29, 29);
  const costText = label(scene, 0, 21, `${cost} INK`, 22, UI.ink, true);
  const content = scene.add.container(0, 0, [actionText, token, costText]);
  const accents = isPrimary
    ? [
        scene.add.star(
          -width / 2 + 35,
          -height / 2 + 26,
          4,
          3,
          10,
          UI.creamHex
        ),
        scene.add.star(width / 2 - 35, -height / 2 + 26, 4, 3, 10, UI.creamHex),
      ]
    : [];
  const hitTarget = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  container.add([plate, ...accents, content, hitTarget]);

  const setContent = (
    nextActionLabel: string,
    nextCost: number | null
  ): void => {
    actionText.setText(nextActionLabel);
    token.setVisible(nextCost !== null);
    costText.setVisible(nextCost !== null);
    if (nextCost === null) {
      actionText.setPosition(0, 0);
      return;
    }
    actionText.setPosition(0, -20);
    costText.setText(`${nextCost} INK`);
    const tokenPriceGap = 7;
    const priceWidth = token.displayWidth + tokenPriceGap + costText.width;
    const priceLeft = -priceWidth / 2;
    token.setPosition(priceLeft + token.displayWidth / 2, 22);
    costText.setPosition(
      token.x + token.displayWidth / 2 + tokenPriceGap + costText.width / 2,
      21
    );
  };
  const setEnabled = (enabled: boolean): void => {
    content.setAlpha(enabled ? 1 : 0.65);
  };
  setContent(actionLabel, cost);
  bindPressInteractionEvents(
    hitTarget,
    {
      press: () => container.setScale(0.94, 0.92),
      release: () => container.setScale(1),
      activate: onActivate,
      pressOnHover: false,
    },
    { gameTarget: scene.input, shutdownTarget: scene.events }
  );
  return { container, setContent, setEnabled };
}

function createClawMachine(
  scene: Scene,
  x: number,
  y: number,
  cost: number,
  firstChestVisit: boolean,
  onActivate: () => void
): ClawMachine {
  const container = scene.add.container(x, y).setScale(CLAW_MACHINE_SCALE);
  const windowContent = scene.add.container(0, 0);
  const pileShadow = scene.add.ellipse(0, 74, 350, 68, 0x160d16, 0.28);
  windowContent.add(pileShadow);
  const samplePositions = [
    { x: -150, y: 58, angle: -14, scale: 0.76 },
    { x: -100, y: 70, angle: 12, scale: 0.72 },
    { x: -50, y: 54, angle: -8, scale: 0.78 },
    { x: 0, y: 72, angle: 14, scale: 0.72 },
    { x: 50, y: 55, angle: -13, scale: 0.76 },
    { x: 100, y: 70, angle: 10, scale: 0.73 },
    { x: 150, y: 57, angle: -7, scale: 0.76 },
  ] as const;
  CLAW_MACHINE_SAMPLE_IDS.forEach((id, index) => {
    const entry = COSMETIC_BY_ID.get(id);
    if (entry?.kind !== 'accessory') return;
    const position = samplePositions[index];
    if (!position) return;
    const preview = scene.add
      .container(position.x, position.y)
      .setAngle(position.angle)
      .setScale(position.scale);
    preview.add(
      scene.add
        .circle(0, 0, 36, UI.creamHex, 0.98)
        .setStrokeStyle(5, RARITY_STYLE[entry.rarity].color, 0.98)
    );
    renderCosmeticPreview({
      scene,
      parent: preview,
      entry,
      y: 0,
      size: 58,
      width: 58,
      height: 58,
      maxScale: 0.86,
    });
    windowContent.add(preview);
  });
  container.add(windowContent);

  const rail = scene.add
    .rectangle(0, -198, 350, 12, UI.creamHex, 1)
    .setStrokeStyle(5, UI.inkHex, 0.94);
  container.add(rail);

  const homeX = -132;
  const clawRig = scene.add.container(homeX, -204);
  const carriage = scene.add
    .rectangle(0, 0, 62, 30, UI.gold, 1)
    .setStrokeStyle(5, UI.inkHex, 0.96);
  const cable = scene.add
    .rectangle(0, 14, 8, 50, UI.creamHex, 1)
    .setOrigin(0.5, 0)
    .setStrokeStyle(3, UI.inkHex, 0.92);
  const clawHead = scene.add.container(0, 62);
  const hubPaper = scene.add
    .circle(0, 0, 23, UI.creamHex, 1)
    .setStrokeStyle(5, UI.inkHex, 0.98);
  const hub = scene.add
    .circle(0, 0, 10, UI.gold, 1)
    .setStrokeStyle(3, UI.inkHex, 0.88);
  const leftArm = scene.add.container(-7, 10).setAngle(36);
  const leftProng = scene.add
    .rectangle(0, 0, 13, 64, UI.creamHex, 1)
    .setOrigin(0.5, 0)
    .setStrokeStyle(4, UI.inkHex, 0.96);
  const leftTip = scene.add
    .circle(0, 62, 7, UI.gold, 1)
    .setStrokeStyle(3, UI.inkHex, 0.92);
  leftArm.add([leftProng, leftTip]);
  const rightArm = scene.add.container(7, 10).setAngle(-36);
  const rightProng = scene.add
    .rectangle(0, 0, 13, 64, UI.creamHex, 1)
    .setOrigin(0.5, 0)
    .setStrokeStyle(4, UI.inkHex, 0.96);
  const rightTip = scene.add
    .circle(0, 62, 7, UI.gold, 1)
    .setStrokeStyle(3, UI.inkHex, 0.92);
  rightArm.add([rightProng, rightTip]);
  clawHead.add([leftArm, rightArm, hubPaper, hub]);
  clawRig.add([carriage, cable, clawHead]);
  container.add(clawRig);

  const shell = scene.add
    .image(0, 0, SHOP_CLAW_MACHINE_SHELL_TEXTURE)
    .setDisplaySize(620, 930);
  container.add(shell);

  const heading = label(
    scene,
    0,
    -350,
    firstChestVisit ? 'FIRST GEAR CLAW' : 'MYSTERY GEAR CLAW',
    29,
    UI.cream,
    true
  );
  const message = label(
    scene,
    0,
    -312,
    firstChestVisit ? 'FIRST PLAY GUARANTEED GEAR' : 'DROP CLAW FOR 1 REWARD',
    17,
    UI.goldText,
    true
  ).setWordWrapWidth(350);
  container.add([heading, message]);

  const actionButton = scene.add.container(0, 128);
  const controlGlow = scene.add
    .circle(0, 0, 56, UI.gold, 0.06)
    .setStrokeStyle(5, UI.creamHex, 0.72);
  const buttonLabel = label(scene, 0, 1, 'GO!', 18, UI.cream, true);
  actionButton.add([controlGlow, buttonLabel]);
  container.add(actionButton);

  const actionCenterX = 0;
  const actionText = label(
    scene,
    actionCenterX,
    213,
    'DROP CLAW',
    27,
    UI.cream,
    true
  );
  actionText.setWordWrapWidth(260);
  const token = scene.add
    .image(-48, 254, INK_TOKEN_TEXTURE)
    .setDisplaySize(28, 28);
  const costText = label(scene, 0, 254, `${cost} INK`, 21, UI.cream, true);
  container.add([actionText, token, costText]);

  const placePrice = (): void => {
    const gap = 7;
    const priceWidth = token.displayWidth + gap + costText.width;
    const priceLeft = actionCenterX - priceWidth / 2;
    token.setX(priceLeft + token.displayWidth / 2);
    costText.setX(token.x + token.displayWidth / 2 + gap + costText.width / 2);
  };
  const setContent = (
    nextActionLabel: string,
    nextCost: number | null
  ): void => {
    token.setVisible(nextCost !== null);
    costText.setVisible(nextCost !== null);
    if (nextCost !== null) {
      actionText.setText(nextActionLabel.replace('OPEN CHEST', 'DROP CLAW'));
      actionText.setPosition(actionCenterX, 213);
      costText.setText(`${nextCost} INK`);
      placePrice();
    } else {
      actionText.setText(
        nextActionLabel.startsWith('DRAW ONCE') ? 'DRAW ONCE' : nextActionLabel
      );
      actionText.setPosition(actionCenterX, 237);
    }
  };
  const setEnabled = (enabled: boolean): void => {
    actionButton.setAlpha(enabled ? 1 : 0.46);
    actionText.setAlpha(enabled ? 1 : 0.88);
    token.setAlpha(enabled ? 1 : 0.72);
    costText.setAlpha(enabled ? 1 : 0.84);
    scene.tweens.killTweensOf(controlGlow);
    controlGlow.setAlpha(enabled ? 0.16 : 0.04).setScale(1);
    if (enabled && !prefersReducedMotion()) {
      scene.tweens.add({
        targets: controlGlow,
        alpha: 0.38,
        scaleX: 1.14,
        scaleY: 1.14,
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  };
  setContent('DROP CLAW', cost);

  const controlHitTarget = scene.add
    .rectangle(0, 128, 150, 120, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  container.add(controlHitTarget);
  bindPressInteractionEvents(
    controlHitTarget,
    {
      press: () => actionButton.setScale(0.9),
      release: () => actionButton.setScale(1),
      activate: onActivate,
      pressOnHover: false,
    },
    { gameTarget: scene.input, shutdownTarget: scene.events }
  );

  return {
    pullControl: { container, setContent, setEnabled },
    message,
    actionButton,
    actionRect: {
      x: x - 75 * CLAW_MACHINE_SCALE,
      y: y + 68 * CLAW_MACHINE_SCALE,
      width: 150 * CLAW_MACHINE_SCALE,
      height: 120 * CLAW_MACHINE_SCALE,
    },
    clawRig,
    cable,
    clawHead,
    leftArm,
    rightArm,
    windowContent,
    controlGlow,
    homeX,
    chuteX: 0,
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
  const firstChestVisit = progress.pullCount === 0;
  const useClawMachine = opts.embedded === true;
  let pulling = false;
  let prizeOpen = false;
  let pendingOperationId: string | null = null;
  let pendingBatchTarget: ChestOpenCount | null = null;
  let completedBatchPulls: CapsulePull[] = [];
  let closeRequested = false;
  let destroyed = false;
  let dismissPrizeAction: (() => void) | null = null;
  let featuredGearDetail: FeaturedGearDetail | null = null;
  let inkEarningGuide: InkEarningGuide | null = null;
  let capsulePrizeGuide: CapsulePrizeGuide | null = null;

  const layer = scene.add
    .container(0, 0)
    .setDepth(opts.embedded ? 1000 : DEPTH)
    .setScrollFactor(0);
  const modalActions: CapsuleActionSurface = opts.embedded
    ? createEmbeddedCapsuleActions(scene, firstChestVisit)
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
  if (scrim) {
    setSfxCue(scrim, 'ui.close');
    layer.add(scrim);
  }

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

  const inkWallet = createInkWallet(scene, width / 2, 140, ink);
  inkWallet.container.setScrollFactor(0).setDepth(DEPTH + 2);
  layer.add(inkWallet.container);

  let inkInfoControl: HTMLButtonElement | null = null;
  const openInkInfo = (): void => {
    if (destroyed || pulling || prizeOpen || !inkInfoControl) return;
    inkEarningGuide?.destroy();
    inkEarningGuide = openInkEarningGuide(
      scene,
      inkInfoControl,
      () => (inkEarningGuide = null)
    );
  };
  const inkInfoButtonX = width / 2 + 138;
  const inkInfoButton = paperIconButton(
    scene,
    inkInfoButtonX,
    140,
    'info',
    openInkInfo,
    58,
    UI.creamHex,
    UI.coral,
    58
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add(inkInfoButton);
  inkInfoControl = modalActions.add({
    label: 'How to earn Ink',
    rect: { x: inkInfoButtonX - 29, y: 111, width: 58, height: 58 },
    onActivate: openInkInfo,
  });

  let prizeGuideControl: HTMLButtonElement | null = null;
  const openPrizeGuide = (): void => {
    if (destroyed || pulling || prizeOpen || !prizeGuideControl) return;
    capsulePrizeGuide?.destroy();
    capsulePrizeGuide = openCapsulePrizeGuide(
      scene,
      opts.seasonName,
      prizeGuideControl,
      () => (capsulePrizeGuide = null)
    );
  };
  const prizeGuideButtonX = width / 2 - 138;
  const prizeGuideButton = paperIconButton(
    scene,
    prizeGuideButtonX,
    140,
    'gift',
    openPrizeGuide,
    58,
    UI.creamHex,
    UI.gold,
    58
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  layer.add(prizeGuideButton);
  prizeGuideControl = modalActions.add({
    label: `View ${opts.seasonName ?? 'current season'} claw-machine prizes and odds`,
    rect: { x: prizeGuideButtonX - 29, y: 111, width: 58, height: 58 },
    onActivate: openPrizeGuide,
  });

  const featuredGearControl = useClawMachine
    ? null
    : drawBannerDeck(
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
    .setDepth(DEPTH + 2)
    .setVisible(!useClawMachine);
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
    pityText.setText(
      firstChestVisit ? '' : `EPIC IN ${pityRemaining} OR SOONER`
    );
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

  let primaryActionEnabled = ink >= nextCost;
  let secondaryActionEnabled =
    ink >= capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost);
  const clawMachineY = Math.min(620, height - NAV_SAFE - 520);
  const clawMachine = useClawMachine
    ? createClawMachine(
        scene,
        width / 2,
        clawMachineY,
        nextCost,
        firstChestVisit,
        () => {
          if (primaryActionEnabled) void openChests(1);
        }
      )
    : null;

  // --- The hand-drawn chest -------------------------------------------------
  const chestY = Math.min(
    height - NAV_SAFE - 360,
    useClawMachine ? clawMachineY : Math.max(720, height * 0.52)
  );
  const chest = createChestArt(scene, width / 2, chestY);
  const chestRestingScale = 1;
  chest.container
    .setDepth(DEPTH + 1)
    .setScrollFactor(0)
    .setScale(chestRestingScale)
    .setVisible(!useClawMachine);
  layer.add(chest.container);
  if (!useClawMachine) {
    chest.container.setSize(380, 310).setInteractive({ useHandCursor: true });
    bindPressInteractionEvents(
      chest.container,
      {
        press: () => chest.container.setScale(chestRestingScale * 0.96),
        release: () => chest.container.setScale(chestRestingScale),
        activate: () => void openChests(1),
        pressOnHover: false,
      },
      { gameTarget: scene.input, shutdownTarget: scene.events }
    );
  }

  // --- Open buttons + copy --------------------------------------------------
  const actionY = Math.min(
    height - NAV_SAFE - 84,
    chestY + (useClawMachine ? 315 * CLAW_MACHINE_SCALE : 345)
  );
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
  helper.setVisible(!useClawMachine);
  layer.add(helper);

  const setActionMessage = (text: string, color: string): void => {
    if (clawMachine) {
      clawMachine.message.setText(text).setColor(color);
      return;
    }
    helper.setText(text).setColor(color);
  };

  const actionGap = 18;
  const availableActionWidth = width - 160;
  const actionWidth = useClawMachine
    ? Math.min(320, availableActionWidth)
    : (width - 178 - actionGap) / 2;
  const actionHeight = 100;
  const oneButtonX = useClawMachine ? width / 2 : 80 + actionWidth / 2;
  const oneButtonLeft = oneButtonX - actionWidth / 2;
  const tenButtonX = useClawMachine ? width / 2 : width - 80 - actionWidth / 2;
  const openOneButton =
    clawMachine?.pullControl ??
    createInkOpenButton(
      scene,
      oneButtonX,
      actionY,
      actionWidth,
      actionHeight,
      'primary',
      'OPEN CHEST',
      nextCost,
      () => {
        if (primaryActionEnabled) void openChests(1);
      }
    );
  openOneButton.container.setScrollFactor(0).setDepth(DEPTH + 2);
  const openTenButton = createInkOpenButton(
    scene,
    tenButtonX,
    actionY,
    actionWidth,
    actionHeight,
    'secondary',
    'OPEN 10',
    capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost),
    () => {
      if (secondaryActionEnabled) void openChests(CAPSULE_MAX_BATCH_SIZE);
    }
  );
  openTenButton.container
    .setScrollFactor(0)
    .setVisible(!firstChestVisit)
    .setDepth(DEPTH + 2);
  layer.add([openOneButton.container, openTenButton.container]);

  const openOneControl = modalActions.add({
    label: useClawMachine
      ? `${firstChestVisit ? 'Play the First Gear' : 'Play the Mystery Gear'} claw machine for ${nextCost} Ink`
      : `Open one Mystery Ink chest for ${nextCost} Ink`,
    rect: clawMachine?.actionRect ?? {
      x: oneButtonLeft,
      y: actionY - actionHeight / 2,
      width: actionWidth,
      height: actionHeight,
    },
    enabled: ink >= nextCost,
    pointerPassthrough: true,
    onActivate: () => void openChests(1),
  });
  const openTenControl = modalActions.add({
    label: `Open ten Mystery Ink chests for ${capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost)} Ink`,
    rect: {
      x: tenButtonX - actionWidth / 2,
      y: actionY - actionHeight / 2,
      width: actionWidth,
      height: actionHeight,
    },
    enabled: ink >= capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost),
    pointerPassthrough: true,
    onActivate: () => void openChests(CAPSULE_MAX_BATCH_SIZE),
  });
  openTenControl.hidden = firstChestVisit;
  openTenControl.disabled = firstChestVisit || openTenControl.disabled;
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
  const hasSeparateViewCollectionAction =
    Boolean(opts.onViewCollection) && !firstChestVisit;
  const prizeLayout = planCapsulePrizeLayout(
    width,
    height,
    hasSeparateViewCollectionAction
  );
  const viewCollectionControl = hasSeparateViewCollectionAction
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

  const setPrizeControlsVisible = (
    visible: boolean,
    actionsReady = visible
  ): void => {
    openOneControl.hidden = visible;
    openTenControl.hidden = visible || firstChestVisit;
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
      viewCollectionControl.hidden = !visible || !actionsReady;
      viewCollectionControl.disabled = !visible || !actionsReady;
    }
    acknowledgementControl.hidden = !visible || !actionsReady;
    acknowledgementControl.disabled = !visible || !actionsReady;
  };
  setPrizeControlsVisible(false);

  function refreshAffordance(): void {
    inkWallet.balance.setText(`${ink} INK`);
    const affordance = planCapsuleOpenAffordance(
      ink,
      nextCost,
      pendingBatchTarget,
      completedBatchPulls.length
    );
    const firstVisitNeedsInk =
      firstChestVisit && !affordance.retrying && !affordance.primaryEnabled;
    openOneButton.setContent(
      firstVisitNeedsInk
        ? `DRAW ONCE TO EARN ${nextCost} INK`
        : affordance.retrying
          ? `RETRY ${affordance.remainingCount}`
          : 'OPEN CHEST',
      firstVisitNeedsInk ? null : affordance.requiredInk
    );
    openTenButton.setContent(
      affordance.retrying
        ? `SAVED ${completedBatchPulls.length}/${pendingBatchTarget}`
        : 'OPEN 10',
      affordance.retrying
        ? null
        : capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextCost)
    );
    primaryActionEnabled = affordance.primaryEnabled;
    secondaryActionEnabled = affordance.secondaryEnabled;
    openOneButton.setEnabled(affordance.primaryEnabled);
    openTenButton.setEnabled(affordance.secondaryEnabled);
    openOneControl.disabled =
      pulling || prizeOpen || !affordance.primaryEnabled;
    openTenControl.disabled =
      firstChestVisit || pulling || prizeOpen || !affordance.secondaryEnabled;
    if (featuredGearControl) {
      featuredGearControl.disabled = pulling || prizeOpen;
    }
    openOneControl.setAttribute(
      'aria-label',
      useClawMachine
        ? `${firstChestVisit ? 'Play the First Gear' : 'Play the Mystery Gear'} claw machine for ${affordance.requiredInk ?? nextCost} Ink`
        : affordance.primaryAccessibleLabel
    );
    openTenControl.setAttribute(
      'aria-label',
      affordance.secondaryAccessibleLabel
    );
    if (!affordance.primaryEnabled && !pulling) {
      setActionMessage(
        useClawMachine
          ? `EARN ${nextCost} INK · THEN PLAY`
          : 'PLAY TO EARN MORE INK',
        useClawMachine ? UI.cream : UI.coralText
      );
    } else if (affordance.retrying && !pulling) {
      setActionMessage(
        `RETRY ${affordance.remainingCount} · SAFE PROGRESS ${completedBatchPulls.length}/${pendingBatchTarget}`,
        UI.cream
      );
    } else if (!pulling) {
      setActionMessage(
        firstChestVisit
          ? 'FIRST PLAY GUARANTEED GEAR'
          : useClawMachine
            ? 'DROP CLAW · OR PLAY 10 BELOW'
            : '10× MAX · EARN INK BY PLAYING',
        UI.cream
      );
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
    ink >= nextCost
      ? openOneControl
      : (inkInfoControl ?? closeControl ?? openOneControl)
  );

  const actionTarget = clawMachine?.pullControl.container ?? chest.container;

  async function openChests(requestedCount: ChestOpenCount): Promise<void> {
    if (pulling || prizeOpen) return;
    const targetCount = pendingBatchTarget ?? requestedCount;
    const remainingCount = targetCount - completedBatchPulls.length;
    const requiredInk = capsuleOpenCost(remainingCount, nextCost);
    if (ink < requiredInk) {
      await nudgeChest(scene, actionTarget);
      return;
    }
    pendingBatchTarget = targetCount;
    pulling = true;
    opts.onTransactionLockChange?.(true);
    openOneControl.disabled = true;
    openTenControl.disabled = true;
    if (featuredGearControl) featuredGearControl.disabled = true;
    setActionMessage(
      useClawMachine
        ? 'CLAW SEARCHING…'
        : targetCount === 1
          ? 'SHAKE THE CHEST…'
          : 'CHARGING ×10…',
      UI.cream
    );
    statusAnnouncement.textContent = useClawMachine
      ? 'Claw searching. Opening one Mystery Ink chest.'
      : `Opening ${targetCount} Mystery Ink ${targetCount === 1 ? 'chest' : 'chests'}.`;

    const stopClawSearch = clawMachine
      ? startClawSearch(scene, clawMachine)
      : null;
    if (!clawMachine) {
      await shakeChest(scene, chest.container, targetCount);
    }
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
        stopClawSearch?.();
        if (clawMachine) resetClawMachine(scene, clawMachine);
        pulling = false;
        refreshAffordance();
        setActionMessage(
          `${completedBatchPulls.length}/${targetCount} OPENED · RETRY ${targetCount - completedBatchPulls.length}`,
          UI.coralText
        );
        statusAnnouncement.textContent = `${result.error} ${completedBatchPulls.length} of ${targetCount} opens are safely recorded. Retry resumes the same open.`;
        return;
      }
      stopClawSearch?.();
      ink = result.ink;
      nextCost = result.nextCost;
      progress = result.progress;
      inkWallet.balance.setText(`${ink} INK`);
      playSfx('reward.ink');
      animateInkSpend(
        scene,
        layer,
        inkWallet.container,
        actionTarget,
        completedBatchPulls.length
      );
      if (clawMachine) {
        await animateClawCatch(scene, clawMachine, result.pull);
        if (destroyed || !scene.sys.isActive()) return;
      }
      completedBatchPulls.push(result.pull);
      pendingOperationId = null;
      setActionMessage(
        `${completedBatchPulls.length}/${targetCount} OPENED`,
        UI.cream
      );
      statusAnnouncement.textContent = `Opened ${completedBatchPulls.length} of ${targetCount}.`;
    }
    refreshProgress(true);
    const revealedPulls = [...completedBatchPulls];
    completedBatchPulls = [];
    pendingBatchTarget = null;
    opts.onTransactionLockChange?.(false);
    const revealRarity = highestRarity(revealedPulls);
    if (clawMachine) {
      await celebrateClawMachine(scene, clawMachine, revealRarity);
    } else {
      await openChest(scene, chest, revealRarity);
    }
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
      if (!useClawMachine) resetChest(chest);
      if (!opts.onViewCollection) {
        close();
        return;
      }
      if (firstChestVisit) {
        close('collection');
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
      ? firstChestVisit
        ? {
            acknowledgementLabel: 'VIEW BAG',
            onDismiss: onPrizeDismissed,
          }
        : {
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
        `${summary.epic} epic, ${summary.legendary} legendary, and ` +
        `${summary.newItems} new styles. ` +
        `Your Bag now has ${progress.discoveredCount} found styles.`;
    }
    acknowledgementControl.setAttribute(
      'aria-label',
      prizeActions.acknowledgementLabel
    );
    if (singlePull) {
      setPrizeControlsVisible(true);
      dismissPrizeAction = revealPrize(scene, layer, singlePull, prizeActions);
      modalActions.focusInitial(
        viewCollectionControl ?? acknowledgementControl
      );
    } else {
      setPrizeControlsVisible(true, false);
      dismissPrizeAction = revealBatchPrizes(scene, layer, revealedPulls, {
        ...prizeActions,
        onBatchItemRevealed: (pull, index, total) => {
          statusAnnouncement.textContent =
            capsuleRevealAnnouncement(pull, index, total) +
            ` ${prizeOwnershipAnnouncement(pull)}`;
        },
        onBatchRevealComplete: () => {
          const summary = summarizeCapsuleBatch(revealedPulls);
          statusAnnouncement.textContent =
            `All ten rewards revealed. ${summary.common} common, ` +
            `${summary.rare} rare, ${summary.epic} epic, ` +
            `${summary.legendary} legendary, and ` +
            `${summary.newItems} new styles.`;
          setPrizeControlsVisible(true, true);
          modalActions.focusInitial(
            viewCollectionControl ?? acknowledgementControl
          );
        },
      });
    }
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
      setActionMessage(
        pulling
          ? 'Finishing the paid chest before closing…'
          : 'Tap RETRY once to safely reconcile this chest.',
        UI.coralText
      );
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
    const guide = inkEarningGuide;
    inkEarningGuide = null;
    guide?.destroy();
    const prizeGuide = capsulePrizeGuide;
    capsulePrizeGuide = null;
    prizeGuide?.destroy();
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
  const activeHeight = 148;
  const active = stickerCard(
    scene,
    margin + activeWidth / 2,
    y,
    activeWidth,
    activeHeight,
    { gold: true, tapeWidth: 62, tilt: -0.35 }
  )
    .setScrollFactor(0)
    .setDepth(DEPTH + 2);
  const contentLeft = -activeWidth / 2 + 42;
  const activeTitle = label(scene, contentLeft, -40, 'LOOT', 32, UI.ink, true);
  activeTitle.setOrigin(0, 0.5);
  const activeSubhead = label(
    scene,
    contentLeft,
    0,
    'TAP GLOWING GEAR FOR EFFECT',
    18,
    UI.coralText,
    true
  );
  activeSubhead.setOrigin(0, 0.5);
  const odds = label(
    scene,
    contentLeft,
    39,
    `${CAPSULE_RARITY_PERCENTAGES.common}% COMMON · ${CAPSULE_RARITY_PERCENTAGES.rare}% RARE · ${CAPSULE_RARITY_PERCENTAGES.epic}% EPIC · ${CAPSULE_RARITY_PERCENTAGES.legendary}% LEGENDARY`,
    15,
    UI.inkSoft,
    true
  );
  odds.setOrigin(0, 0.5);
  active.add([activeTitle, activeSubhead, odds]);
  const featuredEntry = COSMETIC_BY_ID.get(FEATURED_GEAR_ID);
  let featuredControl: HTMLButtonElement | null = null;
  if (featuredEntry?.kind === 'accessory') {
    const featuredX = activeWidth / 2 - 76;
    const featuredY = -8;
    const featured = scene.add.container(featuredX, featuredY);
    const aura = scene.add
      .circle(0, 0, 54, UI.gold, 0.15)
      .setStrokeStyle(3, UI.goldHex, 0.44);
    const backing = scene.add
      .circle(0, 0, 43, UI.creamHex, 0.97)
      .setStrokeStyle(4, UI.goldHex, 0.98);
    const innerRing = scene.add
      .circle(0, 0, 35, UI.gold, 0.08)
      .setStrokeStyle(2, UI.coral, 0.7);
    const upperSparkle = scene.add.star(-38, -35, 4, 4, 15, UI.goldHex, 1);
    const lowerSparkle = scene.add.star(40, 29, 4, 3, 11, UI.creamHex, 0.96);
    const hitTarget = scene.add
      .circle(0, 0, 55, 0xffffff, 0.001)
      .setInteractive();
    setSfxCue(hitTarget, 'ui.open');
    featured.add([aura, backing, innerRing, upperSparkle, lowerSparkle]);
    renderCosmeticPreview({
      scene,
      parent: featured,
      entry: featuredEntry,
      x: 0,
      y: 0,
      size: 80,
      width: 86,
      height: 86,
    });
    featured.add(hitTarget);
    active.add(featured);

    featuredControl = actions.add({
      label: `Inspect featured Gear: ${featuredEntry.name}. ${featuredEntry.rarity} ${featuredEntry.category}.`,
      rect: {
        x: width / 2 + featuredX - 55,
        y: y + featuredY - 55,
        width: 110,
        height: 110,
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
    .container(width / 2, y + 106)
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
  const glow = scene.add.circle(0, -8, 192, UI.gold, 0.12);
  const shadow = scene.add.ellipse(8, 143, 356, 66, 0x160d16, 0.34);
  const image = scene.add
    .image(0, 0, SHOP_CHEST_TEXTURES.closed)
    .setDisplaySize(CHEST_DISPLAY_WIDTH, CHEST_DISPLAY_HEIGHT);
  const closedScaleX = image.scaleX;
  const closedScaleY = image.scaleY;
  container.add([glow, shadow, image]);
  return { container, glow, image, closedScaleX, closedScaleY };
}

function highestRarity(pulls: readonly CapsulePull[]): CapsuleRarity {
  return pulls.reduce<CapsuleRarity>((highest, pull) => {
    return capsuleRarityRank(pull.rarity) > capsuleRarityRank(highest)
      ? pull.rarity
      : highest;
  }, 'common');
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

function playClawTween(
  scene: Scene,
  config: Phaser.Types.Tweens.TweenBuilderConfig
): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({
      ...config,
      onComplete: () => resolve(),
    });
  });
}

function resetClawMachine(scene: Scene, machine: ClawMachine): void {
  scene.tweens.killTweensOf(machine.clawRig);
  scene.tweens.killTweensOf(machine.cable);
  scene.tweens.killTweensOf(machine.clawHead);
  scene.tweens.killTweensOf(machine.leftArm);
  scene.tweens.killTweensOf(machine.rightArm);
  machine.clawRig.setX(machine.homeX);
  machine.cable.setScale(1);
  machine.clawHead.setY(62);
  machine.leftArm.setAngle(36);
  machine.rightArm.setAngle(-36);
}

function startClawSearch(scene: Scene, machine: ClawMachine): () => void {
  resetClawMachine(scene, machine);
  if (prefersReducedMotion()) return () => undefined;
  scene.tweens.add({
    targets: machine.clawRig,
    x: 132,
    duration: 620,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return () => scene.tweens.killTweensOf(machine.clawRig);
}

function clawTargetX(rewardId: string): number {
  const hash = [...rewardId].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    7
  );
  return -146 + (hash % 293);
}

async function animateClawCatch(
  scene: Scene,
  machine: ClawMachine,
  pull: CapsulePull
): Promise<void> {
  if (prefersReducedMotion()) {
    resetClawMachine(scene, machine);
    return;
  }

  const targetX = clawTargetX(pull.id);
  await playClawTween(scene, {
    targets: machine.clawRig,
    x: targetX,
    duration: 300,
    ease: 'Cubic.easeOut',
  });
  await Promise.all([
    playClawTween(scene, {
      targets: machine.cable,
      scaleY: 4.35,
      duration: 430,
      ease: 'Sine.easeInOut',
    }),
    playClawTween(scene, {
      targets: machine.clawHead,
      y: 229,
      duration: 430,
      ease: 'Sine.easeInOut',
    }),
    playClawTween(scene, {
      targets: machine.leftArm,
      angle: 48,
      duration: 210,
      ease: 'Sine.easeOut',
    }),
    playClawTween(scene, {
      targets: machine.rightArm,
      angle: -48,
      duration: 210,
      ease: 'Sine.easeOut',
    }),
  ]);
  playSfx('reward.reveal');
  await Promise.all([
    playClawTween(scene, {
      targets: machine.leftArm,
      angle: 13,
      duration: 170,
      ease: 'Back.easeOut',
    }),
    playClawTween(scene, {
      targets: machine.rightArm,
      angle: -13,
      duration: 170,
      ease: 'Back.easeOut',
    }),
  ]);

  const caughtReward = scene.add.container(0, 55).setScale(0.18).setAlpha(0);
  const entry = COSMETIC_BY_ID.get(pull.id);
  const rarityColor = RARITY_STYLE[pull.rarity].color;
  caughtReward.add(
    scene.add.circle(0, 0, 40, UI.creamHex, 1).setStrokeStyle(6, rarityColor, 1)
  );
  if (entry?.kind === 'accessory') {
    renderCosmeticPreview({
      scene,
      parent: caughtReward,
      entry,
      y: 0,
      size: 62,
      width: 62,
      height: 62,
      maxScale: 0.9,
    });
  } else {
    caughtReward.add(
      scene.add
        .star(0, 0, 5, 12, 29, rarityColor, 1)
        .setStrokeStyle(4, UI.inkHex)
    );
  }
  machine.clawHead.add(caughtReward);
  await playClawTween(scene, {
    targets: caughtReward,
    scaleX: 0.78,
    scaleY: 0.78,
    alpha: 1,
    duration: 170,
    ease: 'Back.easeOut',
  });
  await Promise.all([
    playClawTween(scene, {
      targets: machine.cable,
      scaleY: 1,
      duration: 390,
      ease: 'Sine.easeInOut',
    }),
    playClawTween(scene, {
      targets: machine.clawHead,
      y: 62,
      duration: 390,
      ease: 'Sine.easeInOut',
    }),
  ]);
  await playClawTween(scene, {
    targets: machine.clawRig,
    x: machine.chuteX,
    duration: 360,
    ease: 'Cubic.easeInOut',
  });
  await Promise.all([
    playClawTween(scene, {
      targets: machine.leftArm,
      angle: 42,
      duration: 180,
      ease: 'Sine.easeOut',
    }),
    playClawTween(scene, {
      targets: machine.rightArm,
      angle: -42,
      duration: 180,
      ease: 'Sine.easeOut',
    }),
    playClawTween(scene, {
      targets: caughtReward,
      y: 205,
      scaleX: 0.48,
      scaleY: 0.48,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeIn',
    }),
  ]);
  caughtReward.destroy();
  resetClawMachine(scene, machine);
}

function celebrateClawMachine(
  scene: Scene,
  machine: ClawMachine,
  rarity: CapsuleRarity
): Promise<void> {
  playSfx('reward.reveal');
  const container = machine.pullControl.container;
  const flash = scene.add
    .circle(0, -42, 276, RARITY_STYLE[rarity].color, 0.24)
    .setStrokeStyle(8, RARITY_STYLE[rarity].color, 0.72);
  container.addAt(flash, 0);
  if (prefersReducedMotion()) {
    flash.setAlpha(0.52);
    return Promise.resolve();
  }
  flash.setScale(0.72).setAlpha(0);
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: flash,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0.62,
      duration: 280,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        flash.destroy();
        resolve();
      },
    });
  });
}

function animateInkSpend(
  scene: Scene,
  layer: Phaser.GameObjects.Container,
  wallet: Phaser.GameObjects.Container,
  chest: Phaser.GameObjects.Container,
  sequenceIndex: number
): void {
  if (prefersReducedMotion()) return;
  const token = scene.add
    .image(wallet.x - 66, wallet.y, INK_TOKEN_TEXTURE)
    .setDisplaySize(34, 34)
    .setAlpha(0.96);
  layer.add(token);
  scene.tweens.add({
    targets: token,
    x: chest.x + ((sequenceIndex % 3) - 1) * 42,
    y: chest.y - 28,
    angle: 180 + sequenceIndex * 24,
    scaleX: 0.42,
    scaleY: 0.42,
    alpha: 0,
    duration: 430,
    delay: sequenceIndex * 44,
    ease: 'Cubic.easeIn',
    onComplete: () => token.destroy(),
  });
}

function shakeChest(
  scene: Scene,
  chest: Phaser.GameObjects.Container,
  openCount: ChestOpenCount
): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  const startY = chest.y;
  const startScaleX = chest.scaleX;
  const startScaleY = chest.scaleY;
  const isTenOpen = openCount === CAPSULE_MAX_BATCH_SIZE;
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: chest,
      angle: isTenOpen ? 6 : 4,
      y: chest.y - (isTenOpen ? 10 : 6),
      scaleX: isTenOpen ? 1.035 : 1.02,
      scaleY: isTenOpen ? 0.965 : 0.98,
      duration: isTenOpen ? 54 : 62,
      yoyo: true,
      repeat: isTenOpen ? 7 : 4,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        chest.setAngle(0).setY(startY).setScale(startScaleX, startScaleY);
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
  playSfx('reward.reveal');
  const rarityColor = RARITY_STYLE[rarity].color;
  const openScaleX = chest.closedScaleX * OPEN_CHEST_HORIZONTAL_SCALE;
  const openScaleY = chest.closedScaleY;
  chest.glow.setFillStyle(rarityColor, 0.18);
  scene.tweens.killTweensOf(chest.image);
  chest.image
    .setTexture(SHOP_CHEST_TEXTURES.open)
    .setPosition(0, OPEN_CHEST_Y_OFFSET)
    .setAlpha(1)
    .setScale(openScaleX, openScaleY);
  if (prefersReducedMotion()) {
    chest.glow.setAlpha(0.68);
    return Promise.resolve();
  }
  chest.image.setAlpha(0.72).setScale(openScaleX * 0.94, openScaleY * 0.94);
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
      targets: chest.image,
      alpha: 1,
      scaleX: openScaleX,
      scaleY: openScaleY,
      duration: 330,
      ease: 'Back.easeOut',
      onComplete: () => resolve(),
    });
  });
}

function resetChest(chest: ChestArt): void {
  chest.image.scene?.tweens.killTweensOf(chest.image);
  chest.image
    .setTexture(SHOP_CHEST_TEXTURES.closed)
    .setPosition(0, 0)
    .setAlpha(1)
    .setScale(chest.closedScaleX, chest.closedScaleY);
  chest.glow.setScale(1).setAlpha(1).setFillStyle(UI.gold, 0.1);
}

function addRewardHalo(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  y: number,
  color: number
): void {
  const halo = scene.add.container(0, y);
  const outerRing = scene.add
    .circle(0, 0, 92, color, 0.12)
    .setStrokeStyle(4, color, 0.72);
  const innerRing = scene.add
    .circle(0, 0, 68, UI.creamHex, 0.05)
    .setStrokeStyle(2, UI.goldHex, 0.76);
  halo.add([outerRing, innerRing]);
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    halo.add(
      scene.add.star(
        Math.cos(angle) * 82,
        Math.sin(angle) * 82,
        4,
        3,
        9,
        index % 2 === 0 ? UI.goldHex : color,
        0.9
      )
    );
  }
  parent.add(halo);
  if (prefersReducedMotion()) return;
  halo.setScale(0.72).setAlpha(0);
  scene.tweens.add({
    targets: halo,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    angle: 22,
    duration: 520,
    ease: 'Back.easeOut',
  });
  scene.tweens.add({
    targets: [outerRing, innerRing],
    scaleX: 1.08,
    scaleY: 1.08,
    duration: 720,
    delay: 520,
    yoyo: true,
    repeat: 1,
    ease: 'Sine.easeInOut',
  });
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
  addRewardHalo(scene, card, -128, rarityStyle.color);
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
      pull.rarity === 'legendary' ? 42 : pull.rarity === 'epic' ? 40 : 34,
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
  const reduceMotion = prefersReducedMotion();
  const topRarity = highestRarity(pulls);
  const rarityStyle = RARITY_STYLE[topRarity];

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
  const revealProgress = label(
    scene,
    0,
    -194,
    `REVEALING 0/${CAPSULE_MAX_BATCH_SIZE}`,
    17,
    UI.coralText,
    true
  );
  card.add([
    handLettered(scene, 0, -230, '10 REWARDS', 34, UI.ink, true),
    revealProgress,
  ]);

  const columns = 5;
  const tileGap = 8;
  const gridWidth = cardWidth - 42;
  const tileWidth = (gridWidth - tileGap * (columns - 1)) / columns;
  const tiles = pulls.slice(0, CAPSULE_MAX_BATCH_SIZE).map((pull, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const tileX =
      -gridWidth / 2 + tileWidth / 2 + column * (tileWidth + tileGap);
    const tileY = -90 + row * 146;
    const tile = scene.add.container(tileX, tileY);
    const tileRarity = RARITY_STYLE[pull.rarity];
    const glow = scene.add
      .rectangle(0, 0, tileWidth + 8, 140, tileRarity.color, 0.16)
      .setStrokeStyle(2, tileRarity.color, 0.55);
    const paperTile = scene.add
      .rectangle(0, 0, tileWidth, 132, UI.creamHex, 1)
      .setStrokeStyle(4, tileRarity.color, 1);
    tile.add([glow, paperTile]);
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
    tile.setVisible(false);
    card.add(tile);
    return tile;
  });

  let closingPrize = false;
  let revealComplete = false;
  let revealedCount = 0;
  let highRarityCelebrated = false;
  let actionsShown = false;
  const scheduledEvents: Phaser.Time.TimerEvent[] = [];

  const cancelScheduledEvents = (): void => {
    scheduledEvents.splice(0).forEach((event) => event.remove(false));
  };
  revealLayer.once('destroy', cancelScheduledEvents);

  const dismissPrize = (): void => {
    if (closingPrize || !revealComplete || !revealLayer.active) return;
    closingPrize = true;
    cancelScheduledEvents();
    if (reduceMotion) {
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

  const showPrizeActions = (): void => {
    if (actionsShown || !card.active) return;
    actionsShown = true;
    if (options.onViewCollection) {
      const openCollection = (): void => {
        if (closingPrize) return;
        closingPrize = true;
        cancelScheduledEvents();
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
  };

  const revealTile = (index: number): void => {
    if (closingPrize || !revealLayer.active) return;
    const pull = pulls[index];
    const tile = tiles[index];
    if (!pull || !tile || tile.visible) return;
    tile.setVisible(true).setAlpha(1);
    if (reduceMotion) tile.setScale(1).setAngle(0);
    else {
      tile
        .setScale(0.18)
        .setAlpha(0)
        .setAngle(index % 2 === 0 ? -7 : 7);
      scene.tweens.add({
        targets: tile,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        angle: 0,
        duration:
          pull.rarity === 'legendary'
            ? 640
            : pull.rarity === 'epic'
              ? 520
              : 360,
        ease: 'Back.easeOut',
      });
      const burstX = width / 2 + tile.x;
      const burstY = cardCenterY + tile.y;
      if (
        (pull.rarity === 'legendary' || pull.rarity === 'epic') &&
        !highRarityCelebrated
      ) {
        highRarityCelebrated = true;
        rainbowMoment(scene, revealLayer);
      } else if (pull.rarity === 'rare') {
        goldBurst(scene, revealLayer, burstX, burstY);
      }
    }
    revealedCount += 1;
    revealProgress.setText(
      `REVEALED ${revealedCount}/${CAPSULE_MAX_BATCH_SIZE}`
    );
    options.onBatchItemRevealed?.(pull, index, pulls.length);
  };

  const completeReveal = (): void => {
    if (revealComplete || !revealLayer.active) return;
    tiles.forEach((_tile, index) => revealTile(index));
    revealComplete = true;
    revealProgress.setText(
      `${summary.legendary} LEGENDARY · ${summary.epic} EPIC · ${summary.rare} RARE · ${summary.newItems} NEW`
    );
    showPrizeActions();
    options.onBatchRevealComplete?.();
  };

  const revealPlan = planCapsuleBatchReveal(pulls, reduceMotion);
  if (reduceMotion) {
    completeReveal();
    card.setScale(1).setAlpha(1);
  } else {
    card.setScale(0.82).setAlpha(0);
    scene.tweens.add({
      targets: card,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });
    revealPlan.steps.forEach((step) => {
      scheduledEvents.push(
        scene.time.delayedCall(step.delayMs, () => revealTile(step.index))
      );
    });
    scheduledEvents.push(
      scene.time.delayedCall(revealPlan.completionDelayMs, completeReveal)
    );
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
