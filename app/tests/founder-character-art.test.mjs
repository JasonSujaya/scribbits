import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!compiledClientRoot || !compiledSharedRoot) {
  throw new Error(
    'Run founder character art tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const characterArt = require(
  join(compiledClientRoot, 'lib', 'foundercharacterart.js')
);
const founders = require(join(compiledSharedRoot, 'founders.js'));

test('every founding opponent has one authored canvas character', () => {
  const designs = characterArt.FOUNDING_CHARACTER_DESIGNS;
  const founderIds = founders.FOUNDING_SCRIBBIT_DEFINITIONS.map(
    (founder) => founder.id
  );

  assert.equal(designs.length, 20);
  assert.deepEqual(
    designs.map((design) => design.id),
    founderIds
  );
  founderIds.forEach((founderId) => {
    assert.equal(
      characterArt.getFoundingCharacterDesign(founderId)?.id,
      founderId
    );
  });
  assert.equal(characterArt.getFoundingCharacterDesign('community-art'), null);
});

test('the founding cast has twenty distinct silhouettes and palettes', () => {
  const designs = characterArt.FOUNDING_CHARACTER_DESIGNS;

  assert.equal(
    new Set(designs.map((design) => design.silhouette)).size,
    designs.length,
    'founders must not collapse back into shared blob archetypes'
  );
  assert.equal(
    new Set(
      designs.map(
        (design) => `${design.body}:${design.accent}:${design.detail}`
      )
    ).size,
    designs.length,
    'each founder needs an immediately recognizable palette'
  );
});
