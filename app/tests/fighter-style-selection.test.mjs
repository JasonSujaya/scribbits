import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error(
    'Run fighter-style tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const { getStatsForFighterStyle, selectCombatRole } = require(
  join(compiledSharedRoot, 'combat', 'selection.js')
);

const styleRoles = ['brawler', 'longshot', 'gunner', 'mage'];

for (const role of styleRoles) {
  test(`${role} color choice creates the matching fixed fighter build`, () => {
    const stats = getStatsForFighterStyle(role);
    assert.equal(
      Object.values(stats).reduce((total, value) => total + value, 0),
      100
    );
    assert.equal(selectCombatRole(stats), role);
  });
}

test('fighter-style builds are symmetric and do not reward one color', () => {
  const sortedBuilds = styleRoles.map((role) => {
    return Object.values(getStatsForFighterStyle(role)).sort((a, b) => b - a);
  });
  sortedBuilds.forEach((build) => {
    assert.deepEqual(build, sortedBuilds[0]);
  });
});
