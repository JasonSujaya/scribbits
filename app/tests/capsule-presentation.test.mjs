import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';

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
const appRoot = process.env.SCRIBBITS_APP_ROOT ?? process.cwd();

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

test('Shop visual assets load lazily from Shop instead of core preload', () => {
  const visualAssetsSource = readFileSync(
    join(appRoot, 'src', 'client', 'lib', 'visualassets.ts'),
    'utf8'
  );
  const shopSceneSource = readFileSync(
    join(appRoot, 'src', 'client', 'scenes', 'Shop.ts'),
    'utf8'
  );
  const corePreloadSource = visualAssetsSource.slice(
    visualAssetsSource.indexOf('export function preloadVisualAssets'),
    visualAssetsSource.indexOf('export function preloadShopVisualAssets')
  );
  const shopPreloadSource = visualAssetsSource.slice(
    visualAssetsSource.indexOf('export function preloadShopVisualAssets'),
    visualAssetsSource.indexOf('export function paperStage')
  );

  for (const shopAsset of [
    'scribbits-shop-stage.png',
    'scribbits-shop-chest-closed.png',
    'scribbits-shop-chest-open.png',
    'scribbits-ink-token.png',
  ]) {
    assert.doesNotMatch(
      corePreloadSource,
      new RegExp(shopAsset.replaceAll('.', '\\.'), 'u'),
      `${shopAsset} must not be part of core visual preload`
    );
    assert.match(
      shopPreloadSource,
      new RegExp(shopAsset.replaceAll('.', '\\.'), 'u'),
      `${shopAsset} must be owned by Shop visual preload`
    );
  }
  assert.match(
    shopSceneSource,
    /preload\(\): void \{[\s\S]*preloadShopVisualAssets\(this\)/
  );
  assert.ok(
    shopSceneSource.indexOf('preloadShopVisualAssets(this)') <
      shopSceneSource.indexOf('create(): void'),
    'Shop visual preload must be declared before create()'
  );
});

test('Mystery Ink uses generated closed and open chest art with honest compact controls', () => {
  const visualAssetsSource = readFileSync(
    join(appRoot, 'src', 'client', 'lib', 'visualassets.ts'),
    'utf8'
  );
  const capsuleMachineSource = readFileSync(
    join(appRoot, 'src', 'client', 'lib', 'capsulemachine.ts'),
    'utf8'
  );
  const overlaySource = readFileSync(
    join(appRoot, 'src', 'client', 'lib', 'overlay.ts'),
    'utf8'
  );
  assert.match(
    capsuleMachineSource,
    /const FEATURED_GEAR_ID = 'comet-crayon-blade'/
  );
  assert.match(capsuleMachineSource, /function createChestArt\(/);
  assert.match(capsuleMachineSource, /function shakeChest\(/);
  assert.match(capsuleMachineSource, /function openChest\(/);
  assert.match(visualAssetsSource, /scribbits-shop-chest-closed\.png/);
  assert.match(visualAssetsSource, /scribbits-shop-chest-open\.png/);
  assert.match(visualAssetsSource, /scribbits-ink-token\.png/);
  assert.match(capsuleMachineSource, /SHOP_CHEST_TEXTURES\.open/);
  assert.match(capsuleMachineSource, /SHOP_CHEST_TEXTURES\.closed/);

  const generatedChestImages = [
    'scribbits-shop-chest-closed.png',
    'scribbits-shop-chest-open.png',
  ].map((fileName) =>
    PNG.sync.read(
      readFileSync(join(appRoot, 'src', 'client', 'assets', fileName))
    )
  );
  assert.equal(
    generatedChestImages[0]?.width,
    generatedChestImages[1]?.width,
    'closed and open generated chest states must share one canvas width'
  );
  assert.equal(
    generatedChestImages[0]?.height,
    generatedChestImages[1]?.height,
    'closed and open generated chest states must share one canvas height'
  );
  for (const chestImage of generatedChestImages) {
    assert.equal(
      chestImage.data[3],
      0,
      'generated chest corners must be transparent'
    );
    assert.ok(
      chestImage.data.some((channel, index) => index % 4 === 3 && channel > 0),
      'generated chest state must retain visible artwork'
    );
  }
  const inkToken = PNG.sync.read(
    readFileSync(
      join(appRoot, 'src', 'client', 'assets', 'scribbits-ink-token.png')
    )
  );
  assert.equal(inkToken.width, 256);
  assert.equal(inkToken.height, 256);
  assert.equal(
    inkToken.data[3],
    0,
    'the Ink token must have a transparent corner'
  );
  assert.ok(
    inkToken.data.some((channel, index) => index % 4 === 3 && channel > 0),
    'the Ink token must retain visible generated artwork'
  );

  const generatedChestArtSource = capsuleMachineSource.slice(
    capsuleMachineSource.indexOf('function createChestArt('),
    capsuleMachineSource.indexOf('function highestRarity(')
  );
  assert.match(generatedChestArtSource, /scene\.add[\s\S]{0,30}\.image\(/);
  assert.doesNotMatch(
    generatedChestArtSource,
    /scene\.add\.graphics|fillRoundedRect|lidGraphics/,
    'the generated chest states must replace the old procedural chest geometry'
  );
  assert.match(capsuleMachineSource, /OPEN ×10/);
  assert.match(capsuleMachineSource, /OPEN ×1/);
  assert.match(capsuleMachineSource, /INK_TOKEN_TEXTURE/);
  assert.match(capsuleMachineSource, /10 REWARDS/);
  assert.match(capsuleMachineSource, /planCapsuleBatchReveal\(/);
  assert.doesNotMatch(capsuleMachineSource, /OPEN 100|AUTO.OPEN/);
  assert.match(overlaySource, /canvasFocusUsesKeyboard \? '1' : '0'/);
  assert.doesNotMatch(
    overlaySource,
    /addEventListener\('focus',[\s\S]{0,120}focusRing\.style\.opacity = '1'/,
    'programmatic and pointer focus must not draw the red keyboard focus box'
  );
  assert.match(capsuleMachineSource, /CAPSULE_ODDS_ACCESSIBLE_COPY/);
  assert.match(capsuleMachineSource, /CAPSULE_RARITY_PERCENTAGES\.common/);
  assert.match(capsuleMachineSource, /REDDIT/);
  assert.match(capsuleMachineSource, /COMING SOON/);
  assert.match(capsuleMachineSource, /COSMETIC ONLY/);
  assert.match(
    capsuleMachineSource,
    /reward chests containing Gear and styles/
  );
  assert.doesNotMatch(capsuleMachineSource, /open one or ten cosmetic chests/);
  assert.match(capsuleMachineSource, /prefersReducedMotion\(\)/);
  assert.doesNotMatch(
    capsuleMachineSource,
    /COLLECTION NOW/,
    'the prize card must not repeat collection progress beside its collection action'
  );
  assert.doesNotMatch(
    capsuleMachineSource,
    /STYLE TRAIT|accessoryEffect/,
    'capsule prizes should present the gear, not inactive internal trait names'
  );
  assert.match(capsuleMachineSource, /planCapsulePrizeLayout\(/);
  assert.match(capsuleMachineSource, /prizeOwnershipLabel\(pull\)/);
});
