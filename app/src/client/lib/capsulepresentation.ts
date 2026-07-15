import {
  CAPSULE_COST,
  CAPSULE_MAX_BATCH_SIZE,
  RED_STAR_GEAR_RANK,
  type CapsulePull,
} from '../../shared/arena';

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

export type CapsuleBatchSummary = Readonly<{
  common: number;
  rare: number;
  epic: number;
  legendary: number;
  newItems: number;
}>;

export type CapsuleOpenAffordance = Readonly<{
  primaryLabel: string;
  primaryAccessibleLabel: string;
  primaryEnabled: boolean;
  secondaryLabel: string;
  secondaryAccessibleLabel: string;
  secondaryEnabled: boolean;
  requiredInk: number;
  remainingCount: number;
  retrying: boolean;
}>;

export function capsuleOpenCost(
  openCount: number,
  nextOpenCost: number
): number {
  if (
    !Number.isInteger(openCount) ||
    openCount < 1 ||
    openCount > CAPSULE_MAX_BATCH_SIZE
  ) {
    throw new Error(
      `Chest batches must contain 1-${CAPSULE_MAX_BATCH_SIZE} opens.`
    );
  }
  return nextOpenCost + (openCount - 1) * CAPSULE_COST;
}

export function planCapsuleOpenAffordance(
  ink: number,
  nextOpenCost: number,
  pendingBatchTarget: number | null,
  completedBatchCount: number
): CapsuleOpenAffordance {
  if (pendingBatchTarget !== null) {
    if (
      !Number.isInteger(pendingBatchTarget) ||
      pendingBatchTarget < 1 ||
      pendingBatchTarget > CAPSULE_MAX_BATCH_SIZE ||
      !Number.isInteger(completedBatchCount) ||
      completedBatchCount < 0 ||
      completedBatchCount >= pendingBatchTarget
    ) {
      throw new Error('Pending chest progress is invalid.');
    }
    const remainingCount = pendingBatchTarget - completedBatchCount;
    const retryCost = capsuleOpenCost(remainingCount, nextOpenCost);
    return {
      primaryLabel: `RETRY ${remainingCount} · ${retryCost}`,
      primaryAccessibleLabel: `Retry the remaining ${remainingCount} Mystery Ink ${remainingCount === 1 ? 'chest' : 'chests'} for ${retryCost} Ink`,
      primaryEnabled: ink >= retryCost,
      secondaryLabel: `SAFE ${completedBatchCount}/${pendingBatchTarget}`,
      secondaryAccessibleLabel: `${completedBatchCount} of ${pendingBatchTarget} Mystery Ink chests are safely recorded`,
      secondaryEnabled: false,
      requiredInk: retryCost,
      remainingCount,
      retrying: true,
    };
  }

  const oneCost = capsuleOpenCost(1, nextOpenCost);
  const tenCost = capsuleOpenCost(CAPSULE_MAX_BATCH_SIZE, nextOpenCost);
  return {
    primaryLabel: `OPEN 1 · ${oneCost}`,
    primaryAccessibleLabel: `Open one Mystery Ink chest for ${oneCost} Ink`,
    primaryEnabled: ink >= oneCost,
    secondaryLabel: `OPEN ${CAPSULE_MAX_BATCH_SIZE} · ${tenCost}`,
    secondaryAccessibleLabel: `Open ten Mystery Ink chests for ${tenCost} Ink`,
    secondaryEnabled: ink >= tenCost,
    requiredInk: oneCost,
    remainingCount: 1,
    retrying: false,
  };
}

export function summarizeCapsuleBatch(
  pulls: readonly CapsulePull[]
): CapsuleBatchSummary {
  return pulls.reduce<CapsuleBatchSummary>(
    (summary, pull) => ({
      ...summary,
      [pull.rarity]: summary[pull.rarity] + 1,
      newItems: summary.newItems + (pull.isNew ? 1 : 0),
    }),
    { common: 0, rare: 0, epic: 0, legendary: 0, newItems: 0 }
  );
}

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
  if (pull.kind === 'drawing-ink' || pull.kind === 'brush') {
    return `+1 CHARGE · ${pull.ownedCount} LEFT`;
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
  if (pull.kind === 'drawing-ink' || pull.kind === 'brush') {
    return `One drawing charge added. ${pull.ownedCount} left.`;
  }
  if (pull.isNew) return 'New permanent style.';
  return 'Already unlocked.';
}
