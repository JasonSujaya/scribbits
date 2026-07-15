import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error(
    'Run app dock progression tests through run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const { isAppDockTabUnlocked } = require(
  join(compiledClientRoot, 'lib', 'appdockprogression.js')
);

const tabs = ['arena', 'bag', 'home', 'battles', 'shop'];

const unlockedTabs = (state) =>
  tabs.filter((tab) => isAppDockTabUnlocked(state, tab));

const progressionState = ({
  hasScribbit = true,
  hasCreatedScribbit = false,
  hasCompletedBattle = false,
  pullCount = 0,
} = {}) => ({
  hasCreatedScribbit,
  hasCompletedBattle,
  myScribbits: hasScribbit ? [{}] : [],
  capsuleProgress: { pullCount },
});

test('only Home is available before the first Scribbit is drawn', () => {
  assert.deepEqual(unlockedTabs(undefined), ['home']);
  assert.deepEqual(
    unlockedTabs(
      progressionState({
        hasScribbit: false,
        hasCreatedScribbit: true,
        hasCompletedBattle: true,
        pullCount: 1,
      })
    ),
    ['home']
  );
});

test('the first draw reveals Battles', () => {
  assert.deepEqual(
    unlockedTabs(progressionState({ hasCreatedScribbit: true })),
    ['home', 'battles']
  );
});

test('the first completed battle reveals Shop', () => {
  assert.deepEqual(
    unlockedTabs(
      progressionState({
        hasCreatedScribbit: true,
        hasCompletedBattle: true,
      })
    ),
    ['home', 'battles', 'shop']
  );
});

test('the first Mystery Ink pull reveals Bag and Arena', () => {
  assert.deepEqual(unlockedTabs(progressionState({ pullCount: 1 })), tabs);
});
