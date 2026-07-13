import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
if (!compiledServerRoot) {
  throw new Error('Run splash showcase tests through scripts/run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { selectSplashCreations } = require(
  join(compiledServerRoot, 'core', 'splashShowcase.js')
);

const createScribbit = (overrides = {}) => ({
  id: overrides.id ?? 'showcase-scribbit',
  name: overrides.name ?? 'Showcase Scribbit',
  artist: overrides.artist ?? 'doodle_maker',
  imageUrl: overrides.imageUrl ?? 'https://example.com/showcase.png',
  isFounding: overrides.isFounding ?? false,
});

test('splash preserves recent community order and creator attribution', () => {
  const newestCreation = createScribbit({ id: 'newest-creation' });
  const hiddenCreation = createScribbit({ id: 'hidden-creation' });
  const nextCreation = createScribbit({ id: 'next-creation' });
  const thirdCreation = createScribbit({ id: 'third-creation' });
  const fourthCreation = createScribbit({ id: 'fourth-creation' });

  const selected = selectSplashCreations({
    recentCreations: [
      newestCreation,
      hiddenCreation,
      nextCreation,
      newestCreation,
      thirdCreation,
      fourthCreation,
    ],
    hiddenScribbitIds: new Set(['hidden-creation']),
  });

  assert.deepEqual(
    selected.map(({ id }) => id),
    ['newest-creation', 'next-creation', 'third-creation']
  );
  assert.deepEqual(Object.keys(selected[0]).sort(), [
    'artist',
    'id',
    'imageUrl',
    'name',
  ]);
  assert.equal(selected[0].artist, 'doodle_maker');
});

test('splash excludes founding placeholders and malformed community art', () => {
  const selected = selectSplashCreations({
    recentCreations: [
      createScribbit({ id: 'founding-creation', isFounding: true }),
      createScribbit({ id: 'missing-image', imageUrl: '   ' }),
      createScribbit({ id: 'missing-artist', artist: '   ' }),
    ],
    hiddenScribbitIds: new Set(),
  });

  assert.deepEqual(selected, []);
});

test('splash selector never depends on winner or Legend state', () => {
  const selected = selectSplashCreations({
    recentCreations: [
      createScribbit({ id: 'ordinary-current-creation' }),
    ],
    hiddenScribbitIds: new Set(),
  });

  assert.deepEqual(
    selected.map(({ id }) => id),
    ['ordinary-current-creation']
  );
});
