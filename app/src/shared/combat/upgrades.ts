import {
  clampScribbitLevel,
  INK_MOD_ACQUISITION_LEVELS,
  isInkModAcquisitionLevel,
  MAXIMUM_COMBAT_UPGRADES,
  type InkModAcquisitionLevel,
} from '../progression';
import { hashStringToUint32 } from '../stablehash';

export { MAXIMUM_COMBAT_UPGRADES } from '../progression';

export const COMBAT_UPGRADE_IDS = Object.freeze([
  'v1-bold-tip',
  'v1-quick-dry',
  'v1-thick-paper',
  'v1-first-mark',
  'v1-lucky-splash',
  'v1-steady-hand',
] as const);

export type CombatUpgradeId = (typeof COMBAT_UPGRADE_IDS)[number];

export type ScribbitUpgrade = Readonly<{
  id: CombatUpgradeId;
  acquiredAtLevel: InkModAcquisitionLevel;
}>;

export type CombatUpgradeDefinition = Readonly<{
  id: CombatUpgradeId;
  name: string;
  shortName: string;
  description: string;
  tag: 'offense' | 'defense' | 'mobility' | 'utility';
  damagePermille?: number;
  maximumHitPointsPermille?: number;
  cooldownPermille?: number;
  criticalChanceBonusPermille?: number;
  telegraphTicksDelta?: number;
  initialDelayTicksDelta?: number;
}>;

export type CombatUpgradeModifiers = Readonly<{
  damagePermille: number;
  maximumHitPointsPermille: number;
  cooldownPermille: number;
  criticalChanceBonusPermille: number;
  telegraphTicksDelta: number;
  initialDelayTicksDelta: number;
}>;

export type StoredScribbitUpgradeResolution =
  | Readonly<{ status: 'valid'; upgrades: readonly ScribbitUpgrade[] }>
  | Readonly<{ status: 'migrated'; upgrades: readonly ScribbitUpgrade[] }>
  | Readonly<{ status: 'invalid' }>;

export const COMBAT_UPGRADE_CATALOG: Readonly<
  Record<CombatUpgradeId, CombatUpgradeDefinition>
> = Object.freeze({
  'v1-bold-tip': Object.freeze({
    id: 'v1-bold-tip',
    name: 'Bold Tip',
    shortName: 'BOLD TIP',
    description: '+1.2% damage',
    tag: 'offense',
    damagePermille: 12,
  }),
  'v1-quick-dry': Object.freeze({
    id: 'v1-quick-dry',
    name: 'Quick Dry',
    shortName: 'QUICK DRY',
    description: '1.2% shorter cooldown · -0.5% health',
    tag: 'offense',
    cooldownPermille: -12,
    maximumHitPointsPermille: -5,
  }),
  'v1-thick-paper': Object.freeze({
    id: 'v1-thick-paper',
    name: 'Thick Paper',
    shortName: 'THICK PAPER',
    description: '+1% maximum health',
    tag: 'defense',
    maximumHitPointsPermille: 10,
  }),
  'v1-first-mark': Object.freeze({
    id: 'v1-first-mark',
    name: 'First Mark',
    shortName: 'FIRST MARK',
    description: 'First signature move starts 0.05s sooner',
    tag: 'mobility',
    initialDelayTicksDelta: -1,
  }),
  'v1-lucky-splash': Object.freeze({
    id: 'v1-lucky-splash',
    name: 'Lucky Splash',
    shortName: 'LUCKY',
    description: '+0.4% critical-hit chance',
    tag: 'utility',
    criticalChanceBonusPermille: 4,
  }),
  'v1-steady-hand': Object.freeze({
    id: 'v1-steady-hand',
    name: 'Steady Hand',
    shortName: 'STEADY',
    description: 'Signature move winds up 0.05s faster',
    tag: 'utility',
    telegraphTicksDelta: -1,
  }),
});

if (MAXIMUM_COMBAT_UPGRADES > COMBAT_UPGRADE_IDS.length) {
  throw new Error('Ink Mod acquisition levels exceed the authored catalog.');
}

