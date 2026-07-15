import type { CapsuleRarity } from '../../shared/arena';

export const COMMON_GEAR_ART_TEXTURE = 'gear-art-common';
export const RARE_EPIC_GEAR_ART_TEXTURE = 'gear-art-rare-epic';
export const LEGENDARY_GEAR_ART_TEXTURE = 'gear-art-legendary';

export function gearArtTextureForRarity(rarity: CapsuleRarity): string {
  if (rarity === 'common') return COMMON_GEAR_ART_TEXTURE;
  if (rarity === 'legendary') return LEGENDARY_GEAR_ART_TEXTURE;
  return RARE_EPIC_GEAR_ART_TEXTURE;
}
