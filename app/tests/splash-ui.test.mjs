import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const [
  splashHtml,
  splashCss,
  splashScript,
  preloaderScript,
  drawScript,
  drawEligibilityScript,
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
  readFile(
    new URL('../src/client/lib/draweligibility.ts', import.meta.url),
    'utf8'
  ),
  readFile(new URL('../src/server/routes/api.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/client/locales/en.ts', import.meta.url), 'utf8'),
]);

test('splash is a square feed hook instead of the expanded game flow', () => {
  assert.match(splashHtml, /YOUR DOODLE\./);
  assert.match(splashHtml, /YOUR FIGHTER\./);
  assert.match(splashHtml, /SHAPE BECOMES STATS/);
  assert.match(splashHtml, /DRAW IT\. WATCH IT FIGHT\./);
  assert.match(splashHtml, /id="battle-hero-image"/);
  assert.match(splashHtml, /id="battle-rival-image"/);
  assert.match(splashHtml, /id="start-button"/);
  assert.doesNotMatch(splashHtml, /creation-story/);
  assert.match(splashCss, /aspect-ratio: 1/);
  assert.match(splashCss, /html,[\s\S]*body[\s\S]*overflow: hidden/);
  assert.match(splashCss, /\.page[\s\S]*overflow: hidden/);
  assert.doesNotMatch(splashCss, /@media \(max-width: 620px\)/);
});

test('splash stays light while rotating in real community fighters', () => {
  assert.match(splashScript, /renderFeaturedCreationPair/);
  assert.match(splashScript, /renderFighterPair/);
  assert.match(splashScript, /shuffledCreations/);
  assert.match(splashScript, /crypto\.getRandomValues/);
  assert.match(splashScript, /getShareData/);
  assert.match(splashScript, /parseBattleShareData/);
  assert.match(splashScript, /!state\.hasCreatedScribbit/);
  assert.match(splashScript, /translate\('splash\.action\.drawToday'\)/);
  assert.match(splashScript, /translate\('splash\.action\.keepFighting'\)/);
  assert.match(englishCatalog, /'splash\.action\.drawToday': 'DRAW TODAY'/);
  assert.match(
    englishCatalog,
    /'splash\.action\.keepFighting': 'KEEP FIGHTING'/
  );
});

test('splash and expanded game share one durable new-player flow', () => {
  assert.match(preloaderScript, /this\.scene\.start\('ScribbitHome'\)/);
  assert.match(drawScript, /hasCreatedScribbit: true/);
  assert.doesNotMatch(drawEligibilityScript, /needsScribbitCreation/);
  assert.match(drawScript, /START FIRST FIGHT/);
  assert.match(
    drawScript,
    /private async startFirstBattle\(scribbit: Scribbit\)/
  );
  assert.match(apiScript, /hasUserCreatedScribbit\(redis, player\.userId\)/);
  assert.match(apiScript, /registerPlayerMutatingGet\('\/splash'/);
});

test('splash logo settles once and respects reduced motion', () => {
  assert.match(splashCss, /@keyframes logo-settle/);
  assert.doesNotMatch(splashCss, /logo-settle[^;]*infinite/);
  assert.match(
    splashCss,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.logo-image[\s\S]*animation: none/
  );
});
