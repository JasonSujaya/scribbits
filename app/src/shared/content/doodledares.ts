// Immutable optional drawing prompts. The catalog lives in repo-authored content;
// selection is deterministic and stores nothing in Redis or the player profile.

import { SHAPE_POWER_IDS } from '../combat/shapepowercontent';
import type { PrimaryPower } from '../combat/types';
import { hashContentKey } from './deterministic';

export type DoodleDare = Readonly<{
  id: string;
  prompt: string;
  suggestedPower: PrimaryPower;
}>;

export type DoodleDareCatalogValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  promptCount: number;
  twistCount: number;
  promptsPerPower: Readonly<Record<PrimaryPower, number>>;
}>;

export const DOODLE_DARE_CALENDAR_VERSION = 1;
const PROMPTS_PER_POWER = 8;
const PROMPT_MAXIMUM_LENGTH = 52;
const EXPECTED_TWIST_COUNT = 8;
const TWIST_MAXIMUM_LENGTH = 52;
const PROMPT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN_PROMPT_CLAIM =
  /\b(?:win|winner|odds|guaranteed|reward|ink|xp|clout|prize)\b/i;

const freezeDoodleDare = (dare: DoodleDare): DoodleDare =>
  Object.freeze({ ...dare });

export const DOODLE_DARES: readonly DoodleDare[] = Object.freeze(
  (
    [
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
        id: 'pillow-golem',
        prompt: 'a pillow golem with tiny boots',
        suggestedPower: 'inkquake',
      },
      {
        id: 'planet-crab',
        prompt: 'a sleepy planet crab',
        suggestedPower: 'inkquake',
      },
      {
        id: 'bread-troll',
        prompt: 'a bread loaf troll with heavy feet',
        suggestedPower: 'inkquake',
      },
      {
        id: 'boulder-penguin',
        prompt: 'a boulder penguin wearing mittens',
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
        id: 'lantern-bat',
        prompt: 'a lantern bat with needle wings',
        suggestedPower: 'nib_halo',
      },
      {
        id: 'crystal-hedgehog',
        prompt: 'a crystal hedgehog knight',
        suggestedPower: 'nib_halo',
      },
      {
        id: 'royal-urchin',
        prompt: 'a sea urchin in a royal cape',
        suggestedPower: 'nib_halo',
      },
      {
        id: 'lightning-flower',
        prompt: 'a lightning flower with sharp petals',
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
        id: 'roller-flea',
        prompt: 'a wind-up flea on roller skates',
        suggestedPower: 'smearstep',
      },
      {
        id: 'rocket-tadpole',
        prompt: 'a tiny rocket tadpole',
        suggestedPower: 'smearstep',
      },
      {
        id: 'stamp-cheetah',
        prompt: 'a postage-stamp cheetah',
        suggestedPower: 'smearstep',
      },
      {
        id: 'runaway-teacup',
        prompt: 'a runaway teacup with sneakers',
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
      {
        id: 'glass-axolotl',
        prompt: 'a stained-glass axolotl',
        suggestedPower: 'colorburst',
      },
      {
        id: 'confetti-phoenix',
        prompt: 'a confetti phoenix chick',
        suggestedPower: 'colorburst',
      },
      {
        id: 'neon-slug',
        prompt: 'a neon garden slug',
        suggestedPower: 'colorburst',
      },
      {
        id: 'crayon-coral',
        prompt: 'a crayon coral castle',
        suggestedPower: 'colorburst',
      },
    ] satisfies DoodleDare[]
  ).map(freezeDoodleDare)
);

export const DOODLE_DARE_TWISTS: readonly string[] = Object.freeze([
  'give it one ridiculously tiny feature',
  'hide a secret star somewhere',
  'make one side wobblier than the other',
  'add a face that knows a secret',
  'give it something much too big to wear',
  'draw a heroic but impractical tail',
  'add a snack it refuses to share',
  'give it one surprising patch of color',
]);

