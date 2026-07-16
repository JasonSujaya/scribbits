import { MUSIC_CATALOG } from './audiocatalog';

const READY_SET_SCRIBBLE_TRACK = MUSIC_CATALOG.drawing[0];
const HOME_SOUNDTRACKS = MUSIC_CATALOG.home;
const BATTLE_SOUNDTRACK = MUSIC_CATALOG.battle[0];

type SoundtrackMode = 'battle' | 'drawing' | 'home';

let currentAudio: HTMLAudioElement | null = null;
let currentMode: SoundtrackMode | null = null;
let preparedBattleAudio: HTMLAudioElement | null = null;
let preparedDrawingAudio: HTMLAudioElement | null = null;
let hasPlayedHomeSoundtrack = false;
let playbackRequested = false;
let retryListenersInstalled = false;
let pendingHomeStop: number | null = null;
let visibilityHandlerInstalled = false;
let recoveryAttempts = 0;

const MAX_RECOVERY_ATTEMPTS = 1;

export const chooseHomeTrackIndex = (
  hasPlayedHomeTrack: boolean,
  randomValue: number
): number => {
  const trackCount = HOME_SOUNDTRACKS.length;
  if (!hasPlayedHomeTrack) return 0;
  const normalizedRandom = Math.min(Math.max(randomValue, 0), 0.999999);
  return Math.floor(normalizedRandom * trackCount);
};

const removeRetryListeners = (): void => {
  if (!retryListenersInstalled || typeof document === 'undefined') return;
  document.removeEventListener('pointerdown', retryPlayback, true);
  document.removeEventListener('keydown', retryPlayback, true);
  retryListenersInstalled = false;
};

const attemptPlayback = (audio: HTMLAudioElement): void => {
  const source = audio.dataset.scribbitsSoundtrackSource;
  if (!audio.getAttribute('src') && source) audio.src = source;
  void audio.play().then(
    () => {
      if (audio !== currentAudio) return;
      removeRetryListeners();
    },
    (error: unknown) => {
      if (audio !== currentAudio || !playbackRequested) return;
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'NotAllowedError'
      ) {
        installRetryListeners();
        return;
      }
      recoverSoundtrackAudio(audio);
    }
  );
};

const requestPlayback = (): void => {
  const audio = currentAudio;
  if (!audio) return;
  playbackRequested = true;
  if (document.hidden) {
    installRetryListeners();
    return;
  }
  attemptPlayback(audio);
};

function retryPlayback(): void {
  if (!playbackRequested || !currentAudio || document.hidden) return;
  attemptPlayback(currentAudio);
}

