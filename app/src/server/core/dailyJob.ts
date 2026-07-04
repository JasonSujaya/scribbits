import type { Forecast, Scribbit } from '../../shared/arena';
import { saveBattleReport } from './battleStore';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getArenaPostKey,
  setCurrentArenaDay,
  setCurrentChampion,
} from './arenaStore';
import { getArenaDayNumber } from './day';
import { resolveSwissRumble } from './rumble';
import type { ArenaStorage } from './scribbit';
import {
  addXpToScribbit,
  crownScribbit,
  expireDueScribbits,
  getRumbleEntrantIds,
  loadScribbit,
  loadScribbits,
  updateScribbit,
} from './scribbit';

const rumbleWinXp = 2;

export type CreatedArenaPost = {
  id: string;
};

export type CreateArenaPost = (options: {
  day: number;
  forecast: Forecast;
  champion: Scribbit | null;
}) => Promise<CreatedArenaPost>;

export type NightlyArenaJobRunResult = {
  skipped: false;
  previousDay: number;
  newDay: number;
  canonicalDay: number;
  resolvedDay: number;
  forecast: Forecast;
  champion: Scribbit;
  reportCount: number;
  expired: {
    faded: number;
    legends: number;
  };
  postId: string | null;
};

export type NightlyArenaJobSkippedResult = {
  skipped: true;
  previousDay: number;
  newDay: number;
  canonicalDay: number;
  resolvedDay: null;
  forecast: null;
  champion: null;
  reportCount: 0;
  expired: {
    faded: 0;
    legends: 0;
  };
  postId: null;
};

export type NightlyArenaJobResult =
  | NightlyArenaJobRunResult
  | NightlyArenaJobSkippedResult;

const getBattleScore = (
  day: number,
  reportIndex: number,
  reportCount: number
): number => {
  return day * 1000000 + reportCount - reportIndex;
};

const applyRumbleStandingsToStoredScribbits = async (
  storage: ArenaStorage,
  resolution: ReturnType<typeof resolveSwissRumble>
): Promise<void> => {
  for (const standing of resolution.standings) {
    if (standing.scribbit.isFounding) {
      continue;
    }

    const storedScribbit = await loadScribbit(storage, standing.scribbit.id);

    if (!storedScribbit) {
      continue;
    }

    await updateScribbit(
      storage,
      addXpToScribbit(
        {
          ...storedScribbit,
          wins: storedScribbit.wins + standing.wins,
          losses: storedScribbit.losses + standing.losses,
        },
        standing.wins * rumbleWinXp
      )
    );
  }
};

const crownChampionSnapshot = async (
  storage: ArenaStorage,
  champion: Scribbit,
  resolvedDay: number
): Promise<Scribbit> => {
  const legendTitle = `Champion of Day ${resolvedDay}`;

  if (champion.isFounding) {
    return {
      ...champion,
      legendTitle,
    };
  }

  const crownedScribbit = await crownScribbit(
    storage,
    champion.id,
    legendTitle
  );

  if (crownedScribbit) {
    return crownedScribbit;
  }

  return {
    ...champion,
    legendTitle,
  };
};

export const runNightlyArenaJob = async (
  storage: ArenaStorage,
  options: {
    now?: Date;
    createPost?: CreateArenaPost;
    force?: boolean;
  } = {}
): Promise<NightlyArenaJobResult> => {
  const now = options.now ?? new Date();
  const previousDay = await ensureCurrentArenaDay(storage, now);
  const canonicalDay = getArenaDayNumber(now);

  if (!options.force && previousDay >= canonicalDay) {
    console.log(
      `Nightly arena job skipped; stored day ${previousDay} is current for canonical day ${canonicalDay}.`
    );
    return {
      skipped: true,
      previousDay,
      newDay: previousDay,
      canonicalDay,
      resolvedDay: null,
      forecast: null,
      champion: null,
      reportCount: 0,
      expired: {
        faded: 0,
        legends: 0,
      },
      postId: null,
    };
  }

  const newDay = options.force ? previousDay + 1 : canonicalDay;
  const resolvedDay = Math.max(1, newDay - 1);

  const resolvedForecast = await ensureForecastForDay(storage, resolvedDay);
  const entrantIds = await getRumbleEntrantIds(storage, resolvedDay);
  const entrants = await loadScribbits(storage, entrantIds);
  const resolution = resolveSwissRumble(entrants, resolvedForecast, resolvedDay);

  await applyRumbleStandingsToStoredScribbits(storage, resolution);

  for (let index = 0; index < resolution.reports.length; index += 1) {
    const report = resolution.reports[index];

    if (report) {
      await saveBattleReport(
        storage,
        report,
        getBattleScore(newDay, index, resolution.reports.length)
      );
    }
  }

  const champion = await crownChampionSnapshot(
    storage,
    resolution.champion,
    resolvedDay
  );
  await setCurrentChampion(storage, champion);

  const expired = await expireDueScribbits(storage, newDay);
  await setCurrentArenaDay(storage, newDay);

  const forecast = await ensureForecastForDay(storage, newDay);
  let postId: string | null = null;

  if (options.createPost) {
    const arenaPostKey = getArenaPostKey(newDay);
    const existingPostId = await storage.get(arenaPostKey);

    if (existingPostId) {
      postId = existingPostId;
    } else {
      const post = await options.createPost({
        day: newDay,
        forecast,
        champion,
      });
      postId = post.id;
      await storage.set(arenaPostKey, post.id);
    }
  }

  return {
    skipped: false,
    previousDay,
    newDay,
    canonicalDay,
    resolvedDay,
    forecast,
    champion,
    reportCount: resolution.reports.length,
    expired,
    postId,
  };
};
