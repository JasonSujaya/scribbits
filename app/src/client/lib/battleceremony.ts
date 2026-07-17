// Battle ceremony utilities — dramatic pre-battle VS screens and post-battle
// result ceremonies. These turn async battles into EVENTS with anticipation.

import { Scene } from 'phaser';
import type * as Phaser from 'phaser';
import type { BattleKind, RivalRunReceipt, Scribbit } from '../../shared/arena';
import { prefersReducedMotion, ROLE_STYLES, UI } from './theme';
import {
  fadeSceneOut,
  label,
  levelBadge,
  paperRoleTag,
  paperWordmark,
  versusBadge,
} from './ui';
import { loadDrawing, fitDrawing, levelOf } from './scribbits';
import { BATTLE_MATCHUP_TITLE_BY_KIND } from './matchupbrief';
import type { FounderRivalryStakesPlan } from './founderchronicle';
import { formatRivalRunBattleLabel } from './rivalrunpresentation';
import { formatRedditUsername } from './redditusername';
import { preloadBattleSoundtrack } from './soundtrack';
import { selectCombatRole } from '../../shared/combat/selection';
import {
  createCombatRoleMatchupRead,
  getCombatRoleContent,
} from '../../shared/combat/roles';

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

// The ceremony is a single readable beat before the replay, not a second
// loading screen. Keep the story version under 1.5 seconds including its fade.
export const VS_CEREMONY_TIMING = Object.freeze({
  fighterEntranceMs: 360,
  badgeDelayMs: 220,
  badgePopMs: 180,
  clashDelayMs: 380,
  clashLifespanMs: 520,
  clashCleanupMs: 600,
  standardDwellMs: 1_200,
  storyDwellMs: 1_320,
  fadeMs: 160,
  reducedMotionTweenMs: 1,
});

type FighterSideOptions = Readonly<{
  fighter: Scribbit;
  startsOnLeft: boolean;
  centerY: number;
}>;

function createFighterSide(
  scene: Scene,
  options: FighterSideOptions
): Phaser.GameObjects.Container {
  const { fighter, startsOnLeft, centerY } = options;
  const role = getCombatRoleContent(selectCombatRole(fighter.stats));
  const roleStyle = ROLE_STYLES[role.id];
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
      roleStyle.soft,
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
  frame.lineStyle(7, roleStyle.color, 1);
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

  side.add(
    label(
      scene,
      0,
      FIGHTER_ART_SIZE / 2 + 18,
      `${role.displayName.toUpperCase()} · ${role.rangeLabel}`,
      17,
      roleStyle.colorText,
      true
    )
  );

  const fighterName = label(
    scene,
    0,
    FIGHTER_ART_SIZE / 2 + 45,
    fighter.name,
    30,
    UI.ink,
    true
  );
  if (fighterName.width > FIGHTER_COLUMN_WIDTH) {
    fighterName.setScale(FIGHTER_COLUMN_WIDTH / fighterName.width);
  }
  side.add(fighterName);
  const fighterUsername = formatRedditUsername(fighter.artist);
  if (fighterUsername) {
    side.add(
      label(
        scene,
        0,
        FIGHTER_ART_SIZE / 2 + 76,
        fighterUsername,
        16,
        UI.inkSoft,
        true
      )
    );
  }
  side.add(
    paperRoleTag(
      scene,
      0,
      FIGHTER_ART_SIZE / 2 + (fighterUsername ? 112 : 98),
      `POWER-UPS ${fighter.powerUpIds?.length ?? 0}/5`,
      { width: 190, fill: UI.tapeAlt }
    )
  );

  return side;
}

