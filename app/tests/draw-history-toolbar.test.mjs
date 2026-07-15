import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);

test('Draw modes and history fit together on the responsive main toolbar', () => {
  const basicToolbarSource = drawSource.slice(
    drawSource.indexOf("this.captureToolPage('basic'"),
    drawSource.indexOf('const advancedX')
  );
  const advancedToolbarSource = drawSource.slice(
    drawSource.indexOf("this.captureToolPage('advanced'"),
    drawSource.indexOf('this.setAdvancedToolsOpen(false)')
  );

  assert.match(
    basicToolbarSource,
    /this\.drawToolButton = this\.toolIconButton/
  );
  assert.match(basicToolbarSource, /'pencil'/);
  assert.match(basicToolbarSource, /'Draw with the selected pen and brush'/);
  assert.doesNotMatch(basicToolbarSource, /addToolModeLabel/);
  assert.doesNotMatch(drawSource, /private addToolModeLabel/);
  assert.match(basicToolbarSource, /\.rectangle\(\s*0,\s*24,\s*22,\s*8,/);
  assert.doesNotMatch(basicToolbarSource, /\.circle\(\s*2[35],\s*-2[34],/);
  assert.match(
    basicToolbarSource,
    /this\.undoToolButton = this\.toolIconButton/
  );
  assert.match(
    basicToolbarSource,
    /this\.redoToolButton = this\.toolIconButton/
  );
  assert.match(
    basicToolbarSource,
    /this\.undoToolButton[\s\S]*this\.redoToolButton/
  );
  assert.match(drawSource, /const toolSlotWidth =/);
  assert.match(drawSource, /const toolX = \(index: number\): number/);
  assert.match(basicToolbarSource, /toolX\(3\)/);
  assert.match(basicToolbarSource, /toolX\(4\)/);
  assert.doesNotMatch(basicToolbarSource, /\n\s*510,|\n\s*620,/);
  assert.doesNotMatch(basicToolbarSource, /this\.moreToolsButton/);
  assert.match(drawSource, /private buildDrawingSettingsControl\(\): void/);
  assert.match(drawSource, /'Undo last stroke'/);
  assert.match(drawSource, /'Redo last stroke'/);
  assert.doesNotMatch(advancedToolbarSource, /this\.redoToolButton/);
});
