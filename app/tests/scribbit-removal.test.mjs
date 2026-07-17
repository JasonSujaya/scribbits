import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const appRoot = process.env.SCRIBBITS_APP_ROOT;

if (!compiledServerRoot || !appRoot) {
  throw new Error('Run Scribbit removal tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const arenaStore = require(join(compiledServerRoot, 'core', 'arenaStore.js'));
const battle = require(join(compiledServerRoot, 'core', 'battle.js'));
const battleStore = require(join(compiledServerRoot, 'core', 'battleStore.js'));
const clout = require(join(compiledServerRoot, 'core', 'clout.js'));
const dailyLogin = require(join(compiledServerRoot, 'core', 'dailyLogin.js'));
const forecast = require(join(compiledServerRoot, 'core', 'forecast.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const moderation = require(join(compiledServerRoot, 'core', 'moderation.js'));
const privacy = require(join(compiledServerRoot, 'core', 'privacy.js'));
const paintBucket = require(join(compiledServerRoot, 'core', 'paintBucket.js'));
const payoutReceipt = require(
  join(compiledServerRoot, 'core', 'payoutReceipt.js')
);
const powerUpOffers = require(
  join(compiledServerRoot, 'core', 'powerUpOffers.js')
);
const removal = require(join(compiledServerRoot, 'core', 'removal.js'));
const rivalRun = require(join(compiledServerRoot, 'core', 'rivalRun.js'));
const scribbits = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const currentDay = 4;

test('owner, moderator, and privacy entry paths share removal core', () => {
  const apiSource = readFileSync(
    join(appRoot, 'src', 'server', 'routes', 'api.ts'),
    'utf8'
  );
  const privacySource = readFileSync(
    join(appRoot, 'src', 'server', 'core', 'privacy.ts'),
    'utf8'
  );
  const moderationAdminSource = readFileSync(
    join(appRoot, 'src', 'server', 'routes', 'moderationAdmin.ts'),
    'utf8'
  );
  const ownerRemovalRoute = apiSource.slice(
    apiSource.indexOf("api.post('/remove-scribbit'"),
    apiSource.indexOf("api.post('/report-scribbit'")
  );
  const reportRoute = apiSource.slice(
    apiSource.indexOf("api.post('/report-scribbit'"),
    apiSource.indexOf("api.post('/delete-my-data'")
  );

  assert.match(ownerRemovalRoute, /removeScribbitCompletely/);
  assert.doesNotMatch(reportRoute, /removeScribbitCompletely/);
  assert.match(moderationAdminSource, /removeScribbitCompletely/);
  assert.match(moderationAdminSource, /removeAllPlayerScribbits/);
  assert.match(privacySource, /removeScribbitCompletely/);
  for (const source of [
    ownerRemovalRoute,
    moderationAdminSource,
    privacySource,
  ]) {
    assert.doesNotMatch(
      source,
      /purgeBattleReportsForScribbit|deleteStoredScribbit|removeCurrentChampionIfMatches|clearScribbitReports/
    );
  }
});

const createScribbit = (id, artist) => ({
  id,
  name: 'Removal Moth',
  artist,
  element: 'storm',
  stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: `/api/drawing/${id}`,
  bornDay: currentDay,
  expiresDay: currentDay + 3,
  belief: 0,
  wins: 0,
  losses: 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  upgrades: [],
  level: 1,
  xp: 0,
  legacy: null,
});

const seedRemovalScenario = async (
  memory,
  suffix,
  reporterUserIds = ['reporter-one', 'reporter-two', 'reporter-three']
) => {
  const ownerUserId = `owner-${suffix}`;
  const opponentOwnerUserId = `opponent-owner-${suffix}`;
  const target = createScribbit(`target-${suffix}`, ownerUserId);
  const opponent = createScribbit(`opponent-${suffix}`, opponentOwnerUserId);

  await scribbits.storeScribbit(memory.storage, ownerUserId, target);
  await scribbits.storeScribbit(memory.storage, opponentOwnerUserId, opponent);
  await scribbits.addRumbleEntrant(memory.storage, currentDay, target.id);
  await memory.storage.zAdd(scribbits.getLegendsKey(), {
    member: target.id,
    score: 10,
  });
  await memory.storage.hSet(scribbits.getCommunityBeliefKey(), {
    [target.id]: '7',
  });
  await arenaStore.setCurrentChampion(memory.storage, target);

  const battleReport = battle.simulate(
    target,
    opponent,
    73,
    forecast.generateForecastForDay(currentDay),
    'exhibition'
  );
  await battleStore.saveBattleReport(memory.storage, battleReport, 1_000);

  for (const [index, reporterUserId] of reporterUserIds.entries()) {
    await moderation.reportAndHideScribbit(
      memory.storage,
      reporterUserId,
      target.id,
      2_000 + index
    );
  }
  await memory.storage.set(
    powerUpOffers.getPowerUpOfferKey(ownerUserId, target.id),
    '{"version":1}'
  );
  await memory.storage.hSet(
    powerUpOffers.getPowerUpClaimReceiptsKey(ownerUserId, target.id),
    { 'offer-before-removal': '{"schemaVersion":1}' }
  );

  return {
    battleReport,
    opponentOwnerUserId,
    ownerUserId,
    reporterUserIds,
    target,
  };
};

const assertCompletelyRemoved = async (memory, scenario) => {
  const { battleReport, opponentOwnerUserId, ownerUserId, reporterUserIds } =
    scenario;
  const { target } = scenario;

  assert.equal(
    await scribbits.loadScribbit(memory.storage, target.id),
    undefined
  );
  assert.equal(
    await scribbits.getScribbitOwner(memory.storage, target.id),
    undefined
  );
  assert.equal(
    await memory.storage.zScore(
      scribbits.getUserScribbitsKey(ownerUserId),
      target.id
    ),
    undefined
  );
  assert.equal(
    await memory.storage.zScore(
      scribbits.getUserAliveScribbitsKey(ownerUserId),
      target.id
    ),
    undefined
  );
  assert.equal(
    await memory.storage.zScore(scribbits.getExpiringScribbitsKey(), target.id),
    undefined
  );
  assert.equal(
    await memory.storage.zScore(scribbits.getRumbleKey(currentDay), target.id),
    undefined
  );
  assert.equal(
    await memory.storage.zScore(scribbits.getLegendsKey(), target.id),
    undefined
  );
  assert.equal(
    await memory.storage.hGet(scribbits.getCommunityBeliefKey(), target.id),
    undefined
  );
  assert.equal(await arenaStore.getCurrentChampion(memory.storage), null);
  assert.equal(
    await battleStore.loadBattleReport(memory.storage, battleReport.id),
    undefined
  );
  assert.deepEqual(
    await battleStore.loadBattleReportsForUser(memory.storage, ownerUserId, 20),
    []
  );
  assert.deepEqual(
    await battleStore.loadBattleReportsForUser(
      memory.storage,
      opponentOwnerUserId,
      20
    ),
    []
  );
  assert.deepEqual(
    await memory.storage.hGetAll(moderation.getScribbitReportsKey(target.id)),
    {}
  );
  assert.equal(
    await memory.storage.get(
      powerUpOffers.getPowerUpOfferKey(ownerUserId, target.id)
    ),
    undefined
  );
  assert.deepEqual(
    await memory.storage.hGetAll(
      powerUpOffers.getPowerUpClaimReceiptsKey(ownerUserId, target.id)
    ),
    {}
  );
  for (const reporterUserId of reporterUserIds) {
    assert.equal(
      await memory.storage.hGet(
        moderation.getUserHiddenScribbitsKey(reporterUserId),
        target.id
      ),
      undefined
    );
    assert.equal(
      await memory.storage.hGet(
        moderation.getUserReportedScribbitsKey(reporterUserId),
        target.id
      ),
      undefined
    );
  }
};

test('owner removal clears storage, battles, Champion, and moderation reverses', async () => {
  const memory = createMemoryStorage();
  const scenario = await seedRemovalScenario(memory, 'owner-entry');

  await removal.removeScribbitCompletely(memory.storage, {
    ownerUserId: scenario.ownerUserId,
    scribbitId: scenario.target.id,
    currentDay,
  });

  await assertCompletelyRemoved(memory, scenario);
  assert.equal(
    await scribbits.hasUserCreatedScribbit(
      memory.storage,
      scenario.ownerUserId
    ),
    true,
    'removing a Scribbit must not make an established account look new again'
  );
});

test('legacy creation state backfills once and survives last-Scribbit removal', async () => {
  const memory = createMemoryStorage();
  const ownerUserId = 'legacy-creation-owner';
  const scribbit = createScribbit('legacy-creation-target', ownerUserId);
  await scribbits.storeScribbit(memory.storage, ownerUserId, scribbit);
  await memory.storage.del(scribbits.getUserHasCreatedScribbitKey(ownerUserId));

  assert.equal(
    await scribbits.hasUserCreatedScribbit(memory.storage, ownerUserId),
    true
  );
  await removal.removeScribbitCompletely(memory.storage, {
    ownerUserId,
    scribbitId: scribbit.id,
    currentDay,
  });
  assert.equal(
    await scribbits.hasUserCreatedScribbit(memory.storage, ownerUserId),
    true
  );
});

test('creation state survives a lost transaction reply', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  const ownerUserId = 'reply-loss-creation-owner';
  await scribbits.storeScribbit(
    memory.storage,
    ownerUserId,
    createScribbit('reply-loss-creation-target', ownerUserId)
  );

  assert.equal(
    await scribbits.hasUserCreatedScribbit(memory.storage, ownerUserId),
    true
  );
});

test('player ban removal deletes every owned Scribbit through canonical cleanup', async () => {
  const memory = createMemoryStorage();
  const scenario = await seedRemovalScenario(memory, 'ban-entry');
  const secondOwnedScribbit = createScribbit(
    'second-ban-target',
    scenario.ownerUserId
  );
  await scribbits.storeScribbit(
    memory.storage,
    scenario.ownerUserId,
    secondOwnedScribbit
  );

  assert.equal(
    await removal.removeAllPlayerScribbits(
      memory.storage,
      scenario.ownerUserId,
      currentDay
    ),
    2
  );

  await assertCompletelyRemoved(memory, scenario);
  assert.equal(
    await scribbits.loadScribbit(memory.storage, secondOwnedScribbit.id),
    undefined
  );
});

test('privacy deletion reuses canonical removal for owned Scribbits', async () => {
  const memory = createMemoryStorage({
    rejectMultipleTransactionDeletes: true,
  });
  const scenario = await seedRemovalScenario(memory, 'privacy-entry', [
    'outside-reporter-one',
    'outside-reporter-two',
  ]);
  const rivalRunKey = rivalRun.getRivalRunKey(scenario.ownerUserId);
  const capsuleOperationKey = inkStore.getCapsuleOperationKey(
    scenario.ownerUserId,
    'privacy-capsule-operation'
  );
  const gearMergeOperationKey = inkStore.getGearMergeOperationKey(
    scenario.ownerUserId,
    'privacy-merge-operation'
  );
  const operationIndexKey = inkStore.getUserOperationReceiptIndexKey(
    scenario.ownerUserId
  );
  const unrelatedGlobalKey = 'global:privacy-index-corruption-proof';
  const legacyCloutPayoutKey = clout.getCloutPayoutKey(1);
  const legacyRumblePayoutKey = inkStore.getRumbleWinInkPayoutKey(1);
  const indexedRumblePayoutKey = inkStore.getRumbleWinInkPayoutKey(2);
  const recentUnindexedRumblePayoutKey =
    inkStore.getRumbleWinInkPayoutKey(currentDay);
  const unrelatedRumbleField = 'unrelated-rumble-winner';
  const payoutIndexKey = payoutReceipt.getUserPayoutReceiptIndexKey(
    scenario.ownerUserId
  );
  const paintBucketKey = paintBucket.getPaintBucketKey(scenario.ownerUserId);
  const dailyLoginKey = dailyLogin.getDailyLoginKey(scenario.ownerUserId);
  const powerUpDiscoveriesKey = powerUpOffers.getPowerUpDiscoveriesKey(
    scenario.ownerUserId
  );
  await memory.storage.set(rivalRunKey, '{"id":"private-run"}');
  await memory.storage.set(capsuleOperationKey, '{"pull":"private"}');
  await memory.storage.set(gearMergeOperationKey, '{"gear":"private"}');
  await memory.storage.set(unrelatedGlobalKey, 'must-survive');
  await memory.storage.set(paintBucketKey, '3');
  await memory.storage.set(
    powerUpDiscoveriesKey,
    JSON.stringify(['v1-edge-spring'])
  );
  await memory.storage.hSet(dailyLoginKey, {
    'claimed-track-days': '4',
    'last-claim-date': '20260712',
    'last-reward': JSON.stringify({
      trackDay: 4,
      inkAwarded: 2,
      gearId: null,
      claimedAtMs: 2_000,
    }),
  });
  await memory.storage.zAdd(
    operationIndexKey,
    { member: capsuleOperationKey, score: 10_000 },
    { member: gearMergeOperationKey, score: 10_000 },
    { member: unrelatedGlobalKey, score: 10_000 }
  );
  await memory.storage.hSet(legacyCloutPayoutKey, {
    [scenario.ownerUserId]: '3:1000',
    'unrelated-user': '1:1000',
  });
  await memory.storage.hSet(legacyRumblePayoutKey, {
    'deleted-before-privacy': `${scenario.ownerUserId}:5:1000`,
    [unrelatedRumbleField]: 'unrelated-user:5:1000',
  });
  await memory.storage.hSet(recentUnindexedRumblePayoutKey, {
    'recent-unindexed-scribbit': `${scenario.ownerUserId}:5:1500`,
  });
  const expiredIndexMember = JSON.stringify([
    legacyRumblePayoutKey,
    'already-expired',
  ]);
  await memory.storage.zAdd(payoutIndexKey, {
    member: expiredIndexMember,
    score: 1_999,
  });
  assert.equal(
    await inkStore.claimInkReward(memory.storage, {
      payoutKey: indexedRumblePayoutKey,
      payoutField: scenario.target.id,
      userId: scenario.ownerUserId,
      amount: 5,
      paidAtMs: 2_000,
    }),
    true
  );
  assert.equal(
    await memory.storage.zScore(payoutIndexKey, expiredIndexMember),
    undefined,
    'a later payout must prune expired receipt-index members'
  );
  await clout.claimDailyBack(
    memory.storage,
    2,
    { userId: scenario.ownerUserId, username: 'Privacy Owner' },
    'privacy-champion'
  );
  await clout.payCloutForRumble(memory.storage, {
    day: 2,
    championScribbitId: 'privacy-champion',
    runnerUpScribbitId: null,
    paidAtMs: 2_500,
  });
  await memory.storage.zAdd(payoutIndexKey, {
    member: JSON.stringify([legacyRumblePayoutKey, unrelatedRumbleField]),
    score: 10_000,
  });
  assert.equal(
    memory.expirations.get(indexedRumblePayoutKey),
    payoutReceipt.PAYOUT_RECEIPT_TTL_SECONDS
  );
  assert.equal(
    memory.expirations.get(clout.getCloutPayoutKey(2)),
    payoutReceipt.PAYOUT_RECEIPT_TTL_SECONDS
  );

  const result = await privacy.deletePlayerData(
    memory.storage,
    scenario.ownerUserId,
    currentDay,
    '20260713',
    3_000,
    'privacy-removal-operation'
  );

  assert.deepEqual(result, { status: 'deleted', removedScribbits: 1 });
  await assertCompletelyRemoved(memory, scenario);
  assert.equal(
    await scribbits.hasUserCreatedScribbit(
      memory.storage,
      scenario.ownerUserId
    ),
    false,
    'privacy deletion must reset the account creation state'
  );
  for (const deletedKey of [
    rivalRunKey,
    capsuleOperationKey,
    gearMergeOperationKey,
  ]) {
    assert.equal(await memory.storage.get(deletedKey), undefined);
  }
  assert.equal(await memory.storage.zCard(operationIndexKey), 0);
  assert.equal(await memory.storage.get(unrelatedGlobalKey), 'must-survive');
  assert.equal(await memory.storage.get(paintBucketKey), undefined);
  assert.equal(await memory.storage.get(powerUpDiscoveriesKey), undefined);
  assert.deepEqual(await memory.storage.hGetAll(dailyLoginKey), {});
  assert.equal(
    await memory.storage.hGet(legacyCloutPayoutKey, scenario.ownerUserId),
    undefined
  );
  assert.equal(
    await memory.storage.hGet(legacyRumblePayoutKey, 'deleted-before-privacy'),
    undefined,
    'privacy deletion must remove a legacy receipt after its Scribbit is gone'
  );
  assert.equal(
    await memory.storage.hGet(indexedRumblePayoutKey, scenario.target.id),
    undefined
  );
  assert.equal(
    await memory.storage.hGet(
      recentUnindexedRumblePayoutKey,
      'recent-unindexed-scribbit'
    ),
    undefined,
    'recent fallback must cover a missing payout-index entry'
  );
  assert.equal(
    await memory.storage.hGet(legacyCloutPayoutKey, 'unrelated-user'),
    '1:1000'
  );
  assert.equal(
    await memory.storage.hGet(legacyRumblePayoutKey, unrelatedRumbleField),
    'unrelated-user:5:1000',
    'a corrupted payout index must not delete another player receipt'
  );
  assert.equal(await memory.storage.zCard(payoutIndexKey), 0);
});
