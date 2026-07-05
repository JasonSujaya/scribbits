import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const repoRoot = process.cwd();
const outDir = join(tmpdir(), 'scribbits-arena-sim-tests');
const tscPath = join(repoRoot, 'node_modules', '.bin', 'tsc');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
symlinkSync(join(repoRoot, 'node_modules'), join(outDir, 'node_modules'), 'dir');

execFileSync(
  tscPath,
  [
    '--ignoreConfig',
    '--ignoreDeprecations',
    '6.0',
    '--module',
    'CommonJS',
    '--moduleResolution',
    'Node',
    '--target',
    'ES2022',
    '--rootDir',
    'src',
    '--outDir',
    outDir,
    '--esModuleInterop',
    '--skipLibCheck',
    '--types',
    'node',
    'src/shared/arena.ts',
    'src/shared/analyzer-core.ts',
    'src/shared/battle.ts',
    'src/server/core/day.ts',
    'src/server/core/random.ts',
    'src/server/core/ink.ts',
    'src/server/core/inkStore.ts',
    'src/server/core/forecast.ts',
    'src/server/core/arenaStore.ts',
    'src/server/core/clout.ts',
    'src/server/core/battleStore.ts',
    'src/server/core/battle.ts',
    'src/server/core/species.ts',
    'src/server/core/rumble.ts',
    'src/server/core/scribbit.ts',
    'src/server/core/dailyJob.ts',
    'src/client/lib/pens.ts',
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

const require = createRequire(import.meta.url);
const analyzerCore = require(join(outDir, 'shared', 'analyzer-core.js'));
const sharedBattle = require(join(outDir, 'shared', 'battle.js'));
const arena = require(join(outDir, 'shared', 'arena.js'));
const arenaStore = require(join(outDir, 'server', 'core', 'arenaStore.js'));
const battle = require(join(outDir, 'server', 'core', 'battle.js'));
const clout = require(join(outDir, 'server', 'core', 'clout.js'));
const dailyJob = require(join(outDir, 'server', 'core', 'dailyJob.js'));
const forecastCore = require(join(outDir, 'server', 'core', 'forecast.js'));
const inkCatalog = require(join(outDir, 'server', 'core', 'ink.js'));
const inkStore = require(join(outDir, 'server', 'core', 'inkStore.js'));
const rumble = require(join(outDir, 'server', 'core', 'rumble.js'));
const scribbitCore = require(join(outDir, 'server', 'core', 'scribbit.js'));
const clientPens = require(join(outDir, 'client', 'lib', 'pens.js'));

const passedChecks = [];

const pass = (name) => {
  passedChecks.push(name);
};

const makeScribbit = (overrides = {}) => {
  return {
    id: overrides.id ?? 'scribbit-test',
    name: overrides.name ?? 'Gerald',
    artist: overrides.artist ?? 'tester',
    element: overrides.element ?? 'storm',
    stats: overrides.stats ?? {
      chonk: 25,
      spike: 25,
      zip: 25,
      charm: 25,
    },
    imageUrl: overrides.imageUrl ?? '/api/drawing/test',
    bornDay: overrides.bornDay ?? 1,
    expiresDay: overrides.expiresDay ?? 4,
    belief: overrides.belief ?? 0,
    wins: overrides.wins ?? 0,
    losses: overrides.losses ?? 0,
    status: overrides.status ?? 'alive',
    legendTitle: overrides.legendTitle ?? null,
    isFounding: overrides.isFounding ?? false,
    accessories: overrides.accessories ? [...overrides.accessories] : [],
    level: overrides.level ?? 1,
    xp: overrides.xp ?? 0,
    mood: overrides.mood ?? 'hungry',
    careDoneToday: overrides.careDoneToday
      ? [...overrides.careDoneToday]
      : [],
  };
};

const sumStats = (stats) => {
  return stats.chonk + stats.spike + stats.zip + stats.charm;
};

const createMemoryStorage = () => {
  const values = new Map();
  const hashes = new Map();
  const sortedSets = new Map();

  const getHash = (key) => {
    const existing = hashes.get(key);
    if (existing) return existing;
    const next = new Map();
    hashes.set(key, next);
    return next;
  };

  const getSortedSet = (key) => {
    const existing = sortedSets.get(key);
    if (existing) return existing;
    const next = new Map();
    sortedSets.set(key, next);
    return next;
  };

  const entriesByRank = (set, reverse) => {
    const entries = [...set.entries()]
      .map(([member, score]) => ({ member, score }))
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score;
        }
        return left.member.localeCompare(right.member);
      });
    return reverse ? entries.reverse() : entries;
  };

  const sliceByRedisRank = (entries, start, stop) => {
    const normalizedStart = Number(start);
    const normalizedStop = Number(stop);
    const end =
      normalizedStop < 0 ? entries.length : Math.min(entries.length, normalizedStop + 1);
    return entries.slice(normalizedStart, end);
  };

  return {
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      values.set(key, value);
    },
    async del(...keys) {
      for (const key of keys) {
        values.delete(key);
        hashes.delete(key);
        sortedSets.delete(key);
      }
    },
    async incrBy(key, value) {
      const next = Number(values.get(key) ?? '0') + value;
      values.set(key, String(next));
      return next;
    },
    async expire() {},
    async hGet(key, field) {
      return getHash(key).get(field);
    },
    async hGetAll(key) {
      return Object.fromEntries(getHash(key).entries());
    },
    async hSet(key, fieldValues) {
      const hash = getHash(key);
      for (const [field, value] of Object.entries(fieldValues)) {
        hash.set(field, value);
      }
    },
    async hSetNX(key, field, value) {
      const hash = getHash(key);
      if (hash.has(field)) {
        return 0;
      }
      hash.set(field, value);
      return 1;
    },
    async hDel(key, fields) {
      const hash = getHash(key);
      let deleted = 0;
      for (const field of fields) {
        if (hash.delete(field)) {
          deleted += 1;
        }
      }
      return deleted;
    },
    async hIncrBy(key, field, value) {
      const hash = getHash(key);
      const next = Number(hash.get(field) ?? '0') + value;
      hash.set(field, String(next));
      return next;
    },
    async zAdd(key, ...members) {
      const set = getSortedSet(key);
      for (const entry of members) {
        set.set(entry.member, entry.score);
      }
    },
    async zCard(key) {
      return getSortedSet(key).size;
    },
    async zRange(key, start, stop, options = { by: 'rank' }) {
      const set = getSortedSet(key);
      if (options.by === 'score') {
        const min = Number(start);
        const max = Number(stop);
        return entriesByRank(set, Boolean(options.reverse)).filter((entry) => {
          return entry.score >= min && entry.score <= max;
        });
      }
      return sliceByRedisRank(
        entriesByRank(set, Boolean(options.reverse)),
        start,
        stop
      );
    },
    async zRem(key, members) {
      const set = getSortedSet(key);
      for (const member of members) {
        set.delete(member);
      }
    },
    async zScore(key, member) {
      return getSortedSet(key).get(member);
    },
    async zRank(key, member) {
      const rank = entriesByRank(getSortedSet(key), false).findIndex((entry) => {
        return entry.member === member;
      });
      return rank >= 0 ? rank : undefined;
    },
    async zIncrBy(key, member, value) {
      const set = getSortedSet(key);
      const next = Number(set.get(member) ?? 0) + value;
      set.set(member, next);
      return next;
    },
  };
};

