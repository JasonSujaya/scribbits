import {
  LEVEL_DAMAGE_BONUS_PER_LEVEL,
  MAX_LEVEL,
  type ScribbitStats,
} from './arena';
import { DEFAULT_COMBAT_RULES } from './combat';

const clampBattleLevel = (level: number): number => {
  if (!Number.isFinite(level)) return 1;
  return Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
};

export const getLevelDamageMultiplier = (level: number): number => {
  return 1 + (clampBattleLevel(level) - 1) * LEVEL_DAMAGE_BONUS_PER_LEVEL;
};

/** One-decimal percentage used by battle UI; authority still uses multiplier. */
export const getLevelDamageBonusPercent = (level: number): number => {
  return Math.round((getLevelDamageMultiplier(level) - 1) * 1_000) / 10;
};

export const getBattleMaxHp = (stats: Pick<ScribbitStats, 'chonk'>): number => {
  return (
    DEFAULT_COMBAT_RULES.fighter.baseHitPoints +
    stats.chonk * DEFAULT_COMBAT_RULES.fighter.hitPointsPerChonk
  );
};
