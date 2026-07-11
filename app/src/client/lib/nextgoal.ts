import {
  BELIEF_LEGEND_THRESHOLD,
  INK_REWARDS,
  LEVEL_XP_THRESHOLDS,
  MAX_LEVEL,
} from '../../shared/arena';
import type { ArenaState, CareAction, Scribbit } from '../../shared/arena';

export type NextGoalActionKind =
  | 'enter'
  | 'back'
  | 'challenge'
  | 'capsule'
  | 'care'
  | 'wait';

export type NextGoalScribbitEvidence = {
  name: string;
  level: number;
  currentExperiencePoints: number;
  nextLevelExperienceThreshold: number | null;
  currentBelief: number;
  legendBeliefThreshold: number;
  daysLeft: number;
};

export type NextGoalCapsuleEvidence = {
  discoveredItems: number;
  totalCollectibleItems: number;
  currentInk: number;
  nextCapsuleCost: number;
};

export type NextGoalEvidence = {
  featuredScribbit: NextGoalScribbitEvidence | null;
  capsule: NextGoalCapsuleEvidence;
};

type NextGoalCardContent = {
  title: string;
  detail: string;
  buttonLabel: string;
  evidence: NextGoalEvidence;
};

export type NextGoalCard =
  | (NextGoalCardContent & {
      actionKind: 'enter';
      targetScribbit: Scribbit;
      careAction: null;
    })
  | (NextGoalCardContent & {
      actionKind: 'back' | 'challenge' | 'capsule' | 'wait';
      targetScribbit: null;
      careAction: null;
    })
  | (NextGoalCardContent & {
      actionKind: 'care';
      targetScribbit: Scribbit;
      careAction: CareAction;
    });

const CARE_ACTION_PRIORITY: readonly CareAction[] = ['feed', 'pat', 'train'];

const CARE_ACTION_COPY: Record<
  CareAction,
  { titleVerb: string; buttonLabel: string }
> = {
  feed: { titleVerb: 'Feed', buttonLabel: 'Feed now' },
  pat: { titleVerb: 'Pat', buttonLabel: 'Pat now' },
  train: { titleVerb: 'Train', buttonLabel: 'Train now' },
};

/** Selects one stable post-draw action without reading or changing scene state. */
export function selectNextGoal(state: ArenaState): NextGoalCard {
  const newestOwnedScribbit = findNewestOwnedScribbit(state.myScribbits);

  if (state.drawnToday && !state.enteredToday && newestOwnedScribbit) {
    return {
      actionKind: 'enter',
      targetScribbit: newestOwnedScribbit,
      careAction: null,
      title: `Enter ${newestOwnedScribbit.name} in the Rumble`,
      detail: "Put today's Scribbit into tonight's bracket.",
      buttonLabel: 'Enter Rumble',
      evidence: buildEvidence(state, newestOwnedScribbit),
    };
  }

  if (state.enteredToday && !state.myBackedScribbitId) {
    return {
      actionKind: 'back',
      targetScribbit: null,
      careAction: null,
      title: "Pick tonight's winner",
      detail: 'Choose one contender. Your Back locks until the Rumble.',
      buttonLabel: 'Choose a Back',
      evidence: buildEvidence(state, newestOwnedScribbit),
    };
  }

  if (
    state.champion &&
    state.myScribbits.length > 0 &&
    !state.bossChallengedToday
  ) {
    return {
      actionKind: 'challenge',
      targetScribbit: null,
      careAction: null,
      title: `Challenge ${state.champion.name}`,
      detail: 'Take your one daily shot at the Champion. Win for +2 XP.',
      buttonLabel: 'Choose challenger',
      evidence: buildEvidence(state, newestOwnedScribbit),
    };
  }

  if (state.myInk >= state.nextCapsuleCost) {
    return {
      actionKind: 'capsule',
      targetScribbit: null,
      careAction: null,
      title: 'A Mystery Ink capsule is ready',
      detail: `Spend ${state.nextCapsuleCost} Ink to reveal a permanent collection reward.`,
      buttonLabel: 'Open Capsule',
      evidence: buildEvidence(state, newestOwnedScribbit),
    };
  }

  const availableCare = findFirstAvailableCare(state.myScribbits);
  if (availableCare) {
    const copy = CARE_ACTION_COPY[availableCare.action];
    return {
      actionKind: 'care',
      targetScribbit: availableCare.scribbit,
      careAction: availableCare.action,
      title: `${copy.titleVerb} ${availableCare.scribbit.name}`,
      detail: `Still available today · +XP · +${INK_REWARDS.care} Ink.`,
      buttonLabel: copy.buttonLabel,
      evidence: buildEvidence(state, availableCare.scribbit),
    };
  }

  return {
    actionKind: 'wait',
    targetScribbit: null,
    careAction: null,
    title: 'All goals complete',
    detail: 'Your daily actions are done. Come back for the result.',
    buttonLabel: 'Check Rumble',
    evidence: buildEvidence(state, newestOwnedScribbit),
  };
}

function findNewestOwnedScribbit(
  scribbits: readonly Scribbit[]
): Scribbit | null {
  let newestScribbit: Scribbit | null = null;

  for (const scribbit of scribbits) {
    if (!newestScribbit || scribbit.bornDay > newestScribbit.bornDay) {
      newestScribbit = scribbit;
    }
  }

  return newestScribbit;
}

function findFirstAvailableCare(
  scribbits: readonly Scribbit[]
): { scribbit: Scribbit; action: CareAction } | null {
  for (const scribbit of scribbits) {
    const completedCareActions = scribbit.careDoneToday ?? [];
    const action = CARE_ACTION_PRIORITY.find(
      (candidateAction) => !completedCareActions.includes(candidateAction)
    );

    if (action) return { scribbit, action };
  }

  return null;
}

function buildEvidence(
  state: ArenaState,
  featuredScribbit: Scribbit | null
): NextGoalEvidence {
  return {
    featuredScribbit: featuredScribbit
      ? buildScribbitEvidence(featuredScribbit, state.dayNumber)
      : null,
    capsule: {
      discoveredItems: state.capsuleProgress.discoveredCount,
      totalCollectibleItems: state.capsuleProgress.collectionTotal,
      currentInk: state.myInk,
      nextCapsuleCost: state.nextCapsuleCost,
    },
  };
}

function buildScribbitEvidence(
  scribbit: Scribbit,
  currentDay: number
): NextGoalScribbitEvidence {
  const level = Math.max(1, Math.min(MAX_LEVEL, scribbit.level));
  const nextLevelExperienceThreshold =
    level >= MAX_LEVEL ? null : (LEVEL_XP_THRESHOLDS[level] ?? null);

  return {
    name: scribbit.name,
    level,
    currentExperiencePoints: Math.max(0, scribbit.xp),
    nextLevelExperienceThreshold,
    currentBelief: Math.max(0, scribbit.belief),
    legendBeliefThreshold: BELIEF_LEGEND_THRESHOLD,
    daysLeft: Math.max(0, scribbit.expiresDay - currentDay),
  };
}
