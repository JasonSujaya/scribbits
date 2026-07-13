import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledSharedRoot) {
  throw new Error('Run Gear art asset tests through scripts/run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { GEAR_CATALOG_ENTRIES } = require(
  join(compiledSharedRoot, 'cosmetics.js')
);
const appRoot = process.env.SCRIBBITS_APP_ROOT ?? process.cwd();
const assetDirectory = join(appRoot, 'src', 'client', 'assets');

const atlasSpecs = [
  {
    image: 'gear-common-atlas.png',
    json: 'gear-common-atlas.json',
    accepts: (entry) => entry.rarity === 'common',
  },
  {
    image: 'gear-rare-epic-atlas.png',
    json: 'gear-rare-epic-atlas.json',
    accepts: (entry) => entry.rarity !== 'common',
  },
];

test('generated Gear atlases cover the canonical catalog exactly once', () => {
  const expectedIds = GEAR_CATALOG_ENTRIES.map(({ id }) => id).sort();
  const actualIds = atlasSpecs
    .flatMap(({ json }) =>
      Object.keys(
        JSON.parse(readFileSync(join(assetDirectory, json), 'utf8')).frames
      )
    )
    .sort();
  assert.deepEqual(actualIds, expectedIds);
  assert.equal(new Set(actualIds).size, actualIds.length);
});

test('generated Gear frames are visible, transparent, bounded, and rarity-correct', () => {
  atlasSpecs.forEach((spec) => {
    const atlas = JSON.parse(
      readFileSync(join(assetDirectory, spec.json), 'utf8')
    );
    const image = PNG.sync.read(readFileSync(join(assetDirectory, spec.image)));
    assert.equal(atlas.meta.size.w, image.width);
    assert.equal(atlas.meta.size.h, image.height);
    assert.ok(
      image.data.some((value, index) => index % 4 === 3 && value === 0),
      `${spec.image} must contain genuine transparent pixels`
    );

    Object.entries(atlas.frames).forEach(([id, descriptor]) => {
      const entry = GEAR_CATALOG_ENTRIES.find((candidate) => candidate.id === id);
      assert.ok(entry, `${id} must exist in the canonical Gear catalog`);
      assert.equal(spec.accepts(entry), true, `${id} is in the wrong rarity atlas`);
      const { x, y, w, h } = descriptor.frame;
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0);
      assert.ok(x + w <= image.width && y + h <= image.height);
      let visiblePixelFound = false;
      for (let pixelY = y; pixelY < y + h && !visiblePixelFound; pixelY += 1) {
        for (let pixelX = x; pixelX < x + w; pixelX += 1) {
          if (image.data[(pixelY * image.width + pixelX) * 4 + 3] > 8) {
            visiblePixelFound = true;
            break;
          }
        }
      }
      assert.equal(visiblePixelFound, true, `${id} frame must contain visible art`);
    });
  });
});

test('Gear previews use generated atlas frames with a procedural safety fallback', () => {
  const source = readFileSync(
    join(appRoot, 'src', 'client', 'lib', 'cosmeticpreview.ts'),
    'utf8'
  );
  assert.match(source, /gearArtTextureForRarity\(options\.entry\.rarity\)/);
  assert.match(source, /texture\.has\(options\.entry\.id\)/);
  assert.match(source, /scene\.add\.image\(0, 0, textureKey, options\.entry\.id\)/);
  assert.match(source, /drawAccessoryGraphics\(graphics, options\.entry\.id/);
});
