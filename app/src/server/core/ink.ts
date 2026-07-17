import type { CapsuleRarity } from '../../shared/arena';
import type { EquipmentCategory } from '../../shared/equipment';
import {
  ACCESSORY_CATALOG_ENTRIES,
  BRUSH_CATALOG_ENTRIES,
  DRAWING_INK_CATALOG_ENTRIES,
  PEN_CATALOG_ENTRIES,
  TITLE_CATALOG_ENTRIES,
  type CosmeticBrushEffect,
  type CosmeticPenEffect,
} from '../../shared/cosmetics';

export type InkAccessoryCatalogEntry = {
  id: string;
  kind: 'accessory';
  rarity: CapsuleRarity;
  name: string;
  description: string;
  category: EquipmentCategory;
  capsuleEligible?: boolean;
};

export type InkPenCatalogEntry = {
  id: string;
  kind: 'pen';
  rarity: CapsuleRarity;
  name: string;
  description: string;
  colors: string[];
  capsuleEligible?: boolean;
};

export type InkTitleCatalogEntry = {
  id: string;
  kind: 'title';
  rarity: CapsuleRarity;
  name: string;
  description: string;
  capsuleEligible?: boolean;
};

export type InkDrawingInkCatalogEntry = {
  id: string;
  kind: 'drawing-ink';
  rarity: CapsuleRarity;
  name: string;
  description: string;
  colors: string[];
  effect: CosmeticPenEffect;
  capsuleEligible?: boolean;
};

export type InkBrushCatalogEntry = {
  id: string;
  kind: 'brush';
  rarity: CapsuleRarity;
  name: string;
  description: string;
  effect: CosmeticBrushEffect;
  capsuleEligible?: boolean;
};

export type InkConsumableCatalogEntry =
  | InkAccessoryCatalogEntry
  | InkDrawingInkCatalogEntry
  | InkBrushCatalogEntry;

export type InkPermanentCatalogEntry =
  | InkPenCatalogEntry
  | InkTitleCatalogEntry;

export type InkCatalogEntry =
  | InkConsumableCatalogEntry
  | InkPermanentCatalogEntry;

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

export const INK_DRAWING_INK_CATALOG: InkDrawingInkCatalogEntry[] =
  DRAWING_INK_CATALOG_ENTRIES.map(({ colors, ...entry }) => ({
    ...entry,
    colors: [...colors],
  }));

export const INK_BRUSH_CATALOG: InkBrushCatalogEntry[] =
  BRUSH_CATALOG_ENTRIES.map((entry) => ({ ...entry }));

export const INK_CATALOG: InkCatalogEntry[] = [
  ...INK_ACCESSORY_CATALOG,
  ...INK_PEN_CATALOG,
  ...INK_TITLE_CATALOG,
  ...INK_DRAWING_INK_CATALOG,
  ...INK_BRUSH_CATALOG,
];

export const INK_CAPSULE_CATALOG: InkCatalogEntry[] = INK_CATALOG.filter(
  (entry) => entry.capsuleEligible !== false
);

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

export const isDrawingInkCatalogEntry = (
  entry: InkCatalogEntry | undefined
): entry is InkDrawingInkCatalogEntry => {
  return entry?.kind === 'drawing-ink';
};

export const isBrushCatalogEntry = (
  entry: InkCatalogEntry | undefined
): entry is InkBrushCatalogEntry => {
  return entry?.kind === 'brush';
};

export const isConsumableCatalogEntry = (
  entry: InkCatalogEntry | undefined
): entry is InkConsumableCatalogEntry => {
  return (
    entry?.kind === 'accessory' ||
    entry?.kind === 'drawing-ink' ||
    entry?.kind === 'brush'
  );
};

export const isPermanentCatalogEntry = (
  entry: InkCatalogEntry | undefined
): entry is InkPermanentCatalogEntry => {
  return entry?.kind === 'pen' || entry?.kind === 'title';
};
