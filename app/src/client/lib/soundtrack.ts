import { MUSIC_CATALOG } from './audiocatalog';

const GAME_SOUNDTRACK = MUSIC_CATALOG.game[0];
const MAX_RECOVERY_ATTEMPTS = 1;

let currentAudio: HTMLAudioElement | null = null;
let playbackRequested = false;
let retryListenersInstalled = false;
let visibilityHandlerInstalled = false;
let recoveryAttempts = 0;

const removeRetryListeners = (): void => {
  if (!retryListenersInstalled || typeof document === 'undefined') return;
  document.removeEventListener('pointerdown', retryPlayback, true);
  document.removeEventListener('click', retryPlayback, true);
  document.removeEventListener('keydown', retryPlayback, true);
  retryListenersInstalled = false;
};

const attemptPlayback = (audio: HTMLAudioElement): void => {
  const source = audio.dataset.scribbitsSoundtrackSource;
  if (!audio.getAttribute('src') && source) audio.src = source;
  audio.dataset.scribbitsSoundtrackState = 'starting';
  void audio.play().then(
    () => {
      audio.dataset.scribbitsSoundtrackState = 'playing';
      if (audio === currentAudio) removeRetryListeners();
    },
    (error: unknown) => {
      if (audio !== currentAudio || !playbackRequested) return;
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        audio.dataset.scribbitsSoundtrackState = 'paused';
        return;
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'NotAllowedError'
      ) {
        audio.dataset.scribbitsSoundtrackState = 'blocked';
        installRetryListeners();
        return;
      }
      audio.dataset.scribbitsSoundtrackState = 'error';
      recoverSoundtrackAudio(audio);
    }
  );
};

const requestPlayback = (): void => {
  if (!currentAudio) return;
  playbackRequested = true;
  installRetryListeners();
  if (!document.hidden) attemptPlayback(currentAudio);
};

function retryPlayback(): void {
  if (!playbackRequested || !currentAudio || document.hidden) return;
  if (currentAudio.preload === 'none') {
    currentAudio.preload = 'auto';
    currentAudio.load();
  }
  attemptPlayback(currentAudio);
}

function installRetryListeners(): void {
  if (retryListenersInstalled || typeof document === 'undefined') return;
  document.addEventListener('pointerdown', retryPlayback, true);
  document.addEventListener('click', retryPlayback, true);
  document.addEventListener('keydown', retryPlayback, true);
  retryListenersInstalled = true;
}

const installVisibilityHandler = (): void => {
  if (visibilityHandlerInstalled || typeof document === 'undefined') return;
  visibilityHandlerInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      currentAudio?.pause();
      return;
    }
    if (playbackRequested) requestPlayback();
  });
};

const discardAudio = (audio: HTMLAudioElement): void => {
  audio.removeEventListener('error', recoverSoundtrack);
  audio.pause();
  audio.remove();
};

function recoverSoundtrack(event: Event): void {
  recoverSoundtrackAudio(event.currentTarget as HTMLAudioElement);
}

function recoverSoundtrackAudio(failedAudio: HTMLAudioElement): void {
  if (failedAudio !== currentAudio) return;
  const shouldResumePlayback = playbackRequested;
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    playbackRequested = false;
    removeRetryListeners();
    currentAudio = null;
    discardAudio(failedAudio);
    return;
  }
  createSoundtrack(shouldResumePlayback, recoveryAttempts + 1);
}

const createSoundtrack = (
  startPlaying: boolean,
  nextRecoveryAttempts = 0
): void => {
  installVisibilityHandler();
  removeRetryListeners();
  playbackRequested = startPlaying;
  if (currentAudio) discardAudio(currentAudio);
  currentAudio = null;
  if (typeof Audio === 'undefined' || typeof document === 'undefined') return;

  const audio = new Audio();
  audio.dataset.scribbitsSoundtrack = 'game';
  audio.dataset.scribbitsSoundtrackSource = GAME_SOUNDTRACK.url;
  audio.dataset.scribbitsSoundtrackState = 'idle';
  audio.preload = startPlaying ? 'auto' : 'none';
  audio.src = GAME_SOUNDTRACK.url;
  audio.autoplay = startPlaying;
  audio.loop = true;
  audio.volume = GAME_SOUNDTRACK.volume;
  audio.style.display = 'none';
  audio.addEventListener('error', recoverSoundtrack);
  document.body.append(audio);
  currentAudio = audio;
  recoveryAttempts = nextRecoveryAttempts;
  if (startPlaying) requestPlayback();
};

/** Prepare the one game-wide loop without creating a second audio element. */
export const preloadGameSoundtrack = (): void => {
  if (!currentAudio) createSoundtrack(false);
};

/** Start or resume the same loop. Scene changes never replace or rewind it. */
export const playGameSoundtrack = (): void => {
  if (!currentAudio) {
    createSoundtrack(true);
    return;
  }
  requestPlayback();
};

/** Retry the same loop inside a trusted player gesture. */
export const primeGameSoundtrack = (): void => {
  preloadGameSoundtrack();
  requestPlayback();
};

export const isGameSoundtrackPlaying = (): boolean =>
  currentAudio !== null && !currentAudio.paused;
