import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appDockSource = await readFile(
  new URL('../src/client/lib/appdock.ts', import.meta.url),
  'utf8'
);
const appDockProgressionSource = await readFile(
  new URL('../src/client/lib/appdockprogression.ts', import.meta.url),
  'utf8'
);
const uiSource = await readFile(
  new URL('../src/client/lib/ui.ts', import.meta.url),
  'utf8'
);
const sceneNavigationSource = await readFile(
  new URL('../src/client/lib/scenenavigation.ts', import.meta.url),
  'utf8'
);
const sceneRoutesSource = await readFile(
  new URL('../src/client/lib/sceneroutes.ts', import.meta.url),
  'utf8'
);
const visualAssetsSource = await readFile(
  new URL('../src/client/lib/visualassets.ts', import.meta.url),
  'utf8'
);
const gameHtmlSource = await readFile(
  new URL('../src/client/game.html', import.meta.url),
  'utf8'
);
const gameCssSource = await readFile(
  new URL('../src/client/game.css', import.meta.url),
  'utf8'
);
const gameBootSource = await readFile(
  new URL('../src/client/lib/gameboot.ts', import.meta.url),
  'utf8'
);
const preloaderSource = await readFile(
  new URL('../src/client/scenes/Preloader.ts', import.meta.url),
  'utf8'
);
const gallerySource = await readFile(
  new URL('../src/client/scenes/Gallery.ts', import.meta.url),
  'utf8'
);
const arenaSource = await readFile(
  new URL('../src/client/scenes/ArenaHome.ts', import.meta.url),
  'utf8'
);
const scoutSource = await readFile(
  new URL('../src/client/scenes/ScoutNotebook.ts', import.meta.url),
  'utf8'
);
const bestiarySource = await readFile(
  new URL('../src/client/scenes/Bestiary.ts', import.meta.url),
  'utf8'
);
const gameSource = await readFile(
  new URL('../src/client/game.ts', import.meta.url),
  'utf8'
);
const shopSource = await readFile(
  new URL('../src/client/scenes/Shop.ts', import.meta.url),
  'utf8'
);
const appMenuSource = await readFile(
  new URL('../src/client/lib/appmenu.ts', import.meta.url),
  'utf8'
);
const privacyPopupSource = await readFile(
  new URL('../src/client/lib/privacypopup.ts', import.meta.url),
  'utf8'
);
const homeSource = await readFile(
  new URL('../src/client/scenes/ScribbitHome.ts', import.meta.url),
  'utf8'
);
const drawEligibilitySource = await readFile(
  new URL('../src/client/lib/draweligibility.ts', import.meta.url),
  'utf8'
);
const dockSceneSources = await Promise.all(
  ['ScribbitHome', 'ArenaHome', 'Gallery', 'MyBattles', 'Shop'].map(
    (sceneName) =>
      readFile(
        new URL(`../src/client/scenes/${sceneName}.ts`, import.meta.url),
        'utf8'
      )
  )
);

test('the primary dock is Arena, Bag, Home, Battles, Shop', () => {
  const definitions = [
    "{ key: 'arena', label: 'nav.arena', route: 'ArenaHome' }",
    "{ key: 'bag', label: 'nav.bag', route: 'bag' }",
    "{ key: 'home', label: 'nav.home', route: 'ScribbitHome' }",
    "{ key: 'battles', label: 'nav.battles', route: 'MyBattles' }",
    "{ key: 'shop', label: 'nav.shop', route: 'Shop' }",
  ];

  let previousIndex = -1;
  for (const definition of definitions) {
    const definitionIndex = appDockSource.indexOf(definition);
    assert.ok(
      definitionIndex > previousIndex,
      `${definition} is in dock order`
    );
    previousIndex = definitionIndex;
  }
  assert.doesNotMatch(appDockSource, /label: 'Scout'|route: 'ScoutNotebook'/);
  assert.doesNotMatch(appDockSource, /key: 'draw'|route: 'dailyDraw'/);
  assert.doesNotMatch(appDockSource, /key: 'gallery'|label: 'Gallery'/);
  assert.doesNotMatch(uiSource, /'scout'/);
  assert.doesNotMatch(gameSource, /from '\.\/scenes\/(?:Shop|Gallery|Draw)'/);
  assert.match(sceneRoutesSource, /import\('\.\.\/scenes\/Shop'\)/);
  assert.match(sceneRoutesSource, /import\('\.\.\/scenes\/Gallery'\)/);
});

