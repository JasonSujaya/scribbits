import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { PNG } from 'pngjs';

const repoRoot = process.cwd();
const outDir = join(tmpdir(), 'scribbits-arena-sim-tests');
const tscPath = join(repoRoot, 'node_modules', '.bin', 'tsc');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
symlinkSync(
  join(repoRoot, 'node_modules'),
  join(outDir, 'node_modules'),
  'dir'
);

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
    'src/shared/founders.ts',
    'src/shared/content/deterministic.ts',
    'src/shared/content/replaycommentary.ts',
    'src/shared/content/carereactions.ts',
    'src/shared/content/doodledares.ts',
    'src/shared/content/forecastblurbs.ts',
    'src/shared/content/founderrivalepisodes.ts',
    'src/shared/content/scoutnotes.ts',
    'src/shared/scoutnotebook.ts',
    'src/shared/analyzer-core.ts',
    'src/shared/battle.ts',
    'src/shared/cosmetics.ts',
    'src/shared/combat/types.ts',
    'src/shared/combat/shapepowercontent.ts',
    'src/shared/combat/config.ts',
    'src/shared/combat/elementcontent.ts',
    'src/shared/combat/selection.ts',
    'src/shared/combat/resultvalidation.ts',
    'src/shared/combat/fixed-math.ts',
    'src/shared/combat/random.ts',
    'src/shared/combat/engine.ts',
    'src/shared/combat/index.ts',
    'src/shared/combat/engine.test.ts',
    'src/server/core/day.ts',
    'src/server/core/random.ts',
    'src/server/core/ink.ts',
    'src/server/core/inkStore.ts',
    'src/server/core/legacy.ts',
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
    'src/server/core/founderChronicle.ts',
    'src/server/core/streak.ts',
    'src/server/core/moderation.ts',
    'src/server/core/privacy.ts',
    'src/server/core/practice.ts',
    'src/server/core/scoutNotebook.ts',
    'src/client/lib/inkmesh.ts',
    'src/client/lib/proceduraldoodleplan.ts',
    'src/client/lib/drawonboarding.ts',
    'src/client/lib/caremoment.ts',
    'src/client/lib/practicelab.ts',
    'src/client/lib/matchupbrief.ts',
    'src/client/lib/replaycommentary.ts',
    'src/client/lib/inkcastqueue.ts',
    'src/client/lib/sparrivals.ts',
    'src/client/lib/continuousreplay.ts',
    'src/client/lib/battlepresentation.ts',
    'src/client/lib/battlerecap.ts',
    'src/client/lib/battlejournal.ts',
    'src/client/lib/scoutnotebook.ts',
    'src/client/lib/shapepowerpresentation.ts',
    'src/client/lib/championchallenge.ts',
    'src/client/lib/founderchronicle.ts',
    'src/client/lib/nextgoal.ts',
    'src/client/lib/arenabracket.ts',
    'src/client/lib/accessories.ts',
    'src/client/lib/pens.ts',
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

const mockCombatTestOutputDirectory = join(
  tmpdir(),
  'scribbits-mock-combat-tests'
);
rmSync(mockCombatTestOutputDirectory, { recursive: true, force: true });
execFileSync(
  process.execPath,
  ['scripts/build-mock-combat.mjs', '--out-dir', mockCombatTestOutputDirectory],
  { cwd: repoRoot, stdio: 'pipe' }
);
symlinkSync(
  join(repoRoot, 'node_modules'),
  join(mockCombatTestOutputDirectory, 'node_modules'),
  'dir'
);
const mockCombatBundle = await import(
  `${pathToFileURL(join(mockCombatTestOutputDirectory, 'battle.mjs')).href}?test=1`
);
const { createMockBattleReportFactory } =
  await import('./mock-battle-factory.mjs');

const require = createRequire(import.meta.url);
const analyzerCore = require(join(outDir, 'shared', 'analyzer-core.js'));
const sharedBattle = require(join(outDir, 'shared', 'battle.js'));
const sharedCosmetics = require(join(outDir, 'shared', 'cosmetics.js'));
const combatEngineTests = require(
  join(outDir, 'shared', 'combat', 'engine.test.js')
);
const combatEngine = require(join(outDir, 'shared', 'combat', 'engine.js'));
const combatConfig = require(join(outDir, 'shared', 'combat', 'config.js'));
const combatSelection = require(
  join(outDir, 'shared', 'combat', 'selection.js')
);
const shapePowerContent = require(
  join(outDir, 'shared', 'combat', 'shapepowercontent.js')
);
const elementContent = require(
  join(outDir, 'shared', 'combat', 'elementcontent.js')
);
const arena = require(join(outDir, 'shared', 'arena.js'));
const founders = require(join(outDir, 'shared', 'founders.js'));
const careReactionContent = require(
  join(outDir, 'shared', 'content', 'carereactions.js')
);
const replayCommentaryContent = require(
  join(outDir, 'shared', 'content', 'replaycommentary.js')
);
const doodleDareContent = require(
  join(outDir, 'shared', 'content', 'doodledares.js')
);
const forecastFlavor = require(
  join(outDir, 'shared', 'content', 'forecastblurbs.js')
);
const founderRivalEpisodes = require(
  join(outDir, 'shared', 'content', 'founderrivalepisodes.js')
);
const scoutNoteContent = require(
  join(outDir, 'shared', 'content', 'scoutnotes.js')
);
const sharedScoutNotebook = require(join(outDir, 'shared', 'scoutnotebook.js'));
const arenaStore = require(join(outDir, 'server', 'core', 'arenaStore.js'));
const battle = require(join(outDir, 'server', 'core', 'battle.js'));
const battleStore = require(join(outDir, 'server', 'core', 'battleStore.js'));
const clout = require(join(outDir, 'server', 'core', 'clout.js'));
const dailyJob = require(join(outDir, 'server', 'core', 'dailyJob.js'));
const forecastCore = require(join(outDir, 'server', 'core', 'forecast.js'));
const inkCatalog = require(join(outDir, 'server', 'core', 'ink.js'));
const inkStore = require(join(outDir, 'server', 'core', 'inkStore.js'));
const legacyCore = require(join(outDir, 'server', 'core', 'legacy.js'));
const rumble = require(join(outDir, 'server', 'core', 'rumble.js'));
const speciesCore = require(join(outDir, 'server', 'core', 'species.js'));
const resultComment = require(
  join(outDir, 'server', 'core', 'resultComment.js')
);
const founderChronicleCore = require(
  join(outDir, 'server', 'core', 'founderChronicle.js')
);
const scribbitCore = require(join(outDir, 'server', 'core', 'scribbit.js'));
const streakCore = require(join(outDir, 'server', 'core', 'streak.js'));
const moderationCore = require(join(outDir, 'server', 'core', 'moderation.js'));
const privacyCore = require(join(outDir, 'server', 'core', 'privacy.js'));
const practiceCore = require(join(outDir, 'server', 'core', 'practice.js'));
const scoutNotebookCore = require(
  join(outDir, 'server', 'core', 'scoutNotebook.js')
);
const inkMeshCore = require(join(outDir, 'client', 'lib', 'inkmesh.js'));
const proceduralDoodlePlan = require(
  join(outDir, 'client', 'lib', 'proceduraldoodleplan.js')
);
const drawOnboarding = require(
  join(outDir, 'client', 'lib', 'drawonboarding.js')
);
const careMoment = require(join(outDir, 'client', 'lib', 'caremoment.js'));
const practiceLab = require(join(outDir, 'client', 'lib', 'practicelab.js'));
const matchupBrief = require(join(outDir, 'client', 'lib', 'matchupbrief.js'));
const replayCommentary = require(
  join(outDir, 'client', 'lib', 'replaycommentary.js')
);
const inkcastQueue = require(join(outDir, 'client', 'lib', 'inkcastqueue.js'));
const sparRivals = require(join(outDir, 'client', 'lib', 'sparrivals.js'));
const continuousReplay = require(
  join(outDir, 'client', 'lib', 'continuousreplay.js')
);
const battlePresentation = require(
  join(outDir, 'client', 'lib', 'battlepresentation.js')
);
const battleRecap = require(join(outDir, 'client', 'lib', 'battlerecap.js'));
const battleJournal = require(
  join(outDir, 'client', 'lib', 'battlejournal.js')
);
const scoutNotebookPlan = require(
  join(outDir, 'client', 'lib', 'scoutnotebook.js')
);
const shapePowerPresentation = require(
  join(outDir, 'client', 'lib', 'shapepowerpresentation.js')
);
const championChallenge = require(
  join(outDir, 'client', 'lib', 'championchallenge.js')
);
const founderChroniclePlan = require(
  join(outDir, 'client', 'lib', 'founderchronicle.js')
);
const nextGoal = require(join(outDir, 'client', 'lib', 'nextgoal.js'));
const arenaBracket = require(join(outDir, 'client', 'lib', 'arenabracket.js'));
const clientAccessories = require(
  join(outDir, 'client', 'lib', 'accessories.js')
);
const clientPens = require(join(outDir, 'client', 'lib', 'pens.js'));

const passedChecks = [];

const pass = (name) => {
  passedChecks.push(name);
};

const startDevMockForContractTest = async () => {
  const child = spawn(process.execPath, ['scripts/dev-mock.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: '0',
      MOCK_AUTO_RELOAD: '0',
      MOCK_COMBAT_BUNDLE_URL: pathToFileURL(
        join(mockCombatTestOutputDirectory, 'battle.mjs')
      ).href,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const baseUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Mock server did not start. ${stderr}`));
    }, 10_000);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(
        new Error(`Mock server exited with ${code ?? 'no code'}. ${stderr}`)
      );
    });
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const match = stdout.match(
        /Scribbits mock server running at http:\/\/localhost:(\d+)/
      );
      if (!match) return;
      clearTimeout(timeout);
      resolve(`http://127.0.0.1:${match[1]}`);
    });
  });
  return { child, baseUrl };
};

const stopDevMockContractTest = async (child) => {
  if (child.exitCode !== null) return;
  const gracefulExit = once(child, 'exit');
  child.kill('SIGTERM');
  await Promise.race([
    gracefulExit,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (child.exitCode === null) {
    const forcedExit = once(child, 'exit');
    child.kill('SIGKILL');
    await forcedExit;
  }
};

const mockContract = await startDevMockForContractTest();
const requestMock = async (path, init) => {
  const response = await fetch(`${mockContract.baseUrl}${path}`, init);
  return { response, body: await response.json() };
};
try {
  const loggedOutNotebook = await requestMock('/api/scout-notebook?logged-out');
  assert.equal(loggedOutNotebook.response.status, 401);

  const returningNotebook = await requestMock('/api/scout-notebook');
  assert.equal(returningNotebook.response.status, 200);
  assert.equal(returningNotebook.body.entries[0].status, 'open');
  assert.equal(returningNotebook.body.entries[1].replayAvailable, true);
  assert.equal(
    returningNotebook.body.entries[2].replayAvailable,
    true,
    'a report two days old should remain replayable inside the Notebook window'
  );
  const olderReplay = await requestMock('/api/rumble-replay?day=7');
  assert.equal(olderReplay.response.status, 200);
  assert.equal(olderReplay.body.day, 7);
  assert.equal(
    (await requestMock('/api/rumble-replay?day=6')).response.status,
    404,
    'an in-window day without a featured report should fail closed'
  );
  assert.equal(
    (await requestMock('/api/rumble-replay?day=2')).response.status,
    404,
    'a replay outside the seven-page window should fail closed'
  );
  assert.equal(
    (await requestMock('/api/rumble-replay?day=8&logged-out')).response.status,
    401
  );

  const freshNotebook = await requestMock('/api/scout-notebook?fresh');
  assert.equal(freshNotebook.body.entries[0].status, 'open');
  const freshBack = await requestMock('/api/back?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scribbitId: 'community-bristle' }),
  });
  assert.equal(freshBack.response.status, 200);
  const freshBackedNotebook = await requestMock('/api/scout-notebook?fresh');
  assert.equal(freshBackedNotebook.body.entries[0].status, 'pending');
  assert.equal(
    freshBackedNotebook.body.entries[0].pick.id,
    'community-bristle'
  );
  assert.equal(
    (await requestMock('/api/scout-notebook')).body.entries[0].status,
    'open',
    'fresh and returning Back mutations must not leak across preview modes'
  );

  const hideFreshPick = await requestMock('/api/report-scribbit?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scribbitId: 'community-bristle' }),
  });
  assert.equal(hideFreshPick.response.status, 200);
  const hiddenFreshNotebook = await requestMock('/api/scout-notebook?fresh');
  assert.equal(hiddenFreshNotebook.body.entries[0].status, 'pending');
  assert.equal(hiddenFreshNotebook.body.entries[0].pick, null);
  const hiddenOlderNotebook = await requestMock('/api/scout-notebook');
  assert.equal(hiddenOlderNotebook.body.entries[2].pick, null);
  assert.equal(hiddenOlderNotebook.body.entries[2].replayAvailable, false);

  const hideReplayOpponent = await requestMock('/api/report-scribbit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scribbitId: 'legend-solar-kiln' }),
  });
  assert.equal(hideReplayOpponent.response.status, 200);
  const hiddenOpponentNotebook = await requestMock('/api/scout-notebook');
  assert.equal(
    hiddenOpponentNotebook.body.entries[1].pick.id,
    'legend-inky-moon'
  );
  assert.equal(hiddenOpponentNotebook.body.entries[1].replayAvailable, false);
  assert.equal(
    (await requestMock('/api/rumble-replay?day=8')).response.status,
    404
  );
} finally {
  await stopDevMockContractTest(mockContract.child);
}
pass('mock Scout API honors auth, mutations, privacy, and replay bounds');

for (const combatCheck of combatEngineTests.runCombatEngineTests()) {
  pass(`fixed-tick combat: ${combatCheck}`);
}

const scoutStatuses = [
  'open',
  'pending',
  'champion',
  'finalist',
  'no_clout',
  'missed',
];
const scoutContentValidation = scoutNoteContent.validateScoutNoteContent();
assert.deepEqual(scoutContentValidation, {
  valid: true,
  errors: [],
  bankCount: 6,
  lineCount: 48,
});
assert.ok(Object.isFrozen(scoutNoteContent.SCOUT_NOTEBOOK_LINES));
const allScoutLines = [];
for (const status of scoutStatuses) {
  const lines = scoutNoteContent.SCOUT_NOTEBOOK_LINES[status];
  assert.equal(lines.length, 8, `${status} should have eight authored notes`);
  assert.ok(Object.isFrozen(lines));
  allScoutLines.push(...lines);
  for (let firstDay = 1; firstDay <= 32; firstDay += 1) {
    const sevenDayWindow = Array.from({ length: 7 }, (_, dayOffset) =>
      scoutNoteContent.selectScoutNoteLine(status, firstDay + dayOffset)
    );
    assert.equal(
      new Set(sevenDayWindow).size,
      7,
      `${status} notes should not repeat inside a seven-day window`
    );
  }
}
assert.equal(new Set(allScoutLines).size, 48);
const unsafeScoutBanks = Object.freeze({
  ...scoutNoteContent.SCOUT_NOTEBOOK_LINES,
  open: Object.freeze([
    'Guaranteed Clout reward for tonight.',
    ...scoutNoteContent.SCOUT_NOTEBOOK_LINES.open.slice(1),
  ]),
});
const unsafeScoutValidation =
  scoutNoteContent.validateScoutNoteContent(unsafeScoutBanks);
assert.equal(unsafeScoutValidation.valid, false);
assert.match(
  unsafeScoutValidation.errors.join('\n'),
  /promise or prediction|economy or reward language/
);
pass('Scout Notebook content stays complete, safe, and nonrepeating');

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
assert.equal(
  continuedPlayStreak.days,
  2,
  'next UTC day should continue the streak'
);
assert.equal(
  streakCore.advancePlayStreak(continuedPlayStreak, '20260711').days,
  1,
  'missing a UTC day should restart the streak'
);
pass('daily play streak continuation and reset');

const makeScribbit = (overrides = {}) => {
  const scribbit = {
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
    careDoneToday: overrides.careDoneToday ? [...overrides.careDoneToday] : [],
    legacy: overrides.legacy ?? null,
  };
  return scribbitCore.normalizeScribbitRecord(scribbit) ?? scribbit;
};

const sumStats = (stats) => {
  return stats.chonk + stats.spike + stats.zip + stats.charm;
};

const inkMeshGeometry = inkMeshCore.buildInkMeshGeometry(200, 160);
assert.equal(
  inkMeshGeometry.vertices.length,
  25 * 4,
  '4x4 mesh needs 25 xyuv vertices'
);
assert.equal(
  inkMeshGeometry.indices.length,
  32 * 4,
  '4x4 mesh needs 32 textured triangles'
);
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

const dominantStatTieCases = [
  {
    stats: { chonk: 40, spike: 40, zip: 10, charm: 10 },
    expected: 'chonk',
  },
  {
    stats: { chonk: 10, spike: 40, zip: 40, charm: 10 },
    expected: 'spike',
  },
  {
    stats: { chonk: 10, spike: 10, zip: 40, charm: 40 },
    expected: 'zip',
  },
  {
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    expected: 'chonk',
  },
];
for (const tieCase of dominantStatTieCases) {
  assert.equal(
    combatSelection.selectDominantStat(tieCase.stats),
    tieCase.expected,
    'shared selector should preserve pairwise dominant-stat tie precedence'
  );
  assert.equal(
    inkMeshCore.getSignatureTrait(tieCase.stats),
    tieCase.expected,
    'Inkbody should use the exact shared dominant-stat selector'
  );
}
assert.equal(
  combatEngine.selectPrimaryPower({
    chonk: 10,
    spike: 40,
    zip: 40,
    charm: 10,
  }),
  'nib_halo',
  'the direct engine module should preserve its selector re-export'
);
pass('shared dominant-stat selection parity across server and client');

assert.deepEqual(elementContent.validateElementPayloadGuide(), []);
assert.ok(Object.isFrozen(elementContent.ELEMENT_PAYLOAD_GUIDE));
assert.deepEqual(
  elementContent.ELEMENT_PAYLOAD_GUIDE.map((entry) => entry.element).sort(),
  ['ember', 'moss', 'storm', 'tide']
);
assert.equal(
  new Set(elementContent.ELEMENT_PAYLOAD_GUIDE.map((entry) => entry.detail))
    .size,
  4
);
const dishonestElementGuide = elementContent.ELEMENT_PAYLOAD_GUIDE.map(
  (entry, index) =>
    index === 0
      ? { ...entry, detail: 'Ember always beats Moss and guarantees a win.' }
      : entry
);
assert.match(
  elementContent.validateElementPayloadGuide(dishonestElementGuide).join('\n'),
  /hidden matchup rule/,
  'the Field Guide must never revive the retired element triangle'
);
pass('element guide stays complete and matches fixed-tick payload semantics');

assert.equal(
  doodleDareContent.DOODLE_DARES.length,
  32,
  'daily drawing content should provide eight prompts per Shape Power'
);
const doodleDareCatalogValidation =
  doodleDareContent.validateDoodleDareCatalog();
assert.equal(doodleDareCatalogValidation.valid, true);
assert.deepEqual(doodleDareCatalogValidation.errors, []);
assert.equal(doodleDareCatalogValidation.promptCount, 32);
assert.equal(doodleDareCatalogValidation.twistCount, 8);
assert.ok(Object.isFrozen(doodleDareContent.DOODLE_DARES));
assert.ok(
  doodleDareContent.DOODLE_DARES.every((dare) => Object.isFrozen(dare))
);
assert.ok(Object.isFrozen(doodleDareContent.DOODLE_DARE_TWISTS));
assert.equal(new Set(doodleDareContent.DOODLE_DARE_TWISTS).size, 8);
assert.equal(
  new Set(doodleDareContent.DOODLE_DARES.map((dare) => dare.id)).size,
  doodleDareContent.DOODLE_DARES.length,
  'daily doodle dare ids must remain unique'
);
assert.equal(
  new Set(doodleDareContent.DOODLE_DARES.map((dare) => dare.prompt)).size,
  doodleDareContent.DOODLE_DARES.length,
  'daily doodle dare copy must not repeat'
);
for (const power of ['inkquake', 'nib_halo', 'smearstep', 'colorburst']) {
  assert.equal(
    doodleDareContent.DOODLE_DARES.filter(
      (dare) => dare.suggestedPower === power
    ).length,
    8,
    `${power} should own exactly one quarter of the optional prompts`
  );
  assert.equal(doodleDareCatalogValidation.promptsPerPower[power], 8);
}
assert.equal(
  doodleDareContent.selectDailyDoodleDare(9, 'mock_player').id,
  doodleDareContent.selectDailyDoodleDare(9, 'mock_player').id,
  'the same player and arena day must never reroll the creative brief'
);
const firstDoodleCalendar = Array.from({ length: 32 }, (_, dayIndex) =>
  doodleDareContent.selectDailyDoodleDare(dayIndex + 1, 'calendar-player')
);
assert.equal(
  new Set(firstDoodleCalendar.map((dare) => dare.id)).size,
  32,
  'one player should see every optional prompt before the calendar repeats'
);
for (let blockStart = 0; blockStart < 32; blockStart += 4) {
  assert.deepEqual(
    [
      ...new Set(
        firstDoodleCalendar
          .slice(blockStart, blockStart + 4)
          .map((dare) => dare.suggestedPower)
      ),
    ].sort(),
    ['colorburst', 'inkquake', 'nib_halo', 'smearstep'],
    `days ${blockStart + 1}-${blockStart + 4} should offer all four drawing identities`
  );
}
assert.equal(
  doodleDareContent.selectDailyDoodleDare(33, 'calendar-player').id,
  firstDoodleCalendar[0].id,
  'the stateless authored calendar should repeat only after all 32 prompts'
);
const doodleDareCards = Array.from({ length: 256 }, (_, dayIndex) => {
  const dayNumber = dayIndex + 1;
  return `${doodleDareContent.selectDailyDoodleDare(dayNumber, 'calendar-player').id}|${doodleDareContent.selectDailyDoodleDareTwist(dayNumber, 'calendar-player')}`;
});
assert.equal(
  new Set(doodleDareCards).size,
  256,
  'prompt-plus-twist cards should not repeat during the full 256-day schedule'
);
assert.equal(
  `${doodleDareContent.selectDailyDoodleDare(257, 'calendar-player').id}|${doodleDareContent.selectDailyDoodleDareTwist(257, 'calendar-player')}`,
  doodleDareCards[0],
  'the exact optional card should repeat only after all 256 combinations'
);
assert.equal(
  doodleDareContent.selectDoodleDareForPower('smearstep', 'practice-proof')
    .suggestedPower,
  'smearstep'
);
const unsafeDoodleDareCatalog = doodleDareContent.DOODLE_DARES.map(
  (dare, index) =>
    index === 0 ? { ...dare, prompt: 'a guaranteed XP prize monster' } : dare
);
const unsafeDoodleDareValidation = doodleDareContent.validateDoodleDareCatalog(
  unsafeDoodleDareCatalog
);
assert.equal(unsafeDoodleDareValidation.valid, false);
assert.match(
  unsafeDoodleDareValidation.errors.join('\n'),
  /predicts an outcome or promises a reward/,
  'optional prompts must never imply progression rewards or battle odds'
);
const unsafeDoodleDareTwistValidation =
  doodleDareContent.validateDoodleDareCatalog(doodleDareContent.DOODLE_DARES, [
    ...doodleDareContent.DOODLE_DARE_TWISTS.slice(0, 7),
    'win a guaranteed prize',
  ]);
assert.equal(unsafeDoodleDareTwistValidation.valid, false);
assert.match(
  unsafeDoodleDareTwistValidation.errors.join('\n'),
  /predicts an outcome or promises a reward/,
  'optional twists must remain expressive rather than outcome-changing'
);
const selectedDarePowers = new Set(
  Array.from(
    { length: 128 },
    (_, dayNumber) =>
      doodleDareContent.selectDailyDoodleDare(dayNumber, 'prompt-coverage')
        .suggestedPower
  )
);
assert.deepEqual(
  [...selectedDarePowers].sort(),
  ['colorburst', 'inkquake', 'nib_halo', 'smearstep'],
  'deterministic prompt selection should reach every drawing identity'
);
pass('daily Doodle Dare calendar stays complete, balanced, and nonrepeating');

const careReactionValidation =
  careReactionContent.validateCareReactionCatalog();
assert.equal(careReactionValidation.valid, true);
assert.deepEqual(careReactionValidation.errors, []);
assert.equal(careReactionValidation.entryCount, 72);
assert.equal(careReactionValidation.coveredMatrixSlotCount, 72);
assert.ok(Object.isFrozen(careReactionContent.CARE_REACTION_DECK));
assert.ok(
  careReactionContent.CARE_REACTION_DECK.every((reaction) =>
    Object.isFrozen(reaction)
  )
);
assert.equal(
  new Set(
    careReactionContent.CARE_REACTION_DECK.map((reaction) => reaction.line)
  ).size,
  72,
  'every authored care reaction should remain globally unique'
);
const lifetimeCareReactions = [];
for (const lifeDay of [1, 2, 3]) {
  for (const action of ['feed', 'pat', 'train']) {
    lifetimeCareReactions.push(
      careReactionContent.selectCareReaction(
        'inkquake',
        action,
        lifeDay,
        'care-lifetime-proof'
      ).line
    );
  }
}
assert.equal(
  new Set(lifetimeCareReactions).size,
  9,
  'one Scribbit should receive nine distinct care moments across its life'
);
assert.equal(
  careReactionContent.selectCareReaction('nib_halo', 'pat', -20, 'clamp-proof')
    .lifeDay,
  1
);
assert.equal(
  careReactionContent.selectCareReaction('nib_halo', 'pat', 20, 'clamp-proof')
    .lifeDay,
  3
);
const unsafeCareReactions = careReactionContent.CARE_REACTION_DECK.map(
  (reaction, index) =>
    index === 0
      ? {
          ...reaction,
          line: 'A guaranteed XP reward jumps straight into the wallet.',
        }
      : reaction
);
const unsafeCareReactionValidation =
  careReactionContent.validateCareReactionCatalog(unsafeCareReactions);
assert.equal(unsafeCareReactionValidation.valid, false);
assert.match(
  unsafeCareReactionValidation.errors.join('\n'),
  /progression or outcome claim/,
  'care flavor must never invent progression or battle truth'
);
const beforeCareMoment = makeScribbit({
  id: 'care-moment-proof',
  name: '  Crater   Pal  ',
  bornDay: 9,
  expiresDay: 12,
  xp: 2,
  stats: { chonk: 55, spike: 15, zip: 15, charm: 15 },
});
const afterCareMoment = makeScribbit({
  ...beforeCareMoment,
  name: 'Crater Pal',
  xp: 3,
  mood: 'sleepy',
  careDoneToday: ['feed'],
});
const firstCareMomentPlan = careMoment.planCareMoment(
  beforeCareMoment,
  afterCareMoment,
  'feed',
  9,
  1
);
assert.equal(firstCareMomentPlan.lifeDay, 1);
assert.equal(firstCareMomentPlan.power, 'inkquake');
assert.equal(firstCareMomentPlan.experienceGained, 1);
assert.equal(firstCareMomentPlan.inkAwarded, 1);
assert.equal(firstCareMomentPlan.careMarkCount, 1);
assert.match(firstCareMomentPlan.headline, /SNACK BREAK: CRATER PAL/);
assert.match(firstCareMomentPlan.rewardLine, /\+1 XP.*\+1 INK/);
assert.match(firstCareMomentPlan.progressLine, /SLEEPY.*1\/3 CARE MARKS/);
const finalCareMomentPlan = careMoment.planCareMoment(
  makeScribbit({ ...beforeCareMoment, xp: 4, careDoneToday: ['feed', 'pat'] }),
  makeScribbit({
    ...beforeCareMoment,
    xp: 6,
    mood: 'pumped',
    careDoneToday: ['feed', 'pat', 'train'],
  }),
  'train',
  11,
  0
);
assert.equal(finalCareMomentPlan.lifeDay, 3);
assert.equal(finalCareMomentPlan.experienceGained, 2);
assert.equal(finalCareMomentPlan.inkAwarded, 0);
assert.match(finalCareMomentPlan.rewardLine, /\+2 XP.*CARE SAVED/);
assert.doesNotMatch(finalCareMomentPlan.rewardLine, /\+\d+ INK/);
pass('Care Reaction Deck stays complete, varied, safe, and server-truthful');

assert.deepEqual(
  drawOnboarding.planDrawFeedback({
    inkedPixels: 0,
    minimumInkedPixels: 100,
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    element: 'ember',
  }),
  {
    phase: 'blank',
    message: drawOnboarding.DRAW_RULES_COPY,
    power: null,
  },
  'an empty page must teach the drawing-to-power contract without claiming a default power'
);
assert.equal(
  drawOnboarding.planDrawFeedback({
    inkedPixels: 99,
    minimumInkedPixels: 100,
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    element: 'ember',
  }).phase,
  'sketching',
  'a tiny mark should ask for a body instead of locking in a misleading build'
);
for (const [power, stats] of Object.entries({
  inkquake: { chonk: 55, spike: 15, zip: 15, charm: 15 },
  nib_halo: { chonk: 15, spike: 55, zip: 15, charm: 15 },
  smearstep: { chonk: 15, spike: 15, zip: 55, charm: 15 },
  colorburst: { chonk: 15, spike: 15, zip: 15, charm: 55 },
})) {
  const feedback = drawOnboarding.planDrawFeedback({
    inkedPixels: 100,
    minimumInkedPixels: 100,
    stats,
    element: 'ember',
  });
  assert.equal(feedback.phase, 'ready');
  assert.equal(feedback.power, power);
  assert.ok(
    feedback.message.startsWith(
      shapePowerContent.getShapePowerSignatureName('ember', power).toUpperCase()
    ),
    `${power} feedback should use its shared elemental signature`
  );
}
pass('live draw feedback remains deterministic and server-truthful');

const practicedPowers = [];
for (let practiceIndex = 0; practiceIndex < 4; practiceIndex += 1) {
  const target = practiceLab.selectPracticeTargetPower(
    practicedPowers,
    9,
    'mock_player'
  );
  assert.ok(
    !practicedPowers.includes(target),
    'Practice Lab should target an untried power until all four are checked'
  );
  const dare = practiceLab.selectPracticeDoodleDare(
    practicedPowers,
    9,
    'mock_player'
  );
  assert.equal(
    dare.suggestedPower,
    target,
    'Practice Lab prompt and target power should stay aligned'
  );
  practicedPowers.push(target);
}
assert.deepEqual(
  [...practicedPowers].sort(),
  ['colorburst', 'inkquake', 'nib_halo', 'smearstep'],
  'one Practice Lab cycle should cover every Shape Power exactly once'
);
assert.equal(
  practiceLab
    .normalizePracticePowers(['smearstep', 'invalid', 'smearstep', 'inkquake'])
    .join(','),
  'inkquake,smearstep',
  'session progress should reject unknown powers and normalize duplicates'
);
assert.match(
  practiceLab.practiceProgressCopy(practicedPowers),
  /4\/4 POWERS/,
  'completed session progress should be unmistakable'
);
assert.equal(
  (practiceLab.practiceChecklistCopy(practicedPowers).match(/✓/g) ?? []).length,
  4,
  'completed practice checklist should mark all four powers'
);
const firstPracticeSession = practiceLab.recordPracticeSessionPower(
  practiceLab.createPracticeSession(),
  'inkquake'
);
assert.equal(firstPracticeSession.lastPowerWasNew, true);
assert.deepEqual(firstPracticeSession.triedPowers, ['inkquake']);
assert.equal(firstPracticeSession.attemptCount, 1);
const repeatedPracticeSession = practiceLab.recordPracticeSessionPower(
  firstPracticeSession,
  'inkquake'
);
assert.equal(repeatedPracticeSession.lastPowerWasNew, false);
assert.equal(repeatedPracticeSession.attemptCount, 2);
assert.deepEqual(
  repeatedPracticeSession.triedPowers,
  ['inkquake'],
  'repeating one server-confirmed power must not inflate session progress'
);
const completedPracticeSession = practicedPowers.reduce(
  (session, power) => practiceLab.recordPracticeSessionPower(session, power),
  practiceLab.createPracticeSession()
);
const completedPracticePlan = practiceLab.planPracticeOutcome(
  completedPracticeSession
);
assert.equal(completedPracticePlan.completed, true);
assert.equal(completedPracticePlan.celebrateCompletion, true);
assert.equal(completedPracticePlan.headline, '✦ 4/4 POWERS FOUND! ✦');
assert.match(completedPracticePlan.result, /DRAW DIFFERENTLY/);
assert.match(completedPracticePlan.primaryButton, /DRAW ONE MORE/);
assert.equal(completedPracticeSession.attemptCount, 4);
const practiceEncoreTargets = Array.from({ length: 4 }, (_, encoreIndex) =>
  practiceLab.selectPracticeTargetPower(
    completedPracticeSession.triedPowers,
    9,
    'mock_player',
    completedPracticeSession.attemptCount + encoreIndex
  )
);
assert.equal(
  new Set(practiceEncoreTargets).size,
  4,
  'post-completion Practice should rotate through all powers instead of repeating one target'
);
const practiceEncorePrompts = Array.from(
  { length: 4 },
  (_, encoreIndex) =>
    practiceLab.selectPracticeDoodleDare(
      completedPracticeSession.triedPowers,
      9,
      'mock_player',
      completedPracticeSession.attemptCount + encoreIndex
    ).id
);
assert.equal(
  new Set(practiceEncorePrompts).size,
  4,
  'post-completion Practice should keep its prompt cards visibly varied'
);
const repeatedCompletedSession = practiceLab.recordPracticeSessionPower(
  completedPracticeSession,
  completedPracticeSession.lastPower
);
assert.equal(repeatedCompletedSession.attemptCount, 5);
assert.equal(
  practiceLab.planPracticeOutcome(repeatedCompletedSession).celebrateCompletion,
  false,
  'repeating a power after 4/4 must not replay the completion celebration'
);
assert.equal(
  practiceLab.planPracticeOutcome(repeatedPracticeSession).completed,
  false,
  'repeating one power must never trigger the four-power completion ceremony'
);
pass('Practice Lab targets every Shape Power without persistent progression');

