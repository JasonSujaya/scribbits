import type { ArenaStorage, ArenaTransaction } from './storage';

export type DurableStorageContract = Readonly<{
  id: string;
  keyPattern: string;
  redisType: 'string' | 'hash' | 'sorted-set';
  ownerModule: string;
  durability: 'permanent' | 'ttl';
  latestReadableVersion: number;
  activeWriteVersion: number;
  frozenFixtureVersions: readonly number[];
  fixtureTestFile: string;
  indexKeyPatterns: readonly string[];
  privacyDeletionOwner: string;
  repairStrategy: string;
}>;

export const STORAGE_CONTRACT_MANIFEST_VERSION = 1;

// This registry is the release-review surface for durable shapes. Domain
// modules still own their codecs and mutations; changing a schema or key shape
// requires updating this entry and its frozen fixtures in the same change.
export const DURABLE_STORAGE_CONTRACTS: Readonly<
  Record<string, DurableStorageContract>
> = Object.freeze({
  scribbit: Object.freeze({
    id: 'scribbit',
    keyPattern: 'scribbit:{scribbitId}',
    redisType: 'string',
    ownerModule: 'src/server/core/scribbit.ts',
    durability: 'permanent',
    latestReadableVersion: 4,
    activeWriteVersion: 4,
    frozenFixtureVersions: Object.freeze([0, 1, 2, 3, 4]),
    fixtureTestFile: 'tests/versioned-save.test.mjs',
    indexKeyPatterns: Object.freeze([
      'user:{userId}:scribbits',
      'user:{userId}:scribbits:alive',
      'user:{userId}:legacy-cards',
      'scribbits:expiring',
    ]),
    privacyDeletionOwner: 'src/server/core/removal.ts',
    repairStrategy: 'rebuild indexes from owned Scribbit records',
  }),
  inventory: Object.freeze({
    id: 'inventory',
    keyPattern: 'inventory:{userId}',
    redisType: 'hash',
    ownerModule: 'src/server/core/inkStore.ts',
    durability: 'permanent',
    latestReadableVersion: 1,
    activeWriteVersion: 1,
    frozenFixtureVersions: Object.freeze([1]),
    fixtureTestFile: 'tests/equipment-economy.test.mjs',
    indexKeyPatterns: Object.freeze([]),
    privacyDeletionOwner: 'src/server/core/privacy.ts',
    repairStrategy: 'fail closed; reconcile only from operation receipts',
  }),
  powerUpDiscoveries: Object.freeze({
    id: 'power-up-discoveries',
    keyPattern: 'user:{userId}:power-up-discoveries',
    redisType: 'string',
    ownerModule: 'src/server/core/powerUpOffers.ts',
    durability: 'permanent',
    latestReadableVersion: 1,
    activeWriteVersion: 1,
    frozenFixtureVersions: Object.freeze([0, 1]),
    fixtureTestFile: 'tests/power-up-offers.test.mjs',
    indexKeyPatterns: Object.freeze([]),
    privacyDeletionOwner: 'src/server/core/privacy.ts',
    repairStrategy: 'preserve unknown IDs and block on invalid bytes',
  }),
  powerUpOffer: Object.freeze({
    id: 'power-up-offer',
    keyPattern: 'user:{userId}:scribbit:{scribbitId}:power-up-offer',
    redisType: 'string',
    ownerModule: 'src/server/core/powerUpOffers.ts',
    durability: 'ttl',
    latestReadableVersion: 1,
    activeWriteVersion: 1,
    frozenFixtureVersions: Object.freeze([1]),
    fixtureTestFile: 'tests/power-up-offers.test.mjs',
    indexKeyPatterns: Object.freeze([]),
    privacyDeletionOwner: 'src/server/core/removal.ts',
    repairStrategy: 'discard invalid or expired offers and create a new offer',
  }),
  powerUpClaimReceipt: Object.freeze({
    id: 'power-up-claim-receipt',
    keyPattern:
      'user:{userId}:scribbit:{scribbitId}:power-up-claim-receipts',
    redisType: 'hash',
    ownerModule: 'src/server/core/powerUpOffers.ts',
    durability: 'ttl',
    latestReadableVersion: 1,
    activeWriteVersion: 1,
    frozenFixtureVersions: Object.freeze([1]),
    fixtureTestFile: 'tests/power-up-offers.test.mjs',
    indexKeyPatterns: Object.freeze([]),
    privacyDeletionOwner: 'src/server/core/removal.ts',
    repairStrategy: 'fail closed; replay only an exact matching receipt',
  }),
  gearMergeReceipt: Object.freeze({
    id: 'gear-merge-receipt',
    keyPattern: 'gear:merge:operation:{userId}:{operationId}',
    redisType: 'string',
    ownerModule: 'src/server/core/inkStore.ts',
    durability: 'ttl',
    latestReadableVersion: 1,
    activeWriteVersion: 1,
    frozenFixtureVersions: Object.freeze([0, 1]),
    fixtureTestFile: 'tests/equipment-economy.test.mjs',
    indexKeyPatterns: Object.freeze([
      'user:{userId}:operation-receipts',
    ]),
    privacyDeletionOwner: 'src/server/core/privacy.ts',
    repairStrategy: 'replay the immutable receipt without current balance rules',
  }),
});

export const ROLLOUT_OVERLAP_MILLISECONDS = 2 * 60 * 1000;
export const LEGACY_BELIEF_RECEIPT_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
export const LEGACY_BELIEF_PRIVACY_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export type ArenaMigrationId =
  | 'practice-lease-v2'
  | 'belief-receipt-v2'
  | 'payout-receipt-index-v1';

const migrationStateKey = 'arena:migrations:v1';

const requireValidMigrationTimestamp = (observedAtMs: number): void => {
  if (!Number.isSafeInteger(observedAtMs) || observedAtMs < 0) {
    throw new Error('Migration timing requires a valid millisecond timestamp.');
  }
};

export const trackMigrationStartedAt = async (
  transaction: Pick<ArenaTransaction, 'hSetNX'>,
  migrationId: ArenaMigrationId,
  observedAtMs: number
): Promise<void> => {
  requireValidMigrationTimestamp(observedAtMs);
  await transaction.hSetNX(
    migrationStateKey,
    migrationId,
    observedAtMs.toString()
  );
};

export const ensureMigrationStartedAt = async (
  storage: ArenaStorage,
  migrationId: ArenaMigrationId,
  observedAtMs: number
): Promise<number> => {
  requireValidMigrationTimestamp(observedAtMs);

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
