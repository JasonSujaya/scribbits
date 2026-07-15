import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
if (!compiledServerRoot || !compiledSharedRoot) {
  throw new Error('Run Power-Up offer tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const offers = require(join(compiledServerRoot, 'core', 'powerUpOffers.js'));
const scribbits = require(join(compiledServerRoot, 'core', 'scribbit.js'));
const powerUps = require(join(compiledSharedRoot, 'combat', 'powerups.js'));

const fighter = (id = 'power-up-fighter') => ({
  id,
  name: 'Paper Rocket',
  artist: 'power-up-player',
  element: 'ember',
  stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: '/api/drawing/power-up-fighter',
  drawingThemeId: null,
  bornDay: 10,
  expiresDay: 13,
  belief: 0,
  wins: 1,
  losses: 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  upgrades: [],
  powerUpIds: [],
  level: 1,
  xp: 0,
  legacy: null,
});

test('a persisted three-card win offer claims exactly one Power-Up atomically', async () => {
  const memory = createMemoryStorage();
  const userId = 'power-up-user';
  const scribbit = fighter();
  await memory.storage.set(
    scribbits.getScribbitKey(scribbit.id),
    scribbits.serializeScribbit(scribbit)
  );

  const offer = await offers.getOrCreatePowerUpOffer(memory.storage, {
    userId,
    scribbit,
    reportId: 'power-up-report-1',
    source: 'exhibition-win',
    createdAtMs: 1_000,
  });
  assert.ok(offer);
  assert.equal(offer.choices.length, 3);

  const sameOffer = await offers.getOrCreatePowerUpOffer(memory.storage, {
    userId,
    scribbit,
    reportId: 'different-report-cannot-reroll',
    source: 'champion-win',
    createdAtMs: 2_000,
  });
  assert.deepEqual(sameOffer, offer);

  const selectedId = offer.choices[1];
  const claim = await offers.claimPowerUpOffer(memory.storage, {
    userId,
    scribbitId: scribbit.id,
    request: {
      scribbitId: scribbit.id,
      offerId: offer.id,
      selectedId,
      expectedPowerUpCount: 0,
    },
  });
  assert.deepEqual(claim.powerUpIds, [selectedId]);
  assert.deepEqual(claim.discoveredPowerUpIds, [selectedId]);
  assert.deepEqual(
    await offers.loadPowerUpDiscoveries(memory.storage, userId),
    [selectedId]
  );
  assert.equal(
    await memory.storage.get(offers.getPowerUpOfferKey(userId, scribbit.id)),
    undefined
  );
  assert.deepEqual(
    scribbits.parseScribbit(
      await memory.storage.get(scribbits.getScribbitKey(scribbit.id))
    ).powerUpIds,
    [selectedId]
  );

  assert.equal(
    await offers.claimPowerUpOffer(memory.storage, {
      userId,
      scribbitId: scribbit.id,
      request: {
        scribbitId: scribbit.id,
        offerId: offer.id,
        selectedId,
        expectedPowerUpCount: 0,
      },
    }),
    null
  );
});

test('Power-Up discoveries parse safely and stay player-wide', async () => {
  const memory = createMemoryStorage();
  const userId = 'discovery-player';
  await memory.storage.set(
    offers.getPowerUpDiscoveriesKey(userId),
    JSON.stringify(['v1-wallop', 'not-real', 'v1-wallop', 'v1-paper-twin'])
  );
  assert.deepEqual(
    await offers.loadPowerUpDiscoveries(memory.storage, userId),
    ['v1-wallop', 'v1-paper-twin']
  );
  assert.deepEqual(offers.parsePowerUpDiscoveries('{broken'), []);
});

test('persisted offers derive a role-aligned first choice from Scribbit stats', async () => {
  const memory = createMemoryStorage();
  const roles = [
    ['brawler', 'brawler', { chonk: 55, spike: 15, zip: 15, charm: 15 }],
    [
      'longshot',
      'spike-longshot',
      { chonk: 15, spike: 55, zip: 15, charm: 15 },
    ],
    ['longshot', 'zip-longshot', { chonk: 15, spike: 15, zip: 55, charm: 15 }],
    ['mage', 'mage', { chonk: 15, spike: 15, zip: 15, charm: 55 }],
  ];
  for (const [combatRole, fixtureId, stats] of roles) {
    const scribbit = { ...fighter(`offer-${fixtureId}`), stats };
    const offer = await offers.getOrCreatePowerUpOffer(memory.storage, {
      userId: `user-${fixtureId}`,
      scribbit,
      reportId: `report-${fixtureId}`,
      source: 'exhibition-win',
      createdAtMs: 1_000,
    });
    assert.ok(offer);
    const offeredScore = powerUps.scorePowerUpFit(
      offer.choices[0],
      combatRole,
      []
    );
    const maximumCommonScore = Math.max(
      ...powerUps.POWER_UP_IDS.filter(
        (id) => powerUps.POWER_UP_CATALOG[id].rarity === 'common'
      ).map((id) => powerUps.scorePowerUpFit(id, combatRole, []))
    );
    assert.equal(offeredScore, maximumCommonScore);
  }
});
