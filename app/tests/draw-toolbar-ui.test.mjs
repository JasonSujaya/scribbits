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
const leaveDrawingModalSource = await readFile(
  new URL('../src/client/lib/leavedrawingmodal.ts', import.meta.url),
  'utf8'
);
const fighterStyleInfoModalSource = await readFile(
  new URL('../src/client/lib/role/styleinfomodal.ts', import.meta.url),
  'utf8'
);
const drawStartOverlaySource = await readFile(
  new URL('../src/client/lib/drawstartoverlay.ts', import.meta.url),
  'utf8'
);

test('Draw keeps the everyday rail compact and puts optional tools one tap away', () => {
  assert.match(drawSource, /const panelH = 300/);
  assert.match(drawSource, /this\.captureToolPage\('basic'/);
  assert.match(drawSource, /this\.captureToolPage\('advanced'/);
  assert.match(drawSource, /'Open pens and brushes'/);
  assert.match(drawSource, /'Back to basic drawing tools'/);
  assert.match(drawSource, /this\.moreToolsText = label\(this, 18, 0, 'TOOLS'/);
  assert.match(drawSource, /this\.advancedToolsOpen \? 'BASIC' : 'TOOLS'/);
  assert.doesNotMatch(drawSource, /moreToolsLabel/);
  assert.doesNotMatch(drawSource, /'BACK TO TOOLS'/);
  assert.match(drawSource, /private buildDrawingSettingsControl\(\): void/);
  assert.match(
    drawSource,
    /const x = 170;[\s\S]*const y = 50;[\s\S]*const width = 96;[\s\S]*const height = 58;/
  );
  assert.match(drawSource, /paperToolIcon\(this, 'tools', -22, 0, 28\)/);
  assert.doesNotMatch(
    drawSource,
    /this\.moreToolsButton = this\.toolIconButton\(\s*640,\s*toolY/
  );
  assert.match(drawSource, /\{ maxWidth: 280, maxHeight: 76 \}/);
  assert.match(drawSource, /fillRoundedRect\(-48, -29, 96, 58, 24\)/);
  assert.match(drawSource, /Math\.min\(46, width \* 0\.55\)/);
  assert.doesNotMatch(drawSource, /private addToolModeLabel/);
  assert.match(drawSource, /background\.setFillStyle\(UI\.creamHex, 1\)/);
  assert.match(drawSource, /selected \? 5 : 2/);
  assert.match(drawSource, /\.rectangle\(\s*0,\s*24,\s*22,\s*8,/);
  assert.match(drawSource, /private syncToolPageVisibility\(\): void/);
  assert.match(
    drawSource,
    /const inputEnabled = this\.isDrawingInputActive\(\)/
  );
  assert.match(drawSource, /String\(!visible \|\| !inputEnabled\)/);
  assert.match(drawSource, /const columns = PALETTE_GROUPS\.length/);
  assert.match(drawSource, /'#ffffff'/);
  assert.match(drawSource, /'white'/);
  assert.match(drawSource, /const PALETTE_COLOR_POSITIONS/);
  assert.match(drawSource, /xOffset: -36/);
  assert.match(drawSource, /xOffset: 36/);
  assert.match(drawSource, /const rowHeight = MIN_TOUCH/);
  assert.match(drawSource, /private refreshAdvancedToolIndicator\(\): void/);
  assert.match(
    drawSource,
    /requestAnimationFrame\(\(\) => focusTarget\?\.focus/
  );
  assert.match(drawSource, /'bucket'/);
  assert.match(drawSource, /'pencil'/);
  assert.match(drawSource, /private selectDrawTool\(\): void/);
  assert.match(drawSource, /this\.canvas\?\.setDrawMode\(\)/);
  assert.match(drawCanvasSource, /setDrawMode\(\): void/);
  assert.match(drawCanvasSource, /isDrawing\(\): boolean/);
  assert.match(paperIconSource, /\| 'pencil'/);
  assert.match(paperIconSource, /if \(key === 'pencil'\)/);
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
    /return formatThemePrompt\(dare\.prompt\)\.toUpperCase\(\)/
  );
  assert.doesNotMatch(drawSource, /`DRAW: \$\{/);
  assert.match(drawSource, /FREE DRAW • DRAW ANYTHING/);
  assert.match(drawSource, /private buildDetectedFighterStyleIndicator/);
  assert.match(drawSource, /private refreshDetectedFighterStyleIndicator/);
  assert.match(drawSource, /private setDetectedFighterStyleIndicator/);
  assert.match(
    drawSource,
    /private detectedFighterStyle: CurrentCombatRole \| null = null/
  );
  assert.match(drawSource, /this\.detectedFighterStyle = null/);
  assert.match(
    drawSource,
    /this\.setDetectedFighterStyleIndicator\(\s*'DRAW TO SET'/
  );
  assert.match(drawSource, /const roleIconGap = 10/);
  assert.match(
    drawSource,
    /roleRight -\s*this\.liveRoleLabel\.width -\s*roleIconGap -\s*roleIconSize \/ 2/
  );
  assert.doesNotMatch(drawSource, /roleRight - 112/);
  assert.match(
    drawSource,
    /result\.inkedPixels > 0 \? result\.fighterStyle : null/
  );
  assert.doesNotMatch(
    drawSource,
    /this\.detectedFighterStyle =\s*fighterStyleForPaletteColor/
  );
  assert.match(drawSource, /const roleRight = this\.scale\.width - EDGE - 50/);
  assert.doesNotMatch(drawSource, /liveRoleBackground/);
  assert.doesNotMatch(drawSource, /SELECTED COLOR PREVIEW/);
  assert.doesNotMatch(drawSource, /MOST-USED COLOR SETS ROLE/);
  assert.match(drawSource, /const PALETTE_GROUPS/);
  assert.match(drawSource, /\{ label: 'NEUTRAL', role: null \}/);
  assert.match(drawSource, /\{ label: 'BRAWLER', role: 'brawler' \}/);
  assert.match(drawSource, /\{ label: 'LONGSHOT', role: 'longshot' \}/);
  assert.match(drawSource, /\{ label: 'MAGE', role: 'mage' \}/);
  assert.match(drawSource, /const groupIconY = y - 70/);
  assert.match(drawSource, /const groupLabelY = y - 44/);
  assert.match(drawSource, /const groupCardTop = y - rowHeight \+ 10/);
  assert.match(drawSource, /const groupCardHeight = 206/);
  assert.match(drawSource, /const panelInset = 14/);
  assert.match(
    drawSource,
    /const paletteY = panelTop \+ panelInset \+ MIN_TOUCH - 10/
  );
  assert.match(
    drawSource,
    /panelTop \+ panelH - panelInset - roundControlWidth \/ 2/
  );
  assert.doesNotMatch(drawSource, /const paletteY = centerY - 60/);
  assert.match(drawSource, /private static readonly TOOLS_Y = 996/);
  assert.doesNotMatch(drawSource, /rowHeight \* 2 \+ 12/);
  assert.match(drawSource, /paperIcon\(this, groupIcon, x, groupIconY/);
  assert.match(drawSource, /x,\s*groupLabelY,\s*group\.label,\s*14/);
  assert.doesNotMatch(drawSource, /PALETTE_ROLE_BADGE/);
  assert.match(drawSource, /fighterStyleForPaletteColor/);
  assert.match(drawSource, /getCombatRoleContent\(group\.role\)\.icon/);
  assert.match(drawSource, /counts toward/);
  assert.doesNotMatch(drawSource, /role: 'radiogroup'/);
  assert.doesNotMatch(drawSource, /setAttribute\('aria-checked'/);
  assert.match(fighterStyleInfoModalSource, /COLOR DECIDES YOUR ROLE/);
  assert.match(fighterStyleInfoModalSource, /THE BIGGEST COLOR AREA WINS/);
  assert.match(
    fighterStyleInfoModalSource,
    /Brown, coral, and orange make Brawler/
  );
  assert.match(
    fighterStyleInfoModalSource,
    /Gold, green, and blue make Longshot/
  );
  assert.match(fighterStyleInfoModalSource, /Aqua, purple, and pink make Mage/);
  assert.match(fighterStyleInfoModalSource, /Brawler beats Mage/);
  assert.match(fighterStyleInfoModalSource, /Mage beats Longshot/);
  assert.match(fighterStyleInfoModalSource, /Longshot beats Brawler/);
  assert.match(
    fighterStyleInfoModalSource,
    /BLACK \+ GREY \+ WHITE ARE NEUTRAL/
  );
  assert.match(fighterStyleInfoModalSource, /A TIE PICKS ONE AT RANDOM/);
  assert.match(
    fighterStyleInfoModalSource,
    /Equal color groups are randomized/
  );
  assert.doesNotMatch(
    fighterStyleInfoModalSource,
    /NEUTRAL-ONLY ART BECOMES BRAWLER/
  );
  assert.doesNotMatch(drawSource, /fighterStyle: draft\.fighterStyle/);
  assert.doesNotMatch(drawSource, /STYLE FORMING…/);
  assert.doesNotMatch(drawSource, /Your drawing decides it/i);
  assert.doesNotMatch(drawSource, /Big filled shapes make Brawler/);
  assert.doesNotMatch(drawSource, /Sharp jagged edges make Longshot/);
  assert.match(
    drawSource,
    /private showFighterStyleInfoModal[\s\S]*this\.overlay\.setVisible\(false\)/
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
    drawStartOverlaySource,
    /closeButton\.addEventListener\('click', options\.onClose\)/
  );
  assert.match(drawSource, /onClose: \(\) => this\.exitDraw\(\)/);
  assert.doesNotMatch(drawSource, /private closeDrawStartPopup/);
});

test('Draw asks before discarding any drawing and leaves an empty canvas directly', () => {
  const exitSource = drawSource.slice(
    drawSource.indexOf('private exitDraw()'),
    drawSource.indexOf('// --- Layout budget')
  );
  assert.match(
    exitSource,
    /this\.submitting \|\| this\.drawConfirmation \|\| this\.leaveDrawingModal/
  );
  assert.match(exitSource, /this\.refreshPreview\(\)/);
  assert.match(exitSource, /this\.lastResult\?\.inkedPixels/);
  assert.doesNotMatch(exitSource, /hasMinimumDrawingInk/);
  assert.doesNotMatch(exitSource, /this\.continueFromDrawing\(\)/);
  assert.match(exitSource, /this\.showLeaveDrawingModal\(\)/);
  assert.match(leaveDrawingModalSource, /'LEAVE YOUR DOODLE\?'/);
  assert.match(leaveDrawingModalSource, /"IT WON'T BE SAVED"/);
  assert.match(
    exitSource,
    /this\.createSubmissionDraft\(currentResult\)\.imageDataUrl/
  );
  assert.match(leaveDrawingModalSource, /fitDrawing\(/);
  assert.match(leaveDrawingModalSource, /previewTextureLoaded/);
  assert.match(leaveDrawingModalSource, /'CONTINUE DRAWING'/);
  assert.match(leaveDrawingModalSource, /'DISCARD DRAWING'/);
  assert.match(leaveDrawingModalSource, /'trash'/);
  assert.match(exitSource, /this\.discardDrawingAndExit\(\)/);
  assert.match(exitSource, /this\.pauseDrawingRound\(\)/);
  assert.match(exitSource, /this\.startDrawingRound\(\)/);
  assert.match(exitSource, /if \(!modal\) return/);
});

test('Draw offers a quiet visual-only dark canvas preview', () => {
  assert.match(
    drawSource,
    /private buildCanvasContrastControl\(\s*x: number,\s*y: number,\s*width: number,\s*interactionWidth: number\s*\)/
  );
  const advancedToolbarSource = drawSource.slice(
    drawSource.indexOf("this.captureToolPage('advanced'"),
    drawSource.indexOf('this.setAdvancedToolsOpen(false)')
  );
  assert.match(advancedToolbarSource, /this\.buildCanvasContrastControl\(/);
  assert.match(advancedToolbarSource, /advancedX\[nextAction\] \?\? 480/);
  assert.match(drawSource, /'contrast'/);
  assert.match(drawSource, /'CANVAS'/);
  assert.match(drawSource, /`Use \$\{nextMode\} canvas preview`/);
  assert.match(drawSource, /this\.canvas\.setPreviewMode\(/);
  assert.match(drawSource, /this\.darkCanvasPreview = false/);
  assert.doesNotMatch(drawSource, /DRAW_CANVAS_PREVIEW_STORAGE_KEY/);
  assert.doesNotMatch(drawSource, /saveDarkCanvasPreview/);
  assert.match(drawSource, /control === this\.contrastToolControl/);
  assert.doesNotMatch(drawSource, /canvasLeft \+ square \+ 2/);
  assert.match(paperIconSource, /\| 'contrast'/);
  assert.match(paperIconSource, /if \(key === 'contrast'\)/);
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

test('Draw sends the newborn straight into one guarded simple first fight', () => {
  assert.match(paperIconSource, /\| 'tools'/);
  assert.match(paperIconSource, /if \(key === 'tools'\)/);
  assert.match(drawSource, /ENTERED TONIGHT’S RUMBLE/);
  assert.match(drawSource, /START FIRST FIGHT/);
  assert.match(drawSource, /'sword',[\s\S]{0,80}actionLabel/);
  assert.match(
    drawSource,
    /setIconButtonLabel\(this\.firstFightButton, 'START FIRST FIGHT'\)/
  );
  assert.doesNotMatch(drawSource, /firstFightButtonLabel/);
  assert.match(
    drawSource,
    /private async startFirstBattle\(scribbit: Scribbit\)/
  );
  assert.match(
    drawSource,
    /const isPlayersFirstBattle = getArena\(this\)\?\.hasCompletedBattle === false/
  );
  assert.match(
    drawSource,
    /await spar\([\s\S]{0,100}scribbit\.id[\s\S]{0,100}isPlayersFirstBattle[\s\S]{0,20}\)/
  );
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
