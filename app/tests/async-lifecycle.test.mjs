import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error('Run async lifecycle tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const lifecycle = require(
  join(compiledClientRoot, 'lib', 'arenaasynclifecycle.js')
);

test('scene mutation responses accept only the active visit', () => {
  assert.equal(
    lifecycle.planSceneMutationResponse({
      active: true,
      requestSceneEpoch: 4,
      currentSceneEpoch: 4,
    }),
    'accept'
  );
  assert.equal(
    lifecycle.planSceneMutationResponse({
      active: true,
      requestSceneEpoch: 3,
      currentSceneEpoch: 4,
    }),
    'refresh-current'
  );
  assert.equal(
    lifecycle.planSceneMutationResponse({
      active: false,
      requestSceneEpoch: 4,
      currentSceneEpoch: 4,
    }),
    'refresh-next'
  );
});

test('Arena keeps the shared scene-mutation lifecycle contract', () => {
  const response = {
    active: true,
    requestSceneEpoch: 8,
    currentSceneEpoch: 9,
  };
  assert.equal(
    lifecycle.planArenaMutationResponse(response),
    lifecycle.planSceneMutationResponse(response)
  );
});

test('Arena covers the full mutation and refresh response matrix', () => {
  const mutationCases = [
    {
      response: {
        active: true,
        requestSceneEpoch: 4,
        currentSceneEpoch: 4,
      },
      expected: 'accept',
    },
    {
      response: {
        active: false,
        requestSceneEpoch: 4,
        currentSceneEpoch: 4,
      },
      expected: 'refresh-next',
    },
    {
      response: {
        active: true,
        requestSceneEpoch: 4,
        currentSceneEpoch: 5,
      },
      expected: 'refresh-current',
    },
  ];

  for (const { response, expected } of mutationCases) {
    assert.equal(lifecycle.planArenaMutationResponse(response), expected);
  }

  const refreshCases = [
    {
      response: {
        active: true,
        requestSceneEpoch: 5,
        currentSceneEpoch: 5,
        requestEpoch: 9,
        currentRequestEpoch: 9,
      },
      expected: 'accept',
    },
    {
      response: {
        active: true,
        requestSceneEpoch: 5,
        currentSceneEpoch: 5,
        requestEpoch: 8,
        currentRequestEpoch: 9,
      },
      expected: 'ignore',
    },
    {
      response: {
        active: false,
        requestSceneEpoch: 5,
        currentSceneEpoch: 5,
        requestEpoch: 8,
        currentRequestEpoch: 9,
      },
      expected: 'refresh-next',
    },
    {
      response: {
        active: true,
        requestSceneEpoch: 5,
        currentSceneEpoch: 6,
        requestEpoch: 8,
        currentRequestEpoch: 9,
      },
      expected: 'refresh-current',
    },
  ];

  for (const { response, expected } of refreshCases) {
    assert.equal(lifecycle.planArenaRefreshResponse(response), expected);
  }
});
