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
const battleArenaPresentationSource = await readFile(
  new URL('../src/client/lib/battlearenapresentation.ts', import.meta.url),
  'utf8'
);
const battleArenaSource = await readFile(
  new URL('../src/shared/battlearena.ts', import.meta.url),
  'utf8'
);
const replayBattleHudSource = await readFile(
  new URL('../src/client/lib/replaybattlehud.ts', import.meta.url),
  'utf8'
);
const venueBoardSource = await readFile(
  new URL('../src/client/lib/venueboard.ts', import.meta.url),
  'utf8'
);

test('Arena leads with the authoritative season and ranking action', () => {
  assert.match(arenaSource, /this\.state\.season\.latestFinalized/);
  assert.match(arenaSource, /seasonStandingText\(\)/);
  assert.match(arenaSource, /openSeasonRanking\(\)/);
  assert.match(arenaSource, /paperCard\(this, 0, 0, cardWidth, cardHeight\)/);
  assert.match(arenaSource, /'YOUR RANK'/);
  assert.match(arenaSource, /'SEASON PTS'/);
  assert.match(arenaSource, /'REWARDS & STANDINGS'/);
  assert.match(arenaSource, /const seasonControlsShiftY = 36/);
  assert.match(arenaSource, /FIELD_CHALLENGE_TOP_OFFSET = -50/);
  assert.doesNotMatch(arenaSource, /'VIEW TOP 10 STANDINGS  ›'/);
  assert.match(arenaSource, /private seasonHeaderText\(/);
  assert.match(arenaSource, /DAYS LEFT  •  \$\{rank\} RANK/);
  assert.match(arenaSource, /paperIcon\(this, 'trophy'/);
  assert.match(arenaSource, /event\.scoreMultiplier\}× SEASON POINTS/);
  assert.match(arenaSource, /RUMBLE PICKS SET THE SEASON RANKING/);
  assert.match(seasonBoardSource, /fetchSeasonBoard\(\)/);
  assert.match(seasonBoardSource, /'rewards' \| 'standings' = 'rewards'/);
  assert.match(seasonBoardSource, /SEASON_ONE_PARTICIPATION_MILESTONES/);
  assert.match(seasonBoardSource, /PICKS TO QUALIFY/);
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
  assert.match(
    arenaSource,
    /PINNED_HEADER_HEIGHT,[\s\S]*UI\.paper,[\s\S]*const lowerEdge = this\.add\.graphics\(\)/,
    'the pinned header should continue the Arena paper instead of looking like a detached brown slab'
  );
  assert.match(arenaSource, /translate\('screen\.arena'\)/);
  assert.match(arenaSource, /paperIcon\(this, 'clock'/);
  assert.match(arenaSource, /private buildCompetitionHub\(/);
  assert.match(arenaSource, /'ARENA TOUR'/);
  assert.doesNotMatch(arenaSource, /'COMPETE TODAY'/);
  assert.doesNotMatch(arenaSource, /'SEASON RUMBLE'/);
  assert.doesNotMatch(arenaSource, /'CHAMPION CONTRACT'/);
  assert.doesNotMatch(arenaSource, /title: 'RIVAL RUN'/);
  assert.doesNotMatch(arenaSource, /private renderBattleOpponent\(/);
  assert.doesNotMatch(arenaSource, /'MATURE COMPETITOR'/);
  assert.doesNotMatch(arenaSource, /fighterCarousel|arenaArrowButton/);
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
  assert.match(arenaSource, /paperCard\(this, 0, 50, cardWidth, 600\)/);
  assert.match(
    arenaSource,
    /battleArenaPreview\([\s\S]*?battleArena\.id,[\s\S]*?0,[\s\S]*?-72,[\s\S]*?cardWidth - 48,[\s\S]*?188/
  );
  assert.match(arenaSource, /paperIcon\(this, 'info'/);
  assert.match(arenaSource, /battleArena\.shortRule/);
  assert.match(
    arenaSource,
    /`FIELD EFFECT • \$\{battleArena\.shortRule\.toUpperCase\(\)\}`/
  );
  assert.match(arenaSource, /battleArenaPreview\(/);
  assert.match(arenaSource, /'MATURE SCRIBBIT REQUIRED • READY'/);
  assert.match(arenaSource, /'MATURE SCRIBBIT REQUIRED • NOT READY'/);
  assert.match(arenaSource, /getScribbitLifecycleStage\(/);
  assert.match(
    arenaSource,
    /`NEXT NODE \$\{venueStamp\.tourEffort\}\/\$\{venueStamp\.tourEffortTarget\} • CLEAR NOW OR BUILD EFFORT`/
  );
  assert.match(arenaSource, /venueStamp\.tourClearedCount/);
  assert.match(arenaSource, /venueStamp\.tourTotal/);
  assert.match(
    arenaSource,
    /`ENTER WITH \$\{matureScribbit\.name\.toUpperCase\(\)\}`/
  );
  assert.match(arenaSource, /private startFieldChallenge\(/);
  assert.match(arenaSource, /private async launchFieldChallenge\(/);
  assert.match(arenaSource, /bossChallenge\(scribbit\.id\)/);
  assert.match(arenaSource, /stageDirectBattle\(/);
  assert.match(arenaSource, /showVsCeremony\(/);
  assert.match(arenaSource, /this\.state\.venueStamp/);
  assert.match(arenaSource, /openVenueRanking\(\)/);
  assert.match(
    arenaSource,
    /label: venueStamp\.dailyRank[\s\S]*?followCamera: true,\n\s*onActivate: \(\) => this\.openVenueRanking\(\)/,
    'the ranking tile must catch pointer input instead of passing it through an inert canvas region'
  );
  assert.match(venueBoardSource, /fetchVenueBoard\(\)/);
  assert.match(venueBoardSource, /board\.top\.slice\(0, 10\)/);
  assert.match(
    battleArenaPresentationSource,
    /fillEllipse\([\s\S]*strokeEllipse\(/
  );
});

test('Garden Patch displays its neutral bump challenge', () => {
  assert.match(
    battleArenaSource,
    /'v1-garden-patch':[\s\S]*shortRule: 'Standard rules · bump challenge'[\s\S]*modifier: \{\}/
  );
  assert.match(replaySource, /arenaRule: battleArena\.shortRule/);
  assert.match(
    replayBattleHudSource,
    /`FIELD EFFECT • \$\{input\.arenaRule\.toUpperCase\(\)\}`/
  );
});

test('Arena removes the retired Compete Today block completely', () => {
  assert.doesNotMatch(arenaSource, /'MATURE COMPETITOR'/);
  assert.doesNotMatch(arenaSource, /'COMPETE TODAY'/);
  assert.doesNotMatch(arenaSource, /title: 'SEASON RUMBLE'/);
  assert.doesNotMatch(arenaSource, /title: 'CHAMPION CONTRACT'/);
  assert.doesNotMatch(arenaSource, /private competitionCard\(/);
  assert.doesNotMatch(arenaSource, /private startBossChallenge\(/);
  assert.doesNotMatch(arenaSource, /private async launchChampionBattle\(/);
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

test('Arena keeps retired dashboard button variants out', () => {
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

test('Arena removes the home-screen prediction block and old pick-grid language', () => {
  assert.doesNotMatch(arenaSource, /title: 'SEASON RUMBLE'/);
  assert.doesNotMatch(
    arenaSource,
    /rumblePickLocked \? 'PICKED' : 'MAKE PICK'/
  );
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

test('The Arena venue does not restore a competing Draw action', () => {
  assert.doesNotMatch(arenaSource, /'DRAW YOUR FIRST COMPETITOR'/);
  assert.doesNotMatch(arenaSource, /navigateToDailyDraw\(this\)/);
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
  assert.match(capsuleMachineSource, /TAKE 10/);
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
  assert.match(
    featuredGearDetailSource,
    /getGearTechniqueEffect\(entry, rank\)/
  );
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
  assert.match(capsulePrizeGuideSource, /CAPSULE_PRIZE_CATALOG\.length/);
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
  assert.match(capsuleMachineSource, /TAKE 1 OR TAKE 10/);
  assert.match(capsuleMachineSource, /'TAKE 1'/);
  assert.match(capsuleMachineSource, /'tiny-sword'/);
  assert.match(capsuleMachineSource, /'comet-crayon-blade'/);
  assert.match(capsuleMachineSource, /'star-eye-mask'/);
  assert.match(capsuleMachineSource, /renderCosmeticPreview\(\{/);
  assert.match(capsuleMachineSource, /function startClawSearch\(/);
  assert.match(capsuleMachineSource, /function startClawIdle\(/);
  assert.match(capsuleMachineSource, /allowsAmbientMotion\(\)/);
  assert.match(capsuleMachineSource, /burstClawGrabSparks\(/);
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
    /x: x \+ \(takeOneX - CLAW_CHOICE_WIDTH \/ 2\) \* CLAW_MACHINE_SCALE[\s\S]{0,240}width: CLAW_CHOICE_WIDTH \* CLAW_MACHINE_SCALE[\s\S]{0,100}height: CLAW_CHOICE_HEIGHT \* CLAW_MACHINE_SCALE/,
    'the native action must cover the rendered TAKE 1 card'
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

test('Arena rematches use Rival Run while birth uses one simple first fight', () => {
  assert.match(arenaSource, /this\.rivalRunFlow = openRivalRun\(this/);
  assert.match(replaySource, /this\.rivalRunFlow = openRivalRun\(this/);
  assert.doesNotMatch(arenaSource, /\bspar\(/);
  assert.doesNotMatch(replaySource, /\bspar\(/);
  assert.match(
    drawSource,
    /const isPlayersFirstBattle = getArena\(this\)\?\.hasCompletedBattle === false/
  );
  assert.match(
    drawSource,
    /await spar\([\s\S]{0,100}scribbit\.id[\s\S]{0,100}isPlayersFirstBattle[\s\S]{0,20}\)/
  );
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

test('Arena keeps lifecycle-safe refresh handling for its focused field entry', () => {
  assert.match(arenaSource, /private sceneEpoch = 0/);
  assert.match(arenaSource, /private refreshRequestEpoch = 0/);
  assert.match(
    arenaSource,
    /planArenaMutationResponse\([\s\S]*refreshOnNextActivation = true/,
    'Arena mutation continuations must use the shared lifecycle policy'
  );
  assert.match(arenaSource, /acceptMutationResponse\(sceneEpoch\)/);
  assert.match(
    arenaSource,
    /const requestEpoch = \+\+this\.refreshRequestEpoch[\s\S]*planArenaRefreshResponse\([\s\S]*action === 'refresh-next'/,
    'Arena refreshes must reconcile stale scene responses through the shared lifecycle policy'
  );
  assert.doesNotMatch(arenaSource, /private async launchChampionBattle\(/);
  assert.match(arenaSource, /private async launchFieldChallenge\(/);
  assert.match(arenaSource, /await bossChallenge\(scribbit\.id\)/);
});

test('Removed competition cards expose no stale accessible actions', () => {
  assert.doesNotMatch(
    arenaSource,
    /Choose tonight's Rumble prediction for season points/
  );
  assert.doesNotMatch(
    arenaSource,
    /Start today’s Champion Contract with the selected mature Scribbit/
  );
  assert.doesNotMatch(
    arenaSource,
    /Start a three-bout Rival Run with the selected Scribbit/
  );
  assert.doesNotMatch(arenaSource, /aria-pressed/);
});
