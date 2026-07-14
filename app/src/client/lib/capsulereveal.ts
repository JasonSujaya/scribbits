import {
  CAPSULE_MAX_BATCH_SIZE,
  type CapsulePull,
  type CapsuleRarity,
} from '../../shared/arena';

export type CapsuleRevealStep = Readonly<{
  index: number;
  delayMs: number;
  rarity: CapsuleRarity;
}>;

export type CapsuleBatchRevealPlan = Readonly<{
  steps: readonly CapsuleRevealStep[];
  completionDelayMs: number;
}>;

const REVEAL_GAP_MS: Readonly<Record<CapsuleRarity, number>> = {
  common: 90,
  rare: 170,
  epic: 280,
};

export function planCapsuleBatchReveal(
  pulls: readonly Pick<CapsulePull, 'rarity'>[],
  reduceMotion: boolean
): CapsuleBatchRevealPlan {
  if (pulls.length !== CAPSULE_MAX_BATCH_SIZE) {
    throw new Error(
      `A batch reveal must contain exactly ${CAPSULE_MAX_BATCH_SIZE} rewards.`
    );
  }
  if (reduceMotion) {
    return {
      steps: pulls.map((pull, index) => ({
        index,
        delayMs: 0,
        rarity: pull.rarity,
      })),
      completionDelayMs: 0,
    };
  }

  let elapsedMs = 120;
  const steps = pulls.map((pull, index) => {
    elapsedMs += REVEAL_GAP_MS[pull.rarity];
    return { index, delayMs: elapsedMs, rarity: pull.rarity };
  });
  return {
    steps,
    completionDelayMs: elapsedMs + 420,
  };
}

export function capsuleRevealAnnouncement(
  pull: Pick<CapsulePull, 'name' | 'rarity'>,
  index: number,
  total = CAPSULE_MAX_BATCH_SIZE
): string {
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    throw new Error('Capsule reveal index is outside the batch.');
  }
  return `${index + 1} of ${total}. ${pull.rarity} reward: ${pull.name}.`;
}
