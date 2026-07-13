import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const paperIconSource = await readFile(
  new URL('../src/client/lib/papericons.ts', import.meta.url),
  'utf8'
);

test('Draw keeps the everyday rail compact and puts optional tools one tap away', () => {
  assert.match(drawSource, /const panelH = 300/);
  assert.match(drawSource, /this\.captureToolPage\('basic'/);
  assert.match(drawSource, /this\.captureToolPage\('advanced'/);
  assert.match(drawSource, /'More drawing tools'/);
  assert.match(drawSource, /'Back to basic drawing tools'/);
  assert.match(drawSource, /private syncToolPageVisibility\(\): void/);
  assert.match(
    drawSource,
    /const inputEnabled = this\.isDrawingInputActive\(\)/
  );
  assert.match(drawSource, /String\(!visible \|\| !inputEnabled\)/);
  assert.match(drawSource, /const columns = 4/);
  assert.match(drawSource, /const rowHeight = MIN_TOUCH/);
  assert.match(drawSource, /private refreshAdvancedToolIndicator\(\): void/);
  assert.match(
    drawSource,
    /requestAnimationFrame\(\(\) => focusTarget\?\.focus/
  );
});

test('Draw uses a proper tools glyph and unambiguous first-session battle copy', () => {
  assert.match(paperIconSource, /\| 'tools'/);
  assert.match(paperIconSource, /if \(key === 'tools'\)/);
  assert.match(drawSource, /ENTERED TONIGHT’S RUMBLE/);
  assert.match(drawSource, /CHOOSE FIRST RIVAL/);
  assert.match(drawSource, /'sword',[\s\S]{0,80}actionLabel/);
  assert.match(drawSource, /private openFirstRivalRun\(scribbit: Scribbit\)/);
  assert.match(drawSource, /openRivalRun\(this/);
  assert.doesNotMatch(drawSource, /\bspar\(scribbit\.id\)/);
  assert.doesNotMatch(drawSource, /WATCH FIRST FIGHT/);
  assert.doesNotMatch(drawSource, /safe in tonight’s Rumble/);
  assert.match(drawSource, /'Continue to Arena'/);
  assert.match(
    drawSource,
    /if \(!this\.drawingLocked\) this\.startDrawingRound\(\)/
  );
});
