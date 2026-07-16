import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { context as devvitContext } from '@devvit/web/client';
import { CanvasActionOverlay, CanvasModalOverlay } from './overlay';
import {
  openFighterGuidePopup,
  type FighterGuidePopup,
} from './fighterguidepopup';
import { openPrivacyPopup, type PrivacyPopup } from './privacypopup';
import { openFeedbackPopup, type FeedbackPopup } from './feedbackpopup';
import { paperIconButton } from './ui';
import { ghostButton, iconButton, label, startScene, stickerCard } from './ui';
import { UI } from './theme';
import { translate } from './localization';
import { setSfxCue } from './sfx';
import type { SubmitFeedbackResponse } from '../../shared/feedback';

export type AppMenu = Readonly<{ destroy: () => void }>;
export type AppMenuOptions = Readonly<{
  canNavigate?: () => boolean;
  onFeedbackSubmitted?: (response: SubmitFeedbackResponse) => void;
  back?: Readonly<{
    label: string;
    onActivate: () => void;
  }>;
}>;

const SETTINGS_BUTTON_SIZE = 92;
const SETTINGS_HIT_SIZE = 100;
const SETTINGS_BUTTON_RIGHT_OFFSET = 60;
const SETTINGS_BUTTON_Y = 58;
const BACK_BUTTON_LEFT_OFFSET = 60;

/** Shared top chrome for Settings and an optional scene-level back action. */
export function appMenu(scene: Scene, options: AppMenuOptions = {}): AppMenu {
  const { width, height } = scene.scale;
  const actionOverlay = new CanvasActionOverlay(scene, 'app-menu');
  let modalOverlay: CanvasModalOverlay | null = null;
  let menuLayer: Phaser.GameObjects.Container | null = null;
  let fieldGuidePopup: FighterGuidePopup | null = null;
  let privacyPopup: PrivacyPopup | null = null;
  let feedbackPopup: FeedbackPopup | null = null;

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
    const appVersion = devvitContext?.appVersion?.trim() || 'LOCAL';
    menuLayer = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0);
    const scrim = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.62)
      .setInteractive();
    setSfxCue(scrim, 'ui.close');
    const card = stickerCard(scene, width / 2, centerY, width - 120, 640, {
      tapeColor: UI.tapeAlt,
      tilt: -0.4,
    });
    const title = label(
      scene,
      width / 2,
      centerY - 260,
      translate('appMenu.title'),
      40,
      UI.ink,
      true
    );
    const guideButton = iconButton(
      scene,
      width / 2,
      centerY - 125,
      'info',
      translate('appMenu.fieldGuide'),
      () => openFieldGuide(),
      width - 220,
      UI.tapeAlt
    );
    const accountButton = iconButton(
      scene,
      width / 2,
      centerY - 5,
      'shield',
      translate('appMenu.account'),
      () => openPrivacy(),
      width - 220,
      UI.tapeAlt
    );
    const feedbackButton = iconButton(
      scene,
      width / 2,
      centerY + 115,
      'pencil',
      translate('appMenu.feedback'),
      () => openFeedback(),
      width - 220,
      UI.tapeAlt
    );
    const closeButton = ghostButton(
      scene,
      width / 2,
      centerY + 255,
      translate('appMenu.close'),
      closeMenu,
      220
    );
    const versionLabel = label(
      scene,
      width / 2,
      centerY - 212,
      translate('appMenu.version', { version: appVersion }),
      20,
      UI.inkSoft
    );
    menuLayer.add([
      scrim,
      card,
      title,
      guideButton,
      accountButton,
      feedbackButton,
      closeButton,
      versionLabel,
    ]);
    scrim.on('pointerup', closeMenu);

    modalOverlay = new CanvasModalOverlay(
      scene,
      translate('appMenu.modalTitle'),
      closeMenu,
      translate('appMenu.modalDescription', { version: appVersion }),
      settingsControl
    );
    const guideControl = modalOverlay.add({
      label: translate('appMenu.openFieldGuide'),
      rect: {
        x: 110,
        y: centerY - 175,
        width: width - 220,
        height: 100,
      },
      onActivate: openFieldGuide,
    });
    modalOverlay.add({
      label: translate('appMenu.openAccount'),
      rect: {
        x: 110,
        y: centerY - 55,
        width: width - 220,
        height: 100,
      },
      onActivate: openPrivacy,
    });
    modalOverlay.add({
      label: translate('appMenu.openFeedback'),
      rect: {
        x: 110,
        y: centerY + 65,
        width: width - 220,
        height: 100,
      },
      onActivate: openFeedback,
    });
    modalOverlay.add({
      label: translate('appMenu.closeSettings'),
      rect: {
        x: width / 2 - 110,
        y: centerY + 205,
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
    if (fieldGuidePopup) return;
    fieldGuidePopup = openFighterGuidePopup(
      scene,
      () => startScene(scene, 'Bestiary'),
      () => {
        fieldGuidePopup = null;
      }
    );
  };

  const openPrivacy = (): void => {
    if (options.canNavigate?.() === false) {
      closeMenu();
      return;
    }
    closeMenu();
    if (privacyPopup) return;
    privacyPopup = openPrivacyPopup(scene, () => {
      privacyPopup = null;
    });
  };

  const openFeedback = (): void => {
    if (options.canNavigate?.() === false) {
      closeMenu();
      return;
    }
    closeMenu();
    if (feedbackPopup) return;
    feedbackPopup = openFeedbackPopup(
      scene,
      () => {
        feedbackPopup = null;
      },
      settingsControl,
      options.onFeedbackSubmitted
    );
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
  const backButton = options.back
    ? paperIconButton(
        scene,
        BACK_BUTTON_LEFT_OFFSET,
        SETTINGS_BUTTON_Y,
        'back',
        options.back.onActivate,
        SETTINGS_BUTTON_SIZE,
        UI.creamHex,
        UI.coral,
        SETTINGS_BUTTON_SIZE,
        { iconOffsetX: 0 }
      ).setDepth(2200)
    : null;
  const followCamera = (): void => {
    if (!settingsButton.active) return;
    const camera = scene.cameras.main;
    const scrollX = camera?.scrollX ?? 0;
    const scrollY = camera?.scrollY ?? 0;
    settingsButton.setPosition(
      width - SETTINGS_BUTTON_RIGHT_OFFSET + scrollX,
      SETTINGS_BUTTON_Y + scrollY
    );
    backButton?.setPosition(
      BACK_BUTTON_LEFT_OFFSET + scrollX,
      SETTINGS_BUTTON_Y + scrollY
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
  if (options.back) {
    actionOverlay.add({
      label: options.back.label,
      rect: {
        x: BACK_BUTTON_LEFT_OFFSET - SETTINGS_HIT_SIZE / 2,
        y: SETTINGS_BUTTON_Y - SETTINGS_HIT_SIZE / 2,
        width: SETTINGS_HIT_SIZE,
        height: SETTINGS_HIT_SIZE,
      },
      pointerPassthrough: true,
      onActivate: options.back.onActivate,
    });
  }

  let destroyed = false;
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    scene.events.off('postupdate', followCamera);
    closeMenu();
    fieldGuidePopup?.destroy();
    privacyPopup?.destroy();
    feedbackPopup?.destroy();
    actionOverlay.destroy();
    settingsButton.destroy(true);
    backButton?.destroy(true);
  };
  scene.events.once('shutdown', destroy);
  return { destroy };
}
