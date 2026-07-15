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

test('360 days of simple community themes rotate in three-day blocks', () => {
  const firstTheme = themes.selectCommunityDoodleDare(1);
  const blockStartIds = [];

  assert.equal(themes.COMMUNITY_DRAW_THEME_DAYS, 3);
  assert.equal(themes.COMMUNITY_DRAW_THEME_COUNT, 120);
  assert.equal(themes.COMMUNITY_DRAW_THEME_COVERAGE_DAYS, 360);
  assert.equal(themes.selectCommunityDoodleDare(2).id, firstTheme.id);
  assert.equal(themes.selectCommunityDoodleDare(3).id, firstTheme.id);
  assert.notEqual(themes.selectCommunityDoodleDare(4).id, firstTheme.id);
  assert.equal(
    themes.selectCommunityDoodleDare(4).id,
    themes.selectCommunityDoodleDare(6).id
  );
  assert.notEqual(themes.selectCommunityDoodleDare(96).id, firstTheme.id);
  assert.notEqual(themes.selectCommunityDoodleDare(97).id, firstTheme.id);
  assert.equal(
    themes.selectCommunityDoodleDare(355).id,
    themes.selectCommunityDoodleDare(357).id
  );
  assert.equal(
    themes.selectCommunityDoodleDare(358).id,
    themes.selectCommunityDoodleDare(360).id
  );
  assert.notEqual(
    themes.selectCommunityDoodleDare(357).id,
    themes.selectCommunityDoodleDare(358).id
  );

  for (let blockStart = 1; blockStart <= 358; blockStart += 3) {
    const themeId = themes.selectCommunityDoodleDare(blockStart).id;
    blockStartIds.push(themeId);
    for (let day = blockStart; day <= blockStart + 2; day += 1) {
      assert.equal(themes.selectCommunityDoodleDare(day).id, themeId);
    }
  }
  assert.equal(new Set(blockStartIds).size, 120);
  assert.throws(
    () => themes.selectCommunityDoodleDare(361),
    /append the next season/
  );
  const allThemes = themes.COMMUNITY_DRAW_THEME_SEASONS.flatMap(
    (season) => season.themes
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
  assert.match(shortValidation.errors.join('\n'), /minimum is 360/);

  const duplicateValidation = themes.validateCommunityDrawThemeSeasons([
    {
      version: 1,
      startsOnArenaDay: 1,
      themes: Array.from({ length: 120 }, () => firstSeason.themes[0]),
    },
  ]);
  assert.equal(duplicateValidation.valid, false);
  assert.match(duplicateValidation.errors.join('\n'), /id is duplicated/);

  const futureSeason = {
    version: 2,
    startsOnArenaDay: 361,
    themes: [
      {
        id: 'future-theme',
        prompt: 'a future creature',
      },
    ],
  };
  const appendedValidation = themes.validateCommunityDrawThemeSeasons([
    firstSeason,
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
      ...futureSeason,
      startsOnArenaDay: 362,
    },
  ]);
  assert.equal(boundaryValidation.valid, false);
  assert.match(boundaryValidation.errors.join('\n'), /expected day 361/);
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

test('Draw and the contender picker explain the shared category in game', () => {
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

  assert.match(drawSource, /-DAY COMMUNITY THEME/);
  assert.match(drawSource, /Start Theme gives you 60 seconds/);
  assert.match(drawSource, /Free Draw has no timer and is saved separately/);
  assert.match(pickerSource, /COMMUNITY CREATIONS/);
  assert.match(pickerSource, /themePrompt\.toUpperCase\(\)/);
  assert.match(
    routeSource,
    /drawingThemeId: selectCommunityDoodleDare\(dayNumber\)\.id/
  );
  assert.match(routeSource, /api\.post\('\/free-drawing'/);
  assert.match(routeSource, /hasFreeDrawingForDay/);
});
