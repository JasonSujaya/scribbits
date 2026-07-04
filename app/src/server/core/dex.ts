import { addUtcDays, formatUtcDateKey, parseUtcDateKey } from './day';

export type StreakRecord = {
  lastPlayedDateKey: string | undefined;
  streakDays: number;
  eggProgress: number;
};

export type StreakStorage = {
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hSet: (key: string, fieldValues: Record<string, string>) => Promise<unknown>;
};

const maximumEggProgress = 7;

export const getUserStreakKey = (userId: string): string => {
  return `user:${userId}:streak`;
};

export const parseStoredWholeNumber = (
  storedValue: string | undefined
): number => {
  if (storedValue === undefined) {
    return 0;
  }

  const parsedValue = Number(storedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return Math.floor(parsedValue);
};

export const parseStreakRecord = (
  storedRecord: Record<string, string>
): StreakRecord => {
  const lastPlayedDateKey = parseUtcDateKey(storedRecord.lastPlayedDateKey ?? '')
    ? storedRecord.lastPlayedDateKey
    : undefined;

  return {
    lastPlayedDateKey,
    streakDays: parseStoredWholeNumber(storedRecord.streakDays),
    eggProgress: Math.min(
      maximumEggProgress,
      parseStoredWholeNumber(storedRecord.eggProgress)
    ),
  };
};

export const isNextUtcDateKey = (
  previousDateKey: string,
  currentDateKey: string
): boolean => {
  const previousDate = parseUtcDateKey(previousDateKey);

  if (!previousDate) {
    return false;
  }

  return formatUtcDateKey(addUtcDays(previousDate, 1)) === currentDateKey;
};

export const advanceDailyPlayStreak = (
  previousRecord: StreakRecord,
  currentDateKey: string
): StreakRecord => {
  if (previousRecord.lastPlayedDateKey === currentDateKey) {
    return previousRecord;
  }

  if (
    previousRecord.lastPlayedDateKey &&
    isNextUtcDateKey(previousRecord.lastPlayedDateKey, currentDateKey)
  ) {
    return {
      lastPlayedDateKey: currentDateKey,
      streakDays: previousRecord.streakDays + 1,
      eggProgress: Math.min(
        maximumEggProgress,
        previousRecord.eggProgress + 1
      ),
    };
  }

  return {
    lastPlayedDateKey: currentDateKey,
    streakDays: 1,
    eggProgress: 1,
  };
};

export const recordDailyPlay = async (
  storage: StreakStorage,
  userId: string,
  currentDate: Date
): Promise<StreakRecord> => {
  const currentDateKey = formatUtcDateKey(currentDate);
  const streakKey = getUserStreakKey(userId);
  const previousRecord = parseStreakRecord(await storage.hGetAll(streakKey));
  const nextRecord = advanceDailyPlayStreak(previousRecord, currentDateKey);

  if (nextRecord.lastPlayedDateKey !== previousRecord.lastPlayedDateKey) {
    await storage.hSet(streakKey, {
      lastPlayedDateKey: currentDateKey,
      streakDays: nextRecord.streakDays.toString(),
      eggProgress: nextRecord.eggProgress.toString(),
    });
  }

  return nextRecord;
};
