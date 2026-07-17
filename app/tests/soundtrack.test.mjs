import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readClientFile = (relativePath) =>
  readFile(new URL(`../src/client/${relativePath}`, import.meta.url), 'utf8');

const [
  soundtrackSource,
  audioCatalogSource,
  preloaderSource,
  homeSource,
  gallerySource,
  shopSource,
  drawSource,
  replaySource,
  battleCeremonySource,
] = await Promise.all([
  readClientFile('lib/soundtrack.ts'),
  readClientFile('lib/audiocatalog.ts'),
  readClientFile('scenes/Preloader.ts'),
  readClientFile('scenes/ScribbitHome.ts'),
  readClientFile('scenes/Gallery.ts'),
  readClientFile('scenes/Shop.ts'),
  readClientFile('scenes/Draw.ts'),
  readClientFile('scenes/Replay.ts'),
  readClientFile('lib/battleceremony.ts'),
]);

test('one lightweight soundtrack loops across the whole game', () => {
  assert.match(audioCatalogSource, /game: \[/);
  assert.match(audioCatalogSource, /pocketful-of-ink\.mp3/);
  assert.doesNotMatch(audioCatalogSource, /scribbits-battle\.mp3/);
  assert.doesNotMatch(audioCatalogSource, /ready-set-scribble\.mp3/);
  assert.doesNotMatch(audioCatalogSource, /legends-in-the-margins\.mp3/);
  assert.match(
    soundtrackSource,
    /const GAME_SOUNDTRACK = MUSIC_CATALOG\.game\[0\]/
  );
  assert.match(
    soundtrackSource,
    /audio\.dataset\.scribbitsSoundtrack = 'game'/
  );
  assert.match(soundtrackSource, /audio\.loop = true/);
  assert.equal(
    [...soundtrackSource.matchAll(/new Audio\(\)/g)].length,
    1,
    'the soundtrack manager should own exactly one audio element factory'
  );
});

test('scene changes resume the same audio element instead of replacing it', () => {
  assert.match(
    soundtrackSource,
    /export const playGameSoundtrack[\s\S]{0,220}if \(!currentAudio\)[\s\S]{0,120}requestPlayback\(\)/
  );
  assert.match(preloaderSource, /playGameSoundtrack\(\)/);
  assert.match(preloaderSource, /isGameSoundtrackPlaying\(\)/);
  assert.match(homeSource, /playGameSoundtrack\(\)/);
  assert.match(gallerySource, /playGameSoundtrack\(\)/);
  assert.match(shopSource, /playGameSoundtrack\(\)/);
  assert.match(drawSource, /playGameSoundtrack\(\)/);
  assert.match(replaySource, /playGameSoundtrack\(\)/);
  assert.doesNotMatch(homeSource, /releaseHomeSoundtrack/);
  assert.doesNotMatch(gallerySource, /releaseHomeSoundtrack/);
  assert.doesNotMatch(
    replaySource,
    /stopBattleSoundtrack|startBattleSoundtrack/
  );
  assert.doesNotMatch(drawSource, /pauseDrawingSoundtrack|stopSoundtrack/);
});

test('trusted drawing and fight gestures retry the same continuous loop', () => {
  assert.match(
    soundtrackSource,
    /export const primeGameSoundtrack[\s\S]{0,120}preloadGameSoundtrack\(\)[\s\S]{0,80}requestPlayback\(\)/
  );
  assert.match(drawSource, /primeGameSoundtrack\(\)/);
  assert.match(battleCeremonySource, /preloadGameSoundtrack\(\)/);
  assert.doesNotMatch(
    soundtrackSource,
    /preparedBattleAudio|preparedDrawingAudio/
  );
});

test('blocked playback retries on the next player gesture', () => {
  assert.match(
    soundtrackSource,
    /error\.name === 'NotAllowedError'[\s\S]{0,160}installRetryListeners\(\)/
  );
  assert.match(
    soundtrackSource,
    /addEventListener\('pointerdown', retryPlayback, true\)/
  );
  assert.match(
    soundtrackSource,
    /currentAudio\.preload = 'auto'[\s\S]{0,80}currentAudio\.load\(\)[\s\S]{0,80}attemptPlayback\(currentAudio\)/
  );
  assert.match(
    preloaderSource,
    /if \(!isGameSoundtrackPlaying\(\)\)[\s\S]{0,400}setGameBootStart\(\(\) => \{[\s\S]{0,220}playGameSoundtrack\(\)/
  );
});

test('soundtrack errors recover once without multiplying audio elements', () => {
  assert.match(soundtrackSource, /const MAX_RECOVERY_ATTEMPTS = 1/);
  assert.match(
    soundtrackSource,
    /audio\.addEventListener\('error', recoverSoundtrack\)/
  );
  assert.match(
    soundtrackSource,
    /recoveryAttempts >= MAX_RECOVERY_ATTEMPTS[\s\S]{0,260}discardAudio\(failedAudio\)/
  );
  assert.match(
    soundtrackSource,
    /createSoundtrack\(shouldResumePlayback, recoveryAttempts \+ 1\)/
  );
  assert.doesNotMatch(soundtrackSource, /addEventListener\('stalled'/);
});
