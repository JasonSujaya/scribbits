import { Scene } from 'phaser';
import type { BattleReport } from '../../shared/arena';
import type { BattleRecapPerspective } from './battlerecap';
import { createPostFightActions } from './replaypostfightactions';
import { planArchivedReplayResultCopy } from './replayarchivedresultplan';
import { paperIcon } from './papericons';
import { UI } from './theme';
import { label, stickerCard } from './ui';

export type ArchivedReplayResult = Readonly<{ destroy: () => void }>;

type ArchivedReplayResultOptions = Readonly<{
  winnerName: string;
  perspective: BattleRecapPerspective;
  rivalRun: BattleReport['rivalRun'];
  reduceMotion: boolean;
  returnLabel: string;
  onReturn: () => void;
}>;

export const createArchivedReplayResult = (
  scene: Scene,
  options: ArchivedReplayResultOptions
): ArchivedReplayResult => {
  const { width, height } = scene.scale;
  const copy = planArchivedReplayResultCopy(options);
  const cardHeight = 330;
  const card = stickerCard(
    scene,
    width / 2,
    height / 2,
    width - 70,
    cardHeight,
    {
      gold: true,
      tapeColor: UI.tape,
    }
  );
  card.setDepth(60).setScale(0.8);
  scene.tweens.add({
    targets: card,
    scale: 1,
    duration: options.reduceMotion ? 0 : 260,
    ease: 'Back.easeOut',
  });

  const top = -cardHeight / 2;
  const outcomeIcon =
    options.perspective === 'viewer_loss' ? 'defeat' : 'trophy';
  card.add(
    paperIcon(scene, outcomeIcon, 0, top + 53, {
      size: 54,
      fill: outcomeIcon === 'defeat' ? UI.coral : UI.gold,
    })
  );
  card.add(
    label(
      scene,
      0,
      top + 101,
      copy.lead,
      34,
      UI.goldText,
      true
    ).setWordWrapWidth(width - 110)
  );
  card.add(
    label(scene, 0, top + 147, copy.status, 18, UI.ink, true).setWordWrapWidth(
      width - 90
    )
  );

  const returnY = top + 258;
  const actions = createPostFightActions(scene, {
    x: 0,
    y: returnY,
    accessibilityX: width / 2,
    accessibilityY: height / 2 + returnY,
    width: width - 150,
    canChooseRival: false,
    canBackContender: false,
    canReplay: false,
    canShareClip: false,
    returnLabel: options.returnLabel,
    onRivals: () => undefined,
    onBackContender: () => undefined,
    onReplay: () => undefined,
    onShareClip: () => undefined,
    onReturn: options.onReturn,
  });
  card.add(actions.container);

  let destroyed = false;
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    scene.tweens.killTweensOf(card);
    actions.destroy();
    card.destroy(true);
  };
  return Object.freeze({ destroy });
};