const inkcastPackValidation =
  replayCommentaryContent.validateInkcastCommentaryPack();
assert.equal(inkcastPackValidation.valid, true);
assert.deepEqual(inkcastPackValidation.errors, []);
assert.equal(inkcastPackValidation.bankCount, 25);
assert.equal(
  inkcastPackValidation.lineCount,
  replayCommentaryContent.INKCAST_COMMENTARY_EXPECTED_LINE_COUNT
);
assert.equal(inkcastPackValidation.lineCount, 104);
assert.equal(replayCommentaryContent.INKCAST_COMMENTARY_PACK_VERSION, 1);
assert.ok(Object.isFrozen(replayCommentaryContent.INKCAST_COMMENTARY_BANKS));
assert.ok(
  replayCommentaryContent.INKCAST_COMMENTARY_BANKS.every(
    (bank) =>
      Object.isFrozen(bank) &&
      Object.isFrozen(bank.allowedTokens) &&
      Object.isFrozen(bank.requiredTokens) &&
      Object.isFrozen(bank.variants) &&
      bank.variants.every((variant) => Object.isFrozen(variant))
  )
);

for (const bank of replayCommentaryContent.INKCAST_COMMENTARY_BANKS) {
  const selectedVariantIds = Array.from(
    { length: bank.variants.length + 1 },
    (_, occurrenceIndex) =>
      replayCommentaryContent.selectInkcastCommentaryVariant(
        bank.id,
        'inkcast-exhaustion-proof',
        occurrenceIndex
      ).id
  );
  assert.equal(
    new Set(selectedVariantIds.slice(0, bank.variants.length)).size,
    bank.variants.length,
    `${bank.id} should exhaust every authored variant before reuse`
  );
  assert.equal(
    selectedVariantIds[bank.variants.length],
    selectedVariantIds[0],
    `${bank.id} should restart its deterministic cycle after exhaustion`
  );
  assert.notEqual(
    selectedVariantIds[bank.variants.length - 1],
    selectedVariantIds[bank.variants.length],
    `${bank.id} must not repeat across a cycle boundary`
  );
}

const inkquakeTelegraphOrders = new Set(
  Array.from({ length: 64 }, (_, battleIndex) =>
    Array.from(
      { length: 5 },
      (_, occurrenceIndex) =>
        replayCommentaryContent.selectInkcastCommentaryVariant(
          'power.inkquake.telegraph',
          `inkcast-order-${battleIndex}`,
          occurrenceIndex
        ).id
    ).join('|')
  )
);
assert.ok(
  inkquakeTelegraphOrders.size >= 8,
  'battle identity should expose several stable per-bank permutations'
);

function replaceInkcastTemplate(bankId, replacementTemplate) {
  return Object.freeze(
    replayCommentaryContent.INKCAST_COMMENTARY_BANKS.map((bank) => {
      if (bank.id !== bankId) return bank;
      return Object.freeze({
        ...bank,
        variants: Object.freeze(
          bank.variants.map((variant, index) =>
            index === 0
              ? Object.freeze({ ...variant, template: replacementTemplate })
              : variant
          )
        ),
      });
    })
  );
}

const unsafeTokenAndClaimErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate('general.burn', '{actor} wins XP!')
  )
  .errors.join('\n');
assert.match(unsafeTokenAndClaimErrors, /forbidden token actor/);
assert.match(unsafeTokenAndClaimErrors, /missing token target/);
assert.match(unsafeTokenAndClaimErrors, /outcome or reward claim/);

const malformedTokenErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate(
      'general.burn',
      '{target catches a capped Ember afterburn!'
    )
  )
  .errors.join('\n');
assert.match(malformedTokenErrors, /malformed token braces/);

const inventedMissErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate(
      'power.smearstep.miss',
      '{actor} dodges the dead zone with {move}!'
    )
  )
  .errors.join('\n');
assert.match(inventedMissErrors, /unproven miss mechanic/);
assert.match(inventedMissErrors, /truthful no-hit result/);

const actorWideMissErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate(
      'power.smearstep.miss',
      'Two {move} dashes, no damage from {actor}!'
    )
  )
  .errors.join('\n');
assert.match(actorWideMissErrors, /actor-wide miss claim/);

const futureArenaClaimErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate(
      'general.arena-shrink',
      'Arena folds close — collisions are coming!'
    )
  )
  .errors.join('\n');
assert.match(futureArenaClaimErrors, /future arena event/);

const inventedPressureTimingErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate(
      'general.ink-pressure',
      'INK PRESSURE refreshes one more power for {actor}!'
    )
  )
  .errors.join('\n');
assert.match(inventedPressureTimingErrors, /invents Ink Pressure timing/);

const broadLateFightErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate(
      'general.late-fight',
      'SUDDEN SCRIBBLE! The page speeds up!'
    )
  )
  .errors.join('\n');
assert.match(broadLateFightErrors, /overstates the late-fight phase/);
assert.match(broadLateFightErrors, /faster power cooldowns/);

const timingNeutralPressureTemplates =
  replayCommentaryContent.getInkcastCommentaryBank(
    'general.ink-pressure'
  ).variants;
assert.ok(
  timingNeutralPressureTemplates.every(
    (variant) =>
      !/refresh|one more power|immediate|pending|queued|banks?/i.test(
        variant.template
      )
  ),
  'Ink Pressure copy must remain truthful for immediate and queued events'
);
const shrinkStartTemplates = replayCommentaryContent.getInkcastCommentaryBank(
  'general.arena-shrink'
).variants;
assert.ok(
  shrinkStartTemplates.every(
    (variant) =>
      !/collisions? (?:are|is) coming|nowhere left to hide/i.test(
        variant.template
      )
  ),
  'arena-shrink-start copy must not predict a later collision or hiding state'
);

const duplicateTemplate =
  replayCommentaryContent.getInkcastCommentaryBank('power.inkquake.hit')
    .variants[0].template;
const duplicateTemplateErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate('general.normal-hit', duplicateTemplate)
  )
  .errors.join('\n');
assert.match(duplicateTemplateErrors, /duplicates the template/);

const renderedOverlengthErrors = replayCommentaryContent
  .validateInkcastCommentaryPack(
    replaceInkcastTemplate(
      'general.normal-hit',
      `{source} ${'stretches '.repeat(6)}{amount} to {target}!`
    )
  )
  .errors.join('\n');
assert.match(renderedOverlengthErrors, /rendered characters/);
assert.throws(
  () =>
    replayCommentaryContent.renderInkcastCommentaryTemplate(
      '{target} catches {amount}!',
      { target: 'Moss Wizard' }
    ),
  /token is missing: amount/
);
assert.throws(
  () =>
    replayCommentaryContent.renderInkcastCommentaryTemplate(
      '{target catches ink!',
      { target: 'Moss Wizard' }
    ),
  /malformed token braces/
);
pass('versioned Inkcast pack is exhaustive, immutable, and contract-safe');

const commentaryContext = {
  battleId: 'battle-commentary-proof',
  fighters: {
    a: {
      id: 'community-paper-comet',
      name: 'Paper Comet',
      element: 'ember',
      primaryPower: 'inkquake',
    },
    b: {
      id: 'community-moss-wizard',
      name: 'Moss Wizard',
      element: 'moss',
      primaryPower: 'nib_halo',
    },
  },
};
const commentaryContextSnapshot = structuredClone(commentaryContext);
const powerTelegraphFact = {
  kind: 'power-telegraph',
  tick: 48,
  actor: 'a',
  power: 'inkquake',
  activationNumber: 2,
};
const firstTelegraph = replayCommentary
  .createReplayCommentaryAuthor(commentaryContext)
  .author(powerTelegraphFact);
assert.equal(
  replayCommentary
    .createReplayCommentaryAuthor(commentaryContext)
    .author(powerTelegraphFact),
  firstTelegraph,
  'fresh sessions with the same authoritative facts must replay identically'
);
assert.deepEqual(
  commentaryContext,
  commentaryContextSnapshot,
  'commentary authoring must not mutate replay context'
);
const telegraphVariants = new Set(
  Array.from({ length: 64 }, (_, index) =>
    replayCommentary
      .createReplayCommentaryAuthor({
        ...commentaryContext,
        battleId: `battle-variant-${index}`,
      })
      .author(powerTelegraphFact)
  )
);
assert.ok(
  telegraphVariants.size >= 3,
  'battle identity should expose several deterministic telegraph variants'
);
const truthfulDamageLine = replayCommentary
  .createReplayCommentaryAuthor(commentaryContext)
  .author({
    kind: 'damage',
    tick: 72,
    sourceFighter: 'a',
    targetFighter: 'b',
    sourceName: 'Cinderquake',
    sourcePower: 'inkquake',
    amount: 37,
    critical: false,
  });
assert.match(truthfulDamageLine, /Cinderquake/);
assert.match(truthfulDamageLine, /Moss Wizard/);
assert.match(truthfulDamageLine, /37/);
const criticalDamageLine = replayCommentary
  .createReplayCommentaryAuthor(commentaryContext)
  .author({
    kind: 'damage',
    tick: 73,
    sourceFighter: 'b',
    targetFighter: 'a',
    sourceName: 'Mossguard Halo',
    sourcePower: 'nib_halo',
    amount: 51,
    critical: true,
  });
assert.match(criticalDamageLine, /Mossguard Halo/);
assert.match(criticalDamageLine, /Paper Comet/);
assert.match(criticalDamageLine, /51/);
assert.match(criticalDamageLine, /CRIT|BIG SPLAT/);
const truthfulMissLine = replayCommentary
  .createReplayCommentaryAuthor(commentaryContext)
  .author({
    kind: 'power-missed',
    tick: 74,
    actor: 'b',
    power: 'nib_halo',
    activationNumber: 2,
  });
assert.doesNotMatch(
  truthfulMissLine,
  /Paper Comet/i,
  'a miss line must not invent an opponent action'
);
assert.doesNotMatch(
  truthfulMissLine,
  /dodge|evade|sidestep|counter|dead zone/i,
  'a miss line must not invent movement or matchup mechanics'
);
assert.match(
  truthfulMissLine,
  /no clean (?:hit|nib contact)|without damage/i,
  'a miss line should claim only no clean hit or no damage'
);
const mosswhiskDefinition =
  founders.getFoundingScribbitDefinition('founding-mosswhisk');
assert.ok(mosswhiskDefinition);
const founderCommentaryContext = {
  ...commentaryContext,
  battleId: 'battle-founder-story-proof',
  fighters: {
    ...commentaryContext.fighters,
    a: {
      ...commentaryContext.fighters.a,
      id: mosswhiskDefinition.id,
      name: mosswhiskDefinition.name,
      element: mosswhiskDefinition.element,
      primaryPower: combatSelection.selectPrimaryPower(
        mosswhiskDefinition.stats
      ),
    },
  },
};
const founderOpening = replayCommentary.authorFounderBattleOpening(
  founderCommentaryContext
);
assert.ok(founderOpening);
assert.match(founderOpening, new RegExp(mosswhiskDefinition.name));
assert.ok(
  mosswhiskDefinition.personality.openingLines.some((line) =>
    founderOpening.includes(line)
  ),
  "a founder battle should use one of that founder's authored openings"
);
const founderCommentaryAuthor = replayCommentary.createReplayCommentaryAuthor(
  founderCommentaryContext
);
const founderSignatureReaction = founderCommentaryAuthor.author({
  kind: 'power-telegraph',
  tick: 24,
  actor: 'a',
  power: founderCommentaryContext.fighters.a.primaryPower,
  activationNumber: 1,
});
assert.match(
  founderSignatureReaction,
  new RegExp(mosswhiskDefinition.personality.signatureReaction)
);
assert.match(
  replayCommentary.authorFounderBattleOutcome(founderCommentaryContext, 'a'),
  new RegExp(mosswhiskDefinition.personality.victoryLine)
);
assert.match(
  replayCommentary.authorFounderBattleOutcome(founderCommentaryContext, 'b'),
  new RegExp(mosswhiskDefinition.personality.defeatLine)
);
assert.equal(
  replayCommentary.authorFounderBattleOutcome(commentaryContext, 'a'),
  null,
  'community-only battles should keep the generic outcome presentation'
);
const representativeCommentaryFacts = [
  { kind: 'battle-start', tick: 0 },
  powerTelegraphFact,
  {
    kind: 'power-missed',
    tick: 64,
    actor: 'a',
    power: 'inkquake',
    activationNumber: 2,
  },
  { kind: 'burn', tick: 75, targetFighter: 'b' },
  { kind: 'barrier-created', tick: 80, actor: 'b' },
  { kind: 'barrier-hit', tick: 81, actor: 'b', absorbedDamage: 19 },
  { kind: 'barrier-broken', tick: 82, actor: 'b' },
  { kind: 'ink-pressure', tick: 90, actor: 'a' },
  { kind: 'nib-recoil', tick: 91, actor: 'b' },
  { kind: 'arena-shrink', tick: 100 },
  { kind: 'echo-created', tick: 110, actor: 'a' },
  { kind: 'echo-fired', tick: 120, actor: 'a' },
  { kind: 'echo-shattered', tick: 121, actor: 'a' },
  { kind: 'late-fight', tick: 140 },
];
const representativeCommentaryAuthor =
  replayCommentary.createReplayCommentaryAuthor(commentaryContext);
for (const fact of representativeCommentaryFacts) {
  const authoredLine = representativeCommentaryAuthor.author(fact);
  assert.ok(authoredLine.length > 0 && authoredLine.length <= 110);
  assert.doesNotMatch(authoredLine, /\{|\}|undefined|null/);
}

function factForInkcastBank(bankId, occurrenceIndex) {
  const tick = 200 + occurrenceIndex;
  if (bankId.startsWith('power.')) {
    const [, power, moment] = bankId.split('.');
    if (moment === 'telegraph') {
      return {
        kind: 'power-telegraph',
        tick,
        actor: 'a',
        power,
        activationNumber: occurrenceIndex + 2,
      };
    }
    if (moment === 'miss') {
      return {
        kind: 'power-missed',
        tick,
        actor: 'a',
        power,
        activationNumber: occurrenceIndex + 2,
      };
    }
    return {
      kind: 'damage',
      tick,
      sourceFighter: 'a',
      targetFighter: 'b',
      sourceName: 'Thirty Two Character Source Name!',
      sourcePower: power,
      amount: 9999,
      critical: false,
    };
  }

  switch (bankId) {
    case 'general.battle-start':
      return { kind: 'battle-start', tick };
    case 'general.normal-hit':
      return {
        kind: 'damage',
        tick,
        sourceFighter: 'a',
        targetFighter: 'b',
        sourceName: 'Thirty Two Character Source Name!',
        sourcePower: null,
        amount: 9999,
        critical: false,
      };
    case 'general.critical-hit':
      return {
        kind: 'damage',
        tick,
        sourceFighter: 'a',
        targetFighter: 'b',
        sourceName: 'Thirty Two Character Source Name!',
        sourcePower: 'inkquake',
        amount: 9999,
        critical: true,
      };
    case 'general.burn':
      return { kind: 'burn', tick, targetFighter: 'b' };
    case 'general.barrier-created':
      return { kind: 'barrier-created', tick, actor: 'b' };
    case 'general.barrier-hit':
      return { kind: 'barrier-hit', tick, actor: 'b', absorbedDamage: 9999 };
    case 'general.barrier-broken':
      return { kind: 'barrier-broken', tick, actor: 'b' };
    case 'general.ink-pressure':
      return { kind: 'ink-pressure', tick, actor: 'a' };
    case 'general.nib-recoil':
      return { kind: 'nib-recoil', tick, actor: 'b' };
    case 'general.arena-shrink':
      return { kind: 'arena-shrink', tick };
    case 'general.echo-created':
      return { kind: 'echo-created', tick, actor: 'a' };
    case 'general.echo-fired':
      return { kind: 'echo-fired', tick, actor: 'a' };
    case 'general.echo-shattered':
      return { kind: 'echo-shattered', tick, actor: 'a' };
    case 'general.late-fight':
      return { kind: 'late-fight', tick };
    default:
      throw new Error(`Missing test fact for ${bankId}`);
  }
}

const maximumCommentaryContext = {
  ...commentaryContext,
  battleId: 'maximum-rendered-commentary-proof',
  fighters: {
    a: { ...commentaryContext.fighters.a, name: 'A'.repeat(24) },
    b: { ...commentaryContext.fighters.b, name: 'M'.repeat(24) },
  },
};
for (const bank of replayCommentaryContent.INKCAST_COMMENTARY_BANKS) {
  const bankAuthor = replayCommentary.createReplayCommentaryAuthor(
    maximumCommentaryContext
  );
  const renderedBank = bank.variants.map((_, occurrenceIndex) => {
    const fact = factForInkcastBank(bank.id, occurrenceIndex);
    assert.equal(replayCommentary.getReplayCommentaryBankId(fact), bank.id);
    return bankAuthor.author(fact);
  });
  assert.equal(
    new Set(renderedBank).size,
    bank.variants.length,
    `${bank.id} should render every template before repeating`
  );
  for (const renderedLine of renderedBank) {
    assert.ok(
      renderedLine.length > 0 && renderedLine.length <= 110,
      `${bank.id} rendered outside the mobile copy bound: ${renderedLine}`
    );
    assert.doesNotMatch(renderedLine, /\{|\}|undefined|null|NaN/);
  }
  assert.equal(
    bankAuthor.author(factForInkcastBank(bank.id, bank.variants.length)),
    renderedBank[0],
    `${bank.id} should replay its first line only after exhausting the bank`
  );
}

const founderGenericContext = {
  ...founderCommentaryContext,
  fighters: {
    ...founderCommentaryContext.fighters,
    a: {
      ...founderCommentaryContext.fighters.a,
      id: 'community-founder-rotation-proof',
    },
  },
};
const firstGenericFounderPowerLine = replayCommentary
  .createReplayCommentaryAuthor(founderGenericContext)
  .author({
    kind: 'power-telegraph',
    tick: 48,
    actor: 'a',
    power: founderCommentaryContext.fighters.a.primaryPower,
    activationNumber: 2,
  });
const firstLineAfterFounderSignature = founderCommentaryAuthor.author({
  kind: 'power-telegraph',
  tick: 48,
  actor: 'a',
  power: founderCommentaryContext.fighters.a.primaryPower,
  activationNumber: 2,
});
assert.equal(
  firstLineAfterFounderSignature,
  firstGenericFounderPowerLine,
  'a founder signature must not consume the ordinary telegraph rotation'
);
assert.ok(
  replayCommentaryContent.INKCAST_COMMENTARY_BANK_IDS.every(
    (bankId) => bankId !== 'power.colorburst.miss'
  ),
  'Colorburst must not claim a miss before its delayed echo resolves'
);
pass(
  'replay-scoped Inkcast authoring is deterministic, no-repeat, truthful, and bounded'
);

assert.equal(inkcastQueue.INKCAST_WALL_CLOCK_DWELL_MILLISECONDS, 900);
assert.equal(inkcastQueue.INKCAST_PENDING_ITEM_LIMIT, 2);
const sameTickEditorialCandidates = [
  {
    fact: {
      kind: 'barrier-hit',
      tick: 80,
      actor: 'b',
      absorbedDamage: 18,
    },
    text: 'shield hit',
  },
  {
    fact: { kind: 'barrier-broken', tick: 80, actor: 'b' },
    text: 'shield broken',
  },
  {
    fact: {
      kind: 'damage',
      tick: 80,
      sourceFighter: 'a',
      targetFighter: 'b',
      sourceName: 'Cinderquake',
      sourcePower: 'inkquake',
      amount: 44,
      critical: true,
    },
    text: 'critical splat',
  },
  {
    fact: { kind: 'burn', tick: 80, targetFighter: 'b' },
    text: 'afterburn',
  },
].map(({ fact, text }, sequence) =>
  inkcastQueue.createInkcastEditorialCandidate(fact, text, sequence)
);
const sameTickHeadline = inkcastQueue.chooseInkcastCandidateForSimulationTick(
  sameTickEditorialCandidates
);
assert.equal(
  sameTickHeadline?.authoredText,
  'shield broken',
  'a same-tick chain should preserve the first of its strongest readable headlines'
);
assert.ok(Object.isFrozen(sameTickHeadline));
assert.ok(Object.isFrozen(sameTickHeadline.fact));

const firstSignatureCandidate = inkcastQueue.createInkcastEditorialCandidate(
  {
    kind: 'power-telegraph',
    tick: 90,
    actor: 'a',
    power: 'smearstep',
    activationNumber: 1,
  },
  'first signature',
  10
);
const laterSignatureCandidate = inkcastQueue.createInkcastEditorialCandidate(
  {
    kind: 'power-telegraph',
    tick: 91,
    actor: 'a',
    power: 'smearstep',
    activationNumber: 2,
  },
  'later signature',
  11
);
assert.ok(firstSignatureCandidate.priority > laterSignatureCandidate.priority);

let pendingEditorialCandidates = inkcastQueue.enqueueInkcastEditorialCandidate(
  [],
  sameTickEditorialCandidates[0]
);
pendingEditorialCandidates = inkcastQueue.enqueueInkcastEditorialCandidate(
  pendingEditorialCandidates,
  laterSignatureCandidate
);
pendingEditorialCandidates = inkcastQueue.enqueueInkcastEditorialCandidate(
  pendingEditorialCandidates,
  firstSignatureCandidate
);
assert.equal(pendingEditorialCandidates.length, 2);
assert.deepEqual(
  pendingEditorialCandidates.map((candidate) => candidate.authoredText),
  ['first signature', 'later signature'],
  'a stronger later headline should replace routine backlog without changing chronology'
);
assert.ok(Object.isFrozen(pendingEditorialCandidates));
const unchangedEditorialQueue = inkcastQueue.enqueueInkcastEditorialCandidate(
  pendingEditorialCandidates,
  inkcastQueue.createInkcastEditorialCandidate(
    { kind: 'burn', tick: 92, targetFighter: 'b' },
    'routine late burn',
    12
  )
);
assert.deepEqual(unchangedEditorialQueue, pendingEditorialCandidates);
pass(
  'Inkcast editorial queue keeps one strong beat per tick and stays bounded'
);

const matchupFighterByPower = {
  inkquake: {
    id: 'fixture-inkquake',
    element: 'ember',
    stats: { chonk: 70, spike: 10, zip: 10, charm: 10 },
  },
  nib_halo: {
    id: 'fixture-nib-halo',
    element: 'tide',
    stats: { chonk: 10, spike: 70, zip: 10, charm: 10 },
  },
  smearstep: {
    id: 'fixture-smearstep',
    element: 'moss',
    stats: { chonk: 10, spike: 10, zip: 70, charm: 10 },
  },
  colorburst: {
    id: 'fixture-colorburst',
    element: 'storm',
    stats: { chonk: 10, spike: 10, zip: 10, charm: 70 },
  },
};
const expectedMatchupMechanics = [
  [
    'inkquake',
    'inkquake',
    {
      label: 'RING vs RING',
      detail: 'RINGS HIT ONCE PER CAST AND KNOCK BACK',
    },
  ],
  [
    'inkquake',
    'nib_halo',
    {
      label: 'RING vs HALO',
      detail: 'ACTIVE HALO CUTS RING DAMAGE 35%',
    },
  ],
  [
    'inkquake',
    'smearstep',
    {
      label: 'RING vs DASH',
      detail: 'DASHES CAN CROSS THE EXPANDING RING',
    },
  ],
  [
    'inkquake',
    'colorburst',
    {
      label: 'RING vs ECHO',
      detail: 'THE RING CAN SHATTER A WAITING ECHO',
    },
  ],
  [
    'nib_halo',
    'nib_halo',
    {
      label: 'HALO vs HALO',
      detail: 'HALOS HAVE A DEAD ZONE • WALL NIBS RECOIL',
    },
  ],
  [
    'nib_halo',
    'smearstep',
    {
      label: 'HALO vs DASH',
      detail: 'DASH DAMAGE IS NOT HALO-REDUCED • NIBS HAVE A DEAD ZONE',
    },
  ],
  [
    'nib_halo',
    'colorburst',
    {
      label: 'HALO vs CONE',
      detail: 'ACTIVE HALO CUTS CONE AND ECHO DAMAGE 35%',
    },
  ],
  [
    'smearstep',
    'smearstep',
    {
      label: 'DASH vs DASH',
      detail: 'EACH CAST PREDICTS AND DASHES TWICE',
    },
  ],
  [
    'smearstep',
    'colorburst',
    {
      label: 'DASH vs ECHO',
      detail: 'DASH CONTACT CAN SHATTER THE ECHO • CONE AIM LOCKS',
    },
  ],
  [
    'colorburst',
    'colorburst',
    {
      label: 'CONE vs CONE',
      detail: 'LOCKED CONES CAN SHATTER WAITING ECHOES',
    },
  ],
];

const configuredHaloDamageReductionPercentage =
  combatConfig.ABILITY_CONFIG_BY_POWER.nib_halo.areaDamageReductionPermille /
  10;
assert.equal(
  matchupBrief.BATTLE_MATCHUP_CONTENT_BY_POWER_PAIR['inkquake|nib_halo'].detail,
  `ACTIVE HALO CUTS RING DAMAGE ${configuredHaloDamageReductionPercentage}%`,
  'Ring/Halo copy must derive its percentage from the reduction combat consumes'
);
assert.equal(
  matchupBrief.BATTLE_MATCHUP_CONTENT_BY_POWER_PAIR['nib_halo|colorburst']
    .detail,
  `ACTIVE HALO CUTS CONE AND ECHO DAMAGE ${configuredHaloDamageReductionPercentage}%`,
  'Halo/Cone copy must derive its percentage from the reduction combat consumes'
);
const configuredSmearstepDashCount =
  combatConfig.ABILITY_CONFIG_BY_POWER.smearstep.dashCount;
const configuredSmearstepDashCountText =
  configuredSmearstepDashCount === 1
    ? 'ONCE'
    : configuredSmearstepDashCount === 2
      ? 'TWICE'
      : `${configuredSmearstepDashCount} TIMES`;
assert.equal(
  matchupBrief.BATTLE_MATCHUP_CONTENT_BY_POWER_PAIR['smearstep|smearstep']
    .detail,
  `EACH CAST PREDICTS AND DASHES ${configuredSmearstepDashCountText}`,
  'Dash/Dash copy must derive its count from the schedule combat consumes'
);

assert.deepEqual(
  matchupBrief.validateBattleMatchupContent(),
  [],
  'the matchup mechanics matrix should be complete, unique, bounded, and prediction-free'
);

const expectedMatchupTitleByKind = {
  exhibition: 'EXHIBITION MATCHUP',
  practice: 'POWER PRACTICE',
  boss: 'CHAMPION CHALLENGE',
  rumble: 'RUMBLE BOUT',
};
for (const [kind, expectedTitle] of Object.entries(
  expectedMatchupTitleByKind
)) {
  const titlePlan = matchupBrief.planBattleMatchupBrief({
    battleKind: kind,
    fighterA: matchupFighterByPower.inkquake,
    fighterB: matchupFighterByPower.colorburst,
  });
  assert.equal(titlePlan.title, expectedTitle);
  assert.equal(
    titlePlan.caption,
    'WATCH FOR • MECHANICS, NOT WIN ODDS',
    `${kind} should retain the mechanics-only caption`
  );
}

for (const [
  firstPower,
  secondPower,
  expectedMechanics,
] of expectedMatchupMechanics) {
  const directMechanics = matchupBrief.planBattleMatchupBrief({
    battleKind: 'exhibition',
    fighterA: matchupFighterByPower[firstPower],
    fighterB: matchupFighterByPower[secondPower],
  }).matchup;
  const reverseMechanics = matchupBrief.planBattleMatchupBrief({
    battleKind: 'exhibition',
    fighterA: matchupFighterByPower[secondPower],
    fighterB: matchupFighterByPower[firstPower],
  }).matchup;
  assert.deepEqual(
    directMechanics,
    expectedMechanics,
    `${firstPower}/${secondPower} should use its truth-reviewed mechanics`
  );
  assert.deepEqual(
    reverseMechanics,
    expectedMechanics,
    `${secondPower}/${firstPower} should preserve symmetric mechanics`
  );
}
assert.equal(
  expectedMatchupMechanics.filter(
    ([firstPower, secondPower]) => firstPower === secondPower
  ).length,
  4,
  'the matrix proof should include all four same-power matchups'
);

let orderedMatchupPairCount = 0;
for (const firstPower of shapePowerContent.SHAPE_POWER_IDS) {
  for (const secondPower of shapePowerContent.SHAPE_POWER_IDS) {
    const fighterA = matchupFighterByPower[firstPower];
    const fighterB = matchupFighterByPower[secondPower];
    const orderedInput = { battleKind: 'rumble', fighterA, fighterB };
    const orderedInputSnapshot = structuredClone(orderedInput);
    const orderedPlan = matchupBrief.planBattleMatchupBrief(orderedInput);
    const reversePlan = matchupBrief.planBattleMatchupBrief({
      battleKind: 'rumble',
      fighterA: fighterB,
      fighterB: fighterA,
    });

    assert.equal(orderedPlan.fighters.a.power, firstPower);
    assert.equal(orderedPlan.fighters.b.power, secondPower);
    assert.equal(
      orderedPlan.fighters.a.signatureName,
      shapePowerContent.getShapePowerSignatureName(fighterA.element, firstPower)
    );
    assert.equal(
      orderedPlan.fighters.b.signatureName,
      shapePowerContent.getShapePowerSignatureName(
        fighterB.element,
        secondPower
      )
    );
    assert.deepEqual(reversePlan.fighters.a, orderedPlan.fighters.b);
    assert.deepEqual(reversePlan.fighters.b, orderedPlan.fighters.a);
    assert.deepEqual(reversePlan.matchup, orderedPlan.matchup);
    assert.deepEqual(
      orderedInput,
      orderedInputSnapshot,
      `${firstPower}/${secondPower} planning must not mutate fighter picks`
    );
    orderedMatchupPairCount += 1;
  }
}
assert.equal(
  orderedMatchupPairCount,
  16,
  'all sixteen ordered power pairs should be planned'
);
const founderMatchupPlan = matchupBrief.planBattleMatchupBrief({
  battleKind: 'exhibition',
  fighterA: mosswhiskDefinition ?? {
    id: 'founding-mosswhisk',
    element: 'moss',
    stats: { chonk: 34, spike: 18, zip: 28, charm: 20 },
  },
  fighterB: matchupFighterByPower.nib_halo,
});
assert.equal(
  founderMatchupPlan.fighters.a.founderEpithet,
  mosswhiskDefinition?.personality.epithet,
  'the VS plan should project canonical founder identity without transport fields'
);
assert.equal(founderMatchupPlan.fighters.b.founderEpithet, null);
pass('pre-fight matchup briefs are exhaustive, symmetric, and mechanics-only');

const dominantDoodleFixtures = [
  {
    stats: { chonk: 55, spike: 15, zip: 15, charm: 15 },
    trait: 'chonk',
    anatomy: 'grounded-belly',
  },
  {
    stats: { chonk: 15, spike: 55, zip: 15, charm: 15 },
    trait: 'spike',
    anatomy: 'quill-crest',
  },
  {
    stats: { chonk: 15, spike: 15, zip: 55, charm: 15 },
    trait: 'zip',
    anatomy: 'streamer-tail',
  },
  {
    stats: { chonk: 15, spike: 15, zip: 15, charm: 55 },
    trait: 'charm',
    anatomy: 'patchwork-crest',
  },
];
for (const fixture of dominantDoodleFixtures) {
  const plan = proceduralDoodlePlan.createProceduralDoodlePlan(
    `fixture-${fixture.trait}`,
    fixture.stats
  );
  assert.equal(
    plan.trait,
    fixture.trait,
    'founder silhouette should use the server combat trait'
  );
  assert.equal(
    plan.anatomy.kind,
    fixture.anatomy,
    'each Shape Power should have a distinct anatomical cue'
  );
}

