import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);

test('Undo and Redo stay together on the main drawing toolbar', () => {
  const basicToolbarSource = drawSource.slice(
    drawSource.indexOf("this.captureToolPage('basic'"),
    drawSource.indexOf('const advancedX')
  );
  const advancedToolbarSource = drawSource.slice(
    drawSource.indexOf("this.captureToolPage('advanced'"),
    drawSource.indexOf('this.setAdvancedToolsOpen(false)')
  );

  assert.match(basicToolbarSource, /this\.undoToolButton = this\.toolIconButton/);
  assert.match(basicToolbarSource, /this\.redoToolButton = this\.toolIconButton/);
  assert.match(
    basicToolbarSource,
    /this\.undoToolButton[\s\S]*this\.redoToolButton[\s\S]*this\.moreToolsButton/
  );
  assert.match(drawSource, /'Undo last stroke'/);
  assert.match(drawSource, /'Redo last stroke'/);
  assert.doesNotMatch(advancedToolbarSource, /this\.redoToolButton/);
});
