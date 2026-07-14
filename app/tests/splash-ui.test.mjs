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

test('splash tells one large creation-to-battle story without live API data', () => {
  assert.match(splashHtml, /class="creation-story"/);
  assert.match(splashHtml, /id="hero-creation-image"/);
  assert.match(splashHtml, /id="battle-hero-image"/);
  assert.match(splashHtml, /id="battle-rival-image"/);
  assert.match(splashHtml, /splash-doodle-mossmop\.png/);
  assert.match(splashHtml, /splash-doodle-stormpuff\.png/);
  assert.doesNotMatch(splashHtml, /data-showcase-slot|showcase-grid/);
  assert.doesNotMatch(
    splashHtml + splashCss + splashScript,
    /streak-stat|streak-stamp|DAY STREAK/
  );
  assert.match(splashScript, /renderFeaturedCreationPair/);
  assert.match(splashScript, /renderCreationStory/);
  assert.match(splashScript, /shuffledCreations/);
  assert.match(splashScript, /crypto\.getRandomValues/);
  assert.match(splashScript, /battleHeroImage\.src = hero\.imageUrl/);
  assert.match(splashCss, /max-width: 760px/);
  assert.match(splashCss, /\.hero-creation-image[\s\S]*height: clamp/);
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
  assert.match(splashHtml, /class="battle-frame"/);
  assert.match(splashHtml, /id="shared-battle-video"/);
  assert.match(splashHtml, />DRAW IT</);
  assert.match(splashHtml, />BATTLE</);
  assert.match(splashScript, /renderSharedBattleClip/);
  assert.match(splashScript, /getShareData/);
  assert.match(
    englishCatalog,
    /'splash\.battle\.shared': 'SHARED BATTLE CLIP'/
  );
});

test('splash and expanded game share one durable new-player flow', () => {
  assert.match(
    preloaderScript,
    /needsScribbitCreation\(state\) \? 'Draw' : 'ScribbitHome'/
  );
  assert.match(drawScript, /hasCreatedScribbit: true/);
  assert.match(
    drawEligibilityScript,
    /state\?\.loggedIn && !state\.hasCreatedScribbit/
  );
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
