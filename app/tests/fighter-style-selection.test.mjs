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
const {
  dominantFighterStyle,
  hueToFighterStyle,
  rgbToFighterStyle,
} = require(join(compiledSharedRoot, 'analyzer-core.js'));

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

test('color-wheel boundaries map to four deterministic fighter sectors', () => {
  assert.equal(hueToFighterStyle(0), 'brawler');
  assert.equal(hueToFighterStyle(37.999), 'brawler');
  assert.equal(hueToFighterStyle(38), 'gunner');
  assert.equal(hueToFighterStyle(153.999), 'gunner');
  assert.equal(hueToFighterStyle(154), 'longshot');
  assert.equal(hueToFighterStyle(232.999), 'longshot');
  assert.equal(hueToFighterStyle(233), 'mage');
  assert.equal(hueToFighterStyle(352.999), 'mage');
  assert.equal(hueToFighterStyle(353), 'brawler');
});

test('every base palette color has the advertised fighter result', () => {
  const palette = [
    [[43, 32, 22], 'brawler'],
    [[255, 90, 61], 'brawler'],
    [[255, 154, 61], 'brawler'],
    [[59, 160, 224], 'longshot'],
    [[127, 216, 230], 'longshot'],
    [[79, 170, 79], 'gunner'],
    [[138, 92, 216], 'mage'],
    [[242, 207, 61], 'gunner'],
    [[255, 255, 255], 'brawler'],
    [[255, 127, 176], 'mage'],
  ];
  palette.forEach(([rgb, expectedRole]) => {
    assert.equal(rgbToFighterStyle(...rgb), expectedRole);
  });
});

test('mixed colors use largest coverage with a stable neutral fallback', () => {
  assert.equal(
    dominantFighterStyle({ brawler: 10, longshot: 40, gunner: 20, mage: 30 }),
    'longshot'
  );
  assert.equal(
    dominantFighterStyle({ brawler: 0, longshot: 0, gunner: 0, mage: 0 }),
    'brawler'
  );
  assert.equal(
    dominantFighterStyle({ brawler: 12, longshot: 12, gunner: 12, mage: 12 }),
    'brawler'
  );
});
