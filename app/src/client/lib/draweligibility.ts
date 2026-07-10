import type { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import { MAX_ALIVE_PER_USER } from '../../shared/arena';
import type { ArenaState } from '../../shared/arena';
import { getArena } from './registry';
import { fadeToScene } from './ui';

export type DrawEligibility = {
  canDraw: boolean;
  tabLabel: string;
  message: string;
};

export const getDrawEligibility = (
  state: ArenaState | undefined
): DrawEligibility => {
  if (!state) {
    return { canDraw: false, tabLabel: 'Draw', message: 'Loading the arena…' };
  }
  if (!state.loggedIn) {
    return { canDraw: false, tabLabel: 'Draw', message: 'Sign in to draw a Scribbit.' };
  }
  if (state.drawnToday) {
    return {
      canDraw: false,
      tabLabel: 'Done ✓',
      message: 'Today’s Scribbit is already in the Rumble. Draw again after UTC reset.',
    };
  }
  if (state.myScribbits.length >= MAX_ALIVE_PER_USER) {
    return {
      canDraw: false,
      tabLabel: 'Full',
      message: 'Your three living Scribbit slots are full. Remove one or wait for one to fade.',
    };
  }
  return { canDraw: true, tabLabel: 'Draw', message: '' };
};

export const dailyDrawTabLabel = (scene: Scene): string => {
  return getDrawEligibility(getArena(scene)).tabLabel;
};

export const navigateToDailyDraw = (scene: Scene): void => {
  const state = getArena(scene);
  if (!state) {
    scene.scene.start('Preloader');
    return;
  }

  const eligibility = getDrawEligibility(state);
  if (eligibility.canDraw) {
    fadeToScene(scene, 'Draw');
    return;
  }

  if (!state.loggedIn) showLoginPrompt();
  else showToast(eligibility.message);

  if (scene.scene.key !== 'ArenaHome') {
    fadeToScene(scene, 'ArenaHome');
  }
};
