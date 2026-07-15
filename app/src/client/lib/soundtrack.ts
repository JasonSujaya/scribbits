import { MUSIC_CATALOG } from './audiocatalog';

const READY_SET_SCRIBBLE_TRACK = MUSIC_CATALOG.drawing[0];
const HOME_SOUNDTRACKS = MUSIC_CATALOG.home;
const BATTLE_SOUNDTRACK = MUSIC_CATALOG.battle[0];

type SoundtrackMode = 'battle' | 'drawing' | 'home';

let currentAudio: HTMLAudioElement | null = null;
let currentMode: SoundtrackMode | null = null;
let hasPlayedHomeSoundtrack = false;
let playbackRequested = false;
let retryListenersInstalled = false;
let pendingHomeStop: number | null = null;
let visibilityHandlerInstalled = false;

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
  void audio.play().then(
    () => removeRetryListeners(),
    () => installRetryListeners()
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
  // Try immediately. Browsers that allow startup audio begin the Home track
  // without making the player tap an arbitrary control first. If autoplay is
  // blocked, attemptPlayback installs the first-interaction retry listeners.
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

const replaceSoundtrack = (
  mode: SoundtrackMode,
  source: string,
  startPlaying = true
): void => {
  installVisibilityHandler();
  stopSoundtrack();
  if (typeof Audio === 'undefined') return;

  const audio = new Audio();
  audio.dataset.scribbitsSoundtrack = mode;
  audio.preload = 'auto';
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
  document.body.append(audio);
  currentMode = mode;
  currentAudio = audio;
  if (startPlaying) requestPlayback();
};

const chooseNextHomeSoundtrack = (): string => {
  const nextTrackIndex = chooseHomeTrackIndex(
    hasPlayedHomeSoundtrack,
    Math.random()
  );
  hasPlayedHomeSoundtrack = true;
  return (
    HOME_SOUNDTRACKS[nextTrackIndex]?.url ?? HOME_SOUNDTRACKS[0].url
  );
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
  replaceSoundtrack('drawing', READY_SET_SCRIBBLE_TRACK.url);
};

export const startBattleSoundtrack = (enabled: boolean): void => {
  replaceSoundtrack('battle', BATTLE_SOUNDTRACK.url, enabled);
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
  cancelPendingHomeStop();
  removeRetryListeners();
  currentMode = null;
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.remove();
  currentAudio = null;
};
