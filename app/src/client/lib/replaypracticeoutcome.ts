// Paper-native Practice Lab result controls. The battle recap remains owned by
// replaybattlerecap; this adapter only renders session progress and exits.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { CanvasActionOverlay } from './overlay';
import { planPracticeOutcome } from './practicelab';
import type { PracticeSession } from './practicelab';
import { prefersReducedMotion, UI } from './theme';
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
  const accessibleOverlay = new CanvasActionOverlay(scene);
  const buttonHeight = 100;
  const primaryY = height - 168;
  const exitY = height - 54;
  const progressMatch = `${plan.headline} ${plan.progress}`.match(
    /\d+\/\d+/
  )?.[0];
  const progressCopy = progressMatch
    ? `${progressMatch} • NO REWARDS`
    : 'NO REWARDS';
  const powerCopy = plan.completed ? plan.headline : plan.result;
  const progress = stickerCard(
    scene,
    width / 2,
    height - 300,
    width - 90,
    156,
    { tape: false, tilt: -0.5, gold: plan.completed }
  );
  if (plan.celebrateCompletion && !reduceMotion) {
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
    celebration.explode(12);
    scene.time.delayedCall(1_050, () => celebration.destroy());
  }
  progress.add(
    label(
      scene,
      0,
      -49,
      powerCopy,
      24,
      plan.completed ? UI.goldText : UI.coralText,
      true
    )
  );
  progress.add(label(scene, 0, -13, progressCopy, 17, UI.inkSoft, true));
  progress.add(
    label(scene, 0, 29, plan.checklist, 15, UI.ink, true)
      .setWordWrapWidth(width - 144, true)
      .setLineSpacing(-4)
  );

  const again = button(
    scene,
    width / 2,
    primaryY,
    plan.primaryButton,
    input.onTryAgain,
    width - 150,
    plan.completed ? UI.gold : UI.tapeAlt,
    UI.ink,
    buttonHeight
  );
  const exit = ghostButton(
    scene,
    width / 2,
    exitY,
    plan.exitButton,
    input.onExit,
    320,
    buttonHeight
  );
  accessibleOverlay.add({
    label: plan.completed ? 'Draw one more' : 'Draw another shape',
    rect: {
      x: 75,
      y: primaryY - buttonHeight / 2,
      width: width - 150,
      height: buttonHeight,
    },
    onActivate: input.onTryAgain,
  });
  accessibleOverlay.add({
    label: 'End practice and return to Arena',
    rect: {
      x: width / 2 - 160,
      y: exitY - buttonHeight / 2,
      width: 320,
      height: buttonHeight,
    },
    onActivate: input.onExit,
  });
  container.add([progress, again, exit]);
  return container;
}
