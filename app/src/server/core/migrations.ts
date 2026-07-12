import type { ArenaStorage } from './storage';

export const ROLLOUT_OVERLAP_MILLISECONDS = 2 * 60 * 1000;
export const LEGACY_BELIEF_RECEIPT_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
export const LEGACY_BELIEF_PRIVACY_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export type ArenaMigrationId = 'practice-lease-v2' | 'belief-receipt-v2';

const migrationStateKey = 'arena:migrations:v1';

export const ensureMigrationStartedAt = async (
  storage: ArenaStorage,
  migrationId: ArenaMigrationId,
  observedAtMs: number
): Promise<number> => {
  if (!Number.isSafeInteger(observedAtMs) || observedAtMs < 0) {
    throw new Error('Migration timing requires a valid millisecond timestamp.');
  }

  await storage.hSetNX(migrationStateKey, migrationId, observedAtMs.toString());
  const storedStartedAt = await storage.hGet(migrationStateKey, migrationId);
  const startedAtMs = Number(storedStartedAt);
  if (!Number.isSafeInteger(startedAtMs) || startedAtMs < 0) {
    throw new Error(`Migration ${migrationId} has an invalid start timestamp.`);
  }
  return startedAtMs;
};

export const migrationWindowIsOpen = (
  startedAtMs: number,
  observedAtMs: number,
  durationMs: number
): boolean => observedAtMs < startedAtMs + durationMs;
