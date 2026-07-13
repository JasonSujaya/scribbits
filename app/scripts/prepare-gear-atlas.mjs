#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';

const GRID_COLUMNS = 4;
const GRID_ROWS = 4;
const FRAME_PADDING = 10;

const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const inputPath = argumentValue('--input');
const outputImagePath = argumentValue('--output-image');
const outputJsonPath = argumentValue('--output-json');
const ids = (argumentValue('--ids') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

if (!inputPath || !outputImagePath || !outputJsonPath || ids.length === 0) {
  throw new Error(
    'Usage: prepare-gear-atlas.mjs --input sheet.png --output-image atlas.png --output-json atlas.json --ids id-1,id-2'
  );
}
if (ids.length > GRID_COLUMNS * GRID_ROWS) {
  throw new Error('A 4x4 Gear sheet can contain at most 16 icons.');
}

const source = PNG.sync.read(readFileSync(resolve(inputPath)));
const pixelIndex = (x, y) => (y * source.width + x) * 4;
const isConnectedWhiteBackground = (x, y) => {
  const index = pixelIndex(x, y);
  const red = source.data[index] ?? 0;
  const green = source.data[index + 1] ?? 0;
  const blue = source.data[index + 2] ?? 0;
  const alpha = source.data[index + 3] ?? 0;
  return (
    alpha > 0 &&
    red >= 232 &&
    green >= 232 &&
    blue >= 232 &&
    Math.max(red, green, blue) - Math.min(red, green, blue) <= 18
  );
};

const visited = new Uint8Array(source.width * source.height);
const queue = new Int32Array(source.width * source.height);
let queueStart = 0;
let queueEnd = 0;
const enqueueBackground = (x, y) => {
  if (x < 0 || y < 0 || x >= source.width || y >= source.height) return;
  const position = y * source.width + x;
  if (visited[position] === 1 || !isConnectedWhiteBackground(x, y)) return;
  visited[position] = 1;
  queue[queueEnd] = position;
  queueEnd += 1;
};

for (let x = 0; x < source.width; x += 1) {
  enqueueBackground(x, 0);
  enqueueBackground(x, source.height - 1);
}
for (let y = 0; y < source.height; y += 1) {
  enqueueBackground(0, y);
  enqueueBackground(source.width - 1, y);
}

while (queueStart < queueEnd) {
  const position = queue[queueStart];
  queueStart += 1;
  if (position === undefined) continue;
  const x = position % source.width;
  const y = Math.floor(position / source.width);
  source.data[pixelIndex(x, y) + 3] = 0;
  enqueueBackground(x - 1, y);
  enqueueBackground(x + 1, y);
  enqueueBackground(x, y - 1);
  enqueueBackground(x, y + 1);
}

const columnBoundary = (column) =>
  Math.round((column * source.width) / GRID_COLUMNS);
const rowBoundary = (row) =>
  Math.round((row * source.height) / GRID_ROWS);
const frames = {};

ids.forEach((id, index) => {
  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  const cellLeft = columnBoundary(column);
  const cellRight = columnBoundary(column + 1);
  const cellTop = rowBoundary(row);
  const cellBottom = rowBoundary(row + 1);
  let left = cellRight;
  let right = cellLeft;
  let top = cellBottom;
  let bottom = cellTop;

  for (let y = cellTop; y < cellBottom; y += 1) {
    for (let x = cellLeft; x < cellRight; x += 1) {
      const alpha = source.data[pixelIndex(x, y) + 3] ?? 0;
      if (alpha <= 8) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    throw new Error(`Generated sheet cell ${index} for ${id} is empty.`);
  }
  left = Math.max(cellLeft, left - FRAME_PADDING);
  right = Math.min(cellRight - 1, right + FRAME_PADDING);
  top = Math.max(cellTop, top - FRAME_PADDING);
  bottom = Math.min(cellBottom - 1, bottom + FRAME_PADDING);
  const width = right - left + 1;
  const height = bottom - top + 1;
  frames[id] = {
    frame: { x: left, y: top, w: width, h: height },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: width, h: height },
    sourceSize: { w: width, h: height },
  };
});

const atlas = {
  frames,
  meta: {
    app: 'Scribbits Gear atlas builder',
    version: '1',
    image: basename(outputImagePath),
    format: 'RGBA8888',
    size: { w: source.width, h: source.height },
    scale: '1',
  },
};

mkdirSync(dirname(resolve(outputImagePath)), { recursive: true });
mkdirSync(dirname(resolve(outputJsonPath)), { recursive: true });
writeFileSync(resolve(outputImagePath), PNG.sync.write(source));
writeFileSync(resolve(outputJsonPath), `${JSON.stringify(atlas, null, 2)}\n`);

console.log(
  `Prepared ${ids.length} transparent Gear frames from ${source.width}x${source.height} sheet.`
);
