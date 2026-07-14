import { MUSIC_CATALOG } from './audiocatalog';

const READY_SET_SCRIBBLE_TRACK = MUSIC_CATALOG.drawing[0];
const HOME_SOUNDTRACKS = MUSIC_CATALOG.home;

type SoundtrackMode = 'drawing' | 'home';

let currentAudio: HTMLAudioElement | null = null;
let currentMode: SoundtrackMode | null = null;
let hasPlayedHomeSoundtrack = false;
let playbackRequested = false;
let retryListenersInstalled = false;
let pendingHomeStop: number | null = null;
let visibilityHandlerInstalled = false;

const hasTrustedAudioGesture = (): boolean => {
  return navigator.userActivation?.hasBeenActive === true;
};

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

const requestPlayback = (): void => {
  const audio = currentAudio;
  if (!audio) return;
  playbackRequested = true;
  if (document.hidden || !hasTrustedAudioGesture()) {
    installRetryListeners();
    return;
  }
  void audio.play().then(
    () => removeRetryListeners(),
    () => installRetryListeners()
  );
};

function retryPlayback(): void {
  if (!playbackRequested || !currentAudio) return;
  requestPlayback();
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
  onEnded?: () => void
): void => {
  installVisibilityHandler();
  stopSoundtrack();
  if (typeof Audio === 'undefined') return;

  const audio = new Audio();
  audio.dataset.scribbitsSoundtrack = mode;
  // Each MP3 is fetched only when it becomes the active track. In particular,
  // opening Home never downloads the drawing song or both idle songs.
  audio.preload = 'none';
  audio.src = source;
  audio.volume =
    mode === 'drawing'
      ? READY_SET_SCRIBBLE_TRACK.volume
      : (HOME_SOUNDTRACKS.find((track) => track.url === source)?.volume ??
        0.32);
  audio.onended = onEnded ?? null;
  audio.style.display = 'none';
  document.body.append(audio);
  currentMode = mode;
  currentAudio = audio;
  requestPlayback();
};

const startNextHomeSoundtrack = (): void => {
  const nextTrackIndex = chooseHomeTrackIndex(
    hasPlayedHomeSoundtrack,
    Math.random()
  );
  hasPlayedHomeSoundtrack = true;
  const source =
    HOME_SOUNDTRACKS[nextTrackIndex]?.url ?? HOME_SOUNDTRACKS[0].url;
  replaceSoundtrack('home', source, () => {
    if (currentMode === 'home') startNextHomeSoundtrack();
  });
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
  currentAudio.onended = null;
  currentAudio.pause();
  currentAudio.remove();
  currentAudio = null;
};
