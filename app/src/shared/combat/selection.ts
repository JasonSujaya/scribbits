import {
  COMBAT_ROLE_BY_DOMINANT_STAT,
  DOMINANT_STAT_TIE_ORDER,
  PRIMARY_POWER_BY_DOMINANT_STAT,
} from './config';
import type {
  CombatRole,
  CurrentCombatRole,
  DominantStat,
  PrimaryPower,
  RawCombatStats,
} from './types';

const FIGHTER_STYLE_STATS: Readonly<Record<CurrentCombatRole, RawCombatStats>> =
  Object.freeze({
    brawler: Object.freeze({ chonk: 40, spike: 20, zip: 20, charm: 20 }),
    longshot: Object.freeze({ chonk: 20, spike: 40, zip: 20, charm: 20 }),
    mage: Object.freeze({ chonk: 20, spike: 20, zip: 20, charm: 40 }),
  });

// Drawing analysis, previews, animation, and server simulation must agree on
// the same stable tie order. Keep this selector framework-free so every layer
// can share it without importing the full combat engine.
export function selectDominantStat(stats: RawCombatStats): DominantStat {
  let dominant = DOMINANT_STAT_TIE_ORDER[0] ?? 'chonk';
  for (const stat of DOMINANT_STAT_TIE_ORDER) {
    if (stats[stat] > stats[dominant]) {
      dominant = stat;
    }
  }
  return dominant;
}

export function selectPrimaryPower(stats: RawCombatStats): PrimaryPower {
  return PRIMARY_POWER_BY_DOMINANT_STAT[selectDominantStat(stats)];
}

export function selectCombatRole(stats: RawCombatStats): CurrentCombatRole {
  return COMBAT_ROLE_BY_DOMINANT_STAT[selectDominantStat(stats)];
}

/** Archived v4-v6 reports used Zip as a separate Gunner role. */
export function selectLegacyCombatRole(stats: RawCombatStats): CombatRole {
  const dominantStat = selectDominantStat(stats);
  if (dominantStat === 'zip') return 'gunner';
  return COMBAT_ROLE_BY_DOMINANT_STAT[dominantStat];
}

/**
 * Existing Zip-dominant Scribbits keep their stored stats, but enter new v7
 * fights as the equivalent Longshot build. The projection is battle-local and
 * never rewrites Redis records or archived report snapshots.
 */
export function projectStatsForCurrentCombat(
  stats: RawCombatStats
): RawCombatStats {
  if (selectDominantStat(stats) !== 'zip') return stats;
  return Object.freeze({
    ...stats,
    spike: stats.zip,
    zip: stats.spike,
  });
}

/**
 * One server-derived drawing color group becomes one stable 100-point build.
 * Keeping the builds symmetric prevents color preference from granting more
 * total combat power.
 */
export function getStatsForFighterStyle(role: CombatRole): RawCombatStats {
  return FIGHTER_STYLE_STATS[role === 'gunner' ? 'longshot' : role];
}
