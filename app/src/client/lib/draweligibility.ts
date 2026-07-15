import type { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import {
  getScribbitLifecycleStage,
  MAX_GROWING_PER_USER,
} from '../../shared/arena';
import type { ArenaState, FreeDrawing } from '../../shared/arena';
import { getArena } from './registry';
import { startScene } from './ui';
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

export type DailyDrawRoute = 'preloader' | 'draw' | 'login' | 'arena';

export const countGrowingScribbits = (state: ArenaState | undefined): number =>
  state?.myScribbits.filter(
    (scribbit) =>
      getScribbitLifecycleStage(scribbit, state.dayNumber) === 'growing'
  ).length ?? 0;

export const isGrowingRosterFull = (state: ArenaState | undefined): boolean =>
  countGrowingScribbits(state) >= MAX_GROWING_PER_USER;

export const growingRosterFullMessage = (): string =>
  translate('drawEligibility.full', { capacity: MAX_GROWING_PER_USER });

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
  if (state.drawCharges.available <= 0) {
    return {
      canDraw: false,
      tabLabel: translate('nav.drawRefilling'),
      message: translate('drawEligibility.refilling'),
    };
  }
  if (isGrowingRosterFull(state)) {
    return {
      canDraw: false,
      tabLabel: translate('nav.drawFull'),
      message: growingRosterFullMessage(),
    };
  }
  return { canDraw: true, tabLabel: translate('nav.draw'), message: '' };
};

export const getCommunityThemeEligibility = (
  state: ArenaState
): CommunityThemeEligibility => {
  if (isGrowingRosterFull(state)) {
    return {
      canJoin: false,
      message: growingRosterFullMessage(),
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
  if (route === 'draw') return startScene(scene, 'Draw');
  if (route === 'login') {
    showLoginPrompt();
    return;
  }
  if (state) showToast(getDrawEligibility(state).message);

  if ((state?.myScribbits.length ?? 0) === 0) {
    if (scene.scene.key !== 'ScribbitHome') {
      startScene(scene, 'ScribbitHome');
    }
    return;
  }

  if (scene.scene.key !== 'ArenaHome') {
    startScene(scene, 'ArenaHome');
  }
};
