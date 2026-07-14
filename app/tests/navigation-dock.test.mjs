import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appDockSource = await readFile(
  new URL('../src/client/lib/appdock.ts', import.meta.url),
  'utf8'
);
const uiSource = await readFile(
  new URL('../src/client/lib/ui.ts', import.meta.url),
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
const homeSource = await readFile(
  new URL('../src/client/scenes/ScribbitHome.ts', import.meta.url),
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
  assert.match(gameSource, /import \{ Shop \} from '\.\/scenes\/Shop';/);
  assert.match(gameSource, /Gallery,\s*Shop,\s*ScoutNotebook/);
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
    /appDock\(this, this\.tab === 'collection' \? 'bag' : null/
  );
  assert.match(gallerySource, /bag: \(\) => this\.switchTab\('collection'\)/);
  assert.doesNotMatch(
    appMenuSource,
    /setGalleryTab|startScene\(scene, 'Gallery'\)/
  );
  assert.match(homeSource, /setGalleryTab\(this, 'growing'\)/);
  assert.match(homeSource, /startScene\(this, 'Gallery'\)/);
});

test('Paper icons are optically centered without moving their hit targets', () => {
  assert.match(appMenuSource, /label: translate\('appMenu\.openSettings'\)/);
  assert.doesNotMatch(appMenuSource, /settingsButton\.add\(/);
  assert.match(appMenuSource, /const SETTINGS_BUTTON_SIZE = 92;/);
  assert.match(appMenuSource, /const SETTINGS_BUTTON_RIGHT_OFFSET = 60;/);
  assert.match(
    uiSource,
    /const PAPER_ICON_OPTICAL_OFFSET_X = -4;/
  );
  assert.match(
    uiSource,
    /const PAPER_ICON_OPTICAL_OFFSET_Y = -5;/
  );
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

test('Gallery opens the owned lifecycle collection with bounded sections', () => {
  assert.match(gallerySource, /const GALLERY_CONTENT_TOP = 240;/);
  assert.match(gallerySource, /this\.buildTabs\(GALLERY_TABS_Y\)/);
  assert.match(gallerySource, /visibleLabel: 'GROWING'/);
  assert.match(gallerySource, /visibleLabel: 'MATURE'/);
  assert.match(gallerySource, /visibleLabel: 'ARCHIVED'/);
  assert.match(gallerySource, /MAX_GROWING_PER_USER/);
  assert.match(gallerySource, /MAX_MATURE_PER_USER/);
  assert.match(gallerySource, /LEGACY_BOOK_PAGE_SIZE/);
  assert.doesNotMatch(gallerySource, /fetchLegends|loadLegends/);
});

test('Scout is hidden from navigation without hiding the compact Rumble action', () => {
  assert.doesNotMatch(scoutSource, /appDock\(this, 'scout'/);
  assert.doesNotMatch(bestiarySource, /appDock\(this, 'scout'/);
  assert.match(arenaSource, /rumblePickLocked \? 'PICKED' : 'RUMBLE PICK'/);
  assert.match(arenaSource, /this\.openContenderPicker\(\)/);
});

test('dock scene transitions switch immediately without a flash effect', () => {
  assert.match(uiSource, /export function startScene\(/);
  assert.match(uiSource, /scene\.scene\.start\(key, data\)/);
  assert.doesNotMatch(uiSource, /fadeToScene|fadeSceneIn/);

  for (const sceneSource of dockSceneSources) {
    assert.doesNotMatch(sceneSource, /fadeIn\(/);
  }
});