function installRetryListeners(): void {
  if (retryListenersInstalled || typeof document === 'undefined') return;
  document.addEventListener('pointerdown', retryPlayback, true);
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

const cancelPendingHomeStop = (): void => {
  if (pendingHomeStop === null || typeof window === 'undefined') return;
  window.clearTimeout(pendingHomeStop);
  pendingHomeStop = null;
};

const discardAudio = (audio: HTMLAudioElement): void => {
  audio.removeEventListener('error', recoverSoundtrack);
  audio.removeEventListener('error', discardPreparedBattleAudio);
  audio.removeEventListener('error', discardPreparedDrawingAudio);
  audio.pause();
  audio.remove();
};

const getRecoverySource = (mode: SoundtrackMode, source: string): string => {
  if (mode !== 'home' || HOME_SOUNDTRACKS.length < 2) return source;
  const failedTrackIndex = HOME_SOUNDTRACKS.findIndex(
    (track) => track.url === source
  );
  const nextTrackIndex =
    failedTrackIndex < 0 ? 0 : (failedTrackIndex + 1) % HOME_SOUNDTRACKS.length;
  return HOME_SOUNDTRACKS[nextTrackIndex]?.url ?? source;
};

function recoverSoundtrack(event: Event): void {
  const failedAudio = event.currentTarget as HTMLAudioElement;
  recoverSoundtrackAudio(failedAudio);
}

function recoverSoundtrackAudio(failedAudio: HTMLAudioElement): void {
  if (failedAudio !== currentAudio) return;

  const failedMode = currentMode;
  const failedSource = failedAudio.dataset.scribbitsSoundtrackSource;
  const shouldResumePlayback = playbackRequested;
  if (
    !failedMode ||
    !failedSource ||
    recoveryAttempts >= MAX_RECOVERY_ATTEMPTS
  ) {
    playbackRequested = false;
    removeRetryListeners();
    currentMode = null;
    currentAudio = null;
    discardAudio(failedAudio);
    return;
  }

  replaceSoundtrack(
    failedMode,
    getRecoverySource(failedMode, failedSource),
    shouldResumePlayback,
    recoveryAttempts + 1
  );
}

function discardPreparedBattleAudio(event: Event): void {
  const failedAudio = event.currentTarget as HTMLAudioElement;
  if (failedAudio !== preparedBattleAudio) return;
  preparedBattleAudio = null;
  discardAudio(failedAudio);
}

function discardPreparedDrawingAudio(event: Event): void {
  const failedAudio = event.currentTarget as HTMLAudioElement;
  if (failedAudio !== preparedDrawingAudio) return;
  preparedDrawingAudio = null;
  discardAudio(failedAudio);
}

const replaceSoundtrack = (
  mode: SoundtrackMode,
  source: string,
  startPlaying = true,
  nextRecoveryAttempts = 0
): void => {
  installVisibilityHandler();
  stopSoundtrack();
  if (typeof Audio === 'undefined') return;

  const audio = new Audio();
  audio.dataset.scribbitsSoundtrack = mode;
  audio.dataset.scribbitsSoundtrackSource = source;
  // Home music starts optimistically because Reddit's expanded-view gesture
  // happens outside this iframe. Browsers that block autoplay fall back to the
  // first in-game pointer or keyboard interaction through requestPlayback().
  audio.preload = mode === 'home' ? 'none' : 'auto';
  audio.src = source;
  audio.autoplay = startPlaying;
  audio.loop = true;
  audio.volume =
    mode === 'drawing'
      ? READY_SET_SCRIBBLE_TRACK.volume
      : mode === 'battle'
        ? BATTLE_SOUNDTRACK.volume
        : (HOME_SOUNDTRACKS.find((track) => track.url === source)?.volume ??
          0.32);
  audio.style.display = 'none';
  audio.addEventListener('error', recoverSoundtrack);
  document.body.append(audio);
  currentMode = mode;
  currentAudio = audio;
  recoveryAttempts = nextRecoveryAttempts;
  if (startPlaying) requestPlayback();
};

const createPreparedBattleAudio = (): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const audio = new Audio();
  audio.dataset.scribbitsSoundtrack = 'battle-preload';
  audio.preload = 'auto';
  audio.src = BATTLE_SOUNDTRACK.url;
  audio.loop = true;
  audio.volume = BATTLE_SOUNDTRACK.volume;
  audio.style.display = 'none';
  audio.addEventListener('error', discardPreparedBattleAudio);
  document.body.append(audio);
  audio.load();
  return audio;
};

const createPreparedDrawingAudio = (): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const audio = new Audio();
  audio.dataset.scribbitsSoundtrack = 'drawing-preload';
  audio.preload = 'auto';
  audio.src = READY_SET_SCRIBBLE_TRACK.url;
  audio.loop = true;
  audio.volume = READY_SET_SCRIBBLE_TRACK.volume;
  audio.style.display = 'none';
  audio.addEventListener('error', discardPreparedDrawingAudio);
  document.body.append(audio);
  audio.load();
  return audio;
};

/** Begin loading the drawing track while the visible countdown is running. */
export const preloadDrawingSoundtrack = (): void => {
  if (currentMode === 'drawing' || preparedDrawingAudio) return;
  preparedDrawingAudio = createPreparedDrawingAudio();
};

/**
 * Warm the prepared drawing element inside the player's Start Drawing gesture.
 * Reusing this element after the countdown preserves embedded-browser autoplay
 * permission without making the countdown wait on the full music download.
 */
