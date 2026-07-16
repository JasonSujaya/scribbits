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
  const drawStartOverlaySource = readFileSync(
    join(process.cwd(), 'src', 'client', 'lib', 'drawstartoverlay.ts'),
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
  assert.match(
    drawSource,
    /private async beginDrawingRound\(\): Promise<void>/
  );
  assert.match(drawSource, /private startDrawCountdown\(\): void/);
  assert.match(drawSource, /private finishDrawCountdown\(\): void/);
  assert.match(
    drawSource,
    /const DRAW_START_COUNTDOWN_STEPS = \['3', '2', '1', 'DRAW!'\] as const/
  );
  assert.match(
    drawSource,
    /private async beginDrawingRound\(\): Promise<void>[\s\S]{0,1200}await prepareSfxPlayback\('draw\.countdown', 'draw\.start'\)[\s\S]{0,260}this\.startDrawCountdown\(\)/
  );
  assert.match(
    drawSource,
    /private finishDrawCountdown\(\): void[\s\S]{0,600}this\.startDrawingRound\(\)/
  );
  assert.match(
    drawSource,
    /private startDrawingRound\(\): void[\s\S]{0,500}const wasStarted = this\.drawRoundClock\.started;[\s\S]{0,100}this\.activateDrawingRound\(wasStarted\)/
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
  assert.match(drawStartOverlaySource, /startButton\.dataset\.sfxCue = 'none'/);
  assert.match(drawSource, /private beginFreeDrawing\(\): void/);
  assert.match(drawSource, /private async submitFree\(/);
  assert.match(drawSource, /submitFreeDrawing\(\{/);
  assert.match(drawStartOverlaySource, /DRAW_START_CARD_ART_URL/);
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
  assert.match(drawStartOverlaySource, /backgroundColor: UI\.cream/);
  assert.match(
    drawStartOverlaySource,
    /timerLabel\.textContent = '60 SEC TO DRAW'/
  );
  assert.match(
    drawStartOverlaySource,
    /startButton\.textContent = 'START THEME'/
  );
  assert.match(drawSource, /const formatThemePrompt = \(prompt: string\)/);
  assert.match(drawSource, /prompt: formatThemePrompt\(dare\.prompt\)/);
  assert.doesNotMatch(
    drawStartOverlaySource,
    /prompt\.textContent[^\n]*toUpperCase/
  );
  assert.match(
    drawStartOverlaySource,
    /fontSize: '40px',[\s\S]{0,100}textWrap: 'balance'/
  );
  assert.match(drawStartOverlaySource, /marginTop: '14px'/);
  assert.match(drawSource, /: 'DRAWING TIME!'/);
  assert.match(drawStartOverlaySource, /'\.\.\/assets\/ui-button-close\.webp'/);
  assert.match(drawStartOverlaySource, /'Close drawing theme'/);
  assert.match(
    drawStartOverlaySource,
    /closeButton\.addEventListener\('click', options\.onClose\)/
  );
  assert.match(drawSource, /onClose: \(\) => this\.exitDraw\(\)/);
  assert.match(
    drawStartOverlaySource,
    /freeDrawLabel\.textContent = 'FREE DRAW'/
  );
  assert.match(
    drawStartOverlaySource,
    /if \(options\.allowFreeDraw\) \{[\s\S]{0,180}freeDrawButton =/
  );
  assert.match(drawSource, /allowFreeDraw: !this\.isFirstScribbit/);
  assert.match(drawSource, /private exitDraw\(\): void/);
  assert.match(drawSource, /this\.exitTo\('ScribbitHome'\)/);
  assert.doesNotMatch(drawSource, /Draw your first Scribbit to unlock Home\./);
  assert.match(drawSource, /Draw your first Scribbit to unlock Free Draw\./);
  assert.match(
    drawStartOverlaySource,
    /noTimerLabel\.textContent = 'NO TIMER'/
  );
  assert.match(
    drawStartOverlaySource,
    /const createThemeJourneyStrip = \(\): HTMLDivElement/
  );
  assert.match(
    drawStartOverlaySource,
    /const steps = \['DRAW', 'NAME', 'RUMBLE'\] as const/
  );
  assert.match(drawStartOverlaySource, /const createThemeArtMotionLayer = \(/);
  assert.match(drawStartOverlaySource, /'draw-theme-art-crayon'/);
  assert.match(drawStartOverlaySource, /'draw-theme-art-star-top'/);
  assert.match(drawStartOverlaySource, /'draw-theme-art-star-bottom'/);
  assert.match(drawSource, /const reducedMotion = prefersReducedMotion\(\)/);
  assert.match(drawStartOverlaySource, /draw-theme-reduced-motion/);
  assert.match(drawStartOverlaySource, /if \(!options\.reducedMotion\)/);
  assert.match(drawStartOverlaySource, /draw-theme-journey-number/);
  assert.match(drawStartOverlaySource, /draw-theme-journey-connector/);
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
  assert.match(drawStartOverlaySource, /card\.append\(startButton\)/);
  assert.match(
    drawStartOverlaySource,
    /timerNotice\.append\(timerIcon, timerLabel\)/
  );
  assert.match(
    drawStartOverlaySource,
    /Start the 60 second Community Theme drawing round/
  );
  assert.match(
    drawStartOverlaySource,
    /background: 'rgba\(31, 24, 18, 0\.82\)'/
  );
  assert.match(drawStartOverlaySource, /width: options\.viewport\.width/);
  assert.match(drawStartOverlaySource, /height: options\.viewport\.height/);
  assert.match(
    drawStartOverlaySource,
    /style\.visibility = overlayVisible[\s\S]{0,40}\? 'visible'[\s\S]{0,20}: 'hidden'/
  );
  assert.match(
    drawStartOverlaySource,
    /requestedVisible &&[\s\S]{0,100}!countdownActive[\s\S]{0,100}options\.communityThemeAvailable/
  );
  assert.match(
    drawStartOverlaySource,
    /startButton\.disabled = !startIsAvailable[\s\S]{0,220}freeDrawButton\.disabled = !freeDrawIsAvailable/
  );
  assert.match(drawStartOverlaySource, /void options\.onStartTheme\(\)/);
  assert.match(
    drawStartOverlaySource,
    /freeDrawButton\.addEventListener\('click', options\.onStartFreeDraw\)/
  );
  assert.match(
    drawStartOverlaySource,
    /destroy: \(\) => \{[\s\S]{0,100}if \(destroyed\) return;[\s\S]{0,100}overlay\.remove\(\)/
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
