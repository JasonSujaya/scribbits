import type {
  RivalRunChallenge,
  RivalRunChallengeCondition,
  RivalRunStatus,
  RivalRunTier,
} from './arena';
import { hashStringToUint32 } from './stablehash';

type RivalRunChallengeDefinition = Readonly<
  Omit<RivalRunChallenge, 'progress' | 'completionAchieved'>
>;

export type RivalRunChallengeBout = Readonly<{
  boutNumber: number;
  outcome: 'win' | 'loss';
  tier: RivalRunTier;
  wins: number;
  score: number;
  status: RivalRunStatus;
}>;

const challenge = (
  definition: RivalRunChallengeDefinition
): RivalRunChallengeDefinition => Object.freeze(definition);

/**
 * Immutable v1 catalog. Rewording or reordering requires a new version because
 * the selected snapshot is stored in live runs and historical battle reports.
 */
export const RIVAL_RUN_CHALLENGES: readonly RivalRunChallengeDefinition[] =
  Object.freeze([
    challenge({
      id: 'v1-clean-sweep',
      name: 'CLEAN SWEEP',
      premise: 'Three rivals. Leave no ink standing.',
      goal: 'WIN ALL 3',
      stamp: '3–0 SWEEP',
      condition: { kind: 'minimum_wins', target: 3 },
    }),
    challenge({
      id: 'v1-winning-ink',
      name: 'WINNING INK',
      premise: 'Take the card, however messy it gets.',
      goal: 'WIN 2 OF 3',
      stamp: 'CARD WON',
      condition: { kind: 'minimum_wins', target: 2 },
    }),
    challenge({
      id: 'v1-high-five',
      name: 'HIGH FIVE',
      premise: 'Balance courage and survival for a fat score.',
      goal: 'SCORE 5+',
      stamp: '5+ POINTS',
      condition: { kind: 'minimum_score', target: 5 },
    }),
    challenge({
      id: 'v1-six-shooter',
      name: 'SIX SHOOTER',
      premise: 'Only bold wins make this number.',
      goal: 'SCORE 6+',
      stamp: '6+ POINTS',
      condition: { kind: 'minimum_score', target: 6 },
    }),
    challenge({
      id: 'v1-perfect-nine',
      name: 'PERFECT NINE',
      premise: 'Three bold rivals. Three wins. Maximum ink.',
      goal: 'SCORE 9',
      stamp: 'PERFECT 9',
      condition: { kind: 'minimum_score', target: 9 },
    }),
    challenge({
      id: 'v1-all-in',
      name: 'ALL IN',
      premise: 'Never take the quiet corner of the card.',
      goal: 'PICK BOLD ×3',
      stamp: 'BOLD ×3',
      condition: { kind: 'tier_picks', tier: 'risky', target: 3 },
    }),
    challenge({
      id: 'v1-risk-win',
      name: 'GIANT KILLER',
      premise: 'One dangerous rival is enough—if you win.',
      goal: 'WIN 1 BOLD',
      stamp: 'BOLD WIN',
      condition: { kind: 'tier_wins', tier: 'risky', target: 1 },
    }),
    challenge({
      id: 'v1-double-dare',
      name: 'DOUBLE DARE',
      premise: 'Beat danger twice before the card closes.',
      goal: 'WIN 2 BOLD',
      stamp: 'BOLD ×2',
      condition: { kind: 'tier_wins', tier: 'risky', target: 2 },
    }),
    challenge({
      id: 'v1-steady-hands',
      name: 'STEADY HANDS',
      premise: 'Simple choices still need clean execution.',
      goal: 'WIN 2 SAFE',
      stamp: 'SAFE ×2',
      condition: { kind: 'tier_wins', tier: 'safe', target: 2 },
    }),
    challenge({
      id: 'v1-mixed-ink',
      name: 'MIXED INK',
      premise: 'Try every lane: safe, even, then bold.',
      goal: 'PICK ALL 3 TIERS',
      stamp: '1 • 2 • 3',
      condition: { kind: 'tier_set', targetMask: 7 },
    }),
    challenge({
      id: 'v1-bounce-back',
      name: 'BOUNCE BACK',
      premise: 'Drop the opener. Take the next two.',
      goal: 'LOSE • WIN • WIN',
      stamp: 'BACK ON TOP',
      condition: { kind: 'outcome_sequence', sequence: 'loss-win-win' },
    }),
    challenge({
      id: 'v1-final-word',
      name: 'FINAL WORD',
      premise: 'Whatever happens, own the last bell.',
      goal: 'WIN BOUT 3',
      stamp: 'LAST WORD',
      condition: { kind: 'final_win' },
    }),
  ]);

const LEGACY_FINISH_DEFINITION: RivalRunChallengeDefinition = challenge({
  id: 'v1-finish-the-card',
  name: 'FINISH THE CARD',
  premise: 'This run began before challenge cards arrived.',
  goal: 'COMPLETE 3 BOUTS',
  stamp: 'CARD COMPLETE',
  condition: { kind: 'finish_run' },
});

const definitionById = new Map(
  [...RIVAL_RUN_CHALLENGES, LEGACY_FINISH_DEFINITION].map((definition) => [
    definition.id,
    definition,
  ])
);

