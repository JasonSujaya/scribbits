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
  assert.match(splashHtml, /A REDDIT DRAWING GAME/);
  assert.match(splashHtml, /YOUR DRAWING BECOMES THE FIGHTER\./);
  assert.match(splashHtml, /DRAW A SCRIBBIT\. WATCH IT FIGHT\./);
  assert.match(splashHtml, /id="featured-creation-image"/);
  assert.match(splashHtml, /id="start-button"/);
  assert.ok(
    splashHtml.indexOf('id="start-button"') <
      splashHtml.indexOf('class="creation-card"'),
    'the Reddit CTA must appear before the optional showcase'
  );
  assert.doesNotMatch(splashHtml, /\bVS\b/);
  assert.doesNotMatch(splashHtml, /battle-health/);
  assert.doesNotMatch(splashHtml, /battle-rival-image/);
  assert.doesNotMatch(splashHtml, /creation-story/);
  assert.doesNotMatch(splashHtml, /fresh-note/);
  assert.doesNotMatch(splashHtml, /A FRESH ONE EVERY TIME YOU LOOK/);
  assert.doesNotMatch(englishCatalog, /splash\.invite\.fresh/);
  assert.match(splashCss, /aspect-ratio: 1/);
  assert.match(splashCss, /html,[\s\S]*body[\s\S]*overflow: hidden/);
  assert.match(splashCss, /\.page[\s\S]*overflow: hidden/);
  assert.match(
    splashCss,
    /grid-template-rows: auto auto auto minmax\(0, 1fr\)/
  );
  assert.doesNotMatch(splashCss, /@media \(max-width: 620px\)/);
});

test('splash stays light while rotating in real community fighters', () => {
  assert.match(splashScript, /drawFoundingCharacter/);
  assert.match(splashScript, /founding-gladepuff/);
  assert.match(splashScript, /founding-coraloom/);
  assert.match(splashScript, /founding-ribbonrook/);
  assert.doesNotMatch(splashScript, /splash-doodle-/);
  assert.doesNotMatch(splashHtml, /splash-doodle-/);
  assert.match(splashScript, /renderFeaturedCreationPair/);
  assert.match(splashScript, /renderFeaturedCreation/);
  assert.match(splashScript, /setFeaturedCreationPool/);
  assert.match(splashScript, /showNextFeaturedCreation/);
  assert.match(splashScript, /FEATURED_CREATION_ROTATION_MILLISECONDS = 6_500/);
  assert.match(splashScript, /window\.setInterval/);
  assert.match(splashScript, /shuffledCreations/);
  assert.match(splashScript, /crypto\.getRandomValues/);
  assert.match(splashScript, /getShareData/);
  assert.match(splashScript, /parseBattleShareData/);
  assert.match(splashScript, /state\.hasCreatedScribbit/);
  assert.match(splashScript, /splash\.action\.drawYours/);
  assert.match(splashScript, /splash\.action\.backToYours/);
  assert.match(englishCatalog, /'splash\.action\.drawYours': 'DRAW YOURS'/);
  assert.match(
    englishCatalog,
    /'splash\.action\.backToYours': 'BACK TO YOUR GUY'/
  );
});

test('splash and expanded game share one durable new-player flow', () => {
  assert.match(preloaderScript, /startScene\(this, 'ScribbitHome'\)/);
  assert.doesNotMatch(drawEligibilityScript, /needsScribbitCreation/);
  assert.match(drawScript, /START FIRST FIGHT/);
  assert.match(
    drawScript,
    /private async startFirstBattle\(scribbit: Scribbit\)/
  );
  assert.match(
    apiScript,
    /readHasUserCreatedScribbit\(redis, player\.userId\)/
  );
  assert.match(apiScript, /api\.get\('\/splash'/);
  assert.doesNotMatch(apiScript, /registerPlayerMutatingGet\('\/splash'/);
});

test('splash logo settles once and respects reduced motion', () => {
  assert.match(splashCss, /@keyframes logo-settle/);
  assert.doesNotMatch(splashCss, /logo-settle[^;]*infinite/);
  assert.match(
    splashCss,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.logo-image,[\s\S]*\.featured-creation-art img,[\s\S]*\.start-button[\s\S]*animation: none/
  );
  assert.match(splashScript, /prefers-reduced-motion: reduce/);
  assert.match(splashScript, /reducedMotionQuery\.matches/);
});

test('each rotating splash character gets restrained independent motion', () => {
  assert.match(splashHtml, /class="featured-creation-art"/);
  assert.match(splashScript, /applyRandomFeaturedCreationMotion/);
  assert.match(splashScript, /--doodle-duration/);
  assert.match(splashScript, /--doodle-delay/);
  assert.match(splashScript, /motionSequence/);
  assert.match(splashCss, /@keyframes doodle-idle/);
  assert.match(splashCss, /var\(--doodle-x-a/);
  assert.match(splashCss, /var\(--doodle-x-b/);
});
