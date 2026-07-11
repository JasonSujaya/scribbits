// Paper-native Practice Lab result controls. The battle recap remains owned by
// replaybattlerecap; this adapter only renders session progress and exits.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  planPracticeOutcome,
} from './practicelab';
import type { PracticeSession } from './practicelab';
import { prefersReducedMotion, TYPE, UI } from './theme';
import { button, ghostButton, label, stickerCard } from './ui';

export function createPracticeOutcomeControls(
  scene: Scene,
  input: Readonly<{
    session: PracticeSession;
    onTryAgain: () => void;
    onExit: () => void;
  }>
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const plan = planPracticeOutcome(input.session);
  const reduceMotion = prefersReducedMotion();
  const container = scene.add.container(0, 0).setDepth(61);
  const progress = stickerCard(
    scene,
    width / 2,
    height - 300,
    width - 90,
    180,
    { tape: false, tilt: -0.5, gold: plan.completed }
  );
  if (plan.completed && !reduceMotion) {
    progress.setScale(0.82);
    scene.tweens.add({
      targets: progress,
      scale: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });
    const celebration = scene.add
      .particles(width / 2, height - 330, 'spark', {
        speed: { min: 90, max: 260 },
        scale: { start: 0.46, end: 0 },
        lifespan: 950,
        quantity: 1,
        tint: [UI.gold, UI.coral, UI.tapeAlt],
        emitting: false,
      })
      .setDepth(63);
    celebration.explode(34);
    scene.time.delayedCall(1_050, () => celebration.destroy());
  }
  progress.add(
    label(
      scene,
      0,
      -62,
      plan.headline,
      TYPE.body,
      plan.completed ? UI.goldText : UI.coralText,
      true
    )
  );
  progress.add(
    label(
      scene,
      0,
      -26,
      plan.result,
      TYPE.caption,
      plan.completed || input.session.lastPowerWasNew
        ? UI.goldText
        : UI.inkSoft,
      true
    )
  );
  progress.add(
    label(
      scene,
      0,
      10,
      plan.progress,
      16,
      UI.inkSoft,
      true
    )
  );
  progress.add(
    label(
      scene,
      0,
      53,
      plan.checklist,
      18,
      UI.ink,
      true
    ).setWordWrapWidth(width - 150, true)
  );

  const again = button(
    scene,
    width / 2,
    height - 145,
    plan.primaryButton,
    input.onTryAgain,
    width - 150,
    plan.completed ? UI.gold : UI.tapeAlt,
    UI.ink
  );
  const exit = ghostButton(
    scene,
    width / 2,
    height - 48,
    plan.exitButton,
    input.onExit,
    320
  );
  container.add([progress, again, exit]);
  return container;
}
