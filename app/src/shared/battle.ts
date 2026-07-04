import type { ScribbitStats } from './arena';

export const getBattleMaxHp = (
  stats: Pick<ScribbitStats, 'chonk'>
): number => {
  return Math.round(120 + stats.chonk * 2.2);
};
