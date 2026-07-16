import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const drawingLoaderSource = await readFile(
  new URL('../src/client/lib/scribbits.ts', import.meta.url),
  'utf8'
);
const gameSource = await readFile(
  new URL('../src/client/game.ts', import.meta.url),
  'utf8'
);
const replaySource = await readFile(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
);

const loadDrawingSource = drawingLoaderSource.slice(
  drawingLoaderSource.indexOf('export function loadDrawing'),
  drawingLoaderSource.indexOf('function createFallbackDrawingTexture')
);
const createFallbackSource = drawingLoaderSource.slice(
  drawingLoaderSource.indexOf('function createFallbackDrawingTexture'),
  drawingLoaderSource.indexOf('function upgradeDrawingTexture')
);
const upgradeSource = drawingLoaderSource.slice(
  drawingLoaderSource.indexOf('function upgradeDrawingTexture'),
  drawingLoaderSource.indexOf('function drawContainedSource')
);

test('drawing presentation creates fallback before requesting network art', () => {
  assert.ok(
    loadDrawingSource.indexOf('createFallbackDrawingTexture(scene, key)') <
      loadDrawingSource.indexOf(
        'scene.load.image(sourceKey, scribbit.imageUrl)'
      ),
    'fallback creation must happen before the remote request starts'
  );
  assert.match(loadDrawingSource, /new Promise<string>/);
  assert.match(loadDrawingSource, /resolveDrawingLoad\(key\)/);
  assert.doesNotMatch(loadDrawingSource, /delayedCall\(9_?000/);
  assert.match(
    createFallbackSource,
    /generateBlankDrawingTexture\(scene, 'shared'\)/
  );
  assert.doesNotMatch(createFallbackSource, /fallbackDoodle/);
});

test('ordinary callers get fallback immediately while Replay waits for remote art', () => {
  const remoteAttemptSource = loadDrawingSource.slice(
    loadDrawingSource.indexOf('let sceneLoads')
  );
  assert.match(
    remoteAttemptSource,
    /waitForBoundedDrawingReadiness\(drawingLoad, key\)/
  );
  assert.match(
    loadDrawingSource,
    /const finish = \([\s\S]*resolveDrawingLoad\(key\)/
  );
  assert.match(
    replaySource,
    /loadDrawing\(this, report\.a, \{ waitForRemote: true \}\)/
  );
  assert.match(
    replaySource,
    /loadDrawing\(this, report\.b, \{ waitForRemote: true \}\)/
  );
  assert.match(
    drawingLoaderSource,
    /CRITICAL_DRAWING_READY_WAIT_MILLISECONDS = 2_000/
  );
  assert.match(
    drawingLoaderSource,
    /window\.setTimeout\([\s\S]*finish\(fallbackKey\)/
  );
});

test('remote drawings use anonymous CORS and a bounded retry policy', () => {
  assert.match(gameSource, /crossOrigin: 'anonymous'/);
  assert.match(gameSource, /maxRetries: 2/);
  assert.match(gameSource, /timeout: 5_000/);
});

test('late remote art upgrades the stable canvas without changing caller keys', () => {
  assert.match(
    createFallbackSource,
    /scene\.textures\.addCanvas\(key, canvas\)/
  );
  assert.match(loadDrawingSource, /const sourceKey = `\$\{key\}-source-/);
  assert.match(
    loadDrawingSource,
    /upgradeDrawingTexture\(scene, key, sourceKey\)/
  );
  assert.match(upgradeSource, /texture\.refresh\(\)/);
  assert.match(loadDrawingSource, /scene\.textures\.remove\(sourceKey\)/);
});

test('failed remote art stays on fallback and can retry on a later request', () => {
  const errorHandlerSource = loadDrawingSource.slice(
    loadDrawingSource.indexOf('const onError'),
    loadDrawingSource.indexOf('const finish')
  );
  assert.match(errorHandlerSource, /finish\('load-error'\)/);
  assert.doesNotMatch(errorHandlerSource, /markRemoteDrawingTextureCurrent/);
  assert.match(
    loadDrawingSource,
    /drawingLoad\.then\(\(\) => \{[\s\S]*sceneLoads\.delete\(key\)/
  );
  assert.match(loadDrawingSource, /reportDrawingLoadFailure/);
  assert.match(drawingLoaderSource, /DRAWING_LOAD_FAILURE_EVENT/);
  assert.match(drawingLoaderSource, /dataset\.drawingLoadFailures/);
});

test('canvas upgrade failures are caught and become observable fallbacks', () => {
  assert.match(loadDrawingSource, /catch \(error\)/);
  assert.match(loadDrawingSource, /failureReason = 'upgrade-failed'/);
  assert.match(loadDrawingSource, /failureReason = 'invalid-image'/);
});

test('remote cache records are scoped by texture manager and image URL', () => {
  assert.match(
    drawingLoaderSource,
    /WeakMap<[\s\S]*Phaser\.Textures\.TextureManager,[\s\S]*Map<string, string>/
  );
  assert.match(
    loadDrawingSource,
    /remoteDrawingTextureIsCurrent\(scene, key, scribbit\.imageUrl\)/
  );
  assert.match(
    loadDrawingSource,
    /markRemoteDrawingTextureCurrent\(scene, key, scribbit\.imageUrl\)/
  );
});
