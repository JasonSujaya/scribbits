import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error(
    'Run first battle tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const battleArena = require(join(compiledSharedRoot, 'battlearena.js'));
const combatRoles = require(join(compiledSharedRoot, 'combat', 'roles.js'));
const combatSelection = require(
  join(compiledSharedRoot, 'combat', 'selection.js')
);
const battle = require(join(compiledServerRoot, 'core', 'battle.js'));
const forecast = require(join(compiledServerRoot, 'core', 'forecast.js'));
const species = require(join(compiledServerRoot, 'core', 'species.js'));

const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const apiSource = await readFile(
  new URL('../src/server/routes/api.ts', import.meta.url),
  'utf8'
);
const mockSource = await readFile(
  new URL('../scripts/dev-mock.mjs', import.meta.url),
  'utf8'
);

test('newborn debut uses the basic arena and an advantageous level-one rival', () => {
  const founder = species.findFoundingScribbit('founding-mosswhisk');
  assert.ok(founder);
  const newborn = {
    ...founder,
    id: 'newborn-first-battle',
    name: 'Newborn',
    isFounding: false,
    bornDay: 3,
  };
  const rival = species.chooseFoundingFirstBattleOpponent(newborn, 73);
  assert.equal(rival.level, 1);
  assert.equal(
    combatRoles.getCombatRoleAdvantage(
      combatSelection.selectCombatRole(newborn.stats),
      combatSelection.selectCombatRole(rival.stats)
    ),
    'advantage'
  );

  const report = battle.simulate(
    newborn,
    rival,
    91,
    forecast.generateForecastForDay(3),
    'exhibition',
    { battleArenaId: battleArena.DEFAULT_BATTLE_ARENA_ID }
  );
  assert.equal(report.battleArenaId, 'v1-sticker-stadium');
  assert.equal(
    battleArena.getBattleArenaDefinition(report.battleArenaId).challenge.kind,
    'complete'
  );
  assert.deepEqual(report.arenaChallenge, {
    progress: 1,
    target: 1,
    completed: true,
  });
});

test('first-battle mode is explicit, server-guarded, and mock-identical', () => {
  assert.match(drawSource, /spar\(scribbit\.id, undefined, undefined, true\)/);
  assert.match(
    apiSource,
    /const firstBattleRequested = sparRequest\.firstBattle === true/
  );
  assert.match(
    apiSource,
    /await hasUserCompletedBattle\(redis, player\.userId\)/
  );
  assert.match(apiSource, /challenger\.bornDay !== dayNumber/);
  assert.match(apiSource, /battleArenaId: DEFAULT_BATTLE_ARENA_ID/);
  assert.match(
    mockSource,
    /const firstBattleRequested = body\?\.firstBattle === true/
  );
  assert.match(mockSource, /battleArenaId: DEFAULT_BATTLE_ARENA_ID/);
});
