import { RED_STAR_GEAR_RANK, type CapsulePull } from '../../shared/arena';

const COLLECTOR_RANKS = [
  { minimumPullCount: 0, name: 'Ink Rookie' },
  { minimumPullCount: 5, name: 'Capsule Scout' },
  { minimumPullCount: 15, name: 'Curio Keeper' },
  { minimumPullCount: 30, name: 'Ink Curator' },
  { minimumPullCount: 60, name: 'Master Archivist' },
] as const;

type CapsuleActionLayout = Readonly<{
  centerX: number;
  width: number;
  overlayX: number;
}>;

export type CapsulePrizeLayout = Readonly<{
  cardWidth: number;
  cardHeight: number;
  cardCenterY: number;
  actionCenterY: number;
  overlayY: number;
  acknowledgement: CapsuleActionLayout;
  viewCollection: CapsuleActionLayout | null;
}>;

export function collectorRankNameForPullCount(pullCount: number): string {
  for (let index = COLLECTOR_RANKS.length - 1; index >= 0; index -= 1) {
    const rank = COLLECTOR_RANKS[index];
    if (rank && pullCount >= rank.minimumPullCount) return rank.name;
  }
  return COLLECTOR_RANKS[0].name;
}

export function planCapsulePrizeLayout(
  width: number,
  height: number,
  includesCollectionAction: boolean
): CapsulePrizeLayout {
  const cardHeight = 540;
  const cardCenterY = Math.min(
    height - cardHeight / 2 - 24,
    Math.max(cardHeight / 2 + 24, height * 0.52)
  );
  const acknowledgement = includesCollectionAction
    ? { centerX: 178, width: 184, overlayX: width / 2 + 86 }
    : { centerX: 0, width: 320, overlayX: width / 2 - 160 };

  return {
    cardWidth: Math.min(600, width - 64),
    cardHeight,
    cardCenterY,
    actionCenterY: 210,
    overlayY: cardCenterY + 160,
    acknowledgement,
    viewCollection: includesCollectionAction
      ? { centerX: -98, width: 336, overlayX: width / 2 - 266 }
      : null,
  };
}

export function prizeOwnershipLabel(pull: CapsulePull): string {
  if (pull.kind === 'accessory') {
    const rank = pull.gearRank ?? 1;
    if (rank === RED_STAR_GEAR_RANK) return '+1 COPY · MYTHIC RED STAR';
    if (pull.isNew) return `NEW GEAR · ${rank}★`;
    if (pull.mergeReady) return `+1 COPY · FORGE READY`;
    return `+1 COPY · ${pull.ownedCount}/3 TO FORGE`;
  }
  if (pull.isNew) return 'NEW PERMANENT STYLE';
  return 'ALREADY OWNED';
}

export function prizeOwnershipAnnouncement(pull: CapsulePull): string {
  if (pull.kind === 'accessory') {
    const rank = pull.gearRank ?? 1;
    if (rank === RED_STAR_GEAR_RANK) {
      return 'Mythic Red Star gear. Maximum special rank.';
    }
    return pull.mergeReady
      ? `${rank} star gear. Ready to forge with ${pull.ownedCount} copies.`
      : `${rank} star gear. ${pull.ownedCount} of 3 copies ready to forge.`;
  }
  if (pull.isNew) return 'New permanent style.';
  return 'Already unlocked.';
}