test('the dock reveals Battles, Shop, then Bag and Arena through durable progression', () => {
  assert.match(appDockProgressionSource, /function isAppDockTabUnlocked\(/);
  assert.match(appDockProgressionSource, /if \(tab === 'home'\) return true/);
  assert.match(
    appDockProgressionSource,
    /!state \|\| state\.myScribbits\.length === 0\) return false/
  );
  assert.match(
    appDockProgressionSource,
    /hasOpenedMysteryInk \|\| state\.hasCompletedBattle/
  );
  assert.match(
    appDockProgressionSource,
    /state\.capsuleProgress\.pullCount > 0/
  );
  assert.match(
    appDockProgressionSource,
    /if \(tab === 'battles'\) return hasCreatedScribbit/
  );
  assert.match(
    appDockProgressionSource,
    /if \(tab === 'shop'\) return hasCompletedBattle/
  );
  assert.match(
    appDockSource,
    /const locked = !isAppDockTabUnlocked\(arena, definition\.key\)/
  );
  assert.match(appDockSource, /locked \? translate\('nav\.mystery'\)/);
  assert.match(appDockSource, /nav\.lockedUntilProgress/);
  assert.doesNotMatch(appDockSource, /nav\.lockedMystery/);
  assert.match(appDockSource, /onClick: locked[\s\S]*\? \(\) => undefined/);
  assert.match(uiSource, /locked\?: boolean/);
  assert.match(uiSource, /const isLocked = tab\.locked === true/);
  assert.match(
    uiSource,
    /const icon = isLocked[\s\S]*\? paperIcon\(scene, 'lock'[\s\S]*: paperDockIcon\(/
  );
  assert.match(uiSource, /'data-app-tab-locked': String\(isLocked\)/);
  assert.match(uiSource, /enabled: !isLocked/);
  assert.match(
    homeSource,
    /if \(this\.state\.myScribbits\.length > 0\) this\.renderGalleryButton\(\)/
  );
  assert.match(
    drawEligibilitySource,
    /if \(\(state\?\.myScribbits\.length \?\? 0\) === 0\)[\s\S]*startScene\(scene, 'ScribbitHome'\)/
  );
  assert.match(
    drawEligibilitySource,
    /if \(route === 'login'\)[\s\S]*showLoginPrompt\(\);[\s\S]*return;/
  );
});

test('Shop acquires, Bag equips, and Home opens Gallery', () => {
  assert.match(appDockSource, /setGalleryTab\(scene, 'collection'\)/);
  assert.doesNotMatch(appDockSource, /route === 'gallery'/);
  assert.match(shopSource, /openCapsuleMachine\(this/);
  assert.match(shopSource, /embedded: true/);
  assert.doesNotMatch(gallerySource, /openCapsuleMachine|pullCapsule/);
  assert.match(
    gallerySource,
    /translate\(bagActive \? 'screen\.bag' : 'screen\.gallery'\)/
  );
  assert.match(
    gallerySource,
    /appDock\(this, this\.tab === 'collection' \? 'bag' : 'home'/
  );
  assert.match(gallerySource, /bag: \(\) => this\.switchTab\('collection'\)/);
  assert.doesNotMatch(
    appMenuSource,
    /setGalleryTab|startScene\(scene, 'Gallery'\)/
  );
  assert.match(homeSource, /setGalleryTab\(this, 'growing'\)/);
  assert.match(homeSource, /startScene\(this, 'Gallery'\)/);
  assert.doesNotMatch(gallerySource, /renderDrawChargeInventory/);
  assert.doesNotMatch(gallerySource, /DRAW CHARGES|PAINT BUCKET/);
});

test('Account and data deletion have one top-level Settings home', () => {
  assert.match(appMenuSource, /openPrivacyPopup\(/);
  assert.match(appMenuSource, /translate\('appMenu\.account'\)/);
  assert.match(privacyPopupSource, /'ACCOUNT'/);
  assert.doesNotMatch(bestiarySource, /'privacy'|PRIVACY & DATA|deleteMyData/);
  assert.match(privacyPopupSource, /export function openPrivacyPopup\(/);
  assert.match(
    privacyPopupSource,
    /label: 'Delete all my stored game data',[\s\S]*?pointerPassthrough: true,[\s\S]*?onActivate: deleteStoredPlayerData/,
    'pointer input must reach only the canvas action so one tap cannot bypass confirmation'
  );
});

test('the active dock destination is a full high-contrast paper chip', () => {
  assert.match(uiSource, /function activeDockTabChip\(/);
  assert.match(
    uiSource,
    /activeDockTabChip\(scene, slotWidth - 14, barHeight - 26\)/
  );
  assert.match(uiSource, /isActive \? UI\.creamHex : UI\.inkHex/);
  assert.match(
    uiSource,
    /isActive \? UI\.cream : isLocked \? UI\.inkSoft : UI\.ink/
  );
  assert.doesNotMatch(uiSource, /function waxSeal\(/);
});

test('Paper icons are optically centered without moving their hit targets', () => {
  assert.match(appMenuSource, /label: translate\('appMenu\.openSettings'\)/);
  assert.doesNotMatch(appMenuSource, /settingsButton\.add\(/);
  assert.match(appMenuSource, /const SETTINGS_BUTTON_SIZE = 92;/);
  assert.match(appMenuSource, /const SETTINGS_BUTTON_RIGHT_OFFSET = 60;/);
  assert.match(uiSource, /const PAPER_ICON_OPTICAL_OFFSET_X = -4;/);
  assert.match(uiSource, /const PAPER_ICON_OPTICAL_OFFSET_Y = -5;/);
  assert.match(appMenuSource, /width - SETTINGS_BUTTON_RIGHT_OFFSET/);
  assert.match(
    appMenuSource,
    /x: width - SETTINGS_BUTTON_RIGHT_OFFSET - SETTINGS_HIT_SIZE \/ 2/
  );
  assert.match(
    uiSource,
    /options\.iconOffsetX \?\? PAPER_ICON_OPTICAL_OFFSET_X/
  );
  assert.match(
    uiSource,
    /options\.iconOffsetY \?\? PAPER_ICON_OPTICAL_OFFSET_Y/
  );
});

test('Gallery has a matched top-left back button to Home', () => {
  assert.match(appMenuSource, /const BACK_BUTTON_LEFT_OFFSET = 60;/);
  assert.match(
    appMenuSource,
    /options\.back[\s\S]*paperIconButton\([\s\S]*'back'[\s\S]*SETTINGS_BUTTON_SIZE/
  );
  assert.match(
    appMenuSource,
    /label: options\.back\.label[\s\S]*onActivate: options\.back\.onActivate/
  );
  assert.match(
    gallerySource,
    /this\.tab === 'collection'[\s\S]*back: {[\s\S]*translate\('gallery\.backToHome'\)[\s\S]*startScene\(this, 'ScribbitHome'\)/
  );
});

test('narrow icon buttons wrap labels before centering their content', () => {
  const wrapIndex = uiSource.indexOf(
    'textLabel.setWordWrapWidth(maximumTextWidth)'
  );
  const measureIndex = uiSource.indexOf(
    'const textWidth = Math.min(maximumTextWidth, textLabel.width)'
  );
  const positionIndex = uiSource.indexOf('iconGap + textWidth / 2');

  assert.ok(wrapIndex >= 0, 'icon button labels should have a bounded width');
  assert.ok(
    measureIndex > wrapIndex,
    'wrapped text should be measured before positioning the icon and label'
  );
  assert.ok(
    positionIndex > measureIndex,
    'the centered content row should use the wrapped label width'
  );
  assert.match(
    uiSource,
    /setIconButtonLabel[\s\S]{0,240}layoutIconButtonContent\(layout\)/
  );
});

test('Gallery opens the owned lifecycle collection with bounded sections', () => {
  assert.match(gallerySource, /const GALLERY_CONTENT_TOP = 240;/);
  assert.match(gallerySource, /this\.buildTabs\(GALLERY_TABS_Y\)/);
  assert.match(gallerySource, /visibleLabel: 'GROWING'/);
  assert.match(gallerySource, /visibleLabel: 'MATURE'/);
  assert.match(gallerySource, /visibleLabel: 'RETIRED'/);
  assert.match(gallerySource, /MAX_GROWING_PER_USER/);
  assert.match(gallerySource, /MAX_MATURE_PER_USER/);
  assert.match(gallerySource, /LEGACY_BOOK_PAGE_SIZE/);
  assert.doesNotMatch(gallerySource, /fetchLegends|loadLegends/);
});

test('Scout and the retired compact Rumble action stay out of navigation', () => {
  assert.doesNotMatch(scoutSource, /appDock\(this, 'scout'/);
  assert.doesNotMatch(bestiarySource, /appDock\(this, 'scout'/);
  assert.doesNotMatch(
    arenaSource,
    /rumblePickLocked \? 'PICKED' : 'MAKE PICK'/
  );
  assert.match(arenaSource, /this\.openContenderPicker\(\)/);
});

test('the primary play loop is fully prepared before Home is revealed', () => {
  assert.match(uiSource, /export \{ startScene \} from '\.\/scenenavigation'/);
  assert.match(
    sceneRoutesSource,
    /PRIMARY_PRELOAD_SCENE_KEYS = LAZY_SCENE_KEYS/
  );
  for (const sceneName of [
    'ScribbitHome',
    'ArenaHome',
    'Draw',
    'Replay',
    'MyBattles',
    'BattleHistory',
    'Gallery',
    'Shop',
    'ScoutNotebook',
    'Bestiary',
  ]) {
    assert.match(sceneRoutesSource, new RegExp(`'${sceneName}'`));
  }
  assert.match(
    preloaderSource,
    /const arenaRequest = fetchArena\(\)[\s\S]*Promise\.all\(\[\s*arenaRequest,\s*this\.preparePrimaryGame\(\)/
  );
  assert.match(
    preloaderSource,
    /preparePrimaryScenes\([\s\S]{0,120}setGameBootProgress\('code', progress\)/
  );
  assert.match(preloaderSource, /preloadPrimaryNavigationVisualAssets\(this\)/);
  assert.match(preloaderSource, /primaryNavigationVisualAssetsReady\(this\)/);
  assert.match(preloaderSource, /dataset\.primaryPreload = 'ready'/);
  assert.match(preloaderSource, /this\.load\.on\('progress', reportProgress\)/);
  assert.match(preloaderSource, /setGameBootProgress\('arena', 1\)/);
  assert.match(gameHtmlSource, /id="game-boot-progress"/);
  assert.match(gameHtmlSource, /id="game-boot-tip"/);
  assert.match(gameHtmlSource, /id="game-boot-retry"/);
  assert.match(gameBootSource, /BOOT_SEGMENT_WEIGHTS/);
  assert.match(gameBootSource, /startGameBootTips/);
  assert.match(gameBootSource, /retryHandler\?\.\(\)/);
  assert.match(
    visualAssetsSource,
    /preloadHomeVisualAssets\(scene\)[\s\S]*preloadDrawVisualAssets\(scene\)[\s\S]*preloadReplayVisualAssets\(scene, false\)[\s\S]*preloadShopVisualAssets\(scene\)/
  );
  assert.doesNotMatch(
    sceneNavigationSource,
    /requestIdleCallback|prefetchVisual/
  );
  assert.match(
    sceneNavigationSource,
    /if \(!sceneVisualAssetsReady\(game, key\)\)[\s\S]*transitionVisible = true/
  );
  assert.match(
    sceneNavigationSource,
    /if \(transitionVisible\) hideAfterFirstRender[\s\S]*else hideTransition/
  );
  assert.match(sceneNavigationSource, /game\.scene\.start\(key, data\)/);
  assert.match(gameHtmlSource, /id="scene-transition-status"/);
  assert.match(
    gameCssSource,
    /\.scene-transition-status\[data-stage='assets'\][\s\S]*background:/
  );

  for (const sceneSource of dockSceneSources) {
    assert.doesNotMatch(sceneSource, /fadeIn\(/);
  }
});
