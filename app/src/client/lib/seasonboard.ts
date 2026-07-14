import { Scene } from 'phaser';
import type { SeasonBoard, SeasonBoardEntry } from '../../shared/arena';
import { fetchSeasonBoard } from './api';
import { CanvasModalOverlay } from './overlay';
import { paperIcon } from './papericons';
import { TYPE, UI } from './theme';
import { ghostButton, handLettered, label, stickerCard } from './ui';

const DEPTH = 2300;

export type SeasonBoardModal = Readonly<{ destroy: () => void }>;

export type SeasonBoardModalOptions = Readonly<{
  onClose?: () => void;
}>;

const rewardLabel = (entry: SeasonBoardEntry): string => {
  if (entry.rewardTier === 'champion') return 'CHAMPION';
  if (entry.rewardTier === 'top-ten') return 'FINALIST';
  if (entry.rewardTier === 'top-hundred') return 'CONTENDER';
  return '';
};

const standingSummary = (board: SeasonBoard): string => {
  const standing = board.me;
  if (!standing || standing.rank <= 0) return 'You are not ranked yet.';
  return `Your season rank is ${standing.rank} with ${standing.score} points.`;
};

export function openSeasonBoard(
  scene: Scene,
  options: SeasonBoardModalOptions = {}
): SeasonBoardModal {
  const { width, height } = scene.scale;
  const layer = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);
  let close = (): void => {};
  const modalActions = new CanvasModalOverlay(
    scene,
    'Season ranking',
    () => close(),
    'The current sixty-day Scribbits campaign ranking.'
  );
  layer.once('destroy', () => modalActions.destroy());

  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.68)
    .setScrollFactor(0)
    .setInteractive();
  layer.add(scrim);

  const cardWidth = Math.min(width - 44, 640);
  const cardHeight = Math.min(height - 80, 1020);
  const card = stickerCard(
    scene,
    width / 2,
    height / 2,
    cardWidth,
    cardHeight,
    { gold: true, tapeColor: UI.tapeAlt }
  );
  card
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
    handLettered(scene, 0, cardTop + 56, 'SEASON RANKING', 36, UI.ink, true)
  );
  card.add(
    ghostButton(scene, cardWidth / 2 - 46, cardTop + 42, '✕', () => close(), 72)
  );
  const nativeClose = modalActions.add({
    label: 'Close season ranking',
    rect: {
      x: width / 2 + cardWidth / 2 - 82,
      y: height / 2 + cardTop + 6,
      width: 72,
      height: 72,
    },
    onActivate: () => close(),
  });
  const liveStatus = modalActions.addStatus('Loading season ranking.');
  const loading = label(
    scene,
    0,
    0,
    'Loading the season…',
    TYPE.body,
    UI.inkSoft,
    true
  );
  card.add(loading);

  const renderBoard = (board: SeasonBoard): void => {
    const season = board.season;
    card.add(
      label(
        scene,
        0,
        cardTop + 106,
        `${season.name.toUpperCase()} · ${season.campaignName.toUpperCase()}`,
        TYPE.title,
        UI.ink,
        true
      ).setWordWrapWidth(cardWidth - 110)
    );
    const eventText = season.activeEvent
      ? `${season.activeEvent.name.toUpperCase()} · ${season.activeEvent.scoreMultiplier}× POINTS`
      : board.finalized
        ? 'FINAL STANDINGS'
        : `${season.daysRemaining} DAYS LEFT`;
    card.add(
      label(
        scene,
        0,
        cardTop + 144,
        eventText,
        TYPE.caption,
        season.activeEvent ? UI.goldText : UI.inkSoft,
        true
      )
    );

    const listTop = cardTop + 205;
    const availableListHeight = cardHeight - 330;
    const rowHeight = Math.max(48, Math.min(64, availableListHeight / 10));
    const shownEntries = board.top.slice(0, 10);
    if (shownEntries.length === 0) {
      card.add(
        label(
          scene,
          0,
          listTop + 70,
          'No points yet.\nPick tonight’s winner to rank.',
          TYPE.body,
          UI.inkSoft,
          true
        ).setLineSpacing(7)
      );
    }
    shownEntries.forEach((entry, index) => {
      const rowY = listTop + index * rowHeight;
      const isMe = board.me?.rank === entry.rank;
      card.add(
        scene.add
          .rectangle(
            0,
            rowY,
            cardWidth - 70,
            rowHeight - 7,
            isMe ? UI.gold : UI.creamHex,
            isMe ? 0.9 : 0.58
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
      if (entry.rank <= 3) {
        card.add(
          paperIcon(scene, 'trophy', cardWidth / 2 - 126, rowY, {
            size: 25,
            fill: entry.rank === 1 ? UI.gold : UI.tapeAlt,
          })
        );
      }
      card.add(
        label(
          scene,
          cardWidth / 2 - 52,
          rowY,
          `${entry.score} PTS`,
          TYPE.body,
          UI.goldText,
          true
        ).setOrigin(1, 0.5)
      );
    });

    const standing = board.me;
    const standingText =
      standing && standing.rank > 0
        ? `YOU #${standing.rank} · ${standing.score} PTS${rewardLabel(standing) ? ` · ${rewardLabel(standing)}` : ''}`
        : 'YOU · UNRANKED';
    const standingY = cardHeight / 2 - 62;
    card.add(
      scene.add.rectangle(0, standingY - 34, cardWidth - 70, 2, UI.inkHex, 0.3)
    );
    card.add(
      label(scene, 0, standingY, standingText, TYPE.title, UI.ink, true)
    );
  };

  void fetchSeasonBoard().then((result) => {
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
    liveStatus.textContent = `Season ranking loaded. ${standingSummary(result.data)}`;
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
