import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const testTemporaryRoot = process.env.SCRIBBITS_TEST_TEMP_ROOT;

if (!appRoot || !testTemporaryRoot) {
  throw new Error('Run mock equipment tests through run-test-suites.mjs.');
}

const waitForMockOrigin = (server) =>
  new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Mock server did not start.\n${output}`));
    }, 12_000);
    const receiveOutput = (chunk) => {
      output += chunk.toString();
      const match = output.match(
        /Scribbits mock server running at (http:\/\/localhost:\d+)/
      );
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    };
    server.stdout.on('data', receiveOutput);
    server.stderr.on('data', receiveOutput);
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Mock server exited with ${code}.\n${output}`));
    });
  });

const postGear = (origin, body, query = '') =>
  fetch(`${origin}/api/equip-gear${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });

const stopServer = async (server) => {
  if (server.exitCode !== null || server.signalCode !== null) return;

  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill('SIGTERM');
  await exited;
};

test(
  'local mock equips, persists, rejects, and removes Gear like production',
  { timeout: 60_000 },
  async () => {
    // Keep the generated bundle beneath the app so Node can resolve external
    // runtime packages such as pngjs from this workspace's node_modules.
    const runtimeDirectory = join(
      appRoot,
      'dist',
      'test-runtime',
      `equipment-mock-${process.pid}`
    );
    await mkdir(runtimeDirectory, { recursive: true });
    const build = spawnSync(
      process.execPath,
      [
        'scripts/build-mock-combat.mjs',
        '--out-dir',
        runtimeDirectory,
      ],
      { cwd: appRoot, encoding: 'utf8' }
    );
    assert.equal(
      build.status,
      0,
      `Mock runtime build failed.\n${build.stdout}\n${build.stderr}`
    );

    const server = spawn(process.execPath, ['scripts/dev-mock.mjs'], {
      cwd: appRoot,
      env: {
        ...process.env,
        PORT: '0',
        MOCK_AUTO_RELOAD: '0',
        MOCK_COMBAT_BUNDLE_URL: pathToFileURL(
          join(runtimeDirectory, 'battle.mjs')
        ).href,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    try {
      const origin = await waitForMockOrigin(server);
      const request = {
        scribbitId: 'mine-paper-spark',
        category: 'weapon',
        slotIndex: 0,
        gearId: 'tiny-sword',
      };
      const equippedResponse = await postGear(origin, request);
      assert.equal(equippedResponse.status, 200);
      const equipped = await equippedResponse.json();
      assert.deepEqual(equipped.equipmentLoadout.weapon, [
        'tiny-sword',
        null,
      ]);

      const arenaResponse = await fetch(`${origin}/api/arena`, {
        signal: AbortSignal.timeout(5_000),
      });
      assert.equal(arenaResponse.status, 200);
      const arena = await arenaResponse.json();
      assert.deepEqual(
        arena.myScribbits.find(({ id }) => id === request.scribbitId)
          ?.equipmentLoadout.weapon,
        ['tiny-sword', null]
      );

      const wrongCategory = await postGear(origin, {
        ...request,
        category: 'armor',
      });
      assert.equal(wrongCategory.status, 400);

      const loggedOut = await postGear(origin, request, '?logged-out');
      assert.equal(loggedOut.status, 401);

      const removedResponse = await postGear(origin, {
        ...request,
        gearId: null,
      });
      assert.equal(removedResponse.status, 200);
      const removed = await removedResponse.json();
      assert.deepEqual(removed.equipmentLoadout.weapon, [null, null]);
    } finally {
      await stopServer(server);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }
);