const forecast = forecastCore.generateForecastForDay(7);
const alpha = makeScribbit({
  id: 'alpha',
  name: 'Alpha',
  element: 'ember',
  stats: { chonk: 22, spike: 38, zip: 26, charm: 14 },
});
const beta = makeScribbit({
  id: 'beta',
  name: 'Beta',
  element: 'moss',
  stats: { chonk: 40, spike: 18, zip: 18, charm: 24 },
});

const syntheticRgba = new Uint8Array(32 * 32 * 4);
for (let y = 4; y < 24; y += 1) {
  for (let x = 5; x < 25; x += 1) {
    const offset = (y * 32 + x) * 4;
    syntheticRgba[offset] = 255;
    syntheticRgba[offset + 1] = 32;
    syntheticRgba[offset + 2] = 16;
    syntheticRgba[offset + 3] = 255;
  }
}
const analyzerOne = analyzerCore.analyze({
  data: syntheticRgba,
  width: 32,
  height: 32,
});
const analyzerTwo = analyzerCore.analyze({
  data: syntheticRgba,
  width: 32,
  height: 32,
});
assert.deepEqual(analyzerOne, analyzerTwo, 'analyzer-core should be deterministic');
assert.equal(analyzerOne.inkedPixels, 400, 'synthetic fixture should count ink');
assert.equal(sumStats(analyzerOne.stats), arena.STAT_BUDGET, 'analyzer stats sum');
assert.equal(analyzerOne.element, 'ember', 'red fixture should map to ember');
pass('analyzer-core deterministic RGBA fixture');

const reportOne = battle.simulate(alpha, beta, 12345, forecast, 'exhibition');
const reportTwo = battle.simulate(alpha, beta, 12345, forecast, 'exhibition');
assert.deepEqual(reportOne, reportTwo, 'same seed should produce identical report');
assert.equal(reportOne.events[0].type, 'intro', 'intro should be first');
assert.equal(
  reportOne.events[0].hpA,
  sharedBattle.getBattleMaxHp(alpha.stats),
  'battle report A HP should use shared max HP'
);
assert.equal(
  reportOne.events[0].hpB,
  sharedBattle.getBattleMaxHp(beta.stats),
  'battle report B HP should use shared max HP'
);
assert.equal(
  reportOne.events[reportOne.events.length - 1].type,
  'faint',
  'faint should be last'
);
assert.ok(
  reportOne.events.length >= 6 && reportOne.events.length <= 14,
  'battle reports should stay inside the event budget'
);
pass('battle determinism and shared max HP');

