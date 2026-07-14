import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error(
    'Run Rival Run challenge tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const challenges = require(join(compiledSharedRoot, 'rivalrunchallenges.js'));
const rivalRun = require(join(compiledServerRoot, 'core', 'rivalRun.js'));

const signatureChallenge = () => ({
  ...challenges.RIVAL_RUN_V2_CHALLENGES[0],
  condition: { kind: 'player_ability_activations', target: 3 },
  progress: 0,
  completionAchieved: false,
});

const inkConnectChallenge = () => ({
  ...challenges.RIVAL_RUN_V2_CHALLENGES[1],
  condition: { kind: 'player_shape_power_hit_bouts', target: 2 },
  progress: 0,
  completionAchieved: false,
});

const lateMarkChallenge = () => ({
  ...challenges.RIVAL_RUN_V2_CHALLENGES[2],
  condition: { kind: 'player_late_shape_power_activations', target: 1 },
  progress: 0,
  completionAchieved: false,
});

const signatureRun = (runId = 'signature-run') => ({
  ...rivalRun.createRivalRunState(runId, 8, 'player-fighter'),
  challenge: signatureChallenge(),
});

const challengeRun = (challenge, runId) => ({
  ...rivalRun.createRivalRunState(runId, 8, 'player-fighter'),
  challenge,
});

const activation = (actor, activationNumber) => ({
  tick: activationNumber,
  kind: 'ability_activated',
  actor,
  power: 'inkquake',
  activationNumber,
});

const report = (id, timeline) => ({
  id,
  kind: 'exhibition',
  a: { id: 'player-fighter' },
  b: { id: 'opponent-fighter' },
  winner: 'a',
  simulation: { timeline },
});

const reportWithoutSimulation = (id) => {
  const { simulation: _simulation, ...battleReport } = report(id, []);
  return battleReport;
};

const authoritativeReport = (id, timeline, options = {}) => ({
  ...report(id, timeline),
  a: { id: options.challengerId ?? 'player-fighter' },
  simulation: {
    timeline,
    eventsTruncated: options.eventsTruncated ?? false,
  },
});

const damage = (sourceFighter, source, tick = 1) => ({
  tick,
  kind: 'damage',
  sourceFighter,
  targetFighter: sourceFighter === 'a' ? 'b' : 'a',
  source,
});

const lateFightStarted = (tick) => ({
  tick,
  kind: 'late_fight_started',
});

const advance = (run, playerAbilityActivations, opponentId, metrics = {}) =>
  rivalRun.advanceRivalRunState(run, {
    expectedBoutsCompleted: run.boutsCompleted,
    playerWon: true,
    tier: 'safe',
    winPoints: 1,
    opponentId,
    playerAbilityActivations,
    playerShapePowerHitBouts: metrics.playerShapePowerHitBouts ?? 0,
    playerLateShapePowerActivations:
      metrics.playerLateShapePowerActivations ?? 0,
  });

const storeRun = async (storage, userId, initial) => {
  await storage.set(
    rivalRun.getRivalRunKey(userId),
    JSON.stringify({
      schemaVersion: 2,
      ...initial,
      lastReportId: null,
      lastOutcome: null,
      lastTier: null,
      lastWinPoints: null,
      lastPointsAwarded: null,
    })
  );
};

const advanceStoredRun = async (initial, battleReport, suffix = 'one') => {
  const storage = createMemoryStorage({ watch: true });
  await storeRun(storage.storage, 'player', initial);
  return rivalRun.advanceRivalRun(storage.storage, {
    userId: 'player',
    runId: initial.id,
    dayNumber: initial.dayNumber,
    challengerId: initial.challengerId,
    expectedBoutsCompleted: initial.boutsCompleted,
    reportId: battleReport.id,
    report: battleReport,
    playerWon: true,
    opponentId: `opponent-${suffix}`,
    tier: 'safe',
    winPoints: 1,
  });
};

test('new role challenge selection is deterministic and preserves older catalogs', () => {
  const selectedOnce = challenges.createRivalRunChallenge(
    'trial-1',
    8,
    'player-fighter'
  );
  const selectedAgain = challenges.createRivalRunChallenge(
    'trial-1',
    8,
    'player-fighter'
  );

  assert.deepEqual(selectedAgain, selectedOnce);
  assert.match(selectedOnce.id, /^(?:v1|v3)-/);
  assert.equal(
    challenges.RIVAL_RUN_CHALLENGES.every((entry) =>
      entry.id.startsWith('v1-')
    ),
    true
  );
  assert.deepEqual(challenges.RIVAL_RUN_V2_CHALLENGES[0], {
    id: 'v2-signature-ink',
    name: 'SIGNATURE INK',
    premise: 'Let your Shape Power leave its mark across the card.',
    goal: 'TRIGGER 3 SHAPE POWERS',
    stamp: 'SIGNATURE',
    condition: { kind: 'player_ability_activations', target: 3 },
  });
  assert.deepEqual(challenges.RIVAL_RUN_V3_CHALLENGES[0], {
    id: 'v3-signature-moves',
    name: 'SIGNATURE MOVES',
    premise: 'Let your role show what makes it different.',
    goal: 'TRIGGER 3 SIGNATURES',
    stamp: 'ROLE READY',
    condition: { kind: 'player_ability_activations', target: 3 },
  });
});

test('role trials replace legacy power trials only for newly selected runs', () => {
  assert.equal(challenges.RIVAL_RUN_CHALLENGES.length, 12);
  assert.equal(challenges.RIVAL_RUN_V2_CHALLENGES.length, 3);
  assert.equal(challenges.RIVAL_RUN_V3_CHALLENGES.length, 3);
  assert.equal(
    challenges.RIVAL_RUN_V3_CHALLENGES.length /
      (challenges.RIVAL_RUN_CHALLENGES.length +
        challenges.RIVAL_RUN_V3_CHALLENGES.length),
    3 / 15
  );

  for (let index = 1; index <= 40; index += 1) {
    assert.doesNotMatch(
      challenges.createRivalRunChallenge(`trial-${index}`, 8, 'player-fighter')
        .id,
      /^v2-/
    );
  }
  assert.deepEqual(challenges.RIVAL_RUN_V2_CHALLENGES.slice(1), [
    {
      id: 'v2-ink-connect',
      name: 'INK CONNECT',
      premise: 'Make the Shape Power connect.',
      goal: 'POWER HIT ×2',
      stamp: 'CONNECTED',
      condition: { kind: 'player_shape_power_hit_bouts', target: 2 },
    },
    {
      id: 'v2-late-mark',
      name: 'LATE MARK',
      premise: 'Leave ink after the late bell.',
      goal: 'POWER AFTER 15S',
      stamp: 'LATE MARK',
      condition: { kind: 'player_late_shape_power_activations', target: 1 },
    },
  ]);
});

test('Signature Ink counts only authoritative player fighter activations', async () => {
  const storage = createMemoryStorage({ watch: true });
  const initial = signatureRun();
  await storeRun(storage.storage, 'player', initial);

  const receipt = await rivalRun.advanceRivalRun(storage.storage, {
    userId: 'player',
    runId: initial.id,
    dayNumber: initial.dayNumber,
    challengerId: initial.challengerId,
    expectedBoutsCompleted: 0,
    reportId: 'signature-report-1',
    report: report('signature-report-1', [
      activation('a', 1),
      activation('b', 1),
      activation('b', 2),
    ]),
    playerWon: true,
    opponentId: 'opponent-one',
    tier: 'safe',
    winPoints: 1,
  });

  assert.equal(receipt?.challenge.progress, 1);
  assert.equal(receipt?.challenge.completionAchieved, false);
});

test('Signature Ink accumulates, caps at three, and completes on the third bout', () => {
  const first = advance(signatureRun(), 2, 'opponent-one');
  assert.equal(first?.challenge.progress, 2);
  assert.equal(first?.challenge.completionAchieved, false);

  const second = advance(first, 2, 'opponent-two');
  assert.equal(second?.challenge.progress, 3);
  assert.equal(second?.challenge.completionAchieved, false);

  const third = advance(second, 1, 'opponent-three');
  assert.equal(third?.challenge.progress, 3);
  assert.equal(third?.challenge.completionAchieved, true);
});

test('Ink Connect accepts every Shape Power source and Colorburst echo once per bout', async () => {
  for (const source of [
    'inkquake',
    'nib_halo',
    'smearstep',
    'colorburst',
    'colorburst_echo',
  ]) {
    const initial = challengeRun(inkConnectChallenge(), `connect-${source}`);
    const receipt = await advanceStoredRun(
      initial,
      authoritativeReport(`connect-report-${source}`, [
        damage('a', source),
        damage('a', source, 2),
      ]),
      source
    );
    assert.equal(receipt?.challenge.progress, 1, source);
  }
});

test('Ink Connect rejects opponent, contact, burn, recoil, Gear, and non-damage events', async () => {
  const rejectedTranscripts = [
    [damage('b', 'inkquake')],
    [damage('a', 'contact')],
    [damage('a', 'ember_burn')],
    [damage('a', 'nib_wall_recoil')],
    [damage('a', 'gear')],
    [activation('a', 1)],
  ];
  for (const [index, timeline] of rejectedTranscripts.entries()) {
    const initial = challengeRun(
      inkConnectChallenge(),
      `connect-reject-${index}`
    );
    const receipt = await advanceStoredRun(
      initial,
      authoritativeReport(`connect-reject-report-${index}`, timeline),
      `reject-${index}`
    );
    assert.equal(receipt?.challenge.progress, 0, String(index));
  }
});

test('Ink Connect fails closed on a missing, truncated, or wrongly attributed transcript', async () => {
  const cases = [
    reportWithoutSimulation('connect-missing-simulation'),
    authoritativeReport('connect-truncated', [damage('a', 'inkquake')], {
      eventsTruncated: true,
    }),
    authoritativeReport('connect-wrong-challenger', [damage('a', 'inkquake')], {
      challengerId: 'someone-else',
    }),
  ];
  for (const [index, battleReport] of cases.entries()) {
    const receipt = await advanceStoredRun(
      challengeRun(inkConnectChallenge(), `connect-closed-${index}`),
      battleReport,
      `closed-${index}`
    );
    assert.equal(receipt?.challenge.progress, 0, String(index));
  }
});

test('Ink Connect caps qualifying bouts and completes only with the third result', () => {
  const first = advance(
    challengeRun(inkConnectChallenge(), 'connect-cap'),
    0,
    'opponent-one',
    { playerShapePowerHitBouts: 9 }
  );
  assert.equal(first?.challenge.progress, 1);
  assert.equal(first?.challenge.completionAchieved, false);

  const second = advance(first, 0, 'opponent-two', {
    playerShapePowerHitBouts: 1,
  });
  assert.equal(second?.challenge.progress, 2);
  assert.equal(second?.challenge.completionAchieved, false);

  const third = advance(second, 0, 'opponent-three', {
    playerShapePowerHitBouts: 1,
  });
  assert.equal(third?.challenge.progress, 2);
  assert.equal(third?.challenge.completionAchieved, true);
});

test('Late Mark accepts player activations at and after the late bell only', async () => {
  const cases = [
    { name: 'before', activationTick: 14, progress: 0 },
    { name: 'at', activationTick: 15, progress: 1 },
    { name: 'after', activationTick: 16, progress: 1 },
    { name: 'opponent', activationTick: 16, actor: 'b', progress: 0 },
  ];
  for (const fixture of cases) {
    const receipt = await advanceStoredRun(
      challengeRun(lateMarkChallenge(), `late-${fixture.name}`),
      authoritativeReport(`late-report-${fixture.name}`, [
        lateFightStarted(15),
        {
          ...activation(fixture.actor ?? 'a', 1),
          tick: fixture.activationTick,
        },
      ]),
      fixture.name
    );
    assert.equal(receipt?.challenge.progress, fixture.progress, fixture.name);
  }
});

test('Late Mark fails closed without a complete authoritative late marker', async () => {
  const cases = [
    reportWithoutSimulation('late-missing-simulation'),
    authoritativeReport(
      'late-truncated',
      [lateFightStarted(15), activation('a', 1)],
      {
        eventsTruncated: true,
      }
    ),
    authoritativeReport(
      'late-wrong-challenger',
      [lateFightStarted(15), activation('a', 1)],
      {
        challengerId: 'someone-else',
      }
    ),
    authoritativeReport('late-no-marker', [
      { ...activation('a', 1), tick: 16 },
    ]),
  ];
  for (const [index, battleReport] of cases.entries()) {
    const receipt = await advanceStoredRun(
      challengeRun(lateMarkChallenge(), `late-closed-${index}`),
      battleReport,
      `closed-${index}`
    );
    assert.equal(receipt?.challenge.progress, 0, String(index));
  }
});

test('Late Mark caps after its first qualified bout and completes on the final result', () => {
  const first = advance(
    challengeRun(lateMarkChallenge(), 'late-cap'),
    0,
    'opponent-one',
    { playerLateShapePowerActivations: 7 }
  );
  assert.equal(first?.challenge.progress, 1);
  assert.equal(first?.challenge.completionAchieved, false);

  const second = advance(first, 0, 'opponent-two', {
    playerLateShapePowerActivations: 1,
  });
  assert.equal(second?.challenge.progress, 1);
  assert.equal(second?.challenge.completionAchieved, false);

  const third = advance(second, 0, 'opponent-three');
  assert.equal(third?.challenge.progress, 1);
  assert.equal(third?.challenge.completionAchieved, true);
});

test('legacy v1 Rival Run state still projects its finish-the-card challenge', async () => {
  const storage = createMemoryStorage({
    strings: {
      [rivalRun.getRivalRunKey('legacy-player')]: JSON.stringify({
        schemaVersion: 1,
        id: 'legacy-run',
        dayNumber: 7,
        challengerId: 'legacy-fighter',
        boutsCompleted: 2,
        wins: 1,
        losses: 1,
        score: 2,
        opponentIds: ['legacy-opponent-one', 'legacy-opponent-two'],
        status: 'active',
        lastReportId: 'legacy-report-two',
        lastOutcome: 'loss',
        lastTier: 'even',
        lastWinPoints: 2,
        lastPointsAwarded: 0,
      }),
    },
  });

  const parsed = await rivalRun.loadRivalRun(storage.storage, 'legacy-player');
  assert.deepEqual(parsed?.challenge, {
    id: 'v1-finish-the-card',
    name: 'FINISH THE CARD',
    premise: 'This run began before challenge cards arrived.',
    goal: 'COMPLETE 3 BOUTS',
    stamp: 'CARD COMPLETE',
    condition: { kind: 'finish_run' },
    progress: 2,
    completionAchieved: false,
  });
});
