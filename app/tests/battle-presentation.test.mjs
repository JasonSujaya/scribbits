import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!compiledClientRoot || !compiledSharedRoot) {
  throw new Error(
    'Run battle presentation tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const arena = require(join(compiledSharedRoot, 'arena.js'));
const battlePresentation = require(
  join(compiledClientRoot, 'lib', 'battlepresentation.js')
);
const replaySource = readFileSync(
  new URL('../src/client/scenes/Replay.ts', import.meta.url),
  'utf8'
);
const replayBattleHudSource = readFileSync(
  new URL('../src/client/lib/replaybattlehud.ts', import.meta.url),
  'utf8'
);
const visualAssetsSource = readFileSync(
  new URL('../src/client/lib/visualassets.ts', import.meta.url),
  'utf8'
);
const liveSpriteSource = readFileSync(
  new URL('../src/client/lib/livesprite.ts', import.meta.url),
  'utf8'
);
const rivalDraftSource = readFileSync(
  new URL('../src/client/lib/replaysparrivaldraft.ts', import.meta.url),
  'utf8'
);
const roleWeaponSource = readFileSync(
  new URL('../src/client/lib/roleweaponrenderer.ts', import.meta.url),
  'utf8'
);

test('presentation-space fighter separation preserves readable drawings', () => {
  for (const viewportWidth of [480, 720]) {
    const displaySize = 208;
    const minimumDistance = displaySize * 0.82;
    const separated = battlePresentation.separateFighterScreenPositions({
      a: { x: viewportWidth / 2 - 6, y: 520 },
      b: { x: viewportWidth / 2 + 6, y: 524 },
      minimumDistance,
      minimumX: 24,
      maximumX: viewportWidth - 24,
    });
    assert.ok(separated.distance >= minimumDistance - 0.01);
    assert.ok(separated.a.x >= 24 && separated.b.x <= viewportWidth - 24);
  }
});

test('Longshot keeps a smooth visible projectile lane while fighting at range', () => {
  const fighterDisplaySize = 208;
  const closeDistance =
    battlePresentation.planFighterPresentationMinimumDistance({
      fighterDisplaySize,
      combatDistance: 3_375,
      fighterRoles: ['longshot', 'brawler'],
    });
  const transitionDistance =
    battlePresentation.planFighterPresentationMinimumDistance({
      fighterDisplaySize,
      combatDistance: 3_937.5,
      fighterRoles: ['brawler', 'longshot'],
    });
  const rangedDistance =
    battlePresentation.planFighterPresentationMinimumDistance({
      fighterDisplaySize,
      combatDistance: 4_500,
      fighterRoles: ['longshot', 'mage'],
    });
  const ordinaryDistance =
    battlePresentation.planFighterPresentationMinimumDistance({
      fighterDisplaySize,
      combatDistance: 6_400,
      fighterRoles: ['brawler', 'mage'],
    });

  assert.equal(closeDistance, fighterDisplaySize * 0.82);
  assert.ok(transitionDistance > closeDistance);
  assert.ok(transitionDistance < rangedDistance);
  assert.equal(rangedDistance, fighterDisplaySize * 1.35);
  assert.equal(ordinaryDistance, fighterDisplaySize * 0.82);
  assert.equal(
    battlePresentation.planFighterPresentationMinimumDistance({
      fighterDisplaySize,
      combatDistance: 4_500,
      fighterRoles: ['longshot', 'mage'],
    }),
    rangedDistance
  );
});

test('battle reads identify Power-Ups, Gear, and class advantage', () => {
  assert.match(replaySource, /lastPowerUpRead/);
  assert.match(replaySource, /lastGearRead/);
  assert.match(replaySource, /'ADVANTAGE \+10%'/);
  assert.match(replaySource, /lastAdvantageCue/);
  assert.match(replaySource, /minimumFighterSeparation/);
  assert.match(replaySource, /combatCalloutCollisions = '0'/);
  assert.match(roleWeaponSource, /lastRoleAttack/);
  assert.match(roleWeaponSource, /delayedCall\(600/);
  assert.match(roleWeaponSource, /attack === 'body_slam'/);
  assert.match(roleWeaponSource, /attack === 'color_bolt'/);
  assert.match(roleWeaponSource, /attack === 'piercing_quill'/);
  assert.match(replaySource, /label: 'CHOOSE POWER-UP'/);
  assert.match(replaySource, /onPowerUp:/);
  assert.match(
    replaySource,
    /weaponFxRenderer\?\.update\(\s*presentationDeltaMilliseconds,\s*presentationSpeed/
  );
  assert.match(
    replaySource,
    /advanceInkcastEditorialQueue\(presentationDeltaMilliseconds\)/
  );
  assert.match(replaySource, /this\.tweens\.timeScale = presentationSpeed/);
  assert.match(replaySource, /this\.time\.timeScale = impactPaused \? 0 : 1/);
  assert.match(
    replaySource,
    /const deservesCommentary =[\s\S]*impactPlan\.tier === 'heavy'[\s\S]*impactPlan\.tier === 'critical'/,
    'routine hits should stay visual while important beats earn ticker copy'
  );
  assert.doesNotMatch(
    replaySource,
    /delayedCall\(this\.reduceMotion \? 0 : 360,[\s\S]{0,120}openPowerUpDraft/,
    'the result should invite the Power-Up choice instead of covering itself'
  );
});

test('rival choices use calm role cards with one compact fight action', () => {
  assert.match(rivalDraftSource, /ROLE_STYLES\[plan\.role\]/);
  assert.match(rivalDraftSource, /background\.fillRoundedRect/);
  assert.match(rivalDraftSource, /addCardPressInteraction\(/);
  assert.match(rivalDraftSource, /getCombatRoleContent\(plan\.role\)\.icon/);
  assert.match(rivalDraftSource, /LOW RISK/);
  assert.match(rivalDraftSource, /MEDIUM RISK/);
  assert.match(rivalDraftSource, /HIGH RISK/);
  assert.match(rivalDraftSource, /choice\.matchup\.label/);
  assert.match(
    rivalDraftSource,
    /`\$\{choice\.matchup\.label\} · WIN \+\$\{choice\.winPoints\}`/
  );
  assert.doesNotMatch(rivalDraftSource, /rangeIconKey/);
  assert.match(
    rivalDraftSource,
    /const backCenterX = -cardWidth \/ 2 \+ backInsetX/
  );
  assert.match(
    rivalDraftSource,
    /const backCenterY = -cardHeight \/ 2 \+ backInsetY/
  );
  assert.match(rivalDraftSource, /'FIGHT', 22/);
  assert.doesNotMatch(rivalDraftSource, /ghostButton\(scene, 0, 408, '‹'/);
  assert.doesNotMatch(rivalDraftSource, /const fightLabel =/);
  assert.doesNotMatch(rivalDraftSource, /iconButton\([\s\S]{0,120}fightLabel/);
});

test('battle impact, arena shrink, and mastery plans preserve presentation truth', () => {
  const lightImpact = battlePresentation.planBattleImpact({
    damage: 8,
    maximumHitPoints: 200,
    critical: false,
    playbackSpeed: 1,
    reduceMotion: false,
  });
  const criticalImpact = battlePresentation.planBattleImpact({
    damage: 24,
    maximumHitPoints: 200,
    critical: true,
    playbackSpeed: 1,
    reduceMotion: false,
  });
  assert.ok(
    criticalImpact.hitStopMilliseconds > lightImpact.hitStopMilliseconds &&
      criticalImpact.particleCount > lightImpact.particleCount,
    'critical authored damage should receive stronger presentation than a light hit'
  );
  assert.equal(lightImpact.damageText, '-8');
  assert.equal(criticalImpact.damageText, '-24!');
  assert.equal(lightImpact.hitStopMilliseconds, 0);
  assert.equal(lightImpact.cameraShake, 0);
  assert.equal(lightImpact.ringCount, 0);
  assert.equal(criticalImpact.hitStopMilliseconds, 54);
  assert.equal(lightImpact.damageTextDurationMilliseconds, 900);
  assert.equal(
    battlePresentation.planBattleImpact({
      damage: 1,
      maximumHitPoints: 200,
      critical: false,
      playbackSpeed: 4,
      reduceMotion: false,
    }).damageTextDurationMilliseconds,
    3_600,
    'fast playback should preserve the real-time readability of exact damage'
  );

  const reducedImpact = battlePresentation.planBattleImpact({
    damage: 24,
    maximumHitPoints: 200,
    critical: true,
    playbackSpeed: 1,
    reduceMotion: true,
  });
  assert.equal(reducedImpact.hitStopMilliseconds, 0);
  assert.equal(reducedImpact.cameraShake, 0);
  assert.equal(reducedImpact.particleCount, 0);

  const openArenaPresentation = battlePresentation.planArenaPresentation({
    viewportWidth: 720,
    arenaTop: 305,
    arenaBottom: 960,
    horizontalPadding: 105,
    verticalPadding: 70,
    currentCombatHalfWidth: 8000,
    currentCombatHalfHeight: 5000,
    startingCombatHalfWidth: 8000,
    startingCombatHalfHeight: 5000,
  });
  const foldedArenaPresentation = battlePresentation.planArenaPresentation({
    viewportWidth: 720,
    arenaTop: 305,
    arenaBottom: 960,
    horizontalPadding: 105,
    verticalPadding: 70,
    currentCombatHalfWidth: 6200,
    currentCombatHalfHeight: 3800,
    startingCombatHalfWidth: 8000,
    startingCombatHalfHeight: 5000,
  });
  assert.ok(
    foldedArenaPresentation.currentHalfWidth <
      openArenaPresentation.currentHalfWidth,
    'authoritative arena shrink should visibly close the paper boundary'
  );
  assert.deepEqual(
    battlePresentation.getMasteryPresentation(arena.MAX_LEVEL),
    {
      level: 5,
      bonusPercent: 1.5,
      auraMarks: 4,
      label: 'Mastered · +1.5% impact',
    },
    'max mastery should be visible but disclose its small exact power edge'
  );
});

test('portrait replay layout keeps controls, HUD, and fighters inside safe bounds', () => {
  const replayBattleLayout = battlePresentation.planReplayBattleLayout({
    viewportWidth: 720,
    viewportHeight: 1280,
  });
  assert.deepEqual(
    replayBattleLayout,
    {
      viewportWidth: 720,
      viewportHeight: 1280,
      pageLeft: 20,
      pageTop: 8,
      pageWidth: 680,
      pageHeight: 1254,
      toolbarY: 1140,
      soundButtonX: 232,
      speedButtonX: 360,
      skipButtonX: 488,
      soundButtonWidth: 112,
      speedButtonWidth: 112,
      skipButtonWidth: 112,
      fighterPanelTop: 88,
      fighterPanelHeight: 96,
      battleTitleY: 48,
      heartRowY: 122,
      heartRowWidth: 294,
      heartRowHeight: 40,
      fighterNameOffsetY: -36,
      fighterHealthOffsetY: 38,
      arenaCaptionY: 194,
      battleClockX: 360,
      battleClockY: 122,
      arenaTop: 295,
      arenaBottom: 1078,
      arenaHorizontalPadding: 120,
      arenaVerticalPadding: 140,
      tickerX: 360,
      tickerY: 255,
      tickerWidth: 632,
      tickerHeight: 56,
      tickerTagWidth: 0,
      fighterDisplaySize: 208,
      fighterGhostDisplaySize: 184,
      fighters: {
        a: {
          homeX: 173,
          homeY: 686.5,
          facing: 1,
          chipCenterX: 171,
          panelLeft: 24,
        },
        b: {
          homeX: 547,
          homeY: 686.5,
          facing: -1,
          chipCenterX: 549,
          panelLeft: 402,
        },
      },
    },
    'portrait replay layout should remain a symmetric live Inkcast stage'
  );

  const minimumReplayLayout = battlePresentation.planReplayBattleLayout({
    viewportWidth: 480,
    viewportHeight: 800,
  });
  assert.ok(
    minimumReplayLayout.heartRowWidth >= 6 * 24 + 5 * 4,
    'six responsive hearts must fit the minimum Reddit battle panel'
  );
  assert.ok(
    replayBattleLayout.soundButtonX + replayBattleLayout.soundButtonWidth / 2 <
      replayBattleLayout.speedButtonX -
        replayBattleLayout.speedButtonWidth / 2 &&
      replayBattleLayout.speedButtonX +
        replayBattleLayout.speedButtonWidth / 2 <
        replayBattleLayout.skipButtonX - replayBattleLayout.skipButtonWidth / 2,
    'sound, speed, and skip touch regions must not overlap'
  );
  assert.ok(
    replayBattleLayout.soundButtonWidth >= 112 &&
      replayBattleLayout.speedButtonWidth >= 112 &&
      replayBattleLayout.skipButtonWidth >= 112,
    'replay controls should remain large and practical at the Reddit viewport'
  );
  assert.equal(
    replayBattleLayout.fighters.a.chipCenterX,
    720 - replayBattleLayout.fighters.b.chipCenterX,
    'fighter heart rows should mirror around the battle clock'
  );
  assert.ok(
    replayBattleLayout.fighters.b.panelLeft -
      (replayBattleLayout.fighters.a.panelLeft +
        replayBattleLayout.heartRowWidth) >=
      84,
    'fighter HUDs must preserve a clean center gutter'
  );
  assert.ok(
    replayBattleLayout.tickerY - replayBattleLayout.tickerHeight / 2 >
      replayBattleLayout.fighterPanelTop +
        replayBattleLayout.fighterPanelHeight &&
      replayBattleLayout.tickerY + replayBattleLayout.tickerHeight / 2 + 7 <
        replayBattleLayout.arenaTop,
    'the battle text should fill the top gap without touching the HUD or arena'
  );
  assert.ok(
    minimumReplayLayout.tickerY === replayBattleLayout.tickerY,
    'battle text should keep the same safe top anchor at minimum height'
  );
  assert.ok(
    replayBattleLayout.arenaBottom - replayBattleLayout.arenaTop >= 700,
    'live combat should retain a tall stage below the fixed battle header'
  );
  assert.ok(
    replayBattleLayout.battleTitleY + 63 / 2 <=
      replayBattleLayout.heartRowY +
        replayBattleLayout.fighterNameOffsetY -
        18 / 2 +
        3,
    'the Battle title and fighter names should retain separate top rows'
  );
  assert.ok(
    replayBattleLayout.fighterNameOffsetY + 18 / 2 <=
      -replayBattleLayout.heartRowHeight / 2 &&
      replayBattleLayout.heartRowHeight / 2 <=
        replayBattleLayout.fighterHealthOffsetY - 20 / 2 &&
      replayBattleLayout.heartRowY +
        replayBattleLayout.fighterHealthOffsetY +
        20 / 2 <=
        replayBattleLayout.arenaCaptionY - 17 / 2 - 12,
    'fighter name, hearts, HP, and arena caption should retain separate rows'
  );
  assert.ok(
    replayBattleLayout.arenaCaptionY -
      (replayBattleLayout.heartRowY + replayBattleLayout.heartRowHeight / 2) >=
      20 &&
      replayBattleLayout.arenaTop - replayBattleLayout.arenaCaptionY >= 96,
    'hearts, quiet arena caption, and combat stage should retain separate rows'
  );
  assert.equal(
    replayBattleLayout.battleClockY,
    replayBattleLayout.heartRowY,
    'the clock should sit deliberately between the heart rows'
  );
  assert.ok(
    replayBattleLayout.fighterPanelTop + replayBattleLayout.fighterPanelHeight <
      replayBattleLayout.arenaTop,
    'the fighter HUD panel should end before the live combat stage'
  );
  assert.ok(
    replayBattleLayout.arenaHorizontalPadding >=
      replayBattleLayout.fighterDisplaySize / 2,
    'full-width player drawings should remain inside the visible battle page'
  );
});

test('replay outcome and arena goal plans stay compact and server-truthful', () => {
  assert.deepEqual(
    battlePresentation.planReplayOutcomeLayout({ viewportHeight: 1280 }),
    { heroY: 448, recapY: 830, lifeY: 1015, actionY: 1160 },
    'post-fight recap and action should keep stable mobile-safe anchors'
  );
  assert.deepEqual(
    battlePresentation.planReplayArenaChallengeResult({
      arenaId: 'v1-ink-playground',
      progress: { progress: 8, target: 8, completed: true },
    }),
    {
      label: 'GOAL CLEARED • CAST 8 POWERS',
      accessibleLabel: 'Arena goal cleared: Cast 8 powers.',
    },
    'completed arena goals should become one concise result receipt'
  );
  assert.deepEqual(
    battlePresentation.planReplayArenaChallengeResult({
      arenaId: 'v1-ink-playground',
      progress: { progress: 3, target: 8, completed: false },
    }),
    {
      label: 'CAST 8 POWERS • 3/8',
      accessibleLabel: 'Arena goal: Cast 8 powers. 3 of 8.',
    },
    'incomplete arena goals should show exact server-scored progress'
  );
  assert.equal(
    battlePresentation.planReplayArenaChallengeResult({}),
    null,
    'historical reports without arena progress should not invent a goal'
  );
});

test('post-fight actions expose only valid rival, pick, replay, and return paths', () => {
  const ownedOpenPickActions = battlePresentation.planReplayPostFightActions({
    canChooseRival: true,
    canBackContender: true,
    canReplay: false,
    returnLabel: 'ARENA ›',
  });
  assert.deepEqual(ownedOpenPickActions, {
    primary: {
      kind: 'rivals',
      label: 'CHOOSE A RIVAL',
      accessibleLabel: 'Choose a rival',
      tone: 'coral',
    },
    replayAction: null,
    returnAction: {
      kind: 'return',
      label: 'ARENA ›',
      accessibleLabel: 'ARENA',
      tone: 'ghost',
    },
    buttonHeight: 100,
  });
  assert.deepEqual(
    battlePresentation.planReplayPostFightActions({
      canChooseRival: true,
      canBackContender: true,
      canReplay: false,
      returnLabel: 'ARENA ›',
      primaryAction: {
        kind: 'powerUp',
        label: 'CHOOSE POWER-UP',
        accessibleLabel: 'Choose a new Power-Up for this Scribbit',
        tone: 'gold',
      },
    }),
    {
      primary: {
        kind: 'powerUp',
        label: 'CHOOSE POWER-UP',
        accessibleLabel: 'Choose a new Power-Up for this Scribbit',
        tone: 'gold',
      },
      replayAction: null,
      returnAction: {
        kind: 'return',
        label: 'ARENA ›',
        accessibleLabel: 'ARENA',
        tone: 'ghost',
      },
      buttonHeight: 100,
    },
    'a new Power-Up should be the deliberate result action'
  );
  assert.deepEqual(
    battlePresentation.planReplayPostFightActions({
      canChooseRival: true,
      canBackContender: true,
      canReplay: false,
      returnLabel: 'ARENA ›',
      primaryAction: {
        kind: 'firstChest',
        label: 'OPEN FIRST CHEST',
        accessibleLabel: 'Open the first chest',
        tone: 'coral',
      },
    }),
    {
      primary: {
        kind: 'firstChest',
        label: 'OPEN FIRST CHEST',
        accessibleLabel: 'Open the first chest',
        tone: 'coral',
      },
      replayAction: null,
      returnAction: {
        kind: 'return',
        label: 'ARENA ›',
        accessibleLabel: 'ARENA',
        tone: 'ghost',
      },
      buttonHeight: 100,
    },
    'a first-chest trail should replace the repeat Rival Run action'
  );
  assert.deepEqual(
    battlePresentation.planReplayPostFightActions({
      canChooseRival: true,
      canBackContender: false,
      canReplay: false,
      returnLabel: 'ARENA ›',
    }),
    {
      primary: {
        kind: 'rivals',
        label: 'CHOOSE A RIVAL',
        accessibleLabel: 'Choose a rival',
        tone: 'coral',
      },
      replayAction: null,
      returnAction: {
        kind: 'return',
        label: 'ARENA ›',
        accessibleLabel: 'ARENA',
        tone: 'ghost',
      },
      buttonHeight: 100,
    },
    'an already-backed player should keep Rival as the only contextual action'
  );
  assert.deepEqual(
    battlePresentation.planReplayPostFightActions({
      canChooseRival: false,
      canBackContender: true,
      canReplay: false,
      returnLabel: 'SCOUT ›',
    }),
    {
      primary: {
        kind: 'backContender',
        label: 'PICK RUMBLE',
        accessibleLabel: 'Pick a Rumble contender',
        tone: 'gold',
      },
      replayAction: null,
      returnAction: {
        kind: 'return',
        label: 'SCOUT ›',
        accessibleLabel: 'SCOUT',
        tone: 'ghost',
      },
      buttonHeight: 100,
    },
    'spectators should see one clear pick action and a secondary return'
  );
  assert.deepEqual(
    battlePresentation.planReplayPostFightActions({
      canChooseRival: false,
      canBackContender: false,
      canReplay: false,
      returnLabel: 'SCRAPBOOK ›',
    }),
    {
      primary: null,
      replayAction: null,
      returnAction: {
        kind: 'return',
        label: 'SCRAPBOOK ›',
        accessibleLabel: 'SCRAPBOOK',
        tone: 'ghost',
      },
      buttonHeight: 100,
    },
    'a resolved replay should collapse to one truthful return action'
  );
  assert.deepEqual(
    battlePresentation.planReplayPostFightActions({
      canChooseRival: false,
      canBackContender: false,
      canReplay: true,
      returnLabel: 'SCRAPBOOK ›',
    }),
    {
      primary: null,
      replayAction: {
        kind: 'replay',
        label: 'REPLAY',
        accessibleLabel: 'Replay this fight',
        tone: 'ghost',
      },
      returnAction: {
        kind: 'return',
        label: 'SCRAPBOOK ›',
        accessibleLabel: 'SCRAPBOOK',
        tone: 'ghost',
      },
      buttonHeight: 100,
    },
    'saved motion should expose replay again beside the truthful return action'
  );
  assert.deepEqual(
    battlePresentation.planReplayPostFightActions({
      canChooseRival: false,
      canBackContender: false,
      canReplay: false,
      canShareClip: true,
      returnLabel: 'ARENA ›',
    }).shareAction,
    {
      kind: 'share',
      label: 'SHARE CLIP',
      accessibleLabel:
        'Share this recorded battle clip. The clip is hosted by Reddit.',
      tone: 'ghost',
    },
    'a rendered fight should expose one explicit Reddit-hosted clip action'
  );
});

test('saved replays expose an immediate return before playback finishes', () => {
  assert.match(replaySource, /private buildSavedReplayExit\(\): void/);
  assert.match(
    replaySource,
    /if \(!this\.isSavedReplay\(\)\) return;[\s\S]{0,500}this\.returnButtonLabel\(\)/
  );
  assert.match(
    replaySource,
    /this\.buildArena\(\);\s*this\.buildSavedReplayExit\(\);/
  );
  assert.match(replaySource, /this\.savedReplayExitOverlay\?\.destroy\(\)/);
});

test('heart meter plans clamp health while preserving danger and accessibility states', () => {
  assert.deepEqual(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 50,
      maximumHitPoints: 100,
      heartCount: 6,
    }),
    {
      ratio: 0.5,
      states: ['full', 'full', 'full', 'empty', 'empty', 'empty'],
      filledUnits: 6,
      useDangerColor: false,
      isLastHeart: false,
      accessibleLabel: '50 of 100 health; 3 hearts out of 6',
    }
  );
  assert.equal(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 28,
      maximumHitPoints: 100,
    }).useDangerColor,
    true,
    '28% HP should enter the danger color exactly at the existing threshold'
  );
  assert.equal(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 29,
      maximumHitPoints: 100,
    }).useDangerColor,
    false
  );
  assert.deepEqual(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 999,
      maximumHitPoints: 100,
      heartCount: 6,
    }).states,
    ['full', 'full', 'full', 'full', 'full', 'full'],
    'overflow HP should clamp to a full heart row'
  );
  assert.deepEqual(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 50,
      maximumHitPoints: 0,
      heartCount: 6,
    }).states,
    ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    'invalid maximum HP should fail closed to empty hearts'
  );
  assert.deepEqual(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 25,
      maximumHitPoints: 100,
      heartCount: 6,
    }).states,
    ['full', 'half', 'empty', 'empty', 'empty', 'empty'],
    'continuous HP should project into half-heart steps without changing combat truth'
  );
  assert.deepEqual(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 1,
      maximumHitPoints: 1_000,
      heartCount: 6,
    }),
    {
      ratio: 0.001,
      states: ['half', 'empty', 'empty', 'empty', 'empty', 'empty'],
      filledUnits: 1,
      useDangerColor: true,
      isLastHeart: true,
      accessibleLabel: '1 of 1000 health; half a heart out of 6',
    },
    'a living fighter must always retain at least half a visible heart'
  );
  const barelyDamagedHeartPlan = battlePresentation.planReplayHeartMeter({
    hitPoints: 99,
    maximumHitPoints: 100,
    heartCount: 6,
  });
  assert.deepEqual(
    barelyDamagedHeartPlan.states,
    ['full', 'full', 'full', 'full', 'full', 'full'],
    'heart rounding may preserve a full row while exact damage remains visible in hit reactions'
  );
  assert.match(
    barelyDamagedHeartPlan.accessibleLabel,
    /^99 of 100 health/,
    'exact HP must remain available when a small hit does not cross a half-heart boundary'
  );
  assert.equal(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 16,
      maximumHitPoints: 100,
      heartCount: 6,
    }).isLastHeart,
    true,
    'one full visible heart should enter the last-heart warning state'
  );
  assert.equal(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 17,
      maximumHitPoints: 100,
      heartCount: 6,
    }).isLastHeart,
    false,
    'more than one visible heart should leave the last-heart warning state'
  );
});

