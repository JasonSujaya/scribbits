import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
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
      fighterPanelTop: 145,
      fighterPanelHeight: 128,
      heartRowY: 208,
      heartRowWidth: 294,
      heartRowHeight: 40,
      fighterNameY: 166,
      arenaCaptionY: 252,
      battleClockX: 360,
      battleClockY: 208,
      arenaTop: 355,
      arenaBottom: 1078,
      arenaHorizontalPadding: 160,
      arenaVerticalPadding: 140,
      tickerX: 360,
      tickerY: 1230,
      tickerWidth: 632,
      tickerHeight: 56,
      tickerTagWidth: 0,
      fighterDisplaySize: 232,
      fighterGhostDisplaySize: 204,
      fighters: {
        a: {
          homeX: 194,
          homeY: 716.5,
          facing: 1,
          nameX: 36,
          nameOriginX: 0,
          chipCenterX: 171,
          panelLeft: 24,
        },
        b: {
          homeX: 526,
          homeY: 716.5,
          facing: -1,
          nameX: 684,
          nameOriginX: 1,
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
    replayBattleLayout.toolbarY > replayBattleLayout.arenaBottom + 40 &&
      replayBattleLayout.tickerY - replayBattleLayout.tickerHeight / 2 >
        replayBattleLayout.toolbarY + 52 + 8,
    'playback controls should sit below combat and above the announcer'
  );
  assert.ok(
    replayBattleLayout.tickerY + replayBattleLayout.tickerHeight / 2 <=
      replayBattleLayout.viewportHeight - 18,
    'the transient announcer should remain contained inside the battle page'
  );
  assert.ok(
    replayBattleLayout.arenaBottom - replayBattleLayout.arenaTop >= 700,
    'live combat should retain a tall stage below the fixed battle header'
  );
  assert.ok(
    replayBattleLayout.heartRowY - replayBattleLayout.fighterNameY >= 40,
    'fighter names and hearts should retain a visible breathing gap'
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
  assert.deepEqual(
    battlePresentation.planReplayHeartMeter({
      hitPoints: 99,
      maximumHitPoints: 100,
      heartCount: 6,
    }).states,
    ['full', 'full', 'full', 'full', 'full', 'full'],
    'heart rounding may preserve a full row while exact damage remains visible in hit reactions'
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
