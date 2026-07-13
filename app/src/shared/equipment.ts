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

export type EquipGearRequest = Readonly<{
  scribbitId: string;
  category: EquipmentCategory;
  slotIndex: 0 | 1;
  gearId: string | null;
}>;

const emptySlots = (): EquipmentSlots => Object.freeze([null, null]);

export function createEmptyEquipmentLoadout(): EquipmentLoadout {
  return Object.freeze({
    weapon: emptySlots(),
    armor: emptySlots(),
    shoes: emptySlots(),
    accessory: emptySlots(),
  });
}

export function cloneEquipmentLoadout(
  loadout: EquipmentLoadout
): EquipmentLoadout {
  return Object.freeze({
    weapon: Object.freeze([...loadout.weapon]) as EquipmentSlots,
    armor: Object.freeze([...loadout.armor]) as EquipmentSlots,
    shoes: Object.freeze([...loadout.shoes]) as EquipmentSlots,
    accessory: Object.freeze([...loadout.accessory]) as EquipmentSlots,
  });
}

export function equipGearInLoadout(
  loadout: EquipmentLoadout,
  request: Pick<EquipGearRequest, 'category' | 'slotIndex' | 'gearId'>
): EquipmentLoadout {
  const projectedSlots: Record<
    EquipmentCategory,
    [string | null, string | null]
  > = {
    weapon: [...loadout.weapon],
    armor: [...loadout.armor],
    shoes: [...loadout.shoes],
    accessory: [...loadout.accessory],
  };

  if (request.gearId !== null) {
    for (const category of EQUIPMENT_CATEGORIES) {
      for (let slotIndex = 0; slotIndex < 2; slotIndex += 1) {
        if (projectedSlots[category][slotIndex] === request.gearId) {
          projectedSlots[category][slotIndex] = null;
        }
      }
    }
  }

  projectedSlots[request.category][request.slotIndex] = request.gearId;
  return cloneEquipmentLoadout(projectedSlots);
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
