import type { OwnedRumbleReceipt, Scribbit } from '../../shared/arena';
import { loadFeaturedRumbleReport } from './battleStore';
import {
  getRumbleWinInkPayoutKey,
  loadClaimedInkRewardAmount,
} from './inkStore';
import type { ArenaStorage } from './scribbit';
import {
  getUserScribbitIds,
  loadRumbleStandingReceipt,
  loadScribbit,
} from './scribbit';

const recentOwnedScribbitLimit = 8;

export const loadOwnedRumbleReturnReceipt = async (
  storage: ArenaStorage,
  input: Readonly<{
    userId: string;
    resolvedDay: number;
    utcDateKey: string;
    champion: Scribbit | null;
    hiddenScribbitIds?: ReadonlySet<string>;
  }>
): Promise<OwnedRumbleReceipt | null> => {
  if (!Number.isSafeInteger(input.resolvedDay) || input.resolvedDay < 1) {
    return null;
  }

  const ownedScribbitIds = await getUserScribbitIds(
    storage,
    input.userId,
    recentOwnedScribbitLimit
  );
  const standingReceipts = await Promise.all(
    ownedScribbitIds.map(async (scribbitId) => ({
      scribbitId,
      standing: await loadRumbleStandingReceipt(
        storage,
        scribbitId,
        input.resolvedDay
      ),
    }))
  );
  const enteredReceipts = standingReceipts.filter(
    (entry) => entry.standing !== null
  );
  if (enteredReceipts.length !== 1) return null;
  const entered = enteredReceipts[0];
  if (!entered?.standing) return null;

  const [entrant, inkAwarded, featuredReport] = await Promise.all([
    loadScribbit(storage, entered.scribbitId, input.utcDateKey),
    loadClaimedInkRewardAmount(storage, {
      payoutKey: getRumbleWinInkPayoutKey(input.resolvedDay),
      payoutField: entered.scribbitId,
      userId: input.userId,
    }),
    loadFeaturedRumbleReport(
      storage,
      entered.scribbitId,
      input.resolvedDay
    ),
  ]);
  if (
    !entrant ||
    entrant.isFounding ||
    (entered.standing.wins > 0 && inkAwarded <= 0)
  ) {
    return null;
  }

  return {
    kind: 'owned',
    resolvedDay: input.resolvedDay,
    entrant,
    wins: entered.standing.wins,
    losses: entered.standing.losses,
    xpAwarded: entered.standing.xpAwarded,
    inkAwarded,
    isChampion: input.champion?.id === entrant.id,
    replayAvailable:
      featuredReport !== undefined &&
      !input.hiddenScribbitIds?.has(featuredReport.a.id) &&
      !input.hiddenScribbitIds?.has(featuredReport.b.id),
  };
};
