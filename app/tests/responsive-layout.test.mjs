import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run responsive layout tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const theme = require(join(compiledClientRoot, 'lib', 'theme.js'));
const gameSource = await readFile(
  new URL('../src/client/game.ts', import.meta.url),
  'utf8'
);
const overlaySource = await readFile(
  new URL('../src/client/lib/overlay.ts', import.meta.url),
  'utf8'
);
const visualAssetSource = await readFile(
  new URL('../src/client/lib/visualassets.ts', import.meta.url),
  'utf8'
);
const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);

test('portrait design height fills common tall phones without stretching width', () => {
  assert.equal(theme.responsiveDesignHeight(393, 852), 1561);
  assert.equal(theme.responsiveDesignHeight(360, 800), 1600);
  assert.equal(theme.responsiveDesignHeight(360, 840), 1680);
  assert.equal(theme.responsiveDesignHeight(320, 568), 1280);
  assert.equal(theme.responsiveDesignHeight(1280, 720), 1280);
  assert.equal(theme.responsiveDesignHeight(0, 852), 1280);
});

test('game boot owns one stable responsive canvas size', () => {
  assert.match(gameSource, /responsiveDesignHeight\(hostWidth, hostHeight\)/);
  assert.match(gameSource, /mode: Phaser\.Scale\.FIT/);
  assert.match(gameSource, /autoRound: true/);
  assert.match(gameSource, /dataset\.designHeight = String\(designHeight\)/);
  assert.doesNotMatch(gameSource, /mode: Phaser\.Scale\.EXPAND/);
});

test('native overlays follow the live Phaser design height', () => {
  assert.match(overlaySource, /bounds\.height \/ this\.scene\.scale\.height/);
  assert.doesNotMatch(overlaySource, /bounds\.height \/ DESIGN_HEIGHT/);
});

test('Arena paper reaches the dock on expanded portrait canvases', () => {
  assert.match(visualAssetSource, /y: height - 100/);
  assert.match(visualAssetSource, /y: height - 85/);
  assert.doesNotMatch(visualAssetSource, /y: 1195/);
});

test('stage art keeps one aspect ratio instead of stretching on tall phones', () => {
  assert.match(visualAssetSource, /const coverScale = Math\.max/);
  assert.match(visualAssetSource, /\.setScale\(coverScale\)/);
  assert.doesNotMatch(visualAssetSource, /setDisplaySize\(width, height\)/);
});

test('all gameplay scenes share one clean image-generated paper stage', () => {
  assert.match(
    visualAssetSource,
    /PAPER_STAGE_TEXTURE = SCRIBBITS_STAGE_TEXTURE/
  );
  assert.match(
    visualAssetSource,
    /BATTLE_STAGE_TEXTURE = SCRIBBITS_STAGE_TEXTURE/
  );
  assert.match(visualAssetSource, /assetUrl\('scribbits-stage\.webp'\)/);
  assert.doesNotMatch(
    visualAssetSource,
    /scribbits-(?:arena|battle|paper)-stage\.jpg/
  );
});

test('Draw distributes tall-phone space without resizing the drawing square', () => {
  assert.match(drawSource, /private verticalLayoutSlack\(\): number/);
  assert.match(drawSource, /private canvasCenterY\(\): number/);
  assert.match(drawSource, /private liveStatsY\(\): number/);
  assert.match(drawSource, /private toolsY\(\): number/);
  assert.match(drawSource, /this\.scale\.height - NAV_SAFE - 70/);
  assert.match(drawSource, /private static readonly CANVAS_SQUARE = 620/);
});
