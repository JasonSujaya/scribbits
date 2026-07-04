// Central design tokens for the Scribbits client. Portrait-first mobile layout.
// Design resolution is 720x1280; the Scale.FIT mode letterboxes to any device.

import type { Biome, Rarity } from '../../shared/remonsta';

export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

// Minimum touch target in design-space pixels (>= 44 CSS px once scaled).
export const MIN_TOUCH = 88;

export type BiomePalette = {
  skyTop: number;
  skyBottom: number;
  midHills: number;
  ground: number;
  body: number;
  bodyShade: number;
  accent: number;
};

// Warm, sherbet, hand-drawn feel — one palette per biome.
export const BIOME_PALETTES: Record<Biome, BiomePalette> = {
  forest: {
    skyTop: 0xbfe6b4,
    skyBottom: 0x8fd18a,
    midHills: 0x5fa85f,
    ground: 0x3f7a43,
    body: 0x8fd694,
    bodyShade: 0x5aa862,
    accent: 0xffe08a,
  },
  ember: {
    skyTop: 0x3a2130,
    skyBottom: 0x6e2a2f,
    midHills: 0x9c3a2c,
    ground: 0x4a1c1c,
    body: 0xff9a52,
    bodyShade: 0xd8622a,
    accent: 0xffe66b,
  },
  tidepool: {
    skyTop: 0xaef0f0,
    skyBottom: 0x7ad3d8,
    midHills: 0x4fa8c4,
    ground: 0x2f6f96,
    body: 0x7fd8e6,
    bodyShade: 0x4aa6c0,
    accent: 0xcff6ff,
  },
  sky: {
    skyTop: 0xcfd8ff,
    skyBottom: 0xa9b6f0,
    midHills: 0x8a97dd,
    ground: 0x6b76c2,
    body: 0xe8ecff,
    bodyShade: 0xb9c2f2,
    accent: 0xfff2a8,
  },
};

export type RarityStyle = {
  scale: number;
  glow: boolean;
  ringColor: number;
  label: string;
};

export const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  common: { scale: 0.85, glow: false, ringColor: 0xcccccc, label: 'Common' },
  uncommon: { scale: 0.95, glow: false, ringColor: 0x7ed957, label: 'Uncommon' },
  rare: { scale: 1.05, glow: true, ringColor: 0x5b9dff, label: 'Rare' },
  legendary: {
    scale: 1.2,
    glow: true,
    ringColor: 0xffd447,
    label: 'Legendary',
  },
};

// UI colors shared across scenes.
export const UI = {
  panel: 0xfff7e8,
  panelStroke: 0x3a2b1a,
  ink: '#2b2016',
  inkSoft: '#7a6a56',
  cream: '#fff7e8',
  coral: 0xff6b4a,
  coralText: '#ff6b4a',
  progressTrack: 0x2b2016,
  progressFill: 0xff6b4a,
  progressCommunity: 0x5b9dff,
};

export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
