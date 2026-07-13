import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!appRoot || !compiledServerRoot || !compiledSharedRoot) {
  throw new Error('Run equipment loadout tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const equipment = require(join(compiledSharedRoot, 'equipment.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const scribbitStore = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const createOldStoredScribbit = (overrides = {}) => ({
  id: overrides.id ?? 'loadout-scribbit',
  name: overrides.name ?? 'Gear Moth',
  artist: overrides.artist ?? 'loadout-player',
  element: overrides.element ?? 'storm',
  stats: overrides.stats ?? { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: overrides.imageUrl ?? '/api/drawing/loadout-scribbit',
  bornDay: overrides.bornDay ?? 4,
  expiresDay: overrides.expiresDay ?? 7,
  belief: 0,
  wins: 0,
  losses: 0,
  status: overrides.status ?? 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  upgrades: [],
  level: 1,
  xp: 0,
  mood: 'hungry',
  careDoneToday: [],
  legacy: null,
});

const seedOwnedScribbit = async (storage, scribbit, userId) => {
  await storage.set(
    scribbitStore.getScribbitKey(scribbit.id),
    JSON.stringify(scribbit)
  );
  await storage.set(scribbitStore.getScribbitOwnerKey(scribbit.id), userId);
};

const discoverGear = async (storage, userId, gearId) => {
  await storage.hSet(inkStore.getInventoryKey(userId), {
    [inkStore.getInventoryDiscoveryField(gearId)]: '1',
    [inkStore.getInventoryGearRankField(gearId)]: '2',
  });
};

test('old Scribbits migrate to an empty loadout and new births start empty', () => {
  const oldScribbit = createOldStoredScribbit();
  const migrated = scribbitStore.parseScribbit(JSON.stringify(oldScribbit));
  assert.deepEqual(
    migrated?.equipmentLoadout,
    equipment.createEmptyEquipmentLoadout()
  );

  const newborn = scribbitStore.createScribbit({
    id: 'new-loadout-scribbit',
    draft: {
      name: 'New Moth',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: 'loadout-player',
    imageUrl: '/api/drawing/new-loadout-scribbit',
    day: 4,
  });
  assert.deepEqual(
    newborn.equipmentLoadout,
    equipment.createEmptyEquipmentLoadout()
  );

  const clone = arena.cloneScribbit(newborn);
  assert.notEqual(clone.equipmentLoadout, newborn.equipmentLoadout);
  assert.notEqual(
    clone.equipmentLoadout.weapon,
    newborn.equipmentLoadout.weapon
  );
  assert.throws(() => {
    clone.equipmentLoadout.weapon[0] = 'tiny-sword';
  }, TypeError);
  assert.deepEqual(
    newborn.equipmentLoadout,
    equipment.createEmptyEquipmentLoadout()
  );
});

test('shared loadout projection clears a prior slot before moving Gear', () => {
  const firstLoadout = equipment.equipGearInLoadout(
    equipment.createEmptyEquipmentLoadout(),
    { category: 'weapon', slotIndex: 0, gearId: 'tiny-sword' }
  );
  const movedLoadout = equipment.equipGearInLoadout(firstLoadout, {
    category: 'weapon',
    slotIndex: 1,
    gearId: 'tiny-sword',
  });

  assert.deepEqual(firstLoadout.weapon, ['tiny-sword', null]);
  assert.deepEqual(movedLoadout.weapon, [null, 'tiny-sword']);
  assert.notEqual(movedLoadout.weapon, firstLoadout.weapon);
});

test('equip, move, and unequip update one authoritative Scribbit record', async () => {
  const memory = createMemoryStorage();
  const userId = 'loadout-player';
  const scribbit = createOldStoredScribbit();
  await seedOwnedScribbit(memory.storage, scribbit, userId);
  await discoverGear(memory.storage, userId, 'tiny-sword');

  const equipped = await scribbitStore.equipGearForScribbit(
    memory.storage,
    userId,
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 0,
      gearId: 'tiny-sword',
    }
  );
  assert.equal(equipped.status, 'updated');
  assert.deepEqual(equipped.scribbit.equipmentLoadout.weapon, [
    'tiny-sword',
    null,
  ]);
  assert.equal(
    equipped.scribbit.gearRanks['tiny-sword'],
    2,
    'equipping should snapshot the current cosmetic rank for battle presentation'
  );

  const moved = await scribbitStore.equipGearForScribbit(
    memory.storage,
    userId,
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 1,
      gearId: 'tiny-sword',
    }
  );
  assert.equal(moved.status, 'updated');
  assert.deepEqual(moved.scribbit.equipmentLoadout.weapon, [
    null,
    'tiny-sword',
  ]);
  assert.equal(moved.scribbit.gearRanks['tiny-sword'], 2);

  const unequipped = await scribbitStore.equipGearForScribbit(
    memory.storage,
    userId,
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 1,
      gearId: null,
    }
  );
  assert.equal(unequipped.status, 'updated');
  assert.deepEqual(
    unequipped.scribbit.equipmentLoadout,
    equipment.createEmptyEquipmentLoadout()
  );
  assert.equal(unequipped.scribbit.gearRanks['tiny-sword'], undefined);

  const stored = scribbitStore.parseScribbit(
    await memory.storage.get(scribbitStore.getScribbitKey(scribbit.id))
  );
  assert.deepEqual(
    stored?.equipmentLoadout,
    equipment.createEmptyEquipmentLoadout()
  );
});

test('equipment requires the living Scribbit owner and a durable Gear discovery', async () => {
  const memory = createMemoryStorage();
  const ownerUserId = 'loadout-owner';
  const scribbit = createOldStoredScribbit({ id: 'owned-loadout-scribbit' });
  await seedOwnedScribbit(memory.storage, scribbit, ownerUserId);
  await discoverGear(memory.storage, ownerUserId, 'tiny-sword');

  const wrongOwner = await scribbitStore.equipGearForScribbit(
    memory.storage,
    'different-player',
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 0,
      gearId: 'tiny-sword',
    }
  );
  assert.deepEqual(wrongOwner, { status: 'not-owned' });

  await memory.storage.hSet(inkStore.getInventoryKey(ownerUserId), {
    [inkStore.getInventoryDiscoveryField('inkquake-rumble-belt')]: 'broken',
  });
  const undiscovered = await scribbitStore.equipGearForScribbit(
    memory.storage,
    ownerUserId,
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 0,
      gearId: 'inkquake-rumble-belt',
    }
  );
  assert.deepEqual(undiscovered, { status: 'gear-undiscovered' });

  const wrongCategory = await scribbitStore.equipGearForScribbit(
    memory.storage,
    ownerUserId,
    {
      scribbitId: scribbit.id,
      category: 'armor',
      slotIndex: 0,
      gearId: 'tiny-sword',
    }
  );
  assert.deepEqual(wrongCategory, { status: 'invalid-gear' });

  const storedInventory = await memory.storage.hGetAll(
    inkStore.getInventoryKey(ownerUserId)
  );
  assert.equal(storedInventory['tiny-sword'], undefined);
  await memory.storage.hDel(inkStore.getInventoryKey(ownerUserId), [
    inkStore.getInventoryDiscoveryField('tiny-sword'),
  ]);
  const reusableDiscovery = await scribbitStore.equipGearForScribbit(
    memory.storage,
    ownerUserId,
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 0,
      gearId: 'tiny-sword',
    }
  );
  assert.equal(reusableDiscovery.status, 'updated');

  const retiredScribbit = createOldStoredScribbit({
    id: 'retired-loadout-scribbit',
    status: 'faded',
  });
  await seedOwnedScribbit(memory.storage, retiredScribbit, ownerUserId);
  const retiredResult = await scribbitStore.equipGearForScribbit(
    memory.storage,
    ownerUserId,
    {
      scribbitId: retiredScribbit.id,
      category: 'weapon',
      slotIndex: 0,
      gearId: 'tiny-sword',
    }
  );
  assert.deepEqual(retiredResult, { status: 'scribbit-unavailable' });

  const foundingScribbit = {
    ...createOldStoredScribbit({ id: 'founding-loadout-scribbit' }),
    isFounding: true,
  };
  await seedOwnedScribbit(memory.storage, foundingScribbit, ownerUserId);
  const foundingResult = await scribbitStore.equipGearForScribbit(
    memory.storage,
    ownerUserId,
    {
      scribbitId: foundingScribbit.id,
      category: 'weapon',
      slotIndex: 0,
      gearId: 'tiny-sword',
    }
  );
  assert.deepEqual(foundingResult, { status: 'scribbit-unavailable' });
});

