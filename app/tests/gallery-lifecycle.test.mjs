import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error(
    'Run Gallery lifecycle tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const scribbits = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const createOwnedScribbit = (id, bornDay) =>
  scribbits.createScribbit({
    id,
    draft: {
      name: id,
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      element: 'ember',
      accessories: [],
    },
    artist: 'gallery-owner',
    imageUrl: `/api/drawing/${id}`,
    day: bornDay,
  });

test('Gallery lifecycle caps the active roster at three growing and three mature Scribbits', () => {
  assert.deepEqual(arena.SCRIBBIT_ROSTER_CAPACITY, {
    growing: 3,
    mature: 3,
  });
  assert.equal(arena.MAX_GROWING_PER_USER, 3);
  assert.equal(arena.MAX_MATURE_PER_USER, 3);
  assert.equal(arena.MAX_ALIVE_PER_USER, 6);

  const growing = createOwnedScribbit('growing', 7);
  assert.equal(arena.getScribbitLifecycleStage(growing, 9), 'growing');
  assert.equal(arena.getScribbitLifecycleStage(growing, 10), 'mature');
  assert.equal(
    arena.getScribbitLifecycleStage(
      scribbits.resolveExpiredScribbitStatus(growing),
      10
    ),
    'archived'
  );
});

test('a fourth mature Scribbit archives the oldest and preserves the newest three', async () => {
  const memory = createMemoryStorage();
  const ownerUserId = 'gallery-owner';
  const roster = [
    createOwnedScribbit('mature-one', 1),
    createOwnedScribbit('mature-two', 2),
    createOwnedScribbit('mature-three', 3),
    createOwnedScribbit('mature-four', 4),
  ];
  for (const scribbit of roster) {
    await scribbits.storeScribbit(memory.storage, ownerUserId, scribbit);
  }

  const result = await scribbits.expireDueScribbits(memory.storage, 7);
  assert.deepEqual(result, { faded: 1, legends: 0 });

  const activeRoster = await scribbits.getAliveScribbitsForUser(
    memory.storage,
    ownerUserId
  );
  assert.deepEqual(
    activeRoster.map(({ id }) => id),
    ['mature-four', 'mature-three', 'mature-two']
  );
  assert.ok(
    activeRoster.every(
      (scribbit) => arena.getScribbitLifecycleStage(scribbit, 7) === 'mature'
    )
  );

  const archived = await scribbits.loadScribbit(memory.storage, 'mature-one');
  assert.equal(archived?.status, 'faded');
  assert.equal(
    await memory.storage.zScore(
      scribbits.getUserLegacyCardsKey(ownerUserId),
      'mature-one'
    ),
    7
  );
});

for (const [label, bornDay, retirementDay] of [
  ['growing', 10, 12],
  ['mature', 4, 12],
]) {
  test(`an owner can retire a ${label} Scribbit without losing its record`, async () => {
    const memory = createMemoryStorage();
    const ownerUserId = 'gallery-owner';
    const scribbit = {
      ...createOwnedScribbit(`retire-${label}`, bornDay),
      wins: 5,
      losses: 2,
      belief: 9,
    };
    await scribbits.storeScribbit(memory.storage, ownerUserId, scribbit);

    const result = await scribbits.retireOwnedScribbit(
      memory.storage,
      ownerUserId,
      scribbit.id,
      retirementDay
    );
    assert.equal(result.status, 'retired');
    assert.equal(result.scribbit.imageUrl, scribbit.imageUrl);
    assert.equal(result.scribbit.expiresDay, scribbit.expiresDay);
    assert.equal(result.scribbit.wins, 5);
    assert.equal(result.scribbit.losses, 2);
    assert.equal(result.scribbit.belief, 9);
    assert.equal(result.scribbit.legacy?.schemaVersion, 3);
    assert.equal(result.scribbit.legacy?.archivedDay, retirementDay);
    assert.equal(
      await memory.storage.zScore(
        scribbits.getUserAliveScribbitsKey(ownerUserId),
        scribbit.id
      ),
      undefined
    );
    assert.equal(
      await memory.storage.zScore(
        scribbits.getExpiringScribbitsKey(),
        scribbit.id
      ),
      undefined
    );
    assert.equal(
      await memory.storage.zScore(
        scribbits.getUserLegacyCardsKey(ownerUserId),
        scribbit.id
      ),
      retirementDay
    );

    const retry = await scribbits.retireOwnedScribbit(
      memory.storage,
      ownerUserId,
      scribbit.id,
      retirementDay
    );
    assert.equal(retry.status, 'already-retired');
  });
}

test("a Scribbit entered in today's Rumble cannot be retired", async () => {
  const memory = createMemoryStorage();
  const ownerUserId = 'gallery-owner';
  const scribbit = createOwnedScribbit('entered-scribbit', 10);
  await scribbits.storeScribbit(memory.storage, ownerUserId, scribbit);
  await memory.storage.zAdd(scribbits.getRumbleKey(12), {
    member: scribbit.id,
    score: 1,
  });

  const result = await scribbits.retireOwnedScribbit(
    memory.storage,
    ownerUserId,
    scribbit.id,
    12
  );
  assert.equal(result.status, 'entered-today');
  assert.equal(
    (await scribbits.loadScribbit(memory.storage, scribbit.id))?.status,
    'alive'
  );
});

test('retirement retries when Forge changes the rank being frozen', async () => {
  const memory = createMemoryStorage();
  const ownerUserId = 'retirement-rank-owner';
  const scribbit = createOwnedScribbit('retirement-rank-scribbit', 10);
  const inventoryKey = inkStore.getInventoryKey(ownerUserId);
  const rankField = inkStore.getInventoryGearRankField('tiny-sword');
  await scribbits.storeScribbit(memory.storage, ownerUserId, scribbit);
  await memory.storage.hSet(inventoryKey, {
    [inkStore.getInventoryDiscoveryField('tiny-sword')]: '1',
    [rankField]: '2',
  });
  const equipped = await scribbits.equipGearForScribbit(
    memory.storage,
    ownerUserId,
    {
      scribbitId: scribbit.id,
      category: 'weapon',
      slotIndex: 0,
      gearId: 'tiny-sword',
    }
  );
  assert.equal(equipped.status, 'updated');

  const originalWatch = memory.storage.watch.bind(memory.storage);
  let concurrentForgeInjected = false;
  memory.storage.watch = async (...keys) => {
    const transaction = await originalWatch(...keys);
    if (
      !concurrentForgeInjected &&
      keys.includes(inventoryKey) &&
      keys.includes(scribbits.getScribbitKey(scribbit.id))
    ) {
      const executeTransaction = transaction.exec.bind(transaction);
      transaction.exec = async () => {
        concurrentForgeInjected = true;
        await memory.storage.hSet(inventoryKey, { [rankField]: '3' });
        return await executeTransaction();
      };
    }
    return transaction;
  };

  const result = await scribbits.retireOwnedScribbit(
    memory.storage,
    ownerUserId,
    scribbit.id,
    12
  );
  assert.equal(result.status, 'retired');
  assert.equal(concurrentForgeInjected, true);
  assert.equal(result.scribbit.gearRanks['tiny-sword'], 3);
  const stored = await scribbits.loadScribbit(memory.storage, scribbit.id);
  assert.equal(stored?.status, 'faded');
  assert.equal(stored?.gearRanks['tiny-sword'], 3);
});

test('Gallery exposes Retire for active owned Scribbits and uses Retired player-facing copy', () => {
  const detailSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'lib', 'detailmodal.ts'),
    'utf8'
  );
  const gallerySource = readFileSync(
    join(process.cwd(), 'src', 'client', 'scenes', 'Gallery.ts'),
    'utf8'
  );
  const uiSource = readFileSync(
    join(process.cwd(), 'src', 'client', 'lib', 'ui.ts'),
    'utf8'
  );

  assert.match(detailSource, /label: 'Retire'/);
  assert.match(detailSource, /icon: 'archive'/);
  assert.match(detailSource, /The drawing and record stay in Retired/);
  assert.match(detailSource, /moved to Retired/);
  assert.doesNotMatch(detailSource, /label: 'Believe'|'BELIEF'/);
  assert.match(detailSource, /maturityCountdownHeadline/);
  assert.match(detailSource, /Open .* Power-Up build and catalog/);
  assert.match(detailSource, /section\.ids\.forEach/);
  assert.match(
    detailSource,
    /POWER GUIDE · \$\{pageNumber\} OF \$\{POWER_UP_GUIDE_PAGE_COUNT\}/
  );
  assert.match(detailSource, /'YOUR BUILD'/);
  assert.match(detailSource, /'COMMON POWER-UPS'/);
  assert.match(detailSource, /'UNCOMMON POWER-UPS'/);
  assert.match(detailSource, /'RARE POWER-UPS'/);
  assert.match(detailSource, /'EPIC \+ LEGENDARY'/);
  assert.match(detailSource, /'WIN \+ EARN XP → CHOOSE 1'/);
  assert.match(
    detailSource,
    /const guidePages = \[buildPage, \.\.\.catalogPages, earnPage\]/
  );
  assert.match(detailSource, /powerUpPaperIcon\(scene, powerUpId/);
  assert.match(detailSource, /STANDARD WIN/);
  assert.match(detailSource, /CHAMPION WIN/);
  assert.match(detailSource, /LOSS OR \+0 XP = NO POWER-UP/);
  assert.doesNotMatch(detailSource, /Ink Mods|INK MODS|YOUR ELEMENT/);
  assert.match(uiSource, /'ELEMENT'/);
  assert.doesNotMatch(uiSource, /'MOOD'|moodChip/);
  assert.match(uiSource, /paperStatIcon\(\s*scene,\s*key/);
  assert.match(uiSource, /dominant \? UI\.goldHex : STAT_STYLES\[key\]\.color/);
  assert.match(
    gallerySource,
    /canRetire: mine && scribbit\.status === 'alive'/
  );
  assert.match(
    gallerySource,
    /onRetired: \(\) => void this\.showRetiredScribbit\(\)/
  );
  assert.match(gallerySource, /this\.tab = 'archived'/);
});
