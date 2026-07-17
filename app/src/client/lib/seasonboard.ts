import { Scene } from 'phaser';
import type { SeasonBoard, SeasonBoardEntry } from '../../shared/arena';
import {
  SEASON_ONE_PARTICIPATION_MILESTONES,
  SEASON_RANK_REWARD_MINIMUM_PICKS,
  type SeasonRewardTier,
} from '../../shared/season';
import { fetchSeasonBoard } from './api';
import { CanvasModalOverlay } from './overlay';
import { paperIcon } from './papericons';
import { TYPE, UI } from './theme';
import { ghostButton, handLettered, label, stickerCard } from './ui';
import { setSfxCue } from './sfx';

const DEPTH = 2300;

export type SeasonBoardModal = Readonly<{ destroy: () => void }>;

export type SeasonBoardModalOptions = Readonly<{
  onClose?: () => void;
}>;

const rewardLabel = (entry: SeasonBoardEntry): string => {
  const tier = entry.rewardTier ?? entry.projectedRewardTier;
  if (tier === 'champion') return 'CHAMPION';
  if (tier === 'top-ten') return 'FINALIST';
  if (tier === 'top-hundred') return 'CONTENDER';
  return '';
};

const rankPrizeText = (tier: SeasonRewardTier | null): string => {
  if (tier === 'champion') return 'CHAMPION TITLE + 35 INK';
  if (tier === 'top-ten') return 'FINALIST TITLE + 21 INK';
  if (tier === 'top-hundred') return 'CONTENDER TITLE + 7 INK';
  return 'NO RANK PRIZE YET';
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
    'Season rewards and standings',
    () => close(),
    'The current sixty-day Scribbits campaign rewards and ranking.'
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
    handLettered(scene, 0, cardTop + 56, 'SEASON REWARDS', 36, UI.ink, true)
  );
  card.add(
    ghostButton(scene, cardWidth / 2 - 46, cardTop + 42, '✕', () => close(), 72)
  );
  const nativeClose = modalActions.add({
    label: 'Close season rewards and standings',
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

  const content = scene.add.container(0, 0);
  card.add(content);
  let activeTab: 'rewards' | 'standings' = 'rewards';
  let loadedBoard: SeasonBoard | null = null;

  const activateTab = (tab: 'rewards' | 'standings'): void => {
    activeTab = tab;
    renderActiveTab();
    liveStatus.textContent =
      tab === 'rewards'
        ? 'Season rewards shown.'
        : `Season standings shown. ${loadedBoard ? standingSummary(loadedBoard) : ''}`;
  };

  modalActions.add({
    label: 'Show season rewards',
    rect: {
      x: width / 2 - 212,
      y: height / 2 + cardTop + 166,
      width: 200,
      height: 48,
    },
    onActivate: () => activateTab('rewards'),
  });
  modalActions.add({
    label: 'Show season standings',
    rect: {
      x: width / 2 + 12,
      y: height / 2 + cardTop + 166,
      width: 200,
      height: 48,
    },
    onActivate: () => activateTab('standings'),
  });

  const addHeaderAndTabs = (board: SeasonBoard): void => {
    const season = board.season;
    content.add(
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
    content.add(
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
    content.add(
      ghostButton(
        scene,
        -112,
        cardTop + 190,
        'REWARDS',
        () => activateTab('rewards'),
        200
      )
    );
    content.add(
      ghostButton(
        scene,
        112,
        cardTop + 190,
        'STANDINGS',
        () => activateTab('standings'),
        200
      )
    );
  };

  const renderRewards = (board: SeasonBoard): void => {
    const standing = board.season.me;
    const picksMade = standing?.picksMade ?? 0;
    const projectedTier = standing?.projectedRewardTier ?? null;
    const heroY = cardTop + 262;
    content.add(
      scene.add
        .rectangle(0, heroY, cardWidth - 70, 86, UI.gold, 0.3)
        .setStrokeStyle(2, 0x8a5700, 0.7)
    );
    content.add(
      label(
        scene,
        0,
        heroY - 18,
        'YOUR CURRENT PRIZE',
        TYPE.caption,
        UI.inkSoft,
        true
      )
    );
    content.add(
      label(
        scene,
        0,
        heroY + 17,
        picksMade < SEASON_RANK_REWARD_MINIMUM_PICKS
          ? `${SEASON_RANK_REWARD_MINIMUM_PICKS - picksMade} PICKS TO QUALIFY`
          : rankPrizeText(projectedTier),
        TYPE.title,
        UI.ink,
        true
      )
    );

    const milestoneTop = cardTop + 340;
    const rowHeight = 58;
    SEASON_ONE_PARTICIPATION_MILESTONES.forEach((milestone, index) => {
      const rowY = milestoneTop + index * rowHeight;
      const complete = picksMade >= milestone.picksRequired;
      const next =
        !complete &&
        !SEASON_ONE_PARTICIPATION_MILESTONES.some(
          (candidate) =>
            candidate.picksRequired < milestone.picksRequired &&
            picksMade < candidate.picksRequired
        );
      content.add(
        scene.add
          .rectangle(
            0,
            rowY,
            cardWidth - 70,
            rowHeight - 7,
            complete ? UI.gold : UI.creamHex,
            complete ? 0.42 : next ? 0.82 : 0.48
          )
          .setStrokeStyle(2, UI.inkHex, complete || next ? 0.65 : 0.22)
      );
      content.add(
        paperIcon(
          scene,
          complete ? 'spark' : 'lock',
          -cardWidth / 2 + 56,
          rowY,
          {
            size: 23,
            fill: complete ? UI.gold : UI.inkSoftHex,
          }
        )
      );
      content.add(
        label(
          scene,
          -cardWidth / 2 + 88,
          rowY,
          `${milestone.picksRequired} PICKS`,
          TYPE.caption,
          UI.ink,
          true
        ).setOrigin(0, 0.5)
      );
      content.add(
        label(
          scene,
          cardWidth / 2 - 42,
          rowY,
          milestone.label.toUpperCase(),
          TYPE.caption,
          complete ? UI.goldText : UI.inkSoft,
          complete
        )
          .setOrigin(1, 0.5)
          .setWordWrapWidth(cardWidth - 260)
      );
    });

    const rankTop = milestoneTop + rowHeight * 5 + 38;
    content.add(
      label(scene, 0, rankTop, 'FINAL RANK PRIZES', TYPE.title, UI.ink, true)
    );
    [
      '#1 · CHAMPION TITLE + 35 INK',
      '#2–10 · FINALIST TITLE + 21 INK',
      '#11–100 · CONTENDER TITLE + 7 INK',
    ].forEach((text, index) => {
      content.add(
        label(
          scene,
          0,
          rankTop + 42 + index * 34,
          text,
          TYPE.caption,
          UI.inkSoft,
          true
        )
      );
    });
    content.add(
      label(
        scene,
        0,
        rankTop + 152,
        `${SEASON_RANK_REWARD_MINIMUM_PICKS} PICKS REQUIRED · EXACT TIES SHARE THE HIGHER TIER`,
        TYPE.caption,
        UI.coralText,
        true
      ).setWordWrapWidth(cardWidth - 100)
    );
  };

  const renderStandings = (board: SeasonBoard): void => {
    const listTop = cardTop + 260;
    const availableListHeight = cardHeight - 390;
    const rowHeight = Math.max(48, Math.min(62, availableListHeight / 10));
    const shownEntries = board.top.slice(0, 10);
    if (shownEntries.length === 0) {
      content.add(
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
      const isMe = board.me?.username === entry.username;
      content.add(
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
      content.add(
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
      content.add(
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
        content.add(
          paperIcon(scene, 'trophy', cardWidth / 2 - 126, rowY, {
            size: 25,
            fill: entry.rank === 1 ? UI.gold : UI.tapeAlt,
          })
        );
      }
      content.add(
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
        ? `YOU #${standing.rank} · ${standing.score} PTS · ${standing.picksMade} PICKS${rewardLabel(standing) ? ` · ${rewardLabel(standing)}` : ''}`
        : 'YOU · UNRANKED';
    const standingY = cardHeight / 2 - 62;
    content.add(
      scene.add.rectangle(0, standingY - 34, cardWidth - 70, 2, UI.inkHex, 0.3)
    );
    content.add(
      label(scene, 0, standingY, standingText, TYPE.title, UI.ink, true)
    );
  };

  const renderActiveTab = (): void => {
    if (!loadedBoard) return;
    content.removeAll(true);
    addHeaderAndTabs(loadedBoard);
    if (activeTab === 'rewards') renderRewards(loadedBoard);
    else renderStandings(loadedBoard);
  };

  const renderBoard = (board: SeasonBoard): void => {
    loadedBoard = board;
    renderActiveTab();
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
