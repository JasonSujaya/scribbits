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
  assert.match(appMenuSource, /label: translate\('appMenu\.openSettings'\)/);
  assert.match(
    appMenuSource,
    /settingsButton\.add\([\s\S]*translate\('appMenu\.title'\)/
  );
  assert.doesNotMatch(
    appMenuSource,
    /setGalleryTab|startScene\(scene, 'Gallery'\)/
  );
  assert.match(homeSource, /setGalleryTab\(this, 'legends'\)/);
  assert.match(homeSource, /startScene\(this, 'Gallery'\)/);
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
