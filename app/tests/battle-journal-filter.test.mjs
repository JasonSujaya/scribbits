import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error(
    'Run battle journal filter tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const battleJournal = require(
  join(compiledClientRoot, 'lib', 'battlejournal.js')
);

const fighter = (id, name, artist) => ({ id, name, artist });
const report = (id, day, fighterA, fighterB, winner = 'a') => ({
  id,
  day,
  kind: 'exhibition',
  a: fighterA,
  b: fighterB,
  winner,
});

test('a character filter scores battles from that Scribbit perspective', () => {
  const winner = fighter('winner', 'Winner', 'viewer');
  const loser = fighter('loser', 'Loser', 'viewer');
  const ownedFight = report('owned-fight', 9, winner, loser, 'a');

  const entry = battleJournal.planBattleJournalEntry(
    ownedFight,
    'viewer',
    ['winner', 'loser'],
    'loser'
  );
  const summary = battleJournal.planBattleJournalSummary(
    [ownedFight],
    'viewer',
    ['winner', 'loser'],
    'loser'
  );

  assert.equal(entry.perspective, 'loss');
  assert.match(entry.accessibleLabel, /MY LOSS/);
  assert.equal(summary.ownedWins, 0);
  assert.equal(summary.ownedLosses, 1);
});

test('personal battle journals remove spectator fights and filter by Scribbit', () => {
  const paperSpark = fighter('paper-spark', 'Paper Spark', 'viewer');
  const mossBun = fighter('moss-bun', 'Moss Bun', 'viewer');
  const rivalOne = fighter('rival-one', 'Rival One', 'someone-else');
  const rivalTwo = fighter('rival-two', 'Rival Two', 'another-player');

  const reports = [
    report('spectator-fight', 12, rivalOne, rivalTwo),
    report('moss-fight', 11, mossBun, rivalOne),
    report('paper-fight', 10, rivalTwo, paperSpark),
  ];
  const personal = battleJournal.planPersonalBattleJournal(
    reports,
    ' VIEWER ',
    []
  );

  assert.deepEqual(
    personal.reports.map((entry) => entry.id),
    ['moss-fight', 'paper-fight']
  );
  assert.deepEqual(personal.characters, [
    { id: 'moss-bun', name: 'Moss Bun' },
    { id: 'paper-spark', name: 'Paper Spark' },
  ]);
  assert.deepEqual(
    battleJournal
      .filterBattleJournalReportsByCharacter(personal.reports, 'paper-spark')
      .map((entry) => entry.id),
    ['paper-fight']
  );
  assert.strictEqual(
    battleJournal.filterBattleJournalReportsByCharacter(personal.reports, null),
    personal.reports
  );
});
