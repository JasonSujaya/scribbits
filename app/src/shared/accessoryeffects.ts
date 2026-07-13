export const ACCESSORY_EFFECT_MODE = 'combat-active-v1' as const;

export type AccessoryEffectFamily =
  | 'guard'
  | 'rush'
  | 'focus'
  | 'ready'
  | 'fortune'
  | 'aim';

export type AccessoryEffectDefinition = Readonly<{
  id: AccessoryEffectFamily;
  name: string;
  techniqueName: string;
  battleCue: string;
  shortCopy: string;
}>;

export const ACCESSORY_EFFECTS: Readonly<
  Record<AccessoryEffectFamily, AccessoryEffectDefinition>
> = Object.freeze({
  guard: {
    id: 'guard',
    name: 'Guard',
    techniqueName: 'Paper Guard',
    battleCue: 'A paper shield toughens the heart row.',
    shortCopy: 'A sturdy, patient battle style.',
  },
  rush: {
    id: 'rush',
    name: 'Rush',
    techniqueName: 'Dash Blades',
    battleCue: 'Fast ink blades trail each Shape Power.',
    shortCopy: 'A quicker, lighter battle style.',
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    techniqueName: 'Orbiting Nibs',
    battleCue: 'Orbiting nibs tighten the next wind-up.',
    shortCopy: 'Earlier tells with slower recovery.',
  },
  ready: {
    id: 'ready',
    name: 'Ready',
    techniqueName: 'First Strike',
    battleCue: 'A first-mark slash opens the fight sooner.',
    shortCopy: 'Starts quickly, then hits a little softer.',
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    techniqueName: 'Lucky Echo',
    battleCue: 'A lucky echo can sharpen a clean hit.',
    shortCopy: 'A lucky style with softer base hits.',
  },
  aim: {
    id: 'aim',
    name: 'Aim',
    techniqueName: 'Blade Volley',
    battleCue: 'A focused blade volley adds impact.',
    shortCopy: 'Reaches farther with softer base hits.',
  },
});

export function accessoryEffect(
  family: AccessoryEffectFamily
): AccessoryEffectDefinition {
  return ACCESSORY_EFFECTS[family];
}
