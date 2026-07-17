import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledServerRoot) {
  throw new Error('Run season tests through scripts/run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const clout = require(join(compiledServerRoot, 'core', 'clout.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const seasons = require(join(compiledServerRoot, 'core', 'season.js'));

const admin = { userId: 't2_owner', username: 'ScribbitsOwner' };
const command = (operationId, reason = 'Season test administration.') => ({
  actor: admin,
  operationId,
  reason,
  recordedAtMs: 1_000,
});

test('Season 1 bootstraps once as an exact 60-day server schedule', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  const season = await seasons.ensureInitialSeason(
    memory.storage,
    5,
    500,
    admin
  );

  assert.equal(season.id, 'season-1');
  assert.equal(season.startArenaDay, 5);
  assert.equal(season.endArenaDay, 64);
  assert.equal(season.endArenaDay - season.startArenaDay + 1, 60);
  assert.deepEqual(season.events, [
    {
      id: 'opening-rumble',
      name: 'Opening Rumble',
      startArenaDay: 5,
      endArenaDay: 11,
      ruleSetId: 'double-clout',
    },
  ]);

  const retry = await seasons.ensureInitialSeason(
    memory.storage,
    99,
    999,
    admin
  );
  assert.deepEqual(retry, season);
  assert.equal((await seasons.loadSeasonCatalog(memory.storage)).length, 1);
});

test('Admin drafts, events, scheduling, pause, and resume keep immutable day rules', async () => {
  const memory = createMemoryStorage();
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);
  const draft = await seasons.createSeasonDraft(memory.storage, {
    ...command('create-season-2'),
    name: 'Season 2',
    campaignName: 'Second Splash',
    startArenaDay: 61,
  });
  assert.equal(draft.endArenaDay, 120);

  await seasons.addSeasonEvent(memory.storage, {
    ...command('add-season-2-event'),
    seasonId: draft.id,
    currentArenaDay: 1,
    event: {
      id: 'launch-weekend',
      name: 'Launch Weekend',
      startArenaDay: 61,
      endArenaDay: 63,
      ruleSetId: 'double-clout',
    },
  });
  await seasons.scheduleSeason(memory.storage, {
    ...command('schedule-season-2'),
    seasonId: draft.id,
    currentArenaDay: 1,
  });

  assert.deepEqual(await seasons.loadSeasonScoringContext(memory.storage, 60), {
    seasonId: 'season-1',
    eventId: null,
    scoreMultiplier: 1,
  });
  assert.deepEqual(await seasons.loadSeasonScoringContext(memory.storage, 61), {
    seasonId: 'season-2',
    eventId: 'launch-weekend',
    scoreMultiplier: 2,
  });
  assert.equal(
    await seasons.loadSeasonScoringContext(memory.storage, 121),
    null
  );

  await seasons.pauseSeason(memory.storage, {
    ...command('pause-season-2', 'Emergency maintenance.'),
    seasonId: 'season-2',
    currentArenaDay: 62,
  });
  assert.equal(
    await seasons.loadSeasonScoringContext(memory.storage, 61).then(Boolean),
    true
  );
  assert.equal(
    await seasons.loadSeasonScoringContext(memory.storage, 62),
    null
  );
  await seasons.resumeSeason(memory.storage, {
    ...command('resume-season-2', 'Maintenance complete.'),
    seasonId: 'season-2',
    currentArenaDay: 64,
  });
  assert.equal(
    await seasons.loadSeasonScoringContext(memory.storage, 63),
    null
  );
  assert.equal(
    await seasons.loadSeasonScoringContext(memory.storage, 64).then(Boolean),
    true
  );

  const audits = await memory.storage.hGetAll(
    seasons.getSeasonAuditRecordsKey()
  );
  assert.match(audits['schedule-season-2'], /Season test administration/);
  assert.match(audits['pause-season-2'], /Emergency maintenance/);
});

test('Clout and season points settle atomically and exactly once', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  await memory.storage.hSet(clout.getBackKey(5), {
    championScout: 'champion-scribbit',
  });
  const scoring = {
    seasonId: 'season-1',
    eventId: 'opening-rumble',
    scoreMultiplier: 2,
  };

  const payout = await clout.payCloutForRumble(memory.storage, {
    day: 5,
    championScribbitId: 'champion-scribbit',
    runnerUpScribbitId: null,
    paidAtMs: 5_000,
    seasonScoring: scoring,
  });
  assert.equal(payout.paidBackers, 1);
  assert.equal(
    await memory.storage.zScore(clout.getCloutKey(), 'championScout'),
    3
  );
  assert.equal(
    await memory.storage.zScore(
      seasons.getSeasonRankingKey('season-1'),
      'championScout'
    ),
    6
  );

  const retry = await clout.payCloutForRumble(memory.storage, {
    day: 5,
    championScribbitId: 'champion-scribbit',
    runnerUpScribbitId: null,
    paidAtMs: 5_000,
    seasonScoring: scoring,
  });
  assert.equal(retry.paidBackers, 0);
  assert.equal(
    await memory.storage.zScore(clout.getCloutKey(), 'championScout'),
    3
  );
  assert.equal(
    await memory.storage.zScore(
      seasons.getSeasonRankingKey('season-1'),
      'championScout'
    ),
    6
  );
});

