// Procedural placeholder art. No image assets exist yet, so we bake textures
// from Phaser Graphics into the texture cache during Preloader. Every function
// is deterministic given its inputs, and idempotent — it skips work if the
// texture key already exists.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Biome, Rarity, Species } from '../../shared/remonsta';
import { BIOME_PALETTES, RARITY_STYLES } from './theme';

const CREATURE_SIZE = 220; // texture canvas is square, creature centered

// Simple deterministic hash so each species gets a stable, distinct look.
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

// Draws the biome-specific body silhouette centered in the graphics canvas.
function drawBody(
  graphics: Phaser.GameObjects.Graphics,
  biome: Biome,
  bodyColor: number,
  centerX: number,
  centerY: number,
  radius: number
): void {
  graphics.fillStyle(bodyColor, 1);
  switch (biome) {
    case 'forest': {
      // Leafy round blob with two ear-leaves.
      graphics.fillCircle(centerX, centerY, radius);
      graphics.fillEllipse(centerX - radius * 0.7, centerY - radius, radius * 0.6, radius);
      graphics.fillEllipse(centerX + radius * 0.7, centerY - radius, radius * 0.6, radius);
      break;
    }
    case 'ember': {
      // Round body with three flame tips along the top.
      graphics.fillCircle(centerX, centerY, radius);
      for (let index = -1; index <= 1; index += 1) {
        graphics.fillTriangle(
          centerX + index * radius * 0.55 - radius * 0.28,
          centerY - radius * 0.75,
          centerX + index * radius * 0.55 + radius * 0.28,
          centerY - radius * 0.75,
          centerX + index * radius * 0.55,
          centerY - radius * 1.5
        );
      }
      break;
    }
    case 'tidepool': {
      // Droplet: circle body + pointed top.
      graphics.fillCircle(centerX, centerY, radius);
      graphics.fillTriangle(
        centerX - radius * 0.75,
        centerY - radius * 0.55,
        centerX + radius * 0.75,
        centerY - radius * 0.55,
        centerX,
        centerY - radius * 1.7
      );
      break;
    }
    case 'sky': {
      // Cloud puff: several overlapping circles.
      graphics.fillCircle(centerX, centerY, radius * 0.9);
      graphics.fillCircle(centerX - radius * 0.8, centerY + radius * 0.15, radius * 0.6);
      graphics.fillCircle(centerX + radius * 0.8, centerY + radius * 0.15, radius * 0.6);
      graphics.fillCircle(centerX - radius * 0.35, centerY - radius * 0.6, radius * 0.55);
      graphics.fillCircle(centerX + radius * 0.35, centerY - radius * 0.6, radius * 0.55);
      break;
    }
  }
}

// Generates one creature texture keyed by species.spriteKey.
export function generateCreatureTexture(scene: Scene, species: Species): void {
  const key = species.spriteKey;
  if (scene.textures.exists(key)) return;

  const palette = BIOME_PALETTES[species.biome];
  const rarityStyle = RARITY_STYLES[species.rarity];
  const seed = hashString(species.id);

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  const center = CREATURE_SIZE / 2;
  const baseRadius = 62 * rarityStyle.scale;

  // Legendary / rare glow ring behind the body.
  if (rarityStyle.glow) {
    for (let ring = 4; ring >= 1; ring -= 1) {
      graphics.fillStyle(rarityStyle.ringColor, 0.08 * ring);
      graphics.fillCircle(center, center, baseRadius + ring * 10);
    }
  }

  // Body shadow, body, and a lighter belly highlight.
  drawBody(graphics, species.biome, palette.bodyShade, center, center + 4, baseRadius);
  drawBody(graphics, species.biome, palette.body, center, center, baseRadius);
  graphics.fillStyle(lighten(palette.body, 40), 0.5);
  graphics.fillEllipse(center, center + baseRadius * 0.25, baseRadius * 1.1, baseRadius * 0.8);

  // Eyes — position/spacing wobbled by seed for variety.
  const eyeSpread = baseRadius * (0.32 + ((seed & 0x7) / 7) * 0.12);
  const eyeY = center - baseRadius * 0.12;
  const eyeRadius = baseRadius * 0.16;
  for (const sign of [-1, 1]) {
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(center + sign * eyeSpread, eyeY, eyeRadius);
    graphics.fillStyle(0x2b2016, 1);
    graphics.fillCircle(center + sign * eyeSpread + eyeRadius * 0.2, eyeY, eyeRadius * 0.55);
  }

  // Little smile.
  graphics.lineStyle(4, 0x2b2016, 0.9);
  graphics.beginPath();
  graphics.arc(center, center + baseRadius * 0.32, baseRadius * 0.28, 0.15 * Math.PI, 0.85 * Math.PI, false);
  graphics.strokePath();

  graphics.generateTexture(key, CREATURE_SIZE, CREATURE_SIZE);
  graphics.destroy();
}

