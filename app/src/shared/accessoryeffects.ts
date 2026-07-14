export const ACCESSORY_EFFECT_MODE = 'role-sidegrade-v1' as const;

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
    techniqueName: 'Quickstep',
    battleCue: 'Fast ink helps the role weapon recover between actions.',
    shortCopy: 'Faster handling with a lighter guard.',
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    techniqueName: 'Steady Hands',
    battleCue: 'A steady rhythm tightens the next visible wind-up.',
    shortCopy: 'Earlier tells with slower recovery.',
  },
  ready: {
    id: 'ready',
    name: 'Ready',
    techniqueName: 'Quick Draw',
    battleCue: 'A quick setup opens the role attack sooner.',
    shortCopy: 'Starts quickly, then hits a little softer.',
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    techniqueName: 'Focus Cycle',
    battleCue: 'A fixed focus rhythm sharpens a predictable clean hit.',
    shortCopy: 'Predictable focus hits with softer base impact.',
  },
  aim: {
    id: 'aim',
    name: 'Aim',
    techniqueName: 'True Aim',
    battleCue: 'Careful handling adds impact to the role weapon.',
    shortCopy: 'Harder impact with a lighter guard.',
  },
});

export function accessoryEffect(
  family: AccessoryEffectFamily
): AccessoryEffectDefinition {
  return ACCESSORY_EFFECTS[family];
}
