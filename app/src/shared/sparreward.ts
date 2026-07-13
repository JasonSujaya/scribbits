import { getLevelForXp } from './progression';

export type SparRewardReceipt = Readonly<{
  version: 1;
  reportId: string;
  scribbitId: string;
  xpAwarded: number;
  inkAwarded: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
}>;

const normalizeRewardAmount = (value: number): number => {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
};

export function createSparRewardReceipt(input: {
  reportId: string;
  scribbitId: string;
  xpBefore: number;
  xpAfter: number;
  inkAwarded: number;
}): SparRewardReceipt {
  const xpBefore = normalizeRewardAmount(input.xpBefore);
  const xpAfter = Math.max(xpBefore, normalizeRewardAmount(input.xpAfter));

  return Object.freeze({
    version: 1,
    reportId: input.reportId,
    scribbitId: input.scribbitId,
    xpAwarded: xpAfter - xpBefore,
    inkAwarded: normalizeRewardAmount(input.inkAwarded),
    xpBefore,
    xpAfter,
    levelBefore: getLevelForXp(xpBefore),
    levelAfter: getLevelForXp(xpAfter),
  });
}

export function isSparRewardReceipt(
  value: unknown
): value is SparRewardReceipt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const receipt = value as Record<string, unknown>;
  const xpAwarded = receipt.xpAwarded;
  const inkAwarded = receipt.inkAwarded;
  const xpBefore = receipt.xpBefore;
  const xpAfter = receipt.xpAfter;

  return (
    receipt.version === 1 &&
    typeof receipt.reportId === 'string' &&
    receipt.reportId.length >= 1 &&
    receipt.reportId.length <= 128 &&
    typeof receipt.scribbitId === 'string' &&
    receipt.scribbitId.length >= 1 &&
    receipt.scribbitId.length <= 128 &&
    typeof xpAwarded === 'number' &&
    Number.isSafeInteger(xpAwarded) &&
    xpAwarded >= 0 &&
    typeof inkAwarded === 'number' &&
    Number.isSafeInteger(inkAwarded) &&
    inkAwarded >= 0 &&
    typeof xpBefore === 'number' &&
    Number.isSafeInteger(xpBefore) &&
    xpBefore >= 0 &&
    typeof xpAfter === 'number' &&
    Number.isSafeInteger(xpAfter) &&
    xpAfter === xpBefore + xpAwarded &&
    receipt.levelBefore === getLevelForXp(xpBefore) &&
    receipt.levelAfter === getLevelForXp(xpAfter)
  );
}
