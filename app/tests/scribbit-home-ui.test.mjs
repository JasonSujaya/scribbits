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
const dailyLoginModalSource = await readFile(
  new URL('../src/client/lib/dailyloginmodal.ts', import.meta.url),
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
  assert.match(homeSource, /private renderCreatureInteraction\(/);
  assert.match(homeSource, /this\.liveSprite\?\.jiggle\(\)/);
  assert.match(homeSource, /TAP TO MEET/);
  assert.match(homeSource, /Open animated character details/);
  assert.match(homeSource, /setSfxCue\(hitTarget, 'ui\.open'\)/);
  assert.match(homeSource, /this\.renderHomeProps\(stage\)/);
  assert.match(homeSource, /HOME_SCRIBBIT_DISPLAY_SIZE = 380/);
  assert.match(homeSource, /displaySize: HOME_SCRIBBIT_DISPLAY_SIZE/);
  assert.match(homeSource, /bindPressInteractionEvents/);
  assert.match(homeSource, /private startHomePropIdle\(/);
  assert.match(homeSource, /repeat: -1/);
  assert.match(homeSource, /private clearHomePropIdleTweens\(/);
  assert.match(homeSource, /this\.stopHomePropIdle\(prop\)/);
  assert.match(homeSource, /this\.tweens\.chain\(\{/);
  assert.match(homeSource, /ease: 'Back\.easeOut'/);
  assert.match(homeSource, /private burstPaperSparks\(/);
  assert.doesNotMatch(homeSource, /moodStyleOf|tap to pet|care\.action/);
  assert.doesNotMatch(homeSource, /Food bowl|Pet bed|reactToCreature/);
  assert.doesNotMatch(homeSource, /HOME_SCRIBBIT_HIT_SIZE/);
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
  assert.doesNotMatch(homeSource, /needsScribbitCreation\(state\)/);
  assert.doesNotMatch(homeSource, /'YOUR SCRIBBIT'/);
  assert.match(
    homeSource,
    /creatureY \+ 198,[\s\S]{0,100}?scribbit\.name\.toUpperCase\(\)[\s\S]{0,420}?creatureY \+ 234,[\s\S]{0,160}?`LV \$\{levelOf\(scribbit\)\}  •  TAP TO MEET`/,
    'the Scribbit name belongs directly above its level'
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
    /Choose one of three randomized Power-Ups before the first fight\./
  );
  assert.match(homeSource, /After 3 days, its final base stats lock forever\./);
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
    /MATURITY_GEAR_TEXTURE[\s\S]*?maturity-gear-icons\.webp[\s\S]*?frameWidth: 128, frameHeight: 128/
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
  assert.match(homeSource, /isGrowingRosterFull\(this\.state\)/);
  assert.match(homeSource, /openRosterFullModal\(drawControl\)/);
  assert.match(homeSource, /private openScribbitDetail\(scribbit: Scribbit\)/);
  assert.match(homeSource, /openDetailModal\(this, scribbit/);
  assert.match(homeSource, /MAX_GROWING_PER_USER/);
  assert.match(homeSource, /drawChargeCountLabel\(drawCharges\)/);
  assert.match(homeSource, /drawChargeRefreshLabel\(drawCharges\)/);
  assert.match(
    homeSource,
    /0,\s*24,\s*drawChargeRefreshLabel\(drawCharges\),\s*17,\s*UI\.ink/,
    'Draw Charge status must sit visibly above the rough button edge'
  );
  assert.match(homeSource, /drawCharges\.available > 0/);
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
  assert.match(homeSource, /private renderDailyLoginButton\(\)/);
  assert.match(homeSource, /claimDailyLogin/);
  assert.match(homeSource, /'gift'/);
  assert.match(homeSource, /'Claim daily login reward'/);
  assert.match(dailyLoginModalSource, /DAILY_LOGIN_TRACK/);
  assert.match(dailyLoginModalSource, /COME BACK 7 DAYS/);
  assert.match(dailyLoginModalSource, /WIN EPIC GOLDEN CROWN GEAR/);
  assert.match(dailyLoginModalSource, /DAY 7 BONUS/);
  assert.match(dailyLoginModalSource, /EPIC GOLDEN/);
  assert.match(dailyLoginModalSource, /CROWN GEAR/);
  assert.match(dailyLoginModalSource, /CLAIM DAY 7/);
  assert.match(dailyLoginModalSource, /gearArtTextureForRarity/);
  assert.match(dailyLoginModalSource, /\.image\([\s\S]*daySevenGear\.id/);
  assert.match(dailyLoginModalSource, /\.setDisplaySize\(230, 180\)/);
  assert.match(dailyLoginModalSource, /type RewardVisualState/);
  assert.match(dailyLoginModalSource, /CLAIMED_REWARD_FILL = 0x76563e/);
  assert.match(dailyLoginModalSource, /LOCKED_REWARD_FILL = 0xf4ead1/);
  assert.match(dailyLoginModalSource, /\? '✓ CLAIMED'/);
  assert.match(dailyLoginModalSource, /: 'CLAIM NOW'/);
  assert.match(dailyLoginModalSource, /: 'LOCKED'/);
  assert.match(
    dailyLoginModalSource,
    /visualState === 'locked' \? 'lock' : 'ink'/
  );
  assert.match(dailyLoginModalSource, /ready \? 7 : 4/);
  assert.match(dailyLoginModalSource, /112,\s*31,/);
  assert.match(dailyLoginModalSource, /'✓ BONUS CLAIMED'/);
  assert.match(dailyLoginModalSource, /COSMETIC_BY_ID/);
  assert.match(dailyLoginModalSource, /BAG_RARITY_FRAME_STYLE/);
  assert.match(dailyLoginModalSource, /daySevenGear\.rarity\.toUpperCase\(\)/);
  assert.match(dailyLoginModalSource, /gearRankStars\(scene, content/);
  assert.match(dailyLoginModalSource, /1-STAR GEAR/);
  assert.match(dailyLoginModalSource, /heroY \+ 130, 1, 1\.15/);
  assert.match(dailyLoginModalSource, /cardHeight: 1140/);
  assert.match(dailyLoginModalSource, /\.circle\(/);
  assert.match(dailyLoginModalSource, /const primaryRect/);
  assert.match(dailyLoginModalSource, /size: 46/);
  assert.match(dailyLoginModalSource, /contentRevealTween/);
  assert.match(dailyLoginModalSource, /claimablePulseTween/);
  assert.match(dailyLoginModalSource, /ease: 'Sine\.easeInOut'/);
  assert.match(dailyLoginModalSource, /repeat: -1/);
  assert.match(dailyLoginModalSource, /if \(reducedMotion \|\| busy/);
  assert.match(dailyLoginModalSource, /stopAnimationTweens\(\)/);
  assert.doesNotMatch(dailyLoginModalSource, /\bbutton\(/);
  assert.match(paperIconsSource, /function drawInkBottle\(/);
  assert.match(paperIconsSource, /graphics\.fillStyle\(UI\.creamHex, 1\)/);
  assert.match(
    paperIconsSource,
    /if \(key === 'gift'\)[\s\S]*fillRoundedRect[\s\S]*strokeRoundedRect/
  );
  assert.doesNotMatch(homeSource, /openCarePicker/);
  assert.match(homeSource, /graduatedScribbit \? enterTour/);
  assert.match(homeSource, /startScene\(this, 'ArenaHome'\)/);
  assert.doesNotMatch(appDockSource, /key: 'draw'|route: 'dailyDraw'/);
  assert.match(
    visualAssetsSource,
    /HOME_STAGE_TEXTURE = 'scribbits-home-stage'/
  );
  assert.match(
    visualAssetsSource,
    /HOME_TITLE_TEXTURE = 'scribbits-home-title'/
  );
  assert.match(visualAssetsSource, /assetUrl\('scribbits-home-title\.webp'\)/);
  assert.match(visualAssetsSource, /HOME_PROP_TEXTURES/);
  assert.doesNotMatch(visualAssetsSource, /scribbits-home-(?:bowl|bed)\.webp/);
  assert.match(liveSpriteSource, /jiggle\(\): void/);
  assert.match(liveSpriteSource, /repeat: this\.reduceMotion \? 0 : 2/);
  assert.match(
    liveSpriteSource,
    /scene\.add\.mesh2d\([\s\S]*?geometry\.indices,[\s\S]{0,240}?true\s*\)/,
    'WebGL LiveSprites must flip top-down image UVs into GL texture space'
  );
});
