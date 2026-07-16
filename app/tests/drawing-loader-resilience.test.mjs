import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const drawingLoaderSource = await readFile(
  new URL('../src/client/lib/scribbits.ts', import.meta.url),
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

test('drawing presentation resolves a deterministic fallback before network art', () => {
  assert.ok(
    loadDrawingSource.indexOf(
      'createFallbackDrawingTexture(scene, key, scribbit)'
    ) <
      loadDrawingSource.indexOf(
        'scene.load.image(sourceKey, scribbit.imageUrl)'
      ),
    'fallback creation must happen before the remote request starts'
  );
  assert.match(
    loadDrawingSource,
    /const drawingLoad = Promise\.resolve\(key\)/
  );
  assert.doesNotMatch(loadDrawingSource, /delayedCall\(9_?000/);
  assert.doesNotMatch(loadDrawingSource, /generateBlankDrawingTexture/);
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
  assert.match(errorHandlerSource, /finish\(\)/);
  assert.doesNotMatch(errorHandlerSource, /loadedRemoteDrawingTextures\.add/);
  assert.match(
    loadDrawingSource,
    /backgroundLoad\.then\(\(\) => \{[\s\S]*sceneLoads\.delete\(key\)/
  );
});
