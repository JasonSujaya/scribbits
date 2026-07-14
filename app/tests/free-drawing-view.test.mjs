import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const drawEligibilitySource = await readFile(
  new URL('../src/client/lib/draweligibility.ts', import.meta.url),
  'utf8'
);
const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const modalSource = await readFile(
  new URL('../src/client/lib/drawconfirmationmodal.ts', import.meta.url),
  'utf8'
);
const arenaRouteSource = await readFile(
  new URL('../src/server/routes/api.ts', import.meta.url),
  'utf8'
);

test('daily Draw routing distinguishes a saved Free Draw, an authoritative lock, and an open day', () => {
  assert.match(
    drawEligibilitySource,
    /if \(getTodayFreeDrawing\(state\)\) return 'draw';/
  );
  assert.match(
    drawEligibilitySource,
    /if \(getDrawEligibility\(state\)\.canDraw\) return 'draw';/
  );
  assert.match(drawEligibilitySource, /state\.drawCharges\.available <= 0/);
  assert.doesNotMatch(drawEligibilitySource, /return 'practice'/);
});

test('Arena keeps the lock authoritative while exposing only a verified current-day drawing', () => {
  assert.match(arenaRouteSource, /loadFreeDrawingForDay\(/);
  assert.match(
    arenaRouteSource,
    /dailyFlags\.drawnToday \|\| freeDrawingLocked \|\| todayFreeDrawing !== null/
  );
  assert.match(arenaRouteSource, /todayFreeDrawing,/);
});

test('Draw renders the minimal saved viewer and transitions into it immediately after save', () => {
  assert.match(
    drawSource,
    /private buildFreeDrawingViewer\(drawing: FreeDrawing\)/
  );
  assert.match(drawSource, /translate\('freeDraw\.savedToday'\)/);
  assert.match(drawSource, /translate\('freeDraw\.practice'\)/);
  assert.match(drawSource, /'aria-label': `Saved today: \$\{drawing\.name\}`/);
  assert.match(drawSource, /'Practice with a temporary fighter'/);
  assert.match(drawSource, /mergeTodayFreeDrawing\(arena, response\.data\)/);
  assert.match(
    drawSource,
    /setArena\(this, nextArena\);[\s\S]{0,80}restartIntoFreeDrawingViewer\(\)/
  );
});

test('Free Draw confirmation saves a drawing instead of bringing a Scribbit to life', () => {
  assert.match(drawSource, /mode: 'free-draw' as const/);
  assert.match(modalSource, /isFreeDraw \? 'SAVE DRAWING' : 'BRING TO LIFE'/);
  assert.match(
    modalSource,
    /isFreeDraw[\s\S]*'Save Free Draw'[\s\S]*'Bring Scribbit to life'/
  );
  assert.match(
    arenaRouteSource,
    /getAliveScribbitsForUser\(redis, player\.userId\)\)\.length === 0/
  );
  assert.match(
    arenaRouteSource,
    /Draw your first Scribbit before using Free Draw\./
  );
});

test('Free Draw reply-loss reconciliation requires the saved drawing snapshot', () => {
  const submitFreeSource = drawSource.slice(
    drawSource.indexOf('private async submitFree('),
    drawSource.indexOf('private async submitPractice(')
  );
  assert.match(
    submitFreeSource,
    /getTodayFreeDrawing\(reconciledArena \?\? undefined\)/
  );
  assert.doesNotMatch(submitFreeSource, /reconciledArena\?\.drawnToday/);
});
