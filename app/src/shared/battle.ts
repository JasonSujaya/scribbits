import type { ScribbitStats } from './arena';
import { DEFAULT_COMBAT_RULES } from './combat';

export const getBattleMaxHp = (
  stats: Pick<ScribbitStats, 'chonk'>
): number => {
  return (
    DEFAULT_COMBAT_RULES.fighter.baseHitPoints +
    stats.chonk * DEFAULT_COMBAT_RULES.fighter.hitPointsPerChonk
  );
};
