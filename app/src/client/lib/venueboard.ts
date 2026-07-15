import { Scene } from 'phaser';
import type { VenueBoard } from '../../shared/arena';
import { fetchVenueBoard } from './api';
import { battleArenaPaint } from './battlearenapresentation';
import { CanvasModalOverlay } from './overlay';
import { TYPE, UI } from './theme';
import { ghostButton, handLettered, label, stickerCard } from './ui';
import { setSfxCue } from './sfx';

const DEPTH = 2300;

export type VenueBoardModal = Readonly<{ destroy: () => void }>;

export type VenueBoardModalOptions = Readonly<{
  onClose?: () => void;
}>;

export const formatVenueClearTime = (milliseconds: number): string =>
  `${(milliseconds / 1000).toFixed(2)}S`;

const standingSummary = (board: VenueBoard): string => {
  if (!board.me) return 'Clear today’s venue goal to enter the ranking.';
  return `Your daily venue rank is ${board.me.rank} with a clear time of ${formatVenueClearTime(board.me.clearMilliseconds)}.`;
};

export function openVenueBoard(
  scene: Scene,
  options: VenueBoardModalOptions = {}
): VenueBoardModal {
  const { width, height } = scene.scale;
  const layer = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);
  let close = (): void => {};
  const modalActions = new CanvasModalOverlay(
    scene,
    'Daily venue ranking',
    () => close(),
    'The fastest players to clear today’s rotating Arena challenge.'
  );
  layer.once('destroy', () => modalActions.destroy());

  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.68)
    .setScrollFactor(0)
    .setInteractive();
  setSfxCue(scrim, 'ui.close');
  layer.add(scrim);

  const cardWidth = Math.min(width - 44, 640);
  const cardHeight = Math.min(height - 80, 1020);
  const card = stickerCard(
    scene,
    width / 2,
    height / 2,
    cardWidth,
    cardHeight,
    { tapeColor: UI.tapeAlt }
  )
    .setDepth(DEPTH + 1)
    .setScrollFactor(0)
    .setScale(0.7);
  layer.add(card);
  scene.tweens.add({
    targets: card,
    scale: 1,
    duration: 220,
    ease: 'Back.easeOut',
  });

  const cardTop = -cardHeight / 2;
  card.add(
    handLettered(scene, 0, cardTop + 56, 'DAILY RANKING', 36, UI.ink, true)
  );
  card.add(
    ghostButton(scene, cardWidth / 2 - 46, cardTop + 42, '✕', () => close(), 72)
  );
  const nativeClose = modalActions.add({
    label: 'Close daily venue ranking',
    rect: {
      x: width / 2 + cardWidth / 2 - 82,
      y: height / 2 + cardTop + 6,
      width: 72,
      height: 72,
    },
    onActivate: () => close(),
  });
  const liveStatus = modalActions.addStatus('Loading daily venue ranking.');
  const loading = label(
    scene,
    0,
    0,
    'Loading today’s clears…',
    TYPE.body,
    UI.inkSoft,
    true
  );
  card.add(loading);

  const renderBoard = (board: VenueBoard): void => {
    const accent = battleArenaPaint(board.arenaId).accent;
    card.add(
      label(
        scene,
        0,
        cardTop + 108,
        board.arenaName.toUpperCase(),
        TYPE.title,
        UI.ink,
        true
      ).setWordWrapWidth(cardWidth - 110)
    );
    card.add(
      label(
        scene,
        0,
        cardTop + 147,
        `${board.challengeLabel.toUpperCase()} · ${board.clearCount} CLEARED`,
        TYPE.caption,
        UI.inkSoft,
        true
      ).setWordWrapWidth(cardWidth - 90)
    );

    const listTop = cardTop + 215;
    const availableListHeight = cardHeight - 340;
    const rowHeight = Math.max(48, Math.min(64, availableListHeight / 10));
    if (board.top.length === 0) {
      card.add(
        label(
          scene,
          0,
          listTop + 70,
          'No clears yet.\nBe the first to stamp today’s venue.',
          TYPE.body,
          UI.inkSoft,
          true
        ).setLineSpacing(7)
      );
    }
    board.top.slice(0, 10).forEach((entry, index) => {
      const rowY = listTop + index * rowHeight;
      const isMe = board.me?.rank === entry.rank;
      card.add(
        scene.add
          .rectangle(
            0,
            rowY,
            cardWidth - 70,
            rowHeight - 7,
            isMe ? accent : UI.creamHex,
            isMe ? 0.7 : 0.58
          )
          .setStrokeStyle(2, UI.inkHex, isMe ? 1 : 0.35)
      );
      card.add(
        label(
          scene,
          -cardWidth / 2 + 50,
          rowY,
          `#${entry.rank}`,
          TYPE.body,
          UI.ink,
          true
        )
      );
      card.add(
        label(
          scene,
          -cardWidth / 2 + 100,
          rowY,
          `u/${entry.username}`,
          TYPE.body,
          UI.ink,
          isMe
        )
          .setOrigin(0, 0.5)
          .setWordWrapWidth(cardWidth - 285)
      );
      card.add(
        label(
          scene,
          cardWidth / 2 - 52,
          rowY,
          formatVenueClearTime(entry.clearMilliseconds),
          TYPE.body,
          UI.goldText,
          true
        ).setOrigin(1, 0.5)
      );
    });

    const standingY = cardHeight / 2 - 62;
    card.add(
      scene.add.rectangle(0, standingY - 34, cardWidth - 70, 2, UI.inkHex, 0.3)
    );
    card.add(
      label(
        scene,
        0,
        standingY,
        board.me
          ? `YOU #${board.me.rank} · ${formatVenueClearTime(board.me.clearMilliseconds)}`
          : 'CLEAR THE GOAL TO RANK',
        TYPE.title,
        UI.ink,
        true
      )
    );
  };

  void fetchVenueBoard().then((result) => {
    if (!scene.scene.isActive() || !layer.active) return;
    loading.destroy();
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
        ).setWordWrapWidth(cardWidth - 90)
      );
      return;
    }
    liveStatus.textContent = `Daily venue ranking loaded. ${standingSummary(result.data)}`;
    renderBoard(result.data);
  });

  close = (): void => {
    if (!layer.active) return;
    layer.destroy(true);
    options.onClose?.();
  };
  scrim.on('pointerup', () => close());
  modalActions.focusInitial(nativeClose);
  return { destroy: () => close() };
}
