import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error(
    'Run first chest trail tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const firstChestTrail = require(
  join(compiledClientRoot, 'lib', 'firstchesttrail.js')
);

const makeScribbit = () => ({
  id: 'first-scribbit',
  name: 'Crater Pal',
  status: 'alive',
});

const completedRun = { status: 'complete' };

test('a fresh completed run never invents Ink for the first chest', () => {
  assert.equal(
    firstChestTrail.planFirstChestTrailEntry({
      isFreshResult: true,
      rivalRun: completedRun,
      scribbit: makeScribbit(),
      ink: 2,
      chestCost: 5,
      capsulePullCount: 0,
    }),
    null
  );
});

test('the trail opens Shop only when the committed balance covers the chest', () => {
  const insufficientStep = firstChestTrail.planFirstChestTrailStep({
    scribbit: makeScribbit(),
    ink: 4,
    chestCost: 5,
    capsulePullCount: 0,
  });
  assert.equal(insufficientStep, null);

  assert.deepEqual(
    firstChestTrail.planFirstChestTrailStep({
      scribbit: makeScribbit(),
      ink: 5,
      chestCost: 5,
      capsulePullCount: 0,
    }),
    {
      kind: 'shop',
      label: 'OPEN FIRST CHEST',
      accessibleLabel:
        'Open Shop. You have 5 Ink, enough for one 5 Ink Mystery Ink Chest.',
      statusLabel: 'CHEST READY • 5/5 INK',
      ink: 5,
      inkNeeded: 0,
    }
  );
});

test('the trail never invents unreachable Ink or repeats after a chest', () => {
  assert.equal(
    firstChestTrail.planFirstChestTrailStep({
      scribbit: makeScribbit(),
      ink: 2,
      chestCost: 5,
      capsulePullCount: 0,
    }),
    null
  );
  assert.equal(
    firstChestTrail.planFirstChestTrailStep({
      scribbit: makeScribbit(),
      ink: 5,
      chestCost: 5,
      capsulePullCount: 1,
    }),
    null
  );
});

test('saved and unfinished Rival Runs retain their normal actions', () => {
  const baseInput = {
    scribbit: makeScribbit(),
    ink: 2,
    chestCost: 5,
    capsulePullCount: 0,
  };
  assert.equal(
    firstChestTrail.planFirstChestTrailEntry({
      ...baseInput,
      isFreshResult: false,
      rivalRun: completedRun,
    }),
    null
  );
  assert.equal(
    firstChestTrail.planFirstChestTrailEntry({
      ...baseInput,
      isFreshResult: true,
      rivalRun: { status: 'active' },
    }),
    null
  );
});
