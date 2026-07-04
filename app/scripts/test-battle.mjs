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
    'src/server/core/forecast.ts',
    'src/server/core/arenaStore.ts',
    'src/server/core/battleStore.ts',
    'src/server/core/battle.ts',
    'src/server/core/species.ts',
    'src/server/core/rumble.ts',
    'src/server/core/scribbit.ts',
    'src/server/core/dailyJob.ts',
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

const require = createRequire(import.meta.url);
const analyzerCore = require(join(outDir, 'shared', 'analyzer-core.js'));
const sharedBattle = require(join(outDir, 'shared', 'battle.js'));
const arena = require(join(outDir, 'shared', 'arena.js'));
const arenaStore = require(join(outDir, 'server', 'core', 'arenaStore.js'));
const battle = require(join(outDir, 'server', 'core', 'battle.js'));
const dailyJob = require(join(outDir, 'server', 'core', 'dailyJob.js'));
const forecastCore = require(join(outDir, 'server', 'core', 'forecast.js'));
const rumble = require(join(outDir, 'server', 'core', 'rumble.js'));
const scribbitCore = require(join(outDir, 'server', 'core', 'scribbit.js'));

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
pass('daily draw/entry flag claim and rollback');

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
pass('nightly job idempotent canonical day and force math');

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
assert.ok(
  oddResolution.standings.length >= 4,
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
  8,
  'five entrants should backfill to eight'
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
pass('Swiss backfill to eight and same-score pairing');

console.log(
  `Scribbits Arena simulation tests passed (${passedChecks.length} groups): ${passedChecks.join('; ')}.`
);
