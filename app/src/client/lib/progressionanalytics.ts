import type {
  ProgressionEventName,
  ProgressionEventRequest,
} from '../../shared/progressionanalytics';

const sessionStorageKey = 'scribbits:progression-session:v1';

const randomIdentifier = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const progressionSessionId = (): string => {
  try {
    const stored = sessionStorage.getItem(sessionStorageKey);
    if (stored) return stored;
    const created = randomIdentifier();
    sessionStorage.setItem(sessionStorageKey, created);
    return created;
  } catch {
    return randomIdentifier();
  }
};

export const trackProgressionEvent = (
  eventName: ProgressionEventName,
  options: Readonly<{ scribbitId?: string; source?: string }> = {}
): void => {
  const body: ProgressionEventRequest = {
    eventId: randomIdentifier(),
    eventName,
    sessionId: progressionSessionId(),
    ...options,
  };
  void fetch('/api/progression-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
};
