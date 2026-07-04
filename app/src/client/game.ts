import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Habitat } from './scenes/Habitat';
import { CatchMinigame } from './scenes/CatchMinigame';
import { CatchResult } from './scenes/CatchResult';
import { Dex } from './scenes/Dex';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './lib/theme';

// Remonsta — a Devvit Web + Phaser 4 creature-collecting game.
// Portrait-first: a fixed 720x1280 design resolution scaled with FIT so it
// fills any mobile viewport while preserving aspect ratio.
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#2b2016',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  scene: [Boot, Preloader, Habitat, CatchMinigame, CatchResult, Dex],
};

const StartGame = (parent: string): Phaser.Game => {
  return new Game({ ...config, parent });
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
