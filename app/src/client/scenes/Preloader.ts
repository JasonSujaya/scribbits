import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { fetchArena } from '../lib/api';
import { generateAllElementBadges, generateCoreArt } from '../lib/art';
import { mountLivingPaper } from '../lib/livingpaper';
import { FONT_STACK, UI } from '../lib/theme';
import { errorPanel } from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import { setArena } from '../lib/registry';
import {
  BRAND_LOGO_TEXTURE,
  preloadPrimaryNavigationVisualAssets,
  primaryNavigationVisualAssetsReady,
} from '../lib/visualassets';
import type { ArenaState } from '../../shared/arena';
import { translate } from '../lib/localization';
import { preparePrimaryScenes, startScene } from '../lib/scenenavigation';
import { PRIMARY_PRELOAD_SCENE_KEYS } from '../lib/sceneroutes';

// Fetch the arena snapshot while the complete primary play loop and its artwork
// load in parallel. Home is revealed only when normal navigation is ready.
// Player drawings and optional reference pages still load on demand.
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

    const brandLogo = this.add.image(
      width / 2,
      height * 0.34,
      BRAND_LOGO_TEXTURE
    );
    const brandLogoScale = Math.min(
      (width * 0.74) / brandLogo.width,
      250 / brandLogo.height
    );
    brandLogo.setScale(brandLogoScale);
    this.add
      .text(width / 2, height * 0.47, translate('preloader.tagline'), {
        fontFamily: FONT_STACK,
        fontSize: '28px',
        color: UI.inkSoft,
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, height * 0.56, translate('preloader.loading'), {
        fontFamily: FONT_STACK,
        fontSize: '26px',
        color: UI.inkSoft,
      })
      .setOrigin(0.5);

    void this.loadArena();
  }

  private async loadArena(): Promise<void> {
    const [result, gamePreparation] = await Promise.all([
      fetchArena(),
      this.preparePrimaryGame(),
    ]);
    if (!result.ok) {
      this.showRetry(result.error);
      return;
    }
    if (!gamePreparation.ok) {
      this.showRetry(gamePreparation.error);
      return;
    }
    this.startArena(result.data);
  }

  private async preparePrimaryGame(): Promise<
    { ok: true } | { ok: false; error: string }
  > {
    try {
      const primarySceneCode = preparePrimaryScenes(this.sys.game);
      const primaryArtwork = this.loadPrimaryArtwork();
      await Promise.all([primarySceneCode, primaryArtwork]);
      return { ok: true };
    } catch (error) {
      console.error('Failed to prepare the primary game', error);
      return {
        ok: false,
        error: 'The game could not finish loading. Check your connection and retry.',
      };
    }
  }

  private loadPrimaryArtwork(): Promise<void> {
    if (primaryNavigationVisualAssetsReady(this)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.load.once('complete', () => {
        if (primaryNavigationVisualAssetsReady(this)) {
          resolve();
          return;
        }
        reject(new Error('Primary game artwork did not finish loading.'));
      });
      preloadPrimaryNavigationVisualAssets(this);
      this.load.start();
    });
  }

  private startArena(state: ArenaState): void {
    this.game.canvas.dataset.primaryPreload = 'ready';
    this.game.canvas.dataset.preloadedSceneKeys =
      PRIMARY_PRELOAD_SCENE_KEYS.join(',');
    setArena(this, state);
    startScene(this, 'ScribbitHome');
  }

  private showRetry(message: string): void {
    this.statusText?.setText('');
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(
      this,
      width / 2,
      height * 0.62,
      message,
      () => {
        this.errorPanelRef?.destroy();
        this.errorPanelRef = null;
        this.statusText?.setText(translate('preloader.loading'));
        void this.loadArena();
      }
    );
  }
}
