import {
  SFX_ASSET_PROVENANCE,
  SFX_CATALOG,
  audioAssetUrl,
  isSfxCue,
  type ProceduralTone,
  type SfxAssetId,
  type SfxCue,
  type SfxDefinition,
} from './audiocatalog';

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type InteractiveGameObject = Readonly<{
  input?: Readonly<{ cursor?: string | boolean; enabled?: boolean }> | null;
  getData?: (key: string) => unknown;
  setData?: (key: string, value: unknown) => unknown;
  on?: (eventName: string, listener: () => void) => unknown;
}>;

type SceneInput = Readonly<{
  on: (eventName: string, listener: (...args: unknown[]) => void) => unknown;
  off: (eventName: string, listener: (...args: unknown[]) => void) => unknown;
}>;

type SfxScene = Readonly<{
  input?: SceneInput;
  events?: Readonly<{
    once: (eventName: string, listener: () => void) => unknown;
  }>;
}>;

type SfxGame = Readonly<{
  canvas: HTMLCanvasElement;
  scene: Readonly<{ scenes: readonly SfxScene[] }>;
  events: Readonly<{
    once: (eventName: string, listener: () => void) => unknown;
  }>;
}>;

const SFX_ENABLED_STORAGE_KEY = 'scribbits.sfx.enabled';
const SFX_MANAGED_DATA_KEY = 'scribbitsSfxManaged';
const SFX_CUE_DATA_KEY = 'scribbitsSfxCue';
const attachedScenes = new WeakSet<object>();
const sampleBufferPromises = new Map<SfxAssetId, Promise<AudioBuffer | null>>();
const lastCueAt = new Map<SfxCue, number>();
const activeCueVoices = new Map<SfxCue, number>();
const nextSampleVariant = new Map<SfxCue, number>();

let sharedAudioContext: AudioContext | null = null;
let audioContextResume: Promise<AudioContext | null> | null = null;
let sfxEnabled = readStoredEnabledState();
let domSfxInstalled = false;
let activationListenersInstalled = false;
let visibilityHandlerInstalled = false;
let debugCanvas: HTMLCanvasElement | null = null;
let playCount = 0;

function readStoredEnabledState(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(SFX_ENABLED_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function storeEnabledState(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SFX_ENABLED_STORAGE_KEY, String(sfxEnabled));
  } catch {
    // Storage is an enhancement; audio remains session-local if blocked.
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    return sharedAudioContext;
  }
  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  try {
    sharedAudioContext = new AudioContextConstructor();
  } catch {
    sharedAudioContext = null;
  }
  return sharedAudioContext;
}

async function loadSampleBuffer(
  assetId: SfxAssetId
): Promise<AudioBuffer | null> {
  const existing = sampleBufferPromises.get(assetId);
  if (existing) return existing;

  const loading = (async (): Promise<AudioBuffer | null> => {
    const context = getAudioContext();
    if (!context || typeof fetch === 'undefined') return null;
    try {
      const response = await fetch(audioAssetUrl(assetId));
      if (!response.ok) return null;
      const encodedAudio = await response.arrayBuffer();
      return await context.decodeAudioData(encodedAudio.slice(0));
    } catch {
      return null;
    }
  })();
  sampleBufferPromises.set(assetId, loading);
  return loading;
}

function scheduleTone(
  context: AudioContext,
  baseTime: number,
  recipe: ProceduralTone
): void {
  const startsAt = baseTime + (recipe.delaySeconds ?? 0);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = recipe.wave;
  oscillator.frequency.setValueAtTime(Math.max(20, recipe.frequency), startsAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(20, recipe.endingFrequency),
    startsAt + recipe.durationSeconds
  );
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(recipe.volume, startsAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startsAt + recipe.durationSeconds
  );
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + recipe.durationSeconds + 0.01);
}

