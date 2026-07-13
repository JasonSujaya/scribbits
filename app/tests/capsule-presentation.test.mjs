import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error(
    'Run capsule presentation tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const capsulePresentation = require(
  join(compiledClientRoot, 'lib', 'capsulepresentation.js')
);

test('Mystery Ink prize actions and red-star ownership use tested presentation plans', () => {
  const compactCapsulePrizeLayout = capsulePresentation.planCapsulePrizeLayout(
    720,
    1280,
    true
  );
  assert.deepEqual(compactCapsulePrizeLayout.viewCollection, {
    centerX: -98,
    width: 336,
    overlayX: 94,
  });
  assert.deepEqual(compactCapsulePrizeLayout.acknowledgement, {
    centerX: 178,
    width: 184,
    overlayX: 446,
  });
  assert.ok(
    compactCapsulePrizeLayout.viewCollection.overlayX +
      compactCapsulePrizeLayout.viewCollection.width <
      compactCapsulePrizeLayout.acknowledgement.overlayX,
    'prize actions must remain separated'
  );
  assert.ok(
    compactCapsulePrizeLayout.overlayY + 100 < 1280,
    'prize action overlays must remain inside the portrait canvas'
  );
  assert.equal(capsulePresentation.capsuleOpenCost(1, 5), 5);
  assert.equal(capsulePresentation.capsuleOpenCost(10, 5), 50);
  assert.throws(() => capsulePresentation.capsuleOpenCost(100, 5));
  assert.deepEqual(
    capsulePresentation.planCapsuleOpenAffordance(45, 5, 10, 1),
    {
      primaryLabel: 'RETRY 9 · 45',
      primaryAccessibleLabel:
        'Retry the remaining 9 Mystery Ink chests for 45 Ink',
      primaryEnabled: true,
      secondaryLabel: 'SAFE 1/10',
      secondaryAccessibleLabel:
        '1 of 10 Mystery Ink chests are safely recorded',
      secondaryEnabled: false,
      requiredInk: 45,
      remainingCount: 9,
      retrying: true,
    }
  );
  assert.equal(
    capsulePresentation.planCapsuleOpenAffordance(40, 5, 10, 1).primaryEnabled,
    false,
    'a partial ten-open retry must require enough Ink for only the remaining opens'
  );
  assert.throws(() =>
    capsulePresentation.planCapsuleOpenAffordance(50, 5, 10, 10)
  );
  assert.deepEqual(
    capsulePresentation.summarizeCapsuleBatch([
      { rarity: 'common', isNew: true },
      { rarity: 'rare', isNew: false },
      { rarity: 'epic', isNew: true },
    ]),
    { common: 1, rare: 1, epic: 1, newItems: 2 }
  );
  assert.equal(
    capsulePresentation.collectorRankNameForPullCount(24),
    'Curio Keeper'
  );
  assert.equal(
    capsulePresentation.prizeOwnershipLabel({
      rarity: 'common',
      kind: 'accessory',
      id: 'round-glasses',
      name: 'Round Glasses',
      description: 'Bookish circles.',
      isNew: false,
      ownedCount: 2,
      gearRank: 1,
      mergeReady: false,
    }),
    '+1 COPY · 2/3 TO FORGE'
  );
  assert.equal(
    capsulePresentation.prizeOwnershipAnnouncement({
      rarity: 'epic',
      kind: 'title',
      id: 'ink-oracle',
      name: 'Ink Oracle',
      description: 'A permanent title.',
      isNew: false,
      ownedCount: 1,
    }),
    'Already unlocked.'
  );
  assert.equal(
    capsulePresentation.prizeOwnershipLabel({
      rarity: 'epic',
      kind: 'accessory',
      id: 'dragon-wings',
      name: 'Dragon Wings',
      description: 'A special red-star gear item.',
      isNew: false,
      ownedCount: 2,
      gearRank: 6,
      mergeReady: false,
    }),
    '+1 COPY · MYTHIC RED STAR'
  );
  assert.equal(
    capsulePresentation.prizeOwnershipAnnouncement({
      rarity: 'epic',
      kind: 'accessory',
      id: 'dragon-wings',
      name: 'Dragon Wings',
      description: 'A special red-star gear item.',
      isNew: false,
      ownedCount: 2,
      gearRank: 6,
      mergeReady: false,
    }),
    'Mythic Red Star gear. Maximum special rank.'
  );
});
