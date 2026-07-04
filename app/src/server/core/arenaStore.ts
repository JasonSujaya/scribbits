import type { Forecast, Scribbit } from '../../shared/arena';
import { getArenaDayNumber, parseStoredPositiveInteger } from './day';
import { generateForecastForDay, parseForecast } from './forecast';
import type { ArenaStorage } from './scribbit';
import { cloneScribbit, parseScribbit } from './scribbit';

const currentArenaDayKey = 'arena:currentDay';
const championKey = 'champion:current';

export const getForecastKey = (day: number): string => {
  return `forecast:${day}`;
};

export const getArenaPostKey = (day: number): string => {
  return `arena:post:${day}`;
};

export const ensureCurrentArenaDay = async (
  storage: ArenaStorage,
  now: Date
): Promise<number> => {
  const storedDay = parseStoredPositiveInteger(await storage.get(currentArenaDayKey));

  if (storedDay) {
    return storedDay;
  }

  const day = getArenaDayNumber(now);
  await storage.set(currentArenaDayKey, day.toString());
  return day;
};

export const setCurrentArenaDay = async (
  storage: ArenaStorage,
  day: number
): Promise<void> => {
  await storage.set(currentArenaDayKey, day.toString());
};

export const ensureForecastForDay = async (
  storage: ArenaStorage,
  day: number
): Promise<Forecast> => {
  const forecastKey = getForecastKey(day);
  const storedForecast = parseForecast(await storage.get(forecastKey));

  if (storedForecast) {
    return storedForecast;
  }

  const forecast = generateForecastForDay(day);
  await storage.set(forecastKey, JSON.stringify(forecast));
  return forecast;
};

export const getCurrentChampion = async (
  storage: ArenaStorage
): Promise<Scribbit | null> => {
  const champion = parseScribbit(await storage.get(championKey));
  return champion ? cloneScribbit(champion) : null;
};

export const setCurrentChampion = async (
  storage: ArenaStorage,
  champion: Scribbit
): Promise<void> => {
  await storage.set(championKey, JSON.stringify(cloneScribbit(champion)));
};
