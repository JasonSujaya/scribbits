import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readClientSource = (relativePath) =>
  readFileSync(
    new URL(`../src/client/${relativePath}`, import.meta.url),
    'utf8'
  );

const visualAssetsSource = readClientSource('lib/visualassets.ts');
const bootSource = readClientSource('scenes/Boot.ts');
const homeSource = readClientSource('scenes/ScribbitHome.ts');
const replaySource = readClientSource('scenes/Replay.ts');
const gallerySource = readClientSource('scenes/Gallery.ts');

test('critical authored scenes check texture readiness and expose retry', () => {
  for (const [source, readyFunction, retryFunction, preloadFunction] of [
    [
      bootSource,
      'coreVisualAssetsReady',
      'retryVisualAssets',
      'preloadVisualAssets',
    ],
    [
      homeSource,
      'homeVisualAssetsReady',
      'retryHomeVisualAssets',
      'preloadHomeVisualAssets',
    ],
    [
      replaySource,
      'replayVisualAssetsReady',
      'retryReplayVisualAssets',
      'preloadReplayVisualAssets',
    ],
    [
      gallerySource,
      'galleryVisualAssetsReady',
      'retryGalleryVisualAssets',
      'preloadGalleryVisualAssets',
    ],
  ]) {
    assert.match(source, new RegExp(`!${readyFunction}\\(this\\)`));
    assert.match(source, new RegExp(`${retryFunction}\\(`));
    assert.match(source, new RegExp(`${preloadFunction}\\(this\\)`));
    assert.match(source, /this\.load\.start\(\)/);
  }
  assert.match(
    gallerySource,
    /switchTab\(tab: GalleryTab\)[\s\S]{0,700}!galleryVisualAssetsReady\(this\)[\s\S]{0,120}retryGalleryVisualAssets/
  );
});

test('Gear atlases load with the scenes that use them instead of core Boot', () => {
  const corePreload = visualAssetsSource.slice(
    visualAssetsSource.indexOf('export function preloadVisualAssets'),
    visualAssetsSource.indexOf('export function coreVisualAssetsReady')
  );
  assert.doesNotMatch(corePreload, /gear-(?:common|rare-epic|legendary)-atlas/);

  assert.match(
    visualAssetsSource,
    /preloadHomeVisualAssets[\s\S]*preloadGearVisualAssets\(scene, 'legendary'\)/
  );
  assert.match(
    visualAssetsSource,
    /preloadGalleryVisualAssets[\s\S]*preloadGearVisualAssets\(scene\)/
  );
  assert.match(
    visualAssetsSource,
    /preloadShopVisualAssets[\s\S]*preloadGearVisualAssets\(scene\)/
  );
});