const neutralDoodle = proceduralDoodlePlan.createProceduralDoodlePlan(
  'failed-player-image'
);
assert.equal(
  neutralDoodle.trait,
  'neutral',
  'an ordinary failed player image should not invent a combat build'
);
assert.equal(neutralDoodle.anatomy.kind, 'neutral');
assert.deepEqual(
  proceduralDoodlePlan.createProceduralDoodlePlan(
    'founding-deterministic',
    dominantDoodleFixtures[0].stats
  ),
  proceduralDoodlePlan.createProceduralDoodlePlan(
    'founding-deterministic',
    dominantDoodleFixtures[0].stats
  ),
  'the same founder identity and stats should always reproduce the same art plan'
);

const firstMixedChonk = proceduralDoodlePlan.createProceduralDoodlePlan(
  'mixed-chonk',
  { chonk: 40, spike: 30, zip: 20, charm: 10 }
);
const secondMixedChonk = proceduralDoodlePlan.createProceduralDoodlePlan(
  'mixed-chonk',
  { chonk: 40, spike: 20, zip: 30, charm: 10 }
);
assert.equal(firstMixedChonk.trait, 'chonk');
assert.equal(secondMixedChonk.trait, 'chonk');
assert.notDeepEqual(
  firstMixedChonk.bodyPoints,
  secondMixedChonk.bodyPoints,
  'all four stats should continuously vary founders inside one dominant archetype'
);

const collectDoodlePoints = (plan) => {
  const points = [
    ...plan.bodyPoints,
    ...plan.legs.map((leg) => leg.center),
    ...plan.eyes.flatMap((eye) => [eye.white.center, eye.pupil.center]),
    ...plan.mouth,
  ];
  const anatomy = plan.anatomy;
  if (anatomy.kind === 'grounded-belly') {
    points.push(...anatomy.bellyBands.flat());
  } else if (anatomy.kind === 'quill-crest') {
    points.push(...anatomy.quills.flat());
  } else if (anatomy.kind === 'streamer-tail') {
    points.push(...anatomy.tailPoints);
  } else if (anatomy.kind === 'patchwork-crest') {
    points.push(
      ...anatomy.crest.map((circle) => circle.center),
      ...anatomy.patches.map((circle) => circle.center)
    );
  }
  return points;
};

assert.equal(
  speciesCore.foundingScribbits.length,
  20,
  'the founding content roster should remain complete'
);
const founderCatalogValidation = founders.validateFoundingScribbitDefinitions();
assert.equal(founderCatalogValidation.valid, true);
assert.deepEqual(
  founderCatalogValidation.errors,
  [],
  'the shared founder story catalog must stay complete, unique, bounded, and fair'
);
assert.equal(founders.FOUNDING_SCRIBBIT_DEFINITIONS.length, 20);
const founderStoryStrings = founders.FOUNDING_SCRIBBIT_DEFINITIONS.flatMap(
  ({ personality }) => [
    personality.epithet,
    personality.challengeLine,
    ...personality.openingLines,
    personality.signatureReaction,
    personality.victoryLine,
    personality.defeatLine,
    personality.rumbleLine,
  ]
);
assert.equal(
  founderStoryStrings.length,
  160,
  'twenty founders should each own eight purposeful story lines'
);
assert.equal(
  new Set(founderStoryStrings).size,
  founderStoryStrings.length,
  'founder story packs should not reuse generic filler lines'
);
for (const definition of founders.FOUNDING_SCRIBBIT_DEFINITIONS) {
  assert.equal(
    founders.getFoundingScribbitDefinition(definition.id),
    definition,
    `${definition.name} should resolve through the one canonical lookup`
  );
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.stats));
  assert.ok(Object.isFrozen(definition.personality));
  assert.ok(Object.isFrozen(definition.personality.openingLines));
  const projectedFounder = speciesCore.findFoundingScribbit(definition.id);
  assert.ok(projectedFounder);
  assert.deepEqual(
    {
      id: projectedFounder.id,
      name: projectedFounder.name,
      artist: projectedFounder.artist,
      element: projectedFounder.element,
      stats: projectedFounder.stats,
      imageUrl: projectedFounder.imageUrl,
      level: projectedFounder.level,
      mood: projectedFounder.mood,
    },
    {
      id: definition.id,
      name: definition.name,
      artist: definition.artist,
      element: definition.element,
      stats: definition.stats,
      imageUrl: definition.imageUrl,
      level: definition.level,
      mood: definition.mood,
    },
    `${definition.name} server projection should preserve the shared catalog`
  );
  assert.deepEqual(
    mockCombatBundle.findFoundingScribbit(definition.id),
    projectedFounder,
    `${definition.name} browser mock should import the production founder projection`
  );
}
assert.equal(founders.getFoundingScribbitDefinition('community-unknown'), null);
pass('founder story packs stay canonical, bounded, and fact-safe');

const founderRivalEpisodeValidation =
  founderRivalEpisodes.validateFounderRivalEpisodeArcs();
assert.equal(founderRivalEpisodeValidation.valid, true);
assert.deepEqual(founderRivalEpisodeValidation.errors, []);
assert.equal(founderRivalEpisodeValidation.arcCount, 20);
assert.equal(founderRivalEpisodeValidation.pageCount, 60);
assert.equal(founderRivalEpisodeValidation.resultLineCount, 120);
assert.ok(Object.isFrozen(founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS));
const founderRivalEpisodePages =
  founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS.flatMap((arc) => {
    assert.ok(Object.isFrozen(arc));
    assert.ok(Object.isFrozen(arc.pages));
    assert.deepEqual(
      arc.pages.map((page) => page.pageNumber),
      [1, 2, 3],
      `${arc.founderId} should keep its three-page story order`
    );
    for (const page of arc.pages) {
      assert.ok(Object.isFrozen(page));
      assert.ok(Object.isFrozen(page.resultLines));
      assert.equal(
        founderRivalEpisodes.getFounderRivalEpisodePage(
          arc.founderId,
          page.pageNumber
        ),
        page,
        `${arc.founderId} page ${page.pageNumber} should resolve canonically`
      );
    }
    return arc.pages;
  });
assert.equal(
  new Set(founderRivalEpisodePages.map((page) => page.title)).size,
  60,
  'every rivalry page should have a unique title'
);
assert.equal(
  new Set(founderRivalEpisodePages.map((page) => page.cue)).size,
  60,
  'every rivalry page should have a unique founder cue'
);
const founderRivalEpisodeResultLines = founderRivalEpisodePages.flatMap(
  (page) => [page.resultLines.playerWon, page.resultLines.founderWon]
);
assert.equal(
  founderRivalEpisodeResultLines.length,
  120,
  'every page should resolve through both truthful battle outcomes'
);
assert.equal(
  new Set(founderRivalEpisodeResultLines).size,
  120,
  'every rivalry outcome should have a unique authored payoff'
);
assert.equal(
  founderRivalEpisodes.getFounderRivalEpisodeResultLine(
    'founding-fernibble',
    3,
    'player'
  ),
  'Fernibble salutes as your final lap reaches the waiting margin.'
);
assert.equal(
  founderRivalEpisodes.getFounderRivalEpisodeResultLine(
    'founding-fernibble',
    3,
    'founder'
  ),
  'Fernibble completes the last leaf lap and signs the margin.'
);
for (const invalidPageNumber of [0, 4, Number.NaN]) {
  assert.equal(
    founderRivalEpisodes.getFounderRivalEpisodePage(
      'founding-mosswhisk',
      invalidPageNumber
    ),
    null
  );
}
assert.equal(
  founderRivalEpisodes.getFounderRivalEpisodePage('community-unknown', 1),
  null
);
const unsafeFounderRivalEpisodeArcs =
  founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS.map((arc, arcIndex) =>
    arcIndex === 0
      ? {
          ...arc,
          pages: arc.pages.map((page, pageIndex) =>
            pageIndex === 0 ? { ...page, title: 'MARGIN SIGNED' } : { ...page }
          ),
        }
      : arc
  );
const unsafeFounderRivalEpisodeValidation =
  founderRivalEpisodes.validateFounderRivalEpisodeArcs(
    unsafeFounderRivalEpisodeArcs
  );
assert.equal(unsafeFounderRivalEpisodeValidation.valid, false);
assert.match(
  unsafeFounderRivalEpisodeValidation.errors.join('\n'),
  /predicts an outcome or promises a reward/,
  'pre-fight episode copy must reject claims that the margin is already signed'
);
const rewardClaimFounderRivalEpisodeArcs =
  founderRivalEpisodes.FOUNDER_RIVAL_EPISODE_ARCS.map((arc, arcIndex) =>
    arcIndex === 0
      ? {
          ...arc,
          pages: arc.pages.map((page, pageIndex) =>
            pageIndex === 0
              ? {
                  ...page,
                  resultLines: {
                    ...page.resultLines,
                    playerWon:
                      'Mosswhisk gives your mark a guaranteed XP prize.',
                  },
                }
              : page
          ),
        }
      : arc
  );
const rewardClaimFounderRivalEpisodeValidation =
  founderRivalEpisodes.validateFounderRivalEpisodeArcs(
    rewardClaimFounderRivalEpisodeArcs
  );
assert.equal(rewardClaimFounderRivalEpisodeValidation.valid, false);
assert.match(
  rewardClaimFounderRivalEpisodeValidation.errors.join('\n'),
  /must not promise an economy reward/,
  'narrative result copy must never invent progression rewards'
);
pass('founder rivalry episodes stay complete, unique, bounded, and fact-safe');

assert.deepEqual(
  championChallenge.validateChampionChallengeContent(),
  [],
  'Champion Contract content should stay complete, unique, bounded, and reward-safe'
);
const firstFounderDefinition = founders.FOUNDING_SCRIBBIT_DEFINITIONS[0];
const firstFounderRuntime = speciesCore.findFoundingScribbit(
  firstFounderDefinition.id
);
assert.ok(firstFounderRuntime);
const founderChampionPlan = championChallenge.planChampionChallenge(
  firstFounderRuntime,
  false
);
assert.ok(Object.isFrozen(founderChampionPlan));
assert.equal(
  founderChampionPlan.epithet,
  firstFounderDefinition.personality.epithet
);
assert.equal(
  founderChampionPlan.challengeLine,
  firstFounderDefinition.personality.challengeLine
);
assert.equal(founderChampionPlan.status, 'open');
assert.match(founderChampionPlan.statusCopy, /WIN.*\+2 XP/);
assert.doesNotMatch(founderChampionPlan.statusCopy, /INK/i);

const communityChampionPlans = [
  { power: 'inkquake', stats: { chonk: 55, spike: 15, zip: 15, charm: 15 } },
  { power: 'nib_halo', stats: { chonk: 15, spike: 55, zip: 15, charm: 15 } },
  { power: 'smearstep', stats: { chonk: 15, spike: 15, zip: 55, charm: 15 } },
  { power: 'colorburst', stats: { chonk: 15, spike: 15, zip: 15, charm: 55 } },
].map(({ power, stats }) => {
  const champion = makeScribbit({
    id: `community-champion-${power}`,
    name: `${power} champion`,
    element: 'storm',
    stats,
  });
  const plan = championChallenge.planChampionChallenge(champion, true);
  assert.equal(combatSelection.selectPrimaryPower(stats), power);
  assert.equal(plan.status, 'complete');
  assert.match(plan.epithet, new RegExp(plan.signatureName));
  assert.ok(plan.challengeLine.length <= 52);
  return plan;
});
assert.equal(
  new Set(communityChampionPlans.map((plan) => plan.challengeLine)).size,
  4,
  'community Champions should have one distinct challenge voice per Shape Power'
);
pass('daily Champion Contract content stays canonical and truthful');

const foundingDoodleFingerprints = new Set();
for (const founder of speciesCore.foundingScribbits) {
  const plan = proceduralDoodlePlan.createProceduralDoodlePlan(
    founder.id,
    founder.stats
  );
  assert.equal(
    plan.trait,
    combatSelection.selectDominantStat(founder.stats),
    `${founder.name} art and combat should agree on Shape Power`
  );
  assert.ok(
    collectDoodlePoints(plan).every((point) => {
      return (
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= 0 &&
        point.x <= proceduralDoodlePlan.PROCEDURAL_DOODLE_SIZE &&
        point.y >= 0 &&
        point.y <= proceduralDoodlePlan.PROCEDURAL_DOODLE_SIZE
      );
    }),
    `${founder.name} procedural geometry should stay inside the texture`
  );
  foundingDoodleFingerprints.add(
    JSON.stringify({
      trait: plan.trait,
      facing: plan.facing,
      body: plan.bodyPoints.slice(0, 8),
      anatomy: plan.anatomy,
    })
  );
}
assert.equal(
  foundingDoodleFingerprints.size,
  speciesCore.foundingScribbits.length,
  'all twenty named founders should retain a distinct deterministic silhouette'
);
pass('stat-shaped founding doodles stay truthful, distinct, and bounded');

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
      normalizedStop < 0
        ? entries.length
        : Math.min(entries.length, normalizedStop + 1);
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
      const rank = entriesByRank(getSortedSet(key), false).findIndex(
        (entry) => {
          return entry.member === member;
        }
      );
      return rank >= 0 ? rank : undefined;
    },
    async zIncrBy(key, member, value) {
      const set = getSortedSet(key);
      const next = Number(set.get(member) ?? 0) + value;
      set.set(member, next);
      return next;
    },
  };

  if (options.transactions !== false) {
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
        async hSetNX(key, field, value) {
          queueCommand(() => {
            const hash = getHash(key);
            if (hash.has(field)) return 0;
            hash.set(field, value);
            return 1;
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
        async zIncrBy(key, member, value) {
          queueCommand(() => {
            const set = getSortedSet(key);
            const next = Number(set.get(member) ?? 0) + value;
            set.set(member, next);
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
            throw new Error('Simulated transaction reply loss after commit.');
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

const scoutNotebookStorage = createMemoryStorage();
const scoutNotebookPlayer = {
  userId: 'scout-notebook-player',
  username: 'margin_reader',
};
const currentScoutPick = makeScribbit({
  id: 'scout-current-pick',
  name: 'Tonight Tab',
  artist: 'current_artist',
  bornDay: 8,
  expiresDay: 999_999,
  element: 'storm',
  stats: { chonk: 20, spike: 24, zip: 42, charm: 14 },
});
const championScoutPick = makeScribbit({
  id: 'scout-champion-pick',
  name: 'Filed Crown',
  artist: 'archived_artist',
  bornDay: 7,
  expiresDay: 999_999,
  element: 'ember',
  stats: { chonk: 24, spike: 40, zip: 20, charm: 16 },
});
const finalistScoutPick = makeScribbit({
  id: 'scout-finalist-pick',
  name: 'Silver Margin',
  artist: 'finalist_artist',
  bornDay: 6,
  expiresDay: 999_999,
  element: 'moss',
  stats: { chonk: 38, spike: 18, zip: 20, charm: 24 },
});
const scoutNotebookOpponent = makeScribbit({
  id: 'scout-featured-opponent',
  name: 'Bracket Other',
  artist: 'other_artist',
  bornDay: 7,
  expiresDay: 999_999,
  element: 'tide',
});
for (const scribbit of [
  currentScoutPick,
  championScoutPick,
  finalistScoutPick,
  scoutNotebookOpponent,
]) {
  await scribbitCore.storeScribbit(
    scoutNotebookStorage,
    `${scribbit.id}-owner`,
    scribbit
  );
}
await clout.claimDailyBack(
  scoutNotebookStorage,
  9,
  scoutNotebookPlayer,
  currentScoutPick.id
);
await clout.claimDailyBack(
  scoutNotebookStorage,
  8,
  scoutNotebookPlayer,
  championScoutPick.id
);
await clout.claimDailyBack(
  scoutNotebookStorage,
  7,
  scoutNotebookPlayer,
  finalistScoutPick.id
);
await scoutNotebookStorage.hSet(clout.getCloutPayoutKey(8), {
  [scoutNotebookPlayer.userId]: '3:scout-day-8',
});
await scoutNotebookStorage.hSet(clout.getCloutPayoutKey(7), {
  [scoutNotebookPlayer.userId]: '1:scout-day-7',
});
await scoutNotebookStorage.zAdd(clout.getCloutKey(), {
  member: scoutNotebookPlayer.userId,
  score: 4,
});
const scoutNotebookReport = {
  id: 'scout-notebook-day-8-report',
  kind: 'rumble',
  day: 8,
  a: championScoutPick,
  b: scoutNotebookOpponent,
  winner: 'a',
  events: [],
};
await battleStore.saveBattleReport(
  scoutNotebookStorage,
  scoutNotebookReport,
  8_001
);
await battleStore.setFeaturedRumbleReport(
  scoutNotebookStorage,
  scoutNotebookReport,
  1
);
await scoutNotebookStorage.set(
  'champion:current',
  JSON.stringify(scoutNotebookOpponent)
);

const scoutNotebookOptions = {
  currentDay: 9,
  userId: scoutNotebookPlayer.userId,
  utcDateKey: '20260711',
};
const scoutNotebookHiddenKey = moderationCore.getUserHiddenScribbitsKey(
  scoutNotebookPlayer.userId
);
const originalScoutNotebookHGetAll =
  scoutNotebookStorage.hGetAll.bind(scoutNotebookStorage);
scoutNotebookStorage.hGetAll = async (key) => {
  if (key === scoutNotebookHiddenKey) {
    throw new Error('Scout Notebook must not read the full hidden-ID hash.');
  }
  return await originalScoutNotebookHGetAll(key);
};
const loadedScoutNotebook = await scoutNotebookCore.loadScoutNotebook(
  scoutNotebookStorage,
  scoutNotebookOptions
);
assert.equal(loadedScoutNotebook.lifetimeClout, 4);
assert.deepEqual(
  loadedScoutNotebook.entries.map((entry) => entry.status),
  ['pending', 'champion', 'finalist', 'missed', 'missed', 'missed', 'missed']
);
assert.equal(loadedScoutNotebook.entries[0].pick.id, currentScoutPick.id);
assert.equal(
  loadedScoutNotebook.entries[1].pick.id,
  championScoutPick.id,
  'historical identity must come from the featured report, never champion:current'
);
assert.equal(loadedScoutNotebook.entries[1].replayAvailable, true);
assert.equal(loadedScoutNotebook.entries[2].pick.id, finalistScoutPick.id);
assert.equal(loadedScoutNotebook.entries[2].replayAvailable, false);
assert.ok(Object.isFrozen(loadedScoutNotebook));
assert.ok(Object.isFrozen(loadedScoutNotebook.entries));
assert.ok(Object.isFrozen(loadedScoutNotebook.entries[1]));
assert.ok(Object.isFrozen(loadedScoutNotebook.entries[1].forecast));
assert.ok(Object.isFrozen(loadedScoutNotebook.entries[1].pick.stats));

const scoutNotebookSummary =
  scoutNotebookPlan.planScoutNotebookSummary(loadedScoutNotebook);
assert.equal(scoutNotebookSummary.pageCount, 7);
assert.equal(scoutNotebookSummary.pickedCount, 3);
assert.equal(scoutNotebookSummary.resolvedPickCount, 2);
assert.equal(scoutNotebookSummary.championPickCount, 1);
assert.equal(scoutNotebookSummary.finalistPickCount, 1);
assert.equal(scoutNotebookSummary.missedDayCount, 4);
assert.equal(scoutNotebookSummary.pages[1].actionKind, 'replay');
assert.match(scoutNotebookSummary.pages[1].payoutLine, /\+3 CLOUT.*\+5 INK/);
assert.equal(scoutNotebookSummary.pages[2].actionKind, 'none');
assert.equal(scoutNotebookSummary.pages[3].pickAvailable, false);
assert.equal(scoutNotebookSummary.pages[0].payoutLine, 'PAYOUT PENDING');
assert.match(scoutNotebookSummary.pages[3].payoutLine, /^NO PAYOUT/);
assert.match(
  scoutNotebookPlan.planScoutNotebookPage(
    {
      ...loadedScoutNotebook.entries[1],
      status: 'no_clout',
      cloutEarned: 0,
      inkAwarded: 0,
    },
    loadedScoutNotebook.currentDay
  ).payoutLine,
  /^\+0 CLOUT · \+0 INK$/
);

assert.throws(
  () =>
    sharedScoutNotebook.createScoutNotebookState({
      ...loadedScoutNotebook,
      entries: loadedScoutNotebook.entries.map((entry, index) =>
        index === 1 ? { ...entry, inkAwarded: 0 } : entry
      ),
    }),
  /champion payout must be 3 Clout and 5 Ink/
);
assert.throws(
  () =>
    sharedScoutNotebook.createScoutNotebookState({
      ...loadedScoutNotebook,
      entries: loadedScoutNotebook.entries.map((entry, index) =>
        index === 2 ? { ...entry, day: 6 } : entry
      ),
    }),
  /descend contiguously/
);
assert.equal(sharedScoutNotebook.isScoutNotebookReplayDay(9, 8), true);
assert.equal(sharedScoutNotebook.isScoutNotebookReplayDay(9, 3), true);
assert.equal(sharedScoutNotebook.isScoutNotebookReplayDay(9, 2), false);
assert.equal(sharedScoutNotebook.isScoutNotebookReplayDay(9, 9), false);
assert.equal(sharedScoutNotebook.isScoutNotebookReplayDay(1, 0), false);

await scoutNotebookStorage.hSet(scoutNotebookHiddenKey, {
  [championScoutPick.id]: '1',
});
const notebookWithHiddenPick = await scoutNotebookCore.loadScoutNotebook(
  scoutNotebookStorage,
  scoutNotebookOptions
);
assert.equal(notebookWithHiddenPick.entries[1].status, 'champion');
assert.equal(notebookWithHiddenPick.entries[1].pick, null);
assert.equal(notebookWithHiddenPick.entries[1].replayAvailable, false);
await scoutNotebookStorage.hDel(scoutNotebookHiddenKey, [championScoutPick.id]);
await scoutNotebookStorage.hSet(scoutNotebookHiddenKey, {
  [scoutNotebookOpponent.id]: '2',
});
const notebookWithHiddenOpponent = await scoutNotebookCore.loadScoutNotebook(
  scoutNotebookStorage,
  scoutNotebookOptions
);
assert.equal(
  notebookWithHiddenOpponent.entries[1].pick.id,
  championScoutPick.id
);
assert.equal(notebookWithHiddenOpponent.entries[1].replayAvailable, false);
await scoutNotebookStorage.hDel(scoutNotebookHiddenKey, [
  scoutNotebookOpponent.id,
]);
await scoutNotebookStorage.hSet(scoutNotebookHiddenKey, {
  [currentScoutPick.id]: '3',
});
const notebookWithHiddenCurrentPick = await scoutNotebookCore.loadScoutNotebook(
  scoutNotebookStorage,
  scoutNotebookOptions
);
assert.equal(notebookWithHiddenCurrentPick.entries[0].status, 'pending');
assert.equal(notebookWithHiddenCurrentPick.entries[0].pick, null);
await scoutNotebookStorage.hDel(scoutNotebookHiddenKey, [currentScoutPick.id]);

assert.equal(typeof mockCombatBundle.createScoutNotebookState, 'function');
assert.equal(typeof mockCombatBundle.projectScoutNotebookPick, 'function');
assert.equal(typeof mockCombatBundle.isScoutNotebookReplayDay, 'function');
assert.equal(
  mockCombatBundle.INK_REWARDS.backedChampion,
  arena.INK_REWARDS.backedChampion
);
pass('Scout Notebook keeps seven days of authoritative scouting truth');

const chronicleStorage = createMemoryStorage();
const chroniclePlayerId = 'chronicle-player';
const chronicleScribbit = makeScribbit({
  id: 'chronicle-owned-scribbit',
  artist: 'chronicle-player',
});
const chronicleFounder = speciesCore.findFoundingScribbit('founding-mosswhisk');
const secondChronicleFounder =
  speciesCore.findFoundingScribbit('founding-fernibble');
assert.ok(chronicleFounder, 'Chronicle test founder should exist');
assert.ok(secondChronicleFounder, 'Second Chronicle test founder should exist');
const chronicleReport = (
  id,
  day,
  winner,
  founder = chronicleFounder,
  kind = 'exhibition'
) => ({
  id,
  kind,
  day,
  a: chronicleScribbit,
  b: founder,
  winner,
  events: [],
});
const firstChronicleReport = chronicleReport(
  'chronicle-mosswhisk-day-3-loss',
  3,
  'b'
);
await scribbitCore.storeScribbit(
  chronicleStorage,
  chroniclePlayerId,
  chronicleScribbit
);
await founderChronicleCore.queueFounderChronicleBattle(
  chronicleStorage,
  chroniclePlayerId,
  firstChronicleReport,
  chronicleScribbit.id,
  1_000
);
await battleStore.saveBattleReport(
  chronicleStorage,
  firstChronicleReport,
  1_000
);
assert.deepEqual(
  await founderChronicleCore.completeFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    firstChronicleReport,
    chronicleScribbit.id
  ),
  [
    {
      founderId: chronicleFounder.id,
      kind: 'rivalry_started',
      day: 3,
      playerWins: 0,
      founderWins: 1,
      outcome: null,
    },
  ],
  'a persisted first direct fight should start one active rivalry'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    firstChronicleReport,
    chronicleScribbit.id
  ),
  [],
  'the same report must not inflate the series score'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    chronicleReport('chronicle-mosswhisk-day-3-win', 3, 'a'),
    chronicleScribbit.id
  ),
  [],
  'unlimited same-day spars must not farm narrative progress'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    chronicleReport(
      'chronicle-fernibble-day-4-win',
      4,
      'a',
      secondChronicleFounder
    ),
    chronicleScribbit.id
  ),
  [],
  'another founder must not replace the active rivalry'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    chronicleReport('chronicle-mosswhisk-day-4-win', 4, 'a'),
    chronicleScribbit.id
  ),
  [
    {
      founderId: chronicleFounder.id,
      kind: 'rivalry_advanced',
      day: 4,
      playerWins: 1,
      founderWins: 1,
      outcome: null,
    },
  ],
  'the active founder should advance once on the next Arena day'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    chronicleReport('chronicle-mosswhisk-day-5-win', 5, 'a'),
    chronicleScribbit.id
  ),
  [
    {
      founderId: chronicleFounder.id,
      kind: 'rivalry_resolved',
      day: 5,
      playerWins: 2,
      founderWins: 1,
      outcome: 'player_prevailed',
    },
  ],
  'first-to-two should resolve into one permanent margin note'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    chronicleReport(
      'chronicle-fernibble-day-5-loss',
      5,
      'b',
      secondChronicleFounder
    ),
    chronicleScribbit.id
  ),
  [],
  'resolving a thread must not allow a second story beat that day'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    chronicleReport(
      'chronicle-fernibble-day-6-loss',
      6,
      'b',
      secondChronicleFounder
    ),
    chronicleScribbit.id
  ),
  [
    {
      founderId: secondChronicleFounder.id,
      kind: 'rivalry_started',
      day: 6,
      playerWins: 0,
      founderWins: 1,
      outcome: null,
    },
  ],
  'the next Arena day may begin one new unresolved founder thread'
);
assert.deepEqual(
  await founderChronicleCore.recordFounderChronicleBattle(
    chronicleStorage,
    chroniclePlayerId,
    chronicleReport(
      'chronicle-rumble-day-7',
      7,
      'a',
      secondChronicleFounder,
      'rumble'
    ),
    chronicleScribbit.id
  ),
  [],
  'passive Rumble pairings must not advance the personal thread'
);
assert.deepEqual(
  await founderChronicleCore.loadFounderChronicle(
    chronicleStorage,
    chroniclePlayerId
  ),
  {
    activeRivalry: {
      founderId: secondChronicleFounder.id,
      startedDay: 6,
      playerWins: 0,
      founderWins: 1,
    },
    resolvedRivalries: [
      {
        founderId: chronicleFounder.id,
        startedDay: 3,
        resolvedDay: 5,
        playerWins: 2,
        founderWins: 1,
        outcome: 'player_prevailed',
      },
    ],
    lastAdvancedDay: 6,
  },
  'Chronicle reads should expose one active thread and bounded resolved notes'
);
const pureChronicleFact = {
  founderId: chronicleFounder.id,
  reportId: 'pure-parity-report',
  day: 8,
  playerWon: true,
};
assert.deepEqual(
  mockCombatBundle.advanceFounderChronicle(
    founderChronicleCore.createEmptyFounderChronicle(),
    pureChronicleFact
  ),
  founderChronicleCore.advanceFounderChronicle(
    founderChronicleCore.createEmptyFounderChronicle(),
    pureChronicleFact
  ),
  'the browser mock must use the production rivalry reducer'
);
const futureChronicleAdvance = founderChronicleCore.advanceFounderChronicle(
  founderChronicleCore.createEmptyFounderChronicle(),
  {
    founderId: chronicleFounder.id,
    reportId: 'chronicle-future-day-5',
    day: 5,
    playerWon: true,
  }
);
assert.deepEqual(
  founderChronicleCore.advanceFounderChronicle(
    futureChronicleAdvance.chronicle,
    {
      founderId: chronicleFounder.id,
      reportId: 'chronicle-delayed-day-4',
      day: 4,
      playerWon: true,
    }
  ),
  { chronicle: futureChronicleAdvance.chronicle, beats: [] },
  'a delayed older receipt must never regress the Chronicle day or resolve before its start'
);

const orderedRepairStorage = createMemoryStorage();
const laterQueuedReport = chronicleReport('chronicle-repair-day-5', 5, 'a');
const earlierQueuedReport = chronicleReport('chronicle-repair-day-4', 4, 'b');
await founderChronicleCore.queueFounderChronicleBattle(
  orderedRepairStorage,
  chroniclePlayerId,
  laterQueuedReport,
  chronicleScribbit.id,
  1_000
);
await founderChronicleCore.queueFounderChronicleBattle(
  orderedRepairStorage,
  chroniclePlayerId,
  earlierQueuedReport,
  chronicleScribbit.id,
  2_000
);
await founderChronicleCore.repairPendingFounderChronicleBattles(
  orderedRepairStorage,
  chroniclePlayerId,
  2_100,
  async (reportId) =>
    [laterQueuedReport, earlierQueuedReport].find(
      (report) => report.id === reportId
    )
);
assert.deepEqual(
  await founderChronicleCore.loadFounderChronicle(
    orderedRepairStorage,
    chroniclePlayerId
  ),
  {
    activeRivalry: {
      founderId: chronicleFounder.id,
      startedDay: 4,
      playerWins: 1,
      founderWins: 1,
    },
    resolvedRivalries: [],
    lastAdvancedDay: 5,
  },
  'pending repair must apply available reports by Arena day rather than hash insertion order'
);

const migratedChronicleStorage = createMemoryStorage();
const migratedChroniclePlayerId = 'migrated-chronicle-player';
await migratedChronicleStorage.set(
  founderChronicleCore.getFounderChronicleKey(migratedChroniclePlayerId),
  JSON.stringify(founderChronicleCore.createEmptyFounderChronicle())
);
await migratedChronicleStorage.hSet(
  founderChronicleCore.getLegacyFounderChronicleKey(migratedChroniclePlayerId),
  {
    [`${chronicleFounder.id}:met`]: '2',
    [`${secondChronicleFounder.id}:respected`]: '4',
    'founding-not-real:met': '3',
  }
);
const migratedChronicle = await founderChronicleCore.loadFounderChronicle(
  migratedChronicleStorage,
  migratedChroniclePlayerId
);
assert.deepEqual(
  migratedChronicle.legacyFounderIds,
  [chronicleFounder.id, secondChronicleFounder.id],
  'v1 founder encounters should merge into an existing v2 Chronicle without inventing series scores'
);
assert.deepEqual(
  await migratedChronicleStorage.hGetAll(
    founderChronicleCore.getLegacyFounderChronicleKey(migratedChroniclePlayerId)
  ),
  {},
  'successful Chronicle migration should delete the retired v1 hash'
);
assert.equal(
  founderChroniclePlan.planFounderChronicle(migratedChronicle, 5)
    .legacyEncounterCount,
  2,
  'the client should acknowledge migrated encounters as archive-only history'
);

const ambiguousChronicleStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
const ambiguousChronicleReport = chronicleReport(
  'chronicle-ambiguous-report',
  9,
  'a'
);
const ambiguousChronicleProjection =
  founderChronicleCore.projectFounderChronicleBattle(
    founderChronicleCore.projectFounderChronicle(
      founderChronicleCore.createEmptyFounderChronicle()
    ),
    ambiguousChronicleReport,
    chronicleScribbit.id
  );
