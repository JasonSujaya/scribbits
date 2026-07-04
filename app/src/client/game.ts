import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { ArenaHome } from './scenes/ArenaHome';
import { Draw } from './scenes/Draw';
import { Replay } from './scenes/Replay';
import { MyBattles } from './scenes/MyBattles';
import { Sketchbook } from './scenes/Sketchbook';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './lib/theme';

// Scribbits Arena — Devvit Web + Phaser 4. Draw a creature; its shape is its
// stat sheet; it fights async auto-battles and lives 3 days. Portrait-first:
// a fixed 720x1280 design resolution scaled with FIT to fill any mobile screen.
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#241b2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  scene: [Boot, Preloader, ArenaHome, Draw, Replay, MyBattles, Sketchbook],
};

const StartGame = (parent: string): Phaser.Game => {
  const game = new Game({ ...config, parent });
  // Dev-only hook: with ?debug in the URL, expose the game so a preview harness
  // can jump straight to a scene. No effect in production (Devvit has no query).
  if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
    (window as unknown as { game?: Phaser.Game }).game = game;
  }
  return game;
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
