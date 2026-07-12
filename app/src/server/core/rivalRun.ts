import {
  RIVAL_RUN_LENGTH,
  type BattleReport,
  type Forecast,
  type RivalRunChoice,
  type RivalRunReceipt,
  type RivalRunState,
  type RivalRunTier,
  type RivalRunWinPoints,
  type Scribbit,
} from '../../shared/arena';
import {
  battleReportTtlSeconds,
  getBattleReportKey,
} from './battleStore';
import { simulate } from './battle';
import { hashTextToSeed } from './random';
import type { ArenaStorage, ArenaTransaction } from './scribbit';

type StoredRivalRun = RivalRunState & {
  schemaVersion: 1;
  lastReportId: string | null;
  lastOutcome: RivalRunReceipt['outcome'] | null;
  lastTier: RivalRunTier | null;
  lastWinPoints: RivalRunWinPoints | null;
  lastPointsAwarded: RivalRunReceipt['pointsAwarded'] | null;
};

type RivalRunAdvanceInput = Readonly<{
  userId: string;
  runId: string;
  dayNumber: number;
  challengerId: string;
  expectedBoutsCompleted: number;
  reportId: string;
  report: BattleReport;
  playerWon: boolean;
  opponentId: string;
  tier: RivalRunTier;
  winPoints: RivalRunWinPoints;
}>;

const maximumTransactionAttempts = 5;
const rivalRunTtlSeconds = 2 * 24 * 60 * 60;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBoundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number
): value is number => {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
};

const isIdentifier = (value: unknown): value is string => {
  return typeof value === 'string' && value.length >= 1 && value.length <= 128;
};

const tierPointsMatch = (
  tier: RivalRunTier,
  winPoints: RivalRunWinPoints
): boolean => {
  return (
    (tier === 'safe' && winPoints === 1) ||
    (tier === 'even' && winPoints === 2) ||
    (tier === 'risky' && winPoints === 3)
  );
};

const clonePublicState = (run: StoredRivalRun): RivalRunState => ({
  id: run.id,
  dayNumber: run.dayNumber,
  challengerId: run.challengerId,
  boutsCompleted: run.boutsCompleted,
  wins: run.wins,
  losses: run.losses,
  score: run.score,
  opponentIds: [...run.opponentIds],
  status: run.status,
});

const createReceipt = (run: StoredRivalRun): RivalRunReceipt | null => {
  if (
    run.boutsCompleted < 1 ||
    run.lastOutcome === null ||
    run.lastTier === null ||
    run.lastWinPoints === null ||
    run.lastPointsAwarded === null
  ) {
    return null;
  }
  return {
    ...clonePublicState(run),
    boutNumber: run.boutsCompleted,
    outcome: run.lastOutcome,
    tier: run.lastTier,
    winPoints: run.lastWinPoints,
    pointsAwarded: run.lastPointsAwarded,
  };
};

