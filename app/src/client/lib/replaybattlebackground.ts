// Deterministic paper-arena backdrop for Replay. It never reads transcript
// state; the scene supplies the already-selected matchup and shared layout.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { BattleReport, Element } from '../../shared/arena';
import type { ReplayBattleLayout } from './battlepresentation';
import { ELEMENT_STYLES, UI } from './theme';
import { label } from './ui';

const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const stableJitter = (
  seed: number,
  index: number,
  amplitude: number
): number => {
  const mixed = Math.imul(seed ^ (index + 1), 2_654_435_761) >>> 0;
  return ((mixed % 2_001) / 1_000 - 1) * amplitude;
};

const drawCrowdDoodle = (
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  direction: -1 | 1,
  variation: number
): void => {
  const headRadius = 4 + variation * 2;
  graphics.lineStyle(3, UI.inkHex, 0.22);
  graphics.strokeCircle(x, y, headRadius);
  graphics.lineBetween(x, y + headRadius, x, y + 18 + variation * 4);
  graphics.lineBetween(x, y + 10, x + direction * (10 + variation * 5), y + 4);
};

export function drawReplayBattleBackground(
  scene: Scene,
  input: {
    layout: ReplayBattleLayout;
    fighterAElement: Element;
    fighterBElement: Element;
    battleSeed: string;
    battleKind: BattleReport['kind'];
  }
): void {
  const { layout } = input;
  const leftStyle = ELEMENT_STYLES[input.fighterAElement];
  const rightStyle = ELEMENT_STYLES[input.fighterBElement];
  const seed = hashSeed(input.battleSeed);
  const isPractice = input.battleKind === 'practice';
  const centerX = layout.viewportWidth / 2;
  const arenaCenterY = (layout.arenaTop + layout.arenaBottom) / 2;
  const arenaHeight = layout.arenaBottom - layout.arenaTop;
  const graphics = scene.add.graphics().setDepth(-20);

  graphics.fillStyle(UI.deskHex, 1);
  graphics.fillRect(0, 0, layout.viewportWidth, layout.viewportHeight);
  graphics.fillStyle(0x000000, 0.28);
  graphics.fillRoundedRect(
    layout.pageLeft + 8,
    layout.pageTop + 10,
    layout.pageWidth,
    layout.pageHeight,
    30
  );
  graphics.fillStyle(UI.paper, 1);
  graphics.fillRoundedRect(
    layout.pageLeft,
    layout.pageTop,
    layout.pageWidth,
    layout.pageHeight,
    30
  );

  // Opposing brush washes make the matchup visible without tinting the user
  // drawings themselves. A cream halo keeps the active collision area clean.
  const pageRight = layout.pageLeft + layout.pageWidth;
  const pageBottom = layout.pageTop + layout.pageHeight;
  graphics.fillStyle(leftStyle.soft, 0.23);
  graphics.fillTriangle(
    layout.pageLeft,
    layout.arenaTop,
    centerX + 70,
    arenaCenterY,
    layout.pageLeft,
    pageBottom
  );
  graphics.fillStyle(rightStyle.soft, 0.23);
  graphics.fillTriangle(
    pageRight,
    layout.arenaTop,
    centerX - 70,
    arenaCenterY,
    pageRight,
    pageBottom
  );
  graphics.fillStyle(UI.creamHex, 0.72);
  graphics.fillEllipse(
    centerX,
    arenaCenterY,
    layout.pageWidth * 0.78,
    arenaHeight * 0.72
  );

  // Real-time motion lanes replace the old podium/turn framing. Practice gets
  // a faint blue test grid; competitive fights get dashed rush lanes. Both
  // stay subtle enough that player drawings and hit effects remain the focus.
  const laneColor = isPractice ? UI.tapeAlt : UI.gold;
  for (let laneIndex = -2; laneIndex <= 2; laneIndex += 1) {
    const laneY = arenaCenterY + laneIndex * (arenaHeight * 0.11);
    for (
      let dashX = layout.pageLeft + 70;
      dashX < pageRight - 70;
      dashX += 44
    ) {
      graphics.lineStyle(3, laneColor, isPractice ? 0.24 : 0.13);
      graphics.lineBetween(
        dashX,
        laneY,
        Math.min(dashX + 22, pageRight),
        laneY
      );
    }
  }
  if (isPractice) {
    for (let columnIndex = 1; columnIndex < 8; columnIndex += 1) {
      const x = layout.pageLeft + (layout.pageWidth * columnIndex) / 8;
      graphics.lineStyle(2, UI.inkHex, 0.07);
      graphics.lineBetween(x, layout.arenaTop + 42, x, layout.arenaBottom - 30);
    }
  }

  // Faint ink-burst rays and concentric pencil loops imply a shared moving
  // field rather than two turn-taking podiums.
  for (let rayIndex = 0; rayIndex < 16; rayIndex += 1) {
    const angle = (Math.PI * 2 * rayIndex) / 16;
    const innerRadius = 150 + stableJitter(seed, rayIndex, 14);
    const outerRadiusX = layout.pageWidth * 0.45;
    const outerRadiusY = arenaHeight * 0.45;
    graphics.lineStyle(4, rayIndex % 2 === 0 ? UI.gold : UI.coral, 0.1);
    graphics.lineBetween(
      centerX + Math.cos(angle) * innerRadius,
      arenaCenterY + Math.sin(angle) * innerRadius * 0.7,
      centerX + Math.cos(angle) * outerRadiusX,
      arenaCenterY + Math.sin(angle) * outerRadiusY
    );
  }
  [0.46, 0.62, 0.78].forEach((scale, index) => {
    graphics.lineStyle(3, UI.inkHex, 0.11 + index * 0.025);
    graphics.strokeEllipse(
      centerX + stableJitter(seed, 30 + index, 4),
      arenaCenterY + stableJitter(seed, 40 + index, 4),
      layout.pageWidth * scale,
      arenaHeight * scale
    );
  });

  // Deterministic center fold: replaying one battle never changes its backdrop.
  graphics.lineStyle(4, UI.inkHex, 0.13);
  graphics.beginPath();
  for (let pointIndex = 0; pointIndex <= 18; pointIndex += 1) {
    const progress = pointIndex / 18;
    const x = centerX + stableJitter(seed, 80 + pointIndex, 7);
    const y = layout.arenaTop + progress * arenaHeight;
    if (pointIndex === 0) graphics.moveTo(x, y);
    else graphics.lineTo(x, y);
  }
  graphics.strokePath();

  graphics.lineStyle(4, UI.inkHex, 0.18);
  graphics.lineBetween(
    layout.pageLeft + 18,
    layout.arenaTop - 14,
    pageRight - 18,
    layout.arenaTop - 14
  );
  graphics.lineStyle(5, UI.inkHex, 0.68);
  graphics.strokeRoundedRect(
    layout.pageLeft + 5,
    layout.pageTop + 5,
    layout.pageWidth - 10,
    layout.pageHeight - 10,
    26
  );

  // A tiny doodled crowd lives outside the usable combat width.
  for (let crowdIndex = 0; crowdIndex < 9; crowdIndex += 1) {
    const y = layout.arenaTop + 70 + crowdIndex * (arenaHeight / 10);
    const variation = ((seed >>> (crowdIndex % 16)) & 3) / 3;
    drawCrowdDoodle(graphics, layout.pageLeft + 16, y, 1, variation);
    drawCrowdDoodle(
      graphics,
      pageRight - 16,
      y + stableJitter(seed, 120 + crowdIndex, 12),
      -1,
      1 - variation
    );
  }

  scene.add
    .rectangle(layout.pageLeft + 58, layout.pageTop + 4, 96, 34, UI.tape, 0.78)
    .setAngle(-5)
    .setDepth(-19);
  scene.add
    .rectangle(pageRight - 58, layout.pageTop + 4, 96, 34, UI.tapeAlt, 0.78)
    .setAngle(5)
    .setDepth(-19);
  label(
    scene,
    centerX,
    layout.arenaTop + 18,
    isPractice
      ? 'PRACTICE GRID · NO REWARDS · NOTHING SAVED'
      : 'INK ARENA · SERVER-AUTHORED MOTION REPLAY',
    18,
    UI.inkSoft,
    true
  )
    .setAlpha(0.62)
    .setDepth(0);
}