assert.deepEqual(ambiguousChronicleProjection?.beat, {
  founderId: chronicleFounder.id,
  kind: 'rivalry_started',
  day: 9,
  playerWins: 1,
  founderWins: 0,
  outcome: null,
});
await founderChronicleCore.queueFounderChronicleBattle(
  ambiguousChronicleStorage,
  chroniclePlayerId,
  ambiguousChronicleReport,
  chronicleScribbit.id,
  2_000
);
await assert.rejects(
  founderChronicleCore.recordFounderChronicleBattle(
    ambiguousChronicleStorage,
    chroniclePlayerId,
    ambiguousChronicleReport,
    chronicleScribbit.id
  ),
  /Simulated transaction reply loss/,
  'an ambiguous Chronicle commit should surface while retaining its queue receipt'
);
await founderChronicleCore.repairPendingFounderChronicleBattles(
  ambiguousChronicleStorage,
  chroniclePlayerId,
  2_100,
  async (reportId) =>
    reportId === ambiguousChronicleReport.id
      ? ambiguousChronicleReport
      : undefined
);
const repairedAmbiguousStoredChronicle =
  await founderChronicleCore.loadStoredFounderChronicle(
    ambiguousChronicleStorage,
    chroniclePlayerId
  );
assert.deepEqual(
  founderChronicleCore.recoverProjectedFounderChronicleBeat(
    ambiguousChronicleProjection,
    repairedAmbiguousStoredChronicle
  ),
  ambiguousChronicleProjection?.beat,
  'an ambiguous commit repaired during the response should recover its exact authored beat'
);
assert.equal(
  founderChronicleCore.recoverProjectedFounderChronicleBeat(
    ambiguousChronicleProjection,
    founderChronicleCore.createEmptyFounderChronicle()
  ),
  null,
  'a projected beat must not surface before the durable Chronicle proves it committed'
);
assert.equal(
  founderChronicleCore.recoverProjectedFounderChronicleBeat(
    { ...ambiguousChronicleProjection, reportId: 'different-report' },
    repairedAmbiguousStoredChronicle
  ),
  null,
  'a repaired Chronicle must bind the recovered beat to the exact report id'
);
assert.deepEqual(
  founderChronicleCore.projectFounderChronicle(
    repairedAmbiguousStoredChronicle
  ),
  {
    activeRivalry: {
      founderId: chronicleFounder.id,
      startedDay: 9,
      playerWins: 1,
      founderWins: 0,
    },
    resolvedRivalries: [],
    lastAdvancedDay: 9,
  },
  'pending repair should recover a committed beat without applying it twice'
);
assert.deepEqual(
  await ambiguousChronicleStorage.hGetAll(
    founderChronicleCore.getPendingFounderChronicleKey(chroniclePlayerId)
  ),
  {},
  'successful pending repair should clear its exact report receipt'
);
assert.deepEqual(
  founderChronicleCore.parseStoredFounderChronicle('{"schemaVersion":999}'),
  founderChronicleCore.createEmptyFounderChronicle(),
  'unknown Chronicle schemas must fail closed before launch migration exists'
);
pass('Founder Rival Thread is paced, recoverable, bounded, and mock-identical');

const plannedChronicle = founderChroniclePlan.planFounderChronicle(
  await founderChronicleCore.loadFounderChronicle(
    chronicleStorage,
    chroniclePlayerId
  ),
  6
);
assert.equal(
  plannedChronicle.activeRivalry?.name,
  secondChronicleFounder.name,
  'the client plan should focus the one active founder rather than a roster grid'
);
assert.equal(plannedChronicle.activeRivalry?.scoreLine, 'You 0–1 Fernibble');
assert.equal(
  plannedChronicle.activeRivalry?.readyToday,
  false,
  'the margin written today should visibly defer the next story beat'
);
assert.equal(plannedChronicle.activeRivalry?.returnDay, 7);
assert.equal(plannedChronicle.activeRivalry?.nextBoutNumber, 2);
assert.equal(
  plannedChronicle.activeRivalry?.nextEpisodeTitle,
  'THE SCENIC EDGE'
);
assert.equal(
  founderChroniclePlan.formatFounderChronicleEvidenceLine(plannedChronicle),
  '✎ YOU 0–1 FERNIBBLE · RETURN DAY 7',
  'the persistent Arena card should keep the active rival score and return day visible'
);
assert.equal(
  plannedChronicle.resolvedNotes[0]?.name,
  chronicleFounder.name,
  'the latest resolved best-of-three should remain as a compact margin note'
);

const emptyChronicleProjection = {
  activeRivalry: null,
  resolvedRivalries: [],
  lastAdvancedDay: null,
};
const firstBoutProjection = {
  activeRivalry: {
    founderId: chronicleFounder.id,
    startedDay: 3,
    playerWins: 0,
    founderWins: 1,
  },
  resolvedRivalries: [],
  lastAdvancedDay: 3,
};
const secondBoutProjection = {
  activeRivalry: {
    founderId: chronicleFounder.id,
    startedDay: 3,
    playerWins: 1,
    founderWins: 1,
  },
  resolvedRivalries: [],
  lastAdvancedDay: 4,
};
const resolvedChronicleProjection = {
  activeRivalry: null,
  resolvedRivalries: [
    {
      founderId: chronicleFounder.id,
      startedDay: 3,
      resolvedDay: 5,
      playerWins: 2,
      founderWins: 1,
      outcome: 'player_prevailed',
    },
  ],
  lastAdvancedDay: 5,
};
assert.equal(
  founderChroniclePlan.formatFounderChronicleEvidenceLine(
    founderChroniclePlan.planFounderChronicle(emptyChronicleProjection, 3)
  ),
  null,
  'an empty Chronicle should not add a fake margin affordance'
);
assert.equal(
  founderChroniclePlan.formatFounderChronicleEvidenceLine(
    founderChroniclePlan.planFounderChronicle(resolvedChronicleProjection, 6)
  ),
  '✎ MARGIN',
  'resolved notes should retain the compact archive affordance'
);
assert.equal(
  founderChroniclePlan.findFounderChronicleBeats(
    emptyChronicleProjection,
    firstBoutProjection
  )[0]?.kind,
  'rivalry_started'
);
assert.equal(
  founderChroniclePlan.findFounderChronicleBeats(
    firstBoutProjection,
    secondBoutProjection
  )[0]?.kind,
  'rivalry_advanced'
);
const resolvedBeat = founderChroniclePlan.findFounderChronicleBeats(
  secondBoutProjection,
  resolvedChronicleProjection
)[0];
assert.ok(
  resolvedBeat,
  'resolving a thread should create one presentation beat'
);
assert.equal(resolvedBeat?.kind, 'rivalry_resolved');
assert.equal(
  founderChroniclePlan.getFounderChronicleBeatCopy(resolvedBeat).headline,
  'Margin signed · THE LAST ROOTBEAT'
);
assert.match(
  founderChroniclePlan.getFounderChronicleBeatCopy(resolvedBeat).detail,
  /Final.*You 2–1 Mosswhisk/,
  'result copy should expose the authoritative final series score'
);
const openingStakes = founderChroniclePlan.planFounderRivalryStakes(
  emptyChronicleProjection,
  3,
  chronicleFounder.id
);
assert.deepEqual(openingStakes, {
  founderId: chronicleFounder.id,
  founderName: chronicleFounder.name,
  kind: 'opening',
  boutNumber: 1,
  playerWins: 0,
  founderWins: 0,
  battleLabel: 'RIVAL BOUT 1/3',
  headline: 'NEW RIVAL THREAD',
  detail: 'YOU 0–0 MOSSWHISK • FIRST TO 2',
  pageLabel: 'PAGE 1/3',
  episodeTitle: 'ROOTBEAT INTRO',
  episodeCue: 'Mosswhisk taps a first rhythm along the fern-lined margin.',
});
const founderMatchPointStakes = founderChroniclePlan.planFounderRivalryStakes(
  firstBoutProjection,
  4,
  chronicleFounder.id
);
assert.equal(founderMatchPointStakes?.kind, 'founder_match_point');
assert.equal(founderMatchPointStakes?.headline, 'MOSSWHISK MATCH POINT');
assert.match(founderMatchPointStakes?.detail ?? '', /WIN TO FORCE A DECIDER/);
assert.equal(founderMatchPointStakes?.pageLabel, 'PAGE 2/3');
assert.equal(founderMatchPointStakes?.episodeTitle, 'ROOTS REMEMBER');
const playerMatchPointStakes = founderChroniclePlan.planFounderRivalryStakes(
  {
    ...firstBoutProjection,
    activeRivalry: {
      ...firstBoutProjection.activeRivalry,
      playerWins: 1,
      founderWins: 0,
    },
  },
  4,
  chronicleFounder.id
);
assert.equal(playerMatchPointStakes?.kind, 'player_match_point');
assert.equal(playerMatchPointStakes?.headline, 'YOUR MATCH POINT');
assert.match(playerMatchPointStakes?.detail ?? '', /WIN TO SIGN THE MARGIN/);
assert.equal(playerMatchPointStakes?.pageLabel, 'PAGE 2/3');
assert.equal(playerMatchPointStakes?.episodeTitle, 'ROOTS REMEMBER');
const decidingStakes = founderChroniclePlan.planFounderRivalryStakes(
  secondBoutProjection,
  5,
  chronicleFounder.id
);
assert.equal(decidingStakes?.kind, 'decider');
assert.equal(decidingStakes?.battleLabel, 'RIVAL DECIDER');
assert.match(decidingStakes?.detail ?? '', /WINNER SIGNS THE MARGIN/);
assert.equal(decidingStakes?.pageLabel, 'PAGE 3/3');
assert.equal(decidingStakes?.episodeTitle, 'THE LAST ROOTBEAT');
const openingPlayerReceipt =
  founderChroniclePlan.planFounderRivalEpisodeReceipt(
    openingStakes,
    {
      founderId: chronicleFounder.id,
      kind: 'rivalry_started',
      day: 3,
      playerWins: 1,
      founderWins: 0,
      outcome: null,
    },
    chronicleReport('opening-player-receipt', 3, 'a'),
    'a',
    'a'
  );
assert.deepEqual(openingPlayerReceipt, {
  founderId: chronicleFounder.id,
  pageNumber: 1,
  headline: 'THREAD CONTINUES · YOU 1–0 MOSSWHISK',
  detail: 'PAGE 1/3 · ROOTBEAT INTRO',
  resultLine: 'Mosswhisk nods as your mark takes the opening beat.',
  latestWinner: 'player',
  threadResolved: false,
});
const openingFounderReceipt =
  founderChroniclePlan.planFounderRivalEpisodeReceipt(
    openingStakes,
    {
      founderId: chronicleFounder.id,
      kind: 'rivalry_started',
      day: 3,
      playerWins: 0,
      founderWins: 1,
      outcome: null,
    },
    chronicleReport('opening-founder-receipt', 3, 'b'),
    'a',
    'b'
  );
assert.equal(openingFounderReceipt?.latestWinner, 'founder');
assert.equal(
  openingFounderReceipt?.resultLine,
  'Mosswhisk keeps the opening beat humming beneath the roots.'
);
const tiedSecondPageReceipt =
  founderChroniclePlan.planFounderRivalEpisodeReceipt(
    founderMatchPointStakes,
    {
      founderId: chronicleFounder.id,
      kind: 'rivalry_advanced',
      day: 4,
      playerWins: 1,
      founderWins: 1,
      outcome: null,
    },
    chronicleReport('second-page-receipt', 4, 'a'),
    'a',
    'a'
  );
assert.equal(
  tiedSecondPageReceipt?.headline,
  'THREAD CONTINUES · YOU 1–1 MOSSWHISK'
);
assert.equal(tiedSecondPageReceipt?.detail, 'PAGE 2/3 · ROOTS REMEMBER');
assert.equal(
  tiedSecondPageReceipt?.resultLine,
  "Mosswhisk hears your offbeat turn the grove's old rhythm."
);
const decidingPlayerReceipt =
  founderChroniclePlan.planFounderRivalEpisodeReceipt(
    decidingStakes,
    resolvedBeat,
    chronicleReport('deciding-page-receipt', 5, 'a'),
    'a',
    'a'
  );
assert.equal(
  decidingPlayerReceipt?.headline,
  'MARGIN SIGNED · YOU 2–1 MOSSWHISK'
);
assert.equal(decidingPlayerReceipt?.detail, 'PAGE 3/3 · THE LAST ROOTBEAT');
assert.equal(decidingPlayerReceipt?.threadResolved, true);
assert.equal(
  founderChroniclePlan.planFounderRivalEpisodeReceipt(
    decidingStakes,
    { ...resolvedBeat, playerWins: 1 },
    chronicleReport('mismatched-receipt', 5, 'a'),
    'a',
    'a'
  ),
  null,
  'a result receipt must fail closed when the server score does not match its page'
);
assert.equal(
  founderChroniclePlan.planFounderRivalEpisodeReceipt(
    decidingStakes,
    resolvedBeat,
    {
      a: chronicleScribbit,
      b: { ...chronicleScribbit, id: 'community-rival' },
    },
    'a',
    'a'
  ),
  null,
  'a result receipt must fail closed when the named founder is absent'
);
pass(
  'Founder Rival episode receipts bind page copy to the proven latest winner'
);
assert.equal(
  founderChroniclePlan.planFounderRivalryStakes(
    secondBoutProjection,
    4,
    chronicleFounder.id
  ),
  null,
  'a second same-day fight must not advertise false rivalry stakes'
);
assert.equal(
  founderChroniclePlan.planFounderRivalryStakes(
    firstBoutProjection,
    4,
    secondChronicleFounder.id
  ),
  null,
  'an unrelated founder must remain a plain exhibition'
);
assert.equal(
  founderChroniclePlan.planFounderRivalryStakes(
    resolvedChronicleProjection,
    6,
    chronicleFounder.id
  ),
  null,
  'a signed founder margin must not reopen as a new thread'
);
pass(
  'Founder Rival Thread planning keeps three-page episodes, stakes, score, and margin notes'
);

const moderationStorage = createMemoryStorage();
const firstSafetyReport = await moderationCore.reportAndHideScribbit(
  moderationStorage,
  'reporter-one',
  'unsafe-scribbit',
  1000
);
assert.equal(
  firstSafetyReport.created,
  true,
  'first reporter should create a report'
);
assert.equal(
  firstSafetyReport.reportCount,
  1,
  'first report should count once'
);
const duplicateSafetyReport = await moderationCore.reportAndHideScribbit(
  moderationStorage,
  'reporter-one',
  'unsafe-scribbit',
  2000
);
assert.equal(
  duplicateSafetyReport.created,
  false,
  'duplicate reporter must be idempotent'
);
assert.equal(
  duplicateSafetyReport.reportCount,
  1,
  'duplicate report must not inflate count'
);
assert.equal(
  (
    await moderationCore.getHiddenScribbitIds(moderationStorage, 'reporter-one')
  ).has('unsafe-scribbit'),
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
const privacyLegacy = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({ id: 'privacy-legacy', artist: 'privacy-player' })
);
await scribbitCore.storeScribbit(
  privacyStorage,
  'privacy-user-id',
  privacyLegacy
);
await scribbitCore.addRumbleEntrant(privacyStorage, 2, privacyScribbit.id);
await privacyStorage.hSet(
  scribbitCore.getRumbleStandingReceiptKey(privacyScribbit.id),
  { 2: '1:0:2' }
);
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
await scribbitCore.claimUserDailySparWinReward(
  privacyStorage,
  'privacy-user-id',
  '20260708',
  1000
);
const privacyFounderReport = {
  id: 'privacy-founder-battle',
  kind: 'exhibition',
  day: 2,
  a: privacyScribbit,
  b: chronicleFounder,
  winner: 'a',
};
await founderChronicleCore.queueFounderChronicleBattle(
  privacyStorage,
  'privacy-user-id',
  privacyFounderReport,
  privacyScribbit.id,
  1_000
);
await founderChronicleCore.recordFounderChronicleBattle(
  privacyStorage,
  'privacy-user-id',
  privacyFounderReport,
  privacyScribbit.id
);
await privacyStorage.hSet(
  founderChronicleCore.getLegacyFounderChronicleKey('privacy-user-id'),
  { [`${chronicleFounder.id}:met`]: '2' }
);
const privacyDeletion = await privacyCore.deletePlayerData(
  privacyStorage,
  'privacy-user-id',
  2
);
assert.equal(
  privacyDeletion.removedScribbits,
  2,
  'privacy deletion should count owned Scribbits'
);
assert.equal(
  await scribbitCore.loadScribbit(privacyStorage, privacyScribbit.id),
  undefined,
  'privacy deletion should remove owned Scribbit records'
);
assert.equal(
  await scribbitCore.loadScribbit(privacyStorage, privacyLegacy.id),
  undefined,
  'privacy deletion should remove permanent Legacy Card records'
);
assert.equal(
  await privacyStorage.hGet(
    scribbitCore.getRumbleStandingReceiptKey(privacyScribbit.id),
    '2'
  ),
  undefined,
  'privacy deletion should remove per-Scribbit Rumble receipts'
);
assert.equal(
  await privacyStorage.zScore(
    scribbitCore.getUserLegacyCardsKey('privacy-user-id'),
    privacyLegacy.id
  ),
  undefined,
  'privacy deletion should remove the personal Legacy index'
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
assert.deepEqual(
  await privacyStorage.hGetAll(
    scribbitCore.getUserDailySparWinRewardsKey('privacy-user-id')
  ),
  {},
  'privacy deletion should remove player-level daily spar receipts'
);
assert.equal(
  (await moderationCore.getHiddenScribbitIds(privacyStorage, 'privacy-user-id'))
    .size,
  0,
  'privacy deletion should remove report-hide data'
);
assert.equal(
  await privacyStorage.get(
    founderChronicleCore.getFounderChronicleKey('privacy-user-id')
  ),
  undefined,
  'privacy deletion should remove permanent founder relationship progress'
);
assert.deepEqual(
  await privacyStorage.hGetAll(
    founderChronicleCore.getPendingFounderChronicleKey('privacy-user-id')
  ),
  {},
  'privacy deletion should remove pending founder projection receipts'
);
assert.deepEqual(
  await privacyStorage.hGetAll(
    founderChronicleCore.getLegacyFounderChronicleKey('privacy-user-id')
  ),
  {},
  'privacy deletion should remove the retired founder checklist hash'
);
pass('player data deletion removes identity and owned content');

const forecastFlavorValidation = forecastFlavor.validateForecastBlurbs();
assert.equal(forecastFlavorValidation.valid, true);
assert.deepEqual(forecastFlavorValidation.errors, []);
assert.equal(forecastFlavorValidation.blurbCount, 32);
assert.ok(Object.isFrozen(forecastFlavor.FORECAST_BLURBS));
const firstForecastCalendar = Array.from({ length: 32 }, (_, dayIndex) =>
  forecastCore.generateForecastForDay(dayIndex + 1)
);
assert.equal(
  new Set(firstForecastCalendar.map((entry) => entry.blurb)).size,
  32,
  'the public daily forecast should not repeat before its 32-day cycle ends'
);
assert.equal(
  forecastCore.generateForecastForDay(33).blurb,
  firstForecastCalendar[0].blurb,
  'stateless forecast flavor should repeat only after all authored blurbs'
);
for (const entry of firstForecastCalendar) {
  assert.equal(
    entry.blurb,
    forecastFlavor.selectDailyForecastBlurb(entry.day),
    'forecast copy selection must stay independent from combat-element randomness'
  );
  assert.notEqual(entry.boostedElement, entry.nerfedElement);
}
const unsafeForecastFlavorValidation = forecastFlavor.validateForecastBlurbs([
  ...forecastFlavor.FORECAST_BLURBS.slice(0, 31),
  'Guaranteed winner gets an XP prize',
]);
assert.equal(unsafeForecastFlavorValidation.valid, false);
assert.match(
  unsafeForecastFlavorValidation.errors.join('\n'),
  /predicts an outcome or promises a reward/,
  'public forecast flavor must never imply odds or progression rewards'
);
pass('daily forecast flavor stays unique, bounded, and combat-independent');

const forecast = forecastCore.generateForecastForDay(7);
assert.deepEqual(
  mockCombatBundle.generateForecastForDay(7),
  forecast,
  'the browser mock must import production forecast mechanics and authored copy'
);
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

const directProductionReport = battle.simulate(
  alpha,
  beta,
  73,
  forecast,
  'exhibition'
);
const bundledProductionReport = mockCombatBundle.simulate(
  alpha,
  beta,
  73,
  forecast,
  'exhibition'
);
assert.deepEqual(
  bundledProductionReport,
  directProductionReport,
  'browser mock bundle should expose the exact production battle facade'
);
assert.equal(
  bundledProductionReport.winner,
  bundledProductionReport.simulation.result.winner,
  'mock-visible winner must come from the authoritative transcript'
);

const capturedMockBattleCalls = [];
const mockBattleFactory = createMockBattleReportFactory({
  simulate: (...argumentsForSimulation) => {
    capturedMockBattleCalls.push(argumentsForSimulation);
    return { seed: argumentsForSimulation[2] };
  },
  getForecast: () => forecast,
});
mockBattleFactory('exhibition', alpha, beta);
const previousForecast = forecastCore.generateForecastForDay(forecast.day - 1);
mockBattleFactory('rumble', alpha, beta, {
  seed: 99,
  forecast: previousForecast,
});
mockBattleFactory('boss', alpha, beta);
assert.deepEqual(
  capturedMockBattleCalls.map((call) => call[2]),
  [1, 99, 2],
  'explicit debug fixture seeds must not perturb interactive mock seeds'
);
assert.equal(
  capturedMockBattleCalls[1]?.[3],
  previousForecast,
  'previous-Rumble fixtures should simulate with the previous day forecast'
);

const powerStatsForMockProof = Object.freeze({
  inkquake: { chonk: 55, spike: 15, zip: 15, charm: 15 },
  nib_halo: { chonk: 15, spike: 55, zip: 15, charm: 15 },
  smearstep: { chonk: 15, spike: 15, zip: 55, charm: 15 },
  colorburst: { chonk: 15, spike: 15, zip: 15, charm: 55 },
});
const debugFixtureIdentityByPower = Object.freeze({
  inkquake: ['debug-inkquake-heavy-page', 'Heavy Page'],
  nib_halo: ['debug-nib-halo-needle-star', 'Needle Star'],
  smearstep: ['debug-smearstep-quick-swipe', 'Quick Swipe'],
  colorburst: ['debug-colorburst-prism-pop', 'Prism Pop'],
});
const debugOpponentPower = Object.freeze({
  inkquake: 'nib_halo',
  nib_halo: 'smearstep',
  smearstep: 'colorburst',
  colorburst: 'inkquake',
});
const debugSeedByPower = Object.freeze({
  inkquake: 584,
  nib_halo: 2,
  smearstep: 282,
  colorburst: 74,
});
const debugFixtureForecast = Object.freeze({
  day: 9,
  boostedElement: 'storm',
  nerfedElement: 'moss',
  blurb: 'Storm winds whip loose paper across the arena',
});
const protectedRecoilFighter = makeScribbit({
  id: 'first-draw-recoil-regression',
  name: 'Dare Star',
  artist: 'tester',
  element: 'ember',
  stats: { chonk: 26, spike: 43, zip: 21, charm: 10 },
});
const protectedRecoilOpponent = makeScribbit({
  id: 'founding-cloudpip',
  name: 'Cloudpip',
  artist: 'paperclip_noa',
  element: 'storm',
  stats: { chonk: 18, spike: 18, zip: 46, charm: 18 },
  isFounding: true,
});
const protectedRecoilReport = mockCombatBundle.simulate(
  protectedRecoilFighter,
  protectedRecoilOpponent,
  0,
  debugFixtureForecast,
  'exhibition'
);
assert.ok(
  protectedRecoilReport.simulation.timeline.some(
    (event) => event.kind === 'nib_wall_ejection' && event.selfDamage === 0
  ),
  'fixture should exercise wall ejection while early knockout protection clamps recoil to zero'
);
assert.equal(
  continuousReplay.getUsableBattleTranscript(protectedRecoilReport),
  protectedRecoilReport.simulation,
  'zero-damage wall ejection must not discard an otherwise authoritative live replay'
);
const debugFixtureFighterByPower = Object.fromEntries(
  Object.entries(powerStatsForMockProof).map(([power, stats]) => {
    const [id, name] = debugFixtureIdentityByPower[power];
    return [
      power,
      makeScribbit({
        id,
        name,
        artist: 'debug_fixture',
        element: 'tide',
        stats,
        imageUrl: `/api/drawing/${id}`,
        bornDay: 8,
        expiresDay: 11,
        level: 3,
        xp: 7,
        mood: 'pumped',
      }),
    ];
  })
);
const debugFixtureReportByPower = {};
for (const power of Object.keys(powerStatsForMockProof)) {
  const fighter = debugFixtureFighterByPower[power];
  const opponent = debugFixtureFighterByPower[debugOpponentPower[power]];
  const report = mockCombatBundle.simulate(
    fighter,
    opponent,
    debugSeedByPower[power],
    debugFixtureForecast,
    'exhibition'
  );
  debugFixtureReportByPower[power] = report;
  assert.equal(
    report.winner,
    'a',
    `${power} showcase should end with its featured drawing winning naturally`
  );
  assert.equal(
    report.simulation.result.fighters[0].primaryPower,
    power,
    `${power} debug art should resolve to its production Shape Power`
  );
  assert.ok(
    report.simulation.result.completedTick < 300,
    `${power} showcase should finish before 15 seconds at normal speed`
  );
  const powerDamageEvents = report.simulation.timeline.filter(
    (event) =>
      event.kind === 'damage' &&
      event.sourceFighter === 'a' &&
      (event.source === power ||
        (power === 'colorburst' && event.source === 'colorburst_echo'))
  );
  assert.ok(
    powerDamageEvents[0]?.tick < 60,
    `${power} showcase should land its first signature hit within three seconds`
  );
  assert.ok(
    report.simulation.timeline.some(
      (event) =>
        event.kind === 'ability_activated' &&
        event.actor === 'a' &&
        event.power === power
    ),
    `${power} should activate in the production-backed browser fixture`
  );
}

const nibHaloTimeline = debugFixtureReportByPower.nib_halo.simulation.timeline;
assert.ok(
  nibHaloTimeline.some(
    (event) =>
      event.kind === 'nib_wall_ejection' &&
      event.actor === 'a' &&
      event.tick < 70
  ),
  'Nib Halo showcase should expose its wall-recoil drawback early'
);
assert.ok(
  nibHaloTimeline.filter(
    (event) =>
      event.kind === 'damage' &&
      event.sourceFighter === 'a' &&
      event.source === 'nib_halo' &&
      event.tick < 70
  ).length >= 2,
  'Nib Halo showcase should land multiple orbiting-quill hits early'
);

const smearstepTimeline =
  debugFixtureReportByPower.smearstep.simulation.timeline;
const firstSmearstepActivation = smearstepTimeline.find(
  (event) =>
    event.kind === 'ability_activated' &&
    event.actor === 'a' &&
    event.power === 'smearstep'
);
const firstSmearstepFinish = smearstepTimeline.find(
  (event) =>
    event.kind === 'ability_finished' &&
    event.actor === 'a' &&
    event.power === 'smearstep' &&
    event.activationNumber === firstSmearstepActivation?.activationNumber
);
assert.ok(firstSmearstepActivation && firstSmearstepFinish);
const smearstepConfig = combatConfig.ABILITY_CONFIG_BY_POWER.smearstep;
assert.equal(
  smearstepConfig.dashCount,
  2,
  'Smearstep should keep its reviewed two-dash balance contract'
);
assert.equal(
  firstSmearstepActivation.activeUntilTick,
  firstSmearstepActivation.tick + smearstepConfig.activeTicks,
  'Smearstep activation should publish its exact configured finish tick'
);
assert.equal(
  firstSmearstepFinish.tick,
  firstSmearstepActivation.activeUntilTick,
  'Smearstep should finish before movement at the configured active deadline'
);
const firstSmearstepDamageEvents = smearstepTimeline.filter(
  (event) =>
    event.kind === 'damage' &&
    event.sourceFighter === 'a' &&
    event.source === 'smearstep' &&
    event.tick >= firstSmearstepActivation.tick &&
    event.tick < firstSmearstepFinish.tick
);
const smearstepDashStrideTicks =
  smearstepConfig.dashTicks + smearstepConfig.pauseTicks;
const hitSmearstepDashIndexes = new Set(
  firstSmearstepDamageEvents.map((event) => {
    const activeAge = event.tick - firstSmearstepActivation.tick;
    const dashIndex = Math.floor(activeAge / smearstepDashStrideTicks);
    const dashAge = activeAge - dashIndex * smearstepDashStrideTicks;
    assert.ok(
      dashIndex < smearstepConfig.dashCount &&
        dashAge < smearstepConfig.dashTicks,
      'Smearstep damage must land inside a configured dash window'
    );
    return dashIndex;
  })
);
assert.deepEqual(
  [...hitSmearstepDashIndexes],
  Array.from({ length: smearstepConfig.dashCount }, (_, index) => index),
  'Smearstep showcase should prove every configured dash window in order'
);

const colorburstTimeline =
  debugFixtureReportByPower.colorburst.simulation.timeline;
assert.ok(
  colorburstTimeline.some(
    (event) =>
      event.kind === 'damage' &&
      event.sourceFighter === 'a' &&
      event.source === 'colorburst' &&
      event.tick < 60
  ) &&
    colorburstTimeline.some(
      (event) =>
        event.kind === 'damage' &&
        event.sourceFighter === 'a' &&
        event.source === 'colorburst_echo' &&
        event.tick < 60
    ),
  'Colorburst showcase should prove its cone and echo before three seconds'
);

let validatedBarrierSourceContract = false;
for (const [power, fighter] of Object.entries(debugFixtureFighterByPower)) {
  const opponent = debugFixtureFighterByPower[debugOpponentPower[power]];
  for (const element of ['ember', 'tide', 'moss', 'storm']) {
    const elementalReport = mockCombatBundle.simulate(
      { ...fighter, element },
      opponent,
      debugSeedByPower[power],
      debugFixtureForecast,
      'exhibition'
    );
    assert.equal(
      continuousReplay.getUsableBattleTranscript(elementalReport),
      elementalReport.simulation,
      `${element} ${power} debug transcript should remain replayable even when battle end interrupts a scheduled effect`
    );
    for (const barrierHit of elementalReport.simulation.timeline.filter(
      (event) => event.kind === 'barrier_hit'
    )) {
      assert.ok(
        barrierHit.sourceFighter &&
          barrierHit.source &&
          Number.isSafeInteger(barrierHit.sourceActivationNumber),
        'new barrier hits should identify their exact authoritative damage source'
      );
      if (!validatedBarrierSourceContract) {
        const partialMetadataTranscript = structuredClone(
          elementalReport.simulation
        );
        const partialBarrierHit = partialMetadataTranscript.timeline.find(
          (event) => event.kind === 'barrier_hit'
        );
        assert.ok(partialBarrierHit);
        delete partialBarrierHit.source;
        assert.equal(
          continuousReplay.getUsableBattleTranscript(partialMetadataTranscript),
          undefined,
          'partial barrier source metadata must fail transcript validation'
        );
        const selfSourcedBarrierTranscript = structuredClone(
          elementalReport.simulation
        );
        const selfSourcedBarrierHit =
          selfSourcedBarrierTranscript.timeline.find(
            (event) => event.kind === 'barrier_hit'
          );
        assert.ok(selfSourcedBarrierHit);
        selfSourcedBarrierHit.sourceFighter = selfSourcedBarrierHit.actor;
        assert.equal(
          continuousReplay.getUsableBattleTranscript(
            selfSourcedBarrierTranscript
          ),
          undefined,
          'a fighter cannot authoritatively hit its own paper barrier'
        );
        validatedBarrierSourceContract = true;
      }
    }
  }
}
assert.equal(
  validatedBarrierSourceContract,
  true,
  'elemental fixtures should exercise the barrier source contract'
);
pass('production-backed debug battles prove all four signature contracts');

const mockDrawingTestOutputDirectory = join(
  tmpdir(),
  'scribbits-mock-drawing-tests'
);
rmSync(mockDrawingTestOutputDirectory, { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    'scripts/make-test-drawing.mjs',
    '--out-dir',
    mockDrawingTestOutputDirectory,
  ],
  { cwd: repoRoot, stdio: 'pipe' }
);
const drawingFilenameByPower = Object.freeze({
  inkquake: 'drawing-chonk-inkquake.png',
  nib_halo: 'drawing-spike-nib-halo.png',
  smearstep: 'drawing-zip-smearstep.png',
  colorburst: 'drawing-charm-colorburst.png',
});
for (const [power, filename] of Object.entries(drawingFilenameByPower)) {
  const image = PNG.sync.read(
    readFileSync(join(mockDrawingTestOutputDirectory, filename))
  );
  let minimumX = image.width;
  let minimumY = image.height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] === 0) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }
  assert.ok(maximumX >= minimumX && maximumY >= minimumY);
  const visibleHeight = maximumY - minimumY + 1;
  const normalizedVisibleHeight =
    (visibleHeight * 150) / Math.max(image.width, image.height);
  assert.ok(
    normalizedVisibleHeight >= 80,
    `${power} fixture should remain at least 80px tall after arena normalization`
  );
  assert.ok(
    minimumX > 0 && minimumY > 0,
    `${power} fixture should preserve transparent breathing room around the ink`
  );
}
rmSync(mockDrawingTestOutputDirectory, { recursive: true, force: true });
pass('four mock drawings preserve readable transparent silhouettes');

