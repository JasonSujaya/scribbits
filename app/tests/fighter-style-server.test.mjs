import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledServerRoot || !compiledSharedRoot) {
  throw new Error(
    'Run fighter-style tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const { createPracticeBattle } = require(
  join(compiledServerRoot, 'core', 'practice.js')
);
const { validateAndAnalyzeScribbitSubmission } = require(
  join(compiledServerRoot, 'core', 'scribbit.js')
);
const { selectCombatRole } = require(
  join(compiledSharedRoot, 'combat', 'selection.js')
);

function createPaintedPngDataUrl([red, green, blue]) {
  const png = new PNG({ width: 512, height: 512 });
  for (let y = 160; y < 352; y += 1) {
    for (let x = 160; x < 352; x += 1) {
      const offset = (y * png.width + x) * 4;
      png.data[offset] = red;
      png.data[offset + 1] = green;
      png.data[offset + 2] = blue;
      png.data[offset + 3] = 255;
    }
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

const roleColors = {
  brawler: [255, 90, 61],
  longshot: [59, 160, 224],
  gunner: [79, 170, 79],
  mage: [138, 92, 216],
};

for (const [fighterStyle, rgb] of Object.entries(roleColors)) {
  test(`server derives ${fighterStyle} from drawing color`, () => {
    const drawing = createPaintedPngDataUrl(rgb);
    const result = createPracticeBattle({
      request: {
        name: 'Color Drawing',
        baseImageDataUrl: drawing,
      },
      artist: 'style-test',
      playerId: 'style-test-player',
      canonicalDay: 1,
      nonce: fighterStyle,
    });

    assert.equal(result.status, 'created');
    assert.equal(selectCombatRole(result.report.a.stats), fighterStyle);

    const submission = validateAndAnalyzeScribbitSubmission({
      name: 'Color Drawing',
      baseImageDataUrl: drawing,
      imageDataUrl: drawing,
      stats: { chonk: 55, spike: 15, zip: 15, charm: 15 },
      element: 'ember',
    });
    assert.equal(submission.status, 'valid');
    assert.equal(selectCombatRole(submission.draft.stats), fighterStyle);
  });
}

test('server ignores a spoofed fighter style in both submission paths', () => {
  const coralDrawing = createPaintedPngDataUrl(roleColors.brawler);
  const practice = createPracticeBattle({
    request: {
      name: 'Spoofed Drawing',
      baseImageDataUrl: coralDrawing,
      fighterStyle: 'mage',
    },
    artist: 'style-test',
    playerId: 'style-test-player',
    canonicalDay: 1,
    nonce: 'spoofed-style',
  });
  assert.equal(practice.status, 'created');
  assert.equal(selectCombatRole(practice.report.a.stats), 'brawler');

  const submission = validateAndAnalyzeScribbitSubmission({
    name: 'Spoofed Drawing',
    baseImageDataUrl: coralDrawing,
    imageDataUrl: coralDrawing,
    fighterStyle: 'mage',
    stats: { chonk: 20, spike: 20, zip: 20, charm: 40 },
    element: 'storm',
  });
  assert.equal(submission.status, 'valid');
  assert.equal(selectCombatRole(submission.draft.stats), 'brawler');
});

test('server rejects an unknown legacy fighter style', () => {
  const coralDrawing = createPaintedPngDataUrl(roleColors.brawler);
  const result = createPracticeBattle({
    request: {
      name: 'Invalid Style',
      baseImageDataUrl: coralDrawing,
      fighterStyle: 'sniper',
    },
    artist: 'style-test',
    playerId: 'style-test-player',
    canonicalDay: 1,
    nonce: 'invalid-style',
  });
  assert.equal(result.status, 'invalid-request');

  const submission = validateAndAnalyzeScribbitSubmission({
    name: 'Invalid Style',
    baseImageDataUrl: coralDrawing,
    imageDataUrl: coralDrawing,
    fighterStyle: 'sniper',
    stats: { chonk: 55, spike: 15, zip: 15, charm: 15 },
    element: 'ember',
  });
  assert.equal(submission.status, 'invalid');
  assert.equal(submission.reason, 'invalid-request');
});
