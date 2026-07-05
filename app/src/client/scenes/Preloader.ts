import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { fetchArena } from '../lib/api';
import { generateAllElementBadges, generateCoreArt } from '../lib/art';
import { mountLivingPaper } from '../lib/livingpaper';
import { FONT_STACK, UI } from '../lib/theme';
import { errorPanel, handLettered } from '../lib/ui';
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
    this.cameras.main.setBackgroundColor(UI.desk);

    generateCoreArt(this);
    generateAllElementBadges(this);
    mountLivingPaper(this, { edgeCreatures: false });

    handLettered(this, width / 2, height * 0.4, 'SCRIBBITS', 76, UI.ink, true);
    this.add
      .text(width / 2, height * 0.47, 'Draw it. Believe in it.', {
        fontFamily: FONT_STACK,
        fontSize: '28px',
        color: UI.inkSoft,
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, height * 0.56, 'Reading the forecast…', {
        fontFamily: FONT_STACK,
        fontSize: '26px',
        color: UI.inkSoft,
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
