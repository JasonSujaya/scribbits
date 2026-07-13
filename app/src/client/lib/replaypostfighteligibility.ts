import type { BattleKind } from '../../shared/arena';

export type ReplayEntryMode = 'fresh' | 'saved';

export type ReplayPostFightEligibilityInput = Readonly<{
  reportKind: BattleKind;
  entryMode: ReplayEntryMode;
  ownedFighterAlive: boolean;
  hasBackedScribbit: boolean;
}>;

export type ReplayPostFightEligibilityPlan = Readonly<{
  canChooseRival: boolean;
  canPickRumble: boolean;
}>;

/** Plans live follow-up actions without changing replay or arena state. */
export function planReplayPostFightEligibility(
  input: ReplayPostFightEligibilityInput
): ReplayPostFightEligibilityPlan {
  const isFreshLiveResult =
    input.entryMode === 'fresh' && input.reportKind !== 'practice';

  return Object.freeze({
    canChooseRival:
      isFreshLiveResult &&
      input.reportKind === 'exhibition' &&
      input.ownedFighterAlive,
    canPickRumble: isFreshLiveResult && !input.hasBackedScribbit,
  });
}
