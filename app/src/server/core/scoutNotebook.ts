import type {
  BattleReport,
  ScoutNotebookEntry,
  ScoutNotebookPick,
  ScoutNotebookState,
  ScoutNotebookStatus,
  Scribbit,
} from '../../shared/arena';
import { INK_REWARDS } from '../../shared/arena';
import {
  SCOUT_NOTEBOOK_MAXIMUM_ENTRIES,
  createScoutNotebookState,
  projectScoutNotebookPick,
} from '../../shared/scoutnotebook';
import { ensureForecastForDay } from './arenaStore';
import { loadFeaturedRumbleReport } from './battleStore';
import { getBackedScribbitId, getUserClout, getUserCloutPayout } from './clout';
import { isScribbitHidden } from './moderation';
import type { ArenaStorage } from './storage';
import { loadScribbit } from './scribbit';

export type LoadScoutNotebookOptions = Readonly<{
  currentDay: number;
  userId: string;
  utcDateKey: string;
}>;

type HiddenScribbitLookup = (scribbitId: string) => Promise<boolean>;

const getReportPick = (
  report: BattleReport,
  backedScribbitId: string
): Scribbit => {
  if (report.a.id === backedScribbitId) return report.a;
  if (report.b.id === backedScribbitId) return report.b;
  throw new Error(
    `Featured Rumble report ${report.id} does not contain the backed Scribbit.`
  );
};

const isReportVisible = async (
  report: BattleReport,
  isHidden: HiddenScribbitLookup
): Promise<boolean> => {
  const [fighterAHidden, fighterBHidden] = await Promise.all([
    isHidden(report.a.id),
    isHidden(report.b.id),
  ]);
  return !fighterAHidden && !fighterBHidden;
};

const getHistoricalStatus = (cloutEarned: number): ScoutNotebookStatus => {
  if (cloutEarned === 3) return 'champion';
  if (cloutEarned === 1) return 'finalist';
  if (cloutEarned === 0) return 'no_clout';
  throw new Error(
    `Scout Notebook found an invalid historical Clout payout: ${cloutEarned}.`
  );
};

const loadCurrentPick = async (
  storage: ArenaStorage,
  backedScribbitId: string,
  isHidden: HiddenScribbitLookup
): Promise<ScoutNotebookPick | null> => {
  if (await isHidden(backedScribbitId)) return null;
  const scribbit = await loadScribbit(storage, backedScribbitId);
  return scribbit ? projectScoutNotebookPick(scribbit) : null;
};

const loadHistoricalEntry = async (
  storage: ArenaStorage,
  options: LoadScoutNotebookOptions,
  day: number,
  backedScribbitId: string,
  forecast: ScoutNotebookEntry['forecast'],
  isHidden: HiddenScribbitLookup
): Promise<ScoutNotebookEntry> => {
  const [cloutEarned, featuredReport] = await Promise.all([
    getUserCloutPayout(storage, day, options.userId),
    loadFeaturedRumbleReport(storage, backedScribbitId, day),
  ]);
  const reportPick = featuredReport
    ? getReportPick(featuredReport, backedScribbitId)
    : undefined;
  const [backedPickHidden, reportVisible] = await Promise.all([
    isHidden(backedScribbitId),
    featuredReport ? isReportVisible(featuredReport, isHidden) : false,
  ]);
  const pick = backedPickHidden
    ? null
    : reportPick
      ? projectScoutNotebookPick(reportPick)
      : await loadCurrentPick(storage, backedScribbitId, isHidden);
  const status = getHistoricalStatus(cloutEarned);

  return {
    day,
    forecast,
    picked: true,
    pick,
    status,
    cloutEarned,
    inkAwarded: status === 'champion' ? INK_REWARDS.backedChampion : 0,
    replayAvailable:
      pick !== null && featuredReport !== undefined && reportVisible,
  };
};

export const loadScoutNotebook = async (
  storage: ArenaStorage,
  options: LoadScoutNotebookOptions
): Promise<ScoutNotebookState> => {
  const hiddenLookupCache = new Map<string, Promise<boolean>>();
  const isHidden: HiddenScribbitLookup = (scribbitId) => {
    const cachedLookup = hiddenLookupCache.get(scribbitId);
    if (cachedLookup) return cachedLookup;
    const lookup = isScribbitHidden(storage, options.userId, scribbitId);
    hiddenLookupCache.set(scribbitId, lookup);
    return lookup;
  };
  const entryCount = Math.min(
    SCOUT_NOTEBOOK_MAXIMUM_ENTRIES,
    options.currentDay
  );
  const days = Array.from(
    { length: entryCount },
    (_, index) => options.currentDay - index
  );
  const [lifetimeClout, forecasts, backedScribbitIds] = await Promise.all([
    getUserClout(storage, options.userId),
    Promise.all(days.map((day) => ensureForecastForDay(storage, day))),
    Promise.all(
      days.map((day) => getBackedScribbitId(storage, day, options.userId))
    ),
  ]);

  const entries = await Promise.all(
    days.map(async (day, index): Promise<ScoutNotebookEntry> => {
      const forecast = forecasts[index];
      if (!forecast) {
        throw new Error(`Scout Notebook forecast for Day ${day} is missing.`);
      }
      const backedScribbitId = backedScribbitIds[index] ?? null;
      if (!backedScribbitId) {
        return {
          day,
          forecast,
          picked: false,
          pick: null,
          status: day === options.currentDay ? 'open' : 'missed',
          cloutEarned: 0,
          inkAwarded: 0,
          replayAvailable: false,
        };
      }

      if (day === options.currentDay) {
        return {
          day,
          forecast,
          picked: true,
          pick: await loadCurrentPick(storage, backedScribbitId, isHidden),
          status: 'pending',
          cloutEarned: 0,
          inkAwarded: 0,
          replayAvailable: false,
        };
      }

      return await loadHistoricalEntry(
        storage,
        options,
        day,
        backedScribbitId,
        forecast,
        isHidden
      );
    })
  );

  return createScoutNotebookState({
    currentDay: options.currentDay,
    lifetimeClout,
    entries,
  });
};
