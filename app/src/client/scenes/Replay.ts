import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  beginPracticeSession,
  endPracticeSession,
  getPracticeSession,
  getReplay,
  getReplayReturn,
  getArena,
  setArena,
  setReplay,
  setArenaFocus,
} from '../lib/registry';
import { loadDrawing, levelOf } from '../lib/scribbits';
import { ELEMENT_STYLES, prefersReducedMotion, TYPE, UI } from '../lib/theme';
import {
  label,
  stickerCard,
  ghostButton,
  button,
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
  getShapePowerMissCallout,
  getShapePowerRevealCopy,
  getShapePowerSignatureName,
  planShapePowerCallout,
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
  projectCombatPosition,
} from '../lib/battlepresentation';
import type {
  ArenaPresentationPlan,
  BattleImpactPlan,
  ReplayBattleLayout,
} from '../lib/battlepresentation';
import { planBattleRecap } from '../lib/battlerecap';
import type { BattleRecapPlan } from '../lib/battlerecap';
import { drawReplayBattleBackground } from '../lib/replaybattlebackground';
import { createReplayBattleHud } from '../lib/replaybattlehud';
import type { ReplayBattleHud } from '../lib/replaybattlehud';
import {
  addBattleRecapLines,
  createBattleRecapCard,
} from '../lib/replaybattlerecap';
import { createSparRivalDraft } from '../lib/replaysparrivaldraft';
import type { SparRivalDraft } from '../lib/replaysparrivaldraft';
import { createPostFightSparringChoices } from '../lib/replaypostfightactions';
import { createPracticeOutcomeControls } from '../lib/replaypracticeoutcome';
import { isPracticeSessionComplete } from '../lib/practicelab';
import { BattleSoundboard } from '../lib/battlesound';
import { showToast } from '@devvit/web/client';
import type { BattleReport, Element, Scribbit } from '../../shared/arena';
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
  private fighterA!: ReplayFighterRuntime;
  private fighterB!: ReplayFighterRuntime;
  private finished = false;
  private introBanner: Phaser.GameObjects.Text | null = null;
  private reduceMotion = false;

  // Fast-forward: cycles 1x → 2x → 4x → 1x. Scales the scene clock + tweens so
  // the WHOLE spectacle speeds up uniformly, and persists across every beat.
  private static readonly SPEEDS = [1, 2, 4] as const;
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
  private playbackTick = 0;
  private previousPlaybackTick = -1;
  private arenaFloorEffects: Phaser.GameObjects.Graphics | null = null;
  private combatEffects: Phaser.GameObjects.Graphics | null = null;
  private readonly shapeEffects = new Map<'a' | 'b', ShapeEffect>();
  private impactHoldMilliseconds = 0;

  constructor() {
    super('Replay');
  }

  init(): void {
    this.finished = false;
    this.battleHud = null;
    this.introBanner = null;
    this.reduceMotion = prefersReducedMotion();
    this.speedIndex = 0;
    this.fightersReady = false;
    this.skipRequested = false;
    this.rematchLoading = false;
    this.rivalDraft = null;
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
    this.transcript = getUsableBattleTranscript(report) ?? null;
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.buildArena();

    this.events.once('shutdown', () => {
      this.playbackRunning = false;
      this.shapeEffects.clear();
      this.hidePowerGhosts();
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this.impactHoldMilliseconds = 0;
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
    drawReplayBattleBackground(this, {
      layout: this.battleLayout,
      fighterAElement: this.report.a.element,
      fighterBElement: this.report.b.element,
      battleSeed: this.report.id,
      battleKind: this.report.kind,
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
    const mine = arena?.myUsername === scribbit.artist;
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
    this.previousPlaybackTick = 0;
    this.drawReplayFrameEffects(frame);
  }

  override update(_time: number, deltaMilliseconds: number): void {
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
    this.playbackTick = nextTick;
    this.previousPlaybackTick = nextTick;
    this.drawReplayFrameEffects(frame);

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
        this.telegraphShapePower(event.actor, actor, event.power);
        this.soundboard.play('telegraph');
        this.setAnnouncer(
          `${actor.scribbit.name} winds up ${getShapePowerSignatureName(
            actor.scribbit.element,
            event.power
          )}!`
        );
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
          if (!effect.connected) {
            const actor = this.fighterForSlot(event.actor);
            const opponent = this.fighterForSlot(
              event.actor === 'a' ? 'b' : 'a'
            );
            this.showFighterCombatRead(
              opponent,
              getShapePowerMissCallout(event.power),
              'COUNTER READ',
              ELEMENT_STYLES[opponent.scribbit.element].primaryText
            );
            this.setAnnouncer(
              `${opponent.scribbit.name} reads ${getShapePowerSignatureName(
                actor.scribbit.element,
                event.power
              )} and slips clear!`
            );
          }
          this.shapeEffects.delete(event.actor);
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
        this.setAnnouncer(
          `${attacker.scribbit.name}'s ${getDamageSourceDisplayName(
            event.source,
            attacker.scribbit.element
          )} hits for ${event.amount}${event.critical ? ' — CRIT!' : '!'}`
        );
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
        this.setAnnouncer(
          `${target.scribbit.name} catches an Ember afterburn!`
        );
        return;
      }
      case 'barrier_created': {
        const actor = this.fighterForSlot(event.actor);
        this.soundboard.play('shield');
        this.revealElementCue(actor);
        this.setAnnouncer(`${actor.scribbit.name} grows a Moss paper shield.`);
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
        this.setAnnouncer(
          `${actor.scribbit.name}'s paper shield absorbs ${event.absorbedDamage}!`
        );
        return;
      }
      case 'barrier_broken': {
        const actor = this.fighterForSlot(event.actor);
        this.soundboard.play('shield');
        this.setAnnouncer(`${actor.scribbit.name}'s paper shield tears open!`);
        return;
      }
      case 'ink_pressure': {
        const actor = this.fighterForSlot(event.actor);
        this.setAnnouncer(`${actor.scribbit.name} surges with INK PRESSURE!`);
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
        this.setAnnouncer(`${actor.scribbit.name}'s wall nib snaps back!`);
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
        this.setAnnouncer('The paper folds inward — nowhere left to hide!');
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
        const powerA = getShapePowerSignatureName(
          this.fighterA.scribbit.element,
          this.fighterA.primaryPower
        );
        const powerB = getShapePowerSignatureName(
          this.fighterB.scribbit.element,
          this.fighterB.primaryPower
        );
        this.setAnnouncer(`${powerA} meets ${powerB} — the drawings decide!`);
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
        this.setAnnouncer(
          `${actor.scribbit.name} leaves a living ${getShapePowerSignatureName(
            actor.scribbit.element,
            'colorburst'
          )} echo!`
        );
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
        this.setAnnouncer(
          `${actor.scribbit.name}'s ${getShapePowerSignatureName(
            actor.scribbit.element,
            'colorburst'
          )} echo fires!`
        );
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
        this.setAnnouncer(
          `${owner.scribbit.name}'s ${getShapePowerSignatureName(
            owner.scribbit.element,
            'colorburst'
          )} echo shatters!`
        );
        return;
      }
      case 'late_fight_started':
        this.setAnnouncer('SUDDEN SCRIBBLE! Powers recharge faster!');
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
    const arenaCornerRadius = Math.min(
      46,
      arena.currentHalfWidth / 3,
      arena.currentHalfHeight / 3
    );
    floorGraphics.lineStyle(8, UI.creamHex, 0.76);
    floorGraphics.strokeRoundedRect(
      arena.centerX - arena.currentHalfWidth,
      arena.centerY - arena.currentHalfHeight,
      arena.currentHalfWidth * 2,
      arena.currentHalfHeight * 2,
      arenaCornerRadius
    );
    floorGraphics.lineStyle(4, UI.inkHex, 0.52);
    floorGraphics.strokeRoundedRect(
      arena.centerX - arena.currentHalfWidth,
      arena.centerY - arena.currentHalfHeight,
      arena.currentHalfWidth * 2,
      arena.currentHalfHeight * 2,
      arenaCornerRadius
    );
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
      floorGraphics.fillStyle(UI.coralDeep, 0.075);
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
      floorGraphics.lineStyle(9, UI.coralDeep, 0.4);
      floorGraphics.lineBetween(
        arena.centerX - arena.currentHalfWidth,
        arena.centerY - arena.currentHalfHeight,
        arena.centerX - arena.currentHalfWidth,
        arena.centerY + arena.currentHalfHeight
      );
      floorGraphics.lineBetween(
        arena.centerX + arena.currentHalfWidth,
        arena.centerY - arena.currentHalfHeight,
        arena.centerX + arena.currentHalfWidth,
        arena.centerY + arena.currentHalfHeight
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
    const wallClockDuration = this.reduceMotion ? 220 : 420;
    const sceneDuration = wallClockDuration * this.speed;
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
      .setScale(0);
    calloutLabel.setStroke('#fff7e8', firstReveal ? 9 : 6);
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
      Math.max(this.battleLayout.arenaTop + 100, fighter.screenY - 112)
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

  private setAnnouncer(text: string): void {
    this.battleHud?.announce(text);
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
    ).setDepth(20);
    text.setStroke('#2b2016', crit ? 7 : 5);
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
    this.shapeEffects.clear();
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

    const winner = this.report.winner === 'a' ? this.fighterA : this.fighterB;
    const loser = this.report.winner === 'a' ? this.fighterB : this.fighterA;
    winner.sprite?.celebrate();

    const { width, height } = this.scale;
    const card = stickerCard(this, width / 2, height / 2, width - 70, 520, {
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
    const top = -260;
    card.add(
      label(this, 0, top + 74, 'ARCHIVED RESULT', 42, UI.goldText, true)
    );
    card.add(
      label(
        this,
        0,
        top + 155,
        `${winner.scribbit.name} defeated ${loser.scribbit.name}.`,
        TYPE.title,
        UI.ink,
        true
      ).setWordWrapWidth(width - 150)
    );
    card.add(
      label(
        this,
        0,
        top + 265,
        'Motion replay unavailable. The saved server result is preserved; no turn-by-turn animation is reconstructed.',
        TYPE.body,
        UI.inkSoft,
        true
      ).setWordWrapWidth(width - 150)
    );
    card.add(
      ghostButton(
        this,
        0,
        top + 420,
        this.returnButtonLabel(),
        () => this.exit(),
        width - 250
      )
    );
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
    const winner = this.fighterForSlot(recap.winnerSlot);
    const loser = this.fighterForSlot(recap.loserSlot);
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
    this.showOutcome(winner, loser, recap);
  }

  private showOutcome(
    winner: ReplayFighterRuntime,
    loser: ReplayFighterRuntime,
    recap: BattleRecapPlan
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
    const arena = getArena(this);
    const myLoss = this.isMine(loser.scribbit) && !this.isMine(winner.scribbit);
    if (myLoss && arena) {
      this.showLossCard(loser.scribbit, arena.dayNumber, recap);
    } else {
      this.showWinCeremony(winner, recap);
    }
  }

  private isMine(scribbit: Scribbit): boolean {
    return (
      getArena(this)?.myScribbits.some((one) => one.id === scribbit.id) ?? false
    );
  }

  private showPracticeOutcome(
    winner: ReplayFighterRuntime,
    recap: BattleRecapPlan
  ): void {
    const { width, height } = this.scale;
    const session = getPracticeSession(this);
    this.battleHud?.setHitPointBarsVisible(false);
    winner.sprite?.celebrate();
    if (isPracticeSessionComplete(session)) {
      this.time.delayedCall(220, () => {
        if (this.scene.isActive()) this.soundboard.play('win');
      });
    }
    createBattleRecapCard(this, recap, {
      x: width / 2,
      y: height - 535,
      width: width - 70,
      depth: 60,
    });
    createPracticeOutcomeControls(this, {
      session,
      onTryAgain: () => this.startPractice(),
      onExit: () => this.exit(),
    });
  }

  private showWinCeremony(
    winner: ReplayFighterRuntime,
    recap: BattleRecapPlan
  ): void {
    const { width, height } = this.scale;
    const usesVerdictCeremony = recap.finishPresentation === 'double-knockout';
    const canChooseRival =
      this.report.kind === 'exhibition' && this.isMine(winner.scribbit);
    const canBackContender = !getArena(this)?.myBackedScribbitId;
    this.time.delayedCall(260, () => {
      if (this.scene.isActive()) this.soundboard.play('win');
    });
    if (winner.sprite && !usesVerdictCeremony) {
      this.tweens.add({
        targets: winner.sprite.container,
        x: width / 2,
        y: height * 0.44,
        duration: this.reduceMotion ? 0 : 420,
        ease: 'Cubic.easeOut',
        onComplete: () => winner.sprite?.celebrate(),
      });
    }
    createBattleRecapCard(this, recap, {
      x: width / 2,
      y: height - (canChooseRival && canBackContender ? 455 : 405),
      width: width - 70,
      depth: 60,
    });
    // Only show a reward the server says this exact battle granted. Historical
    // replays and later practice wins must never imply a second payout.
    if (this.isMine(winner.scribbit) && (this.report.inkAwarded ?? 0) > 0) {
      floatReward(
        this,
        width / 2,
        height * 0.44,
        `Earned +${this.report.inkAwarded} 🫙`,
        UI.goldText,
        62
      );
    }

    if (!this.reduceMotion && !usesVerdictCeremony) {
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

    if (canChooseRival) {
      createPostFightSparringChoices(this, {
        x: width / 2,
        y: canBackContender ? height - 255 : height - 205,
        width: width - 200,
        onRivals: () => this.openRivalDraft(winner.scribbit),
        onPractice: () => this.startPractice(),
      }).setDepth(61);
    }
    if (canBackContender) {
      const next = button(
        this,
        width / 2,
        canChooseRival ? height - 145 : height - 210,
        '🎯 Back a contender tonight →',
        () => this.goBackEntrants(),
        width - 200,
        UI.gold,
        UI.ink
      );
      next.setDepth(61);
    }
    const back = ghostButton(
      this,
      width / 2,
      canChooseRival && canBackContender ? height - 55 : height - 96,
      this.returnButtonLabel(),
      () => this.exit(),
      320
    );
    back.setDepth(61);
  }

  // Loss flow — no dead ends. Lifespan remaining + a server-authored rival
  // draft + Back a contender tonight (deep-links to ArenaHome entrants).
  private showLossCard(
    mine: Scribbit,
    currentDay: number,
    recap: BattleRecapPlan
  ): void {
    const { width, height } = this.scale;
    const daysLeft = daysLeftFor(mine, currentDay);
    const card = stickerCard(this, width / 2, height / 2, width - 70, 760, {
      tapeColor: UI.tapeAlt,
    });
    card.setDepth(60).setScale(0.7);
    this.tweens.add({
      targets: card,
      scale: 1,
      duration: this.reduceMotion ? 0 : 300,
      ease: 'Back.easeOut',
    });

    const top = -380;
    const recapTop = top + 18;
    const recapHeight = addBattleRecapLines(this, card, recap, {
      top: recapTop,
      width: width - 110,
    });
    card.add(
      label(
        this,
        0,
        recapTop + recapHeight + 34,
        daysLeft > 0
          ? `Still has ${daysLeft} day${daysLeft === 1 ? '' : 's'} of life — plenty of time to bounce back.`
          : `This is ${mine.name}'s last day. Make it count.`,
        TYPE.body,
        UI.ink,
        true
      ).setWordWrapWidth(width - 150)
    );

    card.add(
      createPostFightSparringChoices(this, {
        x: 0,
        y: top + 400,
        width: width - 200,
        onRivals: () => this.openRivalDraft(mine),
        onPractice: () => this.startPractice(),
      })
    );
    card.add(
      button(
        this,
        0,
        top + 520,
        '🎯 Back a contender tonight →',
        () => this.goBackEntrants(),
        width - 200,
        UI.gold,
        UI.ink
      )
    );
    card.add(
      ghostButton(
        this,
        0,
        top + 630,
        this.returnButtonLabel(),
        () => this.exit(),
        width - 260
      )
    );
  }

  private returnButtonLabel(): string {
    return getReplayReturn(this) === 'Sketchbook'
      ? 'Open Legacy Book ›'
      : 'Back to Arena ›';
  }

  private startPractice(): void {
    if (this.report.kind !== 'practice') beginPracticeSession(this);
    fadeToScene(this, 'Draw', { mode: 'practice' });
  }

  private openRivalDraft(mine: Scribbit): void {
    if (this.rematchLoading || this.rivalDraft) return;
    this.rematchLoading = true;
    showToast('Pinning up three fair rivals…');
    void fetchSparRivals(mine.id)
      .then((result) => {
        if (!this.scene.isActive()) return;
        this.rematchLoading = false;
        if (!result.ok) {
          showToast(result.error);
          return;
        }
        if (
          result.data.challenger.id !== mine.id ||
          result.data.rivals.length === 0
        ) {
          showToast('The rival board came back blank. Try again.');
          return;
        }
        const arena = getArena(this);
        if (!arena) {
          showToast('The arena state is missing. Return and try again.');
          return;
        }
        this.rivalDraft = createSparRivalDraft(this, {
          challenger: result.data.challenger,
          rivals: result.data.rivals,
          forecast: arena.forecast,
          onChoose: (rival) => this.fightRival(mine, rival),
          onClose: () => {
            this.rivalDraft?.destroy();
            this.rivalDraft = null;
          },
        });
      })
      .catch(() => {
        if (!this.scene.isActive()) return;
        this.rematchLoading = false;
        showToast('The rival board fell down. Try again.');
      });
  }

  private fightRival(mine: Scribbit, rival: Scribbit): void {
    if (this.rematchLoading) return;
    this.rematchLoading = true;
    showToast(`${mine.name} challenges ${rival.name}…`);
    void spar(mine.id, rival.id)
      .then((result) => {
        if (!this.scene.isActive()) return;
        if (!result.ok) {
          this.rematchLoading = false;
          showToast(result.error);
          return;
        }
        setReplay(this, result.data, 'ArenaHome');
        this.scene.restart();
      })
      .catch(() => {
        if (!this.scene.isActive()) return;
        this.rematchLoading = false;
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
    const result = await fetchArena();
    if (result.ok) setArena(this, result.data);
    if (focusEntrants) setArenaFocus(this, 'entrants');
    fadeToScene(this, focusEntrants ? 'ArenaHome' : getReplayReturn(this));
  }
}
