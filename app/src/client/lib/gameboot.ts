import { translate } from './localization';

const bootStatus = document.getElementById('game-boot-status');
const bootMessage = document.getElementById('game-boot-message');
const bootProgress = document.getElementById('game-boot-progress');
const bootPercent = document.getElementById('game-boot-percent');
const bootTip = document.getElementById('game-boot-tip');
const bootStart = document.getElementById('game-boot-start');
const bootRetry = document.getElementById('game-boot-retry');

export type GameBootSegment = 'shell' | 'code' | 'artwork' | 'arena';

const BOOT_SEGMENT_WEIGHTS: Readonly<Record<GameBootSegment, number>> = {
  shell: 0.05,
  code: 0.25,
  artwork: 0.55,
  arena: 0.15,
};

const bootSegmentProgress: Record<GameBootSegment, number> = {
  shell: 0,
  code: 0,
  artwork: 0,
  arena: 0,
};

const BOOT_TIP_KEYS = [
  'preloader.tipShape',
  'preloader.tipColor',
  'preloader.tipGear',
  'preloader.tipLife',
] as const;

let reportedProgress = 0;
let startHandler: (() => void) | null = null;
let retryHandler: (() => void) | null = null;
let tipTimer: number | null = null;

const renderProgress = (progress: number): void => {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  reportedProgress = Math.max(reportedProgress, clampedProgress);
  const percent = Math.round(reportedProgress * 100);
  bootStatus?.style.setProperty(
    '--game-boot-progress',
    reportedProgress.toFixed(4)
  );
  bootProgress?.setAttribute('aria-valuenow', String(percent));
  if (bootPercent) bootPercent.textContent = `${percent}%`;
};

const stopGameBootTips = (): void => {
  if (tipTimer === null) return;
  window.clearInterval(tipTimer);
  tipTimer = null;
};

export const setGameBootProgress = (
  segment: GameBootSegment,
  progress: number
): void => {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  bootSegmentProgress[segment] = Math.max(
    bootSegmentProgress[segment],
    clampedProgress
  );
  const weightedProgress = (
    Object.keys(BOOT_SEGMENT_WEIGHTS) as GameBootSegment[]
  ).reduce(
    (total, key) =>
      total + bootSegmentProgress[key] * BOOT_SEGMENT_WEIGHTS[key],
    0
  );
  renderProgress(weightedProgress);
};

export const setGameBootRetry = (handler: (() => void) | null): void => {
  retryHandler = handler;
  if (bootRetry) bootRetry.hidden = handler === null;
};

export const setGameBootStart = (handler: (() => void) | null): void => {
  startHandler = handler;
  if (bootStart) bootStart.hidden = handler === null;
};

export const startGameBootTips = (): void => {
  stopGameBootTips();
  if (!bootTip) return;
  let tipIndex = 0;
  const showTip = (): void => {
    bootTip.textContent = translate(BOOT_TIP_KEYS[tipIndex]!);
  };
  showTip();
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  tipTimer = window.setInterval(
    () => {
      tipIndex = (tipIndex + 1) % BOOT_TIP_KEYS.length;
      showTip();
    },
    prefersReducedMotion ? 7_000 : 4_000
  );
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'The game could not finish opening.';
};

export const markGameBootPhase = (
  phase: 'loading' | 'starting' | 'awaiting-start' | 'ready' | 'error',
  message?: string
): void => {
  document.documentElement.dataset.scribbitsBoot = phase;
  document.getElementById('app')?.setAttribute(
    'aria-busy',
    phase === 'ready' ? 'false' : 'true'
  );
  if (bootStatus) {
    bootStatus.dataset.phase = phase;
    bootStatus.hidden = phase === 'ready';
  }
  if (message && bootMessage) bootMessage.textContent = message;
  if (phase === 'starting') setGameBootProgress('shell', 1);
  if (phase === 'awaiting-start') {
    renderProgress(1);
    stopGameBootTips();
    setGameBootRetry(null);
  }
  if (phase === 'ready') {
    renderProgress(1);
    stopGameBootTips();
    setGameBootStart(null);
    setGameBootRetry(null);
  }
  if (phase === 'error') {
    stopGameBootTips();
    setGameBootStart(null);
  }
};

export const reportGameBootError = (error: unknown): void => {
  console.error('Scribbits expanded-view startup failed:', error);
  setGameBootRetry(() => window.location.reload());
  markGameBootPhase(
    'error',
    `${errorMessage(error)} Close Scribbits and open it again.`
  );
};

bootRetry?.addEventListener('click', () => retryHandler?.());
bootStart?.addEventListener('click', () => {
  const handler = startHandler;
  setGameBootStart(null);
  handler?.();
});

window.addEventListener('error', (event) => {
  reportGameBootError(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  reportGameBootError(event.reason);
});

markGameBootPhase('loading');
