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
const paperIconsSource = await readFile(
  new URL('../src/client/lib/papericons.ts', import.meta.url),
  'utf8'
);

test('Home is the living Scribbit screen with one big Draw action', () => {
  const maturityGearSource = homeSource.slice(
    homeSource.indexOf('private renderMaturityGearCluster'),
    homeSource.indexOf('private closeMaturityInfo')
  );
  const rosterControlsSource = homeSource.slice(
    homeSource.indexOf('private renderRosterControls'),
    homeSource.indexOf('private shiftSelected')
  );
  assert.match(homeSource, /export class ScribbitHome extends Scene/);
  assert.match(homeSource, /homeStage\(this\)/);
  assert.match(homeSource, /this\.renderHomeTitle\(\)/);
  assert.match(homeSource, /HOME_TITLE_TEXTURE/);
  assert.match(
    homeSource,
    /\.image\(width \/ 2, 120, HOME_TITLE_TEXTURE\)[\s\S]*?\.setDisplaySize\(320, 107\)/
  );
  assert.match(homeSource, /new LiveSprite/);
  assert.match(homeSource, /this\.liveSprite\.breathe\(\)/);
  assert.match(homeSource, /this\.renderHomeProps\(stage\)/);
  assert.match(homeSource, /this\.liveSprite\?\.jiggle\(\)/);
  assert.match(homeSource, /HOME_SCRIBBIT_DISPLAY_SIZE = 380/);
  assert.match(homeSource, /HOME_SCRIBBIT_HIT_SIZE = 400/);
  assert.match(homeSource, /displaySize: HOME_SCRIBBIT_DISPLAY_SIZE/);
  assert.match(homeSource, /bindPressInteractionEvents/);
  assert.match(homeSource, /private startHomePropIdle\(/);
  assert.match(homeSource, /repeat: -1/);
  assert.match(homeSource, /private clearHomePropIdleTweens\(/);
  assert.match(homeSource, /this\.stopHomePropIdle\(prop\)/);
  assert.match(homeSource, /this\.tweens\.chain\(\{/);
  assert.match(homeSource, /ease: 'Back\.easeOut'/);
  assert.match(homeSource, /private burstPaperSparks\(/);
  assert.match(homeSource, /ELEMENT_STYLES\[scribbit\.element\]\.particle/);
  assert.equal(
    (homeSource.match(/this\.reactToCreature\(/g) ?? []).length,
    2,
    'canvas and accessibility-overlay taps must share one cheerful reaction'
  );
  assert.match(homeSource, /createStickerShine\(\{/);
  assert.match(homeSource, /private startDrawButtonEffects\(/);
  assert.match(homeSource, /this\.time\.addEvent\(\{[\s\S]*?loop: true/);
  assert.match(homeSource, /private clearDrawButtonEffects\(/);
  assert.equal(
    (homeSource.match(/this\.clearDrawButtonEffects\(\)/g) ?? []).length,
    2,
    'roster rebuild and scene shutdown must clear recurring Draw effects'
  );
  assert.match(homeSource, /timer\.remove\(false\)/);
  assert.match(homeSource, /this\.drawButtonShine\?\.destroy\(\)/);
  assert.match(homeSource, /needsScribbitCreation\(state\)/);
  assert.doesNotMatch(homeSource, /'YOUR SCRIBBIT'/);
  assert.match(
    homeSource,
    /creatureY \+ 198,[\s\S]{0,100}?scribbit\.name\.toUpperCase\(\)[\s\S]{0,420}?creatureY \+ 234,[\s\S]{0,120}?`LV /,
    'the Scribbit name belongs directly above its level and mood'
  );
  assert.match(
    homeSource,
    /container\(width \/ 2, creatureY \+ 274\)[\s\S]{0,360}?\$\{this\.selectedIndex \+ 1\} OF/,
    'the roster position must use its own high-contrast paper badge'
  );
  assert.match(rosterControlsSource, /UI\.paper, 0\.96/);
  assert.match(rosterControlsSource, /TYPE\.caption,[\s\S]{0,30}?UI\.ink/);
  assert.doesNotMatch(rosterControlsSource, /UI\.inkSoft|setAlpha/);
  assert.match(homeSource, /paperArrowButton\([\s\S]*?'previous'/);
  assert.match(homeSource, /paperArrowButton\([\s\S]*?'next'/);
  assert.equal(
    [...rosterControlsSource.matchAll(/pointerPassthrough: true/g)].length,
    2
  );
  assert.equal(
    [...rosterControlsSource.matchAll(/'data-sfx-cue': 'ui\.page'/g)].length,
    2
  );
  assert.doesNotMatch(homeSource, /nextIcon\.setScale\(-1, 1\)/);
  assert.match(homeSource, /maturityCountdownHeadline/);
  assert.match(homeSource, /delay: 1_000/);
  assert.match(homeSource, /private clearMaturityCountdown\(\)/);
  assert.match(homeSource, /STATS LOCK • GEAR UP FOR MATURE ARENA/);
  assert.match(homeSource, /'How Scribbit maturity works'/);
  assert.match(homeSource, /paperIconButton\([\s\S]*?'info'/);
  assert.match(
    paperIconsSource,
    /if \(key === 'info'\)[\s\S]*fillStyle\(stroke, 1\)[\s\S]*fillCircle\(0, -7 \* scale, 2\.2 \* scale\)[\s\S]*fillRoundedRect/
  );
  assert.match(
    homeSource,
    /Every completed battle gives it a random stat modifier — win or lose\./
  );
  assert.match(
    homeSource,
    /random stat modifiers stop and its final stats lock forever\./
  );
  assert.match(homeSource, /MATURE ARENA: UPGRADE GEAR/);
  assert.match(
    homeSource,
    /Upgrade Gear to add bonuses and increase its battle stats\./
  );
  assert.match(homeSource, /private renderMaturityGearCluster\(/);
  assert.match(homeSource, /icon: 'spark'/);
  assert.doesNotMatch(homeSource, /icon: 'forge'/);
  assert.match(
    homeSource,
    /renderMaturityGearCluster\(container, width \/ 2, rowY \+ 117\)/
  );
  assert.match(homeSource, /size: index === 2 \? 70 : 46/);
  assert.doesNotMatch(maturityGearSource, /\.circle\(/);
  assert.match(homeSource, /centerOffsetX: -180/);
  assert.match(homeSource, /centerOffsetX: -60/);
  assert.match(homeSource, /centerOffsetX: 60/);
  assert.match(homeSource, /centerOffsetX: 180/);
  assert.match(homeSource, /MATURITY_GEAR_ICON_SIZE = 120/);
  assert.match(homeSource, /contentY = rowY - \(index === 2 \? 20 : 0\)/);
  assert.match(homeSource, /frame: 0/);
  assert.match(homeSource, /frame: 1/);
  assert.match(homeSource, /frame: 2/);
  assert.match(homeSource, /frame: 3/);
  assert.match(homeSource, /MATURITY_GEAR_TEXTURE/);
  assert.match(
    visualAssetsSource,
    /MATURITY_GEAR_TEXTURE[\s\S]*?maturity-gear-icons\.png[\s\S]*?frameWidth: 256, frameHeight: 256/
  );
  assert.match(homeSource, /angle: \{ from: -5, to: 5 \}/);
  assert.match(homeSource, /repeatDelay: 650/);
  assert.match(
    homeSource,
    /this\.tweens\.killTweensOf\(modal\.container\.list\)/
  );
  assert.match(homeSource, /Math\.min\(820, height - cardTop - 80\)/);
  assert.match(homeSource, /rowStartY \+ index \* 125/);
  assert.doesNotMatch(maturityGearSource, /renderCosmeticPreview\(/);
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
  assert.match(homeSource, /setGalleryTab\(this, 'growing'\)/);
  assert.match(homeSource, /startScene\(this, 'Gallery'\)/);
  assert.doesNotMatch(homeSource, /openCarePicker|openDetailModal|ArenaHome/);
  assert.doesNotMatch(appDockSource, /key: 'draw'|route: 'dailyDraw'/);
  assert.match(
    visualAssetsSource,
    /HOME_STAGE_TEXTURE = 'scribbits-home-stage'/
  );
  assert.match(
    visualAssetsSource,
    /HOME_TITLE_TEXTURE = 'scribbits-home-title'/
  );
  assert.match(visualAssetsSource, /assetUrl\('scribbits-home-title\.png'\)/);
  assert.match(visualAssetsSource, /HOME_PROP_TEXTURES/);
  assert.match(liveSpriteSource, /jiggle\(\): void/);
  assert.match(liveSpriteSource, /repeat: this\.reduceMotion \? 0 : 2/);
  assert.match(
    liveSpriteSource,
    /scene\.add\.mesh2d\([\s\S]*?geometry\.indices,[\s\S]{0,240}?true\s*\)/,
    'WebGL LiveSprites must flip top-down image UVs into GL texture space'
  );
});
