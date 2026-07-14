import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);

test('Draw starts with a balanced mobile pen and complete two-row palette', () => {
  assert.match(drawSource, /const DEFAULT_LINE_WIDTH = MIN_LINE_WIDTH/);
  assert.match(drawSource, /const LINE_WIDTH_STEP = 4/);
  assert.match(drawSource, /this\.setLineWidth\(DEFAULT_LINE_WIDTH\)/);
  assert.match(drawSource, /'#ff7fb0'/);
  assert.match(drawSource, /'pink'/);
  assert.match(drawSource, /const columns = 5/);
});
