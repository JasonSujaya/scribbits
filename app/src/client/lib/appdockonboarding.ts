import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { FirstBattleShopOnboardingPlan } from './firstbattleshoponboarding';
import { CanvasActionOverlay } from './overlay';
import { paperDockIcon } from './papericons';
import { bindPressInteractionEvents } from './pressinteraction';
import { playSfx } from './sfx';
import { label, paperCard } from './ui';
import { prefersReducedMotion, UI } from './theme';

const DOCK_TAB_COUNT = 5;
const DOCK_BAR_HORIZONTAL_MARGIN = 28;
const DOCK_BAR_HEIGHT = 124;
const DOCK_BOTTOM_INSET = 8;

function guideCard(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Container {
  const card = scene.add.container();
  const shadow = scene.add
    .rectangle(x + 6, y + 8, width, height, 0x5f4027, 0.3)
    .setStrokeStyle(3, UI.inkHex, 0.12);
  const face = paperCard(scene, x, y, width, height);
  const tape = scene.add
    .rectangle(x, y - height / 2 + 2, 82, 24, UI.tape, 0.8)
    .setAngle(-3);
  card.add([shadow, face, tape]);
  return card;
}

function shopSpotlight(
  scene: Scene,
  shopX: number
): Phaser.GameObjects.Container {
  const spotlight = scene.add.container(shopX, 0);
  const ring = scene.add.graphics();
  ring.lineStyle(7, UI.coral, 0.9);
  ring.strokeEllipse(0, 0, 114, 108);
  ring.lineStyle(3, UI.creamHex, 0.95);
  ring.strokeEllipse(0, 0, 101, 96);
  spotlight.add(ring);
  return spotlight;
}

function downArrow(
  scene: Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const arrow = scene.add.container(x, y);
  const shadow = scene.add.graphics().setPosition(3, 5);
  shadow.fillStyle(UI.inkHex, 0.24);
  shadow.fillRoundedRect(-8, -26, 16, 34, 6);
  shadow.fillTriangle(-22, 4, 22, 4, 0, 30);
  const face = scene.add.graphics();
  face.fillStyle(UI.coral, 1);
  face.fillRoundedRect(-8, -26, 16, 34, 6);
  face.fillTriangle(-22, 4, 22, 4, 0, 30);
  face.lineStyle(3, UI.inkHex, 0.9);
  face.strokeRoundedRect(-8, -26, 16, 34, 6);
  face.strokeTriangle(-22, 4, 22, 4, 0, 30);
  arrow.add([shadow, face]);
  return arrow;
}

function createRecommendation(
  scene: Scene,
  dock: Phaser.GameObjects.Container,
  shopX: number,
  plan: FirstBattleShopOnboardingPlan,
  onShop: () => void
): void {
  if (!dock.active) return;

  const recommendation = scene.add.container().setName('first-shop-guide');
  const cardX = shopX - 104;
  const cardY = -150;
  const cardWidth = 188;
  const cardHeight = 62;
  const card = guideCard(scene, cardX, cardY, cardWidth, cardHeight);
  const callToAction = label(
    scene,
    cardX,
    cardY + 2,
    plan.recommendationLabel,
    23,
    UI.ink,
    true
  );
  const arrow = downArrow(scene, shopX, -82);
  const spotlight = shopSpotlight(scene, shopX);
  const hitX = shopX - 62;
  const hitY = -70;
  const hitWidth = 250;
  const hitHeight = 180;
  const hit = scene.add
    .rectangle(hitX, hitY, hitWidth, hitHeight, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  recommendation.add([card, callToAction, arrow, spotlight, hit]);
  dock.add(recommendation);

  const openShop = (): void => {
    playSfx('ui.tab');
    onShop();
  };
  const actionOverlay = new CanvasActionOverlay(scene);
  const dockCenterY =
    scene.scale.height - DOCK_BOTTOM_INSET - DOCK_BAR_HEIGHT / 2;
  actionOverlay.add({
    label: plan.recommendationAccessibleLabel,
    rect: {
      x: scene.scale.width / 2 + hitX - hitWidth / 2,
      y: dockCenterY + hitY - hitHeight / 2,
      width: hitWidth,
      height: hitHeight,
    },
    attributes: { 'data-first-shop-guide': 'true' },
    pointerPassthrough: true,
    onActivate: openShop,
  });
  recommendation.once('destroy', () => actionOverlay.destroy());

  bindPressInteractionEvents(
    hit,
    {
      press: () => card.setScale(0.98),
      release: () => card.setScale(1),
      activate: openShop,
      pressOnHover: false,
    },
    { gameTarget: scene.input, shutdownTarget: scene.events }
  );

  scene.game.canvas.dataset.firstBattleShopGuide = 'ready';
  if (prefersReducedMotion()) return;
  scene.tweens.add({
    targets: arrow,
    y: { from: -88, to: -76 },
    duration: 520,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
  scene.tweens.add({
    targets: spotlight,
    scale: { from: 0.96, to: 1.06 },
    alpha: { from: 0.72, to: 1 },
    duration: 760,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
}

export function showFirstBattleShopOnboarding(
  scene: Scene,
  dock: Phaser.GameObjects.Container,
  plan: FirstBattleShopOnboardingPlan,
  onShop: () => void,
  revealUnlock: boolean
): void {
  const barWidth = scene.scale.width - DOCK_BAR_HORIZONTAL_MARGIN;
  const shopX = (barWidth / DOCK_TAB_COUNT) * 2;
  if (!revealUnlock) {
    createRecommendation(scene, dock, shopX, plan, onShop);
    return;
  }

  scene.game.canvas.dataset.firstBattleShopGuide = 'unlocking';
  const reducedMotion = prefersReducedMotion();
  const reveal = scene.add.container().setName('first-shop-unlock');
  const cardY = -440;
  const card = guideCard(scene, 0, cardY, 520, 116);
  const icon = paperDockIcon(scene, 'shop', -190, cardY, 62, UI.inkHex, true);
  const unlockTitle = label(
    scene,
    30,
    cardY - 24,
    plan.unlockLabel,
    32,
    UI.coralText,
    true
  );
  const unlockDetail = label(
    scene,
    30,
    cardY + 25,
    plan.unlockDetail,
    20,
    UI.inkSoft,
    true
  );
  const spotlight = shopSpotlight(scene, shopX);
  reveal.add([card, icon, unlockTitle, unlockDetail, spotlight]);
  dock.add(reveal);

  const showRecommendation = (): void => {
    if (!dock.active) return;
    reveal.destroy(true);
    createRecommendation(scene, dock, shopX, plan, onShop);
  };
  if (reducedMotion) {
    scene.time.delayedCall(1_200, showRecommendation);
    return;
  }

  card.setScale(0.9);
  reveal.setAlpha(0);
  spotlight.setScale(0.75);
  scene.tweens.add({
    targets: reveal,
    alpha: 1,
    duration: 180,
    ease: 'Cubic.easeOut',
  });
  scene.tweens.add({
    targets: card,
    scale: 1,
    duration: 320,
    ease: 'Back.easeOut',
  });
  scene.tweens.add({
    targets: spotlight,
    scale: 1,
    duration: 360,
    ease: 'Back.easeOut',
  });
  scene.time.delayedCall(2_000, () => {
    if (!reveal.active) return;
    scene.tweens.add({
      targets: reveal,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeIn',
      onComplete: showRecommendation,
    });
  });
}