function recordDebugCue(cue: SfxCue): void {
  playCount += 1;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.lastSfxCue = cue;
    document.documentElement.dataset.sfxPlayCount = String(playCount);
    document.documentElement.dataset.sfxEnabled = String(sfxEnabled);
  }
  if (debugCanvas) {
    debugCanvas.dataset.lastSfxCue = cue;
    debugCanvas.dataset.sfxPlayCount = String(playCount);
    debugCanvas.dataset.sfxEnabled = String(sfxEnabled);
  }
}

function chooseSample(cue: SfxCue): SfxAssetId | null {
  const samples: readonly SfxAssetId[] = SFX_CATALOG[cue].samples;
  const variantIndex = nextSampleVariant.get(cue) ?? 0;
  nextSampleVariant.set(cue, (variantIndex + 1) % samples.length);
  return samples[variantIndex % samples.length] ?? null;
}

function beginCuePlayback(cue: SfxCue, context: AudioContext): void {
  const definition = SFX_CATALOG[cue] as SfxDefinition;
  const currentVoices = activeCueVoices.get(cue) ?? 0;
  if (currentVoices >= definition.maximumVoices) return;
  activeCueVoices.set(cue, currentVoices + 1);
  window.setTimeout(() => {
    activeCueVoices.set(cue, Math.max(0, (activeCueVoices.get(cue) ?? 1) - 1));
  }, 1_800);

  const startsAt = context.currentTime;
  definition.tones?.forEach((recipe) =>
    scheduleTone(context, startsAt, recipe)
  );

  const sample = chooseSample(cue);
  if (!sample) return;
  void loadSampleBuffer(sample).then((buffer) => {
    if (!buffer || !sfxEnabled || context.state === 'closed') return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = definition.volume;
    source.connect(gain).connect(context.destination);
    source.start();
  });
}

export function unlockSfx(): void {
  if (!sfxEnabled) return;
  void resumeSfxAudioContext();
}

function removeActivationListeners(): void {
  if (!activationListenersInstalled || typeof document === 'undefined') return;
  activationListenersInstalled = false;
  document.removeEventListener('pointerdown', unlockSfx, true);
  document.removeEventListener('keydown', unlockSfx, true);
}

async function resumeSfxAudioContext(): Promise<AudioContext | null> {
  const context = getAudioContext();
  if (!context || context.state === 'closed') return null;
  if (context.state === 'running') {
    removeActivationListeners();
    return context;
  }
  audioContextResume ??= context
    .resume()
    .then(() => (context.state === 'running' ? context : null))
    .catch(() => null)
    .finally(() => {
      audioContextResume = null;
    });
  const resumedContext = await audioContextResume;
  if (resumedContext) removeActivationListeners();
  return resumedContext;
}

/** Resume Web Audio inside the trusted Start Drawing gesture before 3-2-1. */
export async function prepareSfxPlayback(
  ...cues: readonly SfxCue[]
): Promise<boolean> {
  if (!sfxEnabled) return false;
  cues.forEach(preloadSfx);
  return (await resumeSfxAudioContext()) !== null;
}

export function playSfx(cue: SfxCue): boolean {
  if (!sfxEnabled) return false;
  const definition = SFX_CATALOG[cue];
  const now =
    typeof performance === 'undefined' ? Date.now() : performance.now();
  const previous = lastCueAt.get(cue) ?? Number.NEGATIVE_INFINITY;
  if (now - previous < definition.cooldownMilliseconds) return false;
  lastCueAt.set(cue, now);

  const context = getAudioContext();
  if (!context) return false;
  if (context.state === 'suspended') {
    void resumeSfxAudioContext().then((resumedContext) => {
      if (!resumedContext) return;
      recordDebugCue(cue);
      beginCuePlayback(cue, resumedContext);
    });
  } else if (context.state === 'running') {
    recordDebugCue(cue);
    beginCuePlayback(cue, context);
  }
  return true;
}

