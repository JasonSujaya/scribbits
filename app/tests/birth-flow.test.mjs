import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run birth flow tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const {
  skipArenaReceiptsOnce,
  stageDirectBattle,
  takeSkipArenaReceiptsOnce,
} = require(join(compiledClientRoot, 'lib', 'registry.js'));

const createScene = () => {
  const values = new Map();
  return {
    scene: {
      registry: {
        get: (key) => values.get(key),
        remove: (key) => values.delete(key),
        set: (key, value) => values.set(key, value),
      },
    },
    values,
  };
};

test('post-birth Arena receipt suppression is consumed exactly once', () => {
  const { scene } = createScene();

  assert.equal(takeSkipArenaReceiptsOnce(scene), false);
  skipArenaReceiptsOnce(scene);
  assert.equal(takeSkipArenaReceiptsOnce(scene), true);
  assert.equal(takeSkipArenaReceiptsOnce(scene), false);
});

test('direct battle staging rejects a report without the owned Scribbit', () => {
  const { scene, values } = createScene();
  const response = {
    report: {
      a: { id: 'unrelated-a' },
      b: { id: 'unrelated-b' },
    },
    founderChronicle: {},
    founderChronicleBeat: null,
  };

  assert.equal(
    stageDirectBattle(scene, undefined, response, 'newborn-scribbit'),
    null
  );
  assert.equal(values.size, 0);
});
