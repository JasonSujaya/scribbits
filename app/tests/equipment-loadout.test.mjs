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

const serializeV3EquippedScribbit = (scribbit, gearId, rank) =>
  JSON.stringify({
    ...JSON.parse(
      scribbitStore.serializeScribbit({
        ...scribbit,
        equipmentLoadout: {
          ...equipment.createEmptyEquipmentLoadout(),
          weapon: [gearId, null],
        },
        gearRanks: { [gearId]: rank },
      })
    ),
    schemaVersion: 3,
    gearRanks: { [gearId]: rank },
  });

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

test('living Scribbits derive reusable Gear rank from inventory', async () => {
  const memory = createMemoryStorage();
  const userId = 'forge-rank-player';
  await discoverGear(memory.storage, userId, 'tiny-sword');
  const createEquippedScribbit = async (id) => {
    const scribbit = scribbitStore.createScribbit({
      id,
      draft: {
        name: id,
        element: 'storm',
        stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
        accessories: [],
      },
      artist: userId,
      imageUrl: `/api/drawing/${id}`,
      day: 4,
    });
    await scribbitStore.storeScribbit(memory.storage, userId, scribbit);
    const equipped = await scribbitStore.equipGearForScribbit(
      memory.storage,
      userId,
      {
        scribbitId: id,
        category: 'weapon',
        slotIndex: 0,
        gearId: 'tiny-sword',
      }
    );
    assert.equal(equipped.status, 'updated');
  };
  await createEquippedScribbit('forge-rank-one');
  await createEquippedScribbit('forge-rank-two');

  await memory.storage.hSet(inkStore.getInventoryKey(userId), {
    [inkStore.getInventoryGearRankField('tiny-sword')]: '3',
  });

  for (const scribbitId of ['forge-rank-one', 'forge-rank-two']) {
    const refreshed = await scribbitStore.loadScribbit(
      memory.storage,
      scribbitId
    );
    assert.equal(refreshed?.gearRanks['tiny-sword'], 3);
    const stored = JSON.parse(
      await memory.storage.get(scribbitStore.getScribbitKey(scribbitId))
    );
    assert.equal(
      stored?.gearRanks['tiny-sword'],
      undefined,
      'living records must not copy reusable rank out of inventory'
    );
  }
});

