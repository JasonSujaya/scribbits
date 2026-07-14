import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
if (!compiledServerRoot) {
  throw new Error('Run Free Draw storage tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const freeDrawings = require(
  join(compiledServerRoot, 'core', 'freeDrawingStore.js')
);

const drawing = (id = 'free-storage-one', day = 14) => ({
  id,
  name: 'Quiet Cloud',
  artist: 'free_drawer',
  imageUrl: `/drawing/${id}.png`,
  createdDay: day,
  createdAtMilliseconds: 1_800_000_000_000 + day,
});

test('Free Draw saves only to its versioned namespace', async () => {
  const memory = createMemoryStorage();
  const saved = await freeDrawings.saveFreeDrawing(
    memory.storage,
    'player-one',
    drawing()
  );

  assert.equal(saved.status, 'saved');
  assert.deepEqual(
    await freeDrawings.loadFreeDrawing(memory.storage, drawing().id),
    drawing()
  );
  assert.equal(
    await freeDrawings.hasFreeDrawingForDay(
      memory.storage,
      'player-one',
      drawing().createdDay
    ),
    true
  );

  const touchedKeys = memory.mutations.flatMap((mutation) => {
    if ('key' in mutation) return [mutation.key];
    if ('keys' in mutation) return mutation.keys;
    return [];
  });
  assert.ok(touchedKeys.length > 0);
  assert.ok(
    touchedKeys.every(
      (key) =>
        key.startsWith('free-drawing:v1:') || key.includes(':free-drawings:v1')
    )
  );
  assert.equal(memory.sortedSets.has('rumble:14'), false);
  assert.equal(memory.hashes.has('user:player-one:daily:14'), false);
  assert.equal(memory.strings.has(`scribbit:${drawing().id}`), false);
});

test('Free Draw retries are idempotent and another drawing cannot claim the day', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  const first = await freeDrawings.saveFreeDrawing(
    memory.storage,
    'player-one',
    drawing()
  );
  assert.equal(first.status, 'existing');

  const retry = await freeDrawings.saveFreeDrawing(
    memory.storage,
    'player-one',
    drawing()
  );
  assert.equal(retry.status, 'existing');

  const second = await freeDrawings.saveFreeDrawing(
    memory.storage,
    'player-one',
    drawing('free-storage-two')
  );
  assert.equal(second.status, 'already-drawn');
  assert.equal(
    memory.sortedSets.get(freeDrawings.getUserFreeDrawingsKey('player-one'))
      .size,
    1
  );
});

test('current-day Free Draw retrieval verifies pointer, owner, record id, and exact day', async () => {
  const memory = createMemoryStorage();
  const savedDrawing = drawing();
  await freeDrawings.saveFreeDrawing(
    memory.storage,
    'player-one',
    savedDrawing
  );

  assert.deepEqual(
    await freeDrawings.loadFreeDrawingForDay(
      memory.storage,
      'player-one',
      savedDrawing.createdDay
    ),
    savedDrawing
  );

  await memory.storage.set(
    freeDrawings.getUserFreeDrawingDayKey('player-two', savedDrawing.createdDay),
    savedDrawing.id
  );
  assert.equal(
    await freeDrawings.loadFreeDrawingForDay(
      memory.storage,
      'player-two',
      savedDrawing.createdDay
    ),
    undefined,
    'another user cannot expose the drawing by pointing their day key at it'
  );

  await memory.storage.set(
    freeDrawings.getUserFreeDrawingDayKey('player-one', 15),
    savedDrawing.id
  );
  assert.equal(
    await freeDrawings.loadFreeDrawingForDay(
      memory.storage,
      'player-one',
      15
    ),
    undefined,
    'a stale record cannot satisfy a different day pointer'
  );

  const corruptPointerId = 'free-corrupt-pointer';
  await memory.storage.set(
    freeDrawings.getUserFreeDrawingDayKey('player-one', 16),
    corruptPointerId
  );
  await memory.storage.set(
    freeDrawings.getFreeDrawingKey(corruptPointerId),
    JSON.stringify({ schemaVersion: 1, ...drawing('free-wrong-id', 16) })
  );
  await memory.storage.set(
    freeDrawings.getFreeDrawingOwnerKey(corruptPointerId),
    'player-one'
  );
  assert.equal(
    await freeDrawings.loadFreeDrawingForDay(
      memory.storage,
      'player-one',
      16
    ),
    undefined,
    'a record whose id disagrees with its pointer is never exposed'
  );
});

test('privacy deletion removes Free Draw records, ownership, index, and day choice', async () => {
  const memory = createMemoryStorage();
  const firstDrawing = drawing('free-delete-one', 12);
  const secondDrawing = drawing('free-delete-two', 13);
  await freeDrawings.saveFreeDrawing(
    memory.storage,
    'player-one',
    firstDrawing
  );
  // Different days are intentionally stored under the same isolated index.
  await memory.storage.del(
    freeDrawings.getUserFreeDrawingDayKey('player-one', 12)
  );
  await freeDrawings.saveFreeDrawing(
    memory.storage,
    'player-one',
    secondDrawing
  );

  assert.equal(
    await freeDrawings.deleteFreeDrawingsForUser(memory.storage, 'player-one'),
    2
  );
  for (const storedDrawing of [firstDrawing, secondDrawing]) {
    assert.equal(
      await freeDrawings.loadFreeDrawing(memory.storage, storedDrawing.id),
      undefined
    );
    assert.equal(
      await freeDrawings.getFreeDrawingOwner(memory.storage, storedDrawing.id),
      undefined
    );
  }
  assert.equal(
    memory.sortedSets.has(freeDrawings.getUserFreeDrawingsKey('player-one')),
    false
  );
});
