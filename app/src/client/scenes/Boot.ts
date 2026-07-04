import { Scene } from 'phaser';

// Boot does no asset loading — all art is generated procedurally in Preloader
// from the species registry returned by /api/wilds. We jump straight through.
export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preloader');
  }
}
