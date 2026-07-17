import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error('Run data stress tests through scripts/run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const cosmetics = require(join(compiledSharedRoot, 'cosmetics.js'));
const equipment = require(join(compiledSharedRoot, 'equipment.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const powerUpOffers = require(
  join(compiledServerRoot, 'core', 'powerUpOffers.js')
);
const scribbitStore = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const STRESS_SEED_COUNT = 64;
const OPERATIONS_PER_SEED = 250;
const UNKNOWN_POWER_UP_ID = 'future-power-up-preserved-forever';

const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const randomItem = (random, values) =>
  values[Math.floor(random() * values.length)];

const createLivingScribbit = (userId, scribbitId) =>
  scribbitStore.createScribbit({
    id: scribbitId,
    draft: {
      name: `Stress ${scribbitId}`,
      element: 'storm',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      accessories: [],
    },
    artist: userId,
    imageUrl: `/api/drawing/${scribbitId}`,
    day: 4,
  });

const createVersionThreeBytes = (scribbit, legacyRanks) => {
  const currentRecord = JSON.parse(scribbitStore.serializeScribbit(scribbit));
  const equippedGearIds = Object.values(scribbit.equipmentLoadout)
    .flat()
    .filter((gearId) => gearId !== null);
  return JSON.stringify({
    ...currentRecord,
    schemaVersion: 3,
    gearRanks: Object.fromEntries(
      equippedGearIds.map((gearId) => [
        gearId,
        legacyRanks[gearId] ?? scribbit.gearRanks?.[gearId] ?? 1,
      ])
    ),
  });
};

const seedIndexedScribbit = async (
  storage,
  indexUserId,
  ownerUserId,
  scribbit,
  storedBytes
) => {
  await storage.set(scribbitStore.getScribbitKey(scribbit.id), storedBytes);
  await storage.set(
    scribbitStore.getScribbitOwnerKey(scribbit.id),
    ownerUserId
  );
  await storage.zAdd(scribbitStore.getUserAliveScribbitsKey(indexUserId), {
    member: scribbit.id,
    score: scribbit.bornDay,
  });
};

const assertInventoryInvariants = async (storage, userId) => {
  const storedInventory = await storage.hGetAll(
    inkStore.getInventoryKey(userId)
  );
  for (const gear of cosmetics.PERSISTED_GEAR_CATALOG_ENTRIES) {
    const storedCopies = storedInventory[gear.id];
    if (storedCopies !== undefined) {
      assert.match(storedCopies, /^(0|[1-9]\d*)$/);
      assert.ok(Number.isSafeInteger(Number(storedCopies)));
    }
    const storedRank =
      storedInventory[inkStore.getInventoryGearRankField(gear.id)];
    if (storedRank !== undefined) {
      assert.equal(arena.isGearRank(Number(storedRank)), true);
    }
  }
};

const assertScribbitInvariants = async (storage, userId, scribbitId) => {
  const storedBytes = await storage.get(
    scribbitStore.getScribbitKey(scribbitId)
  );
  const parsed = scribbitStore.parseStoredScribbit(storedBytes);
  assert.equal(parsed.status, 'valid');
  const scribbit = parsed.value;
  const equippedGearIds = Object.values(scribbit.equipmentLoadout).flat();
  const nonEmptyGearIds = equippedGearIds.filter((gearId) => gearId !== null);
  assert.equal(new Set(nonEmptyGearIds).size, nonEmptyGearIds.length);
  for (const category of equipment.EQUIPMENT_CATEGORIES) {
    for (const gearId of scribbit.equipmentLoadout[category]) {
      if (gearId === null) continue;
      assert.equal(cosmetics.findGearCosmetic(gearId)?.category, category);
    }
  }

  if (parsed.sourceVersion !== scribbitStore.SCRIBBIT_SCHEMA_VERSION) return;
  const rawRecord = JSON.parse(storedBytes);
  assert.deepEqual(
    rawRecord.gearRanks,
    {},
    'living v4 records must not copy reusable inventory ranks'
  );
  const hydrated = await scribbitStore.loadScribbit(storage, scribbitId);
  assert.ok(hydrated);
  const inventory = await storage.hGetAll(inkStore.getInventoryKey(userId));
  for (const gearId of nonEmptyGearIds) {
    const storedRank = Number(
      inventory[inkStore.getInventoryGearRankField(gearId)] ?? '1'
    );
    assert.equal(hydrated.gearRanks[gearId], storedRank);
  }
};

const createIsolatedPowerUpClaim = async (seed, storedDiscoveries) => {
  const memory = createMemoryStorage();
  const userId = `power-up-stress-user-${seed}`;
  const scribbit = createLivingScribbit(userId, `power-up-stress-${seed}`);
  const scribbitKey = scribbitStore.getScribbitKey(scribbit.id);
  await memory.storage.set(
    scribbitKey,
    scribbitStore.serializeScribbit(scribbit)
  );
  const offer = await powerUpOffers.getOrCreatePowerUpOffer(memory.storage, {
    userId,
    scribbit,
    reportId: `power-up-stress-report-${seed}`,
    source: 'birth',
    xpAwarded: 0,
    createdAtMs: seed,
    currentArenaDay: scribbit.bornDay,
  });
  assert.ok(offer);
  const discoveriesKey = powerUpOffers.getPowerUpDiscoveriesKey(userId);
  await memory.storage.set(discoveriesKey, storedDiscoveries);
  return { memory, userId, scribbit, scribbitKey, offer, discoveriesKey };
};

const exerciseInvalidScribbitPreservation = async (seed, futureVersion) => {
  const memory = createMemoryStorage();
  const userId = `invalid-scribbit-user-${seed}`;
  const scribbit = createLivingScribbit(userId, `invalid-scribbit-${seed}`);
  const rawBytes = futureVersion
    ? JSON.stringify({
        ...JSON.parse(scribbitStore.serializeScribbit(scribbit)),
        schemaVersion: scribbitStore.SCRIBBIT_SCHEMA_VERSION + 1,
      })
    : `{"schemaVersion":${scribbitStore.SCRIBBIT_SCHEMA_VERSION},"id":`;
  await seedIndexedScribbit(memory.storage, userId, userId, scribbit, rawBytes);
  await assert.rejects(
    scribbitStore.migrateLivingScribbitsForUser(memory.storage, userId),
    /invalid and was preserved/
  );
  assert.equal(
    await memory.storage.get(scribbitStore.getScribbitKey(scribbit.id)),
    rawBytes
  );
};

const exerciseInvalidDiscoveryPreservation = async (seed, futureVersion) => {
  const rawBytes = futureVersion
    ? JSON.stringify({ schemaVersion: 2, ids: [] })
    : '{broken-discoveries';
  const claim = await createIsolatedPowerUpClaim(seed, rawBytes);
  const beforeScribbit = await claim.memory.storage.get(claim.scribbitKey);
  const offerKey = powerUpOffers.getPowerUpOfferKey(
    claim.userId,
    claim.scribbit.id
  );
  const beforeOffer = await claim.memory.storage.get(offerKey);
  await assert.rejects(
    powerUpOffers.claimPowerUpOffer(claim.memory.storage, {
      userId: claim.userId,
      scribbitId: claim.scribbit.id,
      request: {
        scribbitId: claim.scribbit.id,
        offerId: claim.offer.id,
        selectedId: claim.offer.choices[0],
        expectedPowerUpCount: 0,
      },
    }),
    /discoveries are unreadable and were preserved/
  );
  assert.equal(await claim.memory.storage.get(claim.discoveriesKey), rawBytes);
  assert.equal(
    await claim.memory.storage.get(claim.scribbitKey),
    beforeScribbit
  );
  assert.equal(await claim.memory.storage.get(offerKey), beforeOffer);
};

const exerciseLegacyDiscoveryMigration = async (seed) => {
  const claim = await createIsolatedPowerUpClaim(
    seed,
    JSON.stringify([UNKNOWN_POWER_UP_ID])
  );
  const result = await powerUpOffers.claimPowerUpOffer(claim.memory.storage, {
    userId: claim.userId,
    scribbitId: claim.scribbit.id,
    request: {
      scribbitId: claim.scribbit.id,
      offerId: claim.offer.id,
      selectedId: claim.offer.choices[0],
      expectedPowerUpCount: 0,
    },
  });
  assert.ok(result);
  assert.deepEqual(
    JSON.parse(await claim.memory.storage.get(claim.discoveriesKey)),
    {
      schemaVersion: 1,
      ids: [UNKNOWN_POWER_UP_ID, claim.offer.choices[0]],
    }
  );
};

const exerciseInvalidMergeReceiptPreservation = async (
  seed,
  futureVersion,
  gearId
) => {
  const memory = createMemoryStorage();
  const userId = `invalid-merge-user-${seed}`;
  const operationId = `invalid-merge-operation-${seed}`;
  const inventoryKey = inkStore.getInventoryKey(userId);
  const operationKey = inkStore.getGearMergeOperationKey(userId, operationId);
  const rawBytes = futureVersion
    ? JSON.stringify({ schemaVersion: 2, response: {} })
    : '{broken-merge-receipt';
  await memory.storage.hSet(inventoryKey, {
    [gearId]: '30',
    [inkStore.getInventoryDiscoveryField(gearId)]: '1',
    [inkStore.getInventoryGearRankField(gearId)]: '1',
  });
  await memory.storage.set(operationKey, rawBytes);
  const beforeInventory = await memory.storage.hGetAll(inventoryKey);
  await assert.rejects(
    inkStore.mergeGearForUser(memory.storage, userId, gearId, operationId),
    /receipt is unreadable and preserved/
  );
  assert.equal(await memory.storage.get(operationKey), rawBytes);
  assert.deepEqual(await memory.storage.hGetAll(inventoryKey), beforeInventory);
};

test(
  `v4 storage survives ${STRESS_SEED_COUNT} deterministic seeds x ${OPERATIONS_PER_SEED} model operations`,
  { timeout: 120_000 },
  async () => {
    const gearCatalog = cosmetics.GEAR_CATALOG_ENTRIES;
    assert.ok(gearCatalog.length >= 16);
    let executedOperations = 0;

    for (let seed = 0; seed < STRESS_SEED_COUNT; seed += 1) {
      const random = createRandom(seed + 1);
      const memory = createMemoryStorage();
      const userId = `data-stress-user-${seed}`;
      const otherUserId = `data-stress-other-${seed}`;
      const inventoryKey = inkStore.getInventoryKey(userId);
      const ownedScribbitIds = [
        `data-stress-${seed}-a`,
        `data-stress-${seed}-b`,
      ];
      const wrongOwnerScribbitId = `data-stress-${seed}-wrong-owner`;
      const staleScribbitId = `data-stress-${seed}-missing`;
      const inventorySeed = {};
      for (const gear of gearCatalog) {
        inventorySeed[gear.id] = '30';
        inventorySeed[inkStore.getInventoryDiscoveryField(gear.id)] = '1';
        inventorySeed[inkStore.getInventoryGearRankField(gear.id)] = '1';
      }
      await memory.storage.hSet(inventoryKey, inventorySeed);

      for (const [index, scribbitId] of ownedScribbitIds.entries()) {
        const gear = gearCatalog[index];
        const scribbit = createLivingScribbit(userId, scribbitId);
        const equippedScribbit = {
          ...scribbit,
          gearRanks: { [gear.id]: index + 2 },
          equipmentLoadout: equipment.equipGearInLoadout(
            scribbit.equipmentLoadout,
            { category: gear.category, slotIndex: 0, gearId: gear.id }
          ),
        };
        await seedIndexedScribbit(
          memory.storage,
          userId,
          userId,
          equippedScribbit,
          createVersionThreeBytes(equippedScribbit, { [gear.id]: index + 2 })
        );
      }

      const wrongOwnerScribbit = createLivingScribbit(
        otherUserId,
        wrongOwnerScribbitId
      );
      const wrongOwnerBytes = createVersionThreeBytes(wrongOwnerScribbit, {
        [gearCatalog[0].id]: 4,
      });
      await seedIndexedScribbit(
        memory.storage,
        userId,
        otherUserId,
        wrongOwnerScribbit,
        wrongOwnerBytes
      );
      await memory.storage.zAdd(
        scribbitStore.getUserAliveScribbitsKey(userId),
        {
          member: staleScribbitId,
          score: 999,
        }
      );

      let mergeSequence = 0;
      let lastMerge;
      for (
        let operationIndex = 0;
        operationIndex < OPERATIONS_PER_SEED;
        operationIndex += 1
      ) {
        const operationKind = operationIndex % 12;
        const scribbitId = randomItem(random, ownedScribbitIds);
        const gear = randomItem(random, gearCatalog);
        const operationTrace = `seed=${seed + 1} operation=${operationIndex} kind=${operationKind} scribbit=${scribbitId} gear=${gear.id}`;

        try {
          if (operationKind === 0 || operationKind === 1) {
          const before = scribbitStore.parseStoredScribbit(
            await memory.storage.get(scribbitStore.getScribbitKey(scribbitId))
          );
          if (before.status === 'valid' && !before.migrated) {
            const legacyRank = 1 + Math.floor(random() * arena.MAX_GEAR_RANK);
            const rankedGearId =
              Object.values(before.value.equipmentLoadout)
                .flat()
                .find((gearId) => gearId !== null) ?? gear.id;
            await memory.storage.set(
              scribbitStore.getScribbitKey(scribbitId),
              createVersionThreeBytes(before.value, {
                [rankedGearId]: legacyRank,
              })
            );
          }
          if (operationKind === 1) {
            if (operationIndex % 24 === 1) {
              memory.failures.loseNextCommitReply();
            } else {
              memory.failures.rejectNextWatchedTransaction();
            }
          }
          await scribbitStore.migrateLivingScribbitsForUser(
            memory.storage,
            userId
          );
        } else if (operationKind === 2) {
          const current = await scribbitStore.loadScribbit(
            memory.storage,
            scribbitId
          );
          assert.ok(current);
          const legacyRank = 1 + Math.floor(random() * arena.MAX_GEAR_RANK);
          const rankedGearId =
            Object.values(current.equipmentLoadout)
              .flat()
              .find((gearId) => gearId !== null) ?? gear.id;
          await memory.storage.set(
            scribbitStore.getScribbitKey(scribbitId),
            createVersionThreeBytes(current, { [rankedGearId]: legacyRank })
          );
        } else if (operationKind === 3 || operationKind === 4) {
          if (operationKind === 4) {
            if (operationIndex % 24 === 4) {
              memory.failures.loseNextCommitReply();
            } else {
              memory.failures.rejectNextWatchedTransaction();
            }
          }
          const equipped = await scribbitStore.equipGearForScribbit(
            memory.storage,
            userId,
            {
              scribbitId,
              category: gear.category,
              slotIndex: Math.floor(random() * 2),
              gearId: random() < 0.25 ? null : gear.id,
            }
          );
          assert.equal(equipped.status, 'updated');
        } else if (operationKind === 5 || operationKind === 6) {
          const operationId = `merge-${seed}-${mergeSequence}`;
          mergeSequence += 1;
          const beforeInventory = await memory.storage.hGetAll(inventoryKey);
          if (operationKind === 6) {
            if (operationIndex % 24 === 6) {
              memory.failures.loseNextCommitReply();
            } else {
              memory.failures.rejectNextWatchedTransaction();
            }
          }
          const result = await inkStore.mergeGearForUser(
            memory.storage,
            userId,
            gear.id,
            operationId
          );
          const afterInventory = await memory.storage.hGetAll(inventoryKey);
          if (result.status === 'merged') {
            assert.equal(
              Number(afterInventory[gear.id]),
              Number(beforeInventory[gear.id]) - result.response.copiesSpent
            );
            assert.equal(result.response.toRank, result.response.fromRank + 1);
            assert.equal(
              Number(
                afterInventory[inkStore.getInventoryGearRankField(gear.id)]
              ),
              result.response.toRank
            );
            lastMerge = {
              gearId: gear.id,
              operationId,
              response: result.response,
            };
          } else {
            assert.ok(
              ['maxRank', 'insufficientCopies'].includes(result.status)
            );
            assert.deepEqual(afterInventory, beforeInventory);
          }
        } else if (operationKind === 7) {
          if (lastMerge) {
            const beforeInventory = await memory.storage.hGetAll(inventoryKey);
            assert.deepEqual(
              await inkStore.mergeGearForUser(
                memory.storage,
                userId,
                lastMerge.gearId,
                lastMerge.operationId
              ),
              { status: 'merged', response: lastMerge.response }
            );
            assert.deepEqual(
              await memory.storage.hGetAll(inventoryKey),
              beforeInventory,
              'replaying a merge receipt must not spend copies twice'
            );
          }
          assert.deepEqual(
            await scribbitStore.equipGearForScribbit(memory.storage, userId, {
              scribbitId: wrongOwnerScribbitId,
              category: gearCatalog[0].category,
              slotIndex: 0,
              gearId: gearCatalog[0].id,
            }),
            { status: 'not-owned' }
          );
          assert.deepEqual(
            await scribbitStore.equipGearForScribbit(memory.storage, userId, {
              scribbitId: staleScribbitId,
              category: gearCatalog[0].category,
              slotIndex: 0,
              gearId: gearCatalog[0].id,
            }),
            { status: 'scribbit-unavailable' }
          );
        } else if (operationKind === 8) {
          await exerciseInvalidScribbitPreservation(
            seed * OPERATIONS_PER_SEED + operationIndex,
            random() < 0.5
          );
        } else if (operationKind === 9) {
          await exerciseInvalidDiscoveryPreservation(
            seed * OPERATIONS_PER_SEED + operationIndex,
            random() < 0.5
          );
        } else if (operationKind === 10) {
          await exerciseInvalidMergeReceiptPreservation(
            seed * OPERATIONS_PER_SEED + operationIndex,
            random() < 0.5,
            gear.id
          );
        } else {
          await exerciseLegacyDiscoveryMigration(
            seed * OPERATIONS_PER_SEED + operationIndex
          );
        }

        await assertInventoryInvariants(memory.storage, userId);
        for (const ownedScribbitId of ownedScribbitIds) {
          await assertScribbitInvariants(
            memory.storage,
            userId,
            ownedScribbitId
          );
        }
        assert.equal(
          await memory.storage.get(
            scribbitStore.getScribbitKey(wrongOwnerScribbitId)
          ),
          wrongOwnerBytes,
          "a stale index must never migrate another player's record"
        );
        assert.equal(
          await memory.storage.get(
            scribbitStore.getScribbitKey(staleScribbitId)
          ),
          undefined
        );
          executedOperations += 1;
        } catch (error) {
          throw new Error(`Data mutation stress failed: ${operationTrace}`, {
            cause: error,
          });
        }
      }
    }

    assert.equal(executedOperations, STRESS_SEED_COUNT * OPERATIONS_PER_SEED);
  }
);