const cloneDefinition = (
  definition: RivalRunChallengeDefinition,
  progress = 0,
  completionAchieved = false
): RivalRunChallenge => ({
  ...definition,
  condition: { ...definition.condition },
  progress,
  completionAchieved,
});

export const createRivalRunChallenge = (
  runId: string,
  dayNumber: number,
  challengerId: string,
  excludedChallengeId?: string
): RivalRunChallenge => {
  const seed = `rival-run-challenge:v1:${runId}:${dayNumber}:${challengerId}`;
  const selectedIndex =
    hashStringToUint32(seed) % RIVAL_RUN_CHALLENGES.length;
  const firstChoice = RIVAL_RUN_CHALLENGES[selectedIndex];
  const selected =
    firstChoice?.id === excludedChallengeId
      ? RIVAL_RUN_CHALLENGES[(selectedIndex + 1) % RIVAL_RUN_CHALLENGES.length]
      : firstChoice;
  if (!selected) throw new Error('Rival Run challenge catalog is empty.');
  return cloneDefinition(selected);
};

export const createLegacyRivalRunChallenge = (
  boutsCompleted: number,
  status: RivalRunStatus
): RivalRunChallenge =>
  cloneDefinition(
    LEGACY_FINISH_DEFINITION,
    Math.max(0, Math.min(3, Math.floor(boutsCompleted))),
    status === 'complete'
  );

const tierBit = (tier: RivalRunTier): number => {
  if (tier === 'safe') return 1;
  if (tier === 'even') return 2;
  return 4;
};

const bitCount = (value: number): number => {
  let remaining = value >>> 0;
  let count = 0;
  while (remaining > 0) {
    count += remaining & 1;
    remaining >>>= 1;
  }
  return count;
};

export const rivalRunChallengeTarget = (
  condition: RivalRunChallengeCondition
): number => {
  switch (condition.kind) {
    case 'minimum_wins':
    case 'minimum_score':
    case 'tier_picks':
    case 'tier_wins':
      return condition.target;
    case 'tier_set':
    case 'outcome_sequence':
    case 'finish_run':
      return 3;
    case 'final_win':
      return 1;
  }
};

export const rivalRunChallengeMeasuredProgress = (
  challengeState: RivalRunChallenge
): number =>
  challengeState.condition.kind === 'tier_set'
    ? bitCount(challengeState.progress & 7)
    : challengeState.progress;

export const rivalRunChallengeGoalMet = (
  challengeState: RivalRunChallenge
): boolean =>
  rivalRunChallengeMeasuredProgress(challengeState) >=
  rivalRunChallengeTarget(challengeState.condition);

export const advanceRivalRunChallenge = (
  current: RivalRunChallenge,
  bout: RivalRunChallengeBout
): RivalRunChallenge => {
  const condition = current.condition;
  let progress = current.progress;
  switch (condition.kind) {
    case 'minimum_wins':
      progress = Math.min(condition.target, bout.wins);
      break;
    case 'minimum_score':
      progress = Math.min(condition.target, bout.score);
      break;
    case 'tier_picks':
      if (bout.tier === condition.tier) {
        progress = Math.min(condition.target, progress + 1);
      }
      break;
    case 'tier_wins':
      if (bout.tier === condition.tier && bout.outcome === 'win') {
        progress = Math.min(condition.target, progress + 1);
      }
      break;
    case 'tier_set':
      progress |= tierBit(bout.tier);
      break;
    case 'outcome_sequence':
      if (bout.boutNumber === 1) progress = bout.outcome === 'loss' ? 1 : 0;
      else if (bout.boutNumber === 2) {
        progress = progress === 1 && bout.outcome === 'win' ? 2 : progress;
      } else if (bout.boutNumber === 3) {
        progress = progress === 2 && bout.outcome === 'win' ? 3 : progress;
      }
      break;
    case 'final_win':
      if (bout.boutNumber === 3 && bout.outcome === 'win') progress = 1;
      break;
    case 'finish_run':
      progress = Math.min(3, bout.boutNumber);
      break;
  }
  const next = { ...current, condition: { ...condition }, progress };
  return {
    ...next,
    completionAchieved:
      bout.status === 'complete' && rivalRunChallengeGoalMet(next),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isRivalRunChallenge = (
  value: unknown
): value is RivalRunChallenge => {
  if (!isRecord(value) || typeof value.id !== 'string') return false;
  const definition = definitionById.get(value.id);
  if (!definition) return false;
  if (
    value.name !== definition.name ||
    value.premise !== definition.premise ||
    value.goal !== definition.goal ||
    value.stamp !== definition.stamp ||
    JSON.stringify(value.condition) !== JSON.stringify(definition.condition) ||
    !Number.isSafeInteger(value.progress) ||
    Number(value.progress) < 0 ||
    Number(value.progress) > 9 ||
    typeof value.completionAchieved !== 'boolean'
  ) {
    return false;
  }
  const measured = rivalRunChallengeMeasuredProgress(
    value as unknown as RivalRunChallenge
  );
  return measured <= rivalRunChallengeTarget(definition.condition);
};
