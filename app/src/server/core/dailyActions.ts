import type { BattleReport, CareAction, Scribbit } from '../../shared/arena';
import { cloneScribbit } from '../../shared/arena';
import {
  addXpToScribbit,
  applyBattleOutcomeToScribbit,
  DAILY_FLAG_TTL_SECONDS,
  getDailyFlagsKey,
  getScribbitCareKey,
  getScribbitKey,
  parseScribbit,
  planCareProgression,
  readCareDoneToday,
  serializeScribbit,
} from './scribbit';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';

const careActionOrder: readonly CareAction[] = ['feed', 'pat', 'train'];
const bossChallengeFlag = 'bossChallenge';
const bossChallengeReportField = 'bossChallengeReport';

class DailyActionInvariantError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export type DailyCareCommitResult =
  | {
      status: 'committed';
      scribbit: Scribbit;
      recovered: boolean;
    }
  | { status: 'already-claimed' }
  | { status: 'target-unavailable' };

export type DailyCareProjection = Readonly<{
  scribbit: Scribbit;
  xpGain: number;
}>;

export const projectDailyCareAction = (
  scribbit: Scribbit,
  completedActions: readonly CareAction[],
  action: CareAction
): DailyCareProjection => {
  const completedActionSet = new Set([...completedActions, action]);
  const careDoneToday = careActionOrder.filter((candidate) =>
    completedActionSet.has(candidate)
  );
  const progression = planCareProgression(careDoneToday);
  const rewardedScribbit = addXpToScribbit(scribbit, progression.xpGain);
  return {
    scribbit: {
      ...rewardedScribbit,
      mood: progression.mood,
      careDoneToday,
    },
    xpGain: progression.xpGain,
  };
};

export const getDailyCareReceiptValue = (
  operationId: string,
  claimedAtMilliseconds: number
): string => {
  return `operation:${operationId}:${claimedAtMilliseconds}`;
};

const loadCommittedCareResult = async (
  storage: ArenaStorage,
  scribbitKey: string
): Promise<DailyCareCommitResult> => {
  const scribbit = parseScribbit(await storage.get(scribbitKey));
  return scribbit
    ? {
        status: 'committed',
        scribbit,
        recovered: true,
      }
    : { status: 'target-unavailable' };
};

export const commitDailyCareAction = async (
  storage: ArenaStorage,
  input: Readonly<{
    scribbitId: string;
    action: CareAction;
    utcDateKey: string;
    operationId: string;
    claimedAtMilliseconds: number;
  }>
): Promise<DailyCareCommitResult> => {
  if (!storage.watch) {
    throw new Error('Atomic daily care requires transaction support.');
  }
  if (
    !input.operationId ||
    input.operationId.length > 128 ||
    !Number.isSafeInteger(input.claimedAtMilliseconds) ||
    input.claimedAtMilliseconds < 0
  ) {
    throw new Error('Daily care input is invalid.');
  }

  const careKey = getScribbitCareKey(input.scribbitId, input.utcDateKey);
  const scribbitKey = getScribbitKey(input.scribbitId);
  const receiptValue = getDailyCareReceiptValue(
    input.operationId,
    input.claimedAtMilliseconds
  );

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(careKey, scribbitKey);
      const [existingReceipt, storedScribbit, completedActions] =
        await Promise.all([
          storage.hGet(careKey, input.action),
          storage.get(scribbitKey),
          readCareDoneToday(storage, input.scribbitId, input.utcDateKey),
        ]);
      if (existingReceipt !== undefined) {
        await transaction.unwatch();
        return existingReceipt === receiptValue
          ? await loadCommittedCareResult(storage, scribbitKey)
          : { status: 'already-claimed' };
      }

      const scribbit = parseScribbit(storedScribbit);
      if (!scribbit || scribbit.isFounding || scribbit.status !== 'alive') {
        await transaction.unwatch();
        return { status: 'target-unavailable' };
      }

      const projection = projectDailyCareAction(
        scribbit,
        completedActions,
        input.action
      );
      await transaction.multi();
      await transaction.hSet(careKey, { [input.action]: receiptValue });
      await transaction.expire(careKey, DAILY_FLAG_TTL_SECONDS);
      await transaction.set(
        scribbitKey,
        serializeScribbit(projection.scribbit)
      );
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return {
          status: 'committed',
          scribbit: projection.scribbit,
          recovered: false,
        };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Daily care');
      const recoveredReceipt = await storage.hGet(careKey, input.action);
      if (recoveredReceipt === receiptValue) {
        return await loadCommittedCareResult(storage, scribbitKey);
      }
      if (recoveredReceipt !== undefined) {
        return { status: 'already-claimed' };
      }
      throw error;
    }
  }

  throw new Error('Daily care changed too often to commit safely.');
};