const parseStoredRivalRun = (stored: string | undefined): StoredRivalRun | null => {
  if (stored === undefined) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (!isRecord(value)) return null;
    const boutsCompleted = value.boutsCompleted;
    const wins = value.wins;
    const losses = value.losses;
    const score = value.score;
    const opponentIds = value.opponentIds;
    const expectedStatus =
      boutsCompleted === RIVAL_RUN_LENGTH ? 'complete' : 'active';
    if (
      value.schemaVersion !== 1 ||
      !isIdentifier(value.id) ||
      !isBoundedInteger(value.dayNumber, 1, Number.MAX_SAFE_INTEGER) ||
      !isIdentifier(value.challengerId) ||
      !isBoundedInteger(boutsCompleted, 0, RIVAL_RUN_LENGTH) ||
      !isBoundedInteger(wins, 0, RIVAL_RUN_LENGTH) ||
      !isBoundedInteger(losses, 0, RIVAL_RUN_LENGTH) ||
      !isBoundedInteger(score, 0, RIVAL_RUN_LENGTH * 3) ||
      !Array.isArray(opponentIds) ||
      opponentIds.length !== boutsCompleted ||
      opponentIds.some((opponentId) => !isIdentifier(opponentId)) ||
      new Set(opponentIds).size !== opponentIds.length ||
      wins + losses !== boutsCompleted ||
      value.status !== expectedStatus ||
      (value.lastReportId !== null && !isIdentifier(value.lastReportId)) ||
      (value.lastOutcome !== null &&
        value.lastOutcome !== 'win' &&
        value.lastOutcome !== 'loss') ||
      (value.lastTier !== null &&
        value.lastTier !== 'safe' &&
        value.lastTier !== 'even' &&
        value.lastTier !== 'risky') ||
      (value.lastWinPoints !== null &&
        value.lastWinPoints !== 1 &&
        value.lastWinPoints !== 2 &&
        value.lastWinPoints !== 3) ||
      (value.lastPointsAwarded !== null &&
        value.lastPointsAwarded !== 0 &&
        value.lastPointsAwarded !== 1 &&
        value.lastPointsAwarded !== 2 &&
        value.lastPointsAwarded !== 3) ||
      (value.lastReportId === null) !== (value.lastOutcome === null) ||
      (value.lastReportId === null) !== (value.lastTier === null) ||
      (value.lastReportId === null) !== (value.lastWinPoints === null) ||
      (value.lastReportId === null) !== (value.lastPointsAwarded === null) ||
      (value.lastTier !== null &&
        value.lastWinPoints !== null &&
        !tierPointsMatch(value.lastTier, value.lastWinPoints)) ||
      (boutsCompleted === 0) !== (value.lastReportId === null)
    ) {
      return null;
    }
    return value as StoredRivalRun;
  } catch {
    return null;
  }
};

const discardTransaction = async (
  transaction: ArenaTransaction | undefined
): Promise<void> => {
  if (!transaction) return;
  try {
    await transaction.discard();
  } catch {
    // A failed EXEC may have already closed the transaction.
  }
};

const storedReportMatches = (
  stored: string | undefined,
  expected: BattleReport
): boolean => {
  if (stored === undefined) return false;
  try {
    const parsed = JSON.parse(stored) as BattleReport;
    const { inkAwarded: _storedReward, ...storedCore } = parsed;
    const { inkAwarded: _expectedReward, ...expectedCore } = expected;
    return JSON.stringify(storedCore) === JSON.stringify(expectedCore);
  } catch {
    return false;
  }
};

export const getRivalRunKey = (userId: string): string => {
  return `user:${userId}:rival-run:v1`;
};

export const createRivalRunState = (
  runId: string,
  dayNumber: number,
  challengerId: string
): RivalRunState => {
  if (
    !isIdentifier(runId) ||
    !isBoundedInteger(dayNumber, 1, Number.MAX_SAFE_INTEGER) ||
    !isIdentifier(challengerId)
  ) {
    throw new Error('Rival Run identity is invalid.');
  }
  return {
    id: runId,
    dayNumber,
    challengerId,
    boutsCompleted: 0,
    wins: 0,
    losses: 0,
    score: 0,
    opponentIds: [],
    status: 'active',
  };
};

