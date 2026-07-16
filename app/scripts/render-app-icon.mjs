#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(
  appRoot,
  'src',
  'client',
  'assets',
  'scribbits-logo.png'
);
const outputPath = join(
  appRoot,
  'src',
  'client',
  'assets',
  'scribbits-app-icon.png'
);

const source = PNG.sync.read(readFileSync(sourcePath));
const icon = new PNG({ width: 1024, height: 1024, colorType: 6 });

const buildMascotMask = () => {
  const selectedPixels = new Uint8Array(source.width * source.height);
  const visitedPixels = new Uint8Array(source.width * source.height);
  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (
    let sourceIndex = 0;
    sourceIndex < selectedPixels.length;
    sourceIndex += 1
  ) {
    if (visitedPixels[sourceIndex] || source.data[sourceIndex * 4 + 3] < 12) {
      continue;
    }
    const componentPixels = [sourceIndex];
    let componentCursor = 0;
    let minimumX = source.width;
    visitedPixels[sourceIndex] = 1;
    while (componentCursor < componentPixels.length) {
      const pixelIndex = componentPixels[componentCursor];
      componentCursor += 1;
      const x = pixelIndex % source.width;
      const y = Math.floor(pixelIndex / source.width);
      minimumX = Math.min(minimumX, x);
      for (const [offsetX, offsetY] of neighbors) {
        const neighborX = x + offsetX;
        const neighborY = y + offsetY;
        const neighborIndex = neighborY * source.width + neighborX;
        if (
          neighborX < 0 ||
          neighborX >= source.width ||
          neighborY < 0 ||
          neighborY >= source.height ||
          visitedPixels[neighborIndex] ||
          source.data[neighborIndex * 4 + 3] < 12
        ) {
          continue;
        }
        visitedPixels[neighborIndex] = 1;
        componentPixels.push(neighborIndex);
      }
    }
    if (minimumX < 300) {
      for (const pixelIndex of componentPixels) selectedPixels[pixelIndex] = 1;
    }
  }
  return selectedPixels;
};

const mascotMask = buildMascotMask();

const colors = {
  ink: [43, 32, 22, 255],
  coral: [239, 82, 61, 255],
  paper: [255, 247, 232, 255],
  paperDot: [124, 100, 74, 24],
};

const blendPixel = (x, y, red, green, blue, alpha) => {
  if (x < 0 || x >= icon.width || y < 0 || y >= icon.height || alpha <= 0) {
    return;
  }
  const offset = (y * icon.width + x) * 4;
  const sourceAlpha = alpha / 255;
  const destinationAlpha = icon.data[offset + 3] / 255;
  const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  if (outputAlpha <= 0) return;
  icon.data[offset] = Math.round(
    (red * sourceAlpha +
      icon.data[offset] * destinationAlpha * (1 - sourceAlpha)) /
      outputAlpha
  );
  icon.data[offset + 1] = Math.round(
    (green * sourceAlpha +
      icon.data[offset + 1] * destinationAlpha * (1 - sourceAlpha)) /
      outputAlpha
  );
  icon.data[offset + 2] = Math.round(
    (blue * sourceAlpha +
      icon.data[offset + 2] * destinationAlpha * (1 - sourceAlpha)) /
      outputAlpha
  );
  icon.data[offset + 3] = Math.round(outputAlpha * 255);
};

const fillCircle = (centerX, centerY, radius, color) => {
  const radiusSquared = radius * radius;
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const distanceSquared =
        (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
      if (distanceSquared <= radiusSquared) blendPixel(x, y, ...color);
    }
  }
};

const drawBrushLine = (startX, startY, endX, endY, width, color) => {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  for (let step = 0; step <= steps; step += 1) {
    const progress = steps === 0 ? 0 : step / steps;
    const wobble = Math.sin(progress * Math.PI * 5) * 2;
    fillCircle(
      Math.round(startX + deltaX * progress),
      Math.round(startY + deltaY * progress + wobble),
      Math.max(1, Math.round(width / 2)),
      color
    );
  }
};

const drawMascot = () => {
  const crop = { x: 32, y: 22, width: 350, height: 425 };
  const destination = { x: 215, y: 108, width: 594, height: 720 };
  for (let y = 0; y < destination.height; y += 1) {
    const sourceY = Math.min(
      source.height - 1,
      crop.y + Math.floor((y / destination.height) * crop.height)
    );
    for (let x = 0; x < destination.width; x += 1) {
      const sourceX = Math.min(
        source.width - 1,
        crop.x + Math.floor((x / destination.width) * crop.width)
      );
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      if (!mascotMask[sourceY * source.width + sourceX]) continue;
      blendPixel(
        destination.x + x,
        destination.y + y,
        source.data[sourceOffset],
        source.data[sourceOffset + 1],
        source.data[sourceOffset + 2],
        source.data[sourceOffset + 3]
      );
    }
  }
};

fillCircle(512, 512, 486, colors.ink);
fillCircle(512, 512, 472, colors.coral);
fillCircle(512, 512, 430, colors.paper);

for (let y = 110; y < 914; y += 24) {
  for (let x = 110; x < 914; x += 24) {
    const distance = Math.hypot(x - 512, y - 512);
    if (distance < 408 && (x * 13 + y * 7) % 5 === 0) {
      fillCircle(x, y, 2, colors.paperDot);
    }
  }
}

drawMascot();
drawBrushLine(242, 844, 786, 830, 18, colors.coral);
drawBrushLine(288, 876, 746, 862, 11, colors.coral);

writeFileSync(outputPath, PNG.sync.write(icon, { colorType: 6 }));
console.log(`Rendered ${outputPath}`);
