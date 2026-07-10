// The client-side pen catalog for Mystery Ink. Shared metadata owns ids, names,
// rarity, colors, and effects; this module keeps the established Draw APIs.

import type { CapsuleRarity } from '../../shared/arena';
import { PEN_CATALOG_ENTRIES } from '../../shared/cosmetics';
import type { CosmeticPenEffect } from '../../shared/cosmetics';

export type PenEffect = CosmeticPenEffect;

export type PenCatalogEntry = {
  id: string;
  name: string;
  rarity: CapsuleRarity;
  effect: PenEffect;
  // One or more hex colors. A solid pen with N colors adds N swatches; a rainbow
  // pen lists its cycle stops; midnight lists its base ink.
  colors: string[];
};

export const PEN_CATALOG: PenCatalogEntry[] = PEN_CATALOG_ENTRIES.map(
  ({ id, name, rarity, effect, colors }) => ({
    id,
    name,
    rarity,
    effect,
    colors: [...colors],
  })
);

export const PEN_BY_ID = new Map<string, PenCatalogEntry>(
  PEN_CATALOG.map((pen) => [pen.id, pen])
);

// The swatch color to SHOW for a pen chip (rainbow/midnight get a representative
// hue; solids use their first color).
export function penSwatchColor(pen: PenCatalogEntry): string {
  if (pen.effect === 'midnight') return pen.colors[0] ?? '#0b0a12';
  return pen.colors[0] ?? '#2b2016';
}

// Rarity -> a small display token (border color + label) for chips + ceremony.
export const RARITY_STYLE: Record<
  CapsuleRarity,
  { color: number; label: string }
> = {
  common: { color: 0xb6a894, label: 'COMMON' },
  rare: { color: 0x4fb0d8, label: 'RARE' },
  epic: { color: 0xffd447, label: 'EPIC' },
};
