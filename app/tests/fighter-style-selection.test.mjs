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
  analyze,
  dominantFighterStyle,
  hueToFighterStyle,
  rgbToFighterStyle,
} = require(join(compiledSharedRoot, 'analyzer-core.js'));
const { PEN_CATALOG_ENTRIES } = require(
  join(compiledSharedRoot, 'cosmetics.js')
);

const styleRoles = ['brawler', 'longshot', 'mage'];

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

test('color-wheel boundaries map every everyday palette band deterministically', () => {
  assert.equal(hueToFighterStyle(0), 'brawler');
  assert.equal(hueToFighterStyle(38.999), 'brawler');
  assert.equal(hueToFighterStyle(39), 'longshot');
  assert.equal(hueToFighterStyle(153.999), 'longshot');
  assert.equal(hueToFighterStyle(154), 'mage');
  assert.equal(hueToFighterStyle(195.999), 'mage');
  assert.equal(hueToFighterStyle(196), 'longshot');
  assert.equal(hueToFighterStyle(232.999), 'longshot');
  assert.equal(hueToFighterStyle(233), 'mage');
  assert.equal(hueToFighterStyle(352.999), 'mage');
  assert.equal(hueToFighterStyle(353), 'brawler');
});

test('every chromatic base palette color has the advertised fighter result', () => {
  const palette = [
    [[139, 90, 43], 'brawler'],
    [[255, 90, 61], 'brawler'],
    [[255, 154, 61], 'brawler'],
    [[242, 207, 61], 'longshot'],
    [[79, 170, 79], 'longshot'],
    [[59, 160, 224], 'longshot'],
    [[127, 216, 230], 'mage'],
    [[138, 92, 216], 'mage'],
    [[255, 127, 176], 'mage'],
  ];
  palette.forEach(([rgb, expectedRole]) => {
    assert.equal(rgbToFighterStyle(...rgb), expectedRole);
  });
});

test('Rainbow Crayon cycles evenly through all three fighter styles', () => {
  const rainbow = PEN_CATALOG_ENTRIES.find(
    (entry) => entry.id === 'rainbow-crayon'
  );
  assert.ok(rainbow);
  const counts = { brawler: 0, longshot: 0, mage: 0 };
  for (const color of rainbow.colors) {
    const rgb = [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
    ];
    counts[rgbToFighterStyle(...rgb)] += 1;
  }
  assert.deepEqual(counts, { brawler: 3, longshot: 3, mage: 3 });
});

test('mixed colors use largest coverage and randomize exact ties from a seed', () => {
  assert.equal(
    dominantFighterStyle({ brawler: 10, longshot: 40, mage: 30 }, 0),
    'longshot'
  );
  const equalCounts = { brawler: 12, longshot: 12, mage: 12 };
  assert.deepEqual(
    [0, 1, 2].map((seed) => dominantFighterStyle(equalCounts, seed)),
    ['brawler', 'longshot', 'mage']
  );
  const neutralCounts = { brawler: 0, longshot: 0, mage: 0 };
  assert.deepEqual(
    [3, 4, 5].map((seed) => dominantFighterStyle(neutralCounts, seed)),
    ['brawler', 'longshot', 'mage']
  );
  const twoWayTie = { brawler: 8, longshot: 8, mage: 2 };
  assert.deepEqual(
    [0, 1, 2, 3].map((seed) => dominantFighterStyle(twoWayTie, seed)),
    ['brawler', 'longshot', 'brawler', 'longshot']
  );
});

test('an unchanged tied drawing keeps one stable randomized fighter style', () => {
  const width = 60;
  const height = 60;
  const data = new Uint8ClampedArray(width * height * 4);
  const colors = [
    [255, 90, 61],
    [79, 170, 79],
    [138, 92, 216],
  ];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = colors[Math.floor(x / 20)];
      const offset = (y * width + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }
  const field = { data, width, height };
  const firstRole = analyze(field).fighterStyle;
  assert.ok(styleRoles.includes(firstRole));
  assert.equal(analyze(field).fighterStyle, firstRole);
  assert.equal(analyze(field).fighterStyle, firstRole);
});

test('legacy Gunner input normalizes to the current Longshot build', () => {
  assert.equal(selectCombatRole(getStatsForFighterStyle('gunner')), 'longshot');
});
