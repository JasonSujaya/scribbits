// Shared equipment vocabulary and loadout shape. Catalog metadata lives in
// cosmetics.ts; this dependency-leaf module owns slot counts and structural
// validation so future server persistence and client UI cannot invent their
// own loadout rules.

export const EQUIPMENT_CATEGORIES = Object.freeze([
  'weapon',
  'armor',
  'shoes',
  'accessory',
] as const);

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
export const EQUIPMENT_SLOTS_PER_CATEGORY = 2 as const;
export const EQUIPMENT_CAPACITY: Readonly<Record<EquipmentCategory, 2>> =
  Object.freeze({
    weapon: EQUIPMENT_SLOTS_PER_CATEGORY,
    armor: EQUIPMENT_SLOTS_PER_CATEGORY,
    shoes: EQUIPMENT_SLOTS_PER_CATEGORY,
    accessory: EQUIPMENT_SLOTS_PER_CATEGORY,
  });
export const MAX_EQUIPPED_ITEMS =
  EQUIPMENT_CATEGORIES.length * EQUIPMENT_SLOTS_PER_CATEGORY;

export type EquipmentSlots = readonly [string | null, string | null];
export type EquipmentLoadout = Readonly<
  Record<EquipmentCategory, EquipmentSlots>
>;

const emptySlots = (): EquipmentSlots => Object.freeze([null, null]);

export function createEmptyEquipmentLoadout(): EquipmentLoadout {
  return Object.freeze({
    weapon: emptySlots(),
    armor: emptySlots(),
    shoes: emptySlots(),
    accessory: emptySlots(),
  });
}

export function isEquipmentCategory(
  value: unknown
): value is EquipmentCategory {
  return EQUIPMENT_CATEGORIES.includes(value as EquipmentCategory);
}

export function parseEquipmentLoadout(
  value: unknown
): EquipmentLoadout | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== EQUIPMENT_CATEGORIES.length ||
    keys.some((key) => !isEquipmentCategory(key))
  ) {
    return undefined;
  }
  const seenCatalogIds = new Set<string>();
  const parsed = {} as Record<EquipmentCategory, EquipmentSlots>;

  for (const category of EQUIPMENT_CATEGORIES) {
    const slots = record[category];
    if (
      !Array.isArray(slots) ||
      slots.length !== EQUIPMENT_SLOTS_PER_CATEGORY
    ) {
      return undefined;
    }

    const parsedSlots: [string | null, string | null] = [null, null];
    for (let index = 0; index < EQUIPMENT_SLOTS_PER_CATEGORY; index += 1) {
      const catalogId = slots[index];
      if (catalogId === null) continue;
      if (
        typeof catalogId !== 'string' ||
        !/^[a-z0-9-]{2,64}$/.test(catalogId) ||
        seenCatalogIds.has(catalogId)
      ) {
        return undefined;
      }
      seenCatalogIds.add(catalogId);
      parsedSlots[index] = catalogId;
    }
    parsed[category] = Object.freeze(parsedSlots);
  }

  return Object.freeze(parsed);
}

export function equippedItemCount(loadout: EquipmentLoadout): number {
  return EQUIPMENT_CATEGORIES.reduce((count, category) => {
    return (
      count + loadout[category].filter((catalogId) => catalogId !== null).length
    );
  }, 0);
}
