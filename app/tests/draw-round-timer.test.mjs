import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run Draw round-timer tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const drawRoundClock = require(
  join(compiledClientRoot, 'lib', 'drawroundclock.js')
);

test('the Draw round starts at 60 seconds and becomes urgent at 10', () => {
  const readyClock = drawRoundClock.createDrawRoundClock();
  assert.deepEqual(drawRoundClock.readDrawRoundClock(readyClock, 500), {
    started: false,
    running: false,
    remainingSeconds: 60,
    urgent: false,
    expired: false,
  });

  const runningClock = drawRoundClock.startDrawRoundClock(readyClock, 1_000);
  assert.equal(
    drawRoundClock.readDrawRoundClock(runningClock, 2_000).remainingSeconds,
    59
  );
  assert.equal(
    drawRoundClock.readDrawRoundClock(runningClock, 51_000).urgent,
    true
  );
  assert.deepEqual(drawRoundClock.readDrawRoundClock(runningClock, 61_000), {
    started: true,
    running: false,
    remainingSeconds: 0,
    urgent: false,
    expired: true,
  });
});

test('opening the naming preview pauses the drawing clock exactly', () => {
  const runningClock = drawRoundClock.startDrawRoundClock(
    drawRoundClock.createDrawRoundClock(),
    1_000
  );
  const pausedClock = drawRoundClock.pauseDrawRoundClock(runningClock, 16_000);
  assert.equal(
    drawRoundClock.readDrawRoundClock(pausedClock, 99_000).remainingSeconds,
    45
  );

  const resumedClock = drawRoundClock.startDrawRoundClock(pausedClock, 100_000);
  assert.equal(
    drawRoundClock.readDrawRoundClock(resumedClock, 144_001).remainingSeconds,
    1
  );
  assert.equal(
    drawRoundClock.readDrawRoundClock(resumedClock, 145_000).expired,
    true
  );
});

test('the final seconds shake faster and harder', () => {
  const warningMotion = drawRoundClock.getDrawRoundUrgencyMotion(10);
  const criticalMotion = drawRoundClock.getDrawRoundUrgencyMotion(1);

  assert.equal(drawRoundClock.getDrawRoundUrgencyMotion(11), null);
  assert.equal(drawRoundClock.getDrawRoundUrgencyMotion(0), null);
  assert.equal(warningMotion.intervalMilliseconds, 700);
  assert.equal(criticalMotion.intervalMilliseconds, 180);
  assert.ok(criticalMotion.angleDegrees > warningMotion.angleDegrees);
  assert.ok(criticalMotion.scale > warningMotion.scale);
});

test('official Draw requires an explicit start and locks at time', () => {
  const drawSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'scenes', 'Draw.ts'),
    'utf8'
  );
  const canvasSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'lib', 'drawcanvas.ts'),
    'utf8'
  );

  assert.match(
    drawSource,
    /return this\.practiceMode \|\| this\.automationMode;/
  );
  assert.match(drawSource, /private beginDrawingRound\(\): void/);
  assert.match(drawSource, /startButton\.textContent = 'START'/);
  assert.match(drawSource, /Start 60 second drawing round/);
  assert.match(
    drawSource,
    /style\.visibility = visible \? 'visible' : 'hidden'/
  );
  assert.match(drawSource, /private isWaitingToStart\(\): boolean/);
  assert.match(drawSource, /this\.canvas\?\.setEnabled\(inputEnabled\)/);
  assert.match(drawSource, /brightness\(0\.68\) saturate\(0\.58\)/);
  assert.doesNotMatch(
    drawSource,
    /if \(change === 'draw'\) this\.startDrawingRound\(\)/
  );
  assert.match(drawSource, /this\.setDrawingLocked\(true\)/);
  assert.match(drawSource, /Time! Name your Scribbit\./);
  assert.match(drawSource, /fresh 60-second round/);
  assert.match(drawSource, /fillRoundedRect\(-104, -40, 208, 80, 28\)/);
  assert.match(drawSource, /getDrawRoundUrgencyMotion\(remainingSeconds\)/);
  assert.match(canvasSource, /setEnabled\(enabled: boolean\)/);
  assert.match(
    canvasSource,
    /Reset cannot be undone back into the expired round/
  );
});
