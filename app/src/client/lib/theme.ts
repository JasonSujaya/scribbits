// Central design tokens for the Scribbits Arena client. Portrait-first mobile
// layout. Design resolution is 720x1280; Scale.FIT letterboxes to any device.

import type { Element } from '../../shared/arena';

export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

// Minimum touch target in design-space pixels (>= 44 CSS px once scaled).
export const MIN_TOUCH = 88;

// Consistent spacing rhythm (design-space px). Every gap/pad snaps to these so
// the whole app breathes on one grid. 8 is the base unit.
export const SPACE = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
} as const;

// Screen safe margins so nothing kisses the letterbox edge.
export const EDGE = 30; // left/right page margin
export const TOP_SAFE = 40; // top bar lives above this
export const NAV_SAFE = 128; // bottom space reserved for the docked app nav

// Three type sizes + a display treatment. Keep the ladder short on purpose so
// hierarchy stays legible: DISPLAY (hand-lettered headers), TITLE, BODY, CAPTION.
// Sizes are design-space px on the 720-wide canvas, which Scale.FIT shrinks to
// ~0.55x on a phone-width Reddit webview — so these are tuned up to stay legible
// once letterboxed (caption ~13px CSS, body ~15px CSS on a 390px viewport).
export const TYPE = {
  display: 60,
  title: 36,
  body: 28,
  caption: 24,
} as const;

// UI colors shared across scenes — warm, hand-drawn, cream-paper feel. The whole
// app is a sketchbook: cream pages, dark-ink lines, one coral accent, element hues.
export const UI = {
  panel: 0xfff7e8,
  panelStroke: 0x3a2b1a,
  ink: '#2b2016',
  inkHex: 0x2b2016,
  inkSoft: '#5f4f3b',
  inkSoftHex: 0x5f4f3b,
  cream: '#fff7e8',
  creamHex: 0xfff7e8,
  paper: 0xfdf3df, // sketchbook page
  paperText: '#fdf3df',
  // Page background is a warm desk under the sketchbook, not cold dark-mode purple.
  deskHex: 0x2a2118,
  desk: '#2a2118',
  deskSoft: '#3a2f22',
  coral: 0xff6b4a,
  coralText: '#b7351d',
  coralDeep: 0xe0512f,
  gold: 0xffd447,
  goldHex: 0xffd447,
  goldText: '#8a5700',
  tape: 0xf7e6b0, // translucent washi-tape yellow
  tapeAlt: 0xbfd8e0, // blue tape variant
  progressTrack: 0x2b2016,
  progressFill: 0xff6b4a,
  progressCommunity: 0x5b9dff,
} as const;

// Mood layer (Tamagotchi). Each mood gets an emoji + a one-word vibe + the
// care action that fixes it, so roster cards can nudge the player.
export type MoodStyle = { emoji: string; label: string; color: string };
export const MOOD_STYLES = {
  happy: { emoji: '😊', label: 'happy', color: '#4faa4f' },
  hungry: { emoji: '🤤', label: 'hungry', color: '#ff8a3d' },
  sleepy: { emoji: '😴', label: 'sleepy', color: '#8a5cd8' },
  pumped: { emoji: '😤', label: 'pumped', color: '#ff5a3d' },
} as const;

// Care actions — the three buttons on every roster card.
export const CARE_STYLES = {
  feed: { emoji: '🍓', label: 'Feed', color: 0xff6b4a },
  pat: { emoji: '✋', label: 'Pat', color: 0x4faa4f },
  train: { emoji: '🏋️', label: 'Train', color: 0x5b9dff },
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
    primaryText: '#b7351d',
    soft: 0xffb08a,
    particle: 0xffcf6b,
  },
  tide: {
    label: 'Tide',
    emoji: '🌊',
    primary: 0x2f9fd8,
    primaryText: '#17678f',
    soft: 0x8fd8ef,
    particle: 0xbfefff,
  },
  moss: {
    label: 'Moss',
    emoji: '🌿',
    primary: 0x4faa4f,
    primaryText: '#286f28',
    soft: 0xa8dd8f,
    particle: 0xd6f6b0,
  },
  storm: {
    label: 'Storm',
    emoji: '⚡',
    primary: 0x8a5cd8,
    primaryText: '#6436a8',
    soft: 0xc9b0f2,
    particle: 0xfff2a8,
  },
};

// Stat bar colors — one per stat, consistent everywhere stats are shown.
export const STAT_STYLES = {
  chonk: { label: 'CHONK / HP', emoji: '🫧', color: 0xff8a5c, colorText: '#a73d1f' },
  spike: { label: 'SPIKE / ATK', emoji: '🌵', color: 0xe8555c, colorText: '#a92e37' },
  zip: { label: 'ZIP / SPD', emoji: '💨', color: 0x4fb0d8, colorText: '#176789' },
  charm: { label: 'CHARM / CRIT', emoji: '✨', color: 0xc06be0, colorText: '#7d3a99' },
} as const;

export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const prefersReducedMotion = (): boolean => {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
