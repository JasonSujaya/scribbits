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
  assert.equal(capsulePresentation.capsuleOpenCost(1, 2), 2);
  assert.equal(capsulePresentation.capsuleOpenCost(10, 2), 65);
  assert.throws(() => capsulePresentation.capsuleOpenCost(100, 2));
  assert.deepEqual(
    capsulePresentation.planCapsuleOpenAffordance(58, 2, 10, 1),
    {
      primaryLabel: 'RETRY 9 · 58',
      primaryAccessibleLabel:
        'Retry the remaining 9 Mystery Ink chests for 58 Ink',
      primaryEnabled: true,
      secondaryLabel: 'SAFE 1/10',
      secondaryAccessibleLabel:
        '1 of 10 Mystery Ink chests are safely recorded',
      secondaryEnabled: false,
      requiredInk: 58,
      remainingCount: 9,
      retrying: true,
    }
  );
  assert.equal(
    capsulePresentation.planCapsuleOpenAffordance(57, 2, 10, 1).primaryEnabled,
    false,
    'a partial ten-open retry must require enough Ink for only the remaining opens'
  );
  assert.throws(() =>
    capsulePresentation.planCapsuleOpenAffordance(20, 2, 10, 10)
  );
  assert.deepEqual(
    capsulePresentation.summarizeCapsuleBatch([
      { rarity: 'common', isNew: true },
      { rarity: 'rare', isNew: false },
      { rarity: 'epic', isNew: true },
      { rarity: 'legendary', isNew: false },
    ]),
    { common: 1, rare: 1, epic: 1, legendary: 1, newItems: 2 }
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

test('Shop owns its visual asset manifest and checks readiness before rendering', () => {
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
    'scribbits-shop-stage.webp',
    'scribbits-shop-claw-machine-shell.webp',
    'scribbits-shop-capsule-shell.png',
    'scribbits-shop-chest-closed.webp',
    'scribbits-shop-chest-open.webp',
    'scribbits-ink-token.webp',
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
  assert.match(
    shopSceneSource,
    /if \(!shopVisualAssetsReady\(this\)\) \{[\s\S]{0,120}retryShopVisualAssets\(\)/,
    'Shop must not render missing Phaser textures'
  );
  assert.match(
    shopSceneSource,
    /preloadShopVisualAssets\(this\);[\s\S]{0,80}this\.load\.start\(\)/,
    'Shop must retry a stale or failed asset load'
  );
  assert.match(visualAssetsSource, /const SHOP_ARCADE_COLORS = \{/);
  assert.match(visualAssetsSource, /function drawShopArcadeCabinet\(/);
  assert.match(visualAssetsSource, /function drawShopArcadeTicket\(/);
  assert.match(visualAssetsSource, /const checkerSize = 72;/);
  assert.match(
    visualAssetsSource,
    /export function shopStage\([\s\S]*Phaser\.GameObjects\.Container/,
    'Shop must compose its responsive arcade backdrop at runtime'
  );
});

test('Mystery Ink uses generated reward art and a transparent animated claw machine', () => {
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
  assert.match(visualAssetsSource, /scribbits-shop-chest-closed\.webp/);
  assert.match(visualAssetsSource, /scribbits-shop-chest-open\.webp/);
  assert.match(visualAssetsSource, /scribbits-shop-claw-machine-shell\.webp/);
  assert.match(visualAssetsSource, /scribbits-shop-capsule-shell\.png/);
  assert.doesNotMatch(visualAssetsSource, /scribbits-shop-lottery-machine/);
  assert.match(visualAssetsSource, /scribbits-ink-token\.webp/);
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
  assert.match(capsuleMachineSource, /TAKE 10/);
  assert.match(capsuleMachineSource, /OPEN CHEST/);
  assert.match(capsuleMachineSource, /function createClawMachine\(/);
  assert.match(capsuleMachineSource, /SHOP_CLAW_MACHINE_SHELL_TEXTURE/);
  assert.match(
    capsuleMachineSource,
    /image\(0, 0, SHOP_CLAW_MACHINE_SHELL_TEXTURE\)[\s\S]{0,60}setDisplaySize\(620, 930\)/,
    'the generated shell must frame the live claw content without baking it in'
  );
  assert.match(
    capsuleMachineSource,
    /const CLAW_MACHINE_SCALE = 0\.96;/,
    'the claw machine must leave a quiet margin around the Shop hero'
  );
  const clawMachineSource = capsuleMachineSource.slice(
    capsuleMachineSource.indexOf('function createClawMachine('),
    capsuleMachineSource.indexOf('export function openCapsuleMachine(')
  );
  assert.doesNotMatch(
    clawMachineSource,
    /cabinetBack|cabinetFront|fillRoundedRect/,
    'the generated cabinet shell must replace the old procedural box geometry'
  );
  assert.match(
    capsuleMachineSource,
    /const useClawMachine = opts\.embedded === true;/,
    'the embedded Shop must keep the claw machine after the first pull'
  );
  assert.match(
    capsuleMachineSource,
    /const clawMachine = useClawMachine[\s\S]{0,120}createClawMachine\(/,
    'returning to Shop must not fall back to the chest presentation'
  );
  assert.match(capsuleMachineSource, /FIRST GEAR CLAW/);
  assert.match(capsuleMachineSource, /MYSTERY GEAR CLAW/);
  assert.match(
    capsuleMachineSource,
    /const heading = label\([\s\S]{0,180}\.setStroke\(UI\.ink, 6\)/,
    'the claw heading must stay readable without overpowering the marquee'
  );
  assert.match(
    capsuleMachineSource,
    /const message = label\([\s\S]{0,180}\.setStroke\(UI\.ink, 4\)/,
    'the changing claw status must stay readable without crowding the awning'
  );
  assert.match(capsuleMachineSource, /-350,/);
  assert.match(capsuleMachineSource, /-312,/);
  assert.match(capsuleMachineSource, /TAKE 1 OR TAKE 10/);
  assert.match(capsuleMachineSource, /'TAKE 1'/);
  assert.match(capsuleMachineSource, /Take 10 Mystery Gear capsules/);
  assert.match(capsuleMachineSource, /const CLAW_CHOICE_WIDTH = 180/);
  assert.match(capsuleMachineSource, /const CLAW_CHOICE_X_OFFSET = 100/);
  assert.match(capsuleMachineSource, /const CLAW_CHOICE_HEIGHT = 92/);
  assert.match(
    capsuleMachineSource,
    /const takeOneButton = createInkOpenButton/
  );
  assert.match(capsuleMachineSource, /CLAW_MACHINE_SAMPLE_IDS/);
  assert.match(capsuleMachineSource, /const EMPTY_CAPSULE_POSITIONS = \[/);
  assert.match(capsuleMachineSource, /EMPTY_CAPSULE_POSITIONS\.forEach/);
  assert.match(capsuleMachineSource, /SHOP_CAPSULE_SHELL_TEXTURE/);
  assert.match(
    capsuleMachineSource,
    /bringToTop\(inkWallet\.container\)/,
    'the Ink balance must render in front of the claw-machine marquee'
  );
  assert.match(capsuleMachineSource, /renderCosmeticPreview\(\{/);
  assert.match(capsuleMachineSource, /Take one capsule from the First Gear/);
  assert.match(
    capsuleMachineSource,
    /visible Gear are possible examples, not a prediction/
  );
  assert.match(capsuleMachineSource, /function startClawSearch\(/);
  assert.match(capsuleMachineSource, /function startClawIdle\(/);
  assert.match(capsuleMachineSource, /const CLAW_RAIL_Y = -198/);
  assert.match(
    capsuleMachineSource,
    /rectangle\(0, CLAW_RAIL_Y, 350, 12[\s\S]{0,220}container\(homeX, CLAW_RAIL_Y\)/,
    'the moving carriage must stay centered on its visible rail'
  );
  const clawIdleSource = capsuleMachineSource.slice(
    capsuleMachineSource.indexOf('function startClawIdle('),
    capsuleMachineSource.indexOf('function startClawSearch(')
  );
  assert.doesNotMatch(
    clawIdleSource,
    /targets: machine\.(?:cable|clawHead)/,
    'idle motion must not stretch or detach the cable from its rail'
  );
  assert.match(capsuleMachineSource, /allowsAmbientMotion\(\)/);
  assert.match(capsuleMachineSource, /stopClawIdle\?\.\(\)/);
  assert.match(capsuleMachineSource, /burstClawGrabSparks\(/);
  assert.match(capsuleMachineSource, /function animateClawCatch\(/);
  assert.match(capsuleMachineSource, /COSMETIC_BY_ID\.get\(pull\.id\)/);
  assert.match(capsuleMachineSource, /function resetClawMachine\(/);
  assert.ok(
    capsuleMachineSource.indexOf(
      'await animateClawCatch(scene, clawMachine, result.pull)'
    ) > capsuleMachineSource.indexOf("if ('error' in result)"),
    'the claw must catch only the authoritative reward after success'
  );
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