// Show a dramatic VS screen before battle. Both fighters slide in from opposite
// sides, element badges clash in the center, then transition to the replay.
export function showVsCeremony(scene: Scene, options: VsCeremonyOptions): void {
  preloadBattleSoundtrack();
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
  const roleA = getCombatRoleContent(selectCombatRole(fighterA.stats));
  const roleB = getCombatRoleContent(selectCombatRole(fighterB.stats));
  const roleMatchup = createCombatRoleMatchupRead(roleA.id, roleB.id);
  const roleAStyle = ROLE_STYLES[roleA.id];
  const roleBStyle = ROLE_STYLES[roleB.id];
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
  splitPaper.fillStyle(roleAStyle.soft, 0.28);
  splitPaper.fillTriangle(0, 0, width * 0.58, 0, 0, height);
  splitPaper.fillStyle(roleBStyle.soft, 0.28);
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
  if (rivalryStakes || rivalRun) {
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
  }

  const matchupTitle = paperWordmark(
    scene,
    width / 2,
    104,
    rivalryStakes?.episodeTitle ?? BATTLE_MATCHUP_TITLE_BY_KIND[battleKind],
    {
      fontSize: rivalryStakes ? 34 : 38,
      maxWidth: width - 92,
      accent: UI.coral,
    }
  );
  layer.add(matchupTitle);

  if (rivalryStakes) {
    const episodeCue = label(
      scene,
      width / 2,
      150,
      rivalryStakes.episodeCue,
      18,
      UI.inkSoft,
      true
    )
      .setWordWrapWidth(width - 120, true)
      .setLineSpacing(-3);
    layer.add(episodeCue);
  }

  if (rivalryStakes || rivalRun) {
    const stakesY = rivalryStakes ? 202 : 170;
    const contextDetail = rivalRun
      ? `${rivalRun.challenge.goal} • SCORE ${rivalRun.score - rivalRun.pointsAwarded} • ${rivalRun.tier.toUpperCase()} +${rivalRun.winPoints}`
      : (rivalryStakes?.detail ?? 'SERVER-LOCKED BATTLE');
    const stakesStrip = scene.add
      .rectangle(width / 2, stakesY, width - 96, 54, UI.tapeAlt, 0.9)
      .setStrokeStyle(2, UI.inkHex, 0.52)
      .setAngle(0.3);
    const stakesDetail = label(
      scene,
      width / 2,
      stakesY,
      contextDetail,
      19,
      UI.ink,
      true
    )
      .setWordWrapWidth(width - 132, true)
      .setLineSpacing(-2);
    layer.add([stakesStrip, stakesDetail]);
  }

  const mechanicsY = height - 300;
  const matchupY = mechanicsY - 118;
  const roleMatchupStrip = scene.add
    .rectangle(width / 2, matchupY, width - 120, 76, UI.tapeAlt, 0.94)
    .setStrokeStyle(3, UI.inkHex, 0.45)
    .setAngle(-0.4);
  const roleMatchupLabel = label(
    scene,
    width / 2,
    matchupY - 13,
    roleMatchup.label,
    23,
    UI.ink,
    true
  );
  const roleMatchupDetail = label(
    scene,
    width / 2,
    matchupY + 18,
    roleMatchup.detail,
    15,
    UI.inkSoft,
    true
  );
  if (roleMatchupDetail.width > width - 154) {
    roleMatchupDetail.setScale((width - 154) / roleMatchupDetail.width);
  }
  const mechanicsCard = scene.add
    .rectangle(width / 2, mechanicsY, width - 88, 152, UI.creamHex, 0.96)
    .setStrokeStyle(3, UI.inkHex, 0.3);
  const leftMechanicsAccent = scene.add.rectangle(
    52,
    mechanicsY,
    12,
    96,
    roleAStyle.color,
    0.9
  );
  const rightMechanicsAccent = scene.add.rectangle(
    width - 52,
    mechanicsY,
    12,
    96,
    roleBStyle.color,
    0.9
  );
  const receiptAView = label(
    scene,
    width / 2,
    mechanicsY - 32,
    `${fighterA.name.toUpperCase()}: ${roleA.weaponName.toUpperCase()} · ${roleA.basicAttackName} → ${roleA.signatureName}`,
    21,
    roleAStyle.colorText,
    true
  );
  const receiptBView = label(
    scene,
    width / 2,
    mechanicsY + 32,
    `${fighterB.name.toUpperCase()}: ${roleB.weaponName.toUpperCase()} · ${roleB.basicAttackName} → ${roleB.signatureName}`,
    21,
    roleBStyle.colorText,
    true
  );
  const receiptWidth = width - 144;
  if (receiptAView.width > receiptWidth) {
    receiptAView.setScale(receiptWidth / receiptAView.width);
  }
  if (receiptBView.width > receiptWidth) {
    receiptBView.setScale(receiptWidth / receiptBView.width);
  }
  layer.add([
    roleMatchupStrip,
    roleMatchupLabel,
    roleMatchupDetail,
    mechanicsCard,
    leftMechanicsAccent,
    rightMechanicsAccent,
    receiptAView,
    receiptBView,
  ]);

  // Fighter A (left side)
  const sideA = createFighterSide(scene, {
    fighter: fighterA,
    startsOnLeft: true,
    centerY: fighterCenterY,
  });
  layer.add(sideA);

  // Fighter B (right side)
  const sideB = createFighterSide(scene, {
    fighter: fighterB,
    startsOnLeft: false,
    centerY: fighterCenterY,
  });
  layer.add(sideB);

  // VS badge in the center
  const matchupBadge = versusBadge(scene, width / 2, fighterCenterY, {
    size: 108,
  });
  matchupBadge.setScale(0);
  layer.add(matchupBadge);

  // Animate fighters sliding in
  scene.tweens.add({
    targets: sideA,
    x: width * 0.24,
    duration: reduceMotion
      ? VS_CEREMONY_TIMING.reducedMotionTweenMs
      : VS_CEREMONY_TIMING.fighterEntranceMs,
    ease: 'Back.easeOut',
  });

  scene.tweens.add({
    targets: sideB,
    x: width * 0.76,
    duration: reduceMotion
      ? VS_CEREMONY_TIMING.reducedMotionTweenMs
      : VS_CEREMONY_TIMING.fighterEntranceMs,
    ease: 'Back.easeOut',
  });

  // VS badge pops in after fighters arrive
  scene.time.delayedCall(
    reduceMotion
      ? VS_CEREMONY_TIMING.reducedMotionTweenMs
      : VS_CEREMONY_TIMING.badgeDelayMs,
    () => {
      scene.tweens.add({
        targets: matchupBadge,
        scale: 1,
        duration: reduceMotion
          ? VS_CEREMONY_TIMING.reducedMotionTweenMs
          : VS_CEREMONY_TIMING.badgePopMs,
        ease: 'Back.easeOut',
      });
      if (!reduceMotion) scene.cameras.main.shake(200, 0.008);
    }
  );

  // Element clash effect
  if (!reduceMotion)
    scene.time.delayedCall(VS_CEREMONY_TIMING.clashDelayMs, () => {
      const clash = scene.add.particles(width / 2, fighterCenterY, 'spark', {
        speed: { min: 150, max: 350 },
        scale: { start: 0.8, end: 0 },
        lifespan: VS_CEREMONY_TIMING.clashLifespanMs,
        quantity: 20,
        tint: [roleAStyle.color, roleBStyle.color],
        emitting: false,
      });
      clash.setDepth(2001);
      clash.explode(25);
      scene.time.delayedCall(VS_CEREMONY_TIMING.clashCleanupMs, () =>
        clash.destroy()
      );
    });

  // Fade out and transition
  // Reduced motion removes the entrance motion, not the reading time.
  const dwellMs =
    rivalryStakes || rivalRun
      ? VS_CEREMONY_TIMING.storyDwellMs
      : VS_CEREMONY_TIMING.standardDwellMs;
  scene.time.delayedCall(dwellMs, () => {
    fadeSceneOut(
      scene,
      reduceMotion
        ? VS_CEREMONY_TIMING.reducedMotionTweenMs
        : VS_CEREMONY_TIMING.fadeMs
    );
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      layer.destroy(true);
      onComplete();
    });
  });
}
