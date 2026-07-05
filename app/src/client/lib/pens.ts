// The client-side pen catalog for Mystery Ink. A pen id (server-owned, unlocked
// via capsule pulls) maps to one or more palette swatches. Most pens are plain
// color sets; two are special "effect" pens the draw canvas renders differently:
//   - rainbow: a hue-cycling stroke (color changes along the line)
//   - midnight: near-black ink with tiny white specks flecked over the stroke
// The Draw scene renders every unlocked pen as extra swatches, and every LOCKED
// pen as a ghosted 🔒 slot that deep-links to the capsule machine.

import type { CapsuleRarity } from '../../shared/arena';

export type PenEffect = 'solid' | 'rainbow' | 'midnight';

export type PenCatalogEntry = {
  id: string;
  name: string;
  rarity: CapsuleRarity;
  effect: PenEffect;
  // One or more hex colors. A solid pen with N colors adds N swatches; a rainbow
  // pen lists its cycle stops; midnight lists its base ink.
  colors: string[];
};

// The full catalog, keyed by id. Ids match the server's capsule drop ids so an
// unlocked id resolves straight to a palette entry. Ordered by rarity for a
// pleasing locked-slot layout (aspiration climbs as you scroll the palette).
export const PEN_CATALOG: PenCatalogEntry[] = [
  {
    id: 'warm-greys',
    name: 'Warm Greys',
    rarity: 'common',
    effect: 'solid',
    colors: ['#8a7f6d', '#b6a894', '#d8ccb7'],
  },
  {
    id: 'pastel-set',
    name: 'Pastel Set',
    rarity: 'common',
    effect: 'solid',
    colors: ['#f6a6c9', '#b9e4c9', '#b8d7ff', '#ffe29a', '#cdb7f6'],
  },
  {
    id: 'autumn-set',
    name: 'Autumn Set',
    rarity: 'common',
    effect: 'solid',
    colors: ['#7a3418', '#b75a25', '#d99a3d', '#8e6f38', '#4d3a24'],
  },
  {
    id: 'ocean-set',
    name: 'Ocean Set',
    rarity: 'common',
    effect: 'solid',
    colors: ['#063b5b', '#0c6e91', '#1597a5', '#5fc9c4', '#c7f3ed'],
  },
  {
    id: 'gold-pen',
    name: 'Gold Pen',
    rarity: 'rare',
    effect: 'solid',
    colors: ['#f0b000', '#ffd447'],
  },
  {
    id: 'neon-set',
    name: 'Neon Set',
    rarity: 'rare',
    effect: 'solid',
    colors: ['#39ff14', '#00f5ff', '#ff2bd6', '#fff200', '#ff5f1f'],
  },
  {
    id: 'rainbow-crayon',
    name: 'Rainbow Crayon',
    rarity: 'epic',
    effect: 'rainbow',
    // Cycle stops (rendered as a moving hue along the stroke).
    colors: ['#ff5a3d', '#ff9a3d', '#f2cf3d', '#4faa4f', '#3ba0e0', '#8a5cd8'],
  },
  {
    id: 'midnight-ink',
    name: 'Midnight Ink',
    rarity: 'epic',
    effect: 'midnight',
    colors: ['#0b0a12'], // near-black; white specks are rendered on top
  },
];

export const PEN_BY_ID = new Map<string, PenCatalogEntry>(
  PEN_CATALOG.map((pen) => [pen.id, pen])
);

// The swatch color to SHOW for a pen chip (rainbow/midnight get a representative
// hue; solids use their first color).
export function penSwatchColor(pen: PenCatalogEntry): string {
  if (pen.effect === 'midnight') return pen.colors[0] ?? '#0b0a12';
  return pen.colors[0] ?? '#2b2016';
}

// Rarity → a small display token (border color + label) for chips + ceremony.
export const RARITY_STYLE: Record<CapsuleRarity, { color: number; label: string }> = {
  common: { color: 0xb6a894, label: 'COMMON' },
  rare: { color: 0x4fb0d8, label: 'RARE' },
  epic: { color: 0xffd447, label: 'EPIC' },
};
