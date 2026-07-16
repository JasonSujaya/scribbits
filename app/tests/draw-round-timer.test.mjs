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
  const visualAssetsSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'lib', 'visualassets.ts'),
    'utf8'
  );
  const gameStyles = readFileSync(
    join(process.cwd(), 'src', 'client', 'game.css'),
    'utf8'
  );

  assert.match(
    drawSource,
    /this\.practiceMode \|\| this\.automationMode \|\| this\.playerDrawMode === 'free'/
  );
  assert.match(drawSource, /private beginDrawingRound\(\): void/);
  assert.match(drawSource, /private startDrawCountdown\(\): void/);
  assert.match(drawSource, /private finishDrawCountdown\(\): void/);
  assert.match(
    drawSource,
    /const DRAW_START_COUNTDOWN_STEPS = \['3', '2', '1', 'DRAW!'\] as const/
  );
  assert.match(
    drawSource,
    /private beginDrawingRound\(\): void[\s\S]{0,1200}this\.startDrawCountdown\(\)/
  );
  assert.match(
    drawSource,
    /private finishDrawCountdown\(\): void[\s\S]{0,600}this\.startDrawingRound\(\)/
  );
  assert.match(
    drawSource,
    /private startDrawingRound\(\): void[\s\S]{0,900}waitForDrawingSoundtrackReadiness\(\)[\s\S]{0,600}this\.activateDrawingRound\(false\)/
  );
  assert.match(
    drawSource,
    /private renderDrawCountdownStep[\s\S]{0,900}playSfx\(isDrawStep \? 'draw\.start' : 'draw\.countdown'\)[\s\S]{0,120}if \(prefersReducedMotion\(\)\) return/
  );
  assert.match(
    drawSource,
    /playSfx\(snapshot\.remainingSeconds <= 10 \? 'draw\.tick' : 'draw\.timer'\)/
  );
  assert.match(drawSource, /preloadSfx\('draw\.countdown'\)/);
  assert.match(drawSource, /preloadSfx\('draw\.timer'\)/);
  assert.match(drawSource, /preloadSfx\('draw\.tick'\)/);
  assert.match(drawSource, /startButton\.dataset\.sfxCue = 'none'/);
  assert.match(drawSource, /private beginFreeDrawing\(\): void/);
  assert.match(drawSource, /private async submitFree\(/);
  assert.match(drawSource, /submitFreeDrawing\(\{/);
  assert.match(
    drawSource,
    /DRAW_START_CARD_ART_URL,[\s\S]{0,80}preloadDrawVisualAssets/
  );
  assert.match(
    drawSource,
    /preload\(\): void \{[\s\S]{0,80}preloadDrawVisualAssets\(this\)/
  );
  assert.match(
    visualAssetsSource,
    /DRAW_START_CARD_TEXTURE[\s\S]{0,250}draw-start-challenge-card\.webp/
  );
  assert.match(
    visualAssetsSource,
    /preloadDrawVisualAssets[\s\S]{0,260}scene\.load\.image\([\s\S]{0,80}DRAW_START_CARD_TEXTURE[\s\S]{0,120}draw-start-challenge-card\.webp/
  );
  assert.match(drawSource, /backgroundColor: UI\.cream/);
  assert.match(drawSource, /timerLabel\.textContent = '60 SEC TO DRAW'/);
  assert.match(drawSource, /startButton\.textContent = 'START THEME'/);
  assert.match(drawSource, /const formatThemePrompt = \(prompt: string\)/);
  assert.match(
    drawSource,
    /prompt\.textContent = formatThemePrompt\(dare\.prompt\)/
  );
  assert.doesNotMatch(drawSource, /prompt\.textContent[^\n]*toUpperCase/);
  assert.match(drawSource, /fontSize: '40px',[\s\S]{0,100}textWrap: 'balance'/);
  assert.match(drawSource, /marginTop: '14px'/);
  assert.match(drawSource, /: 'DRAWING TIME!'/);
  assert.match(drawSource, /'\.\.\/assets\/ui-button-close\.webp'/);
  assert.match(drawSource, /'Close drawing theme'/);
  assert.match(
    drawSource,
    /closeButton\.addEventListener\('click', \(\) => this\.exitDraw\(\)\)/
  );
  assert.match(drawSource, /freeDrawLabel\.textContent = 'FREE DRAW'/);
  assert.match(
    drawSource,
    /if \(!this\.isFirstScribbit\) \{[\s\S]{0,180}const freeDrawButton/
  );
  assert.match(drawSource, /private exitDraw\(\): void/);
  assert.match(drawSource, /this\.exitTo\('ScribbitHome'\)/);
  assert.doesNotMatch(drawSource, /Draw your first Scribbit to unlock Home\./);
  assert.match(drawSource, /Draw your first Scribbit to unlock Free Draw\./);
  assert.match(drawSource, /noTimerLabel\.textContent = 'NO TIMER'/);
  assert.match(
    drawSource,
    /private createThemeJourneyStrip\(\): HTMLDivElement/
  );
  assert.match(
    drawSource,
    /const steps = \['DRAW', 'NAME', 'RUMBLE'\] as const/
  );
  assert.match(drawSource, /private createThemeArtMotionLayer\(/);
  assert.match(drawSource, /'draw-theme-art-crayon'/);
  assert.match(drawSource, /'draw-theme-art-star-top'/);
  assert.match(drawSource, /'draw-theme-art-star-bottom'/);
  assert.match(
    drawSource,
    /const reducedThemeMotion = timedStart && prefersReducedMotion\(\)/
  );
  assert.match(drawSource, /draw-theme-reduced-motion/);
  assert.match(drawSource, /if \(!reducedThemeMotion\)/);
  assert.match(drawSource, /draw-theme-journey-number/);
  assert.match(drawSource, /draw-theme-journey-connector/);
  assert.match(gameStyles, /@keyframes draw-theme-crayon-rock/);
  assert.match(gameStyles, /@keyframes draw-theme-star-float/);
  assert.match(gameStyles, /@keyframes draw-theme-number-pulse/);
  assert.match(gameStyles, /\.draw-start-countdown/);
  assert.match(gameStyles, /\.draw-start-countdown\.is-draw/);
  assert.match(
    gameStyles,
    /\.draw-theme-reduced-motion \.draw-theme-start-button/
  );
  assert.match(gameStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(drawSource, /card\.append\(startButton\)/);
  assert.match(drawSource, /timerNotice\.append\(timerIcon, timerLabel\)/);
  assert.match(drawSource, /Start the 60 second Community Theme drawing round/);
  assert.match(drawSource, /background: 'rgba\(31, 24, 18, 0\.82\)'/);
  assert.match(drawSource, /width: this\.scale\.width/);
  assert.match(drawSource, /height: this\.scale\.height/);
  assert.match(
    drawSource,
    /style\.visibility = overlayVisible[\s\S]{0,40}\? 'visible'[\s\S]{0,20}: 'hidden'/
  );
  assert.match(drawSource, /private isWaitingToStart\(\): boolean/);
  assert.match(drawSource, /this\.canvas\?\.setEnabled\(inputEnabled\)/);
  assert.match(
    drawSource,
    /this\.playerDrawMode === 'community' && !waitingToStart/
  );
  assert.match(drawSource, /brightness\(0\.68\) saturate\(0\.58\)/);
  assert.doesNotMatch(
    drawSource,
    /if \(change === 'draw'\) this\.startDrawingRound\(\)/
  );
  assert.match(drawSource, /this\.setDrawingLocked\(true\)/);
  assert.match(drawSource, /Time! Name your Scribbit\./);
  assert.match(drawSource, /fresh 60-second round/);
  assert.match(drawSource, /this\.overlay\.place\(this\.drawTimerContainer/);
  assert.match(drawSource, /x: this\.scale\.width - EDGE - 160/);
  assert.match(drawSource, /width: 160/);
  assert.match(drawSource, /height: 68/);
  assert.match(drawSource, /zIndex: '6'/);
  assert.match(
    drawSource,
    /Phaser depth cannot render above an HTML canvas overlay/
  );
  assert.match(drawSource, /getDrawRoundUrgencyMotion\(remainingSeconds\)/);
  assert.match(canvasSource, /setEnabled\(enabled: boolean\)/);
  assert.match(
    canvasSource,
    /Reset cannot be undone back into the expired round/
  );
});
