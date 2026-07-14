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
import type { DamageSource } from '../../shared/combat/types';
import { selectCombatRole } from '../../shared/combat/selection';
import { createCombatRoleMatchupRead } from '../../shared/combat/roles';
import {
  advanceRivalRunChallenge,
  createLegacyRivalRunChallenge,
  createRivalRunChallenge,
  isRivalRunChallenge,
  rivalRunChallengeGoalMet,
} from '../../shared/rivalrunchallenges';
import { battleReportTtlSeconds, getBattleReportKey } from './battleStore';
import { simulate } from './battle';
import { hashTextToSeed } from './random';
import { jsonValuesMatch } from './jsonValues';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';

type StoredRivalRun = RivalRunState & {
  schemaVersion: 2;
  lastReportId: string | null;
  lastOutcome: RivalRunReceipt['outcome'] | null;
  lastTier: RivalRunTier | null;
  lastWinPoints: RivalRunWinPoints | null;
  lastPointsAwarded: RivalRunReceipt['pointsAwarded'] | null;
};

type StoredRivalRunParseResult =
  | { status: 'missing' }
  | { status: 'valid'; run: StoredRivalRun }
  | { status: 'invalid' };

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
  challenge: {
    ...run.challenge,
    condition: { ...run.challenge.condition },
  },
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