const normalizedStats = scribbitCore.normalizeStats({
  chonk: 999,
  spike: 1,
  zip: -20,
  charm: Number.POSITIVE_INFINITY,
});
assert.equal(sumStats(normalizedStats), arena.STAT_BUDGET, 'stats sum to 100');
for (const value of Object.values(normalizedStats)) {
  assert.ok(value >= arena.STAT_MIN, 'stat should respect minimum');
  assert.ok(value <= arena.STAT_MAX, 'stat should respect maximum');
}
pass('server stat normalization bounds');

const oldRecordStorage = createMemoryStorage();
const oldStoredScribbit = {
  id: 'old-record',
  name: 'Old Record',
  artist: 'tester',
  element: 'storm',
  stats: {
    chonk: 25,
    spike: 25,
    zip: 25,
    charm: 25,
  },
  imageUrl: '/api/drawing/old-record',
  bornDay: 1,
  expiresDay: 4,
  belief: 0,
  wins: 0,
  losses: 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
};
await oldRecordStorage.set(
  scribbitCore.getScribbitKey(oldStoredScribbit.id),
  JSON.stringify(oldStoredScribbit)
);
const migratedOldRecord = await scribbitCore.loadScribbit(
  oldRecordStorage,
  oldStoredScribbit.id,
  '20260705'
);
assert.ok(migratedOldRecord, 'old stored Scribbit should parse');
assert.equal(migratedOldRecord.level, 1, 'old record should default level');
assert.equal(migratedOldRecord.xp, 0, 'old record should default xp');
assert.equal(migratedOldRecord.mood, 'hungry', 'old record should hydrate mood');
assert.deepEqual(
  migratedOldRecord.careDoneToday,
  [],
  'old record should default daily care'
);
pass('old-record migration defaults');

assert.equal(
  battle.getElementDamageMultiplier('ember', 'moss'),
  1.25,
  'ember should prey on moss'
);
assert.equal(
  battle.getElementDamageMultiplier('moss', 'ember'),
  0.75,
  'moss should be weak into ember'
);
pass('element damage triangle');

assert.equal(
  battle.getLevelDamageMultiplier(1),
  1,
  'level 1 should not add damage'
);
assert.equal(
  battle.getLevelDamageMultiplier(arena.MAX_LEVEL),
  1 + (arena.MAX_LEVEL - 1) * arena.LEVEL_DAMAGE_BONUS_PER_LEVEL,
  'max level should add the configured damage bonus'
);
assert.equal(
  battle.getLevelDamageMultiplier(99),
  1 + (arena.MAX_LEVEL - 1) * arena.LEVEL_DAMAGE_BONUS_PER_LEVEL,
  'damage bonus should cap at max level'
);
assert.equal(
  battle.getLevelDamageMultiplier(99),
  1.08,
  'level bonus should cap at +8%'
);
pass('level damage bonus cap');

assert.equal(
  scribbitCore.deriveMoodFromCareActions([]),
  'hungry',
  'no care actions should be hungry'
);
assert.equal(
  scribbitCore.deriveMoodFromCareActions(['feed']),
  'sleepy',
  'one care action should be sleepy'
);
assert.equal(
  scribbitCore.deriveMoodFromCareActions(['feed', 'pat']),
  'happy',
  'two care actions should be happy'
);
assert.equal(
  scribbitCore.deriveMoodFromCareActions(['feed', 'pat', 'train']),
  'pumped',
  'three care actions should be pumped'
);
pass('mood derivation table');

assert.equal(
  inkStore.chooseCapsuleRarity(0.699),
  'common',
  'capsule roll below 70% should be common'
);
assert.equal(
  inkStore.chooseCapsuleRarity(0.7),
  'rare',
  'capsule roll at 70% should be rare'
);
assert.equal(
  inkStore.chooseCapsuleRarity(0.949),
  'rare',
  'capsule roll below 95% should remain rare'
);
assert.equal(
  inkStore.chooseCapsuleRarity(0.95),
  'epic',
  'capsule roll at 95% should be epic'
);
const deterministicCapsuleDropOne = inkStore.selectCapsuleDrop({
  userId: 'deterministic-player',
  day: 7,
  pullCount: 3,
  pullsSinceEpic: 0,
});
const deterministicCapsuleDropTwo = inkStore.selectCapsuleDrop({
  userId: 'deterministic-player',
  day: 7,
  pullCount: 3,
  pullsSinceEpic: 0,
});
assert.deepEqual(
  deterministicCapsuleDropOne,
  deterministicCapsuleDropTwo,
  'same user/day/pull count should select the same capsule drop'
);
assert.deepEqual(
  inkCatalog.INK_PEN_CATALOG.map((entry) => entry.id).sort(),
  clientPens.PEN_CATALOG.map((entry) => entry.id).sort(),
  'server-awarded pen ids should all render in the Draw palette'
);
pass('capsule weighted deterministic pull selection');

