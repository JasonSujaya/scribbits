import { showToast } from '@devvit/web/client';
import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import { deleteMyData } from './api';
import { CanvasModalOverlay } from './overlay';
import { paperIcon } from './papericons';
import { TYPE, UI } from './theme';
import {
  ghostButton,
  handLettered,
  iconButton,
  label,
  stickerCard,
} from './ui';

export type PrivacyPopup = Readonly<{ destroy: () => void }>;

export function openPrivacyPopup(
  scene: Scene,
  onClose: () => void
): PrivacyPopup {
  const { width, height } = scene.scale;
  const centerY = Math.min(height / 2, 610);
  const popupLayer = scene.add
    .container(0, 0)
    .setDepth(3200)
    .setScrollFactor(0);
  let popupOverlay: CanvasModalOverlay | null = null;
  let deleteControl: HTMLButtonElement | null = null;
  let closeControl: HTMLButtonElement | null = null;
  let status: HTMLElement | null = null;
  let deletionArmed = false;
  let deletingData = false;
  let destroyed = false;

  const destroy = (): void => {
    if (destroyed || deletingData) return;
    destroyed = true;
    popupOverlay?.destroy();
    popupOverlay = null;
    popupLayer.destroy(true);
    onClose();
  };

  const addScrimAndCard = (): void => {
    const scrim = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.72)
      .setInteractive();
    scrim.on('pointerup', destroy);
    const card = stickerCard(scene, width / 2, centerY, width - 80, 820, {
      tapeColor: UI.tapeAlt,
      tapeWidth: 94,
      tilt: -0.2,
    });
    const cardBlocker = scene.add
      .rectangle(0, 0, width - 80, 820, 0xffffff, 0.001)
      .setInteractive();
    cardBlocker.on(
      'pointerup',
      (
        _pointer: unknown,
        _localX: unknown,
        _localY: unknown,
        event: Phaser.Types.Input.EventData
      ) => event.stopPropagation?.()
    );
    card.addAt(cardBlocker, 0);
    popupLayer.add([scrim, card]);
  };

  const renderDeleted = (removedScribbits: number): void => {
    popupOverlay?.destroy();
    popupOverlay = new CanvasModalOverlay(
      scene,
      'Data deleted',
      destroy,
      'Your stored Scribbits game profile was permanently deleted.'
    );
    popupLayer.removeAll(true);
    addScrimAndCard();
    popupLayer.add([
      handLettered(
        scene,
        width / 2,
        centerY - 150,
        'DATA DELETED',
        52,
        UI.ink,
        true
      ),
      label(
        scene,
        width / 2,
        centerY + 20,
        `${removedScribbits} Scribbit${removedScribbits === 1 ? '' : 's'} and your stored game profile were removed. Playing again starts a new profile.`,
        TYPE.body,
        UI.ink,
        true
      )
        .setWordWrapWidth(width - 170)
        .setLineSpacing(7),
      ghostButton(scene, width / 2, centerY + 220, 'CLOSE', destroy, 240),
    ]);
    closeControl = popupOverlay.add({
      label: 'Close data deletion confirmation',
      rect: {
        x: width / 2 - 120,
        y: centerY + 170,
        width: 240,
        height: 100,
      },
      onActivate: destroy,
    });
    popupOverlay.focusInitial(closeControl);
  };

  const deleteStoredPlayerData = (): void => {
    if (deletingData || destroyed) return;
    if (!deletionArmed) {
      deletionArmed = true;
      if (status) {
        status.textContent =
          'Deletion is permanent. Activate Delete again to confirm.';
      }
      showToast('Tap Delete all my stored game data again to confirm.');
      return;
    }

    deletingData = true;
    closeControl?.focus();
    if (deleteControl) deleteControl.disabled = true;
    closeControl?.setAttribute('aria-disabled', 'true');
    if (status) status.textContent = 'Deleting all stored game data.';

    void deleteMyData()
      .then((result) => {
        if (destroyed || !scene.scene.isActive()) return;
        deletingData = false;
        if (!result.ok) {
          deletionArmed = false;
          closeControl?.removeAttribute('aria-disabled');
          if (deleteControl) deleteControl.disabled = false;
          if (status) status.textContent = result.error;
          showToast(result.error);
          return;
        }
        renderDeleted(result.data.removedScribbits);
      })
      .catch(() => {
        if (destroyed || !scene.scene.isActive()) return;
        deletingData = false;
        deletionArmed = false;
        closeControl?.removeAttribute('aria-disabled');
        if (deleteControl) deleteControl.disabled = false;
        if (status) {
          status.textContent = 'Could not delete stored game data. Try again.';
        }
        showToast('Could not delete stored game data. Try again.');
      });
  };

  addScrimAndCard();
  popupLayer.add([
    label(scene, width / 2, centerY - 330, 'ACCOUNT', 36, UI.ink, true),
    paperIcon(scene, 'shield', width / 2, centerY - 205, {
      size: 72,
      fill: UI.tapeAlt,
    }),
    label(
      scene,
      width / 2,
      centerY - 65,
      'Scribbits stores your Reddit identity, drawings, battles, inventory, streak, and scores only to run the game. Report any player card; delete your own from its card.',
      21,
      UI.ink,
      false
    )
      .setWordWrapWidth(width - 170)
      .setLineSpacing(6),
    iconButton(
      scene,
      width / 2,
      centerY + 190,
      'trash',
      'DELETE MY DATA',
      deleteStoredPlayerData,
      width - 180
    ),
    label(
      scene,
      width / 2,
      centerY + 265,
      'Two taps · permanent',
      17,
      UI.coralText,
      true
    ),
    ghostButton(scene, width - 92, centerY - 350, '×', destroy, 88),
  ]);

  popupOverlay = new CanvasModalOverlay(
    scene,
    'Account',
    destroy,
    'Review stored game data or permanently delete your Scribbits profile.'
  );
  closeControl = popupOverlay.add({
    label: 'Close Account',
    rect: { x: width - 136, y: centerY - 394, width: 88, height: 88 },
    onActivate: destroy,
  });
  deleteControl = popupOverlay.add({
    label: 'Delete all my stored game data',
    attributes: { 'data-sfx-cue': 'ui.primary' },
    pointerPassthrough: true,
    rect: {
      x: 90,
      y: centerY + 140,
      width: width - 180,
      height: 100,
    },
    onActivate: deleteStoredPlayerData,
  });
  status = popupOverlay.addStatus();
  popupOverlay.focusInitial(closeControl);

  return { destroy };
}
