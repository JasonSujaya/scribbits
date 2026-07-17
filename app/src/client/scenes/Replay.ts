import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  advanceSavedReplayPass,
  beginPracticeSession,
  endPracticeSession,
  getPracticeSession,
  getReplay,
  getReplayEntryMode,
  getReplayFounderChronicleBeat,
  getReplayFounderRivalryStakes,
  getReplaySparReward,
  getReplayPowerUpOffer,
  clearReplayPowerUpOffer,
  getReplayReturn,
  getReplayPass,
  getArena,
  setArena,
  setFounderChronicleBeats,
  setArenaFocus,
} from '../lib/registry';
import { loadDrawing, levelOf } from '../lib/scribbits';
import { ELEMENT_STYLES, prefersReducedMotion, UI } from '../lib/theme';
import {
  daysLeftFor,
  errorPanel,
  ghostButton,
  label,
  paperWordmark,
  startScene,
  type ErrorPanel,
} from '../lib/ui';
import { CanvasActionOverlay } from '../lib/overlay';
import {
  collectDiscoveredPowerUpIds,
  openDetailModal,
} from '../lib/detailmodal';
import { LiveSprite } from '../lib/livesprite';
import { resolveHeldWeaponVisual } from '../lib/heldweaponpresentation';
import {
  barrierHitConnectsShapePowerActivation,
  buildShapePowerDrawCommands,
  getDamageSourceDisplayName,
  getElementBattleCue,
  getShapePowerBattleName,
  getShapePowerNoCleanHitCallout,
  shouldAnnounceNoCleanHitAtAbilityFinish,
} from '../lib/shapepowerpresentation';
import type {
  ShapePowerDrawCommand,
  ShapePowerVisualEffect,
} from '../lib/shapepowerpresentation';
import { fetchArena } from '../lib/api';
import {
  shareBattleClip,
  shareHostedBattleClip,
  startBattleClipRecording,
  type BattleClip,
  type BattleClipRecorder,
} from '../lib/battleclip';
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
  planFighterPresentationMinimumDistance,
  planReplayArenaChallengeResult,
  planReplayBattleLayout,
  planReplayOutcomeLayout,
  projectCombatPosition,
  separateFighterScreenPositions,
} from '../lib/battlepresentation';
import type {
  ArenaPresentationPlan,
  BattleImpactPlan,
  ReplayArenaChallengeResultPlan,
  ReplayBattleLayout,
  ReplayPostFightAction,
} from '../lib/battlepresentation';
import {
  formatBattleRecapAnnouncement,
  planBattleRecap,
} from '../lib/battlerecap';
import type {
  BattleRecapPerspective,
  BattleRecapPlan,
} from '../lib/battlerecap';
import { isScribbitOwnedByViewer } from '../lib/battlejournal';
import { drawReplayBattleBackground } from '../lib/replaybattlebackground';
import type { ReplayBattleBackdrop } from '../lib/replaybattlebackground';
import {
  FIGHT_START_TEXTURE,
  preloadReplayVisualAssets,
  replayVisualAssetsReady,
} from '../lib/visualassets';
import {
  createStickerShine,
  type StickerShineHandle,
} from '../lib/stickerfxshader';
import { createReplayBattleHud } from '../lib/replaybattlehud';
import type { ReplayBattleHud } from '../lib/replaybattlehud';
import { createBattleRecapCard } from '../lib/replaybattlerecap';
import { createPostFightActions } from '../lib/replaypostfightactions';
import type { PostFightActions } from '../lib/replaypostfightactions';
import { planReplayPostFightEligibility } from '../lib/replaypostfighteligibility';
import { planReplayReward } from '../lib/replayreward';
import { openPowerUpDraft, type PowerUpDraftHandle } from '../lib/powerupdraft';
import { createPracticeOutcomeControls } from '../lib/replaypracticeoutcome';
import {
  createArchivedReplayResult,
  type ArchivedReplayResult,
} from '../lib/replayarchivedresult';
import {
  showSavedReplayIntro,
  type SavedReplayIntro,
} from '../lib/savedreplayintro';
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
import {
  setBattleSoundtrackEnabled,
  startBattleSoundtrack,
  stopBattleSoundtrack,
} from '../lib/soundtrack';
import { playSfx } from '../lib/sfx';
import { fitText } from '../lib/fittext';
import { WeaponFxRenderer } from '../lib/weaponfxrenderer';
import { RoleWeaponRenderer } from '../lib/roleweaponrenderer';
import { trackProgressionEvent } from '../lib/progressionanalytics';
import {
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
import { paperIcon } from '../lib/papericons';
import type {
  BattleReport,
  Element,
  FounderChronicleBeat,
  Scribbit,
} from '../../shared/arena';
import type {
  BattleTimelineEvent,
  BattleTranscript,
  CombatRole,
  FixedVector,
  PrimaryPower,
} from '../../shared/combat';
import {
  COMBAT_TICK_RATE,
  DEFAULT_COMBAT_RULES,
} from '../../shared/combat/config';
import { POWER_UP_CATALOG } from '../../shared/combat/powerups';
import { getCombatRoleAdvantage } from '../../shared/combat/roles';
import { resolveGearCombatLoadout } from '../../shared/gearcombat';
import {
  selectCombatRole,
  selectPrimaryPower,
} from '../../shared/combat/selection';
import { isShapePowerId } from '../../shared/combat/shapepowercontent';
import { getBattleMaxHp } from '../../shared/battle';
import { getBattleArenaDefinition } from '../../shared/battlearena';
import { openRivalRun, type RivalRunFlow } from '../lib/rivalrunflow';
import {
  planFirstChestTrailEntry,
  planFirstChestTrailStep,
} from '../lib/firstchesttrail';

type ReplayArenaDestination =
  | Readonly<{ kind: 'return' }>
  | Readonly<{ kind: 'entrants' }>
  | Readonly<{ kind: 'firstChest'; scribbitId: string }>;

type ReplayFighterRuntime = {
  side: 'a' | 'b';
  scribbit: Scribbit;
  sprite: LiveSprite | null;
  screenX: number;
  screenY: number;
  hpMax: number;
  combatRole: CombatRole;
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
    kind:
      | 'ability_telegraphed'
      | 'ability_activated'
      | 'ability_finished'
      | 'ability_interrupted';
  }
>;

type RoleAttackTimelineEvent = Extract<
  BattleTimelineEvent,
  { kind: 'role_attack' }
>;

type DamageAndStatusTimelineEvent = Extract<
  BattleTimelineEvent,
  {
    kind:
      | 'damage'
      | 'healing'
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

type PowerUpTimelineEvent = Extract<
  BattleTimelineEvent,
  { kind: 'power_up_triggered' }
>;

type ProjectileTimelineEvent = Extract<
  BattleTimelineEvent,
  {
    kind:
      | 'projectile_spawned'
      | 'projectile_bounced'
      | 'projectile_hit'
      | 'projectile_expired';
  }
>;

type PaintZoneTimelineEvent = Extract<
  BattleTimelineEvent,
  {
    kind: 'paint_zone_created' | 'paint_zone_pulsed' | 'paint_zone_expired';
  }
>;

type ReplayProjectileVisual = {
  projectile: 'quill' | 'color_bolt';
  graphics: Phaser.GameObjects.Graphics;
  expiresAtTick: number;
  launchAngle: number;
  travelAngle: number;
  lastBounceReason?: 'natural_ricochet' | 'bank_shot' | 'returning_stroke';
};

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
  private weaponFxRenderer: WeaponFxRenderer | null = null;
  private roleWeaponRenderer: RoleWeaponRenderer | null = null;
  private battleBackdropElapsedMilliseconds = 0;
  private battleBackdropUpdateAccumulator = 0;
  private effectRenderAccumulator = 0;
  private combatReadLaneAvailableAt: Record<'a' | 'b', number[]> = {
    a: [0, 0, 0],
    b: [0, 0, 0],
  };
  private fighterA!: ReplayFighterRuntime;
  private fighterB!: ReplayFighterRuntime;
  private finished = false;
  private introBanner: Phaser.GameObjects.Image | null = null;
  private introShine: StickerShineHandle | null = null;
  private reduceMotion = false;

  // Fast-forward: cycles 1x → 2x → 4x → 1x. Scales the scene clock + tweens so
  // the WHOLE spectacle speeds up uniformly, and persists across every beat.
  private static readonly SPEEDS = [1, 2, 4] as const;
  private static readonly EFFECT_FRAME_MILLISECONDS = 1000 / 30;
  private speedIndex = 0;
  private readonly soundboard = new BattleSoundboard();
  private fightersReady = false;
  private skipRequested = false;
  private elementCueShown = new Set<Element>();
  private transcript: BattleTranscript | null = null;
  private playbackRunning = false;
  private rematchLoading = false;
  private arenaRefreshLoading = false;
  private rivalRunFlow: RivalRunFlow | null = null;
  private postFightActions: PostFightActions | null = null;
  private archivedReplayResult: ArchivedReplayResult | null = null;
  private powerUpDraft: PowerUpDraftHandle | null = null;
  private savedReplayIntro: SavedReplayIntro | null = null;
  private savedReplayExitOverlay: CanvasActionOverlay | null = null;
  private battleClipRecorder: BattleClipRecorder | null = null;
  private battleClipPromise: Promise<BattleClip | null> | null = null;
  private sharedBattleClipUrl: string | null = null;
  private battleClipShareBusy = false;
  private playbackTick = 0;
  private previousPlaybackTick = -1;
  private arenaFloorEffects: Phaser.GameObjects.Graphics | null = null;
  private combatEffects: Phaser.GameObjects.Graphics | null = null;
  private readonly projectileVisuals = new Map<
    string,
    ReplayProjectileVisual
  >();
  private readonly projectileImpactVisuals =
    new Set<Phaser.GameObjects.Graphics>();
  private readonly paintZoneVisuals = new Map<
    string,
    Phaser.GameObjects.Graphics
  >();
  private readonly shapeEffects = new Map<'a' | 'b', ShapeEffect>();
  private impactHoldMilliseconds = 0;
  private cameraShakeCooldownMilliseconds = 0;
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
  private assetErrorPanel: ErrorPanel | null = null;
  private stableCaptureLanes = false;

  constructor() {
    super('Replay');
  }

  preload(): void {
    preloadReplayVisualAssets(this);
  }

  init(): void {
    this.finished = false;
    this.battleHud = null;
    this.battleBackdrop = null;
    this.weaponFxRenderer = null;
    this.roleWeaponRenderer = null;
    this.battleBackdropElapsedMilliseconds = 0;
    this.battleBackdropUpdateAccumulator = 0;
    this.effectRenderAccumulator = 0;
    this.introBanner = null;
    this.introShine = null;
    this.reduceMotion = prefersReducedMotion();
    this.speedIndex = 0;
    this.fightersReady = false;
    this.skipRequested = false;
    this.rematchLoading = false;
    this.arenaRefreshLoading = false;
    this.rivalRunFlow = null;
    this.postFightActions = null;
    this.archivedReplayResult = null;
    this.powerUpDraft = null;
    this.savedReplayIntro = null;
    this.savedReplayExitOverlay = null;
    this.battleClipRecorder = null;
    this.battleClipPromise = null;
    this.sharedBattleClipUrl = null;
    this.battleClipShareBusy = false;
    this.elementCueShown.clear();
    this.transcript = null;
    this.playbackRunning = false;
    this.playbackTick = 0;
    this.previousPlaybackTick = -1;
    this.arenaFloorEffects = null;
    this.combatEffects = null;
    this.clearCombatPrimitiveVisuals();
    this.shapeEffects.clear();
    this.impactHoldMilliseconds = 0;
    this.cameraShakeCooldownMilliseconds = 0;
    this.clearInkcastEditorialState();
    this.combatReadLaneAvailableAt = { a: [0, 0, 0], b: [0, 0, 0] };
    this.founderChronicleBeat = null;
    this.founderRivalryStakes = null;
    this.assetErrorPanel = null;
    this.stableCaptureLanes =
      typeof window !== 'undefined' &&
      window.location.search.includes('debug') &&
      new URLSearchParams(window.location.search).has('stableReplayLanes');
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
    this.game.canvas.dataset.replayPass = String(getReplayPass(this));
  }

  private cycleSpeed(): void {
    this.speedIndex = (this.speedIndex + 1) % Replay.SPEEDS.length;
    this.battleHud?.setPlaybackSpeed(this.speed);
    this.applySpeed();
  }

  create(): void {
    const report = getReplay(this);
    if (!report) {
      startScene(this, 'ArenaHome');
      return;
    }
    this.cameras.main.setBackgroundColor(UI.desk);
    if (!replayVisualAssetsReady(this)) {
      this.retryReplayVisualAssets(report);
      return;
    }
    this.createLoadedReplay(report);
  }

  private createLoadedReplay(report: BattleReport): void {
    this.report = report;
    if (this.isFoundingReplay()) {
      trackProgressionEvent('founding_replay_started', {
        scribbitId: report.a.id,
        source: 'birth',
      });
    }
    this.founderChronicleBeat = getReplayFounderChronicleBeat(this);
    this.founderRivalryStakes = getReplayFounderRivalryStakes(this);
    this.transcript = getUsableBattleTranscript(report) ?? null;
    startBattleSoundtrack(this.soundboard.isEnabled());
    this.weaponFxRenderer = new WeaponFxRenderer(this, this.reduceMotion);
    this.roleWeaponRenderer = new RoleWeaponRenderer(this, this.reduceMotion);
    this.game.canvas.dataset.activeProjectileTypes = 'none';
    this.game.canvas.dataset.observedProjectileTypes = 'none';
    this.buildArena();
    this.buildSavedReplayExit();
    this.recordDebugPlaybackState('live');

    this.events.once('shutdown', () => {
      stopBattleSoundtrack();
      this.rivalRunFlow?.destroy();
      this.rivalRunFlow = null;
      this.postFightActions?.destroy();
      this.postFightActions = null;
      this.archivedReplayResult?.destroy();
      this.archivedReplayResult = null;
      this.powerUpDraft?.destroy();
      this.powerUpDraft = null;
      this.savedReplayIntro?.destroy();
      this.savedReplayIntro = null;
      this.savedReplayExitOverlay?.destroy();
      this.savedReplayExitOverlay = null;
      this.battleClipRecorder?.cancel();
      this.battleClipRecorder = null;
      this.battleHud?.stopHeartAnimations();
      this.clearIntroBanner();
      this.weaponFxRenderer?.destroy();
      this.weaponFxRenderer = null;
      this.roleWeaponRenderer?.destroy();
      this.roleWeaponRenderer = null;
      this.clearCombatPrimitiveVisuals();
      this.playbackRunning = false;
      this.shapeEffects.clear();
      this.hidePowerGhosts();
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this.impactHoldMilliseconds = 0;
      this.battleBackdrop = null;
      this.assetErrorPanel?.destroy();
      this.assetErrorPanel = null;
    });

    void Promise.all([
      loadDrawing(this, report.a, { waitForRemote: true }),
      loadDrawing(this, report.b, { waitForRemote: true }),
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
      this.battleClipRecorder = getArena(this)?.loggedIn
        ? startBattleClipRecording(this.game.canvas)
        : null;
      this.game.canvas.dataset.battleClip = this.battleClipRecorder
        ? 'recording'
        : 'unavailable';
      this.playIntro();
    });
  }

  private retryReplayVisualAssets(report: BattleReport): void {
    this.assetErrorPanel?.destroy();
    this.assetErrorPanel = null;
    const { width, height } = this.scale;
    const loadingText = label(
      this,
      width / 2,
      height / 2,
      'OPENING BATTLE...',
      30,
      UI.cream,
      true
    );
    const onLoadComplete = (): void => {
      loadingText.destroy();
      if (!this.scene.isActive()) return;
      if (replayVisualAssetsReady(this)) {
        this.createLoadedReplay(report);
        return;
      }
      this.assetErrorPanel = errorPanel(
        this,
        width / 2,
        height / 2,
        'The Battle artwork did not load.',
        () => this.retryReplayVisualAssets(report)
      );
    };
    this.load.once('complete', onLoadComplete);
    preloadReplayVisualAssets(this);
    this.load.start();
    this.events.once('shutdown', () => {
      this.load.off('complete', onLoadComplete);
      loadingText.destroy();
      this.assetErrorPanel?.destroy();
      this.assetErrorPanel = null;
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
      ...(this.report.battleArenaId
        ? { battleArenaId: this.report.battleArenaId }
        : {}),
      reduceMotion: this.reduceMotion,
    });
    this.arenaFloorEffects = this.add.graphics().setDepth(2);
    this.combatEffects = this.add.graphics().setDepth(7);

    const initialFrame = this.transcript
      ? calculateReplayFrame(this.transcript, 0)
      : null;
    this.fighterA = this.createFighterRuntime('a', initialFrame?.fighters[0]);
    this.fighterB = this.createFighterRuntime('b', initialFrame?.fighters[1]);

    const battleArena = getBattleArenaDefinition(this.report.battleArenaId);
    this.battleHud = createReplayBattleHud(this, {
      layout: this.battleLayout,
      fighterA: this.report.a,
      fighterB: this.report.b,
      fighterAPrimaryPower: this.fighterA.primaryPower,
      fighterBPrimaryPower: this.fighterB.primaryPower,
      ...(this.transcript && this.transcript.version >= 4
        ? {
            fighterARole: this.fighterA.combatRole,
            fighterBRole: this.fighterB.combatRole,
          }
        : {}),
      arenaName: battleArena.name,
      arenaRule: battleArena.shortRule,
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
        setBattleSoundtrackEnabled(enabled);
        this.battleHud?.setSoundEnabled(enabled);
      },
    });

    if (this.transcript) {
      // The first intentional tap may unlock WebAudio in embedded browsers,
      // but it never changes the predetermined battle.
      this.input.once('pointerdown', () => this.soundboard.unlock());
    }
  }

  private buildSavedReplayExit(): void {
    if (!this.isSavedReplay()) return;

    ghostButton(this, 58, 58, '‹', () => this.exit(), 88).setDepth(3_000);
    this.savedReplayExitOverlay = new CanvasActionOverlay(this);
    this.savedReplayExitOverlay.add({
      label: this.returnButtonLabel(),
      rect: { x: 14, y: 14, width: 88, height: 88 },
      onActivate: () => this.exit(),
    });
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
      combatRole:
        transcriptFighter?.combatRole ?? selectCombatRole(scribbit.stats),
      primaryPower:
        transcriptFighter?.primaryPower ?? selectPrimaryPower(scribbit.stats),
      facing: fighterLayout.facing,
      powerGhosts: [],
    };
  }

  private placeFighter(side: 'a' | 'b', textureKey: string): void {
    const fighter = side === 'a' ? this.fighterA : this.fighterB;
    const entranceX = fighter.screenX + (fighter.facing === 1 ? -48 : 48);
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
        ...(this.transcript && this.transcript.version >= 4
          ? {
              combatRole: fighter.combatRole,
              heldWeapon: resolveHeldWeaponVisual(fighter.scribbit),
            }
          : {}),
      }
    );
    fighter.sprite = live;
    this.weaponFxRenderer?.attach(
      side,
      fighter.scribbit,
      fighter.screenX,
      fighter.screenY,
      fighter.facing,
      this.battleLayout.fighterDisplaySize
    );
    if (this.transcript && this.transcript.version >= 4) {
      this.roleWeaponRenderer?.attach(
        side,
        fighter.combatRole,
        fighter.screenX,
        fighter.screenY,
        fighter.facing,
        this.battleLayout.fighterDisplaySize
      );
    }
    fighter.powerGhosts = this.createPowerGhosts(fighter, textureKey);
    // Keep the entire drawing visible during its entrance. The old off-stage
    // walk-in made wide player art look clipped before combat even began.
    live.walkIn(entranceX, fighter.screenX, 260);
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
    const returnScene = getReplayReturn(this);
    openDetailModal(this, scribbit, {
      currentDay: arena?.dayNumber ?? scribbit.expiresDay,
      discoveredPowerUpIds:
        arena?.discoveredPowerUpIds ??
        collectDiscoveredPowerUpIds(arena?.myScribbits ?? []),
      ...(arena?.rumbleResolvesAt === undefined
        ? {}
        : { nextArenaDayStartsAt: arena.rumbleResolvesAt }),
      mine,
      actions: {},
      onRemoved: () => startScene(this, returnScene),
      onReported: () => startScene(this, returnScene),
    });
  }

  private playIntro(): void {
    if (this.isSavedReplay()) {
      this.savedReplayIntro?.destroy();
      this.savedReplayIntro = showSavedReplayIntro(this, {
        fighterA: this.report.a,
        fighterB: this.report.b,
        battleKind: this.report.kind,
        replayPass: getReplayPass(this),
        onComplete: () => {
          this.savedReplayIntro = null;
          if (!this.finished && this.scene.isActive()) this.playFightBanner();
        },
      });
      return;
    }
    this.playFightBanner();
  }

  private playFightBanner(): void {
    const { width } = this.scale;
    const founderOpening = authorFounderBattleOpening(
      this.replayCommentaryContext()
    );
    if (founderOpening) this.displayInkcastText(founderOpening);
    const banner = this.add.image(0, 0, FIGHT_START_TEXTURE);
    const finalScale = Math.min(460, width * 0.66) / banner.width;
    const fighterTop =
      Math.min(
        this.battleLayout.fighters.a.homeY,
        this.battleLayout.fighters.b.homeY
      ) -
      this.battleLayout.fighterDisplaySize / 2;
    const bannerY = fighterTop - (banner.height * finalScale) / 2 - 10;
    banner
      .setPosition(width / 2, bannerY)
      .setScale(0)
      .setDepth(60);
    const shine = createStickerShine({
      scene: this,
      x: width / 2,
      y: bannerY,
      width: banner.width,
      height: banner.height,
      depth: 61,
      reduceMotion: this.reduceMotion,
      tint: [1, 0.66, 0.18],
      intensity: 0.92,
    });
    shine?.displayObject.setScale(0);
    this.introBanner = banner;
    this.introShine = shine;
    this.game.canvas.dataset.fightIntroShine = shine
      ? 'shader'
      : this.reduceMotion
        ? 'reduced'
        : 'fallback';
    this.game.canvas.dataset.fightIntroShake = this.reduceMotion
      ? 'off'
      : 'punch';
    // The VS card already established the matchup. This is one quick bell beat,
    // not a second intro players must wait through.
    this.time.delayedCall(120, () => {
      if (this.finished || !this.scene.isActive()) return;
      this.soundboard.play('fight');
      if (this.reduceMotion) {
        banner.setScale(finalScale);
        this.time.delayedCall(380, () => {
          if (this.finished || !this.scene.isActive()) return;
          this.clearIntroBanner();
          this.startContinuousReplay();
        });
        return;
      }
      const introTargets = shine ? [banner, shine.displayObject] : [banner];
      if (shine) {
        shine.play(420);
      }
      this.tweens.add({
        targets: introTargets,
        scale: finalScale,
        duration: 150,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 170,
        onComplete: () => {
          this.clearIntroBanner();
          if (!this.finished && this.scene.isActive()) {
            this.startContinuousReplay();
          }
        },
      });
      this.tweens.add({
        targets: introTargets,
        angle: { from: -2.4, to: 2.4 },
        duration: 46,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 2,
      });
      this.cameras.main.shake(140, 0.006);
    });
  }

  private clearIntroBanner(): void {
    if (this.introBanner) this.tweens.killTweensOf(this.introBanner);
    if (this.introShine) {
      this.tweens.killTweensOf(this.introShine.displayObject);
      this.introShine.destroy();
    }
    this.introShine = null;
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
    this.presentGearReads();
  }

  private presentGearReads(): void {
    ([this.fighterA, this.fighterB] as const).forEach((fighter, index) => {
      const techniques = resolveGearCombatLoadout(fighter.scribbit).techniques;
      if (techniques.length === 0) return;
      const techniqueNames = techniques.map(
        (technique) => technique.effect.name
      );
      const title = `GEAR • ${techniqueNames.slice(0, 2).join(' + ')}${techniqueNames.length > 2 ? ` +${techniqueNames.length - 2}` : ''}`;
      const detail = `${fighter.scribbit.name.toUpperCase()} • ${techniques[0]!.effect.summary}`;
      this.time.delayedCall(100 + index * 720, () => {
        if (this.finished || !this.scene.isActive()) return;
        this.showFighterCombatRead(fighter, title, detail, UI.coralText);
        this.game.canvas.dataset.lastGearRead = `${fighter.side}|${techniques.map((technique) => technique.leadGearId).join(',')}`;
      });
    });
  }

  override update(_time: number, deltaMilliseconds: number): void {
    const safeDeltaMilliseconds = Math.max(0, deltaMilliseconds);
    const impactPaused =
      this.playbackRunning && this.impactHoldMilliseconds > 0;
    const presentationDeltaMilliseconds = impactPaused
      ? 0
      : safeDeltaMilliseconds;
    const presentationSpeed = this.playbackRunning
      ? impactPaused
        ? 0
        : this.speed
      : 1;
    if (this.playbackRunning) {
      this.time.timeScale = impactPaused ? 0 : 1;
      this.tweens.timeScale = presentationSpeed;
    }
    this.weaponFxRenderer?.update(
      presentationDeltaMilliseconds,
      presentationSpeed
    );
    this.cameraShakeCooldownMilliseconds = Math.max(
      0,
      this.cameraShakeCooldownMilliseconds - safeDeltaMilliseconds
    );
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
        this.battleBackdropUpdateAccumulator >= Replay.EFFECT_FRAME_MILLISECONDS
      ) {
        this.battleBackdropUpdateAccumulator %=
          Replay.EFFECT_FRAME_MILLISECONDS;
        this.battleBackdrop?.update(this.battleBackdropElapsedMilliseconds);
      }
    }
    this.advanceInkcastEditorialQueue(presentationDeltaMilliseconds);
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
        this.impactHoldMilliseconds - safeDeltaMilliseconds
      );
      if (this.impactHoldMilliseconds === 0) {
        this.time.timeScale = 1;
        this.tweens.timeScale = this.speed;
      }
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
    const startingCheckpoint = this.transcript?.checkpoints[0];
    return planArenaPresentation({
      viewportWidth: this.battleLayout.viewportWidth,
      arenaTop: this.battleLayout.arenaTop,
      arenaBottom: this.battleLayout.arenaBottom,
      horizontalPadding: this.battleLayout.arenaHorizontalPadding,
      verticalPadding: this.battleLayout.arenaVerticalPadding,
      currentCombatHalfWidth: frame.arenaHalfWidth,
      currentCombatHalfHeight: frame.arenaHalfHeight,
      startingCombatHalfWidth:
        startingCheckpoint?.arenaHalfWidth ??
        DEFAULT_COMBAT_RULES.arena.startingHalfWidth,
      startingCombatHalfHeight:
        startingCheckpoint?.arenaHalfHeight ??
        DEFAULT_COMBAT_RULES.arena.startingHalfHeight,
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

    const projectedPositions = fighterFrames.map((fighterFrame) =>
      projectCombatPosition(fighterFrame.position, arena)
    );
    const combatDistance = Math.hypot(
      fighterFrames[1]!.position.x - fighterFrames[0]!.position.x,
      fighterFrames[1]!.position.y - fighterFrames[0]!.position.y
    );
    const minimumPresentationDistance = planFighterPresentationMinimumDistance({
      fighterDisplaySize: this.battleLayout.fighterDisplaySize,
      combatDistance,
      fighterRoles: [this.fighterA.combatRole, this.fighterB.combatRole],
    });
    const separatedPositions = separateFighterScreenPositions({
      a: projectedPositions[0] ?? {
        x: this.fighterA.screenX,
        y: this.fighterA.screenY,
      },
      b: projectedPositions[1] ?? {
        x: this.fighterB.screenX,
        y: this.fighterB.screenY,
      },
      minimumDistance: minimumPresentationDistance,
      minimumX: this.battleLayout.pageLeft + 24,
      maximumX: this.battleLayout.pageLeft + this.battleLayout.pageWidth - 24,
    });
    const arenaCenterX =
      this.battleLayout.pageLeft + this.battleLayout.pageWidth / 2;
    const stableLaneOffset = this.battleLayout.fighterDisplaySize * 0.41;
    const readablePositions = this.stableCaptureLanes
      ? [
          {
            ...separatedPositions.a,
            x: Math.min(
              separatedPositions.a.x,
              arenaCenterX - stableLaneOffset
            ),
          },
          {
            ...separatedPositions.b,
            x: Math.max(
              separatedPositions.b.x,
              arenaCenterX + stableLaneOffset
            ),
          },
        ]
      : [separatedPositions.a, separatedPositions.b];
    this.game.canvas.dataset.stableReplayLanes = String(
      this.stableCaptureLanes
    );
    this.game.canvas.dataset.minimumFighterSeparation =
      separatedPositions.distance.toFixed(1);
    this.game.canvas.dataset.minimumPlannedFighterSeparation =
      minimumPresentationDistance.toFixed(1);

    fighterFrames.forEach((fighterFrame, index) => {
      const fighter = fighters[index];
      if (!fighter) return;
      const screenPosition = readablePositions[index]!;
      fighter.screenX = screenPosition.x;
      fighter.screenY = screenPosition.y;
      fighter.sprite?.setPosition(screenPosition.x, screenPosition.y);
      this.battleHud?.setFighterScreenPosition(
        fighter.side,
        screenPosition.x,
        screenPosition.y
      );
      this.weaponFxRenderer?.follow(
        fighter.side,
        screenPosition.x,
        screenPosition.y
      );
      this.roleWeaponRenderer?.follow(
        fighter.side,
        screenPosition.x,
        screenPosition.y
      );
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

  private projectTimelinePosition(position: FixedVector): {
    x: number;
    y: number;
  } {
    const startingCheckpoint = this.transcript?.checkpoints[0];
    if (!startingCheckpoint) {
      return { x: this.scale.width / 2, y: this.scale.height / 2 };
    }
    return projectCombatPosition(
      position,
      planArenaPresentation({
        viewportWidth: this.battleLayout.viewportWidth,
        arenaTop: this.battleLayout.arenaTop,
        arenaBottom: this.battleLayout.arenaBottom,
        horizontalPadding: this.battleLayout.arenaHorizontalPadding,
        verticalPadding: this.battleLayout.arenaVerticalPadding,
        currentCombatHalfWidth: startingCheckpoint.arenaHalfWidth,
        currentCombatHalfHeight: startingCheckpoint.arenaHalfHeight,
        startingCombatHalfWidth: startingCheckpoint.arenaHalfWidth,
        startingCombatHalfHeight: startingCheckpoint.arenaHalfHeight,
      })
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
      case 'ability_interrupted':
        this.presentAbilityLifecycleEvent(event);
        return;
      case 'role_attack':
        this.presentRoleAttackEvent(event);
        return;
      case 'projectile_spawned':
      case 'projectile_bounced':
      case 'projectile_hit':
      case 'projectile_expired':
        this.presentProjectileEvent(event);
        return;
      case 'paint_zone_created':
      case 'paint_zone_pulsed':
      case 'paint_zone_expired':
        this.presentPaintZoneEvent(event);
        return;
      case 'damage':
      case 'healing':
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
      case 'power_up_triggered':
        this.presentPowerUpEvent(event);
        return;
      default:
        this.assertNeverTimelineEvent(event);
    }
  }

  private presentPowerUpEvent(event: PowerUpTimelineEvent): void {
    const fighter = this.fighterForSlot(event.actor);
    const target = event.target ? this.fighterForSlot(event.target) : fighter;
    const outcome = event.bonusDamage
      ? `${fighter.scribbit.name.toUpperCase()} → ${target.scribbit.name.toUpperCase()} • +${event.bonusDamage} DMG`
      : `${fighter.scribbit.name.toUpperCase()} • ACTIVE`;
    this.showFighterCombatRead(
      fighter,
      POWER_UP_CATALOG[event.powerUpId].name.toUpperCase(),
      outcome,
      UI.goldText
    );
    this.game.canvas.dataset.lastPowerUpRead = `${event.powerUpId}|${event.actor}|${event.target ?? event.actor}|${event.bonusDamage ?? 0}`;
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
        this.telegraphShapePower(actor);
        this.weaponFxRenderer?.trigger(event.actor, 'telegraph');
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
        this.weaponFxRenderer?.trigger(event.actor, 'active');
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
      case 'ability_interrupted': {
        this.shapeEffects.delete(event.actor);
        this.battleHud?.setFighterShapePowerState(event.actor, 'ready');
        this.weaponFxRenderer?.trigger(event.interruptedBy, 'impact');
        this.soundboard.play('hit');
        return;
      }
      default:
        this.assertNeverTimelineEvent(event);
    }
  }

  private presentRoleAttackEvent(event: RoleAttackTimelineEvent): void {
    this.fighterForSlot(event.actor).sprite?.triggerRoleWeaponAttack(
      event.attack
    );
    this.weaponFxRenderer?.trigger(
      event.actor,
      event.hit ? 'impact' : 'active'
    );
    const usesAuthoritativeProjectile =
      (this.transcript?.version ?? 0) >= 8 &&
      (event.attack === 'piercing_quill' || event.attack === 'color_bolt');
    if (usesAuthoritativeProjectile) return;
    const target = this.projectTimelinePosition(event.target);
    this.roleWeaponRenderer?.trigger(
      event.actor,
      event.attack,
      target.x,
      target.y,
      event.hit
    );
  }

  private projectTimelinePositionAtTick(
    position: FixedVector,
    tick: number
  ): { x: number; y: number } {
    if (!this.transcript) return this.projectTimelinePosition(position);
    const frame = calculateReplayFrame(this.transcript, tick);
    return this.projectReplayVector(position, frame);
  }

  private tweenProjectile(
    visual: ReplayProjectileVisual,
    position: FixedVector,
    velocity: FixedVector,
    eventTick: number
  ): void {
    if (!this.transcript) return;
    this.tweens.killTweensOf(visual.graphics);
    const remainingTicks = Math.max(1, visual.expiresAtTick - eventTick);
    const destination = this.projectTimelinePositionAtTick(
      {
        x: position.x + velocity.x * remainingTicks,
        y: position.y + velocity.y * remainingTicks,
      },
      visual.expiresAtTick
    );
    this.tweens.add({
      targets: visual.graphics,
      x: destination.x,
      y: destination.y,
      duration: (remainingTicks / this.transcript.tickRate) * 1_000,
      ease: 'Linear',
    });
  }

  private presentProjectileEvent(event: ProjectileTimelineEvent): void {
    if (event.kind === 'projectile_spawned') {
      const fighterPosition = this.projectTimelinePositionAtTick(
        event.position,
        event.tick
      );
      const launchAngle = Math.atan2(event.velocity.y, event.velocity.x);
      const launchDistance =
        this.battleLayout.fighterDisplaySize *
        (event.projectile === 'quill' ? 0.34 : 0.28);
      const position = {
        x: fighterPosition.x + Math.cos(launchAngle) * launchDistance,
        y: fighterPosition.y + Math.sin(launchAngle) * launchDistance,
      };
      const graphics = this.add
        .graphics()
        .setPosition(position.x, position.y)
        .setDepth(13);
      if (event.projectile === 'quill') {
        graphics
          .lineStyle(10, 0x66a9d8, 0.2)
          .lineBetween(-46, 0, -21, 0)
          .lineStyle(6, 0x2d211a, 1)
          .lineBetween(-23, 0, 14, 0)
          .lineStyle(3, 0x9a6238, 1)
          .lineBetween(-22, 0, 14, 0)
          .fillStyle(0x66a9d8, 1)
          .fillTriangle(-24, 0, -15, -8, -13, -1)
          .fillTriangle(-24, 0, -15, 8, -13, 1)
          .lineStyle(2, 0x2d211a, 1)
          .strokeTriangle(-24, 0, -15, -8, -13, -1)
          .strokeTriangle(-24, 0, -15, 8, -13, 1)
          .fillStyle(0xffe6aa, 1)
          .fillTriangle(13, -7, 25, 0, 13, 7)
          .strokeTriangle(13, -7, 25, 0, 13, 7)
          .setRotation(launchAngle)
          .setScale(1.14);
      } else {
        graphics
          .lineStyle(7, 0xd997ff, 0.16)
          .lineBetween(-38, 0, -19, 0)
          .fillStyle(0xc76cff, 0.34)
          .fillCircle(0, 0, 22)
          .fillStyle(0xfff5d6, 0.96)
          .fillCircle(0, 0, 10)
          .lineStyle(4, 0x8c3ee8, 0.92)
          .strokeCircle(0, 0, 17)
          .setRotation(launchAngle)
          .setScale(1.12);
      }
      const visual: ReplayProjectileVisual = {
        projectile: event.projectile,
        graphics,
        expiresAtTick: event.expiresAtTick,
        launchAngle,
        travelAngle: launchAngle,
      };
      this.projectileVisuals.set(event.projectileId, visual);
      this.tweenProjectile(visual, event.position, event.velocity, event.tick);
      this.updateProjectileDebugState();
      const observedProjectileTypes = new Set(
        this.game.canvas.dataset.observedProjectileTypes === 'none'
          ? []
          : this.game.canvas.dataset.observedProjectileTypes?.split(',')
      );
      observedProjectileTypes.add(event.projectile);
      this.game.canvas.dataset.observedProjectileTypes = [
        ...observedProjectileTypes,
      ]
        .sort()
        .join(',');
      return;
    }

    const visual = this.projectileVisuals.get(event.projectileId);
    if (!visual) return;
    const position = this.projectTimelinePositionAtTick(
      event.position,
      event.tick
    );
    visual.graphics.setPosition(position.x, position.y);
    if (event.kind === 'projectile_bounced') {
      visual.travelAngle = Math.atan2(event.velocity.y, event.velocity.x);
      if (event.reason !== undefined) {
        visual.lastBounceReason = event.reason;
      }
      if (visual.projectile === 'quill') {
        visual.graphics.setRotation(visual.travelAngle);
      }
      this.presentProjectileRicochet(position.x, position.y, event.reason);
      this.tweenProjectile(visual, event.position, event.velocity, event.tick);
      return;
    }
    this.tweens.killTweensOf(visual.graphics);
    this.projectileVisuals.delete(event.projectileId);
    this.updateProjectileDebugState();
    if (event.kind === 'projectile_hit') {
      this.lingerProjectileImpact(visual);
      return;
    }
    if (visual.lastBounceReason === 'natural_ricochet') {
      this.lingerSpentRicochet(visual);
      return;
    }
    visual.graphics.destroy();
  }

  private lingerSpentRicochet(visual: ReplayProjectileVisual): void {
    const graphics = visual.graphics;
    this.projectileImpactVisuals.add(graphics);
    this.tweens.add({
      targets: graphics,
      x: graphics.x + Math.cos(visual.travelAngle) * 64,
      y: graphics.y + Math.sin(visual.travelAngle) * 64,
      alpha: 0,
      duration: this.reduceMotion ? 100 : 280,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.projectileImpactVisuals.delete(graphics);
        graphics.destroy();
      },
    });
  }

  private presentProjectileRicochet(
    x: number,
    y: number,
    reason: Extract<
      ProjectileTimelineEvent,
      { kind: 'projectile_bounced' }
    >['reason']
  ): void {
    const graphics = this.add.graphics().setPosition(x, y).setDepth(14);
    this.projectileImpactVisuals.add(graphics);
    graphics
      .lineStyle(5, 0xfff5d6, 0.95)
      .strokeCircle(0, 0, 20)
      .lineStyle(4, reason === 'returning_stroke' ? 0xd997ff : 0x66a9d8, 0.9);
    for (const angle of [-1.05, -0.35, 0.35, 1.05]) {
      graphics.lineBetween(
        Math.cos(angle) * 18,
        Math.sin(angle) * 18,
        Math.cos(angle) * 40,
        Math.sin(angle) * 40
      );
    }
    this.game.canvas.dataset.lastProjectileBounce = reason ?? 'legacy';
    this.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: this.reduceMotion ? 100 : 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.projectileImpactVisuals.delete(graphics);
        graphics.destroy();
      },
    });
  }

  private lingerProjectileImpact(visual: ReplayProjectileVisual): void {
    const graphics = visual.graphics;
    this.projectileImpactVisuals.add(graphics);
    graphics.setRotation(visual.launchAngle).setAlpha(1);
    if (visual.projectile === 'quill') {
      graphics
        .lineStyle(4, 0xfff5d6, 0.9)
        .strokeCircle(24, 0, 13)
        .lineStyle(3, 0x66a9d8, 0.8)
        .strokeCircle(24, 0, 20);
    } else {
      graphics
        .fillStyle(0xd997ff, 0.2)
        .fillCircle(0, 0, 34)
        .lineStyle(5, 0xfff5d6, 0.82)
        .strokeCircle(0, 0, 28);
    }
    this.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: visual.projectile === 'quill' ? 1.2 : 1.55,
      scaleY: visual.projectile === 'quill' ? 1.2 : 1.55,
      duration: this.reduceMotion ? 100 : 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.projectileImpactVisuals.delete(graphics);
        graphics.destroy();
      },
    });
  }

  private updateProjectileDebugState(): void {
    this.game.canvas.dataset.activeProjectiles = String(
      this.projectileVisuals.size
    );
    this.game.canvas.dataset.activeProjectileTypes =
      [...this.projectileVisuals.values()]
        .map((projectileVisual) => projectileVisual.projectile)
        .sort()
        .join(',') || 'none';
  }

  private presentPaintZoneEvent(event: PaintZoneTimelineEvent): void {
    if (event.kind === 'paint_zone_created') {
      const frame = this.transcript
        ? calculateReplayFrame(this.transcript, event.tick)
        : null;
      const center = frame
        ? this.projectReplayVector(event.position, frame)
        : this.projectTimelinePosition(event.position);
      const edgeX = frame
        ? this.projectReplayVector(
            { x: event.position.x + event.radius, y: event.position.y },
            frame
          )
        : this.projectTimelinePosition({
            x: event.position.x + event.radius,
            y: event.position.y,
          });
      const edgeY = frame
        ? this.projectReplayVector(
            { x: event.position.x, y: event.position.y + event.radius },
            frame
          )
        : this.projectTimelinePosition({
            x: event.position.x,
            y: event.position.y + event.radius,
          });
      const radiusX = Math.max(10, Math.abs(edgeX.x - center.x));
      const radiusY = Math.max(6, Math.abs(edgeY.y - center.y));
      const graphics = this.add
        .graphics()
        .setPosition(center.x, center.y)
        .setDepth(3);
      graphics
        .fillStyle(0x9d55e8, 0.2)
        .fillEllipse(0, 0, radiusX * 2, radiusY * 2)
        .lineStyle(4, 0xd997ff, 0.6)
        .strokeEllipse(0, 0, radiusX * 2, radiusY * 2);
      this.paintZoneVisuals.set(event.zoneId, graphics);
      this.game.canvas.dataset.activePaintZones = String(
        this.paintZoneVisuals.size
      );
      return;
    }
    const graphics = this.paintZoneVisuals.get(event.zoneId);
    if (!graphics) return;
    if (event.kind === 'paint_zone_pulsed') {
      this.tweens.killTweensOf(graphics);
      graphics.setAlpha(1).setScale(1);
      this.tweens.add({
        targets: graphics,
        alpha: 0.68,
        scaleX: 1.035,
        scaleY: 1.035,
        duration: this.reduceMotion ? 90 : 180,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
      return;
    }
    this.tweens.killTweensOf(graphics);
    graphics.destroy();
    this.paintZoneVisuals.delete(event.zoneId);
    this.game.canvas.dataset.activePaintZones = String(
      this.paintZoneVisuals.size
    );
  }

  private clearCombatPrimitiveVisuals(): void {
    for (const visual of this.projectileVisuals.values()) {
      this.tweens.killTweensOf(visual.graphics);
      visual.graphics.destroy();
    }
    for (const graphics of this.projectileImpactVisuals) {
      this.tweens.killTweensOf(graphics);
      graphics.destroy();
    }
    for (const graphics of this.paintZoneVisuals.values()) {
      this.tweens.killTweensOf(graphics);
      graphics.destroy();
    }
    this.projectileVisuals.clear();
    this.projectileImpactVisuals.clear();
    this.paintZoneVisuals.clear();
    if (this.game?.canvas) {
      this.game.canvas.dataset.activeProjectiles = '0';
      this.game.canvas.dataset.activeProjectileTypes = 'none';
      this.game.canvas.dataset.activePaintZones = '0';
    }
  }

  private presentDamageAndStatusEvent(
    event: DamageAndStatusTimelineEvent
  ): void {
    switch (event.kind) {
      case 'healing': {
        const fighter = this.fighterForSlot(event.actor);
        this.setContinuousHitPoints(fighter, event.targetHitPoints);
        this.showFighterCombatRead(
          fighter,
          POWER_UP_CATALOG[event.powerUpId].name.toUpperCase(),
          `${fighter.scribbit.name.toUpperCase()} • +${event.amount} HP`,
          UI.goldText
        );
        return;
      }
      case 'damage': {
        const attacker = this.fighterForSlot(event.sourceFighter);
        const target = this.fighterForSlot(event.targetFighter);
        if (isShapePowerId(event.source)) {
          this.markShapePowerConnected(event.sourceFighter, event.source);
        }
        const impactPosition = this.projectTimelinePosition(event.position);
        this.weaponFxRenderer?.trigger(
          event.sourceFighter,
          'impact',
          event.critical
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
          Math.sign(target.screenX - attacker.screenX) || target.facing,
          this.speed
        );
        this.presentPlannedImpact(
          impactPosition.x,
          impactPosition.y,
          ELEMENT_STYLES[target.scribbit.element].particle,
          impactPlan
        );
        this.damagePopAt(
          target.screenX,
          target.screenY,
          impactPlan.damageText,
          event.critical,
          impactPlan.damageTextScale,
          impactPlan.damageTextDurationMilliseconds
        );
        if (
          event.source === 'power_up' &&
          getCombatRoleAdvantage(attacker.combatRole, target.combatRole) ===
            'advantage'
        ) {
          this.showFighterCombatRead(
            attacker,
            'ADVANTAGE +10%',
            `${attacker.scribbit.name.toUpperCase()} → ${target.scribbit.name.toUpperCase()}`,
            UI.goldText
          );
          this.game.canvas.dataset.lastAdvantageCue = `${event.sourceFighter}|${event.targetFighter}|${event.amount}`;
        }
        this.game.canvas.dataset.lastDamageText = impactPlan.damageText;
        this.game.canvas.dataset.lastDamageTarget = event.targetFighter;
        this.setContinuousHitPoints(target, event.targetHitPoints);
        this.battleHud?.playFighterDamage(
          event.targetFighter,
          impactPlan.tier,
          this.speed
        );
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
        const deservesCommentary =
          impactPlan.tier === 'heavy' ||
          impactPlan.tier === 'critical' ||
          isShapePowerId(event.source) ||
          event.source === 'colorburst_echo' ||
          event.source === 'power_up';
        if (deservesCommentary) {
          this.announceReplayCommentary({
            kind: 'damage',
            tick: event.tick,
            sourceFighter: event.sourceFighter,
            targetFighter: event.targetFighter,
            sourceName: isShapePowerId(event.source)
              ? getShapePowerBattleName(event.source)
              : event.source === 'colorburst_echo'
                ? `${getShapePowerBattleName('colorburst')} echo`
                : getDamageSourceDisplayName(event.source),
            sourcePower: isShapePowerId(event.source)
              ? event.source
              : event.source === 'colorburst_echo'
                ? 'colorburst'
                : null,
            amount: event.amount,
            critical: event.critical,
          });
        }
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
        const recoilPosition = this.projectTimelinePosition(event.position);
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
        const bouncePosition = this.projectTimelinePosition(event.position);
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
        const collisionPosition = this.projectTimelinePosition(event.position);
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
        const echoPosition = this.projectTimelinePosition(event.position);
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
        const echoPosition = this.projectTimelinePosition(event.position);
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
        const echoPosition = this.projectTimelinePosition(event.position);
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
    const shrinkRatio = Math.min(
      arena.currentHalfWidth / arena.maximumHalfWidth,
      arena.currentHalfHeight / arena.maximumHalfHeight
    );
    if (shrinkRatio < 0.995) {
      const currentLeft = arena.centerX - arena.currentHalfWidth;
      const currentRight = arena.centerX + arena.currentHalfWidth;
      const warningHalfHeight = Math.min(84, arena.currentHalfHeight * 0.38);
      // Four corner brackets and two inward-facing rails communicate the
      // shrinking safe space without drawing a closed box over the fighters.
      this.drawPaperArenaCorners(
        floorGraphics,
        arena,
        UI.coralDeep,
        6,
        0.82,
        44
      );
      floorGraphics.lineStyle(18, UI.coral, 0.16);
      floorGraphics.lineBetween(
        currentLeft - 5,
        arena.centerY - warningHalfHeight,
        currentLeft - 5,
        arena.centerY + warningHalfHeight
      );
      floorGraphics.lineBetween(
        currentRight + 5,
        arena.centerY - warningHalfHeight,
        currentRight + 5,
        arena.centerY + warningHalfHeight
      );
      floorGraphics.lineStyle(6, UI.coralDeep, 0.82);
      floorGraphics.lineBetween(
        currentLeft,
        arena.centerY - warningHalfHeight,
        currentLeft,
        arena.centerY + warningHalfHeight
      );
      floorGraphics.lineBetween(
        currentRight,
        arena.centerY - warningHalfHeight,
        currentRight,
        arena.centerY + warningHalfHeight
      );
      floorGraphics.lineBetween(
        currentLeft,
        arena.centerY,
        currentLeft + 20,
        arena.centerY - 14
      );
      floorGraphics.lineBetween(
        currentLeft,
        arena.centerY,
        currentLeft + 20,
        arena.centerY + 14
      );
      floorGraphics.lineBetween(
        currentRight,
        arena.centerY,
        currentRight - 20,
        arena.centerY - 14
      );
      floorGraphics.lineBetween(
        currentRight,
        arena.centerY,
        currentRight - 20,
        arena.centerY + 14
      );
    } else {
      this.drawPaperArenaCorners(floorGraphics, arena);
    }

    const fighterFrames = frame.fighters;
    for (const [index, fighterFrame] of fighterFrames.entries()) {
      const slot = index === 0 ? 'a' : 'b';
      const fighter = this.fighterForSlot(slot);
      const style = ELEMENT_STYLES[fighter.scribbit.element];
      const center = this.projectReplayVector(fighterFrame.position, frame);

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

  private drawPaperArenaCorners(
    graphics: Phaser.GameObjects.Graphics,
    arena: ArenaPresentationPlan,
    color: number = UI.inkHex,
    lineWidth: number = 4,
    alpha: number = 0.16,
    cornerLength: number = 32
  ): void {
    const left = arena.centerX - arena.currentHalfWidth;
    const right = arena.centerX + arena.currentHalfWidth;
    const top = arena.centerY - arena.currentHalfHeight;
    const bottom = arena.centerY + arena.currentHalfHeight;
    graphics.lineStyle(lineWidth, color, alpha);
    graphics.lineBetween(left, top, left + cornerLength, top);
    graphics.lineBetween(left, top, left, top + cornerLength);
    graphics.lineBetween(right, top, right - cornerLength, top);
    graphics.lineBetween(right, top, right, top + cornerLength);
    graphics.lineBetween(left, bottom, left + cornerLength, bottom);
    graphics.lineBetween(left, bottom, left, bottom - cornerLength);
    graphics.lineBetween(right, bottom, right - cornerLength, bottom);
    graphics.lineBetween(right, bottom, right, bottom - cornerLength);
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

  private telegraphShapePower(actor: ReplayFighterRuntime): void {
    actor.sprite?.telegraph();
    if (!actor.sprite) return;
    const style = ELEMENT_STYLES[actor.scribbit.element];
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
    const baseY = Math.min(
      this.battleLayout.arenaBottom - 120,
      Math.max(
        this.battleLayout.fighterPanelTop +
          this.battleLayout.fighterPanelHeight +
          100,
        fighter.screenY - 112
      )
    );
    const laneAvailability = this.combatReadLaneAvailableAt[fighter.side];
    const now = this.time.now;
    let laneIndex = laneAvailability.findIndex(
      (availableAt) => availableAt <= now
    );
    if (laneIndex < 0) {
      laneIndex = laneAvailability.reduce(
        (earliestIndex, availableAt, index) =>
          availableAt < laneAvailability[earliestIndex]!
            ? index
            : earliestIndex,
        0
      );
    }
    const startsAt = Math.max(now, laneAvailability[laneIndex] ?? now);
    laneAvailability[laneIndex] = startsAt + 1_050;
    const boundedY = Math.min(
      this.battleLayout.arenaBottom - 80,
      Math.max(
        this.battleLayout.fighterPanelTop +
          this.battleLayout.fighterPanelHeight +
          72,
        baseY + (laneIndex - 1) * 72
      )
    );
    const show = (): void => {
      if (!this.scene.isActive()) return;
      this.showCombatRead(laneX, boundedY, title, detail, color);
      this.game.canvas.dataset.combatCalloutCollisions = '0';
    };
    const delay = startsAt - now;
    if (delay > 0) this.time.delayedCall(delay, show);
    else show();
  }

  private showCombatRead(
    x: number,
    y: number,
    title: string,
    detail: string,
    color: string
  ): void {
    const cardWidth = 258;
    const cardHeight = 64;
    const contentWidth = cardWidth - 38;
    const stamp = this.add
      .container(x, y)
      .setDepth(57)
      .setScale(this.reduceMotion ? 1 : 0.82);
    const backing = this.add
      .rectangle(0, 0, cardWidth, cardHeight, UI.creamHex, 0.94)
      .setStrokeStyle(3, UI.inkHex, 0.86);
    const accent = this.add.rectangle(
      -cardWidth / 2 + 8,
      0,
      7,
      cardHeight - 16,
      Phaser.Display.Color.HexStringToColor(color).color,
      1
    );
    const titleLabel = label(
      this,
      -cardWidth / 2 + 21,
      -14,
      fitText(title.toUpperCase(), 25),
      18,
      color,
      true
    ).setOrigin(0, 0.5);
    const detailLabel = label(
      this,
      -cardWidth / 2 + 21,
      14,
      fitText(detail.toUpperCase(), 34),
      13,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    if (titleLabel.width > contentWidth) {
      titleLabel.setScale(contentWidth / titleLabel.width);
    }
    if (detailLabel.width > contentWidth) {
      detailLabel.setScale(contentWidth / detailLabel.width);
    }
    stamp.add([backing, accent, titleLabel, detailLabel]);
    if (this.reduceMotion) {
      this.time.delayedCall(640, () => stamp.destroy(true));
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
          onComplete: () => stamp.destroy(true),
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
      replayPass: getReplayPass(this),
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
    if (
      this.reduceMotion ||
      shakeIntensity <= 0 ||
      this.cameraShakeCooldownMilliseconds > 0
    )
      return;
    this.cameraShakeCooldownMilliseconds = 140 / this.speed;
    const intensity = Math.min(0.02, Math.max(0, shakeIntensity));
    const camera = this.cameras.main;
    camera.shake(100, intensity);
    this.tweens.killTweensOf(camera);
    camera.setZoom(1);
    this.tweens.add({
      targets: camera,
      zoom: 1 + Math.min(0.03, intensity * 1.55),
      duration: 52,
      hold: 18,
      yoyo: true,
      ease: 'Cubic.easeOut',
      onComplete: () => camera.setZoom(1),
    });
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
    damageText: string,
    crit: boolean,
    emphasisScale: number,
    durationMilliseconds: number
  ): void {
    const text = label(
      this,
      x,
      y - 80,
      damageText,
      Math.round((crit ? 60 : 42) * emphasisScale),
      crit ? '#ffd447' : '#ff5a3d',
      true
    ).setDepth(29);
    text.setStroke('#2b2016', crit ? 7 : 5);
    if (this.reduceMotion) {
      this.time.delayedCall(durationMilliseconds, () => text.destroy());
      return;
    }
    this.tweens.add({
      targets: text,
      y: y - 160,
      alpha: 0,
      scale: crit ? 1.3 : 1,
      duration: durationMilliseconds,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private stopPlaybackPresentation(): void {
    if (this.battleClipRecorder) {
      const recorder = this.battleClipRecorder;
      this.battleClipRecorder = null;
      this.battleClipPromise = recorder.stop();
      void this.battleClipPromise.then((clip) => {
        this.game.canvas.dataset.battleClip = clip
          ? `ready:${clip.blob.size}`
          : 'failed';
      });
    }
    this.playbackRunning = false;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.impactHoldMilliseconds = 0;
    this.recordDebugPlaybackState('result');
    this.clearInkcastEditorialState();
    this.shapeEffects.clear();
    this.weaponFxRenderer?.stopAll();
    this.battleHud?.stopHeartAnimations();
    this.battleHud?.setFighterShapePowerState('a', 'ready');
    this.battleHud?.setFighterShapePowerState('b', 'ready');
    this.hidePowerGhosts();
    this.arenaFloorEffects?.clear();
    this.combatEffects?.clear();
    this.clearCombatPrimitiveVisuals();
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
    this.battleClipRecorder?.cancel();
    this.battleClipRecorder = null;
    this.battleClipPromise = null;
    this.game.canvas.dataset.battleClip = 'skipped';
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
    this.battleHud?.setHeartsVisible(false);
    this.battleHud?.setBattleChromeVisible(false);

    const winner = this.report.winner === 'a' ? this.fighterA : this.fighterB;
    const loser = this.report.winner === 'a' ? this.fighterB : this.fighterA;
    winner.sprite?.celebrate();
    const perspective = this.battleRecapPerspective(winner, loser);
    if (perspective === 'viewer_win') this.soundboard.play('win');
    else if (perspective === 'viewer_loss') this.soundboard.play('loss');

    this.archivedReplayResult?.destroy();
    this.archivedReplayResult = createArchivedReplayResult(this, {
      winnerName: winner.scribbit.name,
      perspective,
      rivalRun: this.report.rivalRun,
      reduceMotion: this.reduceMotion,
      returnLabel: this.returnButtonLabel(),
      onReturn: () => this.exit(),
    });
  }

  private finish(): void {
    if (this.finished) return;
    const transcript = this.transcript;
    if (!transcript) {
      this.showArchivedResult();
      return;
    }
    this.finished = true;
    if (this.isFoundingReplay()) {
      trackProgressionEvent('founding_replay_completed', {
        scribbitId: this.report.a.id,
        source: 'birth',
      });
    }
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

    // Let the authoritative finish pose and sound land before the result UI.
    // Reduced-motion players still receive the result immediately.
    this.time.delayedCall(this.reduceMotion ? 0 : 520, () => {
      if (!this.scene.isActive()) return;
      this.showOutcome(
        winner,
        loser,
        recap,
        founderOutcome,
        founderEpisodeReceipt
      );
    });
  }

  private isFoundingReplay(): boolean {
    return (
      this.report.kind === 'exhibition' &&
      this.report.a.bornDay === this.report.day
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
    const arenaChallenge = this.battleArenaChallengeResult();
    const rewardPlan = this.isMine(winner.scribbit)
      ? this.replayRewardPlan()
      : null;
    const archivedInkReward =
      this.isMine(winner.scribbit) && (this.report.inkAwarded ?? 0) > 0
        ? `${this.isSavedReplay() ? 'Saved payout. ' : ''}${this.report.inkAwarded} Ink earned.`
        : '';
    const rewardAnnouncement = rewardPlan?.accessibleLabel ?? archivedInkReward;
    const resultAnnouncement = `${formatBattleRecapAnnouncement(
      recap,
      this.battleRecapPerspective(winner, loser)
    )}${arenaChallenge ? ` ${arenaChallenge.accessibleLabel}` : ''}${
      rewardAnnouncement ? ` ${rewardAnnouncement}` : ''
    }`;
    if (this.report.kind === 'practice') {
      this.battleHud?.announceResult(resultAnnouncement);
      this.showPracticeOutcome(winner, recap);
      return;
    }
    this.battleHud?.setBattleChromeVisible(false);
    this.battleHud?.announceResult(resultAnnouncement);
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, UI.paper, 0.74)
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

  private battleArenaChallengeResult(): ReplayArenaChallengeResultPlan | null {
    return planReplayArenaChallengeResult({
      ...(this.report.battleArenaId
        ? { arenaId: this.report.battleArenaId }
        : {}),
      ...(this.report.arenaChallenge
        ? { progress: this.report.arenaChallenge }
        : {}),
    });
  }

  private drawArenaChallengeStamp(y: number, hidden = false): void {
    const result = this.battleArenaChallengeResult();
    const progress = this.report.arenaChallenge;
    if (hidden || !result || !progress) return;

    const completed = progress.completed;
    const stamp = this.add
      .container(this.scale.width / 2, y)
      .setDepth(62)
      .setAlpha(this.reduceMotion ? 1 : 0)
      .setScale(this.reduceMotion ? 1 : 0.76);
    const stampText = completed
      ? 'GOAL CLEARED'
      : `GOAL ${Math.min(progress.progress, progress.target)}/${progress.target}`;
    const stampLabel = label(
      this,
      20,
      0,
      stampText,
      24,
      completed ? UI.goldText : UI.inkSoft,
      true
    ).setStroke(UI.cream, 6);
    stamp.add([
      paperIcon(this, 'target', -105, 0, {
        size: 34,
        fill: completed ? UI.gold : UI.tapeAlt,
      }),
      stampLabel,
    ]);

    if (!this.reduceMotion) {
      this.tweens.add({
        targets: stamp,
        alpha: 1,
        scale: 1,
        duration: 260,
        ease: 'Back.easeOut',
      });
    }
  }

  private battleRecapPerspective(
    winner: ReplayFighterRuntime,
    loser: ReplayFighterRuntime
  ): BattleRecapPerspective {
    if (this.isMine(winner.scribbit)) return 'viewer_win';
    if (this.isMine(loser.scribbit)) return 'viewer_loss';
    return 'spectator';
  }

  private postFightEligibility(ownedFighter?: Scribbit) {
    const arena = getArena(this);
    const ownedFighterAlive = Boolean(
      ownedFighter?.status === 'alive' &&
      arena?.myScribbits.some((scribbit) => scribbit.id === ownedFighter.id)
    );
    return planReplayPostFightEligibility({
      reportKind: this.report.kind,
      entryMode: getReplayEntryMode(this),
      ownedFighterAlive,
      hasBackedScribbit: Boolean(arena?.myBackedScribbitId),
    });
  }

  private replayRewardPlan() {
    return planReplayReward({
      receipt: getReplaySparReward(this),
      savedReplay: this.isSavedReplay(),
    });
  }

  private showPracticeOutcome(
    winner: ReplayFighterRuntime,
    recap: BattleRecapPlan
  ): void {
    const { width, height } = this.scale;
    const session = getPracticeSession(this);
    this.battleHud?.setHeartsVisible(false);
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

  private createPersistentVictoryAura(
    element: Scribbit['element'],
    x: number,
    y: number
  ): void {
    const elementStyle = ELEMENT_STYLES[element];
    const aura = this.add.container(x, y).setDepth(55);
    const glow = this.add
      .circle(0, 0, 146, elementStyle.soft, 0.18)
      .setStrokeStyle(7, UI.goldHex, 0.82);
    const rays = this.add.graphics();
    const rayCount = 12;
    for (let index = 0; index < rayCount; index += 1) {
      const angle = (index / rayCount) * Math.PI * 2;
      const innerRadius = 154;
      const outerRadius = 174 + (index % 2) * 12;
      rays.lineStyle(
        index % 2 === 0 ? 7 : 5,
        index % 3 === 0 ? elementStyle.particle : UI.goldHex,
        0.72
      );
      rays.lineBetween(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius,
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius
      );
    }

    const sparkPlacements = [
      { x: -150, y: -88, size: 34, angle: -12 },
      { x: 158, y: -72, size: 30, angle: 16 },
      { x: -170, y: 68, size: 28, angle: 10 },
      { x: 164, y: 82, size: 36, angle: -14 },
    ] as const;
    const sparks = sparkPlacements.map((placement, index) =>
      this.add
        .image(placement.x, placement.y, 'spark')
        .setDisplaySize(placement.size, placement.size)
        .setAngle(placement.angle)
        .setTint(index % 2 === 0 ? UI.goldHex : elementStyle.particle)
    );
    aura.add([glow, rays, ...sparks]);

    if (this.reduceMotion) return;
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.72, to: 1 },
      scale: { from: 0.98, to: 1.05 },
      duration: 1_100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    sparks.forEach((spark, index) => {
      const baseScaleX = spark.scaleX;
      const baseScaleY = spark.scaleY;
      this.tweens.add({
        targets: spark,
        alpha: { from: 0.62, to: 1 },
        scaleX: { from: baseScaleX * 0.9, to: baseScaleX * 1.12 },
        scaleY: { from: baseScaleY * 0.9, to: baseScaleY * 1.12 },
        duration: 720 + index * 110,
        delay: index * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createOutcomeBanner(outcome: 'victory' | 'defeat'): void {
    const victory = outcome === 'victory';
    paperWordmark(
      this,
      this.scale.width / 2,
      150,
      victory ? 'VICTORY! INK-CREDIBLE!' : 'DEFEAT! PAPER JAM!',
      {
        icon: victory ? 'trophy' : 'defeat',
        fontSize: 44,
        maxWidth: 460,
        fill: victory ? UI.gold : UI.coral,
        accent: UI.creamHex,
        textColor: victory ? UI.ink : UI.cream,
        angle: victory ? -1.4 : 1.2,
      }
    ).setDepth(63);
  }

  private showWinCeremony(
    winner: ReplayFighterRuntime,
    recap: BattleRecapPlan,
    founderOutcome: string | null,
    founderEpisodeReceipt: FounderRivalEpisodeReceiptPlan | null
  ): void {
    const { width, height } = this.scale;
    const usesVerdictCeremony = recap.finishPresentation === 'double-knockout';
    const losingFighter =
      winner === this.fighterA ? this.fighterB : this.fighterA;
    const ownedFighter = this.isMine(winner.scribbit)
      ? winner.scribbit
      : this.isMine(losingFighter.scribbit)
        ? losingFighter.scribbit
        : undefined;
    const actionEligibility = this.postFightEligibility(ownedFighter);
    const firstChestAction = this.firstChestAction(ownedFighter);
    const outcomeLayout = planReplayOutcomeLayout({ viewportHeight: height });
    const victoryY = outcomeLayout.heroY;
    this.createOutcomeBanner('victory');
    this.time.delayedCall(260, () => {
      if (this.scene.isActive()) this.soundboard.play('win');
    });
    if (winner.sprite && !usesVerdictCeremony) {
      this.createPersistentVictoryAura(
        winner.scribbit.element,
        width / 2,
        victoryY
      );
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
      : (founderEpisodeReceipt?.resultLine ?? founderOutcome ?? null);
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
    this.drawArenaChallengeStamp(
      outcomeLayout.recapY - 172,
      Boolean(rivalRunFinish)
    );
    createBattleRecapCard(this, recap, {
      x: width / 2,
      y: outcomeLayout.recapY,
      width: width - 70,
      depth: 60,
      perspective: this.battleRecapPerspective(winner, losingFighter),
      ...(!rivalRunFinish && contextLine ? { contextLine } : {}),
    });
    // Fresh XP comes only from the action-specific server receipt. Saved
    // history can still show its archived Ink payout without implying new XP.
    const rewardPlan = this.replayRewardPlan();
    const fallbackInkReward = (this.report.inkAwarded ?? 0) > 0;
    if (this.isMine(winner.scribbit) && (rewardPlan || fallbackInkReward)) {
      if (!this.isSavedReplay()) playSfx('reward.ink');
      const rewardText =
        rewardPlan?.label ??
        (this.isSavedReplay()
          ? `SAVED PAYOUT • +${this.report.inkAwarded} INK`
          : `EARNED • +${this.report.inkAwarded} INK`);
      const reward = label(
        this,
        width / 2,
        outcomeLayout.lifeY,
        rewardText,
        30,
        UI.goldText,
        true
      ).setDepth(62);
      reward.setStroke(UI.cream, 8);
      reward.setAlpha(this.reduceMotion ? 1 : 0);
      reward.setScale(this.reduceMotion ? 1 : 0.72);
      if (!this.reduceMotion) {
        this.tweens.add({
          targets: reward,
          alpha: 1,
          scale: 1,
          duration: 280,
          ease: 'Back.easeOut',
        });
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

    const powerUpOffer = getReplayPowerUpOffer(this);
    const canChoosePowerUp =
      powerUpOffer?.scribbitId === winner.scribbit.id &&
      this.isMine(winner.scribbit);
    const powerUpAction: ReplayPostFightAction | null = canChoosePowerUp
      ? Object.freeze({
          kind: 'powerUp',
          label: 'CHOOSE POWER-UP',
          accessibleLabel: 'Choose a new Power-Up for this Scribbit',
          tone: 'gold',
        })
      : null;
    const renderPostFightActions = (
      primaryAction: ReplayPostFightAction | null,
      delayReveal: boolean
    ): void => {
      this.postFightActions?.destroy();
      this.postFightActions = createPostFightActions(this, {
        x: width / 2,
        y: outcomeLayout.actionY,
        accessibilityX: width / 2,
        accessibilityY: outcomeLayout.actionY,
        width: width - 70,
        canChooseRival: actionEligibility.canChooseRival,
        canBackContender: actionEligibility.canPickRumble,
        canReplay: this.canReplaySavedReport(),
        canShareClip: this.battleClipPromise !== null,
        returnLabel: this.compactReturnButtonLabel(),
        rivalActionCopy,
        ...(primaryAction ? { primaryAction } : {}),
        primaryRequired: primaryAction?.kind === 'powerUp',
        ...(firstChestAction && ownedFighter
          ? { onFirstChest: () => this.startFirstChestTrail(ownedFighter) }
          : {}),
        onPowerUp: () =>
          this.openRequiredPowerUpDraft(winner.scribbit, () =>
            renderPostFightActions(firstChestAction, false)
          ),
        onRivals: () => this.openRivalDraft(winner.scribbit),
        onBackContender: () => this.goBackEntrants(),
        onReplay: () => this.replayAgain(),
        onShareClip: () => void this.shareRecordedBattleClip(),
        onReturn: () => this.exit(),
      });
      this.postFightActions.container.setDepth(61);
      if (!delayReveal || this.reduceMotion) return;
      const actions = this.postFightActions;
      actions.container.setAlpha(0);
      actions.setAccessibleVisible(false);
      this.time.delayedCall(480, () => {
        if (!this.scene.isActive() || this.postFightActions !== actions) return;
        actions.setAccessibleVisible(true);
        this.tweens.add({
          targets: actions.container,
          alpha: 1,
          duration: 220,
          ease: 'Cubic.easeOut',
        });
      });
    };
    renderPostFightActions(powerUpAction ?? firstChestAction, true);
    if (powerUpAction) {
      this.time.delayedCall(this.reduceMotion ? 0 : 480, () =>
        this.openRequiredPowerUpDraft(winner.scribbit, () =>
          renderPostFightActions(firstChestAction, false)
        )
      );
    }
  }

  private openRequiredPowerUpDraft(
    scribbit: Scribbit,
    onClaimed: () => void
  ): void {
    const offer = getReplayPowerUpOffer(this);
    if (
      !offer ||
      offer.scribbitId !== scribbit.id ||
      this.powerUpDraft ||
      !this.scene.isActive()
    ) {
      return;
    }
    trackProgressionEvent('power_up_offer_shown', {
      scribbitId: scribbit.id,
      source: offer.source,
    });
    this.postFightActions?.setAccessibleVisible(false);
    this.powerUpDraft = openPowerUpDraft(
      this,
      offer,
      scribbit.powerUpIds?.length ?? 0,
      (selectedId) => {
        trackProgressionEvent('power_up_chosen', {
          scribbitId: scribbit.id,
          source: offer.source,
        });
        const nextPowerUpIds = [...(scribbit.powerUpIds ?? []), selectedId];
        scribbit.powerUpIds = nextPowerUpIds;
        const arena = getArena(this);
        if (arena) {
          setArena(this, {
            ...arena,
            discoveredPowerUpIds: [
              ...new Set([...(arena.discoveredPowerUpIds ?? []), selectedId]),
            ],
            pendingPowerUpOffers: (arena.pendingPowerUpOffers ?? []).filter(
              (pendingOffer) => pendingOffer.id !== offer.id
            ),
            myScribbits: arena.myScribbits.map((ownedScribbit) =>
              ownedScribbit.id === scribbit.id
                ? { ...ownedScribbit, powerUpIds: [...nextPowerUpIds] }
                : ownedScribbit
            ),
          });
        }
        clearReplayPowerUpOffer(this);
        this.powerUpDraft = null;
        onClaimed();
      }
    );
  }

  // Loss flow — no dead ends. Lifespan remaining + a server-authored rival
  // draft + Pick only while tonight's choice is still open.
  private showLossCard(
    mine: Scribbit,
    currentDay: number,
    recap: BattleRecapPlan,
    founderOutcome: string | null,
    founderEpisodeReceipt: FounderRivalEpisodeReceiptPlan | null
  ): void {
    const { width, height } = this.scale;
    const daysLeft = daysLeftFor(mine, currentDay);
    const actionEligibility = this.postFightEligibility(mine);
    const firstChestAction = this.firstChestAction(mine);
    const winner = this.fighterForSlot(recap.winnerSlot);
    const loser = this.fighterForSlot(recap.loserSlot);
    const rivalRunFinish = planRivalRunFinishStamp(this.report.rivalRun);
    const outcomeLayout = planReplayOutcomeLayout({ viewportHeight: height });
    this.createOutcomeBanner('defeat');
    this.time.delayedCall(260, () => {
      if (this.scene.isActive()) this.soundboard.play('loss');
    });

    // Keep both submitted drawings in the payoff. The winner owns the visual
    // focus; the player's defeated Scribbit remains visible instead of being
    // erased behind a near-opaque result sheet.
    if (winner.sprite) {
      winner.sprite.setDepth(56);
      this.tweens.add({
        targets: winner.sprite.container,
        x: width * 0.62,
        y: outcomeLayout.heroY,
        duration: this.reduceMotion ? 0 : 360,
        ease: 'Cubic.easeOut',
        onComplete: () => winner.sprite?.celebrate(),
      });
    }
    if (loser.sprite) {
      loser.sprite.setDepth(55);
      loser.sprite.container.setAlpha(0.32);
      this.tweens.add({
        targets: loser.sprite.container,
        x: width * 0.28,
        y: outcomeLayout.heroY + 34,
        duration: this.reduceMotion ? 0 : 360,
        ease: 'Cubic.easeOut',
      });
    }

    const contextLine = rivalRunFinish
      ? `${rivalRunFinish.title} • ${rivalRunFinish.score}`
      : this.report.rivalRun
        ? formatRivalRunResultLine(this.report.rivalRun)
        : (founderEpisodeReceipt?.resultLine ?? founderOutcome ?? null);
    const rivalActionCopy = planRivalRunActionCopy(this.report.rivalRun);
    this.drawArenaChallengeStamp(
      outcomeLayout.recapY - 172,
      Boolean(rivalRunFinish)
    );
    createBattleRecapCard(this, recap, {
      x: width / 2,
      y: outcomeLayout.recapY,
      width: width - 70,
      depth: 60,
      perspective: 'viewer_loss',
      ...(contextLine ? { contextLine } : {}),
    });
    const lifeLabel = label(
      this,
      width / 2,
      outcomeLayout.lifeY,
      `${daysLeft} DAY${daysLeft === 1 ? '' : 'S'} LEFT`,
      24,
      UI.ink,
      true
    ).setDepth(61);
    lifeLabel.setStroke(UI.cream, 5);

    const powerUpOffer = getReplayPowerUpOffer(this);
    const powerUpAction: ReplayPostFightAction | null =
      powerUpOffer?.scribbitId === mine.id
        ? Object.freeze({
            kind: 'powerUp',
            label: 'CHOOSE POWER-UP',
            accessibleLabel: 'Choose a new Power-Up for this Scribbit',
            tone: 'gold',
          })
        : null;
    const renderPostFightActions = (
      primaryAction: ReplayPostFightAction | null
    ): void => {
      this.postFightActions?.destroy();
      this.postFightActions = createPostFightActions(this, {
        x: width / 2,
        y: outcomeLayout.actionY,
        accessibilityX: width / 2,
        accessibilityY: outcomeLayout.actionY,
        width: width - 70,
        canChooseRival: actionEligibility.canChooseRival,
        canBackContender: actionEligibility.canPickRumble,
        canReplay: this.canReplaySavedReport(),
        canShareClip: this.battleClipPromise !== null,
        returnLabel: this.compactReturnButtonLabel(),
        rivalActionCopy,
        ...(primaryAction ? { primaryAction } : {}),
        primaryRequired: primaryAction?.kind === 'powerUp',
        ...(firstChestAction
          ? { onFirstChest: () => this.startFirstChestTrail(mine) }
          : {}),
        onPowerUp: () =>
          this.openRequiredPowerUpDraft(mine, () =>
            renderPostFightActions(firstChestAction)
          ),
        onRivals: () => this.openRivalDraft(mine),
        onBackContender: () => this.goBackEntrants(),
        onReplay: () => this.replayAgain(),
        onShareClip: () => void this.shareRecordedBattleClip(),
        onReturn: () => this.exit(),
      });
      this.postFightActions.container.setDepth(61);
    };
    renderPostFightActions(powerUpAction ?? firstChestAction);
    if (powerUpAction) {
      this.time.delayedCall(this.reduceMotion ? 0 : 480, () =>
        this.openRequiredPowerUpDraft(mine, () =>
          renderPostFightActions(firstChestAction)
        )
      );
    }
  }

  private compactReturnButtonLabel(): string {
    const returnScene = getReplayReturn(this);
    switch (returnScene) {
      case 'ScribbitHome':
        return 'HOME';
      case 'Gallery':
        return 'LEGACY';
      case 'MyBattles':
        return 'ARENA';
      case 'BattleHistory':
        return 'HISTORY';
      case 'ScoutNotebook':
        return 'SCOUT';
      case 'ArenaHome':
        return 'ARENA';
    }
  }

  private isSavedReplay(): boolean {
    return getReplayEntryMode(this) === 'saved';
  }

  private canReplaySavedReport(): boolean {
    return this.isSavedReplay() && this.transcript !== null;
  }

  private async shareRecordedBattleClip(): Promise<void> {
    if (this.battleClipShareBusy) return;
    if (this.sharedBattleClipUrl) {
      this.battleClipShareBusy = true;
      try {
        await shareHostedBattleClip(this.sharedBattleClipUrl, this.report);
      } finally {
        this.battleClipShareBusy = false;
      }
      return;
    }
    const clipPromise = this.battleClipPromise;
    if (!clipPromise) {
      showToast('Replay the fight without skipping to create a share clip.');
      return;
    }

    this.battleClipShareBusy = true;
    try {
      showToast('Finishing your battle clip…');
      const clip = await clipPromise;
      if (!clip) {
        showToast('This browser could not render a battle clip.');
        return;
      }
      this.sharedBattleClipUrl = await shareBattleClip(clip, this.report);
    } catch {
      showToast('The battle clip could not be shared. Try again.');
    } finally {
      this.battleClipShareBusy = false;
    }
  }

  /** Restarts the exact local transcript; no fetch, simulation, or reward path. */
  private replayAgain(): void {
    if (!this.canReplaySavedReport()) return;
    advanceSavedReplayPass(this);
    this.postFightActions?.destroy();
    this.postFightActions = null;
    this.scene.restart();
  }

  private returnButtonLabel(): string {
    const returnScene = getReplayReturn(this);
    switch (returnScene) {
      case 'ScribbitHome':
        return 'Back Home';
      case 'Gallery':
        return 'Open Legacy Book';
      case 'MyBattles':
        return 'Back to Arena';
      case 'BattleHistory':
        return 'Back to Past Battles';
      case 'ScoutNotebook':
        return 'Back to Scout Notebook';
      case 'ArenaHome':
        return 'Back to Arena';
    }
  }

  private startPractice(): void {
    if (this.report.kind !== 'practice') beginPracticeSession(this);
    startScene(this, 'Draw', { mode: 'practice' });
  }

  private openRivalDraft(mine: Scribbit): void {
    if (this.rematchLoading || this.rivalRunFlow) return;
    const rivalDraftTrigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const restorePostFightFocus = (): void => {
      this.postFightActions?.setAccessibleVisible(true);
      requestAnimationFrame(() => {
        if (rivalDraftTrigger?.isConnected) rivalDraftTrigger.focus();
      });
    };
    this.postFightActions?.setAccessibleVisible(false);
    this.rivalRunFlow = openRivalRun(this, {
      challenger: mine,
      trigger: rivalDraftTrigger,
      closeLabel: 'Back to result',
      returnScene: getReplayReturn(this),
      onBusyChange: (busy) => {
        this.rematchLoading = busy;
      },
      onDismissed: () => {
        this.rivalRunFlow = null;
        restorePostFightFocus();
      },
      onResolved: () => {
        this.rivalRunFlow = null;
      },
      onBattleStart: () => {
        this.postFightActions?.destroy();
        this.postFightActions = null;
      },
      onCeremonyComplete: () => this.scene.restart(),
    });
  }

  private firstChestAction(
    scribbit: Scribbit | undefined
  ): ReplayPostFightAction | null {
    const arena = getArena(this);
    if (!arena || !scribbit) return null;
    const step = planFirstChestTrailEntry({
      isFreshResult: !this.isSavedReplay(),
      rivalRun: this.report.rivalRun,
      scribbit,
      ink: arena.myInk,
      chestCost: arena.nextCapsuleCost,
      capsulePullCount: arena.capsuleProgress.pullCount,
    });
    return step
      ? Object.freeze({
          kind: 'firstChest',
          label: 'FIRST GEAR',
          accessibleLabel:
            'Continue toward your first server-awarded Mystery Ink Gear.',
          tone: 'coral',
        })
      : null;
  }

  private startFirstChestTrail(scribbit: Scribbit): void {
    void this.refreshArenaAndNavigate({
      kind: 'firstChest',
      scribbitId: scribbit.id,
    });
  }

  private goBackEntrants(): void {
    void this.refreshArenaAndNavigate({ kind: 'entrants' });
  }

  private exit(): void {
    if (this.report.kind === 'practice') {
      endPracticeSession(this);
      startScene(this, 'ArenaHome');
      return;
    }
    void this.refreshArenaAndNavigate({ kind: 'return' });
  }

  private async refreshArenaAndNavigate(
    destination: ReplayArenaDestination
  ): Promise<void> {
    if (this.arenaRefreshLoading) return;
    if (this.isSavedReplay() && destination.kind === 'return') {
      startScene(this, getReplayReturn(this));
      return;
    }

    this.arenaRefreshLoading = true;
    const previousArena = getArena(this);
    const result = await fetchArena();
    this.arenaRefreshLoading = false;
    if (!this.scene.isActive()) return;
    if (!result.ok) {
      showToast(result.error);
      return;
    }
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
    if (destination.kind === 'entrants') {
      setArenaFocus(this, 'entrants');
      startScene(this, 'ArenaHome');
      return;
    }
    if (destination.kind === 'firstChest') {
      const scribbit = result.data.myScribbits.find(
        (candidate) => candidate.id === destination.scribbitId
      );
      const step = scribbit
        ? planFirstChestTrailStep({
            scribbit,
            ink: result.data.myInk,
            chestCost: result.data.nextCapsuleCost,
            capsulePullCount: result.data.capsuleProgress.pullCount,
          })
        : null;
      if (step?.kind === 'shop') {
        startScene(this, 'Shop');
        return;
      }
      showToast('Keep earning Ink — your first chest is waiting in Shop.');
      startScene(this, 'ArenaHome');
      return;
    }
    startScene(this, getReplayReturn(this));
  }
}
