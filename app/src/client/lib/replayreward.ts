import type { SparRewardReceipt } from '../../shared/sparreward';
import { MAX_LEVEL } from '../../shared/progression';

export type ReplayRewardPlan = Readonly<{
  label: string;
  accessibleLabel: string;
  celebratesLevelUp: boolean;
}>;

export function selectReplaySparReward(input: {
  receipt: SparRewardReceipt | null;
  reportId: string;
  ownedScribbitId: string;
}): SparRewardReceipt | null {
  return input.receipt?.reportId === input.reportId &&
    input.receipt.scribbitId === input.ownedScribbitId
    ? { ...input.receipt }
    : null;
}

export function planReplayReward(input: {
  receipt: SparRewardReceipt | null;
  savedReplay: boolean;
}): ReplayRewardPlan | null {
  const receipt = input.receipt;
  if (!receipt || (receipt.xpAwarded === 0 && receipt.inkAwarded === 0)) {
    return null;
  }

  const levelUp = receipt.levelAfter > receipt.levelBefore;
  const rewardParts: string[] = [];
  if (receipt.xpAwarded > 0) {
    rewardParts.push(
      levelUp
        ? `LEVEL UP • LV${receipt.levelAfter}`
        : receipt.levelAfter >= MAX_LEVEL
          ? `+${receipt.xpAwarded} XP • MAX LV`
        : `+${receipt.xpAwarded} XP`
    );
  }
  if (receipt.inkAwarded > 0) {
    rewardParts.push(`+${receipt.inkAwarded} INK`);
  }

  const replayPrefix = input.savedReplay ? 'SAVED • ' : '';
  return Object.freeze({
    label: `${replayPrefix}${rewardParts.join(' • ')}`,
    accessibleLabel: `${input.savedReplay ? 'Saved payout. ' : ''}${
      levelUp
        ? `Level up to level ${receipt.levelAfter}. `
        : receipt.xpAwarded > 0
          ? `${receipt.xpAwarded} XP earned. `
          : ''
    }${receipt.inkAwarded > 0 ? `${receipt.inkAwarded} Ink earned.` : ''}`.trim(),
    celebratesLevelUp: levelUp,
  });
}