export const primeDrawingSoundtrack = (): void => {
  preloadDrawingSoundtrack();
  const audio = preparedDrawingAudio;
  if (!audio) return;
  const targetVolume = audio.volume;
  audio.volume = 0;
  void audio.play().then(
    () => {
      if (preparedDrawingAudio !== audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = targetVolume;
    },
    () => {
      if (preparedDrawingAudio === audio) audio.volume = targetVolume;
    }
  );
};

export const releaseDrawingSoundtrackPreparation = (): void => {
  const audio = preparedDrawingAudio;
  if (!audio) return;
  preparedDrawingAudio = null;
  discardAudio(audio);
};

/** Begin the battle-track request before Replay takes over the screen. */
export const preloadBattleSoundtrack = (): void => {
  if (currentMode === 'battle' || preparedBattleAudio) return;
  preparedBattleAudio = createPreparedBattleAudio();
};

/**
 * Warm the prepared element during the player's Fight tap. Starting and then
 * pausing the same element keeps strict embedded browsers from treating the
 * later Replay playback as unrelated autoplay.
 */
export const primeBattleSoundtrack = (): void => {
  preloadBattleSoundtrack();
  const audio = preparedBattleAudio;
  if (!audio) return;
  const targetVolume = audio.volume;
  audio.volume = 0;
  void audio.play().then(
    () => {
      if (preparedBattleAudio !== audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = targetVolume;
    },
    () => {
      if (preparedBattleAudio === audio) audio.volume = targetVolume;
    }
  );
};

const chooseNextHomeSoundtrack = (): string => {
  const nextTrackIndex = chooseHomeTrackIndex(
    hasPlayedHomeSoundtrack,
    Math.random()
  );
  hasPlayedHomeSoundtrack = true;
  return HOME_SOUNDTRACKS[nextTrackIndex]?.url ?? HOME_SOUNDTRACKS[0].url;
};

const startNextHomeSoundtrack = (): void => {
  replaceSoundtrack('home', chooseNextHomeSoundtrack());
};

export const playHomeSoundtrack = (): void => {
  cancelPendingHomeStop();
  if (currentMode === 'home' && currentAudio) {
    requestPlayback();
    return;
  }
  startNextHomeSoundtrack();
};

// Home and Gallery are one uninterrupted idle-music area. Scene shutdown runs
// before the destination scene starts, so a short deferred release lets the
// destination claim the existing track without pausing or restarting it.
export const releaseHomeSoundtrack = (): void => {
  if (
    currentMode !== 'home' ||
    pendingHomeStop !== null ||
    typeof window === 'undefined'
  ) {
    return;
  }
  pendingHomeStop = window.setTimeout(() => {
    pendingHomeStop = null;
    if (currentMode === 'home') stopSoundtrack();
  }, 100);
};

export const startDrawingSoundtrack = (): void => {
  installVisibilityHandler();
  stopSoundtrack();
  const audio = preparedDrawingAudio;
  preparedDrawingAudio = null;
  if (!audio) {
    replaceSoundtrack('drawing', READY_SET_SCRIBBLE_TRACK.url);
    return;
  }
  audio.removeEventListener('error', discardPreparedDrawingAudio);
  audio.dataset.scribbitsSoundtrack = 'drawing';
  audio.dataset.scribbitsSoundtrackSource = READY_SET_SCRIBBLE_TRACK.url;
  audio.autoplay = true;
  audio.volume = READY_SET_SCRIBBLE_TRACK.volume;
  audio.currentTime = 0;
  audio.addEventListener('error', recoverSoundtrack);
  currentMode = 'drawing';
  currentAudio = audio;
  recoveryAttempts = 0;
  requestPlayback();
};

export const startBattleSoundtrack = (enabled: boolean): void => {
  installVisibilityHandler();
  stopSoundtrack();
  const audio = preparedBattleAudio;
  preparedBattleAudio = null;
  if (!audio) {
    replaceSoundtrack('battle', BATTLE_SOUNDTRACK.url, enabled);
    return;
  }
  audio.removeEventListener('error', discardPreparedBattleAudio);
  audio.dataset.scribbitsSoundtrack = 'battle';
  audio.dataset.scribbitsSoundtrackSource = BATTLE_SOUNDTRACK.url;
  audio.autoplay = enabled;
  audio.volume = BATTLE_SOUNDTRACK.volume;
  audio.currentTime = 0;
  audio.addEventListener('error', recoverSoundtrack);
  currentMode = 'battle';
  currentAudio = audio;
  if (enabled) requestPlayback();
  else audio.pause();
};

export const setBattleSoundtrackEnabled = (enabled: boolean): void => {
  if (currentMode !== 'battle' || !currentAudio) return;
  if (enabled) {
    requestPlayback();
    return;
  }
  playbackRequested = false;
  currentAudio.pause();
};

export const stopBattleSoundtrack = (): void => {
  if (currentMode === 'battle') stopSoundtrack();
};

export const resumeDrawingSoundtrack = (): void => {
  if (currentMode !== 'drawing' || !currentAudio) {
    startDrawingSoundtrack();
    return;
  }
  requestPlayback();
};

export const pauseDrawingSoundtrack = (): void => {
  if (currentMode !== 'drawing' || !currentAudio) return;
  playbackRequested = false;
  currentAudio.pause();
};

export const stopSoundtrack = (): void => {
  playbackRequested = false;
  recoveryAttempts = 0;
  cancelPendingHomeStop();
  removeRetryListeners();
  currentMode = null;
  if (!currentAudio) return;
  discardAudio(currentAudio);
  currentAudio = null;
};
