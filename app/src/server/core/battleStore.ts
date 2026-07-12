import type { BattleReport, RivalRunReceipt } from '../../shared/arena';
import { RIVAL_RUN_LENGTH } from '../../shared/arena';
import {
  createLegacyRivalRunChallenge,
  isRivalRunChallenge,
  rivalRunChallengeGoalMet,
} from '../../shared/rivalrunchallenges';
import type {
  AuthoritativeBattleResult,
  BattleEndReason,
  BattleTranscript,
  FighterSlot,
} from '../../shared/combat';
import {
  COMBAT_MAXIMUM_TICKS,
  COMBAT_TICK_RATE,
  FIXED_POINT_SCALE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_TIMELINE_EVENTS,
  battleResultFinishIsConsistent,
  isShapePowerId,
} from '../../shared/combat';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';
import {
  cloneScribbit,
  getScribbitOwner,
  isScribbit,
  normalizeScribbitRecord,
} from './scribbit';

export const battleReportTtlSeconds = 30 * 24 * 60 * 60;
// One score bucket per arena day. A million report positions is far above the
// bounded Swiss bracket while keeping day + order exactly representable.
const rumbleReportOrderScale = 1_000_000;

export const getBattleReportKey = (battleReportId: string): string => {
  return `battle:${battleReportId}`;
};

export const getUserBattlesKey = (userId: string): string => {
  return `battles:user:${userId}`;
};

export const getScribbitBattlesKey = (scribbitId: string): string => {
  return `battles:scribbit:${scribbitId}`;
};

