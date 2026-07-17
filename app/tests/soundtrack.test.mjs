import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const soundtrackSource = await readFile(
  new URL('../src/client/lib/soundtrack.ts', import.meta.url),
  'utf8'
);
const audioCatalogSource = await readFile(
  new URL('../src/client/lib/audiocatalog.ts', import.meta.url),
  'utf8'
);
const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const homeSource = await readFile(
  new URL('../src/client/scenes/ScribbitHome.ts', import.meta.url),
  'utf8'
);
const preloaderSource = await readFile(
  new URL('../src/client/scenes/Preloader.ts', import.meta.url),
  'utf8'
);
const gameHtml = await readFile(
  new URL('../src/client/game.html', import.meta.url),
  'utf8'
);
const gallerySource = await readFile(
  new URL('../src/client/scenes/Gallery.ts', import.meta.url),
  'utf8'
);
const replaySource = await readFile(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
);
const battleCeremonySource = await readFile(
  new URL('../src/client/lib/battleceremony.ts', import.meta.url),
  'utf8'
);
const myBattlesSource = await readFile(
  new URL('../src/client/scenes/MyBattles.ts', import.meta.url),
  'utf8'
);
const battleMusic = await readFile(
  new URL('../src/client/assets/scribbits-battle.mp3', import.meta.url)
);
const requestPlaybackSource = soundtrackSource.slice(
  soundtrackSource.indexOf('const requestPlayback'),
  soundtrackSource.indexOf('function retryPlayback')
);

test('home music tries Pocketful first, then randomizes later visits', () => {
  assert.match(soundtrackSource, /if \(!hasPlayedHomeTrack\) return 0/);
  assert.match(
    soundtrackSource,
    /Math\.floor\(normalizedRandom \* trackCount\)/
  );
  assert.match(soundtrackSource, /hasPlayedHomeSoundtrack = true/);
  assert.match(soundtrackSource, /MUSIC_CATALOG\.home/);
  assert.match(audioCatalogSource, /pocketful-of-ink\.mp3/);
  assert.match(audioCatalogSource, /legends-in-the-margins\.mp3/);
  assert.match(soundtrackSource, /audio\.loop = true/);
});

