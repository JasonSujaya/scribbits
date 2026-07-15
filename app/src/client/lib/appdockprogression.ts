import type { ArenaState } from '../../shared/arena';

export type AppDockProgressionTab =
  | 'arena'
  | 'bag'
  | 'home'
  | 'battles'
  | 'shop';

type AppDockProgressionState = Pick<
  ArenaState,
  | 'hasCreatedScribbit'
  | 'hasCompletedBattle'
  | 'myScribbits'
  | 'capsuleProgress'
>;

export function isAppDockTabUnlocked(
  state: AppDockProgressionState | undefined,
  tab: AppDockProgressionTab
): boolean {
  if (tab === 'home') return true;
  if (!state || state.myScribbits.length === 0) return false;

  const hasOpenedMysteryInk = state.capsuleProgress.pullCount > 0;
  const hasCompletedBattle = hasOpenedMysteryInk || state.hasCompletedBattle;
  const hasCreatedScribbit = hasCompletedBattle || state.hasCreatedScribbit;

  if (tab === 'battles') return hasCreatedScribbit;
  if (tab === 'shop') return hasCompletedBattle;
  return hasOpenedMysteryInk;
}
