import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const appRoot = process.env.SCRIBBITS_APP_ROOT;
if (!compiledServerRoot || !appRoot) {
  throw new Error('Run moderation admin tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const moderation = require(join(compiledServerRoot, 'core', 'moderation.js'));
const scribbits = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const makeScribbit = (id, artist) => ({
  id,
  name: 'Queue Moth',
  artist,
  element: 'storm',
  stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: `https://example.com/${id}.png`,
  bornDay: 4,
  expiresDay: 7,
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

test('Scribbit names are filtered by the server before creation', () => {
  assert.equal(scribbits.validateScribbitName('Happy Moth'), 'Happy Moth');
  assert.equal(scribbits.validateScribbitName('FUCK Moth'), undefined);
  assert.equal(scribbits.validateScribbitName('Nazi Moth'), undefined);
});

test('reports are deduplicated, reasoned, and queued without crowd deletion', async () => {
  const memory = createMemoryStorage();
  const target = makeScribbit('reported-queue-moth', 'queue_artist');
  await scribbits.storeScribbit(memory.storage, 'queue-owner', target);

  await moderation.reportAndHideScribbit(
    memory.storage,
    'reporter-one',
    target.id,
    1_000,
    'offensive-name'
  );
  await moderation.reportAndHideScribbit(
    memory.storage,
    'reporter-two',
    target.id,
    2_000,
    'offensive-drawing'
  );
  const duplicate = await moderation.reportAndHideScribbit(
    memory.storage,
    'reporter-one',
    target.id,
    3_000,
    'harassment'
  );

  assert.deepEqual(duplicate, { created: false, reportCount: 2 });
  const page = await moderation.loadModerationQueue(memory.storage);
  assert.equal(page.entries.length, 1);
  assert.equal(page.entries[0].reportCount, 2);
  assert.deepEqual(page.entries[0].reasons, {
    'offensive-name': 1,
    'offensive-drawing': 1,
  });
  assert.equal(page.entries[0].latestReportedAtMs, 2_000);
  assert.equal(page.entries[0].playerBanned, false);
  assert.ok(await scribbits.loadScribbit(memory.storage, target.id));
});

test('app bans use immutable user ids and are visible in the moderation queue', async () => {
  const memory = createMemoryStorage();
  const target = makeScribbit('banned-queue-moth', 'banned_artist');
  await scribbits.storeScribbit(memory.storage, 'banned-owner', target);
  await moderation.reportAndHideScribbit(
    memory.storage,
    'reporter',
    target.id,
    1_000,
    'other'
  );
  await moderation.banPlayer(memory.storage, {
    userId: 'banned-owner',
    username: 'banned_artist',
    moderatorUserId: 'moderator-id',
    moderatorUsername: 'paper_mod',
    sourceScribbitId: target.id,
    bannedAtMs: 2_000,
  });

  assert.equal(
    await moderation.isPlayerBanned(memory.storage, 'banned-owner'),
    true
  );
  assert.deepEqual(await moderation.loadBannedPlayers(memory.storage), [
    {
      userId: 'banned-owner',
      username: 'banned_artist',
      bannedAtMs: 2_000,
      moderatorUsername: 'paper_mod',
    },
  ]);
  assert.equal(
    (await moderation.loadModerationQueue(memory.storage)).entries[0]
      .playerBanned,
    true
  );
  await moderation.unbanPlayer(memory.storage, 'banned-owner');
  assert.equal(
    await moderation.isPlayerBanned(memory.storage, 'banned-owner'),
    false
  );
  assert.deepEqual(await moderation.loadBannedPlayers(memory.storage), []);
});

test('moderation desk is private, discoverable, confirmed, and XSS-safe', async () => {
  const [route, page, server, menu, configSource, publicApi, detailModal] =
    await Promise.all([
      readFile(join(appRoot, 'src/server/routes/moderationAdmin.ts'), 'utf8'),
      readFile(join(appRoot, 'src/server/admin/moderationPage.ts'), 'utf8'),
      readFile(join(appRoot, 'src/server/index.ts'), 'utf8'),
      readFile(join(appRoot, 'src/server/routes/menu.ts'), 'utf8'),
      readFile(join(appRoot, 'devvit.json'), 'utf8'),
      readFile(join(appRoot, 'src/server/routes/api.ts'), 'utf8'),
      readFile(join(appRoot, 'src/client/lib/detailmodal.ts'), 'utf8'),
    ]);
  const config = JSON.parse(configSource);
  const menuItem = config.menu.items.find(
    ({ endpoint }) => endpoint === '/internal/menu/moderation-view'
  );

  assert.match(server, /internal\.route\('\/moderation', moderationAdmin\)/);
  assert.match(route, /getAuthorizedSeasonAdmin\(\)/);
  assert.match(route, /text\('Not found\.', 404\)/);
  assert.match(route, /runWithPlayerMutationLease/);
  assert.match(route, /removeScribbitCompletely/);
  assert.match(route, /removeAllPlayerScribbits/);
  assert.match(route, /reddit\.banUser\(/);
  assert.match(route, /reddit\.unbanUser\(/);
  assert.match(route, /loadBannedPlayers/);
  assert.match(route, /unbanPlayer/);
  assert.match(route, /ownerUserId === authorization\.actor\.userId/);
  assert.match(publicApi, /isPlayerBanned/);
  assert.match(publicApi, /'This account is banned from Scribbits\.'/);
  assert.match(detailModal, /Tap Report again to confirm/);
  assert.doesNotMatch(page, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(page, /confirmationDialog\.showModal\(\)/);
  assert.match(page, /Unban Player/);
  assert.deepEqual(menuItem, {
    label: 'Moderate Scribbits',
    description: 'Review reports, remove Scribbits, and ban players',
    location: 'subreddit',
    forUserType: 'moderator',
    endpoint: '/internal/menu/moderation-view',
  });
  assert.match(menu, /new URL\('\/internal\/moderation', c\.req\.url\)/);
});
