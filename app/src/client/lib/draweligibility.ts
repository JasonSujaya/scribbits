import type { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import { MAX_ALIVE_PER_USER } from '../../shared/arena';
import type { ArenaState, FreeDrawing } from '../../shared/arena';
import { beginPracticeSession, getArena } from './registry';
import { fadeToScene } from './ui';
import { translate } from './localization';

export type DrawEligibility = {
  canDraw: boolean;
  tabLabel: string;
  message: string;
};

export type CommunityThemeEligibility = {
  canJoin: boolean;
  message: string;
};

export type DailyDrawRoute =
  | 'preloader'
  | 'draw'
  | 'practice'
  | 'login'
  | 'arena';

export const getTodayFreeDrawing = (
  state: ArenaState | undefined
): FreeDrawing | null => {
  const drawing = state?.todayFreeDrawing;
  return state?.drawnToday && drawing?.createdDay === state.dayNumber
    ? drawing
    : null;
};

export const mergeTodayFreeDrawing = (
  state: ArenaState,
  drawing: FreeDrawing
): ArenaState | null => {
  if (drawing.createdDay !== state.dayNumber) return null;
  return { ...state, drawnToday: true, todayFreeDrawing: drawing };
};

export const getDrawEligibility = (
  state: ArenaState | undefined
): DrawEligibility => {
  if (!state) {
    return {
      canDraw: false,
      tabLabel: translate('nav.draw'),
      message: translate('drawEligibility.loading'),
    };
  }
  if (!state.loggedIn) {
    return {
      canDraw: false,
      tabLabel: translate('nav.draw'),
      message: translate('drawEligibility.signIn'),
    };
  }
  if (state.drawnToday) {
    return {
      canDraw: false,
      tabLabel: translate('nav.drawDone'),
      message: translate('drawEligibility.alreadyDrawn'),
    };
  }
  return { canDraw: true, tabLabel: translate('nav.draw'), message: '' };
};

export const getCommunityThemeEligibility = (
  state: ArenaState
): CommunityThemeEligibility => {
  if (state.myScribbits.length >= MAX_ALIVE_PER_USER) {
    return {
      canJoin: false,
      message: translate('drawEligibility.full'),
    };
  }
  return { canJoin: true, message: '' };
};

export const dailyDrawTabLabel = (scene: Scene): string => {
  return getDrawEligibility(getArena(scene)).tabLabel;
};

export const getDailyDrawRoute = (
  state: ArenaState | undefined
): DailyDrawRoute => {
  if (!state) return 'preloader';
  if (getTodayFreeDrawing(state)) return 'draw';
  if (getDrawEligibility(state).canDraw) return 'draw';
  if (state.loggedIn && state.drawnToday) return 'practice';
  if (!state.loggedIn) return 'login';
  return 'arena';
};

export const navigateToDailyDraw = (scene: Scene): void => {
  const state = getArena(scene);
  const route = getDailyDrawRoute(state);
  if (route === 'preloader') {
    scene.scene.start('Preloader');
    return;
  }
  if (route === 'draw') return fadeToScene(scene, 'Draw');
  if (route === 'practice') {
    beginPracticeSession(scene);
    return fadeToScene(scene, 'Draw', { mode: 'practice' });
  }
  if (route === 'login') showLoginPrompt();
  else if (state) showToast(getDrawEligibility(state).message);

  if (scene.scene.key !== 'ArenaHome') {
    fadeToScene(scene, 'ArenaHome');
  }
};
