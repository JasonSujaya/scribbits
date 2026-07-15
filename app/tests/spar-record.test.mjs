import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledServerRoot) {
  throw new Error('Run spar record tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const scribbitStore = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const createScribbit = (overrides = {}) => ({
  id: overrides.id ?? 'spar-record-scribbit',
  name: 'Record Finch',
  artist: 'spar-player',
  element: 'storm',
  stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: '/api/drawing/spar-record',
  bornDay: 4,
  expiresDay: 7,
  belief: 0,
  wins: overrides.wins ?? 0,
  losses: overrides.losses ?? 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  upgrades: [],
  level: 1,
  xp: 0,
  legacy: null,
});

test('Spar report records one win across an ambiguous retry', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  const scribbit = createScribbit();
  const scribbitKey = scribbitStore.getScribbitKey(scribbit.id);
  const input = {
    scribbitId: scribbit.id,
    reportId: 'spar-report-win',
    outcome: 'win',
  };
  await memory.storage.set(scribbitKey, JSON.stringify(scribbit));

  await scribbitStore.recordBattleOutcomeForReport(memory.storage, input);
  await scribbitStore.recordBattleOutcomeForReport(memory.storage, input);

  const stored = JSON.parse(await memory.storage.get(scribbitKey));
  assert.equal(stored.wins, 1);
  assert.equal(stored.losses, 0);
  assert.equal(
    await memory.storage.hGet(
      scribbitStore.getBattleOutcomeReceiptKey(scribbit.id),
      input.reportId
    ),
    'win'
  );
});

test('Spar reports record losses independently and reject outcome changes', async () => {
  const memory = createMemoryStorage();
  const scribbit = createScribbit({ id: 'spar-loss-scribbit', wins: 2 });
  const scribbitKey = scribbitStore.getScribbitKey(scribbit.id);
  const input = {
    scribbitId: scribbit.id,
    reportId: 'spar-report-loss',
    outcome: 'loss',
  };
  await memory.storage.set(scribbitKey, JSON.stringify(scribbit));

  await scribbitStore.recordBattleOutcomeForReport(memory.storage, input);
  const stored = JSON.parse(await memory.storage.get(scribbitKey));
  assert.equal(stored.wins, 2);
  assert.equal(stored.losses, 1);
  await assert.rejects(
    scribbitStore.recordBattleOutcomeForReport(memory.storage, {
      ...input,
      outcome: 'win',
    }),
    /different outcome/
  );
});
