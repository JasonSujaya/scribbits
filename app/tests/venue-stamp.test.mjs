import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error('Run Venue Stamp tests through scripts/run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const equipment = require(join(compiledSharedRoot, 'equipment.js'));
const battleArena = require(join(compiledSharedRoot, 'battlearena.js'));
const combatConfig = require(join(compiledSharedRoot, 'combat', 'config.js'));
const battle = require(join(compiledServerRoot, 'core', 'battle.js'));
const forecast = require(join(compiledServerRoot, 'core', 'forecast.js'));
const species = require(join(compiledServerRoot, 'core', 'species.js'));
const venueStamp = require(join(compiledServerRoot, 'core', 'venueStamp.js'));

test('60-day Arena rotation changes daily and uses every field evenly', () => {
  const arenaIds = Array.from(
    { length: 60 },
    (_, index) => battleArena.getBattleArenaForDay(index + 1).id
  );

  assert.equal(new Set(arenaIds).size, battleArena.BATTLE_ARENA_IDS.length);
  for (
    let unlockIndex = 0;
    unlockIndex < battleArena.BATTLE_ARENA_IDS.length;
    unlockIndex += 1
  ) {
    const unlockDay = unlockIndex + 1;
    assert.equal(
      arenaIds[unlockDay - 1],
      battleArena.BATTLE_ARENA_IDS[unlockIndex]
    );
  }
  for (let dayIndex = 1; dayIndex < arenaIds.length; dayIndex += 1) {
    assert.notEqual(arenaIds[dayIndex], arenaIds[dayIndex - 1]);
  }
  for (const arenaId of battleArena.BATTLE_ARENA_IDS) {
    assert.equal(
      arenaIds.filter((candidate) => candidate === arenaId).length,
      6
    );
  }
});

test('all ten Arena fields keep standard combat rules and distinct field identity', () => {
  const definitions = battleArena.BATTLE_ARENA_IDS.map((arenaId) =>
    battleArena.getBattleArenaDefinition(arenaId)
  );
  assert.ok(
    definitions.every((definition) => definition.shortRule.includes('rules'))
  );
  assert.equal(
    new Set(definitions.map((definition) => definition.name)).size,
    definitions.length
  );
  assert.equal(
    new Set(definitions.map((definition) => definition.challengeLabel)).size,
    definitions.length
  );
  for (const definition of definitions) {
    assert.deepEqual(definition.modifier, {});
    assert.deepEqual(
      battleArena.applyBattleArenaModifier(
        combatConfig.DEFAULT_COMBAT_RULES,
        definition.id
      ),
      combatConfig.DEFAULT_COMBAT_RULES,
      `${definition.name} must preserve the standard combat rules`
    );
  }
});

const makeChallenger = (id, artist) => ({
  id,
  name: `Scribbit ${id}`,
  artist,
  element: 'tide',
  stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: `/api/drawing/${id}`,
  drawingThemeId: null,
  bornDay: 8,
  expiresDay: 11,
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
  legacy: null,
});

const makeReport = ({
  id,
  userId,
  username,
  progress,
  completed,
  clearMilliseconds,
  kind = 'exhibition',
}) => {
  const day = 11;
  const challenger = makeChallenger(`${userId}-scribbit`, username);
  const opponent = species.chooseFoundingSparOpponent(challenger, 71);
  const base = battle.simulate(
    challenger,
    opponent,
    91,
    forecast.generateForecastForDay(day),
    'exhibition'
  );
  const arena = battleArena.getBattleArenaForDay(day);
  return {
    ...base,
    id,
    kind,
    day,
    battleArenaId: arena.id,
    arenaChallenge: {
      progress,
      target: arena.challenge.target,
      completed,
    },
    simulation: {
      ...base.simulation,
      result: {
        ...base.simulation.result,
        completedMilliseconds: clearMilliseconds,
      },
    },
  };
};

test('Venue Stamp keeps best progress, ranks clears by fastest time, and ignores slower retries', async () => {
  const memory = createMemoryStorage();
  const arena = battleArena.getBattleArenaForDay(11);
  const target = arena.challenge.target;
  const incompleteProgress = Math.max(0, target - 1);

  await venueStamp.recordVenueStampAttempt(
    memory.storage,
    'player-a',
    'paper_a',
    makeReport({
      id: 'attempt-a-1',
      userId: 'player-a',
      username: 'paper_a',
      progress: incompleteProgress,
      completed: false,
      clearMilliseconds: 20_000,
    })
  );
  let state = await venueStamp.loadVenueStampState(
    memory.storage,
    11,
    'player-a'
  );
  assert.equal(state.progress, incompleteProgress);
  assert.equal(state.cleared, false);
  assert.equal(state.dailyRank, null);

  await venueStamp.recordVenueStampAttempt(
    memory.storage,
    'player-a',
    'paper_a',
    makeReport({
      id: 'attempt-a-clear',
      userId: 'player-a',
      username: 'paper_a',
      progress: target,
      completed: true,
      clearMilliseconds: 12_000,
    })
  );
  await venueStamp.recordVenueStampAttempt(
    memory.storage,
    'player-b',
    'paper_b',
    makeReport({
      id: 'attempt-b-clear',
      userId: 'player-b',
      username: 'paper_b',
      progress: target,
      completed: true,
      clearMilliseconds: 9_000,
    })
  );
  await venueStamp.recordVenueStampAttempt(
    memory.storage,
    'player-a',
    'paper_a',
    makeReport({
      id: 'attempt-a-slower',
      userId: 'player-a',
      username: 'paper_a',
      progress: target,
      completed: true,
      clearMilliseconds: 15_000,
    })
  );

  state = await venueStamp.loadVenueStampState(memory.storage, 11, 'player-a');
  assert.equal(state.cleared, true);
  assert.equal(state.bestClearMilliseconds, 12_000);
  assert.equal(state.dailyRank, 2);
  assert.equal(state.clearCount, 2);

  const board = await venueStamp.loadVenueBoard(memory.storage, 11, {
    userId: 'player-a',
    username: 'paper_a',
  });
  assert.deepEqual(
    board.top.map((entry) => [
      entry.username,
      entry.rank,
      entry.clearMilliseconds,
    ]),
    [
      ['paper_b', 1, 9_000],
      ['paper_a', 2, 12_000],
    ]
  );
  assert.equal(board.me?.rank, 2);
});

test('Venue Stamp ignores growing-Scribbit battles', async () => {
  const memory = createMemoryStorage();
  const arena = battleArena.getBattleArenaForDay(11);
  const growingReport = makeReport({
    id: 'growing-attempt',
    userId: 'player-growing',
    username: 'paper_growing',
    progress: arena.challenge.target,
    completed: true,
    clearMilliseconds: 9_000,
  });
  growingReport.a = {
    ...growingReport.a,
    bornDay: 11,
    expiresDay: 14,
  };

  await venueStamp.recordVenueStampAttempt(
    memory.storage,
    'player-growing',
    'paper_growing',
    growingReport
  );

  const state = await venueStamp.loadVenueStampState(
    memory.storage,
    11,
    'player-growing'
  );
  assert.equal(state.progress, 0);
  assert.equal(state.cleared, false);
  assert.equal(state.dailyRank, null);
});

test('Rumble reports never grant a player Venue Stamp', async () => {
  const memory = createMemoryStorage();
  const arena = battleArena.getBattleArenaForDay(11);
  await venueStamp.recordVenueStampAttempt(
    memory.storage,
    'player-a',
    'paper_a',
    makeReport({
      id: 'rumble-attempt',
      userId: 'player-a',
      username: 'paper_a',
      progress: arena.challenge.target,
      completed: true,
      clearMilliseconds: 8_000,
      kind: 'rumble',
    })
  );
  const state = await venueStamp.loadVenueStampState(
    memory.storage,
    11,
    'player-a'
  );
  assert.equal(state.progress, 0);
  assert.equal(state.dailyRank, null);
  assert.equal(state.clearCount, 0);
});

test('Venue Stamp privacy removal clears attempts and ranking membership', async () => {
  const memory = createMemoryStorage();
  const arena = battleArena.getBattleArenaForDay(11);
  await venueStamp.recordVenueStampAttempt(
    memory.storage,
    'player-a',
    'paper_a',
    makeReport({
      id: 'private-attempt',
      userId: 'player-a',
      username: 'paper_a',
      progress: arena.challenge.target,
      completed: true,
      clearMilliseconds: 8_000,
    })
  );

  await venueStamp.removeVenueStampDataForUser(memory.storage, 'player-a');
  const state = await venueStamp.loadVenueStampState(
    memory.storage,
    11,
    'player-a'
  );
  assert.equal(state.progress, 0);
  assert.equal(state.dailyRank, null);
  assert.equal(state.clearCount, 0);
});
