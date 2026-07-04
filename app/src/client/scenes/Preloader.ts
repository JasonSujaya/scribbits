import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { fetchWilds } from '../lib/api';
import { generateAllArt, generateDotTexture, generatePanelTexture } from '../lib/art';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FONT_STACK, UI } from '../lib/theme';
import type { WildsState } from '../../shared/remonsta';

// Preloader fetches the Wilds snapshot, procedurally bakes every texture we
// need (creatures, biome backgrounds, UI panels), then hands the state to the
// Habitat scene through the game registry. All art is generated from code —
// there are no image assets.
export class Preloader extends Scene {
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Preloader');
  }

  init(): void {
    this.statusText = null;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2b2016');

    // Generate the bare-minimum textures needed for the loading screen itself.
    generateDotTexture(this);
    generatePanelTexture(this);

    this.add
      .text(width / 2, height * 0.42, 'REMONSTA', {
        fontFamily: FONT_STACK,
        fontSize: '72px',
        color: UI.cream,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, height * 0.54, 'Waking the Wilds…', {
        fontFamily: FONT_STACK,
        fontSize: '30px',
        color: '#e7d8c2',
      })
      .setOrigin(0.5);

    void this.loadWilds();
  }

  private async loadWilds(): Promise<void> {
    const result = await fetchWilds();
    if (!result.ok) {
      this.showRetry(result.error);
      return;
    }
    this.buildAndStart(result.data);
  }

  private buildAndStart(state: WildsState): void {
    // Bake all art from the returned species registry.
    generateAllArt(this, state.species, DESIGN_WIDTH, DESIGN_HEIGHT);

    this.registry.set('wilds', state);
    this.registry.set('species', state.species);

    this.scene.start('Habitat');
  }

  private showRetry(message: string): void {
    if (this.statusText) {
      this.statusText.setText(message);
    }
    showToast(message);

    const { width, height } = this.scale;
    const retry = this.add
      .text(width / 2, height * 0.64, '↻ Tap to retry', {
        fontFamily: FONT_STACK,
        fontSize: '34px',
        color: UI.cream,
        fontStyle: 'bold',
        backgroundColor: '#ff6b4a',
        padding: { x: 24, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retry.once('pointerup', () => {
      retry.destroy();
      if (this.statusText) this.statusText.setText('Waking the Wilds…');
      void this.loadWilds();
    });
  }
}