test('returning-player migration rewrites living v3 records exactly once', async () => {
  const memory = createMemoryStorage();
  const userId = 'returning-v3-player';
  const scribbit = scribbitStore.createScribbit({
    id: 'returning-v3-scribbit',
    draft: {
      name: 'Old Gear Moth',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: userId,
    imageUrl: '/api/drawing/returning-v3-scribbit',
    day: 4,
  });
  const v3Bytes = serializeV3EquippedScribbit(scribbit, 'tiny-sword', 3);
  await memory.storage.set(scribbitStore.getScribbitKey(scribbit.id), v3Bytes);
  await memory.storage.set(
    scribbitStore.getScribbitOwnerKey(scribbit.id),
    userId
  );
  await memory.storage.zAdd(scribbitStore.getUserAliveScribbitsKey(userId), {
    member: scribbit.id,
    score: scribbit.bornDay,
  });
  await memory.storage.hSet(inkStore.getInventoryKey(userId), {
    'tiny-sword': '7',
    [inkStore.getInventoryDiscoveryField('tiny-sword')]: '1',
  });

  assert.equal(
    await scribbitStore.migrateLivingScribbitsForUser(memory.storage, userId),
    1
  );
  assert.equal(
    await scribbitStore.migrateLivingScribbitsForUser(memory.storage, userId),
    0
  );
  const migratedRecord = JSON.parse(
    await memory.storage.get(scribbitStore.getScribbitKey(scribbit.id))
  );
  assert.equal(migratedRecord.schemaVersion, 4);
  assert.deepEqual(migratedRecord.gearRanks, {});
  assert.deepEqual(migratedRecord.equipmentLoadout.weapon, [
    'tiny-sword',
    null,
  ]);
  assert.equal(
    await memory.storage.hGet(
      inkStore.getInventoryKey(userId),
      inkStore.getInventoryGearRankField('tiny-sword')
    ),
    '3',
    'the v3 reusable rank must be promoted before its Scribbit copy is removed'
  );
  assert.equal(
    await memory.storage.hGet(inkStore.getInventoryKey(userId), 'tiny-sword'),
    '7',
    'rank migration must not spend or mint Forge copies'
  );
  const hydrated = await scribbitStore.loadScribbit(
    memory.storage,
    scribbit.id
  );
  assert.equal(hydrated?.gearRanks['tiny-sword'], 3);
});

test('v4 migration preserves a higher concurrent inventory rank', async () => {
  const memory = createMemoryStorage();
  const userId = 'migration-rank-race-player';
  const scribbit = scribbitStore.createScribbit({
    id: 'migration-rank-race-scribbit',
    draft: {
      name: 'Rank Race',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: userId,
    imageUrl: '/api/drawing/migration-rank-race-scribbit',
    day: 4,
  });
  const scribbitKey = scribbitStore.getScribbitKey(scribbit.id);
  const inventoryKey = inkStore.getInventoryKey(userId);
  const rankField = inkStore.getInventoryGearRankField('tiny-sword');
  await memory.storage.set(
    scribbitKey,
    serializeV3EquippedScribbit(scribbit, 'tiny-sword', 3)
  );
  await memory.storage.set(scribbitStore.getScribbitOwnerKey(scribbit.id), userId);
  await memory.storage.zAdd(scribbitStore.getUserAliveScribbitsKey(userId), {
    member: scribbit.id,
    score: scribbit.bornDay,
  });

  const originalWatch = memory.storage.watch.bind(memory.storage);
  let higherRankInjected = false;
  memory.storage.watch = async (...keys) => {
    const transaction = await originalWatch(...keys);
    if (!higherRankInjected && keys.includes(scribbitKey)) {
      const executeTransaction = transaction.exec.bind(transaction);
      transaction.exec = async () => {
        higherRankInjected = true;
        await memory.storage.hSet(inventoryKey, { [rankField]: '4' });
        return await executeTransaction();
      };
    }
    return transaction;
  };

  assert.equal(
    await scribbitStore.migrateLivingScribbitsForUser(memory.storage, userId),
    1
  );
  assert.equal(higherRankInjected, true);
  assert.equal(await memory.storage.hGet(inventoryKey, rankField), '4');
  assert.equal(
    (await scribbitStore.loadScribbit(memory.storage, scribbit.id))?.gearRanks[
      'tiny-sword'
    ],
    4
  );
});

test('direct equip promotes v3 rank before rewriting the Scribbit', async () => {
  const memory = createMemoryStorage();
  const userId = 'direct-equip-migration-player';
  const scribbit = scribbitStore.createScribbit({
    id: 'direct-equip-migration-scribbit',
    draft: {
      name: 'Direct Equip',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: userId,
    imageUrl: '/api/drawing/direct-equip-migration-scribbit',
    day: 4,
  });
  const inventoryKey = inkStore.getInventoryKey(userId);
  await memory.storage.set(
    scribbitStore.getScribbitKey(scribbit.id),
    serializeV3EquippedScribbit(scribbit, 'tiny-sword', 3)
  );
  await memory.storage.set(scribbitStore.getScribbitOwnerKey(scribbit.id), userId);
  await memory.storage.hSet(inventoryKey, {
    [inkStore.getInventoryDiscoveryField('tiny-sword')]: '1',
  });

  const result = await scribbitStore.equipGearForScribbit(
    memory.storage,
    userId,
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 1,
      gearId: 'tiny-sword',
    }
  );
  assert.equal(result.status, 'updated');
  assert.deepEqual(result.scribbit.equipmentLoadout.weapon, [
    null,
    'tiny-sword',
  ]);
  assert.equal(result.scribbit.gearRanks['tiny-sword'], 3);
  assert.equal(
    await memory.storage.hGet(
      inventoryKey,
      inkStore.getInventoryGearRankField('tiny-sword')
    ),
    '3'
  );
  const stored = JSON.parse(
    await memory.storage.get(scribbitStore.getScribbitKey(scribbit.id))
  );
  assert.equal(stored.schemaVersion, 4);
  assert.deepEqual(stored.gearRanks, {});
});

test('v4 migration recovers a committed reply loss without spending copies', async () => {
  const memory = createMemoryStorage();
  const userId = 'migration-reply-loss-player';
  const scribbit = scribbitStore.createScribbit({
    id: 'migration-reply-loss-scribbit',
    draft: {
      name: 'Reply Loss',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: userId,
    imageUrl: '/api/drawing/migration-reply-loss-scribbit',
    day: 4,
  });
  const inventoryKey = inkStore.getInventoryKey(userId);
  await memory.storage.set(
    scribbitStore.getScribbitKey(scribbit.id),
    serializeV3EquippedScribbit(scribbit, 'tiny-sword', 3)
  );
  await memory.storage.set(scribbitStore.getScribbitOwnerKey(scribbit.id), userId);
  await memory.storage.zAdd(scribbitStore.getUserAliveScribbitsKey(userId), {
    member: scribbit.id,
    score: scribbit.bornDay,
  });
  await memory.storage.hSet(inventoryKey, { 'tiny-sword': '8' });
  memory.failures.loseNextCommitReply();

  assert.equal(
    await scribbitStore.migrateLivingScribbitsForUser(memory.storage, userId),
    1
  );
  assert.equal(
    await memory.storage.hGet(
      inventoryKey,
      inkStore.getInventoryGearRankField('tiny-sword')
    ),
    '3'
  );
  assert.equal(await memory.storage.hGet(inventoryKey, 'tiny-sword'), '8');
  assert.equal(
    JSON.parse(
      await memory.storage.get(scribbitStore.getScribbitKey(scribbit.id))
    ).schemaVersion,
    4
  );
});

test('v4 migration preserves malformed inventory and legacy bytes', async () => {
  const memory = createMemoryStorage();
  const userId = 'migration-corrupt-rank-player';
  const scribbit = scribbitStore.createScribbit({
    id: 'migration-corrupt-rank-scribbit',
    draft: {
      name: 'Corrupt Rank',
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: userId,
    imageUrl: '/api/drawing/migration-corrupt-rank-scribbit',
    day: 4,
  });
  const scribbitKey = scribbitStore.getScribbitKey(scribbit.id);
  const v3Bytes = serializeV3EquippedScribbit(scribbit, 'tiny-sword', 3);
  const inventoryKey = inkStore.getInventoryKey(userId);
  const rankField = inkStore.getInventoryGearRankField('tiny-sword');
  await memory.storage.set(scribbitKey, v3Bytes);
  await memory.storage.set(scribbitStore.getScribbitOwnerKey(scribbit.id), userId);
  await memory.storage.zAdd(scribbitStore.getUserAliveScribbitsKey(userId), {
    member: scribbit.id,
    score: scribbit.bornDay,
  });
  await memory.storage.hSet(inventoryKey, { [rankField]: 'broken' });
  const mutationCountBeforeMigration = memory.mutations.length;

  await assert.rejects(
    scribbitStore.migrateLivingScribbitsForUser(memory.storage, userId),
    /invalid and was preserved/
  );
  assert.equal(await memory.storage.get(scribbitKey), v3Bytes);
  assert.equal(await memory.storage.hGet(inventoryKey, rankField), 'broken');
  assert.equal(memory.mutations.length, mutationCountBeforeMigration);
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
  const inventoryRouteSource = await readFile(
    join(appRoot, 'src', 'server', 'routes', 'inventory.ts'),
    'utf8'
  );
  assert.match(
    apiSource,
    /api\.post\('\/equip-gear', inventoryRouteHandlers\.equipGear\)/
  );
  assert.match(inventoryRouteSource, /const readEquipGearRequest/);
  assert.match(
    inventoryRouteSource,
    /return c\.json<Scribbit>\(result\.scribbit\)/
  );
  assert.doesNotMatch(
    inventoryRouteSource,
    /refreshEquippedGearRankForUser/,
    'the forge route must leave reusable rank authority in inventory'
  );
});
