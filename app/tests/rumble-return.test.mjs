import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

import { createMemoryStorage } from './support/memory-storage.mjs';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (
  !appRoot ||
  !compiledClientRoot ||
  !compiledServerRoot ||
  !compiledSharedRoot
) {
  throw new Error(
    'Run Rumble return tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const rumbleReturnPresentation = require(
  join(compiledClientRoot, 'lib', 'rumblereturnpresentation.js')
);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const battle = require(join(compiledServerRoot, 'core', 'battle.js'));
const battleStore = require(join(compiledServerRoot, 'core', 'battleStore.js'));
const clout = require(join(compiledServerRoot, 'core', 'clout.js'));
const inkStore = require(join(compiledServerRoot, 'core', 'inkStore.js'));
const rumbleReturn = require(
  join(compiledServerRoot, 'core', 'rumbleReturn.js')
);
const scribbit = require(join(compiledServerRoot, 'core', 'scribbit.js'));

const createScribbit = (overrides = {}) => ({
  id: overrides.id ?? 'return-scribbit',
  name: overrides.name ?? 'Return Scribbit',
  artist: overrides.artist ?? 'return_artist',
  element: overrides.element ?? 'storm',
  stats: overrides.stats ?? { chonk: 25, spike: 25, zip: 25, charm: 25 },
  imageUrl: overrides.imageUrl ?? '/api/drawing/return-scribbit',
  bornDay: overrides.bornDay ?? 6,
  expiresDay: overrides.expiresDay ?? 9,
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
  mood: 'hungry',
  careDoneToday: [],
  legacy: null,
});

const projectReturnFighter = (fighter) => ({
  id: fighter.id,
  name: fighter.name,
  element: fighter.element,
  stats: fighter.stats,
  imageUrl: fighter.imageUrl,
  isFounding: fighter.isFounding,
});

const storeFeaturedReport = async (
  storage,
  fighterA,
  fighterB,
  resolvedDay,
  reportId
) => {
  const report = {
    ...battle.simulate(
      fighterA,
      fighterB,
      91,
      {
        day: resolvedDay,
        boostedElement: 'storm',
        nerfedElement: 'moss',
        blurb: 'Focused Rumble return fixture.',
      },
      'rumble'
    ),
    id: reportId,
  };
  await battleStore.saveBattleReport(storage, report, resolvedDay * 1_000);
  await battleStore.setFeaturedRumbleReport(storage, report, 1);
  return report;
};

test('one Rumble return loader owns backed payout and fighter projection', async () => {
  const { storage } = createMemoryStorage();
  const userId = 'backed-return-player';
  const resolvedDay = 8;
  const pick = createScribbit({
    id: 'backed-return-pick',
    name: 'Only Moon',
    artist: 'picked_artist',
  });
  const champion = createScribbit({
    id: 'backed-return-champion',
    name: 'Solar Kiln',
    artist: 'champion_artist',
    element: 'ember',
  });
  await scribbit.storeScribbit(storage, 'pick-owner', pick);
  await scribbit.storeScribbit(storage, 'champion-owner', champion);
  await storage.hSet(clout.getBackKey(resolvedDay), { [userId]: pick.id });
  await storage.hSet(clout.getCloutPayoutKey(resolvedDay), {
    [userId]: '3:1000',
  });
  await storeFeaturedReport(
    storage,
    pick,
    champion,
    resolvedDay,
    'backed-return-report'
  );

  assert.deepEqual(
    await rumbleReturn.loadRumbleReturnReceipt(storage, {
      userId,
      resolvedDay,
      utcDateKey: '20260711',
      champion,
      hiddenScribbitIds: new Set(),
    }),
    {
      kind: 'backed',
      resolvedDay,
      backedName: pick.name,
      championName: champion.name,
      pick: projectReturnFighter(pick),
      opponent: projectReturnFighter(champion),
      opponentIsChampion: true,
      cloutEarned: 3,
      inkAwarded: arena.INK_REWARDS.backedChampion,
      replayAvailable: true,
    }
  );
});

test('backed return preserves hidden-fighter projection and replay behavior', async () => {
  const { storage } = createMemoryStorage();
  const userId = 'hidden-backed-player';
  const resolvedDay = 8;
  const pick = createScribbit({
    id: 'hidden-backed-pick',
    name: 'Hidden Pick',
  });
  const champion = createScribbit({
    id: 'hidden-backed-champion',
    name: 'Hidden Champion',
    element: 'ember',
  });
  await scribbit.storeScribbit(storage, 'pick-owner', pick);
  await scribbit.storeScribbit(storage, 'champion-owner', champion);
  await storage.hSet(clout.getBackKey(resolvedDay), { [userId]: pick.id });
  await storeFeaturedReport(
    storage,
    pick,
    champion,
    resolvedDay,
    'hidden-backed-report'
  );

  const receipt = await rumbleReturn.loadRumbleReturnReceipt(storage, {
    userId,
    resolvedDay,
    utcDateKey: '20260711',
    champion,
    hiddenScribbitIds: new Set([pick.id, champion.id]),
  });
  assert.equal(receipt?.kind, 'backed');
  assert.equal(receipt?.pick, null);
  assert.equal(receipt?.opponent, null);
  assert.equal(receipt?.opponentIsChampion, false);
  assert.equal(receipt?.replayAvailable, true);
});

test('unified Rumble return falls back to the exact owned receipt', async () => {
  const { storage } = createMemoryStorage();
  const userId = 'owned-return-player';
  const resolvedDay = 8;
  const entrant = createScribbit({
    id: 'owned-return-entrant',
    name: 'Margin Moth',
    artist: userId,
  });
  const opponent = createScribbit({
    id: 'owned-return-opponent',
    name: 'Bracket Beetle',
    artist: 'opponent_artist',
    element: 'ember',
  });
  await scribbit.storeScribbit(storage, userId, entrant);
  await scribbit.storeScribbit(storage, 'opponent-owner', opponent);
  await scribbit.recordRumbleStandingOnScribbit(
    storage,
    entrant.id,
    resolvedDay,
    2,
    1,
    4
  );
  const returnRequest = {
    userId,
    resolvedDay,
    utcDateKey: '20260711',
    champion: opponent,
  };
  assert.equal(
    await rumbleReturn.loadRumbleReturnReceipt(storage, returnRequest),
    null,
    'a winning standing must not guess Ink before its payout receipt exists'
  );
  await inkStore.claimInkReward(storage, {
    payoutKey: inkStore.getRumbleWinInkPayoutKey(resolvedDay),
    payoutField: entrant.id,
    userId,
    amount: 10,
    paidAtMs: 1_000,
  });
  await storeFeaturedReport(
    storage,
    entrant,
    opponent,
    resolvedDay,
    'owned-return-report'
  );

  const receipt = await rumbleReturn.loadRumbleReturnReceipt(
    storage,
    returnRequest
  );
  assert.deepEqual(
    receipt && {
      kind: receipt.kind,
      entrantId: receipt.kind === 'owned' ? receipt.entrant.id : null,
      wins: receipt.kind === 'owned' ? receipt.wins : null,
      losses: receipt.kind === 'owned' ? receipt.losses : null,
      xpAwarded: receipt.kind === 'owned' ? receipt.xpAwarded : null,
      inkAwarded: receipt.inkAwarded,
      replayAvailable: receipt.replayAvailable,
    },
    {
      kind: 'owned',
      entrantId: entrant.id,
      wins: 2,
      losses: 1,
      xpAwarded: 4,
      inkAwarded: 10,
      replayAvailable: true,
    }
  );

  assert.equal(
    (
      await rumbleReturn.loadRumbleReturnReceipt(storage, {
        ...returnRequest,
        hiddenScribbitIds: new Set([opponent.id]),
      })
    )?.replayAvailable,
    false
  );

  const duplicateEntrant = createScribbit({
    id: 'owned-return-duplicate',
    name: 'Duplicate Entry',
    artist: userId,
  });
  await scribbit.storeScribbit(storage, userId, duplicateEntrant);
  await scribbit.recordRumbleStandingOnScribbit(
    storage,
    duplicateEntrant.id,
    resolvedDay,
    0,
    1,
    0
  );
  assert.equal(
    await rumbleReturn.loadRumbleReturnReceipt(storage, returnRequest),
    null,
    'multiple owned standing receipts must fail closed instead of choosing one'
  );
});

test('owned Rumble return presentation stays compact and accessible', () => {
  const presentation = rumbleReturnPresentation.planRumbleReturnPresentation({
    kind: 'owned',
    resolvedDay: 8,
    entrant: createScribbit({ name: 'Margin Moth' }),
    wins: 2,
    losses: 1,
    xpAwarded: 4,
    inkAwarded: 10,
    isChampion: false,
    replayAvailable: true,
  });

  assert.deepEqual(presentation, {
    outcome: 'defeat',
    outcomeLabel: 'DEFEAT',
    title: 'MARGIN MOTH WAS ELIMINATED',
    detail: 'RUMBLE RECORD 2–1',
    reward: '+4 XP • +10 INK',
    highlight: false,
  });
  assert.equal(
    rumbleReturnPresentation.formatRumbleReturnAccessibleSummary(presentation),
    'DEFEAT. MARGIN MOTH WAS ELIMINATED. RUMBLE RECORD 2–1. +4 XP • +10 INK'
  );
});

test('backed Rumble return presentation distinguishes losses and wins', () => {
  const losingPresentation =
    rumbleReturnPresentation.planRumbleReturnPresentation({
      kind: 'backed',
      resolvedDay: 8,
      backedName: 'Only Moon',
      championName: 'Solar Kiln',
      cloutEarned: 0,
      inkAwarded: 0,
      replayAvailable: true,
    });
  assert.equal(
    rumbleReturnPresentation.formatRumbleReturnAccessibleSummary(
      losingPresentation
    ),
    'DEFEAT. ONLY MOON WAS ELIMINATED. Solar Kiln WON RUMBLE #8. NO CLOUT EARNED'
  );

  assert.deepEqual(
    rumbleReturnPresentation.planRumbleReturnPresentation({
      kind: 'backed',
      resolvedDay: 8,
      backedName: 'Solar Kiln',
      championName: 'Solar Kiln',
      cloutEarned: 3,
      inkAwarded: 5,
      replayAvailable: true,
    }),
    {
      outcome: 'victory',
      outcomeLabel: 'VICTORY!',
      title: 'SOLAR KILN WON THE RUMBLE',
      detail: 'Solar Kiln WON RUMBLE #8',
      reward: '+3 CLOUT • +5 INK',
      highlight: true,
    }
  );
});

test('Arena route delegates Rumble return composition to one core call', () => {
  const apiSource = readFileSync(
    join(appRoot, 'src', 'server', 'routes', 'api.ts'),
    'utf8'
  );
  const receiptBlockStart = apiSource.indexOf(
    "let lastRumbleReceipt: ArenaState['lastRumbleReceipt']"
  );
  const receiptBlockEnd = apiSource.indexOf(
    'return c.json<ArenaState>',
    receiptBlockStart
  );
  assert.notEqual(receiptBlockStart, -1);
  assert.notEqual(receiptBlockEnd, -1);
  const receiptBlock = apiSource.slice(receiptBlockStart, receiptBlockEnd);

  assert.equal(
    receiptBlock.match(/\bloadRumbleReturnReceipt\s*\(/g)?.length,
    1
  );
  assert.doesNotMatch(
    receiptBlock,
    /\bgetBackedScribbitId\b|\bgetUserCloutPayout\b|\btoReturnFighter\b|kind:\s*'backed'/
  );
});
