import type { CapsuleRarity } from '../../shared/arena';

export type BagRarityFrameStyle = Readonly<{
  color: number;
  fillAlpha: number;
  strokeWidth: number;
}>;

/** Strong, paper-safe rarity frames used by Bag tiles and equipped slots. */
export const BAG_RARITY_FRAME_STYLE: Readonly<
  Record<CapsuleRarity, BagRarityFrameStyle>
> = Object.freeze({
  common: Object.freeze({
    color: 0x6b5a45,
    fillAlpha: 0.045,
    strokeWidth: 6,
  }),
  rare: Object.freeze({
    color: 0x167ead,
    fillAlpha: 0.075,
    strokeWidth: 7,
  }),
  epic: Object.freeze({
    color: 0x7a3eb1,
    fillAlpha: 0.1,
    strokeWidth: 8,
  }),
});