test('every damage event shows exact HP loss and a red target flash', () => {
  assert.match(
    replayBattleHudSource,
    /const battleTitle = scene\.add[\s\S]*\.image\([\s\S]*layout\.battleTitleY,[\s\S]*BATTLE_TITLE_TEXTURE[\s\S]*\.setDisplaySize\(240, 63\)/,
    'the replay should render the illustrated Battle title in the upper paper header'
  );
  assert.match(
    visualAssetsSource,
    /BATTLE_TITLE_TEXTURE = 'scribbits-battle-title'/,
    'the rendered Battle title should have a dedicated texture'
  );
  assert.match(
    visualAssetsSource,
    /preloadReplayVisualAssets[\s\S]*BATTLE_TITLE_TEXTURE,[\s\S]*assetUrl\('scribbits-battle-title\.webp'\)/,
    'the replay should preload its rendered Battle title asset'
  );
  assert.match(
    replayBattleHudSource,
    /setBattleChromeVisible:[\s\S]*battleTitle\.setVisible\(visible\)/,
    'the Battle title should follow the replay chrome lifecycle'
  );
  assert.match(
    replayBattleHudSource,
    /healthLabel[\s\S]*translate\('battle\.health',[\s\S]*current: safeHitPoints,[\s\S]*maximum: safeMaximumHitPoints/,
    'the heart row should expose exact current and maximum HP'
  );
  assert.match(
    replayBattleHudSource,
    /const fighterNameLabel = label\([\s\S]*layout\.fighterNameOffsetY,[\s\S]*scribbit\.name\.toUpperCase\(\),[\s\S]*18,[\s\S]*UI\.ink,[\s\S]*true/,
    'the fighter name should have its own clear row above the hearts'
  );
  assert.match(
    replayBattleHudSource,
    /fitTextFontSizeToWidth\(fighterNameLabel,[\s\S]*layout\.heartRowWidth,[\s\S]*18,[\s\S]*14/,
    'long fighter names should remain inside their side of the HUD'
  );
  assert.match(
    replayBattleHudSource,
    /\.container\(fighterLayout\.chipCenterX, layout\.heartRowY, \[[\s\S]*fighterNameLabel,[\s\S]*heartWarning,[\s\S]*healthLabel,[\s\S]*\]\)/,
    'the name, hearts, and exact HP should share one top HUD container'
  );
  assert.match(
    replaySource,
    /this\.damagePopAt\(\s*target\.screenX,\s*target\.screenY,\s*impactPlan\.damageText/,
    'damage numbers should stay anchored above the fighter that lost HP'
  );
  assert.match(
    replaySource,
    /target\.sprite\?\.hitReact\([\s\S]*this\.speed/,
    'the struck fighter should receive speed-compensated hit feedback'
  );
  assert.match(
    liveSpriteSource,
    /setTint\(0xff3f36\)[\s\S]*TintModes\.FILL[\s\S]*private flashDamage\([\s\S]*setAlpha\(0\.78\)/,
    'the exact fighter drawing should flash red on every confirmed hit'
  );
});

test('fighter names and HP bars follow their moving battle characters', () => {
  assert.match(
    replayBattleHudSource,
    /const floatingVitals = scene\.add\.container\(\s*fighterLayout\.homeX,\s*fighterLayout\.homeY \+ layout\.fighterDisplaySize \/ 2 \+ 22/,
    'each side should start with a clear floating vitals tag'
  );
  assert.match(
    replayBattleHudSource,
    /scribbit\.name\.toUpperCase\(\)/,
    'the floating tag should use the authoritative Scribbit name'
  );
  assert.match(
    replayBattleHudSource,
    /floatingHealthFill[\s\S]*floatingHealthBarWidth/,
    'the floating tag should carry one proportional HP bar'
  );
  assert.doesNotMatch(
    replayBattleHudSource,
    /floatingVitalsBackground/,
    'the moving fighter vitals should not draw a white backing card'
  );
  assert.match(
    replayBattleHudSource,
    /const floatingHealthTrack[\s\S]{0,300}setStrokeStyle/,
    'the borderless card should retain a readable health track'
  );
  assert.match(
    replayBattleHudSource,
    /paperIcon\(scene, 'eye',[\s\S]*size: 26/,
    'a small eye icon should control the floating fighter labels'
  );
  assert.match(
    replayBattleHudSource,
    /floatingVitalsVisible = !floatingVitalsVisible;[\s\S]*updateFloatingVitalsVisibility\(\)/,
    'the eye control should toggle the floating fighter labels'
  );
  assert.match(
    replayBattleHudSource,
    /dataset\.floatingVitals = labelsVisible[\s\S]*'visible'[\s\S]*'hidden'/,
    'the floating-label state should be exposed for browser verification'
  );
  assert.match(
    replayBattleHudSource,
    /\.container\(0, 0, \[floatingVitals, heartMeter\]\)/,
    'the floating name should replace the duplicate fixed name while exact HP remains in the top HUD'
  );
  assert.match(
    replayBattleHudSource,
    /floatingVitals[\s\S]*\.setInteractive\(\{ useHandCursor: true \}\)[\s\S]*onSelect\(\)/,
    'the moving nameplate should retain the fighter detail action'
  );
  assert.match(
    replayBattleHudSource,
    /const setFighterScreenPosition =[\s\S]*floatingVitals\.setPosition\([\s\S]*Phaser\.Math\.Clamp/,
    'the floating vitals anchor should follow the fighter while staying in arena bounds'
  );
  assert.match(
    replaySource,
    /fighter\.sprite\?\.setPosition\(screenPosition\.x, screenPosition\.y\);[\s\S]*setFighterScreenPosition\(\s*fighter\.side,\s*screenPosition\.x,\s*screenPosition\.y/,
    'the replay frame should move the floating vitals beside the fighter sprite'
  );
});

test('heart damage reactions scale by impact and honor reduced motion', () => {
  const heartReactionDistances = ['light', 'solid', 'heavy', 'critical'].map(
    (tier) =>
      battlePresentation.planReplayHeartDamageReaction({
        tier,
        playbackSpeed: 1,
        reduceMotion: false,
      }).shakeDistance
  );
  assert.deepEqual(
    heartReactionDistances,
    [...heartReactionDistances].sort((left, right) => left - right),
    'heart hit shake should grow monotonically with impact tier'
  );
  assert.deepEqual(
    battlePresentation.planReplayHeartDamageReaction({
      tier: 'critical',
      playbackSpeed: 4,
      reduceMotion: true,
    }),
    {
      shakeDistance: 0,
      rotationDegrees: 0,
      durationMilliseconds: 0,
      repeats: 0,
    },
    'reduced motion should keep heart state changes but remove movement'
  );
  assert.ok(
    battlePresentation.planReplayHeartDamageReaction({
      tier: 'heavy',
      playbackSpeed: 4,
      reduceMotion: false,
    }).durationMilliseconds >
      battlePresentation.planReplayHeartDamageReaction({
        tier: 'heavy',
        playbackSpeed: 1,
        reduceMotion: false,
      }).durationMilliseconds,
    'fast replay should compensate heart tween duration before Phaser time scaling'
  );
  assert.match(
    replayBattleHudSource,
    /targets: vitals\.heartMeter,[\s\S]*scale: 1\.055/,
    'the combined heart and HP display should punch outward on damage'
  );
  assert.match(
    replayBattleHudSource,
    /targets: vitals\.floatingVitalsFeedback,[\s\S]*scale: 1\.045/,
    'the character-attached HP bar should shake without fighting its moving anchor'
  );
  assert.match(
    replayBattleHudSource,
    /previousHitPoints !== null && previousHitPoints !== safeHitPoints[\s\S]*targets: vitals\.healthLabel/,
    'every real HP change after initialization should animate the exact value'
  );
});

test('half hearts fill toward each fighter side', () => {
  assert.match(
    replayBattleHudSource,
    /const halfFill = side === 'a' \? 'left' : 'right'/,
    'the right fighter half-heart should mirror the left fighter fill'
  );
  assert.match(
    replayBattleHudSource,
    /state === 'half' \? halfFill : 'full'/,
    'only half-heart states should use the side-aware partial fill'
  );
});

test('healthy battle hearts use one readable coral health color', () => {
  assert.match(
    replayBattleHudSource,
    /const HEALTHY_HEART_COLOR = UI\.coral/,
    'health should stay coral instead of changing with fighter element'
  );
  assert.doesNotMatch(
    replayBattleHudSource,
    /ELEMENT_STYLES\[[\s\S]*\]\.primary,[\s\S]*layout\.heartRowWidth/,
    'heart rendering should not reuse element colors'
  );
  assert.match(
    replayBattleHudSource,
    /const labelsVisible =[\s\S]*heartsVisible[\s\S]*battleChromeVisible[\s\S]*floatingVitalsVisible;[\s\S]*vitals\.floatingVitals\.setVisible\(labelsVisible\)/,
    'floating vitals should share the battle health visibility lifecycle'
  );
  assert.match(
    replayBattleHudSource,
    /let floatingVitalsVisible = true/,
    'moving fighter labels should be visible by default so each character stays identifiable'
  );
});

test('battle clock, kind labels, and arena projection share replay timing and bounds', () => {
  assert.deepEqual(
    battlePresentation.planReplayBattleClock({
      currentTick: 0,
      completedTick: 500,
      tickRate: 20,
    }),
    {
      remainingSeconds: 25,
      label: '25',
      remainingRatio: 1,
      urgent: false,
    }
  );
  assert.equal(
    battlePresentation.planReplayBattleClock({
      currentTick: 401,
      completedTick: 500,
      tickRate: 20,
    }).urgent,
    true,
    'the final five seconds should make the fixed-tick clock urgent'
  );
  assert.equal(
    battlePresentation.planReplayBattleClock({
      currentTick: 500,
      completedTick: 500,
      tickRate: 20,
    }).label,
    '00'
  );
  assert.equal(
    battlePresentation.planReplayBattleClock({
      currentTick: Number.NaN,
      completedTick: Number.NaN,
      tickRate: 0,
    }).label,
    '01',
    'invalid clock inputs should fail closed to one bounded second'
  );
  assert.equal(
    battlePresentation.getReplayBattleKindLabel('exhibition'),
    'EXHIBITION SPAR'
  );
  assert.equal(
    battlePresentation.getReplayBattleKindLabel('rumble'),
    'DAILY RUMBLE'
  );
  assert.equal(
    battlePresentation.getReplayBattleKindLabel('boss'),
    'CHAMPION CHALLENGE'
  );

  const replayBattleLayout = battlePresentation.planReplayBattleLayout({
    viewportWidth: 720,
    viewportHeight: 1280,
  });
  const replayArenaPresentation = battlePresentation.planArenaPresentation({
    viewportWidth: replayBattleLayout.viewportWidth,
    arenaTop: replayBattleLayout.arenaTop,
    arenaBottom: replayBattleLayout.arenaBottom,
    horizontalPadding: replayBattleLayout.arenaHorizontalPadding,
    verticalPadding: replayBattleLayout.arenaVerticalPadding,
    currentCombatHalfWidth: 8000,
    currentCombatHalfHeight: 5000,
    startingCombatHalfWidth: 8000,
    startingCombatHalfHeight: 5000,
  });
  assert.deepEqual(
    {
      centerX: replayArenaPresentation.centerX,
      centerY: replayArenaPresentation.centerY,
      maximumHalfWidth: replayArenaPresentation.maximumHalfWidth,
      maximumHalfHeight: replayArenaPresentation.maximumHalfHeight,
    },
    {
      centerX: replayBattleLayout.viewportWidth / 2,
      centerY:
        (replayBattleLayout.arenaTop + replayBattleLayout.arenaBottom) / 2,
      maximumHalfWidth:
        replayBattleLayout.viewportWidth / 2 -
        replayBattleLayout.arenaHorizontalPadding,
      maximumHalfHeight:
        (replayBattleLayout.arenaBottom - replayBattleLayout.arenaTop) / 2 -
        replayBattleLayout.arenaVerticalPadding,
    },
    'all replay movement and effects should share the clipping-safe arena projection'
  );
});
