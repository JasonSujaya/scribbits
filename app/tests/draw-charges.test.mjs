import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';
import { readFile } from 'node:fs/promises';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error('Run Draw Charge tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const drawCharges = require(join(compiledServerRoot, 'core', 'drawCharges.js'));

const startTime = Date.parse('2026-07-14T00:00:00.000Z');
const refillInterval = arena.DRAW_CHARGE_REFILL_INTERVAL_MS;
const submissionSource = await readFile(
  new URL('../src/server/core/submission.ts', import.meta.url),
  'utf8'
);
const apiSource = await readFile(
  new URL('../src/server/routes/api.ts', import.meta.url),
  'utf8'
);
const privacySource = await readFile(
  new URL('../src/server/core/privacy.ts', import.meta.url),
  'utf8'
);
const mockSource = await readFile(
  new URL('../scripts/dev-mock.mjs', import.meta.url),
  'utf8'
);

test('a new player starts with four Draw Charges and no refill timer', async () => {
  const memory = createMemoryStorage();
  const projection = await drawCharges.loadDrawCharges(
    memory.storage,
    'new-player',
    startTime
  );

  assert.deepEqual(projection, {
    state: {
      available: arena.DRAW_CHARGE_CAPACITY,
      capacity: arena.DRAW_CHARGE_CAPACITY,
      nextRefreshAt: null,
    },
    record: {
      available: arena.DRAW_CHARGE_CAPACITY,
      refillAnchorAt: startTime,
    },
  });
});

test('resetting the fresh mock restores a full Draw Charge meter', () => {
  assert.match(
    mockSource,
    /const resetFreshPreview[\s\S]{0,1200}memory\.drawChargesByPreviewMode\.fresh = \{\s*available: DRAW_CHARGE_CAPACITY,\s*capacity: DRAW_CHARGE_CAPACITY,\s*nextRefreshAt: null,\s*\}/
  );
});

test('consumption starts an eight-hour refill without banking full-meter time', () => {
  const oldFullRecord = {
    available: arena.DRAW_CHARGE_CAPACITY,
    refillAnchorAt: startTime - refillInterval * 20,
  };
  const consumedAt = startTime + 1234;
  const plan = drawCharges.planDrawChargeConsumption(oldFullRecord, consumedAt);

  assert.deepEqual(plan, {
    status: 'consumed',
    state: {
      available: 3,
      capacity: 4,
      nextRefreshAt: consumedAt + refillInterval,
    },
    record: { available: 3, refillAnchorAt: consumedAt },
  });
});

test('charges refill one per interval, preserve partial progress, and cap at four', () => {
  const emptyRecord = { available: 0, refillAnchorAt: startTime };

  const beforeBoundary = drawCharges.projectDrawCharges(
    emptyRecord,
    startTime + refillInterval - 1
  );
  assert.equal(beforeBoundary.state.available, 0);
  assert.equal(beforeBoundary.state.nextRefreshAt, startTime + refillInterval);

  const afterOneAndAHalfIntervals = drawCharges.projectDrawCharges(
    emptyRecord,
    startTime + refillInterval + refillInterval / 2
  );
  assert.deepEqual(afterOneAndAHalfIntervals, {
    state: {
      available: 1,
      capacity: 4,
      nextRefreshAt: startTime + refillInterval * 2,
    },
    record: {
      available: 1,
      refillAnchorAt: startTime + refillInterval,
    },
  });

  const capped = drawCharges.projectDrawCharges(
    emptyRecord,
    startTime + refillInterval * 10
  );
  assert.equal(capped.state.available, 4);
  assert.equal(capped.state.nextRefreshAt, null);
  assert.equal(capped.record.refillAnchorAt, startTime + refillInterval * 4);
});

test('an empty meter cannot consume and keeps its existing refill progress', () => {
  const record = { available: 0, refillAnchorAt: startTime };
  const plan = drawCharges.planDrawChargeConsumption(
    record,
    startTime + refillInterval / 2
  );

  assert.deepEqual(plan, {
    status: 'unavailable',
    state: {
      available: 0,
      capacity: 4,
      nextRefreshAt: startTime + refillInterval,
    },
    record,
  });
});

test('stored Draw Charges load through the same lazy projection', async () => {
  const memory = createMemoryStorage();
  const userId = 'returning-player';
  const record = { available: 1, refillAnchorAt: startTime };
  await memory.storage.hSet(
    drawCharges.getDrawChargeKey(userId),
    drawCharges.getDrawChargeRecordFields(record)
  );

  const projection = await drawCharges.loadDrawCharges(
    memory.storage,
    userId,
    startTime + refillInterval * 2
  );
  assert.equal(projection.state.available, 3);
  assert.equal(
    projection.state.nextRefreshAt,
    startTime + refillInterval * 3
  );
});

test('invalid persisted counts fail closed instead of granting charges', async () => {
  const memory = createMemoryStorage();
  const userId = 'corrupt-player';
  await memory.storage.hSet(drawCharges.getDrawChargeKey(userId), {
    available: '99',
    'refill-anchor-ms': startTime.toString(),
  });

  await assert.rejects(
    drawCharges.loadDrawCharges(memory.storage, userId, startTime),
    /Stored Draw Charge count is invalid/
  );
});

test('Scribbit birth atomically consumes one charge and only the first birth enters Rumble', () => {
  assert.match(
    submissionSource,
    /const drawChargeKey = getDrawChargeKey\(input\.userId\)/
  );
  assert.match(submissionSource, /watchedKeys = \[[\s\S]*?drawChargeKey/);
  assert.match(submissionSource, /planDrawChargeConsumption\(/);
  assert.match(submissionSource, /status: 'no-draw-charges'/);
  assert.match(
    submissionSource,
    /if \(expected\.enteredRumble\) \{[\s\S]*?transaction\.zAdd/
  );
  assert.match(
    submissionSource,
    /enteredRumble: dailyFlags\.entered === undefined/
  );
  assert.match(
    submissionSource,
    /getDrawChargeRecordFields\(expected\.drawChargeRecord\)/
  );
});

test('submission retries are exact and privacy deletion removes charge state', () => {
  assert.match(apiSource, /scribbitSubmissionIdPattern/);
  assert.match(apiSource, /createScribbitId\(player\.userId, submissionId\)/);
  assert.match(
    apiSource,
    /existingScribbit && existingOwner === player\.userId/
  );
  assert.match(apiSource, /SubmitScribbitResponse/);
  assert.match(privacySource, /getDrawChargeKey\(userId\)/);
});
