import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { getReplay, getReplayReturn } from '../lib/registry';
import { loadDrawing } from '../lib/scribbits';
import { ELEMENT_STYLES, UI } from '../lib/theme';
import { label, elementBadge, paperCard, roundedPanel, ghostButton } from '../lib/ui';
import type { BattleEvent, BattleReport, Scribbit } from '../../shared/arena';
import { getBattleMaxHp } from '../../shared/battle';

type Fighter = {
  scribbit: Scribbit;
  sprite: Phaser.GameObjects.Image | null;
  homeX: number;
  homeY: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpMax: number;
};

// Battle theater. Plays a BattleReport's events with juicy tweens: lunges,
// damage pops, crit flashes, weather moments, HP drains, faints, and a winner
// ceremony. ~20s total; tap advances to the next beat, or skip to the end.
export class Replay extends Scene {
  private report!: BattleReport;
  private fighterA!: Fighter;
  private fighterB!: Fighter;
  private announcer!: Phaser.GameObjects.Text;
  private eventIndex = 0;
  private playTimer: Phaser.Time.TimerEvent | null = null;
  private finished = false;
  private introBanner: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Replay');
  }

  init(): void {
    this.eventIndex = 0;
    this.playTimer = null;
    this.finished = false;
  }

  create(): void {
    const report = getReplay(this);
    if (!report) {
      this.scene.start('ArenaHome');
      return;
    }
    this.report = report;
    this.cameras.main.setBackgroundColor('#1a1320');
    this.buildArena();

    this.events.once('shutdown', () => this.playTimer?.remove());

    // Load both drawings, then run the intro banners → event loop.
    void Promise.all([
      loadDrawing(this, report.a),
      loadDrawing(this, report.b),
    ]).then(([keyA, keyB]) => {
      if (!this.scene.isActive()) return;
      this.placeFighter('a', keyA);
      this.placeFighter('b', keyB);
      this.playIntro();
    });
  }

  private buildArena(): void {
    const { width, height } = this.scale;
    // Arena floor gradient.
    this.add.rectangle(0, 0, width, height, 0x2a1f3a, 1).setOrigin(0);
    this.add.ellipse(width / 2, height * 0.62, width * 1.2, height * 0.5, 0x3a2b52, 1);

    // HP bars up top for both fighters.
    this.fighterA = this.makeFighterSlot('a', width * 0.28, height * 0.42, false);
    this.fighterB = this.makeFighterSlot('b', width * 0.72, height * 0.42, true);

    // Announcer strip along the bottom.
    roundedPanel(this, width / 2, height - 120, width - 40, 150, 0x2b2016, UI.gold);
    this.announcer = label(this, width / 2, height - 120, '', 28, UI.cream, true);
    this.announcer.setWordWrapWidth(width - 90);

    // Skip control.
    ghostButton(this, width - 90, 60, 'Skip ⏭', () => this.skipToEnd(), 150).setDepth(50);
    this.input.on('pointerdown', () => this.advance());
  }

  private makeFighterSlot(side: 'a' | 'b', x: number, y: number, right: boolean): Fighter {
    const scribbit = side === 'a' ? this.report.a : this.report.b;
    const barY = 120;
    const barX = right ? this.scale.width - 320 : 40;

    label(this, barX + (right ? 280 : 0), barY - 40, scribbit.name, 24, UI.cream, true)
      .setOrigin(right ? 1 : 0, 0.5);
    this.add
      .rectangle(barX, barY, 280, 24, UI.progressTrack, 0.4)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.3);
    const hpBar = this.add
      .rectangle(barX + 2, barY, 276, 18, ELEMENT_STYLES[scribbit.element].primary, 1)
      .setOrigin(0, 0.5);
    elementBadge(this, barX + (right ? 240 : 40), barY + 40, scribbit.element, 0.6);

    return {
      scribbit,
      sprite: null,
      homeX: x,
      homeY: y,
      hpBar,
      hpMax: getBattleMaxHp(scribbit.stats),
    };
  }

  private placeFighter(side: 'a' | 'b', textureKey: string): void {
    const fighter = side === 'a' ? this.fighterA : this.fighterB;
    paperCard(this, fighter.homeX, fighter.homeY, 190, 190);
    const sprite = this.add.image(fighter.homeX, fighter.homeY, textureKey).setDisplaySize(160, 160).setDepth(5);
    fighter.sprite = sprite;
    // Idle wobble.
    this.tweens.add({
      targets: sprite,
      angle: side === 'a' ? 3 : -3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Intro banners slide in, then the event loop begins.
  private playIntro(): void {
    const { width, height } = this.scale;
    const banner = label(this, width / 2, height / 2, 'FIGHT!', 80, UI.goldText, true).setScale(0).setDepth(60);
    this.introBanner = banner;
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 500,
      onComplete: () => {
        this.clearIntroBanner();
        if (!this.finished) this.startEventLoop();
      },
    });
  }

  private clearIntroBanner(): void {
    this.introBanner?.destroy();
    this.introBanner = null;
  }

  private startEventLoop(): void {
    // Auto-advance every ~1.6s; a tap advances immediately.
    this.playTimer = this.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => this.advance(),
    });
    this.advance();
  }

  // Play the next event (or the winner ceremony if we've run out).
  private advance(): void {
    if (this.finished) return;
    if (this.eventIndex >= this.report.events.length) {
      this.finish();
      return;
    }
    const event = this.report.events[this.eventIndex];
    this.eventIndex += 1;
    if (event) this.playEvent(event);
  }

  private playEvent(event: BattleEvent): void {
    this.announcer.setText(event.text);
    this.tweens.add({ targets: this.announcer, scale: 1.06, duration: 120, yoyo: true });

    // Sync HP bars from running totals.
    this.setHp(this.fighterA, event.hpA);
    this.setHp(this.fighterB, event.hpB);

    const actor = event.actor === 'a' ? this.fighterA : this.fighterB;
    const target = event.actor === 'a' ? this.fighterB : this.fighterA;

    switch (event.type) {
      case 'move':
      case 'hit':
        this.lunge(actor, target);
        if (event.damage && event.damage > 0) this.damagePop(target, event.damage, false);
        break;
      case 'crit':
        this.lunge(actor, target);
        this.critFlash();
        if (event.damage) this.damagePop(target, event.damage, true);
        break;
      case 'miss':
        this.lunge(actor, target);
        this.missPuff(target);
        break;
      case 'weather':
        this.weatherMoment(actor.scribbit.element);
        break;
      case 'faint':
        // Topple whichever fighter's running HP has hit zero.
        if (event.hpA <= 0) this.faint(this.fighterA);
        if (event.hpB <= 0) this.faint(this.fighterB);
        break;
      case 'intro':
      default:
        break;
    }
  }

  private setHp(fighter: Fighter, hp: number): void {
    const ratio = fighter.hpMax > 0 ? Math.max(0, Math.min(1, hp / fighter.hpMax)) : 0;
    this.tweens.add({
      targets: fighter.hpBar,
      width: Math.max(0, 276 * ratio),
      duration: 400,
      ease: 'Cubic.easeOut',
    });
  }

  private lunge(actor: Fighter, target: Fighter): void {
    if (!actor.sprite) return;
    const dir = target.homeX > actor.homeX ? 1 : -1;
    this.tweens.add({
      targets: actor.sprite,
      x: actor.homeX + dir * 90,
      scaleX: (actor.sprite.scaleX || 1) * 1.15,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeOut',
      onYoyo: () => this.impactShake(target),
    });
  }

  private impactShake(target: Fighter): void {
    if (!target.sprite) return;
    this.tweens.add({
      targets: target.sprite,
      x: target.homeX + Phaser.Math.Between(-14, 14),
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => target.sprite?.setX(target.homeX),
    });
    this.impactBurst(target.homeX, target.homeY, ELEMENT_STYLES[target.scribbit.element].particle);
  }

  private impactBurst(x: number, y: number, tint: number): void {
    const emitter = this.add.particles(x, y, 'dot', {
      speed: { min: 80, max: 220 },
      scale: { start: 0.6, end: 0 },
      lifespan: 400,
      quantity: 12,
      tint,
      emitting: false,
    });
    emitter.setDepth(9);
    emitter.explode(12);
    this.time.delayedCall(600, () => emitter.destroy());
  }

  private damagePop(target: Fighter, damage: number, crit: boolean): void {
    const text = label(
      this,
      target.homeX,
      target.homeY - 70,
      crit ? `${damage}!` : String(damage),
      crit ? 56 : 40,
      crit ? '#ffd447' : '#ff5a3d',
      true
    ).setDepth(20);
    this.tweens.add({
      targets: text,
      y: target.homeY - 150,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private critFlash(): void {
    const { width, height } = this.scale;
    const flash = this.add.rectangle(0, 0, width, height, 0xffffff, 0.7).setOrigin(0).setDepth(30);
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
    this.cameras.main.shake(260, 0.014);
  }

  private missPuff(target: Fighter): void {
    const puff = label(this, target.homeX, target.homeY - 60, 'miss', 30, '#c9b79a', true).setDepth(20);
    this.tweens.add({
      targets: puff,
      y: target.homeY - 120,
      alpha: 0,
      duration: 700,
      onComplete: () => puff.destroy(),
    });
  }

  // Full-screen element FX moment when the forecast modifier fires.
  private weatherMoment(element: Scribbit['element']): void {
    const { width, height } = this.scale;
    const style = ELEMENT_STYLES[element];
    const wash = this.add.rectangle(0, 0, width, height, style.primary, 0).setOrigin(0).setDepth(25);
    this.tweens.add({ targets: wash, alpha: 0.4, duration: 240, yoyo: true, onComplete: () => wash.destroy() });

    const glyph = label(this, width / 2, height / 2, style.emoji, 120, '#ffffff').setDepth(26).setAlpha(0);
    this.tweens.add({
      targets: glyph,
      alpha: 1,
      scale: 1.4,
      duration: 300,
      yoyo: true,
      hold: 200,
      onComplete: () => glyph.destroy(),
    });

    const emitter = this.add.particles(width / 2, -20, 'dot', {
      x: { min: 0, max: width },
      speedY: { min: 200, max: 420 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1200,
      quantity: 4,
      frequency: 40,
      tint: style.particle,
    });
    emitter.setDepth(24);
    this.time.delayedCall(1000, () => emitter.destroy());
  }

  private faint(fighter: Fighter): void {
    if (!fighter.sprite) return;
    this.tweens.add({
      targets: fighter.sprite,
      angle: 90,
      y: fighter.homeY + 60,
      alpha: 0.5,
      duration: 600,
      ease: 'Bounce.easeOut',
    });
    this.impactBurst(fighter.homeX, fighter.homeY + 40, 0xcbb79a);
  }

  private skipToEnd(): void {
    if (this.finished) return;
    this.playTimer?.remove();
    this.clearIntroBanner();
    // Apply final HP + faint state instantly, then ceremony.
    const last = this.report.events[this.report.events.length - 1];
    if (last) {
      this.setHp(this.fighterA, last.hpA);
      this.setHp(this.fighterB, last.hpB);
    }
    this.eventIndex = this.report.events.length;
    this.finish();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.playTimer?.remove();
    this.clearIntroBanner();

    const winner = this.report.winner === 'a' ? this.fighterA : this.fighterB;
    const loser = this.report.winner === 'a' ? this.fighterB : this.fighterA;
    this.faint(loser);

    const { width, height } = this.scale;
    const banner = label(this, width / 2, height / 2, `${winner.scribbit.name} WINS!`, 52, UI.goldText, true)
      .setScale(0)
      .setDepth(60);
    this.tweens.add({ targets: banner, scale: 1, duration: 500, ease: 'Back.easeOut' });
    if (winner.sprite) {
      this.tweens.add({ targets: winner.sprite, y: winner.homeY - 30, scale: (winner.sprite.scale || 1) * 1.1, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const emitter = this.add.particles(width / 2, height * 0.35, 'spark', {
      speed: { min: 100, max: 300 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1400,
      quantity: 3,
      frequency: 120,
      tint: [UI.gold, ELEMENT_STYLES[winner.scribbit.element].particle],
    });
    emitter.setDepth(55);

    const back = ghostButton(this, width / 2, height - 90, 'Back to Arena ›', () => {
      this.scene.start(getReplayReturn(this));
    }, 320);
    back.setDepth(61);
  }
}
