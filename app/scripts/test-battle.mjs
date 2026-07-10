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
    'src/shared/combat/types.ts',
    'src/shared/combat/config.ts',
    'src/shared/combat/fixed-math.ts',
    'src/shared/combat/random.ts',
    'src/shared/combat/engine.ts',
    'src/shared/combat/index.ts',
    'src/shared/combat/engine.test.ts',
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
    'src/server/core/resultComment.ts',
    'src/server/core/streak.ts',
    'src/server/core/moderation.ts',
    'src/server/core/privacy.ts',
    'src/client/lib/inkmesh.ts',
    'src/client/lib/continuousreplay.ts',
    'src/client/lib/pens.ts',
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

const require = createRequire(import.meta.url);
const analyzerCore = require(join(outDir, 'shared', 'analyzer-core.js'));
const sharedBattle = require(join(outDir, 'shared', 'battle.js'));
const combatEngineTests = require(
  join(outDir, 'shared', 'combat', 'engine.test.js')
);
const arena = require(join(outDir, 'shared', 'arena.js'));
const arenaStore = require(join(outDir, 'server', 'core', 'arenaStore.js'));
const battle = require(join(outDir, 'server', 'core', 'battle.js'));
const clout = require(join(outDir, 'server', 'core', 'clout.js'));
const dailyJob = require(join(outDir, 'server', 'core', 'dailyJob.js'));
const forecastCore = require(join(outDir, 'server', 'core', 'forecast.js'));
const inkCatalog = require(join(outDir, 'server', 'core', 'ink.js'));
const inkStore = require(join(outDir, 'server', 'core', 'inkStore.js'));
const rumble = require(join(outDir, 'server', 'core', 'rumble.js'));
const resultComment = require(join(outDir, 'server', 'core', 'resultComment.js'));
const scribbitCore = require(join(outDir, 'server', 'core', 'scribbit.js'));
const streakCore = require(join(outDir, 'server', 'core', 'streak.js'));
const moderationCore = require(join(outDir, 'server', 'core', 'moderation.js'));
const privacyCore = require(join(outDir, 'server', 'core', 'privacy.js'));
const inkMeshCore = require(join(outDir, 'client', 'lib', 'inkmesh.js'));
const continuousReplay = require(
  join(outDir, 'client', 'lib', 'continuousreplay.js')
);
const clientPens = require(join(outDir, 'client', 'lib', 'pens.js'));

const passedChecks = [];

const pass = (name) => {
  passedChecks.push(name);
};

for (const combatCheck of combatEngineTests.runCombatEngineTests()) {
  pass(`fixed-tick combat: ${combatCheck}`);
}

const firstPlayStreak = streakCore.advancePlayStreak(
  { lastPlayedDateKey: undefined, days: 0 },
  '20260708'
);
assert.deepEqual(
  firstPlayStreak,
  { lastPlayedDateKey: '20260708', days: 1 },
  'first expanded session should begin a one-day streak'
);
assert.deepEqual(
  streakCore.advancePlayStreak(firstPlayStreak, '20260708'),
  firstPlayStreak,
  'same-day actions must not inflate the streak'
);
const continuedPlayStreak = streakCore.advancePlayStreak(
  firstPlayStreak,
  '20260709'
);
assert.equal(continuedPlayStreak.days, 2, 'next UTC day should continue the streak');
assert.equal(
  streakCore.advancePlayStreak(continuedPlayStreak, '20260711').days,
  1,
  'missing a UTC day should restart the streak'
);
pass('daily play streak continuation and reset');

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

const inkMeshGeometry = inkMeshCore.buildInkMeshGeometry(200, 160);
assert.equal(inkMeshGeometry.vertices.length, 25 * 4, '4x4 mesh needs 25 xyuv vertices');
assert.equal(inkMeshGeometry.indices.length, 32 * 4, '4x4 mesh needs 32 textured triangles');
assert.equal(
  inkMeshCore.getSignatureTrait({ chonk: 10, spike: 50, zip: 20, charm: 20 }),
  'spike',
  'dominant jagged-outline stat should select NIB HALO'
);
assert.equal(
  inkMeshCore.getSignatureTrait({ chonk: 25, spike: 25, zip: 25, charm: 25 }),
  'chonk',
  'ties should resolve deterministically in documented stat order'
);
inkMeshCore.updateInkMeshVertices(
  inkMeshGeometry,
  { chonk: 25, spike: 25, zip: 25, charm: 25 },
  {
    elapsedSeconds: 3,
    awakenProgress: 0,
    impactProgress: 0,
    impactDirection: 1,
    crumpleProgress: 0,
    celebrateAmount: 1,
    signatureAmount: 0.5,
    signatureTrait: 'charm',
    reduceMotion: true,
  }
);
assert.deepEqual(
  inkMeshGeometry.vertices,
  inkMeshGeometry.restVertices,
  'reduced motion should render the stable submitted drawing without deformation'
);
const movingInkMesh = inkMeshCore.buildInkMeshGeometry(200, 160);
inkMeshCore.updateInkMeshVertices(
  movingInkMesh,
  { chonk: 10, spike: 50, zip: 20, charm: 20 },
  {
    elapsedSeconds: 1,
    awakenProgress: 1,
    impactProgress: 1,
    impactDirection: 1,
    crumpleProgress: 0,
    celebrateAmount: 0,
    signatureAmount: 0.5,
    signatureTrait: 'spike',
    reduceMotion: false,
  }
);
assert.notDeepEqual(
  movingInkMesh.vertices,
  movingInkMesh.restVertices,
  'shape power should visibly deform the mesh while preserving topology'
);
assert.ok(
  movingInkMesh.vertices.every(Number.isFinite),
  'every animated Inkbody vertex must remain finite'
);
pass('Phaser Inkbody mesh geometry and deterministic shape power');

