import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { fetchWilds } from '../lib/api';
import { generateAllArt, generateDotTexture, generatePanelTexture } from '../lib/art';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FONT_STACK, UI } from '../lib/theme';
import { errorPanel } from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { WildsState } from '../../shared/remonsta';

// Preloader fetches the Wilds snapshot, procedurally bakes every texture we
// need (creatures, biome backgrounds, UI panels), then hands the state to the
// Habitat scene through the game registry. All art is generated from code —
// there are no image assets.
export class Preloader extends Scene {
  private statusText: Phaser.GameObjects.Text | null = null;
  private errorPanelRef: ErrorPanel | null = null;

  constructor() {
    super('Preloader');
  }

  init(): void {
    this.statusText = null;
    this.errorPanelRef = null;
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

  // Load failure is not user-initiated, so instead of a spontaneous toast we
  // surface an in-game error panel with a tappable Retry button.
  private showRetry(message: string): void {
    if (this.statusText) {
      this.statusText.setText('');
    }
    if (this.errorPanelRef) return;

    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height * 0.6, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
      if (this.statusText) this.statusText.setText('Waking the Wilds…');
      void this.loadWilds();
    });
  }
}
