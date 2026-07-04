// Central design tokens for the Scribbits Arena client. Portrait-first mobile
// layout. Design resolution is 720x1280; Scale.FIT letterboxes to any device.

import type { Element } from '../../shared/arena';

export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

// Minimum touch target in design-space pixels (>= 44 CSS px once scaled).
export const MIN_TOUCH = 88;

// UI colors shared across scenes — warm, hand-drawn, cream-paper feel.
export const UI = {
  panel: 0xfff7e8,
  panelStroke: 0x3a2b1a,
  ink: '#2b2016',
  inkSoft: '#7a6a56',
  cream: '#fff7e8',
  creamHex: 0xfff7e8,
  paper: 0xfdf3df, // sketchbook page
  coral: 0xff6b4a,
  coralText: '#ff6b4a',
  gold: 0xffd447,
  goldText: '#f0b000',
  progressTrack: 0x2b2016,
  progressFill: 0xff6b4a,
  progressCommunity: 0x5b9dff,
} as const;

// Each element gets a signature hue family used for badges, FX, and stat bars.
export type ElementStyle = {
  label: string;
  emoji: string;
  primary: number; // hex color number
  primaryText: string; // css hex string
  soft: number; // lighter tint for fills
  particle: number; // particle tint
};

export const ELEMENT_STYLES: Record<Element, ElementStyle> = {
  ember: {
    label: 'Ember',
    emoji: '🔥',
    primary: 0xff6b3d,
    primaryText: '#ff6b3d',
    soft: 0xffb08a,
    particle: 0xffcf6b,
  },
  tide: {
    label: 'Tide',
    emoji: '🌊',
    primary: 0x2f9fd8,
    primaryText: '#2f9fd8',
    soft: 0x8fd8ef,
    particle: 0xbfefff,
  },
  moss: {
    label: 'Moss',
    emoji: '🌿',
    primary: 0x4faa4f,
    primaryText: '#4faa4f',
    soft: 0xa8dd8f,
    particle: 0xd6f6b0,
  },
  storm: {
    label: 'Storm',
    emoji: '⚡',
    primary: 0x8a5cd8,
    primaryText: '#8a5cd8',
    soft: 0xc9b0f2,
    particle: 0xfff2a8,
  },
};

// Stat bar colors — one per stat, consistent everywhere stats are shown.
export const STAT_STYLES = {
  chonk: { label: 'CHONK', emoji: '🫧', color: 0xff8a5c, colorText: '#ff8a5c' },
  spike: { label: 'SPIKE', emoji: '🌵', color: 0xe8555c, colorText: '#e8555c' },
  zip: { label: 'ZIP', emoji: '💨', color: 0x4fb0d8, colorText: '#4fb0d8' },
  charm: { label: 'CHARM', emoji: '✨', color: 0xc06be0, colorText: '#c06be0' },
} as const;

export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