assert.equal(
  inkStore.isCapsulePityPull(arena.CAPSULE_PITY - 2),
  false,
  'pity should not trigger before the guaranteed pull'
);
assert.equal(
  inkStore.isCapsulePityPull(arena.CAPSULE_PITY - 1),
  true,
  'pity should trigger on exactly the guaranteed pull'
);
const pityStorage = createMemoryStorage();
await pityStorage.set(inkStore.getInkKey('pity-player'), String(arena.CAPSULE_COST));
await pityStorage.set(
  inkStore.getPullsSinceEpicKey('pity-player'),
  String(arena.CAPSULE_PITY - 1)
);
const pityResult = await inkStore.pullCapsuleForUser(
  pityStorage,
  'pity-player',
  7
);
assert.equal(pityResult.status, 'pulled', 'pity pull should complete');
assert.equal(
  pityResult.pull.rarity,
  'epic',
  'exact pity pull should force an epic'
);
assert.equal(
  await pityStorage.get(inkStore.getPullsSinceEpicKey('pity-player')),
  '0',
  'epic pull should reset pity'
);
pass('capsule pity triggers at exactly configured count');

const duplicateStorage = createMemoryStorage();
const duplicateUserId = 'duplicate-accessory-0';
const duplicateDay = 5;
const firstDuplicateDrop = inkStore.selectCapsuleDrop({
  userId: duplicateUserId,
  day: duplicateDay,
  pullCount: 1,
  pullsSinceEpic: 0,
});
const secondDuplicateDrop = inkStore.selectCapsuleDrop({
  userId: duplicateUserId,
  day: duplicateDay,
  pullCount: 2,
  pullsSinceEpic: firstDuplicateDrop.rarity === 'epic' ? 0 : 1,
});
assert.equal(
  firstDuplicateDrop.kind,
  'accessory',
  'fixture should start with an accessory'
);
assert.equal(
  secondDuplicateDrop.id,
  firstDuplicateDrop.id,
  'fixture should pull the same accessory twice'
);
await duplicateStorage.set(
  inkStore.getInkKey(duplicateUserId),
  String(arena.CAPSULE_FIRST_DAILY_COST + arena.CAPSULE_COST)
);
const firstDuplicateResult = await inkStore.pullCapsuleForUser(
  duplicateStorage,
  duplicateUserId,
  duplicateDay
);
assert.equal(
  firstDuplicateResult.status,
  'pulled',
  'first accessory pull should complete'
);
assert.equal(
  firstDuplicateResult.pull.id,
  firstDuplicateDrop.id,
  'first pull should match fixture'
);
assert.equal(
  firstDuplicateResult.pull.isNew,
  true,
  'first accessory pull should report isNew true'
);
assert.equal(
  firstDuplicateResult.pull.ownedCount,
  1,
  'first accessory pull should own one copy'
);
const inkAfterFirstDuplicatePull = await inkStore.getInkBalance(
  duplicateStorage,
  duplicateUserId
);
assert.equal(
  inkAfterFirstDuplicatePull,
  arena.CAPSULE_COST,
  'first daily capsule pull should deduct discounted ink'
);
const secondDuplicateResult = await inkStore.pullCapsuleForUser(
  duplicateStorage,
  duplicateUserId,
  duplicateDay
);
assert.equal(
  secondDuplicateResult.status,
  'pulled',
  'second accessory pull should complete'
);
assert.equal(
  secondDuplicateResult.pull.id,
  firstDuplicateDrop.id,
  'second pull should match duplicate accessory fixture'
);
assert.equal(
  secondDuplicateResult.pull.isNew,
  false,
  'duplicate accessory pull should report isNew false'
);
assert.equal(
  secondDuplicateResult.pull.ownedCount,
  2,
  'duplicate accessory pull should stack to two copies'
);
assert.equal(
  secondDuplicateResult.inventory.items[firstDuplicateDrop.id],
  2,
  'duplicate accessory inventory should store two copies'
);
assert.equal(
  await inkStore.getInkBalance(duplicateStorage, duplicateUserId),
  inkAfterFirstDuplicatePull - arena.CAPSULE_COST,
  'duplicate accessory pull should deduct normal ink without refund'
);
pass('capsule duplicate accessory stacks without refund');

