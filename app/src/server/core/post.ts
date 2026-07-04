import { reddit } from '@devvit/web/server';
import type { Forecast, Scribbit } from '../../shared/arena';
import { formatUtcDateKey, getArenaDayNumber } from './day';

export type CreateArenaPostOptions = {
  date?: Date;
  day?: number;
  forecast: Forecast;
  champion?: Scribbit | null;
};

const getChampionCopy = (champion: Scribbit | null | undefined): string => {
  if (!champion) {
    return 'No reigning Champion yet. The founding Scribbits are warming up.';
  }

  return `Current boss: ${champion.name}, ${champion.legendTitle ?? 'arena menace'} (${champion.element}).`;
};

export const createPost = async (options: CreateArenaPostOptions) => {
  const date = options.date ?? new Date();
  const dateKey = formatUtcDateKey(date);
  const dayNumber = options.day ?? getArenaDayNumber(date);

  return await reddit.submitCustomPost({
    title: `Rumble #${dayNumber} — ${options.forecast.blurb}`,
    entry: 'default',
    postData: {
      dateKey,
      dayNumber,
      forecast: options.forecast,
      champion: options.champion ?? null,
    },
    textFallback: {
      text: `Scribbits Arena Rumble #${dayNumber}. ${options.forecast.blurb}. ${getChampionCopy(options.champion)}`,
    },
  });
};
