import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledServerRoot) {
  throw new Error('Run versioned save tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const arenaStore = require(join(compiledServerRoot, 'core', 'arenaStore.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const legacyStore = require(join(compiledServerRoot, 'core', 'legacy.js'));
const scribbitStore = require(join(compiledServerRoot, 'core', 'scribbit.js'));
const versionedJson = require(
  join(compiledServerRoot, 'core', 'versionedJson.js')
);

const isRecord = (value) => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const createExampleScribbit = (id = 'versioned-save-scribbit') => {
  return scribbitStore.createScribbit({
    id,
    draft: {
      name: 'Archive Moth',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: 'versioned-save-player',
    imageUrl: `/api/drawing/${id}`,
    day: 12,
  });
};

test('versioned JSON runs every migration in order and skips them for current data', () => {
  const migrationCalls = [];
  const codec = versionedJson.createVersionedJsonCodec({
    currentVersion: 2,
    legacyVersion: 0,
    migrations: {
      0: (value) => {
        migrationCalls.push('0-to-1');
        return { ...value, schemaVersion: 1, score: value.points };
      },
      1: (value) => {
        migrationCalls.push('1-to-2');
        return { schemaVersion: 2, name: value.name, score: value.score };
      },
    },
    decodeCurrent: (value) => {
      return isRecord(value) &&
        value.schemaVersion === 2 &&
        typeof value.name === 'string' &&
        Number.isSafeInteger(value.score)
        ? { name: value.name, score: value.score }
        : undefined;
    },
    encodeCurrent: (value) => ({ schemaVersion: 2, ...value }),
  });

  assert.deepEqual(codec.parse('{"name":"Nib","points":4}'), {
    status: 'valid',
    value: { name: 'Nib', score: 4 },
    sourceVersion: 0,
    migrated: true,
  });
  assert.deepEqual(migrationCalls, ['0-to-1', '1-to-2']);

  migrationCalls.length = 0;
  assert.deepEqual(codec.parse('{"schemaVersion":2,"name":"Nib","score":4}'), {
    status: 'valid',
    value: { name: 'Nib', score: 4 },
    sourceVersion: 2,
    migrated: false,
  });
  assert.deepEqual(migrationCalls, []);
  assert.equal(
    codec.serialize({ name: 'Nib', score: 4 }),
    '{"schemaVersion":2,"name":"Nib","score":4}'
  );
});

test('versioned JSON rejects malformed, future, incomplete, and failed migrations', () => {
  let decoderCalled = false;
  const codec = versionedJson.createVersionedJsonCodec({
    currentVersion: 2,
    legacyVersion: 0,
    migrations: {
      0: () => {
        throw new Error('migration exploded');
      },
    },
    decodeCurrent: () => {
      decoderCalled = true;
      return { ok: true };
    },
    encodeCurrent: () => ({ schemaVersion: 2, ok: true }),
  });

  assert.deepEqual(codec.parse('{'), {
    status: 'invalid',
    reason: 'malformed-json',
  });
  assert.deepEqual(codec.parse('[]'), {
    status: 'invalid',
    reason: 'invalid-value',
  });
  for (const invalidVersion of ['"1"', '-1', '1.5']) {
    assert.deepEqual(codec.parse(`{"schemaVersion":${invalidVersion}}`), {
      status: 'invalid',
      reason: 'invalid-version',
    });
  }
  assert.deepEqual(codec.parse('{"schemaVersion":9}'), {
    status: 'invalid',
    reason: 'unsupported-version',
    sourceVersion: 9,
  });
  assert.equal(decoderCalled, false);
  assert.deepEqual(codec.parse('{"name":"legacy"}'), {
    status: 'invalid',
    reason: 'migration-failed',
    sourceVersion: 0,
  });

  const missingStepCodec = versionedJson.createVersionedJsonCodec({
    currentVersion: 2,
    legacyVersion: 0,
    migrations: { 0: (value) => ({ ...value, schemaVersion: 1 }) },
    decodeCurrent: () => ({ ok: true }),
    encodeCurrent: () => ({ schemaVersion: 2, ok: true }),
  });
  assert.deepEqual(missingStepCodec.parse('{"ok":true}'), {
    status: 'invalid',
    reason: 'missing-migration',
    sourceVersion: 0,
  });
});

test('versioned JSON refuses invalid serializer output', () => {
  const wrongVersionCodec = versionedJson.createVersionedJsonCodec({
    currentVersion: 1,
    legacyVersion: 0,
    migrations: { 0: (value) => ({ ...value, schemaVersion: 1 }) },
    decodeCurrent: () => ({ ok: true }),
    encodeCurrent: () => ({ schemaVersion: 2, ok: true }),
  });
  assert.throws(
    () => wrongVersionCodec.serialize({ ok: true }),
    /wrong schema version/
  );

  const invalidValueCodec = versionedJson.createVersionedJsonCodec({
    currentVersion: 1,
    legacyVersion: 0,
    migrations: { 0: (value) => ({ ...value, schemaVersion: 1 }) },
    decodeCurrent: () => undefined,
    encodeCurrent: () => ({ schemaVersion: 1, ok: true }),
  });
  assert.throws(
    () => invalidValueCodec.serialize({ ok: true }),
    /invalid current value/
  );

  const lossyNumberCodec = versionedJson.createVersionedJsonCodec({
    currentVersion: 1,
    decodeCurrent: (value) => {
      return isRecord(value) &&
        value.schemaVersion === 1 &&
        typeof value.score === 'number'
        ? { score: value.score }
        : undefined;
    },
    encodeCurrent: (value) => ({ schemaVersion: 1, score: value.score }),
  });
  assert.throws(
    () => lossyNumberCodec.serialize({ score: Number.POSITIVE_INFINITY }),
    /serialization changed/
  );
});

test('Scribbit v0 migration and canonical v1 round trip are deterministic', () => {
  const scribbit = createExampleScribbit();
  const legacyJson = JSON.stringify(scribbit);
  const migrated = scribbitStore.parseStoredScribbit(legacyJson);
  assert.equal(migrated.status, 'valid');
  assert.equal(migrated.sourceVersion, 0);
  assert.equal(migrated.migrated, true);

  const currentJson = scribbitStore.serializeScribbit(migrated.value);
  assert.equal(
    JSON.parse(currentJson).schemaVersion,
    scribbitStore.SCRIBBIT_SCHEMA_VERSION
  );
  const current = scribbitStore.parseStoredScribbit(currentJson);
  assert.equal(current.status, 'valid');
  assert.equal(current.sourceVersion, scribbitStore.SCRIBBIT_SCHEMA_VERSION);
  assert.equal(current.migrated, false);
  assert.deepEqual(current.value, migrated.value);
  assert.equal(scribbitStore.serializeScribbit(current.value), currentJson);
});

test('Scribbit v2 records drop retired pet fields during migration', () => {
  const scribbit = createExampleScribbit('retired-pet-fields');
  const versionTwoRecord = {
    ...JSON.parse(scribbitStore.serializeScribbit(scribbit)),
    schemaVersion: 2,
    mood: 'hungry',
    careDoneToday: ['feed'],
  };

  const migrated = scribbitStore.parseStoredScribbit(
    JSON.stringify(versionTwoRecord)
  );
  assert.equal(migrated.status, 'valid');
  assert.equal(migrated.sourceVersion, 2);
  assert.equal(migrated.migrated, true);
  assert.equal(Object.hasOwn(migrated.value, 'mood'), false);
  assert.equal(Object.hasOwn(migrated.value, 'careDoneToday'), false);

  const currentRecord = JSON.parse(
    scribbitStore.serializeScribbit(migrated.value)
  );
  assert.equal(
    currentRecord.schemaVersion,
    scribbitStore.SCRIBBIT_SCHEMA_VERSION
  );
  assert.equal(Object.hasOwn(currentRecord, 'mood'), false);
  assert.equal(Object.hasOwn(currentRecord, 'careDoneToday'), false);
});

test('the frozen Scribbit v0 migration composes through a simulated v2 update', () => {
  const scribbit = createExampleScribbit('three-step-version-scribbit');
  let versionSeenByV2Migration = null;
  const simulatedV2Codec = versionedJson.createVersionedJsonCodec({
    currentVersion: 2,
    legacyVersion: 0,
    migrations: {
      0: scribbitStore.migrateScribbitV0ToV1,
      1: (value) => {
        versionSeenByV2Migration = value.schemaVersion;
        return { ...value, schemaVersion: 2, saveGeneration: 2 };
      },
    },
    decodeCurrent: (value) => {
      return isRecord(value) &&
        value.schemaVersion === 2 &&
        value.saveGeneration === 2 &&
        typeof value.id === 'string'
        ? { id: value.id }
        : undefined;
    },
    encodeCurrent: (value) => ({
      schemaVersion: 2,
      saveGeneration: 2,
      id: value.id,
    }),
  });

  assert.deepEqual(simulatedV2Codec.parse(JSON.stringify(scribbit)), {
    status: 'valid',
    value: { id: scribbit.id },
    sourceVersion: 0,
    migrated: true,
  });
  assert.equal(versionSeenByV2Migration, 1);
});

test('Scribbit v1 is strict while valid future bytes are rejected and preserved', async () => {
  const scribbit = createExampleScribbit('strict-version-scribbit');
  const currentRecord = JSON.parse(scribbitStore.serializeScribbit(scribbit));
  delete currentRecord.equipmentLoadout;
  assert.deepEqual(
    scribbitStore.parseStoredScribbit(JSON.stringify(currentRecord)),
    {
      status: 'invalid',
      reason: 'invalid-value',
      sourceVersion: scribbitStore.SCRIBBIT_SCHEMA_VERSION,
    }
  );

  const futureJson = JSON.stringify({
    ...JSON.parse(scribbitStore.serializeScribbit(scribbit)),
    schemaVersion: scribbitStore.SCRIBBIT_SCHEMA_VERSION + 1,
  });
  assert.deepEqual(scribbitStore.parseStoredScribbit(futureJson), {
    status: 'invalid',
    reason: 'unsupported-version',
    sourceVersion: scribbitStore.SCRIBBIT_SCHEMA_VERSION + 1,
  });

  const key = scribbitStore.getScribbitKey(scribbit.id);
  const memory = createMemoryStorage({ strings: { [key]: futureJson } });
  await assert.rejects(
    scribbitStore.updateScribbit(memory.storage, scribbit),
    /invalid and was preserved/
  );
  assert.equal(memory.stringValues.get(key), futureJson);
  assert.deepEqual(memory.mutations, []);
});

test('Scribbit writes upgrade v0 and recover a lost transaction reply', async () => {
  const scribbit = createExampleScribbit('reply-loss-version-scribbit');
  const key = scribbitStore.getScribbitKey(scribbit.id);
  const memory = createMemoryStorage({
    strings: { [key]: JSON.stringify(scribbit) },
    loseNextCommitReply: true,
  });

  await scribbitStore.updateScribbit(memory.storage, scribbit);
  const committedJson = memory.stringValues.get(key);
  assert.equal(
    JSON.parse(committedJson).schemaVersion,
    scribbitStore.SCRIBBIT_SCHEMA_VERSION
  );
  assert.equal(
    scribbitStore.parseStoredScribbit(committedJson).migrated,
    false
  );

  await scribbitStore.updateScribbit(memory.storage, scribbit);
  assert.equal(memory.stringValues.get(key), committedJson);
});

test('an old writer cannot overwrite a concurrent future-version Scribbit', async () => {
  const scribbit = createExampleScribbit('rolling-version-scribbit');
  const key = scribbitStore.getScribbitKey(scribbit.id);
  const currentJson = scribbitStore.serializeScribbit(scribbit);
  const futureJson = JSON.stringify({
    ...JSON.parse(currentJson),
    schemaVersion: scribbitStore.SCRIBBIT_SCHEMA_VERSION + 1,
  });
  const memory = createMemoryStorage({ strings: { [key]: currentJson } });
  const watchStorage = memory.storage.watch.bind(memory.storage);
  let futureWriteInjected = false;
  memory.storage.watch = async (...keys) => {
    const transaction = await watchStorage(...keys);
    const executeTransaction = transaction.exec.bind(transaction);
    transaction.exec = async () => {
      if (!futureWriteInjected) {
        futureWriteInjected = true;
        await memory.storage.set(key, futureJson);
      }
      return await executeTransaction();
    };
    return transaction;
  };

  await assert.rejects(
    scribbitStore.updateScribbit(memory.storage, scribbit),
    /invalid and was preserved/
  );
  assert.equal(memory.stringValues.get(key), futureJson);
  assert.equal(
    memory.mutations.filter(
      (mutation) => mutation.method === 'set' && mutation.key === key
    ).length,
    1
  );
});

test('the current Champion uses the same versioned Scribbit boundary', async () => {
  const scribbit = createExampleScribbit('versioned-champion');
  const memory = createMemoryStorage();

  await arenaStore.setCurrentChampion(memory.storage, scribbit);
  const championMutation = memory.mutations.find(
    (mutation) =>
      mutation.method === 'set' && mutation.key === 'champion:current'
  );
  assert.equal(
    JSON.parse(championMutation.value).schemaVersion,
    scribbitStore.SCRIBBIT_SCHEMA_VERSION
  );
  assert.deepEqual(
    await arenaStore.getCurrentChampion(memory.storage),
    scribbit
  );
});

test('Champion writes preserve an unsupported future-version record', async () => {
  const scribbit = createExampleScribbit('future-version-champion');
  const futureJson = JSON.stringify({
    ...JSON.parse(scribbitStore.serializeScribbit(scribbit)),
    schemaVersion: scribbitStore.SCRIBBIT_SCHEMA_VERSION + 1,
  });
  const memory = createMemoryStorage({
    strings: { 'champion:current': futureJson },
  });

  await assert.rejects(
    arenaStore.setCurrentChampion(memory.storage, scribbit),
    /invalid and was preserved/
  );
  assert.equal(memory.stringValues.get('champion:current'), futureJson);
  assert.deepEqual(memory.mutations, []);
});

test('legacy inventory migration cannot downgrade a concurrent Gear rank', async () => {
  const userId = 'rank-migration-player';
  const gearId = 'tiny-sword';
  const inventoryKey = inkStore.getInventoryKey(userId);
  const rankField = inkStore.getInventoryGearRankField(gearId);
  const memory = createMemoryStorage({
    hashes: { [inventoryKey]: { [gearId]: '3' } },
  });
  const loadStoredInventory = memory.storage.hGetAll.bind(memory.storage);
  let injectedConcurrentRank = false;
  memory.storage.hGetAll = async (key) => {
    const storedInventory = await loadStoredInventory(key);
    if (key === inventoryKey && !injectedConcurrentRank) {
      injectedConcurrentRank = true;
      await memory.storage.hSet(inventoryKey, { [rankField]: '2' });
    }
    return storedInventory;
  };

  const staleRead = await inkStore.loadInventory(memory.storage, userId);
  assert.equal(staleRead.gear[gearId].rank, 1);
  assert.equal(await memory.storage.hGet(inventoryKey, rankField), '2');

  const freshRead = await inkStore.loadInventory(memory.storage, userId);
  assert.equal(freshRead.gear[gearId].rank, 2);
});

test('concurrent Legacy receipt updates keep the highest archived day', async () => {
  const userId = 'legacy-receipt-race-player';
  const memory = createMemoryStorage();
  const watchStorage = memory.storage.watch.bind(memory.storage);
  let watchedTransactionCount = 0;
  let releaseLowerCommit;
  let signalLowerReady;
  const lowerReady = new Promise((resolve) => {
    signalLowerReady = resolve;
  });
  const higherCommitted = new Promise((resolve) => {
    releaseLowerCommit = resolve;
  });
  memory.storage.watch = async (...keys) => {
    const transaction = await watchStorage(...keys);
    watchedTransactionCount += 1;
    if (watchedTransactionCount === 1) {
      const executeTransaction = transaction.exec.bind(transaction);
      transaction.exec = async () => {
        signalLowerReady();
        await higherCommitted;
        return await executeTransaction();
      };
    }
    return transaction;
  };

  const lowerUpdate = legacyStore.markLegacyCardsSeen(
    memory.storage,
    userId,
    10
  );
  await lowerReady;
  const higherResult = await legacyStore.markLegacyCardsSeen(
    memory.storage,
    userId,
    20
  );
  releaseLowerCommit();
  const lowerResult = await lowerUpdate;

  assert.equal(higherResult, 20);
  assert.equal(lowerResult, 20);
  assert.equal(
    await memory.storage.get(legacyStore.getLegacySeenDayKey(userId)),
    '20'
  );
});
