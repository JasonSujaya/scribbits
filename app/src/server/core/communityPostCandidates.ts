import type { BattleReport } from '../../shared/arena';
import { selectStrongestFight } from '../../shared/communityfeed';
import { loadBattleReport } from './battleStore';
import type { ArenaStorage } from './storage';

const dailyStrongestFightKey = 'arena:daily-strongest-fights:v1';
const strongestFightRetentionDays = 30;

export const getDailyStrongestFightKey = (): string => dailyStrongestFightKey;

export const recordDailyStrongestFight = async (
  storage: ArenaStorage,
  arenaDay: number,
  reports: readonly BattleReport[]
): Promise<void> => {
  const strongestFight = selectStrongestFight(reports);
  const dayField = arenaDay.toString();
  if (!strongestFight) {
    await storage.hDel(dailyStrongestFightKey, [dayField]);
    return;
  }
  await storage.hSet(dailyStrongestFightKey, {
    [dayField]: strongestFight.id,
  });
  const expiredDay = arenaDay - strongestFightRetentionDays;
  if (expiredDay > 0) {
    await storage.hDel(dailyStrongestFightKey, [expiredDay.toString()]);
  }
};

export const loadStrongestFightForArenaDays = async (
  storage: ArenaStorage,
  arenaDays: readonly number[]
): Promise<BattleReport | null> => {
  const reports: BattleReport[] = [];
  for (const arenaDay of arenaDays) {
    const reportId = await storage.hGet(
      dailyStrongestFightKey,
      arenaDay.toString()
    );
    if (!reportId) continue;
    const report = await loadBattleReport(storage, reportId);
    if (report?.day === arenaDay && report.kind === 'rumble') {
      reports.push(report);
    }
  }
  return selectStrongestFight(reports);
};
