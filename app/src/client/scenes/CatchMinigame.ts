import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { fetchCatchParams, submitCatch } from '../lib/api';
import { FONT_STACK, RARITY_STYLES, UI } from '../lib/theme';
import { label, roundedPanel } from '../lib/ui';
import type {
  ActiveSpawn,
  CatchParams,
  Species,
  WildsState,
} from '../../shared/remonsta';

const START_RADIUS = 100; // contract: focus ring shrinks 100 -> 0
const VISUAL_SCALE = 2.4; // pixels per radius unit for on-screen ring

// The catch minigame. A focus ring shrinks from radius 100 to 0 over
// durationMs. The player taps while the ring radius is within [sweetMin,
// sweetMax] — the translucent sweet band — tapsRequired times. Tap timestamps
// (ms since start) are recorded and POSTed for server-side replay validation.
export class CatchMinigame extends Scene {
  private spawn!: ActiveSpawn;
  private species!: Species;
  private params: CatchParams | null = null;

  private startTime = 0;
  private running = false;
  private tapTimesMs: number[] = [];
  private hitCount = 0;

  private ring: Phaser.GameObjects.Arc | null = null;
  private sweetBand: Phaser.GameObjects.Graphics | null = null;
  private centerX = 0;
  private centerY = 0;
  private progressPips: Phaser.GameObjects.Arc[] = [];
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('CatchMinigame');
  }

  init(): void {
    this.params = null;
    this.startTime = 0;
    this.running = false;
    this.tapTimesMs = [];
    this.hitCount = 0;
    this.ring = null;
    this.sweetBand = null;
    this.progressPips = [];
    this.statusText = null;
  }

  create(): void {
    const spawn = this.registry.get('activeSpawn') as ActiveSpawn | undefined;
    const wilds = this.registry.get('wilds') as WildsState | undefined;
    if (!spawn || !wilds) {
      this.scene.start('Habitat');
      return;
    }
    this.spawn = spawn;
    const species = wilds.species.find((s) => s.id === spawn.speciesId);
    if (!species) {
      this.scene.start('Habitat');
      return;
    }
    this.species = species;

    const { width, height } = this.scale;
    this.centerX = width / 2;
    this.centerY = height * 0.46;

    this.cameras.main.setBackgroundColor('#241b2e');
    this.drawFrame();
    void this.loadParams();
  }

  private drawFrame(): void {
    const { width, height } = this.scale;

    // Rarity chip + artist chip.
    const rarity = RARITY_STYLES[this.species.rarity];
    roundedPanel(this, 130, 70, 200, 70, UI.panel);
    label(this, 130, 70, rarity.label, 26, UI.ink, true);

    roundedPanel(this, width - 150, 70, 260, 70, UI.panel);
    label(this, width - 150, 70, `by u/${this.species.artist}`, 22, UI.inkSoft, true);

    // Creature at center (behind ring), gently breathing.
    const creature = this.add.image(this.centerX, this.centerY, this.species.spriteKey).setDepth(1);
    this.tweens.add({
      targets: creature,
      scale: 1.05,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.statusText = this.add
      .text(this.centerX, height * 0.8, 'Get ready…', {
        fontFamily: FONT_STACK,
        fontSize: '32px',
        color: UI.cream,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Bail-out button.
    label(this, width - 70, height - 50, '✕', 40, UI.cream, true)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Habitat'));
  }

  private async loadParams(): Promise<void> {
    const result = await fetchCatchParams(this.spawn.spawnId);
    if (!result.ok) {
      showToast(result.error);
      this.statusText?.setText('Could not start. Tap ✕ to go back.');
      this.showRetry();
      return;
    }
    this.params = result.data;
    this.beginRound();
  }

  private showRetry(): void {
    const { height } = this.scale;
    const retry = label(this, this.centerX, height * 0.72, '↻ Retry', 32, '#ffffff', true);
    retry
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        retry.destroy();
        this.statusText?.setText('Get ready…');
        void this.loadParams();
      });
  }

  private beginRound(): void {
    if (!this.params) return;
    const params = this.params;

    // Draw sweet band as a translucent ring between sweetMin..sweetMax.
    this.sweetBand = this.add.graphics().setDepth(2);
    this.sweetBand.fillStyle(0x7ed957, 0.22);
    this.sweetBand.fillCircle(this.centerX, this.centerY, params.sweetMax * VISUAL_SCALE);
    this.sweetBand.fillStyle(0x241b2e, 1);
    this.sweetBand.fillCircle(this.centerX, this.centerY, params.sweetMin * VISUAL_SCALE);
    // Re-punch: use blend by drawing creature above; simpler — outline the band.
    this.sweetBand.lineStyle(3, 0x7ed957, 0.9);
    this.sweetBand.strokeCircle(this.centerX, this.centerY, params.sweetMax * VISUAL_SCALE);
    this.sweetBand.strokeCircle(this.centerX, this.centerY, params.sweetMin * VISUAL_SCALE);

    // The shrinking focus ring.
    this.ring = this.add
      .circle(this.centerX, this.centerY, START_RADIUS * VISUAL_SCALE)
      .setStrokeStyle(8, 0xffffff, 1)
      .setDepth(3);
    this.ring.setFillStyle(0xffffff, 0);

    // Progress pips (one per required tap).
    const pipY = this.scale.height * 0.87;
    const gap = 46;
    const startX = this.centerX - ((params.tapsRequired - 1) * gap) / 2;
    for (let index = 0; index < params.tapsRequired; index += 1) {
      const pip = this.add
        .circle(startX + index * gap, pipY, 14, 0xffffff, 0.25)
        .setStrokeStyle(3, 0xffffff, 0.7)
        .setDepth(5);
      this.progressPips.push(pip);
    }

    this.statusText?.setText('Tap in the green!');
    this.startTime = this.time.now;
    this.running = true;

    // Full-screen tap capture.
    this.input.on('pointerdown', this.onTap, this);
  }

  override update(): void {
    if (!this.running || !this.params || !this.ring) return;
    const elapsed = this.time.now - this.startTime;
    const t = Phaser.Math.Clamp(elapsed / this.params.durationMs, 0, 1);
    const radius = START_RADIUS * (1 - t);
    this.ring.setRadius(Math.max(0.5, radius * VISUAL_SCALE));

    if (t >= 1) {
      this.finish();
    }
  }

  private currentRadius(): number {
    if (!this.params) return 0;
    const elapsed = this.time.now - this.startTime;
    const t = Phaser.Math.Clamp(elapsed / this.params.durationMs, 0, 1);
    return START_RADIUS * (1 - t);
  }

  private onTap(): void {
    if (!this.running || !this.params) return;
    const elapsed = this.time.now - this.startTime;
    this.tapTimesMs.push(Math.round(elapsed));

    const radius = this.currentRadius();
    const isHit = radius >= this.params.sweetMin && radius <= this.params.sweetMax;

    if (isHit) {
      this.registerHit();
    } else {
      this.registerMiss();
    }
  }

  private registerHit(): void {
    const pip = this.progressPips[this.hitCount];
    if (pip) pip.setFillStyle(0x7ed957, 1);
    this.hitCount += 1;

    // Ring flash on hit.
    if (this.ring) {
      this.ring.setStrokeStyle(8, 0x7ed957, 1);
      this.time.delayedCall(120, () => this.ring?.setStrokeStyle(8, 0xffffff, 1));
    }

    if (this.params && this.hitCount >= this.params.tapsRequired) {
      this.finish();
    }
  }

  private registerMiss(): void {
    // Screen shake on miss.
    this.cameras.main.shake(180, 0.008);
    if (this.ring) {
      this.ring.setStrokeStyle(8, 0xff6b4a, 1);
      this.time.delayedCall(120, () => this.ring?.setStrokeStyle(8, 0xffffff, 1));
    }
  }

  private finish(): void {
    if (!this.running) return;
    this.running = false;
    this.input.off('pointerdown', this.onTap, this);
    this.statusText?.setText('…');
    void this.submit();
  }

  private async submit(): Promise<void> {
    const result = await submitCatch({
      spawnId: this.spawn.spawnId,
      tapTimesMs: this.tapTimesMs,
    });
    if (!result.ok) {
      showToast(result.error);
      this.statusText?.setText('Something slipped. ↻ Retry');
      this.showRetry();
      return;
    }
    this.registry.set('catchResult', result.data);
    this.registry.set('catchSpawn', this.spawn);
    this.scene.start('CatchResult');
  }
}
