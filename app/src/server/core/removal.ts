import { removeCurrentChampionIfMatches } from './arenaStore';
import { purgeBattleReportsForScribbit } from './battleStore';
import {
  getScribbitReportsKey,
  purgeScribbitModerationRecords,
} from './moderation';
import {
  deleteStoredScribbit,
  getScribbitOwner,
} from './scribbit';
import type { ArenaStorage } from './storage';

export const removeScribbitCompletely = async (
  storage: ArenaStorage,
  input: Readonly<{
    ownerUserId: string;
    scribbitId: string;
    currentDay: number;
  }>
): Promise<void> => {
  // Battle cleanup must still be able to resolve both fighter owners, so it
  // runs before the Scribbit and owner records are removed.
  await purgeBattleReportsForScribbit(storage, input.scribbitId);
  await purgeScribbitModerationRecords(storage, input.scribbitId);
  await removeCurrentChampionIfMatches(storage, input.scribbitId);
  await deleteStoredScribbit(
    storage,
    input.ownerUserId,
    input.scribbitId,
    input.currentDay
  );
};

export const removeReportedScribbitIfEligible = async (
  storage: ArenaStorage,
  input: Readonly<{
    expectedOwnerUserId: string;
    scribbitId: string;
    currentDay: number;
    minimumReportCount: number;
  }>
): Promise<boolean> => {
  if (
    !Number.isSafeInteger(input.minimumReportCount) ||
    input.minimumReportCount < 1
  ) {
    throw new Error('Scribbit report threshold is invalid.');
  }
  const [ownerUserId, reporterUserIds] = await Promise.all([
    getScribbitOwner(storage, input.scribbitId),
    storage.hKeys(getScribbitReportsKey(input.scribbitId)),
  ]);
  if (
    ownerUserId !== input.expectedOwnerUserId ||
    reporterUserIds.length < input.minimumReportCount
  ) {
    return false;
  }

  await removeScribbitCompletely(storage, {
    ownerUserId,
    scribbitId: input.scribbitId,
    currentDay: input.currentDay,
  });
  return true;
};
