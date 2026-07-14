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
  assert.match(drawSource, /const columns = 5/);
  assert.match(drawSource, /'#ffffff'/);
  assert.match(drawSource, /'white'/);
  assert.match(drawSource, /const rowLeft =/);
  assert.match(drawSource, /const rowHeight = MIN_TOUCH/);
  assert.match(drawSource, /private refreshAdvancedToolIndicator\(\): void/);
  assert.match(
    drawSource,
    /requestAnimationFrame\(\(\) => focusTarget\?\.focus/
  );
  assert.match(drawSource, /'bucket'/);
  assert.match(drawSource, /private selectFill\(\): void/);
  assert.match(
    drawSource,
    /Fill a line-bounded area with the selected ink color/
  );
  assert.match(paperIconSource, /\| 'bucket'/);
  assert.match(paperIconSource, /if \(key === 'bucket'\)/);
  assert.match(drawSource, /private liveStatCardLayout\(/);
  assert.match(
    drawSource,
    /paperStatIcon\(this, statName, x - 39, centerY - 3, 44, UI\.creamHex\)/
  );
  assert.match(drawSource, /style\.label,\s+18,/);
  assert.match(drawSource, /card\.fillStyle\(color, active \? 1 : 0\.84\)/);
  assert.match(drawSource, /without adding another white panel/);
});

test('Draw sends the newborn straight into one guarded random first fight', () => {
  assert.match(paperIconSource, /\| 'tools'/);
  assert.match(paperIconSource, /if \(key === 'tools'\)/);
  assert.match(drawSource, /ENTERED TONIGHT’S RUMBLE/);
  assert.match(drawSource, /START FIRST FIGHT/);
  assert.match(drawSource, /'sword',[\s\S]{0,80}actionLabel/);
  assert.match(
    drawSource,
    /private async startFirstBattle\(scribbit: Scribbit\)/
  );
  assert.match(drawSource, /await spar\(scribbit\.id\)/);
  assert.match(
    drawSource,
    /stageDirectBattle\([\s\S]{0,180}scribbit\.id,[\s\S]{0,60}'ScribbitHome',[\s\S]{0,40}'birth'/
  );
  assert.match(drawSource, /if \(!stagedBattle\)/);
  assert.match(drawSource, /skipArenaReceiptsOnce\(this\)/);
  assert.doesNotMatch(drawSource, /openRivalRun/);
  assert.doesNotMatch(drawSource, /CHOOSE FIRST RIVAL/);
  assert.doesNotMatch(drawSource, /safe in tonight’s Rumble/);
  assert.match(
    drawSource,
    /!this\.drawingLocked && this\.playerDrawMode === 'community'/
  );
});
