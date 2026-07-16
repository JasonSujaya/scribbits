import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const verifierSource = await readFile(
  new URL('../scripts/verify-devvit-build.mjs', import.meta.url),
  'utf8'
);

test('production verifier checks flattened root asset references', () => {
  assert.match(verifierSource, /source\.matchAll\(/);
  assert.match(verifierSource, /url\\\(\\s\*/);
  assert.match(verifierSource, /missingAssetReferences/);
  assert.doesNotMatch(verifierSource, /\\\/assets\\\//);
});

test('production verifier requires shipped music and enforces audio budgets', () => {
  for (const fileName of [
    'legends-in-the-margins.mp3',
    'pocketful-of-ink.mp3',
    'ready-set-scribble.mp3',
    'scribbits-battle.mp3',
  ]) {
    assert.match(verifierSource, new RegExp(fileName.replaceAll('.', '\\.')));
  }
  assert.match(verifierSource, /totalAudioBytes/);
  assert.match(verifierSource, /1\.6 \* 1024 \* 1024/);
  assert.match(verifierSource, /4\.5 \* 1024 \* 1024/);
});
