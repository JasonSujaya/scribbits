import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  getReplay,
  getReplayReturn,
  getArena,
  setArena,
  setReplay,
  setArenaFocus,
} from '../lib/registry';
import { loadDrawing, levelOf } from '../lib/scribbits';
import {
  ELEMENT_STYLES,
  prefersReducedMotion,
  TYPE,
  UI,
} from '../lib/theme';
import { label, elementBadge, stickerCard, ghostButton, button, levelBadge, daysLeftFor, floatReward, fadeToScene } from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import { LiveSprite } from '../lib/livesprite';
import { getSignatureTrait, SIGNATURE_POWER } from '../lib/inkmesh';
import { fetchArena, spar } from '../lib/api';
import {
  calculateReplayFrame,
  getTimelineEventsInRange,
  getUsableBattleTranscript,
} from '../lib/continuousreplay';
import type { ReplayFrame, ReplayVector } from '../lib/continuousreplay';
import { showToast } from '@devvit/web/client';
import type { BattleEvent, BattleReport, Scribbit } from '../../shared/arena';
import type {
  BattleTimelineEvent,
  BattleTranscript,
  FixedVector,
  PrimaryPower,
} from '../../shared/combat';
import { getBattleMaxHp } from '../../shared/battle';

type Fighter = {
  scribbit: Scribbit;
  live: LiveSprite | null;
  homeX: number;
  homeY: number;
  offX: number; // walk-in / lunge base
  hpBar: Phaser.GameObjects.Rectangle;
  hpMax: number;
  hpDisplayed: number;
  facing: 1 | -1;
};

type ShapeEffect = {
  power: PrimaryPower;
  phase: 'telegraph' | 'active';
  startTick: number;
  endTick: number;
  aimDirection: FixedVector;
};

// Battle theater — the demo moment. On WebGL, each submitted PNG is a Phaser
// 4.2 Mesh2D Inkbody: 25 vertices breathe, telegraph its shape-powered move,
// ripple on impact, and fold on KO. Canvas retains the 3x3 slice fallback.
// Deterministic battle events own the result; Phaser makes the player's pixels
// perform it. Replay controls, cheering, mobile-safe particles, and clear
// outcomes keep the spectacle watchable rather than decorative.
export class Replay extends Scene {
  private report!: BattleReport;
  private fighterA!: Fighter;
  private fighterB!: Fighter;
  private announcer!: Phaser.GameObjects.Text;
  private eventIndex = 0;
  private playTimer: Phaser.Time.TimerEvent | null = null;
  private finished = false;
  private introBanner: Phaser.GameObjects.Text | null = null;
  private reduceMotion = false;

  // Hype meter (tap-to-cheer).
  private hype = 0; // 0..1
  private hypeBar: Phaser.GameObjects.Rectangle | null = null;
  private hypeMaxed = false;
  private announcerLoud = false;

  // Fast-forward: cycles 1x → 2x → 4x → 1x. Scales the scene clock + tweens so
  // the WHOLE spectacle speeds up uniformly, and persists across every beat.
  private static readonly SPEEDS = [1, 2, 4] as const;
  private speedIndex = 0;
  private speedButtonLabel: Phaser.GameObjects.Text | null = null;
  private fightersReady = false;
  private skipRequested = false;
  private signatureShown = new Set<'a' | 'b'>();
  private transcript: BattleTranscript | null = null;
  private continuousPlaybackActive = false;
  private playbackTick = 0;
  private previousPlaybackTick = -1;
  private combatEffects: Phaser.GameObjects.Graphics | null = null;
  private readonly shapeEffects = new Map<'a' | 'b', ShapeEffect>();

  constructor() {
    super('Replay');
  }

  init(): void {
    this.eventIndex = 0;
    this.playTimer = null;
    this.finished = false;
    this.hype = 0;
    this.hypeBar = null;
    this.hypeMaxed = false;
    this.announcerLoud = false;
    this.introBanner = null;
    this.reduceMotion = prefersReducedMotion();
    this.speedIndex = 0;
    this.speedButtonLabel = null;
    this.fightersReady = false;
    this.skipRequested = false;
    this.signatureShown.clear();
    this.transcript = null;
    this.continuousPlaybackActive = false;
    this.playbackTick = 0;
    this.previousPlaybackTick = -1;
    this.combatEffects = null;
    this.shapeEffects.clear();
  }

  // Current fast-forward multiplier.
  private get speed(): number {
    return Replay.SPEEDS[this.speedIndex] ?? 1;
  }

  // Apply the current speed to the scene clock + tweens. The finish() slow-mo
  // sets its own timeScale, so we only drive speed while the battle is playing.
  private applySpeed(): void {
    if (this.finished) return;
    // Continuous playback advances its own authoritative tick cursor. Scene
    // timers stay unscaled so speed is applied exactly once to that cursor.
    this.time.timeScale = this.continuousPlaybackActive ? 1 : this.speed;
    this.tweens.timeScale = this.speed;
  }

