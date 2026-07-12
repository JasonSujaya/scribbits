// First-session birth payoff. The player's submitted drawing is the reveal;
// there is no placeholder egg or substitute mascot between Draw and battle.

import { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from './theme';
import { label } from './ui';
import { LiveSprite } from './livesprite';

export type BirthCeremonyResult = Readonly<{
  textureKey: string;
  newborn: LiveSprite | null;
}>;

export function playBirthCeremony(
  scene: Scene,
  input: Readonly<{
    scribbit: Scribbit;
    dataUrl: string;
    animate: boolean;
    onComplete: (result: BirthCeremonyResult) => void;
    onError: () => void;
  }>
): void {
  const textureKey = `ceremony-${input.scribbit.id}`;
  const image = new Image();
  image.onload = () => {
    if (!scene.scene.isActive()) return;
    if (!scene.textures.exists(textureKey)) {
      scene.textures.addImage(textureKey, image);
    }
    if (!input.animate) {
      input.onComplete({ textureKey, newborn: null });
      return;
    }
    awakenSubmittedDrawing(scene, input.scribbit, textureKey, input.onComplete);
  };
  image.onerror = () => {
    if (scene.scene.isActive()) input.onError();
  };
  image.src = input.dataUrl;
}

function awakenSubmittedDrawing(
  scene: Scene,
  scribbit: Scribbit,
  textureKey: string,
  onComplete: (result: BirthCeremonyResult) => void
): void {
  const { width, height } = scene.scale;
  const reducedMotion = prefersReducedMotion();
  const style = ELEMENT_STYLES[scribbit.element];
  const artY = height / 2 - 80;

  const halo = scene.add.container(width / 2, artY).setDepth(4);
  const paper = scene.add
    .circle(0, 0, 178, UI.creamHex, 0.94)
    .setStrokeStyle(7, UI.goldHex, 0.9);
  const elementRing = scene.add
    .circle(0, 0, 150, style.soft, 0.18)
    .setStrokeStyle(5, style.primary, 0.7);
  halo.add([paper, elementRing]);
  halo.setScale(reducedMotion ? 1 : 0.3).setAlpha(reducedMotion ? 1 : 0);

  const status = label(
    scene,
    width / 2,
    226,
    'YOUR INK IS MOVING',
    TYPE.title,
    UI.ink,
    true
  )
    .setDepth(12)
    .setAlpha(reducedMotion ? 1 : 0);

  const newborn = new LiveSprite(scene, width / 2, artY, textureKey, {
    displaySize: 230,
    stats: scribbit.stats,
    depth: 10,
    reduceMotion: reducedMotion,
  });

  if (!reducedMotion) {
    scene.tweens.add({
      targets: halo,
      scale: 1,
      alpha: 1,
      duration: 360,
      ease: 'Back.easeOut',
    });
    scene.tweens.add({
      targets: status,
      alpha: 1,
      y: 214,
      duration: 260,
      ease: 'Quad.easeOut',
    });
  }

  newborn.awaken(() => {
    if (!scene.scene.isActive()) return;
    scene.cameras.main.flash(reducedMotion ? 1 : 120, 255, 212, 71, false);
    if (!reducedMotion) {
      const burst = scene.add.particles(width / 2, artY, 'spark', {
        speed: { min: 100, max: 280 },
        scale: { start: 0.45, end: 0 },
        lifespan: 780,
        quantity: 24,
        tint: [style.particle, UI.gold],
        emitting: false,
      });
      burst.setDepth(11).explode(28);
      scene.time.delayedCall(820, () => burst.destroy());
    }

    const finish = (): void => {
      halo.destroy(true);
      status.destroy();
      onComplete({ textureKey, newborn });
    };
    if (reducedMotion) {
      finish();
      return;
    }
    scene.tweens.add({
      targets: [halo, status],
      alpha: 0,
      duration: 220,
      delay: 120,
      onComplete: finish,
    });
  });
}
