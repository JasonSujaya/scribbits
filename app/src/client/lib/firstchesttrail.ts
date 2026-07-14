import {
  INK_REWARDS,
  type CareAction,
  type RivalRunReceipt,
  type Scribbit,
} from '../../shared/arena';

const CARE_ACTIONS: readonly CareAction[] = ['feed', 'pat', 'train'];

export type FirstChestTrailStep = Readonly<{
  kind: 'care' | 'shop';
  label: string;
  accessibleLabel: string;
  statusLabel: string;
  ink: number;
  inkNeeded: number;
  availableCareActions: readonly CareAction[];
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

const compactScribbitName = (name: string): string => {
  const normalized = name.trim().replace(/\s+/g, ' ') || 'SCRIBBIT';
  return normalized.length <= 18
    ? normalized
    : `${normalized.slice(0, 17)}…`;
};

/**
 * Derives the next onboarding action from server-authored Arena state. The
 * trail never grants Ink or assumes a Care reward: it only stays visible when
 * the remaining daily Care actions can still reach the authoritative price.
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
  const completedCare = new Set(input.scribbit.careDoneToday);
  const availableCareActions = CARE_ACTIONS.filter(
    (action) => !completedCare.has(action)
  );
  const safeName = compactScribbitName(input.scribbit.name);

  if (inkNeeded === 0) {
    return Object.freeze({
      kind: 'shop',
      label: 'OPEN FIRST CHEST',
      accessibleLabel: `Open Shop. You have ${ink} Ink, enough for one ${chestCost} Ink Mystery Ink Chest.`,
      statusLabel: `CHEST READY • ${ink}/${chestCost} INK`,
      ink,
      inkNeeded,
      availableCareActions: Object.freeze([...availableCareActions]),
    });
  }

  const reachableInk =
    ink + availableCareActions.length * INK_REWARDS.care;
  if (reachableInk < chestCost) return null;

  return Object.freeze({
    kind: 'care',
    label: `CARE FOR ${safeName.toUpperCase()}`,
    accessibleLabel: `Care for ${safeName}. Earn ${INK_REWARDS.care} Ink toward a ${chestCost} Ink Mystery Ink Chest. ${inkNeeded} Ink needed.`,
    statusLabel: `FIRST CHEST • ${ink}/${chestCost} INK`,
    ink,
    inkNeeded,
    availableCareActions: Object.freeze([...availableCareActions]),
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
