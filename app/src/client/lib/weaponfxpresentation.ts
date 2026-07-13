import {
  getAttachedGearRank,
  type GearRank,
  type Scribbit,
} from '../../shared/arena';
import type { AccessoryEffectFamily } from '../../shared/accessoryeffects';
import { findGearCosmetic } from '../../shared/cosmetics';

export type WeaponFxQuality = 'off' | 'balanced' | 'full';
export type WeaponFxPhase = 'telegraph' | 'active' | 'impact';
export type WeaponFxRankTier = 'basic' | 'enhanced' | 'red-star';

export type WeaponFxProfile = Readonly<{
  weaponId: string;
  family: AccessoryEffectFamily;
  rank: GearRank;
  rankProgress: number;
  rankTier: WeaponFxRankTier;
  shaderMode: number;
  tint: readonly [number, number, number];
  fallbackColor: number;
}>;

export type WeaponFxCue = Readonly<{
  phase: WeaponFxPhase;
  durationMilliseconds: number;
  intensity: number;
}>;

const weaponFxRankTier = (rank: GearRank): WeaponFxRankTier => {
  if (rank === 6) return 'red-star';
  if (rank >= 4) return 'enhanced';
  return 'basic';
};

const weaponFxRankProgress = (rank: GearRank): number => (rank - 1) / 5;

type WeaponFxCapabilityInput = Readonly<{
  webgl: boolean;
  reduceMotion: boolean;
  hardwareConcurrency?: number;
  deviceMemoryGigabytes?: number;
  override?: string | null;
}>;

const PROFILE_BY_FAMILY: Readonly<
  Record<
    AccessoryEffectFamily,
    Omit<
      WeaponFxProfile,
      'weaponId' | 'family' | 'rank' | 'rankProgress' | 'rankTier'
    >
  >
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

export function resolveWeaponFxProfiles(
  scribbit: Pick<Scribbit, 'accessories' | 'gearRanks'> &
    Partial<Pick<Scribbit, 'equipmentLoadout'>>
): readonly WeaponFxProfile[] {
  const weaponIds = [
    ...(scribbit.equipmentLoadout?.weapon.filter(
      (gearId): gearId is string => gearId !== null
    ) ?? []),
    ...scribbit.accessories,
  ];
  const visitedWeaponIds = new Set<string>();
  const profiles: WeaponFxProfile[] = [];
  for (const gearId of weaponIds) {
    if (visitedWeaponIds.has(gearId)) continue;
    visitedWeaponIds.add(gearId);
    const gear = findGearCosmetic(gearId);
    if (!gear || gear.category !== 'weapon') continue;
    const profile = PROFILE_BY_FAMILY[gear.effectFamily];
    const rank = getAttachedGearRank(scribbit, gear.id);
    profiles.push(
      Object.freeze({
        weaponId: gear.id,
        family: gear.effectFamily,
        rank,
        rankProgress: weaponFxRankProgress(rank),
        rankTier: weaponFxRankTier(rank),
        shaderMode: profile.shaderMode,
        tint: profile.tint,
        fallbackColor: profile.fallbackColor,
      })
    );
  }
  return Object.freeze(profiles);
}

export function resolveWeaponFxProfile(
  scribbit: Pick<Scribbit, 'accessories' | 'gearRanks'> &
    Partial<Pick<Scribbit, 'equipmentLoadout'>>
): WeaponFxProfile | null {
  return resolveWeaponFxProfiles(scribbit)[0] ?? null;
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
  critical = false,
  rank: GearRank = 1
): WeaponFxCue {
  // Rank changes presentation only. Cue duration stays constant so gear rank
  // cannot alter combat readability or the authoritative replay timeline.
  const rankIntensity = 0.8 + weaponFxRankProgress(rank) * 0.2;
  if (phase === 'telegraph') {
    return Object.freeze({
      phase,
      durationMilliseconds: 320,
      intensity: 0.72 * rankIntensity,
    });
  }
  if (phase === 'active') {
    return Object.freeze({
      phase,
      durationMilliseconds: 380,
      intensity: 0.92 * rankIntensity,
    });
  }
  return Object.freeze({
    phase,
    durationMilliseconds: critical ? 360 : 260,
    intensity: (critical ? 1 : 0.82) * rankIntensity,
  });
}
