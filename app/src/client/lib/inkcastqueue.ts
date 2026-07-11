// Pure editorial selection for replay commentary. The caller owns wall-clock
// scheduling; this module only ranks and bounds already-authored facts.

import type { ReplayCommentaryFact } from './replaycommentary';

export const INKCAST_WALL_CLOCK_DWELL_MILLISECONDS = 900;
export const INKCAST_PENDING_ITEM_LIMIT = 2;

export type InkcastEditorialPriority = 1 | 2 | 3;

export type InkcastEditorialCandidate = Readonly<{
  fact: ReplayCommentaryFact;
  authoredText: string;
  sequence: number;
  priority: InkcastEditorialPriority;
}>;

const ROUTINE_PRIORITY: InkcastEditorialPriority = 1;
const NOTABLE_PRIORITY: InkcastEditorialPriority = 2;
const HEADLINE_PRIORITY: InkcastEditorialPriority = 3;

export function getInkcastEditorialPriority(
  fact: ReplayCommentaryFact
): InkcastEditorialPriority {
  switch (fact.kind) {
    case 'power-telegraph':
      return fact.activationNumber === 1 ? HEADLINE_PRIORITY : NOTABLE_PRIORITY;
    case 'damage':
      return fact.critical ? HEADLINE_PRIORITY : ROUTINE_PRIORITY;
    case 'barrier-broken':
    case 'echo-shattered':
    case 'arena-shrink':
    case 'late-fight':
      return HEADLINE_PRIORITY;
    case 'burn':
    case 'barrier-hit':
      return ROUTINE_PRIORITY;
    case 'battle-start':
    case 'power-missed':
    case 'barrier-created':
    case 'ink-pressure':
    case 'nib-recoil':
    case 'echo-created':
    case 'echo-fired':
      return NOTABLE_PRIORITY;
    default: {
      const unsupportedFact: never = fact;
      throw new Error(
        `Unsupported Inkcast editorial fact: ${JSON.stringify(unsupportedFact)}`
      );
    }
  }
}

export function createInkcastEditorialCandidate(
  fact: ReplayCommentaryFact,
  authoredText: string,
  sequence: number
): InkcastEditorialCandidate {
  const immutableFact: ReplayCommentaryFact = Object.freeze({ ...fact });
  return Object.freeze({
    fact: immutableFact,
    authoredText,
    sequence,
    priority: getInkcastEditorialPriority(immutableFact),
  });
}

export function chooseInkcastCandidateForSimulationTick(
  candidates: readonly InkcastEditorialCandidate[]
): InkcastEditorialCandidate | null {
  let chosenCandidate: InkcastEditorialCandidate | null = null;

  for (const candidate of candidates) {
    if (
      chosenCandidate === null ||
      candidate.priority > chosenCandidate.priority ||
      (candidate.priority === chosenCandidate.priority &&
        candidate.sequence < chosenCandidate.sequence)
    ) {
      chosenCandidate = candidate;
    }
  }

  return chosenCandidate;
}

export function enqueueInkcastEditorialCandidate(
  pendingCandidates: readonly InkcastEditorialCandidate[],
  incomingCandidate: InkcastEditorialCandidate
): readonly InkcastEditorialCandidate[] {
  const boundedPendingCandidates =
    keepStrongestPendingCandidates(pendingCandidates);

  if (boundedPendingCandidates.length < INKCAST_PENDING_ITEM_LIMIT) {
    return freezeInChronologicalOrder([
      ...boundedPendingCandidates,
      incomingCandidate,
    ]);
  }

  const lowestPriorityIndex = findLowestPriorityCandidateIndex(
    boundedPendingCandidates
  );
  const lowestPriorityCandidate = boundedPendingCandidates[lowestPriorityIndex];

  if (
    lowestPriorityCandidate === undefined ||
    incomingCandidate.priority <= lowestPriorityCandidate.priority
  ) {
    return freezeInChronologicalOrder(boundedPendingCandidates);
  }

  const nextPendingCandidates = [...boundedPendingCandidates];
  nextPendingCandidates[lowestPriorityIndex] = incomingCandidate;
  return freezeInChronologicalOrder(nextPendingCandidates);
}

function keepStrongestPendingCandidates(
  pendingCandidates: readonly InkcastEditorialCandidate[]
): InkcastEditorialCandidate[] {
  return [...pendingCandidates]
    .sort(
      (left, right) =>
        right.priority - left.priority || left.sequence - right.sequence
    )
    .slice(0, INKCAST_PENDING_ITEM_LIMIT);
}

function findLowestPriorityCandidateIndex(
  candidates: readonly InkcastEditorialCandidate[]
): number {
  let lowestPriorityIndex = 0;

  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const lowestPriorityCandidate = candidates[lowestPriorityIndex];
    if (
      candidate !== undefined &&
      lowestPriorityCandidate !== undefined &&
      (candidate.priority < lowestPriorityCandidate.priority ||
        (candidate.priority === lowestPriorityCandidate.priority &&
          candidate.sequence > lowestPriorityCandidate.sequence))
    ) {
      lowestPriorityIndex = index;
    }
  }

  return lowestPriorityIndex;
}

function freezeInChronologicalOrder(
  candidates: readonly InkcastEditorialCandidate[]
): readonly InkcastEditorialCandidate[] {
  return Object.freeze(
    [...candidates].sort((left, right) => left.sequence - right.sequence)
  );
}
