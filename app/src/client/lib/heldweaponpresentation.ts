import type { Scribbit } from '../../shared/arena';
import type { CombatRole } from '../../shared/combat';
import { findGearCosmetic } from '../../shared/cosmetics';
import { resolveGearCombatLoadout } from '../../shared/gearcombat';
import { gearArtTextureForRarity } from './gearart';

export const STARTER_WEAPON_TEXTURES = Object.freeze({
  brawler: 'starter-weapon-brawler',
  longshot: 'starter-weapon-longshot',
  mage: 'starter-weapon-mage',
});

export type HeldWeaponVisual = Readonly<{
  gearId: string;
  textureKey: string;
  frame: string;
}>;

export function resolveHeldWeaponVisual(
  scribbit: Pick<Scribbit, 'gearRanks'> &
    Partial<Pick<Scribbit, 'equipmentLoadout'>>
): HeldWeaponVisual | null {
  const weaponTechnique = resolveGearCombatLoadout(scribbit).techniques.find(
    (technique) => technique.category === 'weapon'
  );
  if (!weaponTechnique) return null;

  const equippedWeapon = findGearCosmetic(weaponTechnique.leadGearId);
  if (!equippedWeapon || equippedWeapon.category !== 'weapon') return null;

  return Object.freeze({
    gearId: equippedWeapon.id,
    textureKey: gearArtTextureForRarity(equippedWeapon.rarity),
    frame: equippedWeapon.id,
  });
}

export function starterWeaponTextureForRole(role: CombatRole): string | null {
  if (role === 'gunner') return null;
  return STARTER_WEAPON_TEXTURES[role];
}
