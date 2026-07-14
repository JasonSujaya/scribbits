import { Scene } from 'phaser';
import { preloadVisualAssets } from '../lib/visualassets';

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
}
