import {
  INK_REWARDS,
  type BattleReport,
  type BackedRumbleReceipt,
  type DailyRumbleReceipt,
  type OwnedRumbleReceipt,
  type RumbleReturnFighter,
  type Scribbit,
} from '../../shared/arena';
import { loadFeaturedRumbleReport } from './battleStore';
import { getBackedScribbitId, getUserCloutPayout } from './clout';
import {
  getRumbleWinInkPayoutKey,
  loadClaimedInkRewardAmount,
} from './inkStore';
import type { ArenaStorage } from './storage';
import {
  getUserScribbitIds,
  loadRumbleStandingReceipt,
  loadScribbit,
} from './scribbit';

const recentOwnedScribbitLimit = 8;

type RumbleReturnReceiptInput = Readonly<{
  userId: string;
  resolvedDay: number;
  utcDateKey: string;
  champion: Scribbit | null;
  hiddenScribbitIds?: ReadonlySet<string>;
}>;

const projectReturnFighter = (
  scribbit: Scribbit | null | undefined,
  hiddenScribbitIds: ReadonlySet<string> | undefined
): RumbleReturnFighter | null => {
  if (!scribbit || hiddenScribbitIds?.has(scribbit.id)) return null;
  return {
    id: scribbit.id,
    name: scribbit.name,
    element: scribbit.element,
    stats: scribbit.stats,
    imageUrl: scribbit.imageUrl,
    isFounding: scribbit.isFounding,
  };
};

const getFeaturedReplayVisibility = (
  report: BattleReport | undefined,
  hiddenScribbitIds: ReadonlySet<string> | undefined
): Readonly<{ exists: boolean; includesHiddenFighter: boolean }> => ({
  exists: report !== undefined,
  includesHiddenFighter:
    report !== undefined &&
    (hiddenScribbitIds?.has(report.a.id) === true ||
      hiddenScribbitIds?.has(report.b.id) === true),
});

const loadBackedRumbleReturnReceipt = async (
  storage: ArenaStorage,
  input: RumbleReturnReceiptInput & Readonly<{ backedScribbitId: string }>
): Promise<BackedRumbleReceipt> => {
  const [backedScribbit, cloutEarned, featuredReport] = await Promise.all([
    loadScribbit(storage, input.backedScribbitId, input.utcDateKey),
    getUserCloutPayout(storage, input.resolvedDay, input.userId),
    loadFeaturedRumbleReport(
      storage,
      input.backedScribbitId,
      input.resolvedDay
    ),
  ]);
  const exactPick =
    featuredReport?.a.id === input.backedScribbitId
      ? featuredReport.a
      : featuredReport?.b.id === input.backedScribbitId
        ? featuredReport.b
        : backedScribbit;
  const exactOpponent =
    featuredReport?.a.id === input.backedScribbitId
      ? featuredReport.b
      : featuredReport?.b.id === input.backedScribbitId
        ? featuredReport.a
        : input.champion;
  const pick = projectReturnFighter(exactPick, input.hiddenScribbitIds);
  const opponent = projectReturnFighter(exactOpponent, input.hiddenScribbitIds);
  const replayVisibility = getFeaturedReplayVisibility(
    featuredReport,
    input.hiddenScribbitIds
  );

  return {
    kind: 'backed',
    resolvedDay: input.resolvedDay,
    backedName: backedScribbit?.name ?? 'Your pick',
    championName: input.champion?.name ?? 'No Champion',
    pick,
    opponent,
    opponentIsChampion: opponent?.id === input.champion?.id,
    cloutEarned,
    inkAwarded: cloutEarned === 3 ? INK_REWARDS.backedChampion : 0,
    // Backed receipts historically keep the replay action while projecting a
    // hidden fighter as null. Preserve that response contract here.
    replayAvailable: replayVisibility.exists,
  };
};

export const loadOwnedRumbleReturnReceipt = async (
  storage: ArenaStorage,
  input: RumbleReturnReceiptInput
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
    loadFeaturedRumbleReport(storage, entered.scribbitId, input.resolvedDay),
  ]);
  if (
    !entrant ||
    entrant.isFounding ||
    (entered.standing.wins > 0 && inkAwarded <= 0)
  ) {
    return null;
  }
  const replayVisibility = getFeaturedReplayVisibility(
    featuredReport,
    input.hiddenScribbitIds
  );

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
      replayVisibility.exists && !replayVisibility.includesHiddenFighter,
  };
};

export const loadRumbleReturnReceipt = async (
  storage: ArenaStorage,
  input: RumbleReturnReceiptInput
): Promise<DailyRumbleReceipt | null> => {
  if (!Number.isSafeInteger(input.resolvedDay) || input.resolvedDay < 1) {
    return null;
  }

  const backedScribbitId = await getBackedScribbitId(
    storage,
    input.resolvedDay,
    input.userId
  );
  return backedScribbitId
    ? await loadBackedRumbleReturnReceipt(storage, {
        ...input,
        backedScribbitId,
      })
    : await loadOwnedRumbleReturnReceipt(storage, input);
};
