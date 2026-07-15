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
  assert.match(drawSource, /'#b6a894'/);
  assert.match(drawSource, /'#8b5a2b'/);
  assert.match(drawSource, /'#ff5a3d'/);
  assert.match(drawSource, /'pink'/);
  assert.match(drawSource, /'grey'/);
  assert.match(drawSource, /'brown'/);
  assert.match(drawSource, /'coral'/);
  assert.match(drawSource, /const columns = PALETTE_GROUPS\.length/);
  assert.match(drawSource, /const PALETTE_COLOR_POSITIONS/);
  assert.doesNotMatch(drawSource, /SELECTED_SWATCH_RADIUS/);
  assert.match(drawSource, /swatch\.setRadius\(SWATCH_RADIUS\)/);
  assert.match(drawSource, /const swatchTouchWidth = 64/);
  assert.match(drawSource, /const swatchTouchHeight = 48/);

  const roleBlock = drawSource.match(
    /const PALETTE_COLOR_ROLES:[\s\S]*?= \[([\s\S]*?)\];/
  )?.[1];
  assert.ok(roleBlock);
  assert.equal((roleBlock.match(/null/g) ?? []).length, 3);
  for (const role of ['brawler', 'longshot', 'mage']) {
    assert.equal((roleBlock.match(new RegExp(`'${role}'`, 'g')) ?? []).length, 3);
  }
});
