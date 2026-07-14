import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [clipSource, replaySource, apiSource, serverSource, splashSource] =
  await Promise.all([
    readFile(
      new URL('../src/client/lib/battleclip.ts', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../src/client/scenes/Replay.ts', import.meta.url),
      'utf8'
    ),
    readFile(new URL('../src/client/lib/api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/server/routes/api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/client/splash.ts', import.meta.url), 'utf8'),
  ]);

test('Replay records the rendered canvas and shares a Reddit-hosted clip', () => {
  assert.match(clipSource, /canvas\.captureStream\(30\)/);
  assert.match(clipSource, /new MediaRecorder/);
  assert.match(clipSource, /videoBitsPerSecond: 700_000/);
  assert.match(clipSource, /}, 22_000\);/);
  assert.match(clipSource, /showShareSheet/);
  assert.match(replaySource, /startBattleClipRecording\(this\.game\.canvas\)/);
  assert.match(replaySource, /SHARE|shareRecordedBattleClip/);
  assert.match(apiSource, /'\/api\/battle-clip'/);
  assert.match(
    serverSource,
    /media\.upload\(\{ url: clip\.dataUrl, type: 'video' \}\)/
  );
});

test('shared Reddit links upgrade the inline splash to the hosted battle clip', () => {
  assert.match(splashSource, /getShareData\(\)/);
  assert.match(splashSource, /parseBattleShareData/);
  assert.match(splashSource, /battleVideo\.play\(\)/);
});
