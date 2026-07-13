import type { CapsuleRarity } from '../../shared/arena';

export const COMMON_GEAR_ART_TEXTURE = 'gear-art-common';
export const RARE_EPIC_GEAR_ART_TEXTURE = 'gear-art-rare-epic';

export function gearArtTextureForRarity(rarity: CapsuleRarity): string {
  return rarity === 'common'
    ? COMMON_GEAR_ART_TEXTURE
    : RARE_EPIC_GEAR_ART_TEXTURE;
}
