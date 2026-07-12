import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  beginPracticeSession,
  endPracticeSession,
  getPracticeSession,
  getReplay,
  getReplayFounderChronicleBeat,
  getReplayFounderRivalryStakes,
  getReplayReturn,
  getArena,
  stageDirectBattle,
  setArena,
  setFounderChronicleBeats,
  setArenaFocus,
} from '../lib/registry';
import { loadDrawing, levelOf } from '../lib/scribbits';
import { ELEMENT_STYLES, prefersReducedMotion, UI } from '../lib/theme';
import {
  label,
  stickerCard,
  daysLeftFor,
  floatReward,
  fadeToScene,
} from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import { LiveSprite } from '../lib/livesprite';
import {
  barrierHitConnectsShapePowerActivation,
  buildShapePowerDrawCommands,
  getDamageSourceDisplayName,
  getElementBattleCue,
  getShapePowerNoCleanHitCallout,
  getShapePowerRevealCopy,
  getShapePowerSignatureName,
  planShapePowerCallout,
  shouldAnnounceNoCleanHitAtAbilityFinish,
} from '../lib/shapepowerpresentation';
import type {
  ShapePowerDrawCommand,
  ShapePowerVisualEffect,
} from '../lib/shapepowerpresentation';
import { fetchArena, fetchSparRivals, spar } from '../lib/api';
import {
  calculateReplayFrame,
  getTimelineEventsInRange,
  getUsableBattleTranscript,
} from '../lib/continuousreplay';
import type { ReplayFrame, ReplayVector } from '../lib/continuousreplay';
import {
  buildMasteryAuraSegments,
  planArenaPresentation,
  planBattleImpact,
  planReplayBattleLayout,
  planReplayOutcomeLayout,
  projectCombatPosition,
} from '../lib/battlepresentation';
import type {
  ArenaPresentationPlan,
  BattleImpactPlan,
  ReplayBattleLayout,
} from '../lib/battlepresentation';
import {
  formatBattleRecapLead,
  planBattleRecap,
} from '../lib/battlerecap';
import type {
  BattleRecapPerspective,
  BattleRecapPlan,
} from '../lib/battlerecap';
import { isScribbitOwnedByViewer } from '../lib/battlejournal';
import { drawReplayBattleBackground } from '../lib/replaybattlebackground';
import type { ReplayBattleBackdrop } from '../lib/replaybattlebackground';
import { createReplayBattleHud } from '../lib/replaybattlehud';
import type { ReplayBattleHud } from '../lib/replaybattlehud';
import {
  addBattleRecapLines,
  createBattleRecapCard,
} from '../lib/replaybattlerecap';
import { createSparRivalDraft } from '../lib/replaysparrivaldraft';
import type { SparRivalDraft } from '../lib/replaysparrivaldraft';
import { createPostFightActions } from '../lib/replaypostfightactions';
import type { PostFightActions } from '../lib/replaypostfightactions';
import { createPracticeOutcomeControls } from '../lib/replaypracticeoutcome';
import { planPracticeOutcome } from '../lib/practicelab';
import {
  authorFounderBattleOpening,
  authorFounderBattleOutcome,
  createReplayCommentaryAuthor,
  isReplayCommentaryMissPower,
} from '../lib/replaycommentary';
import type {
  ReplayCommentaryAuthor,
  ReplayCommentaryContext,
  ReplayCommentaryFact,
} from '../lib/replaycommentary';
import {
  chooseInkcastCandidateForSimulationTick,
  createInkcastEditorialCandidate,
  enqueueInkcastEditorialCandidate,
  INKCAST_WALL_CLOCK_DWELL_MILLISECONDS,
} from '../lib/inkcastqueue';
import type { InkcastEditorialCandidate } from '../lib/inkcastqueue';
import { BattleSoundboard } from '../lib/battlesound';
import { showVsCeremony } from '../lib/battleceremony';
import {
  formatRivalRunBattleLabel,
  formatRivalRunResultLine,
  planRivalRunActionCopy,
  planRivalRunFinishStamp,
} from '../lib/rivalrunpresentation';
import {
  findFounderChronicleBeats,
  planFounderRivalEpisodeReceipt,
} from '../lib/founderchronicle';
import type {
  FounderRivalEpisodeReceiptPlan,
  FounderRivalryStakesPlan,
} from '../lib/founderchronicle';
import { showToast } from '@devvit/web/client';
import type {
  BattleReport,
  Element,
  FounderChronicleBeat,
  RivalRunState,
  Scribbit,
} from '../../shared/arena';
import type {
  BattleTimelineEvent,
  BattleTranscript,
  FixedVector,
  PrimaryPower,
} from '../../shared/combat';
import {
  COMBAT_TICK_RATE,
  DEFAULT_COMBAT_RULES,
} from '../../shared/combat/config';
import { selectPrimaryPower } from '../../shared/combat/selection';
import { isShapePowerId } from '../../shared/combat/shapepowercontent';
import { getBattleMaxHp } from '../../shared/battle';

type ReplayFighterRuntime = {
  side: 'a' | 'b';
  scribbit: Scribbit;
  sprite: LiveSprite | null;
  screenX: number;
  screenY: number;
  hpMax: number;
  primaryPower: PrimaryPower;
  facing: 1 | -1;
  powerGhosts: Phaser.GameObjects.Image[];
};

type ShapeEffect = ShapePowerVisualEffect & {
  activationNumber: number;
  activationOrigin: FixedVector | null;
  connected: boolean;
};

type AbilityLifecycleTimelineEvent = Extract<
  BattleTimelineEvent,
  {
    kind: 'ability_telegraphed' | 'ability_activated' | 'ability_finished';
  }
>;

type DamageAndStatusTimelineEvent = Extract<
  BattleTimelineEvent,
  {
    kind:
      | 'damage'
      | 'burn_applied'
      | 'barrier_created'
      | 'barrier_hit'
      | 'barrier_broken'
      | 'ink_pressure';
  }
>;

type ArenaAndCollisionTimelineEvent = Extract<
  BattleTimelineEvent,
  {
    kind:
      | 'arena_shrink_started'
      | 'nib_wall_ejection'
      | 'wall_bounce'
      | 'fighter_collision';
  }
>;

type EchoAndBattleFlowTimelineEvent = Extract<
  BattleTimelineEvent,
  {
    kind:
      | 'battle_started'
      | 'late_fight_started'
      | 'echo_created'
      | 'echo_fired'
      | 'echo_shattered'
      | 'fighter_defeated'
      | 'battle_ended';
  }
>;

// Battle theater — the demo moment. On WebGL, each submitted PNG is a Phaser
// 4.2 Mesh2D Inkbody: 25 vertices breathe, telegraph its shape-powered move,
// ripple on impact, and fold on KO. Canvas retains the 3x3 slice fallback.
// The deterministic fixed-tick transcript owns the result; Phaser makes the
// player's pixels perform it. Replay controls, mobile-safe particles, and clear
// outcomes keep the spectacle watchable without implying live input changes it.
export class Replay extends Scene {
  private report!: BattleReport;
  private battleLayout!: ReplayBattleLayout;
  private battleHud: ReplayBattleHud | null = null;
  private battleBackdrop: ReplayBattleBackdrop | null = null;
  private battleBackdropElapsedMilliseconds = 0;
  private battleBackdropUpdateAccumulator = 0;
  private effectRenderAccumulator = 0;
  private fighterA!: ReplayFighterRuntime;
  private fighterB!: ReplayFighterRuntime;
  private finished = false;
  private introBanner: Phaser.GameObjects.Text | null = null;
  private reduceMotion = false;

  // Fast-forward: cycles 1x → 2x → 4x → 1x. Scales the scene clock + tweens so
  // the WHOLE spectacle speeds up uniformly, and persists across every beat.
  private static readonly SPEEDS = [1, 2, 4] as const;
  private static readonly EFFECT_FRAME_MILLISECONDS = 1000 / 30;
  private speedIndex = 0;
  private readonly soundboard = new BattleSoundboard();
  private fightersReady = false;
  private skipRequested = false;
  private signatureShown = new Set<'a' | 'b'>();
  private elementCueShown = new Set<Element>();
  private transcript: BattleTranscript | null = null;
  private playbackRunning = false;
  private rematchLoading = false;
  private rivalDraft: SparRivalDraft | null = null;
  private postFightActions: PostFightActions | null = null;
  private playbackTick = 0;
  private previousPlaybackTick = -1;
  private arenaFloorEffects: Phaser.GameObjects.Graphics | null = null;
  private combatEffects: Phaser.GameObjects.Graphics | null = null;
  private readonly shapeEffects = new Map<'a' | 'b', ShapeEffect>();
  private impactHoldMilliseconds = 0;
  private readonly inkcastCandidatesByTick = new Map<
    number,
    InkcastEditorialCandidate[]
  >();
  private pendingInkcastCandidates: readonly InkcastEditorialCandidate[] =
    Object.freeze([]);
  private inkcastDwellRemainingMilliseconds = 0;
  private inkcastSequence = 0;
  private replayCommentaryAuthor: ReplayCommentaryAuthor | null = null;
  private founderChronicleBeat: FounderChronicleBeat | null = null;
  private founderRivalryStakes: FounderRivalryStakesPlan | null = null;

  constructor() {
    super('Replay');
  }

  init(): void {
    this.finished = false;
    this.battleHud = null;
    this.battleBackdrop = null;
    this.battleBackdropElapsedMilliseconds = 0;
    this.battleBackdropUpdateAccumulator = 0;
    this.effectRenderAccumulator = 0;
    this.introBanner = null;
    this.reduceMotion = prefersReducedMotion();
    this.speedIndex = 0;
    this.fightersReady = false;
    this.skipRequested = false;
    this.rematchLoading = false;
    this.rivalDraft = null;
    this.postFightActions = null;
    this.signatureShown.clear();
    this.elementCueShown.clear();
    this.transcript = null;
    this.playbackRunning = false;
    this.playbackTick = 0;
    this.previousPlaybackTick = -1;
    this.arenaFloorEffects = null;
    this.combatEffects = null;
    this.shapeEffects.clear();
    this.impactHoldMilliseconds = 0;
    this.clearInkcastEditorialState();
    this.founderChronicleBeat = null;
    this.founderRivalryStakes = null;
  }

  // Current fast-forward multiplier.
  private get speed(): number {
    return Replay.SPEEDS[this.speedIndex] ?? 1;
  }

