// Pure presentation planning for the daily Champion Challenge. The server owns
// challenge usage and rewards; this module only turns that state into copy.

import type { Scribbit } from '../../shared/arena';
import { selectPrimaryPower } from '../../shared/combat/selection';
import { getShapePowerSignatureName } from '../../shared/combat/shapepowercontent';
import type { PrimaryPower } from '../../shared/combat/types';
import { getFoundingScribbitDefinition } from '../../shared/founders';

export type ChampionChallengeStatus = 'open' | 'complete';

export type ChampionChallengePlan = Readonly<{
  status: ChampionChallengeStatus;
  epithet: string;
  challengeLine: string;
  signatureName: string;
  statusCopy: string;
  ctaLabel: string;
}>;

type ChampionChallengeStatusContent = Readonly<{
  statusCopy: string;
  ctaLabel: string;
}>;

const MAXIMUM_COMMUNITY_CHALLENGE_LINE_LENGTH = 52;
const EXPECTED_PRIMARY_POWER_COUNT = 4;

const COMMUNITY_CHALLENGE_LINE_BY_POWER: Readonly<
  Record<PrimaryPower, string>
> = Object.freeze({
  inkquake: 'Stand firm; my signature shakes the whole page.',
  nib_halo: 'Mind the points; my sharpest lines are circling.',
  smearstep: 'Keep up; my quickest lines never stay put.',
  colorburst: 'Bring every color; this page is ready to bloom.',
});

const CHALLENGE_STATUS_CONTENT: Readonly<
  Record<ChampionChallengeStatus, ChampionChallengeStatusContent>
> = Object.freeze({
  open: Object.freeze({
    statusCopy: 'ONE DAILY SHOT • WIN: +2 XP',
    ctaLabel: 'CHALLENGE CHAMPION',
  }),
  complete: Object.freeze({
    statusCopy: 'SHOT TAKEN TODAY • WIN: +2 XP',
    ctaLabel: 'CHALLENGE COMPLETE',
  }),
});

function getCommunityChampionEpithet(signatureName: string): string {
  return `The ${signatureName} Ace`;
}

export function planChampionChallenge(
  champion: Scribbit,
  challengeUsedToday: boolean
): ChampionChallengePlan {
  const primaryPower = selectPrimaryPower(champion.stats);
  const signatureName = getShapePowerSignatureName(
    champion.element,
    primaryPower
  );
  const founder = getFoundingScribbitDefinition(champion.id);
  const status: ChampionChallengeStatus = challengeUsedToday
    ? 'complete'
    : 'open';
  const statusContent = CHALLENGE_STATUS_CONTENT[status];

  return Object.freeze({
    status,
    epithet:
      founder?.personality.epithet ??
      getCommunityChampionEpithet(signatureName),
    challengeLine:
      founder?.personality.challengeLine ??
      COMMUNITY_CHALLENGE_LINE_BY_POWER[primaryPower],
    signatureName,
    statusCopy: statusContent.statusCopy,
    ctaLabel: statusContent.ctaLabel,
  });
}

// Keeps the small authored catalog testable without making it part of the UI
// API. Every community power must have distinct, compact copy, and reward copy
// must describe XP as conditional on winning without promising Mystery Ink.
export function validateChampionChallengeContent(): readonly string[] {
  const errors: string[] = [];
  const challengeLines = Object.values(COMMUNITY_CHALLENGE_LINE_BY_POWER);

  if (!Object.isFrozen(COMMUNITY_CHALLENGE_LINE_BY_POWER)) {
    errors.push('Community challenge content must be frozen.');
  }
  if (challengeLines.length !== EXPECTED_PRIMARY_POWER_COUNT) {
    errors.push(
      `Community challenge content needs exactly ${EXPECTED_PRIMARY_POWER_COUNT} lines.`
    );
  }
  if (new Set(challengeLines).size !== challengeLines.length) {
    errors.push('Community challenge lines must be unique.');
  }

  for (const [power, challengeLine] of Object.entries(
    COMMUNITY_CHALLENGE_LINE_BY_POWER
  )) {
    if (challengeLine.trim().length === 0) {
      errors.push(`${power} challenge line must not be blank.`);
    }
    if (challengeLine.length > MAXIMUM_COMMUNITY_CHALLENGE_LINE_LENGTH) {
      errors.push(
        `${power} challenge line exceeds ${MAXIMUM_COMMUNITY_CHALLENGE_LINE_LENGTH} characters.`
      );
    }
  }

  if (!Object.isFrozen(CHALLENGE_STATUS_CONTENT)) {
    errors.push('Challenge status content must be frozen.');
  }
  for (const [status, content] of Object.entries(CHALLENGE_STATUS_CONTENT)) {
    if (!Object.isFrozen(content)) {
      errors.push(`${status} challenge status content must be frozen.`);
    }
    if (
      !/\bwin\b/i.test(content.statusCopy) ||
      !/\+2 XP\b/.test(content.statusCopy)
    ) {
      errors.push(`${status} status copy must say that a win grants +2 XP.`);
    }
    if (/\bink\b/i.test(content.statusCopy)) {
      errors.push(`${status} status copy must not promise Ink.`);
    }
  }

  return Object.freeze(errors);
}