const poorStorage = createMemoryStorage();
await poorStorage.set(
  inkStore.getInkKey('poor-player'),
  String(arena.CAPSULE_FIRST_DAILY_COST - 1)
);
const poorResult = await inkStore.pullCapsuleForUser(poorStorage, 'poor-player', 7);
assert.equal(
  poorResult.status,
  'insufficientInk',
  'insufficient ink should reject the capsule pull'
);
assert.equal(
  await inkStore.getInkBalance(poorStorage, 'poor-player'),
  arena.CAPSULE_FIRST_DAILY_COST - 1,
  'rejected capsule pull should not spend ink'
);
const exactCostStorage = createMemoryStorage();
await exactCostStorage.set(
  inkStore.getInkKey('exact-cost-player'),
  String(arena.CAPSULE_COST)
);
const exactCostResult = await inkStore.pullCapsuleForUser(
  exactCostStorage,
  'exact-cost-player',
  7
);
assert.equal(exactCostResult.status, 'pulled', 'exact-cost pull should complete');
assert.ok(
  (await inkStore.getInkBalance(exactCostStorage, 'exact-cost-player')) >= 0,
  'capsule pull should never make ink negative'
);
pass('capsule ink balance never goes negative');

const flagStorage = createMemoryStorage();
assert.equal(
  await scribbitCore.claimDailyFlags(flagStorage, 'player-one', 4, [
    'drawn',
    'entered',
  ]),
  true,
  'first draw+entry claim should succeed'
);
assert.deepEqual(
  await scribbitCore.getDailyFlags(flagStorage, 'player-one', 4),
  {
    drawnToday: true,
    enteredToday: true,
    bossChallengedToday: false,
  },
  'draw+entry claim should be readable'
);
assert.equal(
  await scribbitCore.claimDailyFlags(flagStorage, 'player-one', 4, ['drawn']),
  false,
  'second draw claim should fail'
);

const rollbackFlagStorage = createMemoryStorage();
assert.equal(
  await scribbitCore.markDailyFlag(rollbackFlagStorage, 'player-two', 4, 'entered'),
  true,
  'existing entry claim setup should succeed'
);
assert.equal(
  await scribbitCore.claimDailyFlags(rollbackFlagStorage, 'player-two', 4, [
    'drawn',
    'entered',
  ]),
  false,
  'draw+entry claim should fail if entry was already taken'
);
assert.deepEqual(
  await scribbitCore.getDailyFlags(rollbackFlagStorage, 'player-two', 4),
  {
    drawnToday: false,
    enteredToday: true,
    bossChallengedToday: false,
  },
  'failed paired claim should roll back its drawn field'
);
await scribbitCore.releaseDailyFlags(flagStorage, 'player-one', 4, [
  'drawn',
  'entered',
]);
assert.deepEqual(
  await scribbitCore.getDailyFlags(flagStorage, 'player-one', 4),
  {
    drawnToday: false,
    enteredToday: false,
    bossChallengedToday: false,
  },
  'released draw+entry flags should not lock the player out'
);
pass('daily draw/entry flag claim, rollback, and release');

const backClaimStorage = createMemoryStorage();
const firstBackClaim = await clout.claimDailyBack(
  backClaimStorage,
  12,
  { userId: 'scout-one', username: 'Scout One' },
  'entrant-alpha'
);
assert.equal(firstBackClaim.claimed, true, 'first daily Back should claim');
assert.equal(
  firstBackClaim.backedScribbitId,
  'entrant-alpha',
  'first daily Back should store the target'
);
assert.equal(
  await clout.getBackedScribbitId(backClaimStorage, 12, 'scout-one'),
  'entrant-alpha',
  'stored Back should be readable'
);
const duplicateBackClaim = await clout.claimDailyBack(
  backClaimStorage,
  12,
  { userId: 'scout-one', username: 'Scout One' },
  'entrant-beta'
);
assert.equal(
  duplicateBackClaim.claimed,
  false,
  'second daily Back should not claim'
);
assert.equal(
  duplicateBackClaim.backedScribbitId,
  'entrant-alpha',
  'duplicate Back should report the original target'
);
const nextDayBackClaim = await clout.claimDailyBack(
  backClaimStorage,
  13,
  { userId: 'scout-one', username: 'Scout One' },
  'entrant-beta'
);
assert.equal(nextDayBackClaim.claimed, true, 'Back should reset next day');
pass('daily Back once-per-day claim');