test('Season participation rewards unlock once from durable daily Picks', async () => {
  const memory = createMemoryStorage();
  const player = { userId: 't2_picker', username: 'DailyPicker' };
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);

  for (let day = 1; day <= 7; day += 1) {
    const claim = await clout.claimDailyBack(
      memory.storage,
      day,
      player,
      `entrant-${day}`
    );
    assert.equal(claim.claimed, true);
    assert.equal(claim.seasonPicksMade, day);
    if (day === 1) assert.equal(claim.unlockedMilestoneId, 'entrant');
    if (day === 7) assert.equal(claim.unlockedMilestoneId, 'first-week');
  }

  const duplicate = await clout.claimDailyBack(
    memory.storage,
    7,
    player,
    'different-entrant'
  );
  assert.equal(duplicate.claimed, false);
  assert.equal(duplicate.seasonPicksMade, 7);
  assert.equal(await inkStore.getInkBalance(memory.storage, player.userId), 7);
  const inventory = await inkStore.loadInventory(memory.storage, player.userId);
  assert.ok(inventory.titles.includes('season-one-entrant'));
  assert.equal(
    await memory.storage.zScore(
      seasons.getSeasonParticipationKey('season-1'),
      player.userId
    ),
    7
  );
});

test('Final standings use competition ranks and include every cutoff tie', async () => {
  const memory = createMemoryStorage();
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);
  const rankingEntries = Array.from({ length: 99 }, (_, index) => ({
    member: `ranked-${index + 1}`,
    score: 200 - index,
  }));
  rankingEntries.push(
    { member: 'cutoff-tie-a', score: 100 },
    { member: 'cutoff-tie-b', score: 100 }
  );
  await memory.storage.zAdd(
    seasons.getSeasonRankingKey('season-1'),
    ...rankingEntries
  );
  await memory.storage.zAdd(
    seasons.getSeasonParticipationKey('season-1'),
    ...rankingEntries.map((entry) => ({ member: entry.member, score: 15 }))
  );

  await seasons.finalizeDueSeasons(memory.storage, 60, 60_000);
  const board = await seasons.loadSeasonFinalBoardEntries(
    memory.storage,
    'season-1'
  );
  assert.equal(board.length, 101);
  assert.deepEqual(
    board.slice(-2).map(({ rank, rewardTier }) => ({ rank, rewardTier })),
    [
      { rank: 100, rewardTier: 'top-hundred' },
      { rank: 100, rewardTier: 'top-hundred' },
    ]
  );
});

test('protected Season 1 reset clears season state but preserves player economy', async () => {
  const memory = createMemoryStorage();
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);
  await memory.storage.zAdd(seasons.getSeasonRankingKey('season-1'), {
    member: 't2_preserved',
    score: 12,
  });
  await memory.storage.zAdd(seasons.getSeasonParticipationKey('season-1'), {
    member: 't2_preserved',
    score: 8,
  });
  await memory.storage.zAdd(clout.getCloutKey(), {
    member: 't2_preserved',
    score: 99,
  });
  await memory.storage.set(inkStore.getInkKey('t2_preserved'), '17');

  const reset = await seasons.resetSeasonOne(memory.storage, {
    currentArenaDay: 10,
    actor: admin,
    operationId: 'reset-season-one-test',
    recordedAtMs: 10_000,
    reason: 'Balance migration test.',
  });
  assert.equal(reset.startArenaDay, 11);
  assert.equal(reset.endArenaDay, 70);
  assert.equal(
    await memory.storage.zScore(
      seasons.getSeasonRankingKey('season-1'),
      't2_preserved'
    ),
    undefined
  );
  assert.equal(
    await memory.storage.zScore(
      seasons.getSeasonParticipationKey('season-1'),
      't2_preserved'
    ),
    undefined
  );
  assert.equal(
    await memory.storage.zScore(clout.getCloutKey(), 't2_preserved'),
    99
  );
  assert.equal(
    await inkStore.getInkBalance(memory.storage, 't2_preserved'),
    17
  );

  const retry = await seasons.resetSeasonOne(memory.storage, {
    currentArenaDay: 99,
    actor: admin,
    operationId: 'reset-season-one-test',
    recordedAtMs: 99_000,
    reason: 'Idempotent retry.',
  });
  assert.deepEqual(retry, reset);
});

test('Season 1 reset refuses to duplicate rewards already granted to players', async () => {
  const memory = createMemoryStorage();
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);
  await clout.claimDailyBack(
    memory.storage,
    1,
    { userId: 't2_rewarded', username: 'RewardedPlayer' },
    'entrant-one'
  );

  await assert.rejects(
    seasons.resetSeasonOne(memory.storage, {
      currentArenaDay: 1,
      actor: admin,
      operationId: 'unsafe-reset-season-one',
      recordedAtMs: 1_000,
      reason: 'This must be refused.',
    }),
    /rewards were already granted/
  );
  assert.equal((await seasons.loadSeasonCatalog(memory.storage)).length, 1);
});

