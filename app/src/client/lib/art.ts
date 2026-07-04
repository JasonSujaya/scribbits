// Procedural art bakers. No image assets exist yet, so we bake textures from
// Phaser Graphics into the texture cache during Preloader. Every function is
// deterministic and idempotent — it skips work if the texture key already
// exists. The player drawings ARE the art; these helpers just frame them.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import { ELEMENT_STYLES } from './theme';

// A one-pixel white dot for particles/tinting.
export function generateDotTexture(scene: Scene): void {
  const key = 'dot';
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(8, 8, 8);
  graphics.generateTexture(key, 16, 16);
  graphics.destroy();
}

// A soft five-point spark for crits/celebration bursts.
export function generateSparkTexture(scene: Scene): void {
  const key = 'spark';
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  const cx = 24;
  const cy = 24;
  graphics.fillStyle(0xffffff, 1);
  const points: Phaser.Math.Vector2[] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    const radius = index % 2 === 0 ? 22 : 8;
    points.push(
      new Phaser.Math.Vector2(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
    );
  }
  graphics.fillPoints(points, true);
  graphics.generateTexture(key, 48, 48);
  graphics.destroy();
}

// The nine-slice UI panel source (dark border, cream fill).
export function generatePanelTexture(scene: Scene): void {
  const key = 'ui-panel';
  if (scene.textures.exists(key)) return;
  const size = 48;
  const corner = 16;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0x2b2016, 1);
  graphics.fillRoundedRect(2, 2, size - 4, size - 4, corner);
  graphics.fillStyle(0xfff7e8, 1);
  graphics.fillRoundedRect(0, 0, size - 4, size - 4, corner);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

// Baseline textures every scene relies on.
export function generateCoreArt(scene: Scene): void {
  generateDotTexture(scene);
  generateSparkTexture(scene);
  generatePanelTexture(scene);
}

// A small element badge chip texture (used where drawing textures aren't handy).
export function generateElementBadge(scene: Scene, element: Element): void {
  const key = `badge-${element}`;
  if (scene.textures.exists(key)) return;
  const style = ELEMENT_STYLES[element];
  const size = 96;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0x2b2016, 1);
  graphics.fillCircle(size / 2, size / 2, size / 2);
  graphics.fillStyle(style.primary, 1);
  graphics.fillCircle(size / 2, size / 2, size / 2 - 5);
  graphics.fillStyle(style.soft, 0.55);
  graphics.fillCircle(size / 2 - 12, size / 2 - 14, size / 5);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

export function generateAllElementBadges(scene: Scene): void {
  (Object.keys(ELEMENT_STYLES) as Element[]).forEach((element) =>
    generateElementBadge(scene, element)
  );
}
