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

test('the primary dock is Arena, Bag, Draw, Battles, Shop', () => {
  const definitions = [
    "{ key: 'arena', label: 'Arena', route: 'ArenaHome' }",
    "{ key: 'bag', label: 'Bag', route: 'bag' }",
    "{ key: 'draw', label: 'Draw', route: 'dailyDraw' }",
    "{ key: 'battles', label: 'Battles', route: 'MyBattles' }",
    "{ key: 'shop', label: 'Shop', route: 'Shop' }",
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
  assert.doesNotMatch(appDockSource, /key: 'gallery'|label: 'Gallery'/);
  assert.doesNotMatch(uiSource, /'scout'/);
  assert.match(gameSource, /import \{ Shop \} from '\.\/scenes\/Shop';/);
  assert.match(gameSource, /Gallery,\s*Shop,\s*ScoutNotebook/);
});

test('Shop acquires, Bag equips, and Settings opens Gallery', () => {
  assert.match(appDockSource, /setGalleryTab\(scene, 'collection'\)/);
  assert.doesNotMatch(appDockSource, /route === 'gallery'/);
  assert.match(shopSource, /openCapsuleMachine\(this/);
  assert.match(shopSource, /embedded: true/);
  assert.doesNotMatch(gallerySource, /openCapsuleMachine|pullCapsule/);
  assert.match(gallerySource, /bagActive \? 'BAG' : 'GALLERY'/);
  assert.match(
    gallerySource,
    /appDock\(this, this\.tab === 'collection' \? 'bag' : null/
  );
  assert.match(gallerySource, /bag: \(\) => this\.switchTab\('collection'\)/);
  assert.match(appMenuSource, /label: 'Open settings and Gallery'/);
  assert.match(appMenuSource, /setGalleryTab\(scene, 'legends'\)/);
  assert.match(appMenuSource, /fadeToScene\(scene, 'Gallery'\)/);
});

test('Scout is hidden from navigation without hiding the compact Rumble action', () => {
  assert.doesNotMatch(scoutSource, /appDock\(this, 'scout'/);
  assert.doesNotMatch(bestiarySource, /appDock\(this, 'scout'/);
  assert.match(arenaSource, /rumblePickLocked \? 'PICKED' : 'RUMBLE PICK'/);
  assert.match(arenaSource, /this\.openContenderPicker\(\)/);
});
