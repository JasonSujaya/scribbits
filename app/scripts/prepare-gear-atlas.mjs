#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';

const GRID_COLUMNS = 4;
const GRID_ROWS = 4;
const VISIBLE_ALPHA_THRESHOLD = 8;
const MINIMUM_COMPONENT_PIXELS = 20;

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
const rowBoundary = (row) => Math.round((row * source.height) / GRID_ROWS);
const componentVisited = new Uint8Array(source.width * source.height);
const components = [];

for (
  let startPosition = 0;
  startPosition < componentVisited.length;
  startPosition += 1
) {
  if (
    componentVisited[startPosition] === 1 ||
    source.data[startPosition * 4 + 3] <= VISIBLE_ALPHA_THRESHOLD
  ) {
    continue;
  }

  const positions = [];
  let left = source.width;
  let right = 0;
  let top = source.height;
  let bottom = 0;
  let totalX = 0;
  let totalY = 0;
  queueStart = 0;
  queueEnd = 0;
  queue[queueEnd] = startPosition;
  queueEnd += 1;
  componentVisited[startPosition] = 1;

  while (queueStart < queueEnd) {
    const position = queue[queueStart];
    queueStart += 1;
    if (position === undefined) continue;
    positions.push(position);
    const x = position % source.width;
    const y = Math.floor(position / source.width);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    totalX += x;
    totalY += y;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) continue;
        const neighborX = x + offsetX;
        const neighborY = y + offsetY;
        if (
          neighborX < 0 ||
          neighborY < 0 ||
          neighborX >= source.width ||
          neighborY >= source.height
        ) {
          continue;
        }
        const neighborPosition = neighborY * source.width + neighborX;
        if (
          componentVisited[neighborPosition] === 1 ||
          source.data[neighborPosition * 4 + 3] <= VISIBLE_ALPHA_THRESHOLD
        ) {
          continue;
        }
        componentVisited[neighborPosition] = 1;
        queue[queueEnd] = neighborPosition;
        queueEnd += 1;
      }
    }
  }

  if (positions.length < MINIMUM_COMPONENT_PIXELS) continue;
  components.push({
    positions,
    left,
    right,
    top,
    bottom,
    centerX: totalX / positions.length,
    centerY: totalY / positions.length,
  });
}

const componentGroups = Array.from({ length: ids.length }, () => []);
components.forEach((component) => {
  const column = Math.min(
    GRID_COLUMNS - 1,
    Math.floor((component.centerX * GRID_COLUMNS) / source.width)
  );
  const row = Math.min(
    GRID_ROWS - 1,
    Math.floor((component.centerY * GRID_ROWS) / source.height)
  );
  const index = row * GRID_COLUMNS + column;
  if (index < componentGroups.length) componentGroups[index].push(component);
});

const normalizedSource = new PNG({
  width: source.width,
  height: source.height,
});
normalizedSource.data.fill(0);
const frames = {};

ids.forEach((id, index) => {
  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  const cellLeft = columnBoundary(column);
  const cellRight = columnBoundary(column + 1);
  const cellTop = rowBoundary(row);
  const cellBottom = rowBoundary(row + 1);
  const group = componentGroups[index];
  if (!group || group.length === 0) {
    throw new Error(`Generated sheet cell ${index} for ${id} is empty.`);
  }
  const left = Math.min(...group.map((component) => component.left));
  const right = Math.max(...group.map((component) => component.right));
  const top = Math.min(...group.map((component) => component.top));
  const bottom = Math.max(...group.map((component) => component.bottom));
  const width = right - left + 1;
  const height = bottom - top + 1;
  const destinationLeft =
    cellLeft + Math.floor((cellRight - cellLeft - width) / 2);
  const destinationTop =
    cellTop + Math.floor((cellBottom - cellTop - height) / 2);
  if (destinationLeft < cellLeft || destinationTop < cellTop) {
    throw new Error(`${id} does not fit inside its normalized atlas cell.`);
  }

  group.forEach((component) => {
    component.positions.forEach((position) => {
      const sourceX = position % source.width;
      const sourceY = Math.floor(position / source.width);
      const destinationX = destinationLeft + sourceX - left;
      const destinationY = destinationTop + sourceY - top;
      const sourceIndex = pixelIndex(sourceX, sourceY);
      const destinationIndex =
        (destinationY * normalizedSource.width + destinationX) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        normalizedSource.data[destinationIndex + channel] =
          source.data[sourceIndex + channel];
      }
    });
  });

  frames[id] = {
    frame: {
      x: destinationLeft,
      y: destinationTop,
      w: width,
      h: height,
    },
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
writeFileSync(resolve(outputImagePath), PNG.sync.write(normalizedSource));
writeFileSync(resolve(outputJsonPath), `${JSON.stringify(atlas, null, 2)}\n`);

console.log(
  `Prepared ${ids.length} transparent Gear frames from ${source.width}x${source.height} sheet.`
);
