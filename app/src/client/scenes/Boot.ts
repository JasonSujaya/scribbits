import { Scene } from 'phaser';
import { preloadVisualAssets } from '../lib/visualassets';

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
    void Promise.all([
      document.fonts.load('400 24px "DynaPuff"'),
      document.fonts.load('700 24px "DynaPuff"'),
    ]).then(startPreloader, startPreloader);
  }
}
