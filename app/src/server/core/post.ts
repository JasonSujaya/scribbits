import { reddit } from '@devvit/web/server';
import type { Weather } from '../../shared/remonsta';
import {
  formatUtcDateKey,
  getWildsDayNumber,
} from './spawnEngine';

export type CreateWildsPostOptions = {
  date?: Date;
  weather?: Weather;
};

const weatherPostCopy: Record<Weather, string> = {
  quiet: 'Soft footsteps in the brush',
  lively: 'The Wilds are awake',
  stormy: 'Rare shapes in the weather',
};

export const createPost = async (options: CreateWildsPostOptions = {}) => {
  const date = options.date ?? new Date();
  const weather = options.weather ?? 'lively';
  const dateKey = formatUtcDateKey(date);
  const dayNumber = getWildsDayNumber(date);

  return await reddit.submitCustomPost({
    title: `Wilds #${dayNumber} - ${weatherPostCopy[weather]}`,
    entry: 'default',
    postData: {
      dateKey,
      dayNumber,
      weather,
    },
    textFallback: {
      text: `Remonsta Wilds #${dayNumber}. Open the post to spot today's creatures, build your Dex, and vote on community designs.`,
    },
  });
};
