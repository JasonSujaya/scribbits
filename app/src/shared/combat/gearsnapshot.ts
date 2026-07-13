import type { GearCombatModifiers, GearCombatSnapshot } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBoundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number
): value is number => {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
};

const isGearId = (value: unknown): value is string => {
  return typeof value === 'string' && /^[a-z0-9-]{2,64}$/.test(value);
};

export function isGearCombatModifiers(
  value: unknown
): value is GearCombatModifiers {
  if (!isRecord(value)) return false;
  return (
    isBoundedInteger(value.damagePermille, 970, 1_030) &&
    isBoundedInteger(value.maximumHitPointsPermille, 970, 1_030) &&
    isBoundedInteger(value.cooldownPermille, 970, 1_030) &&
    isBoundedInteger(value.criticalChanceBonusPermille, 0, 30) &&
    isBoundedInteger(value.telegraphTicksDelta, -2, 2) &&
    isBoundedInteger(value.initialDelayTicksDelta, -2, 2)
  );
}

export function isGearCombatSnapshot(
  value: unknown
): value is GearCombatSnapshot {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.techniques) ||
    value.techniques.length < 1 ||
    value.techniques.length > 4 ||
    !isGearCombatModifiers(value.modifiers)
  ) {
    return false;
  }

  const categories = new Set<string>();
  for (const technique of value.techniques) {
    if (!isRecord(technique)) return false;
    const validSupport =
      (technique.supportGearId === null && technique.supportRank === null) ||
      (isGearId(technique.supportGearId) &&
        isBoundedInteger(technique.supportRank, 1, 6));
    if (
      !['weapon', 'armor', 'shoes', 'accessory'].includes(
        String(technique.category)
      ) ||
      categories.has(String(technique.category)) ||
      !['guard', 'rush', 'focus', 'ready', 'fortune', 'aim'].includes(
        String(technique.effectFamily)
      ) ||
      !isGearId(technique.leadGearId) ||
      !isBoundedInteger(technique.leadRank, 1, 6) ||
      !validSupport ||
      technique.supportGearId === technique.leadGearId
    ) {
      return false;
    }
    categories.add(String(technique.category));
  }
  return true;
}

export function freezeGearCombatSnapshot(
  snapshot: GearCombatSnapshot
): GearCombatSnapshot {
  return Object.freeze({
    version: snapshot.version,
    techniques: Object.freeze(
      snapshot.techniques.map((technique) => Object.freeze({ ...technique }))
    ),
    modifiers: Object.freeze({ ...snapshot.modifiers }),
  });
}
