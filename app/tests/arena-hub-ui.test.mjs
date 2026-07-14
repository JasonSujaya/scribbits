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

test('Arena exposes the server season as one compact status and ranking action', () => {
  assert.match(arenaSource, /this\.state\.season\.latestFinalized/);
  assert.match(arenaSource, /seasonStandingText\(\)/);
  assert.match(arenaSource, /openSeasonRanking\(\)/);
  assert.match(arenaSource, /paperCard\(this, 0, 0, cardWidth, cardHeight\)/);
  assert.match(arenaSource, /DAYS LEFT  •  \$\{rank\} RANK/);
  assert.match(arenaSource, /paperIcon\(this, 'trophy'/);
  assert.match(arenaSource, /event\.scoreMultiplier/);
  assert.match(seasonBoardSource, /fetchSeasonBoard\(\)/);
  assert.match(seasonBoardSource, /board\.top\.slice\(0, 10\)/);
  assert.match(seasonBoardSource, /YOU #\$\{standing\.rank\}/);
});

test('Arena renders one visible matchup and one primary fight action', () => {
  assert.match(arenaSource, /arenaStage\(this, -1000\)/);
  assert.match(arenaSource, /paperIcon\(this, 'clock'/);
  assert.match(arenaSource, /private renderBattleOpponent\(\): void/);
  assert.match(arenaSource, /champion\.name\.toUpperCase\(\)/);
  assert.match(arenaSource, /'CHOOSE A RIVAL'/);
  assert.match(arenaSource, /versusBadge\(this, 0, -150/);
  assert.match(arenaSource, /arenaArrowButton\(-208, -260, 'previous'/);
  assert.match(arenaSource, /cycleArenaFighter\(1\)/);
  assert.match(arenaSource, /`FIGHT \$\{rivalName\.toUpperCase\(\)\}`/);
  assert.match(arenaSource, /UI_BUTTON_TEXTURES\[direction\]/);
});

test('Arena surfaces the rotating venue without adding another panel', () => {
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
    'the Arena must keep the daily goal compact and icon-led'
  );
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
  assert.match(arenaSource, /const championButton = iconButton\(/);
  assert.match(arenaSource, /const fightButton = iconButton\(/);
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
  assert.match(arenaSource, /rumblePickLocked \? 'PICKED' : 'RUMBLE PICK'/);
  assert.doesNotMatch(arenaSource, /PICK A WINNER|DRAW TODAY|PICK LOCKED/);
  assert.doesNotMatch(
    arenaSource,
    /'CHOOSE RIVAL'|buildRumbleSummary\(/,
    'Arena home must keep one direct battle setup without the old pick-a-winner panel'
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
    /paperIcon\(this, 'pencil'[\s\S]*'DRAW'[\s\S]*navigateToDailyDraw\(this\)/,
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
  assert.match(capsuleMachineSource, /OPEN ×10/);
  assert.match(capsuleMachineSource, /COMING SOON/);
  assert.match(capsuleMachineSource, /COSMETIC ONLY/);
  assert.match(capsuleMachineSource, /'LOOT'/);
  assert.doesNotMatch(capsuleMachineSource, /BATTLE SPOILS/);
  assert.match(capsuleMachineSource, /Inspect featured Gear:/);
  assert.match(capsuleMachineSource, /width: 110,[\s\S]{0,40}height: 110/);
  assert.match(capsuleMachineSource, /featuredGearControl\.hidden = visible/);
  assert.match(visualAssetsSource, /scribbits-shop-chest-closed\.png/);
  assert.match(visualAssetsSource, /scribbits-shop-chest-open\.png/);
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

test('the first completed Rival Run has one server-backed trail into first Gear', () => {
  assert.match(replaySource, /planFirstChestTrailEntry\(/);
  assert.match(replaySource, /refreshArenaAndNavigate\(\{/);
  assert.match(replaySource, /setFirstChestTrail\(this/);
  assert.match(arenaSource, /takeFirstChestTrail\(this\)/);
  assert.match(arenaSource, /continueFirstChestTrail\(/);
  assert.match(
    arenaSource,
    /if \(firstChestTrail\) \{[\s\S]{0,160}continueFirstChestTrail[\s\S]{0,160}else if \(!takeSkipArenaReceiptsOnce\(this\)\) \{[\s\S]{0,160}showReturnReceiptsIfNeeded/,
    'the first Gear trail should open before optional story receipts'
  );
  assert.match(replaySource, /label: 'FIRST GEAR'/);
  assert.match(arenaSource, /careForScribbit\(scribbit\.id, action\)/);
  assert.match(
    capsuleMachineSource,
    /firstChestVisit = progress\.pullCount === 0/
  );
  assert.match(capsuleMachineSource, /YOUR FIRST GEAR/);
  assert.match(capsuleMachineSource, /OPEN ×1/);
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
  assert.match(arenaSource, /else if \(!takeSkipArenaReceiptsOnce\(this\)\)/);
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
      7,
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

test('Champion and Spar expose their selected state to assistive controls', () => {
  assert.match(arenaSource, /selectedBattleMode: 'champion' \| 'spar'/);
  assert.match(arenaSource, /private championModeAction: HTMLButtonElement/);
  assert.match(arenaSource, /private sparModeAction: HTMLButtonElement/);
  assert.match(arenaSource, /'aria-pressed': String\(this\.selectedBattleMode/);
  assert.match(arenaSource, /this\.championModeAction\?\.setAttribute\(/);
  assert.match(arenaSource, /this\.sparModeAction\?\.setAttribute\(/);
});