export const createRivalRunChoices = (
  challenger: Scribbit,
  rivals: readonly Scribbit[],
  forecast: Forecast
): RivalRunChoice[] => {
  const projectionSeeds = [0, 1, 2, 3, 4] as const;
  const rankedRivals = rivals
    .map((rival) => {
      let challengerWins = 0;
      let hitPointMargin = 0;
      for (const projectionIndex of projectionSeeds) {
        const report = simulate(
          challenger,
          rival,
          hashTextToSeed(
            `rival-risk:${forecast.day}:${challenger.id}:${rival.id}:${projectionIndex}`
          ),
          forecast,
          'exhibition'
        );
        const result = report.simulation?.result;
        if (!result) continue;
        if (result.winner === 'a') challengerWins += 1;
        const challengerResult = result.fighters.find(
          (fighter) => fighter.slot === 'a'
        );
        const rivalResult = result.fighters.find(
          (fighter) => fighter.slot === 'b'
        );
        if (challengerResult && rivalResult) {
          hitPointMargin +=
            challengerResult.hitPointPermille - rivalResult.hitPointPermille;
        }
      }
      return { rival, challengerWins, hitPointMargin };
    })
    .sort((left, right) => {
      return (
        right.challengerWins - left.challengerWins ||
        right.hitPointMargin - left.hitPointMargin ||
        left.rival.id.localeCompare(right.rival.id)
      );
    })
    .map((projection) => projection.rival);
  const tiers = [
    { tier: 'safe', winPoints: 1 },
    { tier: 'even', winPoints: 2 },
    { tier: 'risky', winPoints: 3 },
  ] as const;
  return rankedRivals.slice(0, tiers.length).flatMap((rival, index) => {
    const tier = tiers[index];
    return tier ? [{ rival, ...tier }] : [];
  });
};

export const advanceRivalRunState = (
  run: RivalRunState,
  input: Readonly<{
    expectedBoutsCompleted: number;
    playerWon: boolean;
    tier: RivalRunTier;
    winPoints: RivalRunWinPoints;
    opponentId: string;
  }>
): RivalRunReceipt | null => {
  if (
    run.status !== 'active' ||
    run.boutsCompleted !== input.expectedBoutsCompleted ||
    !tierPointsMatch(input.tier, input.winPoints)
    || !isIdentifier(input.opponentId)
    || run.opponentIds.includes(input.opponentId)
  ) {
    return null;
  }
  const pointsAwarded: RivalRunReceipt['pointsAwarded'] = input.playerWon
    ? input.winPoints
    : 0;
  const boutsCompleted = run.boutsCompleted + 1;
  return {
    ...run,
    boutsCompleted,
    wins: run.wins + (input.playerWon ? 1 : 0),
    losses: run.losses + (input.playerWon ? 0 : 1),
    score: run.score + pointsAwarded,
    opponentIds: [...run.opponentIds, input.opponentId],
    status: boutsCompleted === RIVAL_RUN_LENGTH ? 'complete' : 'active',
    boutNumber: boutsCompleted,
    outcome: input.playerWon ? 'win' : 'loss',
    tier: input.tier,
    winPoints: input.winPoints,
    pointsAwarded,
  };
};

const toStoredRivalRun = (state: RivalRunState): StoredRivalRun => ({
  schemaVersion: 1,
  ...state,
  lastReportId: null,
  lastOutcome: null,
  lastTier: null,
  lastWinPoints: null,
  lastPointsAwarded: null,
});

export const getOrCreateRivalRun = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    runId: string;
    dayNumber: number;
    challengerId: string;
  }>
): Promise<RivalRunState> => {
  if (!storage.watch) {
    throw new Error('Rival Run creation requires transaction support.');
  }
  const key = getRivalRunKey(input.userId);
  const newRun = toStoredRivalRun(
    createRivalRunState(input.runId, input.dayNumber, input.challengerId)
  );

  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(key);
      const current = parseStoredRivalRun(await storage.get(key));
      if (
        current?.status === 'active' &&
        current.dayNumber === input.dayNumber &&
        current.challengerId === input.challengerId
      ) {
        await transaction.unwatch();
        return clonePublicState(current);
      }
      await transaction.multi();
      await transaction.set(key, JSON.stringify(newRun));
      await transaction.expire(key, rivalRunTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return clonePublicState(newRun);
      }
    } catch (error) {
      await discardTransaction(transaction);
      const recovered = parseStoredRivalRun(await storage.get(key));
      if (recovered?.id === newRun.id) return clonePublicState(recovered);
      throw error;
    }
  }
  throw new Error('Rival Run changed too often to start.');
};

