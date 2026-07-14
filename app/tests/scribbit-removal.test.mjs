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
const forecast = require(join(compiledServerRoot, 'core', 'forecast.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const moderation = require(join(compiledServerRoot, 'core', 'moderation.js'));
const privacy = require(join(compiledServerRoot, 'core', 'privacy.js'));
const payoutReceipt = require(
  join(compiledServerRoot, 'core', 'payoutReceipt.js')
);
const removal = require(join(compiledServerRoot, 'core', 'removal.js'));
const rivalRun = require(join(compiledServerRoot, 'core', 'rivalRun.js'));
const scribbits = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const currentDay = 4;

test('owner, report-threshold, and privacy entry paths share removal core', () => {
  const apiSource = readFileSync(
    join(appRoot, 'src', 'server', 'routes', 'api.ts'),
    'utf8'
  );
  const privacySource = readFileSync(
    join(appRoot, 'src', 'server', 'core', 'privacy.ts'),
    'utf8'
  );
  const ownerRemovalRoute = apiSource.slice(
    apiSource.indexOf("api.post('/remove-scribbit'"),
    apiSource.indexOf("api.post('/report-scribbit'")
  );
  const reportRemovalRoute = apiSource.slice(
    apiSource.indexOf("api.post('/report-scribbit'"),
    apiSource.indexOf("api.post('/delete-my-data'")
  );

  assert.match(ownerRemovalRoute, /removeScribbitCompletely/);
  assert.match(reportRemovalRoute, /removeReportedScribbitIfEligible/);
  assert.match(privacySource, /removeScribbitCompletely/);
  for (const source of [ownerRemovalRoute, reportRemovalRoute, privacySource]) {
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
  mood: 'hungry',
  careDoneToday: [],
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
});

test('report-threshold removal rechecks ownership and converges on canonical cleanup', async () => {
  const memory = createMemoryStorage();
  const scenario = await seedRemovalScenario(memory, 'report-entry');

  assert.equal(
    await removal.removeReportedScribbitIfEligible(memory.storage, {
      expectedOwnerUserId: 'stale-owner',
      scribbitId: scenario.target.id,
      currentDay,
      minimumReportCount: 3,
    }),
    false
  );
  assert.ok(await scribbits.loadScribbit(memory.storage, scenario.target.id));

  assert.equal(
    await removal.removeReportedScribbitIfEligible(memory.storage, {
      expectedOwnerUserId: scenario.ownerUserId,
      scribbitId: scenario.target.id,
      currentDay,
      minimumReportCount: 3,
    }),
    true
  );

  await assertCompletelyRemoved(memory, scenario);
});

test('privacy deletion reuses canonical removal for owned Scribbits', async () => {
  const memory = createMemoryStorage();
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
  await memory.storage.set(rivalRunKey, '{"id":"private-run"}');
  await memory.storage.set(capsuleOperationKey, '{"pull":"private"}');
  await memory.storage.set(gearMergeOperationKey, '{"gear":"private"}');
  await memory.storage.set(unrelatedGlobalKey, 'must-survive');
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
  for (const deletedKey of [
    rivalRunKey,
    capsuleOperationKey,
    gearMergeOperationKey,
  ]) {
    assert.equal(await memory.storage.get(deletedKey), undefined);
  }
  assert.equal(await memory.storage.zCard(operationIndexKey), 0);
  assert.equal(await memory.storage.get(unrelatedGlobalKey), 'must-survive');
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
