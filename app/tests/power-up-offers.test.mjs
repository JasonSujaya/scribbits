import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
const apiSource = readFileSync(
  new URL('../src/server/routes/api.ts', import.meta.url),
  'utf8'
);

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

test('battle completion and Rumble wins are wired to persisted Power-Up offers', () => {
  assert.match(apiSource, /lastRumbleReceipt\.wins > 0/);
  assert.match(apiSource, /source: 'rumble-day-win'/);
  assert.match(
    apiSource,
    /source: report\.winner === 'a' \? 'champion-win' : 'champion-loss'/
  );
  assert.match(apiSource, /'exhibition-loss'/);
  assert.match(apiSource, /'rival-run-loss'/);
  assert.match(apiSource, /'rival-run-final-loss'/);
  assert.match(apiSource, /currentArenaDay: dayNumber/);
});

test('a persisted three-card win offer claims exactly one Power-Up atomically', async () => {
  const memory = createMemoryStorage();
  const userId = 'power-up-user';
  const scribbit = fighter();
  await memory.storage.set(
    scribbits.getScribbitKey(scribbit.id),
    scribbits.serializeScribbit(scribbit)
  );
  await memory.storage.set(
    offers.getPowerUpDiscoveriesKey(userId),
    JSON.stringify(['future-weapon-passive'])
  );

  const offer = await offers.getOrCreatePowerUpOffer(memory.storage, {
    userId,
    scribbit,
    reportId: 'power-up-report-1',
    source: 'exhibition-win',
    createdAtMs: 1_000,
    currentArenaDay: 10,
  });
  assert.ok(offer);
  assert.equal(offer.choices.length, 3);

  const sameOffer = await offers.getOrCreatePowerUpOffer(memory.storage, {
    userId,
    scribbit,
    reportId: 'different-report-cannot-reroll',
    source: 'champion-win',
    createdAtMs: 2_000,
    currentArenaDay: 10,
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
  assert.deepEqual(
    JSON.parse(
      await memory.storage.get(offers.getPowerUpDiscoveriesKey(userId))
    ),
    {
      schemaVersion: 1,
      ids: ['future-weapon-passive', selectedId],
    }
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

  assert.deepEqual(
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
    claim
  );
});

test('a lost EXEC reply recovers the exact committed claim without mutating twice', async () => {
  const userId = 'lost-reply-player';
  const scribbit = fighter('lost-reply-fighter');
  const offer = {
    version: 1,
    id: `power-up-offer:v1:lost-reply-report:${scribbit.id}`,
    scribbitId: scribbit.id,
    sourceReportId: 'lost-reply-report',
    source: 'exhibition-win',
    choices: ['v1-edge-spring', 'v1-paper-shield', 'v1-combo-spark'],
    createdAtMs: 1_000,
  };
  const offerKey = offers.getPowerUpOfferKey(userId, scribbit.id);
  const scribbitKey = scribbits.getScribbitKey(scribbit.id);
  const memory = createMemoryStorage({
    loseNextCommitReply: true,
    strings: {
      [offerKey]: JSON.stringify(offer),
      [scribbitKey]: scribbits.serializeScribbit(scribbit),
    },
  });
  const request = {
    scribbitId: scribbit.id,
    offerId: offer.id,
    selectedId: offer.choices[1],
    expectedPowerUpCount: 0,
  };

  const recovered = await offers.claimPowerUpOffer(memory.storage, {
    userId,
    scribbitId: scribbit.id,
    request,
  });
  assert.deepEqual(recovered, {
    scribbitId: scribbit.id,
    selectedId: request.selectedId,
    powerUpIds: [request.selectedId],
    discoveredPowerUpIds: [request.selectedId],
  });
  assert.deepEqual(
    await offers.claimPowerUpOffer(memory.storage, {
      userId,
      scribbitId: scribbit.id,
      request,
    }),
    recovered
  );
  assert.deepEqual(
    scribbits.parseScribbit(await memory.storage.get(scribbitKey)).powerUpIds,
    [request.selectedId]
  );
  assert.equal(await memory.storage.get(offerKey), undefined);
  assert.equal(
    memory.mutations.filter(
      (mutation) => mutation.method === 'set' && mutation.key === scribbitKey
    ).length,
    1
  );
  assert.equal(
    memory.mutations.filter(
      (mutation) =>
        mutation.method === 'hSet' &&
        mutation.key === offers.getPowerUpClaimReceiptsKey(userId, scribbit.id)
    ).length,
    1
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
  assert.deepEqual(
    offers.parsePowerUpDiscoveries(
      JSON.stringify(['v1-wallop', 'not-real', 'v1-wallop'])
    ),
    {
      status: 'valid',
      storedIds: ['v1-wallop', 'not-real'],
      recognizedIds: ['v1-wallop'],
      needsMigration: true,
    }
  );
  assert.deepEqual(offers.parsePowerUpDiscoveries('{broken'), {
    status: 'invalid',
  });
  assert.deepEqual(
    offers.parsePowerUpDiscoveries(
      JSON.stringify({ schemaVersion: 2, ids: ['v1-wallop'] })
    ),
    { status: 'unsupported', schemaVersion: 2 }
  );
});

test('invalid Power-Up discovery bytes block claims without mutation', async () => {
  const memory = createMemoryStorage();
  const userId = 'invalid-discovery-player';
  const scribbit = fighter('invalid-discovery-fighter');
  const discoveryKey = offers.getPowerUpDiscoveriesKey(userId);
  const invalidBytes = '{broken';
  await memory.storage.set(
    scribbits.getScribbitKey(scribbit.id),
    scribbits.serializeScribbit(scribbit)
  );
  await memory.storage.set(discoveryKey, invalidBytes);
  const offer = await offers.getOrCreatePowerUpOffer(memory.storage, {
    userId,
    scribbit,
    reportId: 'invalid-discovery-report',
    source: 'exhibition-win',
    createdAtMs: 1_000,
    currentArenaDay: 10,
  });
  assert.ok(offer);

  await assert.rejects(
    offers.claimPowerUpOffer(memory.storage, {
      userId,
      scribbitId: scribbit.id,
      request: {
        scribbitId: scribbit.id,
        offerId: offer.id,
        selectedId: offer.choices[0],
        expectedPowerUpCount: 0,
      },
    }),
    /unreadable and were preserved/
  );
  assert.equal(await memory.storage.get(discoveryKey), invalidBytes);
  assert.deepEqual(
    scribbits.parseScribbit(
      await memory.storage.get(scribbits.getScribbitKey(scribbit.id))
    ).powerUpIds,
    []
  );
});

test('persisted offers derive role-aligned choices from Scribbit stats', async () => {
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
      currentArenaDay: 10,
    });
    assert.ok(offer);
    assert.ok(
      offer.choices.every((id) =>
        powerUps.powerUpIsOfferableForRole(id, combatRole)
      )
    );
  }
});

test('every role keeps three valid choices through growing and mature caps', () => {
  for (const combatRole of ['brawler', 'longshot', 'mage']) {
    const ownedPowerUpIds = [];
    for (let pickupIndex = 0; pickupIndex < 3; pickupIndex += 1) {
      const choices = powerUps.createDeterministicPowerUpOffer({
        seed: `growing-${combatRole}-${pickupIndex}`,
        source: pickupIndex === 0 ? 'birth' : 'exhibition-win',
        ownedPowerUpIds,
        combatRole,
        maxPowerUps: 3,
      });
      assert.equal(choices?.length, 3);
      assert.ok(
        choices.every((id) =>
          powerUps.powerUpIsOfferableForRole(
            id,
            combatRole,
            ownedPowerUpIds.length
          )
        )
      );
      ownedPowerUpIds.push(choices[0]);
    }
    assert.equal(
      powerUps.createDeterministicPowerUpOffer({
        seed: `growing-${combatRole}-capped`,
        source: 'exhibition-win',
        ownedPowerUpIds,
        combatRole,
        maxPowerUps: 3,
      }),
      undefined
    );

    for (let pickupIndex = 3; pickupIndex < 5; pickupIndex += 1) {
      const choices = powerUps.createDeterministicPowerUpOffer({
        seed: `mature-${combatRole}-${pickupIndex}`,
        source: 'champion-win',
        ownedPowerUpIds,
        combatRole,
        maxPowerUps: 5,
      });
      assert.equal(choices?.length, 3);
      assert.ok(
        choices.every((id) =>
          powerUps.powerUpIsOfferableForRole(
            id,
            combatRole,
            ownedPowerUpIds.length
          )
        )
      );
      ownedPowerUpIds.push(choices[0]);
    }
    assert.equal(
      powerUps.createDeterministicPowerUpOffer({
        seed: `mature-${combatRole}-capped`,
        source: 'champion-win',
        ownedPowerUpIds,
        combatRole,
        maxPowerUps: 5,
      }),
      undefined
    );
  }
});

test('growing Scribbits stop at three Power-Ups and unlock five after maturity', async () => {
  const memory = createMemoryStorage();
  const userId = 'growing-cap-player';
  let scribbit = fighter('growing-cap-fighter');
  await memory.storage.set(
    scribbits.getScribbitKey(scribbit.id),
    scribbits.serializeScribbit(scribbit)
  );

  for (let rewardIndex = 0; rewardIndex < 3; rewardIndex += 1) {
    const offer = await offers.getOrCreatePowerUpOffer(memory.storage, {
      userId,
      scribbit,
      reportId: `growing-cap-report-${rewardIndex}`,
      source: rewardIndex === 0 ? 'birth' : 'exhibition-win',
      createdAtMs: 1_000 + rewardIndex,
      currentArenaDay: 10,
    });
    assert.ok(offer);
    const selectedId = offer.choices[0];
    await offers.claimPowerUpOffer(memory.storage, {
      userId,
      scribbitId: scribbit.id,
      request: {
        scribbitId: scribbit.id,
        offerId: offer.id,
        selectedId,
        expectedPowerUpCount: rewardIndex,
      },
    });
    scribbit = scribbits.parseScribbit(
      await memory.storage.get(scribbits.getScribbitKey(scribbit.id))
    );
  }

  assert.equal(scribbit.powerUpIds.length, 3);
  assert.equal(
    await offers.getOrCreatePowerUpOffer(memory.storage, {
      userId,
      scribbit,
      reportId: 'growing-cap-blocked',
      source: 'exhibition-win',
      createdAtMs: 2_000,
      currentArenaDay: 12,
    }),
    null
  );
  assert.ok(
    await offers.getOrCreatePowerUpOffer(memory.storage, {
      userId,
      scribbit,
      reportId: 'mature-cap-open',
      source: 'champion-win',
      createdAtMs: 3_000,
      currentArenaDay: 13,
    })
  );
});