/* Keep the lightweight generic selection loop as a guard against future stat
 * mapping changes that do not touch the curated fixture IDs. */
for (const [powerIndex, [power, stats]] of Object.entries(
  powerStatsForMockProof
).entries()) {
  const fighter = makeScribbit({
    id: `mock-proof-${power}`,
    name: `Mock ${power}`,
    element: 'tide',
    stats,
  });
  const report = mockCombatBundle.simulate(
    fighter,
    beta,
    powerIndex + 1,
    forecast,
    'exhibition'
  );
  assert.equal(
    report.simulation.result.fighters[0].primaryPower,
    power,
    `${power} debug art should resolve to its production Shape Power`
  );
  assert.ok(
    report.simulation.timeline.some(
      (event) =>
        event.kind === 'ability_activated' &&
        event.actor === 'a' &&
        event.power === power
    ),
    `${power} should activate in the production-backed browser fixture`
  );
}
rmSync(mockCombatTestOutputDirectory, { recursive: true, force: true });
pass('browser mock bundles production combat with isolated fixture seeds');

const pngFixture = new PNG({ width: 512, height: 512 });
pngFixture.data.fill(0);
const validPngBytes = PNG.sync.write(pngFixture);
const validPngDataUrl = `data:image/png;base64,${validPngBytes.toString('base64')}`;
const validDecodedPng = scribbitCore.decodePngDataUrl(validPngDataUrl);
assert.ok(validDecodedPng, 'a valid 512x512 PNG should pass preflight');
assert.equal(
  validDecodedPng.width,
  512,
  'decoded PNG width should be preserved'
);
assert.equal(
  validDecodedPng.height,
  512,
  'decoded PNG height should be preserved'
);

const wrongSignaturePngBytes = Buffer.from(validPngBytes);
wrongSignaturePngBytes[0] = 0;
assert.equal(
  scribbitCore.decodePngDataUrl(
    `data:image/png;base64,${wrongSignaturePngBytes.toString('base64')}`
  ),
  undefined,
  'a wrong PNG signature should fail before image decode'
);

const wrongDimensionsPngBytes = Buffer.from(validPngBytes);
wrongDimensionsPngBytes.writeUInt32BE(511, 16);
assert.equal(
  scribbitCore.decodePngDataUrl(
    `data:image/png;base64,${wrongDimensionsPngBytes.toString('base64')}`
  ),
  undefined,
  'a non-512 IHDR should fail before image decode'
);
assert.equal(
  scribbitCore.decodePngDataUrl(`data:image/png;base64,${'A'.repeat(546_140)}`),
  undefined,
  'oversized base64 should fail before allocating decoded PNG bytes'
);
pass('PNG data URL size, signature, and IHDR preflight');

const makeDecodedPngFixture = (rgba) => {
  return {
    base64: 'fixture',
    bytes: new Uint8Array(),
    byteLength: 0,
    width: 512,
    height: 512,
    rgba,
  };
};

const setRgbaPixel = (rgba, x, y, red, green, blue, alpha) => {
  const byteOffset = (y * 512 + x) * 4;
  rgba[byteOffset] = red;
  rgba[byteOffset + 1] = green;
  rgba[byteOffset + 2] = blue;
  rgba[byteOffset + 3] = alpha;
};

const bindingBaseRgba = new Uint8Array(512 * 512 * 4);
setRgbaPixel(bindingBaseRgba, 24, 24, 120, 80, 40, 200);
const bindingBasePng = makeDecodedPngFixture(bindingBaseRgba);
assert.equal(
  scribbitCore.validateRenderedPngBinding(
    bindingBasePng,
    makeDecodedPngFixture(bindingBaseRgba.slice()),
    []
  ),
  true,
  'identical decoded images should pass without accessories'
);

const hiddenColorDifferenceRgba = bindingBaseRgba.slice();
setRgbaPixel(hiddenColorDifferenceRgba, 25, 25, 255, 120, 60, 0);
assert.equal(
  scribbitCore.validateRenderedPngBinding(
    bindingBasePng,
    makeDecodedPngFixture(hiddenColorDifferenceRgba),
    []
  ),
  true,
  'RGB differences under zero alpha should be ignored as invisible'
);

const oneLevelToleranceBaseRgba = bindingBaseRgba.slice();
setRgbaPixel(oneLevelToleranceBaseRgba, 26, 26, 100, 100, 100, 128);
const oneLevelToleranceRenderedRgba = oneLevelToleranceBaseRgba.slice();
setRgbaPixel(oneLevelToleranceRenderedRgba, 26, 26, 100, 100, 100, 129);
assert.equal(
  scribbitCore.validateRenderedPngBinding(
    makeDecodedPngFixture(oneLevelToleranceBaseRgba),
    makeDecodedPngFixture(oneLevelToleranceRenderedRgba),
    []
  ),
  true,
  'one alpha and premultiplied channel level should tolerate canvas rounding'
);

const outsideMismatchRgba = bindingBaseRgba.slice();
setRgbaPixel(outsideMismatchRgba, 12, 12, 255, 0, 0, 255);
const centeredAccessory = {
  id: 'beanie',
  x: 256,
  y: 256,
  scale: 1,
  rotation: 0,
};
assert.equal(
  scribbitCore.validateRenderedPngBinding(
    bindingBasePng,
    makeDecodedPngFixture(outsideMismatchRgba),
    [centeredAccessory]
  ),
  false,
  'one unauthorized visible pixel outside declared regions should fail'
);
pass('rendered PNG identity and exact outside-region binding');

const rotatedAccessory = {
  ...centeredAccessory,
  rotation: Math.PI / 4,
};
const rotatedRegionRgba = bindingBaseRgba.slice();
setRgbaPixel(rotatedRegionRgba, 256, 339, 40, 180, 220, 255);
assert.equal(
  scribbitCore.validateRenderedPngBinding(
    bindingBasePng,
    makeDecodedPngFixture(rotatedRegionRgba),
    [rotatedAccessory]
  ),
  true,
  'a pixel inside the declared rotated box should be allowed'
);
assert.equal(
  scribbitCore.validateRenderedPngBinding(
    bindingBasePng,
    makeDecodedPngFixture(rotatedRegionRgba),
    [centeredAccessory]
  ),
  false,
  'the same pixel should be outside the unrotated box'
);

const alphaErasureBaseRgba = bindingBaseRgba.slice();
setRgbaPixel(alphaErasureBaseRgba, 256, 256, 20, 30, 40, 255);
const alphaErasureRenderedRgba = alphaErasureBaseRgba.slice();
setRgbaPixel(alphaErasureRenderedRgba, 256, 256, 20, 30, 40, 254);
assert.equal(
  scribbitCore.validateRenderedPngBinding(
    makeDecodedPngFixture(alphaErasureBaseRgba),
    makeDecodedPngFixture(alphaErasureRenderedRgba),
    [rotatedAccessory]
  ),
  false,
  'rendered alpha must never decrease, even inside an accessory region'
);
pass('rotated accessory region allowance and global alpha monotonicity');

const makeAccessoryDraft = (accessories) => {
  return {
    name: 'Bounds Tester',
    baseImageDataUrl: validPngDataUrl,
    imageDataUrl: validPngDataUrl,
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    element: 'ember',
    accessories,
  };
};
const minimumTransformAccessory = {
  id: 'bowtie',
  x: 0,
  y: 512,
  scale: arena.MIN_ACCESSORY_SCALE,
  rotation: arena.MIN_ACCESSORY_ROTATION,
};
const maximumTransformAccessory = {
  id: 'beanie',
  x: 512,
  y: 0,
  scale: arena.MAX_ACCESSORY_SCALE,
  rotation: arena.MAX_ACCESSORY_ROTATION,
};
assert.ok(
  scribbitCore.validateSubmitScribbitRequest(
    makeAccessoryDraft([minimumTransformAccessory, maximumTransformAccessory])
  ),
  'integer canvas edges and exact transform limits should be accepted'
);

const invalidTransformAccessories = [
  { ...centeredAccessory, x: 1.5 },
  { ...centeredAccessory, y: 1.5 },
  { ...centeredAccessory, x: -1 },
  { ...centeredAccessory, y: 513 },
  { ...centeredAccessory, scale: arena.MIN_ACCESSORY_SCALE - 0.001 },
  { ...centeredAccessory, scale: arena.MAX_ACCESSORY_SCALE + 0.001 },
  { ...centeredAccessory, rotation: arena.MIN_ACCESSORY_ROTATION - 0.001 },
  { ...centeredAccessory, rotation: arena.MAX_ACCESSORY_ROTATION + 0.001 },
  { ...centeredAccessory, id: 'not-a-real-accessory' },
];
for (const invalidAccessory of invalidTransformAccessories) {
  assert.equal(
    scribbitCore.validateSubmitScribbitRequest(
      makeAccessoryDraft([invalidAccessory])
    ),
    undefined,
    `invalid accessory transform should fail: ${JSON.stringify(invalidAccessory)}`
  );
}
assert.equal(
  scribbitCore.validateSubmitScribbitRequest(
    makeAccessoryDraft([
      centeredAccessory,
      { ...centeredAccessory, id: 'bowtie' },
      { ...centeredAccessory, id: 'monocle' },
    ])
  ),
  undefined,
  'accessory count above the shared maximum should fail'
);
pass('accessory catalog, count, coordinate, scale, and rotation bounds');

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
assert.deepEqual(
  analyzerOne,
  analyzerTwo,
  'analyzer-core should be deterministic'
);
assert.equal(
  analyzerOne.inkedPixels,
  400,
  'synthetic fixture should count ink'
);
assert.equal(
  analyzerCore.hasMinimumDrawingInk({
    inkedPixels: analyzerCore.MIN_INK_PIXELS - 1,
  }),
  false,
  'a sub-threshold mark must not qualify as a submitted creature'
);
assert.equal(
  analyzerCore.hasMinimumDrawingInk({
    inkedPixels: analyzerCore.MIN_INK_PIXELS,
  }),
  true,
  'the shared drawing threshold should have one exact client/server boundary'
);
assert.equal(
  sumStats(analyzerOne.stats),
  arena.STAT_BUDGET,
  'analyzer stats sum'
);
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

const practicePngFixture = new PNG({ width: 512, height: 512 });
practicePngFixture.data.fill(0);
for (let y = 150; y < 350; y += 1) {
  for (let x = 110; x < 402; x += 1) {
    const offset = (y * 512 + x) * 4;
    practicePngFixture.data[offset] = 255;
    practicePngFixture.data[offset + 1] = 40;
    practicePngFixture.data[offset + 2] = 24;
    practicePngFixture.data[offset + 3] = 255;
  }
}
const practicePngDataUrl = `data:image/png;base64,${PNG.sync
  .write(practicePngFixture)
  .toString('base64')}`;
const practiceContext = {
  request: { name: 'Server Shape', baseImageDataUrl: practicePngDataUrl },
  artist: 'practice_artist',
  playerId: 'practice-player-id',
  canonicalDay: 7,
  nonce: 'fixed-practice-nonce',
};
assert.equal(
  practiceCore.createPracticeBattle({
    ...practiceContext,
    request: {
      ...practiceContext.request,
      stats: { chonk: 100, spike: 0, zip: 0, charm: 0 },
    },
  }).status,
  'invalid-request',
  'practice request must reject client-authored combat fields'
);
assert.equal(
  practiceCore.createPracticeBattle({
    ...practiceContext,
    request: {
      name: 'Bad PNG',
      baseImageDataUrl: 'data:image/png;base64,nope',
    },
  }).status,
  'invalid-png',
  'practice request must reject malformed image payloads'
);
assert.equal(
  practiceCore.createPracticeBattle({
    ...practiceContext,
    request: { name: 'Blank Shape', baseImageDataUrl: validPngDataUrl },
  }).status,
  'too-small',
  'practice request must enforce the shared minimum-ink threshold'
);
const practiceResult = practiceCore.createPracticeBattle(practiceContext);
assert.equal(practiceResult.status, 'created');
assert.equal(practiceResult.report.kind, 'practice');
assert.equal(practiceResult.report.a.imageUrl, practicePngDataUrl);
assert.equal(practiceResult.report.a.artist, practiceContext.artist);
assert.equal(practiceResult.report.a.level, 1);
assert.equal(practiceResult.report.a.xp, 0);
assert.deepEqual(practiceResult.report.a.accessories, []);
assert.equal(practiceResult.report.inkAwarded, undefined);
assert.ok(practiceResult.report.simulation?.timeline.length > 0);
const decodedPracticePng = scribbitCore.decodePngDataUrl(practicePngDataUrl);
assert.ok(decodedPracticePng);
const expectedPracticeAnalysis = analyzerCore.analyze({
  data: decodedPracticePng.rgba,
  width: decodedPracticePng.width,
  height: decodedPracticePng.height,
});
assert.deepEqual(
  practiceResult.report.a.stats,
  expectedPracticeAnalysis.stats,
  'practice fighter stats must come from the server-decoded PNG'
);
assert.equal(
  practiceResult.report.a.element,
  expectedPracticeAnalysis.element,
  'practice fighter element must come from the server-decoded PNG'
);
assert.deepEqual(
  mockCombatBundle.createPracticeBattle(practiceContext),
  practiceResult,
  'browser mock must execute the same bundled Practice Lab authority path'
);
const alternatePracticePng = new PNG({ width: 512, height: 512 });
alternatePracticePng.data.set(practicePngFixture.data);
const alternatePixelOffset = (150 * 512 + 110) * 4;
alternatePracticePng.data[alternatePixelOffset] = 20;
alternatePracticePng.data[alternatePixelOffset + 1] = 180;
alternatePracticePng.data[alternatePixelOffset + 2] = 80;
const alternatePracticeResult = practiceCore.createPracticeBattle({
  ...practiceContext,
  request: {
    ...practiceContext.request,
    baseImageDataUrl: `data:image/png;base64,${PNG.sync
      .write(alternatePracticePng)
      .toString('base64')}`,
  },
});
assert.equal(alternatePracticeResult.status, 'created');
assert.notEqual(
  alternatePracticeResult.report.a.id,
  practiceResult.report.a.id,
  'different validated art must receive a different transient texture identity'
);
let practiceStorageCalls = 0;
const forbiddenPracticeStorage = new Proxy(
  {},
  {
    get() {
      practiceStorageCalls += 1;
      throw new Error('Practice touched storage.');
    },
  }
);
await assert.rejects(
  () =>
    battleStore.saveBattleReport(
      forbiddenPracticeStorage,
      practiceResult.report,
      1
    ),
  /cannot be stored/
);
assert.equal(
  practiceStorageCalls,
  0,
  'practice persistence guard must fail before the first storage method read'
);
pass('server-authoritative Practice Lab is strict, replayable, and ephemeral');

const reportOne = battle.simulate(alpha, beta, 12345, forecast, 'exhibition');
const reportTwo = battle.simulate(alpha, beta, 12345, forecast, 'exhibition');
assert.deepEqual(
  reportOne,
  reportTwo,
  'same seed should produce identical report'
);
assert.equal(
  reportOne.events,
  undefined,
  'new battle reports must not write the deprecated turn-style event projection'
);
assert.ok(
  reportOne.simulation,
  'new battle reports should carry an authoritative transcript'
);
assert.equal(
  reportOne.simulation.result.winner,
  reportOne.winner,
  'report winner must come from the authoritative transcript'
);
assert.ok(
  reportOne.simulation.timeline.some(
    (event) => event.kind === 'ability_activated'
  ),
  'continuous replay should include real ability activations'
);
assert.equal(
  continuousReplay.getUsableBattleTranscript(reportOne),
  reportOne.simulation,
  'client should accept the exact authoritative transcript returned by the server'
);
const mismatchedReplayFighterReport = structuredClone(reportOne);
mismatchedReplayFighterReport.a.id = 'different-top-level-fighter';
assert.equal(
  continuousReplay.getUsableBattleTranscript(mismatchedReplayFighterReport),
  undefined,
  'client replay must reject a report whose visible fighter differs from transcript slot a'
);
const replayMidpoint = continuousReplay.calculateReplayFrame(
  reportOne.simulation,
  reportOne.simulation.result.completedTick / 2
);
assert.ok(
  replayMidpoint.fighters.every((fighter) =>
    Number.isFinite(fighter.position.x)
  ),
  'continuous replay interpolation should keep both fighter positions finite'
);
pass(
  'battle determinism, authoritative transcript, replay interpolation, and shared max HP'
);

const makeGoldenScribbit = (id, element, stats) => ({
  id,
  name: id,
  artist: 'golden',
  element,
  stats,
  imageUrl: `/drawing/${id}`,
  bornDay: 1,
  expiresDay: 4,
  belief: 0,
  wins: 0,
  losses: 0,
  status: 'alive',
  legendTitle: null,
  isFounding: false,
  accessories: [],
  level: 1,
  xp: 0,
  mood: 'happy',
  careDoneToday: [],
  legacy: null,
});
const goldenForecast = {
  day: 77,
  boostedElement: 'storm',
  nerfedElement: 'moss',
  blurb: 'Golden forecast',
};
const goldenCombatCases = [
  {
    name: 'balanced timeout',
    fighterA: makeGoldenScribbit('gold-a', 'tide', {
      chonk: 25,
      spike: 25,
      zip: 25,
      charm: 25,
    }),
    fighterB: makeGoldenScribbit('gold-b', 'ember', {
      chonk: 25,
      spike: 25,
      zip: 25,
      charm: 25,
    }),
    seed: 7001,
    expectedHash:
      '5f2e2f12f71216bceb386b0d57c0419acdb53a351ba4b36f6977807f8a1b8c3d',
  },
  {
    name: 'boundary archetypes',
    fighterA: makeGoldenScribbit('gold-c', 'storm', {
      chonk: 55,
      spike: 25,
      zip: 10,
      charm: 10,
    }),
    fighterB: makeGoldenScribbit('gold-d', 'moss', {
      chonk: 10,
      spike: 10,
      zip: 25,
      charm: 55,
    }),
    seed: 7002,
    expectedHash:
      'a4ef46d69c9904a62ad6054fe6a475191852f58e34d493d987e4e7c03b8f4693',
    previousHashWithoutBarrierSourceMetadata:
      '6f2634d342b2bdb78c183138020f16f58e3b61abe19f8bde947fcd8e47ae4998',
  },
  {
    name: 'Smearstep dash schedule',
    fighterA: makeGoldenScribbit('gold-smear', 'tide', {
      chonk: 10,
      spike: 10,
      zip: 55,
      charm: 25,
    }),
    fighterB: makeGoldenScribbit('gold-halo', 'ember', {
      chonk: 10,
      spike: 55,
      zip: 25,
      charm: 10,
    }),
    seed: 7003,
    expectedHash:
      '8d573dbde552349906be1200f116a2becc2651552b4e6aa28838988826401e91',
  },
];
const transcriptHash = (transcript) =>
  createHash('sha256').update(JSON.stringify(transcript)).digest('hex');
for (const goldenCase of goldenCombatCases) {
  const directReport = battle.simulate(
    goldenCase.fighterA,
    goldenCase.fighterB,
    goldenCase.seed,
    goldenForecast,
    'exhibition'
  );
  const bundledReport = mockCombatBundle.simulate(
    goldenCase.fighterA,
    goldenCase.fighterB,
    goldenCase.seed,
    goldenForecast,
    'exhibition'
  );
  assert.equal(
    transcriptHash(directReport.simulation),
    goldenCase.expectedHash,
    `${goldenCase.name} should preserve its authoritative transcript hash`
  );
  assert.equal(
    transcriptHash(bundledReport.simulation),
    goldenCase.expectedHash,
    `${goldenCase.name} mock bundle should match the production combat hash`
  );
  if (goldenCase.previousHashWithoutBarrierSourceMetadata) {
    const transcriptBeforeBarrierAttribution = structuredClone(
      directReport.simulation
    );
    for (const event of transcriptBeforeBarrierAttribution.timeline) {
      if (event.kind !== 'barrier_hit') continue;
      delete event.sourceFighter;
      delete event.source;
      delete event.sourceActivationNumber;
    }
    assert.equal(
      transcriptHash(transcriptBeforeBarrierAttribution),
      goldenCase.previousHashWithoutBarrierSourceMetadata,
      `${goldenCase.name} should change only by adding barrier attribution metadata`
    );
  }
}
pass('golden combat transcript hashes lock production and mock parity');

const firstDamageEvent = reportOne.simulation.timeline.find(
  (event) => event.kind === 'damage'
);
assert.ok(firstDamageEvent, 'fixture transcript should contain damage');
const damagedFighterIndex = firstDamageEvent.targetFighter === 'a' ? 0 : 1;
const initialDamagedHitPoints =
  reportOne.simulation.checkpoints[0].fighters[damagedFighterIndex].hitPoints;
const earlierDamageEvents = reportOne.simulation.timeline.filter(
  (event) =>
    event.kind === 'damage' &&
    event.targetFighter === firstDamageEvent.targetFighter &&
    event.tick < firstDamageEvent.tick
);
const expectedHitPointsBeforeDamage =
  earlierDamageEvents.at(-1)?.targetHitPoints ?? initialDamagedHitPoints;
const damageEventsThroughImpact = reportOne.simulation.timeline.filter(
  (event) =>
    event.kind === 'damage' &&
    event.targetFighter === firstDamageEvent.targetFighter &&
    event.tick <= firstDamageEvent.tick
);
const expectedHitPointsAtDamage =
  damageEventsThroughImpact.at(-1)?.targetHitPoints;
assert.equal(
  continuousReplay.calculateReplayFrame(
    reportOne.simulation,
    firstDamageEvent.tick - 0.01
  ).fighters[damagedFighterIndex].hitPoints,
  expectedHitPointsBeforeDamage,
  'HP must not drain before its authoritative damage event'
);
assert.equal(
  continuousReplay.calculateReplayFrame(
    reportOne.simulation,
    firstDamageEvent.tick
  ).fighters[damagedFighterIndex].hitPoints,
  expectedHitPointsAtDamage,
  'HP must change exactly on its authoritative damage event'
);
assert.equal(
  continuousReplay.calculateReplayFrame(
    reportOne.simulation,
    firstDamageEvent.tick + 0.25
  ).fighters[damagedFighterIndex].hitPoints,
  expectedHitPointsAtDamage,
  'event-driven HP must persist between checkpoints'
);

const malformedDamageTranscript = structuredClone(reportOne.simulation);
const malformedDamage = malformedDamageTranscript.timeline.find(
  (event) => event.kind === 'damage'
);
assert.ok(malformedDamage);
malformedDamage.amount = 'a suspicious amount';
assert.equal(
  continuousReplay.getUsableBattleTranscript(malformedDamageTranscript),
  undefined,
  'malformed damage payloads must fall back instead of entering replay'
);
const selfTargetingTranscript = structuredClone(reportOne.simulation);
const selfTargetingDamage = selfTargetingTranscript.timeline.find(
  (event) => event.kind === 'damage'
);
assert.ok(selfTargetingDamage);
selfTargetingDamage.targetFighter = selfTargetingDamage.sourceFighter;
assert.equal(
  continuousReplay.getUsableBattleTranscript(selfTargetingTranscript),
  undefined,
  'self-targeting damage payloads must be rejected'
);
const unboundedScheduleTranscript = structuredClone(reportOne.simulation);
const unboundedTelegraph = unboundedScheduleTranscript.timeline.find(
  (event) => event.kind === 'ability_telegraphed'
);
assert.ok(unboundedTelegraph);
unboundedTelegraph.activatesAtTick = unboundedTelegraph.tick + 41;
assert.equal(
  continuousReplay.getUsableBattleTranscript(unboundedScheduleTranscript),
  undefined,
  'future schedules beyond two seconds must be rejected'
);

const colorburstFighter = makeScribbit({
  id: 'colorburst-replay-fixture',
  name: 'Prism Fixture',
  stats: { chonk: 15, spike: 15, zip: 15, charm: 55 },
});
const colorburstReport = battle.simulate(
  colorburstFighter,
  alpha,
  4401,
  forecast,
  'exhibition'
);
const echoCreatedEvent = colorburstReport.simulation.timeline.find(
  (event) => event.kind === 'echo_created' && event.actor === 'a'
);
assert.ok(echoCreatedEvent, 'Colorburst fixture should create an echo');
assert.equal(
  continuousReplay.calculateReplayFrame(
    colorburstReport.simulation,
    echoCreatedEvent.tick - 0.01
  ).fighters[0].echoPosition,
  null,
  'Colorburst echo must not appear before echo_created'
);
assert.deepEqual(
  continuousReplay.calculateReplayFrame(
    colorburstReport.simulation,
    echoCreatedEvent.tick
  ).fighters[0].echoPosition,
  echoCreatedEvent.position,
  'Colorburst echo must appear at its authoritative position'
);
const echoResolvedEvent = colorburstReport.simulation.timeline.find(
  (event) =>
    event.tick >= echoCreatedEvent.tick &&
    ((event.kind === 'echo_fired' && event.actor === 'a') ||
      (event.kind === 'echo_shattered' && event.owner === 'a'))
);
assert.ok(echoResolvedEvent, 'Colorburst fixture should resolve its echo');
assert.equal(
  continuousReplay.calculateReplayFrame(
    colorburstReport.simulation,
    echoResolvedEvent.tick
  ).fighters[0].echoPosition,
  null,
  'Colorburst echo must disappear exactly when fired or shattered'
);
pass('continuous replay validates and applies event state at exact ticks');

const contradictoryCheckpointTranscript = structuredClone(reportOne.simulation);
const contradictoryFinalCheckpoint =
  contradictoryCheckpointTranscript.checkpoints.at(-1);
const authoritativeFighterAResult =
  contradictoryCheckpointTranscript.result.fighters[0];
assert.ok(contradictoryFinalCheckpoint);
contradictoryFinalCheckpoint.fighters[0].hitPoints =
  authoritativeFighterAResult.finalHitPoints ===
  authoritativeFighterAResult.maxHitPoints
    ? authoritativeFighterAResult.finalHitPoints - 1
    : authoritativeFighterAResult.finalHitPoints + 1;
assert.equal(
  continuousReplay.getUsableBattleTranscript(contradictoryCheckpointTranscript),
  undefined,
  'a final checkpoint that contradicts the authoritative result must be rejected'
);

const truncatedReplayTranscript = structuredClone(reportOne.simulation);
truncatedReplayTranscript.eventsTruncated = true;
truncatedReplayTranscript.timeline = [
  truncatedReplayTranscript.timeline[0],
  truncatedReplayTranscript.timeline.at(-1),
];
assert.equal(
  continuousReplay.getUsableBattleTranscript(truncatedReplayTranscript),
  truncatedReplayTranscript,
  'bounded transcripts should remain replayable when nonterminal events were capped'
);
const truncatedFinalFrame = continuousReplay.calculateReplayFrame(
  truncatedReplayTranscript,
  truncatedReplayTranscript.result.completedTick
);
assert.deepEqual(
  truncatedFinalFrame.fighters.map((fighter) => fighter.hitPoints),
  truncatedReplayTranscript.result.fighters.map(
    (fighter) => fighter.finalHitPoints
  ),
  'checkpoint state must keep final replay HP authoritative after event truncation'
);
pass('truncated replay state reconciles to authoritative checkpoints');

const shapeVisualBase = {
  frameTick: 15,
  fighterCenter: { x: 120, y: 220 },
  activationCenter: { x: 310, y: 260 },
  primaryColor: 0x55aaff,
  colorburstPalette: [0xff6b4a, 0xffd447, 0x5b9dff],
};
const buildPowerCommands = (power) =>
  shapePowerPresentation.buildShapePowerDrawCommands({
    ...shapeVisualBase,
    effect: {
      power,
      phase: 'active',
      startTick: 10,
      endTick: 20,
      aimDirection: { x: 1024, y: 0 },
    },
  });
const inkquakeCommands = buildPowerCommands('inkquake');
assert.equal(
  inkquakeCommands.filter((command) => command.kind === 'stroke-circle').length,
  3,
  'Inkquake should read as three expanding rings'
);
assert.ok(
  inkquakeCommands.every(
    (command) =>
      command.kind !== 'stroke-circle' ||
      command.center.x === shapeVisualBase.activationCenter.x
  ),
  'Inkquake rings should stay anchored to the activation origin'
);
const inkquakeRadiiByFrame = [10, 15, 20].map((frameTick) =>
  shapePowerPresentation
    .buildShapePowerDrawCommands({
      ...shapeVisualBase,
      frameTick,
      effect: {
        power: 'inkquake',
        phase: 'active',
        startTick: 10,
        endTick: 20,
        aimDirection: { x: 1024, y: 0 },
      },
    })
    .filter((command) => command.kind === 'stroke-circle')
    .map((command) => command.radius)
);
for (const radii of inkquakeRadiiByFrame) {
  assert.ok(
    radii.every((radius) => radius > 2),
    'Inkquake must begin with three rings rather than a clamped dot'
  );
  assert.ok(
    radii[0] > radii[1] && radii[1] > radii[2],
    'Inkquake ring radii should remain visibly ordered'
  );
}
assert.ok(
  inkquakeRadiiByFrame[0][0] < inkquakeRadiiByFrame[1][0] &&
    inkquakeRadiiByFrame[1][0] < inkquakeRadiiByFrame[2][0],
  'Inkquake rings should expand across the active window'
);
const nibHaloCommands = buildPowerCommands('nib_halo');
assert.equal(
  nibHaloCommands.filter((command) => command.kind === 'fill-triangle').length,
  3,
  'Nib Halo should expose three visible quills'
);
assert.equal(
  nibHaloCommands.filter((command) => command.kind === 'stroke-triangle')
    .length,
  3,
  'Nib Halo quills should have three readable ink outlines'
);
assert.equal(
  buildPowerCommands('smearstep').filter((command) => command.kind === 'line')
    .length,
  4,
  'Smearstep should expose a readable speed lane'
);
const colorburstCommands = buildPowerCommands('colorburst');
assert.equal(
  colorburstCommands.filter((command) => command.kind === 'fill-triangle')
    .length,
  3,
  'Colorburst should expose three color layers'
);
assert.ok(
  colorburstCommands
    .filter((command) => command.kind === 'fill-triangle')
    .every((command) => command.alpha >= 0.32),
  'active Colorburst layers should remain readable over submitted art'
);
assert.equal(
  colorburstCommands.filter((command) => command.kind === 'stroke-triangle')
    .length,
  1,
  'Colorburst should outline its active cone'
);
const signatureMoveNames = ['ember', 'tide', 'moss', 'storm'].flatMap(
  (element) =>
    shapePowerContent.SHAPE_POWER_IDS.map((power) =>
      shapePowerContent.getShapePowerSignatureName(element, power)
    )
);
assert.equal(
  new Set(signatureMoveNames).size,
  16,
  'every element and Shape Power combination should have a unique signature'
);
assert.ok(
  signatureMoveNames.every((name) => name.length <= 16),
  'signature names should stay short enough for the mobile battle HUD'
);
assert.equal(
  shapePowerContent.getShapePowerRevealCopy('smearstep', 'storm'),
  'BOLT SCRIBBLE!\nPREDICTIVE DOUBLE DASH',
  'battle reveals should combine element identity with truthful mechanics'
);
assert.equal(
  shapePowerContent.getDamageSourceDisplayName('colorburst_echo', 'tide'),
  'Splashback Echo',
  'secondary damage copy should retain its elemental signature identity'
);
assert.equal(
  shapePowerContent.isShapePowerId('nib_halo'),
  true,
  'the shared catalog should recognize every persisted Shape Power id'
);
assert.equal(
  shapePowerContent.isShapePowerId('mystery_laser'),
  false,
  'unknown Shape Power ids should fail closed instead of falling through'
);
for (const power of shapePowerContent.SHAPE_POWER_IDS) {
  const noCleanHitCallout =
    shapePowerContent.getShapePowerNoCleanHitCallout(power);
  assert.ok(noCleanHitCallout.length <= 16);
  assert.doesNotMatch(
    noCleanHitCallout,
    /miss|dodge|evade|sidestep|counter|dead zone/i,
    `${power} no-clean-hit copy must not invent why the connection failed`
  );
}
assert.throws(
  () =>
    shapePowerPresentation.buildShapePowerDrawCommands({
      ...shapeVisualBase,
      effect: {
        power: 'mystery_laser',
        phase: 'active',
        startTick: 10,
        endTick: 20,
        aimDirection: { x: 1024, y: 0 },
      },
    }),
  /Unhandled Shape Power/,
  'unknown Shape Powers must never silently render as Colorburst'
);
assert.equal(
  shapePowerPresentation.getShapePowerRevealCopy('smearstep'),
  'SMEARSTEP!\nPREDICTIVE DOUBLE DASH',
  'first reveal copy should explain the unique two-beat move'
);
assert.deepEqual(
  shapePowerPresentation.planShapePowerCallout({
    side: 'a',
    actorCenter: { x: 300, y: 600 },
    opponentCenter: { x: 600, y: 700 },
    firstReveal: true,
    viewportWidth: 720,
    viewportHeight: 1280,
  }).position,
  { x: 180, y: 435 },
  'first power reveal should use a stable left presentation lane'
);
const activeInkquake = {
  fighter: 'b',
  power: 'inkquake',
  activationNumber: 2,
  phase: 'active',
};
assert.equal(
  shapePowerPresentation.barrierHitConnectsShapePowerActivation(
    {
      sourceFighter: 'b',
      source: 'inkquake',
      sourceActivationNumber: 2,
    },
    activeInkquake
  ),
  true,
  'a shielded hit from the exact active power should still count as connected'
);
for (const unrelatedBarrierHit of [
  { sourceFighter: 'b', source: 'contact', sourceActivationNumber: 2 },
  { sourceFighter: 'b', source: 'inkquake', sourceActivationNumber: 1 },
  {},
]) {
  assert.equal(
    shapePowerPresentation.barrierHitConnectsShapePowerActivation(
      unrelatedBarrierHit,
      activeInkquake
    ),
    false,
    'contact, another activation, and legacy metadata must not fake a Shape Power connection'
  );
}
assert.equal(
  shapePowerPresentation.barrierHitConnectsShapePowerActivation(
    {
      sourceFighter: 'a',
      source: 'colorburst_echo',
      sourceActivationNumber: 4,
    },
    {
      fighter: 'a',
      power: 'colorburst',
      activationNumber: 4,
      phase: 'active',
    }
  ),
  true,
  'Colorburst echo should count only for its exact Colorburst activation'
);
assert.equal(
  shapePowerPresentation.shouldAnnounceNoCleanHitAtAbilityFinish(
    'nib_halo',
    false
  ),
  true,
  'powers with no delayed follow-up may report no clean hit at finish'
);
assert.equal(
  shapePowerPresentation.shouldAnnounceNoCleanHitAtAbilityFinish(
    'inkquake',
    true
  ),
  false,
  'a connected power must never receive miss presentation'
);
assert.equal(
  shapePowerPresentation.shouldAnnounceNoCleanHitAtAbilityFinish(
    'colorburst',
    false
  ),
  false,
  'Colorburst must wait past ability finish because its echo can still connect'
);
pass('Shape Power vignette plans remain distinct and deterministic');

