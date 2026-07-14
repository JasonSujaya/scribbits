import type { CareAction, Scribbit } from '../../shared/arena';
import { selectPrimaryPower } from '../../shared/combat/selection';
import { getShapePowerDisplayName } from '../../shared/combat/shapepowercontent';
import {
  selectCareReaction,
  type CareReactionLifeDay,
} from '../../shared/content/carereactions';
import { MOOD_STYLES } from './theme';

const CARE_ACTION_HEADLINES: Readonly<Record<CareAction, string>> =
  Object.freeze({
    feed: 'SNACK BREAK',
    pat: 'PAPER PAT',
    train: 'PRACTICE LAP',
  });

export type CareMomentPlan = Readonly<{
  reactionId: string;
  action: CareAction;
  lifeDay: CareReactionLifeDay;
  power: ReturnType<typeof selectPrimaryPower>;
  eyebrow: string;
  headline: string;
  reaction: string;
  progressLine: string;
  rewardLine: string;
  experienceGained: number;
  careMarkCount: number;
}>;

const careLifeDay = (
  currentDay: number,
  bornDay: number
): CareReactionLifeDay => {
  const normalizedCurrentDay = Number.isSafeInteger(currentDay)
    ? currentDay
    : 1;
  const normalizedBornDay = Number.isSafeInteger(bornDay)
    ? bornDay
    : normalizedCurrentDay;
  const age = normalizedCurrentDay - normalizedBornDay + 1;
  if (age <= 1) return 1;
  if (age >= 3) return 3;
  return 2;
};

const safeDisplayName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').slice(0, 24) || 'SCRIBBIT';

/** Plans one client-only receipt from two server-authored Scribbit snapshots. */
export function planCareMoment(
  beforeCare: Scribbit,
  afterCare: Scribbit,
  action: CareAction,
  currentDay: number
): CareMomentPlan {
  const lifeDay = careLifeDay(currentDay, afterCare.bornDay);
  const power = selectPrimaryPower(afterCare.stats);
  const reaction = selectCareReaction(power, action, lifeDay, afterCare.id);
  const experienceGained = Math.max(
    0,
    Math.floor(afterCare.xp) - Math.floor(beforeCare.xp)
  );
  const careMarkCount = Math.min(3, new Set(afterCare.careDoneToday).size);
  const mood = MOOD_STYLES[afterCare.mood];

  return Object.freeze({
    reactionId: reaction.id,
    action,
    lifeDay,
    power,
    eyebrow: `LIFE PAGE ${lifeDay}/3  •  ${getShapePowerDisplayName(power).toUpperCase()}`,
    headline: `${CARE_ACTION_HEADLINES[action]}: ${safeDisplayName(afterCare.name).toUpperCase()}`,
    reaction: reaction.line,
    progressLine: `${mood.label.toUpperCase()}  •  ${careMarkCount}/3 CARE MARKS`,
    rewardLine: `SERVER CHECKED  •  +${experienceGained} XP`,
    experienceGained,
    careMarkCount,
  });
}
