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
    color: 0xa56724,
    fillAlpha: 0.12,
    strokeWidth: 7,
  }),
  rare: Object.freeze({
    color: 0x0f88bc,
    fillAlpha: 0.14,
    strokeWidth: 7,
  }),
  epic: Object.freeze({
    color: 0x8340bd,
    fillAlpha: 0.16,
    strokeWidth: 8,
  }),
  legendary: Object.freeze({
    color: 0xb52e5d,
    fillAlpha: 0.19,
    strokeWidth: 9,
  }),
});