test('equip recovers an EXEC reply loss and an exact retry stays idempotent', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  const userId = 'reply-loss-loadout-player';
  const scribbit = createOldStoredScribbit({
    id: 'reply-loss-loadout-scribbit',
  });
  await seedOwnedScribbit(memory.storage, scribbit, userId);
  await discoverGear(memory.storage, userId, 'tiny-sword');
  const request = {
    scribbitId: scribbit.id,
    category: 'weapon',
    slotIndex: 0,
    gearId: 'tiny-sword',
  };

  const recovered = await scribbitStore.equipGearForScribbit(
    memory.storage,
    userId,
    request
  );
  assert.equal(recovered.status, 'updated');
  assert.deepEqual(recovered.scribbit.equipmentLoadout.weapon, [
    'tiny-sword',
    null,
  ]);

  const retried = await scribbitStore.equipGearForScribbit(
    memory.storage,
    userId,
    request
  );
  assert.equal(retried.status, 'updated');
  assert.deepEqual(retried.scribbit.equipmentLoadout.weapon, [
    'tiny-sword',
    null,
  ]);
  assert.equal(
    Object.values(retried.scribbit.equipmentLoadout)
      .flat()
      .filter((gearId) => gearId === 'tiny-sword').length,
    1
  );
});

test('expiry retains the Scribbit embedded equipment loadout', () => {
  const livingScribbit = scribbitStore.parseScribbit(
    JSON.stringify(createOldStoredScribbit({ id: 'expiring-loadout-scribbit' }))
  );
  assert.ok(livingScribbit);
  const equippedScribbit = {
    ...livingScribbit,
    equipmentLoadout: {
      ...equipment.createEmptyEquipmentLoadout(),
      weapon: ['tiny-sword', 'inkquake-rumble-belt'],
    },
  };

  const expired = scribbitStore.resolveExpiredScribbitStatus(equippedScribbit);
  assert.equal(expired.status, 'faded');
  assert.deepEqual(expired.equipmentLoadout, equippedScribbit.equipmentLoadout);
});

test('the production API exposes the exact equip Gear route contract', async () => {
  const apiSource = await readFile(
    join(appRoot, 'src', 'server', 'routes', 'api.ts'),
    'utf8'
  );
  assert.match(apiSource, /api\.post\('\/equip-gear'/);
  assert.match(apiSource, /const readEquipGearRequest/);
  assert.match(apiSource, /return c\.json<Scribbit>\(result\.scribbit\)/);
});
