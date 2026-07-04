import { Scene } from 'phaser';

// Boot does no asset loading — all baseline art is generated procedurally in
// Preloader, and player drawings load on demand. We jump straight through.
export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preloader');
  }
}
