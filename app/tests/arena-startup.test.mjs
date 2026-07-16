import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledServerRoot) {
  throw new Error('Run Arena startup tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const { createArenaLoadRunner, startArenaStartupLoads } = require(
  join(compiledServerRoot, 'core', 'arenaStartup.js')
);

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

test('Arena startup begins player, season, and forecast work concurrently', async () => {
  const calls = [];
  const player = deferred();
  const season = deferred();
  const forecast = deferred();

  const loads = startArenaStartupLoads({
    loadPlayer: () => {
      calls.push('player');
      return player.promise;
    },
    ensureSeason: () => {
      calls.push('season');
      return season.promise;
    },
    ensureForecast: () => {
      calls.push('forecast');
      return forecast.promise;
    },
  });

  assert.deepEqual(calls, ['player', 'season', 'forecast']);

  player.resolve({ userId: 'player-1' });
  assert.deepEqual(await loads.player, { userId: 'player-1' });
  assert.equal(calls.length, 3);

  season.resolve('season-1');
  forecast.resolve({ day: 9 });
  assert.equal(await loads.season, 'season-1');
  assert.deepEqual(await loads.forecast, { day: 9 });
});

test('Arena storage fan-out stays inside its shared concurrency budget', async () => {
  const runArenaLoad = createArenaLoadRunner(3);
  const releases = Array.from({ length: 7 }, () => deferred());
  let activeLoads = 0;
  let maximumActiveLoads = 0;

  const resultsPromise = Promise.all(
    releases.map((release, index) =>
      runArenaLoad(async () => {
        activeLoads += 1;
        maximumActiveLoads = Math.max(maximumActiveLoads, activeLoads);
        await release.promise;
        activeLoads -= 1;
        return index;
      })
    )
  );

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(activeLoads, 3);
  assert.equal(maximumActiveLoads, 3);

  for (const release of releases) {
    release.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(activeLoads <= 3);
  }

  assert.deepEqual(await resultsPromise, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(maximumActiveLoads, 3);
});

test('Arena route reuses its leased player and overlaps server state fan-out', async () => {
  const apiSource = await readFile(
    new URL('../src/server/routes/api.ts', import.meta.url),
    'utf8'
  );
  const routeStart = apiSource.indexOf(
    "registerPlayerMutatingGet('/arena', async (c) =>"
  );
  const routeEnd = apiSource.indexOf(
    "api.post('/daily-login/claim'",
    routeStart
  );
  assert.notEqual(routeStart, -1);
  assert.notEqual(routeEnd, -1);
  const arenaRoute = apiSource.slice(routeStart, routeEnd);

  assert.match(
    arenaRoute,
    /loadPlayer:\s*\(\)\s*=>\s*getCurrentRequestPlayer\(c\)/
  );
  assert.match(arenaRoute, /void Promise\.allSettled\(\[/);
  assert.match(
    arenaRoute,
    /createArenaLoadRunner\(arenaLoadMaximumConcurrency\)/
  );
  assert.match(
    arenaRoute,
    /const playerStatePromise = player[\s\S]*const currentChampionPromise = runArenaLoad[\s\S]*await Promise\.all\(\[/
  );
  assert.match(
    arenaRoute,
    /await playerFollowupsPromise;[\s\S]*loadTodayRumbleEntrants\(/
  );
});
