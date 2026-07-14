// The talent-scout leaderboard modal, opened from the clout chip on ArenaHome.
// Fetches /api/clout-board and lists the top scouts plus the caller's rank.

import { Scene } from 'phaser';
import { fetchCloutBoard } from './api';
import { TYPE, UI } from './theme';
import { label, ghostButton, stickerCard, handLettered } from './ui';
import { paperIcon } from './papericons';
import { CanvasModalOverlay } from './overlay';
import type { CloutBoard } from '../../shared/arena';
import { setSfxCue } from './sfx';

const DEPTH = 2000;

export type CloutBoardModalOptions = Readonly<{
  onClose?: () => void;
}>;

export type CloutBoardModal = { destroy: () => void };

export function openCloutBoard(
  scene: Scene,
  options: CloutBoardModalOptions = {}
): CloutBoardModal {
  const { width, height } = scene.scale;
  const layer = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);
  const modalActions = new CanvasModalOverlay(
    scene,
    'Scout ladder',
    () => close(),
    'The top ten scouts ranked by Clout earned from winning Rumble picks.'
  );
  layer.once('destroy', () => modalActions.destroy());
  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.68)
    .setScrollFactor(0)
    .setInteractive();
  setSfxCue(scrim, 'ui.close');
  layer.add(scrim);

  const cardW = Math.min(width - 40, 640);
  const cardH = 900;
  const card = stickerCard(scene, width / 2, height / 2, cardW, cardH, {
    gold: true,
    tapeColor: UI.tape,
  });
  card.setDepth(DEPTH + 1).setScrollFactor(0);
  card.setScale(0.7);
  scene.tweens.add({
    targets: card,
    scale: 1,
    duration: 240,
    ease: 'Back.easeOut',
  });
  layer.add(card);

  const top = -cardH / 2;
  card.add(handLettered(scene, 0, top + 50, 'SCOUT LADDER', 34, UI.ink, true));
  card.add(
    label(
      scene,
      0,
      top + 92,
      'Pick winners. Earn Clout.',
      TYPE.caption,
      UI.inkSoft,
      true
    )
  );
  card.add(
    ghostButton(scene, cardW / 2 - 44, top + 40, '✕', () => close(), 72)
  );
  const nativeClose = modalActions.add({
    label: 'Close Scout ladder',
    rect: {
      x: width / 2 + cardW / 2 - 80,
      y: height / 2 + top + 4,
      width: 72,
      height: 72,
    },
    onActivate: () => close(),
  });
  const liveStatus = modalActions.addStatus('Loading the Scout ladder.');

  const statusLabel = label(
    scene,
    0,
    0,
    'Loading the ladder…',
    TYPE.body,
    UI.inkSoft,
    true
  );
  card.add(statusLabel);

  void fetchCloutBoard().then((result) => {
    if (!scene.scene.isActive() || !layer.active) return;
    statusLabel.destroy();
    if (!result.ok) {
      liveStatus.textContent = result.error;
      card.add(
        label(
          scene,
          0,
          0,
          result.error,
          TYPE.body,
          UI.coralText,
          true
        ).setWordWrapWidth(cardW - 80)
      );
      return;
    }
    liveStatus.textContent = `Scout ladder loaded. Your rank is ${result.data.me.rank} with ${result.data.me.clout} Clout.`;
    renderBoard(result.data);
  });

  function renderBoard(board: CloutBoard): void {
    const listTop = top + 150;
    const rowH = 60;
    const shown = board.top.slice(0, 10);
    if (shown.length === 0) {
      card.add(
        label(
          scene,
          0,
          listTop + 60,
          'No scouts yet —\nbe the first to pick a winner!',
          TYPE.body,
          UI.inkSoft,
          true
        ).setLineSpacing(8)
      );
    }
    shown.forEach((entry, index) => {
      const y = listTop + index * rowH;
      const isMe = entry.username === board.me.username;
      const rowBg = scene.add
        .rectangle(
          0,
          y,
          cardW - 70,
          rowH - 8,
          isMe ? UI.gold : UI.creamHex,
          isMe ? 0.9 : 0.6
        )
        .setStrokeStyle(2, UI.inkHex, isMe ? 1 : 0.4);
      card.add(rowBg);
      card.add(
        label(
          scene,
          -cardW / 2 + 50,
          y,
          `${index + 1}`,
          TYPE.body,
          UI.ink,
          true
        ).setOrigin(0.5)
      );
      card.add(
        label(
          scene,
          -cardW / 2 + 100,
          y,
          `u/${entry.username}`,
          TYPE.body,
          UI.ink,
          isMe
        ).setOrigin(0, 0.5)
      );
      card.add(
        paperIcon(scene, 'trophy', cardW / 2 - 112, y, {
          size: 26,
          fill: UI.gold,
        })
      );
      card.add(
        label(
          scene,
          cardW / 2 - 60,
          y,
          `${entry.clout}`,
          TYPE.body,
          UI.goldText,
          true
        ).setOrigin(1, 0.5)
      );
    });

    // Caller's own standing pinned to the bottom.
    const meY = cardH / 2 - 80;
    card.add(scene.add.rectangle(0, meY - 34, cardW - 70, 2, UI.inkHex, 0.3));
    card.add(
      label(
        scene,
        0,
        meY,
        `YOU #${board.me.rank}  ·  ${board.me.clout} CLOUT`,
        TYPE.title,
        UI.ink,
        true
      )
    );
  }

  scrim.on('pointerup', () => close());
  modalActions.focusInitial(nativeClose);

  function close(): void {
    if (!layer.active) return;
    layer.destroy(true);
    options.onClose?.();
  }

  return { destroy: () => close() };
}

// Format ms-until into a compact "Hh Mm" (or "Mm Ss" in the final minutes).
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'resolving now…';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
