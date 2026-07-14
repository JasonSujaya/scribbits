import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const paperIconsSource = await readFile(
  new URL('../src/client/lib/papericons.ts', import.meta.url),
  'utf8'
);

test('the Battles dock icon uses a filled boxing glove and cuff', () => {
  const battleGloveSource = paperIconsSource.slice(
    paperIconsSource.indexOf('function drawDockBattleGlove'),
    paperIconsSource.indexOf('export function elementPaperIcon')
  );

  assert.match(battleGloveSource, /fillPoints\(cuff, true\)/);
  assert.match(battleGloveSource, /fillPoints\(glove, true\)/);
  assert.match(battleGloveSource, /strokePoints\(thumbSeam, false\)/);
  assert.match(battleGloveSource, /lineBetween/);
  assert.doesNotMatch(paperIconsSource, /drawDockSword/);
});
