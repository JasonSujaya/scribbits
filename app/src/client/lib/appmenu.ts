import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { CanvasActionOverlay, CanvasModalOverlay } from './overlay';
import { paperIconButton } from './ui';
import { ghostButton, iconButton, label, startScene, stickerCard } from './ui';
import { UI } from './theme';
import { translate } from './localization';
import { setSfxCue } from './sfx';

export type AppMenu = Readonly<{ destroy: () => void }>;
export type AppMenuOptions = Readonly<{ canNavigate?: () => boolean }>;

const SETTINGS_BUTTON_SIZE = 92;
const SETTINGS_HIT_SIZE = 100;
const SETTINGS_BUTTON_RIGHT_OFFSET = 60;
const SETTINGS_BUTTON_Y = 58;

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
    setSfxCue(scrim, 'ui.close');
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
    width - SETTINGS_BUTTON_RIGHT_OFFSET,
    SETTINGS_BUTTON_Y,
    'settings',
    openMenu,
    SETTINGS_BUTTON_SIZE,
    UI.creamHex,
    UI.gold,
    SETTINGS_BUTTON_SIZE
  ).setDepth(2200);
  const followCamera = (): void => {
    if (!settingsButton.active) return;
    const camera = scene.cameras.main;
    settingsButton.setPosition(
      width - SETTINGS_BUTTON_RIGHT_OFFSET + (camera?.scrollX ?? 0),
      SETTINGS_BUTTON_Y + (camera?.scrollY ?? 0)
    );
  };
  scene.events.on('postupdate', followCamera);
  followCamera();

  settingsControl = actionOverlay.add({
    label: translate('appMenu.openSettings'),
    rect: {
      x: width - SETTINGS_BUTTON_RIGHT_OFFSET - SETTINGS_HIT_SIZE / 2,
      y: SETTINGS_BUTTON_Y - SETTINGS_HIT_SIZE / 2,
      width: SETTINGS_HIT_SIZE,
      height: SETTINGS_HIT_SIZE,
    },
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