  // Continuous playback advances its authoritative tick cursor directly.
  // Scene timers remain unscaled so speed is applied exactly once; visual
  // tweens still follow the selected playback speed.
  private applySpeed(): void {
    if (this.finished) return;
    this.time.timeScale = 1;
    this.tweens.timeScale = this.speed;
    this.recordDebugPlaybackState('live');
  }

  private recordDebugPlaybackState(phase: 'live' | 'result'): void {
    if (
      typeof window === 'undefined' ||
      !window.location.search.includes('debug')
    ) {
      return;
    }
    this.game.canvas.dataset.replayPhase = phase;
    this.game.canvas.dataset.replaySpeed = String(this.speed);
    this.game.canvas.dataset.replayTweenScale = String(this.tweens.timeScale);
  }

  private cycleSpeed(): void {
    this.speedIndex = (this.speedIndex + 1) % Replay.SPEEDS.length;
    this.battleHud?.setPlaybackSpeed(this.speed);
    this.applySpeed();
  }

  create(): void {
    const report = getReplay(this);
    if (!report) {
      this.scene.start('ArenaHome');
      return;
    }
    this.report = report;
    this.founderChronicleBeat = getReplayFounderChronicleBeat(this);
    this.founderRivalryStakes = getReplayFounderRivalryStakes(this);
    this.transcript = getUsableBattleTranscript(report) ?? null;
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.buildArena();
    this.recordDebugPlaybackState('live');

    this.events.once('shutdown', () => {
      this.rivalDraft?.destroy();
      this.rivalDraft = null;
      this.postFightActions?.destroy();
      this.postFightActions = null;
      this.playbackRunning = false;
      this.shapeEffects.clear();
      this.hidePowerGhosts();
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this.impactHoldMilliseconds = 0;
      this.battleBackdrop = null;
    });

    void Promise.all([
      loadDrawing(this, report.a),
      loadDrawing(this, report.b),
    ]).then(([keyA, keyB]) => {
      if (!this.scene.isActive() || this.finished) return;
      this.placeFighter('a', keyA);
      this.placeFighter('b', keyB);
      this.fightersReady = true;
      if (this.skipRequested) {
        this.skipToEnd();
        return;
      }
      if (!this.transcript) {
        this.showArchivedResult();
        return;
      }
      this.playIntro();
    });
  }

  private buildArena(): void {
    const { width, height } = this.scale;
    this.battleLayout = planReplayBattleLayout({
      viewportWidth: width,
      viewportHeight: height,
    });
    this.battleBackdrop = drawReplayBattleBackground(this, {
      layout: this.battleLayout,
      fighterAElement: this.report.a.element,
      fighterBElement: this.report.b.element,
      battleSeed: this.report.id,
      reduceMotion: this.reduceMotion,
    });
    this.arenaFloorEffects = this.add.graphics().setDepth(2);
    this.combatEffects = this.add.graphics().setDepth(7);

    const initialFrame = this.transcript
      ? calculateReplayFrame(this.transcript, 0)
      : null;
    this.fighterA = this.createFighterRuntime('a', initialFrame?.fighters[0]);
    this.fighterB = this.createFighterRuntime('b', initialFrame?.fighters[1]);

    this.battleHud = createReplayBattleHud(this, {
      layout: this.battleLayout,
      fighterA: this.report.a,
      fighterB: this.report.b,
      fighterAPrimaryPower: this.fighterA.primaryPower,
      fighterBPrimaryPower: this.fighterB.primaryPower,
      battleKind: this.report.kind,
      battleLabel:
        (this.report.rivalRun
          ? formatRivalRunBattleLabel(this.report.rivalRun)
          : null) ?? this.founderRivalryStakes?.battleLabel ?? null,
      showPlaybackControls: this.transcript !== null,
      reduceMotion: this.reduceMotion,
      initialPlaybackSpeed: this.speed,
      initialSoundEnabled: this.soundboard.isEnabled(),
      onSelectFighter: (side) => {
        if (this.report.kind === 'practice') {
          showToast('Practice snapshots have no profile or Belief actions.');
          return;
        }
        this.openIntroDetail(side === 'a' ? this.report.a : this.report.b);
      },
      onSkip: () => this.skipToEnd(),
      onCycleSpeed: () => this.cycleSpeed(),
      onToggleSound: () => {
        const enabled = this.soundboard.toggle();
        this.battleHud?.setSoundEnabled(enabled);
      },
    });

    if (this.transcript) {
      // The first intentional tap may unlock WebAudio in embedded browsers,
      // but it never changes the predetermined battle.
      this.input.once('pointerdown', () => this.soundboard.unlock());
    }
  }

  private createFighterRuntime(
    side: 'a' | 'b',
    transcriptFighter?: ReplayFrame['fighters'][number]
  ): ReplayFighterRuntime {
    const scribbit = side === 'a' ? this.report.a : this.report.b;
    const fighterLayout = this.battleLayout.fighters[side];
    return {
      side,
      scribbit,
      sprite: null,
      screenX: fighterLayout.homeX,
      screenY: fighterLayout.homeY,
      hpMax: transcriptFighter?.maxHitPoints ?? getBattleMaxHp(scribbit.stats),
      primaryPower:
        transcriptFighter?.primaryPower ?? selectPrimaryPower(scribbit.stats),
      facing: fighterLayout.facing,
      powerGhosts: [],
    };
  }

  private placeFighter(side: 'a' | 'b', textureKey: string): void {
    const fighter = side === 'a' ? this.fighterA : this.fighterB;
    const offStageX = fighter.facing === 1 ? -140 : this.scale.width + 140;
    const live = new LiveSprite(
      this,
      fighter.screenX,
      fighter.screenY,
      textureKey,
      {
        displaySize: this.battleLayout.fighterDisplaySize,
        facing: fighter.facing,
        depth: 5,
        stats: fighter.scribbit.stats,
        reduceMotion: this.reduceMotion,
      }
    );
    fighter.sprite = live;
    fighter.powerGhosts = this.createPowerGhosts(fighter, textureKey);
    // Walk in from off-stage, then breathe.
    live.walkIn(offStageX, fighter.screenX, 520);
  }

  private createPowerGhosts(
    fighter: ReplayFighterRuntime,
    textureKey: string
  ): Phaser.GameObjects.Image[] {
    return [0, 1, 2].map(() => {
      const ghost = this.add
        .image(fighter.screenX, fighter.screenY, textureKey)
        .setDepth(4)
        .setVisible(false);
      const largestDimension = Math.max(1, ghost.width, ghost.height);
      ghost.setScale(
        this.battleLayout.fighterGhostDisplaySize / largestDimension
      );
      ghost.setFlipX(fighter.facing < 0);
      return ghost;
    });
  }

  private openIntroDetail(scribbit: Scribbit): void {
    const arena = getArena(this);
    const mine = this.isMine(scribbit);
    openDetailModal(this, scribbit, {
      currentDay: arena?.dayNumber ?? scribbit.expiresDay,
      mine,
      actions: mine ? {} : { canBelieve: true },
      onRemoved: () => this.scene.start('MyBattles'),
      onReported: () => this.scene.start('MyBattles'),
    });
  }

  private playIntro(): void {
    const { width, height } = this.scale;
    const founderOpening = authorFounderBattleOpening(
      this.replayCommentaryContext()
    );
    if (founderOpening) this.displayInkcastText(founderOpening);
    const banner = label(
      this,
      width / 2,
      height / 2,
      'FIGHT!',
      90,
      UI.goldText,
      true
    )
      .setScale(0)
      .setDepth(60);
    banner.setStroke('#2b2016', 10);
    this.introBanner = banner;
    // Keep the matchup readable, then reach actual combat in about one second.
    this.time.delayedCall(360, () => {
      if (this.finished || !this.scene.isActive()) return;
      this.soundboard.play('fight');
      if (this.reduceMotion) {
        banner.setScale(1);
        this.time.delayedCall(400, () => {
          if (this.finished || !this.scene.isActive()) return;
          this.clearIntroBanner();
          this.startContinuousReplay();
        });
        return;
      }
      this.tweens.add({
        targets: banner,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 180,
        onComplete: () => {
          this.clearIntroBanner();
          if (!this.finished) this.startContinuousReplay();
        },
      });
      this.cameras.main.shake(180, 0.006);
    });
  }

  private clearIntroBanner(): void {
    this.introBanner?.destroy();
    this.introBanner = null;
  }

  private startContinuousReplay(): void {
    if (!this.transcript) return;
    this.playbackRunning = true;
    this.playbackTick = 0;
    this.previousPlaybackTick = -1;
    this.applySpeed();
    const frame = calculateReplayFrame(this.transcript, 0);
    this.applyContinuousFrame(frame);
    for (const event of getTimelineEventsInRange(this.transcript, -1, 0)) {
      this.presentTimelineEvent(event);
    }
    this.flushInkcastCandidatesByTick();
    this.previousPlaybackTick = 0;
    this.drawReplayFrameEffects(frame);
    this.effectRenderAccumulator = 0;
  }

  override update(_time: number, deltaMilliseconds: number): void {
    const safeDeltaMilliseconds = Math.max(0, deltaMilliseconds);
    const backdropPlaybackSpeed = this.playbackRunning
      ? this.impactHoldMilliseconds > 0
        ? 0
        : this.speed
      : 1;
    if (!this.finished && backdropPlaybackSpeed > 0) {
      this.battleBackdropElapsedMilliseconds +=
        safeDeltaMilliseconds * backdropPlaybackSpeed;
      this.battleBackdropUpdateAccumulator += safeDeltaMilliseconds;
      if (
        this.battleBackdropUpdateAccumulator >=
        Replay.EFFECT_FRAME_MILLISECONDS
      ) {
        this.battleBackdropUpdateAccumulator %=
          Replay.EFFECT_FRAME_MILLISECONDS;
        this.battleBackdrop?.update(this.battleBackdropElapsedMilliseconds);
      }
    }
    this.advanceInkcastEditorialQueue(deltaMilliseconds);
    if (
      !this.playbackRunning ||
      this.finished ||
      !this.transcript ||
      !this.fightersReady
    ) {
      return;
    }

    if (this.impactHoldMilliseconds > 0) {
      this.impactHoldMilliseconds = Math.max(
        0,
        this.impactHoldMilliseconds - Math.max(0, deltaMilliseconds)
      );
      return;
    }

    const elapsedTicks =
      (Math.max(0, deltaMilliseconds) / 1000) *
      this.transcript.tickRate *
      this.speed;
    const nextTick = Math.min(
      this.transcript.result.completedTick,
      this.playbackTick + elapsedTicks
    );
    const frame = calculateReplayFrame(this.transcript, nextTick);
    this.applyContinuousFrame(frame);
    for (const event of getTimelineEventsInRange(
      this.transcript,
      this.previousPlaybackTick,
      nextTick
    )) {
      this.presentTimelineEvent(event);
    }
    this.flushInkcastCandidatesByTick();
    this.playbackTick = nextTick;
    this.previousPlaybackTick = nextTick;
    this.effectRenderAccumulator += safeDeltaMilliseconds;
    if (
      this.effectRenderAccumulator >= Replay.EFFECT_FRAME_MILLISECONDS ||
      nextTick >= this.transcript.result.completedTick
    ) {
      this.effectRenderAccumulator %= Replay.EFFECT_FRAME_MILLISECONDS;
      this.drawReplayFrameEffects(frame);
    }

    if (nextTick >= this.transcript.result.completedTick) {
      this.finish();
    }
  }

