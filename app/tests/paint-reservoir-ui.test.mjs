import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) =>
  readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');

const [
  drawSource,
  drawCanvasSource,
  gallerySource,
  collectionSource,
  privacySource,
  mockSource,
] = await Promise.all([
    readSource('client/scenes/Draw.ts'),
    readSource('client/lib/drawcanvas.ts'),
    readSource('client/scenes/Gallery.ts'),
    readSource('client/lib/collectionbook.ts'),
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
  assert.match(drawSource, /requestPaint: \(amount, kind, replacedColor\) =>/);
  assert.match(drawSource, /this\.automationMode \|\| this\.requestPaint/);
});

test('one empty base color does not disable other colors or premium paint', () => {
  assert.match(
    drawSource,
    /return this\.paintReservoirs\[this\.selectedColorIndex\] \?\? null/
  );
  assert.match(
    drawSource,
    /if \(colorIndex < 0 \|\| !reservoir\) \{[\s\S]{0,100}this\.returnReplacedPaint\(amount, replacedColor\);[\s\S]{0,40}return true;/
  );
  assert.match(drawSource, /const hasPaint = this\.hasActivePaint\(\)/);
});

test('paint accounting counts changed pixels and undo restores the matching wells', () => {
  assert.match(drawCanvasSource, /let changedPixels = 0/);
  assert.match(
    drawCanvasSource,
    /before\.data\[offset\] !== after\.data\[offset\]/
  );
  assert.match(
    drawCanvasSource,
    /this\.requestPaint\(changedPixels, 'stroke'\)/
  );
  assert.match(
    drawCanvasSource,
    /this\.requestPaint\([\s\S]{0,120}changedPixels,[\s\S]{0,60}'fill',[\s\S]{0,100}replacedColor/
  );
  assert.match(drawSource, /private returnReplacedPaint\(/);
  assert.match(drawSource, /returnPaint\(reservoir, amount\)/);
  assert.doesNotMatch(drawCanvasSource, /newlyPaintedPixels/);
  assert.match(drawCanvasSource, /if \(this\.mode === 'erase'\)/);
  assert.match(drawCanvasSource, /onEditStart\?: \(\) => void/);
  assert.match(drawCanvasSource, /onEditCancel\?: \(\) => void/);
  assert.match(
    drawSource,
    /type DrawingEditState = Readonly<[\s\S]*paintReservoirs: readonly PaintReservoir\[\]/
  );
  assert.match(drawSource, /private beginDrawingEdit\(\): void/);
  assert.match(drawSource, /private cancelDrawingEdit\(\): void/);
  assert.match(drawSource, /private commitDrawingEdit\(\): void/);
  assert.match(
    drawSource,
    /this\.editRedoHistory\.push\(this\.currentDrawingEditState\(\)\)/
  );
  assert.match(drawSource, /this\.restoreDrawingEditState\(previous\)/);
  assert.match(drawSource, /this\.restoreDrawingEditState\(next\)/);
  assert.match(drawSource, /this\.renderPalettePaintLevels\(false\)/);
  assert.doesNotMatch(drawSource, /supplyHistory|supplyRedoHistory/);
});

test('fresh timed attempts refill paint and empty paint only disables painting', () => {
  assert.match(
    drawSource,
    /resetExpiredDrawingRound\(\)[\s\S]*this\.resetPaintReservoir\(\);[\s\S]*this\.canvas\.reset\(\)/
  );
  assert.match(drawSource, /editable && hasPaint/);
  assert.match(drawSource, /private selectEraser\(\): void/);
  assert.match(drawSource, /private selectDrawTool\(\): void/);
  assert.match(drawSource, /private undoDrawing\(\): void/);
});

test('Bag keeps Draw resources on their owning screen', () => {
  assert.doesNotMatch(gallerySource, /renderDrawChargeInventory/);
  assert.doesNotMatch(gallerySource, /DRAW CHARGES/);
  assert.match(gallerySource, /refillDrawingInkUse/);
  assert.match(collectionSource, /ADD 1 USE/);
  assert.match(collectionSource, /TAP COLOR FOR USES/);
  assert.doesNotMatch(collectionSource, /PAINT SUPPLY · LV/);
});

test('privacy deletion removes persisted Paint Bucket progression', () => {
  assert.match(privacySource, /getPaintBucketKey\(userId\)/);
});

test('local browser fixtures expose the same Paint Bucket contract', () => {
  assert.match(mockSource, /getPaintBucketState,/);
  assert.match(
    mockSource,
    /paintBucket: getPaintBucketState\(economy\.paintBucketLevel\)/
  );
  assert.match(mockSource, /\/api\/drawing-ink\/refill/);
});
