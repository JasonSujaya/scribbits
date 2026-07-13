import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { CanvasModalOverlay } from './overlay';
import { UI } from './theme';
import { stickerCard } from './ui';

export type StickerModalShell = Readonly<{
  container: Phaser.GameObjects.Container;
  shade: Phaser.GameObjects.Rectangle;
  card: Phaser.GameObjects.Container;
  actions: CanvasModalOverlay;
  isDestroyed: () => boolean;
  isInputReady: () => boolean;
  open: (onReady?: () => void) => void;
  finish: (callback: () => void) => boolean;
  destroy: () => void;
}>;

export type StickerModalShellOptions = Readonly<{
  scene: Scene;
  title: string;
  description: string;
  onRequestClose: () => void;
  trigger?: HTMLElement | null | undefined;
  depth: number;
  cardCenterY: number;
  cardWidth: number;
  cardHeight: number;
  shadeAlpha: number;
  tapeWidth: number;
  openingDurationMilliseconds: number;
  blockCard?: boolean;
  onDestroy?: () => void;
}>;

export function createStickerModalShell(
  options: StickerModalShellOptions
): StickerModalShell {
  const { scene } = options;
  const { width, height } = scene.scale;
  const cardCenterX = width / 2;
  let destroyed = false;
  let inputReady = false;
  let opened = false;
  let openingTween: Phaser.Tweens.Tween | null = null;

  const actions = new CanvasModalOverlay(
    scene,
    options.title,
    options.onRequestClose,
    options.description,
    options.trigger
  );
  actions.setVisible(false);

  const container = scene.add
    .container(0, 0)
    .setDepth(options.depth)
    .setScrollFactor(0);
  const shade = scene.add
    .rectangle(
      width / 2,
      height / 2,
      width,
      height,
      UI.inkHex,
      options.shadeAlpha
    )
    .setScrollFactor(0)
    .setInteractive();
  container.add(shade);

  if (options.blockCard) {
    const cardBlocker = scene.add
      .rectangle(
        cardCenterX,
        options.cardCenterY,
        options.cardWidth,
        options.cardHeight,
        0xffffff,
        0.001
      )
      .setScrollFactor(0)
      .setInteractive();
    container.add(cardBlocker);
  }

  const card = stickerCard(
    scene,
    cardCenterX,
    options.cardCenterY,
    options.cardWidth,
    options.cardHeight,
    { tapeColor: UI.tapeAlt, tapeWidth: options.tapeWidth }
  )
    .setScrollFactor(0)
    .setAlpha(0)
    .setScale(0.84);
  container.add(card);

  function handleSceneShutdown(): void {
    destroy();
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    inputReady = false;
    openingTween?.stop();
    openingTween = null;
    actions.destroy();
    scene.events.off('shutdown', handleSceneShutdown);
    container.destroy(true);
    options.onDestroy?.();
  }

  function open(onReady?: () => void): void {
    if (opened || destroyed) return;
    opened = true;
    scene.events.once('shutdown', handleSceneShutdown);
    openingTween = scene.tweens.add({
      targets: card,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: options.openingDurationMilliseconds,
      ease: 'Back.easeOut',
      onComplete: () => {
        openingTween = null;
        if (destroyed) return;
        inputReady = true;
        actions.setVisible(true);
        onReady?.();
      },
    });
  }

  function finish(callback: () => void): boolean {
    if (!inputReady || destroyed) return false;
    destroy();
    callback();
    return true;
  }

  return Object.freeze({
    container,
    shade,
    card,
    actions,
    isDestroyed: () => destroyed,
    isInputReady: () => inputReady && !destroyed,
    open,
    finish,
    destroy,
  });
}
