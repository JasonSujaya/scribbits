import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledClientRoot || !compiledSharedRoot) {
  throw new Error(
    'Run held weapon presentation tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const heldWeaponPresentation = require(
  join(compiledClientRoot, 'lib', 'heldweaponpresentation.js')
);
const cosmetics = require(join(compiledSharedRoot, 'cosmetics.js'));

const emptyLoadout = {
  weapon: [null, null],
  armor: [null, null],
  shoes: [null, null],
  accessory: [null, null],
};

test('an empty Weapon slot uses the role starter weapon', () => {
  assert.equal(
    heldWeaponPresentation.resolveHeldWeaponVisual({
      gearRanks: {},
      equipmentLoadout: emptyLoadout,
    }),
    null
  );
  assert.equal(
    heldWeaponPresentation.starterWeaponTextureForRole('brawler'),
    'starter-weapon-brawler'
  );
  assert.equal(
    heldWeaponPresentation.starterWeaponTextureForRole('longshot'),
    'starter-weapon-longshot'
  );
  assert.equal(
    heldWeaponPresentation.starterWeaponTextureForRole('mage'),
    'starter-weapon-mage'
  );
});

test('the combat lead Weapon replaces the starter, including rank ordering', () => {
  const heldWeapon = heldWeaponPresentation.resolveHeldWeaponVisual({
    gearRanks: {
      'tiny-sword': 1,
      'comet-crayon-blade': 4,
    },
    equipmentLoadout: {
      ...emptyLoadout,
      weapon: ['tiny-sword', 'comet-crayon-blade'],
    },
  });

  assert.deepEqual(heldWeapon, {
    gearId: 'comet-crayon-blade',
    textureKey: 'gear-art-rare-epic',
    frame: 'comet-crayon-blade',
  });
});

test('unequipping restores the starter path and Gunner remains legacy-only', () => {
  assert.equal(
    heldWeaponPresentation.resolveHeldWeaponVisual({
      gearRanks: { 'tiny-sword': 6 },
      equipmentLoadout: emptyLoadout,
    }),
    null
  );
  assert.equal(
    heldWeaponPresentation.starterWeaponTextureForRole('gunner'),
    null
  );
});

test('every catalog Weapon resolves through the shared held-weapon pipeline', () => {
  const weaponEntries = cosmetics.GEAR_CATALOG_ENTRIES.filter(
    (entry) => entry.category === 'weapon'
  );
  assert.ok(weaponEntries.length > 0);

  for (const weapon of weaponEntries) {
    const heldWeapon = heldWeaponPresentation.resolveHeldWeaponVisual({
      gearRanks: { [weapon.id]: 1 },
      equipmentLoadout: {
        ...emptyLoadout,
        weapon: [weapon.id, null],
      },
    });

    assert.deepEqual(
      heldWeapon,
      {
        gearId: weapon.id,
        textureKey:
          weapon.rarity === 'common'
            ? 'gear-art-common'
            : weapon.rarity === 'legendary'
              ? 'gear-art-legendary'
              : 'gear-art-rare-epic',
        frame: weapon.id,
      },
      `${weapon.id} must use the common held-weapon resolver`
    );
  }
});
