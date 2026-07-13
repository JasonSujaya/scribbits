export const ACCESSORY_EFFECT_MODE = 'display-only' as const;

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
  shortCopy: string;
  futureBenefit: string;
  futureTradeoff: string;
  engineReadiness: 'existing-axes' | 'new-axis-required';
}>;

export const ACCESSORY_EFFECTS: Readonly<
  Record<AccessoryEffectFamily, AccessoryEffectDefinition>
> = Object.freeze({
  guard: {
    id: 'guard',
    name: 'Guard',
    shortCopy: 'A sturdy, patient battle style.',
    futureBenefit: '+0.5% maximum HP',
    futureTradeoff: '-0.5% damage',
    engineReadiness: 'existing-axes',
  },
  rush: {
    id: 'rush',
    name: 'Rush',
    shortCopy: 'A quicker, lighter battle style.',
    futureBenefit: '-1% ability cooldown',
    futureTradeoff: '-0.5% maximum HP',
    engineReadiness: 'existing-axes',
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    shortCopy: 'Earlier tells with slower recovery.',
    futureBenefit: '-1 telegraph tick',
    futureTradeoff: '+1% ability cooldown',
    engineReadiness: 'existing-axes',
  },
  ready: {
    id: 'ready',
    name: 'Ready',
    shortCopy: 'Starts quickly, then hits a little softer.',
    futureBenefit: '-1 initial ability-delay tick',
    futureTradeoff: '-0.5% damage',
    engineReadiness: 'existing-axes',
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    shortCopy: 'A lucky style with softer base hits.',
    futureBenefit: '+0.6 percentage points critical chance',
    futureTradeoff: '-0.3% damage',
    engineReadiness: 'existing-axes',
  },
  aim: {
    id: 'aim',
    name: 'Aim',
    shortCopy: 'Reaches farther with softer base hits.',
    futureBenefit: '+3% Shape Power collision or range',
    futureTradeoff: '-0.5% damage',
    engineReadiness: 'new-axis-required',
  },
});

export function accessoryEffect(
  family: AccessoryEffectFamily
): AccessoryEffectDefinition {
  return ACCESSORY_EFFECTS[family];
}
