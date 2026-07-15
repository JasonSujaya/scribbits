import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
if (!compiledServerRoot) {
  throw new Error('Run maturity tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const maturity = require(join(compiledServerRoot, 'core', 'maturity.js'));

const scribbit = (id, bornDay) => ({
  id,
  name: id,
  artist: 'maturity_player',
  element: 'tide',
  stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: `/api/drawing/${id}`,
  drawingThemeId: null,
  bornDay,
  expiresDay: bornDay + 3,
  belief: 0,
  wins: 0,
  losses: 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  gearRanks: {},
  equipmentLoadout: {
    head: [null, null],
    body: [null, null],
    weapon: [null, null],
    shoes: [null, null],
  },
  upgrades: [],
  powerUpIds: [],
  level: 1,
  xp: 0,
  legacy: null,
});

test('first maturity creates one durable, recoverable graduation receipt', async () => {
  const memory = createMemoryStorage();
  const userId = 'maturity-player';
  const growing = scribbit('still-growing', 10);
  const mature = scribbit('now-mature', 7);

  assert.deepEqual(
    await maturity.loadPendingMaturityScribbitIds(
      memory.storage,
      userId,
      [growing, mature],
      10
    ),
    ['now-mature']
  );

  await maturity.acknowledgeScribbitMaturity(
    memory.storage,
    userId,
    mature.id,
    1_000
  );
  assert.deepEqual(
    await maturity.loadPendingMaturityScribbitIds(
      memory.storage,
      userId,
      [growing, mature],
      10
    ),
    []
  );
  assert.deepEqual(
    await memory.storage.hGetAll(
      maturity.getMaturityAcknowledgementsKey(userId)
    ),
    { 'now-mature': '1000' }
  );
});
