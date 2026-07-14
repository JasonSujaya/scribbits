// Central design tokens for the Scribbits Arena client. Portrait-first mobile
// layout. Width stays at 720 design pixels; height expands once at boot to the
// host's portrait aspect ratio so tall phones gain real game space, not a dead
// letterbox below the dock.

import type { Element } from '../../shared/arena';
import type { CombatRole } from '../../shared/combat/types';

export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;
export const MAX_DESIGN_HEIGHT = 1680;

export const responsiveDesignHeight = (
  viewportWidth: number,
  viewportHeight: number
): number => {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return DESIGN_HEIGHT;
  }
  const fittedHeight = Math.round(
    (DESIGN_WIDTH * viewportHeight) / viewportWidth
  );
  return Math.min(MAX_DESIGN_HEIGHT, Math.max(DESIGN_HEIGHT, fittedHeight));
};

// Baseline canvas target. Critical 320px actions request 100 design pixels so
// their fitted target remains at least 44 CSS pixels.
export const MIN_TOUCH = 100;

// Screen safe margins so nothing kisses the canvas edge.
export const EDGE = 30; // left/right page margin
export const NAV_SAFE = 144; // preserve content layout above the 124px dock

// Three type sizes + a display treatment. Keep the ladder short on purpose so
// hierarchy stays legible: DISPLAY (hand-lettered headers), TITLE, BODY, CAPTION.
// Sizes are design-space px on the 720-wide canvas, which Scale.FIT shrinks to
// ~0.55x on a phone-width Reddit webview — so these are tuned up to stay legible
// there (caption ~13px CSS, body ~15px CSS on a 390px viewport).
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

// Mood layer (Tamagotchi). Mood stays a concise word + color; semantic artwork
// belongs to the shared paper-icon family rather than platform emoji.
export type MoodStyle = { label: string; color: string };
export const MOOD_STYLES = {
  happy: { label: 'happy', color: '#4faa4f' },
  hungry: { label: 'hungry', color: '#ff8a3d' },
  sleepy: { label: 'sleepy', color: '#8a5cd8' },
  pumped: { label: 'pumped', color: '#ff5a3d' },
} as const;

// Care actions — the three buttons on every roster card.
export const CARE_STYLES = {
  feed: { label: 'Feed', color: 0xff6b4a },
  pat: { label: 'Pat', color: 0x4faa4f },
  train: { label: 'Train', color: 0x5b9dff },
} as const;

// Each element gets a signature hue family used for badges, FX, and stat bars.
export type ElementStyle = {
  label: string;
  primary: number; // hex color number
  primaryText: string; // css hex string
  soft: number; // lighter tint for fills
  particle: number; // particle tint
};

export const ELEMENT_STYLES: Record<Element, ElementStyle> = {
  ember: {
    label: 'Ember',
    primary: 0xff6b3d,
    primaryText: '#b7351d',
    soft: 0xffb08a,
    particle: 0xffcf6b,
  },
  tide: {
    label: 'Tide',
    primary: 0x2f9fd8,
    primaryText: '#17678f',
    soft: 0x8fd8ef,
    particle: 0xbfefff,
  },
  moss: {
    label: 'Moss',
    primary: 0x4faa4f,
    primaryText: '#286f28',
    soft: 0xa8dd8f,
    particle: 0xd6f6b0,
  },
  storm: {
    label: 'Storm',
    primary: 0x8a5cd8,
    primaryText: '#6436a8',
    soft: 0xc9b0f2,
    particle: 0xfff2a8,
  },
};

// Stat bar colors — one per stat, consistent everywhere stats are shown.
export const STAT_STYLES = {
  chonk: {
    label: 'CHONK',
    color: 0xff8a5c,
    colorText: '#a73d1f',
  },
  spike: {
    label: 'SPIKE',
    color: 0xe8555c,
    colorText: '#a92e37',
  },
  zip: {
    label: 'ZIP',
    color: 0x4fb0d8,
    colorText: '#176789',
  },
  charm: {
    label: 'CHARM',
    color: 0xc06be0,
    colorText: '#7d3a99',
  },
} as const;

// Combat roles keep one color identity from matchup cards through live weapon
// silhouettes. Element color remains secondary battle flavor.
export const ROLE_STYLES: Readonly<
  Record<
    CombatRole,
    Readonly<{ color: number; colorText: string; soft: number }>
  >
> = Object.freeze({
  brawler: Object.freeze({
    color: 0xf06f4f,
    colorText: '#a63822',
    soft: 0xf7c3b5,
  }),
  longshot: Object.freeze({
    color: 0x4b78c4,
    colorText: '#315a9d',
    soft: 0xc8d8f2,
  }),
  gunner: Object.freeze({
    color: 0x3b9f72,
    colorText: '#257653',
    soft: 0xbfe3d1,
  }),
  mage: Object.freeze({
    color: 0x8d5ac7,
    colorText: '#67399e',
    soft: 0xd9c5ee,
  }),
});

export const FONT_STACK =
  '"DynaPuff", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// Only these two bundled faces exist. Keeping DOM overlays on the same short
// type ladder as Phaser prevents the browser from synthesizing heavier faces
// that look like a different font.
export const DOM_TYPE = {
  title: {
    fontFamily: FONT_STACK,
    fontSize: `${TYPE.title}px`,
    fontWeight: '700',
    lineHeight: '1.1',
  },
  body: {
    fontFamily: FONT_STACK,
    fontSize: `${TYPE.body}px`,
    fontWeight: '700',
    lineHeight: '1.15',
  },
  caption: {
    fontFamily: FONT_STACK,
    fontSize: `${TYPE.caption}px`,
    fontWeight: '700',
    lineHeight: '1.15',
  },
} as const;

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  const debugReducedMotion =
    window.location.search.includes('debug') &&
    window.location.search.includes('reduce-motion');
  return (
    debugReducedMotion ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
};

/** Keep cosmetic loops off compact/low-power devices; combat motion stays on. */
export const allowsAmbientMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true;
  }
  if (prefersReducedMotion()) return false;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  return !(
    window.innerWidth <= 360 ||
    navigator.hardwareConcurrency <= 4 ||
    (deviceMemory !== undefined && deviceMemory <= 4)
  );
};
