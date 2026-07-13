import { hashStringToUint32 } from '../stablehash';

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
  acquiredAtLevel: 2 | 3 | 4 | 5;
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

export const MAXIMUM_COMBAT_UPGRADES = 4;

export const COMBAT_UPGRADE_CATALOG: Readonly<
  Record<CombatUpgradeId, CombatUpgradeDefinition>
> = Object.freeze({
  'v1-bold-tip': Object.freeze({
    id: 'v1-bold-tip',
    name: 'Bold Tip',
    shortName: 'BOLD TIP',
    description: '+0.5% damage',
    tag: 'offense',
    damagePermille: 5,
  }),
  'v1-quick-dry': Object.freeze({
    id: 'v1-quick-dry',
    name: 'Quick Dry',
    shortName: 'QUICK DRY',
    description: 'Shape Power recovers 1% faster',
    tag: 'offense',
    cooldownPermille: -10,
  }),
  'v1-thick-paper': Object.freeze({
    id: 'v1-thick-paper',
    name: 'Thick Paper',
    shortName: 'THICK PAPER',
    description: '+0.5% maximum health',
    tag: 'defense',
    maximumHitPointsPermille: 5,
  }),
  'v1-first-mark': Object.freeze({
    id: 'v1-first-mark',
    name: 'First Mark',
    shortName: 'FIRST MARK',
    description: 'First Shape Power starts 1 tick sooner',
    tag: 'mobility',
    initialDelayTicksDelta: -1,
  }),
  'v1-lucky-splash': Object.freeze({
    id: 'v1-lucky-splash',
    name: 'Lucky Splash',
    shortName: 'LUCKY',
    description: '+0.3% critical-hit chance',
    tag: 'utility',
    criticalChanceBonusPermille: 3,
  }),
  'v1-steady-hand': Object.freeze({
    id: 'v1-steady-hand',
    name: 'Steady Hand',
    shortName: 'STEADY',
    description: 'Shape Power winds up 1 tick faster',
    tag: 'utility',
    telegraphTicksDelta: -1,
  }),
});

export const isCombatUpgradeId = (value: unknown): value is CombatUpgradeId => {
  return (
    typeof value === 'string' &&
    COMBAT_UPGRADE_IDS.includes(value as CombatUpgradeId)
  );
};

const isAcquisitionLevel = (
  value: unknown
): value is ScribbitUpgrade['acquiredAtLevel'] => {
  return value === 2 || value === 3 || value === 4 || value === 5;
};

export const normalizeScribbitUpgrades = (
  value: unknown
): ScribbitUpgrade[] => {
  if (!Array.isArray(value)) return [];

  const upgrades: ScribbitUpgrade[] = [];
  const usedIds = new Set<CombatUpgradeId>();
  const usedLevels = new Set<number>();
  for (const candidate of value) {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      !('id' in candidate) ||
      !('acquiredAtLevel' in candidate) ||
      !isCombatUpgradeId(candidate.id) ||
      !isAcquisitionLevel(candidate.acquiredAtLevel) ||
      usedIds.has(candidate.id) ||
      usedLevels.has(candidate.acquiredAtLevel)
    ) {
      continue;
    }
    usedIds.add(candidate.id);
    usedLevels.add(candidate.acquiredAtLevel);
    upgrades.push(
      Object.freeze({
        id: candidate.id,
        acquiredAtLevel: candidate.acquiredAtLevel,
      })
    );
  }

  return upgrades
    .sort((left, right) => left.acquiredAtLevel - right.acquiredAtLevel)
    .slice(0, MAXIMUM_COMBAT_UPGRADES);
};

const clampLevel = (level: number): number => {
  if (!Number.isFinite(level)) return 1;
  return Math.min(5, Math.max(1, Math.floor(level)));
};

/**
 * Reconciles one immutable, server-authored Ink Mod for every level after 1.
 * Existing valid picks stay frozen; missing historical picks are deterministic.
 */
export const reconcileScribbitUpgrades = (
  scribbitId: string,
  level: number,
  existingValue: unknown
): ScribbitUpgrade[] => {
  const maximumAcquisitionLevel = clampLevel(level);
  const upgrades = normalizeScribbitUpgrades(existingValue).filter(
    (upgrade) => upgrade.acquiredAtLevel <= maximumAcquisitionLevel
  );
  const usedIds = new Set(upgrades.map((upgrade) => upgrade.id));
  const usedLevels = new Set<number>(
    upgrades.map((upgrade) => upgrade.acquiredAtLevel)
  );

  for (
    let acquisitionLevel = 2;
    acquisitionLevel <= maximumAcquisitionLevel;
    acquisitionLevel += 1
  ) {
    if (usedLevels.has(acquisitionLevel)) continue;
    const availableIds = COMBAT_UPGRADE_IDS.filter((id) => !usedIds.has(id));
    const selectedIndex =
      hashStringToUint32(
        `scribbit-upgrade:v1:${scribbitId}:${acquisitionLevel}`
      ) % availableIds.length;
    const selectedId = availableIds[selectedIndex];
    if (!selectedId) break;
    upgrades.push(
      Object.freeze({
        id: selectedId,
        acquiredAtLevel: acquisitionLevel as 2 | 3 | 4 | 5,
      })
    );
    usedIds.add(selectedId);
    usedLevels.add(acquisitionLevel);
  }

  return upgrades.sort(
    (left, right) => left.acquiredAtLevel - right.acquiredAtLevel
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
  return hiddenCount > 0 ? `${visibleSummary} · +${hiddenCount}` : visibleSummary;
};
