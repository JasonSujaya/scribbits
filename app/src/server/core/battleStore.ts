import type { BattleReport } from '../../shared/arena';
import type { BattleTranscript } from '../../shared/combat';
import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_TICK_RATE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_TIMELINE_EVENTS,
} from '../../shared/combat';
import type { ArenaStorage } from './scribbit';
import {
  cloneScribbit,
  getScribbitOwner,
  isScribbit,
  normalizeScribbitRecord,
} from './scribbit';

const battleReportTtlSeconds = 30 * 24 * 60 * 60;

export const getBattleReportKey = (battleReportId: string): string => {
  return `battle:${battleReportId}`;
};

export const getUserBattlesKey = (userId: string): string => {
  return `battles:user:${userId}`;
};

export const getScribbitBattlesKey = (scribbitId: string): string => {
  return `battles:scribbit:${scribbitId}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBattleTranscript = (value: unknown): value is BattleTranscript => {
  if (!isRecord(value) || !isRecord(value.result)) {
    return false;
  }

  const result = value.result;
  return (
    Number.isSafeInteger(value.version) &&
    value.tickRate === COMBAT_TICK_RATE &&
    value.maxTicks === COMBAT_MAXIMUM_TICKS &&
    typeof value.battleId === 'string' &&
    typeof value.seed === 'string' &&
    Array.isArray(value.fighters) &&
    value.fighters.length === 2 &&
    Array.isArray(value.timeline) &&
    value.timeline.length >= 2 &&
    value.timeline.length <= MAXIMUM_TIMELINE_EVENTS &&
    Array.isArray(value.checkpoints) &&
    value.checkpoints.length >= 2 &&
    value.checkpoints.length <= MAXIMUM_CHECKPOINTS &&
    (result.winner === 'a' || result.winner === 'b') &&
    (result.loser === 'a' || result.loser === 'b') &&
    Number.isSafeInteger(result.completedTick) &&
    Number(result.completedTick) >= 0 &&
    Number(result.completedTick) <= COMBAT_MAXIMUM_TICKS &&
    Array.isArray(result.fighters) &&
    result.fighters.length === 2
  );
};

const isBattleReport = (value: unknown): value is BattleReport => {
  if (!isRecord(value) || !Array.isArray(value.events)) {
    return false;
  }

  if (value.simulation !== undefined && !isBattleTranscript(value.simulation)) {
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
      const fighterA = normalizeScribbitRecord(parsedBattleReport.a);
      const fighterB = normalizeScribbitRecord(parsedBattleReport.b);

      if (fighterA && fighterB) {
        return {
          ...parsedBattleReport,
          a: fighterA,
          b: fighterB,
        };
      }
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
  const storedBattleReport: BattleReport = {
    ...battleReport,
    a: cloneScribbit(battleReport.a),
    b: cloneScribbit(battleReport.b),
  };

  await storage.set(battleReportKey, JSON.stringify(storedBattleReport));
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

  for (const scribbitId of new Set([battleReport.a.id, battleReport.b.id])) {
    const scribbitBattlesKey = getScribbitBattlesKey(scribbitId);
    await storage.zAdd(scribbitBattlesKey, {
      member: battleReport.id,
      score,
    });
    await storage.expire(scribbitBattlesKey, battleReportTtlSeconds);
  }
};

export const purgeBattleReportsForScribbit = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<void> => {
  const relatedEntries = await storage.zRange(
    getScribbitBattlesKey(scribbitId),
    0,
    -1,
    { by: 'rank' }
  );

  for (const entry of relatedEntries) {
    const report = parseBattleReport(
      await storage.get(getBattleReportKey(entry.member))
    );

    if (report) {
      const ownerIds = new Set<string>();
      const ownerA = await getScribbitOwner(storage, report.a.id);
      const ownerB = await getScribbitOwner(storage, report.b.id);
      if (ownerA) ownerIds.add(ownerA);
      if (ownerB) ownerIds.add(ownerB);

      for (const ownerId of ownerIds) {
        await storage.zRem(getUserBattlesKey(ownerId), [report.id]);
      }
      await storage.zRem(getScribbitBattlesKey(report.a.id), [report.id]);
      await storage.zRem(getScribbitBattlesKey(report.b.id), [report.id]);
    }

    await storage.del(getBattleReportKey(entry.member));
  }

  await storage.del(getScribbitBattlesKey(scribbitId));
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