const parseStoredRivalRun = (
  stored: string | undefined
): StoredRivalRunParseResult => {
  if (stored === undefined) return { status: 'missing' };
  try {
    const value: unknown = JSON.parse(stored);
    if (!isRecord(value)) return { status: 'invalid' };
    const boutsCompleted = value.boutsCompleted;
    const wins = value.wins;
    const losses = value.losses;
    const score = value.score;
    const opponentIds = value.opponentIds;
    const expectedStatus =
      boutsCompleted === RIVAL_RUN_LENGTH ? 'complete' : 'active';
    if (
      (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
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
      return { status: 'invalid' };
    }
    const status = value.status as RivalRunState['status'];
    const parsedChallenge =
      value.schemaVersion === 1
        ? createLegacyRivalRunChallenge(Number(boutsCompleted), status)
        : isRivalRunChallenge(value.challenge)
          ? value.challenge
          : null;
    if (
      !parsedChallenge ||
      parsedChallenge.completionAchieved !==
        (status === 'complete' && rivalRunChallengeGoalMet(parsedChallenge))
    ) {
      return { status: 'invalid' };
    }
    return {
      status: 'valid',
      run: {
        ...(value as unknown as Omit<
          StoredRivalRun,
          'schemaVersion' | 'challenge'
        >),
        schemaVersion: 2,
        challenge: {
          ...parsedChallenge,
          condition: { ...parsedChallenge.condition },
        },
      },
    };
  } catch {
    return { status: 'invalid' };
  }
};

const requireStoredRivalRun = (
  stored: string | undefined
): StoredRivalRun | undefined => {
  const parsed = parseStoredRivalRun(stored);
  if (parsed.status === 'missing') return undefined;
  if (parsed.status === 'valid') return parsed.run;
  throw new Error('Stored Rival Run is invalid.');
};

const storedReportMatches = (
  stored: string | undefined,
  expected: BattleReport
): boolean => {
  if (stored === undefined) return false;
  try {
    const parsed = JSON.parse(stored) as BattleReport;
    const rawReceipt = parsed.rivalRun as unknown;
    if (
      isRecord(rawReceipt) &&
      rawReceipt.challenge === undefined &&
      isBoundedInteger(rawReceipt.boutsCompleted, 1, RIVAL_RUN_LENGTH) &&
      (rawReceipt.status === 'active' || rawReceipt.status === 'complete')
    ) {
      parsed.rivalRun = {
        ...(rawReceipt as unknown as RivalRunReceipt),
        challenge: createLegacyRivalRunChallenge(
          Number(rawReceipt.boutsCompleted),
          rawReceipt.status
        ),
      };
    }
    const { inkAwarded: _storedReward, ...storedCore } = parsed;
    const { inkAwarded: _expectedReward, ...expectedCore } = expected;
    return jsonValuesMatch(storedCore, expectedCore);
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
  challengerId: string,
  previousChallengeId?: string
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
    challenge: createRivalRunChallenge(
      runId,
      dayNumber,
      challengerId,
      previousChallengeId
    ),
  };
};

export const createRivalRunChoices = (
  challenger: Scribbit,
  rivals: readonly Scribbit[],
  forecast: Forecast
): RivalRunChoice[] => {
  const rankedRivals = rivals
    .map((rival) => {
      const report = simulate(
        challenger,
        rival,
        hashTextToSeed(
          `rival-risk:v4:${forecast.day}:${challenger.id}:${rival.id}`
        ),
        forecast,
        'exhibition'
      );
      const result = report.simulation?.result;
      const challengerResult = result?.fighters.find(
        (fighter) => fighter.slot === 'a'
      );
      const rivalResult = result?.fighters.find(
        (fighter) => fighter.slot === 'b'
      );
      return {
        rival,
        challengerWon: result?.winner === 'a',
        hitPointMargin:
          challengerResult && rivalResult
            ? challengerResult.hitPointPermille - rivalResult.hitPointPermille
            : 0,
      };
    })
    .sort((left, right) => {
      return (
        Number(right.challengerWon) - Number(left.challengerWon) ||
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
    return tier
      ? [
          {
            rival,
            ...tier,
            matchup: createCombatRoleMatchupRead(
              selectCombatRole(challenger.stats),
              selectCombatRole(rival.stats)
            ),
          },
        ]
      : [];
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
    playerAbilityActivations: number;
    playerShapePowerHitBouts: number;
    playerLateShapePowerActivations: number;
  }>
): RivalRunReceipt | null => {
  if (
    run.status !== 'active' ||
    run.boutsCompleted !== input.expectedBoutsCompleted ||
    !tierPointsMatch(input.tier, input.winPoints) ||
    !isIdentifier(input.opponentId) ||
    run.opponentIds.includes(input.opponentId)
  ) {
    return null;
  }
  const pointsAwarded: RivalRunReceipt['pointsAwarded'] = input.playerWon
    ? input.winPoints
    : 0;
  const boutsCompleted = run.boutsCompleted + 1;
  const wins = run.wins + (input.playerWon ? 1 : 0);
  const losses = run.losses + (input.playerWon ? 0 : 1);
  const score = run.score + pointsAwarded;
  const status = boutsCompleted === RIVAL_RUN_LENGTH ? 'complete' : 'active';
  const outcome = input.playerWon ? 'win' : 'loss';
  return {
    ...run,
    boutsCompleted,
    wins,
    losses,
    score,
    opponentIds: [...run.opponentIds, input.opponentId],
    status,
    challenge: advanceRivalRunChallenge(run.challenge, {
      boutNumber: boutsCompleted,
      outcome,
      tier: input.tier,
      wins,
      score,
      status,
      playerAbilityActivations: input.playerAbilityActivations,
      playerShapePowerHitBouts: input.playerShapePowerHitBouts,
      playerLateShapePowerActivations: input.playerLateShapePowerActivations,
    }),
    boutNumber: boutsCompleted,
    outcome,
    tier: input.tier,
    winPoints: input.winPoints,
    pointsAwarded,
  };
};

const countPlayerAbilityActivations = (
  report: BattleReport,
  challengerId: string
): number => {
  if (report.a.id !== challengerId || !report.simulation) return 0;
  return report.simulation.timeline.reduce(
    (count, event) =>
      count + Number(event.kind === 'ability_activated' && event.actor === 'a'),
    0
  );
};

const SHAPE_POWER_DAMAGE_SOURCES: ReadonlySet<DamageSource> = new Set([
  'inkquake',
  'nib_halo',
  'smearstep',
  'colorburst',
  'colorburst_echo',
]);

type RivalRunTranscriptMetrics = Readonly<{
  playerAbilityActivations: number;
  playerShapePowerHitBouts: number;
  playerLateShapePowerActivations: number;
}>;

const deriveRivalRunTranscriptMetrics = (
  report: BattleReport,
  challengerId: string
): RivalRunTranscriptMetrics => {
  const playerAbilityActivations = countPlayerAbilityActivations(
    report,
    challengerId
  );
  const simulation = report.simulation;
  if (
    report.a.id !== challengerId ||
    !simulation ||
    simulation.eventsTruncated !== false
  ) {
    return {
      playerAbilityActivations,
      playerShapePowerHitBouts: 0,
      playerLateShapePowerActivations: 0,
    };
  }

  const playerShapePowerHitBouts = Number(
    simulation.timeline.some(
      (event) =>
        event.kind === 'damage' &&
        event.sourceFighter === 'a' &&
        SHAPE_POWER_DAMAGE_SOURCES.has(event.source)
    )
  );
  const lateFightStarted = simulation.timeline.find(
    (event) => event.kind === 'late_fight_started'
  );
  const playerLateShapePowerActivations = Number(
    lateFightStarted !== undefined &&
      simulation.timeline.some(
        (event) =>
          event.kind === 'ability_activated' &&
          event.actor === 'a' &&
          event.tick >= lateFightStarted.tick
      )
  );

  return {
    playerAbilityActivations,
    playerShapePowerHitBouts,
    playerLateShapePowerActivations,
  };
};

const toStoredRivalRun = (state: RivalRunState): StoredRivalRun => ({
  schemaVersion: 2,
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

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    let newRun: StoredRivalRun | undefined;
    try {
      transaction = await storage.watch(key);
      const current = requireStoredRivalRun(await storage.get(key));
      if (
        current?.status === 'active' &&
        current.dayNumber === input.dayNumber &&
        current.challengerId === input.challengerId
      ) {
        await transaction.unwatch();
        return clonePublicState(current);
      }
      newRun = toStoredRivalRun(
        createRivalRunState(
          input.runId,
          input.dayNumber,
          input.challengerId,
          current?.challenge.id
        )
      );
      await transaction.multi();
      await transaction.set(key, JSON.stringify(newRun));
      await transaction.expire(key, rivalRunTtlSeconds);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) {
        return clonePublicState(newRun);
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Rival Run');
      const recovered = requireStoredRivalRun(await storage.get(key));
      if (newRun && recovered?.id === newRun.id) {
        return clonePublicState(recovered);
      }
      throw error;
    }
  }
  throw new Error('Rival Run changed too often to start.');
};

export const loadRivalRun = async (
  storage: ArenaStorage,
  userId: string
): Promise<RivalRunState | null> => {
  const stored = requireStoredRivalRun(
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

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(key, reportKey);
      const current = requireStoredRivalRun(await storage.get(key));
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
            throw new Error(
              `Battle report id collision for ${input.reportId}.`
            );
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

      const receipt = advanceRivalRunState(clonePublicState(current), {
        ...input,
        ...deriveRivalRunTranscriptMetrics(input.report, current.challengerId),
      });
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
        challenge: receipt.challenge,
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
      await discardWatchedTransaction(transaction, 'Rival Run');
      const recovered = requireStoredRivalRun(await storage.get(key));
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