export function preloadSfx(cue: SfxCue): void {
  if (!sfxEnabled) return;
  SFX_CATALOG[cue].samples.forEach((assetId) => {
    void loadSampleBuffer(assetId);
  });
}

export function isSfxEnabled(): boolean {
  return sfxEnabled;
}

export function setSfxEnabled(enabled: boolean): boolean {
  sfxEnabled = enabled;
  storeEnabledState();
  recordEnabledDebugState();
  if (enabled) unlockSfx();
  return sfxEnabled;
}

export function toggleSfxEnabled(): boolean {
  return setSfxEnabled(!sfxEnabled);
}

function recordEnabledDebugState(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.sfxEnabled = String(sfxEnabled);
  }
  if (debugCanvas) debugCanvas.dataset.sfxEnabled = String(sfxEnabled);
}

export function markSfxManaged(gameObject: InteractiveGameObject): void {
  gameObject.setData?.(SFX_MANAGED_DATA_KEY, true);
}

export function setSfxCue(
  gameObject: InteractiveGameObject,
  cue: SfxCue
): void {
  gameObject.setData?.(SFX_CUE_DATA_KEY, cue);
  gameObject.on?.('pointerup', () => playSfx(cue));
}

function installDomActivationSounds(): void {
  if (domSfxInstalled || typeof document === 'undefined') return;
  domSfxInstalled = true;
  activationListenersInstalled = true;
  // Keep retrying trusted interactions until Reddit's WebView actually moves
  // the AudioContext to running. A rejected first resume must not mute SFX for
  // the rest of the session.
  document.addEventListener('pointerdown', unlockSfx, true);
  document.addEventListener('keydown', unlockSfx, true);
  if (!visibilityHandlerInstalled) {
    visibilityHandlerInstalled = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && sharedAudioContext?.state === 'running') {
        void sharedAudioContext.suspend().catch(() => undefined);
      }
    });
  }
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest<HTMLElement>(
        'button, [role="button"], a[href], input[type="button"], input[type="submit"]'
      );
      if (!action || action.matches(':disabled, [aria-disabled="true"]'))
        return;
      const configuredCue = action.dataset.sfxCue;
      if (configuredCue === 'none') return;
      playSfx(
        configuredCue && isSfxCue(configuredCue) ? configuredCue : 'ui.tap'
      );
    },
    true
  );
  recordEnabledDebugState();
}

function attachScene(scene: SfxScene): void {
  if (!scene.input || attachedScenes.has(scene)) return;
  attachedScenes.add(scene);
  const onGameObjectUp = (
    _pointer: unknown,
    gameObjectValue: unknown
  ): void => {
    const gameObject = gameObjectValue as InteractiveGameObject | undefined;
    if (!gameObject?.input || gameObject.input.enabled === false) return;
    if (gameObject.getData?.(SFX_MANAGED_DATA_KEY) === true) return;
    const configuredCue = gameObject.getData?.(SFX_CUE_DATA_KEY);
    if (typeof configuredCue === 'string' && isSfxCue(configuredCue)) {
      playSfx(configuredCue);
      return;
    }
    if (gameObject.input.cursor !== 'pointer') return;
    playSfx('ui.tap');
  };
  scene.input.on('gameobjectup', onGameObjectUp);
  scene.events?.once('destroy', () => {
    scene.input?.off('gameobjectup', onGameObjectUp);
  });
}

export function installSfx(game?: SfxGame): void {
  installDomActivationSounds();
  if (!game) return;
  debugCanvas = game.canvas;
  const attachScenes = (): void => game.scene.scenes.forEach(attachScene);
  attachScenes();
  game.events.once('ready', attachScenes);
  recordEnabledDebugState();
}

// Exported for the asset-contract test without exposing mutable runtime state.
export const SFX_ASSET_IDS = Object.freeze(
  Object.keys(SFX_ASSET_PROVENANCE) as SfxAssetId[]
);
