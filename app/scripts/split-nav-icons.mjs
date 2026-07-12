import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { PNG } from 'pngjs';

const sourcePath = process.argv[2];
const outputDirectory = process.argv[3];

if (!sourcePath || !outputDirectory) {
  throw new Error(
    'Usage: node scripts/split-nav-icons.mjs <source.png> <output-directory>'
  );
}

const iconNames = ['arena', 'gallery', 'draw', 'battles', 'scout'];
const source = PNG.sync.read(readFileSync(sourcePath));
const transparentSheet = new PNG({ width: source.width, height: source.height });

for (let pixel = 0; pixel < source.width * source.height; pixel += 1) {
  const offset = pixel * 4;
  const red = source.data[offset] ?? 0;
  const green = source.data[offset + 1] ?? 0;
  const blue = source.data[offset + 2] ?? 0;
  const alpha = source.data[offset + 3] ?? 255;
  const greenDominance = green - Math.max(red, blue);
  const keyStrength = Math.max(0, Math.min(1, (greenDominance - 18) / 125));

  transparentSheet.data[offset] = red;
  transparentSheet.data[offset + 1] = Math.min(
    green,
    Math.round(Math.max(red, blue) * 1.08)
  );
  transparentSheet.data[offset + 2] = blue;
  transparentSheet.data[offset + 3] = Math.round(alpha * (1 - keyStrength));
}

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  join(outputDirectory, `${basename(sourcePath, '.png')}-transparent.png`),
  PNG.sync.write(transparentSheet)
);

const cellWidth = source.width / iconNames.length;

iconNames.forEach((iconName, index) => {
  const left = Math.floor(index * cellWidth);
  const right = Math.floor((index + 1) * cellWidth);
  let minimumX = right;
  let minimumY = source.height;
  let maximumX = left;
  let maximumY = 0;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = left; x < right; x += 1) {
      const alpha = transparentSheet.data[(y * source.width + x) * 4 + 3] ?? 0;
      if (alpha < 18) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }

  if (maximumX < minimumX || maximumY < minimumY) {
    throw new Error(`No visible pixels found for ${iconName}`);
  }

  const visibleWidth = maximumX - minimumX + 1;
  const visibleHeight = maximumY - minimumY + 1;
  const padding = Math.ceil(Math.max(visibleWidth, visibleHeight) * 0.08);
  const squareSize = Math.max(visibleWidth, visibleHeight) + padding * 2;
  const icon = new PNG({ width: squareSize, height: squareSize });
  const destinationX = Math.floor((squareSize - visibleWidth) / 2);
  const destinationY = Math.floor((squareSize - visibleHeight) / 2);

  PNG.bitblt(
    transparentSheet,
    icon,
    minimumX,
    minimumY,
    visibleWidth,
    visibleHeight,
    destinationX,
    destinationY
  );
  writeFileSync(join(outputDirectory, `nav-${iconName}.png`), PNG.sync.write(icon));
});

console.log(`Split ${iconNames.length} icons into ${dirname(join(outputDirectory, '.'))}`);
