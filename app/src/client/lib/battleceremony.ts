// Battle ceremony utilities — dramatic pre-battle VS screens and post-battle
// result ceremonies. These turn async battles into EVENTS with anticipation.

import { Scene } from 'phaser';
import type * as Phaser from 'phaser';
import type {
  BattleKind,
  RivalRunReceipt,
  Scribbit,
} from '../../shared/arena';
import { ELEMENT_STYLES, prefersReducedMotion, UI } from './theme';
import { handLettered, label, elementBadge, levelBadge } from './ui';
import { loadDrawing, fitDrawing, levelOf } from './scribbits';
import { planBattleMatchupBrief } from './matchupbrief';
import type { FounderRivalryStakesPlan } from './founderchronicle';
import { formatRivalRunBattleLabel } from './rivalrunpresentation';

export type VsCeremonyOptions = Readonly<{
  fighterA: Scribbit;
  fighterB: Scribbit;
  battleKind: BattleKind;
  rivalryStakes?: FounderRivalryStakesPlan | null;
  rivalRun?: RivalRunReceipt;
  onComplete: () => void;
}>;

const FIGHTER_ART_SIZE = 304;
const FIGHTER_COLUMN_WIDTH = 292;

type FighterSideOptions = Readonly<{
  fighter: Scribbit;
  signatureName: string;
  startsOnLeft: boolean;
  centerY: number;
}>;

function createFighterSide(
  scene: Scene,
  options: FighterSideOptions
): Phaser.GameObjects.Container {
  const { fighter, signatureName, startsOnLeft, centerY } = options;
  const elementStyle = ELEMENT_STYLES[fighter.element];
  const side = scene.add.container(
    startsOnLeft ? 0 : scene.scale.width,
    centerY
  );
  const artwork = scene.add.container(0, 0).setAngle(startsOnLeft ? -1.4 : 1.4);
  const matOffset = startsOnLeft ? 9 : -9;
  const artMat = scene.add
    .rectangle(
      matOffset,
      10,
      FIGHTER_ART_SIZE + 18,
      FIGHTER_ART_SIZE + 18,
      elementStyle.soft,
      0.78
    )
    .setStrokeStyle(3, UI.inkHex, 0.28);
  const frame = scene.add.graphics();
  frame.fillStyle(UI.creamHex, 1);
  frame.fillRect(
    -FIGHTER_ART_SIZE / 2,
    -FIGHTER_ART_SIZE / 2,
    FIGHTER_ART_SIZE,
    FIGHTER_ART_SIZE
  );
  frame.lineStyle(7, elementStyle.primary, 1);
  frame.strokeRect(
    -FIGHTER_ART_SIZE / 2,
    -FIGHTER_ART_SIZE / 2,
    FIGHTER_ART_SIZE,
    FIGHTER_ART_SIZE
  );
  artwork.add([artMat, frame]);

  void loadDrawing(scene, fighter).then((key) => {
    if (!scene.scene.isActive() || !side.active || !artwork.active) return;
    const image = fitDrawing(scene.add.image(0, 0, key), FIGHTER_ART_SIZE - 22);
    artwork.addAt(image, 2);
  });

  const levelX = startsOnLeft
    ? -FIGHTER_ART_SIZE / 2 + 30
    : FIGHTER_ART_SIZE / 2 - 30;
  artwork.add(
    levelBadge(
      scene,
      levelX,
      -FIGHTER_ART_SIZE / 2 + 30,
      levelOf(fighter),
      0.82
    )
  );
  side.add(artwork);

  const fighterName = label(
    scene,
    0,
    FIGHTER_ART_SIZE / 2 + 44,
    fighter.name,
    30,
    UI.ink,
    true
  );
  if (fighterName.width > FIGHTER_COLUMN_WIDTH) {
    fighterName.setScale(FIGHTER_COLUMN_WIDTH / fighterName.width);
  }
  side.add(fighterName);
  side.add(
    elementBadge(scene, 0, FIGHTER_ART_SIZE / 2 + 98, fighter.element, 0.82)
  );

  const signatureTag = scene.add
    .container(0, FIGHTER_ART_SIZE / 2 + 162)
    .setAngle(startsOnLeft ? 1 : -1);
  const signaturePlate = scene.add
    .rectangle(0, 0, 278, 56, UI.creamHex, 0.94)
    .setStrokeStyle(3, elementStyle.primary, 0.88);
  const signature = label(
    scene,
    0,
    0,
    signatureName,
    21,
    elementStyle.primaryText,
    true
  );
  if (signature.width > 248) signature.setScale(248 / signature.width);
  signatureTag.add([signaturePlate, signature]);
  side.add(signatureTag);

  return side;
}