  private projectReplayVector(
    position: ReplayVector,
    frame: ReplayFrame
  ): { x: number; y: number } {
    return projectCombatPosition(position, this.getArenaPresentation(frame));
  }

  private getArenaPresentation(frame: ReplayFrame): ArenaPresentationPlan {
    return planArenaPresentation({
      viewportWidth: this.battleLayout.viewportWidth,
      arenaTop: this.battleLayout.arenaTop,
      arenaBottom: this.battleLayout.arenaBottom,
      horizontalPadding: this.battleLayout.arenaHorizontalPadding,
      verticalPadding: this.battleLayout.arenaVerticalPadding,
      currentCombatHalfWidth: frame.arenaHalfWidth,
      currentCombatHalfHeight: frame.arenaHalfHeight,
      startingCombatHalfWidth: DEFAULT_COMBAT_RULES.arena.startingHalfWidth,
      startingCombatHalfHeight: DEFAULT_COMBAT_RULES.arena.startingHalfHeight,
    });
  }

  private applyContinuousFrame(frame: ReplayFrame): void {
    const fighterFrames = frame.fighters;
    const fighters = [this.fighterA, this.fighterB] as const;
    const arena = this.getArenaPresentation(frame);
    this.battleHud?.updateClock(
      frame.tick,
      frame.completedTick,
      this.transcript?.tickRate ?? COMBAT_TICK_RATE
    );

    fighterFrames.forEach((fighterFrame, index) => {
      const fighter = fighters[index];
      if (!fighter) return;
      const screenPosition = projectCombatPosition(
        fighterFrame.position,
        arena
      );
      fighter.screenX = screenPosition.x;
      fighter.screenY = screenPosition.y;
      fighter.sprite?.setPosition(screenPosition.x, screenPosition.y);
      this.setContinuousHitPoints(fighter, fighterFrame.hitPoints);
    });

    // When the drawings overlap, the lower one reads as closer to the viewer.
    // The tie is stable, while ordinary movement lets either side come forward.
    const fighterAIsInFront = this.fighterA.screenY >= this.fighterB.screenY;
    this.fighterA.sprite?.setDepth(fighterAIsInFront ? 6 : 5);
    this.fighterB.sprite?.setDepth(fighterAIsInFront ? 5 : 6);
  }

  private setContinuousHitPoints(
    fighter: ReplayFighterRuntime,
    hitPoints: number
  ): void {
    this.battleHud?.setFighterHitPoints(
      fighter.side,
      hitPoints,
      fighter.hpMax,
      this.speed
    );
  }

  private fighterForSlot(slot: 'a' | 'b'): ReplayFighterRuntime {
    return slot === 'a' ? this.fighterA : this.fighterB;
  }

  private projectTimelinePosition(
    position: FixedVector,
    tick: number
  ): { x: number; y: number } {
    if (!this.transcript) {
      return { x: this.scale.width / 2, y: this.scale.height / 2 };
    }
    return this.projectReplayVector(
      position,
      calculateReplayFrame(this.transcript, tick)
    );
  }

  private presentTimelineEvent(event: BattleTimelineEvent): void {
    switch (event.kind) {
      case 'battle_started':
      case 'late_fight_started':
      case 'echo_created':
      case 'echo_fired':
      case 'echo_shattered':
      case 'fighter_defeated':
      case 'battle_ended':
        this.presentEchoAndBattleFlowEvent(event);
        return;
      case 'ability_telegraphed':
      case 'ability_activated':
      case 'ability_finished':
        this.presentAbilityLifecycleEvent(event);
        return;
      case 'damage':
      case 'burn_applied':
      case 'barrier_created':
      case 'barrier_hit':
      case 'barrier_broken':
      case 'ink_pressure':
        this.presentDamageAndStatusEvent(event);
        return;
      case 'arena_shrink_started':
      case 'nib_wall_ejection':
      case 'wall_bounce':
      case 'fighter_collision':
        this.presentArenaAndCollisionEvent(event);
        return;
      default:
        this.assertNeverTimelineEvent(event);
    }
  }

  private presentAbilityLifecycleEvent(
    event: AbilityLifecycleTimelineEvent
  ): void {
    switch (event.kind) {
      case 'ability_telegraphed': {
        const actor = this.fighterForSlot(event.actor);
        this.shapeEffects.set(event.actor, {
          power: event.power,
          activationNumber: event.activationNumber,
          phase: 'telegraph',
          startTick: event.tick,
          endTick: event.activatesAtTick,
          aimDirection: event.aimDirection,
          activationOrigin: event.origin,
          connected: false,
        });
        this.battleBackdrop?.signalShapePower(event.actor, 'telegraph');
        this.battleHud?.setFighterShapePowerState(event.actor, 'telegraph');
        this.telegraphShapePower(event.actor, actor, event.power);
        this.soundboard.play('telegraph');
        this.announceReplayCommentary({
          kind: 'power-telegraph',
          tick: event.tick,
          actor: event.actor,
          power: event.power,
          activationNumber: event.activationNumber,
        });
        if (actor.scribbit.element === 'storm') {
          this.revealElementCue(actor, 1_200 / this.speed);
        }
        return;
      }
      case 'ability_activated': {
        const actor = this.fighterForSlot(event.actor);
        const existing = this.shapeEffects.get(event.actor);
        const continuesTelegraph =
          existing?.power === event.power &&
          existing.activationNumber === event.activationNumber;
        this.shapeEffects.set(event.actor, {
          power: event.power,
          activationNumber: event.activationNumber,
          phase: 'active',
          startTick: event.tick,
          endTick: event.activeUntilTick,
          aimDirection: continuesTelegraph
            ? existing.aimDirection
            : { x: actor.facing * 1024, y: 0 },
          activationOrigin: continuesTelegraph
            ? existing.activationOrigin
            : null,
          connected: continuesTelegraph ? existing.connected : false,
        });
        this.battleBackdrop?.signalShapePower(event.actor, 'active');
        this.battleHud?.setFighterShapePowerState(event.actor, 'active');
        this.shapePowerBurst(
          actor,
          ELEMENT_STYLES[actor.scribbit.element].particle
        );
        actor.sprite?.activateShapePower(event.power);
        return;
      }
      case 'ability_finished': {
        const effect = this.shapeEffects.get(event.actor);
        if (
          effect?.power === event.power &&
          effect.activationNumber === event.activationNumber
        ) {
          if (
            shouldAnnounceNoCleanHitAtAbilityFinish(
              event.power,
              effect.connected
            ) &&
            isReplayCommentaryMissPower(event.power)
          ) {
            const opponent = this.fighterForSlot(
              event.actor === 'a' ? 'b' : 'a'
            );
            this.showFighterCombatRead(
              opponent,
              getShapePowerNoCleanHitCallout(event.power),
              'NO CLEAN HIT',
              ELEMENT_STYLES[opponent.scribbit.element].primaryText
            );
            this.announceReplayCommentary({
              kind: 'power-missed',
              tick: event.tick,
              actor: event.actor,
              power: event.power,
              activationNumber: event.activationNumber,
            });
          }
          this.shapeEffects.delete(event.actor);
          this.battleHud?.setFighterShapePowerState(event.actor, 'ready');
        }
        return;
      }
      default:
        this.assertNeverTimelineEvent(event);
    }
  }