const getFeaturedRumbleReportsKey = (scribbitId: string): string => {
  return `battles:scribbit:${scribbitId}:featured-rumbles`;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isFighterSlot = (value: unknown): value is FighterSlot => {
  return value === 'a' || value === 'b';
};

const isBattleEndReason = (value: unknown): value is BattleEndReason => {
  return (
    value === 'knockout' ||
    value === 'double_knockout' ||
    value === 'timeout_hp_percentage' ||
    value === 'timeout_damage_dealt' ||
    value === 'timeout_stable_tiebreak'
  );
};

const isStoredResultFighter = (
  value: unknown,
  expectedSlot: FighterSlot,
  expectedId: string
): boolean => {
  return (
    isRecord(value) &&
    value.slot === expectedSlot &&
    value.id === expectedId &&
    Number.isSafeInteger(value.finalHitPoints) &&
    Number.isSafeInteger(value.maxHitPoints) &&
    Number.isSafeInteger(value.hitPointPermille) &&
    Number.isSafeInteger(value.damageDealt) &&
    isShapePowerId(value.primaryPower) &&
    typeof value.inkPressureUsed === 'boolean'
  );
};

const isBattleTranscript = (value: unknown): value is BattleTranscript => {
  if (
    !isRecord(value) ||
    !isRecord(value.result) ||
    !Array.isArray(value.fighters) ||
    value.fighters.length !== 2 ||
    !isRecord(value.fighters[0]) ||
    !isRecord(value.fighters[1]) ||
    typeof value.fighters[0].id !== 'string' ||
    typeof value.fighters[1].id !== 'string'
  ) {
    return false;
  }

  const result = value.result;
  const fighterAId = value.fighters[0].id;
  const fighterBId = value.fighters[1].id;
  if (
    !(
      value.version === 1 &&
      value.tickRate === COMBAT_TICK_RATE &&
      value.fixedPointScale === FIXED_POINT_SCALE &&
      value.maxTicks === COMBAT_MAXIMUM_TICKS &&
      typeof value.battleId === 'string' &&
      typeof value.seed === 'string' &&
      typeof value.eventsTruncated === 'boolean' &&
      Array.isArray(value.timeline) &&
      value.timeline.length >= 2 &&
      value.timeline.length <= MAXIMUM_TIMELINE_EVENTS &&
      Array.isArray(value.checkpoints) &&
      value.checkpoints.length >= 2 &&
      value.checkpoints.length <= MAXIMUM_CHECKPOINTS &&
      isFighterSlot(result.winner) &&
      isFighterSlot(result.loser) &&
      result.winner !== result.loser &&
      isBattleEndReason(result.reason) &&
      Number.isSafeInteger(result.completedTick) &&
      Number(result.completedTick) >= 0 &&
      Number(result.completedTick) <= COMBAT_MAXIMUM_TICKS &&
      result.completedMilliseconds ===
        Math.floor((Number(result.completedTick) * 1_000) / COMBAT_TICK_RATE) &&
      Array.isArray(result.fighters) &&
      result.fighters.length === 2 &&
      isStoredResultFighter(result.fighters[0], 'a', fighterAId) &&
      isStoredResultFighter(result.fighters[1], 'b', fighterBId)
    )
  ) {
    return false;
  }

  return battleResultFinishIsConsistent(
    result as unknown as AuthoritativeBattleResult,
    COMBAT_MAXIMUM_TICKS
  );
};

const isRivalRunReceipt = (
  value: unknown,
  report: Pick<BattleReport, 'kind' | 'day' | 'a' | 'b' | 'winner'>
): value is RivalRunReceipt => {
  if (!isRecord(value)) return false;
  const challengerSlot =
    value.challengerId === report.a.id
      ? 'a'
      : value.challengerId === report.b.id
        ? 'b'
        : null;
  const boutsCompleted = Number(value.boutsCompleted);
  return (
    report.kind === 'exhibition' &&
    typeof value.id === 'string' &&
    value.id.length >= 1 &&
    value.id.length <= 128 &&
    value.dayNumber === report.day &&
    challengerSlot !== null &&
    Number.isSafeInteger(boutsCompleted) &&
    boutsCompleted >= 1 &&
    boutsCompleted <= RIVAL_RUN_LENGTH &&
    value.boutNumber === boutsCompleted &&
    Number.isSafeInteger(value.wins) &&
    Number.isSafeInteger(value.losses) &&
    Number(value.wins) >= 0 &&
    Number(value.losses) >= 0 &&
    Number(value.wins) + Number(value.losses) === boutsCompleted &&
    Number.isSafeInteger(value.score) &&
    Number(value.score) >= 0 &&
    Number(value.score) <= RIVAL_RUN_LENGTH * 3 &&
    value.status ===
      (boutsCompleted === RIVAL_RUN_LENGTH ? 'complete' : 'active') &&
    (value.challenge === undefined ||
      (isRivalRunChallenge(value.challenge) &&
        value.challenge.completionAchieved ===
          (value.status === 'complete' &&
            rivalRunChallengeGoalMet(value.challenge)))) &&
    (value.outcome === 'win' || value.outcome === 'loss') &&
    (value.tier === 'safe' ||
      value.tier === 'even' ||
      value.tier === 'risky') &&
    (value.winPoints === 1 || value.winPoints === 2 || value.winPoints === 3) &&
    ((value.tier === 'safe' && value.winPoints === 1) ||
      (value.tier === 'even' && value.winPoints === 2) ||
      (value.tier === 'risky' && value.winPoints === 3)) &&
    (value.pointsAwarded === 0 ||
      value.pointsAwarded === 1 ||
      value.pointsAwarded === 2 ||
      value.pointsAwarded === 3) &&
    value.pointsAwarded === (value.outcome === 'win' ? value.winPoints : 0) &&
    (value.outcome === 'win') === (report.winner === challengerSlot)
  );
};

const isBattleReport = (value: unknown): value is BattleReport => {
  if (
    !isRecord(value) ||
    (value.events !== undefined && !Array.isArray(value.events))
  ) {
    return false;
  }

  if (value.simulation === undefined && !Array.isArray(value.events)) {
    return false;
  }

  // Historical reads share the same zero-persistence boundary: even hostile or
  // stale JSON cannot make an ephemeral practice report appear in history.
  if (
    typeof value.id !== 'string' ||
    (value.kind !== 'rumble' &&
      value.kind !== 'boss' &&
      value.kind !== 'exhibition') ||
    typeof value.day !== 'number' ||
    !isScribbit(value.a) ||
    !isScribbit(value.b) ||
    !isFighterSlot(value.winner)
  ) {
    return false;
  }

  if (
    value.rivalRun !== undefined &&
    !isRivalRunReceipt(value.rivalRun, value as BattleReport)
  ) {
    return false;
  }

  if (value.simulation !== undefined) {
    if (
      !isBattleTranscript(value.simulation) ||
      value.a.id !== value.simulation.fighters[0].id ||
      value.b.id !== value.simulation.fighters[1].id ||
      value.winner !== value.simulation.result.winner
    ) {
      return false;
    }
  }

  return true;
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
        const rivalRun = parsedBattleReport.rivalRun;
        const normalizedRivalRun =
          rivalRun &&
          (rivalRun as unknown as Record<string, unknown>).challenge ===
            undefined
            ? {
                ...rivalRun,
                challenge: createLegacyRivalRunChallenge(
                  rivalRun.boutsCompleted,
                  rivalRun.status
                ),
              }
            : rivalRun;
        return {
          ...parsedBattleReport,
          a: fighterA,
          b: fighterB,
          ...(normalizedRivalRun ? { rivalRun: normalizedRivalRun } : {}),
        };
      }
    }
  } catch (error) {
    console.error('Failed to parse stored battle report:', error);
  }

  return undefined;
};

export const loadBattleReport = async (
  storage: ArenaStorage,
  battleReportId: string
): Promise<BattleReport | undefined> => {
  return parseBattleReport(
    await storage.get(getBattleReportKey(battleReportId))
  );
};

const reportsShareImmutableIdentity = (
  existing: BattleReport,
  incoming: BattleReport
): boolean => {
  const { inkAwarded: _existingReward, ...existingCore } = existing;
  const { inkAwarded: _incomingReward, ...incomingCore } = incoming;
  return JSON.stringify(existingCore) === JSON.stringify(incomingCore);
};