const careStorage = createMemoryStorage();
const firstCare = await scribbitCore.claimDailyCareAction(
  careStorage,
  'care-me',
  'feed',
  '20260705',
  100
);
assert.equal(firstCare.claimed, true, 'first feed should claim');
assert.equal(firstCare.xpGain, 1, 'first care action should award one xp');
assert.equal(firstCare.mood, 'sleepy', 'first care action should hydrate sleepy');
assert.deepEqual(
  firstCare.careDoneToday,
  ['feed'],
  'first care action should be readable'
);
const duplicateCare = await scribbitCore.claimDailyCareAction(
  careStorage,
  'care-me',
  'feed',
  '20260705',
  200
);
assert.equal(duplicateCare.claimed, false, 'duplicate feed should not claim');
assert.equal(duplicateCare.xpGain, 0, 'duplicate care should not award xp');
const secondCare = await scribbitCore.claimDailyCareAction(
  careStorage,
  'care-me',
  'pat',
  '20260705',
  300
);
assert.equal(secondCare.mood, 'happy', 'two actions should hydrate happy');
assert.equal(secondCare.xpGain, 1, 'second unique care should award one xp');
const thirdCare = await scribbitCore.claimDailyCareAction(
  careStorage,
  'care-me',
  'train',
  '20260705',
  400
);
assert.equal(thirdCare.mood, 'pumped', 'three actions should hydrate pumped');
assert.equal(thirdCare.xpGain, 2, 'pumped care action should award two xp');
const nextDayCare = await scribbitCore.claimDailyCareAction(
  careStorage,
  'care-me',
  'feed',
  '20260706',
  500
);
assert.equal(nextDayCare.claimed, true, 'care should reset on the next UTC day');
pass('care once-per-day claim');

const sparXpStorage = createMemoryStorage();
const sparScribbit = makeScribbit({ id: 'spar-xp', name: 'Spar XP' });
await scribbitCore.storeScribbit(sparXpStorage, 'spar-owner', sparScribbit);
const firstSparWin = await scribbitCore.claimDailySparWinXp(
  sparXpStorage,
  sparScribbit.id,
  '20260705',
  100
);
assert.equal(firstSparWin, true, 'first daily spar win should claim XP');
if (firstSparWin) {
  await scribbitCore.awardScribbitXp(
    sparXpStorage,
    sparScribbit.id,
    1,
    '20260705'
  );
}
const secondSparWin = await scribbitCore.claimDailySparWinXp(
  sparXpStorage,
  sparScribbit.id,
  '20260705',
  200
);
assert.equal(secondSparWin, false, 'second daily spar win should not claim XP');
if (secondSparWin) {
  await scribbitCore.awardScribbitXp(
    sparXpStorage,
    sparScribbit.id,
    1,
    '20260705'
  );
}
const sparXpAfterClaims = await scribbitCore.loadScribbit(
  sparXpStorage,
  sparScribbit.id,
  '20260705'
);
assert.ok(sparXpAfterClaims, 'spar Scribbit should remain stored');
assert.equal(sparXpAfterClaims.xp, 1, 'spar XP should only award once per day');
pass('spar xp only-first-win');

const dayMathStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(dayMathStorage, 2);
const dayTwoUtc = new Date(Date.UTC(2026, 6, 5));
const skippedJob = await dailyJob.runNightlyArenaJob(dayMathStorage, {
  now: dayTwoUtc,
});
assert.equal(skippedJob.skipped, true, 'stored canonical day should no-op');
assert.equal(skippedJob.newDay, 2, 'no-op should not advance day');
assert.equal(
  await arenaStore.ensureCurrentArenaDay(dayMathStorage, dayTwoUtc),
  2,
  'no-op should keep stored day'
);
const forcedJob = await dailyJob.runNightlyArenaJob(dayMathStorage, {
  now: dayTwoUtc,
  force: true,
});
assert.equal(forcedJob.skipped, false, 'force should run');
assert.equal(forcedJob.previousDay, 2, 'force should start from stored day');
assert.equal(forcedJob.newDay, 3, 'force should increment by exactly one');

const catchUpStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(catchUpStorage, 2);
const dayTwoEntrant = makeScribbit({ id: 'catch-up-day-two', expiresDay: 8 });
const dayThreeEntrant = makeScribbit({ id: 'catch-up-day-three', expiresDay: 8 });
await scribbitCore.storeScribbit(catchUpStorage, 'owner-two', dayTwoEntrant);
await scribbitCore.storeScribbit(catchUpStorage, 'owner-three', dayThreeEntrant);
await scribbitCore.addRumbleEntrant(catchUpStorage, 2, dayTwoEntrant.id);
await scribbitCore.addRumbleEntrant(catchUpStorage, 3, dayThreeEntrant.id);
const caughtUpJob = await dailyJob.runNightlyArenaJob(catchUpStorage, {
  now: new Date(Date.UTC(2026, 6, 7)),
});
assert.equal(caughtUpJob.skipped, false, 'lagged stored day should run');
assert.equal(caughtUpJob.newDay, 4, 'lagged stored day should catch up to canonical day');
assert.equal(caughtUpJob.resolvedDay, 3, 'catch-up should finish on the latest due rumble');
assert.ok(caughtUpJob.reportCount > forcedJob.reportCount, 'catch-up should resolve more than one day');
const resolvedDayTwoEntrant = await scribbitCore.loadScribbit(
  catchUpStorage,
  dayTwoEntrant.id
);
const resolvedDayThreeEntrant = await scribbitCore.loadScribbit(
  catchUpStorage,
  dayThreeEntrant.id
);
assert.ok(
  resolvedDayTwoEntrant.wins + resolvedDayTwoEntrant.losses > 0,
  'day-two entrant should not be skipped during catch-up'
);
assert.ok(
  resolvedDayThreeEntrant.wins + resolvedDayThreeEntrant.losses > 0,
  'day-three entrant should resolve during catch-up'
);
pass('nightly job idempotent canonical day, force math, and catch-up');

const cloutPayoutStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(cloutPayoutStorage, 2);
const payoutEntrants = [
  makeScribbit({
    id: 'payout-a',
    name: 'Payout A',
    element: 'ember',
    stats: { chonk: 22, spike: 38, zip: 26, charm: 14 },
    bornDay: 1,
    expiresDay: 6,
  }),
  makeScribbit({
    id: 'payout-b',
    name: 'Payout B',
    element: 'moss',
    stats: { chonk: 42, spike: 18, zip: 18, charm: 22 },
    bornDay: 1,
    expiresDay: 6,
  }),
  makeScribbit({
    id: 'payout-c',
    name: 'Payout C',
    element: 'storm',
    stats: { chonk: 20, spike: 22, zip: 44, charm: 14 },
    bornDay: 1,
    expiresDay: 6,
  }),
  makeScribbit({
    id: 'payout-d',
    name: 'Payout D',
    element: 'tide',
    stats: { chonk: 26, spike: 26, zip: 24, charm: 24 },
    bornDay: 1,
    expiresDay: 6,
  }),
  makeScribbit({
    id: 'payout-e',
    name: 'Payout E',
    element: 'ember',
    stats: { chonk: 18, spike: 36, zip: 30, charm: 16 },
    bornDay: 1,
    expiresDay: 6,
  }),
  makeScribbit({
    id: 'payout-f',
    name: 'Payout F',
    element: 'moss',
    stats: { chonk: 48, spike: 14, zip: 12, charm: 26 },
    bornDay: 1,
    expiresDay: 6,
  }),
];
for (const entrant of payoutEntrants) {
  await scribbitCore.storeScribbit(
    cloutPayoutStorage,
    `owner-${entrant.id}`,
    entrant
  );
  await scribbitCore.addRumbleEntrant(cloutPayoutStorage, 2, entrant.id);
}
const payoutForecast = await arenaStore.ensureForecastForDay(
  cloutPayoutStorage,
  2
);
const expectedPayoutResolution = rumble.resolveSwissRumble(
  payoutEntrants,
  payoutForecast,
  2
);
const championId = expectedPayoutResolution.champion.id;
const runnerUpId = expectedPayoutResolution.standings[1]?.scribbit.id;
assert.ok(runnerUpId, 'payout fixture should have a runner-up');
const loserId = payoutEntrants.find((entrant) => {
  return entrant.id !== championId && entrant.id !== runnerUpId;
})?.id;
assert.ok(loserId, 'payout fixture should have a non-finalist');
await clout.claimDailyBack(
  cloutPayoutStorage,
  2,
  { userId: 'champion-scout', username: 'Champion Scout' },
  championId
);
await clout.claimDailyBack(
  cloutPayoutStorage,
  2,
  { userId: 'runner-up-scout', username: 'Runner Up Scout' },
  runnerUpId
);
await clout.claimDailyBack(
  cloutPayoutStorage,
  2,
  { userId: 'miss-scout', username: 'Miss Scout' },
  loserId
);
const cloutPayoutJob = await dailyJob.runNightlyArenaJob(cloutPayoutStorage, {
  now: dayTwoUtc,
  force: true,
});
assert.equal(cloutPayoutJob.skipped, false, 'clout payout job should run');
assert.equal(
  (await cloutPayoutStorage.zScore(clout.getCloutKey(), 'champion-scout')) ?? 0,
  3,
  'champion backer should receive +3 clout'
);
assert.equal(
  (await cloutPayoutStorage.zScore(clout.getCloutKey(), 'runner-up-scout')) ??
    0,
  1,
  'runner-up backer should receive +1 clout'
);
assert.equal(
  (await cloutPayoutStorage.zScore(clout.getCloutKey(), 'miss-scout')) ?? 0,
  0,
  'non-finalist backer should not receive clout'
);
const duplicatePayout = await clout.payCloutForRumble(cloutPayoutStorage, {
  day: 2,
  championScribbitId: championId,
  runnerUpScribbitId: runnerUpId,
  paidAtMs: 200,
});
assert.equal(
  duplicatePayout.paidBackers,
  0,
  'clout payout should be idempotent on re-run'
);
assert.equal(
  (await cloutPayoutStorage.zScore(clout.getCloutKey(), 'champion-scout')) ?? 0,
  3,
  'champion clout should not double on re-run'
);
assert.equal(
  (await cloutPayoutStorage.zScore(clout.getCloutKey(), 'runner-up-scout')) ??
    0,
  1,
  'runner-up clout should not double on re-run'
);
pass('nightly clout payout math and idempotency');

