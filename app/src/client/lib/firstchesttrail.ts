import type { RivalRunReceipt, Scribbit } from '../../shared/arena';

export type FirstChestTrailStep = Readonly<{
  kind: 'shop';
  label: string;
  accessibleLabel: string;
  statusLabel: string;
  ink: number;
  inkNeeded: number;
}>;

type FirstChestTrailState = Readonly<{
  scribbit: Scribbit;
  ink: number;
  chestCost: number;
  capsulePullCount: number;
}>;

type FirstChestTrailEntry = FirstChestTrailState &
  Readonly<{
    isFreshResult: boolean;
    rivalRun: RivalRunReceipt | undefined;
  }>;

/**
 * Derives the next onboarding action from server-authored Arena state. The
 * trail never grants or invents Ink. It appears only when the authoritative
 * balance can already pay the authoritative first-chest price.
 */
export function planFirstChestTrailStep(
  input: FirstChestTrailState
): FirstChestTrailStep | null {
  if (input.capsulePullCount !== 0 || input.scribbit.status !== 'alive') {
    return null;
  }

  const ink = Math.max(0, Math.floor(input.ink));
  const chestCost = Math.max(1, Math.floor(input.chestCost));
  const inkNeeded = Math.max(0, chestCost - ink);
  if (inkNeeded > 0) return null;

  return Object.freeze({
    kind: 'shop',
    label: 'OPEN FIRST CHEST',
    accessibleLabel: `Open Shop. You have ${ink} Ink, enough for one ${chestCost} Ink Mystery Ink Chest.`,
    statusLabel: `CHEST READY • ${ink}/${chestCost} INK`,
    ink,
    inkNeeded,
  });
}

/** Only a fresh, completed first Rival Run may replace NEW RIVAL RUN. */
export function planFirstChestTrailEntry(
  input: FirstChestTrailEntry
): FirstChestTrailStep | null {
  if (!input.isFreshResult || input.rivalRun?.status !== 'complete') {
    return null;
  }
  return planFirstChestTrailStep(input);
}
