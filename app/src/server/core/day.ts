const millisecondsPerDay = 24 * 60 * 60 * 1000;
const scribbitsEpochUtcMs = Date.UTC(2026, 6, 4);

export const formatUtcDateKey = (date: Date): string => {
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

export const parseUtcDateKey = (dateKey: string): Date | undefined => {
  if (!/^\d{8}$/.test(dateKey)) {
    return undefined;
  }

  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(4, 6));
  const day = Number(dateKey.slice(6, 8));
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (formatUtcDateKey(parsedDate) !== dateKey) {
    return undefined;
  }

  return parsedDate;
};

export const getUtcDayStartMs = (date: Date): number => {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
};

export const getNextUtcDayStartMs = (date: Date): number => {
  return getUtcDayStartMs(date) + millisecondsPerDay;
};

export const addUtcDays = (date: Date, days: number): Date => {
  return new Date(getUtcDayStartMs(date) + days * millisecondsPerDay);
};

export const getArenaDayNumber = (date: Date): number => {
  const dayOffset = Math.floor(
    (getUtcDayStartMs(date) - scribbitsEpochUtcMs) / millisecondsPerDay
  );
  return Math.max(1, dayOffset + 1);
};

export const parseStoredPositiveInteger = (
  storedValue: string | undefined
): number | undefined => {
  if (storedValue === undefined) {
    return undefined;
  }

  const parsedValue = Number(storedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return undefined;
  }

  return parsedValue;
};
