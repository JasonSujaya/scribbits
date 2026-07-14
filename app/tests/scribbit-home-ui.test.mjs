import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const homeSource = await readFile(
  new URL('../src/client/scenes/ScribbitHome.ts', import.meta.url),
  'utf8'
);
const appDockSource = await readFile(
  new URL('../src/client/lib/appdock.ts', import.meta.url),
  'utf8'
);
const visualAssetsSource = await readFile(
  new URL('../src/client/lib/visualassets.ts', import.meta.url),
  'utf8'
);
const liveSpriteSource = await readFile(
  new URL('../src/client/lib/livesprite.ts', import.meta.url),
  'utf8'
);

test('Home is the living Scribbit screen with one big Draw action', () => {
  assert.match(homeSource, /export class ScribbitHome extends Scene/);
  assert.match(homeSource, /homeStage\(this\)/);
  assert.match(homeSource, /new LiveSprite/);
  assert.match(homeSource, /this\.liveSprite\.breathe\(\)/);
  assert.match(homeSource, /this\.renderHomeProps\(stage\)/);
  assert.match(homeSource, /this\.liveSprite\?\.jiggle\(\)/);
  assert.match(homeSource, /HOME_SCRIBBIT_DISPLAY_SIZE = 380/);
  assert.match(homeSource, /HOME_SCRIBBIT_HIT_SIZE = 400/);
  assert.match(
    homeSource,
    /displaySize: HOME_SCRIBBIT_DISPLAY_SIZE/
  );
  assert.match(homeSource, /bindPressInteractionEvents/);
  assert.match(homeSource, /private startHomePropIdle\(/);
  assert.match(homeSource, /repeat: -1/);
  assert.match(homeSource, /private clearHomePropIdleTweens\(/);
  assert.match(homeSource, /this\.stopHomePropIdle\(prop\)/);
  assert.match(homeSource, /needsScribbitCreation\(state\)/);
  assert.match(homeSource, /'YOUR SCRIBBIT'/);
  assert.match(homeSource, /maturityHeadlineFor/);
  assert.match(homeSource, /MATURES IN/);
  assert.match(homeSource, /BATTLE MODIFIERS STOP • MATURE ARENA/);
  assert.match(homeSource, /'How Scribbit maturity works'/);
  assert.match(homeSource, /paperIconButton\([\s\S]*?'info'/);
  assert.match(
    homeSource,
    /Every completed battle gives it a random stat modifier — win or lose\./
  );
  assert.match(
    homeSource,
    /random stat modifiers stop and its final stats lock forever\./
  );
  assert.match(homeSource, /It enters the Mature Arena to compete/);
  assert.match(homeSource, /new CanvasModalOverlay/);
  assert.doesNotMatch(homeSource, /`by u\/\$\{scribbit\.artist\}`/);
  assert.match(homeSource, /navigateToDailyDraw\(this\)/);
  assert.match(homeSource, /renderDrawButton\(centerX, buttonY, 520, 124\)/);
  assert.match(homeSource, /appDock\(this, 'home'/);
  assert.match(homeSource, /paperIconButton\([\s\S]*?'book'/);
  assert.match(homeSource, /label: translate\('home\.openGallery'\)/);
  assert.match(
    homeSource,
    /galleryButton\.add\([\s\S]*translate\('home\.gallery'\)/
  );
  assert.match(homeSource, /setGalleryTab\(this, 'legends'\)/);
  assert.match(homeSource, /startScene\(this, 'Gallery'\)/);
  assert.doesNotMatch(homeSource, /openCarePicker|openDetailModal|ArenaHome/);
  assert.doesNotMatch(appDockSource, /key: 'draw'|route: 'dailyDraw'/);
  assert.match(
    visualAssetsSource,
    /HOME_STAGE_TEXTURE = 'scribbits-home-stage'/
  );
  assert.match(visualAssetsSource, /HOME_PROP_TEXTURES/);
  assert.match(liveSpriteSource, /jiggle\(\): void/);
  assert.match(liveSpriteSource, /repeat: this\.reduceMotion \? 0 : 2/);
});
