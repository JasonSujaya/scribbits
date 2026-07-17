import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledClientRoot || !compiledServerRoot || !compiledSharedRoot) {
  throw new Error('Run Paint reservoir tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const reservoir = require(join(compiledClientRoot, 'lib', 'paintreservoir.js'));
const drawingInk = require(join(compiledSharedRoot, 'drawingink.js'));
const paintBucket = require(join(compiledSharedRoot, 'paintbucket.js'));
const paintBucketStore = require(
  join(compiledServerRoot, 'core', 'paintBucket.js')
);
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));

test('paint reservoir starts full and spends only accepted positive amounts', () => {
  const full = reservoir.createPaintReservoir(100);
  assert.deepEqual(full, { capacity: 100, remaining: 100 });

  const used = reservoir.tryUsePaint(full, 30.2);
  assert.equal(used.accepted, true);
  assert.deepEqual(used.reservoir, { capacity: 100, remaining: 69 });
  assert.equal(reservoir.paintRemainingPercent(used.reservoir), 69);

  const noOp = reservoir.tryUsePaint(used.reservoir, 0);
  assert.equal(noOp.accepted, true);
  assert.equal(noOp.reservoir, used.reservoir);
});

test('paint reservoir rejects overdraw and malformed usage without underflow', () => {
  const reservoirState = reservoir.createPaintReservoir(12);
  for (const amount of [13, Number.POSITIVE_INFINITY, Number.NaN]) {
    const result = reservoir.tryUsePaint(reservoirState, amount);
    assert.equal(result.accepted, false);
    assert.equal(result.reservoir, reservoirState);
  }
});

test('returned paint replenishes only the replaced amount up to capacity', () => {
  const used = reservoir.tryUsePaint(reservoir.createPaintReservoir(100), 70);
  assert.equal(used.accepted, true);

  assert.deepEqual(reservoir.returnPaint(used.reservoir, 25), {
    capacity: 100,
    remaining: 55,
  });
  assert.deepEqual(reservoir.returnPaint(used.reservoir, 500), {
    capacity: 100,
    remaining: 100,
  });
  assert.equal(
    reservoir.returnPaint(used.reservoir, Number.NaN),
    used.reservoir
  );
});

test('paint bucket levels resolve to stable server-owned capacities', () => {
  assert.deepEqual(paintBucket.getPaintBucketState(), {
    level: 1,
    capacity: 60_000,
  });
  assert.deepEqual(paintBucket.getPaintBucketState(3), {
    level: 3,
    capacity: 120_000,
  });
  assert.deepEqual(paintBucket.getPaintBucketState(999), {
    level: 1,
    capacity: 60_000,
  });
});

test('paint bucket storage defaults legacy and malformed records safely', async () => {
  const memory = createMemoryStorage();
  const userId = 'paint-player';

  assert.deepEqual(
    await paintBucketStore.loadPaintBucket(memory.storage, userId),
    paintBucket.getPaintBucketState(1)
  );

  await memory.storage.set(paintBucketStore.getPaintBucketKey(userId), '4');
  assert.deepEqual(
    await paintBucketStore.loadPaintBucket(memory.storage, userId),
    paintBucket.getPaintBucketState(4)
  );

  await memory.storage.set(
    paintBucketStore.getPaintBucketKey(userId),
    'broken'
  );
  assert.deepEqual(
    await paintBucketStore.loadPaintBucket(memory.storage, userId),
    paintBucket.getPaintBucketState(1)
  );
});

test('special color refills spend Ink atomically and recover idempotently', async () => {
  const memory = createMemoryStorage();
  const userId = 'drawing-ink-refill-player';
  const itemId = 'berry-jam-ink';
  const operationId = 'drawing-ink-refill-operation-0001';
  await memory.storage.set(inkStore.getInkKey(userId), '10');
  await memory.storage.hSet(inkStore.getInventoryKey(userId), {
    [inkStore.getInventoryDiscoveryField(itemId)]: '1',
    [itemId]: '2',
  });

  const refilled = await inkStore.refillDrawingInkForUser(
    memory.storage,
    userId,
    itemId,
    operationId
  );
  assert.equal(refilled.status, 'refilled');
  assert.equal(refilled.response.itemId, itemId);
  assert.equal(refilled.response.quantity, 3);
  assert.equal(refilled.response.inventory.items[itemId], 3);
  assert.equal(refilled.response.inkSpent, drawingInk.DRAWING_INK_REFILL_COST);
  assert.equal(refilled.response.ink, 7);
  assert.equal(await memory.storage.get(inkStore.getInkKey(userId)), '7');

  const repeated = await inkStore.refillDrawingInkForUser(
    memory.storage,
    userId,
    itemId,
    operationId
  );
  assert.deepEqual(repeated, refilled);
  assert.equal(await memory.storage.get(inkStore.getInkKey(userId)), '7');
});

test('special color refills require discovery and enough Ink', async () => {
  const memory = createMemoryStorage();
  const userId = 'drawing-ink-refill-limit-player';
  const itemId = 'ghostlight-ink';
  await memory.storage.set(inkStore.getInkKey(userId), '2');

  assert.deepEqual(
    await inkStore.refillDrawingInkForUser(
      memory.storage,
      userId,
      itemId,
      'drawing-ink-refill-operation-0002'
    ),
    { status: 'invalid' }
  );
  await memory.storage.hSet(inkStore.getInventoryKey(userId), {
    [inkStore.getInventoryDiscoveryField(itemId)]: '1',
  });
  assert.deepEqual(
    await inkStore.refillDrawingInkForUser(
      memory.storage,
      userId,
      itemId,
      'drawing-ink-refill-operation-0003'
    ),
    { status: 'insufficientInk', ink: 2, cost: 3 }
  );
});
