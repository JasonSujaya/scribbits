import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { CanvasActionOverlay, CanvasModalOverlay } from './overlay';
import { paperIconButton } from './ui';
import { ghostButton, iconButton, label, startScene, stickerCard } from './ui';
import { UI } from './theme';
import { translate } from './localization';

export type AppMenu = Readonly<{ destroy: () => void }>;
export type AppMenuOptions = Readonly<{ canNavigate?: () => boolean }>;

/** Top-right home for Settings actions that do not belong in the dock. */
export function appMenu(scene: Scene, options: AppMenuOptions = {}): AppMenu {
  const { width, height } = scene.scale;
  const actionOverlay = new CanvasActionOverlay(scene, 'app-menu');
  let modalOverlay: CanvasModalOverlay | null = null;
  let menuLayer: Phaser.GameObjects.Container | null = null;

  const closeMenu = (): void => {
    modalOverlay?.destroy();
    modalOverlay = null;
    menuLayer?.destroy(true);
    menuLayer = null;
  };

  let settingsControl: HTMLButtonElement | null = null;
  const openMenu = (): void => {
    if (menuLayer) return;
    const centerY = Math.min(height / 2, 560);
    menuLayer = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0);
    const scrim = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.62)
      .setInteractive();
    const card = stickerCard(scene, width / 2, centerY, width - 120, 360, {
      tapeColor: UI.tapeAlt,
      tilt: -0.4,
    });
    const title = label(
      scene,
      width / 2,
      centerY - 104,
      translate('appMenu.title'),
      40,
      UI.ink,
      true
    );
    const guideButton = iconButton(
      scene,
      width / 2,
      centerY,
      'info',
      translate('appMenu.fieldGuide'),
      () => openFieldGuide(),
      width - 220,
      UI.tapeAlt
    );
    const closeButton = ghostButton(
      scene,
      width / 2,
      centerY + 114,
      translate('appMenu.close'),
      closeMenu,
      220
    );
    menuLayer.add([scrim, card, title, guideButton, closeButton]);
    scrim.on('pointerup', closeMenu);

    modalOverlay = new CanvasModalOverlay(
      scene,
      translate('appMenu.modalTitle'),
      closeMenu,
      translate('appMenu.modalDescription'),
      settingsControl
    );
    const guideControl = modalOverlay.add({
      label: translate('appMenu.openFieldGuide'),
      rect: {
        x: 110,
        y: centerY - 50,
        width: width - 220,
        height: 100,
      },
      onActivate: openFieldGuide,
    });
    modalOverlay.add({
      label: translate('appMenu.closeSettings'),
      rect: {
        x: width / 2 - 110,
        y: centerY + 64,
        width: 220,
        height: 100,
      },
      onActivate: closeMenu,
    });
    modalOverlay.focusInitial(guideControl);
  };

  const openFieldGuide = (): void => {
    if (options.canNavigate?.() === false) {
      closeMenu();
      return;
    }
    closeMenu();
    startScene(scene, 'Bestiary');
  };

  const settingsButton = paperIconButton(
    scene,
    width - 60,
    58,
    'settings',
    openMenu,
    92,
    UI.creamHex,
    UI.gold,
    92
  ).setDepth(2200);
  settingsButton.add(
    label(scene, 0, 62, translate('appMenu.title'), 20, UI.ink, true)
  );
  const camera = scene.cameras.main;
  const followCamera = (): void => {
    if (!settingsButton.active) return;
    settingsButton.setPosition(
      width - 60 + camera.scrollX,
      58 + camera.scrollY
    );
  };
  scene.events.on('postupdate', followCamera);
  followCamera();

  settingsControl = actionOverlay.add({
    label: translate('appMenu.openSettings'),
    rect: { x: width - 106, y: 12, width: 92, height: 124 },
    pointerPassthrough: true,
    onActivate: openMenu,
  });

  let destroyed = false;
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    scene.events.off('postupdate', followCamera);
    closeMenu();
    actionOverlay.destroy();
    settingsButton.destroy(true);
  };
  scene.events.once('shutdown', destroy);
  return { destroy };
}