const featuredRumbleStorage = createMemoryStorage();
const featuredOpponent = makeScribbit({
  id: 'featured-opponent',
  name: 'Featured Opponent',
  element: 'moss',
});
const firstFeaturedBout = battle.simulate(
  alpha,
  beta,
  2201,
  forecast,
  'rumble'
);
const lastFeaturedBout = battle.simulate(
  alpha,
  featuredOpponent,
  2202,
  forecast,
  'rumble'
);
await battleStore.saveBattleReport(featuredRumbleStorage, firstFeaturedBout, 1);
await battleStore.setFeaturedRumbleReport(
  featuredRumbleStorage,
  firstFeaturedBout,
  0
);
await battleStore.saveBattleReport(featuredRumbleStorage, lastFeaturedBout, 2);
await battleStore.setFeaturedRumbleReport(
  featuredRumbleStorage,
  lastFeaturedBout,
  1
);
await battleStore.setFeaturedRumbleReport(
  featuredRumbleStorage,
  firstFeaturedBout,
  0
);
assert.equal(
  (
    await battleStore.loadBattleReport(
      featuredRumbleStorage,
      lastFeaturedBout.id
    )
  )?.events,
  undefined,
  'new stored reports should contain only the authoritative simulation'
);
const legacyTurnReport = {
  ...firstFeaturedBout,
  id: 'legacy-turn-report',
  simulation: undefined,
  events: [
    {
      type: 'faint',
      actor: 'b',
      move: null,
      damage: null,
      hpA: 90,
      hpB: 0,
      text: 'Legacy result retained for migration.',
    },
  ],
};
await featuredRumbleStorage.set(
  battleStore.getBattleReportKey(legacyTurnReport.id),
  JSON.stringify(legacyTurnReport)
);
assert.equal(
  (
    await battleStore.loadBattleReport(
      featuredRumbleStorage,
      legacyTurnReport.id
    )
  )?.events?.[0]?.type,
  'faint',
  'old event-only records should remain readable during migration'
);
const emptyBattleReport = {
  ...firstFeaturedBout,
  id: 'empty-battle-report',
  simulation: undefined,
};
await featuredRumbleStorage.set(
  battleStore.getBattleReportKey(emptyBattleReport.id),
  JSON.stringify(emptyBattleReport)
);
assert.equal(
  await battleStore.loadBattleReport(
    featuredRumbleStorage,
    emptyBattleReport.id
  ),
  undefined,
  'stored reports must contain either an authoritative simulation or legacy events'
);
const invalidBattleReportStorage = createMemoryStorage();
const contradictoryWinnerReport = {
  ...lastFeaturedBout,
  winner: lastFeaturedBout.winner === 'a' ? 'b' : 'a',
};
await invalidBattleReportStorage.set(
  battleStore.getBattleReportKey(contradictoryWinnerReport.id),
  JSON.stringify(contradictoryWinnerReport)
);
assert.equal(
  await battleStore.loadBattleReport(
    invalidBattleReportStorage,
    contradictoryWinnerReport.id
  ),
  undefined,
  'stored report winner must agree with its authoritative simulation result'
);
const contradictoryFighterReport = structuredClone(lastFeaturedBout);
contradictoryFighterReport.a.id = 'different-stored-fighter';
await invalidBattleReportStorage.set(
  battleStore.getBattleReportKey(contradictoryFighterReport.id),
  JSON.stringify(contradictoryFighterReport)
);
assert.equal(
  await battleStore.loadBattleReport(
    invalidBattleReportStorage,
    contradictoryFighterReport.id
  ),
  undefined,
  'stored report fighter identities must agree with their transcript slots'
);
const contradictoryFinishReport = structuredClone(lastFeaturedBout);
contradictoryFinishReport.simulation.result.reason = 'double_knockout';
contradictoryFinishReport.simulation.timeline.at(-1).reason = 'double_knockout';
await invalidBattleReportStorage.set(
  battleStore.getBattleReportKey(contradictoryFinishReport.id),
  JSON.stringify(contradictoryFinishReport)
);
assert.equal(
  await battleStore.loadBattleReport(
    invalidBattleReportStorage,
    contradictoryFinishReport.id
  ),
  undefined,
  'stored finish reasons must agree with authoritative terminal HP'
);
assert.equal(
  await battleStore.getFeaturedRumbleReportId(
    featuredRumbleStorage,
    alpha.id,
    forecast.day
  ),
  lastFeaturedBout.id,
  "an older retry must not replace an entrant's later Swiss report"
);
assert.equal(
  (
    await battleStore.loadFeaturedRumbleReport(
      featuredRumbleStorage,
      beta.id,
      forecast.day
    )
  )?.id,
  firstFeaturedBout.id,
  'an entrant with no later pairing should keep its last actual bout'
);
await battleStore.purgeBattleReportsForScribbit(
  featuredRumbleStorage,
  alpha.id
);
assert.equal(
  await battleStore.getFeaturedRumbleReportId(
    featuredRumbleStorage,
    beta.id,
    forecast.day
  ),
  null,
  'purging a report should clear an opponent pointer only when it matches'
);
pass('Rumble featured-bout pointers select last play and purge safely');

const nextGoalScribbit = makeScribbit({
  id: 'next-goal-scribbit',
  name: 'Goal Doodle',
  bornDay: 2,
  expiresDay: 5,
  level: 2,
  xp: 4,
  belief: 9,
  careDoneToday: [],
});
const nextGoalBaseState = {
  dayNumber: 3,
  loggedIn: true,
  myUsername: 'goal-player',
  forecast,
  champion: null,
  myScribbits: [nextGoalScribbit],
  drawnToday: true,
  enteredToday: false,
  bossChallengedToday: false,
  rumbleEntrants: 8,
  communityLegendCount: 0,
  rumbleResolvesAt: Date.now() + 60_000,
  todayEntrants: [],
  myBackedScribbitId: null,
  playStreakDays: 1,
  myClout: 0,
  myInk: 20,
  myPens: [],
  nextCapsuleCost: 5,
  capsuleProgress: {
    pullCount: 2,
    pityRemaining: 8,
    discoveredCount: 3,
    collectionTotal: 28,
  },
  lastRumbleReceipt: null,
  legacyReturnReceipt: null,
};
const enterGoal = nextGoal.selectNextGoal(nextGoalBaseState);
assert.equal(
  enterGoal.actionKind,
  'enter',
  'entry must outrank an affordable capsule after drawing'
);
const backGoal = nextGoal.selectNextGoal({
  ...nextGoalBaseState,
  enteredToday: true,
});
assert.equal(backGoal.actionKind, 'back', 'Back must follow Rumble entry');
const championChallengeGoal = nextGoal.selectNextGoal({
  ...nextGoalBaseState,
  champion: beta,
  enteredToday: true,
  myBackedScribbitId: 'picked-one',
});
assert.equal(
  championChallengeGoal.actionKind,
  'challenge',
  'the unused daily Champion Challenge should outrank economy and care chores'
);
assert.match(championChallengeGoal.detail, /Win for \+2 XP/);
const capsuleGoal = nextGoal.selectNextGoal({
  ...nextGoalBaseState,
  champion: beta,
  enteredToday: true,
  bossChallengedToday: true,
  myBackedScribbitId: 'picked-one',
});
assert.equal(
  capsuleGoal.actionKind,
  'capsule',
  'an affordable capsule should outrank optional care'
);
const rivalryGoal = nextGoal.selectNextGoal({
  ...nextGoalBaseState,
  champion: beta,
  enteredToday: true,
  bossChallengedToday: true,
  myBackedScribbitId: 'picked-one',
  founderChronicle: {
    activeRivalry: {
      founderId: secondChronicleFounder.id,
      startedDay: 2,
      playerWins: 1,
      founderWins: 1,
    },
    resolvedRivalries: [],
    lastAdvancedDay: 2,
  },
});
assert.equal(
  rivalryGoal.actionKind,
  'rivalry',
  'a ready active Founder Thread should outrank economy and care chores'
);
assert.equal(rivalryGoal.rivalFounderId, secondChronicleFounder.id);
assert.equal(rivalryGoal.title, 'Rival Page 3: LAST LEAF HOME');
assert.match(rivalryGoal.detail, /Fernibble.*you 1–1/);
const careGoal = nextGoal.selectNextGoal({
  ...nextGoalBaseState,
  enteredToday: true,
  myBackedScribbitId: 'picked-one',
  myInk: 0,
  myScribbits: [{ ...nextGoalScribbit, careDoneToday: ['feed'] }],
});
assert.equal(
  careGoal.actionKind,
  'care',
  'unfinished care should be actionable'
);
assert.equal(
  careGoal.careAction,
  'pat',
  'care priority should advance deterministically from feed to pat'
);
assert.deepEqual(
  careGoal.evidence.featuredScribbit,
  {
    name: 'Goal Doodle',
    level: 2,
    currentExperiencePoints: 4,
    nextLevelExperienceThreshold: 7,
    currentBelief: 9,
    legendBeliefThreshold: 25,
    daysLeft: 2,
  },
  'Next Goal evidence should expose truthful XP, Belief, and lifespan'
);
const waitGoal = nextGoal.selectNextGoal({
  ...nextGoalBaseState,
  enteredToday: true,
  myBackedScribbitId: 'picked-one',
  myInk: 0,
  myScribbits: [
    {
      ...nextGoalScribbit,
      careDoneToday: ['feed', 'pat', 'train'],
    },
  ],
});
assert.equal(
  waitGoal.actionKind,
  'wait',
  'completed actions should settle to wait'
);
assert.equal(
  nextGoal.selectNextGoal({
    ...nextGoalBaseState,
    enteredToday: true,
    myBackedScribbitId: 'picked-one',
    myInk: 0,
    myScribbits: [],
  }).actionKind,
  'wait',
  'an inconsistent empty roster should fail safely to wait'
);
pass('Next Goal priority and evidence stay deterministic');

const arenaBracketEntrants = [
  'community-a',
  'community-b',
  'owned-entry',
  'community-c',
  'picked-entry',
  'community-d',
  'community-e',
  'community-f',
  'community-g',
  'community-h',
].map((id, index) =>
  makeScribbit({
    id,
    name: `Bracket ${index}`,
    bornDay: 2,
    expiresDay: 5,
  })
);
const arenaBracketSourceIds = arenaBracketEntrants.map((entrant) => entrant.id);
const visibleArenaEntrants = arenaBracket.selectVisibleArenaEntrants({
  entrantsInSourceOrder: arenaBracketEntrants,
  ownedScribbitIdsInRosterOrder: ['missing-owned-entry', 'owned-entry'],
  backedScribbitId: 'picked-entry',
});
assert.deepEqual(
  visibleArenaEntrants.map((entrant) => entrant.id),
  [
    'picked-entry',
    'owned-entry',
    'community-h',
    'community-g',
    'community-f',
    'community-e',
    'community-d',
    'community-c',
  ],
  'the bracket must pin the pick and first roster-ordered entrant before reverse-source entries'
);
assert.deepEqual(
  arenaBracketEntrants.map((entrant) => entrant.id),
  arenaBracketSourceIds,
  'bracket selection must not mutate the server entrant order'
);
assert.deepEqual(
  arenaBracket
    .selectVisibleArenaEntrants({
      entrantsInSourceOrder: [...arenaBracketEntrants, arenaBracketEntrants[0]],
      ownedScribbitIdsInRosterOrder: [],
      backedScribbitId: null,
    })
    .map((entrant) => entrant.id),
  [
    'community-a',
    'community-h',
    'community-g',
    'community-f',
    'community-e',
    'community-d',
    'picked-entry',
    'community-c',
  ],
  'duplicate IDs must collapse while the eight-entry cap remains absolute'
);
assert.deepEqual(
  arenaBracket.planArenaBackAction({
    entrantId: 'picked-entry',
    ownedScribbitIds: ['picked-entry'],
    backedScribbitId: 'picked-entry',
  }),
  { kind: 'picked', label: '✓ Picked', enabled: false }
);
assert.deepEqual(
  arenaBracket.planArenaBackAction({
    entrantId: 'owned-entry',
    ownedScribbitIds: ['owned-entry'],
    backedScribbitId: 'picked-entry',
  }),
  { kind: 'owned', label: 'Your entry', enabled: false }
);
assert.deepEqual(
  arenaBracket.planArenaBackAction({
    entrantId: 'community-a',
    ownedScribbitIds: [],
    backedScribbitId: 'picked-entry',
  }),
  { kind: 'locked', label: 'Pick locked', enabled: false }
);
const availableBackAction = arenaBracket.planArenaBackAction({
  entrantId: 'community-a',
  ownedScribbitIds: [],
  backedScribbitId: null,
});
assert.deepEqual(availableBackAction, {
  kind: 'available',
  label: 'Back',
  enabled: true,
});
assert.ok(Object.isFrozen(availableBackAction));
pass('Arena bracket ordering and Back actions stay deterministic');

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
assert.equal(
  migratedOldRecord.mood,
  'hungry',
  'old record should hydrate mood'
);
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
pass(
  'legacy element multiplier remains isolated from fixed-tick payload combat'
);

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
  1.015,
  'level bonus should cap at +1.5%'
);
assert.equal(
  sharedBattle.getLevelDamageBonusPercent(arena.MAX_LEVEL),
  1.5,
  'player-facing mastery should disclose the exact capped advantage'
);

const growthBalanceBuilds = [
  { chonk: 25, spike: 25, zip: 25, charm: 25 },
  { chonk: 55, spike: 15, zip: 15, charm: 15 },
  { chonk: 15, spike: 55, zip: 15, charm: 15 },
  { chonk: 15, spike: 15, zip: 55, charm: 15 },
  { chonk: 15, spike: 15, zip: 15, charm: 55 },
];
for (const [buildIndex, stats] of growthBalanceBuilds.entries()) {
  let masteredWins = 0;
  const fightsPerBuild = 600;
  for (let seed = 0; seed < fightsPerBuild / 2; seed += 1) {
    for (const swapSlots of [false, true]) {
      const mastered = makeScribbit({
        id: `mastered-${buildIndex}`,
        name: 'Mastered',
        level: arena.MAX_LEVEL,
        stats,
        element: 'tide',
      });
      const fresh = makeScribbit({
        id: `fresh-${buildIndex}`,
        name: 'Fresh',
        level: 1,
        stats,
        element: 'tide',
      });
      const growthReport = battle.simulate(
        swapSlots ? fresh : mastered,
        swapSlots ? mastered : fresh,
        seed,
        forecast,
        'exhibition'
      );
      const winner =
        growthReport.winner === 'a' ? growthReport.a : growthReport.b;
      if (winner.id === mastered.id) masteredWins += 1;
    }
  }
  assert.ok(
    masteredWins <= fightsPerBuild * 0.6,
    `max mastery must stay at or below 60%; build ${buildIndex} won ${masteredWins}/${fightsPerBuild}`
  );
}
pass('bounded level growth stays below a 60% equal-build win rate');

const lightImpact = battlePresentation.planBattleImpact({
  damage: 8,
  maximumHitPoints: 200,
  critical: false,
  playbackSpeed: 1,
  reduceMotion: false,
});
const criticalImpact = battlePresentation.planBattleImpact({
  damage: 24,
  maximumHitPoints: 200,
  critical: true,
  playbackSpeed: 1,
  reduceMotion: false,
});
assert.ok(
  criticalImpact.hitStopMilliseconds > lightImpact.hitStopMilliseconds &&
    criticalImpact.particleCount > lightImpact.particleCount,
  'critical authored damage should receive stronger presentation than a light hit'
);
const reducedImpact = battlePresentation.planBattleImpact({
  damage: 24,
  maximumHitPoints: 200,
  critical: true,
  playbackSpeed: 1,
  reduceMotion: true,
});
assert.equal(reducedImpact.hitStopMilliseconds, 0);
assert.equal(reducedImpact.cameraShake, 0);
assert.equal(reducedImpact.particleCount, 0);

const openArenaPresentation = battlePresentation.planArenaPresentation({
  viewportWidth: 720,
  arenaTop: 305,
  arenaBottom: 960,
  horizontalPadding: 105,
  verticalPadding: 70,
  currentCombatHalfWidth: 8000,
  currentCombatHalfHeight: 5000,
  startingCombatHalfWidth: 8000,
  startingCombatHalfHeight: 5000,
});
const foldedArenaPresentation = battlePresentation.planArenaPresentation({
  viewportWidth: 720,
  arenaTop: 305,
  arenaBottom: 960,
  horizontalPadding: 105,
  verticalPadding: 70,
  currentCombatHalfWidth: 6200,
  currentCombatHalfHeight: 3800,
  startingCombatHalfWidth: 8000,
  startingCombatHalfHeight: 5000,
});
assert.ok(
  foldedArenaPresentation.currentHalfWidth <
    openArenaPresentation.currentHalfWidth,
  'authoritative arena shrink should visibly close the paper boundary'
);
assert.deepEqual(
  battlePresentation.getMasteryPresentation(arena.MAX_LEVEL),
  {
    level: 5,
    bonusPercent: 1.5,
    auraMarks: 4,
    label: 'Mastered · +1.5% impact',
  },
  'max mastery should be visible but disclose its small exact power edge'
);
pass('battle impact, shrink, reduced-motion, and mastery presentation plans');

const replayBattleLayout = battlePresentation.planReplayBattleLayout({
  viewportWidth: 720,
  viewportHeight: 1280,
});
assert.deepEqual(
  replayBattleLayout,
  {
    viewportWidth: 720,
    viewportHeight: 1280,
    broadcastRailLeft: 12,
    broadcastRailTop: 8,
    broadcastRailWidth: 696,
    broadcastRailHeight: 96,
    pageLeft: 20,
    pageTop: 106,
    pageWidth: 680,
    pageHeight: 1156,
    toolbarY: 56,
    kindLabelX: 28,
    battleKindY: 39,
    serverTruthY: 74,
    kindLabelMaximumWidth: 342,
    soundButtonX: 432,
    speedButtonX: 536,
    skipButtonX: 648,
    soundButtonWidth: 96,
    speedButtonWidth: 96,
    skipButtonWidth: 112,
    fighterPanelTop: 108,
    fighterPanelHeight: 124,
    healthBarY: 177,
    healthBarWidth: 292,
    healthBarFillWidth: 284,
    healthBarHeight: 44,
    healthBarFillHeight: 32,
    fighterNameY: 127,
    fighterMetaY: 151,
    fighterChipY: 214,
    fighterChipHeight: 46,
    battleClockX: 360,
    battleClockY: 177,
    battleClockRadius: 31,
    battleClockProgressWidth: 44,
    arenaTop: 158,
    arenaBottom: 1250,
    arenaHorizontalPadding: 118,
    arenaVerticalPadding: 106,
    tickerX: 360,
    tickerY: 1226,
    tickerWidth: 664,
    tickerHeight: 72,
    tickerTagWidth: 0,
    fighterDisplaySize: 232,
    fighterGhostDisplaySize: 204,
    fighters: {
      a: {
        homeX: 194,
        homeY: 704,
        facing: 1,
        healthBarAnchorX: 24,
        healthBarOriginX: 0,
        nameX: 36,
        nameOriginX: 0,
        levelBadgeX: 292,
        chipCenterX: 170,
        panelLeft: 24,
      },
      b: {
        homeX: 526,
        homeY: 704,
        facing: -1,
        healthBarAnchorX: 696,
        healthBarOriginX: 1,
        nameX: 684,
        nameOriginX: 1,
        levelBadgeX: 428,
        chipCenterX: 550,
        panelLeft: 404,
      },
    },
  },
  'portrait replay layout should remain a symmetric live Inkcast stage'
);
assert.ok(
  replayBattleLayout.soundButtonX + replayBattleLayout.soundButtonWidth / 2 <
    replayBattleLayout.speedButtonX - replayBattleLayout.speedButtonWidth / 2 &&
    replayBattleLayout.speedButtonX + replayBattleLayout.speedButtonWidth / 2 <
      replayBattleLayout.skipButtonX - replayBattleLayout.skipButtonWidth / 2,
  'sound, speed, and skip touch regions must not overlap'
);
assert.ok(
  replayBattleLayout.soundButtonWidth >= 96 &&
    replayBattleLayout.speedButtonWidth >= 96 &&
    replayBattleLayout.skipButtonWidth >= 112,
  'compact replay controls should remain practical at the 320px Reddit viewport'
);
assert.equal(
  replayBattleLayout.fighters.a.healthBarAnchorX,
  720 - replayBattleLayout.fighters.b.healthBarAnchorX,
  'fighter HUD anchors should mirror around the battle clock'
);
assert.ok(
  replayBattleLayout.fighters.a.panelLeft + replayBattleLayout.healthBarWidth <
    replayBattleLayout.battleClockX - replayBattleLayout.battleClockRadius &&
    replayBattleLayout.fighters.b.panelLeft >
      replayBattleLayout.battleClockX + replayBattleLayout.battleClockRadius,
  'fighter HUDs must leave a visible gutter around the server clock'
);
assert.ok(
  replayBattleLayout.arenaBottom - replayBattleLayout.arenaTop >= 1080,
  'live combat should reclaim vertical room from the old turn-card framing'
);
assert.ok(
  replayBattleLayout.arenaHorizontalPadding >=
    replayBattleLayout.fighterDisplaySize / 2,
  'full-width player drawings should remain inside the visible battle page'
);

const crowdedReplayOutcomeStack = battlePresentation.planReplayOutcomeStack({
  viewportHeight: 1280,
  canChooseRival: true,
  canBackContender: true,
  hasFounderOutcome: true,
});
assert.deepEqual(crowdedReplayOutcomeStack, {
  recapY: 813,
  founderOutcomeY: 647,
});
assert.ok(
  crowdedReplayOutcomeStack.founderOutcomeY + 55 + 12 <=
    crowdedReplayOutcomeStack.recapY - 82,
  'founder result voice should sit above the recap instead of covering it'
);

const ownedOpenPickActions = battlePresentation.planReplayPostFightActions({
  canChooseRival: true,
  canBackContender: true,
  returnLabel: 'ARENA ›',
});
assert.deepEqual(ownedOpenPickActions,
  {
    primary: {
      kind: 'rivals',
      label: 'CHOOSE A RIVAL',
      accessibleLabel: 'Choose a rival',
      tone: 'coral',
    },
    secondary: [
      {
        kind: 'practice',
        label: 'PRACTICE',
        accessibleLabel: 'Practice',
        tone: 'ghost',
      },
      {
        kind: 'backContender',
        label: 'PICK',
        accessibleLabel: "Pick tonight's winner",
        tone: 'ghost',
      },
      {
        kind: 'return',
        label: 'ARENA ›',
        accessibleLabel: 'ARENA',
        tone: 'ghost',
      },
    ],
    buttonHeight: 100,
    secondaryRowOffset: 114,
  }
);
assert.ok(
  ownedOpenPickActions.secondaryRowOffset -
    ownedOpenPickActions.buttonHeight >=
    12,
  'primary and secondary post-fight rows must retain a visible mobile gap'
);
assert.deepEqual(
  battlePresentation.planReplayPostFightActions({
    canChooseRival: true,
    canBackContender: false,
    returnLabel: 'ARENA ›',
  }),
  {
    primary: {
      kind: 'rivals',
      label: 'CHOOSE A RIVAL',
      accessibleLabel: 'Choose a rival',
      tone: 'coral',
    },
    secondary: [
      {
        kind: 'practice',
        label: 'PRACTICE',
        accessibleLabel: 'Practice',
        tone: 'ghost',
      },
      {
        kind: 'return',
        label: 'ARENA ›',
        accessibleLabel: 'ARENA',
        tone: 'ghost',
      },
    ],
    buttonHeight: 100,
    secondaryRowOffset: 114,
  },
  'an already-backed player should keep Rival primary and two clear utilities'
);
assert.deepEqual(
  battlePresentation.planReplayPostFightActions({
    canChooseRival: false,
    canBackContender: true,
    returnLabel: 'SCOUT ›',
  }),
  {
    primary: {
      kind: 'backContender',
      label: "PICK TONIGHT'S WINNER",
      accessibleLabel: "Pick tonight's winner",
      tone: 'gold',
    },
    secondary: [
      {
        kind: 'return',
        label: 'SCOUT ›',
        accessibleLabel: 'SCOUT',
        tone: 'ghost',
      },
    ],
    buttonHeight: 100,
    secondaryRowOffset: 114,
  },
  'spectators should see one clear pick action and a secondary return'
);
assert.deepEqual(
  battlePresentation.planReplayPostFightActions({
    canChooseRival: false,
    canBackContender: false,
    returnLabel: 'SCRAPBOOK ›',
  }),
  {
    primary: {
      kind: 'return',
      label: 'SCRAPBOOK ›',
      accessibleLabel: 'SCRAPBOOK',
      tone: 'ghost',
    },
    secondary: [],
    buttonHeight: 100,
    secondaryRowOffset: null,
  },
  'a resolved replay should collapse to one truthful return action'
);

assert.deepEqual(
  battlePresentation.planReplayHitPointBar({
    hitPoints: 50,
    maximumHitPoints: 100,
    fullWidth: replayBattleLayout.healthBarFillWidth,
  }),
  { ratio: 0.5, width: 142, useDangerColor: false }
);
assert.equal(
  battlePresentation.planReplayHitPointBar({
    hitPoints: 28,
    maximumHitPoints: 100,
    fullWidth: replayBattleLayout.healthBarFillWidth,
  }).useDangerColor,
  true,
  '28% HP should enter the danger color exactly at the existing threshold'
);
assert.equal(
  battlePresentation.planReplayHitPointBar({
    hitPoints: 29,
    maximumHitPoints: 100,
    fullWidth: replayBattleLayout.healthBarFillWidth,
  }).useDangerColor,
  false
);
assert.equal(
  battlePresentation.planReplayHitPointBar({
    hitPoints: 999,
    maximumHitPoints: 100,
    fullWidth: replayBattleLayout.healthBarFillWidth,
  }).width,
  replayBattleLayout.healthBarFillWidth,
  'overflow HP should clamp to the authored bar width'
);
assert.equal(
  battlePresentation.planReplayHitPointBar({
    hitPoints: 50,
    maximumHitPoints: 0,
    fullWidth: replayBattleLayout.healthBarFillWidth,
  }).width,
  0,
  'invalid maximum HP should fail closed to an empty bar'
);

assert.deepEqual(
  battlePresentation.planReplayBattleClock({
    currentTick: 0,
    completedTick: 500,
    tickRate: 20,
  }),
  {
    remainingSeconds: 25,
    label: '25',
    remainingRatio: 1,
    urgent: false,
  }
);
assert.equal(
  battlePresentation.planReplayBattleClock({
    currentTick: 401,
    completedTick: 500,
    tickRate: 20,
  }).urgent,
  true,
  'the final five seconds should make the fixed-tick clock urgent'
);
assert.equal(
  battlePresentation.planReplayBattleClock({
    currentTick: 500,
    completedTick: 500,
    tickRate: 20,
  }).label,
  '00'
);
assert.equal(
  battlePresentation.planReplayBattleClock({
    currentTick: Number.NaN,
    completedTick: Number.NaN,
    tickRate: 0,
  }).label,
  '01',
  'invalid clock inputs should fail closed to one bounded second'
);
assert.equal(
  battlePresentation.getReplayBattleKindLabel('exhibition'),
  'EXHIBITION SPAR'
);
assert.equal(
  battlePresentation.getReplayBattleKindLabel('rumble'),
  'DAILY RUMBLE'
);
assert.equal(
  battlePresentation.getReplayBattleKindLabel('boss'),
  'CHAMPION CHALLENGE'
);

const replayArenaPresentation = battlePresentation.planArenaPresentation({
  viewportWidth: replayBattleLayout.viewportWidth,
  arenaTop: replayBattleLayout.arenaTop,
  arenaBottom: replayBattleLayout.arenaBottom,
  horizontalPadding: replayBattleLayout.arenaHorizontalPadding,
  verticalPadding: replayBattleLayout.arenaVerticalPadding,
  currentCombatHalfWidth: 8000,
  currentCombatHalfHeight: 5000,
  startingCombatHalfWidth: 8000,
  startingCombatHalfHeight: 5000,
});
assert.deepEqual(
  {
    centerX: replayArenaPresentation.centerX,
    centerY: replayArenaPresentation.centerY,
    maximumHalfWidth: replayArenaPresentation.maximumHalfWidth,
    maximumHalfHeight: replayArenaPresentation.maximumHalfHeight,
  },
  { centerX: 360, centerY: 704, maximumHalfWidth: 242, maximumHalfHeight: 440 },
  'all replay movement and effects should share the clipping-safe arena projection'
);
pass(
  'live paper arena layout, HP bars, clock, outcome stack, and arena projection'
);

const timeoutRecapReport = mockCombatBundle.simulate(
  { ...debugFixtureFighterByPower.colorburst, element: 'ember' },
  debugFixtureFighterByPower.inkquake,
  74,
  debugFixtureForecast,
  'exhibition'
);
assert.equal(
  timeoutRecapReport.simulation.result.reason,
  'timeout_hp_percentage'
);
assert.deepEqual(
  battleRecap.planBattleRecap(timeoutRecapReport.simulation),
  {
    winnerSlot: 'a',
    loserSlot: 'b',
    winnerName: 'Prism Pop',
    loserName: 'Heavy Page',
    winnerElement: 'ember',
    headline: 'TIME • Prism Pop WINS ON INK LEFT',
    verdictLine: '20.0s • INK LEFT 90/185 vs 56/225',
    tapeLine: '169 TOTAL DAMAGE • WILDFIRE BLOOM',
    highlight: {
      label: 'BIGGEST SPLAT',
      text: 'Wildfire Bloom CRIT • 65 to Heavy Page',
    },
    partial: false,
    finishPresentation: 'decision',
    finishSound: 'bell',
  },
  'timeout recap should explain the exact decision without pretending it was a knockout'
);
const timeoutRecapPlan = battleRecap.planBattleRecap(
  timeoutRecapReport.simulation
);
assert.equal(
  battleRecap.formatBattleRecapLead(timeoutRecapPlan, 'viewer_win'),
  'YOU WON'
);
assert.equal(
  battleRecap.formatBattleRecapLead(timeoutRecapPlan, 'viewer_loss'),
  'YOU LOST'
);
assert.equal(
  battleRecap.formatBattleRecapLead(timeoutRecapPlan, 'spectator'),
  'PRISM POP WON',
  'compact results should lead with an immediate viewer-relative verdict'
);

