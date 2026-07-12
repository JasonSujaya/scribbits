import {
  RIVAL_RUN_LENGTH,
  type RivalRunReceipt,
  type RivalRunState,
} from '../../shared/arena';

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

export function planRivalRunDraftHeading(
  run: RivalRunState
): RivalRunDraftHeading {
  const nextBout = Math.min(RIVAL_RUN_LENGTH, run.boutsCompleted + 1);
  return {
    title: 'RIVAL RUN',
    subtitle: `BOUT ${nextBout}/${RIVAL_RUN_LENGTH} • ${run.score} PTS`,
  };
}

export function formatRivalRunBattleLabel(
  receipt: RivalRunReceipt
): string {
  const scoreBeforeBout = receipt.score - receipt.pointsAwarded;
  return `RUN ${receipt.boutNumber}/${RIVAL_RUN_LENGTH} • SCORE ${scoreBeforeBout}`;
}

export function formatRivalRunResultLine(
  receipt: RivalRunReceipt
): string {
  return receipt.status === 'complete'
    ? `${receipt.wins > receipt.losses ? 'RUN CHAMPION' : 'RUN COMPLETE'} • ${receipt.wins}–${receipt.losses} • ${receipt.score} PTS`
    : `RUN ${receipt.boutNumber}/${RIVAL_RUN_LENGTH} • ${receipt.wins}–${receipt.losses} • SCORE ${receipt.score}`;
}

export function planRivalRunFinishStamp(
  receipt: RivalRunReceipt | undefined
): RivalRunFinishStamp | null {
  if (receipt?.status !== 'complete') return null;
  return {
    title: receipt.wins > receipt.losses ? 'RUN CHAMPION' : 'RUN COMPLETE',
    score: `${receipt.score} PTS`,
    record: `${receipt.wins}–${receipt.losses}`,
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
