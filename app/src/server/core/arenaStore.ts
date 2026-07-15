import type { Forecast, Scribbit } from '../../shared/arena';
import { cloneScribbit } from '../../shared/arena';
import { getArenaDayNumber, parseStoredPositiveInteger } from './day';
import { generateForecastForDay, parseForecast } from './forecast';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  parseScribbit,
  parseStoredScribbit,
  serializeScribbit,
} from './scribbit';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';

const currentArenaDayKey = 'arena:currentDay';
const nightlyResolutionClaimsKey = 'arena:nightly-resolution-claims';
const championKey = 'champion:current';

export const getCurrentArenaDayKey = (): string => currentArenaDayKey;

export const getNightlyResolutionClaimsKey = (): string =>
  nightlyResolutionClaimsKey;

export const loadCurrentArenaDay = async (
  storage: ArenaStorage
): Promise<number | undefined> =>
  parseStoredPositiveInteger(await storage.get(currentArenaDayKey));

export const getActiveScribbitSubmissionsKey = (day: number): string =>
  `arena:active-submissions:${day}`;

export const getForecastKey = (day: number): string => {
  return `forecast:${day}`;
};

export const ensureCurrentArenaDay = async (
  storage: ArenaStorage,
  now: Date
): Promise<number> => {
  const storedDay = await loadCurrentArenaDay(storage);

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
  if (!storage.watch) {
    throw new Error('Safe Champion storage requires transaction support.');
  }
  const championJson = serializeScribbit(champion);
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(championKey);
      const existingJson = await storage.get(championKey);
      const existingChampion = parseStoredScribbit(existingJson);
      if (existingChampion.status === 'invalid') {
        throw new Error(
          'Stored current Champion is invalid and was preserved.'
        );
      }
      await transaction.multi();
      await transaction.set(championKey, championJson);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Champion storage');
      if ((await storage.get(championKey)) === championJson) return;
      throw error;
    }
  }
  throw new Error('Current Champion changed too often to save safely.');
};

export const removeCurrentChampionIfMatches = async (
  storage: ArenaStorage,
  scribbitId: string
): Promise<void> => {
  const champion = await getCurrentChampion(storage);
  if (champion?.id === scribbitId) {
    await storage.del(championKey);
  }
};
