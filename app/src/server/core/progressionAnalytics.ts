import type { ProgressionEventRequest } from '../../shared/progressionanalytics';
import type { ArenaStorage } from './storage';

export const getUserProgressionEventsKey = (userId: string): string =>
  `analytics:progression:v1:user:${userId}`;

export const getProgressionEventCountersKey = (): string =>
  'analytics:progression:v1:counters';

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
  await storage.hIncrBy(
    getProgressionEventCountersKey(),
    input.eventName,
    1
  );
  return { duplicate: false };
};
