import type { Element, ScribbitStats } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import { selectPrimaryPower } from '../../shared/combat/selection';
import {
  getShapePowerContent,
  getShapePowerSignatureName,
} from '../../shared/combat/shapepowercontent';

export type DoodleDare = Readonly<{
  id: string;
  prompt: string;
  suggestedPower: PrimaryPower;
}>;

export type DrawFeedbackPlan = Readonly<{
  phase: 'blank' | 'sketching' | 'ready';
  message: string;
  power: PrimaryPower | null;
}>;

export const DRAW_HEADER_TITLE = 'DRAW IT. WATCH IT FIGHT.';
export const DRAW_RULES_COPY =
  'BIG = SMASH  •  SPIKY = QUILLS\nCOMPACT = DASH  •  COLOR = BLAST';
export const FIRST_RUN_PROMISE =
  'FIRST RUN  •  DRAW → WATCH IT FIGHT → EARN INK';

export const DOODLE_DARE_HINT_BY_POWER: Readonly<Record<PrimaryPower, string>> =
  Object.freeze({
    inkquake: 'Big, filled bodies wake Inkquake.',
    nib_halo: 'Sharp edges wake Nib Halo.',
    smearstep: 'Small, compact shapes wake Smearstep.',
    colorburst: 'More colors wake Colorburst.',
  });

// Four prompts per Shape Power keep the optional inspiration varied without
// steering the whole community toward one build. Selection is stable per player
// and arena day, so reloads never reroll the creative brief.
export const DOODLE_DARES: readonly DoodleDare[] = Object.freeze([
  {
    id: 'moon-dumpling',
    prompt: 'a moon dumpling with stompy feet',
    suggestedPower: 'inkquake',
  },
  {
    id: 'volcano-frog',
    prompt: 'a round volcano frog',
    suggestedPower: 'inkquake',
  },
  {
    id: 'cloud-bear',
    prompt: 'a giant sleepy cloud bear',
    suggestedPower: 'inkquake',
  },
  {
    id: 'pebble-ogre',
    prompt: 'a chunky pebble ogre',
    suggestedPower: 'inkquake',
  },
  {
    id: 'thunder-porcupine',
    prompt: 'a thunder porcupine',
    suggestedPower: 'nib_halo',
  },
  {
    id: 'cactus-dragon',
    prompt: 'a cactus dragon with too many spikes',
    suggestedPower: 'nib_halo',
  },
  {
    id: 'crown-moth',
    prompt: 'a moth wearing a thorn crown',
    suggestedPower: 'nib_halo',
  },
  {
    id: 'toothy-star',
    prompt: 'a star monster made of teeth',
    suggestedPower: 'nib_halo',
  },
  {
    id: 'comet-mouse',
    prompt: 'a tiny comet mouse',
    suggestedPower: 'smearstep',
  },
  {
    id: 'paper-fox',
    prompt: 'a folded-paper fox',
    suggestedPower: 'smearstep',
  },
  {
    id: 'pocket-ufo',
    prompt: 'a pocket-sized UFO with legs',
    suggestedPower: 'smearstep',
  },
  {
    id: 'racing-snail',
    prompt: "the world's fastest tiny snail",
    suggestedPower: 'smearstep',
  },
  {
    id: 'disco-jellyfish',
    prompt: 'a disco jellyfish',
    suggestedPower: 'colorburst',
  },
  {
    id: 'candy-volcano',
    prompt: 'a candy volcano in four colors',
    suggestedPower: 'colorburst',
  },
  {
    id: 'patchwork-ghost',
    prompt: 'a patchwork rainbow ghost',
    suggestedPower: 'colorburst',
  },
  {
    id: 'paint-squid',
    prompt: 'a paint-splatter squid',
    suggestedPower: 'colorburst',
  },
]);

function stableTextHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectDailyDoodleDare(
  dayNumber: number,
  username: string | null
): DoodleDare {
  const stableDay = Number.isSafeInteger(dayNumber) ? dayNumber : 0;
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  const index =
    stableTextHash(`${stableDay}:${stablePlayer}`) % DOODLE_DARES.length;
  const selectedDare = DOODLE_DARES[index];
  if (!selectedDare) {
    throw new Error('Doodle dare catalog must not be empty.');
  }
  return selectedDare;
}

export function planDrawFeedback(
  input: Readonly<{
    inkedPixels: number;
    minimumInkedPixels: number;
    stats: ScribbitStats;
    element: Element;
  }>
): DrawFeedbackPlan {
  if (input.inkedPixels <= 0) {
    return {
      phase: 'blank',
      message: 'DRAW A BOLD BODY TO REVEAL ITS MOVE',
      power: null,
    };
  }
  if (input.inkedPixels < input.minimumInkedPixels) {
    return {
      phase: 'sketching',
      message: 'KEEP GOING — GIVE IT A LITTLE MORE INK',
      power: null,
    };
  }

  const power = selectPrimaryPower(input.stats);
  const signatureName = getShapePowerSignatureName(input.element, power);
  return {
    phase: 'ready',
    message: `${signatureName.toUpperCase()} • ${getShapePowerContent(power).revealLine.toLowerCase()}`,
    power,
  };
}
