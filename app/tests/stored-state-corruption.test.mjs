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
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const rivalRun = require(join(compiledServerRoot, 'core', 'rivalRun.js'));

const createRecordingStorage = (options) => createMemoryStorage(options);

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