const knockoutRecapReport = mockCombatBundle.simulate(
  { ...debugFixtureFighterByPower.inkquake, element: 'storm' },
  debugFixtureFighterByPower.nib_halo,
  1,
  debugFixtureForecast,
  'exhibition'
);
const knockoutRecap = battleRecap.planBattleRecap(
  knockoutRecapReport.simulation
);
assert.deepEqual(
  {
    headline: knockoutRecap.headline,
    verdictLine: knockoutRecap.verdictLine,
    tapeLine: knockoutRecap.tapeLine,
    highlight: knockoutRecap.highlight,
    finishPresentation: knockoutRecap.finishPresentation,
    finishSound: knockoutRecap.finishSound,
  },
  {
    headline: 'KO • Heavy Page WINS',
    verdictLine: '17.7s • INK LEFT 12/225 vs 0/185',
    tapeLine: '170 TOTAL DAMAGE • THUNDERFOLD',
    highlight: {
      label: 'FINAL SPLAT',
      text: 'Thunderfold • 16 to Needle Star',
    },
    finishPresentation: 'knockout',
    finishSound: 'knockout',
  },
  'knockout recap should use the terminal damage event rather than the largest earlier hit'
);

const doubleKnockoutRecapReport = mockCombatBundle.simulate(
  { ...debugFixtureFighterByPower.nib_halo, element: 'tide' },
  debugFixtureFighterByPower.smearstep,
  2,
  debugFixtureForecast,
  'exhibition'
);
assert.equal(
  doubleKnockoutRecapReport.simulation.result.reason,
  'double_knockout',
  'production seed should exercise a real simultaneous finish'
);
assert.deepEqual(
  doubleKnockoutRecapReport.simulation.result.fighters.map(
    (fighter) => fighter.finalHitPoints
  ),
  [0, 0],
  'a real double knockout must end with both authoritative fighters at zero'
);
const doubleKnockoutRecap = battleRecap.planBattleRecap(
  doubleKnockoutRecapReport.simulation
);
assert.equal(doubleKnockoutRecap.finishPresentation, 'double-knockout');
assert.equal(doubleKnockoutRecap.finishSound, 'knockout');
assert.ok(doubleKnockoutRecap.headline.startsWith('DOUBLE KO •'));

const falseDoubleKnockoutTranscript = structuredClone(
  timeoutRecapReport.simulation
);
falseDoubleKnockoutTranscript.result.reason = 'double_knockout';
falseDoubleKnockoutTranscript.timeline.at(-1).reason = 'double_knockout';
assert.equal(
  continuousReplay.getUsableBattleTranscript(falseDoubleKnockoutTranscript),
  undefined,
  'a live-HP timeout cannot be relabeled as a double knockout'
);

const damageDecisionTranscript = structuredClone(timeoutRecapReport.simulation);
damageDecisionTranscript.result.reason = 'timeout_damage_dealt';
damageDecisionTranscript.result.winner = 'a';
damageDecisionTranscript.result.loser = 'b';
damageDecisionTranscript.result.fighters[0].finalHitPoints =
  damageDecisionTranscript.result.fighters[0].maxHitPoints;
damageDecisionTranscript.result.fighters[0].hitPointPermille = 1_000;
damageDecisionTranscript.result.fighters[0].damageDealt = 101;
damageDecisionTranscript.result.fighters[1].finalHitPoints =
  damageDecisionTranscript.result.fighters[1].maxHitPoints;
damageDecisionTranscript.result.fighters[1].hitPointPermille = 1_000;
damageDecisionTranscript.result.fighters[1].damageDealt = 100;
const damageDecisionFinalCheckpoint =
  damageDecisionTranscript.checkpoints.at(-1);
assert.ok(damageDecisionFinalCheckpoint);
damageDecisionFinalCheckpoint.fighters[0].hitPoints =
  damageDecisionTranscript.result.fighters[0].maxHitPoints;
damageDecisionFinalCheckpoint.fighters[1].hitPoints =
  damageDecisionTranscript.result.fighters[1].maxHitPoints;
damageDecisionTranscript.timeline.at(-1).winner = 'a';
damageDecisionTranscript.timeline.at(-1).reason = 'timeout_damage_dealt';
assert.equal(
  continuousReplay.getUsableBattleTranscript(damageDecisionTranscript),
  damageDecisionTranscript,
  'an equal-percentage timeout may truthfully resolve on damage'
);
assert.equal(
  battleRecap.planBattleRecap(damageDecisionTranscript).headline,
  'TIME • INK % TIED • Prism Pop WINS ON DAMAGE',
  'damage-tiebreak copy must describe equal HP percentage, not equal raw HP'
);

const truncatedRecapTranscript = structuredClone(timeoutRecapReport.simulation);
truncatedRecapTranscript.eventsTruncated = true;
truncatedRecapTranscript.timeline = [
  truncatedRecapTranscript.timeline[0],
  truncatedRecapTranscript.timeline.at(-1),
];
assert.deepEqual(
  battleRecap.planBattleRecap(truncatedRecapTranscript).highlight,
  {
    label: 'SERVER RESULT',
    text: 'Play-by-play limited; result and final HP preserved.',
  },
  'truncated recaps must not invent a biggest or final hit'
);

for (const [reason, presentation, sound, headlineFragment] of [
  ['knockout', 'knockout', 'knockout', 'KO •'],
  ['double_knockout', 'double-knockout', 'knockout', 'DOUBLE KO'],
  ['timeout_hp_percentage', 'decision', 'bell', 'WINS ON INK LEFT'],
  ['timeout_damage_dealt', 'decision', 'bell', 'WINS ON DAMAGE'],
  ['timeout_stable_tiebreak', 'decision', 'bell', 'DEAD EVEN'],
]) {
  const reasonTranscript = structuredClone(timeoutRecapReport.simulation);
  reasonTranscript.result.reason = reason;
  const reasonPlan = battleRecap.planBattleRecap(reasonTranscript);
  assert.equal(reasonPlan.finishPresentation, presentation);
  assert.equal(reasonPlan.finishSound, sound);
  assert.ok(reasonPlan.headline.includes(headlineFragment));
}

const tieHighlightTranscript = structuredClone(timeoutRecapReport.simulation);
const tieStart = tieHighlightTranscript.timeline[0];
const tieEnd = tieHighlightTranscript.timeline.at(-1);
tieHighlightTranscript.timeline = [
  tieStart,
  {
    tick: 10,
    kind: 'damage',
    sourceFighter: 'a',
    targetFighter: 'b',
    source: 'contact',
    amount: 30,
    targetHitPoints: 180,
    critical: false,
    position: { x: 0, y: 0 },
  },
  {
    tick: 11,
    kind: 'damage',
    sourceFighter: 'a',
    targetFighter: 'b',
    source: 'colorburst_echo',
    amount: 30,
    targetHitPoints: 150,
    critical: false,
    position: { x: 0, y: 0 },
  },
  tieEnd,
];
assert.equal(
  battleRecap.planBattleRecap(tieHighlightTranscript).highlight?.text,
  'body check • 30 to Heavy Page',
  'equal recap hits should resolve to the earliest authoritative event'
);
tieHighlightTranscript.timeline[1].amount = 29;
assert.equal(
  battleRecap.planBattleRecap(tieHighlightTranscript).highlight?.text,
  'Wildfire Bloom Echo • 30 to Heavy Page',
  'Colorburst echo attribution requires an actual echo damage event'
);
pass('authoritative Inkcast recap copy and finish semantics');

const journalDecisionWin = structuredClone(timeoutRecapReport);
journalDecisionWin.id = 'journal-day-9-exhibition';
journalDecisionWin.day = 9;
journalDecisionWin.kind = 'exhibition';
journalDecisionWin.a.artist = 'mock_player';
journalDecisionWin.b.artist = 'paper_guest';
const journalDecisionSnapshot = structuredClone(journalDecisionWin);
const journalDecisionPlan = battleJournal.planBattleJournalEntry(
  journalDecisionWin,
  ' MOCK_PLAYER ',
  []
);
assert.deepEqual(journalDecisionWin, journalDecisionSnapshot);
assert.ok(Object.isFrozen(journalDecisionPlan));
assert.equal(journalDecisionPlan.perspective, 'win');
assert.equal(journalDecisionPlan.finishKind, 'decision');
assert.equal(journalDecisionPlan.finishLabel, 'DECISION');
assert.equal(journalDecisionPlan.replayMotionAvailable, true);
assert.equal(journalDecisionPlan.kindDayLabel, 'EXHIBITION SPAR • DAY 9');
assert.equal(
  journalDecisionPlan.highlightLine,
  'BIGGEST SPLAT • Wildfire Bloom CRIT • 65 to Heavy Page'
);
assert.equal(
  journalDecisionPlan.metadataLine,
  '20.0s • INK LEFT 90/185 vs 56/225'
);

const journalKnockoutLoss = structuredClone(knockoutRecapReport);
journalKnockoutLoss.id = 'journal-day-9-rumble';
journalKnockoutLoss.day = 9;
journalKnockoutLoss.kind = 'rumble';
journalKnockoutLoss.a.artist = 'paper_guest';
journalKnockoutLoss.b.artist = 'mock_player';
const journalKnockoutPlan = battleJournal.planBattleJournalEntry(
  journalKnockoutLoss,
  'mock_player',
  []
);
assert.equal(
  journalKnockoutPlan.perspective,
  'loss',
  'artist identity should preserve owned loss perspective after a Scribbit leaves the living roster'
);
assert.equal(journalKnockoutPlan.finishKind, 'knockout');
assert.match(journalKnockoutPlan.highlightLine, /^FINAL SPLAT •/);

assert.equal(
  battleJournal.isScribbitOwnedByViewer(journalKnockoutLoss.a, 'someone_else', [
    journalKnockoutLoss.a.id,
  ]),
  true,
  'a living owned id should remain the strongest ownership proof'
);
assert.equal(
  battleJournal.isScribbitOwnedByViewer(
    journalKnockoutLoss.b,
    ' MOCK_PLAYER ',
    []
  ),
  true,
  'normalized artist identity should survive historical replay'
);

const journalBossReport = structuredClone(doubleKnockoutRecapReport);
journalBossReport.id = 'journal-day-9-boss';
journalBossReport.day = 9;
journalBossReport.kind = 'boss';
journalBossReport.a.artist = 'mock_player';
journalBossReport.b.artist = 'paper_guest';

const journalArchivedReport = structuredClone(journalDecisionWin);
journalArchivedReport.id = 'journal-day-8-archived';
journalArchivedReport.day = 8;
delete journalArchivedReport.simulation;
delete journalArchivedReport.events;
const archivedJournalPlan = battleJournal.planBattleJournalEntry(
  journalArchivedReport,
  'mock_player',
  []
);
assert.deepEqual(
  {
    finishKind: archivedJournalPlan.finishKind,
    finishLabel: archivedJournalPlan.finishLabel,
    highlightLine: archivedJournalPlan.highlightLine,
    replayMotionAvailable: archivedJournalPlan.replayMotionAvailable,
  },
  {
    finishKind: 'archived',
    finishLabel: 'ARCHIVED RESULT',
    highlightLine: null,
    replayMotionAvailable: false,
  }
);
assert.match(archivedJournalPlan.metadataLine, /RESULT SAVED/);

const unorderedJournalReports = [
  journalArchivedReport,
  journalDecisionWin,
  journalKnockoutLoss,
  journalBossReport,
];
const unorderedJournalIds = unorderedJournalReports.map((report) => report.id);
const orderedJournalReports = battleJournal.orderBattleJournalReports(
  unorderedJournalReports
);
assert.ok(Object.isFrozen(orderedJournalReports));
assert.deepEqual(
  orderedJournalReports.map((report) => report.id),
  [
    journalKnockoutLoss.id,
    journalBossReport.id,
    journalDecisionWin.id,
    journalArchivedReport.id,
  ],
  'each day should pin Rumble and Champion pages before repeated exhibitions'
);
assert.deepEqual(
  unorderedJournalReports.map((report) => report.id),
  unorderedJournalIds,
  'Battle Scrapbook ordering must not mutate API history'
);

const journalSummary = battleJournal.planBattleJournalSummary(
  orderedJournalReports,
  'mock_player',
  []
);
assert.deepEqual(journalSummary, {
  savedCount: 4,
  ownedWins: 3,
  ownedLosses: 1,
  knockoutCount: 2,
  decisionCount: 1,
  archivedCount: 1,
  savedLine: '4 SAVED BATTLES',
  recordLine: 'YOUR REEL • 3 W–1 L',
  finishLine: '2 KO • 1 DECISION • 1 ARCHIVED',
});
assert.ok(Object.isFrozen(journalSummary));
for (const plan of [
  journalDecisionPlan,
  journalKnockoutPlan,
  archivedJournalPlan,
]) {
  for (const value of Object.values(plan)) {
    if (typeof value === 'string') assert.ok(value.length <= 90);
  }
}
pass('Battle Scrapbook preserves authoritative story and historical ownership');

const masteredSparOpponent = speciesCore.chooseFoundingSparOpponent(
  { element: 'ember', level: arena.MAX_LEVEL },
  41
);
assert.equal(
  masteredSparOpponent.level,
  3,
  'practice matchmaking should choose the closest available level'
);
const freshSparOpponent = speciesCore.chooseFoundingSparOpponent(
  { element: 'ember', level: 1 },
  41
);
assert.equal(
  freshSparOpponent.level,
  1,
  'a fresh Scribbit should practice against another fresh-level fighter'
);
assert.notEqual(
  freshSparOpponent.element,
  'ember',
  'practice should vary element only after level fairness is satisfied'
);
assert.equal(
  speciesCore.chooseFoundingSparOpponent({ element: 'ember', level: 1 }, 41).id,
  freshSparOpponent.id,
  'practice matchmaking should remain deterministic for a fixed seed'
);
pass('spar matchmaking prefers closest level before element variety');

const freshRivalSlate = speciesCore.selectFoundingSparRivalSlate(
  { element: 'ember', level: 1 },
  90210
);
assert.equal(
  freshRivalSlate.length,
  3,
  'a normal founding roster should expose three rival choices'
);
assert.equal(
  new Set(freshRivalSlate.map((rival) => rival.id)).size,
  freshRivalSlate.length,
  'the rival slate must never repeat a founder'
);
assert.deepEqual(
  speciesCore.selectFoundingSparRivalSlate(
    { element: 'ember', level: 1 },
    90210
  ),
  freshRivalSlate,
  'the same challenger and server seed should reproduce the same slate'
);
const closestFreshFounderDistance = Math.min(
  ...speciesCore.foundingScribbits.map((rival) => Math.abs(rival.level - 1))
);
assert.ok(
  freshRivalSlate.every(
    (rival) => Math.abs(rival.level - 1) <= closestFreshFounderDistance + 1
  ),
  'rival variety may widen matchmaking by at most one level-distance tier'
);
assert.ok(
  new Set(
    freshRivalSlate.map((rival) =>
      combatSelection.selectPrimaryPower(rival.stats)
    )
  ).size >= 2,
  'the draft should expose multiple readable Shape Power styles'
);
const plannedRivals = sparRivals.planSparRivalCards(
  { level: 1 },
  freshRivalSlate,
  debugFixtureForecast
);
assert.equal(plannedRivals.length, freshRivalSlate.length);
assert.ok(
  plannedRivals.every((plan, index) => {
    const definition = founders.getFoundingScribbitDefinition(plan.id);
    return (
      plan.id === freshRivalSlate[index]?.id &&
      plan.signatureName.length > 0 &&
      plan.epithet === definition?.personality.epithet &&
      plan.challengeLine === definition?.personality.challengeLine &&
      plan.powerLine.includes(
        definition?.personality.epithet.toUpperCase() ?? ''
      ) &&
      plan.levelLine.length > 0 &&
      plan.forecastLine.startsWith('FORECAST ')
    );
  }),
  'rival cards must pair truthful build data with canonical founder identity'
);
assert.equal(
  sparRivals.formatSparRivalDraftSummary(null),
  'Arena founders • server-picked fair slate'
);
assert.equal(
  sparRivals.formatSparRivalDraftSummary({
    label: 'FINAL SPLAT',
    text: 'Rootquake • 42 to Paper Spark',
  }),
  'LAST BOUT • FINAL SPLAT: Rootquake • 42 to Paper Spark',
  'the next rival choice should preserve the exact previous-bout highlight'
);
const pinnedRivalSlate = speciesCore.selectFoundingSparRivalSlate(
  { element: 'ember', level: 1 },
  90210,
  3,
  {
    preferredFounderId: secondChronicleFounder.id,
    excludedFounderIds: [chronicleFounder.id],
  }
);
assert.equal(
  pinnedRivalSlate[0]?.id,
  secondChronicleFounder.id,
  'the active founder must remain the first future Rival Draft card'
);
assert.equal(
  pinnedRivalSlate.some((rival) => rival.id === chronicleFounder.id),
  false,
  'resolved founders should yield draft slots while unresolved founders remain'
);
assert.equal(
  speciesCore.chooseFoundingSparOpponent(
    { element: 'ember', level: 1 },
    90210,
    { preferredFounderId: secondChronicleFounder.id }
  ).id,
  secondChronicleFounder.id,
  'quick spar should continue the active server-owned rivalry'
);
const activeRivalCard = sparRivals.planSparRivalCard(
  { level: 1 },
  pinnedRivalSlate[0],
  debugFixtureForecast,
  {
    activeRivalry: {
      founderId: secondChronicleFounder.id,
      startedDay: 7,
      playerWins: 1,
      founderWins: 1,
    },
    resolvedRivalries: [],
    lastAdvancedDay: 8,
  },
  9
);
assert.equal(activeRivalCard.rivalryState, 'active-ready');
assert.equal(activeRivalCard.buttonLabel, 'CONTINUE →');
assert.match(activeRivalCard.rivalryLine, /PAGE 3 · LAST LEAF HOME/);
const waitingRivalCard = sparRivals.planSparRivalCard(
  { level: 1 },
  pinnedRivalSlate[0],
  debugFixtureForecast,
  {
    activeRivalry: {
      founderId: secondChronicleFounder.id,
      startedDay: 7,
      playerWins: 1,
      founderWins: 0,
    },
    resolvedRivalries: [],
    lastAdvancedDay: 9,
  },
  9
);
assert.equal(waitingRivalCard.rivalryState, 'active-waiting');
assert.equal(waitingRivalCard.buttonLabel, 'DAY 10');
assert.equal(waitingRivalCard.rivalryLine, 'YOU 1–0 · PAGE 2\nRETURNS DAY 10');
const freshRivalEpisode = founderRivalEpisodes.getFounderRivalEpisodePage(
  freshRivalSlate[0].id,
  1
);
assert.ok(freshRivalEpisode);
assert.match(
  plannedRivals[0].rivalryLine,
  new RegExp(`PAGE 1 · ${freshRivalEpisode.title}`)
);
const communityExhibitionCard = sparRivals.planSparRivalCard(
  { level: 1 },
  { ...freshRivalSlate[0], id: 'community-rival' },
  debugFixtureForecast
);
assert.equal(communityExhibitionCard.rivalryState, 'exhibition');
assert.equal(
  communityExhibitionCard.rivalryLine,
  'EXHIBITION\nNO RIVAL THREAD',
  'a non-founder must never advertise a founder episode or startable thread'
);
const nextThreadBlockedTodayCard = sparRivals.planSparRivalCard(
  { level: 1 },
  freshRivalSlate[0],
  debugFixtureForecast,
  {
    activeRivalry: null,
    resolvedRivalries: [],
    lastAdvancedDay: 9,
  },
  9
);
assert.equal(nextThreadBlockedTodayCard.rivalryState, 'available-waiting');
assert.equal(nextThreadBlockedTodayCard.buttonLabel, 'DAY 10');
assert.equal(nextThreadBlockedTodayCard.buttonEnabled, false);
assert.match(nextThreadBlockedTodayCard.rivalryLine, /MARGIN WRITTEN TODAY/);
freshRivalSlate[0].stats.chonk = 999;
assert.notEqual(
  speciesCore.selectFoundingSparRivalSlate(
    { element: 'ember', level: 1 },
    90210
  )[0]?.stats.chonk,
  999,
  'callers must not mutate the founding roster through a returned slate'
);
pass(
  'server-authored rival draft stays fair, varied, deterministic, and cloned'
);

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
  Object.values(arena.CAPSULE_RARITY_PERCENTAGES).reduce(
    (total, percentage) => total + percentage,
    0
  ),
  100,
  'published capsule rarity percentages should cover the full roll'
);
const newPlayerDailyInk =
  arena.INK_REWARDS.dailyDraw + arena.INK_REWARDS.care * 3;
assert.equal(
  newPlayerDailyInk,
  arena.CAPSULE_FIRST_DAILY_COST,
  'drawing and caring for one new Scribbit should fund the daily discounted pull'
);
assert.ok(
  newPlayerDailyInk + arena.INK_REWARDS.sparWin < arena.CAPSULE_COST,
  'guaranteed first-day actions should not immediately fund a second full-price pull'
);
pass('daily Ink pacing funds one fair first-session capsule');
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
const entropySelectionOptions = {
  userId: 'entropy-player',
  day: 7,
  pullCount: 3,
  pullsSinceEpic: 0,
};
const fixedEntropyDropOne = inkStore.selectCapsuleDrop({
  ...entropySelectionOptions,
  entropy: 'server-operation-entropy-7',
});
const fixedEntropyDropTwo = inkStore.selectCapsuleDrop({
  ...entropySelectionOptions,
  entropy: 'server-operation-entropy-7',
});
assert.deepEqual(
  fixedEntropyDropOne,
  fixedEntropyDropTwo,
  'the same server entropy should remain deterministic for replayable tests'
);
const entropiedDropIds = new Set(
  Array.from({ length: 32 }, (_, entropyIndex) => {
    return inkStore.selectCapsuleDrop({
      ...entropySelectionOptions,
      entropy: `server-operation-entropy-${entropyIndex}`,
    }).id;
  })
);
assert.ok(
  entropiedDropIds.size > 1,
  'different server operation entropy should vary otherwise identical drops'
);

assert.equal(
  sharedCosmetics.ACCESSORY_CATALOG_ENTRIES.length,
  24,
  'shared cosmetic metadata should contain all 24 accessories'
);
assert.equal(
  sharedCosmetics.PEN_CATALOG_ENTRIES.length,
  8,
  'shared cosmetic metadata should contain all 8 pens'
);
assert.equal(
  sharedCosmetics.TITLE_CATALOG_ENTRIES.length,
  4,
  'shared cosmetic metadata should contain all 4 titles'
);
assert.equal(
  sharedCosmetics.COSMETIC_CATALOG.length,
  36,
  'shared cosmetic metadata should contain exactly 36 entries'
);
assert.equal(
  sharedCosmetics.COSMETIC_BY_ID.size,
  sharedCosmetics.COSMETIC_CATALOG.length,
  'every shared cosmetic id should be unique and indexed'
);

const shapePowerRelicIds = new Set([
  'inkquake-rumble-belt',
  'inkquake-crater-crown',
  'nib-halo-headband',
  'nib-halo-circlet',
  'smearstep-speed-scarf',
  'smearstep-ink-skates',
  'colorburst-rosette',
  'colorburst-prism-crown',
]);
const shapePowerRelics = sharedCosmetics.ACCESSORY_CATALOG_ENTRIES.filter(
  (entry) => shapePowerRelicIds.has(entry.id)
);
assert.equal(
  shapePowerRelics.length,
  shapePowerRelicIds.size,
  'all eight Shape Power Relics should be permanent catalog content'
);
assert.deepEqual(
  Object.fromEntries(
    ['common', 'rare', 'epic'].map((rarity) => [
      rarity,
      shapePowerRelics.filter((entry) => entry.rarity === rarity).length,
    ])
  ),
  { common: 4, rare: 2, epic: 2 },
  'Shape Power Relics should preserve the intended rarity allocation'
);

for (const entry of sharedCosmetics.COSMETIC_CATALOG) {
  assert.equal(
    sharedCosmetics.COSMETIC_BY_ID.get(entry.id),
    entry,
    `shared cosmetic index should resolve ${entry.id}`
  );
  assert.ok(entry.name.length > 0, `${entry.id} should have a name`);
  assert.ok(
    entry.description.length > 0,
    `${entry.id} should have a description`
  );
}

const sharedAccessoryIds = sharedCosmetics.ACCESSORY_CATALOG_ENTRIES.map(
  (entry) => entry.id
).sort();
assert.deepEqual(
  Object.keys(clientAccessories.ACCESSORY_CATALOG).sort(),
  sharedAccessoryIds,
  'client accessory paint catalog should match every shared accessory id'
);
for (const accessory of sharedCosmetics.ACCESSORY_CATALOG_ENTRIES) {
  assert.equal(
    typeof clientAccessories.ACCESSORY_CATALOG[accessory.id]?.paint,
    'function',
    `${accessory.id} should have a client-only vector painter`
  );
  assert.equal(
    clientAccessories.accessoryLabel(accessory.id),
    accessory.label,
    `${accessory.id} label should come from shared metadata`
  );
  assert.equal(
    clientAccessories.isKnownAccessory(accessory.id),
    true,
    `${accessory.id} should be recognized from shared metadata`
  );
}
assert.equal(
  clientAccessories.isKnownAccessory('not-a-real-accessory'),
  false,
  'unknown accessory ids should remain invalid'
);
pass('shared accessory metadata, labels, validation, and paint parity');

const sharedPenIds = sharedCosmetics.PEN_CATALOG_ENTRIES.map(
  (entry) => entry.id
).sort();
assert.deepEqual(
  inkCatalog.INK_PEN_CATALOG.map((entry) => entry.id).sort(),
  sharedPenIds,
  'server-awarded pen ids should match shared cosmetic metadata'
);
assert.deepEqual(
  clientPens.PEN_CATALOG.map((entry) => entry.id).sort(),
  sharedPenIds,
  'client pen ids should match shared cosmetic metadata'
);
for (const sharedPen of sharedCosmetics.PEN_CATALOG_ENTRIES) {
  assert.deepEqual(
    clientPens.PEN_BY_ID.get(sharedPen.id),
    {
      id: sharedPen.id,
      name: sharedPen.name,
      rarity: sharedPen.rarity,
      effect: sharedPen.effect,
      colors: [...sharedPen.colors],
    },
    `${sharedPen.id} client palette should derive from shared metadata`
  );
}
pass('shared, server, and client pen catalog parity');
pass('capsule weighted deterministic pull selection');

let protectedPermanentFixture = null;
for (let fixtureIndex = 0; fixtureIndex < 500; fixtureIndex += 1) {
  const selection = {
    userId: `permanent-protection-${fixtureIndex}`,
    day: 6,
    pullCount: 1,
    pullsSinceEpic: 0,
  };
  const selectedEntry = inkStore.selectCapsuleDrop(selection);
  if (selectedEntry.kind !== 'accessory') {
    protectedPermanentFixture = { selection, selectedEntry };
    break;
  }
}
assert.ok(
  protectedPermanentFixture,
  'fixture search should find a deterministic permanent unlock'
);
const permanentProtectionStorage = createMemoryStorage();
const permanentProtectionUser = protectedPermanentFixture.selection.userId;
await permanentProtectionStorage.set(
  inkStore.getInkKey(permanentProtectionUser),
  String(arena.CAPSULE_FIRST_DAILY_COST)
);
await permanentProtectionStorage.hSet(
  inkStore.getInventoryKey(permanentProtectionUser),
  {
    [protectedPermanentFixture.selectedEntry.id]:
      protectedPermanentFixture.selectedEntry.kind,
  }
);
const protectedPermanentResult = await inkStore.pullCapsuleForUser(
  permanentProtectionStorage,
  permanentProtectionUser,
  protectedPermanentFixture.selection.day
);
assert.equal(
  protectedPermanentResult.status,
  'pulled',
  'duplicate-protected pull should complete normally'
);
assert.equal(
  protectedPermanentResult.pull.rarity,
  protectedPermanentFixture.selectedEntry.rarity,
  'duplicate protection must preserve the originally rolled rarity'
);
assert.notEqual(
  protectedPermanentResult.pull.id,
  protectedPermanentFixture.selectedEntry.id,
  'an owned pen or title must not consume Ink as a dead duplicate'
);
assert.ok(
  protectedPermanentResult.pull.kind === 'accessory' ||
    protectedPermanentResult.pull.isNew,
  'protected replacement must be either a usable accessory copy or a new permanent unlock'
);
pass('capsule permanent-unlock duplicate protection preserves rarity');

const titleEquipStorage = createMemoryStorage();
await titleEquipStorage.hSet(inkStore.getInventoryKey('title-player'), {
  doodler: 'title',
});
assert.equal(
  await inkStore.setEquippedTitle(
    titleEquipStorage,
    'title-player',
    'brushlord'
  ),
  undefined,
  'an undiscovered title cannot be equipped'
);
const equippedTitleInventory = await inkStore.setEquippedTitle(
  titleEquipStorage,
  'title-player',
  'doodler'
);
assert.equal(
  equippedTitleInventory?.equippedTitle,
  'doodler',
  'an owned title should become the active creator signature'
);
assert.equal(
  (await inkStore.loadInventory(titleEquipStorage, 'title-player'))
    .equippedTitle,
  'doodler',
  'equipped creator title should persist in inventory storage'
);
assert.equal(
  (await inkStore.setEquippedTitle(titleEquipStorage, 'title-player', null))
    ?.equippedTitle,
  null,
  'creator title can be removed without losing the permanent unlock'
);
pass('creator title equip requires ownership and persists');

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
await pityStorage.set(
  inkStore.getInkKey('pity-player'),
  String(arena.CAPSULE_COST)
);
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
const poorResult = await inkStore.pullCapsuleForUser(
  poorStorage,
  'poor-player',
  7
);
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
assert.equal(
  exactCostResult.status,
  'pulled',
  'exact-cost pull should complete'
);
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
await operationClaimStorage.set(
  corruptOperationKey,
  '{"pull":{"id":"broken"}}'
);
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

const completedOperationKey =
  'capsule:operation:claim-player:completed-operation';
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
const atomicOperationKey = `capsule:operation:${atomicCapsuleUserId}:${atomicOperationId}`;
const atomicSelectionEntropy = 'server-entropy-atomic-operation-0001';
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
    selectionEntropy: atomicSelectionEntropy,
  }
);
assert.equal(
  atomicCapsuleResult.status,
  'pulled',
  'transactional capsule pull should complete'
);
const atomicReceiptJson = await atomicCapsuleStorage.get(atomicOperationKey);
assert.ok(
  atomicReceiptJson,
  'capsule commit should replace pending claim with a receipt'
);
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
const ambiguousOperationKey = `capsule:operation:${ambiguousCapsuleUserId}:${ambiguousOperationId}`;
const ambiguousPendingValue = 'pending:300000';
const ambiguousSelectionEntropy = 'server-entropy-ambiguous-operation-0001';
const ambiguousStartingInk =
  arena.CAPSULE_FIRST_DAILY_COST + arena.CAPSULE_COST;
