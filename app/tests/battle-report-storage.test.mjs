import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error(
    'Run battle report storage tests through run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const equipment = require(join(compiledSharedRoot, 'equipment.js'));
const battle = require(join(compiledServerRoot, 'core', 'battle.js'));
const battleStore = require(join(compiledServerRoot, 'core', 'battleStore.js'));
const forecast = require(join(compiledServerRoot, 'core', 'forecast.js'));
const species = require(join(compiledServerRoot, 'core', 'species.js'));

const makeChallenger = () => ({
  id: 'storage-challenger',
  name: 'Storage Scribble',
  artist: 'storage-tester',
  element: 'tide',
  stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: '/api/drawing/storage-challenger',
  drawingThemeId: null,
  bornDay: 11,
  expiresDay: 14,
  belief: 0,
  wins: 0,
  losses: 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  gearRanks: {},
  equipmentLoadout: equipment.createEmptyEquipmentLoadout(),
  upgrades: [],
  level: 1,
  xp: 0,
  mood: 'happy',
  careDoneToday: [],
  legacy: null,
});

test('reward enrichment accepts a normalized report with reordered object keys', async () => {
  const storage = createMemoryStorage();
  const challenger = makeChallenger();
  const opponent = species.chooseFoundingSparOpponent(challenger, 71);
  const report = battle.simulate(
    challenger,
    opponent,
    91,
    forecast.generateForecastForDay(11),
    'exhibition'
  );

  await battleStore.saveBattleReport(storage.storage, report, 1);
  await battleStore.saveBattleReport(
    storage.storage,
    { ...report, inkAwarded: 2 },
    1
  );

  assert.equal(
    (await battleStore.loadBattleReport(storage.storage, report.id))
      ?.inkAwarded,
    2
  );
});
