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
const gallerySource = await readFile(
  new URL('../src/client/scenes/Gallery.ts', import.meta.url),
  'utf8'
);
const replaySource = await readFile(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
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
  assert.match(drawSource, /else startDrawingSoundtrack\(\)/);
  assert.match(drawSource, /if \(wasStarted\) resumeDrawingSoundtrack\(\)/);
  assert.match(
    drawSource,
    /private pauseDrawingRound\(\): void \{[\s\S]{0,140}pauseDrawingSoundtrack\(\)/
  );
  assert.match(
    drawSource,
    /private finishDrawingRound\(\): void \{[\s\S]{0,180}pauseDrawingSoundtrack\(\)/
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

test('Home and Gallery share one uninterrupted idle track', () => {
  assert.match(soundtrackSource, /const audio = new Audio\(\)/);
  assert.match(soundtrackSource, /audio\.preload = 'auto'/);
  assert.match(soundtrackSource, /audio\.autoplay = startPlaying/);
  assert.match(
    soundtrackSource,
    /currentMode === 'home' && currentAudio\)[\s\S]{0,100}requestPlayback\(\)/
  );
  assert.match(soundtrackSource, /export const releaseHomeSoundtrack/);
  assert.match(
    soundtrackSource,
    /addEventListener\('pointerdown', retryPlayback, true\)/
  );
  assert.match(soundtrackSource, /attemptPlayback\(currentAudio\)/);
  assert.doesNotMatch(soundtrackSource, /navigator\.userActivation/);
  assert.match(homeSource, /releaseHomeSoundtrack\(\)/);
  assert.match(gallerySource, /playHomeSoundtrack\(\)/);
  assert.match(gallerySource, /releaseHomeSoundtrack\(\)/);
});
