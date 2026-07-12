import {
  RIVAL_RUN_LENGTH,
  type RivalRunReceipt,
  type RivalRunState,
} from '../../shared/arena';
import {
  rivalRunChallengeMeasuredProgress,
  rivalRunChallengeTarget,
} from '../../shared/rivalrunchallenges';

export type RivalRunDraftHeading = Readonly<{
  title: string;
  subtitle: string;
}>;

export type RivalRunActionCopy = Readonly<{
  label: string;
  accessibleLabel: string;
}>;

export type RivalRunFinishStamp = Readonly<{
  title: string;
  score: string;
  record: string;
}>;

export type RivalRunChallengeCopy = Readonly<{
  name: string;
  premise: string;
  goal: string;
  progress: string;
  status: string;
  accessibleSummary: string;
}>;

export function planRivalRunChallengeCopy(
  run: RivalRunState
): RivalRunChallengeCopy {
  const measured = rivalRunChallengeMeasuredProgress(run.challenge);
  const target = rivalRunChallengeTarget(run.challenge.condition);
  const progress = `${Math.min(measured, target)}/${target}`;
  const status =
    run.status === 'active'
      ? `${progress} • IN PLAY`
      : run.challenge.completionAchieved
        ? `STAMPED • ${run.challenge.stamp}`
        : `MISSED • ${run.challenge.goal}`;
  return {
    name: run.challenge.name,
    premise: run.challenge.premise,
    goal: run.challenge.goal,
    progress,
    status,
    accessibleSummary: `${run.challenge.name}. ${run.challenge.premise} Goal: ${run.challenge.goal}. ${status}.`,
  };
}

export function planRivalRunDraftHeading(
  run: RivalRunState
): RivalRunDraftHeading {
  const nextBout = Math.min(RIVAL_RUN_LENGTH, run.boutsCompleted + 1);
  return {
    title: run.challenge.name,
    subtitle: `RIVAL RUN • BOUT ${nextBout}/${RIVAL_RUN_LENGTH} • ${run.score} PTS`,
  };
}

export function formatRivalRunBattleLabel(receipt: RivalRunReceipt): string {
  const scoreBeforeBout = receipt.score - receipt.pointsAwarded;
  return `${receipt.challenge.name} • ${receipt.boutNumber}/${RIVAL_RUN_LENGTH} • ${scoreBeforeBout} PTS`;
}

export function formatRivalRunResultLine(receipt: RivalRunReceipt): string {
  return receipt.status === 'complete'
    ? `${receipt.challenge.name} • ${receipt.challenge.completionAchieved ? receipt.challenge.stamp : 'MISSED'} • ${receipt.score} PTS`
    : `${receipt.challenge.name} • ${planRivalRunChallengeCopy(receipt).progress} • ${receipt.score} PTS`;
}

export function planRivalRunFinishStamp(
  receipt: RivalRunReceipt | undefined
): RivalRunFinishStamp | null {
  if (receipt?.status !== 'complete') return null;
  return {
    title: receipt.challenge.completionAchieved
      ? `${receipt.challenge.name} COMPLETE`
      : receipt.challenge.name,
    score: receipt.challenge.completionAchieved
      ? receipt.challenge.stamp
      : 'CHALLENGE MISSED',
    record: `${receipt.score} PTS • ${receipt.wins}–${receipt.losses}`,
  };
}

export function planRivalRunActionCopy(
  receipt: RivalRunReceipt | undefined
): RivalRunActionCopy {
  if (receipt?.status === 'complete') {
    return {
      label: 'NEW RIVAL RUN',
      accessibleLabel: 'Start a new Rival Run',
    };
  }
  if (receipt) {
    if (receipt.boutNumber === RIVAL_RUN_LENGTH - 1) {
      return {
        label: 'FINAL RIVAL',
        accessibleLabel: 'Choose the final Rival Run opponent',
      };
    }
    return {
      label: 'NEXT RIVAL',
      accessibleLabel: 'Choose the next Rival Run opponent',
    };
  }
  return {
    label: 'CHOOSE A RIVAL',
    accessibleLabel: 'Choose a rival',
  };
}
