import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) =>
  readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');

const [drawSource, drawCanvasSource, gallerySource, privacySource, mockSource] =
  await Promise.all([
    readSource('client/scenes/Draw.ts'),
    readSource('client/lib/drawcanvas.ts'),
    readSource('client/scenes/Gallery.ts'),
    readSource('server/core/privacy.ts'),
    readFile(new URL('../scripts/dev-mock.mjs', import.meta.url), 'utf8'),
  ]);

test('Draw drains independent paint levels inside the color swatches', () => {
  assert.match(drawSource, /private paintReservoirs: PaintReservoir\[\]/);
  assert.match(drawSource, /createPalettePaintReservoirs/);
  assert.match(drawSource, /private palettePaintFills:/);
  assert.match(drawSource, /private renderPalettePaintLevel\(/);
  assert.match(drawSource, /fill\.arc\(0, 0, radius/);
  assert.match(
    drawSource,
    /this\.paintReservoirs\[colorIndex\] = result\.reservoir/
  );
  assert.doesNotMatch(drawSource, /private paintReservoirRing:/);
  assert.doesNotMatch(drawSource, /private paintReservoirLabel:/);
  assert.match(drawSource, /requestPaint: \(amount, kind\) =>/);
  assert.match(drawSource, /this\.automationMode \|\| this\.requestPaint/);
});

test('one empty base color does not disable other colors or premium paint', () => {
  assert.match(
    drawSource,
    /return this\.paintReservoirs\[this\.selectedColorIndex\] \?\? null/
  );
  assert.match(drawSource, /if \(colorIndex < 0 \|\| !reservoir\) return true/);
  assert.match(drawSource, /const hasPaint = this\.hasActivePaint\(\)/);
});

test('paint accounting counts every changed pixel while preserving editing tools', () => {
  assert.match(drawCanvasSource, /let changedPixels = 0/);
  assert.match(
    drawCanvasSource,
    /before\.data\[offset\] !== after\.data\[offset\]/
  );
  assert.match(
    drawCanvasSource,
    /this\.requestPaint\(changedPixels, 'stroke'\)/
  );
  assert.match(drawCanvasSource, /this\.requestPaint\(changedPixels, 'fill'\)/);
  assert.doesNotMatch(drawCanvasSource, /newlyPaintedPixels/);
  assert.match(drawCanvasSource, /if \(this\.mode === 'erase'\)/);
  assert.doesNotMatch(drawSource, /paintReservoir[\s\S]{0,80}supplyHistory/);
});

test('fresh timed attempts refill paint and empty paint only disables painting', () => {
  assert.match(
    drawSource,
    /resetExpiredDrawingRound\(\)[\s\S]*this\.resetPaintReservoir\(\);[\s\S]*this\.canvas\.reset\(\)/
  );
  assert.match(drawSource, /editable && hasPaint/);
  assert.match(drawSource, /private selectEraser\(\): void/);
  assert.match(drawSource, /private undoDrawing\(\): void/);
});

test('Bag keeps Draw resources on their owning screen', () => {
  assert.doesNotMatch(gallerySource, /renderDrawChargeInventory/);
  assert.doesNotMatch(gallerySource, /DRAW CHARGES|PAINT BUCKET/);
});

test('privacy deletion removes persisted Paint Bucket progression', () => {
  assert.match(privacySource, /getPaintBucketKey\(userId\)/);
});

test('local browser fixtures expose the same Paint Bucket contract', () => {
  assert.match(mockSource, /paintBucket: \{ level: 1, capacity: 350_000 \}/);
});
