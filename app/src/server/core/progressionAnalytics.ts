import {
  PROGRESSION_EVENT_NAMES,
  type ProgressionAnalyticsResponse,
  type ProgressionEventName,
  type ProgressionEventRequest,
} from '../../shared/progressionanalytics';
import type { ArenaStorage } from './storage';
import { addUtcDays, formatUtcDateKey, parseUtcDateKey } from './day';

export const getUserProgressionEventsKey = (userId: string): string =>
  `analytics:progression:v1:user:${userId}`;

export const getProgressionEventCountersKey = (): string =>
  'analytics:progression:v1:counters';

export const getDailyProgressionEventCountersKey = (dateKey: string): string =>
  `analytics:progression:v2:day:${dateKey}:counters`;

export const getDailyProgressionUsersKey = (dateKey: string): string =>
  `analytics:progression:v2:day:${dateKey}:users`;

export const getDailyProgressionSessionsKey = (dateKey: string): string =>
  `analytics:progression:v2:day:${dateKey}:sessions`;

const emptyEventCounts = (): Record<ProgressionEventName, number> =>
  Object.fromEntries(
    PROGRESSION_EVENT_NAMES.map((eventName) => [eventName, 0])
  ) as Record<ProgressionEventName, number>;

const parseEventCounts = (
  storedCounts: Readonly<Record<string, string>>
): Record<ProgressionEventName, number> => {
  const counts = emptyEventCounts();
  for (const eventName of PROGRESSION_EVENT_NAMES) {
    const parsedCount = Number(storedCounts[eventName] ?? 0);
    if (Number.isSafeInteger(parsedCount) && parsedCount >= 0) {
      counts[eventName] = parsedCount;
    }
  }
  return counts;
};

const analyticsDateLabel = (date: Date): string =>
  `${date.getUTCFullYear().toString().padStart(4, '0')}-${(
    date.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;

export const recordProgressionEvent = async (
  storage: ArenaStorage,
  input: ProgressionEventRequest &
    Readonly<{ userId: string; arenaDay: number; occurredAtMs: number }>
): Promise<{ duplicate: boolean }> => {
  const eventKey = getUserProgressionEventsKey(input.userId);
  if (await storage.hGet(eventKey, input.eventId)) {
    return { duplicate: true };
  }
  const event = {
    version: 1,
    eventName: input.eventName,
    sessionId: input.sessionId,
    arenaDay: input.arenaDay,
    occurredAtMs: input.occurredAtMs,
    ...(input.scribbitId ? { scribbitId: input.scribbitId } : {}),
    ...(input.source ? { source: input.source } : {}),
  };
  await storage.hSet(eventKey, { [input.eventId]: JSON.stringify(event) });
  await storage.hIncrBy(getProgressionEventCountersKey(), input.eventName, 1);
  const occurredAt = new Date(input.occurredAtMs);
  const dateKey = formatUtcDateKey(occurredAt);
  await Promise.all([
    storage.hIncrBy(
      getDailyProgressionEventCountersKey(dateKey),
      input.eventName,
      1
    ),
    storage.zAdd(getDailyProgressionUsersKey(dateKey), {
      member: input.userId,
      score: input.occurredAtMs,
    }),
    storage.zAdd(getDailyProgressionSessionsKey(dateKey), {
      member: input.sessionId,
      score: input.occurredAtMs,
    }),
  ]);
  return { duplicate: false };
};

export const loadProgressionAnalytics = async (
  storage: ArenaStorage,
  fromDateKey: string,
  toDateKey: string,
  generatedAt: Date = new Date()
): Promise<ProgressionAnalyticsResponse> => {
  const fromDate = parseUtcDateKey(fromDateKey);
  const toDate = parseUtcDateKey(toDateKey);
  if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
    throw new Error('Analytics date range is invalid.');
  }

  const dayCount =
    Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (dayCount > 31) {
    throw new Error('Analytics date range cannot exceed 31 days.');
  }

  const days = await Promise.all(
    Array.from({ length: dayCount }, async (_, index) => {
      const date = addUtcDays(fromDate, index);
      const dateKey = formatUtcDateKey(date);
      const [storedCounts, uniquePlayers, sessions] = await Promise.all([
        storage.hGetAll(getDailyProgressionEventCountersKey(dateKey)),
        storage.zCard(getDailyProgressionUsersKey(dateKey)),
        storage.zCard(getDailyProgressionSessionsKey(dateKey)),
      ]);
      return {
        date: analyticsDateLabel(date),
        uniquePlayers,
        sessions,
        eventCounts: parseEventCounts(storedCounts),
      };
    })
  );
  const rangeEventCounts = emptyEventCounts();
  for (const day of days) {
    for (const eventName of PROGRESSION_EVENT_NAMES) {
      rangeEventCounts[eventName] += day.eventCounts[eventName];
    }
  }

  return {
    generatedAt: generatedAt.toISOString(),
    from: analyticsDateLabel(fromDate),
    to: analyticsDateLabel(toDate),
    lifetimeEventCounts: parseEventCounts(
      await storage.hGetAll(getProgressionEventCountersKey())
    ),
    rangeEventCounts,
    activePlayerDays: days.reduce((total, day) => total + day.uniquePlayers, 0),
    sessionDays: days.reduce((total, day) => total + day.sessions, 0),
    days,
  };
};

export const removeUserFromProgressionAnalytics = async (
  storage: ArenaStorage,
  userId: string
): Promise<void> => {
  const storedEvents = await storage.hGetAll(
    getUserProgressionEventsKey(userId)
  );
  const sessionsByDateKey = new Map<string, Set<string>>();

  for (const storedEvent of Object.values(storedEvents)) {
    try {
      const event: unknown = JSON.parse(storedEvent);
      if (typeof event !== 'object' || event === null) continue;
      const occurredAtMs = Reflect.get(event, 'occurredAtMs');
      const sessionId = Reflect.get(event, 'sessionId');
      if (
        typeof occurredAtMs !== 'number' ||
        !Number.isFinite(occurredAtMs) ||
        typeof sessionId !== 'string' ||
        sessionId.length === 0
      ) {
        continue;
      }
      const dateKey = formatUtcDateKey(new Date(Number(occurredAtMs)));
      const sessions = sessionsByDateKey.get(dateKey) ?? new Set<string>();
      sessions.add(sessionId);
      sessionsByDateKey.set(dateKey, sessions);
    } catch {
      // Corrupt legacy analytics must not block account deletion.
    }
  }

  for (const [dateKey, sessions] of sessionsByDateKey) {
    await Promise.all([
      storage.zRem(getDailyProgressionUsersKey(dateKey), [userId]),
      storage.zRem(getDailyProgressionSessionsKey(dateKey), [...sessions]),
    ]);
  }
};