const createMemoryStorage = (options = {}) => {
  const values = new Map();
  const hashes = new Map();
  const sortedSets = new Map();
  let throwAfterCommitOnce = options.throwAfterCommitOnce === true;

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

  const storage = {
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

  if (options.transactions === true) {
    storage.watch = async () => {
      const queuedCommands = [];
      let transactionStarted = false;
      let transactionFinished = false;

      const queueCommand = (command) => {
        if (!transactionStarted || transactionFinished) {
          throw new Error('Memory transaction is not accepting commands.');
        }
        queuedCommands.push(command);
      };

      return {
        async multi() {
          transactionStarted = true;
        },
        async incrBy(key, value) {
          queueCommand(() => {
            const next = Number(values.get(key) ?? '0') + value;
            values.set(key, String(next));
            return next;
          });
        },
        async set(key, value) {
          queueCommand(() => values.set(key, value));
        },
        async del(...keys) {
          queueCommand(() => {
            let deleted = 0;
            for (const key of keys) {
              if (values.delete(key)) deleted += 1;
              hashes.delete(key);
              sortedSets.delete(key);
            }
            return deleted;
          });
        },
        async expire() {
          queueCommand(() => undefined);
        },
        async hSet(key, fieldValues) {
          queueCommand(() => {
            const hash = getHash(key);
            for (const [field, value] of Object.entries(fieldValues)) {
              hash.set(field, value);
            }
          });
        },
        async hIncrBy(key, field, value) {
          queueCommand(() => {
            const hash = getHash(key);
            const next = Number(hash.get(field) ?? '0') + value;
            hash.set(field, String(next));
            return next;
          });
        },
        async exec() {
          if (!transactionStarted || transactionFinished) {
            throw new Error('Memory transaction cannot execute.');
          }
          transactionFinished = true;
          const results = queuedCommands.map((command) => command());
          if (throwAfterCommitOnce) {
            throwAfterCommitOnce = false;
            throw new Error('Simulated capsule reply loss after commit.');
          }
          return results;
        },
        async discard() {
          if (!transactionFinished) {
            queuedCommands.length = 0;
            transactionFinished = true;
          }
        },
        async unwatch() {
          queuedCommands.length = 0;
          transactionFinished = true;
        },
      };
    };
  }

  return storage;
};

const moderationStorage = createMemoryStorage();
const firstSafetyReport = await moderationCore.reportAndHideScribbit(
  moderationStorage,
  'reporter-one',
  'unsafe-scribbit',
  1000
);
assert.equal(firstSafetyReport.created, true, 'first reporter should create a report');
assert.equal(firstSafetyReport.reportCount, 1, 'first report should count once');
const duplicateSafetyReport = await moderationCore.reportAndHideScribbit(
  moderationStorage,
  'reporter-one',
  'unsafe-scribbit',
  2000
);
assert.equal(duplicateSafetyReport.created, false, 'duplicate reporter must be idempotent');
assert.equal(duplicateSafetyReport.reportCount, 1, 'duplicate report must not inflate count');
assert.equal(
  (await moderationCore.getHiddenScribbitIds(moderationStorage, 'reporter-one')).has(
    'unsafe-scribbit'
  ),
  true,
  'reported content should be hidden from its reporter'
);
pass('Scribbit report idempotency and reporter hide');

const privacyStorage = createMemoryStorage();
const privacyScribbit = makeScribbit({
  id: 'privacy-scribbit',
  artist: 'privacy-player',
  bornDay: 2,
  expiresDay: 5,
});
await scribbitCore.storeScribbit(
  privacyStorage,
  'privacy-user-id',
  privacyScribbit
);
await scribbitCore.addRumbleEntrant(privacyStorage, 2, privacyScribbit.id);
await privacyStorage.zAdd(clout.getCloutKey(), {
  member: 'privacy-user-id',
  score: 12,
});
await streakCore.recordDailyPlay(
  privacyStorage,
  'privacy-user-id',
  new Date(Date.UTC(2026, 6, 8))
);
await moderationCore.reportAndHideScribbit(
  privacyStorage,
  'privacy-user-id',
  'community-target',
  1000
);
await privacyCore.recordUserBeliefTarget(
  privacyStorage,
  'privacy-user-id',
  'community-target',
  '20260708'
);
const privacyDeletion = await privacyCore.deletePlayerData(
  privacyStorage,
  'privacy-user-id',
  2
);
assert.equal(privacyDeletion.removedScribbits, 1, 'privacy deletion should count owned Scribbits');
assert.equal(
  await scribbitCore.loadScribbit(privacyStorage, privacyScribbit.id),
  undefined,
  'privacy deletion should remove owned Scribbit records'
);
assert.equal(
  await privacyStorage.zScore(clout.getCloutKey(), 'privacy-user-id'),
  undefined,
  'privacy deletion should remove Clout identity'
);
assert.equal(
  (await streakCore.loadPlayStreak(privacyStorage, 'privacy-user-id')).days,
  0,
  'privacy deletion should remove streak data'
);
assert.equal(
  (await moderationCore.getHiddenScribbitIds(privacyStorage, 'privacy-user-id')).size,
  0,
  'privacy deletion should remove report-hide data'
);
pass('player data deletion removes identity and owned content');

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

const opaquePaperRgba = new Uint8Array(32 * 32 * 4);
for (let pixel = 0; pixel < 32 * 32; pixel += 1) {
  const offset = pixel * 4;
  opaquePaperRgba[offset] = 253;
  opaquePaperRgba[offset + 1] = 243;
  opaquePaperRgba[offset + 2] = 223;
  opaquePaperRgba[offset + 3] = 255;
}
for (let y = 4; y < 24; y += 1) {
  for (let x = 5; x < 25; x += 1) {
    const offset = (y * 32 + x) * 4;
    opaquePaperRgba[offset] = 255;
    opaquePaperRgba[offset + 1] = 32;
    opaquePaperRgba[offset + 2] = 16;
  }
}
const opaquePaperAnalysis = analyzerCore.analyze({
  data: opaquePaperRgba,
  width: 32,
  height: 32,
});
assert.deepEqual(
  opaquePaperAnalysis,
  analyzerOne,
  'opaque legacy paper must analyze exactly like transparent live strokes'
);
pass('analyzer-core transparent and opaque-paper parity');

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
  'legacy projections should stay inside the event budget'
);
assert.ok(reportOne.simulation, 'new battle reports should carry an authoritative transcript');
assert.equal(
  reportOne.simulation.result.winner,
  reportOne.winner,
  'report winner must come from the authoritative transcript'
);
assert.ok(
  reportOne.simulation.timeline.some((event) => event.kind === 'ability_activated'),
  'continuous replay should include real ability activations'
);
assert.equal(
  continuousReplay.getUsableBattleTranscript(reportOne),
  reportOne.simulation,
  'client should accept the exact authoritative transcript returned by the server'
);
const replayMidpoint = continuousReplay.calculateReplayFrame(
  reportOne.simulation,
  reportOne.simulation.result.completedTick / 2
);
assert.ok(
  replayMidpoint.fighters.every((fighter) => Number.isFinite(fighter.position.x)),
  'continuous replay interpolation should keep both fighter positions finite'
);
pass('battle determinism, authoritative transcript, replay interpolation, and shared max HP');

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
await pityStorage.set(inkStore.getCapsulePullCountKey('pity-player'), '17');
await pityStorage.set(
  inkStore.getPullsSinceEpicKey('pity-player'),
  String(arena.CAPSULE_PITY - 1)
);
assert.deepEqual(
  await inkStore.loadCapsuleProgress(pityStorage, 'pity-player'),
  {
    pullCount: 17,
    pityRemaining: 1,
    discoveredCount: 0,
    collectionTotal: inkCatalog.INK_CATALOG.length,
  },
  'progress should report one pull remaining immediately before hard pity'
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
assert.deepEqual(
  pityResult.progress,
  {
    pullCount: 18,
    pityRemaining: arena.CAPSULE_PITY,
    discoveredCount: 1,
    collectionTotal: inkCatalog.INK_CATALOG.length,
  },
  'forced epic should atomically advance progress and reset the pity distance'
);
assert.deepEqual(
  await inkStore.loadCapsuleProgress(pityStorage, 'pity-player'),
  pityResult.progress,
  'loaded capsule progress should match the completed pull response'
);
pass('capsule pity and progress stay truthful at the guarantee boundary');

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
const consumedFirstAccessory = await inkStore.consumeAccessoriesForSubmit(
  duplicateStorage,
  duplicateUserId,
  [firstDuplicateDrop.id]
);
assert.equal(
  consumedFirstAccessory.status,
  'consumed',
  'the first accessory copy should be consumable'
);
const inventoryAfterConsumption = await inkStore.loadInventory(
  duplicateStorage,
  duplicateUserId
);
assert.equal(
  inventoryAfterConsumption.items[firstDuplicateDrop.id],
  undefined,
  'consuming the final accessory copy should leave no usable inventory count'
);
assert.ok(
  inventoryAfterConsumption.discovered.includes(firstDuplicateDrop.id),
  'consuming the final copy must preserve permanent collection discovery'
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
  1,
  'repulling a consumed accessory should grant one usable copy'
);
assert.equal(
  secondDuplicateResult.inventory.items[firstDuplicateDrop.id],
  1,
  'repulled accessory inventory should expose the new usable copy'
);
assert.equal(
  await inkStore.getInkBalance(duplicateStorage, duplicateUserId),
  inkAfterFirstDuplicatePull - arena.CAPSULE_COST,
  'duplicate accessory pull should deduct normal ink without refund'
);
pass('capsule discovery survives consumption and controls isNew permanently');

const legacyDuplicateStorage = createMemoryStorage();
await legacyDuplicateStorage.set(
  inkStore.getInkKey(duplicateUserId),
  String(arena.CAPSULE_FIRST_DAILY_COST)
);
await legacyDuplicateStorage.hSet(inkStore.getInventoryKey(duplicateUserId), {
  [firstDuplicateDrop.id]: '1',
});
const migratedDuplicateResult = await inkStore.pullCapsuleForUser(
  legacyDuplicateStorage,
  duplicateUserId,
  duplicateDay
);
assert.equal(
  migratedDuplicateResult.status,
  'pulled',
  'an old inventory entry should remain pullable without a migration job'
);
assert.equal(
  migratedDuplicateResult.pull.isNew,
  false,
  'an accessory currently owned in an old hash should count as discovered'
);
assert.equal(
  migratedDuplicateResult.pull.ownedCount,
  2,
  'an old accessory copy should stack with the newly pulled copy'
);
assert.ok(
  migratedDuplicateResult.inventory.discovered.includes(firstDuplicateDrop.id),
  'the implicit old-inventory migration should emit permanent discovery'
);
pass('capsule old inventory migrates implicitly and duplicate copies stack');

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

const operationPendingTimeoutMs = 15_000;
const operationClaimedAtMs = 100_000;
const operationClaimStorage = createMemoryStorage({ transactions: true });
const recentOperationKey = 'capsule:operation:claim-player:recent-operation';
const recentPendingValue = 'pending:90001';
await operationClaimStorage.set(recentOperationKey, recentPendingValue);
assert.deepEqual(
  await inkStore.claimCapsuleOperation(
    operationClaimStorage,
    recentOperationKey,
    operationClaimedAtMs,
    operationPendingTimeoutMs
  ),
  { status: 'pending' },
  'a recent operation claim should remain pending'
);
assert.equal(
  await operationClaimStorage.get(recentOperationKey),
  recentPendingValue,
  'checking a recent claim must not replace its owner value'
);

const staleOperationKey = 'capsule:operation:claim-player:stale-operation';
await operationClaimStorage.set(staleOperationKey, 'pending:84999');
const staleReplacement = await inkStore.claimCapsuleOperation(
  operationClaimStorage,
  staleOperationKey,
  operationClaimedAtMs,
  operationPendingTimeoutMs
);
assert.deepEqual(
  staleReplacement,
  { status: 'claimed', pendingValue: `pending:${operationClaimedAtMs}` },
  'a stale operation claim should be replaced through the watched transaction'
);
assert.equal(
  await operationClaimStorage.get(staleOperationKey),
  staleReplacement.pendingValue,
  'stale replacement should store only the new fenced owner value'
);

const corruptOperationKey = 'capsule:operation:claim-player:corrupt-operation';
await operationClaimStorage.set(corruptOperationKey, '{"pull":{"id":"broken"}}');
const corruptReplacement = await inkStore.claimCapsuleOperation(
  operationClaimStorage,
  corruptOperationKey,
  operationClaimedAtMs,
  operationPendingTimeoutMs
);
assert.deepEqual(
  corruptReplacement,
  { status: 'claimed', pendingValue: `pending:${operationClaimedAtMs}` },
  'a structurally invalid receipt should be replaced through the same fence'
);

const completedOperationKey = 'capsule:operation:claim-player:completed-operation';
const { discovered: legacyDiscoveries, ...legacyInventory } =
  exactCostResult.inventory;
const completedOperationResponse = {
  pull: exactCostResult.pull,
  ink: exactCostResult.ink,
  inventory: legacyInventory,
  nextCost: exactCostResult.nextCost,
};
const normalizedCompletedOperationResponse = {
  ...completedOperationResponse,
  inventory: {
    ...completedOperationResponse.inventory,
    discovered: legacyDiscoveries,
  },
  progress: {
    pullCount: 4,
    pityRemaining: arena.CAPSULE_PITY - 3,
    discoveredCount: legacyDiscoveries.length,
    collectionTotal: inkCatalog.INK_CATALOG.length,
  },
};
await operationClaimStorage.set(
  inkStore.getCapsulePullCountKey('claim-player'),
  '4'
);
await operationClaimStorage.set(
  inkStore.getPullsSinceEpicKey('claim-player'),
  '3'
);
await operationClaimStorage.set(
  completedOperationKey,
  JSON.stringify(completedOperationResponse)
);
assert.deepEqual(
  await inkStore.claimCapsuleOperation(
    operationClaimStorage,
    completedOperationKey,
    operationClaimedAtMs,
    operationPendingTimeoutMs
  ),
  {
    status: 'completed',
    response: normalizedCompletedOperationResponse,
  },
  'an old completed receipt should recover with normalized discovery and progress'
);
assert.equal(
  await operationClaimStorage.get(completedOperationKey),
  JSON.stringify(normalizedCompletedOperationResponse),
  'old receipt normalization should atomically upgrade the receipt without a new charge'
);
pass('capsule operation pending, replacement, and legacy receipt recovery');

const operationReleaseStorage = createMemoryStorage({ transactions: true });
const releaseOperationKey = 'capsule:operation:release-player:operation-0001';
const newerPendingValue = 'pending:3100';
await operationReleaseStorage.set(releaseOperationKey, newerPendingValue);
assert.equal(
  await inkStore.releaseCapsuleOperation(
    operationReleaseStorage,
    releaseOperationKey,
    'pending:3000'
  ),
  false,
  'a stale worker must not release a newer pending owner'
);
assert.equal(
  await operationReleaseStorage.get(releaseOperationKey),
  newerPendingValue,
  'failed release must preserve the newer pending owner'
);
assert.equal(
  await inkStore.releaseCapsuleOperation(
    operationReleaseStorage,
    releaseOperationKey,
    newerPendingValue
  ),
  true,
  'the exact pending owner should be releasable'
);
assert.equal(
  await operationReleaseStorage.get(releaseOperationKey),
  undefined,
  'exact release should delete its operation key'
);
await operationReleaseStorage.set(
  releaseOperationKey,
  JSON.stringify(completedOperationResponse)
);
assert.equal(
  await inkStore.releaseCapsuleOperation(
    operationReleaseStorage,
    releaseOperationKey,
    newerPendingValue
  ),
  false,
  'a stale release must never delete a completed receipt'
);
assert.equal(
  await operationReleaseStorage.get(releaseOperationKey),
  JSON.stringify(completedOperationResponse),
  'completed receipt should survive a stale release attempt'
);
pass('capsule operation release deletes only its exact pending value');

const atomicCapsuleStorage = createMemoryStorage({ transactions: true });
const atomicCapsuleUserId = 'atomic-capsule-player';
const atomicCapsuleDay = 8;
const atomicOperationId = 'capsule-atomic-operation-0001';
const atomicOperationKey =
  `capsule:operation:${atomicCapsuleUserId}:${atomicOperationId}`;
const atomicStartingInk = arena.CAPSULE_FIRST_DAILY_COST + arena.CAPSULE_COST;
await atomicCapsuleStorage.set(
  inkStore.getInkKey(atomicCapsuleUserId),
  String(atomicStartingInk)
);
const atomicOperationClaim = await inkStore.claimCapsuleOperation(
  atomicCapsuleStorage,
  atomicOperationKey,
  200_000,
  operationPendingTimeoutMs
);
assert.equal(
  atomicOperationClaim.status,
  'claimed',
  'new atomic capsule operation should be claimed'
);
assert.ok(
  'pendingValue' in atomicOperationClaim,
  'claimed operation should carry its fenced pending value'
);
const atomicCapsuleResult = await inkStore.pullCapsuleForUser(
  atomicCapsuleStorage,
  atomicCapsuleUserId,
  atomicCapsuleDay,
  {
    operationKey: atomicOperationKey,
    expectedPendingValue: atomicOperationClaim.pendingValue,
  }
);
assert.equal(
  atomicCapsuleResult.status,
  'pulled',
  'transactional capsule pull should complete'
);
const atomicReceiptJson = await atomicCapsuleStorage.get(atomicOperationKey);
assert.ok(atomicReceiptJson, 'capsule commit should replace pending claim with a receipt');
const atomicReceipt = JSON.parse(atomicReceiptJson);
assert.deepEqual(
  atomicReceipt,
  {
    pull: atomicCapsuleResult.pull,
    ink: atomicCapsuleResult.ink,
    inventory: atomicCapsuleResult.inventory,
    nextCost: atomicCapsuleResult.nextCost,
    progress: atomicCapsuleResult.progress,
  },
  'atomic receipt should contain the exact paid response'
);
assert.deepEqual(
  await inkStore.claimCapsuleOperation(
    atomicCapsuleStorage,
    atomicOperationKey,
    200_100,
    operationPendingTimeoutMs
  ),
  { status: 'completed', response: atomicReceipt },
  'retry should recover the completed typed receipt'
);
assert.equal(
  await atomicCapsuleStorage.get(inkStore.getInkKey(atomicCapsuleUserId)),
  String(atomicStartingInk - arena.CAPSULE_FIRST_DAILY_COST),
  'same commit should deduct the discounted capsule cost'
);
assert.equal(
  await atomicCapsuleStorage.get(
    inkStore.getCapsulePullCountKey(atomicCapsuleUserId)
  ),
  '1',
  'same commit should advance the capsule pull count'
);
assert.equal(
  await atomicCapsuleStorage.get(
    inkStore.getCapsuleDailyPullKey(atomicCapsuleUserId, atomicCapsuleDay)
  ),
  '1',
  'same commit should consume the daily discount'
);
assert.deepEqual(
  await inkStore.loadInventory(atomicCapsuleStorage, atomicCapsuleUserId),
  atomicCapsuleResult.inventory,
  'same commit should grant exactly the inventory recorded in the receipt'
);
pass('capsule paid mutation and per-operation receipt commit together');

const ambiguousCapsuleStorage = createMemoryStorage({
  transactions: true,
  throwAfterCommitOnce: true,
});
const ambiguousCapsuleUserId = 'ambiguous-capsule-player';
const ambiguousCapsuleDay = 9;
const ambiguousOperationId = 'capsule-ambiguous-operation-0001';
const ambiguousOperationKey =
  `capsule:operation:${ambiguousCapsuleUserId}:${ambiguousOperationId}`;
const ambiguousPendingValue = 'pending:300000';
const ambiguousStartingInk = arena.CAPSULE_FIRST_DAILY_COST + arena.CAPSULE_COST;
await ambiguousCapsuleStorage.set(
  inkStore.getInkKey(ambiguousCapsuleUserId),
  String(ambiguousStartingInk)
);
await ambiguousCapsuleStorage.set(
  ambiguousOperationKey,
  ambiguousPendingValue
);
await assert.rejects(
  inkStore.pullCapsuleForUser(
    ambiguousCapsuleStorage,
    ambiguousCapsuleUserId,
    ambiguousCapsuleDay,
    {
      operationKey: ambiguousOperationKey,
      expectedPendingValue: ambiguousPendingValue,
    }
  ),
  /Simulated capsule reply loss after commit/,
  'test fixture should lose the reply only after applying the transaction'
);
const recoveredOperation = await inkStore.claimCapsuleOperation(
  ambiguousCapsuleStorage,
  ambiguousOperationKey,
  300_100,
  operationPendingTimeoutMs
);
assert.equal(
  recoveredOperation.status,
  'completed',
  'ambiguous commit should leave a typed receipt for route-level recovery'
);
assert.ok(
  'response' in recoveredOperation,
  'completed ambiguous operation should expose its recovered response'
);
const expectedAmbiguousDrop = inkStore.selectCapsuleDrop({
  userId: ambiguousCapsuleUserId,
  day: ambiguousCapsuleDay,
  pullCount: 1,
  pullsSinceEpic: 0,
});
assert.equal(
  recoveredOperation.response.pull.id,
  expectedAmbiguousDrop.id,
  'recovered receipt should identify the drop that actually committed'
);
assert.equal(
  await inkStore.getInkBalance(
    ambiguousCapsuleStorage,
    ambiguousCapsuleUserId
  ),
  ambiguousStartingInk - arena.CAPSULE_FIRST_DAILY_COST,
  'ambiguous response should still charge exactly once'
);
assert.deepEqual(
  await inkStore.loadInventory(
    ambiguousCapsuleStorage,
    ambiguousCapsuleUserId
  ),
  recoveredOperation.response.inventory,
  'ambiguous response should expose the inventory that committed with its receipt'
);
assert.deepEqual(
  recoveredOperation.response.progress,
  await inkStore.loadCapsuleProgress(
    ambiguousCapsuleStorage,
    ambiguousCapsuleUserId,
    recoveredOperation.response.inventory
  ),
  'ambiguous recovery should expose the exact progress committed with the pull'
);
assert.equal(
  await ambiguousCapsuleStorage.get(
    inkStore.getCapsulePullCountKey(ambiguousCapsuleUserId)
  ),
  '1',
  'ambiguous recovery must preserve a single paid pull'
);
assert.deepEqual(
  await inkStore.claimCapsuleOperation(
    ambiguousCapsuleStorage,
    ambiguousOperationKey,
    300_200,
    operationPendingTimeoutMs
  ),
  recoveredOperation,
  'repeated recovery should return the same receipt without another charge'
);
assert.equal(
  await inkStore.getInkBalance(
    ambiguousCapsuleStorage,
    ambiguousCapsuleUserId
  ),
  ambiguousStartingInk - arena.CAPSULE_FIRST_DAILY_COST,
  'repeated recovery must not charge a second time'
);
pass('capsule ambiguous throw-after-commit recovers exactly once');

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
await scribbitCore.releaseDailyCareAction(
  careStorage,
  'care-me',
  'feed',
  '20260705'
);
const reclaimedCare = await scribbitCore.claimDailyCareAction(
  careStorage,
  'care-me',
  'feed',
  '20260705',
  600
);
assert.equal(
  reclaimedCare.claimed,
  true,
  'released care action should not lock the player out'
);
pass('care once-per-day claim and release');

const beliefStorage = createMemoryStorage();
const beliefScribbit = makeScribbit({
  id: 'belief-concurrency',
  belief: 5,
});
await scribbitCore.storeScribbit(
  beliefStorage,
  'belief-owner',
  beliefScribbit
);
const beliefSnapshotA = await scribbitCore.loadScribbit(
  beliefStorage,
  beliefScribbit.id
);
const beliefSnapshotB = await scribbitCore.loadScribbit(
  beliefStorage,
  beliefScribbit.id
);
await Promise.all([
  scribbitCore.increaseBelief(beliefStorage, beliefSnapshotA),
  scribbitCore.increaseBelief(beliefStorage, beliefSnapshotB),
]);
const beliefAfterConcurrentVotes = await scribbitCore.loadScribbit(
  beliefStorage,
  beliefScribbit.id
);
assert.equal(
  beliefAfterConcurrentVotes.belief,
  7,
  'two simultaneous voters should both increase community Belief'
);
pass('community belief increments are concurrency-safe');

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

const prepareNightlyLockStorage = async () => {
  const storage = createMemoryStorage();
  await arenaStore.setCurrentArenaDay(storage, 2);
  const entrant = makeScribbit({
    id: 'concurrent-lock-entry',
    expiresDay: 8,
  });
  await scribbitCore.storeScribbit(storage, 'lock-owner', entrant);
  await scribbitCore.addRumbleEntrant(storage, 2, entrant.id);
  return storage;
};
const nightlyLockNow = new Date(Date.UTC(2026, 6, 6));
const singleNightlyStorage = await prepareNightlyLockStorage();
await dailyJob.runNightlyArenaJob(singleNightlyStorage, { now: nightlyLockNow });
const expectedNightlyRecord = await scribbitCore.loadScribbit(
  singleNightlyStorage,
  'concurrent-lock-entry'
);
const concurrentNightlyStorage = await prepareNightlyLockStorage();
const concurrentNightlyRuns = await Promise.allSettled([
  dailyJob.runNightlyArenaJob(concurrentNightlyStorage, { now: nightlyLockNow }),
  dailyJob.runNightlyArenaJob(concurrentNightlyStorage, { now: nightlyLockNow }),
]);
assert.ok(
  concurrentNightlyRuns.some((result) => result.status === 'fulfilled'),
  'one overlapping nightly worker should complete'
);
const concurrentNightlyRecord = await scribbitCore.loadScribbit(
  concurrentNightlyStorage,
  'concurrent-lock-entry'
);
assert.deepEqual(
  {
    wins: concurrentNightlyRecord.wins,
    losses: concurrentNightlyRecord.losses,
    xp: concurrentNightlyRecord.xp,
  },
  {
    wins: expectedNightlyRecord.wins,
    losses: expectedNightlyRecord.losses,
    xp: expectedNightlyRecord.xp,
  },
  'overlapping nightly workers must not apply standings twice'
);
pass('nightly distributed claim blocks overlapping resolution');

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
assert.deepEqual(
  caughtUpJob.resolutions.map((resolution) => resolution.resolvedDay),
  [2, 3],
  'catch-up should expose every resolved day for Reddit result comments'
);
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
const dayTwoRecordBeforeRecovery = {
  wins: resolvedDayTwoEntrant.wins,
  losses: resolvedDayTwoEntrant.losses,
};
await arenaStore.setCurrentArenaDay(catchUpStorage, 2);
const recoveredOutboxJob = await dailyJob.runNightlyArenaJob(catchUpStorage, {
  now: new Date(Date.UTC(2026, 6, 7)),
});
assert.deepEqual(
  recoveredOutboxJob.resolutions.map((resolution) => resolution.resolvedDay),
  [2, 3],
  'retry should recover both persisted resolution payloads'
);
const dayTwoRecordAfterRecovery = await scribbitCore.loadScribbit(
  catchUpStorage,
  dayTwoEntrant.id
);
assert.deepEqual(
  { wins: dayTwoRecordAfterRecovery.wins, losses: dayTwoRecordAfterRecovery.losses },
  dayTwoRecordBeforeRecovery,
  'outbox recovery must not resolve stored fights twice'
);
const pendingCatchUpResolutions = await dailyJob.loadPendingArenaResolutions(
  catchUpStorage
);
assert.deepEqual(
  pendingCatchUpResolutions.map((resolution) => resolution.resolvedDay),
  [2, 3],
  'unpublished resolutions should remain in the outbox'
);
for (const resolution of pendingCatchUpResolutions) {
  await dailyJob.acknowledgeArenaResolution(
    catchUpStorage,
    resolution.resolvedDay
  );
}
assert.equal(
  (await dailyJob.loadPendingArenaResolutions(catchUpStorage)).length,
  0,
  'acknowledged resolution payloads should leave the outbox'
);
pass('nightly job idempotent canonical day, catch-up, and outbox recovery');

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
  cloutPayoutJob.resolutions[0]?.runnerUp?.id,
  runnerUpId,
  'nightly result should expose the runner-up'
);
assert.equal(
  cloutPayoutJob.resolutions[0]?.cloutPayout.championBackers,
  1,
  'nightly result should expose champion backer payouts'
);
assert.equal(
  cloutPayoutJob.resolutions[0]?.cloutPayout.runnerUpBackers,
  1,
  'nightly result should expose runner-up backer payouts'
);
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
assert.equal(
  await clout.getUserCloutPayout(cloutPayoutStorage, 2, 'champion-scout'),
  3,
  'daily receipt should recover the champion scout payout'
);
assert.equal(
  await clout.getUserCloutPayout(cloutPayoutStorage, 2, 'miss-scout'),
  0,
  'daily receipt should report zero for a missed pick'
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

const resultSummary = cloutPayoutJob.resolutions[0];
assert.ok(resultSummary, 'result-comment fixture should resolve one arena day');
const resultCommentText = resultComment.formatRumbleResultComment(resultSummary);
assert.match(resultCommentText, /Rumble #2 results/, 'result comment should name the resolved day');
assert.match(resultCommentText, new RegExp(resultSummary.champion.name), 'result comment should name the champion');
assert.match(resultCommentText, /1 champion backers earned \+3 Clout/, 'result comment should report real Clout payouts');
assert.match(resultCommentText, /Who are you backing/, 'result comment should invite community discussion');
const foundingResultComment = resultComment.formatRumbleResultComment({
  ...resultSummary,
  champion: makeScribbit({
    id: 'founding-comment-champion',
    name: 'Arena Smudge',
    artist: 'not-a-player',
    isFounding: true,
  }),
});
assert.doesNotMatch(
  foundingResultComment,
  /u\/not-a-player/,
  'founding champions must not be presented as real Reddit users'
);
pass('Reddit Rumble result comment uses real resolution data');

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

const legendPaginationStorage = createMemoryStorage();
const paginationLegends = Array.from({ length: 5 }, (_, index) => {
  const rank = index + 1;
  return makeScribbit({
    id: `pagination-legend-${rank}`,
    name: `Pagination Legend ${rank}`,
    status: 'legend',
    legendTitle: `Legend rank ${rank}`,
  });
});
for (const [index, legend] of paginationLegends.entries()) {
  await scribbitCore.storeScribbit(
    legendPaginationStorage,
    `pagination-owner-${index + 1}`,
    legend
  );
  await scribbitCore.addLegend(legendPaginationStorage, legend, index + 1);
}

assert.deepEqual(
  await scribbitCore.getLegendIds(legendPaginationStorage, 2, 0),
  ['pagination-legend-5', 'pagination-legend-4'],
  'first Legend id page should be newest first'
);
assert.deepEqual(
  await scribbitCore.getLegendIds(legendPaginationStorage, 2, 2),
  ['pagination-legend-3', 'pagination-legend-2'],
  'second Legend id page should continue without overlap'
);
assert.deepEqual(
  (await scribbitCore.getLegends(legendPaginationStorage, 2, 0)).map(
    (legend) => legend.id
  ),
  ['pagination-legend-5', 'pagination-legend-4'],
  'hydrated first Legend page should preserve ranked order'
);
assert.deepEqual(
  (await scribbitCore.getLegends(legendPaginationStorage, 2, 2)).map(
    (legend) => legend.id
  ),
  ['pagination-legend-3', 'pagination-legend-2'],
  'hydrated second Legend page should preserve its raw offset'
);

await legendPaginationStorage.zAdd(scribbitCore.getLegendsKey(), {
  member: 'pagination-legend-stale',
  score: 4.5,
});
assert.deepEqual(
  await scribbitCore.getLegendIds(legendPaginationStorage, 3, 0),
  [
    'pagination-legend-5',
    'pagination-legend-stale',
    'pagination-legend-4',
  ],
  'raw Legend cursors should retain stale zset positions'
);
assert.deepEqual(
  (await scribbitCore.getLegends(legendPaginationStorage, 3, 0)).map(
    (legend) => legend.id
  ),
  ['pagination-legend-5', 'pagination-legend-4'],
  'hydration should omit a stale Legend id without shifting the raw page'
);
assert.deepEqual(
  (await scribbitCore.getLegends(legendPaginationStorage, 3, 3)).map(
    (legend) => legend.id
  ),
  ['pagination-legend-3', 'pagination-legend-2', 'pagination-legend-1'],
  'the next raw offset should remain non-overlapping after a stale id'
);
pass('Legend raw-offset pagination and stale-id safety');

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