export type DailyChampionCommitResult =
  | { status: 'committed'; report: BattleReport; recovered: boolean }
  | { status: 'already-challenged' }
  | { status: 'target-unavailable' };

export const isChampionReportForChallenge = (
  report: unknown,
  input: Readonly<{
    day: number;
    challengerId: string;
    championId: string;
  }>
): report is BattleReport => {
  return (
    isRecord(report) &&
    report.kind === 'boss' &&
    report.day === input.day &&
    isRecord(report.a) &&
    report.a.id === input.challengerId &&
    isRecord(report.b) &&
    report.b.id === input.championId &&
    (report.winner === 'a' || report.winner === 'b')
  );
};

const serializeBattleReport = (report: BattleReport): string => {
  return JSON.stringify({
    ...report,
    a: cloneScribbit(report.a),
    b: cloneScribbit(report.b),
  });
};

const parseChampionReportReceipt = (
  storedReceipt: string | undefined,
  input: Readonly<{
    reportId: string;
    day: number;
    challengerId: string;
    championId: string;
  }>
): BattleReport | undefined => {
  if (storedReceipt === undefined) return undefined;
  try {
    const report: unknown = JSON.parse(storedReceipt);
    return isChampionReportForChallenge(report, input) &&
      report.id === input.reportId
      ? report
      : undefined;
  } catch {
    return undefined;
  }
};

export const commitDailyChampionOutcome = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    day: number;
    challengerId: string;
    championId: string;
    report: BattleReport;
    winnerXpGain: number;
  }>
): Promise<DailyChampionCommitResult> => {
  if (!storage.watch) {
    throw new Error('Atomic Champion challenges require transaction support.');
  }
  if (
    !isChampionReportForChallenge(input.report, input) ||
    !Number.isSafeInteger(input.winnerXpGain) ||
    input.winnerXpGain < 0
  ) {
    throw new Error('Champion challenge input is invalid.');
  }

  const dailyFlagsKey = getDailyFlagsKey(input.userId, input.day);
  const scribbitKey = getScribbitKey(input.challengerId);
  const reportReceipt = input.report.id;

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(dailyFlagsKey, scribbitKey);
      const [existingReceipt, storedScribbit, storedReportReceipt] =
        await Promise.all([
          storage.hGet(dailyFlagsKey, bossChallengeFlag),
          storage.get(scribbitKey),
          storage.hGet(dailyFlagsKey, bossChallengeReportField),
        ]);
      const storedReport = parseChampionReportReceipt(storedReportReceipt, {
        reportId: reportReceipt,
        day: input.day,
        challengerId: input.challengerId,
        championId: input.championId,
      });
      if (existingReceipt !== undefined) {
        await transaction.unwatch();
        if (existingReceipt !== reportReceipt) {
          return { status: 'already-challenged' };
        }
        if (!storedReport) {
          throw new DailyActionInvariantError(
            `Champion receipt ${reportReceipt} has no battle report.`
          );
        }
        return { status: 'committed', report: storedReport, recovered: true };
      }
      const scribbit = parseScribbit(storedScribbit);
      if (!scribbit || scribbit.isFounding || scribbit.status !== 'alive') {
        await transaction.unwatch();
        return { status: 'target-unavailable' };
      }
      const report = input.report;
      const updatedScribbit = applyBattleOutcomeToScribbit(
        scribbit,
        report.winner === 'a' ? 'win' : 'loss',
        input.winnerXpGain
      );

      await transaction.multi();
      await transaction.hSet(dailyFlagsKey, {
        [bossChallengeFlag]: reportReceipt,
        [bossChallengeReportField]: serializeBattleReport(report),
      });
      await transaction.expire(dailyFlagsKey, DAILY_FLAG_TTL_SECONDS);
      await transaction.set(scribbitKey, serializeScribbit(updatedScribbit));
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return { status: 'committed', report, recovered: false };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Champion challenge');
      if (error instanceof DailyActionInvariantError) throw error;
      const recoveredReceipt = await storage.hGet(
        dailyFlagsKey,
        bossChallengeFlag
      );
      if (recoveredReceipt === reportReceipt) {
        const recoveredReport = parseChampionReportReceipt(
          await storage.hGet(dailyFlagsKey, bossChallengeReportField),
          {
            reportId: reportReceipt,
            day: input.day,
            challengerId: input.challengerId,
            championId: input.championId,
          }
        );
        if (!recoveredReport) {
          throw new DailyActionInvariantError(
            `Champion receipt ${reportReceipt} has no battle report.`
          );
        }
        return {
          status: 'committed',
          report: recoveredReport,
          recovered: true,
        };
      }
      if (recoveredReceipt !== undefined) {
        return { status: 'already-challenged' };
      }
      throw error;
    }
  }

  throw new Error('Champion challenge changed too often to commit safely.');
};