export const isCombatUpgradeId = (value: unknown): value is CombatUpgradeId => {
  return (
    typeof value === 'string' &&
    COMBAT_UPGRADE_IDS.includes(value as CombatUpgradeId)
  );
};

const freezeUpgrade = (
  id: CombatUpgradeId,
  acquiredAtLevel: InkModAcquisitionLevel
): ScribbitUpgrade => {
  return Object.freeze({ id, acquiredAtLevel });
};

const expectedAcquisitionLevels = (
  level: number
): readonly InkModAcquisitionLevel[] => {
  const maximumLevel = clampScribbitLevel(level);
  return INK_MOD_ACQUISITION_LEVELS.filter(
    (acquisitionLevel) => acquisitionLevel <= maximumLevel
  );
};

/**
 * Parses a complete current Ink Mod set. Present-but-partial, duplicate, or
 * malformed arrays fail closed instead of being silently repaired.
 */
export const parseCompleteScribbitUpgrades = (
  value: unknown,
  level: number
): ScribbitUpgrade[] | undefined => {
  const requiredLevels = expectedAcquisitionLevels(level);
  if (!Array.isArray(value) || value.length !== requiredLevels.length) {
    return undefined;
  }

  const upgrades: ScribbitUpgrade[] = [];
  const usedIds = new Set<CombatUpgradeId>();
  const usedLevels = new Set<InkModAcquisitionLevel>();
  for (const candidate of value) {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      !('id' in candidate) ||
      !('acquiredAtLevel' in candidate) ||
      !isCombatUpgradeId(candidate.id) ||
      !isInkModAcquisitionLevel(candidate.acquiredAtLevel) ||
      !requiredLevels.includes(candidate.acquiredAtLevel) ||
      usedIds.has(candidate.id) ||
      usedLevels.has(candidate.acquiredAtLevel)
    ) {
      return undefined;
    }
    usedIds.add(candidate.id);
    usedLevels.add(candidate.acquiredAtLevel);
    upgrades.push(freezeUpgrade(candidate.id, candidate.acquiredAtLevel));
  }

  if (requiredLevels.some((levelValue) => !usedLevels.has(levelValue))) {
    return undefined;
  }

  return upgrades.sort(
    (left, right) => left.acquiredAtLevel - right.acquiredAtLevel
  );
};

const addDeterministicUpgrades = (
  scribbitId: string,
  targetLevel: number,
  existingUpgrades: readonly ScribbitUpgrade[]
): ScribbitUpgrade[] => {
  const upgrades = existingUpgrades.map((upgrade) =>
    freezeUpgrade(upgrade.id, upgrade.acquiredAtLevel)
  );
  const usedIds = new Set(upgrades.map((upgrade) => upgrade.id));
  const usedLevels = new Set(
    upgrades.map((upgrade) => upgrade.acquiredAtLevel)
  );

  for (const acquisitionLevel of expectedAcquisitionLevels(targetLevel)) {
    if (usedLevels.has(acquisitionLevel)) continue;
    const availableIds = COMBAT_UPGRADE_IDS.filter((id) => !usedIds.has(id));
    const selectedIndex =
      hashStringToUint32(
        `scribbit-upgrade:v1:${scribbitId}:${acquisitionLevel}`
      ) % availableIds.length;
    const selectedId = availableIds[selectedIndex];
    if (!selectedId) {
      throw new Error('Ink Mod catalog cannot satisfy progression policy.');
    }
    upgrades.push(freezeUpgrade(selectedId, acquisitionLevel));
    usedIds.add(selectedId);
    usedLevels.add(acquisitionLevel);
  }

  return upgrades.sort(
    (left, right) => left.acquiredAtLevel - right.acquiredAtLevel
  );
};

export const createScribbitUpgradesForLevel = (
  scribbitId: string,
  level: number
): ScribbitUpgrade[] => {
  return addDeterministicUpgrades(scribbitId, level, []);
};

