import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { PNG } from 'pngjs';

const repoRoot = process.cwd();
const managedTestRoot = process.env.SCRIBBITS_TEST_TEMP_ROOT?.trim();
const testTemporaryRoot = managedTestRoot
  ? join(managedTestRoot, 'legacy')
  : join(tmpdir(), 'scribbits-arena-sim-tests');
const cleanupTestTemporaryRoot = () => {
  rmSync(testTemporaryRoot, { recursive: true, force: true });
};
cleanupTestTemporaryRoot();
mkdirSync(testTemporaryRoot, { recursive: true });
process.once('exit', cleanupTestTemporaryRoot);
const outDir = join(testTemporaryRoot, 'compiled');
const tscPath = join(repoRoot, 'node_modules', '.bin', 'tsc');

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
    'src/shared/elements.ts',
    'src/shared/rivalrunchallenges.ts',
    'src/shared/founders.ts',
    'src/shared/stablehash.ts',
    'src/shared/progression.ts',
    'src/shared/content/deterministic.ts',
    'src/shared/content/replaycommentary.ts',
    'src/shared/content/communitydrawthemes.ts',
    'src/shared/content/doodledares.ts',
    'src/shared/content/gearweek.ts',
    'src/shared/content/forecastblurbs.ts',
    'src/shared/content/scoutnotes.ts',
    'src/shared/scoutnotebook.ts',
    'src/shared/analyzer-core.ts',
    'src/shared/battle.ts',
    'src/shared/accessoryeffects.ts',
    'src/shared/equipment.ts',
    'src/shared/cosmetics.ts',
    'src/shared/gearcombat.ts',
    'src/shared/combat/types.ts',
    'src/shared/combat/shapepowercontent.ts',
    'src/shared/combat/config.ts',
    'src/shared/combat/selection.ts',
    'src/shared/combat/resultvalidation.ts',
    'src/shared/combat/transcriptvalidation.ts',
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
    'src/server/core/submission.ts',
    'src/server/core/dailyJob.ts',
    'src/server/core/founderChronicle.ts',
    'src/server/core/rivalRun.ts',
    'src/server/core/streak.ts',
    'src/server/core/moderation.ts',
    'src/server/core/privacy.ts',
    'src/server/core/nightlyStorageFence.ts',
    'src/server/core/practice.ts',
    'src/server/core/scoutNotebook.ts',
    'src/client/lib/inkmesh.ts',
    'src/client/lib/foundercharacterart.ts',
    'src/client/lib/proceduraldoodleplan.ts',
    'src/client/lib/practicelab.ts',
    'src/client/lib/matchupbrief.ts',
    'src/client/lib/replaycommentary.ts',
    'src/client/lib/inkcastqueue.ts',
    'src/client/lib/sparrivals.ts',
    'src/client/lib/rivalrunpresentation.ts',
    'src/client/lib/continuousreplay.ts',
    'src/client/lib/battlerecap.ts',
    'src/client/lib/battlejournal.ts',
    'src/client/lib/scoutnotebook.ts',
    'src/client/lib/shapepowerpresentation.ts',
    'src/client/lib/weaponfxpresentation.ts',
    'src/client/lib/stickerfxpresentation.ts',
    'src/client/lib/championchallenge.ts',
    'src/client/lib/founderchronicle.ts',
    'src/client/lib/arenabracket.ts',
    'src/client/lib/accessories.ts',
    'src/client/lib/pens.ts',
    'src/client/lib/pressinteraction.ts',
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

const mockCombatTestOutputDirectory = join(testTemporaryRoot, 'mock-combat');
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
const apiContractOutputDirectory = join(testTemporaryRoot, 'api-contract');
rmSync(apiContractOutputDirectory, { recursive: true, force: true });
const { build: buildViteBundle } = await import('vite');
await buildViteBundle({
  root: repoRoot,
  configFile: false,
  logLevel: 'silent',
  resolve: {
    alias: {
      '@devvit/web/server': join(
        repoRoot,
        'scripts',
        'api-contract-runtime.mjs'
      ),
      '@hono/node-server': join(
        repoRoot,
        'scripts',
        'api-contract-node-server.mjs'
      ),
    },
  },
  build: {
    ssr: join(repoRoot, 'scripts', 'api-contract-entry.ts'),
    outDir: apiContractOutputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'api-contract.mjs' },
    },
  },
});
symlinkSync(
  join(repoRoot, 'node_modules'),
  join(apiContractOutputDirectory, 'node_modules'),
  'dir'
);
const productionApiContract = await import(
  `${pathToFileURL(join(apiContractOutputDirectory, 'api-contract.mjs')).href}?test=1`
);
const cleanupApiContractOutput = () => {
  rmSync(apiContractOutputDirectory, { recursive: true, force: true });
};
process.once('exit', cleanupApiContractOutput);
const { createMockBattleReportFactory } =
  await import('./mock-battle-factory.mjs');

const require = createRequire(import.meta.url);
const typescript = require('typescript');
const analyzerCore = require(join(outDir, 'shared', 'analyzer-core.js'));
const sharedBattle = require(join(outDir, 'shared', 'battle.js'));
const sharedAccessoryEffects = require(
  join(outDir, 'shared', 'accessoryeffects.js')
);
const sharedEquipment = require(join(outDir, 'shared', 'equipment.js'));
const sharedCosmetics = require(join(outDir, 'shared', 'cosmetics.js'));
const sharedGearCombat = require(join(outDir, 'shared', 'gearcombat.js'));
const sharedProgression = require(join(outDir, 'shared', 'progression.js'));
const battleArenas = require(join(outDir, 'shared', 'battlearena.js'));
const combatEngineTests = require(
  join(outDir, 'shared', 'combat', 'engine.test.js')
);
const combatEngine = require(join(outDir, 'shared', 'combat', 'engine.js'));
const combatUpgrades = require(join(outDir, 'shared', 'combat', 'upgrades.js'));
const combatConfig = require(join(outDir, 'shared', 'combat', 'config.js'));
const combatSelection = require(
  join(outDir, 'shared', 'combat', 'selection.js')
);
const shapePowerContent = require(
  join(outDir, 'shared', 'combat', 'shapepowercontent.js')
);
const arena = require(join(outDir, 'shared', 'arena.js'));
const sharedElements = require(join(outDir, 'shared', 'elements.js'));
const rivalRunChallenges = require(
  join(outDir, 'shared', 'rivalrunchallenges.js')
);
const founders = require(join(outDir, 'shared', 'founders.js'));
const sharedStableHash = require(join(outDir, 'shared', 'stablehash.js'));
const deterministicContent = require(
  join(outDir, 'shared', 'content', 'deterministic.js')
);
const serverRandom = require(join(outDir, 'server', 'core', 'random.js'));
const replayCommentaryContent = require(
  join(outDir, 'shared', 'content', 'replaycommentary.js')
);
const doodleDareContent = require(
  join(outDir, 'shared', 'content', 'doodledares.js')
);
const communityThemeContent = require(
  join(outDir, 'shared', 'content', 'communitydrawthemes.js')
);
const gearWeekContent = require(
  join(outDir, 'shared', 'content', 'gearweek.js')
);
const forecastFlavor = require(
  join(outDir, 'shared', 'content', 'forecastblurbs.js')
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
const founderChronicleCore = require(
  join(outDir, 'server', 'core', 'founderChronicle.js')
);
const rivalRunCore = require(join(outDir, 'server', 'core', 'rivalRun.js'));
const scribbitCore = require(join(outDir, 'server', 'core', 'scribbit.js'));
const submissionCore = require(join(outDir, 'server', 'core', 'submission.js'));
const streakCore = require(join(outDir, 'server', 'core', 'streak.js'));
const moderationCore = require(join(outDir, 'server', 'core', 'moderation.js'));
const privacyCore = require(join(outDir, 'server', 'core', 'privacy.js'));
const practiceCore = require(join(outDir, 'server', 'core', 'practice.js'));
const migrationCore = require(join(outDir, 'server', 'core', 'migrations.js'));
const dataDeletionCore = require(
  join(outDir, 'server', 'core', 'dataDeletion.js')
);
const nightlyStorageFence = require(
  join(outDir, 'server', 'core', 'nightlyStorageFence.js')
);
const storageCore = require(join(outDir, 'server', 'core', 'storage.js'));
const scoutNotebookCore = require(
  join(outDir, 'server', 'core', 'scoutNotebook.js')
);
const inkMeshCore = require(join(outDir, 'client', 'lib', 'inkmesh.js'));
const proceduralDoodlePlan = require(
  join(outDir, 'client', 'lib', 'proceduraldoodleplan.js')
);
const founderCharacterArt = require(
  join(outDir, 'client', 'lib', 'foundercharacterart.js')
);
const practiceLab = require(join(outDir, 'client', 'lib', 'practicelab.js'));
const matchupBrief = require(join(outDir, 'client', 'lib', 'matchupbrief.js'));
const replayCommentary = require(
  join(outDir, 'client', 'lib', 'replaycommentary.js')
);
const inkcastQueue = require(join(outDir, 'client', 'lib', 'inkcastqueue.js'));
const sparRivals = require(join(outDir, 'client', 'lib', 'sparrivals.js'));
const rivalRunPresentation = require(
  join(outDir, 'client', 'lib', 'rivalrunpresentation.js')
);
const continuousReplay = require(
  join(outDir, 'client', 'lib', 'continuousreplay.js')
);
const combatTranscriptValidation = require(
  join(outDir, 'shared', 'combat', 'transcriptvalidation.js')
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
const weaponFxPresentation = require(
  join(outDir, 'client', 'lib', 'weaponfxpresentation.js')
);
const stickerFxPresentation = require(
  join(outDir, 'client', 'lib', 'stickerfxpresentation.js')
);
const championChallenge = require(
  join(outDir, 'client', 'lib', 'championchallenge.js')
);
const founderChroniclePlan = require(
  join(outDir, 'client', 'lib', 'founderchronicle.js')
);
const arenaBracket = require(join(outDir, 'client', 'lib', 'arenabracket.js'));
const clientAccessories = require(
  join(outDir, 'client', 'lib', 'accessories.js')
);
const clientPens = require(join(outDir, 'client', 'lib', 'pens.js'));
const pressInteraction = require(
  join(outDir, 'client', 'lib', 'pressinteraction.js')
);
const passedChecks = [];

const pass = (name) => {
  passedChecks.push(name);
};

const readSourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return readSourceFiles(entryPath);
    if (!entry.isFile() || !/\.(?:mjs|ts)$/.test(entry.name)) return [];
    if (entry.name === 'test-battle.mjs' || entry.name.endsWith('.test.ts')) {
      return [];
    }
    return [readFileSync(entryPath, 'utf8')];
  });

const stableHashVectors = [
  ['', 2166136261],
  ['scribbits', 1798155316],
  ['forecast:2026-07-13', 3847699173],
  ['ink-\u{1f58d}', 9755236],
];
for (const [value, expectedHash] of stableHashVectors) {
  assert.equal(sharedStableHash.hashStringToUint32(value), expectedHash);
  assert.equal(deterministicContent.hashContentKey(value), expectedHash);
  assert.equal(serverRandom.hashTextToSeed(value), expectedHash);
}
const stableHashSource = readFileSync(
  join(repoRoot, 'src', 'shared', 'stablehash.ts'),
  'utf8'
);
const executableSourceFamily = [
  ...readSourceFiles(join(repoRoot, 'src')),
  ...readSourceFiles(join(repoRoot, 'scripts')),
].join('\n');
const combatRandomSource = readFileSync(
  join(repoRoot, 'src', 'shared', 'combat', 'random.ts'),
  'utf8'
);
const normalizeNumericSeparators = (source) =>
  source.replace(/(?<=[0-9a-f])_(?=[0-9a-f])/gi, '');
const stableStringHashOwnerFamily = normalizeNumericSeparators(
  executableSourceFamily.replace(combatRandomSource, '')
);
assert.equal(normalizeNumericSeparators('0x811c_9dc5'), '0x811c9dc5');
assert.equal(normalizeNumericSeparators('0X811C_9DC5'), '0X811C9DC5');
assert.equal(normalizeNumericSeparators('2_166_136_261'), '2166136261');
assert.match(stableHashSource, /Math\.imul\(hash, 0x01000193\)/);
assert.equal(
  stableStringHashOwnerFamily.match(/(?:2166136261|0x811c9dc5)/gi)?.length,
  1,
  'only the shared stable-hash primitive may own the FNV-1a offset basis'
);
assert.equal(
  stableStringHashOwnerFamily.match(/(?:16777619|0x01000193)/gi)?.length,
  1,
  'only the shared stable-hash primitive may own the FNV-1a multiplier'
);
assert.match(
  readFileSync(
    join(repoRoot, 'src', 'shared', 'rivalrunchallenges.ts'),
    'utf8'
  ),
  /import \{ hashStringToUint32 \} from '\.\/stablehash';/
);
pass('stable string hashing has one shared primitive and two domain names');

const workspaceRoot = join(repoRoot, '..');
const nodeBootstrapSource = readFileSync(
  join(workspaceRoot, 'scripts', 'node-env.sh'),
  'utf8'
);
const verifyCommandSource = readFileSync(
  join(workspaceRoot, 'verify.command'),
  'utf8'
);
const contributorCommandsSource = readFileSync(
  join(repoRoot, 'AGENTS.md'),
  'utf8'
);
const appReadmeSource = readFileSync(join(repoRoot, 'README.md'), 'utf8');
assert.match(
  nodeBootstrapSource,
  /codex_fallback_bin_dir="\$codex_bin_dir\/fallback"/
);
assert.match(
  nodeBootstrapSource,
  /run_pnpm install --frozen-lockfile/,
  'the bootstrap must install from the canonical pnpm lock'
);
assert.doesNotMatch(nodeBootstrapSource, /\bnpm ci\b/);
assert.match(verifyCommandSource, /scripts\/node-env\.sh/);
assert.match(verifyCommandSource, /ensure_node_modules/);
assert.match(verifyCommandSource, /run_pnpm verify/);
assert.doesNotMatch(contributorCommandsSource, /\bnpm (?:ci|run)\b/);
assert.doesNotMatch(appReadmeSource, /\bnpm (?:ci|install|run)\b/);
assert.doesNotMatch(
  readFileSync(join(repoRoot, 'scripts', 'dev-mock.mjs'), 'utf8'),
  /\bnpm (?:ci|install|run)\b/
);
assert.match(nodeBootstrapSource, /Node 22\.2\.0\+ is required/);
assert.match(nodeBootstrapSource, /required_pnpm_version="11\.7\.0"/);
pass('workspace verification has one clean-shell pnpm bootstrap');

const packageManifest = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8')
);
const deployCommandSource = readFileSync(
  join(workspaceRoot, 'deploy.command'),
  'utf8'
);
const deployWorkflowSource = readFileSync(
  join(workspaceRoot, '.github', 'workflows', 'devvit-auto-deploy.yml'),
  'utf8'
);
const deployGuideSource = readFileSync(
  join(workspaceRoot, 'DEPLOY.md'),
  'utf8'
);
assert.equal(
  packageManifest.scripts.deploy,
  'pnpm run release:check && NODE_OPTIONS=--max-old-space-size=4096 devvit upload --bump patch'
);
assert.equal(
  packageManifest.scripts.launch,
  'pnpm run release:check && NODE_OPTIONS=--max-old-space-size=4096 devvit publish --bump patch'
);
assert.equal(
  packageManifest.scripts['release:check'],
  'pnpm run verify && pnpm run balance:check && devvit whoami'
);
assert.equal(
  packageManifest.scripts['balance:check'],
  'node tools/balancer/run.mjs --check'
);
assert.match(deployCommandSource, /run_pnpm deploy/);
assert.doesNotMatch(
  deployCommandSource,
  /devvit upload|sync-devvit-version|package-lock\.json|git (?:commit|push)/
);
assert.equal(
  deployWorkflowSource.match(/pnpm run deploy/g)?.length,
  1,
  'CI must call the canonical deploy command once'
);
assert.doesNotMatch(
  deployWorkflowSource,
  /pnpm run (?:type-check|lint|test:sim|build)|devvit upload/
);
assert.doesNotMatch(
  deployGuideSource,
  /\bnpm\b|\bnpx\b|package-lock\.json|sync-devvit-version/
);
assert.equal(
  readdirSync(join(workspaceRoot, 'scripts')).includes(
    'sync-devvit-version.mjs'
  ),
  false
);
pass('desktop, CI, and package releases share one verified pnpm owner');

const nightlyJobSource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'dailyJob.ts'),
  'utf8'
);
assert.doesNotMatch(
  nightlyJobSource,
  /\bcreatePost\b|\bCreateArenaPost\b|\bCreatedArenaPost\b|\bpostId\b|getArenaPostKey/
);
pass('nightly resolution keeps post publication in the maintenance path');

const dataLeaseSource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'dataDeletion.ts'),
  'utf8'
);
for (const [operationName, expectedCount] of [
  ['Player data deletion', 4],
  ['Player mutation', 3],
  ['Nightly player mutation', 3],
]) {
  const escapedName = operationName.replaceAll(' ', '\\s');
  assert.equal(
    dataLeaseSource.match(
      new RegExp(
        `discardWatchedTransaction\\(transaction, '${escapedName}'\\)`,
        'g'
      )
    )?.length,
    expectedCount,
    `${operationName} must own its acquire/renew/release cleanup labels`
  );
}
pass('transaction cleanup diagnostics name their actual lease lifecycle');

assert.deepEqual(
  [...sharedElements.ELEMENTS],
  ['ember', 'tide', 'moss', 'storm']
);
assert.equal(Object.isFrozen(sharedElements.ELEMENTS), true);
for (const element of sharedElements.ELEMENTS) {
  assert.equal(sharedElements.isElement(element), true);
}
for (const value of [undefined, null, '', 'fire', 'EMBER', 0, {}]) {
  assert.equal(sharedElements.isElement(value), false);
}
const countElementValidators = (source) =>
  source.match(/\b(?:export\s+)?(?:const|function)\s+is(?:[A-Z]\w*)?Element\b/g)
    ?.length ?? 0;
const findCopiedElementUnions = (source) =>
  [...source.matchAll(/\btype\s+\w*Element\w*\s*=\s*([^;]+);/g)].filter(
    (elementUnionAlias) => {
      const copiedElementValues = new Set(
        [
          ...(elementUnionAlias[1] ?? '').matchAll(
            /["'](ember|tide|moss|storm)["']/g
          ),
        ].map((match) => match[1])
      );
      return copiedElementValues.size === sharedElements.ELEMENTS.length;
    }
  );
const countCompleteElementArrays = (source) =>
  (
    source.match(
      /\[\s*["'](?:ember|tide|moss|storm)["']\s*,\s*["'](?:ember|tide|moss|storm)["']\s*,\s*["'](?:ember|tide|moss|storm)["']\s*,\s*["'](?:ember|tide|moss|storm)["']\s*,?\s*\]/g
    ) ?? []
  ).filter((candidate) => {
    const values = new Set(
      [...candidate.matchAll(/["'](ember|tide|moss|storm)["']/g)].map(
        (match) => match[1]
      )
    );
    return values.size === sharedElements.ELEMENTS.length;
  }).length;
assert.equal(
  countElementValidators(executableSourceFamily),
  1,
  'the shared Element catalog must own the only runtime validator'
);
assert.equal(findCopiedElementUnions(executableSourceFamily).length, 0);
assert.equal(
  countCompleteElementArrays(executableSourceFamily),
  1,
  'only the shared Element catalog may declare the complete runtime value list'
);
assert.equal(
  countElementValidators(
    'function isElement() {}\nconst isCombatElement = () => true;'
  ),
  2
);
assert.equal(
  findCopiedElementUnions(
    'type DebugCombatElement = "storm" | "moss" | "tide" | "ember";'
  ).length,
  1
);
assert.equal(
  countCompleteElementArrays('["storm", "ember", "moss", "tide"]'),
  1
);
pass('Element values and runtime validation have one shared catalog');

assert.deepEqual(
  [...arena.SCRIBBIT_STAT_KEYS],
  ['chonk', 'spike', 'zip', 'charm']
);
assert.equal(Object.isFrozen(arena.SCRIBBIT_STAT_KEYS), true);
assert.equal(combatConfig.DOMINANT_STAT_TIE_ORDER, arena.SCRIBBIT_STAT_KEYS);
for (const relativePath of [
  'src/shared/analyzer-core.ts',
  'src/shared/scoutnotebook.ts',
  'src/shared/combat/config.ts',
  'src/client/lib/ui.ts',
  'src/server/core/scribbit.ts',
]) {
  const consumerSource = readFileSync(join(repoRoot, relativePath), 'utf8');
  assert.match(consumerSource, /\bSCRIBBIT_STAT_KEYS\b/);
  assert.doesNotMatch(
    consumerSource,
    /\[\s*['"]chonk['"]\s*,\s*['"]spike['"]\s*,\s*['"]zip['"]\s*,\s*['"]charm['"]\s*\]/
  );
}
const countCompleteStatKeyArrays = (source) => {
  const sourceFile = typescript.createSourceFile(
    'runtime-stat-catalog.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  let count = 0;
  const visit = (node) => {
    if (
      typescript.isArrayLiteralExpression(node) &&
      node.elements.length === 4
    ) {
      const values = node.elements
        .filter(
          (element) =>
            typescript.isStringLiteral(element) ||
            typescript.isNoSubstitutionTemplateLiteral(element)
        )
        .map((element) => element.text);
      const valueSet = new Set(values);
      if (
        values.length === 4 &&
        ['chonk', 'spike', 'zip', 'charm'].every((key) => valueSet.has(key))
      ) {
        count += 1;
      }
    }
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return count;
};
const runtimeStatCatalogCount = [
  ...readSourceFiles(join(repoRoot, 'src')),
  ...readSourceFiles(join(repoRoot, 'scripts')),
].reduce((count, source) => count + countCompleteStatKeyArrays(source), 0);
assert.equal(runtimeStatCatalogCount, 1);
assert.equal(
  countCompleteStatKeyArrays(
    "const copied = ['spike', 'chonk', 'zip', 'charm'];"
  ),
  1,
  'the runtime stat catalog guard must reject reordered copies'
);
assert.equal(
  countCompleteStatKeyArrays(
    'const copied = [`spike`, `chonk`, `zip`, `charm`];'
  ),
  1,
  'the runtime stat catalog guard must reject template-literal copies'
);
pass('Scribbit stat order has one immutable shared catalog');

const serverBattleSource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'battle.ts'),
  'utf8'
);
const legacySource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'legacy.ts'),
  'utf8'
);
const privacySource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'privacy.ts'),
  'utf8'
);
assert.doesNotMatch(
  serverBattleSource,
  /export\s*\{[^}]*getLevelDamageMultiplier[^}]*\}/,
  'server Battle must not re-export the shared level multiplier'
);
assert.doesNotMatch(legacySource, /getLegacyIndexVersionStorageKey/);
assert.match(
  privacySource,
  /getLegacyIndexVersionKey\(userId\)/,
  'privacy deletion must import the canonical Legacy storage key name'
);
assert.deepEqual(Object.keys(battle).sort(), [
  'getElementDamageMultiplier',
  'getForecastDamageMultiplier',
  'simulate',
]);
assert.deepEqual(Object.keys(legacyCore).sort(), [
  'ensureLegacyCardIndex',
  'getLegacyIndexVersionKey',
  'getLegacySeenDayKey',
  'loadLegacyCardPage',
  'loadLegacyReturnReceipt',
  'markLegacyCardsSeen',
]);
assert.equal(
  legacyCore.getLegacyIndexVersionKey('legacy-deck-owner'),
  'user:legacy-deck-owner:scribbits:legacy-index-version'
);
pass('Legacy and battle helpers expose one canonical import path');

const arenaContractSource = readFileSync(
  join(repoRoot, 'src', 'shared', 'arena.ts'),
  'utf8'
);
assert.match(arenaContractSource, /export const cloneScribbit\b/);
assert.doesNotMatch(arenaContractSource, /export type ScribbitStatKey\b/);
const combatIndexSource = readFileSync(
  join(repoRoot, 'src', 'shared', 'combat', 'index.ts'),
  'utf8'
);
assert.doesNotMatch(
  combatIndexSource,
  /from ['"]\.\/upgrades['"]/,
  'Ink Mod consumers must use the explicit upgrades module, not a competing barrel path'
);
for (const cloneConsumerPath of [
  ['server', 'core', 'scribbit.ts'],
  ['server', 'core', 'battle.ts'],
  ['server', 'core', 'rumble.ts'],
  ['server', 'core', 'species.ts'],
]) {
  const cloneConsumerSource = readFileSync(
    join(repoRoot, 'src', ...cloneConsumerPath),
    'utf8'
  );
  assert.doesNotMatch(
    cloneConsumerSource,
    /(?:const|function)\s+clone(?:Founding)?Scribbit(?:Snapshot)?\b/,
    `${cloneConsumerPath.join('/')} must use the shared full-record clone`
  );
}
pass('dead stat aliases and competing Ink Mod barrel exports stay removed');
const productionApiSource = readFileSync(
  join(repoRoot, 'src', 'server', 'routes', 'api.ts'),
  'utf8'
);
const productionServerSource = readSourceFiles(
  join(repoRoot, 'src', 'server')
).join('\n');
const scribbitResolverSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'scribbits.ts'),
  'utf8'
);
const mockServerSource = readFileSync(
  join(repoRoot, 'scripts', 'dev-mock.mjs'),
  'utf8'
);
assert.doesNotMatch(mockServerSource, /const maximumLegacyCardsPageSize\b/);
assert.doesNotMatch(mockServerSource, /const legacyReturnPreviewLimit\b/);
assert.doesNotMatch(mockServerSource, /const toLegacyCard\b/);
assert.doesNotMatch(mockServerSource, /const encodeLegacyCursor\b/);
assert.doesNotMatch(mockServerSource, /const getLegacyCursorOffset\b/);
assert.doesNotMatch(productionApiSource, /maximumLegacyCardsPageSize/);
assert.match(mockServerSource, /paginateLegacyCards\(/);
assert.match(productionServerSource, /parseLegacyCardsPageSize\(/);
const architecturePlanSource = readFileSync(
  join(repoRoot, '..', 'plans', 'v3-scribbits-arena.md'),
  'utf8'
);
assert.match(productionApiSource, /media\.upload\(/);
const uploadDrawingImplementation = productionApiSource.match(
  /const uploadDrawing\s*=\s*async[\s\S]*?\n};/
)?.[0];
assert.ok(uploadDrawingImplementation);
assert.doesNotMatch(
  uploadDrawingImplementation,
  /\b(?:catch|redis|storage|set|hSet|hSetMany)\b/,
  'production media upload must fail closed without a persistence fallback'
);
const rawImagePersistencePattern =
  /(?:[A-Za-z_$][\w$]*\.)+(?:set|incrBy|hSet|hSetNX|hSetMany|hIncrBy|zAdd|zIncrBy)\([\s\S]{0,300}\b(?:baseImageDataUrl|imageDataUrl)\b|\b(?:baseImageDataUrl|imageDataUrl)\b[\s\S]{0,300}(?:[A-Za-z_$][\w$]*\.)+(?:set|incrBy|hSet|hSetNX|hSetMany|hIncrBy|zAdd|zIncrBy)\(/;
assert.doesNotMatch(
  productionServerSource,
  rawImagePersistencePattern,
  'production must never persist submitted PNG data URLs'
);
assert.match(
  "await storage.set('drawing:raw', draft.baseImageDataUrl);",
  rawImagePersistencePattern
);
assert.match(
  "await redis.hSet('drawing:raw', { png: draft.imageDataUrl });",
  rawImagePersistencePattern
);
assert.match(
  "await transaction.set('drawing:raw', draft.baseImageDataUrl);",
  rawImagePersistencePattern
);
assert.match(
  "await transaction.hSet('drawing:raw', { png: draft.imageDataUrl });",
  rawImagePersistencePattern
);
assert.match(
  "await storage.hSetNX('drawing:raw', 'png', draft.baseImageDataUrl);",
  rawImagePersistencePattern
);
assert.match(
  "await transaction.hSetNX('drawing:raw', 'png', draft.imageDataUrl);",
  rawImagePersistencePattern
);
assert.match(
  "await storage.zIncrBy('drawing:raw', draft.baseImageDataUrl, 1);",
  rawImagePersistencePattern
);
assert.match(
  "await transaction.zIncrBy('drawing:raw', draft.imageDataUrl, 1);",
  rawImagePersistencePattern
);
assert.match(
  "await storage.hIncrBy('drawing:raw', draft.baseImageDataUrl, 1);",
  rawImagePersistencePattern
);
assert.match(
  "await transaction.hIncrBy('drawing:raw', draft.imageDataUrl, 1);",
  rawImagePersistencePattern
);
assert.match(
  'await storage.incrBy(draft.baseImageDataUrl, 1);',
  rawImagePersistencePattern
);
assert.match(
  "await fencedStorage.set('drawing:raw', draft.baseImageDataUrl);",
  rawImagePersistencePattern
);
assert.match(
  "await tx.hSet('drawing:raw', { png: draft.imageDataUrl });",
  rawImagePersistencePattern
);
assert.match(mockServerSource, /mock-only \/api\/drawing\/\{id\}/);
assert.match(arenaContractSource, /Reddit-hosted in production/);
assert.match(
  scribbitResolverSource,
  /Reddit-hosted in production; \/api\/drawing\/\{id\} only in the local mock/
);
assert.match(architecturePlanSource, /Production never stores raw PNG bytes/);
assert.doesNotMatch(architecturePlanSource, /fallback: PNG bytes in redis/i);
pass('drawing media docs match the production and mock authority boundary');

const submissionCoreSource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'submission.ts'),
  'utf8'
);
const productionSubmissionRoute = productionApiSource.match(
  /api\.post\('\/scribbit',[\s\S]*?\n}\);\n\nregisterPlayerMutatingGet\('\/spar-rivals'/
)?.[0];
assert.ok(productionSubmissionRoute);
assert.match(productionSubmissionRoute, /commitScribbitSubmission\(/);
assert.doesNotMatch(
  productionSubmissionRoute,
  /(?:storeScribbit|addRumbleEntrant|claimDailyFlags|awardInk|recordDailyPlay)\(/,
  'the route must not restore independent Scribbit-birth writes'
);
assert.doesNotMatch(
  productionSubmissionRoute,
  /rollback|Submit Scribbit cleanup/,
  'atomic Scribbit birth must not depend on best-effort route compensation'
);
assert.doesNotMatch(
  productionServerSource,
  /consumeAccessoriesForSubmit/,
  'accessory spend belongs inside the authoritative birth transaction'
);
assert.match(submissionCoreSource, /storage\.watch\(/);
assert.match(submissionCoreSource, /queueStoredScribbit\(/);
assert.match(submissionCoreSource, /submissionWasCommitted\(/);
assert.match(submissionCoreSource, /acquireActiveSubmission\(/);
assert.match(submissionCoreSource, /releaseActiveSubmission\(/);
assert.doesNotMatch(
  submissionCoreSource,
  /transaction\.(?:incrBy|hIncrBy)\(/,
  'submission repair must use exact idempotent values, not additive retries'
);
assert.match(nightlyJobSource, /getActiveScribbitSubmissionsKey\(/);
assert.match(nightlyJobSource, /activeSubmissionCount > 0/);
pass('production Scribbit birth has one atomic reply-loss-safe owner');

const founderArtPlanSource = readFileSync(
  join(repoRoot, '..', 'plans', 'creature-art-spec.md'),
  'utf8'
);
assert.match(
  founderArtPlanSource,
  /old Higgsfield-to-static-sprite plan is superseded/
);
assert.match(
  founderArtPlanSource,
  /deterministic authored Canvas character roster/
);
assert.match(founderArtPlanSource, /Do not add a parallel `public\/creatures`/);
assert.doesNotMatch(founderArtPlanSource, /Save as app\/public\/creatures/);
pass('founder art plan matches the authored canvas runtime source of truth');

for (const relativePath of [
  'src/client/lib/api.ts',
  'src/client/lib/legacycards.ts',
  'src/shared/arena.ts',
  'src/shared/founders.ts',
  'src/shared/content/forecastblurbs.ts',
  'src/shared/content/scoutnotes.ts',
  'src/server/routes/api.ts',
]) {
  assert.doesNotMatch(
    readFileSync(join(repoRoot, relativePath), 'utf8'),
    /\b(?:bet|bets|bracket|brackets)\b/i,
    `${relativePath} must use canonical Pick and Rumble vocabulary`
  );
}
pass('player-facing domain copy uses canonical Pick and Rumble vocabulary');

const arenaHomeSource = readFileSync(
  join(repoRoot, 'src', 'client', 'scenes', 'ArenaHome.ts'),
  'utf8'
);

const visualAssetsSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'visualassets.ts'),
  'utf8'
);
const stickerFxShaderSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'stickerfxshader.ts'),
  'utf8'
);
const stickerFxPresentationSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'stickerfxpresentation.ts'),
  'utf8'
);
assert.match(
  visualAssetsSource,
  /renderer\.type === Phaser\.WEBGL[\s\S]*filters\?\.internal\.addMask\(/
);
assert.match(
  visualAssetsSource,
  /else \{[\s\S]*paperTexture\.setMask\(paperMaskShape\.createGeometryMask\(\)\)/
);
assert.match(
  visualAssetsSource,
  /FIGHT_START_TEXTURE[\s\S]*assetUrl\('ui-fight-start\.webp'\)/,
  'the reusable visual asset loader should preload the illustrated fight stamp'
);
assert.doesNotMatch(
  stickerFxShaderSource,
  /sampler2D|texture2D\(/,
  'the reusable shine must avoid the texture sampler that leaked a visible quad'
);
assert.match(stickerFxShaderSource, /float vignette = 1\.0 - smoothstep/);
assert.match(
  stickerFxPresentationSource,
  /input\.reduceMotion \|\| !input\.webgl/,
  'Canvas and reduced-motion players should skip the custom shine shader'
);
assert.match(stickerFxPresentationSource, /hardwareConcurrency < 4/);
assert.match(stickerFxPresentationSource, /deviceMemoryGigabytes < 3/);
assert.equal(
  stickerFxPresentation.supportsStickerShine({
    webgl: false,
    reduceMotion: false,
  }),
  false
);
assert.equal(
  stickerFxPresentation.supportsStickerShine({
    webgl: true,
    reduceMotion: true,
  }),
  false
);
assert.equal(
  stickerFxPresentation.supportsStickerShine({
    webgl: true,
    reduceMotion: false,
    hardwareConcurrency: 3,
  }),
  false
);
assert.equal(
  stickerFxPresentation.supportsStickerShine({
    webgl: true,
    reduceMotion: false,
    hardwareConcurrency: 4,
    deviceMemoryGigabytes: 3,
  }),
  true
);
assert.equal(
  stickerFxPresentation.supportsStickerShine({
    webgl: true,
    reduceMotion: false,
  }),
  true,
  'unknown hardware should allow one bounded hero-sticker shader'
);
assert.match(stickerFxShaderSource, /ScribbitsStickerShineV1/);
assert.match(stickerFxShaderSource, /alpha = clamp\(alpha, 0\.0, 1\.0\)/);
assert.match(stickerFxShaderSource, /onComplete: hide/);
assert.doesNotMatch(stickerFxShaderSource, /\b(?:for|while)\s*\(/);
assert.doesNotMatch(
  stickerFxShaderSource,
  /cameras\.main\.filters|enableFilters\(/,
  'the fight shine should remain one localized quad, never a full-screen filter'
);
pass('Arena stage uses supported WebGL and Canvas mask paths');

const screenTitleSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'screentitle.ts'),
  'utf8'
);
assert.match(screenTitleSource, /scene\.textures\.addCanvas\(/);
assert.match(
  visualAssetsSource,
  /screenTitle\(scene, width \/ 2, 24, translate\('screen\.arena'\)/
);
for (const sceneFile of [
  'Gallery.ts',
  'MyBattles.ts',
  'ScoutNotebook.ts',
  'Draw.ts',
  'Bestiary.ts',
]) {
  const sceneSource = readFileSync(
    join(repoRoot, 'src', 'client', 'scenes', sceneFile),
    'utf8'
  );
  assert.match(
    sceneSource,
    /screenTitle\(/,
    `${sceneFile} must use the shared rendered screen title`
  );
}
pass('primary screens share one rendered title texture owner');

const replayBattleBackgroundSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'replaybattlebackground.ts'),
  'utf8'
);
const battleArenaPresentationSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'battlearenapresentation.ts'),
  'utf8'
);
const replayBattleHudSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'replaybattlehud.ts'),
  'utf8'
);
assert.match(replayBattleBackgroundSource, /battleStage\(scene, -1000\)/);
assert.match(
  battleArenaPresentationSource,
  /'v1-sticker-stadium': \{[\s\S]{0,100}background: 0xf29a3d/,
  'Sticker Stadium should keep its arena wash warm instead of adding a blue overlay'
);
assert.doesNotMatch(
  replayBattleBackgroundSource,
  /case 'v1-sticker-stadium':[\s\S]{0,360}\.soft/,
  'Sticker Stadium should not tint its paper with cool element overlays'
);
assert.doesNotMatch(
  replayBattleHudSource,
  /paperRoleTag\([\s\S]{0,180}'BATTLE'/,
  'the rendered battle title must not regress to a button-like role tag'
);
assert.match(replayBattleHudSource, /planReplayHeartMeter\(/);
assert.match(replayBattleHudSource, /renderHeartMeter\(/);
assert.match(replayBattleHudSource, /delayedCall\(900,/);
assert.doesNotMatch(replayBattleHudSource, /900 \* playbackSpeed/);
assert.doesNotMatch(
  replayBattleHudSource,
  /getShapePowerSignatureName|visibleLabel: 'WINDUP'|visibleLabel: 'ACTIVE'/,
  'the battle header must not restore cryptic move names or state stickers'
);
assert.match(
  replayBattleHudSource,
  /dataset\[`\$\{datasetPrefix\}ShapePowerState`\] = state/,
  'hidden Shape Power state should remain available for live replay proof'
);
assert.doesNotMatch(
  replayBattleHudSource,
  /hitPointTrack|hitPointTrail|hitPointBar/,
  'Replay health must stay a heart system instead of restoring bar layers'
);
pass('Replay uses the rendered battle stage instead of a button-like title');

const listFilePaths = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? listFilePaths(entryPath) : [entryPath];
  });
const collectTypeScriptStringLiterals = (source) => {
  const sourceFile = typescript.createSourceFile(
    'domain-copy.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const literals = [];
  const visit = (node) => {
    if (
      typescript.isStringLiteral(node) ||
      typescript.isNoSubstitutionTemplateLiteral(node)
    ) {
      literals.push(node.text);
    }
    if (typescript.isTemplateExpression(node)) {
      literals.push(node.getText(sourceFile));
    }
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literals;
};
assert.deepEqual(
  collectTypeScriptStringLiterals(
    'const copy = `Place your ${name} bet`;'
  ).filter((copy) => /\bbet\b/.test(copy)),
  ['`Place your ${name} bet`']
);
const domainCopyFiles = [
  ...listFilePaths(join(repoRoot, 'src', 'client')),
  ...listFilePaths(join(repoRoot, 'src', 'shared', 'content')),
  join(repoRoot, 'src', 'shared', 'founders.ts'),
  ...listFilePaths(join(repoRoot, 'src', 'server', 'routes')),
].filter((filePath) => filePath.endsWith('.ts'));
for (const filePath of domainCopyFiles) {
  for (const copy of collectTypeScriptStringLiterals(
    readFileSync(filePath, 'utf8')
  )) {
    if (copy === 'Continuous replay could not bracket the requested tick.') {
      continue;
    }
    assert.doesNotMatch(
      copy,
      /\b(?:bet|bets|bracket|brackets)\b/i,
      `${filePath} must use Pick and Rumble in player-facing strings`
    );
  }
}
const typeOutputCleanerSource = readFileSync(
  join(repoRoot, 'scripts', 'clean-type-output.mjs'),
  'utf8'
);
assert.match(typeOutputCleanerSource, /dist\/types/);
assert.match(typeOutputCleanerSource, /recursive:\s*true/);
assert.match(
  packageManifest.scripts['type-check'],
  /^node scripts\/clean-type-output\.mjs && tsc --build --force$/
);
for (const sourceRoot of ['client', 'server', 'shared']) {
  const generatedJavaScriptFiles = listFilePaths(
    join(repoRoot, 'dist', 'types', sourceRoot)
  ).filter((filePath) => filePath.endsWith('.js'));
  for (const generatedFilePath of generatedJavaScriptFiles) {
    const relativeGeneratedPath = generatedFilePath.slice(
      join(repoRoot, 'dist', 'types', sourceRoot).length + 1
    );
    const expectedSourcePath = join(
      repoRoot,
      'src',
      sourceRoot,
      relativeGeneratedPath.replace(/\.js$/, '.ts')
    );
    assert.equal(
      listFilePaths(join(repoRoot, 'src', sourceRoot)).includes(
        expectedSourcePath
      ),
      true,
      `${relativeGeneratedPath} must have a live TypeScript source`
    );
  }
}
pass('type-check cleans output before emitting source-matched artifacts');
const isRetiredNavigationBitmap = (filePath) =>
  /\/[^/]*(?:nav|dock|navigation)[^/]*(?:\/.*)?\.(?:png|jpe?g|webp|gif|avif)$/i.test(
    filePath
  );
assert.deepEqual(
  listFilePaths(join(repoRoot, 'src', 'client', 'assets')).filter(
    isRetiredNavigationBitmap
  ),
  [],
  'retired bitmap dock icons must not re-enter the production asset graph'
);
for (const bypassPath of [
  '/assets/bottom-dock/icons/arena.png',
  '/assets/primary-navigation/icons/arena.webp',
  '/assets/icons/app-nav/arena.jpg',
]) {
  assert.equal(isRetiredNavigationBitmap(bypassPath), true);
}
assert.doesNotMatch(
  executableSourceFamily,
  /(?:split-nav-icons|nav-(?:arena|gallery|shop|draw|battles|scout)\.(?:png|jpe?g|webp|gif|avif))/i,
  'no source or generator may restore retired bitmap dock icons'
);
pass('procedural paper icons are the only dock asset family');

const gallerySceneSource = readFileSync(
  join(repoRoot, 'src', 'client', 'scenes', 'Gallery.ts'),
  'utf8'
);
const galleryRegistrySource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'registry.ts'),
  'utf8'
);
const clientSourceFamily = readSourceFiles(
  join(repoRoot, 'src', 'client')
).join('\n');
const hasRetiredGalleryVocabulary = (source) => {
  const scanner = typescript.createScanner(
    typescript.ScriptTarget.Latest,
    true,
    typescript.LanguageVariant.Standard,
    source
  );
  for (
    let token = scanner.scan();
    token !== typescript.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    if (
      token === typescript.SyntaxKind.Identifier &&
      /sketchbook/i.test(scanner.getTokenText())
    ) {
      return true;
    }
    if (
      (token === typescript.SyntaxKind.StringLiteral ||
        token === typescript.SyntaxKind.NoSubstitutionTemplateLiteral) &&
      scanner.getTokenValue().toLowerCase() === 'sketchbook'
    ) {
      return true;
    }
  }
  return false;
};
assert.equal(
  listFilePaths(join(repoRoot, 'src', 'client', 'scenes')).some((filePath) =>
    /\/Sketchbook\.ts$/.test(filePath)
  ),
  false
);
assert.equal(
  hasRetiredGalleryVocabulary(clientSourceFamily),
  false,
  'Gallery navigation must not retain the retired scene or tab synonyms'
);
for (const bypassSource of [
  'export const setSketchbookTab = setGalleryTab;',
  'export const getSketchbookTab = getGalleryTab;',
  "fadeToScene(scene, 'Sketchbook');",
  'fadeToScene(scene, `Sketchbook`);',
  "const tab = 'sketchbook';",
  'const sketchbookScene = Gallery;',
  'const SKETCHBOOK_ROUTE = Gallery;',
  'const SketchBook = Gallery;',
]) {
  assert.equal(hasRetiredGalleryVocabulary(bypassSource), true);
}
assert.match(gallerySceneSource, /export class Gallery extends Scene/);
assert.match(gallerySceneSource, /super\(["']Gallery["']\)/);
assert.match(gallerySceneSource, /private buildOwnedScribbits\(/);
assert.match(gallerySceneSource, /getScribbitLifecycleStage\(/);
assert.doesNotMatch(gallerySceneSource, /fetchLegends|loadLegends/);
assert.match(
  galleryRegistrySource,
  /export type GalleryTab =\s*\|?\s*["']growing["']\s*\|\s*["']mature["']\s*\|\s*["']archived["']\s*\|\s*["']collection["']/
);
assert.match(
  galleryRegistrySource,
  /export type ReplayReturnScene =[\s\S]*["']Gallery["']/
);
assert.doesNotMatch(
  productionApiSource,
  /not in your sketchbook/i,
  'server responses must use active roster or Gallery vocabulary'
);
assert.doesNotMatch(mockServerSource, /not in your sketchbook/i);
pass('Gallery uses one owned Growing, Mature, and Archived vocabulary');

assert.equal(
  storageCore.MAX_WATCH_TRANSACTION_ATTEMPTS,
  5,
  'all optimistic Redis workflows must share one bounded retry budget'
);
const cleanupWarnings = [];
const originalConsoleWarn = console.warn;
console.warn = (...values) => cleanupWarnings.push(values);
try {
  await storageCore.discardWatchedTransaction(
    {
      async discard() {
        throw new Error('simulated closed transaction');
      },
    },
    'Storage contract proof'
  );
} finally {
  console.warn = originalConsoleWarn;
}
assert.equal(cleanupWarnings.length, 1);
assert.match(String(cleanupWarnings[0]?.[0]), /Storage contract proof/);
const serverCoreSource = readdirSync(join(repoRoot, 'src', 'server', 'core'))
  .filter((filename) => filename.endsWith('.ts') && filename !== 'storage.ts')
  .map((filename) =>
    readFileSync(join(repoRoot, 'src', 'server', 'core', filename), 'utf8')
  )
  .join('\n');
assert.doesNotMatch(
  serverCoreSource,
  /const\s+(?:discard\w*Transaction|maximum\w*TransactionAttempts)\b/,
  'domain modules must not recreate generic transaction cleanup or retry policy'
);
pass('optimistic Redis cleanup and retry policy has one shared owner');

const playerMutationLockKey = 'user:api-contract-user:mutation:lock';
const publicRouteInventory = [
  ...new Set(
    productionApiContract.app.routes
      .filter(
        (route) => route.path.startsWith('/api/') && route.method !== 'ALL'
      )
      .map((route) => `${route.method} ${route.path}`)
  ),
].sort();
assert.equal(
  productionApiContract.app.routes.some((route) =>
    /^\/api\/drawing(?:\/|$)/.test(route.path)
  ),
  false,
  'production must not mount a raw drawing route for any HTTP method'
);
assert.deepEqual(publicRouteInventory, [
  'GET /api/arena',
  'GET /api/clout-board',
  'GET /api/community-challenge',
  'GET /api/health',
  'GET /api/inventory',
  'GET /api/legacy-cards',
  'GET /api/legends',
  'GET /api/my-battles',
  'GET /api/rumble-replay',
  'GET /api/scout-notebook',
  'GET /api/season',
  'GET /api/season-board',
  'GET /api/spar-rivals',
  'GET /api/splash',
  'GET /api/venue-board',
  'POST /api/back',
  'POST /api/battle-clip',
  'POST /api/believe',
  'POST /api/boss-challenge',
  'POST /api/capsule',
  'POST /api/daily-login/claim',
  'POST /api/delete-my-data',
  'POST /api/equip-gear',
  'POST /api/equip-title',
  'POST /api/feedback',
  'POST /api/free-drawing',
  'POST /api/legacy-cards/seen',
  'POST /api/maturity/acknowledge',
  'POST /api/merge-gear',
  'POST /api/power-up/choose',
  'POST /api/practice-battle',
  'POST /api/progression-event',
  'POST /api/remove-scribbit',
  'POST /api/report-scribbit',
  'POST /api/retire-scribbit',
  'POST /api/scribbit',
  'POST /api/spar',
]);
assert.deepEqual(
  productionApiContract.app.routes
    .filter((route) => route.path.startsWith('/internal/'))
    .map((route) => `${route.method} ${route.path}`)
    .sort(),
  [
    'GET /internal/analytics',
    'GET /internal/analytics/assets/analytics.css',
    'GET /internal/analytics/assets/analytics.js',
    'GET /internal/analytics/query',
    'GET /internal/feedback',
    'GET /internal/feedback/assets/feedback.css',
    'GET /internal/feedback/assets/feedback.js',
    'GET /internal/feedback/query',
    'POST /internal/menu/feedback-view',
    'POST /internal/menu/post-create',
    'POST /internal/menu/season-admin-user-ids-validate',
    'POST /internal/menu/seasons-manage',
    'POST /internal/menu/seasons-submit',
    'POST /internal/scheduler/nightly-arena',
    'POST /internal/triggers/on-app-install',
    'POST /internal/triggers/on-app-upgrade',
  ],
  'the production entrypoint must mount every internal host route'
);
const menuRouteSource = readFileSync(
  join(repoRoot, 'src', 'server', 'routes', 'menu.ts'),
  'utf8'
);
const installTriggerSource = readFileSync(
  join(repoRoot, 'src', 'server', 'routes', 'triggers.ts'),
  'utf8'
);
const arenaPostSource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'post.ts'),
  'utf8'
);
const schedulerRouteSource = readFileSync(
  join(repoRoot, 'src', 'server', 'routes', 'scheduler.ts'),
  'utf8'
);
const arenaMaintenanceSource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'arenaMaintenance.ts'),
  'utf8'
);
const inspectTypeScriptModule = (source) => {
  const sourceFile = typescript.createSourceFile(
    'inspection.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const imports = new Map();
  const calledIdentifiers = [];
  const visit = (node) => {
    if (
      typescript.isImportDeclaration(node) &&
      typescript.isStringLiteral(node.moduleSpecifier)
    ) {
      const importedNames =
        node.importClause?.namedBindings &&
        typescript.isNamedImports(node.importClause.namedBindings)
          ? node.importClause.namedBindings.elements.map((element) => ({
              imported: (element.propertyName ?? element.name).text,
              local: element.name.text,
            }))
          : [];
      imports.set(
        node.moduleSpecifier.text,
        [
          ...(imports.get(node.moduleSpecifier.text) ?? []),
          ...importedNames,
        ].sort((left, right) => left.imported.localeCompare(right.imported))
      );
    }
    if (
      typescript.isCallExpression(node) &&
      typescript.isIdentifier(node.expression)
    ) {
      calledIdentifiers.push(node.expression.text);
    }
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { imports, calledIdentifiers };
};
for (const routeSource of [menuRouteSource]) {
  const inspection = inspectTypeScriptModule(routeSource);
  assert.deepEqual(inspection.imports.get('../core/post'), [
    {
      imported: 'ensureMainAppPost',
      local: 'ensureMainAppPost',
    },
  ]);
  assert.equal(inspection.imports.has('../core/arenaStore'), false);
  assert.equal(
    inspection.calledIdentifiers.filter((name) => name === 'ensureMainAppPost')
      .length,
    1
  );
  for (const forbiddenCall of [
    'ensureCurrentArenaDay',
    'ensureForecastForDay',
    'getCurrentChampion',
    'getOrCreateArenaPost',
  ]) {
    assert.equal(inspection.calledIdentifiers.includes(forbiddenCall), false);
  }
}
const triggerInspection = inspectTypeScriptModule(installTriggerSource);
assert.equal(triggerInspection.imports.has('../core/arenaMaintenance'), false);
assert.deepEqual(triggerInspection.imports.get('../core/post'), [
  {
    imported: 'deleteObsoleteAppPosts',
    local: 'deleteObsoleteAppPosts',
  },
  {
    imported: 'ensureMainAppPost',
    local: 'ensureMainAppPost',
  },
]);
assert.equal(triggerInspection.imports.has('../core/arenaStore'), false);
assert.equal(
  triggerInspection.calledIdentifiers.filter((name) => name === 'maintainArena')
    .length,
  0
);
assert.equal(
  triggerInspection.calledIdentifiers.filter(
    (name) => name === 'ensureMainAppPost'
  ).length,
  1
);
assert.equal(
  triggerInspection.calledIdentifiers.filter(
    (name) => name === 'ensureInitialSeason'
  ).length,
  0
);
const schedulerInspection = inspectTypeScriptModule(schedulerRouteSource);
assert.deepEqual(schedulerInspection.imports.get('../core/arenaMaintenance'), [
  {
    imported: 'maintainArena',
    local: 'maintainArena',
  },
]);
assert.equal(schedulerInspection.imports.has('../core/post'), false);
assert.equal(
  schedulerInspection.calledIdentifiers.filter(
    (name) => name === 'maintainArena'
  ).length,
  1
);
const maintenanceInspection = inspectTypeScriptModule(arenaMaintenanceSource);
assert.equal(maintenanceInspection.imports.has('./post'), false);
assert.equal(
  maintenanceInspection.calledIdentifiers.filter(
    (name) => name === 'getOrCreateArenaPost'
  ).length,
  0,
  'nightly maintenance must not create daily Reddit posts'
);
assert.equal(
  maintenanceInspection.calledIdentifiers.includes(
    'publishRumbleResultComment'
  ),
  false
);
assert.doesNotMatch(schedulerRouteSource, /submitCustomPost|submitComment/);
assert.match(arenaPostSource, /export const ensureMainAppPost/);
assert.match(arenaPostSource, /export const deleteObsoleteAppPosts/);
assert.match(arenaPostSource, /Draw a Scribbit\. Watch it fight\./);
const requestArenaPostMenu = (
  request = {
    location: 'subreddit',
    targetId: 't5_scribbits_test',
  }
) =>
  productionApiContract.app.request('/internal/menu/post-create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
productionApiContract.resetApiContractRuntime();
const menuPostResponse = await requestArenaPostMenu();
assert.equal(menuPostResponse.status, 200);
assert.deepEqual(await menuPostResponse.json(), {
  navigateTo:
    'https://reddit.com/r/scribbits_test/comments/api-contract-post-1',
});
const installPostResponse = await productionApiContract.app.request(
  '/internal/triggers/on-app-install',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'AppInstall' }),
  }
);
assert.equal(installPostResponse.status, 200);
assert.deepEqual(await installPostResponse.json(), {
  status: 'success',
  message:
    'Scribbits is ready in scribbits_test with one app post (api-contract-post-1); removed 0 obsolete app posts and scheduled recovery job api-contract-job-1 (trigger: AppInstall)',
});
const initialMaintenanceResponse = await productionApiContract.app.request(
  '/internal/scheduler/nightly-arena',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'nightly-arena',
      data: { attempt: 0, reason: 'app-install' },
    }),
  }
);
assert.equal(initialMaintenanceResponse.status, 200);
const canonicalInstallDay = Number(
  productionApiContract.getApiContractString('arena:currentDay')
);
assert.ok(Number.isSafeInteger(canonicalInstallDay));
assert.equal(
  productionApiContract.apiContractRuntimeState.submittedPosts,
  2,
  'maintenance keeps the playable post and publishes the opening Arena update'
);
const repeatedMaintenanceResponse = await productionApiContract.app.request(
  '/internal/scheduler/nightly-arena',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'nightly-arena',
      data: { attempt: 0, reason: 'idempotency-check' },
    }),
  }
);
assert.equal(repeatedMaintenanceResponse.status, 200);
assert.equal(
  productionApiContract.apiContractRuntimeState.submittedPosts,
  2,
  'repeated maintenance must not duplicate the opening Arena update'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.seedApiContractPost({
  id: 'detached-main-post',
  title: 'Draw a Scribbit. Watch it fight.',
  postData: undefined,
});
const reinstallRecoveryResponse = await productionApiContract.app.request(
  '/internal/triggers/on-app-install',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'AppInstall' }),
  }
);
assert.equal(reinstallRecoveryResponse.status, 200);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);
assert.equal(productionApiContract.apiContractRuntimeState.deletedPosts, 1);
assert.equal(
  productionApiContract.getApiContractString('app:main-post:v3'),
  'api-contract-post-1'
);
assert.match(
  (await reinstallRecoveryResponse.json()).message,
  /removed 1 obsolete app posts/
);
pass('fresh installs replace detached custom-post shells');

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString(
  'arena:currentDay',
  String(canonicalInstallDay - 1)
);
productionApiContract.setApiContractString(
  `arena:post:${canonicalInstallDay - 1}`,
  't3_api-contract-missed-day'
);
productionApiContract.setApiContractString(
  `arena:post:${canonicalInstallDay}`,
  't3_api-contract-current-day'
);
const catchUpUpgradeResponse = await productionApiContract.app.request(
  '/internal/triggers/on-app-upgrade',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'stale-upgrade' }),
  }
);
assert.equal(catchUpUpgradeResponse.status, 200);
const scheduledCatchUpResponse = await productionApiContract.app.request(
  '/internal/scheduler/nightly-arena',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'nightly-arena',
      data: { attempt: 0, reason: 'app-stale-upgrade' },
    }),
  }
);
assert.equal(scheduledCatchUpResponse.status, 200);
assert.equal(
  productionApiContract.getApiContractString('arena:currentDay'),
  String(canonicalInstallDay)
);
assert.equal(
  productionApiContract.apiContractRuntimeState.submittedComments,
  0,
  'upgrade catch-up must not publish Reddit comments'
);
assert.equal(
  productionApiContract.apiContractRuntimeState.submittedPosts,
  2,
  'upgrade catch-up publishes one idempotent Arena update beside the playable post'
);
pass('app upgrades schedule a stale Arena catch-up with community updates');

productionApiContract.resetApiContractRuntime();
const reversedInstallResponse = await productionApiContract.app.request(
  '/internal/triggers/on-app-install',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'install-first' }),
  }
);
assert.equal(reversedInstallResponse.status, 200);
const reversedMenuResponse = await requestArenaPostMenu();
assert.equal(reversedMenuResponse.status, 200);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);

const captureRouteErrors = async (action) => {
  const errors = [];
  const originalError = console.error;
  console.error = (...values) => errors.push(values);
  try {
    return { result: await action(), errors };
  } finally {
    console.error = originalError;
  }
};

productionApiContract.resetApiContractRuntime({ moderatorIds: [] });
const nonModeratorMenuResponse = await requestArenaPostMenu();
assert.equal(nonModeratorMenuResponse.status, 200);
assert.deepEqual(await nonModeratorMenuResponse.json(), {
  showToast: 'Opening Scribbits is restricted to moderators.',
});
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);
assert.equal(
  productionApiContract.getApiContractString('arena:currentDay'),
  undefined,
  'an unauthorized menu request must not initialize Arena storage'
);

productionApiContract.resetApiContractRuntime({
  userId: null,
  username: null,
});
const anonymousMenuResponse = await requestArenaPostMenu();
assert.equal(anonymousMenuResponse.status, 200);
assert.deepEqual(await anonymousMenuResponse.json(), {
  showToast: 'Opening Scribbits is restricted to moderators.',
});
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);
assert.equal(
  productionApiContract.getApiContractString('arena:currentDay'),
  undefined
);

productionApiContract.resetApiContractRuntime();
const invalidTargetMenuResponse = await requestArenaPostMenu({
  location: 'subreddit',
  targetId: 't5_wrong_subreddit',
});
assert.equal(invalidTargetMenuResponse.status, 200);
assert.deepEqual(await invalidTargetMenuResponse.json(), {
  showToast: 'Invalid Open Scribbits request.',
});
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);
assert.equal(
  productionApiContract.getApiContractString('arena:currentDay'),
  undefined
);

const wrongLocationMenuResponse = await requestArenaPostMenu({
  location: 'post',
  targetId: 't5_scribbits_test',
});
assert.deepEqual(await wrongLocationMenuResponse.json(), {
  showToast: 'Invalid Open Scribbits request.',
});

const malformedMenuResponse = await productionApiContract.app.request(
  '/internal/menu/post-create',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  }
);
assert.deepEqual(await malformedMenuResponse.json(), {
  showToast: 'Invalid Open Scribbits request.',
});
const missingBodyMenuResponse = await productionApiContract.app.request(
  '/internal/menu/post-create',
  { method: 'POST' }
);
assert.deepEqual(await missingBodyMenuResponse.json(), {
  showToast: 'Invalid Open Scribbits request.',
});
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);
assert.equal(
  productionApiContract.getApiContractString('arena:currentDay'),
  undefined
);

productionApiContract.resetApiContractRuntime();
productionApiContract.failNextApiContractModeratorLookup();
const failedModeratorLookupAttempt = await captureRouteErrors(() =>
  requestArenaPostMenu()
);
assert.equal(failedModeratorLookupAttempt.result.status, 400);
assert.equal(failedModeratorLookupAttempt.errors.length, 1);
assert.deepEqual(await failedModeratorLookupAttempt.result.json(), {
  showToast: 'Failed to open the Scribbits app post',
});
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);
assert.equal(
  productionApiContract.getApiContractString('arena:currentDay'),
  undefined
);
pass('manual Arena post creation reauthorizes subreddit moderators');

const requestSeasonManagement = () =>
  productionApiContract.app.request('/internal/menu/seasons-manage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      location: 'subreddit',
      targetId: 't5_scribbits_test',
    }),
  });
productionApiContract.resetApiContractRuntime({
  userId: 't2_seasonowner',
  username: 'season_owner',
});
productionApiContract.setApiContractSetting(
  'seasonAdminUserIds',
  't2_seasonowner'
);
const authorizedSeasonResponse = await requestSeasonManagement();
assert.equal(
  (await authorizedSeasonResponse.json()).showForm.name,
  'manageSeasons'
);

productionApiContract.resetApiContractRuntime({
  userId: 't2_othermoderator',
  username: 'other_moderator',
});
productionApiContract.setApiContractSetting(
  'seasonAdminUserIds',
  't2_seasonowner'
);
assert.deepEqual(await (await requestSeasonManagement()).json(), {
  showToast: 'Season controls are restricted.',
});

productionApiContract.resetApiContractRuntime({
  userId: 't2_seasonowner',
  username: 'season_owner',
  moderatorIds: [],
});
productionApiContract.setApiContractSetting(
  'seasonAdminUserIds',
  't2_seasonowner'
);
assert.deepEqual(await (await requestSeasonManagement()).json(), {
  showToast: 'Season controls are restricted.',
});
pass(
  'season controls require both the owner allowlist and live moderator role'
);

productionApiContract.resetApiContractRuntime();
const malformedInstallAttempt = await captureRouteErrors(() =>
  productionApiContract.app.request('/internal/triggers/on-app-install', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  })
);
const malformedInstallResponse = malformedInstallAttempt.result;
assert.equal(malformedInstallResponse.status, 400);
assert.equal(malformedInstallAttempt.errors.length, 1);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);

productionApiContract.resetApiContractRuntime();
productionApiContract.failNextApiContractArenaPostReceipt();
const failedReceiptAttempt = await captureRouteErrors(() =>
  requestArenaPostMenu()
);
const failedReceiptResponse = failedReceiptAttempt.result;
assert.equal(failedReceiptResponse.status, 400);
assert.equal(failedReceiptAttempt.errors.length, 1);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);
assert.equal(
  productionApiContract.getApiContractHashField(
    'app:main-post-publishing-claims',
    'main-v3'
  ),
  'published:api-contract-post-1'
);
const recoveredReceiptResponse = await requestArenaPostMenu();
assert.equal(recoveredReceiptResponse.status, 200);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);
assert.equal(
  productionApiContract.getApiContractString('app:main-post:v3'),
  'api-contract-post-1'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.failNextApiContractArenaPostMarker();
const failedMarkerAttempt = await captureRouteErrors(() =>
  requestArenaPostMenu()
);
assert.equal(failedMarkerAttempt.result.status, 400);
assert.equal(failedMarkerAttempt.errors.length, 1);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);
assert.match(
  productionApiContract.getApiContractHashField(
    'app:main-post-publishing-claims',
    'main-v3'
  ) ?? '',
  /^\d+$/
);
const recoveredMarkerResponse = await requestArenaPostMenu();
assert.equal(recoveredMarkerResponse.status, 200);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);

productionApiContract.resetApiContractRuntime();
productionApiContract.failNextApiContractPostLookup();
const failedLookupAttempt = await captureRouteErrors(() =>
  requestArenaPostMenu()
);
assert.equal(failedLookupAttempt.result.status, 400);
assert.equal(failedLookupAttempt.errors.length, 1);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);
assert.equal(
  productionApiContract.getApiContractHashField(
    'app:main-post-publishing-claims',
    'main-v3'
  ),
  undefined,
  'lookup failure must stop before claiming or publishing'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.failNextApiContractPostSubmission();
const failedSubmissionAttempt = await captureRouteErrors(() =>
  requestArenaPostMenu()
);
const failedSubmissionResponse = failedSubmissionAttempt.result;
assert.equal(failedSubmissionResponse.status, 400);
assert.equal(failedSubmissionAttempt.errors.length, 1);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 0);
assert.match(
  productionApiContract.getApiContractHashField(
    'app:main-post-publishing-claims',
    'main-v3'
  ) ?? '',
  /^\d+$/,
  'ambiguous submission failure must retain its claim and fail closed'
);

productionApiContract.resetApiContractRuntime();
const concurrentAttempt = await captureRouteErrors(() =>
  Promise.all([
    requestArenaPostMenu(),
    productionApiContract.app.request('/internal/triggers/on-app-install', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'concurrent-install' }),
    }),
  ])
);
const [concurrentMenuResponse, concurrentInstallResponse] =
  concurrentAttempt.result;
assert.ok(
  [concurrentMenuResponse.status, concurrentInstallResponse.status].includes(
    200
  )
);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);
pass('menu and install routes share current Arena post orchestration');

productionApiContract.resetApiContractRuntime();
productionApiContract.seedApiContractPost({
  id: 'legacy-main-post',
  title: 'Scribbits — Draw. Raise. Battle.',
  postData: { surface: 'main' },
});
productionApiContract.seedApiContractPost({
  id: 'legacy-rumble-post',
  title: 'Rumble #11 — Moonlit drizzle',
  postData: { dayNumber: 11 },
});
productionApiContract.seedApiContractPost({
  id: 'community-lookalike-post',
  title: 'Rumble #11 — Community recap',
  postData: undefined,
  authorName: 'community_member',
});
const upgradeCleanupResponse = await productionApiContract.app.request(
  '/internal/triggers/on-app-upgrade',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'upgrade' }),
  }
);
assert.equal(upgradeCleanupResponse.status, 200);
assert.equal(productionApiContract.apiContractRuntimeState.submittedPosts, 1);
assert.equal(productionApiContract.apiContractRuntimeState.deletedPosts, 2);
assert.match(
  (await upgradeCleanupResponse.json()).message,
  /removed 2 obsolete app posts/
);
pass('upgrade replaces obsolete Scribbits posts with one hooked app post');

const paginationOwnerSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'ui.ts'),
  'utf8'
);
const paginationConsumers = [
  {
    name: 'Collection',
    usesPagination: false,
    modulePath: './ui',
    functionName: 'buildPageControls',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'lib', 'collectionbook.ts'),
      'utf8'
    ),
  },
  {
    name: 'Legacy',
    modulePath: './ui',
    functionName: 'buildPageControls',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'lib', 'legacycards.ts'),
      'utf8'
    ),
  },
  {
    name: 'Battles',
    paginationCallCount: 2,
    modulePath: '../lib/ui',
    functionName: 'buildPagination',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'scenes', 'BattleHistory.ts'),
      'utf8'
    ),
  },
  {
    name: 'Gallery',
    usesPagination: false,
    modulePath: '../lib/ui',
    functionName: 'buildPageControls',
    source: gallerySceneSource,
  },
];
const inspectNamedFunction = (source, functionName) => {
  const sourceFile = typescript.createSourceFile(
    'pagination-consumer.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const calls = [];
  const stringLiterals = [];
  const collectStructure = (node) => {
    if (typescript.isCallExpression(node)) {
      calls.push({
        expression: node.expression.getText(sourceFile),
        arguments: node.arguments.map((argument) =>
          argument.getText(sourceFile)
        ),
      });
    }
    if (
      typescript.isStringLiteral(node) ||
      typescript.isNoSubstitutionTemplateLiteral(node)
    ) {
      stringLiterals.push(node.text);
    }
    typescript.forEachChild(node, collectStructure);
  };
  const visit = (node) => {
    const isTargetFunction =
      ((typescript.isFunctionDeclaration(node) ||
        typescript.isMethodDeclaration(node)) &&
        node.name?.getText(sourceFile) === functionName) ||
      (typescript.isVariableDeclaration(node) &&
        node.name.getText(sourceFile) === functionName &&
        node.initializer &&
        (typescript.isArrowFunction(node.initializer) ||
          typescript.isFunctionExpression(node.initializer)));
    if (isTargetFunction) collectStructure(node);
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { calls, stringLiterals };
};
const inspectNamedFunctionCalls = (source, functionName) =>
  inspectNamedFunction(source, functionName).calls.map(
    ({ expression }) => expression
  );
const isPaginationOverlayAdd = (call) => /actionOverlay.*\.add$/i.test(call);
assert.match(
  paginationOwnerSource,
  /export function paperPagination\(options: PaperPaginationOptions\)/
);
for (const consumer of paginationConsumers.filter(
  ({ usesPagination }) => usesPagination !== false
)) {
  const inspection = inspectTypeScriptModule(consumer.source);
  assert.ok(
    inspection.imports
      .get(consumer.modulePath)
      ?.some(
        ({ imported, local }) =>
          imported === 'paperPagination' && local === 'paperPagination'
      ),
    `${consumer.name} must import the canonical pagination owner without an alias`
  );
  assert.equal(
    inspection.calledIdentifiers.filter((name) => name === 'paperPagination')
      .length,
    consumer.paginationCallCount ?? 1,
    `${consumer.name} must delegate each pagination surface to the canonical owner`
  );
  assert.equal(
    inspection.calledIdentifiers.includes('pageArrowButton'),
    false,
    `${consumer.name} must not rebuild pagination arrows`
  );
  const paginationCalls = inspectNamedFunctionCalls(
    consumer.source,
    consumer.functionName
  );
  assert.equal(
    paginationCalls.some(isPaginationOverlayAdd),
    false,
    `${consumer.name} pagination must not rebuild semantic overlay controls`
  );
}
assert.doesNotMatch(
  paginationConsumers[0].source,
  /paperPagination|function buildPageControls/,
  'Bag inventory must scroll inside its bounded tray instead of paginating'
);
assert.match(paginationConsumers[1].source, /top \+ 665/);
assert.doesNotMatch(
  paginationConsumers[3].source,
  /paperPagination|function buildPageControls/,
  'Growing and Mature fit their bounded three-card sections without pagination'
);
assert.equal(
  inspectNamedFunctionCalls(
    'class Example { buildPageControls() { this.ensureContentActionOverlay().add({}); } }',
    'buildPageControls'
  ).some(isPaginationOverlayAdd),
  true,
  'the pagination ownership guard must catch accessor-based overlay duplication'
);
const aliasedPaginationImport = inspectTypeScriptModule(
  "import { paperPagination as pageArrowButton } from './ui'; pageArrowButton({});"
);
assert.deepEqual(aliasedPaginationImport.imports.get('./ui'), [
  { imported: 'paperPagination', local: 'pageArrowButton' },
]);
pass('paper pagination has one owner while Bag uses one bounded scroll grid');

assert.match(paginationConsumers[0].source, /function buildOwnedItems\(/);
assert.doesNotMatch(
  paginationConsumers[0].source,
  /\.flatMap\(\(\{ entry, ownership \}\)/,
  'owned counts should stay consolidated into one visible gear card'
);
assert.doesNotMatch(paginationConsumers[0].source, /FORGE ITEM/);
assert.match(
  paginationConsumers[0].source,
  /export type DrawKitSection = 'colors' \| 'brushes' \| 'titles'/
);
assert.match(
  paginationConsumers[0].source,
  /export type InkKitSection = EquipmentCategory \| DrawKitSection/
);
assert.doesNotMatch(paginationConsumers[0].source, /accessoryEffect/);
pass(
  'Ink Kit shows consolidated gear across the canonical equipment categories'
);

const cardPressConsumers = [
  {
    name: 'Legacy',
    modulePath: './ui',
    functionName: 'buildLegacyCard',
    source: paginationConsumers[1].source,
    scaleX: '0.97',
    scaleY: '0.97',
    retiredRestoreHelper: /\brestoreScale\b/,
  },
];
assert.match(
  paginationConsumers[0].source,
  /mountBagInventoryGrid\(/,
  'Bag cards must delegate touch and keyboard input to the bounded native scroll grid'
);
for (const consumer of cardPressConsumers) {
  const moduleInspection = inspectTypeScriptModule(consumer.source);
  assert.ok(
    moduleInspection.imports
      .get(consumer.modulePath)
      ?.some(
        ({ imported, local }) =>
          imported === 'addCardPressInteraction' &&
          local === 'addCardPressInteraction'
      ),
    `${consumer.name} cards must import the canonical press owner without an alias`
  );
  assert.ok(
    moduleInspection.calledIdentifiers.filter(
      (name) => name === 'addCardPressInteraction'
    ).length >= 1,
    `${consumer.name} must delegate card presses to the canonical owner`
  );
  const functionInspection = inspectNamedFunction(
    consumer.source,
    consumer.functionName
  );
  const interactionCalls = functionInspection.calls.filter(
    ({ expression }) => expression === 'addCardPressInteraction'
  );
  assert.equal(interactionCalls.length, 1);
  assert.match(
    interactionCalls[0].arguments[0] ?? '',
    new RegExp(`pressedScaleX:\\s*${consumer.scaleX.replace('.', '\\.')}`)
  );
  assert.match(
    interactionCalls[0].arguments[0] ?? '',
    new RegExp(`pressedScaleY:\\s*${consumer.scaleY.replace('.', '\\.')}`)
  );
  for (const pointerEvent of ['pointerdown', 'pointerout', 'pointerup']) {
    assert.equal(
      functionInspection.stringLiterals.includes(pointerEvent),
      false,
      `${consumer.name} cards must not rebuild ${pointerEvent} behavior`
    );
  }
  assert.doesNotMatch(consumer.source, consumer.retiredRestoreHelper);
}
assert.deepEqual(
  inspectNamedFunction(
    "function buildCosmeticCard() { hit.on('pointerdown', press); }",
    'buildCosmeticCard'
  ).stringLiterals,
  ['pointerdown'],
  'the card ownership guard must catch direct pointer-event recreation'
);
const cardPressOwnerInspection = inspectNamedFunction(
  paginationOwnerSource,
  'addCardPressInteraction'
);
const cardPressOwnerCall = cardPressOwnerInspection.calls.find(
  ({ expression }) => expression === 'wireButtonPress'
);
assert.ok(cardPressOwnerCall);
assert.match(cardPressOwnerCall.arguments[4] ?? '', /pressOnHover:\s*false/);

const cardPressListeners = new Map();
const gamePressListeners = new Map();
const shutdownPressListeners = new Map();
const cardPressEvents = [];
const makePressEventTarget = (listeners) => ({
  on(event, listener) {
    const eventListeners = listeners.get(event) ?? [];
    eventListeners.push(listener);
    listeners.set(event, eventListeners);
  },
  once(event, listener) {
    this.on(event, listener);
  },
  off(event, listener) {
    listeners.set(
      event,
      (listeners.get(event) ?? []).filter((candidate) => candidate !== listener)
    );
  },
});
pressInteraction.bindPressInteractionEvents(
  makePressEventTarget(cardPressListeners),
  {
    press: () => cardPressEvents.push('press'),
    release: () => cardPressEvents.push('release'),
    activate: () => cardPressEvents.push('activate'),
    pressOnHover: false,
  },
  {
    gameTarget: makePressEventTarget(gamePressListeners),
    shutdownTarget: makePressEventTarget(shutdownPressListeners),
  }
);
assert.deepEqual([...cardPressListeners.keys()].sort(), [
  'destroy',
  'pointerdown',
  'pointerout',
  'pointerup',
  'pointerupoutside',
]);
for (const listeners of cardPressListeners.values()) {
  assert.equal(listeners.length, 1, 'each card pointer event must bind once');
}
cardPressListeners.get('pointerup')[0]({ id: 1 });
assert.deepEqual(cardPressEvents, []);
cardPressListeners.get('pointerdown')[0]({ id: 1 });
assert.deepEqual(cardPressEvents, ['press']);
cardPressListeners.get('pointerout')[0]({ id: 1 });
assert.deepEqual(cardPressEvents, ['press', 'release']);
cardPressListeners.get('pointerup')[0]({ id: 1 });
assert.deepEqual(cardPressEvents, ['press', 'release']);
cardPressListeners.get('pointerdown')[0]({ id: 2 });
cardPressListeners.get('pointerup')[0]({ id: 3 });
assert.deepEqual(cardPressEvents, ['press', 'release', 'press']);
cardPressListeners.get('pointerup')[0]({ id: 2 });
assert.deepEqual(cardPressEvents, [
  'press',
  'release',
  'press',
  'release',
  'activate',
]);
cardPressListeners.get('pointerdown')[0]({ id: 4 });
gamePressListeners.get('gameout')[0]();
assert.deepEqual(cardPressEvents.slice(-2), ['press', 'release']);
const eventCountBeforeShutdown = cardPressEvents.length;
cardPressListeners.get('pointerdown')[0]({ id: 5 });
shutdownPressListeners.get('shutdown')[0]();
assert.equal(cardPressEvents.length, eventCountBeforeShutdown + 1);
assert.equal(cardPressEvents.at(-1), 'press');
assert.deepEqual(gamePressListeners.get('gameout'), []);
for (const listeners of cardPressListeners.values()) {
  assert.equal(listeners.length, 0, 'shutdown must release target listeners');
}

const destroyedTargetListeners = new Map();
const destroyedTargetGameListeners = new Map();
const destroyedTargetShutdownListeners = new Map();
let destroyedTargetReleaseCount = 0;
pressInteraction.bindPressInteractionEvents(
  makePressEventTarget(destroyedTargetListeners),
  {
    press: () => {},
    release: () => {
      destroyedTargetReleaseCount += 1;
    },
    activate: () => {},
  },
  {
    gameTarget: makePressEventTarget(destroyedTargetGameListeners),
    shutdownTarget: makePressEventTarget(destroyedTargetShutdownListeners),
  }
);
destroyedTargetListeners.get('pointerdown')[0]({ id: 1 });
destroyedTargetListeners.get('destroy')[0]();
assert.equal(
  destroyedTargetReleaseCount,
  0,
  'Phaser teardown must not start a release tween on a destroying control'
);
assert.deepEqual(destroyedTargetGameListeners.get('gameout'), []);
assert.deepEqual(destroyedTargetShutdownListeners.get('shutdown'), []);
for (const listeners of destroyedTargetListeners.values()) {
  assert.equal(
    listeners.length,
    0,
    'destroyed controls must release every press listener immediately'
  );
}
pass('press interactions release scene listeners with their controls');

const pressEventConsumers = [
  {
    name: 'app dock tabs',
    modulePath: './pressinteraction',
    functionName: 'wireTab',
    source: paginationOwnerSource,
  },
  {
    name: 'battle journal rows',
    modulePath: '../lib/pressinteraction',
    functionName: 'buildRow',
    source: paginationConsumers[2].source,
  },
  {
    name: 'draw tool buttons',
    modulePath: '../lib/pressinteraction',
    functionName: 'toolIconButton',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'scenes', 'Draw.ts'),
      'utf8'
    ),
  },
  {
    name: 'draw palette',
    modulePath: '../lib/pressinteraction',
    functionName: 'buildPaletteRow',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'scenes', 'Draw.ts'),
      'utf8'
    ),
  },
  {
    name: 'draw premium pen',
    modulePath: '../lib/pressinteraction',
    functionName: 'buildPremiumPenControl',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'scenes', 'Draw.ts'),
      'utf8'
    ),
  },
  {
    name: 'draw brush size',
    modulePath: '../lib/pressinteraction',
    functionName: 'buildLineWidthControl',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'scenes', 'Draw.ts'),
      'utf8'
    ),
  },
  {
    name: 'Gallery section tabs',
    modulePath: '../lib/pressinteraction',
    functionName: 'buildTabs',
    source: gallerySceneSource,
  },
  {
    name: 'Gallery owned Scribbit cards',
    modulePath: '../lib/pressinteraction',
    functionName: 'buildOwnedScribbitCard',
    source: gallerySceneSource,
  },
  {
    name: 'Scout day tabs',
    modulePath: '../lib/pressinteraction',
    functionName: 'renderDayTabs',
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'scenes', 'ScoutNotebook.ts'),
      'utf8'
    ),
  },
];
for (const consumer of pressEventConsumers) {
  const moduleInspection = inspectTypeScriptModule(consumer.source);
  assert.ok(
    moduleInspection.imports
      .get(consumer.modulePath)
      ?.some(
        ({ imported, local }) =>
          imported === 'bindPressInteractionEvents' &&
          local === 'bindPressInteractionEvents'
      ),
    `${consumer.name} must import the canonical press event binder`
  );
  const functionInspection = inspectNamedFunction(
    consumer.source,
    consumer.functionName
  );
  assert.equal(
    functionInspection.calls.filter(
      ({ expression }) => expression === 'bindPressInteractionEvents'
    ).length,
    1,
    `${consumer.name} must delegate once to the canonical press event binder`
  );
  for (const pointerEvent of ['pointerdown', 'pointerout', 'pointerup']) {
    assert.equal(
      functionInspection.stringLiterals.includes(pointerEvent),
      false,
      `${consumer.name} must not rebuild ${pointerEvent} ordering`
    );
  }
}
pass('paper press ordering has one event binder');

const drawSceneSource = readFileSync(
  join(repoRoot, 'src', 'client', 'scenes', 'Draw.ts'),
  'utf8'
);
for (const [functionName, minimumNativeControls] of [
  ['buildChrome', 1],
  ['buildSubmitControl', 1],
  ['buildPaletteRow', 1],
  ['buildPremiumPenControl', 1],
  ['buildBrushSupplyControl', 1],
  ['toolIconButton', 1],
  ['buildLineWidthControl', 2],
]) {
  const inspection = inspectNamedFunction(drawSceneSource, functionName);
  assert.ok(
    inspection.calls.filter(
      ({ expression }) => expression === 'this.addNativeControl'
    ).length >= minimumNativeControls,
    `${functionName} must mirror its canvas controls for keyboard input`
  );
}
assert.match(drawSceneSource, /this\.submitControl\.disabled = !ready/);
assert.match(
  drawSceneSource,
  /this\.submitControl\.tabIndex = ready \? 0 : -1/
);
assert.match(
  drawSceneSource,
  /this\.submitControl\.setAttribute\('aria-hidden', 'false'\)/,
  'the visible disabled Draw action must remain exposed to assistive technology'
);
assert.match(
  drawSceneSource,
  /if \(child\.input\) child\.input\.enabled = ready/
);
assert.match(
  drawSceneSource,
  /if \(!ready\) \{[\s\S]*submitButton\.setVisible\(true\)\.setAlpha\(0\.58\)/,
  'Draw keeps one visibly disabled next action instead of an empty footer'
);
assert.match(
  drawSceneSource,
  /this\.overlay\.moveAfter\(this\.headerControlOverlay\)/
);
assert.match(
  drawSceneSource,
  /this\.toolControlOverlay\.moveAfter\(this\.overlay\)/
);
assert.match(drawSceneSource, /this\.submitOverlay\?\.moveAfter\(afterTools\)/);
assert.match(drawSceneSource, /'Decrease brush size'/);
assert.match(drawSceneSource, /'Increase brush size'/);
assert.match(
  drawSceneSource,
  /this\.setLineWidth\(this\.lineWidth - LINE_WIDTH_STEP\)/
);
assert.match(
  drawSceneSource,
  /this\.setLineWidth\(this\.lineWidth \+ LINE_WIDTH_STEP\)/
);
assert.doesNotMatch(
  drawSceneSource,
  /next > MAX_LINE_WIDTH \? MIN_LINE_WIDTH : next/,
  'brush sizing must clamp instead of wrapping from thickest to thinnest'
);
assert.match(drawSceneSource, /private buildLiveStatsStrip\(/);
assert.match(drawSceneSource, /this\.updateLiveStats\(ready\)/);
assert.match(drawSceneSource, /this\.buildDetectedFighterStyleIndicator\(\)/);
assert.match(
  drawSceneSource,
  /getCombatRoleContent\(this\.detectedFighterStyle\)/
);
assert.match(
  drawSceneSource,
  /the color covering the most area sets the final role\./
);
const paperIconsSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'papericons.ts'),
  'utf8'
);
assert.match(
  paperIconsSource,
  /PaperStatIconKey = 'chonk' \| 'spike' \| 'zip' \| 'charm'/
);
for (const statIcon of ['chonk', 'spike', 'zip']) {
  assert.match(
    paperIconsSource,
    new RegExp(`key === '${statIcon}'`),
    `${statIcon} must have a compact Draw stat icon`
  );
}
assert.match(paperIconsSource, /const heart = \[/);
assert.match(drawSceneSource, /drawingSupplies: \{/);
assert.match(drawSceneSource, /this\.canvas\?\.setBrushEffect/);
const drawCanvasSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'drawcanvas.ts'),
  'utf8'
);
for (const collectibleBrushEffect of ['chalk', 'ribbon', 'spray']) {
  assert.match(
    drawCanvasSource,
    new RegExp(`brushEffect === '${collectibleBrushEffect}'`),
    `${collectibleBrushEffect} must render a distinct canvas stroke`
  );
}
const overlayLifecycleSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'overlay.ts'),
  'utf8'
);
assert.match(overlayLifecycleSource, /liveOverlays = new Set<DomOverlay>/);
assert.match(
  overlayLifecycleSource,
  /nativeButton\.addEventListener\('click', activate\)/
);
assert.match(
  overlayLifecycleSource,
  /event\.preventDefault\(\);[\s\S]*nativeButton\.click\(\)/
);
assert.match(
  overlayLifecycleSource,
  /for \(const overlay of \[\.\.\.DomOverlay\.liveOverlays\]\) overlay\.destroy\(\)/
);
pass('Draw keyboard controls and defensive overlay cleanup stay complete');

const inspectTopLevelDeclarations = (source) => {
  const sourceFile = typescript.createSourceFile(
    'dead-client-symbols.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const declarations = new Map();
  for (const statement of sourceFile.statements) {
    const exported =
      statement.modifiers?.some(
        (modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword
      ) ?? false;
    if (typescript.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (typescript.isIdentifier(declaration.name)) {
          declarations.set(declaration.name.text, exported);
        }
      }
      continue;
    }
    if (
      (typescript.isFunctionDeclaration(statement) ||
        typescript.isTypeAliasDeclaration(statement) ||
        typescript.isInterfaceDeclaration(statement) ||
        typescript.isClassDeclaration(statement) ||
        typescript.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      declarations.set(statement.name.text, exported);
    }
  }
  return declarations;
};
const inspectModuleExports = (source) => {
  const exports = [...inspectTopLevelDeclarations(source)]
    .filter(([, exported]) => exported)
    .map(([name]) => ({ local: name, exported: name }));
  const sourceFile = typescript.createSourceFile(
    'client-exports.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  for (const statement of sourceFile.statements) {
    if (
      typescript.isExportDeclaration(statement) &&
      statement.exportClause &&
      typescript.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        exports.push({
          local: (element.propertyName ?? element.name).text,
          exported: element.name.text,
        });
      }
    }
  }
  return exports;
};
const inspectModuleExportNames = (source) =>
  new Set(inspectModuleExports(source).map(({ exported }) => exported));
const scribbitsClientSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'scribbits.ts'),
  'utf8'
);
const practiceLabClientSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'practicelab.ts'),
  'utf8'
);
const legacyCardsClientSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'legacycards.ts'),
  'utf8'
);
const retiredClientSymbols = [
  {
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'lib', 'api.ts'),
      'utf8'
    ),
    names: ['fetchSplash'],
  },
  {
    source: galleryRegistrySource,
    names: [
      'getPracticePowers',
      'findMyScribbit',
      'findAnyScribbit',
      'isMyScribbit',
    ],
  },
  {
    source: scribbitsClientSource,
    names: ['addFittedDrawing', 'loadDrawings'],
  },
  {
    source: paginationOwnerSource,
    names: ['dominantButton', 'rosette', 'pageArrowButton'],
  },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'client', 'lib', 'theme.ts'),
      'utf8'
    ),
    names: ['SPACE', 'TOP_SAFE'],
  },
  {
    source: practiceLabClientSource,
    names: [
      'PRACTICE_PROMISE',
      'normalizePracticePowers',
      'practiceFoundPowerCopy',
    ],
  },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'server', 'core', 'scribbit.ts'),
      'utf8'
    ),
    names: ['recordBattleResultOnScribbits'],
  },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'server', 'core', 'migrations.ts'),
      'utf8'
    ),
    names: ['getArenaMigrationStateKey'],
  },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'shared', 'combat', 'types.ts'),
      'utf8'
    ),
    names: ['PrimaryAbilityConfig'],
  },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'shared', 'content', 'replaycommentary.ts'),
      'utf8'
    ),
    names: ['INKCAST_COMMENTARY_LINE_COUNT'],
  },
];
for (const { source, names } of retiredClientSymbols) {
  const declarations = inspectTopLevelDeclarations(source);
  for (const name of names) {
    assert.equal(
      declarations.has(name),
      false,
      `${name} must not return as an unused client declaration`
    );
  }
}
const privateClientSymbols = [
  {
    source: galleryRegistrySource,
    names: ['ReplayEntryMode', 'StagedDirectBattle'],
  },
  {
    source: scribbitsClientSource,
    names: ['DrawingSource', 'drawingKey'],
  },
  {
    source: paginationOwnerSource,
    names: [
      'CardPressInteractionOptions',
      'PaperPaginationOptions',
      'roundedPanel',
      'StatGrid',
      'ProgressBar',
    ],
  },
  {
    source: practiceLabClientSource,
    names: [
      'PracticeOutcomePlan',
      'normalizePracticeRoles',
      'practiceChecklistCopy',
      'practiceResultCopy',
      'practiceFoundRoleCopy',
      'isPracticeSessionComplete',
    ],
  },
  { source: legacyCardsClientSource, names: ['legacyEulogy'] },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'server', 'core', 'battleStore.ts'),
      'utf8'
    ),
    names: ['getFeaturedRumbleReportsKey', 'getScribbitBattlesKey'],
  },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'server', 'core', 'scribbit.ts'),
      'utf8'
    ),
    names: ['hydrateScribbit'],
  },
  {
    source: readFileSync(
      join(repoRoot, 'src', 'shared', 'cosmetics.ts'),
      'utf8'
    ),
    names: ['PERSISTED_GEAR_BY_ID'],
  },
];
for (const { source, names } of privateClientSymbols) {
  const declarations = inspectTopLevelDeclarations(source);
  const moduleExports = inspectModuleExports(source);
  for (const name of names) {
    assert.equal(
      declarations.get(name),
      false,
      `${name} must stay module-private`
    );
    assert.equal(
      moduleExports.some(({ local }) => local === name),
      false,
      `${name} must not be exposed through an export declaration`
    );
  }
}
const retiredClientSymbolNames = new Set(
  retiredClientSymbols.flatMap(({ names }) => names)
);
const projectModuleExportNames = new Set(
  listFilePaths(join(repoRoot, 'src'))
    .filter((filePath) => filePath.endsWith('.ts'))
    .flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const directExports = [...inspectTopLevelDeclarations(source)]
        .filter(([, exported]) => exported)
        .map(([name]) => name);
      return [...directExports, ...inspectModuleExportNames(source)];
    })
);
for (const retiredName of retiredClientSymbolNames) {
  assert.equal(
    projectModuleExportNames.has(retiredName),
    false,
    `${retiredName} must not return through a direct or aliased project export`
  );
}
assert.deepEqual(
  [
    ...inspectTopLevelDeclarations(
      'export const SPACE = {}; export function fetchSplash() {} type Local = string;'
    ),
  ],
  [
    ['SPACE', true],
    ['fetchSplash', true],
    ['Local', false],
  ],
  'the dead-symbol guard must distinguish exported and module-private declarations'
);
assert.equal(
  inspectModuleExportNames(
    'const fetchArena = () => {}; export { fetchArena as fetchSplash };'
  ).has('fetchSplash'),
  true,
  'the client export guard must catch renamed re-export aliases'
);
assert.equal(
  inspectModuleExports(
    'function drawingKey() {} export { drawingKey as stableDrawingKey };'
  ).some(
    ({ local, exported }) =>
      local === 'drawingKey' && exported === 'stableDrawingKey'
  ),
  true,
  'the private-symbol guard must catch renamed exports of local helpers'
);
pass('retired client, server, and shared symbols stay out of the module graph');

const rivalDraftSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'replaysparrivaldraft.ts'),
  'utf8'
);
const rivalDraftInspection = inspectTypeScriptModule(rivalDraftSource);
assert.deepEqual(rivalDraftInspection.imports.get('./overlay'), [
  { imported: 'CanvasModalOverlay', local: 'CanvasModalOverlay' },
]);
assert.doesNotMatch(rivalDraftSource, /CanvasActionOverlay|setRootAttributes/);
const rivalDraftSourceFile = typescript.createSourceFile(
  'replaysparrivaldraft.ts',
  rivalDraftSource,
  typescript.ScriptTarget.Latest,
  true,
  typescript.ScriptKind.TS
);
let rivalDraftModalConstructions = 0;
const countRivalDraftModals = (node) => {
  if (
    typescript.isNewExpression(node) &&
    typescript.isIdentifier(node.expression) &&
    node.expression.text === 'CanvasModalOverlay'
  ) {
    rivalDraftModalConstructions += 1;
  }
  typescript.forEachChild(node, countRivalDraftModals);
};
countRivalDraftModals(rivalDraftSourceFile);
assert.equal(
  rivalDraftModalConstructions,
  2,
  'rival draft and nested rival details must each compose the canonical modal lifecycle'
);
assert.match(rivalDraftSource, /detailModalActions\?\.destroy\(\)/);
assert.match(rivalDraftSource, /draftModalActions\.destroy\(\)/);
assert.match(rivalDraftSource, /addStatus\(/);
assert.equal(
  inspectNamedFunctionCalls(rivalDraftSource, 'setInteractionReady').some(
    (call) => call.endsWith('.setVisible')
  ),
  false,
  'rival loading must retain a reachable dialog instead of hiding its keyboard layer'
);
const modalOverlaySource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'overlay.ts'),
  'utf8'
);
assert.match(modalOverlaySource, /activeStack\.at\(-1\) !== this/);
assert.match(modalOverlaySource, /stopImmediatePropagation\(\)/);
assert.match(modalOverlaySource, /this\.trigger\?\.isConnected/);
const replaySceneSource = readFileSync(
  join(repoRoot, 'src', 'client', 'scenes', 'Replay.ts'),
  'utf8'
);
assert.match(replaySceneSource, /this\.battleHud\?\.playFighterDamage\(/);
assert.match(
  replaySceneSource,
  /this\.add\.image\(0, 0, FIGHT_START_TEXTURE\)/
);
assert.match(
  replaySceneSource,
  /Math\.min\(460, width \* 0\.66\) \/ banner\.width/,
  'the illustrated fight stamp should read as the dominant intro beat on mobile'
);
assert.match(replaySceneSource, /createStickerShine\(/);
assert.match(replaySceneSource, /fightIntroShine = shine/);
assert.match(
  replaySceneSource,
  /killTweensOf\(this\.introBanner\)[\s\S]{0,180}killTweensOf\(this\.introShine\.displayObject\)/,
  'skip and shutdown should release every intro animation target'
);
assert.match(
  replaySceneSource,
  /angle: \{ from: -2\.4, to: 2\.4 \}[\s\S]{0,140}repeat: 2/,
  'the fight sticker should receive a short tactile wobble'
);
assert.match(replaySceneSource, /cameras\.main\.shake\(140, 0\.006\)/);
assert.doesNotMatch(
  replaySceneSource,
  /strokePaperArenaBoundary|floorGraphics\.fillRect/,
  'the late-fight warning must not draw a closed dark box over the fighters'
);
assert.match(replaySceneSource, /const warningHalfHeight = Math\.min\(84/);
assert.match(
  replaySceneSource,
  /fighterTop - \(banner\.height \* finalScale\) \/ 2 - 10/,
  'the fight stamp should clear the fighters instead of covering their faces'
);
assert.doesNotMatch(
  replaySceneSource,
  /['"]FIGHT!['"][\s\S]{0,120}setStroke/,
  'the old dark text fight stamp should stay removed'
);
assert.doesNotMatch(
  replaySceneSource,
  /getShapePowerRevealCopy|getShapePowerSignatureName|planShapePowerCallout/,
  'Replay should let combat effects and plain commentary explain powers without cryptic move overlays'
);
const replayPostFightActionsSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'replaypostfightactions.ts'),
  'utf8'
);
const battleCeremonySource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'battleceremony.ts'),
  'utf8'
);
const liveSpriteSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'livesprite.ts'),
  'utf8'
);
assert.match(replaySceneSource, /const restorePostFightFocus/);
assert.match(replaySceneSource, /rivalDraftTrigger\?\.isConnected/);
assert.match(replaySceneSource, /rivalDraftTrigger\.focus\(\)/);
assert.match(
  replaySceneSource,
  /this\.isSavedReplay\(\) && destination\.kind === 'return'\)[\s\S]*startScene\(this, getReplayReturn\(this\)\)/,
  'read-only saved replays should return without a blocking Arena refresh'
);
assert.match(
  replaySceneSource,
  /if \(!result\.ok\) \{[\s\S]*showToast\(result\.error\);[\s\S]*return;/,
  'fresh fight results must stay visible when Arena reconciliation fails'
);
assert.match(
  arenaHomeSource,
  /getBattleArenaForDay\(this\.state\.dayNumber\)/,
  'Arena must reveal the canonical daily battle arena before the player fights'
);
assert.match(
  arenaHomeSource,
  /battleArena\.challengeLabel/,
  'Arena must reveal the canonical daily arena goal before fighter selection'
);
pass('Rival draft composes the canonical nested modal lifecycle');

assert.match(
  replayPostFightActionsSource,
  /showBackMark \? `‹ \$\{action\.label\}` : action\.label/,
  'compact post-fight returns must keep their destination label visible'
);
assert.doesNotMatch(
  replayPostFightActionsSource,
  /compactReturn \? ['"]‹['"] : action\.label/,
  'post-fight return must not collapse back into an unexplained arrow'
);
pass('post-fight return keeps its destination visible');

assert.match(battleCeremonySource, /rivalryStakes\.episodeCue/);
assert.match(replaySceneSource, /founderEpisodeReceipt\?\.resultLine/);
assert.doesNotMatch(
  replaySceneSource,
  /founderEpisodeReceipt\?\.headline\s*\?\?/,
  'post-fight Founder copy must pay off the authored result line instead of repeating its generic score headline'
);
pass(
  'Founder Rival episode cues and result lines reach the live battle surfaces'
);

assert.match(liveSpriteSource, /private readonly reactionContainer/);
assert.match(liveSpriteSource, /private readonly poseContainer/);
assert.match(liveSpriteSource, /targets: this\.poseContainer/);
assert.match(liveSpriteSource, /targets: this\.reactionContainer/);
assert.doesNotMatch(
  replaySceneSource,
  /critFlash/,
  'critical hits should stay local instead of flashing the whole viewport'
);
assert.match(replaySceneSource, /cameraShakeCooldownMilliseconds/);
pass('replay presentation cannot fight authoritative fighter coordinates');

productionApiContract.resetApiContractRuntime({
  userId: null,
  username: null,
});
const unauthenticatedPickResponse = await productionApiContract.app.request(
  '/api/back',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }
);
assert.equal(unauthenticatedPickResponse.status, 401);
assert.deepEqual(await unauthenticatedPickResponse.json(), {
  status: 'error',
  code: 'unauthorized',
  message: 'Sign in to make a Pick.',
});
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  0,
  'unauthenticated requests must not acquire a player mutation lease'
);

const unauthenticatedDailyLoginResponse =
  await productionApiContract.app.request('/api/daily-login/claim', {
    method: 'POST',
  });
assert.equal(unauthenticatedDailyLoginResponse.status, 401);
assert.deepEqual(await unauthenticatedDailyLoginResponse.json(), {
  status: 'error',
  code: 'unauthorized',
  message: 'Sign in to claim your daily login reward.',
});
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  0,
  'anonymous daily login must not acquire a mutation lease'
);

const unauthenticatedInventoryResponse =
  await productionApiContract.app.request('/api/inventory');
assert.equal(unauthenticatedInventoryResponse.status, 200);
assert.deepEqual(await unauthenticatedInventoryResponse.json(), {
  items: {},
  gear: {},
  pens: [],
  titles: [],
  equippedTitle: null,
  discovered: [],
});
const unauthenticatedInventoryMutations = [
  ['/api/equip-gear', 'Sign in to equip Gear.'],
  ['/api/equip-title', 'Sign in to wear a creator title.'],
  ['/api/merge-gear', 'Sign in to forge your Gear.'],
  ['/api/capsule', 'Sign in to open a Mystery Ink capsule.'],
];
for (const [route, message] of unauthenticatedInventoryMutations) {
  const response = await productionApiContract.app.request(route, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    status: 'error',
    code: 'unauthorized',
    message,
  });
}
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  0,
  'anonymous inventory routes must not acquire a mutation lease'
);

const unauthenticatedLegacyCardsResponse =
  await productionApiContract.app.request('/api/legacy-cards?limit=1');
assert.equal(unauthenticatedLegacyCardsResponse.status, 200);
assert.deepEqual(await unauthenticatedLegacyCardsResponse.json(), {
  cards: [],
  nextCursor: null,
});
const unauthenticatedLegendsResponse =
  await productionApiContract.app.request('/api/legends');
assert.equal(unauthenticatedLegendsResponse.status, 200);
assert.deepEqual(await unauthenticatedLegendsResponse.json(), {
  legends: [],
  nextCursor: null,
});
const unauthenticatedLegacySeenResponse =
  await productionApiContract.app.request('/api/legacy-cards/seen', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ throughArchivedDay: 1 }),
  });
assert.equal(unauthenticatedLegacySeenResponse.status, 401);
assert.deepEqual(await unauthenticatedLegacySeenResponse.json(), {
  status: 'error',
  code: 'unauthorized',
  message: 'Sign in to file away Legacy Cards.',
});
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  0,
  'anonymous Legacy and Legends routes must not acquire a mutation lease'
);

productionApiContract.resetApiContractRuntime();
const dailyLoginResponse = await productionApiContract.app.request(
  '/api/daily-login/claim',
  { method: 'POST' }
);
assert.equal(dailyLoginResponse.status, 200);
const dailyLoginBody = await dailyLoginResponse.json();
assert.equal(dailyLoginBody.dailyLogin.claimedTrackDays, 1);
assert.equal(dailyLoginBody.dailyLogin.totalClaimedDays, 1);
assert.equal(dailyLoginBody.dailyLogin.claimedToday, true);
assert.deepEqual(
  {
    trackDay: dailyLoginBody.reward.trackDay,
    cycleDay: dailyLoginBody.reward.cycleDay,
    inkAwarded: dailyLoginBody.reward.inkAwarded,
    gearId: dailyLoginBody.reward.gearId,
  },
  { trackDay: 1, cycleDay: null, inkAwarded: 1, gearId: null }
);
assert.ok(Number.isSafeInteger(dailyLoginBody.reward.claimedAtMs));
assert.equal(dailyLoginBody.ink, 1);
assert.ok(
  productionApiContract.apiContractRuntimeState.watchCalls >= 2,
  'daily login must run under the player lease and its atomic claim transaction'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'successful daily login must release the player mutation lease'
);

const repeatedDailyLoginResponse = await productionApiContract.app.request(
  '/api/daily-login/claim',
  { method: 'POST' }
);
assert.equal(repeatedDailyLoginResponse.status, 200);
assert.deepEqual(await repeatedDailyLoginResponse.json(), dailyLoginBody);
assert.equal(
  productionApiContract.getApiContractString(
    inkStore.getInkKey('api-contract-user')
  ),
  '1',
  'same-day daily login retries must not duplicate Ink'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'same-day daily login retries must release the player mutation lease'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString('arena:currentDay', 1);
const rolloverDailyLoginResponse = await productionApiContract.app.request(
  '/api/daily-login/claim',
  { method: 'POST' }
);
assert.equal(rolloverDailyLoginResponse.status, 409);
assert.deepEqual(await rolloverDailyLoginResponse.json(), {
  status: 'error',
  code: 'conflict',
  message: 'The Rumble is resolving. Try again in a moment.',
});
assert.equal(
  productionApiContract.getApiContractString(
    inkStore.getInkKey('api-contract-user')
  ),
  undefined,
  'rollover conflicts must not mutate daily rewards'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'rollover conflicts must release the player mutation lease'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.failNextApiContractHashRead();
const dailyLoginRouteErrors = [];
const originalDailyLoginConsoleError = console.error;
console.error = (...values) => dailyLoginRouteErrors.push(values);
let failedDailyLoginResponse;
try {
  failedDailyLoginResponse = await productionApiContract.app.request(
    '/api/daily-login/claim',
    { method: 'POST' }
  );
} finally {
  console.error = originalDailyLoginConsoleError;
}
assert.equal(failedDailyLoginResponse.status, 500);
assert.deepEqual(await failedDailyLoginResponse.json(), {
  status: 'error',
  code: 'server_error',
  message: 'Your daily reward would not open. Try again soon.',
});
assert.equal(dailyLoginRouteErrors.length, 1);
assert.equal(
  productionApiContract.getApiContractString(
    inkStore.getInkKey('api-contract-user')
  ),
  undefined,
  'failed daily login claims must not mutate Ink'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'failed daily login claims must release the player mutation lease'
);

const invalidInventoryMutations = [
  ['/api/equip-gear', 'Choose a valid living Scribbit and Gear slot.'],
  ['/api/equip-title', 'Choose an owned title or remove your current title.'],
  ['/api/merge-gear', 'Forge Gear with a valid operation id.'],
  ['/api/capsule', 'Open the capsule with a valid operation id.'],
];
for (const [route, message] of invalidInventoryMutations) {
  productionApiContract.resetApiContractRuntime();
  const response = await productionApiContract.app.request(route, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    status: 'error',
    code: 'bad_request',
    message,
  });
  assert.ok(productionApiContract.apiContractRuntimeState.watchCalls >= 3);
  assert.equal(
    productionApiContract.getApiContractString(playerMutationLockKey),
    undefined
  );
}

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString('arena:currentDay', 25);
const pendingCapsuleOperationId = 'pending-capsule-0001';
productionApiContract.setApiContractString(
  inkStore.getCapsuleOperationKey(
    'api-contract-user',
    pendingCapsuleOperationId
  ),
  `pending:${Date.now()}`
);
const pendingCapsuleResponse = await productionApiContract.app.request(
  '/api/capsule',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operationId: pendingCapsuleOperationId }),
  }
);
assert.equal(pendingCapsuleResponse.status, 409);
assert.deepEqual(await pendingCapsuleResponse.json(), {
  status: 'error',
  code: 'conflict',
  message: 'That capsule is already opening. Try again in a moment.',
});
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined
);

productionApiContract.resetApiContractRuntime();
const malformedPickResponse = await productionApiContract.app.request(
  '/api/back',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  }
);
assert.equal(malformedPickResponse.status, 400);
assert.deepEqual(await malformedPickResponse.json(), {
  status: 'error',
  code: 'bad_request',
  message: 'Choose a valid Scribbit for your Pick.',
});
assert.ok(
  productionApiContract.apiContractRuntimeState.watchCalls >= 3,
  'authenticated mutation middleware must acquire, renew, and release its lease'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'validation failures must still release the player mutation lease'
);

const invalidDrawingSubmissionBody = JSON.stringify({
  padding: 'x'.repeat(
    scribbitCore.MAXIMUM_DRAWING_SUBMISSION_BODY_BYTES - 1_024
  ),
});
const oversizedDrawingSubmissionBody = JSON.stringify({
  padding: 'x'.repeat(scribbitCore.MAXIMUM_DRAWING_SUBMISSION_BODY_BYTES + 1),
});
for (const route of ['/api/free-drawing', '/api/scribbit']) {
  productionApiContract.resetApiContractRuntime();
  const invalidDrawingResponse = await productionApiContract.app.request(
    route,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: invalidDrawingSubmissionBody,
    }
  );
  assert.equal(
    invalidDrawingResponse.status,
    400,
    `${route} must allow a body below the submission boundary to reach validation`
  );
  assert.ok(
    productionApiContract.apiContractRuntimeState.watchCalls >= 3,
    `${route} validation must run inside the player mutation lease`
  );
  assert.equal(
    productionApiContract.getApiContractString(playerMutationLockKey),
    undefined,
    `${route} validation must release the player mutation lease`
  );

  productionApiContract.resetApiContractRuntime();
  const oversizedDrawingResponse = await productionApiContract.app.request(
    route,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: oversizedDrawingSubmissionBody,
    }
  );
  assert.equal(oversizedDrawingResponse.status, 413);
  assert.deepEqual(await oversizedDrawingResponse.json(), {
    status: 'error',
    code: 'payload_too_large',
    message: 'That drawing submission is too large.',
  });
  assert.ok(
    productionApiContract.apiContractRuntimeState.watchCalls >= 3,
    `${route} payload rejection must run inside the player mutation lease`
  );
  assert.equal(
    productionApiContract.getApiContractString(playerMutationLockKey),
    undefined,
    `${route} payload rejection must release the player mutation lease`
  );
}

const maturityDay = 25;
const matureScribbit = scribbitCore.createScribbit({
  id: 'maturity-api-contract',
  draft: {
    name: 'Graduate',
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    element: 'storm',
    accessories: [],
  },
  artist: 'api_contract_user',
  imageUrl: '/maturity-api-contract.png',
  day: maturityDay - arena.LIFESPAN_DAYS,
});
productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString('arena:currentDay', maturityDay);
productionApiContract.setApiContractString(
  scribbitCore.getScribbitKey(matureScribbit.id),
  scribbitCore.serializeScribbit(matureScribbit)
);
productionApiContract.setApiContractString(
  scribbitCore.getScribbitOwnerKey(matureScribbit.id),
  'api-contract-user'
);
const maturityResponse = await productionApiContract.app.request(
  '/api/maturity/acknowledge',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scribbitId: matureScribbit.id }),
  }
);
assert.equal(maturityResponse.status, 200);
assert.deepEqual(await maturityResponse.json(), {
  scribbitId: matureScribbit.id,
});
assert.ok(
  Number(
    productionApiContract.getApiContractHashField(
      'user:api-contract-user:maturity-acknowledgements',
      matureScribbit.id
    )
  ) > 0,
  'maturity acknowledgement must persist for the authenticated owner'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined
);

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString('arena:currentDay', maturityDay);
productionApiContract.setApiContractString(
  scribbitCore.getScribbitKey(matureScribbit.id),
  scribbitCore.serializeScribbit(matureScribbit)
);
productionApiContract.setApiContractString(
  scribbitCore.getScribbitOwnerKey(matureScribbit.id),
  'another-user'
);
const foreignMaturityResponse = await productionApiContract.app.request(
  '/api/maturity/acknowledge',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scribbitId: matureScribbit.id }),
  }
);
assert.equal(foreignMaturityResponse.status, 409);
assert.equal(
  productionApiContract.getApiContractHashField(
    'user:api-contract-user:maturity-acknowledgements',
    matureScribbit.id
  ),
  undefined
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined
);

productionApiContract.resetApiContractRuntime();
const inventoryResponse =
  await productionApiContract.app.request('/api/inventory');
assert.equal(inventoryResponse.status, 200);
assert.deepEqual(await inventoryResponse.json(), {
  items: {},
  gear: {},
  pens: [],
  titles: [],
  equippedTitle: null,
  discovered: [],
});
assert.ok(
  productionApiContract.apiContractRuntimeState.watchCalls >= 3,
  'a compatibility GET that may migrate inventory must use the lease middleware'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined
);

productionApiContract.resetApiContractRuntime();
const legacyCardsResponse = await productionApiContract.app.request(
  '/api/legacy-cards?limit=1'
);
assert.equal(legacyCardsResponse.status, 200);
assert.deepEqual(await legacyCardsResponse.json(), {
  cards: [],
  nextCursor: null,
});
assert.ok(
  productionApiContract.apiContractRuntimeState.watchCalls >= 3,
  'Legacy Deck reads that may rebuild the index must use the mutation lease'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined
);

productionApiContract.resetApiContractRuntime();
const invalidLegacyCardsResponse = await productionApiContract.app.request(
  '/api/legacy-cards?cursor=not-a-cursor&limit=1'
);
assert.equal(invalidLegacyCardsResponse.status, 400);
assert.deepEqual(await invalidLegacyCardsResponse.json(), {
  status: 'error',
  code: 'bad_request',
  message: 'Use a valid Legacy Deck cursor and page size.',
});
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'Legacy Deck validation failures must release the mutation lease'
);

productionApiContract.resetApiContractRuntime();
const invalidLegacySeenResponse = await productionApiContract.app.request(
  '/api/legacy-cards/seen',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }
);
assert.equal(invalidLegacySeenResponse.status, 400);
assert.deepEqual(await invalidLegacySeenResponse.json(), {
  status: 'error',
  code: 'bad_request',
  message: 'Choose a valid archived day to file away.',
});
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'Legacy seen validation failures must release the mutation lease'
);

productionApiContract.resetApiContractRuntime();
const createApiRouteTerminalScribbit = ({ id, bornDay, legend = false }) => {
  const scribbit = scribbitCore.createScribbit({
    id,
    draft: {
      name: id,
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      element: 'storm',
      accessories: [],
    },
    artist: 'api_contract_user',
    imageUrl: `/${id}.png`,
    day: bornDay,
  });
  return scribbitCore.resolveExpiredScribbitStatus({
    ...scribbit,
    belief: legend ? arena.BELIEF_LEGEND_THRESHOLD : 0,
  });
};
const routeLegacyCards = [];
for (let index = 0; index < 3; index += 1) {
  const archived = createApiRouteTerminalScribbit({
    id: `api-route-legacy-${index + 1}`,
    bornDay: index + 1,
  });
  routeLegacyCards.push(archived);
  await scribbitCore.storeScribbit(
    productionApiContract.apiContractRedis,
    'api-contract-user',
    archived
  );
}
productionApiContract.deleteApiContractKeys(
  scribbitCore.getUserLegacyCardsKey('api-contract-user'),
  legacyCore.getLegacyIndexVersionKey('api-contract-user')
);
const firstRouteLegacyPage = await productionApiContract.app.request(
  '/api/legacy-cards?limit=2'
);
assert.equal(firstRouteLegacyPage.status, 200);
const firstRouteLegacyState = await firstRouteLegacyPage.json();
assert.equal(firstRouteLegacyState.cards.length, 2);
assert.match(firstRouteLegacyState.nextCursor, /^v2\|/);
assert.equal(
  productionApiContract.getApiContractString(
    legacyCore.getLegacyIndexVersionKey('api-contract-user')
  ),
  '1',
  'the production Legacy route must rebuild a missing index'
);
const secondRouteLegacyPage = await productionApiContract.app.request(
  `/api/legacy-cards?limit=2&cursor=${encodeURIComponent(
    firstRouteLegacyState.nextCursor
  )}`
);
assert.equal(secondRouteLegacyPage.status, 200);
const secondRouteLegacyState = await secondRouteLegacyPage.json();
assert.equal(secondRouteLegacyState.cards.length, 1);
assert.equal(secondRouteLegacyState.nextCursor, null);
assert.equal(
  new Set([
    ...firstRouteLegacyState.cards.map(({ id }) => id),
    ...secondRouteLegacyState.cards.map(({ id }) => id),
  ]).size,
  routeLegacyCards.length,
  'production Legacy cursor paging must neither duplicate nor skip cards'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString('arena:currentDay', 25);
const successfulLegacySeenResponse = await productionApiContract.app.request(
  '/api/legacy-cards/seen',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ throughArchivedDay: 20 }),
  }
);
assert.equal(successfulLegacySeenResponse.status, 200);
assert.deepEqual(await successfulLegacySeenResponse.json(), {
  seenThroughDay: 20,
});
assert.equal(
  productionApiContract.getApiContractString(
    legacyCore.getLegacySeenDayKey('api-contract-user')
  ),
  '20'
);
const futureLegacySeenResponse = await productionApiContract.app.request(
  '/api/legacy-cards/seen',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ throughArchivedDay: 26 }),
  }
);
assert.equal(futureLegacySeenResponse.status, 400);
assert.deepEqual(await futureLegacySeenResponse.json(), {
  status: 'error',
  code: 'bad_request',
  message: 'That Legacy Card has not been archived yet.',
});
assert.equal(
  productionApiContract.getApiContractString(
    legacyCore.getLegacySeenDayKey('api-contract-user')
  ),
  '20',
  'a future seen-day request must not alter the stored receipt'
);

productionApiContract.resetApiContractRuntime();
const legendsResponse = await productionApiContract.app.request('/api/legends');
assert.equal(legendsResponse.status, 200);
assert.deepEqual(await legendsResponse.json(), {
  legends: [],
  nextCursor: null,
});
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  0,
  'Legends is a read-only GET and must remain outside mutation leasing'
);

productionApiContract.resetApiContractRuntime();
const routeLegends = [];
for (let index = 0; index < 3; index += 1) {
  const legend = createApiRouteTerminalScribbit({
    id: `api-route-legend-${index + 1}`,
    bornDay: index + 1,
    legend: true,
  });
  routeLegends.push(legend);
  await scribbitCore.storeScribbit(
    productionApiContract.apiContractRedis,
    'legend-owner',
    legend
  );
  await scribbitCore.addLegend(
    productionApiContract.apiContractRedis,
    legend,
    10 - index
  );
}
await productionApiContract.apiContractRedis.zAdd(
  scribbitCore.getLegendsKey(),
  { member: 'api-route-stale-legend', score: 11 }
);
await moderationCore.reportAndHideScribbit(
  productionApiContract.apiContractRedis,
  'api-contract-user',
  routeLegends[0].id,
  Date.now()
);
const legendSeedWatchCalls =
  productionApiContract.apiContractRuntimeState.watchCalls;
const firstVisibleLegendResponse = await productionApiContract.app.request(
  '/api/legends?limit=1'
);
assert.equal(firstVisibleLegendResponse.status, 200);
const firstVisibleLegendPage = await firstVisibleLegendResponse.json();
assert.deepEqual(
  firstVisibleLegendPage.legends.map(({ id }) => id),
  [routeLegends[1].id]
);
assert.equal(
  firstVisibleLegendPage.nextCursor,
  '3',
  'Legends cursor must consume stale and player-hidden raw ranks'
);
const secondVisibleLegendResponse = await productionApiContract.app.request(
  `/api/legends?limit=1&cursor=${firstVisibleLegendPage.nextCursor}`
);
assert.equal(secondVisibleLegendResponse.status, 200);
assert.deepEqual(
  (await secondVisibleLegendResponse.json()).legends.map(({ id }) => id),
  [routeLegends[2].id]
);
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  legendSeedWatchCalls,
  'nonempty Legends paging must remain outside mutation leasing'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString('arena:currentDay', 25);
const seasonResponse = await productionApiContract.app.request('/api/season');
assert.equal(seasonResponse.status, 200);
assert.deepEqual(await seasonResponse.json(), {
  current: {
    id: 'season-1',
    number: 1,
    name: 'Season 1',
    campaignName: 'First Ink',
    status: 'active',
    startArenaDay: 25,
    endArenaDay: 84,
    daysRemaining: 60,
    scoringRuleSetId: 'rumble-clout-v1',
    activeEvent: {
      id: 'opening-rumble',
      name: 'Opening Rumble',
      startArenaDay: 25,
      endArenaDay: 31,
      ruleSetId: 'double-clout',
      daysRemaining: 7,
      scoreMultiplier: 2,
    },
    me: { score: 0, rank: 0 },
  },
  next: null,
  latestFinalized: null,
  latestReward: null,
});
const seasonInitializationWatchCalls =
  productionApiContract.apiContractRuntimeState.watchCalls;
assert.ok(seasonInitializationWatchCalls >= 1);
const repeatedSeasonResponse =
  await productionApiContract.app.request('/api/season');
assert.equal(repeatedSeasonResponse.status, 200);
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  seasonInitializationWatchCalls,
  'an initialized public season read must not acquire another transaction'
);
const seasonBoardResponse =
  await productionApiContract.app.request('/api/season-board');
assert.equal(seasonBoardResponse.status, 200);
const seasonBoardState = await seasonBoardResponse.json();
assert.equal(seasonBoardState.season.id, 'season-1');
assert.deepEqual(seasonBoardState.top, []);
assert.deepEqual(seasonBoardState.me, {
  username: 'api_contract_user',
  score: 0,
  rank: 0,
  rewardTier: null,
});
assert.equal(seasonBoardState.finalized, false);
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  seasonInitializationWatchCalls,
  'an initialized season-board read must not acquire another transaction'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined
);

productionApiContract.resetApiContractRuntime({
  userId: null,
  username: null,
});
productionApiContract.setApiContractString('arena:currentDay', 25);
const anonymousSeasonBoardResponse =
  await productionApiContract.app.request('/api/season-board');
assert.equal(anonymousSeasonBoardResponse.status, 200);
assert.equal((await anonymousSeasonBoardResponse.json()).me, null);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'public season-board initialization must not use a player mutation lease'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString('arena:currentDay', 25);
productionApiContract.setApiContractString('season:initialized', 'season-1');
productionApiContract.setApiContractHashField(
  'season:catalog',
  'season-1',
  '{'
);
const originalSeasonConsoleError = console.error;
console.error = () => undefined;
let corruptSeasonResponse;
try {
  corruptSeasonResponse =
    await productionApiContract.app.request('/api/season');
} finally {
  console.error = originalSeasonConsoleError;
}
assert.equal(corruptSeasonResponse.status, 500);
assert.deepEqual(await corruptSeasonResponse.json(), {
  status: 'error',
  code: 'server_error',
  message: 'The season board is unavailable. Try again soon.',
});
const originalSeasonBoardConsoleError = console.error;
console.error = () => undefined;
let corruptSeasonBoardResponse;
try {
  corruptSeasonBoardResponse =
    await productionApiContract.app.request('/api/season-board');
} finally {
  console.error = originalSeasonBoardConsoleError;
}
assert.equal(corruptSeasonBoardResponse.status, 500);
assert.deepEqual(await corruptSeasonBoardResponse.json(), {
  status: 'error',
  code: 'server_error',
  message: 'The season board is unavailable. Try again soon.',
});
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined
);

productionApiContract.resetApiContractRuntime();
const battleHistoryResponse =
  await productionApiContract.app.request('/api/my-battles');
assert.equal(battleHistoryResponse.status, 200);
assert.deepEqual(await battleHistoryResponse.json(), []);
assert.equal(
  productionApiContract.apiContractRuntimeState.watchCalls,
  0,
  'read-only GET routes must not acquire a mutation lease'
);

productionApiContract.resetApiContractRuntime();
const invalidReplayResponse = await productionApiContract.app.request(
  '/api/rumble-replay?day=not-a-day'
);
assert.equal(invalidReplayResponse.status, 400);
assert.deepEqual(await invalidReplayResponse.json(), {
  status: 'error',
  code: 'bad_request',
  message: 'Choose a valid resolved Rumble day.',
});
assert.equal(productionApiContract.apiContractRuntimeState.watchCalls, 0);

productionApiContract.resetApiContractRuntime();
productionApiContract.setApiContractString(
  playerMutationLockKey,
  'another-operation'
);
const busyMutationResponse = await productionApiContract.app.request(
  '/api/back',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }
);
assert.equal(busyMutationResponse.status, 409);
assert.deepEqual(await busyMutationResponse.json(), {
  status: 'error',
  code: 'busy',
  message: 'Another game action is finishing. Try again.',
});
assert.equal(productionApiContract.apiContractRuntimeState.watchCalls, 1);
assert.equal(
  productionApiContract.apiContractRuntimeState.transactionCommits,
  0
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  'another-operation',
  'a busy request must not disturb the current lease owner'
);

productionApiContract.resetApiContractRuntime();
const equipTitleResponse = await productionApiContract.app.request(
  '/api/equip-title',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ titleId: null }),
  }
);
assert.equal(equipTitleResponse.status, 200);
assert.deepEqual(await equipTitleResponse.json(), {
  items: {},
  gear: {},
  pens: [],
  titles: [],
  equippedTitle: null,
  discovered: [],
});
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'a successful non-GET mutation must release its lease'
);

productionApiContract.resetApiContractRuntime();
productionApiContract.failNextApiContractHashRead();
const capturedRouteErrors = [];
const originalConsoleError = console.error;
console.error = (...values) => capturedRouteErrors.push(values);
let failedInventoryResponse;
try {
  failedInventoryResponse =
    await productionApiContract.app.request('/api/inventory');
} finally {
  console.error = originalConsoleError;
}
assert.equal(failedInventoryResponse.status, 500);
assert.deepEqual(await failedInventoryResponse.json(), {
  status: 'error',
  code: 'server_error',
  message: 'The ink drawer is stuck. Try again soon.',
});
assert.equal(capturedRouteErrors.length, 1);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'a handler failure response must still release its mutation lease'
);

productionApiContract.resetApiContractRuntime();
const deletionResponse = await productionApiContract.app.request(
  '/api/delete-my-data',
  { method: 'POST' }
);
assert.equal(deletionResponse.status, 200);
assert.deepEqual(await deletionResponse.json(), {
  deleted: true,
  removedScribbits: 0,
});
assert.ok(
  productionApiContract.apiContractRuntimeState.transactionCommits > 3,
  'player deletion must execute its own inverse lease and cleanup boundary'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'deletion must not acquire the normal player-mutation lease around itself'
);
cleanupApiContractOutput();
process.removeListener('exit', cleanupApiContractOutput);
pass(
  'production Hono routes enforce auth, parsing, status, and mutation leases'
);

const startDevMockForContractTest = async () => {
  const child = spawn(process.execPath, ['scripts/dev-mock.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: '0',
      MOCK_AUTO_RELOAD: '0',
      SCRIBBITS_CONTRACT_FIXTURES: '1',
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

const createAuthoritativeSubmissionDataUrl = () => {
  const png = new PNG({ width: 512, height: 512 });
  png.data.fill(0);
  for (let y = 80; y < 432; y += 1) {
    for (let x = 80; x < 432; x += 1) {
      const offset = (y * 512 + x) * 4;
      png.data[offset] = 235;
      png.data[offset + 1] = 55;
      png.data[offset + 2] = 35;
      png.data[offset + 3] = 255;
    }
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
};

const mockContract = await startDevMockForContractTest();
const requestMock = async (path, init) => {
  const response = await fetch(`${mockContract.baseUrl}${path}`, init);
  return { response, body: await response.json() };
};
try {
  const matureMockAcknowledgement = await requestMock(
    '/api/maturity/acknowledge',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scribbitId: 'mine-moss-bun' }),
    }
  );
  assert.equal(matureMockAcknowledgement.response.status, 200);
  assert.deepEqual(matureMockAcknowledgement.body, {
    scribbitId: 'mine-moss-bun',
  });
  assert.equal(
    (
      await requestMock('/api/maturity/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scribbitId: 'mine-paper-spark' }),
      })
    ).response.status,
    409,
    'the mock must reject a Scribbit that has not matured'
  );
  assert.equal(
    (
      await requestMock('/api/maturity/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scribbitId: '?' }),
      })
    ).response.status,
    400,
    'the mock must reject malformed maturity IDs like production'
  );

  for (const route of ['/api/free-drawing', '/api/scribbit']) {
    const oversizedMockSubmission = await requestMock(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedDrawingSubmissionBody,
    });
    assert.equal(oversizedMockSubmission.response.status, 413);
    assert.deepEqual(oversizedMockSubmission.body, {
      status: 'error',
      code: 'payload_too_large',
      message: 'That drawing submission is too large.',
    });
  }

  const firstMockLegacyPage = await requestMock('/api/legacy-cards?limit=1');
  assert.equal(firstMockLegacyPage.response.status, 200);
  assert.equal(firstMockLegacyPage.body.cards.length, 1);
  assert.match(firstMockLegacyPage.body.nextCursor, /^v2\|/);
  const secondMockLegacyPage = await requestMock(
    `/api/legacy-cards?limit=1&cursor=${encodeURIComponent(
      firstMockLegacyPage.body.nextCursor
    )}`
  );
  assert.equal(secondMockLegacyPage.response.status, 200);
  assert.equal(
    new Set(
      [
        ...firstMockLegacyPage.body.cards,
        ...secondMockLegacyPage.body.cards,
      ].map(({ id }) => id)
    ).size,
    firstMockLegacyPage.body.cards.length +
      secondMockLegacyPage.body.cards.length,
    'mock Legacy anchor paging must not duplicate cards'
  );
  const numericMockLegacyPage = await requestMock(
    '/api/legacy-cards?limit=1&cursor=0001'
  );
  assert.deepEqual(
    numericMockLegacyPage.body.cards.map(({ id }) => id),
    secondMockLegacyPage.body.cards.map(({ id }) => id),
    'mock Legacy paging must retain numeric cursor compatibility'
  );
  for (const invalidLegacyQuery of [
    'limit=0',
    'limit=02',
    'cursor=v1%7C4%7C%25',
    `cursor=${encodeURIComponent(`v1|4|${'x'.repeat(257)}`)}`,
  ]) {
    assert.equal(
      (await requestMock(`/api/legacy-cards?${invalidLegacyQuery}`)).response
        .status,
      400
    );
  }

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

  const normalReturningArena = await requestMock('/api/arena');
  assert.equal(normalReturningArena.body.lastRumbleReceipt, null);
  assert.equal(normalReturningArena.body.legacyReturnReceipt, null);
  const freshArena = await requestMock('/api/arena?fresh');
  assert.deepEqual(
    freshArena.body.dailyLogin,
    {
      claimedTrackDays: 0,
      totalClaimedDays: 0,
      claimedToday: false,
      nextReward: {
        trackDay: 1,
        cycleDay: null,
        ink: 1,
        gearId: null,
      },
    },
    'a fresh preview must begin on day one without claimed login rewards'
  );
  const returningArena = await requestMock('/api/arena?backed-return');
  assert.deepEqual(
    {
      pick: returningArena.body.lastRumbleReceipt.pick.id,
      opponent: returningArena.body.lastRumbleReceipt.opponent.id,
      opponentIsChampion:
        returningArena.body.lastRumbleReceipt.opponentIsChampion,
    },
    {
      pick: 'legend-inky-moon',
      opponent: 'legend-solar-kiln',
      opponentIsChampion: true,
    },
    'the returning Arena result must carry both matchup portraits'
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

  const ownedReturnArena = await requestMock('/api/arena?owned-return');
  assert.equal(ownedReturnArena.response.status, 200);
  assert.deepEqual(
    {
      kind: ownedReturnArena.body.lastRumbleReceipt.kind,
      entrantId: ownedReturnArena.body.lastRumbleReceipt.entrant.id,
      record: [
        ownedReturnArena.body.lastRumbleReceipt.wins,
        ownedReturnArena.body.lastRumbleReceipt.losses,
      ],
      xp: ownedReturnArena.body.lastRumbleReceipt.xpAwarded,
      ink: ownedReturnArena.body.lastRumbleReceipt.inkAwarded,
    },
    {
      kind: 'owned',
      entrantId: 'mine-paper-spark',
      record: [2, 1],
      xp: 4,
      ink: 10,
    },
    'a no-Back return must lead with the owned entrant and exact rewards'
  );
  const ownedReturnReplay = await requestMock(
    `/api/rumble-replay?day=${ownedReturnArena.body.lastRumbleReceipt.resolvedDay}&owned-return`
  );
  assert.equal(ownedReturnReplay.response.status, 200);
  assert.ok(
    ownedReturnReplay.body.a.id === 'mine-paper-spark' ||
      ownedReturnReplay.body.b.id === 'mine-paper-spark',
    'the owned return CTA must open a real bout involving that entrant'
  );

  const initialRunSlate = await requestMock(
    '/api/spar-rivals?scribbitId=mine-paper-spark'
  );
  assert.equal(initialRunSlate.response.status, 200);
  assert.equal(initialRunSlate.body.rivalRun.boutsCompleted, 0);
  assert.ok(
    initialRunSlate.body.rivalRun.challenge?.id,
    'the server-authored challenge must be visible before bout one'
  );
  const initialRunChallenge = initialRunSlate.body.rivalRun.challenge;
  assert.deepEqual(
    initialRunSlate.body.choices.map(({ tier, winPoints }) => ({
      tier,
      winPoints,
    })),
    [
      { tier: 'safe', winPoints: 1 },
      { tier: 'even', winPoints: 2 },
      { tier: 'risky', winPoints: 3 },
    ]
  );
  let runSlate = initialRunSlate.body;
  let previousRunReport = null;
  const forgedRunFight = await requestMock('/api/spar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scribbitId: runSlate.challenger.id,
      opponentId: runSlate.choices[0].rival.id,
      rivalRun: {
        id: `${runSlate.rivalRun.id}-forged`,
        expectedBoutsCompleted: 0,
      },
    }),
  });
  assert.equal(
    forgedRunFight.response.status,
    409,
    'the mock must reject a forged run id exactly like production'
  );
  for (let boutIndex = 0; boutIndex < 3; boutIndex += 1) {
    const selectedChoice = runSlate.choices[1];
    assert.ok(selectedChoice);
    const runFight = await requestMock('/api/spar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scribbitId: runSlate.challenger.id,
        opponentId: selectedChoice.rival.id,
        rivalRun: {
          id: runSlate.rivalRun.id,
          expectedBoutsCompleted: boutIndex,
        },
      }),
    });
    assert.equal(runFight.response.status, 200);
    assert.equal(runFight.body.report.rivalRun.boutNumber, boutIndex + 1);
    assert.deepEqual(
      {
        ...runFight.body.report.rivalRun.challenge,
        progress: 0,
        completionAchieved: false,
      },
      initialRunChallenge,
      'all three receipts must preserve the immutable challenge snapshot'
    );
    assert.equal(
      runFight.body.report.rivalRun.pointsAwarded,
      runFight.body.report.rivalRun.outcome === 'win' ? 2 : 0
    );
    if (boutIndex === 0) {
      const retriedFight = await requestMock('/api/spar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scribbitId: runSlate.challenger.id,
          opponentId: selectedChoice.rival.id,
          rivalRun: {
            id: runSlate.rivalRun.id,
            expectedBoutsCompleted: 0,
          },
        }),
      });
      assert.equal(retriedFight.response.status, 200);
      assert.deepEqual(
        retriedFight.body.report,
        runFight.body.report,
        'a repeated deterministic bout must return the same mock report'
      );
    }
    if (runFight.body.powerUpOffer) {
      const powerUpClaim = await requestMock('/api/power-up/choose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scribbitId: runSlate.challenger.id,
          offerId: runFight.body.powerUpOffer.id,
          selectedId: runFight.body.powerUpOffer.choices[0],
          expectedPowerUpCount: runSlate.challenger.powerUpIds.length,
        }),
      });
      assert.equal(powerUpClaim.response.status, 200);
    }
    previousRunReport = runFight.body.report;
    if (boutIndex < 2) {
      runSlate = (
        await requestMock('/api/spar-rivals?scribbitId=mine-paper-spark')
      ).body;
      assert.equal(runSlate.rivalRun.boutsCompleted, boutIndex + 1);
      assert.equal(runSlate.rivalRun.challenge.id, initialRunChallenge.id);
    }
  }
  assert.equal(previousRunReport.rivalRun.status, 'complete');
  const nextRunSlate = await requestMock(
    '/api/spar-rivals?scribbitId=mine-paper-spark'
  );
  assert.equal(nextRunSlate.body.rivalRun.boutsCompleted, 0);
  assert.notEqual(
    nextRunSlate.body.rivalRun.id,
    initialRunSlate.body.rivalRun.id,
    'explicitly reopening the board after completion should start a fresh run'
  );
  assert.notEqual(
    nextRunSlate.body.rivalRun.challenge.id,
    initialRunChallenge.id,
    'the next run must visibly rotate to a different challenge card'
  );

  const freshDrawingDataUrl = createAuthoritativeSubmissionDataUrl();
  const freshBattlesBeforeSubmission = await requestMock(
    '/api/my-battles?fresh'
  );
  assert.equal(freshBattlesBeforeSubmission.response.status, 200);
  assert.deepEqual(
    freshBattlesBeforeSubmission.body,
    [],
    'a fresh preview must not leak returning-player battle fixtures'
  );
  const freshSubmissionBody = {
    submissionId: 'progression-proof-0001',
    name: 'Progression Proof',
    baseImageDataUrl: freshDrawingDataUrl,
    imageDataUrl: freshDrawingDataUrl,
    stats: { chonk: 10, spike: 10, zip: 10, charm: 55 },
    element: 'storm',
    accessories: [],
  };
  const freshSubmission = await requestMock('/api/scribbit?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(freshSubmissionBody),
  });
  assert.equal(freshSubmission.response.status, 201);
  assert.equal(freshSubmission.body.scribbit.element, 'ember');
  assert.equal(freshSubmission.body.scribbit.xp, 0);
  assert.equal(freshSubmission.body.scribbit.level, 1);
  assert.equal(
    freshSubmission.body.scribbit.drawingThemeId,
    freshArena.body.communityDrawTheme.id,
    'submission must keep the theme that was assigned before drawing'
  );
  assert.equal(freshSubmission.body.drawCharges.available, 3);
  assert.equal(freshSubmission.body.enteredRumble, true);
  assert.equal(freshSubmission.body.powerUpOffer.source, 'birth');
  assert.equal(freshSubmission.body.powerUpOffer.choices.length, 3);
  const repeatedFreshSubmission = await requestMock('/api/scribbit?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(freshSubmissionBody),
  });
  assert.equal(repeatedFreshSubmission.response.status, 200);
  assert.deepEqual(
    repeatedFreshSubmission.body,
    freshSubmission.body,
    'repeating one submission id must return the exact birth without consuming another charge'
  );
  const arenaAfterRepeatedSubmission = await requestMock('/api/arena?fresh');
  assert.equal(arenaAfterRepeatedSubmission.body.myScribbits.length, 1);
  assert.notEqual(
    arenaAfterRepeatedSubmission.body.communityDrawTheme.id,
    freshSubmission.body.scribbit.drawingThemeId,
    'the next Draw must receive another theme after a completed submission'
  );
  assert.deepEqual(arenaAfterRepeatedSubmission.body.pendingPowerUpOffers, [
    freshSubmission.body.powerUpOffer,
  ]);
  assert.equal(
    arenaAfterRepeatedSubmission.body.myInk,
    arena.INK_REWARDS.dailyDraw
  );
  const blockedFirstFight = await requestMock('/api/spar?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scribbitId: freshSubmission.body.scribbit.id,
      firstBattle: true,
    }),
  });
  assert.equal(
    blockedFirstFight.response.status,
    409,
    'a newborn must choose its first Power-Up before its first fight'
  );
  const selectedBirthPowerUp = freshSubmission.body.powerUpOffer.choices[0];
  const birthPowerUpClaim = await requestMock('/api/power-up/choose?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scribbitId: freshSubmission.body.scribbit.id,
      offerId: freshSubmission.body.powerUpOffer.id,
      selectedId: selectedBirthPowerUp,
      expectedPowerUpCount: 0,
    }),
  });
  assert.equal(birthPowerUpClaim.response.status, 200);
  assert.deepEqual(birthPowerUpClaim.body.powerUpIds, [selectedBirthPowerUp]);
  const repeatedBirthPowerUpClaim = await requestMock(
    '/api/power-up/choose?fresh',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scribbitId: freshSubmission.body.scribbit.id,
        offerId: freshSubmission.body.powerUpOffer.id,
        selectedId: selectedBirthPowerUp,
        expectedPowerUpCount: 0,
      }),
    }
  );
  assert.equal(repeatedBirthPowerUpClaim.response.status, 409);
  const arenaAfterBirthPowerUp = await requestMock('/api/arena?fresh');
  assert.deepEqual(arenaAfterBirthPowerUp.body.pendingPowerUpOffers, []);
  assert.deepEqual(arenaAfterBirthPowerUp.body.myScribbits[0].powerUpIds, [
    selectedBirthPowerUp,
  ]);
  const firstFightAfterPowerUp = await requestMock('/api/spar?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scribbitId: freshSubmission.body.scribbit.id,
      firstBattle: true,
    }),
  });
  assert.equal(firstFightAfterPowerUp.response.status, 200);
  assert.equal(
    firstFightAfterPowerUp.body.report.battleArenaId,
    battleArenas.DEFAULT_BATTLE_ARENA_ID,
    'the newborn debut must use Sticker Stadium instead of the rotating daily venue'
  );
  assert.equal(
    firstFightAfterPowerUp.body.report.b.level,
    1,
    'the newborn debut must use a level-one founding rival'
  );
  const firstFightInkAward = firstFightAfterPowerUp.body.report.inkAwarded ?? 0;
  if (firstFightAfterPowerUp.body.powerUpOffer) {
    const postFightPowerUpClaim = await requestMock(
      '/api/power-up/choose?fresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scribbitId: freshSubmission.body.scribbit.id,
          offerId: firstFightAfterPowerUp.body.powerUpOffer.id,
          selectedId: firstFightAfterPowerUp.body.powerUpOffer.choices[0],
          expectedPowerUpCount: 1,
        }),
      }
    );
    assert.equal(postFightPowerUpClaim.response.status, 200);
  }

  const firstCapsulePull = await requestMock('/api/capsule?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationId: 'fresh-progression-proof' }),
  });
  assert.equal(firstCapsulePull.response.status, 200);
  assert.equal(firstCapsulePull.body.ink, firstFightInkAward);
  assert.equal(firstCapsulePull.body.nextCost, arena.CAPSULE_COST);
  assert.equal(firstCapsulePull.body.progress.pullCount, 1);
  const repeatedCapsulePull = await requestMock('/api/capsule?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationId: 'fresh-progression-proof' }),
  });
  assert.equal(repeatedCapsulePull.response.status, 200);
  assert.deepEqual(
    repeatedCapsulePull.body,
    firstCapsulePull.body,
    'repeating an affordable capsule operation must replay the committed pull'
  );
  const spentFreshArena = await requestMock('/api/arena?fresh');
  assert.deepEqual(
    {
      ink: spentFreshArena.body.myInk,
      nextCapsuleCost: spentFreshArena.body.nextCapsuleCost,
      pullCount: spentFreshArena.body.capsuleProgress.pullCount,
    },
    {
      ink: firstFightInkAward,
      nextCapsuleCost: arena.CAPSULE_COST,
      pullCount: 1,
    },
    'the first chest must deduct earned Ink once and advance capsule state once'
  );

  const firstBirthBattle = await requestMock('/api/spar?fresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scribbitId: freshSubmission.body.scribbit.id }),
  });
  assert.equal(firstBirthBattle.response.status, 200);
  assert.equal(firstBirthBattle.body.report.kind, 'exhibition');
  assert.equal(
    firstBirthBattle.body.report.a.id,
    freshSubmission.body.scribbit.id
  );
  assert.notEqual(
    firstBirthBattle.body.report.b.id,
    freshSubmission.body.scribbit.id
  );
  assert.equal(firstBirthBattle.body.report.b.isFounding, true);
  assert.equal(firstBirthBattle.body.report.rivalRun, undefined);
  assert.equal(firstBirthBattle.body.founderChronicleBeat, null);
  assert.equal(
    firstBirthBattle.body.rewardReceipt.scribbitId,
    freshSubmission.body.scribbit.id
  );
  const arenaAfterFirstBirthBattle = await requestMock('/api/arena?fresh');
  assert.equal(arenaAfterFirstBirthBattle.body.lastRumbleReceipt, null);
  assert.equal(arenaAfterFirstBirthBattle.body.legacyReturnReceipt, null);
  assert.equal(
    arenaAfterFirstBirthBattle.body.myScribbits.some(
      ({ id }) => id === freshSubmission.body.scribbit.id
    ),
    true
  );
  const battlesAfterFirstBirthBattle = await requestMock(
    '/api/my-battles?fresh'
  );
  assert.equal(
    battlesAfterFirstBirthBattle.body[0].id,
    firstBirthBattle.body.report.id
  );
} finally {
  await stopDevMockContractTest(mockContract.child);
}
pass(
  'mock API preserves Scout, Rival Run, and progression authority contracts'
);

assert.equal(battleArenas.BATTLE_ARENA_IDS.length, 10);
assert.equal(battleArenas.getUnlockedBattleArenaDefinitions(1).length, 1);
assert.equal(battleArenas.getUnlockedBattleArenaDefinitions(10).length, 10);
for (let day = 2; day <= 40; day += 1) {
  assert.notEqual(
    battleArenas.getBattleArenaForDay(day).id,
    battleArenas.getBattleArenaForDay(day - 1).id,
    `battle arena should not repeat on adjacent day ${day}`
  );
}
const bounceArenaRules = battleArenas.applyBattleArenaModifier(
  combatConfig.DEFAULT_COMBAT_RULES,
  'v1-chalkboard-court'
);
assert.equal(
  bounceArenaRules.arena.startingHalfWidth,
  combatConfig.DEFAULT_COMBAT_RULES.arena.startingHalfWidth
);
assert.equal(
  bounceArenaRules.arena.startingHalfHeight,
  combatConfig.DEFAULT_COMBAT_RULES.arena.startingHalfHeight
);
assert.equal(
  bounceArenaRules.arena.finalHalfWidth,
  combatConfig.DEFAULT_COMBAT_RULES.arena.finalHalfWidth
);
const earlyFoldRules = battleArenas.applyBattleArenaModifier(
  combatConfig.DEFAULT_COMBAT_RULES,
  'v1-scribble-lab'
);
assert.equal(
  earlyFoldRules.arena.shrinkStartsAtTick,
  combatConfig.DEFAULT_COMBAT_RULES.arena.shrinkStartsAtTick
);
assert.deepEqual(
  battleArenas.evaluateBattleArenaChallenge('v1-scribble-lab', {
    timeline: [
      { kind: 'damage', tick: 259, source: 'inkquake', amount: 20 },
      { kind: 'damage', tick: 260, source: 'inkquake', amount: 1 },
    ],
  }),
  { progress: 1, target: 1, completed: true }
);
pass(
  'ten battle arenas rotate with standard rules and score distinct challenges'
);

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
  { lastPlayedDateKey: undefined, days: 0, totalDays: 0 },
  '20260708'
);
assert.deepEqual(
  firstPlayStreak,
  { lastPlayedDateKey: '20260708', days: 1, totalDays: 1 },
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
  communityThemeContent.selectCommunityDoodleDare(9, 'player-42').id,
  communityThemeContent.selectCommunityDoodleDare(9, 'player-42').id,
  'the same player and Arena cycle must never reroll the creative brief'
);
const firstPlayerThemeOrder = Array.from(
  { length: 5 },
  (_, completedDrawCount) =>
    communityThemeContent.selectCommunityDoodleDare(
      9,
      'player-42',
      completedDrawCount
    )
);
assert.equal(
  new Set(firstPlayerThemeOrder.map((theme) => theme.id)).size,
  5,
  'each completed community drawing should advance to another theme in the cycle pool'
);
assert.equal(
  communityThemeContent.selectCommunityDoodleDare(9, 'player-42', 5).id,
  firstPlayerThemeOrder[0].id,
  'the assignment order should wrap only after all five themes are used'
);
assert.equal(
  communityThemeContent.COMMUNITY_DRAW_THEME_DAYS,
  3,
  'one assigned theme should last for three Arena days'
);
const firstCommunityThemePool =
  communityThemeContent.selectCommunityDoodleDarePool(1);
assert.equal(
  firstCommunityThemePool.length,
  5,
  'each three-day cycle should offer five distinct themes'
);
assert.equal(
  new Set(firstCommunityThemePool.map((theme) => theme.id)).size,
  5,
  'a cycle pool must not repeat a theme'
);
assert.deepEqual(
  communityThemeContent.selectCommunityDoodleDarePool(1),
  communityThemeContent.selectCommunityDoodleDarePool(3),
  'the five-theme pool should stay fixed across its three days'
);
assert.notDeepEqual(
  communityThemeContent.selectCommunityDoodleDarePool(1),
  communityThemeContent.selectCommunityDoodleDarePool(4),
  'the five-theme pool should rotate after three days'
);
const completeCommunityThemeRotation = Array.from(
  { length: 125 },
  (_, blockIndex) =>
    communityThemeContent.selectCommunityDoodleDarePool(blockIndex * 3 + 1)
).flat();
assert.equal(
  new Set(completeCommunityThemeRotation.map((dare) => dare.id)).size,
  125,
  'all authored themes should appear across the complete Year One rotation'
);
assert.ok(
  Array.from({ length: 125 }, (_, themeIndex) => {
    const themeId = communityThemeContent.COMMUNITY_DRAW_THEME_SEASONS.flatMap(
      (season) => season.themes
    )[themeIndex].id;
    return completeCommunityThemeRotation.filter(
      (theme) => theme.id === themeId
    ).length;
  }).every((appearanceCount) => appearanceCount === 5),
  'the complete rotation should deal every authored theme exactly five times'
);
assert.throws(
  () => communityThemeContent.selectCommunityDoodleDarePool(376),
  /append the next season/,
  'unsupported days must fail before they can silently remap published themes'
);
assert.equal(communityThemeContent.COMMUNITY_DRAW_THEME_COVERAGE_DAYS, 375);
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
pass('community and Practice prompt calendars stay complete and nonrepeating');

const shapePowerGuideContent = shapePowerContent.SHAPE_POWER_IDS.map((power) =>
  shapePowerContent.getShapePowerContent(power)
);
assert.deepEqual(
  [
    ...new Set(
      combatConfig.DOMINANT_STAT_TIE_ORDER.map(
        (stat) => combatConfig.PRIMARY_POWER_BY_DOMINANT_STAT[stat]
      )
    ),
  ],
  ['inkquake', 'nib_halo', 'colorburst'],
  'current powers must derive from the canonical dominant-stat tie order'
);
assert.equal(
  new Set(shapePowerGuideContent.map(({ drawingCue }) => drawingCue)).size,
  shapePowerContent.SHAPE_POWER_IDS.length,
  'every Shape Power needs a distinct drawing cue'
);
assert.deepEqual(
  shapePowerContent.SHAPE_POWER_IDS.map((power) =>
    shapePowerContent.getShapePowerDrawingCue(power)
  ),
  [
    'Brown + coral + orange ink wake Inkquake.',
    'Gold + green + blue ink wake Nib Halo.',
    'Gold + green ink wake Smearstep.',
    'Aqua + purple + pink ink wake Colorburst.',
  ]
);
assert.deepEqual(
  shapePowerContent.SHAPE_POWER_IDS.map((power) =>
    shapePowerContent.getShapePowerFieldGuideCue(power)
  ),
  [
    'More HP · Inkquake',
    'Sharp edge · Nib Halo',
    'Faster move · Smearstep',
    'More crit · Colorburst',
  ]
);
assert.deepEqual(
  shapePowerContent.planShapeReceipt('ember', 'nib_halo'),
  {
    cause: 'GOLD + GREEN + BLUE INK',
    move: 'FIRETIP HALO',
    effect: '3 ROTATING QUILLS',
    birthLine: 'GOLD + GREEN + BLUE INK → FIRETIP HALO',
    battleLine: 'GOLD + GREEN + BLUE INK → 3 ROTATING QUILLS',
  },
  'birth and battle should share one plain-language drawing receipt'
);
for (const content of shapePowerGuideContent) {
  assert.ok(
    content.fieldGuideCue.length > 0 && content.fieldGuideCue.length <= 24
  );
  assert.ok(content.drawingCue.length > 0 && content.drawingCue.length <= 32);
  assert.doesNotMatch(content.drawingCue, new RegExp(content.displayName, 'i'));
  assert.doesNotMatch(
    content.fieldGuideCue,
    new RegExp(content.displayName, 'i')
  );
}
pass('Shape Power guide content has one complete canonical catalog');

for (const element of ['ember', 'tide', 'moss', 'storm']) {
  for (const power of shapePowerContent.SHAPE_POWER_IDS) {
    const receipt = shapePowerContent.planShapeReceipt(element, power);
    assert.match(receipt.birthLine, / → /);
    assert.match(receipt.battleLine, / → /);
    assert.ok(receipt.birthLine.length <= 48);
    assert.ok(receipt.battleLine.length <= 54);
  }
}
pass('drawing receipts stay complete, concise, and deterministic');

const drawReceiptSource = readFileSync(
  join(repoRoot, 'src', 'client', 'scenes', 'Draw.ts'),
  'utf8'
);
assert.match(
  drawReceiptSource,
  /planPracticeReveal\(getPracticeSession\(this\)\)/
);
assert.match(
  drawReceiptSource,
  /const combatRoleId = selectCombatRole\([\s\S]{0,120}getCombatRoleContent\(combatRoleId\)/
);
assert.doesNotMatch(drawReceiptSource, /statBudgetRevealCopy/);
assert.match(
  drawReceiptSource,
  /progress\.width > progressMaxWidth[\s\S]*progress\.setScale/,
  'the longest practice receipt must fit its paper card'
);
assert.match(battleCeremonySource, /roleA\.weaponName/);
assert.match(battleCeremonySource, /roleA\.basicAttackName/);
assert.match(battleCeremonySource, /roleB\.signatureName/);
assert.match(battleCeremonySource, /roleMatchup\.label/);
assert.match(battleCeremonySource, /roleMatchup\.detail/);
pass('birth and VS screens teach roles, counters, and drawing behavior');

const practicedRoles = [];
const signaturePowerByRole = {
  brawler: 'inkquake',
  longshot: 'nib_halo',
  mage: 'colorburst',
};
assert.equal(practiceLab.PRACTICE_SUBMIT_LABEL, 'TRY THIS STYLE');
for (let practiceIndex = 0; practiceIndex < 3; practiceIndex += 1) {
  const target = practiceLab.selectPracticeTargetRole(
    practicedRoles,
    9,
    'mock_player'
  );
  assert.ok(
    !practicedRoles.includes(target),
    'Practice Lab should target an untried role until all three are checked'
  );
  const dare = practiceLab.selectPracticeDoodleDare(
    practicedRoles,
    9,
    'mock_player'
  );
  assert.equal(
    dare.suggestedPower,
    signaturePowerByRole[target],
    'Practice Lab prompt and target role should stay aligned'
  );
  practicedRoles.push(target);
}
assert.deepEqual(
  [...practicedRoles].sort(),
  ['brawler', 'longshot', 'mage'],
  'one Practice Lab cycle should cover every role exactly once'
);
assert.equal(
  practiceLab
    .normalizePracticeSession(['smearstep', 'invalid', 'smearstep', 'inkquake'])
    .triedRoles.join(','),
  'brawler,longshot',
  'session progress should migrate legacy powers and normalize duplicates'
);
assert.match(
  practiceLab.practiceProgressCopy(practicedRoles),
  /3\/3 ROLES/,
  'completed session progress should be unmistakable'
);
assert.equal(
  (
    practiceLab
      .planPracticeOutcome(practiceLab.normalizePracticeSession(practicedRoles))
      .checklist.match(/✓/g) ?? []
  ).length,
  3,
  'completed practice checklist should mark all three roles'
);
const firstPracticeSession = practiceLab.recordPracticeSessionRole(
  practiceLab.createPracticeSession(),
  'brawler'
);
assert.equal(firstPracticeSession.lastRoleWasNew, true);
assert.deepEqual(firstPracticeSession.triedRoles, ['brawler']);
assert.equal(firstPracticeSession.attemptCount, 1);
assert.deepEqual(practiceLab.planPracticeReveal(firstPracticeSession), {
  headline: 'STYLE READY!',
  roleName: 'BRAWLER',
  roleDetail: 'CLOSE RANGE · INK FISTS · INKQUAKE',
  progress: '1 OF 3 FOUND',
  primaryButton: 'WATCH IT FIGHT',
});
const repeatedPracticeSession = practiceLab.recordPracticeSessionRole(
  firstPracticeSession,
  'brawler'
);
assert.equal(repeatedPracticeSession.lastRoleWasNew, false);
assert.equal(repeatedPracticeSession.attemptCount, 2);
assert.deepEqual(
  repeatedPracticeSession.triedRoles,
  ['brawler'],
  'repeating one server-confirmed role must not inflate session progress'
);
const completedPracticeSession = practicedRoles.reduce(
  (session, role) => practiceLab.recordPracticeSessionRole(session, role),
  practiceLab.createPracticeSession()
);
const completedPracticePlan = practiceLab.planPracticeOutcome(
  completedPracticeSession
);
assert.equal(completedPracticePlan.completed, true);
assert.equal(completedPracticePlan.celebrateCompletion, true);
assert.equal(completedPracticePlan.headline, '3/3 ROLES FOUND');
assert.match(completedPracticePlan.result, /DRAW DIFFERENTLY/);
assert.match(completedPracticePlan.primaryButton, /DRAW ONE MORE/);
assert.equal(completedPracticeSession.attemptCount, 3);
const practiceEncoreTargets = Array.from({ length: 3 }, (_, encoreIndex) =>
  practiceLab.selectPracticeTargetRole(
    completedPracticeSession.triedRoles,
    9,
    'mock_player',
    completedPracticeSession.attemptCount + encoreIndex
  )
);
assert.equal(
  new Set(practiceEncoreTargets).size,
  3,
  'post-completion Practice should rotate through all roles instead of repeating one target'
);
const practiceEncorePrompts = Array.from(
  { length: 3 },
  (_, encoreIndex) =>
    practiceLab.selectPracticeDoodleDare(
      completedPracticeSession.triedRoles,
      9,
      'mock_player',
      completedPracticeSession.attemptCount + encoreIndex
    ).id
);
assert.equal(
  new Set(practiceEncorePrompts).size,
  3,
  'post-completion Practice should keep its prompt cards visibly varied'
);
const repeatedCompletedSession = practiceLab.recordPracticeSessionRole(
  completedPracticeSession,
  completedPracticeSession.lastRole
);
assert.equal(repeatedCompletedSession.attemptCount, 4);
assert.equal(
  practiceLab.planPracticeOutcome(repeatedCompletedSession).celebrateCompletion,
  false,
  'repeating a role after 3/3 must not replay the completion celebration'
);
assert.equal(
  practiceLab.planPracticeOutcome(repeatedPracticeSession).completed,
  false,
  'repeating one role must never trigger the three-role completion ceremony'
);
pass('Practice Lab targets every combat role without persistent progression');

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
assert.equal(replayCommentaryContent.INKCAST_COMMENTARY_PACK_VERSION, 2);
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
assert.match(firstTelegraph, /Shockwave/);
assert.doesNotMatch(firstTelegraph, /Cinderquake/);
const plainNibTelegraph = replayCommentary
  .createReplayCommentaryAuthor({
    ...commentaryContext,
    fighters: {
      ...commentaryContext.fighters,
      b: { ...commentaryContext.fighters.b, element: 'tide' },
    },
  })
  .author({
    kind: 'power-telegraph',
    tick: 49,
    actor: 'b',
    power: 'nib_halo',
    activationNumber: 2,
  });
assert.match(plainNibTelegraph, /Quill orbit/);
assert.doesNotMatch(plainNibTelegraph, /Riptide Halo/);
assert.equal(
  replayCommentary
    .createReplayCommentaryAuthor(commentaryContext)
    .author(powerTelegraphFact),
  firstTelegraph,
  'fresh sessions with the same authoritative facts must replay identically'
);
const watchAgainVariants = new Set(
  Array.from({ length: 8 }, (_, replayPass) =>
    replayCommentary
      .createReplayCommentaryAuthor({ ...commentaryContext, replayPass })
      .author(powerTelegraphFact)
  )
);
assert.ok(
  watchAgainVariants.size >= 2,
  'session-only saved-replay passes should rotate safe commentary variants'
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
assert.match(truthfulDamageLine, /Paper Comet/);
assert.doesNotMatch(truthfulDamageLine, /Cinderquake/);
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
assert.match(criticalDamageLine, /Moss Wizard/);
assert.doesNotMatch(criticalDamageLine, /Mossguard Halo/);
assert.match(criticalDamageLine, /Paper Comet/);
assert.match(criticalDamageLine, /51/);
assert.match(criticalDamageLine, /big|huge|hard|powerful/i);
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
  /miss(?:es|ed)?|no (?:clean )?hit|does not hit/i,
  'a miss line should say simply that the attack missed'
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
const founderPlainReaction = mosswhiskDefinition.personality.signatureReaction
  .slice(mosswhiskDefinition.personality.signatureReaction.indexOf('!') + 1)
  .trim();
assert.ok(
  founderSignatureReaction.includes(founderPlainReaction),
  'founder reactions should retain their authored visual description'
);
assert.equal(
  founderSignatureReaction.includes(
    shapePowerContent.getShapePowerSignatureName(
      founderCommentaryContext.fighters.a.element,
      founderCommentaryContext.fighters.a.primaryPower
    )
  ),
  false,
  'founder replay commentary should omit unexplained signature aliases'
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
  practice: 'ROLE PRACTICE',
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
    'ROLE MATCHUP • READ THE RANGE',
    `${kind} should retain the role matchup caption`
  );
}

for (const [
  firstPower,
  secondPower,
  expectedMechanics,
] of expectedMatchupMechanics) {
  const pairKey = matchupBrief.getBattleMatchupPowerPairKey(
    firstPower,
    secondPower
  );
  assert.deepEqual(
    matchupBrief.BATTLE_MATCHUP_CONTENT_BY_POWER_PAIR[pairKey],
    expectedMechanics,
    `${firstPower}/${secondPower} should preserve its legacy replay explanation`
  );
}
assert.equal(
  expectedMatchupMechanics.filter(
    ([firstPower, secondPower]) => firstPower === secondPower
  ).length,
  4,
  'the archived mechanics matrix should retain all four same-power matchups'
);

let orderedMatchupPairCount = 0;
const currentShapePowers = ['inkquake', 'nib_halo', 'colorburst'];
for (const firstPower of currentShapePowers) {
  for (const secondPower of currentShapePowers) {
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
    assert.equal(reversePlan.fighters.a.role, orderedPlan.fighters.b.role);
    assert.equal(reversePlan.fighters.b.role, orderedPlan.fighters.a.role);
    assert.match(orderedPlan.matchup.label, /(?:BEATS|MIRROR)/);
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
  9,
  'all nine current ordered power pairs should be planned'
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
pass('pre-fight matchup briefs are exhaustive, role-first, and immutable');

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
  'the same fallback identity and stats should always reproduce the same art plan'
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
  'all four stats should continuously vary fallbacks inside one dominant archetype'
);

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
    },
    {
      id: definition.id,
      name: definition.name,
      artist: definition.artist,
      element: definition.element,
      stats: definition.stats,
      imageUrl: definition.imageUrl,
      level: definition.level,
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
  3,
  'community Champions should have one distinct challenge voice per Shape Power'
);
pass('daily Champion Contract content stays canonical and truthful');

assert.deepEqual(
  founderCharacterArt.FOUNDING_CHARACTER_DESIGNS.map((design) => design.id),
  speciesCore.foundingScribbits.map((founder) => founder.id),
  'every battle-ready founder should resolve to authored canvas art'
);
assert.equal(
  new Set(
    founderCharacterArt.FOUNDING_CHARACTER_DESIGNS.map(
      (design) => design.silhouette
    )
  ).size,
  speciesCore.foundingScribbits.length,
  'all twenty founders should have a unique readable silhouette'
);
assert.equal(
  new Set(
    founderCharacterArt.FOUNDING_CHARACTER_DESIGNS.map(
      (design) => `${design.body}:${design.accent}:${design.detail}`
    )
  ).size,
  speciesCore.foundingScribbits.length,
  'all twenty founders should have a unique authored palette'
);
pass('authored founder canvas characters cover the complete battle roster');

const createMemoryStorage = (options = {}) => {
  const values = new Map();
  const hashes = new Map();
  const sortedSets = new Map();
  const expirations = new Map();
  const keyVersions = new Map();
  let commitsUntilReplyLoss = Number.isSafeInteger(
    options.throwAfterCommitNumber
  )
    ? Math.max(0, options.throwAfterCommitNumber)
    : options.throwAfterCommitOnce === true
      ? 1
      : 0;
  let watchConflictCount = 0;
  let failedCommandIndex = Number.isSafeInteger(options.failCommandAtIndexOnce)
    ? options.failCommandAtIndexOnce
    : -1;

  const getKeyVersion = (key) => keyVersions.get(key) ?? 0;
  const bumpKeyVersion = (key) => {
    keyVersions.set(key, getKeyVersion(key) + 1);
  };

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
    async type(key) {
      if (values.has(key)) return 'string';
      if (hashes.has(key)) return 'hash';
      if (sortedSets.has(key)) return 'zset';
      return 'none';
    },
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      values.set(key, value);
      bumpKeyVersion(key);
    },
    async del(...keys) {
      for (const key of keys) {
        values.delete(key);
        hashes.delete(key);
        sortedSets.delete(key);
        expirations.delete(key);
        bumpKeyVersion(key);
      }
    },
    async incrBy(key, value) {
      const next = Number(values.get(key) ?? '0') + value;
      values.set(key, String(next));
      bumpKeyVersion(key);
      return next;
    },
    async expire(key, seconds) {
      expirations.set(key, seconds);
      bumpKeyVersion(key);
    },
    getExpirationSeconds(key) {
      return expirations.get(key);
    },
    getWatchConflictCount() {
      return watchConflictCount;
    },
    async hGet(key, field) {
      return hashes.get(key)?.get(field);
    },
    async hGetAll(key) {
      return Object.fromEntries(hashes.get(key)?.entries() ?? []);
    },
    async hKeys(key) {
      return [...(hashes.get(key)?.keys() ?? [])];
    },
    async hSet(key, fieldValues) {
      const hash = getHash(key);
      for (const [field, value] of Object.entries(fieldValues)) {
        hash.set(field, value);
      }
      bumpKeyVersion(key);
    },
    async hSetNX(key, field, value) {
      const hash = getHash(key);
      if (hash.has(field)) {
        return 0;
      }
      hash.set(field, value);
      bumpKeyVersion(key);
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
      if (deleted > 0) bumpKeyVersion(key);
      return deleted;
    },
    async hIncrBy(key, field, value) {
      const hash = getHash(key);
      const next = Number(hash.get(field) ?? '0') + value;
      hash.set(field, String(next));
      bumpKeyVersion(key);
      return next;
    },
    async zAdd(key, ...members) {
      const set = getSortedSet(key);
      for (const entry of members) {
        set.set(entry.member, entry.score);
      }
      bumpKeyVersion(key);
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
      bumpKeyVersion(key);
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
      bumpKeyVersion(key);
      return next;
    },
  };

  if (options.transactions !== false) {
    storage.watch = async (...watchedKeys) => {
      const watchedVersions = new Map(
        watchedKeys.map((key) => [key, getKeyVersion(key)])
      );
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
            bumpKeyVersion(key);
            return next;
          });
        },
        async set(key, value) {
          queueCommand(() => {
            values.set(key, value);
            bumpKeyVersion(key);
          });
        },
        async del(...keys) {
          queueCommand(() => {
            let deleted = 0;
            for (const key of keys) {
              if (values.delete(key)) deleted += 1;
              hashes.delete(key);
              sortedSets.delete(key);
              expirations.delete(key);
              bumpKeyVersion(key);
            }
            return deleted;
          });
        },
        async expire(key, seconds) {
          queueCommand(() => {
            expirations.set(key, seconds);
            bumpKeyVersion(key);
          });
        },
        async hSet(key, fieldValues) {
          queueCommand(() => {
            const hash = getHash(key);
            for (const [field, value] of Object.entries(fieldValues)) {
              hash.set(field, value);
            }
            bumpKeyVersion(key);
          });
        },
        async hSetNX(key, field, value) {
          queueCommand(() => {
            const hash = getHash(key);
            if (hash.has(field)) return 0;
            hash.set(field, value);
            bumpKeyVersion(key);
            return 1;
          });
        },
        async hDel(key, fields) {
          queueCommand(() => {
            const hash = hashes.get(key);
            if (!hash) return 0;
            let deleted = 0;
            for (const field of fields) {
              if (hash.delete(field)) deleted += 1;
            }
            if (deleted > 0) bumpKeyVersion(key);
            return deleted;
          });
        },
        async hIncrBy(key, field, value) {
          queueCommand(() => {
            const hash = getHash(key);
            const next = Number(hash.get(field) ?? '0') + value;
            hash.set(field, String(next));
            bumpKeyVersion(key);
            return next;
          });
        },
        async zAdd(key, ...members) {
          queueCommand(() => {
            const set = getSortedSet(key);
            for (const entry of members) {
              set.set(entry.member, entry.score);
            }
            bumpKeyVersion(key);
          });
        },
        async zRem(key, members) {
          queueCommand(() => {
            const set = getSortedSet(key);
            let deleted = 0;
            for (const member of members) {
              if (set.delete(member)) deleted += 1;
            }
            if (deleted > 0) bumpKeyVersion(key);
            return deleted;
          });
        },
        async zIncrBy(key, member, value) {
          queueCommand(() => {
            const set = getSortedSet(key);
            const next = Number(set.get(member) ?? 0) + value;
            set.set(member, next);
            bumpKeyVersion(key);
            return next;
          });
        },
        async exec() {
          if (!transactionStarted || transactionFinished) {
            throw new Error('Memory transaction cannot execute.');
          }
          transactionFinished = true;
          if (
            [...watchedVersions].some(
              ([key, version]) => getKeyVersion(key) !== version
            )
          ) {
            watchConflictCount += 1;
            return [];
          }
          const results = queuedCommands.map((command, commandIndex) => {
            if (commandIndex === failedCommandIndex) {
              failedCommandIndex = -1;
              return new Error('Simulated Redis command error during EXEC.');
            }
            return command();
          });
          if (commitsUntilReplyLoss > 0) {
            commitsUntilReplyLoss -= 1;
            if (commitsUntilReplyLoss === 0) {
              throw new Error('Simulated transaction reply loss after commit.');
            }
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

const submissionAccessoryId = inkCatalog.INK_ACCESSORY_CATALOG[0].id;
const submissionDrawingInkId = inkCatalog.INK_DRAWING_INK_CATALOG[0].id;
const submissionBrushId = inkCatalog.INK_BRUSH_CATALOG[0].id;
const atomicSubmissionStorage = createMemoryStorage();
const atomicSubmissionUserId = 'atomic-submission-player';
const atomicSubmissionDay = 88;
const expectedSubmissionDrawCharges = {
  available: 3,
  capacity: 4,
  nextRefreshAt: Date.parse('2026-07-13T20:00:00.000Z'),
};
const assertCommittedSubmission = (result, recovered) => {
  assert.deepEqual(result, {
    status: 'committed',
    recovered,
    drawCharges: expectedSubmissionDrawCharges,
    enteredRumble: true,
  });
};
const atomicSubmissionScribbit = makeScribbit({
  id: 'atomic-submission-scribbit',
  bornDay: atomicSubmissionDay,
  expiresDay: atomicSubmissionDay + arena.LIFESPAN_DAYS,
  accessories: [submissionAccessoryId],
});
await arenaStore.setCurrentArenaDay(
  atomicSubmissionStorage,
  atomicSubmissionDay
);
await atomicSubmissionStorage.set(
  inkStore.getInkKey(atomicSubmissionUserId),
  '12'
);
await atomicSubmissionStorage.hSet(
  inkStore.getInventoryKey(atomicSubmissionUserId),
  {
    [submissionAccessoryId]: '2',
    [submissionDrawingInkId]: '2',
    [submissionBrushId]: '1',
    [inkStore.getInventoryGearRankField(submissionAccessoryId)]: '4',
  }
);
await atomicSubmissionStorage.hSet(
  streakCore.getUserPlayStreakKey(atomicSubmissionUserId),
  { lastPlayedDateKey: '20260712', streakDays: '4' }
);
const atomicSubmissionResult = await submissionCore.commitScribbitSubmission(
  atomicSubmissionStorage,
  {
    userId: atomicSubmissionUserId,
    scribbit: atomicSubmissionScribbit,
    currentDate: new Date('2026-07-13T12:00:00.000Z'),
    accessoryIds: [submissionAccessoryId],
    drawingSupplies: {
      drawingInkId: submissionDrawingInkId,
      brushId: submissionBrushId,
    },
    rumbleScore: 7_777,
    inkAward: arena.INK_REWARDS.dailyDraw,
  }
);
assertCommittedSubmission(atomicSubmissionResult, false);
const atomicSubmissionSnapshot = {
  ...atomicSubmissionScribbit,
  gearRanks: { [submissionAccessoryId]: 4 },
};
assert.equal(
  await atomicSubmissionStorage.get(
    scribbitCore.getScribbitKey(atomicSubmissionScribbit.id)
  ),
  scribbitCore.serializeScribbit(atomicSubmissionSnapshot)
);
assert.equal(
  await atomicSubmissionStorage.get(
    scribbitCore.getScribbitOwnerKey(atomicSubmissionScribbit.id)
  ),
  atomicSubmissionUserId
);
assert.equal(
  await atomicSubmissionStorage.zScore(
    scribbitCore.getUserScribbitsKey(atomicSubmissionUserId),
    atomicSubmissionScribbit.id
  ),
  atomicSubmissionDay
);
assert.equal(
  await atomicSubmissionStorage.zScore(
    scribbitCore.getUserAliveScribbitsKey(atomicSubmissionUserId),
    atomicSubmissionScribbit.id
  ),
  atomicSubmissionDay
);
assert.equal(
  await atomicSubmissionStorage.zScore(
    scribbitCore.getExpiringScribbitsKey(),
    atomicSubmissionScribbit.id
  ),
  atomicSubmissionScribbit.expiresDay
);
assert.equal(
  await atomicSubmissionStorage.zScore(
    scribbitCore.getRumbleKey(atomicSubmissionDay),
    atomicSubmissionScribbit.id
  ),
  7_777
);
assert.deepEqual(
  await atomicSubmissionStorage.hGetAll(
    scribbitCore.getDailyFlagsKey(atomicSubmissionUserId, atomicSubmissionDay)
  ),
  { drawn: '1', entered: '1' }
);
assert.equal(
  atomicSubmissionStorage.getExpirationSeconds(
    scribbitCore.getDailyFlagsKey(atomicSubmissionUserId, atomicSubmissionDay)
  ),
  scribbitCore.DAILY_FLAG_TTL_SECONDS
);
assert.equal(
  await atomicSubmissionStorage.get(inkStore.getInkKey(atomicSubmissionUserId)),
  String(12 + arena.INK_REWARDS.dailyDraw)
);
assert.deepEqual(
  await atomicSubmissionStorage.hGetAll(
    streakCore.getUserPlayStreakKey(atomicSubmissionUserId)
  ),
  { lastPlayedDateKey: '20260713', streakDays: '5' }
);
const atomicSubmissionInventory = await atomicSubmissionStorage.hGetAll(
  inkStore.getInventoryKey(atomicSubmissionUserId)
);
assert.equal(atomicSubmissionInventory[submissionAccessoryId], '1');
assert.equal(
  atomicSubmissionInventory[submissionDrawingInkId],
  '1',
  'a used collectible paint should spend exactly one charge'
);
assert.equal(
  atomicSubmissionInventory[submissionBrushId],
  '0',
  'a used collectible brush should spend its final charge exactly once'
);
assert.equal(
  atomicSubmissionInventory[
    inkStore.getInventoryDiscoveryField(submissionAccessoryId)
  ],
  '1'
);
assert.equal(
  atomicSubmissionInventory[
    inkStore.getInventoryDiscoveryField(submissionDrawingInkId)
  ],
  '1'
);
assert.equal(
  atomicSubmissionInventory[
    inkStore.getInventoryDiscoveryField(submissionBrushId)
  ],
  '1'
);
await atomicSubmissionStorage.hSet(
  inkStore.getInventoryKey(atomicSubmissionUserId),
  { [inkStore.getInventoryGearRankField(submissionAccessoryId)]: '5' }
);
assert.deepEqual(
  await scribbitCore.loadScribbit(
    atomicSubmissionStorage,
    atomicSubmissionScribbit.id
  ),
  atomicSubmissionSnapshot,
  'later inventory merges must not rewrite an attached rank in a battle-ready Scribbit snapshot'
);
pass(
  'Scribbit birth atomically commits every authoritative player write and drawing charge'
);

const unavailableSubmissionStorage = createMemoryStorage();
const unavailableSubmissionScribbit = makeScribbit({
  id: 'unavailable-submission-scribbit',
  bornDay: 89,
  expiresDay: 89 + arena.LIFESPAN_DAYS,
});
await arenaStore.setCurrentArenaDay(unavailableSubmissionStorage, 89);
const unavailableSubmissionResult =
  await submissionCore.commitScribbitSubmission(unavailableSubmissionStorage, {
    userId: 'unavailable-submission-player',
    scribbit: unavailableSubmissionScribbit,
    currentDate: new Date('2026-07-13T12:00:00.000Z'),
    accessoryIds: [submissionAccessoryId],
    rumbleScore: 1,
    inkAward: arena.INK_REWARDS.dailyDraw,
  });
assert.deepEqual(unavailableSubmissionResult, {
  status: 'insufficient-accessory',
  accessoryId: submissionAccessoryId,
});
assert.equal(
  await unavailableSubmissionStorage.get(
    scribbitCore.getScribbitKey(unavailableSubmissionScribbit.id)
  ),
  undefined
);
assert.deepEqual(
  await unavailableSubmissionStorage.hGetAll(
    scribbitCore.getDailyFlagsKey('unavailable-submission-player', 89)
  ),
  {}
);
assert.equal(
  await unavailableSubmissionStorage.get(
    inkStore.getInkKey('unavailable-submission-player')
  ),
  undefined
);
pass('rejected Scribbit birth leaves every authoritative surface untouched');

const replyLossSubmissionStorage = createMemoryStorage({
  throwAfterCommitNumber: 2,
});
const replyLossSubmissionUserId = 'reply-loss-submission-player';
const replyLossSubmissionScribbit = makeScribbit({
  id: 'reply-loss-submission-scribbit',
  bornDay: 90,
  expiresDay: 90 + arena.LIFESPAN_DAYS,
});
await arenaStore.setCurrentArenaDay(replyLossSubmissionStorage, 90);
await replyLossSubmissionStorage.set(
  inkStore.getInkKey(replyLossSubmissionUserId),
  '20'
);
await replyLossSubmissionStorage.hSet(
  inkStore.getInventoryKey(replyLossSubmissionUserId),
  { [submissionAccessoryId]: '2' }
);
const replyLossSubmissionInput = {
  userId: replyLossSubmissionUserId,
  scribbit: replyLossSubmissionScribbit,
  currentDate: new Date('2026-07-13T12:00:00.000Z'),
  accessoryIds: [submissionAccessoryId],
  rumbleScore: 9_999,
  inkAward: arena.INK_REWARDS.dailyDraw,
};
assertCommittedSubmission(
  await submissionCore.commitScribbitSubmission(
    replyLossSubmissionStorage,
    replyLossSubmissionInput
  ),
  true
);
assert.equal(
  await replyLossSubmissionStorage.get(
    inkStore.getInkKey(replyLossSubmissionUserId)
  ),
  String(20 + arena.INK_REWARDS.dailyDraw)
);
assert.equal(
  (
    await replyLossSubmissionStorage.hGetAll(
      inkStore.getInventoryKey(replyLossSubmissionUserId)
    )
  )[submissionAccessoryId],
  '1'
);
assert.deepEqual(
  await submissionCore.commitScribbitSubmission(
    replyLossSubmissionStorage,
    replyLossSubmissionInput
  ),
  { status: 'id-collision' }
);
assert.equal(
  await replyLossSubmissionStorage.get(
    inkStore.getInkKey(replyLossSubmissionUserId)
  ),
  String(20 + arena.INK_REWARDS.dailyDraw)
);
pass('Scribbit birth recovers reply loss without duplicate rewards or spend');

const commandErrorSubmissionStorage = createMemoryStorage({
  failCommandAtIndexOnce: 7,
});
const commandErrorSubmissionUserId = 'command-error-submission-player';
const commandErrorSubmissionScribbit = makeScribbit({
  id: 'command-error-submission-scribbit',
  bornDay: 93,
  expiresDay: 93 + arena.LIFESPAN_DAYS,
});
await arenaStore.setCurrentArenaDay(commandErrorSubmissionStorage, 93);
await commandErrorSubmissionStorage.set(
  inkStore.getInkKey(commandErrorSubmissionUserId),
  '30'
);
assertCommittedSubmission(
  await submissionCore.commitScribbitSubmission(commandErrorSubmissionStorage, {
    userId: commandErrorSubmissionUserId,
    scribbit: commandErrorSubmissionScribbit,
    currentDate: new Date('2026-07-13T12:00:00.000Z'),
    accessoryIds: [],
    rumbleScore: 10_001,
    inkAward: arena.INK_REWARDS.dailyDraw,
  }),
  true
);
assert.equal(
  await commandErrorSubmissionStorage.get(
    inkStore.getInkKey(commandErrorSubmissionUserId)
  ),
  String(30 + arena.INK_REWARDS.dailyDraw)
);
assert.equal(
  await commandErrorSubmissionStorage.zScore(
    scribbitCore.getRumbleKey(93),
    commandErrorSubmissionScribbit.id
  ),
  10_001
);
pass('Scribbit birth repairs a Redis EXEC command error to exact state');

const guardedRepairStorage = createMemoryStorage({
  failCommandAtIndexOnce: 5,
});
const guardedRepairUserId = 'guarded-repair-submission-player';
const guardedRepairScribbit = makeScribbit({
  id: 'guarded-repair-submission-scribbit',
  bornDay: 95,
  expiresDay: 95 + arena.LIFESPAN_DAYS,
});
await arenaStore.setCurrentArenaDay(guardedRepairStorage, 95);
const baseGuardedRepairWatch =
  guardedRepairStorage.watch.bind(guardedRepairStorage);
let nightlyClaimWasBlockedByActiveSubmission = false;
guardedRepairStorage.watch = async (...keys) => {
  const transaction = await baseGuardedRepairWatch(...keys);
  const baseExec = transaction.exec.bind(transaction);
  transaction.exec = async () => {
    const result = await baseExec();
    if (keys.includes(scribbitCore.getScribbitKey(guardedRepairScribbit.id))) {
      const activeSubmission = await guardedRepairStorage.zScore(
        arenaStore.getActiveScribbitSubmissionsKey(95),
        guardedRepairScribbit.id
      );
      nightlyClaimWasBlockedByActiveSubmission = activeSubmission !== undefined;
      if (!nightlyClaimWasBlockedByActiveSubmission) {
        await guardedRepairStorage.hSet(
          arenaStore.getNightlyResolutionClaimsKey(),
          { '95': '1234' }
        );
      }
    }
    return result;
  };
  return transaction;
};
assertCommittedSubmission(
  await submissionCore.commitScribbitSubmission(guardedRepairStorage, {
    userId: guardedRepairUserId,
    scribbit: guardedRepairScribbit,
    currentDate: new Date('2026-07-13T12:00:00.000Z'),
    accessoryIds: [],
    rumbleScore: 10_003,
    inkAward: arena.INK_REWARDS.dailyDraw,
  }),
  true
);
assert.equal(nightlyClaimWasBlockedByActiveSubmission, true);
assert.equal(
  await guardedRepairStorage.hGet(
    arenaStore.getNightlyResolutionClaimsKey(),
    '95'
  ),
  undefined
);
assert.equal(
  await guardedRepairStorage.zScore(
    scribbitCore.getRumbleKey(95),
    guardedRepairScribbit.id
  ),
  10_003
);
assert.equal(
  await guardedRepairStorage.zScore(
    arenaStore.getActiveScribbitSubmissionsKey(95),
    guardedRepairScribbit.id
  ),
  undefined
);
pass('active submission lease blocks nightly across partial EXEC repair');

const rolloverSubmissionStorage = createMemoryStorage();
const rolloverSubmissionScribbit = makeScribbit({
  id: 'rollover-submission-scribbit',
  bornDay: 94,
  expiresDay: 94 + arena.LIFESPAN_DAYS,
});
await arenaStore.setCurrentArenaDay(rolloverSubmissionStorage, 94);
const baseRolloverWatch = rolloverSubmissionStorage.watch.bind(
  rolloverSubmissionStorage
);
let injectedRolloverClaim = false;
rolloverSubmissionStorage.watch = async (...keys) => {
  const transaction = await baseRolloverWatch(...keys);
  const baseExec = transaction.exec.bind(transaction);
  transaction.exec = async () => {
    if (
      !injectedRolloverClaim &&
      keys.includes(arenaStore.getNightlyResolutionClaimsKey())
    ) {
      injectedRolloverClaim = true;
      await rolloverSubmissionStorage.hSet(
        arenaStore.getNightlyResolutionClaimsKey(),
        { '94': '1234' }
      );
    }
    return await baseExec();
  };
  return transaction;
};
assert.deepEqual(
  await submissionCore.commitScribbitSubmission(rolloverSubmissionStorage, {
    userId: 'rollover-submission-player',
    scribbit: rolloverSubmissionScribbit,
    currentDate: new Date('2026-07-13T12:00:00.000Z'),
    accessoryIds: [],
    rumbleScore: 10_002,
    inkAward: arena.INK_REWARDS.dailyDraw,
  }),
  { status: 'rollover' }
);
assert.equal(
  await rolloverSubmissionStorage.get(
    scribbitCore.getScribbitKey(rolloverSubmissionScribbit.id)
  ),
  undefined
);
assert.equal(
  await rolloverSubmissionStorage.zScore(
    scribbitCore.getRumbleKey(94),
    rolloverSubmissionScribbit.id
  ),
  undefined
);
pass(
  'nightly resolution claim fences a late Scribbit before its Rumble commit'
);

const noTransactionSubmissionStorage = createMemoryStorage({
  transactions: false,
});
const noTransactionSubmissionScribbit = makeScribbit({
  id: 'no-transaction-submission-scribbit',
  bornDay: 91,
  expiresDay: 91 + arena.LIFESPAN_DAYS,
});
await arenaStore.setCurrentArenaDay(noTransactionSubmissionStorage, 91);
await assert.rejects(
  submissionCore.commitScribbitSubmission(noTransactionSubmissionStorage, {
    userId: 'no-transaction-submission-player',
    scribbit: noTransactionSubmissionScribbit,
    currentDate: new Date('2026-07-13T12:00:00.000Z'),
    accessoryIds: [],
    rumbleScore: 1,
    inkAward: arena.INK_REWARDS.dailyDraw,
  }),
  /requires transaction support/
);
assert.equal(
  await noTransactionSubmissionStorage.get(
    scribbitCore.getScribbitKey(noTransactionSubmissionScribbit.id)
  ),
  undefined
);

const replyLossStoreStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
const replyLossStoredScribbit = makeScribbit({
  id: 'reply-loss-store-scribbit',
  bornDay: 92,
  expiresDay: 92 + arena.LIFESPAN_DAYS,
});
await scribbitCore.storeScribbit(
  replyLossStoreStorage,
  'reply-loss-store-player',
  replyLossStoredScribbit
);
assert.equal(
  await replyLossStoreStorage.get(
    scribbitCore.getScribbitOwnerKey(replyLossStoredScribbit.id)
  ),
  'reply-loss-store-player'
);
assert.equal(
  await replyLossStoreStorage.zScore(
    scribbitCore.getUserAliveScribbitsKey('reply-loss-store-player'),
    replyLossStoredScribbit.id
  ),
  replyLossStoredScribbit.bornDay
);
pass('Scribbit storage fails closed and reconciles an ambiguous atomic commit');

const hashCompareStorage = createMemoryStorage();
await hashCompareStorage.hSet('result-comment-claim-test', {
  day: 'claiming:stale',
});
const competingClaimReplacements = await Promise.all([
  storageCore.replaceHashFieldIfEqual(
    hashCompareStorage,
    'result-comment-claim-test',
    'day',
    'claiming:stale',
    'claiming:rescuer-a',
    'Result comment claim test A'
  ),
  storageCore.replaceHashFieldIfEqual(
    hashCompareStorage,
    'result-comment-claim-test',
    'day',
    'claiming:stale',
    'claiming:rescuer-b',
    'Result comment claim test B'
  ),
]);
assert.equal(
  competingClaimReplacements.filter(Boolean).length,
  1,
  'exactly one stale-claim rescuer may replace an unchanged hash field'
);
assert.match(
  (await hashCompareStorage.hGet('result-comment-claim-test', 'day')) ?? '',
  /^claiming:rescuer-[ab]$/
);
pass('hash compare-and-replace fences concurrent stale-claim rescue');

const createBattleReportWithWinner = (
  fighterA,
  fighterB,
  day,
  id,
  kind,
  winner
) => {
  const roleBuilds = [
    { chonk: 55, spike: 15, zip: 15, charm: 15 },
    { chonk: 15, spike: 55, zip: 15, charm: 15 },
    { chonk: 15, spike: 15, zip: 55, charm: 15 },
    { chonk: 15, spike: 15, zip: 15, charm: 55 },
  ];
  const report = roleBuilds
    .flatMap((statsA) =>
      roleBuilds.map((statsB) =>
        battle.simulate(
          { ...fighterA, stats: statsA },
          { ...fighterB, stats: statsB },
          0,
          {
            day,
            boostedElement: 'storm',
            nerfedElement: 'moss',
            blurb: 'Winning transcript fixture.',
          },
          kind
        )
      )
    )
    .find((candidate) => candidate.winner === winner);
  assert.ok(report, `${id} should find one deterministic winning transcript`);
  return { ...report, id };
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
const scoutNotebookReport = createBattleReportWithWinner(
  championScoutPick,
  scoutNotebookOpponent,
  8,
  'scout-notebook-day-8-report',
  'rumble',
  'a'
);
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
assert.equal(scoutNotebookSummary.formLine, '7 DAYS • 1 WIN • 1 FINAL');
assert.equal(scoutNotebookSummary.lifetimeLine, '4 TOTAL CLOUT');
assert.equal(scoutNotebookSummary.pages[1].actionKind, 'replay');
assert.equal(scoutNotebookSummary.pages[1].actionLabel, 'WATCH REPLAY');
assert.equal(
  scoutNotebookSummary.pages[1].actionAccessibleLabel,
  'Watch Day 8 replay'
);
assert.equal(scoutNotebookSummary.pages[1].tabLabel, 'D8');
assert.equal(scoutNotebookSummary.pages[1].tabStatusLabel, 'WIN');
assert.equal(
  scoutNotebookSummary.pages[1].tabAccessibleLabel,
  'Day 8. CHAMPION.'
);
assert.match(
  scoutNotebookSummary.pages[1].pageAccessibleLabel,
  /Forecast: .+ up 15 percent; .+ down 10 percent\./
);
assert.ok(scoutNotebookSummary.pages[1].pageAccessibleLabel.length <= 240);
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

assert.deepEqual(mockCombatBundle.INK_REWARDS, arena.INK_REWARDS);
assert.deepEqual(mockCombatBundle.XP_REWARDS, arena.XP_REWARDS);
assert.equal(
  mockCombatBundle.getCapsuleCostForDailyState(false),
  arena.CAPSULE_FIRST_DAILY_COST
);
assert.equal(
  mockCombatBundle.getCapsuleCostForDailyState(true),
  arena.CAPSULE_COST
);
assert.deepEqual(
  [0, 2, 3, 6, 7, 11, 12, 18].map((xp) => mockCombatBundle.getLevelForXp(xp)),
  [1, 1, 2, 2, 3, 3, 4, 5]
);
assert.deepEqual(mockCombatBundle.getRumbleProgressionRewards(2), {
  xpAwarded: arena.XP_REWARDS.rumbleWin * 2,
  inkAwarded: arena.INK_REWARDS.rumbleWin * 2,
});
assert.equal(mockCombatBundle.advanceCapsulePity(8, 'common'), 9);
assert.equal(mockCombatBundle.advanceCapsulePity(9, 'epic'), 0);
const pityDrop = mockCombatBundle.selectCapsuleDrop({
  userId: 'mock-pity-proof',
  day: 9,
  pullCount: 10,
  pullsSinceEpic: 9,
});
assert.equal(pityDrop.rarity, 'epic');
const emptyMockInventory = {
  items: {},
  gear: {},
  pens: [],
  titles: [],
  equippedTitle: null,
  discovered: [],
};
const firstMockInventoryGrant = mockCombatBundle.projectCapsuleInventoryGrant(
  emptyMockInventory,
  pityDrop
);
const repeatedMockInventoryGrant =
  mockCombatBundle.projectCapsuleInventoryGrant(
    firstMockInventoryGrant.inventory,
    pityDrop
  );
assert.equal(firstMockInventoryGrant.isNew, true);
assert.equal(repeatedMockInventoryGrant.isNew, false);
assert.equal(
  repeatedMockInventoryGrant.inventory.discovered.filter(
    (catalogId) => catalogId === pityDrop.id
  ).length,
  1
);
const mockAccessory = mockCombatBundle.COSMETIC_CATALOG.find(
  ({ kind }) => kind === 'accessory'
);
assert.ok(mockAccessory);
const accessoryInventory = {
  ...emptyMockInventory,
  items: { [mockAccessory.id]: 2 },
  discovered: [mockAccessory.id],
};
const consumedMockAccessories =
  mockCombatBundle.projectAccessoryInventoryConsumption(accessoryInventory, [
    mockAccessory.id,
    mockAccessory.id,
  ]);
assert.equal(consumedMockAccessories.status, 'consumed');
assert.deepEqual(consumedMockAccessories.inventory.items, {});
assert.deepEqual(consumedMockAccessories.inventory.discovered, [
  mockAccessory.id,
]);
assert.equal(
  mockCombatBundle.projectAccessoryInventoryConsumption(
    consumedMockAccessories.inventory,
    [mockAccessory.id]
  ).status,
  'insufficient'
);
const mockDrawingSupplyInventory = {
  ...emptyMockInventory,
  items: {
    [submissionDrawingInkId]: 2,
    [submissionBrushId]: 1,
  },
  discovered: [submissionDrawingInkId, submissionBrushId],
};
const consumedMockDrawingSupplies =
  mockCombatBundle.projectSubmissionConsumableInventoryConsumption(
    mockDrawingSupplyInventory,
    [],
    {
      drawingInkId: submissionDrawingInkId,
      brushId: submissionBrushId,
    }
  );
assert.equal(consumedMockDrawingSupplies.status, 'consumed');
assert.deepEqual(consumedMockDrawingSupplies.inventory.items, {
  [submissionDrawingInkId]: 1,
});
assert.equal(
  mockCombatBundle.projectSubmissionConsumableInventoryConsumption(
    consumedMockDrawingSupplies.inventory,
    [],
    { drawingInkId: null, brushId: submissionBrushId }
  ).status,
  'insufficient',
  'a depleted collectible brush must stay unavailable'
);
const titleInventory = {
  ...emptyMockInventory,
  titles: ['brushlord'],
  discovered: ['brushlord'],
};
assert.equal(
  mockCombatBundle.projectEquippedTitle(titleInventory, 'brushlord')
    ?.equippedTitle,
  'brushlord'
);
assert.equal(
  mockCombatBundle.projectEquippedTitle(titleInventory, 'unknown-title'),
  undefined
);
pass('browser mock imports production economy and progression rules');

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
) =>
  createBattleReportWithWinner(
    chronicleScribbit,
    founder,
    day,
    id,
    kind,
    winner
  );
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
  { status: 'invalid' },
  'unknown Chronicle schemas must be distinguished from missing state'
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

const moderationRouteTarget = makeScribbit({
  id: 'moderation-route-target',
  artist: 'moderation_owner',
});
const moderationOwnerUserId = 'moderation-owner-id';
const moderationOwnerMutationKey = `user:${moderationOwnerUserId}:mutation:lock`;
const moderationOwnerDeletionKey = `user:${moderationOwnerUserId}:data-deletion:lock`;
const seedModerationRouteTarget = () => {
  productionApiContract.setApiContractString(
    `scribbit:${moderationRouteTarget.id}`,
    JSON.stringify(moderationRouteTarget)
  );
  productionApiContract.setApiContractString(
    `scribbit:${moderationRouteTarget.id}:owner`,
    moderationOwnerUserId
  );
  productionApiContract.setApiContractHashField(
    `moderation:scribbit:${moderationRouteTarget.id}:reports`,
    'prior-reporter-one',
    '1000'
  );
  productionApiContract.setApiContractHashField(
    `moderation:scribbit:${moderationRouteTarget.id}:reports`,
    'prior-reporter-two',
    '1001'
  );
};

productionApiContract.resetApiContractRuntime();
seedModerationRouteTarget();
productionApiContract.setApiContractString(
  moderationOwnerDeletionKey,
  'owner-deletion'
);
const busyModerationRemoval = await productionApiContract.app.request(
  '/api/report-scribbit',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scribbitId: moderationRouteTarget.id }),
  }
);
assert.equal(busyModerationRemoval.status, 409);
assert.deepEqual(await busyModerationRemoval.json(), {
  status: 'error',
  code: 'conflict',
  message: 'That Scribbit is changing. Your report was saved; try again.',
});
assert.ok(
  productionApiContract.getApiContractString(
    `scribbit:${moderationRouteTarget.id}`
  ),
  'moderation must not remove content while its owner lease is busy'
);
assert.equal(
  productionApiContract.getApiContractString(moderationOwnerDeletionKey),
  'owner-deletion',
  'moderation must not disturb an active owner deletion lease'
);
assert.ok(
  productionApiContract.getApiContractHashField(
    `moderation:scribbit:${moderationRouteTarget.id}:reports`,
    'api-contract-user'
  ),
  'the reporter receipt must survive a deferred threshold removal'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'reporter lease must release when owner removal is deferred'
);

productionApiContract.deleteApiContractKeys(moderationOwnerDeletionKey);
const completedModerationRemoval = await productionApiContract.app.request(
  '/api/report-scribbit',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scribbitId: moderationRouteTarget.id }),
  }
);
assert.equal(completedModerationRemoval.status, 200);
assert.deepEqual(await completedModerationRemoval.json(), {
  hidden: moderationRouteTarget.id,
  removedForEveryone: true,
});
assert.equal(
  productionApiContract.getApiContractString(
    `scribbit:${moderationRouteTarget.id}`
  ),
  undefined
);
assert.equal(
  productionApiContract.getApiContractString(moderationOwnerMutationKey),
  undefined,
  'a busy report retry must complete removal and release the owner lease'
);
assert.equal(
  productionApiContract.getApiContractString(playerMutationLockKey),
  undefined,
  'successful moderation removal must release the reporter lease'
);

productionApiContract.resetApiContractRuntime();
seedModerationRouteTarget();
productionApiContract.swapApiContractStringAfterReads(
  `scribbit:${moderationRouteTarget.id}:owner`,
  'replacement-owner-id',
  // Initial hydration and the self-report guard both read ownership before the
  // route captures the lease owner. Swap after that capture so the fenced
  // removal must observe and reject the changed owner.
  3
);
const changedOwnerRemoval = await productionApiContract.app.request(
  '/api/report-scribbit',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scribbitId: moderationRouteTarget.id }),
  }
);
assert.equal(changedOwnerRemoval.status, 200);
assert.deepEqual(await changedOwnerRemoval.json(), {
  hidden: moderationRouteTarget.id,
  removedForEveryone: false,
});
assert.ok(
  productionApiContract.getApiContractString(
    `scribbit:${moderationRouteTarget.id}`
  ),
  'moderation must stop if ownership changes before fenced removal'
);
assert.equal(
  productionApiContract.getApiContractString(moderationOwnerMutationKey),
  undefined,
  'owner-change revalidation must still release the former owner lease'
);
pass('cross-owner moderation composes the owner mutation lease');

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
await privacyStorage.hSet(
  scribbitCore.getUserBeliefTargetsKey('privacy-user-id'),
  { 'community-target': '20260708' }
);
await privacyStorage.hSet(
  scribbitCore.getScribbitBeliefVotersKey('community-target'),
  {
    'privacy-user-id:20260707': 'older-legacy-receipt',
    'privacy-user-id:20260708': 'legacy-receipt',
  }
);
const privacyV2BeliefTarget = makeScribbit({ id: 'privacy-v2-target' });
await scribbitCore.storeScribbit(
  privacyStorage,
  'other-privacy-owner',
  privacyV2BeliefTarget
);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(privacyStorage, {
      scribbitId: privacyV2BeliefTarget.id,
      userId: 'privacy-user-id',
      utcDateKey: '20260708',
      currentArenaDay: 2,
      operationId: 'privacy-v2-operation',
    })
  ).status,
  'applied'
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
  2,
  '20260712',
  Date.UTC(2026, 6, 12),
  'privacy-delete-operation'
);
assert.equal(privacyDeletion.status, 'deleted');
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
  await privacyStorage.hGet(
    scribbitCore.getScribbitBeliefVotersKey('community-target'),
    'privacy-user-id:20260708'
  ),
  undefined,
  'privacy deletion should remove legacy Belief receipts during migration'
);
assert.equal(
  await privacyStorage.hGet(
    scribbitCore.getScribbitBeliefVotersKey('community-target'),
    'privacy-user-id:20260707'
  ),
  undefined,
  'legacy privacy cleanup should remove earlier receipts hidden by the old index'
);
assert.equal(
  await privacyStorage.get(
    scribbitCore.getDailyBeliefReceiptKey(
      privacyV2BeliefTarget.id,
      'privacy-user-id',
      '20260708'
    )
  ),
  undefined,
  'privacy deletion should remove V2 Belief receipts'
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
  colorburst: { chonk: 15, spike: 15, zip: 15, charm: 55 },
});
const debugFixtureIdentityByPower = Object.freeze({
  inkquake: ['founding-barkbloom', 'Barkbloom'],
  nib_halo: ['founding-solarkiln', 'Solarkiln'],
  colorburst: ['founding-pearlmote', 'Pearlmote'],
});
const debugOpponentPower = Object.freeze({
  inkquake: 'colorburst',
  nib_halo: 'inkquake',
  colorburst: 'nib_halo',
});
const debugSeedByPower = Object.freeze({
  inkquake: 13,
  nib_halo: 3,
  colorburst: 3,
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
    (event) => event.kind === 'role_attack' && event.role === 'longshot'
  ),
  'fixture should exercise the v4 Longshot role attack'
);
assert.equal(
  continuousReplay.getUsableBattleTranscript(protectedRecoilReport),
  protectedRecoilReport.simulation,
  'the authoritative Longshot replay must remain usable'
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
  assert.ok(
    report.winner === 'a' || report.winner === 'b',
    `${power} showcase should preserve an authoritative result`
  );
  assert.equal(
    report.simulation.result.fighters[0].primaryPower,
    power,
    `${power} debug art should resolve to its production Shape Power`
  );
  assert.ok(
    report.simulation.result.completedTick <= 400,
    `${power} showcase should finish inside the 20-second combat cap`
  );
  const powerDamageEvents = report.simulation.timeline.filter(
    (event) =>
      event.kind === 'damage' &&
      event.sourceFighter === 'a' &&
      (event.source === power ||
        (power === 'colorburst' && event.source === 'colorburst_echo'))
  );
  assert.ok(
    power === 'nib_halo'
      ? powerDamageEvents.length > 0
      : powerDamageEvents[0]?.tick < 60,
    power === 'nib_halo'
      ? 'nib_halo showcase should prove an authoritative orbit collision'
      : `${power} showcase should land its first signature hit within three seconds`
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
      event.kind === 'role_attack' &&
      event.actor === 'a' &&
      event.role === 'longshot' &&
      event.attack === 'nib_volley'
  ),
  'Longshot showcase should expose its Nib Volley identity'
);
assert.ok(
  nibHaloTimeline.filter(
    (event) =>
      event.kind === 'role_attack' &&
      event.actor === 'a' &&
      event.attack === 'nib_volley'
  ).length >= 1,
  'Longshot showcase should expose a real rotating-nib collision'
);

const colorburstTimeline =
  debugFixtureReportByPower.colorburst.simulation.timeline;
assert.ok(
  colorburstTimeline.some(
    (event) =>
      event.kind === 'damage' &&
      event.sourceFighter === 'a' &&
      event.source === 'colorburst'
  ) &&
    colorburstTimeline.some(
      (event) =>
        event.kind === 'damage' &&
        event.sourceFighter === 'a' &&
        event.source === 'colorburst_echo'
    ),
  'Colorburst showcase should prove its cone and echo'
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
pass('production-backed debug battles prove all three current signatures');

const mockDrawingTestOutputDirectory = join(testTemporaryRoot, 'mock-drawings');
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

const authoritativeSubmitDataUrl = createAuthoritativeSubmissionDataUrl();
const forgedClientStats = { chonk: 10, spike: 10, zip: 10, charm: 55 };
const validatedMockSubmission =
  mockCombatBundle.validateAndAnalyzeScribbitSubmission({
    name: 'Authority Square',
    baseImageDataUrl: authoritativeSubmitDataUrl,
    imageDataUrl: authoritativeSubmitDataUrl,
    stats: forgedClientStats,
    element: 'storm',
    accessories: [],
  });
assert.equal(validatedMockSubmission.status, 'valid');
assert.equal(
  validatedMockSubmission.draft.element,
  'ember',
  'the browser mock must derive element from base pixels, not the client field'
);
assert.equal(
  combatSelection.selectPrimaryPower(validatedMockSubmission.draft.stats),
  'inkquake',
  'the browser mock must derive Shape Power from base pixels'
);
assert.notDeepEqual(
  validatedMockSubmission.draft.stats,
  forgedClientStats,
  'forged client stats must never become the mock Scribbit build'
);
const emptySubmitPng = new PNG({ width: 512, height: 512 });
emptySubmitPng.data.fill(0);
const emptySubmitDataUrl = `data:image/png;base64,${PNG.sync
  .write(emptySubmitPng)
  .toString('base64')}`;
assert.deepEqual(
  mockCombatBundle.validateAndAnalyzeScribbitSubmission({
    name: 'Empty Page',
    baseImageDataUrl: emptySubmitDataUrl,
    imageDataUrl: emptySubmitDataUrl,
    stats: forgedClientStats,
    element: 'storm',
    accessories: [],
  }),
  { status: 'invalid', reason: 'insufficient-ink' },
  'the browser mock must enforce production minimum-ink validation'
);
rmSync(mockCombatTestOutputDirectory, { recursive: true, force: true });
pass(
  'browser mock bundles production combat and server-derived submission identity'
);

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
  combatSelection.getStatsForFighterStyle(
    expectedPracticeAnalysis.fighterStyle
  ),
  'practice fighter role must come from the server-decoded drawing color'
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

const practiceGuardStorage = createMemoryStorage();
const practiceGuardNow = new Date('2026-07-12T12:34:00.000Z');
await practiceGuardStorage.hSet(
  practiceCore.getLegacyPracticeRequestGuardKey(),
  { 'legacy-practice-player': 'legacy-token' }
);
assert.equal(
  (
    await practiceCore.acquirePracticeRequest(practiceGuardStorage, {
      playerId: 'legacy-practice-player',
      token: 'new-token',
      requestedAtMs: practiceGuardNow.getTime(),
    })
  ).status,
  'busy',
  'V2 Practice leases must respect a still-active V1 guard during rollout'
);
const firstPracticeClaim = await practiceCore.acquirePracticeRequest(
  practiceGuardStorage,
  {
    playerId: 'practice-player',
    token: 'first-token',
    requestedAtMs: practiceGuardNow.getTime(),
  }
);
assert.equal(firstPracticeClaim.status, 'acquired');
assert.equal(
  practiceGuardStorage.getExpirationSeconds(
    practiceCore.getPracticeRequestRateKey(
      'practice-player',
      Math.floor(practiceGuardNow.getTime() / 60_000)
    )
  ),
  120
);
assert.equal(
  practiceGuardStorage.getExpirationSeconds(
    practiceCore.getPracticeRequestGuardKey('practice-player')
  ),
  30
);
assert.equal(
  await practiceGuardStorage.hGet(
    practiceCore.getLegacyPracticeRequestGuardKey(),
    'practice-player'
  ),
  'first-token',
  'V2 Practice acquisition must block older workers through the V1 guard'
);
assert.equal(
  (
    await practiceCore.acquirePracticeRequest(practiceGuardStorage, {
      playerId: 'practice-player',
      token: 'second-token',
      requestedAtMs: practiceGuardNow.getTime(),
    })
  ).status,
  'busy',
  'a second active Practice request should not replace the owner token'
);
assert.equal(
  await practiceCore.releasePracticeRequest(practiceGuardStorage, {
    playerId: 'practice-player',
    token: 'second-token',
    legacyGuardWritten: true,
  }),
  'not-owner'
);
assert.equal(
  await practiceGuardStorage.get(
    practiceCore.getPracticeRequestGuardKey('practice-player')
  ),
  'first-token',
  'a mismatched release token must not clear the active Practice request'
);
assert.equal(firstPracticeClaim.status, 'acquired');
assert.equal(
  await practiceCore.releasePracticeRequest(
    practiceGuardStorage,
    firstPracticeClaim.lease
  ),
  'released'
);
for (let attempt = 0; attempt < 6; attempt += 1) {
  const token = `rate-token-${attempt}`;
  const claim = await practiceCore.acquirePracticeRequest(
    practiceGuardStorage,
    {
      playerId: 'rate-player',
      token,
      requestedAtMs: practiceGuardNow.getTime(),
    }
  );
  assert.equal(claim.status, 'acquired');
  assert.equal(
    await practiceCore.releasePracticeRequest(
      practiceGuardStorage,
      claim.lease
    ),
    'released'
  );
}
assert.equal(
  (
    await practiceCore.acquirePracticeRequest(practiceGuardStorage, {
      playerId: 'rate-player',
      token: 'rate-token-7',
      requestedAtMs: practiceGuardNow.getTime(),
    })
  ).status,
  'rate-limited',
  'the seventh Practice request in one minute should be rate-limited'
);
const replyLossPracticeStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
const recoveredPracticeClaim = await practiceCore.acquirePracticeRequest(
  replyLossPracticeStorage,
  {
    playerId: 'reply-loss-player',
    token: 'reply-loss-token',
    requestedAtMs: practiceGuardNow.getTime(),
  }
);
assert.equal(
  recoveredPracticeClaim.status,
  'acquired',
  'Practice acquisition should recover a committed lease after reply loss'
);
const replyLossReleaseStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
await replyLossReleaseStorage.set(
  practiceCore.getPracticeRequestGuardKey('release-reply-player'),
  'release-reply-token'
);
await replyLossReleaseStorage.hSet(
  practiceCore.getLegacyPracticeRequestGuardKey(),
  { 'release-reply-player': 'release-reply-token' }
);
assert.equal(
  await practiceCore.releasePracticeRequest(replyLossReleaseStorage, {
    playerId: 'release-reply-player',
    token: 'release-reply-token',
    legacyGuardWritten: true,
  }),
  'released',
  'Practice release should recover after its delete commits but the reply is lost'
);
const staleReleaseStorage = createMemoryStorage();
const staleGuardKey = practiceCore.getPracticeRequestGuardKey('stale-player');
await staleReleaseStorage.set(staleGuardKey, 'stale-token');
await staleReleaseStorage.hSet(
  practiceCore.getLegacyPracticeRequestGuardKey(),
  { 'stale-player': 'stale-token' }
);
const originalStaleReleaseWatch =
  staleReleaseStorage.watch.bind(staleReleaseStorage);
let replacedPracticeLease = false;
staleReleaseStorage.watch = async (...keys) => {
  const transaction = await originalStaleReleaseWatch(...keys);
  if (!replacedPracticeLease) {
    replacedPracticeLease = true;
    transaction.exec = async () => {
      await staleReleaseStorage.set(staleGuardKey, 'replacement-token');
      return [];
    };
  }
  return transaction;
};
assert.equal(
  await practiceCore.releasePracticeRequest(staleReleaseStorage, {
    playerId: 'stale-player',
    token: 'stale-token',
    legacyGuardWritten: true,
  }),
  'not-owner',
  'a stale release must not delete a replacement Practice lease'
);
assert.equal(await staleReleaseStorage.get(staleGuardKey), 'replacement-token');
const concurrentPracticeStorage = createMemoryStorage();
const concurrentPracticeClaims = await Promise.all([
  practiceCore.acquirePracticeRequest(concurrentPracticeStorage, {
    playerId: 'concurrent-practice-player',
    token: 'concurrent-practice-a',
    requestedAtMs: practiceGuardNow.getTime(),
  }),
  practiceCore.acquirePracticeRequest(concurrentPracticeStorage, {
    playerId: 'concurrent-practice-player',
    token: 'concurrent-practice-b',
    requestedAtMs: practiceGuardNow.getTime(),
  }),
]);
assert.deepEqual(
  concurrentPracticeClaims.map(({ status }) => status).sort(),
  ['acquired', 'busy'],
  'exactly one concurrent Practice request should acquire the player lease'
);
assert.ok(
  concurrentPracticeStorage.getWatchConflictCount() > 0,
  'the Practice concurrency proof must exercise an actual WATCH conflict'
);
pass('Practice leases are transactional, rate-limited, and token-safe');

const practiceMigrationStorage = createMemoryStorage();
const practiceMigrationStartedAtMs = Date.UTC(2026, 6, 12, 12);
const overlapPracticeClaim = await practiceCore.acquirePracticeRequest(
  practiceMigrationStorage,
  {
    playerId: 'migration-overlap-player',
    token: 'migration-overlap-token',
    requestedAtMs: practiceMigrationStartedAtMs,
  }
);
assert.equal(overlapPracticeClaim.status, 'acquired');
assert.equal(overlapPracticeClaim.lease.legacyGuardWritten, true);
await practiceCore.releasePracticeRequest(
  practiceMigrationStorage,
  overlapPracticeClaim.lease
);
await practiceMigrationStorage.hSet(
  practiceCore.getLegacyPracticeRequestGuardKey(),
  { 'migration-drain-player': 'legacy-drain-token' }
);
assert.equal(
  (
    await practiceCore.acquirePracticeRequest(practiceMigrationStorage, {
      playerId: 'migration-drain-player',
      token: 'migration-drain-v2-token',
      requestedAtMs:
        practiceMigrationStartedAtMs +
        migrationCore.ROLLOUT_OVERLAP_MILLISECONDS +
        1,
    })
  ).status,
  'busy',
  'Practice must continue reading V1 through its source TTL drain window'
);
const postDrainPracticeClaim = await practiceCore.acquirePracticeRequest(
  practiceMigrationStorage,
  {
    playerId: 'migration-post-drain-player',
    token: 'migration-post-drain-token',
    requestedAtMs:
      practiceMigrationStartedAtMs +
      migrationCore.ROLLOUT_OVERLAP_MILLISECONDS +
      30_001,
  }
);
assert.equal(postDrainPracticeClaim.status, 'acquired');
assert.equal(
  postDrainPracticeClaim.lease.legacyGuardWritten,
  false,
  'Practice must stop V1 writes after the finite overlap'
);
assert.equal(
  await practiceMigrationStorage.hGet(
    practiceCore.getLegacyPracticeRequestGuardKey(),
    'migration-post-drain-player'
  ),
  undefined
);
pass('Practice V1 compatibility has a finite write and read window');

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
const checkpointTicks = new Set(
  reportOne.simulation.checkpoints.map((checkpoint) => checkpoint.tick)
);
for (const [eventKind, expectedPhase] of [
  ['ability_telegraphed', 'telegraph'],
  ['ability_activated', 'active'],
  ['ability_finished', 'cooldown'],
]) {
  const phaseEvent = reportOne.simulation.timeline.find(
    (event) => event.kind === eventKind && !checkpointTicks.has(event.tick)
  );
  assert.ok(
    phaseEvent,
    `${eventKind} fixture should occur between authoritative checkpoints`
  );
  const phaseFrame = continuousReplay.calculateReplayFrame(
    reportOne.simulation,
    phaseEvent.tick
  );
  assert.equal(
    phaseFrame.fighters[phaseEvent.actor === 'a' ? 0 : 1].abilityPhase,
    expectedPhase,
    `${eventKind} should change the rendered phase on its exact event tick`
  );
}
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
      '8443e635cee4f5ef1aeb10315e25b2fe506144eb66c00b7a7ccf8ef230885449',
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
      '4aad4ce84c4cf3c54d617acae8418dfd01c7860bdd792da2673a2cd35f7f5adf',
  },
  {
    name: 'legacy Zip to Longshot schedule',
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
      'e7a3af6f850de72479fd562e46281553b5bb00a7a291d4b52d72249777a12d30',
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
assert.deepEqual(
  shapePowerContent.SHAPE_POWER_IDS.map((power) =>
    shapePowerContent.getShapePowerBattleName(power)
  ),
  ['Shockwave', 'Quill orbit', 'Double dash', 'Color burst'],
  'fast battle surfaces should use four plain effect names'
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
const preInkModBattleReport = structuredClone(lastFeaturedBout);
preInkModBattleReport.id = 'pre-ink-mod-battle-report';
delete preInkModBattleReport.a.upgrades;
delete preInkModBattleReport.b.upgrades;
await featuredRumbleStorage.set(
  battleStore.getBattleReportKey(preInkModBattleReport.id),
  JSON.stringify(preInkModBattleReport)
);
const loadedPreInkModBattleReport = await battleStore.loadBattleReport(
  featuredRumbleStorage,
  preInkModBattleReport.id
);
assert.deepEqual(loadedPreInkModBattleReport?.a.upgrades, []);
assert.deepEqual(loadedPreInkModBattleReport?.b.upgrades, []);
await assert.doesNotReject(
  battleStore.saveBattleReport(featuredRumbleStorage, preInkModBattleReport, 1),
  'v5 transcript validation should not depend on retired top-level upgrades'
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
const runOutcome = reportOne.winner === 'a' ? 'win' : 'loss';
const runReport = {
  ...reportOne,
  rivalRun: {
    id: 'stored-run-1',
    dayNumber: reportOne.day,
    challengerId: reportOne.a.id,
    boutsCompleted: 1,
    wins: runOutcome === 'win' ? 1 : 0,
    losses: runOutcome === 'loss' ? 1 : 0,
    score: runOutcome === 'win' ? 2 : 0,
    opponentIds: [reportOne.b.id],
    status: 'active',
    boutNumber: 1,
    outcome: runOutcome,
    tier: 'even',
    winPoints: 2,
    pointsAwarded: runOutcome === 'win' ? 2 : 0,
  },
};
await invalidBattleReportStorage.set(
  battleStore.getBattleReportKey(runReport.id),
  JSON.stringify(runReport)
);
assert.deepEqual(
  (await battleStore.loadBattleReport(invalidBattleReportStorage, runReport.id))
    ?.rivalRun,
  {
    ...runReport.rivalRun,
    challenge: rivalRunChallenges.createLegacyRivalRunChallenge(1, 'active'),
  },
  'legacy exhibition replays should gain one truthful compatibility challenge without losing their receipt'
);
const impossibleRunReport = structuredClone(runReport);
impossibleRunReport.rivalRun.pointsAwarded = 3;
await invalidBattleReportStorage.set(
  battleStore.getBattleReportKey('impossible-run-report'),
  JSON.stringify({ ...impossibleRunReport, id: 'impossible-run-report' })
);
assert.equal(
  await battleStore.loadBattleReport(
    invalidBattleReportStorage,
    'impossible-run-report'
  ),
  undefined,
  'stored Rival Run points must match its server tier and battle winner'
);
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
  combatTranscriptValidation.parseBattleTranscript(lastFeaturedBout.simulation),
  lastFeaturedBout.simulation,
  'the shared parser should preserve a valid current transcript'
);
const legacyVersionOneTranscript = structuredClone(lastFeaturedBout.simulation);
legacyVersionOneTranscript.version = 1;
for (const fighter of legacyVersionOneTranscript.fighters) {
  fighter.element =
    fighter.id === lastFeaturedBout.a.id
      ? lastFeaturedBout.a.element
      : lastFeaturedBout.b.element;
  delete fighter.powerUpIds;
  delete fighter.upgrades;
  delete fighter.damageModifierPermille;
}
assert.equal(
  combatTranscriptValidation.parseBattleTranscript(legacyVersionOneTranscript),
  legacyVersionOneTranscript,
  'version-one transcripts should remain readable without Ink Mod fields'
);
const versionOneWithUpgrades = structuredClone(legacyVersionOneTranscript);
versionOneWithUpgrades.fighters[0].upgrades = [];
assert.equal(
  combatTranscriptValidation.parseBattleTranscript(versionOneWithUpgrades),
  undefined,
  'version-one transcripts must not smuggle in version-two upgrade fields'
);
const versionTwoWithoutUpgrades = structuredClone(legacyVersionOneTranscript);
versionTwoWithoutUpgrades.version = 2;
for (const fighter of versionTwoWithoutUpgrades.fighters) {
  fighter.upgrades = [];
}
delete versionTwoWithoutUpgrades.fighters[0].upgrades;
assert.equal(
  combatTranscriptValidation.parseBattleTranscript(versionTwoWithoutUpgrades),
  undefined,
  'version-two transcripts must carry an explicit upgrades list'
);

const damageEventIndex = lastFeaturedBout.simulation.timeline.findIndex(
  (event) => event.kind === 'damage'
);
assert.ok(damageEventIndex >= 0, 'validation fixture should contain damage');
const transcriptCorruptionCases = [
  {
    name: 'blank-seed',
    corrupt: (transcript) => {
      transcript.seed = '   ';
    },
  },
  {
    name: 'blank-fighter-name',
    corrupt: (transcript) => {
      transcript.fighters[0].name = '';
    },
  },
  {
    name: 'null-timeline-event',
    corrupt: (transcript) => {
      transcript.timeline[0] = null;
    },
  },
  {
    name: 'zero-damage',
    corrupt: (transcript) => {
      transcript.timeline[damageEventIndex].amount = 0;
    },
  },
  {
    name: 'contradictory-final-checkpoint',
    corrupt: (transcript) => {
      const finalFighter = transcript.checkpoints.at(-1).fighters[0];
      finalFighter.hitPoints =
        finalFighter.hitPoints === 0 ? 1 : finalFighter.hitPoints - 1;
    },
  },
];
for (const { name, corrupt } of transcriptCorruptionCases) {
  const malformedReport = structuredClone(lastFeaturedBout);
  malformedReport.id = `malformed-transcript-${name}`;
  corrupt(malformedReport.simulation);
  assert.equal(
    combatTranscriptValidation.parseBattleTranscript(
      malformedReport.simulation
    ),
    undefined,
    `${name} must fail the shared browser-safe parser`
  );
  await invalidBattleReportStorage.set(
    battleStore.getBattleReportKey(malformedReport.id),
    JSON.stringify(malformedReport)
  );
  assert.equal(
    await battleStore.loadBattleReport(
      invalidBattleReportStorage,
      malformedReport.id
    ),
    undefined,
    `${name} must fail the server storage boundary too`
  );
}

const invalidIncomingStorage = createMemoryStorage();
const eventOnlyIncomingReport = {
  ...legacyTurnReport,
  id: 'new-event-only-report',
};
await assert.rejects(
  battleStore.saveBattleReport(
    invalidIncomingStorage,
    eventOnlyIncomingReport,
    1
  ),
  /authoritative transcript validation/,
  'legacy event-only reports may be read but must never enter the modern write path'
);
assert.equal(
  await invalidIncomingStorage.get(
    battleStore.getBattleReportKey(eventOnlyIncomingReport.id)
  ),
  undefined
);
const invalidIncomingReport = structuredClone(lastFeaturedBout);
invalidIncomingReport.id = 'invalid-incoming-transcript';
invalidIncomingReport.simulation.seed = '';
await assert.rejects(
  battleStore.saveBattleReport(
    invalidIncomingStorage,
    invalidIncomingReport,
    1
  ),
  /authoritative transcript validation/,
  'runtime-invalid reports must fail before the first storage write'
);
assert.equal(
  await invalidIncomingStorage.get(
    battleStore.getBattleReportKey(invalidIncomingReport.id)
  ),
  undefined
);

const preservedInvalidStorage = createMemoryStorage();
const preservedInvalidReport = structuredClone(lastFeaturedBout);
preservedInvalidReport.id = 'preserved-invalid-transcript';
preservedInvalidReport.simulation.seed = '';
const preservedInvalidJson = JSON.stringify(preservedInvalidReport);
await preservedInvalidStorage.set(
  battleStore.getBattleReportKey(preservedInvalidReport.id),
  preservedInvalidJson
);
await assert.rejects(
  battleStore.saveBattleReport(
    preservedInvalidStorage,
    { ...lastFeaturedBout, id: preservedInvalidReport.id },
    1
  ),
  /invalid and was preserved/,
  'a malformed historical value must not be silently replaced'
);
assert.equal(
  await preservedInvalidStorage.get(
    battleStore.getBattleReportKey(preservedInvalidReport.id)
  ),
  preservedInvalidJson,
  'rejected historical bytes should remain untouched for diagnosis or repair'
);

const transcriptValidationSource = readFileSync(
  join(repoRoot, 'src', 'shared', 'combat', 'transcriptvalidation.ts'),
  'utf8'
);
const battleStoreSource = readFileSync(
  join(repoRoot, 'src', 'server', 'core', 'battleStore.ts'),
  'utf8'
);
const continuousReplaySource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'continuousreplay.ts'),
  'utf8'
);
assert.match(transcriptValidationSource, /TIMELINE_EVENT_FIELD_VALIDATORS/);
for (const consumerSource of [battleStoreSource, continuousReplaySource]) {
  assert.match(consumerSource, /parseBattleTranscript/);
  assert.doesNotMatch(
    consumerSource,
    /TIMELINE_EVENT_FIELD_VALIDATORS|const isTimelineEvent|const checkpointsAreUsable/
  );
}
pass('battle transcript validation has one shared server and client authority');

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
  { kind: 'picked', label: 'Your Pick', enabled: false }
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
  { kind: 'locked', label: 'Pick Locked', enabled: false }
);
const availablePickAction = arenaBracket.planArenaBackAction({
  entrantId: 'community-a',
  ownedScribbitIds: [],
  backedScribbitId: null,
});
assert.deepEqual(availablePickAction, {
  kind: 'available',
  label: 'Pick',
  enabled: true,
});
assert.ok(Object.isFrozen(availablePickAction));
pass('Arena entrant ordering and Pick actions stay deterministic');

const adversarialRawStats = {
  chonk: 999,
  spike: 1,
  zip: -20,
  charm: Number.POSITIVE_INFINITY,
};
const normalizedStats = analyzerCore.normalizeStats(adversarialRawStats);
assert.equal(sumStats(normalizedStats), arena.STAT_BUDGET, 'stats sum to 100');
for (const value of Object.values(normalizedStats)) {
  assert.ok(value >= arena.STAT_MIN, 'stat should respect minimum');
  assert.ok(value <= arena.STAT_MAX, 'stat should respect maximum');
}
assert.deepEqual(
  scribbitCore.validateSubmitScribbitRequest({
    name: 'Parity Proof',
    baseImageDataUrl: 'data:image/png;base64,placeholder',
    imageDataUrl: 'data:image/png;base64,placeholder',
    stats: adversarialRawStats,
    element: 'ember',
    accessories: [],
  })?.stats,
  normalizedStats,
  'request compatibility parsing must use the shared analyzer normalizer'
);
assert.deepEqual(
  scribbitCore.createScribbit({
    id: 'normalization-parity',
    draft: {
      name: 'Parity Proof',
      stats: adversarialRawStats,
      element: 'ember',
      accessories: [],
    },
    artist: 'tester',
    imageUrl: 'https://example.invalid/parity.png',
    day: 1,
  }).stats,
  normalizedStats,
  'stored creation must use the shared analyzer normalizer'
);
assert.deepEqual(
  analyzerCore.normalizeStats(null),
  { chonk: 25, spike: 25, zip: 25, charm: 25 },
  'missing stat records should repair to an even legal budget'
);
const storedNormalizationCandidate = scribbitCore.createScribbit({
  id: 'stored-normalization-parity',
  draft: {
    name: 'Stored Parity',
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    element: 'ember',
    accessories: [],
  },
  artist: 'tester',
  imageUrl: 'https://example.invalid/stored-parity.png',
  day: 1,
});
const historicalStoredStats = { chonk: 25, spike: 25, zip: 25, charm: 24 };
assert.deepEqual(
  scribbitCore.parseScribbit(
    JSON.stringify({
      ...storedNormalizationCandidate,
      stats: historicalStoredStats,
    })
  )?.stats,
  historicalStoredStats,
  'stored stats must remain immutable even when they predate current balance rules'
);
assert.deepEqual(
  analyzerCore.normalizeStats({ chonk: 1, spike: 1, zip: 1 }),
  { chonk: 30, spike: 30, zip: 30, charm: 10 },
  'missing values must contribute zero before bounded redistribution'
);
assert.deepEqual(
  analyzerCore.normalizeStats({
    chonk: 2,
    spike: 1,
    zip: 1,
    charm: Number.NaN,
  }),
  { chonk: 44, spike: 23, zip: 23, charm: 10 },
  'non-finite values must contribute zero before bounded redistribution'
);
assert.deepEqual(
  analyzerCore.normalizeStats({ chonk: 1, spike: 1, zip: 1, charm: 3 }),
  { chonk: 17, spike: 17, zip: 16, charm: 50 },
  'equal fractional remainders must keep canonical stat order'
);
for (let caseIndex = 0; caseIndex < 512; caseIndex += 1) {
  const candidate = {
    chonk: (caseIndex * 97) % 1_003,
    spike: caseIndex % 11 === 0 ? Number.NaN : (caseIndex * 53) % 401,
    zip: caseIndex % 13 === 0 ? -caseIndex : (caseIndex * 29) % 257,
    charm:
      caseIndex % 17 === 0 ? Number.POSITIVE_INFINITY : (caseIndex * 11) % 149,
  };
  const result = analyzerCore.normalizeStats(candidate);
  assert.equal(
    sumStats(result),
    arena.STAT_BUDGET,
    `case ${caseIndex} must preserve the stat budget`
  );
  for (const value of Object.values(result)) {
    assert.ok(Number.isInteger(value), `case ${caseIndex} must stay integral`);
    assert.ok(
      value >= arena.STAT_MIN && value <= arena.STAT_MAX,
      `case ${caseIndex} must stay inside stat bounds`
    );
  }
  assert.deepEqual(
    analyzerCore.normalizeStats(result),
    result,
    `case ${caseIndex} must be stable after canonical storage`
  );
}
pass('shared stat normalization is the one server authority');

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
assert.deepEqual(
  migratedOldRecord.upgrades,
  [],
  'old level-one records should start without Ink Mods'
);
pass('old-record migration defaults');

const maximumLevelUpgrades = combatUpgrades.createScribbitUpgradesForLevel(
  'upgrade-proof',
  arena.MAX_LEVEL
);
assert.deepEqual(
  maximumLevelUpgrades,
  combatUpgrades.createScribbitUpgradesForLevel(
    'upgrade-proof',
    arena.MAX_LEVEL
  ),
  'Ink Mod rolls must be deterministic for retries and stored-record hydration'
);
assert.equal(
  maximumLevelUpgrades.length,
  combatUpgrades.MAXIMUM_COMBAT_UPGRADES,
  'levels two through five should each unlock one Ink Mod'
);
assert.equal(
  new Set(maximumLevelUpgrades.map((upgrade) => upgrade.id)).size,
  maximumLevelUpgrades.length,
  'v1 Ink Mods should not repeat on one Scribbit'
);
assert.deepEqual(
  maximumLevelUpgrades.map((upgrade) => upgrade.acquiredAtLevel),
  [...sharedProgression.INK_MOD_ACQUISITION_LEVELS],
  'Ink Mods should preserve their acquisition level'
);
assert.equal(
  combatUpgrades.MAXIMUM_COMBAT_UPGRADES,
  sharedProgression.INK_MOD_ACQUISITION_LEVELS.length,
  'Ink Mod capacity must derive from the progression contract'
);

const absentLevelThreeUpgrades = combatUpgrades.resolveStoredScribbitUpgrades(
  'absent-level-three-upgrades',
  3,
  undefined
);
assert.equal(absentLevelThreeUpgrades.status, 'migrated');
assert.deepEqual(
  absentLevelThreeUpgrades.upgrades.map((upgrade) => upgrade.acquiredAtLevel),
  [2, 3],
  'only genuinely absent pre-feature data may receive deterministic migration'
);
assert.equal(
  combatUpgrades.resolveStoredScribbitUpgrades(
    'malformed-level-three-upgrades',
    3,
    []
  ).status,
  'invalid',
  'a present but incomplete Ink Mod array must not masquerade as old data'
);

const authoredLevelThreeUpgrades = [
  { id: 'v1-lucky-splash', acquiredAtLevel: 2 },
  { id: 'v1-bold-tip', acquiredAtLevel: 3 },
];
const validLevelThreeRecord = {
  ...oldStoredScribbit,
  id: 'valid-level-three-upgrades',
  xp: 7,
  upgrades: authoredLevelThreeUpgrades,
};
assert.deepEqual(
  scribbitCore.normalizeScribbitRecord(validLevelThreeRecord)?.upgrades,
  combatUpgrades.createScribbitUpgradesForLevel(validLevelThreeRecord.id, 3),
  'v2 migration must replace retired authored Ink Mods deterministically'
);

const malformedUpgradeValues = [
  [],
  [{ id: 'unknown-mod', acquiredAtLevel: 2 }],
  [
    { id: 'v1-lucky-splash', acquiredAtLevel: 2 },
    { id: 'v1-lucky-splash', acquiredAtLevel: 3 },
  ],
  [
    { id: 'v1-lucky-splash', acquiredAtLevel: 2 },
    { id: 'v1-bold-tip', acquiredAtLevel: 2 },
  ],
  [
    { id: 'v1-lucky-splash', acquiredAtLevel: 2 },
    { id: 'v1-bold-tip', acquiredAtLevel: 5 },
  ],
];
for (const [caseIndex, upgrades] of malformedUpgradeValues.entries()) {
  const scribbitId = `malformed-upgrades-${caseIndex}`;
  assert.deepEqual(
    scribbitCore.normalizeScribbitRecord({
      ...validLevelThreeRecord,
      id: scribbitId,
      upgrades,
    })?.upgrades,
    combatUpgrades.createScribbitUpgradesForLevel(scribbitId, 3),
    `retired Ink Mod case ${caseIndex} must migrate deterministically`
  );
}

const preservedMalformedUpgradeStorage = createMemoryStorage();
const preservedMalformedUpgradeRecord = {
  ...validLevelThreeRecord,
  id: 'preserved-malformed-upgrades',
  upgrades: [],
};
const preservedMalformedUpgradeJson = JSON.stringify(
  preservedMalformedUpgradeRecord
);
await preservedMalformedUpgradeStorage.set(
  scribbitCore.getScribbitKey(preservedMalformedUpgradeRecord.id),
  preservedMalformedUpgradeJson
);
assert.equal(
  await scribbitCore.loadScribbit(
    preservedMalformedUpgradeStorage,
    preservedMalformedUpgradeRecord.id,
    '20260705'
  ),
  undefined,
  'malformed stored Ink Mods must make the authority row unavailable'
);
assert.equal(
  await preservedMalformedUpgradeStorage.get(
    scribbitCore.getScribbitKey(preservedMalformedUpgradeRecord.id)
  ),
  preservedMalformedUpgradeJson,
  'failed reads must preserve malformed bytes exactly'
);
await assert.rejects(
  scribbitCore.storeScribbit(
    preservedMalformedUpgradeStorage,
    'malformed-upgrade-owner',
    {
      ...validLevelThreeRecord,
      id: preservedMalformedUpgradeRecord.id,
    }
  ),
  /invalid and was preserved/,
  'a valid retry must not silently replace malformed historical authority'
);
assert.equal(
  await preservedMalformedUpgradeStorage.get(
    scribbitCore.getScribbitKey(preservedMalformedUpgradeRecord.id)
  ),
  preservedMalformedUpgradeJson
);

const rejectedMalformedUpgradeStorage = createMemoryStorage();
await assert.rejects(
  scribbitCore.storeScribbit(
    rejectedMalformedUpgradeStorage,
    'malformed-upgrade-owner',
    preservedMalformedUpgradeRecord
  ),
  /authoritative runtime validation/,
  'malformed runtime Ink Mods must fail before the first storage write'
);
assert.equal(
  await rejectedMalformedUpgradeStorage.get(
    scribbitCore.getScribbitKey(preservedMalformedUpgradeRecord.id)
  ),
  undefined
);
const missingRuntimeUpgrades = {
  ...validLevelThreeRecord,
  id: 'missing-runtime-upgrades',
};
delete missingRuntimeUpgrades.upgrades;
await assert.rejects(
  scribbitCore.storeScribbit(
    rejectedMalformedUpgradeStorage,
    'malformed-upgrade-owner',
    missingRuntimeUpgrades
  ),
  /authoritative runtime validation/,
  'runtime writes must not invoke the pre-feature read migration'
);
assert.equal(
  await rejectedMalformedUpgradeStorage.get(
    scribbitCore.getScribbitKey(missingRuntimeUpgrades.id)
  ),
  undefined
);

const concurrentMalformedUpgradeStorage = createMemoryStorage();
const concurrentUpgradeRecord = {
  ...validLevelThreeRecord,
  id: 'concurrent-malformed-upgrades',
};
await scribbitCore.storeScribbit(
  concurrentMalformedUpgradeStorage,
  'concurrent-upgrade-owner',
  concurrentUpgradeRecord
);
const concurrentUpgradeKey = scribbitCore.getScribbitKey(
  concurrentUpgradeRecord.id
);
const concurrentMalformedJson = JSON.stringify({
  ...concurrentUpgradeRecord,
  upgrades: [],
});
const baseConcurrentWatch = concurrentMalformedUpgradeStorage.watch.bind(
  concurrentMalformedUpgradeStorage
);
let injectedConcurrentMalformedUpgrade = false;
concurrentMalformedUpgradeStorage.watch = async (...keys) => {
  const transaction = await baseConcurrentWatch(...keys);
  const baseExec = transaction.exec.bind(transaction);
  transaction.exec = async () => {
    if (!injectedConcurrentMalformedUpgrade) {
      injectedConcurrentMalformedUpgrade = true;
      await concurrentMalformedUpgradeStorage.set(
        concurrentUpgradeKey,
        concurrentMalformedJson
      );
    }
    return await baseExec();
  };
  return transaction;
};
await assert.rejects(
  scribbitCore.updateScribbit(concurrentMalformedUpgradeStorage, {
    ...concurrentUpgradeRecord,
    belief: 3,
  }),
  /invalid and was preserved/,
  'a concurrent malformed write must win the watch conflict and remain preserved'
);
assert.equal(
  concurrentMalformedUpgradeStorage.getWatchConflictCount(),
  1,
  'the valid replacement must retry after the concurrent write'
);
assert.equal(
  await concurrentMalformedUpgradeStorage.get(concurrentUpgradeKey),
  concurrentMalformedJson,
  'the retry must not overwrite malformed bytes observed after the conflict'
);

const advancedAuthoredUpgrades = combatUpgrades.advanceScribbitUpgrades(
  'authored-upgrade-progression',
  2,
  3,
  [{ id: 'v1-lucky-splash', acquiredAtLevel: 2 }]
);
assert.equal(advancedAuthoredUpgrades[0]?.id, 'v1-lucky-splash');
assert.deepEqual(
  advancedAuthoredUpgrades.map((upgrade) => upgrade.acquiredAtLevel),
  [2, 3],
  'level-up must preserve valid picks and add only the newly earned level'
);
pass('Ink Mod storage distinguishes absent migration from malformed authority');

const upgradedTranscript = combatEngine.simulateCombat({
  seed: 'power-up-freeze-proof',
  fighters: [
    {
      id: 'upgrade-a',
      name: 'Upgrade A',
      element: 'moss',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      powerUpIds: ['v1-paper-shield'],
    },
    {
      id: 'upgrade-b',
      name: 'Upgrade B',
      element: 'moss',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    },
  ],
});
assert.equal(
  upgradedTranscript.version,
  8,
  'current combat transcripts should use the v8 projectile schema'
);
assert.deepEqual(
  upgradedTranscript.fighters[0].powerUpIds,
  ['v1-paper-shield'],
  'current transcripts should freeze the server-owned Power-Up build'
);

const chooseUpgradeLoadouts = (values, count, startIndex = 0, prefix = []) => {
  if (count === 0) return [prefix];
  return values
    .slice(startIndex)
    .flatMap((value, offset) =>
      chooseUpgradeLoadouts(values, count - 1, startIndex + offset + 1, [
        ...prefix,
        value,
      ])
    );
};
for (const loadout of chooseUpgradeLoadouts(
  combatUpgrades.COMBAT_UPGRADE_IDS,
  combatUpgrades.MAXIMUM_COMBAT_UPGRADES
)) {
  const modifiers = combatUpgrades.getCombatUpgradeModifiers(loadout);
  assert.ok(
    modifiers.damagePermille >= 970 && modifiers.damagePermille <= 1030
  );
  assert.ok(
    modifiers.maximumHitPointsPermille >= 970 &&
      modifiers.maximumHitPointsPermille <= 1030
  );
  assert.ok(
    modifiers.cooldownPermille >= 970 && modifiers.cooldownPermille <= 1030
  );
  const upgradedFighter = {
    id: 'upgrade-balance-full',
    name: 'Upgrade Balance Full',
    element: 'tide',
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
    upgrades: loadout,
  };
  const baseFighter = {
    id: 'upgrade-balance-base',
    name: 'Upgrade Balance Base',
    element: 'tide',
    stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
  };
  const firstResult = combatEngine.simulateCombat({
    seed: 'upgrade-balance-a',
    fighters: [upgradedFighter, baseFighter],
  }).result;
  const secondResult = combatEngine.simulateCombat({
    seed: 'upgrade-balance-b',
    fighters: [upgradedFighter, baseFighter],
  }).result;
  assert.deepEqual(
    secondResult,
    firstResult,
    `${loadout.join(',')} mechanics must not change with cosmetic seed`
  );
}
pass('deterministic, visible, and bounded per-Scribbit Ink Mods');

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
  sharedBattle.getLevelDamageMultiplier(1),
  1,
  'level 1 should not add damage'
);
assert.equal(
  sharedBattle.getLevelDamageMultiplier(arena.MAX_LEVEL),
  1 + (arena.MAX_LEVEL - 1) * arena.LEVEL_DAMAGE_BONUS_PER_LEVEL,
  'max level should add the configured damage bonus'
);
assert.equal(
  sharedBattle.getLevelDamageMultiplier(99),
  1 + (arena.MAX_LEVEL - 1) * arena.LEVEL_DAMAGE_BONUS_PER_LEVEL,
  'damage bonus should cap at max level'
);
assert.equal(
  sharedBattle.getLevelDamageMultiplier(99),
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

const timeoutRecapReport = mockCombatBundle.simulate(
  { ...debugFixtureFighterByPower.colorburst, element: 'ember' },
  debugFixtureFighterByPower.inkquake,
  1,
  debugFixtureForecast,
  'exhibition'
);
const timeoutRecapPlan = battleRecap.planBattleRecap(
  timeoutRecapReport.simulation
);
assert.equal(timeoutRecapPlan.partial, false);
assert.equal(
  timeoutRecapPlan.winnerSlot,
  timeoutRecapReport.simulation.result.winner
);
assert.ok(
  timeoutRecapPlan.highlight,
  'v4 recap should name a decisive role hit'
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
  `${timeoutRecapPlan.winnerName.toUpperCase()} WON`,
  'compact results should lead with an immediate viewer-relative verdict'
);
assert.equal(
  battleRecap.formatCompactBattleRecapLesson(timeoutRecapPlan),
  `${timeoutRecapPlan.highlight.label} · ${timeoutRecapPlan.highlight.compactText}`,
  'compact results should teach which drawing-derived move caused the biggest hit'
);
assert.equal(
  battleRecap.formatBattleRecapAnnouncement(timeoutRecapPlan, 'viewer_win'),
  `YOU WON. ${timeoutRecapPlan.verdictLine}. ${timeoutRecapPlan.highlight.label} · ${timeoutRecapPlan.highlight.compactText}.`,
  'assistive technology should receive the result and the drawing-derived lesson'
);
const compactRecapLayout = battleRecap.planCompactBattleRecapLayout(false);
const compactContextRecapLayout =
  battleRecap.planCompactBattleRecapLayout(true);
const compactContentHeight =
  compactRecapLayout.headlineHeight +
  compactRecapLayout.statusGap +
  compactRecapLayout.statusHeight +
  compactRecapLayout.lessonGap +
  compactRecapLayout.lessonHeight;
assert.equal(compactRecapLayout.cardHeight, 280);
assert.equal(compactContextRecapLayout.cardHeight, 316);
assert.ok(
  compactRecapLayout.contentTop + compactContentHeight <
    compactRecapLayout.cardHeight / 2,
  'compact recap content should stay inside the no-context card'
);
assert.ok(
  compactContextRecapLayout.contentTop + compactContentHeight <
    compactContextRecapLayout.contextCenterY -
      compactContextRecapLayout.contextHeight / 2,
  'compact recap content should not collide with the optional context line'
);
assert.ok(
  compactRecapLayout.lessonFontSize * (320 / 720) >= 10,
  'the decisive-hit lesson should remain at least 10 CSS pixels at 320px width before any FIT label adjustment'
);

const knockoutRecapReport = mockCombatBundle.simulate(
  { ...debugFixtureFighterByPower.inkquake, element: 'storm' },
  debugFixtureFighterByPower.nib_halo,
  2,
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
    headline: 'KO • Solarkiln WINS',
    verdictLine: '17.4s • INK LEFT 1/235 vs 0/275',
    tapeLine: '275 TOTAL DAMAGE • QUILL ORBIT',
    highlight: {
      label: 'FINAL SPLAT',
      text: 'Piercing Quill • 10 to Barkbloom',
      compactText: 'Piercing Quill · 10 DAMAGE',
    },
    finishPresentation: 'knockout',
    finishSound: 'knockout',
  },
  'knockout recap should use the terminal damage event rather than the largest earlier hit'
);

const doubleKnockoutTranscript = structuredClone(
  knockoutRecapReport.simulation
);
doubleKnockoutTranscript.result.reason = 'double_knockout';
for (const fighter of doubleKnockoutTranscript.result.fighters) {
  fighter.finalHitPoints = 0;
  fighter.hitPointPermille = 0;
}
for (const fighter of doubleKnockoutTranscript.checkpoints.at(-1).fighters) {
  fighter.hitPoints = 0;
}
doubleKnockoutTranscript.timeline.at(-1).reason = 'double_knockout';
const doubleKnockoutRecap = battleRecap.planBattleRecap(
  doubleKnockoutTranscript
);
assert.equal(doubleKnockoutRecap.finishPresentation, 'double-knockout');
assert.equal(doubleKnockoutRecap.finishSound, 'knockout');
assert.ok(doubleKnockoutRecap.headline.startsWith('DOUBLE KO •'));

const timeoutDecisionSourceTranscript = structuredClone(
  timeoutRecapReport.simulation
);
timeoutDecisionSourceTranscript.result.reason = 'timeout_damage_dealt';
timeoutDecisionSourceTranscript.result.winner = 'a';
timeoutDecisionSourceTranscript.result.loser = 'b';
timeoutDecisionSourceTranscript.result.completedTick = 400;
timeoutDecisionSourceTranscript.result.completedMilliseconds = 20_000;
timeoutDecisionSourceTranscript.result.fighters[0].finalHitPoints =
  timeoutDecisionSourceTranscript.result.fighters[0].maxHitPoints;
timeoutDecisionSourceTranscript.result.fighters[0].hitPointPermille = 1_000;
timeoutDecisionSourceTranscript.result.fighters[0].damageDealt = 101;
timeoutDecisionSourceTranscript.result.fighters[1].finalHitPoints =
  timeoutDecisionSourceTranscript.result.fighters[1].maxHitPoints;
timeoutDecisionSourceTranscript.result.fighters[1].hitPointPermille = 1_000;
timeoutDecisionSourceTranscript.result.fighters[1].damageDealt = 100;
const timeoutStartingCheckpoint =
  timeoutDecisionSourceTranscript.checkpoints[0];
timeoutDecisionSourceTranscript.checkpoints = Array.from(
  { length: 41 },
  (_, checkpointIndex) => {
    const checkpoint = structuredClone(timeoutStartingCheckpoint);
    checkpoint.tick = checkpointIndex * 10;
    checkpoint.fighters[0].hitPoints =
      timeoutDecisionSourceTranscript.result.fighters[0].maxHitPoints;
    checkpoint.fighters[1].hitPoints =
      timeoutDecisionSourceTranscript.result.fighters[1].maxHitPoints;
    return checkpoint;
  }
);
timeoutDecisionSourceTranscript.timeline = [
  timeoutDecisionSourceTranscript.timeline[0],
  {
    tick: 100,
    kind: 'damage',
    sourceFighter: 'a',
    targetFighter: 'b',
    source: 'contact',
    amount: 1,
    targetHitPoints:
      timeoutDecisionSourceTranscript.result.fighters[1].maxHitPoints,
    critical: false,
    position: { x: 0, y: 0 },
  },
  {
    tick: 400,
    kind: 'battle_ended',
    winner: 'a',
    reason: 'timeout_damage_dealt',
  },
];
const falseDoubleKnockoutTranscript = structuredClone(
  timeoutDecisionSourceTranscript
);
falseDoubleKnockoutTranscript.result.reason = 'double_knockout';
falseDoubleKnockoutTranscript.timeline.at(-1).reason = 'double_knockout';
assert.equal(
  continuousReplay.getUsableBattleTranscript(falseDoubleKnockoutTranscript),
  undefined,
  'a live-HP timeout cannot be relabeled as a double knockout'
);

const damageDecisionTranscript = structuredClone(
  timeoutDecisionSourceTranscript
);
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
  `TIME • INK % TIED • ${damageDecisionTranscript.fighters[0].name} WINS ON DAMAGE`,
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
    compactText: 'PLAY-BY-PLAY LIMITED',
  },
  'truncated recaps must not invent a biggest or final hit'
);
assert.equal(
  battleRecap.formatCompactBattleRecapLesson({
    highlight: null,
    tapeLine: '87 TOTAL DAMAGE • COLOR BURST',
  }),
  'ROLE READ · 87 TOTAL DAMAGE • COLOR BURST',
  'compact results without a verified hit should retain the role-and-damage lesson'
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
tieHighlightTranscript.result.winner = 'a';
tieHighlightTranscript.result.loser = 'b';
const tieStart = tieHighlightTranscript.timeline[0];
const tieEnd = tieHighlightTranscript.timeline.at(-1);
tieEnd.winner = 'a';
tieHighlightTranscript.timeline = [
  tieStart,
  {
    tick: 9,
    kind: 'damage',
    sourceFighter: 'b',
    targetFighter: 'a',
    source: 'contact',
    amount: 50,
    targetHitPoints: 130,
    critical: false,
    position: { x: 0, y: 0 },
  },
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
  battleRecap.planBattleRecap(tieHighlightTranscript).highlight?.label,
  "WINNER'S SPLAT",
  'a timeout lesson should truthfully scope the highlighted hit to the winner even when the loser landed the globally largest hit'
);
assert.equal(
  battleRecap.planBattleRecap(tieHighlightTranscript).highlight?.text,
  'body check • 30 to Barkbloom',
  'equal winner hits should resolve to the earliest authoritative event'
);
tieHighlightTranscript.timeline[2].amount = 29;
assert.equal(
  battleRecap.planBattleRecap(tieHighlightTranscript).highlight?.text,
  'Color burst echo • 30 to Barkbloom',
  'Colorburst echo attribution requires an actual echo damage event'
);
pass('authoritative Inkcast recap copy and finish semantics');

const journalDecisionWin = structuredClone(timeoutRecapReport);
journalDecisionWin.simulation = structuredClone(damageDecisionTranscript);
journalDecisionWin.winner = 'a';
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
assert.equal(journalDecisionPlan.actionLabel, 'REPLAY');
assert.equal(journalDecisionPlan.rowStatusLabel, 'MY WIN • DECISION • D9');
assert.match(journalDecisionPlan.accessibleLabel, /^Replay .+ D9\.$/);
assert.equal(journalDecisionPlan.kindDayLabel, 'EXHIBITION SPAR • DAY 9');
const journalDecisionRecap = battleRecap.planBattleRecap(
  journalDecisionWin.simulation
);
assert.equal(
  journalDecisionPlan.highlightLine,
  `${journalDecisionRecap.highlight.label} • ${journalDecisionRecap.highlight.text}`
);
assert.equal(
  journalDecisionPlan.metadataLine,
  journalDecisionRecap.verdictLine
);

const journalKnockoutLoss = structuredClone(knockoutRecapReport);
journalKnockoutLoss.id = 'journal-day-9-rumble';
journalKnockoutLoss.day = 9;
journalKnockoutLoss.kind = 'rumble';
journalKnockoutLoss.a.artist =
  journalKnockoutLoss.winner === 'a' ? 'paper_guest' : 'mock_player';
journalKnockoutLoss.b.artist =
  journalKnockoutLoss.winner === 'b' ? 'paper_guest' : 'mock_player';
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
const historicalOwnedFighter = [
  journalKnockoutLoss.a,
  journalKnockoutLoss.b,
].find((fighter) => fighter.artist === 'mock_player');
assert.ok(historicalOwnedFighter);
assert.equal(
  battleJournal.isScribbitOwnedByViewer(
    historicalOwnedFighter,
    ' MOCK_PLAYER ',
    []
  ),
  true,
  'normalized artist identity should survive historical replay'
);

const journalBossReport = structuredClone(knockoutRecapReport);
journalBossReport.simulation = structuredClone(doubleKnockoutTranscript);
journalBossReport.winner = doubleKnockoutTranscript.result.winner;
journalBossReport.id = 'journal-day-9-boss';
journalBossReport.day = 9;
journalBossReport.kind = 'boss';
journalBossReport.a.artist =
  journalBossReport.winner === 'a' ? 'mock_player' : 'paper_guest';
journalBossReport.b.artist =
  journalBossReport.winner === 'b' ? 'mock_player' : 'paper_guest';

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
assert.equal(archivedJournalPlan.actionLabel, 'VIEW RESULT');
assert.equal(
  archivedJournalPlan.rowStatusLabel,
  'MY WIN • ARCHIVED RESULT • D8'
);
assert.match(archivedJournalPlan.accessibleLabel, /No motion\.$/);

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

const rankedRivalRunChoices = rivalRunCore.createRivalRunChoices(
  protectedRecoilFighter,
  freshRivalSlate,
  debugFixtureForecast
);
assert.deepEqual(
  rankedRivalRunChoices.map(({ tier, winPoints }) => ({ tier, winPoints })),
  [
    { tier: 'safe', winPoints: 1 },
    { tier: 'even', winPoints: 2 },
    { tier: 'risky', winPoints: 3 },
  ],
  'each run slate must expose one server-ranked +1/+2/+3 decision'
);
assert.equal(
  new Set(rankedRivalRunChoices.map((choice) => choice.rival.id)).size,
  3,
  'Rival Run tiers must preserve three unique opponents'
);

const newRivalRun = rivalRunCore.createRivalRunState(
  'run-test-1',
  9,
  'scribbit-runner'
);
assert.deepEqual(
  {
    id: newRivalRun.id,
    dayNumber: newRivalRun.dayNumber,
    challengerId: newRivalRun.challengerId,
    boutsCompleted: newRivalRun.boutsCompleted,
    wins: newRivalRun.wins,
    losses: newRivalRun.losses,
    score: newRivalRun.score,
    opponentIds: newRivalRun.opponentIds,
    status: newRivalRun.status,
  },
  {
    id: 'run-test-1',
    dayNumber: 9,
    challengerId: 'scribbit-runner',
    boutsCompleted: 0,
    wins: 0,
    losses: 0,
    score: 0,
    opponentIds: [],
    status: 'active',
  }
);
assert.equal(rivalRunChallenges.RIVAL_RUN_CHALLENGES.length, 12);
assert.equal(
  new Set(rivalRunChallenges.RIVAL_RUN_CHALLENGES.map(({ id }) => id)).size,
  12,
  'the authored Rival Run challenge catalog must keep twelve stable ids'
);
assert.ok(rivalRunChallenges.isRivalRunChallenge(newRivalRun.challenge));
assert.equal(newRivalRun.challenge.progress, 0);
assert.equal(newRivalRun.challenge.completionAchieved, false);
const selectedChallengeIds = new Set(
  Array.from(
    { length: 512 },
    (_, index) =>
      rivalRunCore.createRivalRunState(
        `run-rotation-${index}`,
        9,
        'scribbit-runner'
      ).challenge.id
  )
);
const activeRivalRunChallengeCount =
  rivalRunChallenges.RIVAL_RUN_CHALLENGES.length +
  rivalRunChallenges.RIVAL_RUN_V2_CHALLENGES.length;
assert.equal(
  selectedChallengeIds.size,
  activeRivalRunChallengeCount,
  'deterministic run identities must reach the full active challenge catalog'
);
assert.notEqual(
  rivalRunCore.createRivalRunState(
    'run-test-next',
    9,
    'scribbit-runner',
    newRivalRun.challenge.id
  ).challenge.id,
  newRivalRun.challenge.id,
  'a fresh run must not immediately repeat the completed challenge card'
);

for (const definition of rivalRunChallenges.RIVAL_RUN_CHALLENGES) {
  let challengeState = {
    ...definition,
    condition: { ...definition.condition },
    progress: 0,
    completionAchieved: false,
  };
  let wins = 0;
  let score = 0;
  const tiers =
    definition.condition.kind === 'tier_set'
      ? ['safe', 'even', 'risky']
      : [
          definition.condition.tier ??
            (definition.condition.kind === 'minimum_score' ? 'risky' : 'even'),
          definition.condition.tier ??
            (definition.condition.kind === 'minimum_score' ? 'risky' : 'even'),
          definition.condition.tier ??
            (definition.condition.kind === 'minimum_score' ? 'risky' : 'even'),
        ];
  const outcomes =
    definition.condition.kind === 'outcome_sequence'
      ? ['loss', 'win', 'win']
      : definition.condition.kind === 'final_win'
        ? ['loss', 'loss', 'win']
        : ['win', 'win', 'win'];
  for (let boutIndex = 0; boutIndex < 3; boutIndex += 1) {
    const tier = tiers[boutIndex];
    const outcome = outcomes[boutIndex];
    assert.ok(tier && outcome);
    if (outcome === 'win') {
      wins += 1;
      score += tier === 'safe' ? 1 : tier === 'even' ? 2 : 3;
    }
    challengeState = rivalRunChallenges.advanceRivalRunChallenge(
      challengeState,
      {
        boutNumber: boutIndex + 1,
        outcome,
        tier,
        wins,
        score,
        status: boutIndex === 2 ? 'complete' : 'active',
      }
    );
  }
  assert.equal(
    challengeState.completionAchieved,
    true,
    `${definition.id} must have one truthful achievable three-bout path`
  );
}
const rivalRunBoutOne = rivalRunCore.advanceRivalRunState(newRivalRun, {
  expectedBoutsCompleted: 0,
  playerWon: true,
  tier: 'even',
  winPoints: 2,
  opponentId: 'founding-even-test',
});
assert.ok(rivalRunBoutOne);
assert.deepEqual(
  {
    bout: rivalRunBoutOne.boutNumber,
    record: [rivalRunBoutOne.wins, rivalRunBoutOne.losses],
    score: rivalRunBoutOne.score,
    status: rivalRunBoutOne.status,
  },
  { bout: 1, record: [1, 0], score: 2, status: 'active' }
);
const rivalRunBoutTwo = rivalRunCore.advanceRivalRunState(rivalRunBoutOne, {
  expectedBoutsCompleted: 1,
  playerWon: false,
  tier: 'risky',
  winPoints: 3,
  opponentId: 'founding-risky-test',
});
assert.ok(rivalRunBoutTwo);
assert.equal(rivalRunBoutTwo.score, 2, 'a loss advances without fake points');
const rivalRunBoutThree = rivalRunCore.advanceRivalRunState(rivalRunBoutTwo, {
  expectedBoutsCompleted: 2,
  playerWon: true,
  tier: 'safe',
  winPoints: 1,
  opponentId: 'founding-safe-test',
});
assert.ok(rivalRunBoutThree);
assert.deepEqual(
  {
    bouts: rivalRunBoutThree.boutsCompleted,
    record: [rivalRunBoutThree.wins, rivalRunBoutThree.losses],
    score: rivalRunBoutThree.score,
    status: rivalRunBoutThree.status,
  },
  { bouts: 3, record: [2, 1], score: 3, status: 'complete' }
);
assert.equal(
  rivalRunCore.advanceRivalRunState(rivalRunBoutThree, {
    expectedBoutsCompleted: 3,
    playerWon: true,
    tier: 'risky',
    winPoints: 3,
    opponentId: 'founding-fourth-test',
  }),
  null,
  'a completed run must reject a fourth bout'
);
assert.deepEqual(rivalRunPresentation.planRivalRunDraftHeading(newRivalRun), {
  title: newRivalRun.challenge.name,
  subtitle: 'RIVAL RUN • BOUT 1/3 • 0 PTS',
});
const runChallengeCopy =
  rivalRunPresentation.planRivalRunChallengeCopy(rivalRunBoutThree);
assert.equal(runChallengeCopy.name, newRivalRun.challenge.name);
assert.equal(runChallengeCopy.goal, newRivalRun.challenge.goal);
assert.match(runChallengeCopy.accessibleSummary, /Goal:/);
assert.match(
  rivalRunPresentation.formatRivalRunResultLine(rivalRunBoutThree),
  new RegExp(`^${newRivalRun.challenge.name} • `)
);
const rivalRunFinishStamp =
  rivalRunPresentation.planRivalRunFinishStamp(rivalRunBoutThree);
assert.ok(rivalRunFinishStamp);
assert.ok(rivalRunFinishStamp.title.startsWith(newRivalRun.challenge.name));
assert.equal(rivalRunFinishStamp.record, '3 PTS • 2–1');
assert.equal(
  rivalRunPresentation.formatRivalRunBattleLabel(rivalRunBoutOne),
  `${newRivalRun.challenge.name} • 1/3 • 0 PTS`,
  'the live HUD must name the challenge and pre-bout score without spoiling the result'
);
assert.equal(
  rivalRunPresentation.planRivalRunActionCopy(rivalRunBoutOne).label,
  'NEXT RIVAL'
);
assert.equal(
  rivalRunPresentation.planRivalRunActionCopy(rivalRunBoutTwo).label,
  'FINAL RIVAL'
);
assert.equal(
  rivalRunPresentation.planRivalRunActionCopy(rivalRunBoutThree).label,
  'NEW RIVAL RUN'
);

const rivalRunStorage = createMemoryStorage();
const storedRunChallenger = makeScribbit({
  id: 'scribbit-runner',
  name: 'Run Challenger',
});
const storedEvenOpponent = makeScribbit({
  id: 'founding-storage-even',
  name: 'Storage Even',
  isFounding: true,
});
const storedRiskyOpponent = makeScribbit({
  id: 'founding-storage-risky',
  name: 'Storage Risky',
  isFounding: true,
});
const storedBoutOneReport = createBattleReportWithWinner(
  storedRunChallenger,
  storedEvenOpponent,
  9,
  'run-report-1',
  'exhibition',
  'a'
);
const staleStoredBoutReport = createBattleReportWithWinner(
  storedRunChallenger,
  storedRiskyOpponent,
  9,
  'run-report-race',
  'exhibition',
  'a'
);
const storedRivalRun = await rivalRunCore.getOrCreateRivalRun(rivalRunStorage, {
  userId: 'runner-user',
  runId: 'run-storage-1',
  dayNumber: 9,
  challengerId: 'scribbit-runner',
});
assert.equal(
  (
    await rivalRunCore.getOrCreateRivalRun(rivalRunStorage, {
      userId: 'runner-user',
      runId: 'ignored-new-id',
      dayNumber: 9,
      challengerId: 'scribbit-runner',
    })
  ).id,
  storedRivalRun.id,
  'reopening the same active run must not reset its score'
);
assert.deepEqual(
  (
    await rivalRunCore.getOrCreateRivalRun(rivalRunStorage, {
      userId: 'runner-user',
      runId: 'another-ignored-id',
      dayNumber: 9,
      challengerId: 'scribbit-runner',
    })
  ).challenge,
  storedRivalRun.challenge,
  'reopening an active run must preserve its exact authored challenge snapshot'
);
const storedBoutOne = await rivalRunCore.advanceRivalRun(rivalRunStorage, {
  userId: 'runner-user',
  runId: storedRivalRun.id,
  dayNumber: 9,
  challengerId: 'scribbit-runner',
  expectedBoutsCompleted: 0,
  reportId: 'run-report-1',
  report: storedBoutOneReport,
  playerWon: true,
  tier: 'even',
  winPoints: 2,
  opponentId: 'founding-storage-even',
});
assert.equal(storedBoutOne?.score, 2);
assert.equal(storedBoutOne?.challenge.id, storedRivalRun.challenge.id);
assert.deepEqual(
  await rivalRunCore.advanceRivalRun(rivalRunStorage, {
    userId: 'runner-user',
    runId: storedRivalRun.id,
    dayNumber: 9,
    challengerId: 'scribbit-runner',
    expectedBoutsCompleted: 0,
    reportId: 'run-report-1',
    report: storedBoutOneReport,
    playerWon: true,
    tier: 'even',
    winPoints: 2,
    opponentId: 'founding-storage-even',
  }),
  storedBoutOne,
  'replaying the same deterministic report must recover one exact receipt'
);
assert.equal(
  await rivalRunCore.advanceRivalRun(rivalRunStorage, {
    userId: 'runner-user',
    runId: storedRivalRun.id,
    dayNumber: 9,
    challengerId: 'scribbit-runner',
    expectedBoutsCompleted: 0,
    reportId: 'run-report-race',
    report: staleStoredBoutReport,
    playerWon: true,
    tier: 'risky',
    winPoints: 3,
    opponentId: 'founding-storage-risky',
  }),
  null,
  'a stale concurrent bout cannot advance the run twice'
);
assert.equal(
  (await battleStore.loadBattleReport(rivalRunStorage, 'run-report-1'))
    ?.rivalRun?.score,
  2,
  'the run state and its recoverable battle report must commit together'
);
assert.equal(
  (await battleStore.loadBattleReport(rivalRunStorage, 'run-report-1'))
    ?.rivalRun?.challenge.id,
  storedRivalRun.challenge.id,
  'stored replay receipts must retain the immutable challenge identity'
);

const legacyRivalRunStorage = createMemoryStorage();
await legacyRivalRunStorage.set(
  rivalRunCore.getRivalRunKey('legacy-runner'),
  JSON.stringify({
    schemaVersion: 1,
    id: 'legacy-run-v1',
    dayNumber: 9,
    challengerId: 'scribbit-runner',
    boutsCompleted: 1,
    wins: 1,
    losses: 0,
    score: 2,
    opponentIds: ['legacy-even'],
    status: 'active',
    lastReportId: 'legacy-report-1',
    lastOutcome: 'win',
    lastTier: 'even',
    lastWinPoints: 2,
    lastPointsAwarded: 2,
  })
);
const migratedLegacyRun = await rivalRunCore.loadRivalRun(
  legacyRivalRunStorage,
  'legacy-runner'
);
assert.equal(migratedLegacyRun?.challenge.id, 'v1-finish-the-card');
assert.equal(migratedLegacyRun?.challenge.progress, 1);
assert.equal(migratedLegacyRun?.challenge.completionAchieved, false);

const collisionSafeReportStorage = createMemoryStorage();
const collisionSafeReport = {
  ...timeoutRecapReport,
  id: 'collision-safe-report',
};
await battleStore.saveBattleReport(
  collisionSafeReportStorage,
  collisionSafeReport,
  1
);
await battleStore.saveBattleReport(
  collisionSafeReportStorage,
  { ...collisionSafeReport, inkAwarded: arena.INK_REWARDS.sparWin },
  1
);
assert.equal(
  (
    await battleStore.loadBattleReport(
      collisionSafeReportStorage,
      collisionSafeReport.id
    )
  )?.inkAwarded,
  arena.INK_REWARDS.sparWin,
  'the exact report may be enriched with its idempotent reward receipt'
);
await assert.rejects(
  battleStore.saveBattleReport(
    collisionSafeReportStorage,
    {
      ...collisionSafeReport,
      day: collisionSafeReport.day + 1,
    },
    2
  ),
  /id collision/,
  'a different immutable report must never overwrite an existing report id'
);
pass('battle report ids are collision-guarded and reward-enrichable');
pass('server-authoritative Rival Run carries three scored bouts exactly once');

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
      plan.challengeLine === definition?.personality.challengeLine &&
      plan.levelLine.length > 0 &&
      ['BOOSTED', 'DRAGGED', 'NEUTRAL'].includes(plan.forecastLine)
    );
  }),
  'rival cards must pair truthful build data with canonical founder identity'
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
assert.equal(activeRivalCard.threadTag, 'THREAD READY');
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
assert.equal(waitingRivalCard.threadTag, 'THREAD DAY 10');
const communityExhibitionCard = sparRivals.planSparRivalCard(
  { level: 1 },
  { ...freshRivalSlate[0], id: 'community-rival' },
  debugFixtureForecast
);
assert.equal(communityExhibitionCard.rivalryState, 'exhibition');
assert.equal(
  communityExhibitionCard.threadTag,
  'EXHIBITION',
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
assert.equal(nextThreadBlockedTodayCard.threadTag, 'THREAD DAY 10');
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
  sharedAccessoryEffects.ACCESSORY_EFFECT_MODE,
  'role-sidegrade-v1',
  'Gear techniques should remain bounded role sidegrades'
);
const accessoryEffectFamilies = Object.keys(
  sharedAccessoryEffects.ACCESSORY_EFFECTS
).sort();
assert.deepEqual(accessoryEffectFamilies, [
  'aim',
  'focus',
  'fortune',
  'guard',
  'ready',
  'rush',
]);
for (const family of accessoryEffectFamilies) {
  const familyItems = sharedCosmetics.ACCESSORY_CATALOG_ENTRIES.filter(
    (entry) => entry.effectFamily === family
  );
  assert.ok(
    familyItems.length >= 4,
    `${family} should describe at least four gear items`
  );
  assert.ok(
    familyItems.some((entry) => entry.rarity === 'common'),
    `${family} needs a Common representative so rarity cannot gate the style`
  );
  const effect = sharedAccessoryEffects.accessoryEffect(family);
  assert.equal(effect.id, family);
  assert.ok(effect.shortCopy.length > 0);
  assert.ok(effect.techniqueName.length > 0);
  assert.ok(effect.battleCue.length > 0);
}
const combatEngineSource = readFileSync(
  join(repoRoot, 'src', 'shared', 'combat', 'engine.ts'),
  'utf8'
);
assert.match(
  `${combatEngineSource}\n${serverBattleSource}`,
  /resolveGearCombatLoadout|gear\.modifiers/,
  'server-authored Gear snapshots must enter production Exhibition combat'
);
pass('gear techniques cover the catalog through bounded combat authority');

assert.equal(gearWeekContent.GEAR_WEEK.length, 7);
assert.deepEqual(gearWeekContent.validateGearWeek(), []);
assert.equal(
  new Set(
    gearWeekContent.GEAR_WEEK.slice(0, 6).flatMap(
      (entry) => entry.featuredGearIds
    )
  ).size,
  sharedCosmetics.GEAR_CATALOG_ENTRIES.length,
  'the first six Gear Week days must introduce every current Gear item'
);
assert.equal(gearWeekContent.selectGearWeekDay(8).day, 1);
pass('Gear Week provides seven validated daily content beats');

for (const rank of arena.GEAR_RANKS) {
  const previousRank = rank - 1;
  const strength = sharedGearCombat.GEAR_RANK_STRENGTH_PERMILLE[rank];
  assert.ok(
    previousRank < 1 ||
      strength > sharedGearCombat.GEAR_RANK_STRENGTH_PERMILLE[previousRank],
    `Gear rank ${rank} must be stronger than its previous rank`
  );
}
const redAimEffect = sharedGearCombat.getGearTechniqueEffect(
  sharedCosmetics.findGearCosmetic('tiny-sword'),
  6
);
assert.equal(redAimEffect.name, 'True Aim');
assert.match(redAimEffect.summary, /\+2\.4% IMPACT/);
pass('Gear rank effects climb monotonically from one star to Red Star');

const tinySwordFx = weaponFxPresentation.resolveWeaponFxProfile({
  accessories: ['bowtie', 'tiny-sword'],
  gearRanks: { 'tiny-sword': 3 },
});
assert.deepEqual(tinySwordFx, {
  weaponId: 'tiny-sword',
  family: 'aim',
  rank: 3,
  rankProgress: 0.4,
  rankTier: 'basic',
  shaderMode: 3,
  tint: [0.55, 0.92, 0.48],
  fallbackColor: 0x8cea7a,
});
const rumbleBeltFx = weaponFxPresentation.resolveWeaponFxProfile({
  accessories: ['inkquake-rumble-belt'],
  gearRanks: { 'inkquake-rumble-belt': 6 },
});
assert.equal(
  rumbleBeltFx,
  null,
  'accessory Gear must not trigger weapon VFX'
);
assert.equal(
  weaponFxPresentation.resolveWeaponFxProfile({ accessories: ['bowtie'] }),
  null,
  'non-weapon gear must not trigger weapon VFX'
);
for (const weapon of sharedCosmetics.GEAR_CATALOG_ENTRIES.filter(
  (entry) => entry.category === 'weapon'
)) {
  for (const rank of [1, 2, 3, 4, 5, 6]) {
    const profile = weaponFxPresentation.resolveWeaponFxProfile({
      accessories: [weapon.id],
      gearRanks: { [weapon.id]: rank },
    });
    assert.equal(profile?.weaponId, weapon.id);
    assert.equal(profile?.rank, rank);
    assert.equal(
      profile?.rankTier,
      rank === 6 ? 'red-star' : rank >= 4 ? 'enhanced' : 'basic'
    );
    assert.ok(Number.isInteger(profile?.shaderMode));
    assert.equal(profile?.tint.length, 3);
    assert.ok(profile?.tint.every(Number.isFinite));
  }
}
assert.equal(
  weaponFxPresentation.resolveWeaponFxProfile({
    accessories: ['tiny-sword'],
  })?.rank,
  1,
  'archived fighters without a rank snapshot should use rank 1 presentation'
);
assert.equal(
  weaponFxPresentation.resolveWeaponFxProfile({
    accessories: ['tiny-sword', 'inkquake-rumble-belt'],
    gearRanks: { 'tiny-sword': 2, 'inkquake-rumble-belt': 6 },
  })?.weaponId,
  'tiny-sword',
  'the first attached weapon should be the initial one-draw VFX source'
);
assert.deepEqual(
  weaponFxPresentation.resolveWeaponFxProfile({
    accessories: ['tiny-sword'],
    gearRanks: { 'tiny-sword': 2, 'comet-crayon-blade': 6 },
    equipmentLoadout: {
      ...sharedEquipment.createEmptyEquipmentLoadout(),
      weapon: ['comet-crayon-blade', null],
    },
  })?.weaponId,
  'comet-crayon-blade',
  'an equipped weapon should drive the reusable VFX before a legacy welded weapon'
);
assert.deepEqual(
  weaponFxPresentation
    .resolveWeaponFxProfiles({
      accessories: [],
      gearRanks: { 'tiny-sword': 3, 'wooden-spoon': 6 },
      equipmentLoadout: {
        ...sharedEquipment.createEmptyEquipmentLoadout(),
        weapon: ['tiny-sword', 'wooden-spoon'],
      },
    })
    .map((profile) => [profile.weaponId, profile.rank]),
  [['wooden-spoon', 6]],
  'the strongest weapon should lead while the second slot supports one readable technique'
);
const rankedWeaponOwner = {
  ...makeScribbit({ accessories: ['tiny-sword'] }),
  gearRanks: { 'tiny-sword': 5 },
};
const clonedRankedWeaponOwner = arena.cloneScribbit(rankedWeaponOwner);
clonedRankedWeaponOwner.gearRanks['tiny-sword'] = 2;
assert.equal(
  rankedWeaponOwner.gearRanks['tiny-sword'],
  5,
  'cloning a Scribbit must isolate its immutable attached-rank snapshot'
);
assert.equal(
  weaponFxPresentation.chooseWeaponFxQuality({
    webgl: false,
    reduceMotion: false,
    override: 'full',
  }),
  'off',
  'Canvas must win over a debug quality override'
);
assert.equal(
  weaponFxPresentation.chooseWeaponFxQuality({
    webgl: true,
    reduceMotion: true,
    override: 'full',
  }),
  'off',
  'reduced motion must win over a debug quality override'
);
assert.equal(
  weaponFxPresentation.chooseWeaponFxQuality({
    webgl: true,
    reduceMotion: false,
    hardwareConcurrency: 2,
  }),
  'off'
);
assert.equal(
  weaponFxPresentation.chooseWeaponFxQuality({
    webgl: true,
    reduceMotion: false,
    hardwareConcurrency: 4,
  }),
  'balanced'
);
assert.equal(
  weaponFxPresentation.chooseWeaponFxQuality({
    webgl: true,
    reduceMotion: false,
    hardwareConcurrency: 8,
  }),
  'full'
);
for (const phase of ['telegraph', 'active', 'impact']) {
  for (const critical of [false, true]) {
    const cue = weaponFxPresentation.planWeaponFxCue(phase, critical);
    assert.equal(cue.phase, phase);
    assert.ok(Number.isFinite(cue.durationMilliseconds));
    assert.ok(cue.durationMilliseconds >= 200);
    assert.ok(cue.durationMilliseconds <= 400);
    assert.ok(Number.isFinite(cue.intensity));
    assert.ok(cue.intensity > 0 && cue.intensity <= 1);
  }
  const rankedIntensities = [1, 2, 3, 4, 5, 6].map(
    (rank) => weaponFxPresentation.planWeaponFxCue(phase, false, rank).intensity
  );
  assert.deepEqual(
    rankedIntensities,
    [...rankedIntensities].sort((left, right) => left - right),
    `${phase} weapon intensity should improve from rank 1 through red-star rank 6`
  );
}
const weaponFxRendererSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'weaponfxrenderer.ts'),
  'utf8'
);
const weaponFxShaderSource = readFileSync(
  join(repoRoot, 'src', 'client', 'lib', 'weaponfxshader.ts'),
  'utf8'
);
assert.match(weaponFxRendererSource, /1000 \/ 30/);
assert.doesNotMatch(
  `${weaponFxRendererSource}\n${weaponFxShaderSource}`,
  /cameras\.main\.filters|enableFilters\(/,
  'weapon VFX must stay on localized quads instead of full-screen filters'
);
assert.match(weaponFxRendererSource, /createWeaponFxShader/);
assert.match(weaponFxRendererSource, /runtime\.profiles\.length > 1/);
assert.match(weaponFxShaderSource, /if \(uRank > 0\.42\)/);
assert.match(weaponFxShaderSource, /if \(uRank > 0\.99\)/);
assert.match(weaponFxShaderSource, /if \(uQuality > 0\.5\)/);
assert.match(
  weaponFxShaderSource,
  /float bladeMask\([\s\S]*topBlade[\s\S]*middleBlade[\s\S]*bottomBlade/,
  'Blade Volley must render three readable blade silhouettes instead of a reticle'
);
assert.match(
  weaponFxRendererSource,
  /case 3:[\s\S]*runtime\.uniforms\.facing[\s\S]*fillTriangle/,
  'Blade Volley must keep a readable, correctly faced three-blade Canvas fallback'
);
assert.match(
  weaponFxRendererSource,
  /needsReadableBladeOverlay[\s\S]*runtime\.profile\.family === 'aim'/,
  'Blade Volley must keep readable blade silhouettes over the optional shader'
);
assert.doesNotMatch(
  weaponFxShaderSource,
  /smoothstep\((?:0\.75, -0\.9|0\.75, 0\.42|1\.0, 0\.1|0\.95, 0\.2|0\.22, 0\.0|0\.95, 0\.28|0\.95, 0\.18|0\.18, 0\.0|0\.82, 0\.24)/,
  'shader smoothstep edges must stay ascending for WebGL driver portability'
);
assert.doesNotMatch(
  weaponFxRendererSource,
  /fragmentSource|POST_RENDER|\.add\s*\.shader/,
  'weapon cue orchestration must not own Phaser shader construction'
);
assert.match(weaponFxShaderSource, /fragmentSource/);
assert.match(weaponFxShaderSource, /POST_RENDER/);
assert.match(weaponFxShaderSource, /300,\s*\n\s*420/);
assert.match(weaponFxRendererSource, /setVisible\(false\)/);
pass('weapon VFX shader is reusable, cosmetic, tiered, localized, and bounded');

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

for (let fixtureIndex = 0; fixtureIndex < 1_000; fixtureIndex += 1) {
  const starterWeapon = inkStore.selectCapsuleDrop({
    userId: `starter-weapon-${fixtureIndex}`,
    day: 1,
    pullCount: 1,
    pullsSinceEpic: 0,
  });
  assert.equal(starterWeapon.rarity, 'common');
  assert.equal(
    sharedCosmetics.findGearCosmetic(starterWeapon.id)?.category,
    'weapon',
    'every new player should receive a combat weapon before category luck begins'
  );
}
const legacyStarterWeapon = inkStore.selectCapsuleDrop(
  {
    userId: 'legacy-starter-weapon',
    day: 20,
    pullCount: 12,
    pullsSinceEpic: 0,
  },
  new Set(['cape', 'round-glasses'])
);
assert.equal(legacyStarterWeapon.rarity, 'common');
assert.equal(
  sharedCosmetics.findGearCosmetic(legacyStarterWeapon.id)?.category,
  'weapon',
  'an existing inventory without a weapon should catch up on its next pull'
);
const epicWeaponMilestone = inkStore.selectCapsuleDrop(
  {
    userId: 'epic-weapon-milestone',
    day: 30,
    pullCount: arena.CAPSULE_EPIC_WEAPON_GUARANTEE_PULL,
    pullsSinceEpic: 0,
  },
  new Set(['tiny-sword'])
);
assert.equal(epicWeaponMilestone.id, 'comet-crayon-blade');
const legendaryWeaponMilestone = inkStore.selectCapsuleDrop(
  {
    userId: 'legendary-weapon-milestone',
    day: 100,
    pullCount: arena.CAPSULE_LEGENDARY_WEAPON_GUARANTEE_PULL,
    pullsSinceEpic: 0,
  },
  new Set(['tiny-sword', 'comet-crayon-blade'])
);
assert.equal(legendaryWeaponMilestone.id, 'void-nib-lance');
const weaponPity = inkStore.selectCapsuleDrop(
  {
    userId: 'weapon-pity',
    day: 8,
    pullCount: 10,
    pullsSinceEpic: arena.CAPSULE_PITY - 1,
  },
  new Set(['tiny-sword'])
);
assert.equal(
  weaponPity.id,
  'comet-crayon-blade',
  'hard pity should advance weapon progression when its Epic weapon is still missing'
);
pass('capsule weapon progression has starter, pity, and rarity milestones');

let protectedPermanentFixture = null;
for (let fixtureIndex = 0; fixtureIndex < 500; fixtureIndex += 1) {
  const selection = {
    userId: `permanent-protection-${fixtureIndex}`,
    day: 6,
    pullCount: 2,
    pullsSinceEpic: 0,
  };
  const selectedEntry = inkStore.selectCapsuleDrop(
    selection,
    new Set(['tiny-sword'])
  );
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
await permanentProtectionStorage.set(
  inkStore.getCapsulePullCountKey(permanentProtectionUser),
  '1'
);
await permanentProtectionStorage.hSet(
  inkStore.getInventoryKey(permanentProtectionUser),
  {
    [protectedPermanentFixture.selectedEntry.id]:
      protectedPermanentFixture.selectedEntry.kind,
    [inkStore.getInventoryDiscoveryField('tiny-sword')]: '1',
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

const gearMergeStorage = createMemoryStorage();
const gearMergeUserId = 'gear-merge-player';
const gearMergeId = 'bowtie';
await gearMergeStorage.hSet(inkStore.getInventoryKey(gearMergeUserId), {
  [gearMergeId]: '4',
  [inkStore.getInventoryDiscoveryField(gearMergeId)]: '1',
});
const migratedGearInventory = await inkStore.loadInventory(
  gearMergeStorage,
  gearMergeUserId
);
assert.deepEqual(migratedGearInventory.gear[gearMergeId], {
  rank: 1,
  copies: 4,
  rarity: 'common',
});
assert.equal(
  await gearMergeStorage.hGet(
    inkStore.getInventoryKey(gearMergeUserId),
    inkStore.getInventoryGearRankField(gearMergeId)
  ),
  '1',
  'legacy discovered accessories should lazily gain a rank marker'
);
const firstGearMerge = await inkStore.mergeGearForUser(
  gearMergeStorage,
  gearMergeUserId,
  gearMergeId,
  'gear-merge-proof-0001'
);
assert.equal(firstGearMerge.status, 'merged');
assert.equal(firstGearMerge.response.toRank, 2);
assert.equal(firstGearMerge.response.inventory.items[gearMergeId], 1);
assert.deepEqual(firstGearMerge.response.inventory.gear[gearMergeId], {
  rank: 2,
  copies: 1,
  rarity: 'common',
});
const repeatedGearMerge = await inkStore.mergeGearForUser(
  gearMergeStorage,
  gearMergeUserId,
  gearMergeId,
  'gear-merge-proof-0001'
);
assert.deepEqual(
  repeatedGearMerge,
  firstGearMerge,
  'a repeated merge operation must return its original receipt without spending again'
);
assert.equal(
  (
    await inkStore.mergeGearForUser(
      gearMergeStorage,
      gearMergeUserId,
      'cape',
      'gear-merge-proof-0001'
    )
  ).status,
  'operationConflict',
  'one operation id cannot be reused for different gear'
);
assert.equal(
  (
    await inkStore.mergeGearForUser(
      gearMergeStorage,
      gearMergeUserId,
      gearMergeId,
      'gear-merge-proof-0002'
    )
  ).status,
  'insufficientCopies'
);
assert.deepEqual(
  mockCombatBundle.projectGearMerge(migratedGearInventory, gearMergeId),
  inkStore.projectGearMerge(migratedGearInventory, gearMergeId),
  'the browser mock must project the exact production gear merge'
);
assert.deepEqual(arena.GEAR_RANKS, [1, 2, 3, 4, 5, 6]);
assert.equal(arena.MAX_NORMAL_GEAR_RANK, 5);
assert.equal(arena.RED_STAR_GEAR_RANK, 6);
let ascendingGearInventory = {
  ...migratedGearInventory,
  items: { ...migratedGearInventory.items, [gearMergeId]: 15 },
  gear: {
    ...migratedGearInventory.gear,
    [gearMergeId]: {
      rank: 1,
      copies: 15,
      rarity: 'common',
    },
  },
};
for (const expectedRank of [2, 3, 4, 5, 6]) {
  const projection = inkStore.projectGearMerge(
    ascendingGearInventory,
    gearMergeId
  );
  assert.equal(projection.status, 'merged');
  assert.equal(projection.response.toRank, expectedRank);
  assert.equal(projection.response.copiesSpent, 3);
  ascendingGearInventory = projection.response.inventory;
}
assert.equal(ascendingGearInventory.gear[gearMergeId].rank, 6);
assert.equal(ascendingGearInventory.gear[gearMergeId].copies, 0);
assert.equal(
  inkStore.projectGearMerge(ascendingGearInventory, gearMergeId).status,
  'maxRank',
  'the red star is a terminal special tier'
);
const redStarStorage = createMemoryStorage();
await redStarStorage.hSet(inkStore.getInventoryKey('red-star-player'), {
  [gearMergeId]: '2',
  [inkStore.getInventoryDiscoveryField(gearMergeId)]: '1',
  [inkStore.getInventoryGearRankField(gearMergeId)]: '6',
});
assert.equal(
  (await inkStore.loadInventory(redStarStorage, 'red-star-player')).gear[
    gearMergeId
  ].rank,
  6,
  'stored red-star gear should survive inventory parsing'
);
pass('gear ranks migrate through five normal stars into one terminal red star');

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
const duplicateDay = 5;
let duplicateAccessoryFixture = null;
for (let fixtureIndex = 0; fixtureIndex < 5_000; fixtureIndex += 1) {
  const userId = `duplicate-accessory-${fixtureIndex}`;
  const firstDrop = inkStore.selectCapsuleDrop({
    userId,
    day: duplicateDay,
    pullCount: 1,
    pullsSinceEpic: 0,
  });
  const secondDrop = inkStore.selectCapsuleDrop(
    {
      userId,
      day: duplicateDay,
      pullCount: 2,
      pullsSinceEpic: firstDrop.rarity === 'epic' ? 0 : 1,
    },
    new Set([firstDrop.id])
  );
  if (firstDrop.kind === 'accessory' && secondDrop.id === firstDrop.id) {
    duplicateAccessoryFixture = { userId, firstDrop, secondDrop };
    break;
  }
}
assert.ok(
  duplicateAccessoryFixture,
  'fixture search should find the same accessory on the first two pulls'
);
const duplicateUserId = duplicateAccessoryFixture.userId;
const firstDuplicateDrop = duplicateAccessoryFixture.firstDrop;
const secondDuplicateDrop = duplicateAccessoryFixture.secondDrop;
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
  'the first chest should deduct the same honest price as later opens'
);
const accessorySubmissionScribbit = makeScribbit({
  id: 'accessory-submission-scribbit',
  bornDay: duplicateDay,
  expiresDay: duplicateDay + arena.LIFESPAN_DAYS,
});
await arenaStore.setCurrentArenaDay(duplicateStorage, duplicateDay);
const consumedFirstAccessory = await submissionCore.commitScribbitSubmission(
  duplicateStorage,
  {
    userId: duplicateUserId,
    scribbit: accessorySubmissionScribbit,
    currentDate: new Date('2026-07-12T12:00:00.000Z'),
    accessoryIds: [firstDuplicateDrop.id],
    rumbleScore: 1_000,
    inkAward: 0,
  }
);
assert.equal(
  consumedFirstAccessory.status,
  'committed',
  'the first accessory copy should be consumed by Scribbit birth'
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
await legacyDuplicateStorage.set(
  inkStore.getCapsulePullCountKey(duplicateUserId),
  '1'
);
await legacyDuplicateStorage.set(
  inkStore.getPullsSinceEpicKey(duplicateUserId),
  '1'
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

const dailyBeliefStorage = createMemoryStorage();
const dailyBeliefTarget = makeScribbit({ id: 'belief-target', belief: 0 });
await scribbitCore.storeScribbit(
  dailyBeliefStorage,
  'belief-owner',
  dailyBeliefTarget
);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(dailyBeliefStorage, {
      scribbitId: dailyBeliefTarget.id,
      userId: 'belief-backer',
      utcDateKey: '20260712',
      currentArenaDay: 2,
      operationId: 'belief-operation-one',
    })
  ).status,
  'applied'
);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(dailyBeliefStorage, {
      scribbitId: dailyBeliefTarget.id,
      userId: 'belief-backer',
      utcDateKey: '20260712',
      currentArenaDay: 2,
      operationId: 'belief-operation-one',
    })
  ).status,
  'applied',
  'the same Belief operation should recover its committed result'
);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(dailyBeliefStorage, {
      scribbitId: dailyBeliefTarget.id,
      userId: 'belief-backer',
      utcDateKey: '20260712',
      currentArenaDay: 2,
      operationId: 'belief-operation-duplicate',
    })
  ).status,
  'already-believed'
);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(dailyBeliefStorage, {
      scribbitId: dailyBeliefTarget.id,
      userId: 'belief-backer',
      utcDateKey: '20260713',
      currentArenaDay: 2,
      operationId: 'belief-operation-two',
    })
  ).status,
  'applied',
  'Belief should reset on the next UTC day'
);
assert.deepEqual(
  await Promise.all(
    ['20260712', '20260713'].map((utcDateKey) =>
      dailyBeliefStorage.hGetAll(
        scribbitCore.getUserDailyBeliefTargetsKey('belief-backer', utcDateKey)
      )
    )
  ),
  [
    { 'belief-target': 'belief-operation-one' },
    { 'belief-target': 'belief-operation-two' },
  ]
);
assert.equal(
  dailyBeliefStorage.getExpirationSeconds(
    scribbitCore.getDailyBeliefReceiptKey(
      dailyBeliefTarget.id,
      'belief-backer',
      '20260712'
    )
  ),
  7 * 24 * 60 * 60
);
assert.equal(
  dailyBeliefStorage.getExpirationSeconds(
    scribbitCore.getUserDailyBeliefTargetsKey('belief-backer', '20260712')
  ),
  30 * 24 * 60 * 60
);
assert.equal(
  await dailyBeliefStorage.hGet(
    scribbitCore.getScribbitBeliefVotersKey(dailyBeliefTarget.id),
    'belief-backer:20260712'
  ),
  'belief-operation-one',
  'V2 Belief must block older workers through the V1 receipt'
);
await scribbitCore.removeUserBeliefReceipts(
  dailyBeliefStorage,
  'belief-backer',
  '20260713'
);
for (const utcDateKey of ['20260712', '20260713']) {
  assert.equal(
    await dailyBeliefStorage.get(
      scribbitCore.getDailyBeliefReceiptKey(
        dailyBeliefTarget.id,
        'belief-backer',
        utcDateKey
      )
    ),
    undefined,
    'privacy cleanup should remove every V2 Belief receipt date'
  );
}
pass('daily Belief commits and multi-day privacy receipts are atomic');

const beliefMigrationStorage = createMemoryStorage();
const beliefMigrationTarget = makeScribbit({ id: 'belief-migration-target' });
await scribbitCore.storeScribbit(
  beliefMigrationStorage,
  'belief-migration-owner',
  beliefMigrationTarget
);
const beliefMigrationStartedAtMs = Date.UTC(2026, 6, 12, 12);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(beliefMigrationStorage, {
      scribbitId: beliefMigrationTarget.id,
      userId: 'belief-migration-overlap-user',
      utcDateKey: '20260712',
      currentArenaDay: 2,
      operationId: 'belief-migration-overlap-operation',
      operationStartedAtMs: beliefMigrationStartedAtMs,
    })
  ).status,
  'applied'
);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(beliefMigrationStorage, {
      scribbitId: beliefMigrationTarget.id,
      userId: 'belief-migration-v2-user',
      utcDateKey: '20260713',
      currentArenaDay: 2,
      operationId: 'belief-migration-v2-operation',
      operationStartedAtMs:
        beliefMigrationStartedAtMs +
        migrationCore.ROLLOUT_OVERLAP_MILLISECONDS +
        1,
    })
  ).status,
  'applied'
);
assert.equal(
  await beliefMigrationStorage.hGet(
    scribbitCore.getScribbitBeliefVotersKey(beliefMigrationTarget.id),
    'belief-migration-v2-user:20260713'
  ),
  undefined,
  'Belief must stop V1 receipt writes after the finite overlap'
);
assert.equal(
  await beliefMigrationStorage.hGet(
    scribbitCore.getUserBeliefTargetsKey('belief-migration-v2-user'),
    beliefMigrationTarget.id
  ),
  undefined,
  'Belief must stop V1 privacy-index writes after the finite overlap'
);
await scribbitCore.removeUserBeliefReceipts(
  beliefMigrationStorage,
  'belief-migration-overlap-user',
  '20260712',
  beliefMigrationStartedAtMs +
    migrationCore.ROLLOUT_OVERLAP_MILLISECONDS +
    migrationCore.LEGACY_BELIEF_PRIVACY_MILLISECONDS +
    1
);
assert.deepEqual(
  await beliefMigrationStorage.hGetAll(
    scribbitCore.getUserBeliefTargetsKey('belief-migration-overlap-user')
  ),
  {},
  'privacy cleanup must retire the V1 index after its bounded read window'
);
pass('Belief V1 compatibility has finite write and privacy read windows');

assert.equal(
  (
    await scribbitCore.applyDailyBelief(dailyBeliefStorage, {
      scribbitId: dailyBeliefTarget.id,
      userId: 'belief-owner',
      utcDateKey: '20260714',
      currentArenaDay: 2,
      operationId: 'self-belief-operation',
    })
  ).status,
  'self-belief',
  'a Scribbit owner must not create a Belief receipt for their own drawing'
);
const foundingBeliefStorage = createMemoryStorage();
const foundingBeliefResults = await Promise.all([
  scribbitCore.applyDailyBelief(foundingBeliefStorage, {
    scribbitId: chronicleFounder.id,
    userId: 'founding-belief-backer-a',
    utcDateKey: '20260712',
    currentArenaDay: 2,
    operationId: 'founding-belief-operation-a',
  }),
  scribbitCore.applyDailyBelief(foundingBeliefStorage, {
    scribbitId: chronicleFounder.id,
    userId: 'founding-belief-backer-b',
    utcDateKey: '20260712',
    currentArenaDay: 2,
    operationId: 'founding-belief-operation-b',
  }),
]);
assert.deepEqual(
  foundingBeliefResults.map(({ status }) => status),
  ['applied', 'applied']
);
assert.equal(
  (await scribbitCore.loadScribbit(foundingBeliefStorage, chronicleFounder.id))
    .belief,
  2
);
assert.ok(foundingBeliefStorage.getWatchConflictCount() > 0);
pass('Belief rejects self-support and commits founding support atomically');

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
await Promise.all([
  scribbitCore.applyDailyBelief(beliefStorage, {
    scribbitId: beliefScribbit.id,
    userId: 'belief-backer-a',
    utcDateKey: '20260712',
    currentArenaDay: 2,
    operationId: 'belief-concurrent-a',
  }),
  scribbitCore.applyDailyBelief(beliefStorage, {
    scribbitId: beliefScribbit.id,
    userId: 'belief-backer-b',
    utcDateKey: '20260712',
    currentArenaDay: 2,
    operationId: 'belief-concurrent-b',
  }),
]);
const beliefAfterConcurrentSupport = await scribbitCore.loadScribbit(
  beliefStorage,
  beliefScribbit.id
);
assert.equal(
  beliefAfterConcurrentSupport.belief,
  7,
  'two simultaneous supporters should both increase community Belief'
);
assert.equal(
  beliefWatchKeySets.some((keys) =>
    keys.includes(scribbitCore.getCommunityBeliefKey())
  ),
  false,
  'Belief should not WATCH the global community hash'
);
assert.equal(
  beliefWatchKeySets.every((keys) =>
    keys.includes(scribbitCore.getScribbitBeliefVersionKey(beliefScribbit.id))
  ),
  true,
  'Belief should fence only the target Scribbit version'
);
assert.ok(
  beliefStorage.getWatchConflictCount() > 0,
  'community Belief concurrency must exercise an actual WATCH conflict'
);

const duplicateBeliefStorage = createMemoryStorage();
const duplicateBeliefTarget = makeScribbit({ id: 'belief-same-user-race' });
await scribbitCore.storeScribbit(
  duplicateBeliefStorage,
  'belief-same-user-owner',
  duplicateBeliefTarget
);
const duplicateBeliefResults = await Promise.all([
  scribbitCore.applyDailyBelief(duplicateBeliefStorage, {
    scribbitId: duplicateBeliefTarget.id,
    userId: 'belief-same-user',
    utcDateKey: '20260712',
    currentArenaDay: 2,
    operationId: 'belief-same-user-a',
  }),
  scribbitCore.applyDailyBelief(duplicateBeliefStorage, {
    scribbitId: duplicateBeliefTarget.id,
    userId: 'belief-same-user',
    utcDateKey: '20260712',
    currentArenaDay: 2,
    operationId: 'belief-same-user-b',
  }),
]);
assert.deepEqual(duplicateBeliefResults.map(({ status }) => status).sort(), [
  'already-believed',
  'applied',
]);
assert.equal(
  (
    await scribbitCore.loadScribbit(
      duplicateBeliefStorage,
      duplicateBeliefTarget.id
    )
  ).belief,
  1
);
assert.ok(duplicateBeliefStorage.getWatchConflictCount() > 0);
pass('community Belief increments are concurrency-safe');

const replyLossBeliefStorage = createMemoryStorage({
  throwAfterCommitNumber: 2,
});
const replyLossBeliefTarget = makeScribbit({ id: 'belief-reply-loss' });
await scribbitCore.storeScribbit(
  replyLossBeliefStorage,
  'belief-reply-owner',
  replyLossBeliefTarget
);
assert.equal(
  (
    await scribbitCore.applyDailyBelief(replyLossBeliefStorage, {
      scribbitId: replyLossBeliefTarget.id,
      userId: 'belief-reply-backer',
      utcDateKey: '20260712',
      currentArenaDay: 2,
      operationId: 'belief-reply-operation',
    })
  ).status,
  'applied',
  'Belief should recover an exact committed operation after reply loss'
);
assert.equal(
  (
    await scribbitCore.loadScribbit(
      replyLossBeliefStorage,
      replyLossBeliefTarget.id
    )
  ).belief,
  1,
  'reply-loss recovery must not increment Belief twice'
);

const failedBeliefStorage = createMemoryStorage();
const failedBeliefTarget = makeScribbit({ id: 'belief-atomic-failure' });
await scribbitCore.storeScribbit(
  failedBeliefStorage,
  'belief-failure-owner',
  failedBeliefTarget
);
const originalFailedBeliefWatch =
  failedBeliefStorage.watch.bind(failedBeliefStorage);
failedBeliefStorage.watch = async (...keys) => {
  const transaction = await originalFailedBeliefWatch(...keys);
  transaction.hSet = async () => {
    throw new Error('Simulated Belief transaction failure.');
  };
  return transaction;
};
await assert.rejects(
  () =>
    scribbitCore.applyDailyBelief(failedBeliefStorage, {
      scribbitId: failedBeliefTarget.id,
      userId: 'belief-failure-backer',
      utcDateKey: '20260712',
      currentArenaDay: 2,
      operationId: 'belief-failure-operation',
    }),
  /Simulated Belief transaction failure/
);
assert.equal(
  await failedBeliefStorage.get(
    scribbitCore.getDailyBeliefReceiptKey(
      failedBeliefTarget.id,
      'belief-failure-backer',
      '20260712'
    )
  ),
  undefined,
  'a failed Belief transaction must not leave a receipt'
);
assert.deepEqual(
  await failedBeliefStorage.hGetAll(
    scribbitCore.getUserDailyBeliefTargetsKey(
      'belief-failure-backer',
      '20260712'
    )
  ),
  {},
  'a failed Belief transaction must not leave a privacy index'
);
assert.equal(
  (await scribbitCore.loadScribbit(failedBeliefStorage, failedBeliefTarget.id))
    .belief,
  0,
  'a failed Belief transaction must not increment the aggregate'
);
pass('Belief failure and reply-loss paths stay exactly-once');

const deletionRaceStorage = createMemoryStorage();
const deletionRaceTarget = makeScribbit({ id: 'belief-deletion-race' });
await scribbitCore.storeScribbit(
  deletionRaceStorage,
  'belief-deletion-race-owner',
  deletionRaceTarget
);
const deletionRaceReceiptKey = scribbitCore.getDailyBeliefReceiptKey(
  deletionRaceTarget.id,
  'belief-deletion-race-voter',
  '20260712'
);
const originalDeletionRaceWatch =
  deletionRaceStorage.watch.bind(deletionRaceStorage);
let deletionRaceLease;
let injectedDeletionStart = false;
deletionRaceStorage.watch = async (...keys) => {
  const transaction = await originalDeletionRaceWatch(...keys);
  if (keys.includes(deletionRaceReceiptKey) && !injectedDeletionStart) {
    const originalExec = transaction.exec.bind(transaction);
    transaction.exec = async () => {
      if (!injectedDeletionStart) {
        injectedDeletionStart = true;
        const deletion = await dataDeletionCore.acquirePlayerDataDeletion(
          deletionRaceStorage,
          'belief-deletion-race-voter',
          'belief-deletion-race-operation'
        );
        assert.equal(deletion.status, 'acquired');
        deletionRaceLease = deletion.lease;
      }
      return originalExec();
    };
  }
  return transaction;
};
assert.equal(
  (
    await scribbitCore.applyDailyBelief(deletionRaceStorage, {
      scribbitId: deletionRaceTarget.id,
      userId: 'belief-deletion-race-voter',
      utcDateKey: '20260712',
      currentArenaDay: 2,
      operationId: 'belief-racing-operation',
      operationStartedAtMs: Date.UTC(2026, 6, 12, 12),
    })
  ).status,
  'user-data-changing',
  'Belief must abort when player-data deletion starts after its initial read'
);
assert.equal(await deletionRaceStorage.get(deletionRaceReceiptKey), undefined);
assert.equal(
  (await scribbitCore.loadScribbit(deletionRaceStorage, deletionRaceTarget.id))
    .belief,
  0,
  'the fenced Belief must not mutate its aggregate'
);
assert.ok(deletionRaceStorage.getWatchConflictCount() > 0);
assert.equal(
  await dataDeletionCore.renewPlayerDataDeletion(
    deletionRaceStorage,
    deletionRaceLease
  ),
  'renewed',
  'the deletion owner must be able to renew its bounded lease'
);
assert.equal(
  await dataDeletionCore.renewPlayerDataDeletion(deletionRaceStorage, {
    ...deletionRaceLease,
    token: 'stale-deletion-owner',
  }),
  'not-owner',
  'a stale deletion token must not extend the active lease'
);
assert.equal(
  await dataDeletionCore.releasePlayerDataDeletion(
    deletionRaceStorage,
    deletionRaceLease
  ),
  'released'
);
pass('Belief is fenced against concurrent player-data deletion');

const playerMutationBoundaryStorage = createMemoryStorage();
const activePlayerMutation = await dataDeletionCore.acquirePlayerMutation(
  playerMutationBoundaryStorage,
  'mutation-boundary-player',
  'mutation-boundary-token'
);
assert.equal(activePlayerMutation.status, 'acquired');
assert.equal(
  (
    await dataDeletionCore.acquirePlayerDataDeletion(
      playerMutationBoundaryStorage,
      'mutation-boundary-player',
      'blocked-deletion-token'
    )
  ).status,
  'busy',
  'deletion must not start while a player mutation is active'
);
assert.equal(
  await dataDeletionCore.renewPlayerMutation(
    playerMutationBoundaryStorage,
    activePlayerMutation.lease
  ),
  'renewed'
);
assert.equal(
  await dataDeletionCore.releasePlayerMutation(
    playerMutationBoundaryStorage,
    activePlayerMutation.lease
  ),
  'released'
);
const activePlayerDeletion = await dataDeletionCore.acquirePlayerDataDeletion(
  playerMutationBoundaryStorage,
  'mutation-boundary-player',
  'active-deletion-token'
);
assert.equal(activePlayerDeletion.status, 'acquired');
assert.equal(
  (
    await dataDeletionCore.acquirePlayerMutation(
      playerMutationBoundaryStorage,
      'mutation-boundary-player',
      'blocked-mutation-token'
    )
  ).status,
  'busy',
  'a player mutation must not start while deletion is active'
);
assert.equal(
  await dataDeletionCore.releasePlayerDataDeletion(
    playerMutationBoundaryStorage,
    activePlayerDeletion.lease
  ),
  'released'
);

const singleKeyDeletionReleaseStorage = createMemoryStorage();
const singleKeyDeletion = await dataDeletionCore.acquirePlayerDataDeletion(
  singleKeyDeletionReleaseStorage,
  'single-key-release-player',
  'single-key-release-token'
);
assert.equal(singleKeyDeletion.status, 'acquired');
const baseSingleKeyReleaseWatch = singleKeyDeletionReleaseStorage.watch.bind(
  singleKeyDeletionReleaseStorage
);
let maximumQueuedDeletionLockDeletes = 0;
let deletionReleaseTransactionCount = 0;
singleKeyDeletionReleaseStorage.watch = async (...keys) => {
  const transaction = await baseSingleKeyReleaseWatch(...keys);
  const deleteKeys = transaction.del.bind(transaction);
  let queuedDeletionLockDeletes = 0;
  transaction.del = async (...deletedKeys) => {
    assert.equal(
      deletedKeys.length,
      1,
      'Devvit-compatible lease release must queue one key per DEL command'
    );
    queuedDeletionLockDeletes += 1;
    maximumQueuedDeletionLockDeletes = Math.max(
      maximumQueuedDeletionLockDeletes,
      queuedDeletionLockDeletes
    );
    assert.equal(
      queuedDeletionLockDeletes,
      1,
      'Devvit-compatible lease release must queue only one DEL per transaction'
    );
    return deleteKeys(...deletedKeys);
  };
  const execute = transaction.exec.bind(transaction);
  transaction.exec = async () => {
    if (queuedDeletionLockDeletes > 0) deletionReleaseTransactionCount += 1;
    return execute();
  };
  return transaction;
};
assert.equal(
  await dataDeletionCore.releasePlayerDataDeletion(
    singleKeyDeletionReleaseStorage,
    singleKeyDeletion.lease
  ),
  'released'
);
assert.equal(
  await singleKeyDeletionReleaseStorage.get(
    dataDeletionCore.getPlayerDataDeletionLockKey('single-key-release-player')
  ),
  undefined
);
assert.equal(
  await singleKeyDeletionReleaseStorage.get(
    dataDeletionCore.getGlobalDataDeletionLockKey()
  ),
  undefined
);
assert.equal(maximumQueuedDeletionLockDeletes, 1);
assert.equal(deletionReleaseTransactionCount, 2);
pass('player data deletion releases Devvit locks one key at a time');

const concurrentBoundaryStorage = createMemoryStorage();
const [concurrentMutation, concurrentDeletion] = await Promise.all([
  dataDeletionCore.acquirePlayerMutation(
    concurrentBoundaryStorage,
    'concurrent-boundary-player',
    'concurrent-mutation-token'
  ),
  dataDeletionCore.acquirePlayerDataDeletion(
    concurrentBoundaryStorage,
    'concurrent-boundary-player',
    'concurrent-deletion-token'
  ),
]);
assert.deepEqual(
  [concurrentMutation.status, concurrentDeletion.status].sort(),
  ['acquired', 'busy'],
  'exactly one side of a mutation-versus-deletion race may acquire'
);
assert.ok(concurrentBoundaryStorage.getWatchConflictCount() > 0);
if (concurrentMutation.status === 'acquired') {
  await dataDeletionCore.releasePlayerMutation(
    concurrentBoundaryStorage,
    concurrentMutation.lease
  );
}
if (concurrentDeletion.status === 'acquired') {
  await dataDeletionCore.releasePlayerDataDeletion(
    concurrentBoundaryStorage,
    concurrentDeletion.lease
  );
}

const replyLossMutationStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
const replyLossMutation = await dataDeletionCore.acquirePlayerMutation(
  replyLossMutationStorage,
  'reply-loss-mutation-player',
  'reply-loss-mutation-token'
);
assert.equal(replyLossMutation.status, 'acquired');
assert.equal(
  await dataDeletionCore.releasePlayerMutation(
    replyLossMutationStorage,
    replyLossMutation.lease
  ),
  'released'
);
const lostMutationStorage = createMemoryStorage();
const originalMutationFailure = new Error('original player mutation failure');
const lostMutationResult = await dataDeletionCore.runWithPlayerMutationLease(
  lostMutationStorage,
  'lost-mutation-player',
  'lost-mutation-token',
  async () => {
    await lostMutationStorage.set(
      dataDeletionCore.getPlayerMutationLockKey('lost-mutation-player'),
      'replacement-owner'
    );
    throw originalMutationFailure;
  }
);
assert.equal(lostMutationResult.status, 'lost');
assert.equal(
  lostMutationResult.status === 'lost' ? lostMutationResult.cause : null,
  originalMutationFailure,
  'lease loss must preserve an earlier operation error as its diagnostic cause'
);
const releaseThrowStorage = createMemoryStorage();
const originalReleaseThrowWatch =
  releaseThrowStorage.watch.bind(releaseThrowStorage);
let rejectReleaseWatch = false;
releaseThrowStorage.watch = async (...keys) => {
  if (rejectReleaseWatch) {
    throw new Error('simulated release watch failure');
  }
  return originalReleaseThrowWatch(...keys);
};
const operationBeforeReleaseFailure = new Error(
  'operation failed before release failure'
);
const releaseThrowResult = await dataDeletionCore.runWithPlayerMutationLease(
  releaseThrowStorage,
  'release-throw-player',
  'release-throw-token',
  async () => {
    rejectReleaseWatch = true;
    throw operationBeforeReleaseFailure;
  }
);
assert.equal(releaseThrowResult.status, 'lost');
const combinedMutationFailure =
  releaseThrowResult.status === 'lost' ? releaseThrowResult.cause : null;
assert.ok(combinedMutationFailure instanceof AggregateError);
assert.equal(combinedMutationFailure.errors[0], operationBeforeReleaseFailure);
assert.match(
  String(combinedMutationFailure.errors[1]),
  /changed too often to release safely/,
  'lease-release failure must remain alongside the original operation error'
);
const apiRouteSource = readFileSync(
  join(repoRoot, 'src', 'server', 'routes', 'api.ts'),
  'utf8'
);
assert.doesNotMatch(
  apiRouteSource,
  /mutatingGetRouteSuffixes|requestMutatesPlayerData/,
  'player mutation safety must not depend on a detached GET-route allowlist'
);
for (const route of [
  '/arena',
  '/spar-rivals',
  '/inventory',
  '/clout-board',
  '/legacy-cards',
]) {
  assert.ok(
    apiRouteSource.includes(`registerPlayerMutatingGet('${route}'`),
    `${route} must register its mutation lease beside its handler`
  );
  assert.ok(
    !apiRouteSource.includes(`api.get('${route}'`),
    `${route} must not bypass the mutation-protected GET registrar`
  );
}
pass('player mutations and data deletion share one exclusive lease boundary');

const nightlyDeletionBoundaryStorage = createMemoryStorage();
const activeNightlyMutation =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    nightlyDeletionBoundaryStorage,
    'nightly-boundary-token'
  );
assert.equal(activeNightlyMutation.status, 'acquired');
assert.equal(
  nightlyDeletionBoundaryStorage.getExpirationSeconds(
    dataDeletionCore.getNightlyPlayerMutationLockKey()
  ),
  5 * 60,
  'an abandoned nightly barrier must recover after its bounded lease'
);
assert.equal(
  (
    await dataDeletionCore.acquirePlayerDataDeletion(
      nightlyDeletionBoundaryStorage,
      'nightly-boundary-player',
      'nightly-blocked-deletion'
    )
  ).status,
  'busy',
  'player deletion must not start during nightly player writes'
);
assert.equal(
  await dataDeletionCore.renewNightlyPlayerMutation(
    nightlyDeletionBoundaryStorage,
    activeNightlyMutation.lease
  ),
  'renewed'
);
assert.equal(
  await dataDeletionCore.releaseNightlyPlayerMutation(
    nightlyDeletionBoundaryStorage,
    activeNightlyMutation.lease
  ),
  'released'
);

const deletionBeforeNightly = await dataDeletionCore.acquirePlayerDataDeletion(
  nightlyDeletionBoundaryStorage,
  'nightly-boundary-player',
  'deletion-before-nightly-token'
);
assert.equal(deletionBeforeNightly.status, 'acquired');
assert.equal(
  nightlyDeletionBoundaryStorage.getExpirationSeconds(
    dataDeletionCore.getGlobalDataDeletionLockKey()
  ),
  5 * 60
);
assert.equal(
  nightlyDeletionBoundaryStorage.getExpirationSeconds(
    dataDeletionCore.getPlayerDataDeletionLockKey('nightly-boundary-player')
  ),
  5 * 60,
  'global and per-player deletion barriers must share one recovery window'
);
assert.equal(
  (
    await dataDeletionCore.acquireNightlyPlayerMutation(
      nightlyDeletionBoundaryStorage,
      'blocked-nightly-token'
    )
  ).status,
  'busy',
  'nightly player writes must not start during player deletion'
);
assert.equal(
  await dataDeletionCore.releasePlayerDataDeletion(
    nightlyDeletionBoundaryStorage,
    deletionBeforeNightly.lease
  ),
  'released'
);

const concurrentNightlyDeletionStorage = createMemoryStorage();
const [concurrentNightly, concurrentNightlyDeletion] = await Promise.all([
  dataDeletionCore.acquireNightlyPlayerMutation(
    concurrentNightlyDeletionStorage,
    'concurrent-nightly-token'
  ),
  dataDeletionCore.acquirePlayerDataDeletion(
    concurrentNightlyDeletionStorage,
    'concurrent-nightly-player',
    'concurrent-nightly-deletion-token'
  ),
]);
assert.deepEqual(
  [concurrentNightly.status, concurrentNightlyDeletion.status].sort(),
  ['acquired', 'busy'],
  'exactly one side of a nightly-versus-deletion race may acquire'
);
assert.ok(concurrentNightlyDeletionStorage.getWatchConflictCount() > 0);
if (concurrentNightly.status === 'acquired') {
  await dataDeletionCore.releaseNightlyPlayerMutation(
    concurrentNightlyDeletionStorage,
    concurrentNightly.lease
  );
}
if (concurrentNightlyDeletion.status === 'acquired') {
  await dataDeletionCore.releasePlayerDataDeletion(
    concurrentNightlyDeletionStorage,
    concurrentNightlyDeletion.lease
  );
}

const replyLossNightlyStorage = createMemoryStorage({
  throwAfterCommitOnce: true,
});
const replyLossNightly = await dataDeletionCore.acquireNightlyPlayerMutation(
  replyLossNightlyStorage,
  'reply-loss-nightly-token'
);
assert.equal(replyLossNightly.status, 'acquired');
assert.equal(
  await dataDeletionCore.releaseNightlyPlayerMutation(
    replyLossNightlyStorage,
    replyLossNightly.lease
  ),
  'released'
);

const replyLossNightlyReleaseStorage = createMemoryStorage({
  throwAfterCommitNumber: 2,
});
const replyLossNightlyRelease =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    replyLossNightlyReleaseStorage,
    'reply-loss-nightly-release-token'
  );
assert.equal(replyLossNightlyRelease.status, 'acquired');
assert.equal(
  await dataDeletionCore.releaseNightlyPlayerMutation(
    replyLossNightlyReleaseStorage,
    replyLossNightlyRelease.lease
  ),
  'released',
  'nightly release must recover when delete commits but its reply is lost'
);

const fallbackNightlyReleaseStorage = createMemoryStorage();
const fallbackNightlyReleaseWatch = fallbackNightlyReleaseStorage.watch.bind(
  fallbackNightlyReleaseStorage
);
let forcedNightlyReleaseConflicts = 0;
fallbackNightlyReleaseStorage.watch = async (...keys) => {
  const transaction = await fallbackNightlyReleaseWatch(...keys);
  const discard = transaction.discard.bind(transaction);
  const del = transaction.del.bind(transaction);
  const exec = transaction.exec.bind(transaction);
  let queuesNightlyLockDelete = false;
  transaction.del = async (...deletedKeys) => {
    if (
      deletedKeys.includes(dataDeletionCore.getNightlyPlayerMutationLockKey())
    ) {
      queuesNightlyLockDelete = true;
    }
    return del(...deletedKeys);
  };
  transaction.exec = async () => {
    if (!queuesNightlyLockDelete) return exec();
    forcedNightlyReleaseConflicts += 1;
    await discard();
    return [];
  };
  return transaction;
};
const fallbackNightlyReleaseLease =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    fallbackNightlyReleaseStorage,
    'fallback-nightly-release-token'
  );
assert.equal(fallbackNightlyReleaseLease.status, 'acquired');
const fallbackNightlyReleaseWarnings = [];
const originalFallbackConsoleWarn = console.warn;
console.warn = (...values) => fallbackNightlyReleaseWarnings.push(values);
try {
  assert.equal(
    await dataDeletionCore.releaseNightlyPlayerMutation(
      fallbackNightlyReleaseStorage,
      fallbackNightlyReleaseLease.lease
    ),
    'released'
  );
} finally {
  console.warn = originalFallbackConsoleWarn;
}
assert.equal(
  forcedNightlyReleaseConflicts,
  storageCore.MAX_WATCH_TRANSACTION_ATTEMPTS
);
assert.equal(fallbackNightlyReleaseWarnings.length, 1);
assert.equal(
  await fallbackNightlyReleaseStorage.get(
    dataDeletionCore.getNightlyPlayerMutationLockKey()
  ),
  undefined
);

const lostNightlyLeaseStorage = createMemoryStorage();
const lostNightlyLease = await dataDeletionCore.acquireNightlyPlayerMutation(
  lostNightlyLeaseStorage,
  'lost-nightly-lease-token'
);
assert.equal(lostNightlyLease.status, 'acquired');
await lostNightlyLeaseStorage.set(
  dataDeletionCore.getNightlyPlayerMutationLockKey(),
  'replacement-nightly-token'
);
await assert.rejects(
  () =>
    dataDeletionCore.withNightlyPlayerMutationHeartbeat(
      lostNightlyLeaseStorage,
      lostNightlyLease.lease,
      async () => 'finished'
    ),
  /lost ownership/,
  'nightly completion must fail closed after ownership changes'
);
await lostNightlyLeaseStorage.del(
  dataDeletionCore.getNightlyPlayerMutationLockKey()
);
pass('nightly player writes and deletion share one global safety barrier');

const expiredNightlyFenceStorage = createMemoryStorage();
const expiredNightlyFenceLease =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    expiredNightlyFenceStorage,
    'expired-nightly-fence-token'
  );
assert.equal(expiredNightlyFenceLease.status, 'acquired');
const expiredNightlyFence = nightlyStorageFence.createNightlyFencedStorage(
  expiredNightlyFenceStorage,
  expiredNightlyFenceLease.lease
);
const expiredNightlyTransaction = await expiredNightlyFence.watch(
  'expired-nightly-transaction'
);
await expiredNightlyTransaction.multi();
await expiredNightlyTransaction.set('expired-nightly-transaction', 'forbidden');
await expiredNightlyFenceStorage.del(
  dataDeletionCore.getNightlyPlayerMutationLockKey()
);
await assert.rejects(
  () => expiredNightlyTransaction.exec(),
  nightlyStorageFence.StaleNightlyWorkerError,
  'lease expiry alone must fence an already-open transaction'
);

const expiredNightlyMutations = [
  () => expiredNightlyFence.set('expired:set', 'value'),
  () => expiredNightlyFence.del('expired:del'),
  () => expiredNightlyFence.incrBy('expired:increment', 1),
  () => expiredNightlyFence.expire('expired:ttl', 30),
  () => expiredNightlyFence.hSet('expired:hash:set', { field: 'value' }),
  () => expiredNightlyFence.hSetNX('expired:hash:nx', 'field', 'value'),
  () => expiredNightlyFence.hDel('expired:hash:del', ['field']),
  () => expiredNightlyFence.hIncrBy('expired:hash:increment', 'field', 1),
  () =>
    expiredNightlyFence.zAdd('expired:sorted:add', {
      member: 'member',
      score: 1,
    }),
  () => expiredNightlyFence.zRem('expired:sorted:remove', ['member']),
  () => expiredNightlyFence.zIncrBy('expired:sorted:increment', 'member', 1),
];
for (const mutate of expiredNightlyMutations) {
  await assert.rejects(
    mutate,
    nightlyStorageFence.StaleNightlyWorkerError,
    'every ArenaStorage mutator must reject an expired nightly lease'
  );
}

const replacedNightlyTokenStorage = createMemoryStorage();
const replacedNightlyTokenLease =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    replacedNightlyTokenStorage,
    'original-nightly-token'
  );
assert.equal(replacedNightlyTokenLease.status, 'acquired');
const replacedNightlyTokenFence =
  nightlyStorageFence.createNightlyFencedStorage(
    replacedNightlyTokenStorage,
    replacedNightlyTokenLease.lease
  );
await replacedNightlyTokenStorage.set(
  dataDeletionCore.getNightlyPlayerMutationLockKey(),
  'replacement-nightly-token'
);
await assert.rejects(
  () => replacedNightlyTokenFence.set('replaced-token-write', 'forbidden'),
  nightlyStorageFence.StaleNightlyWorkerError,
  'a token replacement must fence writes even before the epoch changes'
);
await replacedNightlyTokenStorage.del(
  dataDeletionCore.getNightlyPlayerMutationLockKey()
);

const renewedNightlyFenceStorage = createMemoryStorage();
const renewedNightlyFenceLease =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    renewedNightlyFenceStorage,
    'renewed-nightly-fence-token'
  );
assert.equal(renewedNightlyFenceLease.status, 'acquired');
const renewedNightlyFence = nightlyStorageFence.createNightlyFencedStorage(
  renewedNightlyFenceStorage,
  renewedNightlyFenceLease.lease
);
const interruptedByHeartbeat = await renewedNightlyFence.watch(
  'nightly-heartbeat-retry'
);
await interruptedByHeartbeat.multi();
await interruptedByHeartbeat.set('nightly-heartbeat-retry', 'first-attempt');
await renewedNightlyFenceStorage.expire(
  dataDeletionCore.getNightlyPlayerMutationLockKey(),
  5 * 60
);
assert.deepEqual(
  await interruptedByHeartbeat.exec(),
  [],
  'heartbeat renewal should produce a normal retryable WATCH conflict'
);
const heartbeatRetry = await renewedNightlyFence.watch(
  'nightly-heartbeat-retry'
);
await heartbeatRetry.multi();
await heartbeatRetry.set('nightly-heartbeat-retry', 'committed-once');
assert.ok((await heartbeatRetry.exec()).length > 0);
assert.equal(
  await renewedNightlyFenceStorage.get('nightly-heartbeat-retry'),
  'committed-once'
);
assert.equal(
  await dataDeletionCore.releaseNightlyPlayerMutation(
    renewedNightlyFenceStorage,
    renewedNightlyFenceLease.lease
  ),
  'released'
);

const ambiguousNightlyMutationStorage = createMemoryStorage();
const ambiguousNightlyMutationLease =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    ambiguousNightlyMutationStorage,
    'ambiguous-nightly-mutation-token'
  );
assert.equal(ambiguousNightlyMutationLease.status, 'acquired');
const ambiguousNightlyFence = nightlyStorageFence.createNightlyFencedStorage(
  ambiguousNightlyMutationStorage,
  ambiguousNightlyMutationLease.lease
);
const ambiguousNightlyIncrement = ambiguousNightlyMutationStorage.incrBy.bind(
  ambiguousNightlyMutationStorage
);
let ambiguousNightlyIncrementCalls = 0;
ambiguousNightlyMutationStorage.incrBy = async (...arguments_) => {
  ambiguousNightlyIncrementCalls += 1;
  const result = await ambiguousNightlyIncrement(...arguments_);
  throw new Error('Simulated direct mutation reply loss after commit.');
};
await assert.rejects(
  () => ambiguousNightlyFence.incrBy('ambiguous-nightly-counter', 1),
  /reply loss/,
  'an ambiguous EXEC reply must surface instead of replaying a mutation'
);
assert.equal(
  await ambiguousNightlyMutationStorage.get('ambiguous-nightly-counter'),
  '1',
  'ambiguous non-idempotent mutation must commit at most once'
);
assert.equal(
  ambiguousNightlyIncrementCalls,
  1,
  'a direct mutation reply loss must not replay the write'
);
assert.equal(
  await dataDeletionCore.releaseNightlyPlayerMutation(
    ambiguousNightlyMutationStorage,
    ambiguousNightlyMutationLease.lease
  ),
  'released'
);
const nightlyFenceLifecycleStorage = createMemoryStorage();
const completedNightlyFenceLifecycle =
  await nightlyStorageFence.runWithNightlyFence(
    nightlyFenceLifecycleStorage,
    'nightly-fence-lifecycle-token',
    async (storage) => {
      await storage.set('nightly:fence:lifecycle', 'completed');
      return 42;
    }
  );
assert.deepEqual(completedNightlyFenceLifecycle, {
  status: 'completed',
  result: 42,
});
assert.equal(
  await nightlyFenceLifecycleStorage.get(
    dataDeletionCore.getNightlyPlayerMutationLockKey()
  ),
  undefined,
  'nightly fence lifecycle must release its lease after success'
);
await assert.rejects(
  () =>
    nightlyStorageFence.runWithNightlyFence(
      nightlyFenceLifecycleStorage,
      'nightly-fence-error-token',
      async () => {
        throw new Error('simulated fenced operation failure');
      }
    ),
  /simulated fenced operation failure/
);
assert.equal(
  await nightlyFenceLifecycleStorage.get(
    dataDeletionCore.getNightlyPlayerMutationLockKey()
  ),
  undefined,
  'nightly fence lifecycle must release its lease after operation failure'
);

const queuedHeartbeatStorage = createMemoryStorage();
const queuedHeartbeatWatch = queuedHeartbeatStorage.watch.bind(
  queuedHeartbeatStorage
);
let queuedHeartbeatRenewals = 0;
queuedHeartbeatStorage.watch = async (...keys) => {
  const transaction = await queuedHeartbeatWatch(...keys);
  const expire = transaction.expire.bind(transaction);
  transaction.expire = async (key, seconds) => {
    if (key === dataDeletionCore.getNightlyPlayerMutationLockKey()) {
      queuedHeartbeatRenewals += 1;
    }
    return expire(key, seconds);
  };
  return transaction;
};
const queuedHeartbeatLease =
  await dataDeletionCore.acquireNightlyPlayerMutation(
    queuedHeartbeatStorage,
    'queued-heartbeat-token'
  );
assert.equal(queuedHeartbeatLease.status, 'acquired');
queuedHeartbeatRenewals = 0;
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
let queuedHeartbeatCallback;
globalThis.setInterval = (callback) => {
  queuedHeartbeatCallback = callback;
  return 1;
};
globalThis.clearInterval = () => {
  queueMicrotask(() => queuedHeartbeatCallback());
};
try {
  assert.equal(
    await dataDeletionCore.withNightlyPlayerMutationHeartbeat(
      queuedHeartbeatStorage,
      queuedHeartbeatLease.lease,
      async () => 'finished'
    ),
    'finished'
  );
  await new Promise((resolve) => setImmediate(resolve));
} finally {
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
}
assert.equal(
  queuedHeartbeatRenewals,
  1,
  'a heartbeat callback queued during shutdown must not append a late renewal'
);
assert.equal(
  await dataDeletionCore.releaseNightlyPlayerMutation(
    queuedHeartbeatStorage,
    queuedHeartbeatLease.lease
  ),
  'released'
);
pass('nightly fence rejects expiry and covers every storage mutator');

const staleNightlyWorkerStorage = createMemoryStorage();
const staleNightlyLease = await dataDeletionCore.acquireNightlyPlayerMutation(
  staleNightlyWorkerStorage,
  'stale-nightly-worker-token'
);
assert.equal(staleNightlyLease.status, 'acquired');
const fencedNightlyStorage = nightlyStorageFence.createNightlyFencedStorage(
  staleNightlyWorkerStorage,
  staleNightlyLease.lease
);
await fencedNightlyStorage.set('nightly:fence:before', 'committed');
assert.equal(
  await staleNightlyWorkerStorage.get('nightly:fence:before'),
  'committed'
);
const staleNightlyTransaction = await fencedNightlyStorage.watch(
  'nightly:fence:transaction'
);
await staleNightlyTransaction.multi();
await staleNightlyTransaction.set('nightly:fence:transaction', 'forbidden');

// Simulate lease expiry, then let deletion take over and advance the epoch.
await staleNightlyWorkerStorage.del(
  dataDeletionCore.getNightlyPlayerMutationLockKey()
);
const deletionAfterNightlyExpiry =
  await dataDeletionCore.acquirePlayerDataDeletion(
    staleNightlyWorkerStorage,
    'stale-nightly-deletion-player',
    'stale-nightly-deletion-token'
  );
assert.equal(deletionAfterNightlyExpiry.status, 'acquired');
assert.ok(
  deletionAfterNightlyExpiry.lease.generation > 0,
  'deletion takeover should own a new player generation'
);
await assert.rejects(
  () => staleNightlyTransaction.exec(),
  nightlyStorageFence.StaleNightlyWorkerError,
  'a transaction opened by the stale worker must abort after epoch takeover'
);
assert.equal(
  await staleNightlyWorkerStorage.get('nightly:fence:transaction'),
  undefined
);
await assert.rejects(
  () => fencedNightlyStorage.set('nightly:fence:after', 'forbidden'),
  nightlyStorageFence.StaleNightlyWorkerError,
  'direct stale-worker writes must fail after deletion advances the epoch'
);
await assert.rejects(
  () =>
    dailyJob.runNightlyArenaJob(fencedNightlyStorage, {
      force: true,
      now: new Date(Date.UTC(2026, 6, 13)),
      claimId: 'stale-nightly-worker-claim',
    }),
  nightlyStorageFence.StaleNightlyWorkerError,
  'a resumed stale nightly job must fail before its next Redis mutation'
);
assert.equal(
  await staleNightlyWorkerStorage.get('nightly:fence:after'),
  undefined
);
assert.equal(
  await dataDeletionCore.releasePlayerDataDeletion(
    staleNightlyWorkerStorage,
    deletionAfterNightlyExpiry.lease
  ),
  'released'
);
pass('monotonic epoch fences stale nightly workers after lease takeover');

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

const atomicSparRewardStorage = createMemoryStorage({
  throwAfterCommitNumber: 2,
});
const atomicSparWinner = makeScribbit({
  id: 'atomic-spar-winner',
  name: 'Atomic Spar Winner',
});
await scribbitCore.storeScribbit(
  atomicSparRewardStorage,
  'atomic-spar-owner',
  atomicSparWinner
);
const recoveredAtomicSparReward = await scribbitCore.claimAndAwardDailySparWin(
  atomicSparRewardStorage,
  {
    userId: 'atomic-spar-owner',
    scribbitId: atomicSparWinner.id,
    utcDateKey: '20260707',
    reportId: 'atomic-spar-report',
    inkAmount: arena.INK_REWARDS.sparWin,
  }
);
assert.deepEqual(
  recoveredAtomicSparReward,
  {
    status: 'already-awarded-this-report',
    receipt: {
      version: 1,
      reportId: 'atomic-spar-report',
      scribbitId: atomicSparWinner.id,
      xpAwarded: 1,
      inkAwarded: arena.INK_REWARDS.sparWin,
      xpBefore: 0,
      xpAfter: 1,
      levelBefore: 1,
      levelAfter: 1,
    },
  },
  'an ambiguous transaction reply must recover the exact reward receipt'
);
assert.deepEqual(
  await scribbitCore.claimAndAwardDailySparWin(atomicSparRewardStorage, {
    userId: 'atomic-spar-owner',
    scribbitId: atomicSparWinner.id,
    utcDateKey: '20260707',
    reportId: 'atomic-spar-report',
    inkAmount: arena.INK_REWARDS.sparWin,
  }),
  recoveredAtomicSparReward
);
assert.deepEqual(
  await scribbitCore.claimAndAwardDailySparWin(atomicSparRewardStorage, {
    userId: 'atomic-spar-owner',
    scribbitId: atomicSparWinner.id,
    utcDateKey: '20260707',
    reportId: 'different-spar-report',
    inkAmount: arena.INK_REWARDS.sparWin,
  }),
  { status: 'already-claimed', receipt: null }
);
assert.equal(
  (
    await scribbitCore.loadScribbit(
      atomicSparRewardStorage,
      atomicSparWinner.id,
      '20260707'
    )
  )?.xp,
  1
);
assert.equal(
  await inkStore.getInkBalance(atomicSparRewardStorage, 'atomic-spar-owner'),
  arena.INK_REWARDS.sparWin
);
pass('daily spar XP and Ink commit atomically with one recoverable receipt');

for (const failedCommandIndex of [0, 1, 2]) {
  const partialSparRewardStorage = createMemoryStorage({
    failCommandAtIndexOnce: failedCommandIndex,
  });
  const ownerId = `partial-spar-owner-${failedCommandIndex}`;
  const reportId = `partial-spar-report-${failedCommandIndex}`;
  const winner = makeScribbit({
    id: `partial-spar-winner-${failedCommandIndex}`,
    name: `Partial Spar Winner ${failedCommandIndex}`,
  });
  await partialSparRewardStorage.set(
    scribbitCore.getScribbitKey(winner.id),
    JSON.stringify(winner)
  );

  const repairedReward = await scribbitCore.claimAndAwardDailySparWin(
    partialSparRewardStorage,
    {
      userId: ownerId,
      scribbitId: winner.id,
      utcDateKey: '20260708',
      reportId,
      inkAmount: arena.INK_REWARDS.sparWin,
    }
  );
  const expectedReceipt = {
    version: 1,
    reportId,
    scribbitId: winner.id,
    xpAwarded: 1,
    inkAwarded: arena.INK_REWARDS.sparWin,
    xpBefore: 0,
    xpAfter: 1,
    levelBefore: 1,
    levelAfter: 1,
  };
  assert.deepEqual(repairedReward, {
    status: 'awarded',
    receipt: expectedReceipt,
  });
  assert.equal(
    (
      await scribbitCore.loadScribbit(
        partialSparRewardStorage,
        winner.id,
        '20260708'
      )
    )?.xp,
    1,
    `failed EXEC command ${failedCommandIndex} must repair Scribbit XP`
  );
  assert.equal(
    await inkStore.getInkBalance(partialSparRewardStorage, ownerId),
    arena.INK_REWARDS.sparWin,
    `failed EXEC command ${failedCommandIndex} must repair Ink exactly once`
  );
  assert.deepEqual(
    JSON.parse(
      await partialSparRewardStorage.hGet(
        scribbitCore.getUserDailySparWinRewardsKey(ownerId),
        '20260708'
      )
    ),
    expectedReceipt,
    `failed EXEC command ${failedCommandIndex} must repair the receipt`
  );
  assert.deepEqual(
    await scribbitCore.claimAndAwardDailySparWin(partialSparRewardStorage, {
      userId: ownerId,
      scribbitId: winner.id,
      utcDateKey: '20260708',
      reportId,
      inkAmount: arena.INK_REWARDS.sparWin,
    }),
    {
      status: 'already-awarded-this-report',
      receipt: expectedReceipt,
    },
    `failed EXEC command ${failedCommandIndex} must stay idempotent`
  );
}
pass(
  'partial daily spar EXEC failures repair every reward surface exactly once'
);

const concurrentAfterSuccessStorage = createMemoryStorage();
const concurrentAfterSuccessOwnerId = 'concurrent-after-success-owner';
const concurrentAfterSuccessReportId = 'concurrent-after-success-report';
const concurrentAfterSuccessWinner = makeScribbit({
  id: 'concurrent-after-success-winner',
});
const concurrentAfterSuccessInkKey = inkStore.getInkKey(
  concurrentAfterSuccessOwnerId
);
await concurrentAfterSuccessStorage.set(
  scribbitCore.getScribbitKey(concurrentAfterSuccessWinner.id),
  JSON.stringify(concurrentAfterSuccessWinner)
);
const originalConcurrentAfterSuccessWatch =
  concurrentAfterSuccessStorage.watch.bind(concurrentAfterSuccessStorage);
let injectAfterSuccessfulSparCommit = true;
concurrentAfterSuccessStorage.watch = async (...keys) => {
  const transaction = await originalConcurrentAfterSuccessWatch(...keys);
  const originalExec = transaction.exec.bind(transaction);
  return {
    ...transaction,
    async exec() {
      const result = await originalExec();
      if (injectAfterSuccessfulSparCommit) {
        injectAfterSuccessfulSparCommit = false;
        await concurrentAfterSuccessStorage.set(
          concurrentAfterSuccessInkKey,
          '7'
        );
      }
      return result;
    },
  };
};
const concurrentAfterSuccessResult =
  await scribbitCore.claimAndAwardDailySparWin(concurrentAfterSuccessStorage, {
    userId: concurrentAfterSuccessOwnerId,
    scribbitId: concurrentAfterSuccessWinner.id,
    utcDateKey: '20260710',
    reportId: concurrentAfterSuccessReportId,
    inkAmount: arena.INK_REWARDS.sparWin,
  });
assert.equal(concurrentAfterSuccessResult.status, 'awarded');
assert.equal(
  concurrentAfterSuccessResult.receipt?.reportId,
  concurrentAfterSuccessReportId
);
assert.equal(
  await concurrentAfterSuccessStorage.hGet(
    scribbitCore.getUserDailySparWinRewardsKey(concurrentAfterSuccessOwnerId),
    '20260710'
  ),
  JSON.stringify(concurrentAfterSuccessResult.receipt),
  'a successful EXEC must keep its verified receipt despite later economy activity'
);
assert.equal(
  await inkStore.getInkBalance(
    concurrentAfterSuccessStorage,
    concurrentAfterSuccessOwnerId
  ),
  7,
  'a legitimate post-commit Ink change must not be mistaken for a partial reward'
);
pass(
  'successful Spar EXEC results survive immediate concurrent economy activity'
);

const conflictingSparRewardStorage = createMemoryStorage({
  failCommandAtIndexOnce: 0,
});
const conflictingSparOwnerId = 'conflicting-spar-owner';
const conflictingSparReportId = 'conflicting-spar-report';
const conflictingSparWinner = makeScribbit({
  id: 'conflicting-spar-winner',
});
const conflictingSparInkKey = inkStore.getInkKey(conflictingSparOwnerId);
await conflictingSparRewardStorage.set(
  scribbitCore.getScribbitKey(conflictingSparWinner.id),
  JSON.stringify(conflictingSparWinner)
);
const originalConflictingSparWatch = conflictingSparRewardStorage.watch.bind(
  conflictingSparRewardStorage
);
let injectConflictingSparMutation = true;
conflictingSparRewardStorage.watch = async (...keys) => {
  const transaction = await originalConflictingSparWatch(...keys);
  const originalExec = transaction.exec.bind(transaction);
  return {
    ...transaction,
    async exec() {
      const result = await originalExec();
      if (injectConflictingSparMutation) {
        injectConflictingSparMutation = false;
        await conflictingSparRewardStorage.set(conflictingSparInkKey, '999');
      }
      return result;
    },
  };
};
await assert.rejects(
  scribbitCore.claimAndAwardDailySparWin(conflictingSparRewardStorage, {
    userId: conflictingSparOwnerId,
    scribbitId: conflictingSparWinner.id,
    utcDateKey: '20260710',
    reportId: conflictingSparReportId,
    inkAmount: arena.INK_REWARDS.sparWin,
  }),
  /could not be repaired safely/,
  'conflicting state after a partial EXEC must fail instead of trusting the receipt alone'
);
assert.equal(
  await conflictingSparRewardStorage.hGet(
    scribbitCore.getUserDailySparWinRewardsKey(conflictingSparOwnerId),
    '20260710'
  ),
  `report:${conflictingSparReportId}`,
  'an unverifiable partial reward must be quarantined without a payout receipt'
);
assert.deepEqual(
  await scribbitCore.claimAndAwardDailySparWin(conflictingSparRewardStorage, {
    userId: conflictingSparOwnerId,
    scribbitId: conflictingSparWinner.id,
    utcDateKey: '20260710',
    reportId: conflictingSparReportId,
    inkAmount: arena.INK_REWARDS.sparWin,
  }),
  { status: 'already-awarded-this-report', receipt: null },
  'a quarantined reward must stay idempotent without reporting an unverifiable payout'
);
pass(
  'conflicting partial Spar rewards fail closed and quarantine their receipt'
);

const legacySparRewardStorage = createMemoryStorage();
const legacySparWinner = makeScribbit({ id: 'legacy-spar-winner' });
await legacySparRewardStorage.set(
  scribbitCore.getScribbitKey(legacySparWinner.id),
  JSON.stringify(legacySparWinner)
);
await legacySparRewardStorage.hSet(
  scribbitCore.getUserDailySparWinRewardsKey('legacy-spar-owner'),
  { '20260709': 'report:legacy-spar-report' }
);
assert.deepEqual(
  await scribbitCore.claimAndAwardDailySparWin(legacySparRewardStorage, {
    userId: 'legacy-spar-owner',
    scribbitId: legacySparWinner.id,
    utcDateKey: '20260709',
    reportId: 'legacy-spar-report',
    inkAmount: arena.INK_REWARDS.sparWin,
  }),
  { status: 'already-awarded-this-report', receipt: null },
  'legacy report markers must not synthesize modern reward state'
);
assert.deepEqual(
  await scribbitCore.claimAndAwardDailySparWin(legacySparRewardStorage, {
    userId: 'legacy-spar-owner',
    scribbitId: legacySparWinner.id,
    utcDateKey: '20260709',
    reportId: 'different-legacy-spar-report',
    inkAmount: arena.INK_REWARDS.sparWin,
  }),
  { status: 'already-claimed', receipt: null }
);
assert.equal(
  (
    await scribbitCore.loadScribbit(
      legacySparRewardStorage,
      legacySparWinner.id,
      '20260709'
    )
  )?.xp,
  0
);
assert.equal(
  await inkStore.getInkBalance(legacySparRewardStorage, 'legacy-spar-owner'),
  0
);
pass('legacy daily spar markers remain idempotent without guessed payouts');

const dayMathStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(dayMathStorage, 2);
const dayTwoUtc = new Date(Date.UTC(2026, 6, 5));
const skippedJob = await dailyJob.runNightlyArenaJobForTesting(dayMathStorage, {
  now: dayTwoUtc,
});
assert.equal(skippedJob.skipped, true, 'stored canonical day should no-op');
assert.equal(skippedJob.newDay, 2, 'no-op should not advance day');
assert.equal(
  await arenaStore.ensureCurrentArenaDay(dayMathStorage, dayTwoUtc),
  2,
  'no-op should keep stored day'
);
const activeSubmissionNightlyStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(activeSubmissionNightlyStorage, 2);
await activeSubmissionNightlyStorage.zAdd(
  arenaStore.getActiveScribbitSubmissionsKey(2),
  { member: 'active-before-nightly', score: dayTwoUtc.getTime() + 60_000 }
);
await assert.rejects(
  dailyJob.runNightlyArenaJobForTesting(activeSubmissionNightlyStorage, {
    now: dayTwoUtc,
    force: true,
  }),
  /already being resolved/,
  'nightly must wait while any registered Scribbit birth can still repair'
);
assert.equal(
  await arenaStore.ensureCurrentArenaDay(
    activeSubmissionNightlyStorage,
    dayTwoUtc
  ),
  2
);
pass('nightly resolution waits for active Scribbit submission leases');

const failedNightlyClaimStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(failedNightlyClaimStorage, 2);
const failedClaimEntrantBeforeResolution = makeScribbit({
  id: 'failed-nightly-claim-entry',
  expiresDay: 8,
});
await scribbitCore.storeScribbit(
  failedNightlyClaimStorage,
  'failed-nightly-claim-owner',
  failedClaimEntrantBeforeResolution
);
await scribbitCore.addRumbleEntrant(
  failedNightlyClaimStorage,
  2,
  failedClaimEntrantBeforeResolution.id
);
const baseFailedNightlyClaimWatch = failedNightlyClaimStorage.watch.bind(
  failedNightlyClaimStorage
);
failedNightlyClaimStorage.watch = async (...keys) => {
  const transaction = await baseFailedNightlyClaimWatch(...keys);
  if (
    keys.includes(arenaStore.getNightlyResolutionClaimsKey()) &&
    keys.includes(arenaStore.getActiveScribbitSubmissionsKey(2))
  ) {
    transaction.exec = async () => {
      await transaction.discard();
      return [new Error('Simulated nightly claim HSET failure.')];
    };
  }
  return transaction;
};
await assert.rejects(
  dailyJob.runNightlyArenaJobForTesting(failedNightlyClaimStorage, {
    now: dayTwoUtc,
    force: true,
  }),
  /Nightly resolution claim command failed/,
  'nightly must not resolve entrants when its distributed claim command fails'
);
assert.equal(
  await arenaStore.ensureCurrentArenaDay(failedNightlyClaimStorage, dayTwoUtc),
  2,
  'a failed nightly claim must not advance the arena day'
);
const failedClaimEntrant = await scribbitCore.loadScribbit(
  failedNightlyClaimStorage,
  failedClaimEntrantBeforeResolution.id
);
assert.equal(failedClaimEntrant.wins + failedClaimEntrant.losses, 0);
pass('nightly fails closed when its distributed claim command errors');

const replyLossNightlyClaimStorage = createMemoryStorage({
  throwAfterCommitNumber: 2,
});
await arenaStore.setCurrentArenaDay(replyLossNightlyClaimStorage, 2);
const replyLossNightlyClaimEntrant = makeScribbit({
  id: 'reply-loss-nightly-claim-entry',
  expiresDay: 8,
});
await scribbitCore.storeScribbit(
  replyLossNightlyClaimStorage,
  'reply-loss-nightly-claim-owner',
  replyLossNightlyClaimEntrant
);
await scribbitCore.addRumbleEntrant(
  replyLossNightlyClaimStorage,
  2,
  replyLossNightlyClaimEntrant.id
);
const replyLossNightlyClaimJob = await dailyJob.runNightlyArenaJobForTesting(
  replyLossNightlyClaimStorage,
  {
    now: dayTwoUtc,
    force: true,
  }
);
assert.equal(replyLossNightlyClaimJob.skipped, false);
assert.equal(replyLossNightlyClaimJob.resolvedDay, 2);
assert.equal(
  await replyLossNightlyClaimStorage.hGet(
    arenaStore.getNightlyResolutionClaimsKey(),
    '2'
  ),
  undefined,
  'a recovered claim must release only its exact owner value'
);
const resolvedReplyLossClaimEntrant = await scribbitCore.loadScribbit(
  replyLossNightlyClaimStorage,
  replyLossNightlyClaimEntrant.id
);
assert.ok(
  resolvedReplyLossClaimEntrant.wins + resolvedReplyLossClaimEntrant.losses > 0
);
pass('nightly recovers its exact claim after an EXEC reply is lost');

const fallbackNightlyClaimStorage = createMemoryStorage();
await arenaStore.setCurrentArenaDay(fallbackNightlyClaimStorage, 2);
const fallbackNightlyClaimEntrant = makeScribbit({
  id: 'fallback-nightly-claim-entry',
  expiresDay: 8,
});
await scribbitCore.storeScribbit(
  fallbackNightlyClaimStorage,
  'fallback-nightly-claim-owner',
  fallbackNightlyClaimEntrant
);
await scribbitCore.addRumbleEntrant(
  fallbackNightlyClaimStorage,
  2,
  fallbackNightlyClaimEntrant.id
);
const fallbackNightlyClaimWatch = fallbackNightlyClaimStorage.watch.bind(
  fallbackNightlyClaimStorage
);
let forcedNightlyClaimReleaseConflicts = 0;
fallbackNightlyClaimStorage.watch = async (...keys) => {
  const transaction = await fallbackNightlyClaimWatch(...keys);
  const discard = transaction.discard.bind(transaction);
  const exec = transaction.exec.bind(transaction);
  const hDel = transaction.hDel.bind(transaction);
  let queuesClaimRelease = false;
  transaction.hDel = async (key, fields) => {
    if (
      key === arenaStore.getNightlyResolutionClaimsKey() &&
      fields.includes('2')
    ) {
      queuesClaimRelease = true;
    }
    return hDel(key, fields);
  };
  transaction.exec = async () => {
    if (!queuesClaimRelease) return exec();
    forcedNightlyClaimReleaseConflicts += 1;
    await discard();
    return [];
  };
  return transaction;
};
const fallbackNightlyClaimWarnings = [];
const originalNightlyClaimConsoleWarn = console.warn;
console.warn = (...values) => fallbackNightlyClaimWarnings.push(values);
let fallbackNightlyClaimJob;
try {
  fallbackNightlyClaimJob = await dailyJob.runNightlyArenaJobForTesting(
    fallbackNightlyClaimStorage,
    { now: dayTwoUtc, force: true }
  );
} finally {
  console.warn = originalNightlyClaimConsoleWarn;
}
assert.equal(fallbackNightlyClaimJob.resolvedDay, 2);
assert.equal(
  forcedNightlyClaimReleaseConflicts,
  storageCore.MAX_WATCH_TRANSACTION_ATTEMPTS
);
assert.equal(fallbackNightlyClaimWarnings.length, 1);
assert.equal(
  await fallbackNightlyClaimStorage.hGet(
    arenaStore.getNightlyResolutionClaimsKey(),
    '2'
  ),
  undefined
);
pass('nightly owner fallback clears a claim after repeated release conflicts');

const forcedJob = await dailyJob.runNightlyArenaJobForTesting(dayMathStorage, {
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
await dailyJob.runNightlyArenaJobForTesting(singleNightlyStorage, {
  now: nightlyLockNow,
});
const expectedNightlyRecord = await scribbitCore.loadScribbit(
  singleNightlyStorage,
  'concurrent-lock-entry'
);
const concurrentNightlyStorage = await prepareNightlyLockStorage();
const concurrentNightlyRuns = await Promise.allSettled([
  dailyJob.runNightlyArenaJobForTesting(concurrentNightlyStorage, {
    now: nightlyLockNow,
  }),
  dailyJob.runNightlyArenaJobForTesting(concurrentNightlyStorage, {
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
const caughtUpJob = await dailyJob.runNightlyArenaJobForTesting(
  catchUpStorage,
  {
    now: new Date(Date.UTC(2026, 6, 7)),
  }
);
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
const recoveredOutboxJob = await dailyJob.runNightlyArenaJobForTesting(
  catchUpStorage,
  {
    now: new Date(Date.UTC(2026, 6, 7)),
  }
);
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
const cloutPayoutJob = await dailyJob.runNightlyArenaJobForTesting(
  cloutPayoutStorage,
  {
    now: dayTwoUtc,
    force: true,
  }
);
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

const clonedTerminalScribbit = arena.cloneScribbit(faded);
for (const [sourceBranch, clonedBranch, branchName] of [
  [faded.stats, clonedTerminalScribbit.stats, 'stats'],
  [faded.accessories, clonedTerminalScribbit.accessories, 'accessories'],
  [faded.upgrades, clonedTerminalScribbit.upgrades, 'upgrades'],
  [faded.legacy, clonedTerminalScribbit.legacy, 'legacy'],
  [
    faded.legacy.creatorTitle,
    clonedTerminalScribbit.legacy.creatorTitle,
    'legacy title',
  ],
  [
    faded.legacy.accessories,
    clonedTerminalScribbit.legacy.accessories,
    'legacy accessories',
  ],
  [
    faded.legacy.upgrades,
    clonedTerminalScribbit.legacy.upgrades,
    'legacy upgrades',
  ],
]) {
  assert.notEqual(
    sourceBranch,
    clonedBranch,
    `${branchName} must not alias the source Scribbit`
  );
}
clonedTerminalScribbit.stats.chonk = 999;
clonedTerminalScribbit.accessories.push('mutated-accessory');
clonedTerminalScribbit.upgrades[0].id = 'mutated-upgrade';
clonedTerminalScribbit.legacy.creatorTitle.name = 'Mutated title';
clonedTerminalScribbit.legacy.accessories[0].name = 'Mutated accessory';
clonedTerminalScribbit.legacy.upgrades[0].id = 'mutated-legacy-upgrade';
assert.notEqual(faded.stats.chonk, 999);
assert.equal(faded.accessories.includes('mutated-accessory'), false);
assert.notEqual(faded.upgrades[0].id, 'mutated-upgrade');
assert.equal(faded.legacy.creatorTitle.name, 'Doodler');
assert.equal(faded.legacy.accessories[0].name, 'Beanie');
assert.equal(faded.legacy.upgrades[0].id, 'v1-thick-paper');

const terminalBattleSnapshot = battle.simulate(
  faded,
  alpha,
  20_260_713,
  forecast,
  'exhibition'
);
assert.notEqual(terminalBattleSnapshot.a.legacy, faded.legacy);
terminalBattleSnapshot.a.legacy.creatorTitle.name = 'Report mutation';
assert.equal(
  faded.legacy.creatorTitle.name,
  'Doodler',
  'battle snapshots must not alias terminal fighter history'
);
const clonedRumbleEntrants = rumble.prepareRumbleEntrants([alpha], 20_260_713);
const clonedRumbleAlpha = clonedRumbleEntrants.find(
  ({ id }) => id === alpha.id
);
assert.ok(clonedRumbleAlpha);
assert.notEqual(clonedRumbleAlpha, alpha);
assert.notEqual(clonedRumbleAlpha.stats, alpha.stats);
clonedRumbleAlpha.stats.chonk = 999;
assert.notEqual(alpha.stats.chonk, 999);
pass('one full Scribbit clone isolates storage, battle, Rumble, and founders');

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
  legacyCore.getLegacyIndexVersionKey('legacy-deck-owner')
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

const deepLegacyStorage = createMemoryStorage();
for (let index = 0; index < 70; index += 1) {
  const archived = scribbitCore.resolveExpiredScribbitStatus(
    makeScribbit({
      id: `deep-legacy-${String(index + 1).padStart(3, '0')}`,
      bornDay: index + 1,
      expiresDay: index + 4,
    })
  );
  await scribbitCore.storeScribbit(
    deepLegacyStorage,
    'deep-legacy-owner',
    archived
  );
}
await deepLegacyStorage.set(
  legacyCore.getLegacyIndexVersionKey('deep-legacy-owner'),
  '1'
);
await deepLegacyStorage.zRem(
  scribbitCore.getUserLegacyCardsKey('deep-legacy-owner'),
  ['deep-legacy-030']
);
const recoveredDeepV1Page = await legacyCore.loadLegacyCardPage(
  deepLegacyStorage,
  'deep-legacy-owner',
  'v1|33|deep-legacy-030',
  3
);
assert.deepEqual(
  recoveredDeepV1Page.cards.map(({ id }) => id),
  ['deep-legacy-029', 'deep-legacy-028', 'deep-legacy-027'],
  'a deleted V1 anchor deeper than the newest recovery window must resume exactly'
);
const scoreMismatchedAnchorPage = await legacyCore.loadLegacyCardPage(
  deepLegacyStorage,
  'deep-legacy-owner',
  'v2|33|29|deep-legacy-040',
  2
);
assert.deepEqual(
  scoreMismatchedAnchorPage.cards.map(({ id }) => id),
  ['deep-legacy-029', 'deep-legacy-028'],
  'production must position a score-mismatched member by the cursor tuple, like the mock'
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
assert.equal(
  (
    await scribbitCore.applyDailyBelief(terminalMutationStorage, {
      scribbitId: faded.id,
      userId: 'terminal-backer',
      utcDateKey: '20260712',
      currentArenaDay: faded.expiresDay,
      operationId: 'terminal-belief-operation',
    })
  ).status,
  'target-unavailable'
);
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
  standingRetryResult?.status,
  'alive',
  'reaching the maturity day must keep the Scribbit playable'
);
assert.equal(
  standingRetryResult?.legacy,
  null,
  'maturity alone must not create an archived Legacy Card'
);
pass('Rumble standing receipt commits atomically across maturity');

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
  scribbitCore.retireOwnedScribbit(
    titleRetryStorage,
    'title-retry-owner',
    titleRetrySource.id,
    4,
    {
      getCreatorTitleWatchKey: inkStore.getInventoryKey,
      getCreatorTitle: async () => {
        throw new Error('temporary inventory read failure');
      },
    }
  ),
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
await scribbitCore.retireOwnedScribbit(
  titleRetryStorage,
  'title-retry-owner',
  titleRetrySource.id,
  4,
  {
    getCreatorTitleWatchKey: inkStore.getInventoryKey,
    getCreatorTitle: async () => ({
      id: 'brushlord',
      name: 'Brushlord',
      rarity: 'rare',
    }),
  }
);
assert.equal(
  (await scribbitCore.loadScribbit(titleRetryStorage, titleRetrySource.id))
    ?.legacy?.creatorTitle?.id,
  'brushlord',
  'successful retry should preserve the equipped creator title'
);
pass('retirement title snapshot failures retry without data loss');

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
await scribbitCore.retireOwnedScribbit(
  titleChangeRaceStorage,
  'title-change-race-owner',
  titleChangeRaceSource.id,
  4,
  {
    getCreatorTitleWatchKey: inkStore.getInventoryKey,
    getCreatorTitle: async () => {
      titleSnapshotReadCount += 1;
      return titleSnapshotReadCount === 1
        ? { id: 'doodler', name: 'Doodler', rarity: 'common' }
        : { id: 'brushlord', name: 'Brushlord', rarity: 'rare' };
    },
  }
);
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
pass('retirement title snapshots retry concurrent inventory changes');

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
const expiryOrderJob = await dailyJob.runNightlyArenaJobForTesting(
  expiryOrderStorage,
  {
    now: dayTwoUtc,
    force: true,
  }
);
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
assert.equal(
  expiredAfterFight.status,
  'alive',
  'day-N maturity should keep the Scribbit playable after day N-1 rumble'
);
assert.ok(
  expiredAfterFight.wins + expiredAfterFight.losses > 0,
  'day-3 entrant should get final fight before expiry'
);
assert.equal(
  expiredAfterFight.legacy,
  null,
  'maturity should not freeze a Legacy Card before retirement'
);
await inkStore.setEquippedTitle(expiryOrderStorage, 'owner-one', null);
assert.equal(
  (await scribbitCore.loadScribbit(expiryOrderStorage, expiringEntrant.id))
    ?.status,
  'alive',
  'changing the profile title must not affect mature lifecycle state'
);
pass('nightly job resolves rumble before maturity');

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

cleanupTestTemporaryRoot();
process.removeListener('exit', cleanupTestTemporaryRoot);
console.log(
  `Scribbits Arena simulation tests passed (${passedChecks.length} groups): ${passedChecks.join('; ')}.`
);
