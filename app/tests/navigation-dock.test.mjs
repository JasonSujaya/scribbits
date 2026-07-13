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

test('the primary dock is Arena, Bag, Draw, Battles, Gallery', () => {
  const definitions = [
    "{ key: 'arena', label: 'Arena', route: 'ArenaHome' }",
    "{ key: 'bag', label: 'Bag', route: 'bag' }",
    "{ key: 'draw', label: 'Draw', route: 'dailyDraw' }",
    "{ key: 'battles', label: 'Battles', route: 'MyBattles' }",
    "{ key: 'gallery', label: 'Gallery', route: 'gallery' }",
  ];

  let previousIndex = -1;
  for (const definition of definitions) {
    const definitionIndex = appDockSource.indexOf(definition);
    assert.ok(definitionIndex > previousIndex, `${definition} is in dock order`);
    previousIndex = definitionIndex;
  }
  assert.doesNotMatch(appDockSource, /label: 'Scout'|route: 'ScoutNotebook'/);
  assert.doesNotMatch(uiSource, /'scout'/);
});

test('Bag and Gallery open distinct sections of the shared gallery scene', () => {
  assert.match(
    appDockSource,
    /route === 'bag' \? 'collection' : 'legends'/
  );
  assert.match(gallerySource, /bagActive \? 'BAG' : 'GALLERY'/);
  assert.match(
    gallerySource,
    /appDock\(this, this\.tab === 'collection' \? 'bag' : 'gallery'/
  );
  assert.match(gallerySource, /bag: \(\) => this\.switchTab\('collection'\)/);
  assert.match(gallerySource, /gallery: \(\) => this\.switchTab\('legends'\)/);
});

test('Scout is hidden from navigation without hiding the Rumble Pick', () => {
  assert.doesNotMatch(scoutSource, /appDock\(this, 'scout'/);
  assert.doesNotMatch(bestiarySource, /appDock\(this, 'scout'/);
  assert.match(arenaSource, /rumblePickLocked \? 'PICK LOCKED' : 'RUMBLE PICK'/);
  assert.match(arenaSource, /this\.openContenderPicker\(\)/);
});
