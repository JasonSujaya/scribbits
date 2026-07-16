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

test('production verifier rejects an eager monolithic expanded-game bundle', () => {
  assert.match(verifierSource, /gzipSync/);
  assert.match(
    verifierSource,
    /maximumGameEntryRawBytes = 1\.8 \* 1024 \* 1024/
  );
  assert.match(verifierSource, /maximumGameEntryGzipBytes = 550 \* 1024/);
  assert.match(verifierSource, /htmlJavascriptReferences/);
  assert.match(verifierSource, /deferredJavascriptFiles/);
  assert.match(
    verifierSource,
    /requiredDeferredSceneChunks = \['Draw', 'Replay', 'Gallery'\]/
  );
  assert.match(verifierSource, /Shop\|MyBattles/);
  assert.match(verifierSource, /at least 4 deferred scene chunks/);
  assert.match(verifierSource, /maximumDeferredChunkRawBytes = 768 \* 1024/);
  assert.match(verifierSource, /maximumDeferredChunkGzipBytes = 250 \* 1024/);
  assert.match(
    verifierSource,
    /for \(const fileName of deferredJavascriptFiles\)/
  );
  assert.match(verifierSource, /path\.basename\(fileName\).*battleshare\.js/s);
});

test('screen budgets include every blocking atlas and Shop image format', () => {
  assert.match(verifierSource, /assertAssetBudget/);
  assert.doesNotMatch(verifierSource, /assertImageBudget/);
  for (const fileName of [
    'gear-common-atlas.json',
    'gear-rare-epic-atlas.json',
    'scribbits-shop-capsule-shell.png',
    'scribbits-battle-title.webp',
  ]) {
    assert.match(verifierSource, new RegExp(fileName.replaceAll('.', '\\.')));
  }
  assert.match(verifierSource, /'Shop',[\s\S]*928 \* 1024/);
  assert.match(verifierSource, /'Draw',[\s\S]*160 \* 1024/);
});
