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
const paintBucket = require(join(compiledSharedRoot, 'paintbucket.js'));
const paintBucketStore = require(
  join(compiledServerRoot, 'core', 'paintBucket.js')
);

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
