import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const arenaSource = await readFile(
  new URL('../src/client/scenes/ArenaHome.ts', import.meta.url),
  'utf8'
);
const gallerySource = await readFile(
  new URL('../src/client/scenes/Gallery.ts', import.meta.url),
  'utf8'
);
const shopSource = await readFile(
  new URL('../src/client/scenes/Shop.ts', import.meta.url),
  'utf8'
);
const capsuleMachineSource = await readFile(
  new URL('../src/client/lib/capsulemachine.ts', import.meta.url),
  'utf8'
);
const inkEarningGuideSource = await readFile(
  new URL('../src/client/lib/inkearningguide.ts', import.meta.url),
  'utf8'
);
const capsulePrizeGuideSource = await readFile(
  new URL('../src/client/lib/capsuleprizeguide.ts', import.meta.url),
  'utf8'
);
const featuredGearDetailSource = await readFile(
  new URL('../src/client/lib/featuredgeardetail.ts', import.meta.url),
  'utf8'
);
const visualAssetsSource = await readFile(
  new URL('../src/client/lib/visualassets.ts', import.meta.url),
  'utf8'
);
const replaySource = await readFile(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
);
const drawSource = await readFile(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const rivalRunFlowSource = await readFile(
  new URL('../src/client/lib/rivalrunflow.ts', import.meta.url),
  'utf8'
);
const registrySource = await readFile(
  new URL('../src/client/lib/registry.ts', import.meta.url),
  'utf8'
);
const seasonBoardSource = await readFile(
  new URL('../src/client/lib/seasonboard.ts', import.meta.url),
  'utf8'
);

test('Arena leads with the authoritative season and ranking action', () => {
  assert.match(arenaSource, /this\.state\.season\.latestFinalized/);
  assert.match(arenaSource, /seasonStandingText\(\)/);
  assert.match(arenaSource, /openSeasonRanking\(\)/);
  assert.match(arenaSource, /paperCard\(this, 0, 0, cardWidth, cardHeight\)/);
  assert.match(arenaSource, /'YOUR RANK'/);
  assert.match(arenaSource, /'SEASON PTS'/);
  assert.match(arenaSource, /'VIEW STANDINGS'/);
  assert.doesNotMatch(arenaSource, /'VIEW TOP 10 STANDINGS  ›'/);
  assert.match(arenaSource, /private seasonHeaderText\(/);
  assert.match(arenaSource, /DAYS LEFT  •  \$\{rank\} RANK/);
  assert.match(arenaSource, /paperIcon\(this, 'trophy'/);
  assert.match(arenaSource, /event\.scoreMultiplier\}× SEASON POINTS/);
  assert.match(arenaSource, /RUMBLE PICKS SET THE SEASON RANKING/);
  assert.match(seasonBoardSource, /fetchSeasonBoard\(\)/);
  assert.match(seasonBoardSource, /board\.top\.slice\(0, 10\)/);
  assert.match(seasonBoardSource, /YOU #\$\{standing\.rank\}/);
});

test('Arena is a seasonal challenge board instead of a versus screen', () => {
  assert.match(arenaSource, /arenaStage\(this, -1000\)/);
  assert.match(arenaSource, /private buildPinnedArenaHeader\(\): void/);
  assert.match(
    arenaSource,
    /PINNED_HEADER_HEIGHT = 128[\s\S]*\.setScrollFactor\(0\)[\s\S]*\.setDepth\(2100\)/,
    'scrolling competition content must pass beneath a pinned Arena header instead of covering it'
  );
  assert.match(arenaSource, /translate\('screen\.arena'\)/);
  assert.match(arenaSource, /paperIcon\(this, 'clock'/);
  assert.match(arenaSource, /private buildCompetitionHub\(/);
  assert.match(arenaSource, /"TODAY'S ARENA"/);
  assert.match(arenaSource, /'COMPETE TODAY'/);
  assert.match(arenaSource, /'SEASON RUMBLE'/);
  assert.match(arenaSource, /'CHAMPION CONTRACT'/);
  assert.doesNotMatch(arenaSource, /title: 'RIVAL RUN'/);
  assert.doesNotMatch(arenaSource, /private renderBattleOpponent\(/);
  assert.match(arenaSource, /arenaArrowButton\(154, -138, 'previous'/);
  assert.match(arenaSource, /cycleArenaFighter\(1\)/);
  assert.match(arenaSource, /UI_BUTTON_TEXTURES\[direction\]/);
});

test('Arena gives the rotating venue challenge a dedicated card', () => {
  assert.match(
    arenaSource,
    /getBattleArenaForDay\(this\.state\.dayNumber\)/,
    'Arena must reveal the canonical daily battle arena before the player fights'
  );
  assert.match(arenaSource, /battleArena\.name\.toUpperCase\(\)/);
  assert.match(arenaSource, /battleArena\.challengeLabel\.toUpperCase\(\)/);
  assert.match(
    arenaSource,
    /paperIcon\(this, 'target'[\s\S]*battleArena\.challengeLabel\.toUpperCase\(\)/,
    'the Arena must keep the daily goal visible and icon-led'
  );
  assert.match(arenaSource, /'ARENA CHALLENGE'/);
  assert.match(arenaSource, /paperCard\(this, 0, 0, cardWidth, 158\)/);
  assert.match(arenaSource, /paperIcon\(this, 'info'/);
  assert.match(arenaSource, /battleArena\.shortRule/);
});

test('Replay keeps the arena goal visible when founder story copy is present', () => {
  assert.match(replaySource, /private drawArenaChallengeStamp\(/);
  assert.equal(
    (replaySource.match(/this\.drawArenaChallengeStamp\(/g) ?? []).length,
    2,
    'win and loss outcomes must both render the arena goal stamp'
  );
  assert.doesNotMatch(
    replaySource,
    /founderOutcome \?\?[\s\S]{0,80}this\.battleArenaChallengeResult\(\)\?\.label/,
    'the venue goal must not disappear into the mutually exclusive story line'
  );
});

test('Arena reuses the shared paper button system instead of local box variants', () => {
  assert.match(arenaSource, /private competitionCard\(options:/);
  assert.match(arenaSource, /iconButton\([\s\S]*options\.actionLabel/);
  assert.doesNotMatch(arenaSource, /private battleChoiceChip\(/);
  assert.doesNotMatch(arenaSource, /private simpleFightButton\(/);
  assert.doesNotMatch(arenaSource, /private rumblePickButton\(/);
  for (const retiredArenaSurface of [
    'buildPrimaryAction',
    'buildRoster',
    'CONTINUE THREAD',
    'YOUR SCRIBBITS',
  ]) {
    assert.doesNotMatch(
      arenaSource,
      new RegExp(retiredArenaSurface),
      `Arena must not restore the retired ${retiredArenaSurface} dashboard surface`
    );
  }
});

test('Arena keeps prediction compact and removes the old pick-grid language', () => {
  assert.match(arenaSource, /title: 'SEASON RUMBLE'/);
  assert.match(arenaSource, /rumblePickLocked \? 'PICKED' : 'MAKE PICK'/);
  assert.doesNotMatch(arenaSource, /PICK A WINNER|DRAW TODAY|PICK LOCKED/);
  assert.doesNotMatch(
    arenaSource,
    /'CHOOSE RIVAL'|buildRumbleSummary\(/,
    'Arena home must use the competitive challenge card without the old pick grid'
  );
  assert.doesNotMatch(arenaSource, /YOUR CHALLENGER/);
  assert.doesNotMatch(arenaSource, /BACKED/);
  assert.doesNotMatch(arenaSource, /enterRumble|doEnter/);
  assert.doesNotMatch(arenaSource, /showChallengerPicker/);
  assert.doesNotMatch(arenaSource, /handLettered\(this, [^\n]*'ARENA'/);
});

test('The empty Arena keeps Draw as its direct primary action', () => {
  assert.match(
    arenaSource,
    /'DRAW YOUR FIRST COMPETITOR'[\s\S]*navigateToDailyDraw\(this\)/,
    'the empty Arena must route its icon-led primary action into Draw'
  );
});

test('Mystery Ink lives in Shop while Bag remains equipment-only', () => {
  assert.doesNotMatch(
    arenaSource,
    /buildInkChip|openCapsuleMachine|pullCapsule/
  );
  assert.doesNotMatch(gallerySource, /openCapsuleMachine|pullCapsule/);
  assert.match(shopSource, /openCapsuleMachine\(this/);
  assert.match(shopSource, /pullCapsule\(operationId\)/);
  assert.match(shopSource, /onViewCollection:/);
  assert.match(capsuleMachineSource, /'VIEW BAG'/);
  assert.match(capsuleMachineSource, /OPEN 10/);
  assert.match(capsuleMachineSource, /COMING SOON/);
  assert.match(capsuleMachineSource, /COSMETIC ONLY/);
  assert.match(capsuleMachineSource, /'LOOT'/);
  assert.doesNotMatch(capsuleMachineSource, /BATTLE SPOILS/);
  assert.match(capsuleMachineSource, /Inspect featured Gear:/);
  assert.match(capsuleMachineSource, /width: 110,[\s\S]{0,40}height: 110/);
  assert.match(capsuleMachineSource, /featuredGearControl\.hidden = visible/);
  assert.match(visualAssetsSource, /scribbits-shop-chest-closed\.webp/);
  assert.match(visualAssetsSource, /scribbits-shop-chest-open\.webp/);
  assert.match(visualAssetsSource, /scribbits-shop-claw-machine-shell\.webp/);
  assert.match(capsuleMachineSource, /SHOP_CHEST_TEXTURES\.open/);
  assert.match(capsuleMachineSource, /SHOP_CHEST_TEXTURES\.closed/);
  const chestArtSource = capsuleMachineSource.slice(
    capsuleMachineSource.indexOf('function createChestArt('),
    capsuleMachineSource.indexOf('function highestRarity(')
  );
  assert.match(chestArtSource, /scene\.add[\s\S]{0,30}\.image\(/);
  assert.doesNotMatch(
    chestArtSource,
    /scene\.add\.graphics|fillRoundedRect|lidGraphics/
  );
  assert.match(featuredGearDetailSource, /createStickerModalShell\(/);
  assert.match(featuredGearDetailSource, /getGearTechniqueEffect\(entry, 1\)/);
  assert.match(featuredGearDetailSource, /renderCosmeticPreview\(/);
  assert.match(featuredGearDetailSource, /createStickerShine\(/);
  assert.match(featuredGearDetailSource, /prefersReducedMotion\(\)/);
  assert.match(
    capsuleMachineSource,
    /reward chests containing Gear and styles/
  );
  assert.doesNotMatch(capsuleMachineSource, /open one or ten cosmetic chests/);
  assert.doesNotMatch(capsuleMachineSource, /OPEN 100|AUTO.OPEN/);
  assert.doesNotMatch(capsuleMachineSource, /INK KIT/);
});

test('Shop explains the intended gameplay Ink sources without Care or IAP', () => {
  assert.match(capsuleMachineSource, /paperIconButton\(/);
  assert.match(capsuleMachineSource, /'info'/);
  assert.match(capsuleMachineSource, /label: 'How to earn Ink'/);
  assert.match(capsuleMachineSource, /openInkEarningGuide\(/);
  assert.match(inkEarningGuideSource, /icon: 'sword'/);
  assert.match(inkEarningGuideSource, /WIN BATTLES/);
  assert.match(inkEarningGuideSource, /first growing-stage Spar win/);
  assert.match(inkEarningGuideSource, /icon: 'trophy'/);
  assert.match(inkEarningGuideSource, /SEASON RANKING/);
  assert.match(inkEarningGuideSource, /seasonal rank rewards are coming/);
  assert.match(inkEarningGuideSource, /icon: 'clock'/);
  assert.match(inkEarningGuideSource, /DAILY LOGIN/);
  assert.match(inkEarningGuideSource, /Login 7 gives Epic Golden Crown Gear/);
  assert.equal(
    (inkEarningGuideSource.match(/phaseLabel: 'UPCOMING'/g) ?? []).length,
    1
  );
  assert.doesNotMatch(inkEarningGuideSource, /CARE|INK_REWARDS\.care/);
  assert.match(inkEarningGuideSource, /NO IAP/);
  assert.match(inkEarningGuideSource, /createStickerModalShell\(/);
});

test('Shop shows the current season prize pool and its top wins', () => {
  assert.match(shopSource, /arena\.season\.current\?\.name/);
  assert.match(capsuleMachineSource, /paperIconButton\([\s\S]*'gift'/);
  assert.match(capsuleMachineSource, /openCapsulePrizeGuide\(/);
  assert.match(capsuleMachineSource, /claw-machine prizes and odds/);
  assert.match(capsulePrizeGuideSource, /TOP WINS THIS SEASON/);
  assert.match(capsulePrizeGuideSource, /GEAR_CATALOG_ENTRIES\.filter/);
  assert.match(capsulePrizeGuideSource, /entry\.rarity === 'legendary'/);
  assert.match(capsulePrizeGuideSource, /COSMETIC_CATALOG\.length/);
  assert.match(capsulePrizeGuideSource, /renderCosmeticPreview\(/);
  assert.match(capsulePrizeGuideSource, /CAPSULE_RARITY_PERCENTAGES/);
  assert.match(capsulePrizeGuideSource, /CAPSULE_PITY/);
});

test('the first completed Rival Run opens first Gear only from committed Ink', () => {
  assert.match(replaySource, /planFirstChestTrailEntry\(/);
  assert.match(replaySource, /refreshArenaAndNavigate\(\{/);
  assert.doesNotMatch(replaySource, /setFirstChestTrail\(this/);
  assert.doesNotMatch(arenaSource, /takeFirstChestTrail\(this\)/);
  assert.doesNotMatch(arenaSource, /continueFirstChestTrail\(/);
  assert.match(
    replaySource,
    /if \(step\?\.kind === 'shop'\) \{[\s\S]{0,80}startScene\(this, 'Shop'\)/,
    'first Gear may open Shop only after refreshed server state confirms the balance'
  );
  assert.match(replaySource, /label: 'FIRST GEAR'/);
  assert.doesNotMatch(arenaSource, /careForScribbit|openCarePicker|doCare/);
  assert.match(
    capsuleMachineSource,
    /firstChestVisit = progress\.pullCount === 0/
  );
  assert.match(
    capsuleMachineSource,
    /function createClawMachine\(/,
    'Shop rewards must use the claw-machine presentation'
  );
  assert.match(capsuleMachineSource, /FIRST GEAR CLAW/);
  assert.match(capsuleMachineSource, /SHOP_CLAW_MACHINE_SHELL_TEXTURE/);
  assert.match(capsuleMachineSource, /DROP CLAW/);
  assert.match(capsuleMachineSource, /'tiny-sword'/);
  assert.match(capsuleMachineSource, /'comet-crayon-blade'/);
  assert.match(capsuleMachineSource, /'star-eye-mask'/);
  assert.match(capsuleMachineSource, /renderCosmeticPreview\(\{/);
  assert.match(capsuleMachineSource, /function startClawSearch\(/);
  assert.match(capsuleMachineSource, /function animateClawCatch\(/);
  assert.match(capsuleMachineSource, /function celebrateClawMachine\(/);
  assert.match(capsuleMachineSource, /DRAW ONCE TO EARN \$\{nextCost\} INK/);
  assert.match(
    capsuleMachineSource,
    /\.setVisible\(!useClawMachine\)/,
    'an empty collection meter must not compete with the first chest promise'
  );
  assert.match(
    capsuleMachineSource,
    /featuredGearControl = useClawMachine[\s\S]{0,30}\? null/,
    'Shop must keep the claw machine as its only hero on every visit'
  );
  assert.match(
    capsuleMachineSource,
    /openOneButton\.setEnabled\(affordance\.primaryEnabled\)/,
    'an unaffordable first play must keep its explanation visible while dimming the control'
  );
  assert.match(
    capsuleMachineSource,
    /x: x - 75 \* CLAW_MACHINE_SCALE[\s\S]{0,140}width: 150 \* CLAW_MACHINE_SCALE/,
    'the native action must cover the rendered claw-machine button'
  );
  assert.match(
    capsuleMachineSource,
    /costText\.setText\(`\$\{nextCost\} INK`\)/,
    'the cheaper Ink price must be spelled out beneath the action'
  );
  assert.ok(
    capsuleMachineSource.indexOf(
      'await animateClawCatch(scene, clawMachine, result.pull)'
    ) > capsuleMachineSource.indexOf("if ('error' in result)"),
    'the claw may catch only the exact server-confirmed reward after a successful response'
  );
  assert.doesNotMatch(
    capsuleMachineSource,
    /label\(scene, width \/ 2, 270, 'FIRST CHEST'/,
    'the old floating first-chest text must not compete with the machine'
  );
  assert.match(
    shopSource,
    /setGalleryCollectionSection\(this, reward\.category\)/
  );
  assert.doesNotMatch(capsuleMachineSource, /WIN A BATTLE/);
});

test('Arena rematches use Rival Run while birth uses one simple random fight', () => {
  assert.match(arenaSource, /this\.rivalRunFlow = openRivalRun\(this/);
  assert.match(replaySource, /this\.rivalRunFlow = openRivalRun\(this/);
  assert.doesNotMatch(arenaSource, /\bspar\(/);
  assert.doesNotMatch(replaySource, /\bspar\(/);
  assert.match(drawSource, /await spar\(scribbit\.id\)/);
  assert.doesNotMatch(drawSource, /openRivalRun/);
  assert.match(
    rivalRunFlowSource,
    /fetchSparRivals\(options\.challenger\.id\)/
  );
  assert.match(
    rivalRunFlowSource,
    /spar\(options\.challenger\.id, rival\.id, rivalRun\)/
  );
  assert.match(rivalRunFlowSource, /createSparRivalDraft\(scene/);
  assert.match(rivalRunFlowSource, /stageDirectBattle\(/);
  assert.match(rivalRunFlowSource, /showVsCeremony\(scene/);
});

test('a birth replay cannot stage the wrong Scribbit or expose old receipts', () => {
  assert.match(registrySource, /if \(!opponent\) return null/);
  assert.match(
    registrySource,
    /type ReplayEntryMode = 'fresh' \| 'birth' \| 'saved'/
  );
  assert.match(arenaSource, /if \(!takeSkipArenaReceiptsOnce\(this\)\)/);
  assert.match(drawSource, /skipArenaReceiptsOnce\(this\)/);
});

test('Champion keeps its focused lifecycle-safe launcher', () => {
  assert.match(arenaSource, /private sceneEpoch = 0/);
  assert.match(arenaSource, /private refreshRequestEpoch = 0/);
  assert.match(
    arenaSource,
    /planArenaMutationResponse\([\s\S]*refreshOnNextActivation = true/,
    'Arena mutation continuations must use the shared lifecycle policy'
  );
  assert.ok(
    (arenaSource.match(/acceptMutationResponse\(sceneEpoch\)/g) ?? []).length >=
      6,
    'every Arena mutation continuation must pass through the shared lifecycle guard'
  );
  assert.match(
    arenaSource,
    /const requestEpoch = \+\+this\.refreshRequestEpoch[\s\S]*planArenaRefreshResponse\([\s\S]*action === 'refresh-next'/,
    'Arena refreshes must reconcile stale scene responses through the shared lifecycle policy'
  );
  assert.match(arenaSource, /private async launchChampionBattle\(/);
  assert.match(arenaSource, /await bossChallenge\(scribbit\.id\)/);
  assert.match(
    arenaSource,
    /finally \{\s*if \(sceneEpoch === this\.sceneEpoch\) \{\s*this\.busy = false;/
  );
});

test('Competition cards expose direct accessible challenge actions', () => {
  assert.match(
    arenaSource,
    /Choose tonight's Rumble prediction for season points/
  );
  assert.match(
    arenaSource,
    /Start today’s Champion Contract with the selected Scribbit/
  );
  assert.doesNotMatch(
    arenaSource,
    /Start a three-bout Rival Run with the selected Scribbit/
  );
  assert.doesNotMatch(arenaSource, /aria-pressed/);
});
