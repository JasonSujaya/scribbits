import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run replay eligibility tests through run-test-suites.mjs.');
}
const require = createRequire(import.meta.url);
const { planReplayPostFightEligibility } = require(
  join(compiledClientRoot, 'lib', 'replaypostfighteligibility.js')
);

const cases = [
  {
    name: 'practice result never leaks live Arena actions',
    input: {
      reportKind: 'practice',
      entryMode: 'fresh',
      ownedFighterAlive: true,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: false, canPickRumble: false },
  },
  {
    name: 'saved exhibition win has no live follow-up actions',
    input: {
      reportKind: 'exhibition',
      entryMode: 'saved',
      ownedFighterAlive: true,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: false, canPickRumble: false },
  },
  {
    name: 'saved exhibition loss has no live follow-up actions',
    input: {
      reportKind: 'exhibition',
      entryMode: 'saved',
      ownedFighterAlive: true,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: false, canPickRumble: false },
  },
  {
    name: 'birth exhibition returns to Arena before deeper battle choices',
    input: {
      reportKind: 'exhibition',
      entryMode: 'birth',
      ownedFighterAlive: true,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: false, canPickRumble: false },
  },
  {
    name: 'fresh exhibition with a living owned fighter offers both eligible actions',
    input: {
      reportKind: 'exhibition',
      entryMode: 'fresh',
      ownedFighterAlive: true,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: true, canPickRumble: true },
  },
  {
    name: 'fresh boss result cannot offer Rival',
    input: {
      reportKind: 'boss',
      entryMode: 'fresh',
      ownedFighterAlive: true,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: false, canPickRumble: true },
  },
  {
    name: 'fresh Rumble result cannot offer Rival',
    input: {
      reportKind: 'rumble',
      entryMode: 'fresh',
      ownedFighterAlive: true,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: false, canPickRumble: true },
  },
  {
    name: 'unavailable owned fighter cannot offer Rival',
    input: {
      reportKind: 'exhibition',
      entryMode: 'fresh',
      ownedFighterAlive: false,
      hasBackedScribbit: false,
    },
    expected: { canChooseRival: false, canPickRumble: true },
  },
  {
    name: 'locked Rumble pick cannot offer another pick',
    input: {
      reportKind: 'exhibition',
      entryMode: 'fresh',
      ownedFighterAlive: true,
      hasBackedScribbit: true,
    },
    expected: { canChooseRival: true, canPickRumble: false },
  },
];

test('post-fight eligibility separates saved replay history from fresh actions', () => {
  for (const scenario of cases) {
    const plan = planReplayPostFightEligibility(scenario.input);

    assert.deepEqual(plan, scenario.expected, scenario.name);
    assert.equal(Object.isFrozen(plan), true, scenario.name);
  }
});
