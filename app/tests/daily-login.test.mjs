import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledServerRoot || !compiledSharedRoot) {
  throw new Error('Run daily login tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const dailyLogin = require(join(compiledServerRoot, 'core', 'dailyLogin.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const dailyLoginContract = require(join(compiledSharedRoot, 'dailylogin.js'));

const claim = (storage, userId, currentDateKey, claimedAtMs) =>
  dailyLogin.claimDailyLoginReward(storage, {
    userId,
    currentDateKey,
    claimedAtMs,
  });

test('daily login claims distinct UTC days without resetting missed progress', async () => {
  const memory = createMemoryStorage();
  const userId = 'daily-login-player';

  assert.deepEqual(
    await dailyLogin.loadDailyLoginState(memory.storage, userId, '20260701'),
    {
      claimedTrackDays: 0,
      totalClaimedDays: 0,
      claimedToday: false,
      nextReward: dailyLoginContract.DAILY_LOGIN_TRACK[0],
    }
  );

  const dayOne = await claim(memory.storage, userId, '20260701', 1_000);
  assert.equal(dayOne.status, 'claimed');
  assert.equal(dayOne.reward.inkAwarded, 1);
  assert.equal(dayOne.dailyLogin.claimedTrackDays, 1);
  assert.equal(dayOne.dailyLogin.totalClaimedDays, 1);
  assert.equal(await inkStore.getInkBalance(memory.storage, userId), 1);

  const repeatedDayOne = await claim(memory.storage, userId, '20260701', 2_000);
  assert.equal(repeatedDayOne.status, 'already-claimed');
  assert.equal(await inkStore.getInkBalance(memory.storage, userId), 1);

  const dayTwoAfterGap = await claim(memory.storage, userId, '20260704', 3_000);
  assert.equal(dayTwoAfterGap.reward.trackDay, 2);
  assert.equal(dayTwoAfterGap.dailyLogin.claimedTrackDays, 2);
  assert.equal(await inkStore.getInkBalance(memory.storage, userId), 2);
});

test('daily login continues with a visible repeating Studio Week after day seven', async () => {
  const memory = createMemoryStorage();
  const userId = 'repeat-login-player';

  for (let day = 1; day <= 14; day += 1) {
    const dateKey = `202607${String(day).padStart(2, '0')}`;
    await claim(memory.storage, userId, dateKey, day * 1_000);
  }

  const state = await dailyLogin.loadDailyLoginState(
    memory.storage,
    userId,
    '20260715'
  );
  assert.equal(state.claimedTrackDays, 7);
  assert.equal(state.totalClaimedDays, 14);
  assert.deepEqual(
    state.nextReward,
    dailyLoginContract.DAILY_LOGIN_REPEAT_TRACK[0]
  );
  assert.equal(
    await inkStore.getInkBalance(memory.storage, userId),
    35,
    'starter week awards 17 Ink and each repeating Studio Week awards 18'
  );

  const nextWeek = await claim(
    memory.storage,
    userId,
    '20260720',
    20_000
  );
  assert.equal(nextWeek.reward.cycleDay, 1);
  assert.equal(nextWeek.dailyLogin.nextReward.cycleDay, 2);
  assert.equal(nextWeek.dailyLogin.totalClaimedDays, 15);
});

test('the seventh login grants one Epic Golden Crown and five Ink', async () => {
  const memory = createMemoryStorage();
  const userId = 'seven-day-player';
  for (let day = 1; day <= 7; day += 1) {
    const dateKey = `2026070${day}`;
    await claim(memory.storage, userId, dateKey, day * 1_000);
  }

  const inventory = await inkStore.loadInventory(memory.storage, userId);
  assert.equal(
    await inkStore.getInkBalance(memory.storage, userId),
    17,
    'the seven-day track should award 1+1+2+2+3+3+5 Ink'
  );
  assert.equal(inventory.items['golden-crown'], 1);
  assert.deepEqual(inventory.gear['golden-crown'], {
    rank: 1,
    copies: 1,
    rarity: 'epic',
  });
  assert.ok(inventory.discovered.includes('golden-crown'));

  const repeated = await claim(memory.storage, userId, '20260707', 8_000);
  assert.equal(repeated.status, 'already-claimed');
  assert.equal(
    (await inkStore.loadInventory(memory.storage, userId)).items[
      'golden-crown'
    ],
    1
  );
});

test('day-seven recovery survives a lost transaction reply exactly once', async () => {
  const userId = 'reply-loss-login-player';
  const loginKey = dailyLogin.getDailyLoginKey(userId);
  const inventoryKey = inkStore.getInventoryKey(userId);
  const memory = createMemoryStorage({
    loseNextCommitReply: true,
    strings: { [inkStore.getInkKey(userId)]: '12' },
    hashes: {
      [loginKey]: {
        'claimed-track-days': '6',
        'last-claim-date': '20260706',
        'last-reward': JSON.stringify({
          trackDay: 6,
          inkAwarded: 3,
          gearId: null,
          claimedAtMs: 6_000,
        }),
      },
      [inventoryKey]: {
        'golden-crown': '2',
        'gear-rank:golden-crown': '4',
        'discovered:golden-crown': '1',
      },
    },
  });

  const result = await claim(memory.storage, userId, '20260707', 7_000);
  assert.equal(result.status, 'claimed');
  assert.equal(result.recovered, true);
  assert.equal(await inkStore.getInkBalance(memory.storage, userId), 17);
  const inventory = await inkStore.loadInventory(memory.storage, userId);
  assert.equal(inventory.items['golden-crown'], 3);
  assert.equal(inventory.gear['golden-crown']?.rank, 4);

  await claim(memory.storage, userId, '20260707', 8_000);
  const retriedInventory = await inkStore.loadInventory(memory.storage, userId);
  assert.equal(retriedInventory.items['golden-crown'], 3);
  assert.equal(await inkStore.getInkBalance(memory.storage, userId), 17);
});

test('corrupt daily login progress fails closed without a reward', async () => {
  const userId = 'corrupt-login-player';
  const memory = createMemoryStorage({
    hashes: {
      [dailyLogin.getDailyLoginKey(userId)]: {
        'claimed-track-days': 'seven',
        'last-claim-date': 'not-a-date',
        'last-reward': '{}',
      },
    },
  });

  await assert.rejects(
    claim(memory.storage, userId, '20260707', 7_000),
    /Stored daily login/
  );
  assert.equal(await inkStore.getInkBalance(memory.storage, userId), 0);
  assert.deepEqual(await inkStore.loadInventory(memory.storage, userId), {
    items: {},
    gear: {},
    pens: [],
    titles: [],
    equippedTitle: null,
    discovered: [],
  });
});
