import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run Draw bucket-fill tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { floodFillRegion } = require(
  join(compiledClientRoot, 'lib', 'bucketfill.js')
);

const makePixels = (width, height) => new Uint8ClampedArray(width * height * 4);

const setPixel = (pixels, width, x, y, red, green, blue, alpha = 255) => {
  const offset = (y * width + x) * 4;
  pixels.set([red, green, blue, alpha], offset);
};

const readPixel = (pixels, width, x, y) => {
  const offset = (y * width + x) * 4;
  return [...pixels.slice(offset, offset + 4)];
};

test('bucket fill stays inside visible line boundaries', () => {
  const width = 7;
  const height = 7;
  const pixels = makePixels(width, height);

  for (let coordinate = 1; coordinate <= 5; coordinate += 1) {
    setPixel(pixels, width, coordinate, 1, 43, 32, 22);
    setPixel(pixels, width, coordinate, 5, 43, 32, 22);
    setPixel(pixels, width, 1, coordinate, 43, 32, 22);
    setPixel(pixels, width, 5, coordinate, 43, 32, 22);
  }

  assert.equal(floodFillRegion(pixels, width, height, 3, 3, [255, 90, 61]), 9);
  assert.deepEqual(readPixel(pixels, width, 3, 3), [255, 90, 61, 255]);
  assert.deepEqual(readPixel(pixels, width, 0, 0), [0, 0, 0, 0]);
  assert.deepEqual(readPixel(pixels, width, 3, 1), [43, 32, 22, 255]);
});

test('partially transparent antialiased line pixels still block blank fill', () => {
  const width = 5;
  const height = 3;
  const pixels = makePixels(width, height);
  for (let y = 0; y < height; y += 1) {
    setPixel(pixels, width, 2, y, 43, 32, 22, 24);
  }

  assert.equal(floodFillRegion(pixels, width, height, 0, 1, [79, 170, 79]), 6);
  assert.deepEqual(readPixel(pixels, width, 4, 1), [0, 0, 0, 0]);
});

test('four-way fill does not slip diagonally through touching line corners', () => {
  const width = 3;
  const height = 3;
  const pixels = makePixels(width, height);
  setPixel(pixels, width, 1, 0, 43, 32, 22);
  setPixel(pixels, width, 0, 1, 43, 32, 22);

  assert.equal(floodFillRegion(pixels, width, height, 0, 0, [59, 160, 224]), 1);
  assert.deepEqual(readPixel(pixels, width, 1, 1), [0, 0, 0, 0]);
});

test('transparent erased pixels fill regardless of their hidden RGB values', () => {
  const width = 3;
  const height = 1;
  const pixels = makePixels(width, height);
  setPixel(pixels, width, 0, 0, 43, 32, 22, 0);
  setPixel(pixels, width, 1, 0, 255, 90, 61, 0);
  setPixel(pixels, width, 2, 0, 138, 92, 216, 0);

  assert.equal(floodFillRegion(pixels, width, height, 1, 0, [242, 207, 61]), 3);
});

test('same-color and out-of-bounds fills are no-ops', () => {
  const pixels = makePixels(2, 2);
  setPixel(pixels, 2, 0, 0, 59, 160, 224);

  assert.equal(floodFillRegion(pixels, 2, 2, 0, 0, [59, 160, 224]), 0);
  assert.equal(floodFillRegion(pixels, 2, 2, -1, 0, [255, 90, 61]), 0);
  assert.equal(floodFillRegion(pixels, 2, 2, 2, 0, [255, 90, 61]), 0);
});