export const validateDoodleDareCatalog = (
  dares: readonly DoodleDare[] = DOODLE_DARES,
  twists: readonly string[] = DOODLE_DARE_TWISTS
): DoodleDareCatalogValidation => {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenPrompts = new Set<string>();
  const seenTwists = new Set<string>();
  const promptsPerPower: Record<PrimaryPower, number> = {
    inkquake: 0,
    nib_halo: 0,
    smearstep: 0,
    colorburst: 0,
  };

  for (const dare of dares) {
    const label = dare.id || 'unnamed dare';
    if (!PROMPT_ID_PATTERN.test(dare.id)) {
      errors.push(`${label} has an invalid content id`);
    }
    if (seenIds.has(dare.id)) errors.push(`${label} id is duplicated`);
    seenIds.add(dare.id);

    const normalizedPrompt = dare.prompt.trim().toLowerCase();
    if (normalizedPrompt.length === 0) {
      errors.push(`${label} prompt must not be blank`);
    }
    if (dare.prompt !== dare.prompt.trim()) {
      errors.push(`${label} prompt must not have outer whitespace`);
    }
    if (dare.prompt.length > PROMPT_MAXIMUM_LENGTH) {
      errors.push(
        `${label} prompt is ${dare.prompt.length} characters; maximum is ${PROMPT_MAXIMUM_LENGTH}`
      );
    }
    if (seenPrompts.has(normalizedPrompt)) {
      errors.push(`${label} prompt is duplicated`);
    }
    seenPrompts.add(normalizedPrompt);
    if (FORBIDDEN_PROMPT_CLAIM.test(dare.prompt)) {
      errors.push(`${label} prompt predicts an outcome or promises a reward`);
    }
    if (!SHAPE_POWER_IDS.includes(dare.suggestedPower)) {
      errors.push(`${label} has an unknown suggested Shape Power`);
      continue;
    }
    promptsPerPower[dare.suggestedPower] += 1;
  }

  for (const power of SHAPE_POWER_IDS) {
    if (promptsPerPower[power] !== PROMPTS_PER_POWER) {
      errors.push(
        `${power} has ${promptsPerPower[power]} prompts; expected ${PROMPTS_PER_POWER}`
      );
    }
  }

  if (twists.length !== EXPECTED_TWIST_COUNT) {
    errors.push(
      `Expected ${EXPECTED_TWIST_COUNT} Doodle Dare twists, found ${twists.length}`
    );
  }
  twists.forEach((twist, index) => {
    const label = `Doodle Dare twist ${index + 1}`;
    const normalizedTwist = twist.trim().toLowerCase();
    if (normalizedTwist.length === 0) errors.push(`${label} must not be blank`);
    if (twist !== twist.trim()) {
      errors.push(`${label} must not have outer whitespace`);
    }
    if (twist.length > TWIST_MAXIMUM_LENGTH) {
      errors.push(
        `${label} is ${twist.length} characters; maximum is ${TWIST_MAXIMUM_LENGTH}`
      );
    }
    if (seenTwists.has(normalizedTwist)) {
      errors.push(`${label} is duplicated`);
    }
    seenTwists.add(normalizedTwist);
    if (FORBIDDEN_PROMPT_CLAIM.test(twist)) {
      errors.push(`${label} predicts an outcome or promises a reward`);
    }
  });

  const frozenErrors = Object.freeze(errors);
  return Object.freeze({
    valid: frozenErrors.length === 0,
    errors: frozenErrors,
    promptCount: dares.length,
    twistCount: twists.length,
    promptsPerPower: Object.freeze({ ...promptsPerPower }),
  });
};

const catalogValidation = validateDoodleDareCatalog();
if (!catalogValidation.valid) {
  throw new Error(
    `Invalid Doodle Dare content:\n${catalogValidation.errors.join('\n')}`
  );
}

const daresByPower: ReadonlyMap<PrimaryPower, readonly DoodleDare[]> = new Map(
  SHAPE_POWER_IDS.map((power) => [
    power,
    Object.freeze(DOODLE_DARES.filter((dare) => dare.suggestedPower === power)),
  ])
);

export function selectDoodleDareForPower(
  power: PrimaryPower,
  stableKey: string
): DoodleDare {
  const prompts = daresByPower.get(power);
  if (!prompts || prompts.length === 0) {
    throw new Error(`Doodle dare catalog is missing ${power}.`);
  }
  const prompt = prompts[hashContentKey(stableKey) % prompts.length];
  if (!prompt) throw new Error(`Doodle dare selection failed for ${power}.`);
  return prompt;
}

// Each player receives all four drawing identities every four Arena days and all
// 32 prompts before their schedule repeats. Username offsets keep the community
// from receiving one identical brief while reloads remain stable.
export function selectDailyDoodleDare(
  dayNumber: number,
  username: string | null
): DoodleDare {
  const stableDay =
    Number.isSafeInteger(dayNumber) && dayNumber >= 1 ? dayNumber : 1;
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  const zeroBasedDay = stableDay - 1;
  const powerOffset =
    hashContentKey(`v${DOODLE_DARE_CALENDAR_VERSION}:power:${stablePlayer}`) %
    SHAPE_POWER_IDS.length;
  const power =
    SHAPE_POWER_IDS[(zeroBasedDay + powerOffset) % SHAPE_POWER_IDS.length] ??
    'inkquake';
  const prompts = daresByPower.get(power);
  if (!prompts || prompts.length === 0) {
    throw new Error(`Doodle dare catalog is missing ${power}.`);
  }
  const fourDayCycle = Math.floor(zeroBasedDay / SHAPE_POWER_IDS.length);
  const promptOffset =
    hashContentKey(
      `v${DOODLE_DARE_CALENDAR_VERSION}:prompt:${stablePlayer}:${power}`
    ) % prompts.length;
  const prompt = prompts[(fourDayCycle + promptOffset) % prompts.length];
  if (!prompt)
    throw new Error(`Daily Doodle Dare selection failed for ${power}.`);
  return prompt;
}

// The prompt calendar repeats after 32 days. Advancing the twist by one extra
// step at each 32-day boundary makes the exact prompt-plus-twist card repeat only
// after 256 days. A future prompt pack must use a new calendar version and an
// explicit Arena-day activation instead of mutating this launched schedule.
export function selectDailyDoodleDareTwist(
  dayNumber: number,
  username: string | null
): string {
  const stableDay =
    Number.isSafeInteger(dayNumber) && dayNumber >= 1 ? dayNumber : 1;
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  const zeroBasedDay = stableDay - 1;
  const calendarCycle = Math.floor(zeroBasedDay / DOODLE_DARES.length);
  const playerOffset =
    hashContentKey(`v${DOODLE_DARE_CALENDAR_VERSION}:twist:${stablePlayer}`) %
    DOODLE_DARE_TWISTS.length;
  const twist =
    DOODLE_DARE_TWISTS[
      (zeroBasedDay + calendarCycle + playerOffset) % DOODLE_DARE_TWISTS.length
    ];
  if (!twist) throw new Error('Doodle Dare twist catalog must not be empty.');
  return twist;
}
