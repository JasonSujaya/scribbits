// The single source of truth for every shipped music track, SFX cue, local
// sample, mix level, variation, cooldown, and source license. Callers use
// semantic cue IDs only; filenames never leak into scenes or UI helpers.

export const AUDIO_SOURCE_PACKS = {
  'kenney-interface': {
    name: 'Interface Sounds',
    creator: 'Kenney',
    url: 'https://kenney.nl/assets/interface-sounds',
    license: 'CC0-1.0',
  },
  'kenney-impact': {
    name: 'Impact Sounds',
    creator: 'Kenney',
    url: 'https://kenney.nl/assets/impact-sounds',
    license: 'CC0-1.0',
  },
  'kenney-rpg': {
    name: 'RPG Audio',
    creator: 'Kenney',
    url: 'https://kenney.nl/assets/rpg-audio',
    license: 'CC0-1.0',
  },
} as const;

export type AudioSourcePackId = keyof typeof AUDIO_SOURCE_PACKS;

const AUDIO_ASSETS = {
  'ui-click-1': {
    url: new URL('../assets/sfx/ui-click-1.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'click_001.ogg',
  },
  'ui-click-2': {
    url: new URL('../assets/sfx/ui-click-2.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'click_002.ogg',
  },
  'ui-select-1': {
    url: new URL('../assets/sfx/ui-select-1.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'select_001.ogg',
  },
  'ui-select-2': {
    url: new URL('../assets/sfx/ui-select-2.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'select_003.ogg',
  },
  'ui-back': {
    url: new URL('../assets/sfx/ui-back.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'back_001.ogg',
  },
  'ui-close': {
    url: new URL('../assets/sfx/ui-close.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'close_001.ogg',
  },
  'ui-open': {
    url: new URL('../assets/sfx/ui-open.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'open_001.ogg',
  },
  'ui-confirm-1': {
    url: new URL('../assets/sfx/ui-confirm-1.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'confirmation_001.ogg',
  },
  'ui-confirm-2': {
    url: new URL('../assets/sfx/ui-confirm-2.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'confirmation_002.ogg',
  },
  'ui-error': {
    url: new URL('../assets/sfx/ui-error.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'error_001.ogg',
  },
  'ui-toggle': {
    url: new URL('../assets/sfx/ui-toggle.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'toggle_001.ogg',
  },
  'ui-tick': {
    url: new URL('../assets/sfx/ui-tick.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'tick_001.ogg',
  },
  'ui-scratch': {
    url: new URL('../assets/sfx/ui-scratch.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'scratch_001.ogg',
  },
  'ui-pluck': {
    url: new URL('../assets/sfx/ui-pluck.mp3', import.meta.url).href,
    sourcePack: 'kenney-interface',
    sourceFile: 'pluck_001.ogg',
  },
  'paper-flip-1': {
    url: new URL('../assets/sfx/paper-flip-1.mp3', import.meta.url).href,
    sourcePack: 'kenney-rpg',
    sourceFile: 'bookFlip1.ogg',
  },
  'paper-flip-2': {
    url: new URL('../assets/sfx/paper-flip-2.mp3', import.meta.url).href,
    sourcePack: 'kenney-rpg',
    sourceFile: 'bookFlip2.ogg',
  },
  'paper-open': {
    url: new URL('../assets/sfx/paper-open.mp3', import.meta.url).href,
    sourcePack: 'kenney-rpg',
    sourceFile: 'bookOpen.ogg',
  },
  'paper-close': {
    url: new URL('../assets/sfx/paper-close.mp3', import.meta.url).href,
    sourcePack: 'kenney-rpg',
    sourceFile: 'bookClose.ogg',
  },
  'cloth-rustle': {
    url: new URL('../assets/sfx/cloth-rustle.mp3', import.meta.url).href,
    sourcePack: 'kenney-rpg',
    sourceFile: 'cloth1.ogg',
  },
  'coin-rattle': {
    url: new URL('../assets/sfx/coin-rattle.mp3', import.meta.url).href,
    sourcePack: 'kenney-rpg',
    sourceFile: 'handleCoins.ogg',
  },
  'paper-slice': {
    url: new URL('../assets/sfx/paper-slice.mp3', import.meta.url).href,
    sourcePack: 'kenney-rpg',
    sourceFile: 'knifeSlice.ogg',
  },
  'impact-soft-1': {
    url: new URL('../assets/sfx/impact-soft-1.mp3', import.meta.url).href,
    sourcePack: 'kenney-impact',
    sourceFile: 'impactSoft_medium_000.ogg',
  },
  'impact-soft-2': {
    url: new URL('../assets/sfx/impact-soft-2.mp3', import.meta.url).href,
    sourcePack: 'kenney-impact',
    sourceFile: 'impactSoft_medium_001.ogg',
  },
  'impact-heavy': {
    url: new URL('../assets/sfx/impact-heavy.mp3', import.meta.url).href,
    sourcePack: 'kenney-impact',
    sourceFile: 'impactPunch_heavy_000.ogg',
  },
  'impact-metal': {
    url: new URL('../assets/sfx/impact-metal.mp3', import.meta.url).href,
    sourcePack: 'kenney-impact',
    sourceFile: 'impactMetal_light_000.ogg',
  },
  'impact-bell': {
    url: new URL('../assets/sfx/impact-bell.mp3', import.meta.url).href,
    sourcePack: 'kenney-impact',
    sourceFile: 'impactBell_heavy_000.ogg',
  },
  'impact-wood': {
    url: new URL('../assets/sfx/impact-wood.mp3', import.meta.url).href,
    sourcePack: 'kenney-impact',
    sourceFile: 'impactWood_heavy_000.ogg',
  },
} as const satisfies Record<
  string,
  Readonly<{
    url: string;
    sourcePack: AudioSourcePackId;
    sourceFile: string;
  }>
>;

export type SfxAssetId = keyof typeof AUDIO_ASSETS;

export type ProceduralTone = Readonly<{
  delaySeconds?: number;
  frequency: number;
  endingFrequency: number;
  durationSeconds: number;
  volume: number;
  wave: OscillatorType;
}>;

export type SfxDefinition = Readonly<{
  samples: readonly SfxAssetId[];
  volume: number;
  cooldownMilliseconds: number;
  maximumVoices: number;
  tones?: readonly ProceduralTone[];
}>;

const tone = (
  frequency: number,
  endingFrequency: number,
  durationSeconds: number,
  volume: number,
  wave: OscillatorType,
  delaySeconds = 0
): ProceduralTone => ({
  delaySeconds,
  frequency,
  endingFrequency,
  durationSeconds,
  volume,
  wave,
});

export const SFX_CATALOG = {
  'ui.tap': {
    samples: ['ui-click-1', 'ui-click-2'],
    volume: 0.28,
    cooldownMilliseconds: 32,
    maximumVoices: 3,
  },
  'ui.primary': {
    samples: ['ui-confirm-1'],
    volume: 0.34,
    cooldownMilliseconds: 90,
    maximumVoices: 2,
  },
  'ui.back': {
    samples: ['ui-back'],
    volume: 0.32,
    cooldownMilliseconds: 70,
    maximumVoices: 2,
  },
  'ui.close': {
    samples: ['ui-close', 'paper-close'],
    volume: 0.3,
    cooldownMilliseconds: 70,
    maximumVoices: 2,
  },
  'ui.open': {
    samples: ['ui-open', 'paper-open'],
    volume: 0.3,
    cooldownMilliseconds: 70,
    maximumVoices: 2,
  },
  'ui.page': {
    samples: ['paper-flip-1', 'paper-flip-2'],
    volume: 0.22,
    cooldownMilliseconds: 100,
    maximumVoices: 2,
  },
  'ui.tab': {
    samples: ['ui-select-1', 'ui-select-2'],
    volume: 0.28,
    cooldownMilliseconds: 70,
    maximumVoices: 2,
  },
  'ui.toggle': {
    samples: ['ui-toggle'],
    volume: 0.28,
    cooldownMilliseconds: 70,
    maximumVoices: 2,
  },
  'ui.error': {
    samples: ['ui-error'],
    volume: 0.32,
    cooldownMilliseconds: 180,
    maximumVoices: 1,
  },
  'ui.success': {
    samples: ['ui-confirm-2'],
    volume: 0.34,
    cooldownMilliseconds: 160,
    maximumVoices: 1,
  },
  'draw.ink': {
    samples: ['ui-scratch'],
    volume: 0.18,
    cooldownMilliseconds: 55,
    maximumVoices: 2,
  },
  'draw.tool': {
    samples: ['ui-select-1'],
    volume: 0.24,
    cooldownMilliseconds: 55,
    maximumVoices: 2,
  },
  'draw.tick': {
    samples: ['ui-tick'],
    volume: 0.22,
    cooldownMilliseconds: 80,
    maximumVoices: 1,
  },
  'draw.submit': {
    samples: ['paper-open', 'ui-confirm-2'],
    volume: 0.34,
    cooldownMilliseconds: 220,
    maximumVoices: 1,
  },
  'draw.finish': {
    samples: ['paper-flip-1', 'ui-confirm-1'],
    volume: 0.32,
    cooldownMilliseconds: 220,
    maximumVoices: 1,
    tones: [tone(440, 660, 0.16, 0.012, 'triangle')],
  },
  'scribbit.birth': {
    samples: ['paper-open', 'ui-pluck'],
    volume: 0.38,
    cooldownMilliseconds: 500,
    maximumVoices: 1,
    tones: [
      tone(330, 440, 0.18, 0.012, 'triangle'),
      tone(440, 660, 0.2, 0.014, 'triangle', 0.12),
    ],
  },
  'reward.ink': {
    samples: ['coin-rattle'],
    volume: 0.24,
    cooldownMilliseconds: 150,
    maximumVoices: 1,
  },
  'reward.reveal': {
    samples: ['paper-open', 'ui-pluck'],
    volume: 0.34,
    cooldownMilliseconds: 180,
    maximumVoices: 1,
  },
  'battle.fight': {
    samples: ['paper-open'],
    volume: 0.28,
    cooldownMilliseconds: 200,
    maximumVoices: 1,
    tones: [
      tone(130, 210, 0.13, 0.018, 'square'),
      tone(210, 330, 0.12, 0.014, 'triangle', 0.08),
    ],
  },
  'battle.telegraph': {
    samples: ['ui-pluck'],
    volume: 0.22,
    cooldownMilliseconds: 80,
    maximumVoices: 2,
    tones: [tone(240, 520, 0.16, 0.01, 'sine')],
  },
  'battle.hit': {
    samples: ['impact-soft-1', 'impact-soft-2'],
    volume: 0.38,
    cooldownMilliseconds: 45,
    maximumVoices: 3,
    tones: [tone(150, 55, 0.075, 0.014, 'square')],
  },
  'battle.critical': {
    samples: ['impact-heavy'],
    volume: 0.46,
    cooldownMilliseconds: 90,
    maximumVoices: 2,
    tones: [
      tone(110, 42, 0.13, 0.022, 'sawtooth'),
      tone(720, 340, 0.1, 0.012, 'triangle'),
    ],
  },
  'battle.shield': {
    samples: ['impact-metal'],
    volume: 0.34,
    cooldownMilliseconds: 90,
    maximumVoices: 2,
    tones: [tone(520, 180, 0.12, 0.011, 'triangle')],
  },
  'battle.shrink': {
    samples: ['cloth-rustle'],
    volume: 0.28,
    cooldownMilliseconds: 110,
    maximumVoices: 2,
    tones: [tone(210, 95, 0.24, 0.012, 'sawtooth')],
  },
  'battle.sudden': {
    samples: ['paper-slice'],
    volume: 0.32,
    cooldownMilliseconds: 180,
    maximumVoices: 1,
    tones: [
      tone(180, 360, 0.16, 0.014, 'square'),
      tone(240, 480, 0.16, 0.014, 'square', 0.12),
    ],
  },
  'battle.knockout': {
    samples: ['impact-wood'],
    volume: 0.44,
    cooldownMilliseconds: 250,
    maximumVoices: 1,
    tones: [tone(170, 45, 0.32, 0.02, 'sawtooth')],
  },
  'battle.bell': {
    samples: ['impact-bell'],
    volume: 0.34,
    cooldownMilliseconds: 300,
    maximumVoices: 1,
  },
  'battle.win': {
    samples: ['ui-confirm-2'],
    volume: 0.36,
    cooldownMilliseconds: 250,
    maximumVoices: 1,
    tones: [
      tone(330, 343, 0.16, 0.012, 'triangle'),
      tone(440, 458, 0.16, 0.012, 'triangle', 0.09),
      tone(660, 686, 0.16, 0.012, 'triangle', 0.18),
    ],
  },
  'battle.loss': {
    samples: ['paper-close', 'impact-soft-1'],
    volume: 0.3,
    cooldownMilliseconds: 250,
    maximumVoices: 1,
    tones: [
      tone(330, 220, 0.2, 0.012, 'triangle'),
      tone(220, 110, 0.24, 0.014, 'triangle', 0.14),
    ],
  },
} as const satisfies Record<string, SfxDefinition>;

export type SfxCue = keyof typeof SFX_CATALOG;

export const MUSIC_CATALOG = {
  battle: [
    {
      id: 'scribbits-battle',
      url: new URL('../assets/scribbits-battle.mp3', import.meta.url).href,
      volume: 0.24,
    },
  ],
  drawing: [
    {
      id: 'ready-set-scribble',
      url: new URL('../assets/ready-set-scribble.mp3', import.meta.url).href,
      volume: 0.32,
    },
  ],
  home: [
    {
      id: 'pocketful-of-ink',
      url: new URL('../assets/pocketful-of-ink.mp3', import.meta.url).href,
      volume: 0.32,
    },
    {
      id: 'legends-in-the-margins',
      url: new URL('../assets/legends-in-the-margins.mp3', import.meta.url)
        .href,
      volume: 0.32,
    },
  ],
} as const;

export type MusicMode = keyof typeof MUSIC_CATALOG;

export function audioAssetUrl(assetId: SfxAssetId): string {
  return AUDIO_ASSETS[assetId].url;
}

export function isSfxCue(value: string): value is SfxCue {
  return Object.hasOwn(SFX_CATALOG, value);
}

export const SFX_ASSET_PROVENANCE = AUDIO_ASSETS;