/** Absent means pre-feature and may migrate; malformed present data may not. */
export const resolveStoredScribbitUpgrades = (
  scribbitId: string,
  level: number,
  storedValue: unknown
): StoredScribbitUpgradeResolution => {
  if (storedValue === undefined) {
    return Object.freeze({
      status: 'migrated',
      upgrades: Object.freeze(
        createScribbitUpgradesForLevel(scribbitId, level)
      ),
    });
  }
  const upgrades = parseCompleteScribbitUpgrades(storedValue, level);
  return upgrades
    ? Object.freeze({ status: 'valid', upgrades: Object.freeze(upgrades) })
    : Object.freeze({ status: 'invalid' });
};

export const advanceScribbitUpgrades = (
  scribbitId: string,
  previousLevel: number,
  nextLevel: number,
  existingValue: unknown
): ScribbitUpgrade[] => {
  const normalizedPreviousLevel = clampScribbitLevel(previousLevel);
  const normalizedNextLevel = clampScribbitLevel(nextLevel);
  if (normalizedNextLevel < normalizedPreviousLevel) {
    throw new Error('Ink Mod progression cannot move backward.');
  }
  const existing = resolveStoredScribbitUpgrades(
    scribbitId,
    normalizedPreviousLevel,
    existingValue
  );
  if (existing.status === 'invalid') {
    throw new Error('Existing Ink Mod progression is malformed.');
  }
  return addDeterministicUpgrades(
    scribbitId,
    normalizedNextLevel,
    existing.upgrades
  );
};

export const getCombatUpgradeModifiers = (
  upgradeIds: readonly CombatUpgradeId[] | undefined
): CombatUpgradeModifiers => {
  const uniqueIds = new Set(upgradeIds ?? []);
  let damagePermille = 1_000;
  let maximumHitPointsPermille = 1_000;
  let cooldownPermille = 1_000;
  let criticalChanceBonusPermille = 0;
  let telegraphTicksDelta = 0;
  let initialDelayTicksDelta = 0;

  for (const id of uniqueIds) {
    const definition = COMBAT_UPGRADE_CATALOG[id];
    damagePermille += definition.damagePermille ?? 0;
    maximumHitPointsPermille += definition.maximumHitPointsPermille ?? 0;
    cooldownPermille += definition.cooldownPermille ?? 0;
    criticalChanceBonusPermille += definition.criticalChanceBonusPermille ?? 0;
    telegraphTicksDelta += definition.telegraphTicksDelta ?? 0;
    initialDelayTicksDelta += definition.initialDelayTicksDelta ?? 0;
  }

  return Object.freeze({
    damagePermille,
    maximumHitPointsPermille,
    cooldownPermille,
    criticalChanceBonusPermille,
    telegraphTicksDelta,
    initialDelayTicksDelta,
  });
};

export const formatCombatUpgradeSummary = (
  upgrades: readonly Pick<ScribbitUpgrade, 'id'>[] | undefined,
  emptyLabel = 'NO INK MODS',
  maximumVisible = Number.POSITIVE_INFINITY
): string => {
  if (!upgrades || upgrades.length === 0) return emptyLabel;
  const visibleCount = Number.isFinite(maximumVisible)
    ? Math.max(1, Math.floor(maximumVisible))
    : upgrades.length;
  const visibleSummary = upgrades
    .slice(0, visibleCount)
    .map((upgrade) => COMBAT_UPGRADE_CATALOG[upgrade.id].shortName)
    .join(' · ');
  const hiddenCount = upgrades.length - visibleCount;
  return hiddenCount > 0
    ? `${visibleSummary} · +${hiddenCount}`
    : visibleSummary;
};

export const formatCombatUpgradeEffectLines = (
  upgrades: readonly Pick<ScribbitUpgrade, 'id'>[] | undefined,
  emptyLabel = 'NO INK MODS'
): readonly string[] => {
  if (!upgrades || upgrades.length === 0) {
    return Object.freeze([emptyLabel]);
  }
  return Object.freeze(
    upgrades.map((upgrade) => {
      const definition = COMBAT_UPGRADE_CATALOG[upgrade.id];
      return `${definition.shortName} · ${definition.description}`;
    })
  );
};
