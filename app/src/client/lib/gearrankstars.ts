import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  NORMAL_GEAR_STAR_COUNT,
  RED_STAR_GEAR_RANK,
  type GearRank,
} from '../../shared/arena';
import { UI } from './theme';

const SILVER_STAR_COLOR = 0xb8c0cc;
const GOLD_STAR_COLOR = UI.gold;
const RED_STAR_COLOR = 0xe7463f;

const normalStarColor = (rank: GearRank): number => {
  return rank <= 3 ? SILVER_STAR_COLOR : GOLD_STAR_COLOR;
};

const starPoints = (scale: number): Phaser.Math.Vector2[] => {
  const points: Phaser.Math.Vector2[] = [];
  for (let point = 0; point < 10; point += 1) {
    const radius = (point % 2 === 0 ? 13 : 6) * scale;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    points.push(
      new Phaser.Math.Vector2(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      )
    );
  }
  return points;
};

const addStar = (
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number,
  earned: boolean,
  scale: number,
  angle: number,
  special = false
): void => {
  const points = starPoints(special ? scale * 1.16 : scale);
  if (earned) {
    const shadow = scene.add.graphics({
      x: x + 2.5 * scale,
      y: y + 3 * scale,
    });
    shadow.fillStyle(0x9b754d, 0.48);
    shadow.fillPoints(points, true);
    shadow.setAngle(angle);
    parent.add(shadow);
  }

  const star = scene.add.graphics({ x, y });
  star.fillStyle(color, earned ? 1 : 0.14);
  star.fillPoints(points, true);
  star.lineStyle(
    (special ? 3.2 : 2.6) * scale,
    earned ? UI.inkHex : color,
    earned ? 1 : 0.8
  );
  star.strokePoints(points, true);
  if (special) {
    star.fillStyle(UI.gold, 1);
    star.fillCircle(0, 0, 2.2 * scale);
  }
  star.setAngle(angle);
  parent.add(star);
};

export function gearRankStars(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  rank: GearRank,
  scale = 1
): Phaser.GameObjects.Container {
  const stars = scene.add.container(x, y);
  const spacing = 30 * scale;
  const isRedStar = rank === RED_STAR_GEAR_RANK;
  const redStarGap = 8 * scale;
  const normalRowWidth = (NORMAL_GEAR_STAR_COUNT - 1) * spacing;
  const fullRowWidth = isRedStar
    ? NORMAL_GEAR_STAR_COUNT * spacing + redStarGap
    : normalRowWidth;
  const startX = -fullRowWidth / 2;
  const angles = [-4, 2, 0, -2, 4] as const;
  const normalColor = normalStarColor(rank);

  for (let index = 0; index < NORMAL_GEAR_STAR_COUNT; index += 1) {
    addStar(
      scene,
      stars,
      startX + index * spacing,
      (index % 2 === 0 ? -1.5 : 1.5) * scale,
      normalColor,
      index < rank,
      scale,
      angles[index] ?? 0
    );
  }

  if (isRedStar) {
    addStar(
      scene,
      stars,
      startX + NORMAL_GEAR_STAR_COUNT * spacing + redStarGap,
      0,
      RED_STAR_COLOR,
      true,
      scale,
      6,
      true
    );
  }

  parent.add(stars);
  return stars;
}
