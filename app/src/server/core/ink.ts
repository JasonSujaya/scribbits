import type { CapsuleRarity } from '../../shared/arena';
import {
  ACCESSORY_CATALOG_ENTRIES,
  PEN_CATALOG_ENTRIES,
  TITLE_CATALOG_ENTRIES,
} from '../../shared/cosmetics';

export type InkAccessoryCatalogEntry = {
  id: string;
  kind: 'accessory';
  rarity: CapsuleRarity;
  name: string;
  description: string;
};

export type InkPenCatalogEntry = {
  id: string;
  kind: 'pen';
  rarity: CapsuleRarity;
  name: string;
  description: string;
  colors: string[];
};

export type InkTitleCatalogEntry = {
  id: string;
  kind: 'title';
  rarity: CapsuleRarity;
  name: string;
  description: string;
};

export type InkCatalogEntry =
  | InkAccessoryCatalogEntry
  | InkPenCatalogEntry
  | InkTitleCatalogEntry;

// Keep the server-facing shapes stable while shared metadata remains the source.
export const INK_ACCESSORY_CATALOG: InkAccessoryCatalogEntry[] =
  ACCESSORY_CATALOG_ENTRIES.map(({ label: _label, ...entry }) => entry);

export const INK_PEN_CATALOG: InkPenCatalogEntry[] = PEN_CATALOG_ENTRIES.map(
  ({ effect: _effect, colors, ...entry }) => ({
    ...entry,
    colors: [...colors],
  })
);

export const INK_TITLE_CATALOG: InkTitleCatalogEntry[] =
  TITLE_CATALOG_ENTRIES.map((entry) => ({ ...entry }));

export const INK_CATALOG: InkCatalogEntry[] = [
  ...INK_ACCESSORY_CATALOG,
  ...INK_PEN_CATALOG,
  ...INK_TITLE_CATALOG,
];

const inkCatalogById = new Map<string, InkCatalogEntry>(
  INK_CATALOG.map((entry) => [entry.id, entry])
);

export const findInkCatalogEntry = (
  catalogId: string
): InkCatalogEntry | undefined => {
  return inkCatalogById.get(catalogId);
};

export const isAccessoryCatalogEntry = (
  entry: InkCatalogEntry | undefined
): entry is InkAccessoryCatalogEntry => {
  return entry?.kind === 'accessory';
};
