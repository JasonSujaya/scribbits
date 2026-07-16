import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;
const compiledServerRoot = process.env.SCRIBBITS_COMPILED_SERVER_ROOT;

if (!appRoot || !compiledSharedRoot || !compiledServerRoot) {
  throw new Error(
    'Run community Draw theme tests through run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const themes = require(
  join(compiledSharedRoot, 'content', 'communitydrawthemes.js')
);
const scribbits = require(join(compiledServerRoot, 'core', 'scribbit.js'));
const communityThemeProgress = require(
  join(compiledServerRoot, 'core', 'communityDrawTheme.js')
);

test('five-theme pools rotate every three days with stable player assignments', () => {
  const firstPool = themes.selectCommunityDoodleDarePool(1);
  const themeAppearances = new Map();
  const allThemes = themes.COMMUNITY_DRAW_THEME_SEASONS.flatMap(
    (season) => season.themes
  );

  assert.equal(themes.COMMUNITY_DRAW_THEME_DAYS, 3);
  assert.equal(themes.COMMUNITY_DRAW_THEME_POOL_SIZE, 5);
  assert.equal(themes.COMMUNITY_DRAW_THEME_COUNT, 125);
  assert.equal(themes.COMMUNITY_DRAW_THEME_COVERAGE_DAYS, 375);
  assert.deepEqual(themes.COMMUNITY_DRAW_THEME_CATEGORY_COUNTS, {
    animal: 37,
    character: 14,
    'place-nature': 25,
    vehicle: 8,
    food: 12,
    object: 29,
  });
  assert.equal(firstPool.length, 5);
  assert.equal(new Set(firstPool.map((theme) => theme.id)).size, 5);
  assert.ok(Object.isFrozen(firstPool));
  assert.deepEqual(themes.selectCommunityDoodleDarePool(2), firstPool);
  assert.deepEqual(themes.selectCommunityDoodleDarePool(3), firstPool);
  assert.notDeepEqual(themes.selectCommunityDoodleDarePool(4), firstPool);
  assert.deepEqual(
    themes.selectCommunityDoodleDarePool(4),
    themes.selectCommunityDoodleDarePool(6)
  );

  const playerTheme = themes.selectCommunityDoodleDare(1, 'player-42');
  assert.equal(
    themes.selectCommunityDoodleDare(2, 'PLAYER-42').id,
    playerTheme.id
  );
  assert.equal(
    themes.selectCommunityDoodleDare(3, ' player-42 ').id,
    playerTheme.id
  );
  assert.ok(firstPool.some((theme) => theme.id === playerTheme.id));
  const playerThemeOrder = Array.from({ length: 5 }, (_, completedDrawCount) =>
    themes.selectCommunityDoodleDare(1, 'player-42', completedDrawCount)
  );
  assert.equal(new Set(playerThemeOrder.map((theme) => theme.id)).size, 5);
  assert.notEqual(playerThemeOrder[0].id, playerThemeOrder[1].id);
  assert.equal(
    themes.selectCommunityDoodleDare(2, 'player-42', 1).id,
    playerThemeOrder[1].id
  );
  assert.equal(
    themes.selectCommunityDoodleDare(1, 'player-42', 5).id,
    playerThemeOrder[0].id
  );
  assert.equal(
    new Set(
      Array.from(
        { length: 100 },
        (_, index) => themes.selectCommunityDoodleDare(1, `player-${index}`).id
      )
    ).size,
    5
  );

  for (let blockStart = 1; blockStart <= 373; blockStart += 3) {
    const pool = themes.selectCommunityDoodleDarePool(blockStart);
    assert.equal(pool.length, 5);
    assert.equal(new Set(pool.map((theme) => theme.id)).size, 5);
    assert.ok(
      new Set(pool.map((theme) => theme.category)).size >= 4,
      `Arena day ${blockStart} should span at least four subject categories`
    );
    assert.ok(
      pool.filter((theme) => theme.category === 'animal').length <= 2,
      `Arena day ${blockStart} should contain at most two animals`
    );
    for (let day = blockStart; day <= blockStart + 2; day += 1) {
      assert.deepEqual(themes.selectCommunityDoodleDarePool(day), pool);
      assert.equal(
        themes.selectCommunityDoodleDare(day, 'stable-player').id,
        themes.selectCommunityDoodleDare(blockStart, 'stable-player').id
      );
    }
    for (const theme of pool) {
      themeAppearances.set(theme.id, (themeAppearances.get(theme.id) ?? 0) + 1);
    }
  }
  assert.equal(themeAppearances.size, 125);
  assert.ok([...themeAppearances.values()].every((count) => count === 5));
  assert.throws(
    () => themes.selectCommunityDoodleDarePool(376),
    /append the next season/
  );
  assert.equal(
    allThemes.find((theme) => theme.id === 'bear').prompt,
    'a bear with honey'
  );
  assert.equal(
    allThemes.find((theme) => theme.id === 'cat').prompt,
    'a cat in boots'
  );
  assert.ok(allThemes.every((theme) => theme.prompt.split(/\s+/).length <= 4));
});

test('completed community drawings persist after removal and backfill older records', async () => {
  const playerId = 'player-42';
  const theme = themes.selectCommunityDoodleDare(4, playerId);
  const completedScribbits = [4, 5].map((bornDay) =>
    scribbits.createScribbit({
      id: `theme-draw-${bornDay}`,
      draft: {
        name: `Theme Draw ${bornDay}`,
        stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
        element: 'ember',
        accessories: [],
      },
      artist: 'artist',
      imageUrl: '/drawing.png',
      day: bornDay,
      drawingThemeId: theme.id,
    })
  );
  let indexedEntries = completedScribbits.map((scribbit) => ({
    member: scribbit.id,
    score: scribbit.bornDay,
  }));
  const completionEntries = [indexedEntries[0]];
  const storedValues = new Map(
    completedScribbits.flatMap((scribbit) => [
      [`scribbit:${scribbit.id}`, scribbits.serializeScribbit(scribbit)],
      [`scribbit:${scribbit.id}:owner`, playerId],
    ])
  );
  const storage = {
    get: async (key) => storedValues.get(key),
    hGet: async () => undefined,
    zRange: async (key, start, stop) => {
      const source = key.endsWith(':community-theme-completions')
        ? completionEntries
        : indexedEntries;
      return source.filter(
        (entry) => entry.score >= Number(start) && entry.score <= Number(stop)
      );
    },
    zAdd: async (_key, ...entries) => {
      for (const entry of entries) {
        if (
          !completionEntries.some((stored) => stored.member === entry.member)
        ) {
          completionEntries.push(entry);
        }
      }
    },
  };

  assert.equal(
    await communityThemeProgress.loadCompletedCommunityThemeDrawCount(
      storage,
      playerId,
      4
    ),
    1
  );
  assert.equal(
    await communityThemeProgress.loadCompletedCommunityThemeDrawCount(
      storage,
      playerId,
      6
    ),
    2
  );
  indexedEntries = [];
  assert.equal(
    await communityThemeProgress.loadCompletedCommunityThemeDrawCount(
      storage,
      playerId,
      6
    ),
    2
  );
});

test('community theme seasons validate coverage and append-only boundaries', () => {
  const firstSeason = themes.COMMUNITY_DRAW_THEME_SEASONS[0];
  const shortSchedule = [
    {
      ...firstSeason,
      themes: firstSeason.themes.slice(0, 119),
    },
  ];
  const shortValidation =
    themes.validateCommunityDrawThemeSeasons(shortSchedule);
  assert.equal(shortValidation.valid, false);
  assert.match(shortValidation.errors.join('\n'), /minimum is 365/);

  const duplicateValidation = themes.validateCommunityDrawThemeSeasons([
    {
      version: 1,
      startsOnArenaDay: 1,
      themes: Array.from({ length: 120 }, () => firstSeason.themes[0]),
    },
  ]);
  assert.equal(duplicateValidation.valid, false);
  assert.match(duplicateValidation.errors.join('\n'), /id is duplicated/);

  const overtimeSeason = themes.COMMUNITY_DRAW_THEME_SEASONS[1];
  assert.equal(overtimeSeason.startsOnArenaDay, 361);
  assert.equal(
    themes.validateCommunityDrawThemeSeasons([firstSeason, overtimeSeason])
      .valid,
    true
  );

  const futureSeason = {
    version: 3,
    startsOnArenaDay: 376,
    themes: Array.from({ length: 5 }, (_, index) => ({
      id: `future-theme-${index + 1}`,
      prompt: `future creature ${index + 1}`,
      category: themes.COMMUNITY_DRAW_THEME_CATEGORIES[index],
    })),
  };
  const appendedValidation = themes.validateCommunityDrawThemeSeasons([
    firstSeason,
    overtimeSeason,
    futureSeason,
  ]);
  assert.equal(appendedValidation.valid, true);

  const boundaryValidation = themes.validateCommunityDrawThemeSeasons([
    {
      version: 1,
      startsOnArenaDay: 1,
      themes: firstSeason.themes,
    },
    {
      ...overtimeSeason,
    },
    {
      ...futureSeason,
      startsOnArenaDay: 377,
    },
  ]);
  assert.equal(boundaryValidation.valid, false);
  assert.match(boundaryValidation.errors.join('\n'), /expected day 376/);
  assert.match(boundaryValidation.errors.join('\n'), /theme boundary/);

  const complicatedPromptValidation = themes.validateCommunityDrawThemeSeasons([
    {
      ...firstSeason,
      themes: firstSeason.themes.map((theme, index) =>
        index === 0
          ? { ...theme, prompt: 'a bear juggling three giant cupcakes' }
          : theme
      ),
    },
  ]);
  assert.equal(complicatedPromptValidation.valid, false);
  assert.match(complicatedPromptValidation.errors.join('\n'), /maximum is 4/);

  const invalidCategoryValidation = themes.validateCommunityDrawThemeSeasons([
    {
      ...firstSeason,
      themes: firstSeason.themes.map((theme, index) =>
        index === 0 ? { ...theme, category: 'unknown' } : theme
      ),
    },
  ]);
  assert.equal(invalidCategoryValidation.valid, false);
  assert.match(invalidCategoryValidation.errors.join('\n'), /invalid category/);
});

test('new Scribbits keep an immutable theme category and old records migrate', () => {
  const theme = themes.selectCommunityDoodleDare(360);
  const scribbit = scribbits.createScribbit({
    id: 'theme-test',
    draft: {
      name: 'Theme Test',
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      element: 'ember',
      accessories: [],
    },
    artist: 'artist',
    imageUrl: '/drawing.png',
    day: 360,
    drawingThemeId: theme.id,
  });

  assert.equal(scribbit.drawingThemeId, theme.id);
  assert.equal(
    scribbits.normalizeScribbitRecord({ ...scribbit, drawingThemeId: 'fake' }),
    undefined
  );
  const oldRecord = { ...scribbit };
  delete oldRecord.drawingThemeId;
  assert.equal(
    scribbits.normalizeScribbitRecord(oldRecord).drawingThemeId,
    null
  );
});

test('Draw and the contender picker use the server-assigned theme category', () => {
  const drawSource = readFileSync(
    join(appRoot, 'src', 'client', 'scenes', 'Draw.ts'),
    'utf8'
  );
  const pickerSource = readFileSync(
    join(appRoot, 'src', 'client', 'lib', 'arenacontenderpicker.ts'),
    'utf8'
  );
  const routeSource = readFileSync(
    join(appRoot, 'src', 'server', 'routes', 'api.ts'),
    'utf8'
  );
  const submissionSource = readFileSync(
    join(appRoot, 'src', 'server', 'core', 'submission.ts'),
    'utf8'
  );
  const privacySource = readFileSync(
    join(appRoot, 'src', 'server', 'core', 'privacy.ts'),
    'utf8'
  );

  assert.match(drawSource, /-DAY COMMUNITY THEME/);
  assert.match(drawSource, /arena\.communityDrawTheme/);
  assert.match(drawSource, /Start Theme gives you 60 seconds/);
  assert.match(drawSource, /Free Draw has no timer and is saved separately/);
  assert.match(pickerSource, /COMMUNITY CREATIONS/);
  assert.match(pickerSource, /themePrompt\.toUpperCase\(\)/);
  assert.match(
    routeSource,
    /drawingThemeId: selectCommunityDoodleDare\([\s\S]*dayNumber,[\s\S]*player\.userId,[\s\S]*completedCommunityThemeDrawCount[\s\S]*\)\.id/
  );
  assert.match(routeSource, /loadCompletedCommunityThemeDrawCount/);
  assert.match(
    submissionSource,
    /transaction\.zAdd\([\s\S]*getUserCommunityThemeCompletionsKey/
  );
  assert.match(privacySource, /getUserCommunityThemeCompletionsKey\(userId\)/);
  assert.match(
    readFileSync(
      join(appRoot, 'src', 'client', 'scenes', 'ArenaHome.ts'),
      'utf8'
    ),
    /entrant\.drawingThemeId === assignedTheme\.id/
  );
  assert.match(routeSource, /api\.post\('\/free-drawing'/);
  assert.match(routeSource, /hasFreeDrawingForDay/);
});
