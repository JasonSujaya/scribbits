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

function createPaintedPngDataUrl() {
  const png = new PNG({ width: 512, height: 512 });
  for (let y = 160; y < 352; y += 1) {
    for (let x = 160; x < 352; x += 1) {
      const offset = (y * png.width + x) * 4;
      png.data[offset] = 40;
      png.data[offset + 1] = 32;
      png.data[offset + 2] = 24;
      png.data[offset + 3] = 255;
    }
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

const identicalDrawing = createPaintedPngDataUrl();

for (const fighterStyle of ['brawler', 'longshot', 'gunner', 'mage']) {
  test(`server honors explicit ${fighterStyle} style for identical pixels`, () => {
    const result = createPracticeBattle({
      request: {
        name: 'Same Drawing',
        baseImageDataUrl: identicalDrawing,
        fighterStyle,
      },
      artist: 'style-test',
      playerId: 'style-test-player',
      canonicalDay: 1,
      nonce: fighterStyle,
    });

    assert.equal(result.status, 'created');
    assert.equal(selectCombatRole(result.report.a.stats), fighterStyle);

    const submission = validateAndAnalyzeScribbitSubmission({
      name: 'Same Drawing',
      baseImageDataUrl: identicalDrawing,
      imageDataUrl: identicalDrawing,
      fighterStyle,
      stats: { chonk: 55, spike: 15, zip: 15, charm: 15 },
      element: 'ember',
    });
    assert.equal(submission.status, 'valid');
    assert.equal(selectCombatRole(submission.draft.stats), fighterStyle);
  });
}

test('server rejects an unknown fighter style', () => {
  const result = createPracticeBattle({
    request: {
      name: 'Invalid Style',
      baseImageDataUrl: identicalDrawing,
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
    baseImageDataUrl: identicalDrawing,
    imageDataUrl: identicalDrawing,
    fighterStyle: 'sniper',
    stats: { chonk: 55, spike: 15, zip: 15, charm: 15 },
    element: 'ember',
  });
  assert.equal(submission.status, 'invalid');
  assert.equal(submission.reason, 'invalid-request');
});
