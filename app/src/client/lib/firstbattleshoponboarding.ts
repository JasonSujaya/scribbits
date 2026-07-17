import type { ArenaState } from '../../shared/arena';
import { planFirstChestTrailStep } from './firstchesttrail';

export type FirstBattleShopOnboardingPlan = Readonly<{
  unlockLabel: string;
  unlockDetail: string;
  recommendationLabel: string;
  recommendationAccessibleLabel: string;
}>;

type FirstBattleShopOnboardingState = Pick<
  ArenaState,
  | 'hasCompletedBattle'
  | 'myScribbits'
  | 'myInk'
  | 'nextCapsuleCost'
  | 'capsuleProgress'
>;

/**
 * Keeps the first-Shop recommendation tied to authoritative progression. The
 * guide never promises a chest unless the first battle is complete and the
 * server-owned balance can already pay the server-owned price.
 */
export function planFirstBattleShopOnboarding(
  state: FirstBattleShopOnboardingState | undefined
): FirstBattleShopOnboardingPlan | null {
  if (!state?.hasCompletedBattle) return null;
  const scribbit = state.myScribbits.find(
    (candidate) => candidate.status === 'alive'
  );
  if (!scribbit) return null;

  const firstChest = planFirstChestTrailStep({
    scribbit,
    ink: state.myInk,
    chestCost: state.nextCapsuleCost,
    capsulePullCount: state.capsuleProgress.pullCount,
  });
  if (!firstChest) return null;

  return Object.freeze({
    unlockLabel: 'SHOP UNLOCKED!',
    unlockDetail: 'YOUR FIRST CHEST IS WAITING',
    recommendationLabel: 'TAP SHOP!',
    recommendationAccessibleLabel: firstChest.accessibleLabel,
  });
}
