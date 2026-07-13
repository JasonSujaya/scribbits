import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { BattleKind, Scribbit } from '../../shared/arena';
import { planBattleMatchupBrief } from './matchupbrief';
import { elementPaperIcon } from './papericons';
import { fitDrawing, loadDrawing } from './scribbits';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from './theme';
import { label, stickerCard, versusBadge } from './ui';

const INTRO_DEPTH = 2_550;
const INTRO_VISIBLE_MILLISECONDS = 700;
const INTRO_EXIT_MILLISECONDS = 160;
const REDUCED_MOTION_VISIBLE_MILLISECONDS = 620;

export type SavedReplayIntroInput = Readonly<{
  fighterA: Scribbit;
  fighterB: Scribbit;
  battleKind: BattleKind;
  replayPass: number;
  onComplete: () => void;
}>;

export type SavedReplayIntro = Readonly<{
  destroy: () => void;
}>;

function fitName(text: Phaser.GameObjects.Text, maximumWidth: number): void {
  if (text.width > maximumWidth) {
    text.setScale(maximumWidth / text.width);
  }
}

function createFighterPortrait(
  scene: Scene,
  fighter: Scribbit,
  x: number,
  destroyed: () => boolean
): Phaser.GameObjects.Container {
  const style = ELEMENT_STYLES[fighter.element];
  const portrait = scene.add.container(x, 2);
  const frame = scene.add
    .rectangle(0, -12, 124, 124, UI.creamHex, 1)
    .setStrokeStyle(4, style.primary, 1);
  const wash = scene.add.circle(0, -12, 53, style.soft, 0.38);
  const name = label(scene, 0, 72, fighter.name, 25, UI.ink, true);
  fitName(name, 174);
  portrait.add([frame, wash, name]);
  portrait.add(elementPaperIcon(scene, fighter.element, -48, -60, 30));

  void loadDrawing(scene, fighter).then((textureKey) => {
    if (destroyed() || !portrait.active || !scene.scene.isActive()) return;
    const drawing = fitDrawing(scene.add.image(0, -12, textureKey), 104);
    portrait.addAt(drawing, 2);
  });

  return portrait;
}

/** Shows a brief, non-interactive paper ticket before a saved replay starts. */
export function showSavedReplayIntro(
  scene: Scene,
  input: SavedReplayIntroInput
): SavedReplayIntro {
  const { width, height } = scene.scale;
  const reduceMotion = prefersReducedMotion();
  const matchup = planBattleMatchupBrief(input);
  const ticketWidth = Math.min(624, width - 48);
  const ticketHeight = 340;
  const ticketCenterY = height / 2;
  let destroyed = false;
  let completed = false;
  let completionTimer: Phaser.Time.TimerEvent | null = null;

  const layer = scene.add
    .container(0, 0)
    .setDepth(INTRO_DEPTH)
    .setScrollFactor(0);
  // This full-canvas interactive sheet keeps taps from reaching replay controls.
  const pointerBlocker = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.paper, 0.9)
    .setScrollFactor(0)
    .setInteractive();
  layer.add(pointerBlocker);

  const ticket = stickerCard(
    scene,
    width / 2,
    ticketCenterY,
    ticketWidth,
    ticketHeight,
    { tape: false, tilt: -0.35 }
  ).setScrollFactor(0);
  layer.add(ticket);

  const matchupTitle = label(
    scene,
    0,
    -126,
    matchup.title,
    TYPE.body,
    UI.ink,
    true
  );
  fitName(matchupTitle, ticketWidth - 80);
  ticket.add(matchupTitle);

  const fighterOffset = Math.min(170, ticketWidth * 0.28);
  ticket.add(
    createFighterPortrait(
      scene,
      input.fighterA,
      -fighterOffset,
      () => destroyed
    )
  );
  ticket.add(
    createFighterPortrait(scene, input.fighterB, fighterOffset, () => destroyed)
  );

  const versus = versusBadge(scene, 0, -2, { size: 86 });
  ticket.add(versus);

  if (input.replayPass > 0) {
    const marker = scene.add.container(0, -169).setAngle(1.2);
    const markerTape = scene.add
      .rectangle(0, 0, 174, 38, UI.tapeAlt, 0.96)
      .setStrokeStyle(2, UI.inkHex, 0.3);
    marker.add([
      markerTape,
      label(scene, 0, 0, 'WATCH AGAIN', 17, UI.ink, true),
    ]);
    ticket.add(marker);
  }

  const removeSceneListener = (): void => {
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, handleSceneShutdown);
  };

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    completionTimer?.remove(false);
    completionTimer = null;
    scene.tweens.killTweensOf([ticket, versus, pointerBlocker]);
    removeSceneListener();
    if (layer.active) layer.destroy(true);
  };

  const complete = (): void => {
    if (destroyed || completed) return;
    completed = true;
    destroy();
    input.onComplete();
  };

  function handleSceneShutdown(): void {
    destroy();
  }

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, handleSceneShutdown);

  if (reduceMotion) {
    completionTimer = scene.time.delayedCall(
      REDUCED_MOTION_VISIBLE_MILLISECONDS,
      complete
    );
  } else {
    ticket
      .setAlpha(0)
      .setScale(0.95)
      .setY(ticketCenterY + 18);
    versus.setScale(0.72);
    scene.tweens.add({
      targets: ticket,
      y: ticketCenterY,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
    scene.tweens.add({
      targets: versus,
      scaleX: 1,
      scaleY: 1,
      duration: 190,
      delay: 90,
      ease: 'Back.easeOut',
    });
    completionTimer = scene.time.delayedCall(INTRO_VISIBLE_MILLISECONDS, () => {
      completionTimer = null;
      if (destroyed) return;
      scene.tweens.add({
        targets: pointerBlocker,
        alpha: 0,
        duration: INTRO_EXIT_MILLISECONDS,
        ease: 'Cubic.easeIn',
      });
      scene.tweens.add({
        targets: ticket,
        y: ticketCenterY - 14,
        alpha: 0,
        duration: INTRO_EXIT_MILLISECONDS,
        ease: 'Cubic.easeIn',
        onComplete: complete,
      });
    });
  }

  return Object.freeze({ destroy });
}