  private cycleSpeed(): void {
    this.speedIndex = (this.speedIndex + 1) % Replay.SPEEDS.length;
    this.speedButtonLabel?.setText(`${this.speed}× ⏩`);
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
      this.playTimer?.remove();
      this.continuousPlaybackActive = false;
      this.shapeEffects.clear();
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
    });

    void Promise.all([loadDrawing(this, report.a), loadDrawing(this, report.b)]).then(([keyA, keyB]) => {
      if (!this.scene.isActive() || this.finished) return;
      this.placeFighter('a', keyA);
      this.placeFighter('b', keyB);
      this.fightersReady = true;
      if (this.skipRequested) {
        this.skipToEnd();
        return;
      }
      this.playIntro();
    });
  }

  private buildArena(): void {
    const { width, height } = this.scale;
    this.drawArenaBackdrop();
    this.combatEffects = this.add.graphics().setDepth(7);

    this.drawPlatform(width * 0.26, height * 0.42 + 110);
    this.drawPlatform(width * 0.74, height * 0.42 + 110);

    this.fighterA = this.makeFighterSlot('a', width * 0.26, height * 0.42, false);
    this.fighterB = this.makeFighterSlot('b', width * 0.74, height * 0.42, true);

    // Announcer strip.
    const note = stickerCard(this, width / 2, height - 150, width - 40, 150, { gold: true, tapeColor: UI.tape });
    this.announcer = label(this, 0, 0, 'Get ready…', TYPE.title, UI.ink, true);
    this.announcer.setWordWrapWidth(width - 110);
    note.add(this.announcer);

    // Hype meter above the announcer — "TAP TO CHEER".
    this.buildHypeMeter(width / 2, height - 250);

    // Skip control (kept above everything).
    ghostButton(this, width - 100, 60, 'Skip ⏭', () => this.skipToEnd(), 160).setDepth(80);

    // Fast-forward control, left of Skip. Cycles 1×/2×/4× and persists for the
    // whole battle so an impatient viewer can speed through without skipping.
    const ffButton = ghostButton(this, width - 280, 60, `${this.speed}× ⏩`, () => this.cycleSpeed(), 150).setDepth(80);
    this.speedButtonLabel = ffButton.list[1] as Phaser.GameObjects.Text;

    // Taps are applause, not a hidden skip control. The timer owns battle pace;
    // speed and Skip remain explicit, so rapid cheering cannot overlap attacks.
    this.input.on('pointerdown', () => {
      this.addCheer();
    });

    const kindLabel = this.report.kind === 'exhibition'
      ? 'EXHIBITION SPAR'
      : this.report.kind === 'boss'
        ? 'CHAMPION CHALLENGE'
        : 'DAILY RUMBLE';
    label(this, 118, 60, kindLabel, TYPE.caption, UI.inkSoft, true).setDepth(80);
  }

  private buildHypeMeter(x: number, y: number): void {
    const width = this.scale.width - 120;
    label(this, x, y - 26, '👏 TAP TO CHEER', TYPE.caption, UI.goldText, true).setDepth(70);
    this.add
      .rectangle(x, y, width, 22, UI.inkHex, 0.16)
      .setStrokeStyle(3, UI.inkHex, 0.7)
      .setDepth(70);
    this.hypeBar = this.add
      .rectangle(x - width / 2 + 2, y, 2, 16, UI.coral, 1)
      .setOrigin(0, 0.5)
      .setDepth(71);
  }

  private addCheer(): void {
    if (this.finished || this.hypeMaxed) return;
    this.hype = Math.min(1, this.hype + 0.09);
    const width = this.scale.width - 120;
    if (this.hypeBar) {
      this.tweens.add({ targets: this.hypeBar, width: Math.max(2, (width - 4) * this.hype), duration: 120, ease: 'Quad.easeOut' });
    }
    // A small clap spark at the tap-friendly bottom center.
    const spark = label(this, this.scale.width / 2 + Phaser.Math.Between(-90, 90), this.scale.height - 300, '👏', 30).setDepth(72);
    this.tweens.add({ targets: spark, y: spark.y - 60, alpha: 0, duration: 500, onComplete: () => spark.destroy() });
    if (this.hype >= 1) this.onHypeMaxed();
  }

  private onHypeMaxed(): void {
    if (this.hypeMaxed) return;
    this.hypeMaxed = true;
    this.announcerLoud = true;
    if (this.hypeBar) this.hypeBar.setFillStyle(UI.gold, 1);
    this.confettiBurst();
    const shout = label(this, this.scale.width / 2, this.scale.height * 0.3, 'THE CROWD GOES WILD!', 40, UI.goldText, true).setDepth(75);
    shout.setStroke('#2b2016', 8).setScale(0);
    this.tweens.add({
      targets: shout,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 700,
      onComplete: () => shout.destroy(),
    });
  }

  private confettiBurst(): void {
    const { width } = this.scale;
    const emitter = this.add.particles(width / 2, -20, 'spark', {
      x: { min: 0, max: width },
      speedY: { min: 200, max: 460 },
      speedX: { min: -80, max: 80 },
      scale: { start: 0.6, end: 0 },
      lifespan: 1600,
      quantity: 2,
      frequency: 60,
      tint: [UI.gold, UI.coral, ELEMENT_STYLES.tide.particle, ELEMENT_STYLES.moss.particle],
    });
    emitter.setDepth(74);
    this.time.delayedCall(1200, () => emitter.destroy());
  }

  private drawArenaBackdrop(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0xf3e6cc, 1).setOrigin(0);
    const cx = width / 2;
    const cy = height * 0.44;
    const g = this.add.graphics();
    g.fillStyle(0xffe0a8, 0.5);
    g.fillEllipse(cx, height * 0.52, width * 0.9, height * 0.42);
    const tiers = [0.62, 0.74, 0.86, 0.98];
    tiers.forEach((scale, tierIndex) => {
      g.lineStyle(4, 0x6b5a42, 0.5 - tierIndex * 0.06);
      const rx = width * 0.5 * scale;
      const ry = height * 0.34 * scale;
      g.beginPath();
      const steps = 60;
      for (let step = 0; step <= steps; step += 1) {
        const t = Math.PI + (Math.PI * step) / steps;
        const jitter = (Math.random() - 0.5) * 4;
        const px = cx + Math.cos(t) * (rx + jitter);
        const py = cy + Math.sin(t) * (ry + jitter);
        if (step === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
    });
    for (let index = 0; index < 14; index += 1) {
      const t = Math.PI + (Math.PI * (index + 0.5)) / 14;
      const px = cx + Math.cos(t) * width * 0.46;
      const py = cy + Math.sin(t) * height * 0.31;
      g.fillStyle(0x6b5a42, 0.35);
      g.fillCircle(px, py, 7);
    }
  }

  private drawPlatform(x: number, y: number): void {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0xd8c19a, 0.9);
    g.fillEllipse(x, y, 200, 54);
    g.lineStyle(4, 0x6b5a42, 0.8);
    g.strokeEllipse(x, y, 200, 54);
  }

  private makeFighterSlot(side: 'a' | 'b', x: number, y: number, right: boolean): Fighter {
    const scribbit = side === 'a' ? this.report.a : this.report.b;
    // Keep fighter identity below the speed/skip controls so both names remain
    // readable in Reddit's narrow expanded view.
    const barY = 180;
    const barX = right ? this.scale.width - 320 : 40;

    const nameX = barX + (right ? 280 : 0);
    const nameLabel = label(this, nameX, barY - 44, scribbit.name, TYPE.body, UI.ink, true).setOrigin(right ? 1 : 0, 0.5);
    if (nameLabel.width > 250) nameLabel.setScale(250 / nameLabel.width);
    nameLabel.setInteractive({ useHandCursor: true });
    nameLabel.on('pointerup', (_p: unknown, _lx: unknown, _ly: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation?.();
      this.openIntroDetail(scribbit);
    });
    levelBadge(this, barX + (right ? 20 : 260), barY - 44, levelOf(scribbit), 0.52);

    this.add.rectangle(barX, barY, 280, 24, UI.inkHex, 0.16).setOrigin(0, 0.5).setStrokeStyle(2, UI.inkHex, 0.6);
    const hpBar = this.add
      .rectangle(barX + 2, barY, 276, 18, ELEMENT_STYLES[scribbit.element].primary, 1)
      .setOrigin(0, 0.5);
    elementBadge(this, barX + (right ? 240 : 40), barY + 40, scribbit.element, 0.6);
    const shapePower = SIGNATURE_POWER[getSignatureTrait(scribbit.stats)].name;
    label(
      this,
      barX + 140,
      barY + 75,
      `SHAPE: ${shapePower}`,
      TYPE.caption,
      ELEMENT_STYLES[scribbit.element].primaryText,
      true
    );

    const hpMax = getBattleMaxHp(scribbit.stats);
    return {
      scribbit,
      live: null,
      homeX: x,
      homeY: y,
      offX: x,
      hpBar,
      hpMax,
      hpDisplayed: hpMax,
      facing: right ? -1 : 1,
    };
  }

  private placeFighter(side: 'a' | 'b', textureKey: string): void {
    const fighter = side === 'a' ? this.fighterA : this.fighterB;
    const offStageX = fighter.facing === 1 ? -140 : this.scale.width + 140;
    const live = new LiveSprite(this, fighter.homeX, fighter.homeY, textureKey, {
      displaySize: 170,
      facing: fighter.facing,
      depth: 5,
      stats: fighter.scribbit.stats,
      reduceMotion: this.reduceMotion,
    });
    fighter.live = live;
    // Walk in from off-stage, then breathe.
    live.walkIn(offStageX, fighter.homeX, 620);
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
    const banner = label(this, width / 2, height / 2, 'FIGHT!', 90, UI.goldText, true).setScale(0).setDepth(60);
    banner.setStroke('#2b2016', 10);
    this.introBanner = banner;
    // Let the walk-in read for a beat before FIGHT!.
    this.time.delayedCall(700, () => {
      if (this.finished || !this.scene.isActive()) return;
      this.tweens.add({
        targets: banner,
        scale: 1,
        duration: 380,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 420,
        onComplete: () => {
          this.clearIntroBanner();
          if (!this.finished) {
            if (this.transcript) this.startContinuousReplay();
            else this.startEventLoop();
          }
        },
      });
      this.cameras.main.shake(180, 0.006);
    });
  }

  private clearIntroBanner(): void {
    this.introBanner?.destroy();
    this.introBanner = null;
  }

  private startEventLoop(): void {
    // Pace: aim for a full replay in the 15-25s band. Beat cadence adapts to the
    // number of events so short and long battles both land in range.
    const count = Math.max(1, this.report.events.length);
    const perBeat = Phaser.Math.Clamp(Math.round(19000 / count), 1200, 2100);
    this.playTimer = this.time.addEvent({ delay: perBeat, loop: true, callback: () => this.advance() });
    this.advance();
  }

  private startContinuousReplay(): void {
    if (!this.transcript) return;
    this.continuousPlaybackActive = true;
    this.playbackTick = 0;
    this.previousPlaybackTick = -1;
    this.applySpeed();
    const frame = calculateReplayFrame(this.transcript, 0);
    this.applyContinuousFrame(frame);
    for (const event of getTimelineEventsInRange(this.transcript, -1, 0)) {
      this.playContinuousEvent(event);
    }
    this.previousPlaybackTick = 0;
    this.drawContinuousEffects(frame);
  }

  override update(_time: number, deltaMilliseconds: number): void {
    if (
      !this.continuousPlaybackActive ||
      this.finished ||
      !this.transcript ||
      !this.fightersReady
    ) {
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
      this.playContinuousEvent(event);
    }
    this.playbackTick = nextTick;
    this.previousPlaybackTick = nextTick;
    this.drawContinuousEffects(frame);

    if (nextTick >= this.transcript.result.completedTick) {
      this.finish();
    }
  }

  private projectReplayVector(
    position: ReplayVector,
    frame: ReplayFrame
  ): { x: number; y: number } {
    const { width, height } = this.scale;
    const arenaTop = 280;
    const arenaBottom = Math.max(arenaTop + 260, height - 320);
    const centerY = (arenaTop + arenaBottom) / 2;
    const horizontalRadius = Math.max(150, width / 2 - 105);
    const verticalRadius = Math.max(120, (arenaBottom - arenaTop) / 2 - 70);
    return {
      x:
        width / 2 +
        (position.x / Math.max(1, frame.arenaHalfWidth)) * horizontalRadius,
      y:
        centerY +
        (position.y / Math.max(1, frame.arenaHalfHeight)) * verticalRadius,
    };
  }

  private applyContinuousFrame(frame: ReplayFrame): void {
    const fighterFrames = frame.fighters;
    const fighters = [this.fighterA, this.fighterB] as const;

    fighterFrames.forEach((fighterFrame, index) => {
      const fighter = fighters[index];
      if (!fighter) return;
      const screenPosition = this.projectReplayVector(fighterFrame.position, frame);
      fighter.homeX = screenPosition.x;
      fighter.homeY = screenPosition.y;
      fighter.live?.setPosition(screenPosition.x, screenPosition.y);
      this.setContinuousHitPoints(fighter, fighterFrame.hitPoints);
    });
  }

  private setContinuousHitPoints(fighter: Fighter, hitPoints: number): void {
    fighter.hpDisplayed = hitPoints;
    const ratio = fighter.hpMax > 0
      ? Phaser.Math.Clamp(hitPoints / fighter.hpMax, 0, 1)
      : 0;
    fighter.hpBar.width = 276 * ratio;
    fighter.hpBar.setFillStyle(
      ratio <= 0.28
        ? 0xe8555c
        : ELEMENT_STYLES[fighter.scribbit.element].primary,
      1
    );
  }

  private fighterForSlot(slot: 'a' | 'b'): Fighter {
    return slot === 'a' ? this.fighterA : this.fighterB;
  }

  private formatPowerName(power: PrimaryPower): string {
    if (power === 'inkquake') return 'Inkquake';
    if (power === 'nib_halo') return 'Nib Halo';
    if (power === 'smearstep') return 'Smearstep';
    return 'Colorburst';
  }

  private formatDamageSource(
    source: Extract<BattleTimelineEvent, { kind: 'damage' }>['source']
  ): string {
    if (source === 'colorburst_echo') return 'Colorburst Echo';
    if (source === 'ember_burn') return 'Ember afterburn';
    if (source === 'nib_wall_recoil') return 'recoiling nib';
    if (source === 'contact') return 'body check';
    return this.formatPowerName(source);
  }

  private playContinuousEvent(event: BattleTimelineEvent): void {
    if (event.kind === 'battle_started') {
      this.setAnnouncer('The server already knows the result. Now watch the ink fly!');
      return;
    }

    if (event.kind === 'ability_telegraphed') {
      const actor = this.fighterForSlot(event.actor);
      this.shapeEffects.set(event.actor, {
        power: event.power,
        phase: 'telegraph',
        startTick: event.tick,
        endTick: event.activatesAtTick,
        aimDirection: event.aimDirection,
      });
      this.telegraphShapePower(event.actor, actor);
      this.setAnnouncer(
        `${actor.scribbit.name} winds up ${this.formatPowerName(event.power)}!`
      );
      return;
    }

    if (event.kind === 'ability_activated') {
      const actor = this.fighterForSlot(event.actor);
      const existing = this.shapeEffects.get(event.actor);
      this.shapeEffects.set(event.actor, {
        power: event.power,
        phase: 'active',
        startTick: event.tick,
        endTick: event.activeUntilTick,
        aimDirection: existing?.aimDirection ?? {
          x: actor.facing * 1024,
          y: 0,
        },
      });
      this.shapePowerBurst(
        actor,
        ELEMENT_STYLES[actor.scribbit.element].particle
      );
      return;
    }

    if (event.kind === 'ability_finished') {
      const effect = this.shapeEffects.get(event.actor);
      if (effect?.power === event.power) this.shapeEffects.delete(event.actor);
      return;
    }

    if (event.kind === 'damage') {
      const attacker = this.fighterForSlot(event.sourceFighter);
      const target = this.fighterForSlot(event.targetFighter);
      this.cameraPunch(event.critical ? 0.017 : 0.009);
      target.live?.hitReact(
        Math.sign(target.homeX - attacker.homeX) || target.facing
      );
      this.impactBurst(
        target.homeX,
        target.homeY,
        ELEMENT_STYLES[target.scribbit.element].particle,
        event.critical
      );
      this.damagePop(target, event.amount, event.critical);
      this.setContinuousHitPoints(target, event.targetHitPoints);
      if (event.critical) this.critFlash();
      this.setAnnouncer(
        `${attacker.scribbit.name}'s ${this.formatDamageSource(event.source)} hits for ${event.amount}${event.critical ? ' — CRIT!' : '!'}`
      );
      return;
    }

    if (event.kind === 'barrier_created') {
      const actor = this.fighterForSlot(event.actor);
      this.setAnnouncer(`${actor.scribbit.name} grows a Moss paper shield.`);
      return;
    }

    if (event.kind === 'barrier_broken') {
      const actor = this.fighterForSlot(event.actor);
      this.setAnnouncer(`${actor.scribbit.name}'s paper shield tears open!`);
      return;
    }

    if (event.kind === 'nib_wall_ejection') {
      const actor = this.fighterForSlot(event.actor);
      this.setAnnouncer(`${actor.scribbit.name}'s wall nib snaps back!`);
      return;
    }

    if (event.kind === 'fighter_collision') {
      this.cameraPunch(0.006);
      return;
    }

    if (event.kind === 'arena_shrink_started') {
      this.setAnnouncer('The paper folds inward — nowhere left to hide!');
      return;
    }

    if (event.kind === 'late_fight_started') {
      this.setAnnouncer('SUDDEN SCRIBBLE! Powers recharge faster!');
      return;
    }

    if (event.kind === 'ink_pressure') {
      const actor = this.fighterForSlot(event.actor);
      this.setAnnouncer(`${actor.scribbit.name} surges with INK PRESSURE!`);
      actor.live?.telegraph();
    }
  }

  private drawContinuousEffects(frame: ReplayFrame): void {
    const graphics = this.combatEffects;
    if (!graphics) return;
    graphics.clear();

    const { width, height } = this.scale;
    const arenaTop = 280;
    const arenaBottom = Math.max(arenaTop + 260, height - 320);
    graphics.lineStyle(4, UI.inkHex, 0.32);
    graphics.strokeRoundedRect(
      78,
      arenaTop - 24,
      width - 156,
      arenaBottom - arenaTop + 48,
      46
    );

    const fighterFrames = frame.fighters;
    for (const [index, fighterFrame] of fighterFrames.entries()) {
      const slot = index === 0 ? 'a' : 'b';
      const fighter = this.fighterForSlot(slot);
      const style = ELEMENT_STYLES[fighter.scribbit.element];
      const center = this.projectReplayVector(fighterFrame.position, frame);

      if (fighterFrame.barrierHitPoints > 0) {
        graphics.lineStyle(7, ELEMENT_STYLES.moss.particle, 0.62);
        graphics.strokeCircle(center.x, center.y, 67);
      }

      if (fighterFrame.echoPosition) {
        const echo = this.projectReplayVector(fighterFrame.echoPosition, frame);
        graphics.fillStyle(style.particle, 0.22);
        graphics.fillCircle(echo.x, echo.y, 34);
        graphics.lineStyle(4, style.particle, 0.75);
        graphics.strokeCircle(echo.x, echo.y, 34);
      }

      const effect = this.shapeEffects.get(slot);
      if (!effect) continue;
      const duration = Math.max(1, effect.endTick - effect.startTick);
      const progress = Phaser.Math.Clamp(
        (frame.tick - effect.startTick) / duration,
        0,
        1
      );
      const alpha = effect.phase === 'telegraph' ? 0.35 + progress * 0.35 : 0.72;

      if (effect.power === 'inkquake') {
        const radius = effect.phase === 'telegraph' ? 42 : 35 + progress * 145;
        graphics.lineStyle(effect.phase === 'telegraph' ? 5 : 10, style.particle, alpha);
        graphics.strokeCircle(center.x, center.y, radius);
        continue;
      }

      if (effect.power === 'nib_halo') {
        const orbitRadius = effect.phase === 'telegraph' ? 48 : 76;
        for (let nibIndex = 0; nibIndex < 3; nibIndex += 1) {
          const angle = frame.tick * 0.22 + (Math.PI * 2 * nibIndex) / 3;
          const nibX = center.x + Math.cos(angle) * orbitRadius;
          const nibY = center.y + Math.sin(angle) * orbitRadius;
          graphics.lineStyle(8, style.particle, alpha);
          graphics.lineBetween(
            nibX - Math.cos(angle) * 16,
            nibY - Math.sin(angle) * 16,
            nibX + Math.cos(angle) * 20,
            nibY + Math.sin(angle) * 20
          );
          graphics.fillStyle(UI.inkHex, alpha);
          graphics.fillCircle(nibX, nibY, 6);
        }
        continue;
      }

      if (effect.power === 'smearstep') {
        const velocityLength = Math.max(
          1,
          Math.hypot(fighterFrame.velocity.x, fighterFrame.velocity.y)
        );
        const trailX = fighterFrame.velocity.x / velocityLength;
        const trailY = fighterFrame.velocity.y / velocityLength;
        for (let trailIndex = 1; trailIndex <= 3; trailIndex += 1) {
          graphics.fillStyle(style.particle, alpha / (trailIndex + 1));
          graphics.fillEllipse(
            center.x - trailX * trailIndex * 30,
            center.y - trailY * trailIndex * 30,
            70 - trailIndex * 10,
            42 - trailIndex * 5
          );
        }
        continue;
      }

      const aimLength = Math.max(
        1,
        Math.hypot(effect.aimDirection.x, effect.aimDirection.y)
      );
      const aimX = effect.aimDirection.x / aimLength;
      const aimY = effect.aimDirection.y / aimLength;
      const perpendicularX = -aimY;
      const perpendicularY = aimX;
      const range = effect.phase === 'telegraph' ? 100 : 155;
      const halfWidth = effect.phase === 'telegraph' ? 42 : 78;
      graphics.fillStyle(style.particle, effect.phase === 'telegraph' ? 0.18 : 0.3);
      graphics.fillTriangle(
        center.x,
        center.y,
        center.x + aimX * range + perpendicularX * halfWidth,
        center.y + aimY * range + perpendicularY * halfWidth,
        center.x + aimX * range - perpendicularX * halfWidth,
        center.y + aimY * range - perpendicularY * halfWidth
      );
      graphics.lineStyle(5, style.particle, alpha);
      graphics.lineBetween(
        center.x,
        center.y,
        center.x + aimX * range,
        center.y + aimY * range
      );
    }
  }

  private advance(): void {
    if (this.finished) return;
    if (this.eventIndex >= this.report.events.length) {
      this.finish();
      return;
    }
    const event = this.report.events[this.eventIndex];
    this.eventIndex += 1;
    if (!event) return;
    this.playEvent(event);
    if (event.type === 'faint') this.finish();
  }

  private playEvent(event: BattleEvent): void {
    this.setAnnouncer(event.text);

    const actor = event.actor === 'a' ? this.fighterA : this.fighterB;
    const target = event.actor === 'a' ? this.fighterB : this.fighterA;

    switch (event.type) {
      case 'move':
        this.telegraphShapePower(event.actor, actor);
        break;
      case 'hit':
        void this.attack(actor, target, event, false);
        break;
      case 'crit':
        void this.attack(actor, target, event, true);
        break;
      case 'miss':
        void this.attackMiss(actor, target, event);
        break;
      case 'weather':
        this.weatherMoment(actor.scribbit.element);
        this.syncHp(event);
        break;
      case 'faint':
        this.syncHp(event);
        if (event.hpA <= 0) this.fighterA.live?.crumple();
        if (event.hpB <= 0) this.fighterB.live?.crumple();
        break;
      case 'intro':
      default:
        this.syncHp(event);
        break;
    }
  }

  private telegraphShapePower(side: 'a' | 'b', actor: Fighter): void {
    actor.live?.telegraph();
    if (!actor.live) return;

    const firstReveal = !this.signatureShown.has(side);
    this.signatureShown.add(side);
    const style = ELEMENT_STYLES[actor.scribbit.element];
    const powerText = firstReveal
      ? `SHAPE POWER\n${actor.live.shapePower}`
      : actor.live.shapePower;
    const callout = label(
      this,
      actor.homeX,
      actor.homeY - 165,
      powerText,
      firstReveal ? 34 : TYPE.caption,
      style.primaryText,
      true
    ).setDepth(30).setScale(0);
    callout.setStroke('#fff7e8', firstReveal ? 9 : 6);
    this.tweens.add({
      targets: callout,
      scale: 1,
      y: callout.y - 18,
      duration: this.reduceMotion ? 80 : 220,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: firstReveal ? 520 : 220,
      onComplete: () => callout.destroy(),
    });
    this.shapePowerBurst(actor, style.particle);
  }

  private shapePowerBurst(actor: Fighter, tint: number): void {
    if (this.reduceMotion) return;
    const burst = this.add.particles(actor.homeX, actor.homeY, 'dot', {
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

  private setAnnouncer(text: string): void {
    this.announcer.setText(this.announcerLoud ? text.toUpperCase() : text);
    this.tweens.add({ targets: this.announcer, scale: this.announcerLoud ? 1.12 : 1.06, duration: 120, yoyo: true });
  }

  private async attack(actor: Fighter, target: Fighter, event: BattleEvent, crit: boolean): Promise<void> {
    if (!actor.live) return;
    await actor.live.anticipate();
    if (this.finished || !this.scene.isActive()) return;
    actor.live.lunge(actor.homeX, target.homeX, () => {
      if (this.finished) return;
      // Impact moment.
      this.cameraPunch(crit ? 0.02 : 0.012);
      target.live?.hitReact(Math.sign(target.homeX - actor.homeX) || target.facing);
      this.impactBurst(target.homeX, target.homeY, ELEMENT_STYLES[target.scribbit.element].particle, crit);
      if (crit) this.critFlash();
      if (event.damage && event.damage > 0) this.damagePop(target, event.damage, crit);
      this.syncHp(event);
    });
  }

  private async attackMiss(actor: Fighter, target: Fighter, event: BattleEvent): Promise<void> {
    if (!actor.live) return;
    await actor.live.anticipate();
    if (this.finished || !this.scene.isActive()) return;
    actor.live.lunge(actor.homeX, target.homeX, () => {
      if (this.finished) return;
      this.missPuff(target);
      this.syncHp(event);
    });
  }

  // Camera punch-in: a quick zoom toward the struck fighter, then ease back.
  private cameraPunch(shakeIntensity: number): void {
    if (!this.reduceMotion) this.cameras.main.shake(200, shakeIntensity);
  }

  private syncHp(event: BattleEvent): void {
    this.chunkDrain(this.fighterA, event.hpA);
    this.chunkDrain(this.fighterB, event.hpB);
  }

  // Chunk-then-drain: a fast "chunk" ghost drop, then a slower drain to target,
  // so a big hit reads as a satisfying two-stage bite out of the bar.
  private chunkDrain(fighter: Fighter, hp: number): void {
    const ratio = fighter.hpMax > 0 ? Math.max(0, Math.min(1, hp / fighter.hpMax)) : 0;
    const targetW = Math.max(0, 276 * ratio);
    if (targetW >= fighter.hpBar.width - 0.5) {
      fighter.hpBar.width = targetW;
      return;
    }
    // Chunk: snap partway fast.
    const midW = fighter.hpBar.width + (targetW - fighter.hpBar.width) * 0.6;
    this.tweens.add({
      targets: fighter.hpBar,
      width: midW,
      duration: 90,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: fighter.hpBar, width: targetW, duration: 420, ease: 'Cubic.easeOut' });
      },
    });
    // Low-HP bar turns red.
    if (ratio <= 0.28) fighter.hpBar.setFillStyle(0xe8555c, 1);
  }

  private impactBurst(x: number, y: number, tint: number, big: boolean): void {
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

  private damagePop(target: Fighter, damage: number, crit: boolean): void {
    const text = label(
      this,
      target.homeX,
      target.homeY - 80,
      crit ? `${damage}!` : String(damage),
      crit ? 60 : 42,
      crit ? '#ffd447' : '#ff5a3d',
      true
    ).setDepth(20);
    text.setStroke('#2b2016', crit ? 7 : 5);
    this.tweens.add({
      targets: text,
      y: target.homeY - 160,
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
    this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
  }

  private missPuff(target: Fighter): void {
    const puff = label(this, target.homeX, target.homeY - 70, 'miss', 32, UI.inkSoft, true).setDepth(20);
    this.tweens.add({ targets: puff, y: target.homeY - 130, alpha: 0, duration: 700, onComplete: () => puff.destroy() });
  }

  private weatherMoment(element: Scribbit['element']): void {
    const { width, height } = this.scale;
    const style = ELEMENT_STYLES[element];
    const wash = this.add.rectangle(0, 0, width, height, style.primary, 0).setOrigin(0).setDepth(25);
    this.tweens.add({ targets: wash, alpha: 0.4, duration: 240, yoyo: true, onComplete: () => wash.destroy() });
    const glyph = label(this, width / 2, height / 2, style.emoji, 120, '#ffffff').setDepth(26).setAlpha(0);
    this.tweens.add({ targets: glyph, alpha: 1, scale: 1.4, duration: 300, yoyo: true, hold: 200, onComplete: () => glyph.destroy() });
    const emitter = this.add.particles(width / 2, -20, 'dot', {
      x: { min: 0, max: width },
      speedY: { min: 200, max: 420 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1200,
      quantity: 2,
      frequency: 80,
      tint: style.particle,
    });
    emitter.setDepth(24);
    this.time.delayedCall(1000, () => emitter.destroy());
  }

  private skipToEnd(): void {
    if (this.finished) return;
    if (!this.fightersReady) {
      this.skipRequested = true;
      this.announcer?.setText('Loading both drawings before the result…');
      return;
    }
    this.playTimer?.remove();
    this.continuousPlaybackActive = false;
    this.shapeEffects.clear();
    this.combatEffects?.clear();
    this.clearIntroBanner();
    if (this.transcript) {
      this.applyContinuousFrame(
        calculateReplayFrame(this.transcript, this.transcript.result.completedTick)
      );
    } else {
      const last = this.report.events[this.report.events.length - 1];
      if (last) {
        this.fighterA.hpBar.width = Math.max(0, 276 * Math.max(0, Math.min(1, last.hpA / this.fighterA.hpMax)));
        this.fighterB.hpBar.width = Math.max(0, 276 * Math.max(0, Math.min(1, last.hpB / this.fighterB.hpMax)));
      }
    }
    this.eventIndex = this.report.events.length;
    this.finish();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.continuousPlaybackActive = false;
    this.shapeEffects.clear();
    this.combatEffects?.clear();
    this.playTimer?.remove();
    this.clearIntroBanner();

    const winner = this.report.winner === 'a' ? this.fighterA : this.fighterB;
    const loser = this.report.winner === 'a' ? this.fighterB : this.fighterA;

    // Slow the scene clock for the final fold, then show the outcome.
    this.time.timeScale = this.reduceMotion ? 1 : 0.35;
    this.tweens.timeScale = this.reduceMotion ? 1 : 0.35;

    loser.live?.crumple(() => {
      this.impactBurst(loser.homeX, loser.homeY + 30, 0xcbb79a, true);
    });

    // Resume normal speed and frame the ceremony after the dramatic beat.
    this.time.delayedCall(this.reduceMotion ? 300 : 900, () => {
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this.showOutcome(winner, loser);
    });
  }

  private showOutcome(winner: Fighter, loser: Fighter): void {
    const arena = getArena(this);
    const myLoss = this.isMine(loser.scribbit) && !this.isMine(winner.scribbit);
    if (myLoss && arena) {
      this.showLossCard(loser.scribbit, arena.dayNumber);
    } else {
      this.showWinCeremony(winner);
    }
  }

  private isMine(scribbit: Scribbit): boolean {
    return getArena(this)?.myScribbits.some((one) => one.id === scribbit.id) ?? false;
  }

  private showWinCeremony(winner: Fighter): void {
    const { width, height } = this.scale;
    const banner = label(this, width / 2, height * 0.32, `${winner.scribbit.name} WINS!`, 56, UI.goldText, true)
      .setScale(0)
      .setDepth(60);
    banner.setStroke('#2b2016', 9);
    this.tweens.add({ targets: banner, scale: 1, duration: 500, ease: 'Back.easeOut' });
    winner.live?.celebrate();

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

    if (!getArena(this)?.myBackedScribbitId) {
      const next = button(
        this,
        width / 2,
        height - 210,
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
      height - 96,
      'Back to Arena ›',
      () => this.exit(),
      320
    );
    back.setDepth(61);
  }

  // Loss flow — no dead ends. Lifespan remaining + REMATCH (spar) + Back a
  // contender tonight (deep-links to the entrants gallery on ArenaHome).
  private showLossCard(mine: Scribbit, currentDay: number): void {
    const { width, height } = this.scale;
    const daysLeft = daysLeftFor(mine, currentDay);
    const card = stickerCard(this, width / 2, height / 2, width - 70, 640, { tapeColor: UI.tapeAlt });
    card.setDepth(60).setScale(0.7);
    this.tweens.add({ targets: card, scale: 1, duration: 300, ease: 'Back.easeOut' });

    const top = -320;
    card.add(label(this, 0, top + 50, '💢 DEFEATED', 44, UI.ink, true));
    card.add(label(this, 0, top + 110, `${mine.name} fought hard.`, TYPE.title, UI.inkSoft, true));
    card.add(
      label(
        this,
        0,
        top + 170,
        daysLeft > 0
          ? `Still has ${daysLeft} day${daysLeft === 1 ? '' : 's'} of life — plenty of time to bounce back.`
          : `This is ${mine.name}'s last day. Make it count.`,
        TYPE.body,
        UI.ink,
        true
      ).setWordWrapWidth(width - 150)
    );

    card.add(
      button(this, 0, top + 280, '🥊 REMATCH (spar)', () => this.rematch(mine), width - 200, UI.coralDeep)
    );
    card.add(
      button(
        this,
        0,
        top + 400,
        '🎯 Back a contender tonight →',
        () => this.goBackEntrants(),
        width - 200,
        UI.gold,
        UI.ink
      )
    );
    card.add(ghostButton(this, 0, top + 510, 'Back to Arena', () => this.exit(), width - 260));
  }

  private rematch(mine: Scribbit): void {
    showToast(`${mine.name} steps up for a rematch…`);
    void spar(mine.id).then((result) => {
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setReplay(this, result.data, 'ArenaHome');
      this.scene.restart();
    });
  }

  private goBackEntrants(): void {
    void this.refreshArenaAndLeave(true);
  }

  private exit(): void {
    void this.refreshArenaAndLeave(false);
  }

  private async refreshArenaAndLeave(focusEntrants: boolean): Promise<void> {
    const result = await fetchArena();
    if (result.ok) setArena(this, result.data);
    if (focusEntrants) setArenaFocus(this, 'entrants');
    fadeToScene(this, focusEntrants ? 'ArenaHome' : getReplayReturn(this));
  }
}
