import { findGearCosmetic } from '../cosmetics';
import type { AccessoryEffectFamily } from '../accessoryeffects';

export type GearWeekDay = Readonly<{
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  family: AccessoryEffectFamily | 'red-star';
  challenge: string;
  featuredGearIds: readonly string[];
}>;

export const GEAR_WEEK: readonly GearWeekDay[] = Object.freeze([
  Object.freeze({
    day: 1,
    title: 'Blade Basics',
    family: 'aim',
    challenge: 'Win once with Blade Volley equipped.',
    featuredGearIds: Object.freeze([
      'tiny-sword',
      'nib-halo-headband',
      'eyepatch-scar',
      'nib-halo-circlet',
      'comet-crayon-blade',
    ]),
  }),
  Object.freeze({
    day: 2,
    title: 'Paper Fort',
    family: 'guard',
    challenge: 'Finish with 2+ hearts using Paper Guard.',
    featuredGearIds: Object.freeze([
      'beanie',
      'snail-shell-backpack',
      'cape',
      'inkquake-crater-crown',
    ]),
  }),
  Object.freeze({
    day: 3,
    title: 'First Strike',
    family: 'ready',
    challenge: 'Trigger First Strike and win.',
    featuredGearIds: Object.freeze([
      'bowtie',
      'party-hat',
      'inkquake-rumble-belt',
      'top-hat',
    ]),
  }),
  Object.freeze({
    day: 4,
    title: 'Orbit School',
    family: 'focus',
    challenge: 'Land a critical Shape Power with Orbiting Nibs.',
    featuredGearIds: Object.freeze([
      'monocle',
      'round-glasses',
      'mustache',
      'headphones',
    ]),
  }),
  Object.freeze({
    day: 5,
    title: 'Dash Blades',
    family: 'rush',
    challenge: 'Cast four Shape Powers with Dash Blades.',
    featuredGearIds: Object.freeze([
      'smearstep-speed-scarf',
      'propeller-cap',
      'smearstep-ink-skates',
      'dragon-wings',
      'rocket-eraser-boots',
    ]),
  }),
  Object.freeze({
    day: 6,
    title: 'Lucky Echo',
    family: 'fortune',
    challenge: 'Land a critical Shape Power with Lucky Echo.',
    featuredGearIds: Object.freeze([
      'flower-crown',
      'colorburst-rosette',
      'golden-crown',
      'colorburst-prism-crown',
    ]),
  }),
  Object.freeze({
    day: 7,
    title: 'Red Star Showcase',
    family: 'red-star',
    challenge: 'Win with four techniques and one Red Star Gear.',
    featuredGearIds: Object.freeze([
      'tiny-sword',
      'beanie',
      'smearstep-speed-scarf',
      'flower-crown',
      'monocle',
      'bowtie',
    ]),
  }),
]);

export function selectGearWeekDay(arenaDay: number): GearWeekDay {
  const normalizedDay = Number.isFinite(arenaDay)
    ? Math.max(1, Math.floor(arenaDay))
    : 1;
  const selected = GEAR_WEEK[(normalizedDay - 1) % GEAR_WEEK.length];
  if (!selected) throw new Error('Gear Week content is empty.');
  return selected;
}

export function validateGearWeek(): string[] {
  const errors: string[] = [];
  if (GEAR_WEEK.length !== 7) errors.push('Gear Week must contain seven days.');
  const days = new Set<number>();
  for (const entry of GEAR_WEEK) {
    if (days.has(entry.day)) errors.push(`Gear Week repeats day ${entry.day}.`);
    days.add(entry.day);
    if (
      entry.title.trim().length === 0 ||
      entry.challenge.trim().length === 0
    ) {
      errors.push(`Gear Week day ${entry.day} is missing playable copy.`);
    }
    for (const gearId of entry.featuredGearIds) {
      if (!findGearCosmetic(gearId)) {
        errors.push(`Gear Week day ${entry.day} uses unknown Gear ${gearId}.`);
      }
    }
  }
  return errors;
}
