import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error(
    'Run first battle Shop onboarding tests through run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const { planFirstBattleShopOnboarding } = require(
  join(compiledClientRoot, 'lib', 'firstbattleshoponboarding.js')
);
const appDockSource = await readFile(
  new URL('../src/client/lib/appdock.ts', import.meta.url),
  'utf8'
);
const appDockOnboardingSource = await readFile(
  new URL('../src/client/lib/appdockonboarding.ts', import.meta.url),
  'utf8'
);
const registrySource = await readFile(
  new URL('../src/client/lib/registry.ts', import.meta.url),
  'utf8'
);

const aliveScribbit = { id: 'first-scribbit', status: 'alive' };
const onboardingState = (overrides = {}) => ({
  hasCompletedBattle: true,
  myScribbits: [aliveScribbit],
  myInk: 5,
  nextCapsuleCost: 5,
  capsuleProgress: { pullCount: 0 },
  ...overrides,
});

test('the first completed battle recommends an affordable first chest', () => {
  assert.deepEqual(planFirstBattleShopOnboarding(onboardingState()), {
    unlockLabel: 'SHOP UNLOCKED!',
    unlockDetail: 'YOUR FIRST CHEST IS WAITING',
    recommendationLabel: 'TAP SHOP!',
    recommendationAccessibleLabel:
      'Open Shop. You have 5 Ink, enough for one 5 Ink Mystery Ink Chest.',
  });
});

test('the Shop guide waits for battle completion and sufficient Ink', () => {
  assert.equal(
    planFirstBattleShopOnboarding(
      onboardingState({ hasCompletedBattle: false })
    ),
    null
  );
  assert.equal(
    planFirstBattleShopOnboarding(onboardingState({ myInk: 4 })),
    null
  );
});

test('the Shop guide disappears after the first gacha pull', () => {
  assert.equal(
    planFirstBattleShopOnboarding(
      onboardingState({ capsuleProgress: { pullCount: 1 } })
    ),
    null
  );
});

test('only the newborn first-battle return consumes the one-shot Shop reveal', () => {
  assert.match(
    registrySource,
    /entryMode === 'birth'[\s\S]*currentArena\?\.hasCompletedBattle === false[\s\S]*FIRST_BATTLE_SHOP_UNLOCK_PENDING_KEY/
  );
  assert.match(
    registrySource,
    /function takeFirstBattleShopUnlockPending\([\s\S]*registry\.remove\(FIRST_BATTLE_SHOP_UNLOCK_PENDING_KEY\)/
  );
  assert.match(
    appDockSource,
    /active === 'home'[\s\S]*takeFirstBattleShopUnlockPending\(scene\)/
  );
});

test('the recommendation stays clickable and respects reduced motion', () => {
  assert.match(appDockOnboardingSource, /plan\.unlockLabel/);
  assert.match(appDockOnboardingSource, /plan\.recommendationLabel/);
  assert.match(
    appDockOnboardingSource,
    /const openShop = \(\): void => \{[\s\S]*onShop\(\)/
  );
  assert.match(appDockOnboardingSource, /activate: openShop/);
  assert.match(appDockOnboardingSource, /prefersReducedMotion\(\)/);
  assert.match(
    appDockOnboardingSource,
    /dataset\.firstBattleShopGuide = 'ready'/
  );
  assert.match(
    appDockOnboardingSource,
    /label: plan\.recommendationAccessibleLabel/
  );
  assert.match(appDockOnboardingSource, /data-first-shop-guide/);
});