await ambiguousCapsuleStorage.set(
  inkStore.getInkKey(ambiguousCapsuleUserId),
  String(ambiguousStartingInk)
);
await ambiguousCapsuleStorage.set(ambiguousOperationKey, ambiguousPendingValue);
await assert.rejects(
  inkStore.pullCapsuleForUser(
    ambiguousCapsuleStorage,
    ambiguousCapsuleUserId,
    ambiguousCapsuleDay,
    {
      operationKey: ambiguousOperationKey,
      expectedPendingValue: ambiguousPendingValue,
      selectionEntropy: ambiguousSelectionEntropy,
    }
  ),
  /Simulated transaction reply loss after commit/,
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
  entropy: ambiguousSelectionEntropy,
});
assert.equal(
  recoveredOperation.response.pull.id,
  expectedAmbiguousDrop.id,
  'recovered receipt should identify the drop that actually committed'
);
assert.equal(
  await inkStore.getInkBalance(ambiguousCapsuleStorage, ambiguousCapsuleUserId),
  ambiguousStartingInk - arena.CAPSULE_FIRST_DAILY_COST,
  'ambiguous response should still charge exactly once'
);
assert.deepEqual(
  await inkStore.loadInventory(ambiguousCapsuleStorage, ambiguousCapsuleUserId),
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
  await inkStore.getInkBalance(ambiguousCapsuleStorage, ambiguousCapsuleUserId),
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
  await scribbitCore.markDailyFlag(
    rollbackFlagStorage,
    'player-two',
    4,
    'entered'
  ),
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
assert.equal(
  firstCare.mood,
  'sleepy',
  'first care action should hydrate sleepy'
);
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
assert.equal(
  nextDayCare.claimed,
  true,
  'care should reset on the next UTC day'
);
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
await scribbitCore.storeScribbit(beliefStorage, 'belief-owner', beliefScribbit);
const beliefWatchKeySets = [];
const originalBeliefWatch = beliefStorage.watch.bind(beliefStorage);
beliefStorage.watch = async (...keys) => {
  beliefWatchKeySets.push(keys);
  return originalBeliefWatch(...keys);
};
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
assert.equal(
  beliefWatchKeySets.some((keys) =>
    keys.includes(scribbitCore.getCommunityBeliefKey())
  ),
  false,
  'votes should not WATCH the global community hash and conflict across Scribbits'
);
assert.equal(
  beliefWatchKeySets.every((keys) =>
    keys.includes(scribbitCore.getScribbitBeliefVersionKey(beliefScribbit.id))
  ),
  true,
  'votes should fence only the target Scribbit belief version'
);
pass('community belief increments are concurrency-safe');

const sparRewardStorage = createMemoryStorage();
const firstSparScribbit = makeScribbit({
  id: 'spar-reward-one',
  name: 'Spar Reward One',
});
const secondSparScribbit = makeScribbit({
  id: 'spar-reward-two',
  name: 'Spar Reward Two',
});
await scribbitCore.storeScribbit(
  sparRewardStorage,
  'spar-owner',
  firstSparScribbit
);
await scribbitCore.storeScribbit(
  sparRewardStorage,
  'spar-owner',
  secondSparScribbit
);
const firstSparWin = await scribbitCore.claimUserDailySparWinReward(
  sparRewardStorage,
  'spar-owner',
  '20260705',
  100
);
assert.equal(
  firstSparWin,
  true,
  'first player win should claim the daily reward'
);
if (firstSparWin) {
  await scribbitCore.awardScribbitXp(
    sparRewardStorage,
    firstSparScribbit.id,
    1,
    '20260705'
  );
  await inkStore.awardInk(
    sparRewardStorage,
    'spar-owner',
    arena.INK_REWARDS.sparWin
  );
}
const secondSparWin = await scribbitCore.claimUserDailySparWinReward(
  sparRewardStorage,
  'spar-owner',
  '20260705',
  200
);
assert.equal(
  secondSparWin,
  false,
  'the same player cannot claim again with a different Scribbit that UTC day'
);
if (secondSparWin) {
  await scribbitCore.awardScribbitXp(
    sparRewardStorage,
    secondSparScribbit.id,
    1,
    '20260705'
  );
  await inkStore.awardInk(
    sparRewardStorage,
    'spar-owner',
    arena.INK_REWARDS.sparWin
  );
}
assert.equal(
  await scribbitCore.claimUserDailySparWinReward(
    sparRewardStorage,
    'another-spar-owner',
    '20260705',
    300
  ),
  true,
  'another player can claim on the same UTC date'
);
const nextDaySparWin = await scribbitCore.claimUserDailySparWinReward(
  sparRewardStorage,
  'spar-owner',
  '20260706',
  400
);
assert.equal(nextDaySparWin, true, 'the player can claim again next UTC day');
if (nextDaySparWin) {
  await scribbitCore.awardScribbitXp(
    sparRewardStorage,
    secondSparScribbit.id,
    1,
    '20260706'
  );
  await inkStore.awardInk(
    sparRewardStorage,
    'spar-owner',
    arena.INK_REWARDS.sparWin
  );
}
assert.equal(
  (
    await scribbitCore.loadScribbit(
      sparRewardStorage,
      firstSparScribbit.id,
      '20260706'
    )
  )?.xp,
  1,
  'the first winning Scribbit should keep its one rewarded XP'
);
assert.equal(
  (
    await scribbitCore.loadScribbit(
      sparRewardStorage,
      secondSparScribbit.id,
      '20260706'
    )
  )?.xp,
  1,
  'a different Scribbit can earn the next UTC day reward'
);
assert.equal(
  await inkStore.getInkBalance(sparRewardStorage, 'spar-owner'),
  arena.INK_REWARDS.sparWin * 2,
  'the player should receive exactly one spar Ink reward per claimed UTC day'
);
pass('daily spar reward is limited per player UTC day');

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
await dailyJob.runNightlyArenaJob(singleNightlyStorage, {
  now: nightlyLockNow,
});
const expectedNightlyRecord = await scribbitCore.loadScribbit(
  singleNightlyStorage,
  'concurrent-lock-entry'
);
const concurrentNightlyStorage = await prepareNightlyLockStorage();
const concurrentNightlyRuns = await Promise.allSettled([
  dailyJob.runNightlyArenaJob(concurrentNightlyStorage, {
    now: nightlyLockNow,
  }),
  dailyJob.runNightlyArenaJob(concurrentNightlyStorage, {
    now: nightlyLockNow,
  }),
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
const dayThreeEntrant = makeScribbit({
  id: 'catch-up-day-three',
  expiresDay: 8,
});
await scribbitCore.storeScribbit(catchUpStorage, 'owner-two', dayTwoEntrant);
await scribbitCore.storeScribbit(
  catchUpStorage,
  'owner-three',
  dayThreeEntrant
);
await scribbitCore.addRumbleEntrant(catchUpStorage, 2, dayTwoEntrant.id);
await scribbitCore.addRumbleEntrant(catchUpStorage, 3, dayThreeEntrant.id);
const caughtUpJob = await dailyJob.runNightlyArenaJob(catchUpStorage, {
  now: new Date(Date.UTC(2026, 6, 7)),
});
assert.equal(caughtUpJob.skipped, false, 'lagged stored day should run');
assert.equal(
  caughtUpJob.newDay,
  4,
  'lagged stored day should catch up to canonical day'
);
assert.equal(
  caughtUpJob.resolvedDay,
  3,
  'catch-up should finish on the latest due rumble'
);
assert.ok(
  caughtUpJob.reportCount > forcedJob.reportCount,
  'catch-up should resolve more than one day'
);
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
  {
    wins: dayTwoRecordAfterRecovery.wins,
    losses: dayTwoRecordAfterRecovery.losses,
  },
  dayTwoRecordBeforeRecovery,
  'outbox recovery must not resolve stored fights twice'
);
const pendingCatchUpResolutions =
  await dailyJob.loadPendingArenaResolutions(catchUpStorage);
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

const replyLossRumbleInkStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
const replyLossRumbleInkPayoutKey = inkStore.getRumbleWinInkPayoutKey(12);
assert.equal(
  await inkStore.claimInkReward(replyLossRumbleInkStorage, {
    payoutKey: replyLossRumbleInkPayoutKey,
    payoutField: 'reply-loss-scribbit',
    userId: 'reply-loss-owner',
    amount: arena.INK_REWARDS.rumbleWin * 2,
    paidAtMs: 500,
  }),
  true,
  'a lost EXEC reply should recover the committed Rumble Ink receipt'
);
assert.equal(
  await inkStore.getInkBalance(replyLossRumbleInkStorage, 'reply-loss-owner'),
  arena.INK_REWARDS.rumbleWin * 2,
  'Rumble Ink should commit with its receipt'
);
assert.equal(
  await inkStore.claimInkReward(replyLossRumbleInkStorage, {
    payoutKey: replyLossRumbleInkPayoutKey,
    payoutField: 'reply-loss-scribbit',
    userId: 'reply-loss-owner',
    amount: arena.INK_REWARDS.rumbleWin * 2,
    paidAtMs: 600,
  }),
  false,
  'retrying a recovered Rumble receipt should not pay again'
);
assert.equal(
  await inkStore.getInkBalance(replyLossRumbleInkStorage, 'reply-loss-owner'),
  arena.INK_REWARDS.rumbleWin * 2,
  'Rumble Ink recovery must remain exactly once'
);

const replyLossBackStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
await clout.claimDailyBack(
  replyLossBackStorage,
  12,
  { userId: 'reply-loss-backer', username: 'Reply Loss Backer' },
  'reply-loss-champion'
);
const replyLossBackPayout = await clout.payCloutForRumble(
  replyLossBackStorage,
  {
    day: 12,
    championScribbitId: 'reply-loss-champion',
    runnerUpScribbitId: null,
    paidAtMs: 700,
  }
);
assert.equal(
  replyLossBackPayout.championBackers,
  1,
  'a lost EXEC reply should recover the committed Back receipt'
);
assert.equal(
  await clout.getUserClout(replyLossBackStorage, 'reply-loss-backer'),
  3,
  'Back Clout should commit with its receipt'
);
assert.equal(
  await inkStore.getInkBalance(replyLossBackStorage, 'reply-loss-backer'),
  arena.INK_REWARDS.backedChampion,
  'champion Back Ink should commit in the same transaction'
);
const retriedReplyLossBackPayout = await clout.payCloutForRumble(
  replyLossBackStorage,
  {
    day: 12,
    championScribbitId: 'reply-loss-champion',
    runnerUpScribbitId: null,
    paidAtMs: 800,
  }
);
assert.equal(
  retriedReplyLossBackPayout.paidBackers,
  0,
  'retrying a recovered Back receipt should not pay again'
);
assert.equal(
  await clout.getUserClout(replyLossBackStorage, 'reply-loss-backer'),
  3,
  'Back Clout recovery must remain exactly once'
);
assert.equal(
  await inkStore.getInkBalance(replyLossBackStorage, 'reply-loss-backer'),
  arena.INK_REWARDS.backedChampion,
  'Back Ink recovery must remain exactly once'
);
pass('Rumble Ink and Back payouts recover atomically after reply loss');

const resultSummary = cloutPayoutJob.resolutions[0];
assert.ok(resultSummary, 'result-comment fixture should resolve one arena day');
const resultCommentText =
  resultComment.formatRumbleResultComment(resultSummary);
assert.match(
  resultCommentText,
  /Rumble #2 results/,
  'result comment should name the resolved day'
);
assert.match(
  resultCommentText,
  new RegExp(resultSummary.champion.name),
  'result comment should name the champion'
);
assert.match(
  resultCommentText,
  /1 champion backers earned \+3 Clout/,
  'result comment should report real Clout payouts'
);
assert.match(
  resultCommentText,
  /Who are you backing/,
  'result comment should invite community discussion'
);
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
const rumbleFounder = speciesCore.findFoundingScribbit('founding-mosswhisk');
assert.ok(rumbleFounder);
const founderStoryResultComment = resultComment.formatRumbleResultComment({
  ...resultSummary,
  champion: rumbleFounder,
});
assert.match(
  founderStoryResultComment,
  new RegExp(mosswhiskDefinition.personality.rumbleLine),
  'a founding champion should carry its canonical voice into the Reddit result'
);
pass('Reddit Rumble result comment uses real resolution data');

const faded = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({
    id: 'fade-me',
    belief: 2,
    wins: 3,
    losses: 4,
    xp: 7,
    accessories: ['beanie', 'retired-pin'],
  }),
  {
    creatorTitle: {
      id: 'doodler',
      name: 'Doodler',
      rarity: 'common',
    },
  }
);
assert.equal(faded.status, 'faded', 'low-belief Scribbits fade at expiry');
assert.deepEqual(
  faded.legacy,
  {
    schemaVersion: 1,
    archivedDay: 4,
    finish: 'faded',
    creatorTitle: {
      id: 'doodler',
      name: 'Doodler',
      rarity: 'common',
    },
    level: 3,
    xp: 7,
    wins: 3,
    losses: 4,
    belief: 2,
    accessories: [
      { id: 'beanie', name: 'Beanie', rarity: 'common' },
      { id: 'retired-pin', name: 'Retired Pin', rarity: 'common' },
    ],
  },
  'expiry should freeze a versioned creator-title and cosmetic snapshot'
);

const legendByBelief = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({ id: 'believe-me', belief: arena.BELIEF_LEGEND_THRESHOLD })
);
assert.equal(
  legendByBelief.status,
  'legend',
  'belief threshold creates a Legend'
);
assert.equal(
  legendByBelief.legacy.finish,
  'believed',
  'belief-created Legends should use the heart-gold finish'
);

const legendByCrown = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({ id: 'crown-me', legendTitle: 'Champion of Day 3' })
);
assert.equal(
  legendByCrown.status,
  'legend',
  'crowned Scribbits become Legends'
);
assert.equal(
  legendByCrown.legacy.finish,
  'champion',
  'canonical Rumble champions should use the crown finish'
);
const customTitleLegend = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({ id: 'old-custom-title', legendTitle: 'Ancient Favorite' })
);
assert.equal(
  customTitleLegend.legacy.finish,
  'believed',
  'unknown historical titles must not be upgraded to Champion'
);
pass('versioned Legacy Card expiry snapshots and finish classification');

const legacylessStoredRecord = {
  ...makeScribbit({ id: 'legacyless-record', status: 'alive' }),
  status: 'faded',
  accessories: ['retired-pin'],
};
delete legacylessStoredRecord.legacy;
const migratedLegacyRecord = scribbitCore.normalizeScribbitRecord(
  legacylessStoredRecord
);
assert.ok(
  migratedLegacyRecord?.legacy,
  'old terminal rows should gain a V1 stamp'
);
assert.equal(
  migratedLegacyRecord.legacy.archivedDay,
  migratedLegacyRecord.expiresDay,
  'migrated archive day should use semantic expiry day'
);
assert.deepEqual(
  migratedLegacyRecord.legacy.accessories,
  [{ id: 'retired-pin', name: 'Retired Pin', rarity: 'common' }],
  'unknown historical accessories should survive catalog removal'
);
const frozenLegacyRecord = scribbitCore.normalizeScribbitRecord({
  ...migratedLegacyRecord,
  wins: 99,
  belief: 99,
});
assert.equal(
  frozenLegacyRecord?.legacy?.wins,
  migratedLegacyRecord.legacy.wins,
  'existing Legacy snapshots must not regenerate from later live fields'
);
assert.equal(
  frozenLegacyRecord?.legacy?.belief,
  migratedLegacyRecord.legacy.belief,
  'terminal Belief should remain frozen in the card'
);
pass('Legacy Card migration preserves frozen and retired metadata');

const legacyDeckStorage = createMemoryStorage();
for (let index = 0; index < 5; index += 1) {
  const archived = scribbitCore.resolveExpiredScribbitStatus(
    makeScribbit({
      id: `legacy-deck-${index + 1}`,
      bornDay: index + 1,
      expiresDay: index + 4,
      belief: index === 4 ? arena.BELIEF_LEGEND_THRESHOLD : index,
    })
  );
  await scribbitCore.storeScribbit(
    legacyDeckStorage,
    'legacy-deck-owner',
    archived
  );
}
await scribbitCore.storeScribbit(
  legacyDeckStorage,
  'legacy-deck-owner',
  makeScribbit({ id: 'legacy-deck-alive', bornDay: 9, expiresDay: 12 })
);
// Simulate a pre-index account so the first read must rebuild from ownership.
await legacyDeckStorage.del(
  scribbitCore.getUserLegacyCardsKey('legacy-deck-owner'),
  legacyCore.getLegacyIndexVersionStorageKey('legacy-deck-owner')
);
const firstLegacyPage = await legacyCore.loadLegacyCardPage(
  legacyDeckStorage,
  'legacy-deck-owner',
  null,
  2
);
assert.equal(firstLegacyPage.cards.length, 2, 'Legacy page should be bounded');
assert.ok(
  firstLegacyPage.nextCursor,
  'Legacy page should issue an Older cursor'
);
assert.match(
  firstLegacyPage.nextCursor,
  /^v2\|/,
  'new Legacy cursors should anchor to a stable archived card'
);
assert.equal(
  Object.hasOwn(firstLegacyPage.cards[0], 'stats'),
  false,
  'Legacy Card DTOs must not be structurally usable as combat fighters'
);
const newlyArchivedCard = scribbitCore.resolveExpiredScribbitStatus(
  makeScribbit({
    id: 'legacy-deck-newest',
    bornDay: 10,
    expiresDay: 13,
  })
);
await scribbitCore.storeScribbit(
  legacyDeckStorage,
  'legacy-deck-owner',
  newlyArchivedCard
);
const secondLegacyPage = await legacyCore.loadLegacyCardPage(
  legacyDeckStorage,
  'legacy-deck-owner',
  firstLegacyPage.nextCursor,
  2
);
assert.equal(
  secondLegacyPage.cards.length,
  2,
  'second Legacy page should continue'
);
assert.equal(
  new Set([
    ...firstLegacyPage.cards.map((card) => card.id),
    ...secondLegacyPage.cards.map((card) => card.id),
  ]).size,
  4,
  'new archives before page two must not duplicate or skip anchored cards'
);
const legacyReturnReceipt = await legacyCore.loadLegacyReturnReceipt(
  legacyDeckStorage,
  'legacy-deck-owner'
);
assert.equal(
  legacyReturnReceipt?.total,
  6,
  'return receipt should count unseen cards'
);
assert.equal(
  legacyReturnReceipt?.cards.length,
  3,
  'return ceremony payload should stay bounded to a three-card stack'
);
const seenThroughDay = await legacyCore.markLegacyCardsSeen(
  legacyDeckStorage,
  'legacy-deck-owner',
  legacyReturnReceipt?.newestArchivedDay ?? 0
);
assert.equal(
  await legacyCore.loadLegacyReturnReceipt(
    legacyDeckStorage,
    'legacy-deck-owner'
  ),
  null,
  'filing the newest archived day should dismiss the return ceremony once'
);
assert.equal(
  await legacyCore.markLegacyCardsSeen(
    legacyDeckStorage,
    'legacy-deck-owner',
    seenThroughDay - 1
  ),
  seenThroughDay,
  'seen cursor must be monotonic'
);
pass('personal Legacy Deck migration, paging, DTO isolation, and seen receipt');

const expiryRepairStorage = createMemoryStorage();
const repairSource = makeScribbit({
  id: 'repair-expiry',
  expiresDay: 4,
  legendTitle: 'Champion of Day 3',
});
await scribbitCore.storeScribbit(
  expiryRepairStorage,
  'repair-owner',
  repairSource
);
// Reproduce a crash after terminal storage but before owner/Legend indexing.
await scribbitCore.updateScribbit(
  expiryRepairStorage,
  scribbitCore.resolveExpiredScribbitStatus(repairSource)
);
const repairedExpiry = await scribbitCore.expireDueScribbits(
  expiryRepairStorage,
  4
);
assert.deepEqual(
  repairedExpiry,
  { faded: 0, legends: 0 },
  'repairing partial expiry must not double-count the transition'
);
assert.notEqual(
  await expiryRepairStorage.zScore(
    scribbitCore.getUserLegacyCardsKey('repair-owner'),
    repairSource.id
  ),
  undefined,
  'expiry retry should repair the owner Legacy index'
);
assert.notEqual(
  await expiryRepairStorage.zScore(
    scribbitCore.getLegendsKey(),
    repairSource.id
  ),
  undefined,
  'expiry retry should repair the public Legend index'
);
assert.equal(
  await expiryRepairStorage.zScore(
    scribbitCore.getExpiringScribbitsKey(),
    repairSource.id
  ),
  undefined,
  'due entry should be removed only after indexes are repaired'
);
pass('partial expiry retries repair indexes idempotently');

const terminalMutationStorage = createMemoryStorage();
await scribbitCore.storeScribbit(
  terminalMutationStorage,
  'terminal-owner',
  faded
);
await scribbitCore.awardScribbitXp(terminalMutationStorage, faded.id, 10);
await scribbitCore.recordBattleOutcomeOnScribbit(
  terminalMutationStorage,
  faded.id,
  'win',
  2
);
await scribbitCore.increaseBelief(terminalMutationStorage, faded);
const unchangedTerminal = await scribbitCore.loadScribbit(
  terminalMutationStorage,
  faded.id
);
assert.equal(unchangedTerminal?.xp, faded.xp, 'terminal XP must stay frozen');
assert.equal(
  unchangedTerminal?.wins,
  faded.wins,
  'terminal record must stay frozen'
);
assert.equal(
  unchangedTerminal?.belief,
  faded.belief,
  'terminal Belief must stay frozen'
);
assert.deepEqual(
  unchangedTerminal?.legacy,
  faded.legacy,
  'terminal mutation attempts must not rewrite the Legacy snapshot'
);
pass('terminal Scribbits reject XP, battle, and Belief mutation');

const expiryRaceStorage = createMemoryStorage();
const expiryRaceSource = makeScribbit({
  id: 'expiry-race-source',
  expiresDay: 4,
});
await scribbitCore.storeScribbit(
  expiryRaceStorage,
  'expiry-race-owner',
  expiryRaceSource
);
const expiryRaceScribbitKey = scribbitCore.getScribbitKey(expiryRaceSource.id);
const originalExpiryRaceWatch = expiryRaceStorage.watch.bind(expiryRaceStorage);
let injectedExpiryBetweenReadAndWrite = false;
expiryRaceStorage.watch = async (...keys) => {
  const transaction = await originalExpiryRaceWatch(...keys);
  const originalExec = transaction.exec.bind(transaction);
  transaction.exec = async () => {
    if (
      !injectedExpiryBetweenReadAndWrite &&
      keys.includes(expiryRaceScribbitKey)
    ) {
      injectedExpiryBetweenReadAndWrite = true;
      await expiryRaceStorage.set(
        expiryRaceScribbitKey,
        JSON.stringify(
          scribbitCore.resolveExpiredScribbitStatus(expiryRaceSource)
        )
      );
      return [];
    }
    return originalExec();
  };
  return transaction;
};
await scribbitCore.awardScribbitXp(expiryRaceStorage, expiryRaceSource.id, 20);
const expiryRaceResult = await scribbitCore.loadScribbit(
  expiryRaceStorage,
  expiryRaceSource.id
);
assert.equal(
  expiryRaceResult?.status,
  'faded',
  'WATCH retry must observe expiry instead of resurrecting an alive record'
);
assert.equal(
  expiryRaceResult?.xp,
  expiryRaceSource.xp,
  'XP queued before expiry must not overwrite terminal state'
);
pass('atomic Scribbit mutation fence prevents expiry resurrection');

const standingRetryStorage = createMemoryStorage();
const standingRetrySource = makeScribbit({
  id: 'standing-retry-source',
  expiresDay: 4,
});
await scribbitCore.storeScribbit(
  standingRetryStorage,
  'standing-retry-owner',
  standingRetrySource
);
await scribbitCore.recordRumbleStandingOnScribbit(
  standingRetryStorage,
  standingRetrySource.id,
  3,
  2,
  1,
  4
);
await scribbitCore.recordRumbleStandingOnScribbit(
  standingRetryStorage,
  standingRetrySource.id,
  3,
  2,
  1,
  4
);
await scribbitCore.expireDueScribbits(standingRetryStorage, 4);
await scribbitCore.recordRumbleStandingOnScribbit(
  standingRetryStorage,
  standingRetrySource.id,
  3,
  2,
  1,
  4
);
const standingRetryResult = await scribbitCore.loadScribbit(
  standingRetryStorage,
  standingRetrySource.id
);
assert.equal(standingRetryResult?.wins, 2, 'Rumble wins should apply once');
assert.equal(standingRetryResult?.losses, 1, 'Rumble losses should apply once');
assert.equal(standingRetryResult?.xp, 4, 'Rumble XP should apply once');
assert.equal(
  standingRetryResult?.legacy?.wins,
  2,
  'post-expiry retry must not rewrite the frozen record'
);
pass('Rumble standing receipt commits atomically and retries once');

const titleRetryStorage = createMemoryStorage();
const titleRetrySource = makeScribbit({
  id: 'title-retry-source',
  expiresDay: 4,
});
await scribbitCore.storeScribbit(
  titleRetryStorage,
  'title-retry-owner',
  titleRetrySource
);
await assert.rejects(
  scribbitCore.expireDueScribbits(titleRetryStorage, 4, {
    getCreatorTitleWatchKey: inkStore.getInventoryKey,
    getCreatorTitle: async () => {
      throw new Error('temporary inventory read failure');
    },
  }),
  /temporary inventory read failure/,
  'title lookup failure should leave expiry retryable'
);
assert.equal(
  (await scribbitCore.loadScribbit(titleRetryStorage, titleRetrySource.id))
    ?.status,
  'alive',
  'failed title lookup must not archive an incomplete card'
);
assert.notEqual(
  await titleRetryStorage.zScore(
    scribbitCore.getExpiringScribbitsKey(),
    titleRetrySource.id
  ),
  undefined,
  'failed title lookup must retain the due repair entry'
);
await scribbitCore.expireDueScribbits(titleRetryStorage, 4, {
  getCreatorTitleWatchKey: inkStore.getInventoryKey,
  getCreatorTitle: async () => ({
    id: 'brushlord',
    name: 'Brushlord',
    rarity: 'rare',
  }),
});
assert.equal(
  (await scribbitCore.loadScribbit(titleRetryStorage, titleRetrySource.id))
    ?.legacy?.creatorTitle?.id,
  'brushlord',
  'successful retry should preserve the equipped creator title'
);
pass('Legacy title snapshot failures retry without data loss');

const titleChangeRaceStorage = createMemoryStorage();
const titleChangeRaceSource = makeScribbit({
  id: 'title-change-race-source',
  expiresDay: 4,
});
await scribbitCore.storeScribbit(
  titleChangeRaceStorage,
  'title-change-race-owner',
  titleChangeRaceSource
);
const titleChangeInventoryKey = inkStore.getInventoryKey(
  'title-change-race-owner'
);
const originalTitleChangeWatch = titleChangeRaceStorage.watch.bind(
  titleChangeRaceStorage
);
let injectedTitleChange = false;
titleChangeRaceStorage.watch = async (...keys) => {
  const transaction = await originalTitleChangeWatch(...keys);
  const originalExec = transaction.exec.bind(transaction);
  transaction.exec = async () => {
    if (!injectedTitleChange && keys.includes(titleChangeInventoryKey)) {
      injectedTitleChange = true;
      return [];
    }
    return originalExec();
  };
  return transaction;
};
let titleSnapshotReadCount = 0;
await scribbitCore.expireDueScribbits(titleChangeRaceStorage, 4, {
  getCreatorTitleWatchKey: inkStore.getInventoryKey,
  getCreatorTitle: async () => {
    titleSnapshotReadCount += 1;
    return titleSnapshotReadCount === 1
      ? { id: 'doodler', name: 'Doodler', rarity: 'common' }
      : { id: 'brushlord', name: 'Brushlord', rarity: 'rare' };
  },
});
assert.equal(
  (
    await scribbitCore.loadScribbit(
      titleChangeRaceStorage,
      titleChangeRaceSource.id
    )
  )?.legacy?.creatorTitle?.id,
  'brushlord',
  'inventory WATCH retry should freeze the title from the successful attempt'
);
assert.equal(
  titleSnapshotReadCount,
  2,
  'concurrent title change should re-read inventory before archiving'
);
pass('Legacy title snapshots retry concurrent inventory changes');

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
  ['pagination-legend-5', 'pagination-legend-stale', 'pagination-legend-4'],
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
await scribbitCore.storeScribbit(
  expiryOrderStorage,
  'owner-one',
  expiringEntrant
);
await expiryOrderStorage.hSet(inkStore.getInventoryKey('owner-one'), {
  doodler: 'title',
});
await inkStore.setEquippedTitle(expiryOrderStorage, 'owner-one', 'doodler');
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
const featuredFinalBout = await battleStore.loadFeaturedRumbleReport(
  expiryOrderStorage,
  expiringEntrant.id,
  2
);
assert.equal(
  featuredFinalBout?.kind,
  'rumble',
  'nightly resolution should retain each entrant last played bout for receipts'
);
assert.equal(
  featuredFinalBout?.day,
  2,
  'featured Rumble bout should be bound to the resolved day'
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
assert.equal(
  expiredAfterFight.legacy?.wins,
  expiredAfterFight.wins,
  'Legacy Card should freeze the final Rumble win count'
);
assert.equal(
  expiredAfterFight.legacy?.losses,
  expiredAfterFight.losses,
  'Legacy Card should freeze the final Rumble loss count'
);
assert.deepEqual(
  expiredAfterFight.legacy?.creatorTitle,
  { id: 'doodler', name: 'Doodler', rarity: 'common' },
  'nightly expiry should snapshot the currently equipped owned title'
);
await inkStore.setEquippedTitle(expiryOrderStorage, 'owner-one', null);
assert.deepEqual(
  (await scribbitCore.loadScribbit(expiryOrderStorage, expiringEntrant.id))
    ?.legacy?.creatorTitle,
  { id: 'doodler', name: 'Doodler', rarity: 'common' },
  'changing the profile title later must not rewrite the archived signature'
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
  ['happy', 'hungry', 'sleepy', 'pumped'].includes(
    foundingStanding.scribbit.mood
  ),
  'backfill founding Scribbit should carry mood'
);
assert.ok(
  oddResolution.reports.length >= 2,
  'Swiss rumble should emit reports'
);
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
const reportsPerRound = fiveResolution.standings.length / 2;
const expectedSwissRounds = 3;
assert.equal(
  fiveResolution.reports.length,
  reportsPerRound * expectedSwissRounds,
  'every Swiss entrant should fight exactly once in every round'
);
const seenSwissPairs = new Set();
for (let roundIndex = 0; roundIndex < expectedSwissRounds; roundIndex += 1) {
  const roundReports = fiveResolution.reports.slice(
    roundIndex * reportsPerRound,
    (roundIndex + 1) * reportsPerRound
  );
  const seenThisRound = new Set();
  for (const report of roundReports) {
    assert.equal(
      seenThisRound.has(report.a.id) || seenThisRound.has(report.b.id),
      false,
      'a Swiss entrant cannot fight twice in one round'
    );
    seenThisRound.add(report.a.id);
    seenThisRound.add(report.b.id);
    const scoreA = scoreByScribbitId.get(report.a.id) ?? 0;
    const scoreB = scoreByScribbitId.get(report.b.id) ?? 0;
    assert.ok(
      Math.abs(scoreA - scoreB) <= 1,
      'a down-floater may cross only one adjacent Swiss score bracket'
    );
    const pairKey = [report.a.id, report.b.id].sort().join(':');
    assert.equal(
      seenSwissPairs.has(pairKey),
      false,
      `Swiss matchmaking should avoid repeat ${pairKey} in round ${roundIndex + 1}`
    );
    seenSwissPairs.add(pairKey);
    const winnerId = report.winner === 'a' ? report.a.id : report.b.id;
    scoreByScribbitId.set(winnerId, (scoreByScribbitId.get(winnerId) ?? 0) + 1);
  }
  assert.equal(
    seenThisRound.size,
    fiveResolution.standings.length,
    'every entrant should appear once in each Swiss round'
  );
}

const sixEntrantRematchFixture = Array.from({ length: 6 }, (_, index) => {
  return makeScribbit({
    id: `six-rematch-${index}`,
    name: `Six Rematch ${index}`,
    level: (index % 5) + 1,
    element: ['ember', 'tide', 'moss', 'storm'][index % 4],
  });
});
for (let day = 1; day <= 24; day += 1) {
  const resolution = rumble.resolveSwissRumble(
    sixEntrantRematchFixture,
    { ...forecast, day },
    day
  );
  const uniquePairings = new Set(
    resolution.reports.map((report) => {
      return [report.a.id, report.b.id].sort().join(':');
    })
  );
  assert.equal(
    uniquePairings.size,
    resolution.reports.length,
    `six-player Swiss day ${day} should not repeat a pairing when four fresh opponents remain`
  );
}

const levelMatchedEntrants = [1, 1, 2, 2, 5, 5].map((level, index) => {
  return makeScribbit({
    id: `level-match-${index}`,
    name: `Level Match ${index}`,
    level,
    element: index % 2 === 0 ? 'ember' : 'storm',
  });
});
const levelMatchedResolution = rumble.resolveSwissRumble(
  levelMatchedEntrants,
  forecast,
  11
);
assert.equal(
  levelMatchedResolution.standings.length,
  levelMatchedEntrants.length,
  'an already-even bracket must not receive accidental founding backfill'
);
assert.equal(
  levelMatchedResolution.standings.some(
    (standing) => standing.scribbit.isFounding
  ),
  false,
  'founding backfill should appear only when the projected bracket needs it'
);
for (const report of levelMatchedResolution.reports.slice(0, 3)) {
  assert.equal(
    Math.abs(report.a.level - report.b.level),
    0,
    'opening Swiss pairs should use the closest available level before matchup traits'
  );
}
pass(
  'Swiss backfill, fair floaters, closest-level pairs, and rematch avoidance'
);

console.log(
  `Scribbits Arena simulation tests passed (${passedChecks.length} groups): ${passedChecks.join('; ')}.`
);