// Generates a layered parallax background texture per biome.
// Returns nothing; textures are keyed `bg-<biome>-<layer>`.
export function generateBiomeBackground(scene: Scene, biome: Biome, width: number, height: number): void {
  const palette = BIOME_PALETTES[biome];
  const skyKey = `bg-${biome}-sky`;
  const hillsKey = `bg-${biome}-hills`;
  const groundKey = `bg-${biome}-ground`;

  if (!scene.textures.exists(skyKey)) {
    const sky = scene.make.graphics({ x: 0, y: 0 }, false);
    // Vertical gradient faked with stacked bands.
    const bands = 32;
    for (let index = 0; index < bands; index += 1) {
      const t = index / (bands - 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(palette.skyTop),
        Phaser.Display.Color.ValueToColor(palette.skyBottom),
        bands,
        index
      );
      const value = (color.r << 16) | (color.g << 8) | color.b;
      sky.fillStyle(value, 1);
      sky.fillRect(0, Math.floor(t * height), width, Math.ceil(height / bands) + 1);
    }
    sky.generateTexture(skyKey, width, height);
    sky.destroy();
  }

  if (!scene.textures.exists(hillsKey)) {
    const hills = scene.make.graphics({ x: 0, y: 0 }, false);
    hills.fillStyle(palette.midHills, 1);
    // Rolling hills as overlapping big circles along the bottom.
    const circles = 6;
    for (let index = 0; index <= circles; index += 1) {
      const cx = (width / circles) * index;
      hills.fillCircle(cx, height * 0.72, width * 0.22);
    }
    hills.generateTexture(hillsKey, width, height);
    hills.destroy();
  }

  if (!scene.textures.exists(groundKey)) {
    const ground = scene.make.graphics({ x: 0, y: 0 }, false);
    ground.fillStyle(palette.ground, 1);
    ground.fillRect(0, height * 0.8, width, height * 0.2);
    // A few foreground tufts / stones for depth.
    ground.fillStyle(lighten(palette.ground, 24), 1);
    for (let index = 0; index < 10; index += 1) {
      const x = (width / 10) * index + 20;
      ground.fillEllipse(x, height * 0.86, 60, 26);
    }
    ground.generateTexture(groundKey, width, height);
    ground.destroy();
  }
}

// A soft rounded UI panel texture used as a nine-slice source.
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

// One-pixel white texture used for tinting/particles when we have no art.
export function generateDotTexture(scene: Scene): void {
  const key = 'dot';
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(8, 8, 8);
  graphics.generateTexture(key, 16, 16);
  graphics.destroy();
}

export function generateAllArt(scene: Scene, species: Species[], width: number, height: number): void {
  generateDotTexture(scene);
  generatePanelTexture(scene);
  const biomes: Biome[] = ['forest', 'ember', 'tidepool', 'sky'];
  for (const biome of biomes) {
    generateBiomeBackground(scene, biome, width, height);
  }
  for (const one of species) {
    generateCreatureTexture(scene, one);
  }
}

export type { Rarity };