const faded = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({ id: 'fade-me', belief: 2 })
);
assert.equal(faded.status, 'faded', 'low-belief Scribbits fade at expiry');

const legendByBelief = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({ id: 'believe-me', belief: arena.BELIEF_LEGEND_THRESHOLD })
);
assert.equal(
  legendByBelief.status,
  'legend',
  'belief threshold creates a Legend'
);

const legendByCrown = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({ id: 'crown-me', legendTitle: 'Champion of Day 3' })
);
assert.equal(legendByCrown.status, 'legend', 'crowned Scribbits become Legends');
pass('expiry legend/fade evaluation');

const expiryOrderStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(expiryOrderStorage, 2);
const expiringEntrant = makeScribbit({
  id: 'expiring-entrant',
  name: 'Expiring Entrant',
  element: 'ember',
  stats: { chonk: 55, spike: 25, zip: 10, charm: 10 },
  bornDay: 0,
  expiresDay: 3,
});
await scribbitCore.storeScribbit(expiryOrderStorage, 'owner-one', expiringEntrant);
await scribbitCore.addRumbleEntrant(expiryOrderStorage, 2, expiringEntrant.id);
const expiryOrderJob = await dailyJob.runNightlyArenaJob(expiryOrderStorage, {
  now: dayTwoUtc,
  force: true,
});
assert.equal(expiryOrderJob.skipped, false, 'expiry order job should run');
const expiredAfterFight = await scribbitCore.loadScribbit(
  expiryOrderStorage,
  expiringEntrant.id
);
assert.ok(expiredAfterFight, 'expiring entrant should remain stored');
assert.notEqual(
  expiredAfterFight.status,
  'alive',
  'day-N expiry should run after day N-1 rumble'
);
assert.ok(
  expiredAfterFight.wins + expiredAfterFight.losses > 0,
  'day-3 entrant should get final fight before expiry'
);
pass('nightly job resolves rumble before expiry');

const oddEntrants = [
  makeScribbit({ id: 'odd-a', name: 'Odd A', element: 'ember' }),
  makeScribbit({ id: 'odd-b', name: 'Odd B', element: 'tide' }),
  makeScribbit({ id: 'odd-c', name: 'Odd C', element: 'storm' }),
];
const oddResolution = rumble.resolveSwissRumble(oddEntrants, forecast, 9);
assert.equal(
  rumble.getProjectedRumbleEntrantCount(0),
  6,
  'visible rumble count should include the founding floor'
);
assert.ok(
  oddResolution.standings.length >= 6,
  'odd/thin bracket should be backfilled'
);
assert.equal(
  oddResolution.standings.length % 2,
  0,
  'backfilled bracket should pair evenly'
);
assert.ok(
  oddResolution.standings.some((standing) => standing.scribbit.isFounding),
  'founding Scribbits should backfill odd brackets'
);
const foundingStanding = oddResolution.standings.find((standing) => {
  return standing.scribbit.isFounding;
});
assert.ok(foundingStanding, 'backfill should include a founding Scribbit');
assert.ok(
  foundingStanding.scribbit.level >= 1 && foundingStanding.scribbit.level <= 3,
  'backfill founding Scribbit should carry a small level'
);
assert.ok(
  ['happy', 'hungry', 'sleepy', 'pumped'].includes(foundingStanding.scribbit.mood),
  'backfill founding Scribbit should carry mood'
);
assert.ok(oddResolution.reports.length >= 2, 'Swiss rumble should emit reports');
assert.ok(oddResolution.champion.id, 'Swiss rumble should choose a champion');

const fiveEntrants = Array.from({ length: 5 }, (_, index) => {
  return makeScribbit({
    id: `five-${index}`,
    name: `Five ${index}`,
    element: index % 2 === 0 ? 'storm' : 'tide',
  });
});
const fiveResolution = rumble.resolveSwissRumble(fiveEntrants, forecast, 10);
assert.equal(
  fiveResolution.standings.length,
  6,
  'five entrants should backfill to the living-arena floor'
);
const scoreByScribbitId = new Map(
  fiveResolution.standings.map((standing) => [standing.scribbit.id, 0])
);
for (const report of fiveResolution.reports) {
  const scoreA = scoreByScribbitId.get(report.a.id);
  const scoreB = scoreByScribbitId.get(report.b.id);
  assert.equal(scoreA, scoreB, 'Swiss reports should pair equal scores');
  const winnerId = report.winner === 'a' ? report.a.id : report.b.id;
  scoreByScribbitId.set(winnerId, (scoreByScribbitId.get(winnerId) ?? 0) + 1);
}
pass('Swiss backfill floor and same-score pairing');

console.log(
  `Scribbits Arena simulation tests passed (${passedChecks.length} groups): ${passedChecks.join('; ')}.`
);
