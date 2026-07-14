import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledServerRoot) {
  throw new Error(
    'Run stored-state corruption tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const founderChronicle = require(
  join(compiledServerRoot, 'core', 'founderChronicle.js')
);
const arenaStore = require(join(compiledServerRoot, 'core', 'arenaStore.js'));
const dailyJob = require(join(compiledServerRoot, 'core', 'dailyJob.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const rivalRun = require(join(compiledServerRoot, 'core', 'rivalRun.js'));
const scribbits = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const createRecordingStorage = (options) => createMemoryStorage(options);

const createStoredResolution = (resolvedDay) => ({
  resolvedDay,
  champion: scribbits.createScribbit({
    id: `resolution-champion-${resolvedDay}`,
    draft: {
      name: 'Outbox Champ',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      element: 'ember',
      accessories: [],
    },
    artist: 'outbox-artist',
    imageUrl: '/api/drawing/outbox-champ',
    day: resolvedDay,
  }),
  runnerUp: null,
  reportCount: 0,
  resolvedForecast: {
    day: resolvedDay,
    boostedElement: 'ember',
    nerfedElement: 'tide',
    blurb: 'Stored forecast',
  },
  nextForecast: {
    day: resolvedDay + 1,
    boostedElement: 'moss',
    nerfedElement: 'storm',
    blurb: 'Next stored forecast',
  },
  cloutPayout: {
    championBackers: 0,
    runnerUpBackers: 0,
    paidBackers: 0,
  },
  expired: { faded: 0, legends: 0 },
});

test('a cross-linked alive roster never exposes another player’s Scribbit', async () => {
  const memory = createMemoryStorage();
  const ownerUserId = 'roster-owner';
  const otherUserId = 'other-owner';
  const createRosterScribbit = (id, artist) =>
    scribbits.createScribbit({
      id,
      draft: {
        name: 'Roster Moth',
        stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
        element: 'ember',
        accessories: [],
      },
      artist,
      imageUrl: `/api/drawing/${id}`,
      day: 7,
    });
  const ownedScribbit = createRosterScribbit('owned-roster-moth', 'owner');
  const otherScribbit = createRosterScribbit('other-roster-moth', 'other');

  await scribbits.storeScribbit(memory.storage, ownerUserId, ownedScribbit);
  await scribbits.storeScribbit(memory.storage, otherUserId, otherScribbit);
  await memory.storage.zAdd(scribbits.getUserAliveScribbitsKey(ownerUserId), {
    member: otherScribbit.id,
    score: 9_999,
  });

  const visibleScribbits = await scribbits.getAliveScribbitsForUser(
    memory.storage,
    ownerUserId
  );
  assert.deepEqual(
    visibleScribbits.map(({ id }) => id),
    [ownedScribbit.id]
  );
});

test('Arena resolution corruption fails closed and preserves exact bytes', async (t) => {
  const outboxKey = dailyJob.getArenaResolutionOutboxKey();
  const cases = [
    ['malformed JSON', '{"resolvedDay":2'],
    ['partial payload', JSON.stringify({ resolvedDay: 2, champion: {} })],
    ['hash day mismatch', JSON.stringify(createStoredResolution(3))],
  ];

  for (const [name, corruptBytes] of cases) {
    await t.test(name, async () => {
      const recording = createRecordingStorage({
        hashes: { [outboxKey]: { 2: corruptBytes } },
      });
      await assert.rejects(
        dailyJob.loadPendingArenaResolutions(recording.storage),
        /Stored Arena resolution/
      );
      assert.equal(recording.hashValues.get(outboxKey).get('2'), corruptBytes);
      assert.deepEqual(recording.mutations, []);
    });
  }
});

test('Invalid Arena recovery cannot advance the authoritative day', async () => {
  const outboxKey = dailyJob.getArenaResolutionOutboxKey();
  const currentDayKey = arenaStore.getCurrentArenaDayKey();
  const corruptBytes = JSON.stringify({
    ...createStoredResolution(2),
    reportCount: -1,
  });
  const recording = createRecordingStorage({
    strings: { [currentDayKey]: '2' },
    hashes: { [outboxKey]: { 2: corruptBytes } },
    watch: true,
  });

  await assert.rejects(
    dailyJob.runNightlyArenaJobForTesting(recording.storage, { force: true }),
    /Stored Arena resolution for day 2 is invalid/
  );
  assert.equal(recording.stringValues.get(currentDayKey), '2');
  assert.equal(recording.hashValues.get(outboxKey).get('2'), corruptBytes);
  assert.deepEqual(recording.mutations, []);
});

test('A corrupt stale Arena resolution blocks every later day write', async () => {
  const outboxKey = dailyJob.getArenaResolutionOutboxKey();
  const currentDayKey = arenaStore.getCurrentArenaDayKey();
  const corruptBytes = '{"resolvedDay":1,"champion":{}}';
  const recording = createRecordingStorage({
    strings: { [currentDayKey]: '2' },
    hashes: { [outboxKey]: { 1: corruptBytes } },
    watch: true,
  });

  await assert.rejects(
    dailyJob.runNightlyArenaJobForTesting(recording.storage, { force: true }),
    /Stored Arena resolution for day 1 is invalid/
  );
  assert.equal(recording.stringValues.get(currentDayKey), '2');
  assert.equal(recording.hashValues.get(outboxKey).get('1'), corruptBytes);
  assert.deepEqual(recording.mutations, []);
});

test('A valid-looking future Arena resolution cannot advance or publish', async () => {
  const outboxKey = dailyJob.getArenaResolutionOutboxKey();
  const currentDayKey = arenaStore.getCurrentArenaDayKey();
  const futureBytes = JSON.stringify(createStoredResolution(999));
  const recording = createRecordingStorage({
    strings: { [currentDayKey]: '2' },
    hashes: { [outboxKey]: { 999: futureBytes } },
    watch: true,
  });

  await assert.rejects(
    dailyJob.runNightlyArenaJobForTesting(recording.storage, { force: true }),
    /future day 999 is invalid while the current day is 2/
  );
  assert.equal(recording.stringValues.get(currentDayKey), '2');
  assert.equal(recording.hashValues.get(outboxKey).get('999'), futureBytes);
  assert.deepEqual(recording.mutations, []);
});

test('A future Arena resolution cannot initialize a missing current day', async () => {
  const outboxKey = dailyJob.getArenaResolutionOutboxKey();
  const currentDayKey = arenaStore.getCurrentArenaDayKey();
  const futureBytes = JSON.stringify(createStoredResolution(999));
  const recording = createRecordingStorage({
    hashes: { [outboxKey]: { 999: futureBytes } },
    watch: true,
  });

  await assert.rejects(
    dailyJob.runNightlyArenaJobForTesting(recording.storage, {
      force: true,
      now: new Date(Date.UTC(2026, 6, 5)),
    }),
    /future day 999 is invalid while the current day is 2/
  );
  assert.equal(recording.stringValues.has(currentDayKey), false);
  assert.equal(recording.hashValues.get(outboxKey).get('999'), futureBytes);
  assert.deepEqual(recording.mutations, []);
});

test('Founder Chronicle classifies missing, valid, and invalid stored bytes', () => {
  assert.deepEqual(founderChronicle.parseStoredFounderChronicle(undefined), {
    status: 'missing',
  });

  const emptyChronicle = founderChronicle.createEmptyFounderChronicle();
  assert.deepEqual(
    founderChronicle.parseStoredFounderChronicle(
      JSON.stringify(emptyChronicle)
    ),
    { status: 'valid', chronicle: emptyChronicle }
  );
  assert.deepEqual(
    founderChronicle.parseStoredFounderChronicle('{"schemaVersion":999}'),
    { status: 'invalid' }
  );
});

test('Founder Chronicle corruption blocks migration and preserves exact bytes', async () => {
  const userId = 'corrupt-founder';
  const chronicleKey = founderChronicle.getFounderChronicleKey(userId);
  const legacyKey = founderChronicle.getLegacyFounderChronicleKey(userId);
  const corruptBytes = '{"schemaVersion":2,"activeRivalry":"broken"}';
  const legacyMilestones = { 'founding-bristle:first_bout': '4' };
  const recording = createRecordingStorage({
    strings: { [chronicleKey]: corruptBytes },
    hashes: { [legacyKey]: legacyMilestones },
  });

  await assert.rejects(
    founderChronicle.loadStoredFounderChronicle(recording.storage, userId),
    /Stored Founder Chronicle is invalid/
  );
  assert.equal(recording.stringValues.get(chronicleKey), corruptBytes);
  assert.deepEqual(
    Object.fromEntries(recording.hashValues.get(legacyKey).entries()),
    legacyMilestones
  );
  assert.deepEqual(recording.mutations, []);
});

test('Rival Run corruption blocks auto-creation and preserves exact bytes', async () => {
  const userId = 'corrupt-rival-run';
  const runKey = rivalRun.getRivalRunKey(userId);
  const corruptBytes = '{"schemaVersion":2,"id":"partial"}';
  const recording = createRecordingStorage({
    strings: { [runKey]: corruptBytes },
    watch: true,
  });

  await assert.rejects(
    rivalRun.getOrCreateRivalRun(recording.storage, {
      userId,
      runId: 'replacement-run',
      dayNumber: 7,
      challengerId: 'scribbit-1',
    }),
    /Stored Rival Run is invalid/
  );
  assert.equal(recording.stringValues.get(runKey), corruptBytes);
  assert.deepEqual(recording.mutations, []);
});

test('Ink and capsule counter corruption blocks pulls without rewriting bytes', async (t) => {
  const cases = [
    {
      name: 'Ink balance',
      userId: 'corrupt-ink',
      values: (userId) => ({ [inkStore.getInkKey(userId)]: ' 900 ' }),
      expectedError: /Stored Ink balance is invalid/,
    },
    {
      name: 'capsule pull count',
      userId: 'corrupt-pull-count',
      values: (userId) => ({
        [inkStore.getInkKey(userId)]: '900',
        [inkStore.getCapsulePullCountKey(userId)]: 'seventeen',
      }),
      expectedError: /Stored capsule pull count is invalid/,
    },
    {
      name: 'capsule pity',
      userId: 'corrupt-pity',
      values: (userId) => ({
        [inkStore.getInkKey(userId)]: '900',
        [inkStore.getCapsulePullCountKey(userId)]: '17',
        [inkStore.getPullsSinceEpicKey(userId)]: '999',
      }),
      expectedError: /Stored capsule pity counter is invalid/,
    },
  ];

  for (const corruptionCase of cases) {
    await t.test(corruptionCase.name, async () => {
      const initialValues = corruptionCase.values(corruptionCase.userId);
      const recording = createRecordingStorage({ strings: initialValues });

      await assert.rejects(
        inkStore.pullCapsuleForUser(
          recording.storage,
          corruptionCase.userId,
          12
        ),
        corruptionCase.expectedError
      );
      assert.deepEqual(
        Object.fromEntries(recording.stringValues),
        initialValues
      );
      assert.deepEqual(recording.mutations, []);
    });
  }
});

test('Invalid Ink blocks reward receipts without partial transaction writes', async () => {
  const userId = 'corrupt-ink-reward';
  const inkKey = inkStore.getInkKey(userId);
  const corruptBytes = 'nine hundred';
  const payoutKey = 'ink:payout:test';
  const recording = createRecordingStorage({
    strings: { [inkKey]: corruptBytes },
    watch: true,
  });

  await assert.rejects(
    inkStore.claimInkReward(recording.storage, {
      payoutKey,
      payoutField: userId,
      userId,
      amount: 25,
      paidAtMs: 123_456,
    }),
    /Stored Ink balance is invalid/
  );
  assert.equal(recording.stringValues.get(inkKey), corruptBytes);
  assert.deepEqual(recording.hashValues.get(payoutKey), undefined);
  assert.deepEqual(recording.mutations, []);
});
