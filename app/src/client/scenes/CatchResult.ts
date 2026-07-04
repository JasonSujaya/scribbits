import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { FONT_STACK, UI } from '../lib/theme';
import { button, label, roundedPanel } from '../lib/ui';
import type { ActiveSpawn, CatchAttemptResponse } from '../../shared/remonsta';

// Result screen. Caught -> celebratory particle burst + a card showing species
// name, lore, prominent artist credit, first-catch banner, and the updated
// community %. Escaped -> sympathetic message with retry if the spawn is still
// active.
export class CatchResult extends Scene {
  private result!: CatchAttemptResponse;
  private spawn!: ActiveSpawn;

  constructor() {
    super('CatchResult');
  }

  create(): void {
    const result = this.registry.get('catchResult') as CatchAttemptResponse | undefined;
    const spawn = this.registry.get('catchSpawn') as ActiveSpawn | undefined;
    if (!result || !spawn) {
      this.scene.start('Habitat');
      return;
    }
    this.result = result;
    this.spawn = spawn;

    this.cameras.main.setBackgroundColor(result.caught ? '#1e2d1e' : '#2b2230');
    if (result.caught) {
      this.showCaught();
    } else {
      this.showEscaped();
    }
  }

  private showCaught(): void {
    const { width, height } = this.scale;
    const species = this.result.species;

    // Celebratory burst behind the card.
    const emitter = this.add.particles(width / 2, height * 0.4, 'dot', {
      speed: { min: 120, max: 380 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      lifespan: 900,
      quantity: 40,
      tint: [0xffe08a, 0x7ed957, 0xff6b4a, 0x5b9dff],
      emitting: false,
    });
    emitter.explode(40);
    this.time.delayedCall(1200, () => emitter.destroy());

    if (this.result.isFirstCatch) {
      roundedPanel(this, width / 2, 120, width - 80, 84, UI.coral, 0x2b2016);
      label(this, width / 2, 120, '★ FIRST CATCH! ★', 34, '#ffffff', true);
    }

    // Card.
    const cardY = height * 0.5;
    roundedPanel(this, width / 2, cardY, width - 90, 640, UI.panel);

    const creature = this.add.image(width / 2, cardY - 200, species.spriteKey).setScale(1.1);
    this.tweens.add({
      targets: creature,
      scale: 1.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    label(this, width / 2, cardY - 40, species.name, 48, UI.ink, true);
    this.wrappedText(width / 2, cardY + 20, species.lore, 26, UI.inkSoft, width - 160);

    // Prominent artist credit.
    roundedPanel(this, width / 2, cardY + 110, width - 180, 70, UI.coral, 0x2b2016);
    label(this, width / 2, cardY + 110, `design by u/${species.artist}`, 28, '#ffffff', true);

    label(
      this,
      width / 2,
      cardY + 180,
      `Caught ${this.result.totalCatchesOfSpecies}× by the community`,
      22,
      UI.inkSoft
    );

    label(
      this,
      width / 2,
      cardY + 240,
      `Community Dex: ${Math.round(this.result.communityDexPercent)}%  ·  You: ${Math.round(
        this.result.personalDexPercent
      )}%`,
      24,
      UI.ink,
      true
    );

    button(this, width / 2, height - 100, 'Back to Wilds', () => this.scene.start('Habitat'), 340);
  }

  private showEscaped(): void {
    const { width, height } = this.scale;
    const species = this.result.species;

    const creature = this.add
      .image(width / 2, height * 0.36, species.spriteKey)
      .setAlpha(0.5)
      .setScale(1);
    this.tweens.add({
      targets: creature,
      alpha: 0.2,
      y: height * 0.3,
      duration: 1400,
      ease: 'Sine.easeInOut',
    });

    label(this, width / 2, height * 0.55, 'It slipped away…', 44, UI.cream, true);
    this.wrappedText(
      width / 2,
      height * 0.61,
      `${species.name} vanished into the Wilds. Time your taps in the green band.`,
      26,
      '#d9cdbd',
      width - 140
    );

    const stillActive = this.spawn.expiresAt > Date.now();
    if (stillActive) {
      button(
        this,
        width / 2,
        height * 0.76,
        'Try again',
        () => {
          this.registry.set('activeSpawn', this.spawn);
          this.scene.start('CatchMinigame');
        },
        320
      );
      button(this, width / 2, height * 0.87, 'Back to Wilds', () => this.scene.start('Habitat'), 320);
    } else {
      this.wrappedText(width / 2, height * 0.72, 'This one has moved on.', 24, '#b8ab9a', width - 160);
      button(this, width / 2, height * 0.82, 'Back to Wilds', () => this.scene.start('Habitat'), 320);
    }
  }

  private wrappedText(
    x: number,
    y: number,
    text: string,
    size: number,
    color: string,
    wrapWidth: number
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: FONT_STACK,
        fontSize: `${size}px`,
        color,
        align: 'center',
        wordWrap: { width: wrapWidth },
      })
      .setOrigin(0.5);
  }
}
