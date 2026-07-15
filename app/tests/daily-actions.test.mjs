import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledServerRoot) {
  throw new Error('Run daily action tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const dailyActions = require(
  join(compiledServerRoot, 'core', 'dailyActions.js')
);
const scribbitStore = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const createScribbit = (overrides = {}) => ({
  id: overrides.id ?? 'daily-action-scribbit',
  name: overrides.name ?? 'Receipt Moth',
  artist: overrides.artist ?? 'daily-action-player',
  element: overrides.element ?? 'storm',
  stats: overrides.stats ?? { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: overrides.imageUrl ?? '/api/drawing/daily-action',
  bornDay: overrides.bornDay ?? 4,
  expiresDay: overrides.expiresDay ?? 7,
  belief: overrides.belief ?? 0,
  wins: overrides.wins ?? 0,
  losses: overrides.losses ?? 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  upgrades: [],
  level: 1,
  xp: overrides.xp ?? 0,
  legacy: null,
});

test('Champion retries resume one deterministic report and one outcome', async () => {
  const memory = createMemoryStorage({ loseNextCommitReply: true });
  const userId = 'champion-player';
  const challenger = createScribbit({ id: 'champion-challenger' });
  const champion = createScribbit({
    id: 'champion-defender',
    artist: 'founding-cast',
  });
  const report = {
    id: 'boss-report-day-4',
    kind: 'boss',
    day: 4,
    a: challenger,
    b: champion,
    winner: 'a',
  };
  const input = {
    userId,
    day: 4,
    challengerId: challenger.id,
    championId: champion.id,
    report,
    winnerXpGain: 2,
  };
  const scribbitKey = scribbitStore.getScribbitKey(challenger.id);

  await memory.storage.set(scribbitKey, JSON.stringify(challenger));

  const firstResult = await dailyActions.commitDailyChampionOutcome(
    memory.storage,
    input
  );
  assert.equal(firstResult.status, 'committed');
  assert.equal(firstResult.recovered, true);
  assert.equal(firstResult.report.id, report.id);
  const committedScribbit = JSON.parse(await memory.storage.get(scribbitKey));
  assert.equal(committedScribbit.wins, 1);
  assert.equal(committedScribbit.losses, 0);
  assert.equal(committedScribbit.xp, 2);
  assert.equal(
    await memory.storage.hGet(
      scribbitStore.getDailyFlagsKey(userId, 4),
      'bossChallenge'
    ),
    report.id
  );

  const retryResult = await dailyActions.commitDailyChampionOutcome(
    memory.storage,
    input
  );
  assert.equal(retryResult.status, 'committed');
  assert.equal(retryResult.recovered, true);
  assert.equal(retryResult.report.id, report.id);
  const retriedScribbit = JSON.parse(await memory.storage.get(scribbitKey));
  assert.equal(retriedScribbit.wins, 1);
  assert.equal(retriedScribbit.xp, 2);

  const otherReportResult = await dailyActions.commitDailyChampionOutcome(
    memory.storage,
    { ...input, report: { ...report, id: 'different-boss-report' } }
  );
  assert.deepEqual(otherReportResult, { status: 'already-challenged' });
  assert.equal(JSON.parse(await memory.storage.get(scribbitKey)).wins, 1);
});
