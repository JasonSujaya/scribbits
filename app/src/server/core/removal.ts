import { removeCurrentChampionIfMatches } from './arenaStore';
import { purgeBattleReportsForScribbit } from './battleStore';
import { purgeScribbitModerationRecords } from './moderation';
import {
  deleteStoredScribbit,
  getScribbitOwner,
  getUserScribbitsKey,
} from './scribbit';
import {
  getPowerUpClaimReceiptsKey,
  getPowerUpOfferKey,
} from './powerUpOffers';
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
  await storage.del(
    getPowerUpOfferKey(input.ownerUserId, input.scribbitId),
    getPowerUpClaimReceiptsKey(input.ownerUserId, input.scribbitId)
  );
  await deleteStoredScribbit(
    storage,
    input.ownerUserId,
    input.scribbitId,
    input.currentDay
  );
};

export const removeAllPlayerScribbits = async (
  storage: ArenaStorage,
  ownerUserId: string,
  currentDay: number
): Promise<number> => {
  const indexedScribbits = await storage.zRange(
    getUserScribbitsKey(ownerUserId),
    0,
    -1,
    { by: 'rank' }
  );
  let removedScribbits = 0;
  for (const { member: scribbitId } of indexedScribbits) {
    if ((await getScribbitOwner(storage, scribbitId)) !== ownerUserId) continue;
    await removeScribbitCompletely(storage, {
      ownerUserId,
      scribbitId,
      currentDay,
    });
    removedScribbits += 1;
  }
  return removedScribbits;
};
