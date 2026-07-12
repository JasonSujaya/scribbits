import type { LegacyCard, LegacyReturnReceipt } from '../../shared/arena';

export function formatLegacyFinishLabel(card: LegacyCard): string {
  if (card.legacy.finish === 'champion') return 'CHAMPION';
  if (card.legacy.finish === 'believed') return 'BELOVED LEGEND';
  return 'FADED';
}

export function planLegacyReturnPresentation(
  receipt: LegacyReturnReceipt
): {
  hero: LegacyCard;
  eyebrow: string;
  headline: string;
  summary: string;
} | null {
  const hero =
    receipt.cards.find((card) => card.legacy.finish === 'champion') ??
    receipt.cards.find((card) => card.legacy.finish === 'believed') ??
    receipt.cards[0];

  if (!hero) return null;

  return {
    hero,
    eyebrow:
      receipt.total > 1
        ? `${receipt.total} CARDS SAVED`
        : `DAY ${hero.legacy.archivedDay}`,
    headline:
      hero.legacy.finish === 'faded' ? 'MEMORY SAVED' : 'LEGEND!',
    summary: `${formatLegacyFinishLabel(hero)} • ${hero.legacy.wins}–${hero.legacy.losses} • LV ${hero.legacy.level}`,
  };
}
