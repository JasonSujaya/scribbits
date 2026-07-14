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
const drawCanvasSource = await readFile(
  new URL('../src/client/lib/drawcanvas.ts', import.meta.url),
  'utf8'
);

test('Draw keeps the everyday rail compact and puts optional tools one tap away', () => {
  assert.match(drawSource, /const panelH = 300/);
  assert.match(drawSource, /this\.captureToolPage\('basic'/);
  assert.match(drawSource, /this\.captureToolPage\('advanced'/);
  assert.match(drawSource, /'More drawing tools'/);
  assert.match(drawSource, /'Back to basic drawing tools'/);
  assert.match(drawSource, /private buildDrawingSettingsControl\(\): void/);
  assert.match(
    drawSource,
    /this\.moreToolsButton = this\.toolIconButton\(\s*196,\s*50,\s*'tools'/
  );
  assert.match(
    drawSource,
    /\(\) => this\.setAdvancedToolsOpen\(!this\.advancedToolsOpen\),\s*84,\s*96/
  );
  assert.doesNotMatch(
    drawSource,
    /this\.moreToolsButton = this\.toolIconButton\(\s*640,\s*toolY/
  );
  assert.match(drawSource, /Math\.min\(46, width \* 0\.55\)/);
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
  assert.match(drawSource, /private buildLiveStatsStrip\(centerY: number\)/);
  assert.match(drawSource, /private getPersistentDrawingPrompt\(\): string/);
  assert.match(
    drawSource,
    /`DRAW: \$\{formatThemePrompt\(dare\.prompt\)\.toUpperCase\(\)\}`/
  );
  assert.match(drawSource, /FREE DRAW • DRAW ANYTHING/);
  assert.match(drawSource, /private buildFighterStyleControls/);
  assert.match(drawSource, /private selectFighterStyle\(role: CombatRole\)/);
  assert.match(drawSource, /const content = getCombatRoleContent\(role\)/);
  assert.match(drawSource, /content\.icon/);
  assert.match(drawSource, /ROLE_STYLES\[role\]/);
  assert.match(drawSource, /role: 'radiogroup'/);
  assert.match(drawSource, /setAttribute\('aria-checked'/);
  assert.match(drawSource, /CHOOSE FIGHTER STYLE/);
  assert.match(drawSource, /COLOR PICKS THE POWER · DRAW FREELY/);
  assert.match(drawSource, /Coral is Brawler/);
  assert.match(drawSource, /blue is Longshot/);
  assert.match(drawSource, /green is Gunner/);
  assert.match(drawSource, /purple is Mage/);
  assert.match(drawSource, /PEN COLORS ARE FOR YOUR ART/);
  assert.match(drawSource, /fighterStyle: draft\.fighterStyle/);
  assert.doesNotMatch(drawSource, /STYLE FORMING…/);
  assert.doesNotMatch(drawSource, /Your drawing decides it/i);
  assert.doesNotMatch(drawSource, /Big filled shapes make Brawler/);
  assert.doesNotMatch(drawSource, /Sharp jagged edges make Longshot/);
  assert.match(
    drawSource,
    /private openRoleStyleInfo[\s\S]*this\.overlay\.setVisible\(false\)/
  );
  assert.match(
    drawSource,
    /if \(this\.scene\.isActive\(\)\) this\.overlay\.setVisible\(true\)/
  );
  assert.doesNotMatch(drawSource, /DRAW A LITTLE MORE TO REVEAL YOUR ROLE/);
  assert.doesNotMatch(drawSource, /BECOMING A/);
  assert.match(drawSource, /private fitLivePromptLabel\(\): void/);
  assert.doesNotMatch(drawSource, /liveStatCards/);
  assert.doesNotMatch(drawSource, /drawLiveStatCard/);
});

test('Draw always offers a clear route back to Home', () => {
  const chromeSource = drawSource.slice(
    drawSource.indexOf('private buildChrome()'),
    drawSource.indexOf('private isUntimedDrawingMode()')
  );
  assert.match(chromeSource, /ghostButton\(this, 72, 54, '‹'/);
  assert.match(chromeSource, /'Back to Home'/);
  assert.doesNotMatch(chromeSource, /if \(!this\.isFirstScribbit\)/);
  assert.match(
    drawSource,
    /closeButton\.addEventListener\('click', \(\) => this\.exitDraw\(\)\)/
  );
  assert.doesNotMatch(drawSource, /private closeDrawStartPopup/);
});

test('Draw offers a quiet visual-only dark canvas preview', () => {
  assert.match(
    drawSource,
    /private buildCanvasContrastToggle\(square: number\)/
  );
  assert.match(
    drawSource,
    /Use \$\{nextMode === 'dark' \? 'dark' : 'light'\} canvas preview/
  );
  assert.match(drawSource, /this\.canvas\.setPreviewMode\(/);
  assert.match(drawSource, /saveDarkCanvasPreview\(this\.darkCanvasPreview\)/);
  assert.match(drawSource, /button\.setAttribute\('aria-pressed'/);
  assert.match(
    drawSource,
    /button\.textContent = this\.darkCanvasPreview \? '☀' : '☾'/
  );
  assert.match(drawSource, /x: canvasLeft \+ square \+ 2/);
  assert.match(
    drawCanvasSource,
    /export type CanvasPreviewMode = 'paper' \| 'dark'/
  );
  assert.match(drawCanvasSource, /this\.element\.style\.backgroundColor =/);
  assert.match(drawCanvasSource, /this\.element\.dataset\.previewMode = mode/);
  assert.doesNotMatch(
    drawCanvasSource,
    /setPreviewMode[\s\S]{0,300}(?:fillRect|clearRect|getImageData|drawImage)/
  );
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
  assert.match(drawSource, /FINDING A RIVAL…/);
  assert.match(drawSource, /FIRST FIGHT PAUSED/);
  assert.doesNotMatch(
    drawSource,
    /showToast\(`\$\{scribbit\.name\} meets a first rival…`\)/
  );
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
