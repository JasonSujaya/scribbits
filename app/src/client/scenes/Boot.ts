import { Scene } from 'phaser';
import { UI } from '../lib/theme';
import {
  coreVisualAssetsReady,
  preloadVisualAssets,
} from '../lib/visualassets';

const FONT_LOAD_TIMEOUT_MS = 1_500;

// Load the small shared visual kit once; player drawings still load on demand.
export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadVisualAssets(this);
  }

  create(): void {
    if (!coreVisualAssetsReady(this)) {
      this.showAssetRetry();
      return;
    }
    this.continueBoot();
  }

  private continueBoot(): void {
    const startPreloader = (): void => {
      if (this.scene.isActive()) this.scene.start('Preloader');
    };
    if (typeof document === 'undefined' || !document.fonts) {
      startPreloader();
      return;
    }
    const fontLoad = Promise.all([
      document.fonts.load('400 24px "DynaPuff"'),
      document.fonts.load('700 24px "DynaPuff"'),
    ]);
    const fontTimeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, FONT_LOAD_TIMEOUT_MS);
    });
    void Promise.race([fontLoad, fontTimeout]).then(
      startPreloader,
      startPreloader
    );
  }

  private showAssetRetry(): void {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(UI.desk);
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 90, 'THE ARTWORK DID NOT LOAD', {
        color: UI.cream,
        fontFamily: 'DynaPuff, sans-serif',
        fontSize: '30px',
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5);
    const retryButton = this.add
      .rectangle(width / 2, height / 2 + 20, 360, 92, UI.coral)
      .setStrokeStyle(4, UI.inkHex)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height / 2 + 20, 'RETRY', {
        color: UI.ink,
        fontFamily: 'DynaPuff, sans-serif',
        fontSize: '30px',
      })
      .setOrigin(0.5);
    retryButton.once('pointerup', () => this.retryVisualAssets());
  }

  private retryVisualAssets(): void {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const loadingText = this.add
      .text(width / 2, height / 2, 'RELOADING ARTWORK...', {
        color: UI.cream,
        fontFamily: 'DynaPuff, sans-serif',
        fontSize: '28px',
      })
      .setOrigin(0.5);
    this.load.once('complete', () => {
      loadingText.destroy();
      if (!this.scene.isActive()) return;
      if (coreVisualAssetsReady(this)) this.continueBoot();
      else this.showAssetRetry();
    });
    preloadVisualAssets(this);
    this.load.start();
  }
}
