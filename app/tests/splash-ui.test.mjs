import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const [
  splashHtml,
  splashCss,
  splashScript,
  preloaderScript,
  drawScript,
  apiScript,
  englishCatalog,
] = await Promise.all([
  readFile(new URL('../src/client/splash.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/splash.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/splash.ts', import.meta.url), 'utf8'),
  readFile(
    new URL('../src/client/scenes/Preloader.ts', import.meta.url),
    'utf8'
  ),
  readFile(new URL('../src/client/scenes/Draw.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/server/routes/api.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/locales/en.ts', import.meta.url), 'utf8'),
]);

test('splash shows three drawings without depending on live API data', () => {
  assert.equal((splashHtml.match(/data-showcase-slot/g) ?? []).length, 3);
  assert.match(splashHtml, /splash-doodle-mossmop\.png/);
  assert.match(splashHtml, /splash-doodle-looplet\.png/);
  assert.match(splashHtml, /splash-doodle-stormpuff\.png/);
  assert.equal((splashHtml.match(/class="showcase-artist"/g) ?? []).length, 3);
  assert.doesNotMatch(
    splashHtml + splashCss + splashScript,
    /streak-stat|streak-stamp|DAY STREAK/
  );
  assert.match(splashScript, /renderFeaturedCreations/);
  assert.match(splashScript, /candidateImage\.addEventListener/);
  assert.match(splashScript, /!state\.hasCreatedScribbit/);
  assert.match(splashScript, /translate\('splash\.action\.drawToday'\)/);
  assert.match(splashScript, /translate\('splash\.action\.continue'\)/);
  assert.match(englishCatalog, /'splash\.action\.drawToday': 'DRAW TODAY'/);
  assert.match(englishCatalog, /'splash\.action\.continue': 'CONTINUE'/);
  assert.doesNotMatch(
    splashScript,
    /PICK A CONTENDER|OPEN ARENA|CHECK RESULTS/
  );
  assert.doesNotMatch(splashHtml, /TONIGHT'S RUMBLE/);
  assert.doesNotMatch(
    splashHtml + splashScript + splashCss,
    /ARENA NOTE|forecast-line|forecast-label/
  );
  assert.doesNotMatch(splashHtml + splashScript, /WINNER|WINNING SCRIBBITS/);
  assert.doesNotMatch(splashScript, /rumbleCountdown|formatCountdown/);
});

test('splash and expanded game share one durable new-player flow', () => {
  assert.match(preloaderScript, /!state\.hasCreatedScribbit/);
  assert.match(preloaderScript, /needsFirstScribbit \? 'Draw' : 'ArenaHome'/);
  assert.match(drawScript, /hasCreatedScribbit: true/);
  assert.match(drawScript, /START FIRST FIGHT/);
  assert.match(drawScript, /private async startFirstBattle\(scribbit: Scribbit\)/);
  assert.match(apiScript, /getUserScribbitIds\(redis, player\.userId, 1\)/);
});

test('splash logo settles once and respects reduced motion', () => {
  assert.match(splashCss, /@keyframes logo-settle/);
  assert.doesNotMatch(splashCss, /logo-settle[^;]*infinite/);
  assert.match(
    splashCss,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.logo-image[\s\S]*animation: none/
  );
});
