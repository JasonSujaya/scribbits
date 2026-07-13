import type { Scribbit } from '../../shared/arena';
import type { AccessoryEffectFamily } from '../../shared/accessoryeffects';
import { findGearCosmetic } from '../../shared/cosmetics';

export type WeaponFxQuality = 'off' | 'balanced' | 'full';
export type WeaponFxPhase = 'telegraph' | 'active' | 'impact';

export type WeaponFxProfile = Readonly<{
  weaponId: string;
  family: AccessoryEffectFamily;
  shaderMode: number;
  tint: readonly [number, number, number];
  fallbackColor: number;
}>;

export type WeaponFxCue = Readonly<{
  phase: WeaponFxPhase;
  durationMilliseconds: number;
  intensity: number;
}>;

type WeaponFxCapabilityInput = Readonly<{
  webgl: boolean;
  reduceMotion: boolean;
  hardwareConcurrency?: number;
  deviceMemoryGigabytes?: number;
  override?: string | null;
}>;

const PROFILE_BY_FAMILY: Readonly<
  Record<AccessoryEffectFamily, Omit<WeaponFxProfile, 'weaponId' | 'family'>>
> = Object.freeze({
  rush: {
    shaderMode: 2,
    tint: Object.freeze([0.1, 0.82, 0.9] as const),
    fallbackColor: 0x19cfe6,
  },
  aim: {
    shaderMode: 3,
    tint: Object.freeze([0.55, 0.92, 0.48] as const),
    fallbackColor: 0x8cea7a,
  },
  fortune: {
    shaderMode: 4,
    tint: Object.freeze([0.95, 0.35, 0.82] as const),
    fallbackColor: 0xf25ad1,
  },
  guard: {
    shaderMode: 5,
    tint: Object.freeze([0.34, 0.62, 1] as const),
    fallbackColor: 0x579eff,
  },
  focus: {
    shaderMode: 6,
    tint: Object.freeze([0.68, 0.48, 1] as const),
    fallbackColor: 0xae7aff,
  },
  ready: {
    shaderMode: 7,
    tint: Object.freeze([1, 0.58, 0.24] as const),
    fallbackColor: 0xff943d,
  },
});

export function resolveWeaponFxProfile(
  scribbit: Pick<Scribbit, 'accessories'>
): WeaponFxProfile | null {
  for (const gearId of scribbit.accessories) {
    const gear = findGearCosmetic(gearId);
    if (!gear || gear.category !== 'weapon') continue;
    const profile = PROFILE_BY_FAMILY[gear.effectFamily];
    return Object.freeze({
      weaponId: gear.id,
      family: gear.effectFamily,
      shaderMode: profile.shaderMode,
      tint: profile.tint,
      fallbackColor: profile.fallbackColor,
    });
  }
  return null;
}

export function chooseWeaponFxQuality(
  input: WeaponFxCapabilityInput
): WeaponFxQuality {
  if (!input.webgl || input.reduceMotion) return 'off';
  if (input.override === 'off') return 'off';
  if (input.override === 'balanced') return 'balanced';
  if (input.override === 'full') return 'full';

  const cores = input.hardwareConcurrency;
  const memory = input.deviceMemoryGigabytes;
  if (
    (cores !== undefined && cores <= 2) ||
    (memory !== undefined && memory <= 2)
  ) {
    return 'off';
  }
  if (
    (cores !== undefined && cores <= 4) ||
    (memory !== undefined && memory <= 4)
  ) {
    return 'balanced';
  }
  // Unknown embedded WebViews start on the one-pass balanced path. Full only
  // opts in when the browser reports enough headroom or a debug override asks.
  return cores !== undefined && cores >= 8 ? 'full' : 'balanced';
}

export function planWeaponFxCue(
  phase: WeaponFxPhase,
  critical = false
): WeaponFxCue {
  if (phase === 'telegraph') {
    return Object.freeze({
      phase,
      durationMilliseconds: 320,
      intensity: 0.72,
    });
  }
  if (phase === 'active') {
    return Object.freeze({
      phase,
      durationMilliseconds: 380,
      intensity: 0.92,
    });
  }
  return Object.freeze({
    phase,
    durationMilliseconds: critical ? 360 : 260,
    intensity: critical ? 1 : 0.82,
  });
}
