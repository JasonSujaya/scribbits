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
  crownScribbit,
  expireDueScribbits,
  getRumbleEntrantIds,
  loadScribbit,
  loadScribbits,
  updateScribbit,
} from './scribbit';

export type CreatedArenaPost = {
  id: string;
};

export type CreateArenaPost = (options: {
  day: number;
  forecast: Forecast;
  champion: Scribbit | null;
}) => Promise<CreatedArenaPost>;

export type NightlyArenaJobResult = {
  previousDay: number;
  newDay: number;
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

    await updateScribbit(storage, {
      ...storedScribbit,
      wins: storedScribbit.wins + standing.wins,
      losses: storedScribbit.losses + standing.losses,
    });
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
  } = {}
): Promise<NightlyArenaJobResult> => {
  const now = options.now ?? new Date();
  const previousDay = await ensureCurrentArenaDay(storage, now);
  const dateDay = getArenaDayNumber(now);
  const newDay = Math.max(previousDay + 1, dateDay);
  const resolvedDay = Math.max(1, newDay - 1);

  await setCurrentArenaDay(storage, newDay);

  const expired = await expireDueScribbits(storage, newDay);
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
    previousDay,
    newDay,
    resolvedDay,
    forecast,
    champion,
    reportCount: resolution.reports.length,
    expired,
    postId,
  };
};
