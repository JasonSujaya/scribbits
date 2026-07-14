const READY_SET_SCRIBBLE_URL = new URL(
  '../assets/ready-set-scribble.mp3',
  import.meta.url
).href;
const HOME_SOUNDTRACK_URLS = [
  new URL('../assets/pocketful-of-ink.mp3', import.meta.url).href,
  new URL('../assets/legends-in-the-margins.mp3', import.meta.url).href,
] as const;

type SoundtrackMode = 'drawing' | 'home';

let currentAudio: HTMLAudioElement | null = null;
let currentMode: SoundtrackMode | null = null;
let hasPlayedHomeSoundtrack = false;
let playbackRequested = false;
let retryListenersInstalled = false;

export const chooseHomeTrackIndex = (
  hasPlayedHomeTrack: boolean,
  randomValue: number
): number => {
  const trackCount = HOME_SOUNDTRACK_URLS.length;
  if (!hasPlayedHomeTrack) return 0;
  const normalizedRandom = Math.min(Math.max(randomValue, 0), 0.999999);
  return Math.floor(normalizedRandom * trackCount);
};

const removeRetryListeners = (): void => {
  if (!retryListenersInstalled || typeof document === 'undefined') return;
  document.removeEventListener('pointerdown', retryPlayback);
  document.removeEventListener('keydown', retryPlayback);
  retryListenersInstalled = false;
};

const requestPlayback = (): void => {
  const audio = currentAudio;
  if (!audio) return;
  playbackRequested = true;
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
  document.addEventListener('pointerdown', retryPlayback);
  document.addEventListener('keydown', retryPlayback);
  retryListenersInstalled = true;
}

const replaceSoundtrack = (
  mode: SoundtrackMode,
  source: string,
  onEnded?: () => void
): void => {
  stopSoundtrack();
  if (typeof Audio === 'undefined') return;

  const audio = new Audio(source);
  audio.dataset.scribbitsSoundtrack = mode;
  audio.preload = 'auto';
  audio.volume = 0.32;
  audio.onended = onEnded ?? null;
  audio.style.display = 'none';
  document.body.append(audio);
  currentMode = mode;
  currentAudio = audio;
  requestPlayback();
};

export const playHomeSoundtrack = (): void => {
  const nextTrackIndex = chooseHomeTrackIndex(
    hasPlayedHomeSoundtrack,
    Math.random()
  );
  hasPlayedHomeSoundtrack = true;
  const source =
    HOME_SOUNDTRACK_URLS[nextTrackIndex] ?? HOME_SOUNDTRACK_URLS[0];
  replaceSoundtrack('home', source, () => {
    if (currentMode === 'home') playHomeSoundtrack();
  });
};

export const startDrawingSoundtrack = (): void => {
  replaceSoundtrack('drawing', READY_SET_SCRIBBLE_URL);
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
  removeRetryListeners();
  currentMode = null;
  if (!currentAudio) return;
  currentAudio.onended = null;
  currentAudio.pause();
  currentAudio.remove();
  currentAudio = null;
};