  private presentDamageAndStatusEvent(
    event: DamageAndStatusTimelineEvent
  ): void {
    switch (event.kind) {
      case 'damage': {
        const attacker = this.fighterForSlot(event.sourceFighter);
        const target = this.fighterForSlot(event.targetFighter);
        if (isShapePowerId(event.source)) {
          this.markShapePowerConnected(event.sourceFighter, event.source);
        }
        const impactPosition = this.projectTimelinePosition(
          event.position,
          event.tick
        );
        const impactPlan = planBattleImpact({
          damage: event.amount,
          maximumHitPoints: target.hpMax,
          critical: event.critical,
          playbackSpeed: this.speed,
          reduceMotion: this.reduceMotion,
        });
        this.queueImpactHold(impactPlan.hitStopMilliseconds);
        this.cameraPunch(impactPlan.cameraShake);
        target.sprite?.hitReact(
          Math.sign(target.screenX - attacker.screenX) || target.facing
        );
        this.presentPlannedImpact(
          impactPosition.x,
          impactPosition.y,
          ELEMENT_STYLES[target.scribbit.element].particle,
          impactPlan
        );
        this.damagePopAt(
          impactPosition.x,
          impactPosition.y,
          event.amount,
          event.critical,
          impactPlan.damageTextScale
        );
        this.setContinuousHitPoints(target, event.targetHitPoints);
        if (event.critical) this.critFlash();
        this.soundboard.play(event.critical ? 'critical' : 'hit');
        if (
          target.primaryPower === 'nib_halo' &&
          this.shapeEffects.get(event.targetFighter)?.phase === 'active' &&
          (event.source === 'inkquake' ||
            event.source === 'colorburst' ||
            event.source === 'colorburst_echo')
        ) {
          this.showFighterCombatRead(
            target,
            'HALO GUARD!',
            'BLAST CLIPPED',
            ELEMENT_STYLES[target.scribbit.element].primaryText
          );
        }
        if (attacker.scribbit.element === 'tide' && event.targetHitPoints > 0) {
          this.revealElementCue(attacker, 1_200 / this.speed);
        }
        this.announceReplayCommentary({
          kind: 'damage',
          tick: event.tick,
          sourceFighter: event.sourceFighter,
          targetFighter: event.targetFighter,
          sourceName: getDamageSourceDisplayName(
            event.source,
            attacker.scribbit.element
          ),
          sourcePower: isShapePowerId(event.source)
            ? event.source
            : event.source === 'colorburst_echo'
              ? 'colorburst'
              : null,
          amount: event.amount,
          critical: event.critical,
        });
        return;
      }
      case 'burn_applied': {
        const source = this.fighterForSlot(event.sourceFighter);
        const target = this.fighterForSlot(event.targetFighter);
        this.impactBurst(
          target.screenX,
          target.screenY,
          ELEMENT_STYLES.ember.particle,
          false
        );
        this.revealElementCue(source, 1_200 / this.speed);
        this.announceReplayCommentary({
          kind: 'burn',
          tick: event.tick,
          targetFighter: event.targetFighter,
        });
        return;
      }
      case 'barrier_created': {
        const actor = this.fighterForSlot(event.actor);
        this.soundboard.play('shield');
        this.revealElementCue(actor);
        this.announceReplayCommentary({
          kind: 'barrier-created',
          tick: event.tick,
          actor: event.actor,
        });
        return;
      }
      case 'barrier_hit': {
        const actor = this.fighterForSlot(event.actor);
        const sourceEffect =
          event.sourceFighter === undefined
            ? undefined
            : this.shapeEffects.get(event.sourceFighter);
        if (
          sourceEffect &&
          event.sourceFighter !== undefined &&
          barrierHitConnectsShapePowerActivation(event, {
            fighter: event.sourceFighter,
            power: sourceEffect.power,
            activationNumber: sourceEffect.activationNumber,
            phase: sourceEffect.phase,
          })
        ) {
          sourceEffect.connected = true;
        }
        this.cameraPunch(0.005);
        this.impactBurst(
          actor.screenX,
          actor.screenY,
          ELEMENT_STYLES.moss.particle,
          false
        );
        this.announceReplayCommentary({
          kind: 'barrier-hit',
          tick: event.tick,
          actor: event.actor,
          absorbedDamage: event.absorbedDamage,
        });
        return;
      }
      case 'barrier_broken': {
        this.soundboard.play('shield');
        this.announceReplayCommentary({
          kind: 'barrier-broken',
          tick: event.tick,
          actor: event.actor,
        });
        return;
      }
      case 'ink_pressure': {
        const actor = this.fighterForSlot(event.actor);
        this.announceReplayCommentary({
          kind: 'ink-pressure',
          tick: event.tick,
          actor: event.actor,
        });
        actor.sprite?.telegraph();
        return;
      }
      default:
        this.assertNeverTimelineEvent(event);
    }
  }

  private presentArenaAndCollisionEvent(
    event: ArenaAndCollisionTimelineEvent
  ): void {
    switch (event.kind) {
      case 'nib_wall_ejection': {
        const actor = this.fighterForSlot(event.actor);
        const recoilPosition = this.projectTimelinePosition(
          event.position,
          event.tick
        );
        this.impactBurst(
          recoilPosition.x,
          recoilPosition.y,
          ELEMENT_STYLES[actor.scribbit.element].particle,
          false
        );
        this.announceReplayCommentary({
          kind: 'nib-recoil',
          tick: event.tick,
          actor: event.actor,
        });
        return;
      }
      case 'wall_bounce': {
        const actor = this.fighterForSlot(event.actor);
        const bouncePosition = this.projectTimelinePosition(
          event.position,
          event.tick
        );
        this.impactBurst(
          bouncePosition.x,
          bouncePosition.y,
          ELEMENT_STYLES[actor.scribbit.element].particle,
          false
        );
        return;
      }
      case 'fighter_collision': {
        this.cameraPunch(0.006);
        const collisionPosition = this.projectTimelinePosition(
          event.position,
          event.tick
        );
        this.impactBurst(
          collisionPosition.x,
          collisionPosition.y,
          UI.gold,
          false
        );
        return;
      }
      case 'arena_shrink_started':
        this.announceReplayCommentary({
          kind: 'arena-shrink',
          tick: event.tick,
        });
        this.soundboard.play('shrink');
        this.showArenaMoment('THE PAGE FOLDS IN!', UI.coralText);
        return;
      default:
        this.assertNeverTimelineEvent(event);
    }
  }

  private presentEchoAndBattleFlowEvent(
    event: EchoAndBattleFlowTimelineEvent
  ): void {
    switch (event.kind) {
      case 'battle_started': {
        this.announceReplayCommentary({
          kind: 'battle-start',
          tick: event.tick,
        });
        return;
      }
      case 'echo_created': {
        const actor = this.fighterForSlot(event.actor);
        const echoPosition = this.projectTimelinePosition(
          event.position,
          event.tick
        );
        this.impactBurst(
          echoPosition.x,
          echoPosition.y,
          ELEMENT_STYLES[actor.scribbit.element].particle,
          false
        );
        this.announceReplayCommentary({
          kind: 'echo-created',
          tick: event.tick,
          actor: event.actor,
        });
        return;
      }
      case 'echo_fired': {
        const actor = this.fighterForSlot(event.actor);
        const echoPosition = this.projectTimelinePosition(
          event.position,
          event.tick
        );
        this.cameraPunch(0.007);
        this.lingerColorburstEcho(actor, echoPosition.x, echoPosition.y);
        this.impactBurst(
          echoPosition.x,
          echoPosition.y,
          ELEMENT_STYLES[actor.scribbit.element].particle,
          true
        );
        this.announceReplayCommentary({
          kind: 'echo-fired',
          tick: event.tick,
          actor: event.actor,
        });
        return;
      }
      case 'echo_shattered': {
        const owner = this.fighterForSlot(event.owner);
        const echoPosition = this.projectTimelinePosition(
          event.position,
          event.tick
        );
        this.impactBurst(
          echoPosition.x,
          echoPosition.y,
          ELEMENT_STYLES[owner.scribbit.element].particle,
          true
        );
        this.announceReplayCommentary({
          kind: 'echo-shattered',
          tick: event.tick,
          actor: event.owner,
        });
        return;
      }
      case 'late_fight_started':
        this.announceReplayCommentary({
          kind: 'late-fight',
          tick: event.tick,
        });
        this.soundboard.play('sudden');
        this.showArenaMoment('SUDDEN SCRIBBLE!', UI.goldText);
        return;
      case 'fighter_defeated':
        // The validated result owns the finish pose. Waiting for finish() keeps
        // knockout, double-KO, and timeout presentations mutually exclusive.
        return;
      case 'battle_ended':
        return;
      default:
        this.assertNeverTimelineEvent(event);
    }
  }

  private assertNeverTimelineEvent(event: never): never {
    throw new Error(
      `Unhandled battle timeline event: ${JSON.stringify(event)}`
    );
  }

  private drawReplayFrameEffects(frame: ReplayFrame): void {
    const graphics = this.combatEffects;
    const floorGraphics = this.arenaFloorEffects;
    if (!graphics || !floorGraphics) return;
    graphics.clear();
    floorGraphics.clear();
    this.hidePowerGhosts();

    const arena = this.getArenaPresentation(frame);
    this.strokePaperArenaBoundary(
      floorGraphics,
      arena,
      UI.creamHex,
      10,
      0.82,
      1
    );
    this.strokePaperArenaBoundary(floorGraphics, arena, UI.inkHex, 4, 0.56, 0);
    const shrinkRatio = arena.currentHalfWidth / arena.maximumHalfWidth;
    if (shrinkRatio < 0.995) {
      const maximumLeft = arena.centerX - arena.maximumHalfWidth;
      const maximumTop = arena.centerY - arena.maximumHalfHeight;
      const maximumWidth = arena.maximumHalfWidth * 2;
      const maximumHeight = arena.maximumHalfHeight * 2;
      const currentLeft = arena.centerX - arena.currentHalfWidth;
      const currentTop = arena.centerY - arena.currentHalfHeight;
      const currentRight = arena.centerX + arena.currentHalfWidth;
      const currentBottom = arena.centerY + arena.currentHalfHeight;
      // The authoritative walls close as paper folds, rather than as gamey
      // danger columns. Darkened flaps and doubled crease lines keep the
      // shrinking bounds truthful even without relying on color.
      floorGraphics.fillStyle(UI.inkHex, 0.045);
      floorGraphics.fillRect(
        maximumLeft,
        maximumTop,
        Math.max(0, currentLeft - maximumLeft),
        maximumHeight
      );
      floorGraphics.fillRect(
        currentRight,
        maximumTop,
        Math.max(0, maximumLeft + maximumWidth - currentRight),
        maximumHeight
      );
      floorGraphics.fillRect(
        currentLeft,
        maximumTop,
        Math.max(0, currentRight - currentLeft),
        Math.max(0, currentTop - maximumTop)
      );
      floorGraphics.fillRect(
        currentLeft,
        currentBottom,
        Math.max(0, currentRight - currentLeft),
        Math.max(0, maximumTop + maximumHeight - currentBottom)
      );
      floorGraphics.lineStyle(16, UI.inkHex, 0.12);
      floorGraphics.lineBetween(
        arena.centerX - arena.currentHalfWidth - 5,
        arena.centerY - arena.currentHalfHeight,
        arena.centerX - arena.currentHalfWidth - 5,
        arena.centerY + arena.currentHalfHeight
      );
      floorGraphics.lineBetween(
        arena.centerX + arena.currentHalfWidth + 5,
        arena.centerY - arena.currentHalfHeight,
        arena.centerX + arena.currentHalfWidth + 5,
        arena.centerY + arena.currentHalfHeight
      );
      floorGraphics.lineStyle(5, UI.coralDeep, 0.4);
      floorGraphics.lineBetween(
        currentLeft,
        currentTop,
        currentLeft,
        currentBottom
      );
      floorGraphics.lineBetween(
        currentRight,
        currentTop,
        currentRight,
        currentBottom
      );
      floorGraphics.lineStyle(3, UI.inkHex, 0.2);
      floorGraphics.lineBetween(
        currentLeft,
        currentTop + 34,
        currentLeft + 28,
        currentTop
      );
      floorGraphics.lineBetween(
        currentRight,
        currentBottom - 34,
        currentRight - 28,
        currentBottom
      );
    }

    const fighterFrames = frame.fighters;
    for (const [index, fighterFrame] of fighterFrames.entries()) {
      const slot = index === 0 ? 'a' : 'b';
      const fighter = this.fighterForSlot(slot);
      const style = ELEMENT_STYLES[fighter.scribbit.element];
      const center = this.projectReplayVector(fighterFrame.position, frame);

      floorGraphics.fillStyle(UI.inkHex, 0.17);
      floorGraphics.fillEllipse(center.x, center.y + 78, 142, 34);
      floorGraphics.lineStyle(3, style.primary, 0.28);
      floorGraphics.strokeEllipse(center.x, center.y + 78, 142, 34);

      for (const segment of buildMasteryAuraSegments({
        center,
        level: levelOf(fighter.scribbit),
        frameTick: frame.tick,
        reduceMotion: this.reduceMotion,
      })) {
        graphics.lineStyle(5, UI.gold, segment.alpha);
        graphics.lineBetween(
          segment.start.x,
          segment.start.y,
          segment.end.x,
          segment.end.y
        );
      }

      if (fighterFrame.barrierHitPoints > 0) {
        graphics.lineStyle(7, ELEMENT_STYLES.moss.particle, 0.62);
        graphics.strokeCircle(center.x, center.y, 67);
      }

      if (fighterFrame.echoPosition) {
        const echo = this.projectReplayVector(fighterFrame.echoPosition, frame);
        graphics.lineStyle(5, style.particle, 0.82);
        graphics.strokeCircle(echo.x, echo.y, 58);
      }

      const effect = this.shapeEffects.get(slot);
      this.drawDrawingGhosts(frame, fighterFrame, fighter, effect);
      if (!effect) continue;

      const activationCenter = effect.activationOrigin
        ? this.projectReplayVector(effect.activationOrigin, frame)
        : center;
      const commands = buildShapePowerDrawCommands({
        effect,
        frameTick: frame.tick,
        fighterCenter: center,
        activationCenter,
        primaryColor: style.particle,
        colorburstPalette: [style.particle, UI.gold, UI.coral],
      });
      commands.forEach((command) =>
        this.drawShapePowerCommand(graphics, command)
      );
    }
  }

