import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT ?? process.cwd();
const mockSource = readFileSync(
  join(appRoot, 'scripts', 'dev-mock.mjs'),
  'utf8'
);
const commandSource = readFileSync(
  join(appRoot, '..', 'mock.command'),
  'utf8'
);

test('the live local app starts without invented characters', () => {
  assert.match(
    mockSource,
    /champion: useContractFixtures \? champion : null/
  );
  assert.match(
    mockSource,
    /todayEntrants: useContractFixtures \? \[\.\.\.todayEntrants\] : \[\]/
  );
  assert.match(
    mockSource,
    /legends: useContractFixtures \? \[\.\.\.legends\] : \[\]/
  );
  assert.doesNotMatch(commandSource, /make-test-drawing\.mjs/);
});

test('the drawing endpoint serves only a submitted canvas drawing', () => {
  const drawingBytesSource = mockSource.slice(
    mockSource.indexOf('const drawingBytesFor'),
    mockSource.indexOf('const mutateVisibleScribbit')
  );

  assert.match(drawingBytesSource, /submittedDrawingBytes\.get\(scribbitId\)/);
  assert.match(drawingBytesSource, /submittedDrawing \?\? transparentPng/);
  assert.doesNotMatch(drawingBytesSource, /readFileSync|mockAssetRoot/);
});
