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
      new Phaser.Math.Vector2(
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius
      )
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

// A seamless-ish cream paper texture tile with faint pencil grain and tiny ink
// specks. Baked once; every scene's backdrop is this tiled across the screen so
// the whole app sits on one warm sketchbook page instead of flat dark boxes.
export function generatePaperTexture(scene: Scene): void {
  const key = 'paper';
  if (scene.textures.exists(key)) return;
  const size = 256;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  // Warm cream base.
  graphics.fillStyle(0xf7ecd6, 1);
  graphics.fillRect(0, 0, size, size);
  // Faint pencil grain: many low-alpha short strokes.
  for (let index = 0; index < 220; index += 1) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const shade = Math.random() < 0.5 ? 0xe8dcc2 : 0xfff7e8;
    graphics.lineStyle(1, shade, 0.25);
    graphics.beginPath();
    graphics.moveTo(gx, gy);
    graphics.lineTo(
      gx + (Math.random() - 0.5) * 10,
      gy + (Math.random() - 0.5) * 10
    );
    graphics.strokePath();
  }
  // Tiny ink specks.
  for (let index = 0; index < 30; index += 1) {
    graphics.fillStyle(0x7a6a56, 0.12 + Math.random() * 0.1);
    graphics.fillCircle(
      Math.random() * size,
      Math.random() * size,
      Math.random() * 1.4
    );
  }
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

// Tiles the paper texture to fill the whole design surface. Call at the start of
// every scene's build for a consistent handmade page under the content.
export function paperBackdrop(scene: Scene): void {
  generatePaperTexture(scene);
  const { width, height } = scene.scale;
  scene.add
    .tileSprite(0, 0, width, height, 'paper')
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-100);
  // A soft warm vignette so edges recede a touch.
  const vignette = scene.add.graphics().setScrollFactor(0).setDepth(-99);
  vignette.fillStyle(0x2a2118, 0.08);
  vignette.fillRect(0, 0, width, 40);
  vignette.fillRect(0, height - 40, width, 40);
}

// Baseline textures every scene relies on.
export function generateCoreArt(scene: Scene): void {
  generateDotTexture(scene);
  generateSparkTexture(scene);
  generatePanelTexture(scene);
  generatePaperTexture(scene);
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