test('drawing music follows the timed round lifecycle', () => {
  assert.match(soundtrackSource, /MUSIC_CATALOG\.drawing/);
  assert.match(audioCatalogSource, /ready-set-scribble\.mp3/);
  assert.match(soundtrackSource, /audio\.loop = true/);
  assert.match(homeSource, /playHomeSoundtrack\(\)/);
  assert.match(
    drawSource,
    /private activateDrawingRound\(wasStarted: boolean\)[\s\S]{0,350}if \(wasStarted\) resumeDrawingSoundtrack\(\);[\s\S]{0,80}else startDrawingSoundtrack\(\)/
  );
  assert.match(
    drawSource,
    /private finishDrawCountdown\(\): void[\s\S]{0,1200}this\.startDrawingRound\(\)/
  );
  assert.match(
    drawSource,
    /private pauseDrawingRound\(\): void \{[\s\S]{0,140}pauseDrawingSoundtrack\(\)/
  );
  assert.match(
    drawSource,
    /private finishDrawingRound\(\): void \{[\s\S]{0,180}pauseDrawingSoundtrack\(\)/
  );
});

test('drawing music and SFX are primed before the countdown starts', () => {
  assert.match(
    soundtrackSource,
    /export const preloadDrawingSoundtrack = \(\): void =>[\s\S]{0,180}preparedDrawingAudio = createPreparedDrawingAudio\(\)/
  );
  assert.match(
    soundtrackSource,
    /export const primeDrawingSoundtrack = \(\): void =>[\s\S]{0,260}audio\.play\(\)/
  );
  assert.match(
    drawSource,
    /private beginDrawingRound\(\): void[\s\S]{0,800}primeDrawingSoundtrack\(\);[\s\S]{0,240}void prepareSfxPlayback\('draw\.countdown', 'draw\.start'\);[\s\S]{0,180}this\.startDrawCountdown\(\)/
  );
  assert.match(
    drawSource,
    /private startDrawCountdown\(\): void[\s\S]{0,150}preloadDrawingSoundtrack\(\)/
  );
  assert.match(
    drawSource,
    /private startDrawingRound\(\): void[\s\S]{0,500}const wasStarted = this\.drawRoundClock\.started;[\s\S]{0,100}this\.activateDrawingRound\(wasStarted\)/
  );
  assert.doesNotMatch(drawSource, /waitForDrawingSoundtrackReadiness/);
  assert.match(
    soundtrackSource,
    /export const startDrawingSoundtrack = \(\): void =>[\s\S]{0,260}const audio = preparedDrawingAudio[\s\S]{0,700}currentAudio = audio/
  );
  assert.match(
    drawSource,
    /private cleanup\(\): void[\s\S]{0,180}releaseDrawingSoundtrackPreparation\(\)/
  );
});

test('Free Draw continues the idle soundtrack without replacing it', () => {
  assert.match(
    drawSource,
    /if \(this\.practiceMode \|\| this\.automationMode\) stopSoundtrack\(\);\s*else playHomeSoundtrack\(\);/
  );
  assert.match(
    drawSource,
    /private beginFreeDrawing\(\): void \{[\s\S]{0,700}this\.playerDrawMode = 'free'/
  );
  assert.match(
    drawSource,
    /!this\.drawRoundClock\.started[\s\S]{0,100}releaseHomeSoundtrack\(\)/
  );
});

test('battle music follows Replay and the battle sound toggle', () => {
  assert.match(audioCatalogSource, /scribbits-battle\.mp3/);
  assert.match(soundtrackSource, /MUSIC_CATALOG\.battle/);
  assert.match(soundtrackSource, /export const startBattleSoundtrack/);
  assert.match(soundtrackSource, /export const stopBattleSoundtrack/);
  assert.match(soundtrackSource, /export const setBattleSoundtrackEnabled/);
  assert.match(
    replaySource,
    /startBattleSoundtrack\(this\.soundboard\.isEnabled\(\)\)/
  );
  assert.match(replaySource, /stopBattleSoundtrack\(\)/);
  assert.match(
    replaySource,
    /const enabled = this\.soundboard\.toggle\(\);[\s\S]{0,100}setBattleSoundtrackEnabled\(enabled\)/
  );
});

test('battle music is prepared during fight intent and reused by Replay', () => {
  assert.ok(
    battleMusic.byteLength <= 1_600_000,
    `battle soundtrack is ${battleMusic.byteLength} bytes`
  );
  assert.match(
    soundtrackSource,
    /export const preloadBattleSoundtrack = \(\): void =>/
  );
  assert.match(
    soundtrackSource,
    /preparedBattleAudio = createPreparedBattleAudio\(\)/
  );
  assert.match(soundtrackSource, /audio\.load\(\)/);
  assert.match(
    soundtrackSource,
    /export const primeBattleSoundtrack = \(\): void =>[\s\S]{0,300}audio\.play\(\)/
  );
  assert.match(
    soundtrackSource,
    /export const startBattleSoundtrack[\s\S]{0,220}const audio = preparedBattleAudio/
  );
  assert.match(battleCeremonySource, /preloadBattleSoundtrack\(\)/);
  assert.match(
    myBattlesSource,
    /private async startFight[\s\S]{0,220}primeBattleSoundtrack\(\)[\s\S]{0,500}await spar\(/
  );
});

test('Home and Gallery share one uninterrupted idle track', () => {
  assert.match(soundtrackSource, /const audio = new Audio\(\)/);
  assert.match(
    soundtrackSource,
    /audio\.preload = mode === 'home' \? 'none' : 'auto'/
  );
  assert.match(soundtrackSource, /audio\.src = source/);
  assert.match(
    soundtrackSource,
    /if \(!audio\.getAttribute\('src'\) && source\) audio\.src = source/
  );
  assert.match(requestPlaybackSource, /installRetryListeners\(\)/);
  assert.match(
    soundtrackSource,
    /audio\.autoplay = startPlaying/
  );
  assert.match(
    soundtrackSource,
    /currentMode === 'home' && currentAudio\)[\s\S]{0,100}requestPlayback\(\)/
  );
  assert.match(soundtrackSource, /export const releaseHomeSoundtrack/);
  assert.match(
    soundtrackSource,
    /addEventListener\('pointerdown', retryPlayback, true\)/
  );
  assert.match(
    soundtrackSource,
    /addEventListener\('click', retryPlayback, true\)/
  );
  assert.match(
    soundtrackSource,
    /audio\.src = source;[\s\S]{0,700}if \(startPlaying\) requestPlayback\(\)/
  );
  assert.match(soundtrackSource, /attemptPlayback\(currentAudio\)/);
  assert.doesNotMatch(soundtrackSource, /navigator\.userActivation/);
  assert.match(homeSource, /releaseHomeSoundtrack\(\)/);
  assert.match(gallerySource, /playHomeSoundtrack\(\)/);
  assert.match(gallerySource, /releaseHomeSoundtrack\(\)/);
});

test('blocked startup music uses the completed loader as its trusted start gesture', () => {
  assert.match(
    preloaderSource,
    /create\(\): void \{[\s\S]{0,400}playHomeSoundtrack\(\)/
  );
  assert.match(
    soundtrackSource,
    /error\.name === 'NotAllowedError'[\s\S]{0,160}installRetryListeners\(\)/
  );
  assert.match(
    soundtrackSource,
    /addEventListener\('pointerdown', retryPlayback, true\)/
  );
  assert.ok(
    requestPlaybackSource.indexOf('installRetryListeners();') <
      requestPlaybackSource.indexOf('attemptPlayback(audio);')
  );
  assert.match(
    soundtrackSource,
    /function retryPlayback[\s\S]{0,260}currentAudio\.preload = 'auto';[\s\S]{0,100}currentAudio\.load\(\);[\s\S]{0,100}attemptPlayback\(currentAudio\)/
  );
  assert.match(soundtrackSource, /export const isHomeSoundtrackPlaying/);
  assert.match(
    soundtrackSource,
    /scribbitsSoundtrackState = 'blocked'[\s\S]{0,120}installRetryListeners\(\)/
  );
  assert.match(soundtrackSource, /scribbitsSoundtrackState = 'playing'/);
  assert.match(
    preloaderSource,
    /if \(!isHomeSoundtrackPlaying\(\)\)[\s\S]{0,400}setGameBootStart\(\(\) => \{[\s\S]{0,220}playHomeSoundtrack\(\)[\s\S]{0,160}markGameBootPhase\('awaiting-start'/
  );
  assert.match(gameHtml, /id="game-boot-start"/);
  assert.match(gameHtml, /data-i18n="preloader\.start"/);
});

test('soundtrack errors recover once without treating transient stalls as fatal', () => {
  assert.match(soundtrackSource, /const MAX_RECOVERY_ATTEMPTS = 1/);
  assert.match(
    soundtrackSource,
    /audio\.addEventListener\('error', recoverSoundtrack\)/
  );
  assert.doesNotMatch(soundtrackSource, /addEventListener\('stalled'/);
  assert.match(
    soundtrackSource,
    /recoveryAttempts >= MAX_RECOVERY_ATTEMPTS[\s\S]{0,260}discardAudio\(failedAudio\)/
  );
  assert.match(
    soundtrackSource,
    /getRecoverySource\(failedMode, failedSource\)[\s\S]{0,100}recoveryAttempts \+ 1/
  );
  assert.match(
    soundtrackSource,
    /const getRecoverySource[\s\S]{0,500}\(failedTrackIndex \+ 1\) % HOME_SOUNDTRACKS\.length/
  );
  assert.match(
    soundtrackSource,
    /const shouldResumePlayback = playbackRequested[\s\S]{0,500}shouldResumePlayback/
  );
  assert.match(
    soundtrackSource,
    /audio\.removeEventListener\('error', recoverSoundtrack\)[\s\S]{0,320}audio\.remove\(\)/
  );
  assert.match(
    soundtrackSource,
    /audio\.addEventListener\('error', discardPreparedBattleAudio\)/
  );
  assert.match(
    soundtrackSource,
    /audio\.dataset\.scribbitsSoundtrackSource = BATTLE_SOUNDTRACK\.url[\s\S]{0,260}audio\.addEventListener\('error', recoverSoundtrack\)/
  );
  assert.match(
    soundtrackSource,
    /error\.name === 'NotAllowedError'[\s\S]{0,120}installRetryListeners\(\)/
  );
  assert.match(soundtrackSource, /error\.name === 'AbortError'/);
  assert.match(soundtrackSource, /recoverSoundtrackAudio\(audio\)/);
});
