import { addUtcDays, formatUtcDateKey, parseUtcDateKey } from './day';

export type PlayStreak = {
  lastPlayedDateKey: string | undefined;
  days: number;
};

export type PlayStreakStorage = {
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
};

export const getUserPlayStreakKey = (userId: string): string => {
  // Preserve the existing key so current players retain their streak.
  return `user:${userId}:streak`;
};

const parseStoredWholeNumber = (storedValue: string | undefined): number => {
  if (storedValue === undefined) return 0;
  const parsedValue = Number(storedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return 0;
  return Math.floor(parsedValue);
};

export const parsePlayStreak = (
  storedRecord: Record<string, string>
): PlayStreak => {
  const lastPlayedDateKey = parseUtcDateKey(storedRecord.lastPlayedDateKey ?? '')
    ? storedRecord.lastPlayedDateKey
    : undefined;

  return {
    lastPlayedDateKey,
    days: parseStoredWholeNumber(storedRecord.streakDays),
  };
};

const isNextUtcDateKey = (
  previousDateKey: string,
  currentDateKey: string
): boolean => {
  const previousDate = parseUtcDateKey(previousDateKey);
  if (!previousDate) return false;
  return formatUtcDateKey(addUtcDays(previousDate, 1)) === currentDateKey;
};

export const advancePlayStreak = (
  previousStreak: PlayStreak,
  currentDateKey: string
): PlayStreak => {
  if (previousStreak.lastPlayedDateKey === currentDateKey) return previousStreak;

  if (
    previousStreak.lastPlayedDateKey &&
    isNextUtcDateKey(previousStreak.lastPlayedDateKey, currentDateKey)
  ) {
    return {
      lastPlayedDateKey: currentDateKey,
      days: previousStreak.days + 1,
    };
  }

  return { lastPlayedDateKey: currentDateKey, days: 1 };
};

export const loadPlayStreak = async (
  storage: PlayStreakStorage,
  userId: string
): Promise<PlayStreak> => {
  return parsePlayStreak(await storage.hGetAll(getUserPlayStreakKey(userId)));
};

export const recordDailyPlay = async (
  storage: PlayStreakStorage,
  userId: string,
  currentDate: Date
): Promise<PlayStreak> => {
  const currentDateKey = formatUtcDateKey(currentDate);
  const streakKey = getUserPlayStreakKey(userId);
  const previousStreak = await loadPlayStreak(storage, userId);
  const nextStreak = advancePlayStreak(previousStreak, currentDateKey);

  if (nextStreak.lastPlayedDateKey !== previousStreak.lastPlayedDateKey) {
    await storage.hSet(streakKey, {
      lastPlayedDateKey: currentDateKey,
      streakDays: nextStreak.days.toString(),
    });
  }

  return nextStreak;
};