export const loadRivalRun = async (
  storage: ArenaStorage,
  userId: string
): Promise<RivalRunState | null> => {
  const stored = parseStoredRivalRun(
    await storage.get(getRivalRunKey(userId))
  );
  return stored ? clonePublicState(stored) : null;
};

export const advanceRivalRun = async (
  storage: ArenaStorage,
  input: RivalRunAdvanceInput
): Promise<RivalRunReceipt | null> => {
  if (
    input.report.id !== input.reportId ||
    input.report.kind !== 'exhibition'
  ) {
    throw new Error('Rival Run report identity is invalid.');
  }
  if (!tierPointsMatch(input.tier, input.winPoints)) {
    throw new Error('Rival Run tier points are invalid.');
  }
  if (!storage.watch) {
    throw new Error('Rival Run advancement requires transaction support.');
  }
  const key = getRivalRunKey(input.userId);
  const reportKey = getBattleReportKey(input.reportId);

  for (let attempt = 0; attempt < maximumTransactionAttempts; attempt += 1) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(key, reportKey);
      const current = parseStoredRivalRun(await storage.get(key));
      const storedReport = await storage.get(reportKey);
      if (current?.lastReportId === input.reportId) {
        const receipt = createReceipt(current);
        if (!receipt) {
          await transaction.unwatch();
          return null;
        }
        const expectedReport = { ...input.report, rivalRun: receipt };
        if (storedReport !== undefined) {
          if (!storedReportMatches(storedReport, expectedReport)) {
            throw new Error(`Battle report id collision for ${input.reportId}.`);
          }
          await transaction.unwatch();
          return receipt;
        }
        await transaction.multi();
        await transaction.set(reportKey, JSON.stringify(expectedReport));
        await transaction.expire(reportKey, battleReportTtlSeconds);
        const recoveryResult = await transaction.exec();
        if (Array.isArray(recoveryResult) && recoveryResult.length > 0) {
          return receipt;
        }
        continue;
      }
      if (
        !current ||
        current.id !== input.runId ||
        current.dayNumber !== input.dayNumber ||
        current.challengerId !== input.challengerId ||
        current.status !== 'active' ||
        current.boutsCompleted !== input.expectedBoutsCompleted
      ) {
        await transaction.unwatch();
        return null;
      }

      const receipt = advanceRivalRunState(clonePublicState(current), input);
      if (!receipt) {
        await transaction.unwatch();
        return null;
      }
      const next: StoredRivalRun = {
        ...current,
        boutsCompleted: receipt.boutsCompleted,
        wins: receipt.wins,
        losses: receipt.losses,
        score: receipt.score,
        opponentIds: receipt.opponentIds,
        status: receipt.status,
        lastReportId: input.reportId,
        lastOutcome: receipt.outcome,
        lastTier: input.tier,
        lastWinPoints: input.winPoints,
        lastPointsAwarded: receipt.pointsAwarded,
      };
      const reportToStore: BattleReport = {
        ...input.report,
        rivalRun: receipt,
      };
      if (
        storedReport !== undefined &&
        !storedReportMatches(storedReport, reportToStore)
      ) {
        throw new Error(`Battle report id collision for ${input.reportId}.`);
      }
      await transaction.multi();
      await transaction.set(key, JSON.stringify(next));
      await transaction.expire(key, rivalRunTtlSeconds);
      await transaction.set(reportKey, JSON.stringify(reportToStore));
      await transaction.expire(reportKey, battleReportTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return createReceipt(next);
      }
    } catch (error) {
      await discardTransaction(transaction);
      const recovered = parseStoredRivalRun(await storage.get(key));
      if (recovered?.lastReportId === input.reportId) {
        const receipt = createReceipt(recovered);
        if (
          receipt &&
          storedReportMatches(await storage.get(reportKey), {
            ...input.report,
            rivalRun: receipt,
          })
        ) {
          return receipt;
        }
      }
      throw error;
    }
  }
  throw new Error('Rival Run changed too often to advance.');
};