test('Rollover freezes standings, awards receipts once, and drafts the next season', async () => {
  const memory = createMemoryStorage();
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);
  await memory.storage.zAdd(
    seasons.getSeasonRankingKey('season-1'),
    { member: 't2_second', score: 21 },
    { member: 't2_winner', score: 42 }
  );
  await memory.storage.zAdd(
    seasons.getSeasonParticipationKey('season-1'),
    { member: 't2_second', score: 20 },
    { member: 't2_winner', score: 20 }
  );
  await memory.storage.hSet(clout.getCloutUsernameKey(), {
    t2_winner: 'InkWinner',
    t2_second: 'InkSecond',
  });

  assert.deepEqual(
    await seasons.finalizeDueSeasons(memory.storage, 59, 59_000),
    []
  );
  assert.deepEqual(
    await seasons.finalizeDueSeasons(memory.storage, 60, 60_000),
    ['season-1']
  );
  assert.deepEqual(
    await seasons.finalizeDueSeasons(memory.storage, 60, 61_000),
    []
  );
  assert.deepEqual(
    await seasons.loadSeasonFinalBoardEntries(memory.storage, 'season-1'),
    [
      {
        username: 'InkWinner',
        score: 42,
        rank: 1,
        picksMade: 20,
        projectedRewardTier: 'champion',
        rewardTier: 'champion',
      },
      {
        username: 'InkSecond',
        score: 21,
        rank: 2,
        picksMade: 20,
        projectedRewardTier: 'top-ten',
        rewardTier: 'top-ten',
      },
    ]
  );

  const catalog = await seasons.loadSeasonCatalog(memory.storage);
  assert.deepEqual(
    catalog.map(({ id, lifecycle, startArenaDay, endArenaDay }) => ({
      id,
      lifecycle,
      startArenaDay,
      endArenaDay,
    })),
    [
      {
        id: 'season-1',
        lifecycle: 'finalized',
        startArenaDay: 1,
        endArenaDay: 60,
      },
      {
        id: 'season-2',
        lifecycle: 'draft',
        startArenaDay: 61,
        endArenaDay: 120,
      },
    ]
  );

  const board = await seasons.loadSeasonBoard(memory.storage, 61, {
    userId: 't2_winner',
    username: 'RenamedWinner',
  });
  assert.equal(board.finalized, true);
  assert.deepEqual(board.top[0], {
    username: 'InkWinner',
    score: 42,
    rank: 1,
    picksMade: 20,
    projectedRewardTier: 'champion',
    rewardTier: 'champion',
  });
  assert.deepEqual(board.me, board.top[0]);

  const publicState = await seasons.loadSeasonPublicState(
    memory.storage,
    61,
    't2_winner'
  );
  assert.equal(publicState.current, null);
  assert.equal(publicState.latestFinalized.id, 'season-1');
  assert.equal(publicState.latestReward.tier, 'champion');
  assert.equal(publicState.latestReward.score, 42);
});

test('Corrupt season catalog and reward bytes fail closed without writes', async () => {
  const corruptCatalog = createMemoryStorage({
    hashes: {
      [seasons.getSeasonCatalogKey()]: { 'season-1': '{"id":"season-1"}' },
    },
  });
  await assert.rejects(
    seasons.loadSeasonCatalog(corruptCatalog.storage),
    /Stored season season-1 is invalid/
  );
  assert.deepEqual(corruptCatalog.mutations, []);

  const memory = createMemoryStorage();
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);
  await seasons.finalizeDueSeasons(memory.storage, 60, 60_000);
  await memory.storage.hSet(seasons.getSeasonRewardsKey('season-1'), {
    t2_corrupt: '{"rank":1}',
  });
  const mutationsBeforeRead = memory.mutations.length;
  await assert.rejects(
    seasons.loadSeasonPublicState(memory.storage, 61, 't2_corrupt'),
    /Stored season reward is invalid/
  );
  assert.equal(memory.mutations.length, mutationsBeforeRead);
});

test('Player deletion removes live score, reward, and frozen standing', async () => {
  const memory = createMemoryStorage();
  await seasons.ensureInitialSeason(memory.storage, 1, 100, admin);
  await memory.storage.zAdd(seasons.getSeasonRankingKey('season-1'), {
    member: 't2_delete_me',
    score: 12,
  });
  await memory.storage.hSet(clout.getCloutUsernameKey(), {
    t2_delete_me: 'DeleteMe',
  });
  await seasons.finalizeDueSeasons(memory.storage, 60, 60_000);

  await seasons.deleteSeasonPlayerData(memory.storage, 't2_delete_me');

  assert.equal(
    await memory.storage.zScore(
      seasons.getSeasonRankingKey('season-1'),
      't2_delete_me'
    ),
    undefined
  );
  assert.equal(
    await memory.storage.hGet(
      seasons.getSeasonRewardsKey('season-1'),
      't2_delete_me'
    ),
    undefined
  );
  const board = await seasons.loadSeasonBoard(memory.storage, 61, {
    userId: 't2_delete_me',
    username: 'DeleteMe',
  });
  assert.deepEqual(board.top, []);
  assert.equal(board.me, null);
});
