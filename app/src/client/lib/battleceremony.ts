// Battle ceremony utilities — dramatic pre-battle VS screens and post-battle
// result ceremonies. These turn async battles into EVENTS with anticipation.

import { Scene } from 'phaser';
import type { Scribbit, Element } from '../../shared/arena';
import { ELEMENT_PREY } from '../../shared/arena';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from './theme';
import { handLettered, label, elementBadge, levelBadge } from './ui';
import { loadDrawing, fitDrawing, levelOf } from './scribbits';

// Check if attacker has element advantage over defender.
function hasAdvantage(attacker: Element, defender: Element): boolean {
  return ELEMENT_PREY[attacker] === defender;
}

// Show a dramatic VS screen before battle. Both fighters slide in from opposite
// sides, element badges clash in the center, then transition to the replay.
export function showVsCeremony(
  scene: Scene,
  fighterA: Scribbit,
  fighterB: Scribbit,
  onComplete: () => void
): void {
  const { width, height } = scene.scale;
  const reduceMotion = prefersReducedMotion();
  const layer = scene.add.container(0, 0).setDepth(2000).setScrollFactor(0);

  // Keep the showdown inside the same physical sketchbook world as every
  // other screen. A dark game-overlay looked like a different product.
  const bg = scene.add
    .rectangle(width / 2, height / 2, width, height, UI.paper, 1)
    .setScrollFactor(0)
    .setInteractive();
  layer.add(bg);

  // Two translucent element washes meet along a hand-inked paper fold.
  const splitPaper = scene.add.graphics();
  splitPaper.fillStyle(ELEMENT_STYLES[fighterA.element].soft, 0.28);
  splitPaper.fillTriangle(0, 0, width * 0.58, 0, 0, height);
  splitPaper.fillStyle(ELEMENT_STYLES[fighterB.element].soft, 0.28);
  splitPaper.fillTriangle(width, 0, width, height, width * 0.42, height);
  splitPaper.lineStyle(10, UI.inkHex, 0.88);
  splitPaper.beginPath();
  splitPaper.moveTo(width * 0.3, 0);
  splitPaper.lineTo(width * 0.7, height);
  splitPaper.strokePath();
  splitPaper.lineStyle(4, UI.gold, 0.95);
  splitPaper.beginPath();
  splitPaper.moveTo(width * 0.3 + 12, 0);
  splitPaper.lineTo(width * 0.7 + 12, height);
  splitPaper.strokePath();
  layer.add(splitPaper);

  const topTape = scene.add
    .rectangle(width / 2, 34, 190, 46, UI.tape, 0.86)
    .setAngle(-2);
  layer.add(topTape);
  const matchupTitle = handLettered(
    scene,
    width / 2,
    92,
    "TONIGHT'S MATCHUP",
    40,
    UI.ink,
    true
  );
  layer.add(matchupTitle);

  const bottomRule = scene.add.graphics();
  bottomRule.lineStyle(3, UI.inkHex, 0.16);
  bottomRule.beginPath();
  bottomRule.moveTo(60, height - 92);
  bottomRule.lineTo(width - 60, height - 92);
  bottomRule.strokePath();
  layer.add(bottomRule);
  const matchupRule = label(
    scene,
    width / 2,
    height - 58,
    'SHAPE · ELEMENT · A LITTLE LUCK',
    TYPE.caption,
    UI.inkSoft,
    true
  );
  layer.add(matchupRule);

  // Fighter A (left side)
  const sideA = scene.add.container(0, height / 2);
  layer.add(sideA);

  const artSizeA = 240;
  const frameA = scene.add.graphics();
  frameA.fillStyle(UI.creamHex, 1);
  frameA.fillRect(-artSizeA / 2, -artSizeA / 2, artSizeA, artSizeA);
  frameA.lineStyle(6, ELEMENT_STYLES[fighterA.element].primary, 1);
  frameA.strokeRect(-artSizeA / 2, -artSizeA / 2, artSizeA, artSizeA);
  sideA.add(frameA);

  void loadDrawing(scene, fighterA).then((key) => {
    if (!scene.scene.isActive() || !sideA.active) return;
    const img = fitDrawing(scene.add.image(0, 0, key), artSizeA - 12);
    sideA.add(img);
  });

  const nameA = label(scene, 0, artSizeA / 2 + 40, fighterA.name.toUpperCase(), TYPE.title, UI.ink, true);
  sideA.add(nameA);
  sideA.add(elementBadge(scene, 0, artSizeA / 2 + 80, fighterA.element, 0.8));
  sideA.add(levelBadge(scene, artSizeA / 2 - 20, -artSizeA / 2 + 20, levelOf(fighterA), 0.7));

  // Element advantage indicator for fighter A
  const aAdvantage = hasAdvantage(fighterA.element, fighterB.element);
  const aDisadvantage = hasAdvantage(fighterB.element, fighterA.element);
  if (aAdvantage) {
    const advLabel = label(scene, 0, artSizeA / 2 + 120, '⬆ ADVANTAGE', 24, '#4faa4f', true);
    sideA.add(advLabel);
  } else if (aDisadvantage) {
    const advLabel = label(scene, 0, artSizeA / 2 + 120, '⬇ WEAK', 24, '#e8555c', true);
    sideA.add(advLabel);
  }

  // Fighter B (right side)
  const sideB = scene.add.container(width, height / 2);
  layer.add(sideB);

  const artSizeB = 240;
  const frameB = scene.add.graphics();
  frameB.fillStyle(UI.creamHex, 1);
  frameB.fillRect(-artSizeB / 2, -artSizeB / 2, artSizeB, artSizeB);
  frameB.lineStyle(6, ELEMENT_STYLES[fighterB.element].primary, 1);
  frameB.strokeRect(-artSizeB / 2, -artSizeB / 2, artSizeB, artSizeB);
  sideB.add(frameB);

  void loadDrawing(scene, fighterB).then((key) => {
    if (!scene.scene.isActive() || !sideB.active) return;
    const img = fitDrawing(scene.add.image(0, 0, key), artSizeB - 12);
    sideB.add(img);
  });

  const nameB = label(scene, 0, artSizeB / 2 + 40, fighterB.name.toUpperCase(), TYPE.title, UI.ink, true);
  sideB.add(nameB);
  sideB.add(elementBadge(scene, 0, artSizeB / 2 + 80, fighterB.element, 0.8));
  sideB.add(levelBadge(scene, -artSizeB / 2 + 20, -artSizeB / 2 + 20, levelOf(fighterB), 0.7));

  // Element advantage indicator for fighter B
  if (aDisadvantage) {
    const advLabel = label(scene, 0, artSizeB / 2 + 120, '⬆ ADVANTAGE', 24, '#4faa4f', true);
    sideB.add(advLabel);
  } else if (aAdvantage) {
    const advLabel = label(scene, 0, artSizeB / 2 + 120, '⬇ WEAK', 24, '#e8555c', true);
    sideB.add(advLabel);
  }

  // VS badge in the center
  const vsBadge = scene.add.container(width / 2, height / 2);
  const vsBg = scene.add.circle(0, 0, 80, UI.coral, 1).setStrokeStyle(8, UI.inkHex, 1);
  const vsText = label(scene, 0, 0, 'VS', 64, UI.ink, true);
  vsBadge.add([vsBg, vsText]);
  vsBadge.setScale(0);
  layer.add(vsBadge);

  // Animate fighters sliding in
  scene.tweens.add({
    targets: sideA,
    x: width * 0.28,
    duration: reduceMotion ? 1 : 600,
    ease: 'Back.easeOut',
  });

  scene.tweens.add({
    targets: sideB,
    x: width * 0.72,
    duration: reduceMotion ? 1 : 600,
    ease: 'Back.easeOut',
  });

  // VS badge pops in after fighters arrive
  scene.time.delayedCall(reduceMotion ? 1 : 400, () => {
    scene.tweens.add({
      targets: vsBadge,
      scale: 1,
      duration: reduceMotion ? 1 : 300,
      ease: 'Back.easeOut',
    });
    if (!reduceMotion) scene.cameras.main.shake(200, 0.008);
  });

  // Element clash effect
  if (!reduceMotion) scene.time.delayedCall(600, () => {
    const clash = scene.add.particles(width / 2, height / 2, 'spark', {
      speed: { min: 150, max: 350 },
      scale: { start: 0.8, end: 0 },
      lifespan: 800,
      quantity: 20,
      tint: [ELEMENT_STYLES[fighterA.element].particle, ELEMENT_STYLES[fighterB.element].particle],
      emitting: false,
    });
    clash.setDepth(2001);
    clash.explode(25);
    scene.time.delayedCall(1000, () => clash.destroy());
  });

  // Fade out and transition
  scene.time.delayedCall(reduceMotion ? 180 : 1800, () => {
    scene.cameras.main.fadeOut(200, 255, 247, 232);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      layer.destroy(true);
      onComplete();
    });
  });
}
