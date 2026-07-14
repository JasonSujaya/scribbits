import {
  RIVAL_RUN_LENGTH,
  type RivalRunChoice,
  type RivalRunState,
} from '../../shared/arena';

/** Every bout keeps the complete safe/even/risky choice set available. */
export function selectBattleBoardChoices(
  choices: readonly RivalRunChoice[]
): readonly RivalRunChoice[] {
  return Object.freeze(choices.slice(0, RIVAL_RUN_LENGTH));
}

/** A started run belongs to one Scribbit until its three bouts are complete. */
export function isBattleBoardCharacterLocked(
  rivalRun: Pick<RivalRunState, 'boutsCompleted' | 'status'>
): boolean {
  return rivalRun.status === 'active' && rivalRun.boutsCompleted > 0;
}
