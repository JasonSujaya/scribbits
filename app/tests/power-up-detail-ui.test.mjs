import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const detailSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'detailmodal.ts'),
  'utf8'
);
const paperIconsSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'papericons.ts'),
  'utf8'
);
const powerUpDraftSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'powerupdraft.ts'),
  'utf8'
);
const mockSource = readFileSync(
  join(process.cwd(), 'scripts', 'dev-mock.mjs'),
  'utf8'
);
const drawSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'scenes', 'Draw.ts'),
  'utf8'
);
const homeSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'scenes', 'ScribbitHome.ts'),
  'utf8'
);
const replaySource = readFileSync(
  join(process.cwd(), 'src', 'client', 'scenes', 'Replay.ts'),
  'utf8'
);
const registrySource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'registry.ts'),
  'utf8'
);
const postFightActionsSource = readFileSync(
  join(process.cwd(), 'src', 'client', 'lib', 'replaypostfightactions.ts'),
  'utf8'
);

test('birth offers wait for the only reveal action before opening and recover on Home', () => {
  assert.match(powerUpDraftSource, /offer\.source === 'birth'/);
  assert.match(powerUpDraftSource, /FIRST POWER-UP · CHOOSE 1/);
  assert.match(drawSource, /pendingBirthPowerUpOffer/);
  assert.match(
    drawSource,
    /const actionLabel = this\.pendingBirthPowerUpOffer[\s\S]*?'CHOOSE FIRST POWER-UP'[\s\S]*?\(\) => this\.continueAfterBirth\(scribbit\)/
  );
  assert.match(
    drawSource,
    /private continueAfterBirth\(scribbit: Scribbit\): void \{[\s\S]*?if \(this\.pendingBirthPowerUpOffer\) \{[\s\S]*?this\.openBirthPowerUpDraft\(scribbit\);[\s\S]*?return;/
  );
  assert.match(
    drawSource,
    /this\.pendingBirthPowerUpOffer = null;[\s\S]*?this\.updateFirstFightAction\(scribbit\);/
  );
  assert.match(
    drawSource,
    /private updateFirstFightAction\(scribbit: Scribbit\): void \{[\s\S]*?setIconButtonLabel\(this\.firstFightButton, 'START FIRST FIGHT'\)/
  );
  assert.doesNotMatch(
    drawSource,
    /delayedCall\([^)]*[\s\S]{0,160}openBirthPowerUpDraft/
  );
  assert.match(homeSource, /pendingPowerUpOffers/);
  assert.match(homeSource, /private openPendingPowerUpOffer\(\)/);
  assert.match(mockSource, /getOrCreateMockBirthPowerUpOffer/);
});

test('persisted battle offers stay mandatory across either result layout and recover on Home', () => {
  assert.match(
    replaySource,
    /private openRequiredPowerUpDraft\([\s\S]{0,1800}pendingPowerUpOffers:[\s\S]{0,240}pendingOffer\.id !== offer\.id/
  );
  assert.ok(
    replaySource.match(/primaryRequired: primaryAction\?\.kind === 'powerUp'/g)
      ?.length >= 2
  );
  assert.ok(
    replaySource.match(/openRequiredPowerUpDraft\(mine,/g)?.length >= 2,
    'both result layouts must honor the same persisted offer when one exists'
  );
  assert.match(
    postFightActionsSource,
    /if \(!input\.primaryRequired\) addUtilityActions\(utilityY\)/
  );
  assert.match(
    registrySource,
    /pendingPowerUpOffers:[\s\S]{0,300}powerUpOffer/
  );
  assert.match(homeSource, /private openPendingPowerUpOffer\(\)/);
});

test('birth reveal gives the newborn a canvas-scale showcase', () => {
  assert.match(drawSource, /const BIRTH_REVEAL_CARD_WIDTH = 620/);
  assert.match(drawSource, /const BIRTH_REVEAL_CARD_HEIGHT = 640/);
  assert.match(drawSource, /const BIRTH_REVEAL_CARD_LIFT = 32/);
  assert.match(drawSource, /const cardY = contentY - BIRTH_REVEAL_CARD_LIFT/);
  assert.match(drawSource, /const artY = contentY - cardH \/ 2 \+ 190/);
  assert.match(drawSource, /displaySize: BIRTH_NEWBORN_DISPLAY_SIZE/);
  assert.match(
    drawSource,
    /targets: \[mainLabel, roleIcon, detailLabel\]/
  );
  assert.doesNotMatch(drawSource, /BIRTH_REVEAL_HALO_RADIUS/);
});

test('Scribbit details show a five-slot icon-first Power-Up build', () => {
  assert.match(
    detailSource,
    /POWER-UPS \$\{ownedPowerUpIds\.length\}\/\$\{MAXIMUM_POWER_UPS\}/
  );
  assert.match(detailSource, /powerUpPaperIcon\(scene, powerUpId/);
  assert.match(detailSource, /slotIndex < MAXIMUM_POWER_UPS/);
  assert.match(detailSource, /TAP TO SEE ALL/);
  assert.doesNotMatch(
    detailSource,
    /Ink Mods|INK MODS|'YOUR ELEMENT'|elementBadge|ELEMENT_PAYLOAD_GUIDE/
  );
});

test('Scribbit details open as a living, tappable character showcase', () => {
  assert.match(detailSource, /const showcaseLayer = scene\.add\.container/);
  assert.match(detailSource, /showcaseLiveSprite = new LiveSprite/);
  assert.match(detailSource, /showcaseLiveSprite\.breathe\(\)/);
  assert.match(detailSource, /showcaseLiveSprite\?\.jiggle\(\)/);
  assert.match(detailSource, /TAP TO PLAY/);
  assert.match(detailSource, /label: `Play with \$\{scribbit\.name\}`/);
  assert.match(detailSource, /showcaseLiveSprite\?\.destroy\(\)/);
});

test('every Power-Up owns a distinct code-native paper icon', () => {
  const powerUpIds = [
    'v1-edge-spring',
    'v1-smudge-step',
    'v1-paper-shield',
    'v1-combo-spark',
    'v1-center-fold',
    'v1-double-doodle',
    'v1-backup-plan',
    'v1-counter-sketch',
    'v1-wallop',
    'v1-echo-mark',
    'v1-last-scribble',
    'v1-second-draft',
    'v1-paper-twin',
    'v1-masterpiece',
    'v2-bank-shot',
    'v2-returning-stroke',
    'v2-orbiting-nib',
    'v2-wider-halo',
    'v2-paint-splash',
    'v2-wet-paint',
  ];
  assert.match(paperIconsSource, /export function powerUpPaperIcon\(/);
  powerUpIds.forEach((powerUpId) => {
    assert.match(paperIconsSource, new RegExp(`key === '${powerUpId}'`));
  });
  assert.match(paperIconsSource, /setData\('power-up-id', key\)/);
  assert.match(paperIconsSource, /graphics\.arc\(-7 \* scale/);
});

test('Power-Up choices react to hover and press without forcing motion', () => {
  assert.match(powerUpDraftSource, /control\.addEventListener\('pointerenter'/);
  assert.match(powerUpDraftSource, /control\.addEventListener\('pointerleave'/);
  assert.match(powerUpDraftSource, /control\.addEventListener\('pointerdown'/);
  assert.match(
    powerUpDraftSource,
    /control\.addEventListener\('pointercancel'/
  );
  assert.match(powerUpDraftSource, /canvasFocusIsKeyboardDriven/);
  assert.match(powerUpDraftSource, /hoverShadow\.setFillStyle/);
  assert.match(powerUpDraftSource, /UNCOMMON_CARD_COLOR = 0x49a36d/);
  assert.match(powerUpDraftSource, /const tierRail = scene\.add\.rectangle/);
  assert.match(
    powerUpDraftSource,
    /const tierIconBacking = scene\.add\.circle/
  );
  assert.match(
    powerUpDraftSource,
    /const legendaryIconHalo = scene\.add\.star/
  );
  assert.match(powerUpDraftSource, /const legendaryGlint = scene\.add\.star/);
  assert.match(powerUpDraftSource, /drawRarityChip/);
  assert.doesNotMatch(powerUpDraftSource, /name\.setColor/);
  assert.doesNotMatch(powerUpDraftSource, /tweens\.chain/);
  assert.match(powerUpDraftSource, /if \(hovered\) return/);
  assert.match(powerUpDraftSource, /if \(reduceMotion\)/);
});

test('Power-Up cards twitch at random while idle and clean up safely', () => {
  assert.match(powerUpDraftSource, /IDLE_SHAKE_DELAY_MINIMUM_MS = 1_300/);
  assert.match(powerUpDraftSource, /IDLE_SHAKE_DELAY_MAXIMUM_MS = 2_800/);
  assert.match(powerUpDraftSource, /scene\.time\.delayedCall\(delay/);
  assert.match(
    powerUpDraftSource,
    /availableMotions\[randomInteger\(0, availableMotions\.length - 1\)\]/
  );
  assert.match(powerUpDraftSource, /Math\.random\(\) < 0\.5 \? -1 : 1/);
  assert.match(
    powerUpDraftSource,
    /if \(reduceMotion \|\| destroyed \|\| busy\) return;/
  );
  assert.match(powerUpDraftSource, /idleShakeTimer\?\.remove\(false\)/);
  assert.match(powerUpDraftSource, /scene\.tweens\.killTweensOf\(card\)/);
  assert.match(powerUpDraftSource, /yoyo: true,[\s\S]*?repeat: 1/);
  assert.match(
    powerUpDraftSource,
    /onComplete: \(\) => \{[\s\S]*?modal\.focusInitial\(controls\[0\]\);[\s\S]*?scheduleIdleMotion\(\);/
  );
});

test('Power-Up guide divides the full catalog across eight focused pages', () => {
  assert.match(detailSource, /'YOUR BUILD'/);
  assert.match(detailSource, /'COMMON POWER-UPS'/);
  assert.match(detailSource, /'UNCOMMON POWER-UPS'/);
  assert.match(detailSource, /'RARE POWER-UPS'/);
  assert.match(detailSource, /'EPIC \+ LEGENDARY'/);
  assert.match(detailSource, /'LONGSHOT TECHNIQUES'/);
  assert.match(detailSource, /'MAGE TECHNIQUES'/);
  assert.match(detailSource, /'WIN \+ EARN XP → CHOOSE 1'/);
  assert.match(
    detailSource,
    /const guidePages = \[buildPage, \.\.\.catalogPages, earnPage\]/
  );
  assert.match(
    detailSource,
    /POWER_UP_GUIDE_PAGE_COUNT = POWER_UP_CATALOG_SECTIONS\.length \+ 2/
  );
  assert.match(detailSource, /section\.ids\.forEach/);
  assert.match(detailSource, /CHARCOAL CARDS/);
  assert.match(detailSource, /GREEN CARDS/);
  assert.match(detailSource, /BLUE CARDS/);
  assert.match(detailSource, /PURPLE = EPIC · GOLD = LEGENDARY/);
  assert.match(detailSource, /STANDARD WIN/);
  assert.match(detailSource, /CHAMPION WIN/);
  assert.match(detailSource, /3 DISTINCT ROLLS · CARD ORDER SHUFFLED/);
  assert.match(detailSource, /LOSS OR \+0 XP = NO POWER-UP/);
});

test('catalog renders collectible Power-Up cards and hides undiscovered effects', () => {
  assert.match(detailSource, /collectDiscoveredPowerUpIds/);
  assert.match(detailSource, /LOCKED_POWER_UP_FILL = 0xd4c7ae/);
  assert.match(detailSource, /const featuredCardHeight = 570/);
  assert.match(detailSource, /const renderFeaturedPowerUp =/);
  assert.match(detailSource, /const renderSelectors =/);
  assert.match(detailSource, /'UNDISCOVERED'/);
  assert.match(detailSource, /paperIcon\(scene, 'lock'/);
  assert.match(detailSource, /size: 112,[\s\S]*?fill: rarity\.color/);
  assert.match(detailSource, /definition\.shortName,[\s\S]*?30,/);
  assert.match(detailSource, /definition\.when,[\s\S]*?21,/);
  assert.match(detailSource, /definition\.effect,[\s\S]*?23,/);
  assert.match(detailSource, /onActivate: \(\) => renderFeaturedPowerUp/);
  assert.doesNotMatch(detailSource, /const catalogCardHeight/);
  assert.doesNotMatch(detailSource, /`WHEN  \$\{definition\.when\}`/);
  assert.doesNotMatch(detailSource, /`THEN  \$\{definition\.effect\}`/);
  assert.doesNotMatch(
    detailSource,
    /'MYSTERY POWER-UP'|'WIN BATTLES TO FIND IT'|Choose it after a win/
  );
  assert.match(
    detailSource,
    /Undiscovered \$\{rarity\.label\} Power-Up\. Win battles and choose it to reveal its effect\./
  );
  assert.match(detailSource, /catalogControlsByPage\.forEach/);
  assert.match(detailSource, /control\.hidden = !visible/);
  assert.match(detailSource, /control\.disabled = !visible/);
  assert.match(
    detailSource,
    /catalogControlsByPage\[safePageIndex - 1\]\?\.\[0\]\?\.focus\(\)/
  );
  assert.match(mockSource, /powerUpIds: \['v1-edge-spring'\]/);
  assert.match(mockSource, /discoveredPowerUpIds:/);
});
