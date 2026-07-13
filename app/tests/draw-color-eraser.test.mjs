import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run Draw color-eraser tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const colorEraser = require(join(compiledClientRoot, 'lib', 'coloreraser.js'));

function setPixel(pixels, width, x, y, [red, green, blue, alpha = 255]) {
  const pixelIndex = (y * width + x) * 4;
  pixels[pixelIndex] = red;
  pixels[pixelIndex + 1] = green;
  pixels[pixelIndex + 2] = blue;
  pixels[pixelIndex + 3] = alpha;
}

function alphaAt(pixels, width, x, y) {
  return pixels[(y * width + x) * 4 + 3];
}

test('hex colors parse into stable RGB eraser targets', () => {
  assert.deepEqual(colorEraser.parseHexColor('#ff5a3d'), [255, 90, 61]);
  assert.deepEqual(colorEraser.parseHexColor('#2B2016'), [43, 32, 22]);
  assert.equal(colorEraser.parseHexColor('coral'), null);
});

test('color eraser removes only the selected color inside its stroke', () => {
  const width = 6;
  const height = 5;
  const pixels = new Uint8ClampedArray(width * height * 4);
  setPixel(pixels, width, 1, 2, [255, 90, 61]);
  setPixel(pixels, width, 2, 2, [255, 106, 61]);
  setPixel(pixels, width, 3, 2, [255, 154, 61]);
  setPixel(pixels, width, 2, 1, [59, 160, 224]);
  setPixel(pixels, width, 2, 4, [255, 90, 61]);

  const erasedPixels = colorEraser.eraseMatchingColorSegment(
    pixels,
    width,
    height,
    { startX: 1, startY: 2, endX: 4, endY: 2, radius: 0.8 },
    [255, 90, 61]
  );

  assert.equal(erasedPixels, 2);
  assert.equal(alphaAt(pixels, width, 1, 2), 0);
  assert.equal(alphaAt(pixels, width, 2, 2), 0);
  assert.equal(
    alphaAt(pixels, width, 3, 2),
    255,
    'nearby orange paint must remain'
  );
  assert.equal(
    alphaAt(pixels, width, 2, 1),
    255,
    'another selected-color family must remain'
  );
  assert.equal(
    alphaAt(pixels, width, 2, 4),
    255,
    'matching paint outside the eraser stroke must remain'
  );
});

test('Draw exposes color-specific erasing and tactile control feedback', () => {
  const drawSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'scenes', 'Draw.ts'),
    'utf8'
  );
  assert.match(drawSource, /setEraser\(this\.activeStrokeColor\)/);
  assert.match(drawSource, /Erase only the selected ink color/);
  assert.match(drawSource, /private playControlFeedback\(/);
  assert.match(drawSource, /style: 'pop' \| 'shake'/);
  assert.doesNotMatch(drawSource, /Use eraser across all ink colors/);
});
