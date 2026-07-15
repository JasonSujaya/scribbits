import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run Mature Arena tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { planMatureArenaCompetitor, selectMatureArenaCompetitor } = require(
  join(compiledClientRoot, 'lib', 'maturearena.js')
);

const scribbit = (id, expiresDay, status = 'alive') => ({
  id,
  name: id,
  expiresDay,
  status,
});

test('Mature Arena eligibility locks growing and retired Scribbits', () => {
  assert.deepEqual(planMatureArenaCompetitor(scribbit('Moss Bun', 9), 9), {
    eligible: true,
    statusLabel: 'MATURE • STATS LOCKED',
    accessibleStatus: 'Moss Bun is mature and can enter the Arena.',
  });
  assert.deepEqual(planMatureArenaCompetitor(scribbit('Paper Spark', 11), 9), {
    eligible: false,
    statusLabel: 'LOCKED • MATURES DAY 11',
    accessibleStatus:
      'Paper Spark is still growing and cannot enter the Mature Arena until day 11.',
  });
  assert.deepEqual(
    planMatureArenaCompetitor(scribbit('Old Ink', 7, 'retired'), 9),
    {
      eligible: false,
      statusLabel: 'RETIRED • NOT ELIGIBLE',
      accessibleStatus: 'Old Ink is retired and cannot enter the Mature Arena.',
    }
  );
});

test('Mature Arena defaults to a mature competitor but preserves a deliberate selection', () => {
  const growing = scribbit('growing', 11);
  const mature = scribbit('mature', 9);
  const roster = [growing, mature];

  assert.equal(selectMatureArenaCompetitor(roster, 9, null), mature);
  assert.equal(selectMatureArenaCompetitor(roster, 9, growing.id), growing);
  assert.equal(selectMatureArenaCompetitor([], 9, null), null);
});
