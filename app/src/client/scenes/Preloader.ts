import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { fetchArena } from '../lib/api';
import { generateAllElementBadges, generateCoreArt } from '../lib/art';
import { FONT_STACK, UI } from '../lib/theme';
import { errorPanel } from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import { setArena } from '../lib/registry';
import type { ArenaState } from '../../shared/arena';

// Preloader fetches the arena snapshot, bakes baseline textures (UI panel, dot,
// spark, element badges), stashes state in the registry, then opens ArenaHome.
// Player drawings load on demand in the scenes that show them.
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
    this.cameras.main.setBackgroundColor('#241b2e');

    generateCoreArt(this);
    generateAllElementBadges(this);

    this.add
      .text(width / 2, height * 0.4, 'SCRIBBITS', {
        fontFamily: FONT_STACK,
        fontSize: '76px',
        color: UI.cream,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.47, 'Draw it. Believe in it.', {
        fontFamily: FONT_STACK,
        fontSize: '28px',
        color: '#e7d8c2',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, height * 0.56, 'Reading the forecast…', {
        fontFamily: FONT_STACK,
        fontSize: '26px',
        color: '#c9b79a',
      })
      .setOrigin(0.5);

    void this.loadArena();
  }

  private async loadArena(): Promise<void> {
    const result = await fetchArena();
    if (!result.ok) {
      this.showRetry(result.error);
      return;
    }
    this.startArena(result.data);
  }

  private startArena(state: ArenaState): void {
    setArena(this, state);
    this.scene.start('ArenaHome');
  }

  private showRetry(message: string): void {
    this.statusText?.setText('');
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height * 0.62, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
      this.statusText?.setText('Reading the forecast…');
      void this.loadArena();
    });
  }
}