  private strokePaperArenaBoundary(
    graphics: Phaser.GameObjects.Graphics,
    arena: ArenaPresentationPlan,
    color: number,
    lineWidth: number,
    alpha: number,
    jitterOffset: number
  ): void {
    const left = arena.centerX - arena.currentHalfWidth;
    const right = arena.centerX + arena.currentHalfWidth;
    const top = arena.centerY - arena.currentHalfHeight;
    const bottom = arena.centerY + arena.currentHalfHeight;
    const horizontalSegments = 7;
    const verticalSegments = 9;
    const jitter = [0, -2, 3, -1, 2, -3, 1, 0, -1, 2] as const;
    const points: Array<{ x: number; y: number }> = [];

    for (let index = 0; index <= horizontalSegments; index += 1) {
      points.push({
        x: left + ((right - left) * index) / horizontalSegments,
        y: top + (jitter[(index + jitterOffset) % jitter.length] ?? 0),
      });
    }
    for (let index = 1; index <= verticalSegments; index += 1) {
      points.push({
        x: right + (jitter[(index + jitterOffset + 2) % jitter.length] ?? 0),
        y: top + ((bottom - top) * index) / verticalSegments,
      });
    }
    for (let index = 1; index <= horizontalSegments; index += 1) {
      points.push({
        x: right - ((right - left) * index) / horizontalSegments,
        y: bottom + (jitter[(index + jitterOffset + 4) % jitter.length] ?? 0),
      });
    }
    for (let index = 1; index < verticalSegments; index += 1) {
      points.push({
        x: left + (jitter[(index + jitterOffset + 6) % jitter.length] ?? 0),
        y: bottom - ((bottom - top) * index) / verticalSegments,
      });
    }

    const firstPoint = points[0];
    if (!firstPoint) return;
    graphics.lineStyle(lineWidth, color, alpha);
    graphics.beginPath();
    graphics.moveTo(firstPoint.x, firstPoint.y);
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      if (point) graphics.lineTo(point.x, point.y);
    }
    graphics.closePath();
    graphics.strokePath();
  }

  private hidePowerGhosts(): void {
    for (const fighter of [this.fighterA, this.fighterB]) {
      fighter.powerGhosts.forEach((ghost) => {
        ghost.setVisible(false).setAlpha(0).clearTint();
      });
    }
  }

  private drawDrawingGhosts(
    frame: ReplayFrame,
    fighterFrame: ReplayFrame['fighters'][number],
    fighter: ReplayFighterRuntime,
    effect: ShapeEffect | undefined
  ): void {
    const style = ELEMENT_STYLES[fighter.scribbit.element];
    if (effect?.power === 'smearstep' && effect.phase === 'active') {
      const directionLength = Math.max(
        1,
        Math.hypot(effect.aimDirection.x, effect.aimDirection.y)
      );
      const directionX = effect.aimDirection.x / directionLength;
      const directionY = effect.aimDirection.y / directionLength;
      const center = this.projectReplayVector(fighterFrame.position, frame);
      fighter.powerGhosts.slice(0, 2).forEach((ghost, index) => {
        const distance = 58 + index * 54;
        ghost
          .setPosition(
            center.x - directionX * distance,
            center.y - directionY * distance
          )
          .setTint(style.soft)
          .setAlpha(index === 0 ? 0.32 : 0.16)
          .setVisible(true);
      });
    }

    if (fighterFrame.echoPosition) {
      const echo = this.projectReplayVector(fighterFrame.echoPosition, frame);
      const ghost = fighter.powerGhosts[0];
      ghost?.setPosition(echo.x, echo.y).setAlpha(0.42).setVisible(true);
    }
  }

  private drawShapePowerCommand(
    graphics: Phaser.GameObjects.Graphics,
    command: ShapePowerDrawCommand
  ): void {
    if (command.kind === 'stroke-circle') {
      graphics.lineStyle(command.lineWidth, command.color, command.alpha);
      graphics.strokeCircle(
        command.center.x,
        command.center.y,
        Math.max(2, command.radius)
      );
      return;
    }
    if (command.kind === 'line') {
      graphics.lineStyle(command.lineWidth, command.color, command.alpha);
      graphics.lineBetween(
        command.start.x,
        command.start.y,
        command.end.x,
        command.end.y
      );
      return;
    }
    if (command.kind === 'fill-circle') {
      graphics.fillStyle(command.color, command.alpha);
      graphics.fillCircle(command.center.x, command.center.y, command.radius);
      return;
    }
    if (command.kind === 'stroke-triangle') {
      graphics.lineStyle(command.lineWidth, command.color, command.alpha);
      graphics.strokeTriangle(
        command.first.x,
        command.first.y,
        command.second.x,
        command.second.y,
        command.third.x,
        command.third.y
      );
      return;
    }
    graphics.fillStyle(command.color, command.alpha);
    graphics.fillTriangle(
      command.first.x,
      command.first.y,
      command.second.x,
      command.second.y,
      command.third.x,
      command.third.y
    );
  }

  private lingerColorburstEcho(
    fighter: ReplayFighterRuntime,
    x: number,
    y: number
  ): void {
    const source = fighter.powerGhosts[0];
    if (!source) return;
    const style = ELEMENT_STYLES[fighter.scribbit.element];
    const ghost = this.add
      .image(x, y, source.texture.key)
      .setDepth(12)
      .setScale(source.scaleX, source.scaleY)
      .setFlipX(source.flipX)
      .setAlpha(0.66);
    const ring = this.add.graphics().setDepth(11);
    ring.lineStyle(8, style.particle, 0.86);
    ring.strokeCircle(x, y, 58);
    const echoLabel = label(
      this,
      x,
      y - 100,
      'ECHO!',
      28,
      UI.goldText,
      true
    ).setDepth(14);
    echoLabel.setStroke('#2b2016', 6);
    if (this.reduceMotion) {
      this.time.delayedCall(420, () => {
        ghost.destroy();
        ring.destroy();
        echoLabel.destroy();
      });
      return;
    }
    const sceneDuration = 420 * this.speed;
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: source.scaleX * 1.3,
      scaleY: source.scaleY * 1.3,
      duration: sceneDuration,
      ease: 'Cubic.easeOut',
      onComplete: () => ghost.destroy(),
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.3,
      duration: sceneDuration,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.tweens.add({
      targets: echoLabel,
      y: echoLabel.y - 36,
      alpha: 0,
      duration: sceneDuration,
      ease: 'Cubic.easeOut',
      onComplete: () => echoLabel.destroy(),
    });
  }

  private telegraphShapePower(
    side: 'a' | 'b',
    actor: ReplayFighterRuntime,
    power: PrimaryPower
  ): void {
    actor.sprite?.telegraph();
    if (!actor.sprite) return;

    const firstReveal = !this.signatureShown.has(side);
    this.signatureShown.add(side);
    const style = ELEMENT_STYLES[actor.scribbit.element];
    const powerText = firstReveal
      ? getShapePowerRevealCopy(power, actor.scribbit.element)
      : getShapePowerSignatureName(actor.scribbit.element, power).toUpperCase();
    const opponent = side === 'a' ? this.fighterB : this.fighterA;
    const callout = planShapePowerCallout({
      side,
      actorCenter: { x: actor.screenX, y: actor.screenY },
      opponentCenter: { x: opponent.screenX, y: opponent.screenY },
      firstReveal,
      viewportWidth: this.scale.width,
      viewportHeight: this.scale.height,
    });
    const calloutLabel = label(
      this,
      callout.position.x,
      callout.position.y,
      powerText,
      callout.fontSize,
      style.primaryText,
      true
    )
      .setDepth(30)
      .setWordWrapWidth(firstReveal ? 260 : 240)
      .setLineSpacing(-4)
      .setScale(this.reduceMotion ? 1 : 0);
    calloutLabel.setStroke('#fff7e8', firstReveal ? 9 : 6);
    if (this.reduceMotion) {
      this.time.delayedCall(firstReveal ? 900 : 520, () => {
        calloutLabel.destroy();
      });
      this.shapePowerBurst(actor, style.particle);
      return;
    }
    this.tweens.add({
      targets: calloutLabel,
      scale: 1,
      y: calloutLabel.y - 18,
      duration: this.reduceMotion ? 80 : 220,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: firstReveal ? 680 : 220,
      onComplete: () => calloutLabel.destroy(),
    });
    this.shapePowerBurst(actor, style.particle);
  }

  private shapePowerBurst(actor: ReplayFighterRuntime, tint: number): void {
    if (this.reduceMotion) return;
    const burst = this.add.particles(actor.screenX, actor.screenY, 'dot', {
      speed: { min: 40, max: 150 },
      scale: { start: 0.42, end: 0 },
      lifespan: 480,
      quantity: 12,
      tint,
      emitting: false,
    });
    burst.setDepth(8);
    burst.explode(12);
    this.time.delayedCall(560, () => burst.destroy());
  }

  private markShapePowerConnected(side: 'a' | 'b', power: PrimaryPower): void {
    const effect = this.shapeEffects.get(side);
    if (effect?.phase === 'active' && effect.power === power) {
      effect.connected = true;
    }
  }

  private revealElementCue(
    fighter: ReplayFighterRuntime,
    delayMilliseconds = 0
  ): void {
    if (this.elementCueShown.has(fighter.scribbit.element)) return;
    this.elementCueShown.add(fighter.scribbit.element);
    const cue = getElementBattleCue(fighter.scribbit.element);
    const showCue = (): void => {
      this.showFighterCombatRead(
        fighter,
        cue.label,
        cue.detail,
        ELEMENT_STYLES[fighter.scribbit.element].primaryText
      );
    };
    if (delayMilliseconds > 0) {
      this.time.delayedCall(delayMilliseconds, showCue);
    } else {
      showCue();
    }
  }

  private showFighterCombatRead(
    fighter: ReplayFighterRuntime,
    title: string,
    detail: string,
    color: string
  ): void {
    const laneX =
      this.battleLayout.viewportWidth * (fighter.side === 'a' ? 0.22 : 0.78);
    const boundedY = Math.min(
      this.battleLayout.arenaBottom - 120,
      Math.max(
        this.battleLayout.fighterPanelTop +
          this.battleLayout.fighterPanelHeight +
          100,
        fighter.screenY - 112
      )
    );
    this.showCombatRead(laneX, boundedY, title, detail, color);
  }

  private showCombatRead(
    x: number,
    y: number,
    title: string,
    detail: string,
    color: string
  ): void {
    const stamp = label(this, x, y, `${title}\n${detail}`, 27, color, true)
      .setDepth(57)
      .setLineSpacing(-5)
      .setScale(this.reduceMotion ? 1 : 0.42);
    stamp.setStroke('#fff7e8', 8);
    if (this.reduceMotion) {
      this.time.delayedCall(640, () => stamp.destroy());
      return;
    }
    this.tweens.add({
      targets: stamp,
      scale: 1,
      y: y - 12,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: stamp,
          y: y - 26,
          alpha: 0,
          delay: 460,
          duration: 320,
          ease: 'Quad.easeIn',
          onComplete: () => stamp.destroy(),
        });
      },
    });
  }

  private displayInkcastText(text: string): void {
    this.battleHud?.announce(text);
    this.inkcastDwellRemainingMilliseconds =
      INKCAST_WALL_CLOCK_DWELL_MILLISECONDS;
  }

  private replayCommentaryContext(): ReplayCommentaryContext {
    return {
      battleId: this.transcript?.battleId ?? this.report.id,
      fighters: {
        a: {
          id: this.fighterA.scribbit.id,
          name: this.fighterA.scribbit.name,
          element: this.fighterA.scribbit.element,
          primaryPower: this.fighterA.primaryPower,
        },
        b: {
          id: this.fighterB.scribbit.id,
          name: this.fighterB.scribbit.name,
          element: this.fighterB.scribbit.element,
          primaryPower: this.fighterB.primaryPower,
        },
      },
    };
  }

  private announceReplayCommentary(fact: ReplayCommentaryFact): void {
    const commentaryAuthor =
      this.replayCommentaryAuthor ??
      createReplayCommentaryAuthor(this.replayCommentaryContext());
    this.replayCommentaryAuthor = commentaryAuthor;
    const candidate = createInkcastEditorialCandidate(
      fact,
      commentaryAuthor.author(fact),
      this.inkcastSequence
    );
    this.inkcastSequence += 1;
    const candidatesAtTick = this.inkcastCandidatesByTick.get(fact.tick) ?? [];
    candidatesAtTick.push(candidate);
    this.inkcastCandidatesByTick.set(fact.tick, candidatesAtTick);
  }

  private flushInkcastCandidatesByTick(): void {
    const orderedTicks = [...this.inkcastCandidatesByTick.keys()].sort(
      (left, right) => left - right
    );
    for (const tick of orderedTicks) {
      const chosenCandidate = chooseInkcastCandidateForSimulationTick(
        this.inkcastCandidatesByTick.get(tick) ?? []
      );
      this.inkcastCandidatesByTick.delete(tick);
      if (!chosenCandidate) continue;
      if (
        this.inkcastDwellRemainingMilliseconds <= 0 &&
        this.pendingInkcastCandidates.length === 0
      ) {
        this.displayInkcastText(chosenCandidate.authoredText);
        continue;
      }
      this.pendingInkcastCandidates = enqueueInkcastEditorialCandidate(
        this.pendingInkcastCandidates,
        chosenCandidate
      );
    }
  }

  private advanceInkcastEditorialQueue(deltaMilliseconds: number): void {
    this.inkcastDwellRemainingMilliseconds = Math.max(
      0,
      this.inkcastDwellRemainingMilliseconds - Math.max(0, deltaMilliseconds)
    );
    if (
      this.inkcastDwellRemainingMilliseconds > 0 ||
      this.pendingInkcastCandidates.length === 0
    ) {
      return;
    }
    const nextCandidate = this.pendingInkcastCandidates[0];
    this.pendingInkcastCandidates = Object.freeze(
      this.pendingInkcastCandidates.slice(1)
    );
    if (nextCandidate) this.displayInkcastText(nextCandidate.authoredText);
  }

  private clearInkcastEditorialState(): void {
    this.inkcastCandidatesByTick.clear();
    this.pendingInkcastCandidates = Object.freeze([]);
    this.inkcastDwellRemainingMilliseconds = 0;
    this.inkcastSequence = 0;
    this.replayCommentaryAuthor = null;
  }

  private showArenaMoment(text: string, color: string): void {
    const callout = label(
      this,
      this.scale.width / 2,
      this.scale.height * 0.38,
      text,
      48,
      color,
      true
    )
      .setDepth(58)
      .setScale(this.reduceMotion ? 1 : 0.35);
    callout.setStroke('#fff7e8', 9);
    this.tweens.add({
      targets: callout,
      scale: 1,
      alpha: 0,
      duration: this.reduceMotion ? 420 : 760,
      hold: this.reduceMotion ? 260 : 380,
      ease: 'Back.easeOut',
      onComplete: () => callout.destroy(),
    });
  }

  private queueImpactHold(milliseconds: number): void {
    this.impactHoldMilliseconds = Math.max(
      this.impactHoldMilliseconds,
      milliseconds
    );
  }

  private presentPlannedImpact(
    x: number,
    y: number,
    tint: number,
    plan: BattleImpactPlan
  ): void {
    if (plan.particleCount > 0) {
      const emitter = this.add.particles(
        x,
        y,
        plan.tier === 'critical' ? 'spark' : 'dot',
        {
          speed: {
            min: plan.tier === 'light' ? 70 : 110,
            max: plan.tier === 'critical' ? 380 : 280,
          },
          scale: {
            start: plan.tier === 'critical' ? 0.78 : 0.58,
            end: 0,
          },
          lifespan: plan.tier === 'critical' ? 560 : 440,
          quantity: plan.particleCount,
          tint,
          emitting: false,
        }
      );
      emitter.setDepth(9);
      emitter.explode(plan.particleCount);
      this.time.delayedCall(700, () => emitter.destroy());
    }

    for (let ringIndex = 0; ringIndex < plan.ringCount; ringIndex += 1) {
      const ring = this.add
        .circle(x, y, 32 + ringIndex * 9, 0xffffff, 0)
        .setStrokeStyle(
          Math.max(3, 8 - ringIndex * 2),
          ringIndex === 0 ? tint : UI.gold,
          0.8 - ringIndex * 0.16
        )
        .setDepth(10)
        .setScale(0.35);
      this.tweens.add({
        targets: ring,
        scale: 1.35 + ringIndex * 0.18,
        alpha: 0,
        duration: 260 + ringIndex * 70,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  // Camera punch-in: a quick zoom toward the struck fighter, then ease back.
  private cameraPunch(shakeIntensity: number): void {
    if (!this.reduceMotion) this.cameras.main.shake(200, shakeIntensity);
  }

  private impactBurst(x: number, y: number, tint: number, big: boolean): void {
    if (this.reduceMotion) return;
    const qty = big ? 22 : 12;
    const emitter = this.add.particles(x, y, 'dot', {
      speed: { min: 80, max: big ? 320 : 220 },
      scale: { start: big ? 0.8 : 0.6, end: 0 },
      lifespan: 460,
      quantity: qty,
      tint,
      emitting: false,
    });
    emitter.setDepth(9);
    emitter.explode(qty);
    this.time.delayedCall(700, () => emitter.destroy());
  }

  private damagePopAt(
    x: number,
    y: number,
    damage: number,
    crit: boolean,
    emphasisScale = 1
  ): void {
    const text = label(
      this,
      x,
      y - 80,
      crit ? `${damage}!` : String(damage),
      Math.round((crit ? 60 : 42) * emphasisScale),
      crit ? '#ffd447' : '#ff5a3d',
      true
    ).setDepth(29);
    text.setStroke('#2b2016', crit ? 7 : 5);
    if (this.reduceMotion) {
      this.time.delayedCall(640, () => text.destroy());
      return;
    }
    this.tweens.add({
      targets: text,
      y: y - 160,
      alpha: 0,
      scale: crit ? 1.3 : 1,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private critFlash(): void {
    if (this.reduceMotion) return;
    const { width, height } = this.scale;
    // Screen-edge flash (a hollow border glow) rather than a full white wash.
    const g = this.add.graphics().setDepth(30);
    g.lineStyle(28, 0xffd447, 0.85);
    g.strokeRect(14, 14, width - 28, height - 28);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy(),
    });
  }

  private stopPlaybackPresentation(): void {
    this.playbackRunning = false;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.impactHoldMilliseconds = 0;
    this.recordDebugPlaybackState('result');
    this.clearInkcastEditorialState();
    this.shapeEffects.clear();
    this.battleHud?.setFighterShapePowerState('a', 'ready');
    this.battleHud?.setFighterShapePowerState('b', 'ready');
    this.hidePowerGhosts();
    this.arenaFloorEffects?.clear();
    this.combatEffects?.clear();
    this.clearIntroBanner();
  }

  private skipToEnd(): void {
    if (this.finished) return;
    if (!this.fightersReady) {
      this.skipRequested = true;
      this.battleHud?.setAnnouncerText(
        'Loading both drawings before the result…'
      );
      return;
    }
    if (!this.transcript) {
      this.showArchivedResult();
      return;
    }
    this.applyContinuousFrame(
      calculateReplayFrame(
        this.transcript,
        this.transcript.result.completedTick
      )
    );
    this.finish();
  }

  private showArchivedResult(): void {
    if (this.finished) return;
    this.finished = true;
    this.stopPlaybackPresentation();
    this.battleHud?.setAnnouncerVisible(false);
    this.battleHud?.setClockVisible(false);
    this.battleHud?.setControlsVisible(false);
    this.battleHud?.setHitPointBarsVisible(false);
    this.battleHud?.setBattleChromeVisible(false);

    const winner = this.report.winner === 'a' ? this.fighterA : this.fighterB;
    const loser = this.report.winner === 'a' ? this.fighterB : this.fighterA;
    winner.sprite?.celebrate();
    const perspective = this.battleRecapPerspective(winner, loser);

    const { width, height } = this.scale;
    const card = stickerCard(this, width / 2, height / 2, width - 70, 286, {
      gold: true,
      tapeColor: UI.tape,
    });
    card.setDepth(60).setScale(0.8);
    this.tweens.add({
      targets: card,
      scale: 1,
      duration: this.reduceMotion ? 0 : 260,
      ease: 'Back.easeOut',
    });
    const top = -143;
    card.add(
      label(
        this,
        0,
        top + 48,
        formatBattleRecapLead(
          { winnerName: winner.scribbit.name },
          perspective
        ),
        34,
        UI.goldText,
        true
      ).setWordWrapWidth(width - 110)
    );
    card.add(
      label(
        this,
        0,
        top + 96,
        this.report.rivalRun
          ? `${formatRivalRunResultLine(this.report.rivalRun)} • ARCHIVED`
          : 'ARCHIVED • SERVER RESULT SAVED',
        18,
        UI.ink,
        true
      ).setWordWrapWidth(width - 90)
    );
    const returnLabel = this.returnButtonLabel();
    const returnY = top + 205;
    const returnWidth = width - 150;
    this.postFightActions?.destroy();
    this.postFightActions = createPostFightActions(this, {
      x: 0,
      y: returnY,
      accessibilityX: width / 2,
      accessibilityY: height / 2 + returnY,
      width: returnWidth,
      canChooseRival: false,
      canBackContender: false,
      returnLabel,
      onRivals: () => {},
      onBackContender: () => {},
      onReturn: () => this.exit(),
    });
    card.add(this.postFightActions.container);
  }

  private finish(): void {
    if (this.finished) return;
    const transcript = this.transcript;
    if (!transcript) {
      this.showArchivedResult();
      return;
    }
    this.finished = true;
    this.stopPlaybackPresentation();

    const recap = planBattleRecap(transcript);
    const founderOutcome = authorFounderBattleOutcome(
      this.replayCommentaryContext(),
      recap.winnerSlot
    );
    const winner = this.fighterForSlot(recap.winnerSlot);
    const loser = this.fighterForSlot(recap.loserSlot);
    const playerSlot = this.isMine(this.report.a)
      ? 'a'
      : this.isMine(this.report.b)
        ? 'b'
        : null;
    const founderEpisodeReceipt = planFounderRivalEpisodeReceipt(
      this.founderRivalryStakes,
      this.founderChronicleBeat,
      this.report,
      playerSlot,
      recap.winnerSlot
    );
    const crumple = (fighter: ReplayFighterRuntime): void => {
      fighter.sprite?.crumple(() => {
        this.impactBurst(fighter.screenX, fighter.screenY + 30, 0xcbb79a, true);
      });
    };

    this.soundboard.play(recap.finishSound);
    if (recap.finishPresentation === 'knockout') {
      crumple(loser);
    } else if (recap.finishPresentation === 'double-knockout') {
      crumple(this.fighterA);
      crumple(this.fighterB);
    }

    // The recap and choices are immediate. Finish poses can animate behind
    // them without making reduced-motion or impatient viewers wait.
    this.showOutcome(
      winner,
      loser,
      recap,
      founderOutcome,
      founderEpisodeReceipt
    );
  }

  private showOutcome(
    winner: ReplayFighterRuntime,
    loser: ReplayFighterRuntime,
    recap: BattleRecapPlan,
    founderOutcome: string | null,
    founderEpisodeReceipt: FounderRivalEpisodeReceiptPlan | null
  ): void {
    // Outcome controls occupy the ticker area; hide live-combat chrome before
    // showing the post-battle choices.
    this.battleHud?.setAnnouncerVisible(false);
    this.battleHud?.setClockVisible(false);
    this.battleHud?.setControlsVisible(false);
    if (this.report.kind === 'practice') {
      this.showPracticeOutcome(winner, recap);
      return;
    }
    this.battleHud?.setBattleChromeVisible(false);
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, UI.paper, 0.9)
      .setOrigin(0)
      .setDepth(54);
    const arena = getArena(this);
    const myLoss = this.isMine(loser.scribbit) && !this.isMine(winner.scribbit);
    if (myLoss && arena) {
      this.showLossCard(
        loser.scribbit,
        arena.dayNumber,
        recap,
        founderOutcome,
        founderEpisodeReceipt
      );
    } else {
      this.showWinCeremony(
        winner,
        recap,
        founderOutcome,
        founderEpisodeReceipt
      );
    }
  }

  private isMine(scribbit: Scribbit): boolean {
    const arena = getArena(this);
    return isScribbitOwnedByViewer(
      scribbit,
      arena?.myUsername,
      arena?.myScribbits.map((ownedScribbit) => ownedScribbit.id)
    );
  }

  private battleRecapPerspective(
    winner: ReplayFighterRuntime,
    loser: ReplayFighterRuntime
  ): BattleRecapPerspective {
    if (this.isMine(winner.scribbit)) return 'viewer_win';
    if (this.isMine(loser.scribbit)) return 'viewer_loss';
    return 'spectator';
  }

  private showPracticeOutcome(
    winner: ReplayFighterRuntime,
    recap: BattleRecapPlan
  ): void {
    const { width, height } = this.scale;
    const session = getPracticeSession(this);
    this.battleHud?.setHitPointBarsVisible(false);
    winner.sprite?.celebrate();
    if (planPracticeOutcome(session).celebrateCompletion) {
      this.time.delayedCall(220, () => {
        if (this.scene.isActive()) this.soundboard.play('win');
      });
    }
    createBattleRecapCard(this, recap, {
      x: width / 2,
      y: height - 535,
      width: width - 70,
      depth: 60,
      perspective: this.battleRecapPerspective(
        winner,
        winner === this.fighterA ? this.fighterB : this.fighterA
      ),
    });
    createPracticeOutcomeControls(this, {
      session,
      onTryAgain: () => this.startPractice(),
      onExit: () => this.exit(),
    });
  }

  private showWinCeremony(
    winner: ReplayFighterRuntime,
    recap: BattleRecapPlan,
    founderOutcome: string | null,
    founderEpisodeReceipt: FounderRivalEpisodeReceiptPlan | null
  ): void {
    const { width, height } = this.scale;
    const usesVerdictCeremony = recap.finishPresentation === 'double-knockout';
    const canChooseRival =
      this.report.kind === 'exhibition' && this.isMine(winner.scribbit);
    const canBackContender = !getArena(this)?.myBackedScribbitId;
    const victoryY = height * 0.36;
    const losingFighter =
      winner === this.fighterA ? this.fighterB : this.fighterA;
    const outcomeLayout = planReplayOutcomeLayout({ viewportHeight: height });
    this.time.delayedCall(260, () => {
      if (this.scene.isActive()) this.soundboard.play('win');
    });
    if (winner.sprite && !usesVerdictCeremony) {
      winner.sprite.setDepth(56);
      losingFighter.sprite?.container.setAlpha(0.34);
      this.tweens.add({
        targets: winner.sprite.container,
        x: width / 2,
        y: victoryY,
        duration: this.reduceMotion ? 0 : 420,
        ease: 'Cubic.easeOut',
        onComplete: () => winner.sprite?.celebrate(),
      });
    }
    const contextLine = this.report.rivalRun
      ? formatRivalRunResultLine(this.report.rivalRun)
      : founderEpisodeReceipt?.headline ?? founderOutcome;
    const rivalActionCopy = planRivalRunActionCopy(this.report.rivalRun);
    const rivalRunFinish = planRivalRunFinishStamp(this.report.rivalRun);
    if (rivalRunFinish) {
      const finishY = outcomeLayout.recapY - 150;
      const finishTitle = label(
        this,
        width / 2,
        finishY - 28,
        rivalRunFinish.title,
        34,
        UI.coralText,
        true
      ).setDepth(62);
      finishTitle.setStroke(UI.cream, 8);
      const finishScore = label(
        this,
        width / 2,
        finishY + 20,
        rivalRunFinish.score,
        52,
        UI.goldText,
        true
      ).setDepth(62);
      finishScore.setStroke(UI.ink, 7);
      const finishRecord = label(
        this,
        width / 2,
        finishY + 64,
        rivalRunFinish.record,
        22,
        UI.ink,
        true
      ).setDepth(62);
      finishRecord.setStroke(UI.cream, 5);
    }
    createBattleRecapCard(this, recap, {
      x: width / 2,
      y: outcomeLayout.recapY,
      width: width - 70,
      depth: 60,
      perspective: this.battleRecapPerspective(winner, losingFighter),
      ...(!rivalRunFinish && contextLine ? { contextLine } : {}),
    });
    // Only show a reward the server says this exact battle granted. Historical
    // replays and later practice wins must never imply a second payout.
    if (this.isMine(winner.scribbit) && (this.report.inkAwarded ?? 0) > 0) {
      const rewardText = `Earned +${this.report.inkAwarded} 🫙`;
      if (this.reduceMotion) {
        const reward = label(
          this,
          width / 2,
          victoryY - 110,
          rewardText,
          28,
          UI.goldText,
          true
        ).setDepth(62);
        reward.setStroke(UI.cream, 7);
      } else {
        floatReward(this, width / 2, victoryY, rewardText, UI.goldText, 62);
      }
    }

    if (!this.reduceMotion && (!usesVerdictCeremony || rivalRunFinish)) {
      const emitter = this.add.particles(width / 2, height * 0.32, 'spark', {
        speed: { min: 100, max: 300 },
        scale: { start: 0.5, end: 0 },
        lifespan: 1400,
        quantity: 2,
        frequency: 140,
        tint: [UI.gold, ELEMENT_STYLES[winner.scribbit.element].particle],
      });
      emitter.setDepth(55);
      this.time.delayedCall(1700, () => emitter.destroy());
    }

    this.postFightActions?.destroy();
    this.postFightActions = createPostFightActions(this, {
      x: width / 2,
      y: outcomeLayout.actionY,
      accessibilityX: width / 2,
      accessibilityY: outcomeLayout.actionY,
      width: width - 70,
      canChooseRival,
      canBackContender,
      returnLabel: this.compactReturnButtonLabel(),
      rivalActionCopy,
      onRivals: () => this.openRivalDraft(winner.scribbit),
      onBackContender: () => this.goBackEntrants(),
      onReturn: () => this.exit(),
    });
    this.postFightActions.container.setDepth(61);
  }

  // Loss flow — no dead ends. Lifespan remaining + a server-authored rival
  // draft + Back only while tonight's pick is still open.
  private showLossCard(
    mine: Scribbit,
    currentDay: number,
    recap: BattleRecapPlan,
    founderOutcome: string | null,
    founderEpisodeReceipt: FounderRivalEpisodeReceiptPlan | null
  ): void {
    const { width, height } = this.scale;
    const daysLeft = daysLeftFor(mine, currentDay);
    const canBackContender = !getArena(this)?.myBackedScribbitId;
    const rivalRunFinish = planRivalRunFinishStamp(this.report.rivalRun);
    const cardHeight = rivalRunFinish ? 520 : 400;
    const card = stickerCard(
      this,
      width / 2,
      height / 2,
      width - 70,
      cardHeight,
      { tapeColor: UI.tapeAlt }
    );
    card.setDepth(60).setScale(0.7);
    this.tweens.add({
      targets: card,
      scale: 1,
      duration: this.reduceMotion ? 0 : 300,
      ease: 'Back.easeOut',
    });

    const top = -cardHeight / 2;
    if (rivalRunFinish) {
      card.add(
        label(
          this,
          0,
          top + 38,
          rivalRunFinish.title,
          30,
          UI.coralText,
          true
        )
      );
      card.add(
        label(
          this,
          0,
          top + 88,
          `${rivalRunFinish.score} • ${rivalRunFinish.record}`,
          40,
          UI.goldText,
          true
        ).setStroke(UI.ink, 5)
      );
    }
    const recapTop = top + (rivalRunFinish ? 126 : 18);
    const recapHeight = addBattleRecapLines(this, card, recap, {
      top: recapTop,
      width: width - 110,
      compact: true,
      perspective: 'viewer_loss',
    });
    let cursor = recapTop + recapHeight + 18;
    const contextLine = this.report.rivalRun
      ? formatRivalRunResultLine(this.report.rivalRun)
      : founderEpisodeReceipt?.headline ?? founderOutcome;
    const rivalActionCopy = planRivalRunActionCopy(this.report.rivalRun);
    if (contextLine && !rivalRunFinish) {
      card.add(
        label(this, 0, cursor + 16, contextLine, 20, UI.coralText, true)
          .setWordWrapWidth(width - 130)
          .setAlign('center')
      );
      cursor += 44;
    }
    card.add(
      label(
        this,
        0,
        cursor + 16,
        `LIFE LEFT • ${daysLeft}D`,
        17,
        UI.ink,
        true
      ).setWordWrapWidth(width - 120)
    );
    cursor += 48;

    const firstActionY = cursor + 48;
    this.postFightActions?.destroy();
    this.postFightActions = createPostFightActions(this, {
      x: 0,
      y: firstActionY,
      accessibilityX: width / 2,
      accessibilityY: height / 2 + firstActionY,
      width: width - 140,
      canChooseRival: true,
      canBackContender,
      returnLabel: this.compactReturnButtonLabel(),
      rivalActionCopy,
      onRivals: () => this.openRivalDraft(mine),
      onBackContender: () => this.goBackEntrants(),
      onReturn: () => this.exit(),
    });
    card.add(this.postFightActions.container);
  }

  private compactReturnButtonLabel(): string {
    const returnScene = getReplayReturn(this);
    switch (returnScene) {
      case 'Sketchbook':
        return 'LEGACY ›';
      case 'MyBattles':
        return 'SCRAPBOOK ›';
      case 'ScoutNotebook':
        return 'SCOUT ›';
      case 'ArenaHome':
        return 'ARENA ›';
    }
  }

  private returnButtonLabel(): string {
    const returnScene = getReplayReturn(this);
    switch (returnScene) {
      case 'Sketchbook':
        return 'Open Legacy Book ›';
      case 'MyBattles':
        return 'Back to Battle Scrapbook ›';
      case 'ScoutNotebook':
        return 'Back to Scout Notebook ›';
      case 'ArenaHome':
        return 'Back to Arena ›';
    }
  }

  private startPractice(): void {
    if (this.report.kind !== 'practice') beginPracticeSession(this);
    fadeToScene(this, 'Draw', { mode: 'practice' });
  }

  private openRivalDraft(mine: Scribbit): void {
    if (this.rematchLoading || this.rivalDraft) return;
    this.rematchLoading = true;
    this.postFightActions?.setAccessibleVisible(false);
    showToast('Pinning up three fair rivals…');
    void fetchSparRivals(mine.id)
      .then(async (result) => {
        if (!this.scene.isActive()) return;
        this.rematchLoading = false;
        if (!result.ok) {
          showToast(result.error);
          this.postFightActions?.setAccessibleVisible(true);
          return;
        }
        if (
          result.data.challenger.id !== mine.id ||
          result.data.choices.length === 0
        ) {
          showToast('The rival board came back blank. Try again.');
          this.postFightActions?.setAccessibleVisible(true);
          return;
        }
        const arena = getArena(this);
        if (!arena) {
          showToast('The arena state is missing. Return and try again.');
          this.postFightActions?.setAccessibleVisible(true);
          return;
        }
        if (arena.dayNumber !== result.data.dayNumber) {
          this.rematchLoading = true;
          const latestArena = await fetchArena();
          if (!this.scene.isActive()) return;
          this.rematchLoading = false;
          if (!latestArena.ok) {
            showToast('A new Arena day started. Try the board again.');
            this.postFightActions?.setAccessibleVisible(true);
            return;
          }
          setArena(this, latestArena.data);
          showToast('A new Arena day started. Opening today’s board…');
          fadeToScene(this, 'ArenaHome');
          return;
        }
        const refreshedArena = {
          ...arena,
          forecast: result.data.forecast,
          founderChronicle: result.data.founderChronicle,
        };
        const rivalryBeats = findFounderChronicleBeats(
          arena.founderChronicle,
          refreshedArena.founderChronicle
        );
        if (rivalryBeats.length > 0) {
          setFounderChronicleBeats(this, rivalryBeats);
        }
        setArena(this, refreshedArena);
        this.rivalDraft = createSparRivalDraft(this, {
          challenger: result.data.challenger,
          choices: result.data.choices,
          rivalRun: result.data.rivalRun,
          forecast: result.data.forecast,
          founderChronicle: result.data.founderChronicle,
          currentDay: result.data.dayNumber,
          onChoose: (rival, plan) =>
            this.fightRival(
              mine,
              rival,
              plan.challengeLine,
              result.data.rivalRun
            ),
          onClose: () => {
            this.rivalDraft?.destroy();
            this.rivalDraft = null;
            this.postFightActions?.setAccessibleVisible(true);
          },
        });
      })
      .catch(() => {
        if (!this.scene.isActive()) return;
        this.rematchLoading = false;
        this.postFightActions?.setAccessibleVisible(true);
        showToast('The rival board fell down. Try again.');
      });
  }

  private fightRival(
    mine: Scribbit,
    rival: Scribbit,
    challengeLine: string | null,
    rivalRun: RivalRunState
  ): void {
    if (this.rematchLoading) return;
    this.rematchLoading = true;
    showToast(
      challengeLine
        ? `${rival.name}: “${challengeLine}”`
        : `${mine.name} challenges ${rival.name}…`
    );
    void spar(mine.id, rival.id, rivalRun)
      .then((result) => {
        if (!this.scene.isActive()) return;
        if (!result.ok) {
          this.rematchLoading = false;
          this.rivalDraft?.setAccessibleVisible(true);
          showToast(result.error);
          return;
        }
        this.rivalDraft?.destroy();
        this.rivalDraft = null;
        this.postFightActions?.destroy();
        this.postFightActions = null;
        const stagedBattle = stageDirectBattle(
          this,
          getArena(this),
          result.data,
          mine.id
        );
        showVsCeremony(this, {
          fighterA: result.data.report.a,
          fighterB: result.data.report.b,
          battleKind: result.data.report.kind,
          rivalryStakes: stagedBattle.rivalryStakes,
          ...(result.data.report.rivalRun
            ? { rivalRun: result.data.report.rivalRun }
            : {}),
          onComplete: () => this.scene.restart(),
        });
      })
      .catch(() => {
        if (!this.scene.isActive()) return;
        this.rematchLoading = false;
        this.rivalDraft?.setAccessibleVisible(true);
        showToast('The challenge bell did not ring. Try again.');
      });
  }

  private goBackEntrants(): void {
    void this.refreshArenaAndLeave(true);
  }

  private exit(): void {
    if (this.report.kind === 'practice') {
      endPracticeSession(this);
      fadeToScene(this, 'ArenaHome');
      return;
    }
    void this.refreshArenaAndLeave(false);
  }

  private async refreshArenaAndLeave(focusEntrants: boolean): Promise<void> {
    const previousArena = getArena(this);
    const result = await fetchArena();
    if (result.ok) {
      if (previousArena) {
        const rivalryBeats = findFounderChronicleBeats(
          previousArena.founderChronicle,
          result.data.founderChronicle
        );
        if (rivalryBeats.length > 0) {
          setFounderChronicleBeats(this, rivalryBeats);
        }
      }
      setArena(this, result.data);
    }
    if (focusEntrants) setArenaFocus(this, 'entrants');
    fadeToScene(this, focusEntrants ? 'ArenaHome' : getReplayReturn(this));
  }
}
