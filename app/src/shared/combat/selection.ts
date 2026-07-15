import {
  COMBAT_ROLE_BY_DOMINANT_STAT,
  DOMINANT_STAT_TIE_ORDER,
  PRIMARY_POWER_BY_DOMINANT_STAT,
} from './config';
import type {
  CombatRole,
  DominantStat,
  PrimaryPower,
  RawCombatStats,
} from './types';

const FIGHTER_STYLE_STATS: Readonly<Record<CombatRole, RawCombatStats>> =
  Object.freeze({
    brawler: Object.freeze({ chonk: 40, spike: 20, zip: 20, charm: 20 }),
    longshot: Object.freeze({ chonk: 20, spike: 40, zip: 20, charm: 20 }),
    gunner: Object.freeze({ chonk: 20, spike: 20, zip: 40, charm: 20 }),
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

export function selectCombatRole(stats: RawCombatStats): CombatRole {
  return COMBAT_ROLE_BY_DOMINANT_STAT[selectDominantStat(stats)];
}

/**
 * One server-derived drawing color group becomes one stable 100-point build.
 * Keeping the builds symmetric prevents color preference from granting more
 * total combat power.
 */
export function getStatsForFighterStyle(role: CombatRole): RawCombatStats {
  return FIGHTER_STYLE_STATS[role];
}
