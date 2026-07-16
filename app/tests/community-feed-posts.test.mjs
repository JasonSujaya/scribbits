import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { createMemoryStorage } from './support/memory-storage.mjs';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;
if (!compiledSharedRoot || !compiledServerRoot) {
  throw new Error('Run community feed tests through run-test-suites.mjs.');
}

const require = createRequire(import.meta.url);
const communityFeed = require(join(compiledSharedRoot, 'communityfeed.js'));
const communityPostCandidates = require(
  join(compiledServerRoot, 'core', 'communityPostCandidates.js')
);

const createBattleReport = ({
  id,
  damageA,
  damageB,
  healthA,
  healthB,
  completedTick,
}) => ({
  id,
  kind: 'rumble',
  day: 7,
  a: { id: `${id}-a`, name: `${id} Alpha` },
  b: { id: `${id}-b`, name: `${id} Beta` },
  winner: healthA >= healthB ? 'a' : 'b',
  simulation: {
    result: {
      reason: 'knockout',
      completedTick,
      completedMilliseconds: completedTick * 50,
      fighters: [
        { damageDealt: damageA, hitPointPermille: healthA },
        { damageDealt: damageB, hitPointPermille: healthB },
      ],
    },
  },
});

test('weekly feature selects total damage, then closeness, deterministically', () => {
  const lowerDamage = createBattleReport({
    id: 'lower-damage',
    damageA: 40,
    damageB: 40,
    healthA: 500,
    healthB: 490,
    completedTick: 300,
  });
  const widerFinish = createBattleReport({
    id: 'wider-finish',
    damageA: 60,
    damageB: 40,
    healthA: 800,
    healthB: 100,
    completedTick: 300,
  });
  const closerFinish = createBattleReport({
    id: 'closer-finish',
    damageA: 55,
    damageB: 45,
    healthA: 510,
    healthB: 500,
    completedTick: 250,
  });

  assert.equal(
    communityFeed.selectStrongestFight([lowerDamage, widerFinish, closerFinish])
      .id,
    'closer-finish'
  );
  assert.equal(communityFeed.selectStrongestFight([]), null);
});

test('nightly resolution retains one strongest-fight candidate per recent day', async () => {
  const memory = createMemoryStorage({
    hashes: {
      [communityPostCandidates.getDailyStrongestFightKey()]: {
        1: 'expired-fight',
      },
    },
  });
  const strongestFight = createBattleReport({
    id: 'day-31-strongest',
    damageA: 70,
    damageB: 60,
    healthA: 400,
    healthB: 0,
    completedTick: 240,
  });

  await communityPostCandidates.recordDailyStrongestFight(memory.storage, 31, [
    createBattleReport({
      id: 'day-31-lighter',
      damageA: 20,
      damageB: 30,
      healthA: 0,
      healthB: 700,
      completedTick: 100,
    }),
    strongestFight,
  ]);

  assert.equal(
    await memory.storage.hGet(
      communityPostCandidates.getDailyStrongestFightKey(),
      '31'
    ),
    strongestFight.id
  );
  assert.equal(
    await memory.storage.hGet(
      communityPostCandidates.getDailyStrongestFightKey(),
      '1'
    ),
    undefined
  );
});

test('one arena update combines theme, season, event, and final changes', () => {
  const draft = communityFeed.buildArenaUpdateDraft({
    arenaDay: 61,
    appUrl: 'https://reddit.com/r/scribbits/comments/main',
    themePool: [
      { id: 'bear', prompt: 'a bear with honey', category: 'animal' },
      { id: 'robot', prompt: 'a dancing robot', category: 'character' },
    ],
    startingSeason: {
      name: 'Season 2',
      campaignName: 'Ink Rising',
      startArenaDay: 61,
      endArenaDay: 120,
    },
    finalizedSeason: {
      name: 'Season 1',
      winnerUsername: 'champion',
      winnerScore: 42,
    },
    startingEvents: [
      { name: 'Opening Rumble', seasonName: 'Season 2', scoreMultiplier: 2 },
    ],
    endedEvents: [],
  });

  assert.equal(draft.id, 'arena-update:61');
  assert.match(draft.title, /Season 2 begins/);
  assert.match(draft.body, /u\/champion takes the crown with 42 points/);
  assert.match(draft.body, /a bear with honey/);
  assert.match(draft.body, /2\u00d7 points/);
  assert.match(draft.body, /Open Scribbits and join in/);
});

test('weekly fight post reports the selected fight truthfully', () => {
  const report = createBattleReport({
    id: 'weekly-winner',
    damageA: 70,
    damageB: 55,
    healthA: 400,
    healthB: 0,
    completedTick: 240,
  });
  const draft = communityFeed.buildWeeklyFightDraft(
    report,
    1,
    7,
    'https://reddit.com/r/scribbits/comments/main'
  );

  assert.equal(draft.id, 'fight-of-the-week:1-7');
  assert.match(draft.title, /weekly-winner Alpha vs weekly-winner Beta/);
  assert.match(draft.body, /125 total damage/);
  assert.match(draft.body, /12 seconds/);
  assert.match(draft.body, /won by knockout/);
});
