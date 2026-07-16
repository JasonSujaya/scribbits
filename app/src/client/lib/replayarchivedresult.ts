import { Scene } from 'phaser';
import type { BattleReport } from '../../shared/arena';
import type { BattleRecapPerspective } from './battlerecap';
import { createPostFightActions } from './replaypostfightactions';
import { planArchivedReplayResultCopy } from './replayarchivedresultplan';
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
  const card = stickerCard(scene, width / 2, height / 2, width - 70, 286, {
    gold: true,
    tapeColor: UI.tape,
  });
  card.setDepth(60).setScale(0.8);
  scene.tweens.add({
    targets: card,
    scale: 1,
    duration: options.reduceMotion ? 0 : 260,
    ease: 'Back.easeOut',
  });

  const top = -143;
  card.add(
    label(
      scene,
      0,
      top + 48,
      copy.lead,
      34,
      UI.goldText,
      true
    ).setWordWrapWidth(width - 110)
  );
  card.add(
    label(scene, 0, top + 96, copy.status, 18, UI.ink, true).setWordWrapWidth(
      width - 90
    )
  );

  const returnY = top + 205;
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