const mergeCompatibleReport = (
  existing: BattleReport | undefined,
  incoming: BattleReport
): BattleReport => {
  if (!existing) return incoming;
  if (!reportsShareImmutableIdentity(existing, incoming)) {
    throw new Error(`Battle report id collision for ${incoming.id}.`);
  }
  if (
    existing.inkAwarded !== undefined &&
    incoming.inkAwarded !== undefined &&
    existing.inkAwarded !== incoming.inkAwarded
  ) {
    throw new Error(`Battle report reward collision for ${incoming.id}.`);
  }
  return existing.inkAwarded !== undefined
    ? { ...incoming, inkAwarded: existing.inkAwarded }
    : incoming;
};

const storeBattleReport = async (
  storage: ArenaStorage,
  battleReport: BattleReport
): Promise<BattleReport> => {
  if (!storage.watch) {
    throw new Error('Collision-safe battle storage requires transactions.');
  }
  const key = getBattleReportKey(battleReport.id);
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(key);
      const storedReport = parseBattleReport(await storage.get(key));
      const reportToStore = mergeCompatibleReport(storedReport, battleReport);
      await transaction.multi();
      await transaction.set(key, JSON.stringify(reportToStore));
      await transaction.expire(key, battleReportTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return reportToStore;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Battle report storage');
      throw error;
    }
  }
  throw new Error(
    `Battle report ${battleReport.id} changed too often to save.`
  );
};

// Each entrant indexes every actually played Swiss bout with its monotonic
// resolution order. Reading the highest score makes retries order-independent:
// an older retry can never replace a later completed bout.
export const setFeaturedRumbleReport = async (
  storage: ArenaStorage,
  battleReport: BattleReport,
  resolutionOrder: number
): Promise<void> => {
  if (battleReport.kind !== 'rumble') return;
  if (
    !Number.isSafeInteger(resolutionOrder) ||
    resolutionOrder < 0 ||
    resolutionOrder >= rumbleReportOrderScale
  ) {
    throw new Error('Rumble report order is outside the supported range.');
  }
  const reportScore =
    battleReport.day * rumbleReportOrderScale + resolutionOrder;
  if (!Number.isSafeInteger(reportScore)) {
    throw new Error('Rumble report score is outside the safe integer range.');
  }

  for (const scribbitId of new Set([battleReport.a.id, battleReport.b.id])) {
    const key = getFeaturedRumbleReportsKey(scribbitId);
    await storage.zAdd(key, {
      member: battleReport.id,
      score: reportScore,
    });
    await storage.expire(key, battleReportTtlSeconds);
  }
};

export const getFeaturedRumbleReportId = async (
  storage: ArenaStorage,
  scribbitId: string,
  day: number
): Promise<string | null> => {
  const dayScoreStart = day * rumbleReportOrderScale;
  const dayScoreEnd = dayScoreStart + rumbleReportOrderScale - 1;
  const reports = await storage.zRange(
    getFeaturedRumbleReportsKey(scribbitId),
    dayScoreStart,
    dayScoreEnd,
    { by: 'score', reverse: true }
  );
  return reports[0]?.member ?? null;
};

export const loadFeaturedRumbleReport = async (
  storage: ArenaStorage,
  scribbitId: string,
  day: number
): Promise<BattleReport | undefined> => {
  const reportId = await getFeaturedRumbleReportId(storage, scribbitId, day);
  if (!reportId) return undefined;
  const report = await loadBattleReport(storage, reportId);
  if (
    !report ||
    report.kind !== 'rumble' ||
    report.day !== day ||
    (report.a.id !== scribbitId && report.b.id !== scribbitId)
  ) {
    return undefined;
  }
  return report;
};

export const saveBattleReport = async (
  storage: ArenaStorage,
  battleReport: BattleReport,
  score: number
): Promise<void> => {
  // Practice is a zero-persistence domain. Fail before the first storage call
  // even if a future route accidentally sends an ephemeral report here.
  if (battleReport.kind === 'practice') {
    throw new Error('Practice battle reports cannot be stored.');
  }

  const storedBattleReport: BattleReport = {
    ...battleReport,
    a: cloneScribbit(battleReport.a),
    b: cloneScribbit(battleReport.b),
  };
  await storeBattleReport(storage, storedBattleReport);

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
    const report = await loadBattleReport(storage, entry.member);

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
      for (const fighterId of new Set([report.a.id, report.b.id])) {
        await storage.zRem(getFeaturedRumbleReportsKey(fighterId), [report.id]);
      }
    }

    await storage.del(getBattleReportKey(entry.member));
  }

  await storage.del(
    getScribbitBattlesKey(scribbitId),
    getFeaturedRumbleReportsKey(scribbitId)
  );
};

export const loadBattleReportsForUser = async (
  storage: ArenaStorage,
  userId: string,
  limit: number
): Promise<BattleReport[]> => {
  const battleEntries = await storage.zRange(
    getUserBattlesKey(userId),
    0,
    limit - 1,
    {
      by: 'rank',
      reverse: true,
    }
  );
  const battleReports: BattleReport[] = [];

  for (const battleEntry of battleEntries) {
    const battleReport = await loadBattleReport(storage, battleEntry.member);

    if (battleReport) {
      battleReports.push(battleReport);
    }
  }

  return battleReports;
};
