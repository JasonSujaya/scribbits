import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const soundtrackSource = await readFile(
  new URL('../src/client/lib/soundtrack.ts', import.meta.url),
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

test('home music tries Pocketful first, then randomizes both idle tracks', () => {
  assert.match(soundtrackSource, /if \(!hasPlayedHomeTrack\) return 0/);
  assert.match(soundtrackSource, /Math\.floor\(normalizedRandom \* trackCount\)/);
  assert.match(soundtrackSource, /hasPlayedHomeSoundtrack = true/);
  assert.match(soundtrackSource, /pocketful-of-ink\.mp3/);
  assert.match(soundtrackSource, /legends-in-the-margins\.mp3/);
  assert.match(
    soundtrackSource,
    /if \(currentMode === 'home'\) playHomeSoundtrack\(\)/
  );
});

test('drawing music follows the timed round lifecycle', () => {
  assert.match(soundtrackSource, /ready-set-scribble\.mp3/);
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