// Show a dramatic VS screen before battle. Both fighters slide in from opposite
// sides, element badges clash in the center, then transition to the replay.
export function showVsCeremony(scene: Scene, options: VsCeremonyOptions): void {
  const {
    fighterA,
    fighterB,
    battleKind,
    rivalryStakes,
    rivalRun,
    onComplete,
  } = options;
  const { width, height } = scene.scale;
  const reduceMotion = prefersReducedMotion();
  const brief = planBattleMatchupBrief({
    battleKind,
    fighterA,
    fighterB,
  });
  const fighterCenterY = rivalryStakes || rivalRun ? 490 : 450;
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
  const foldTravel = width * 0.42;
  const foldTopX = width / 2 - foldTravel * (fighterCenterY / height);
  const foldBottomX = foldTopX + foldTravel;
  splitPaper.lineStyle(6, UI.inkHex, 0.82);
  splitPaper.beginPath();
  splitPaper.moveTo(foldTopX, 0);
  splitPaper.lineTo(foldBottomX, height);
  splitPaper.strokePath();
  splitPaper.lineStyle(2, UI.gold, 0.95);
  splitPaper.beginPath();
  splitPaper.moveTo(foldTopX + 10, 0);
  splitPaper.lineTo(foldBottomX + 10, height);
  splitPaper.strokePath();
  layer.add(splitPaper);

  const battleLabelText =
    (rivalRun ? formatRivalRunBattleLabel(rivalRun) : null) ??
    rivalryStakes?.battleLabel ??
    battleKind.toUpperCase();
  const topBattleLabel = label(
    scene,
    width / 2,
    42,
    battleLabelText,
    19,
    UI.inkSoft,
    true
  );
  const topTape = scene.add
    .rectangle(
      width / 2,
      42,
      Math.min(width - 96, topBattleLabel.width + 72),
      42,
      UI.tape,
      0.86
    )
    .setAngle(-1.5);
  layer.add([topTape, topBattleLabel]);

  const matchupTitle = handLettered(
    scene,
    width / 2,
    104,
    rivalryStakes?.episodeTitle ?? brief.title,
    rivalryStakes ? 34 : 38,
    UI.ink,
    true
  );
  layer.add(matchupTitle);

  if (rivalryStakes || rivalRun) {
    const contextDetail = rivalRun
      ? `${rivalRun.challenge.goal} • SCORE ${rivalRun.score - rivalRun.pointsAwarded} • ${rivalRun.tier.toUpperCase()} +${rivalRun.winPoints}`
      : (rivalryStakes?.detail ?? 'SERVER-LOCKED BATTLE');
    const stakesStrip = scene.add
      .rectangle(width / 2, 170, width - 96, 54, UI.tapeAlt, 0.9)
      .setStrokeStyle(2, UI.inkHex, 0.52)
      .setAngle(0.3);
    const stakesDetail = label(
      scene,
      width / 2,
      170,
      contextDetail,
      19,
      UI.ink,
      true
    )
      .setWordWrapWidth(width - 132, true)
      .setLineSpacing(-2);
    layer.add([stakesStrip, stakesDetail]);
  }

  const mechanicsY = height - 200;
  const mechanicsCard = scene.add
    .rectangle(width / 2, mechanicsY, width - 88, 152, UI.creamHex, 0.96)
    .setStrokeStyle(3, UI.inkHex, 0.3);
  const leftMechanicsAccent = scene.add.rectangle(
    52,
    mechanicsY,
    12,
    96,
    ELEMENT_STYLES[fighterA.element].primary,
    0.9
  );
  const rightMechanicsAccent = scene.add.rectangle(
    width - 52,
    mechanicsY,
    12,
    96,
    ELEMENT_STYLES[fighterB.element].primary,
    0.9
  );
  const matchupLabel = label(
    scene,
    width / 2,
    mechanicsY - 32,
    brief.matchup.label,
    26,
    UI.goldText,
    true
  );
  const matchupDetail = label(
    scene,
    width / 2,
    mechanicsY + 25,
    brief.matchup.detail,
    22,
    UI.inkSoft,
    true
  )
    .setWordWrapWidth(width - 144, true)
    .setLineSpacing(-3);
  layer.add([
    mechanicsCard,
    leftMechanicsAccent,
    rightMechanicsAccent,
    matchupLabel,
    matchupDetail,
  ]);

  // Fighter A (left side)
  const sideA = createFighterSide(scene, {
    fighter: fighterA,
    signatureName: brief.fighters.a.signatureName,
    startsOnLeft: true,
    centerY: fighterCenterY,
  });
  layer.add(sideA);

  // Fighter B (right side)
  const sideB = createFighterSide(scene, {
    fighter: fighterB,
    signatureName: brief.fighters.b.signatureName,
    startsOnLeft: false,
    centerY: fighterCenterY,
  });
  layer.add(sideB);

  // VS badge in the center
  const vsBadge = scene.add.container(width / 2, fighterCenterY);
  const vsBg = scene.add
    .circle(0, 0, 54, UI.coral, 1)
    .setStrokeStyle(6, UI.inkHex, 1);
  const vsText = label(scene, 0, 0, 'VS', 42, UI.ink, true);
  vsBadge.add([vsBg, vsText]);
  vsBadge.setScale(0);
  layer.add(vsBadge);

  // Animate fighters sliding in
  scene.tweens.add({
    targets: sideA,
    x: width * 0.24,
    duration: reduceMotion ? 1 : 600,
    ease: 'Back.easeOut',
  });

  scene.tweens.add({
    targets: sideB,
    x: width * 0.76,
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
  if (!reduceMotion)
    scene.time.delayedCall(600, () => {
      const clash = scene.add.particles(width / 2, fighterCenterY, 'spark', {
        speed: { min: 150, max: 350 },
        scale: { start: 0.8, end: 0 },
        lifespan: 800,
        quantity: 20,
        tint: [
          ELEMENT_STYLES[fighterA.element].particle,
          ELEMENT_STYLES[fighterB.element].particle,
        ],
        emitting: false,
      });
      clash.setDepth(2001);
      clash.explode(25);
      scene.time.delayedCall(1000, () => clash.destroy());
    });

  // Fade out and transition
  // Reduced motion removes the entrance motion, not the reading time. The old
  // 180ms reduced-motion dwell made the matchup card effectively invisible.
  scene.time.delayedCall(rivalryStakes ? 2600 : 1800, () => {
    scene.cameras.main.fadeOut(200, 255, 247, 232);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      layer.destroy(true);
      onComplete();
    });
  });
}
