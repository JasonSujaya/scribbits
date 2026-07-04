import type { BattleReport } from '../../shared/arena';
import type { ArenaStorage } from './scribbit';
import { getScribbitOwner, isScribbit } from './scribbit';

const battleReportTtlSeconds = 30 * 24 * 60 * 60;

export const getBattleReportKey = (battleReportId: string): string => {
  return `battle:${battleReportId}`;
};

export const getUserBattlesKey = (userId: string): string => {
  return `battles:user:${userId}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBattleReport = (value: unknown): value is BattleReport => {
  if (!isRecord(value) || !Array.isArray(value.events)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    (value.kind === 'rumble' ||
      value.kind === 'boss' ||
      value.kind === 'exhibition') &&
    typeof value.day === 'number' &&
    isScribbit(value.a) &&
    isScribbit(value.b) &&
    (value.winner === 'a' || value.winner === 'b')
  );
};

const parseBattleReport = (
  storedBattleReport: string | undefined
): BattleReport | undefined => {
  if (storedBattleReport === undefined) {
    return undefined;
  }

  try {
    const parsedBattleReport: unknown = JSON.parse(storedBattleReport);

    if (isBattleReport(parsedBattleReport)) {
      return parsedBattleReport;
    }
  } catch (error) {
    console.error('Failed to parse stored battle report:', error);
  }

  return undefined;
};

export const saveBattleReport = async (
  storage: ArenaStorage,
  battleReport: BattleReport,
  score: number
): Promise<void> => {
  const battleReportKey = getBattleReportKey(battleReport.id);
  await storage.set(battleReportKey, JSON.stringify(battleReport));
  await storage.expire(battleReportKey, battleReportTtlSeconds);

  const ownerIds = new Set<string>();
  const ownerA = await getScribbitOwner(storage, battleReport.a.id);
  const ownerB = await getScribbitOwner(storage, battleReport.b.id);

  if (ownerA) {
    ownerIds.add(ownerA);
  }

  if (ownerB) {
    ownerIds.add(ownerB);
  }

  for (const ownerId of ownerIds) {
    const userBattlesKey = getUserBattlesKey(ownerId);
    await storage.zAdd(userBattlesKey, {
      member: battleReport.id,
      score,
    });
    await storage.expire(userBattlesKey, battleReportTtlSeconds);
  }
};

export const loadBattleReportsForUser = async (
  storage: ArenaStorage,
  userId: string,
  limit: number
): Promise<BattleReport[]> => {
  const battleEntries = await storage.zRange(getUserBattlesKey(userId), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  const battleReports: BattleReport[] = [];

  for (const battleEntry of battleEntries) {
    const battleReport = parseBattleReport(
      await storage.get(getBattleReportKey(battleEntry.member))
    );

    if (battleReport) {
      battleReports.push(battleReport);
    }
  }

  return battleReports;
};
