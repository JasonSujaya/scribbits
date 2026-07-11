// Pure session content for the reward-free Practice Lab. A power enters this
// checklist only after the server returns an authoritative practice report.

import type { PrimaryPower } from '../../shared/combat/types';
import { SHAPE_POWER_IDS } from '../../shared/combat/shapepowercontent';
import { getShapePowerDisplayName } from '../../shared/combat/shapepowercontent';
import { DOODLE_DARES } from './drawonboarding';
import type { DoodleDare } from './drawonboarding';

export const PRACTICE_HEADER_TITLE = 'PRACTICE LAB';
export const PRACTICE_PROMISE =
  "NOT TODAY'S SCRIBBIT  •  NOT SAVED  •  NO REWARDS";
export const PRACTICE_SUBMIT_LABEL = 'TEST THIS SHAPE →';

export type PracticeSession = Readonly<{
  triedPowers: readonly PrimaryPower[];
  lastPower: PrimaryPower | null;
  lastPowerWasNew: boolean;
}>;

export type PracticeOutcomePlan = Readonly<{
  completed: boolean;
  headline: string;
  result: string;
  progress: string;
  checklist: string;
  primaryButton: string;
  exitButton: string;
}>;

export function createPracticeSession(): PracticeSession {
  return { triedPowers: [], lastPower: null, lastPowerWasNew: false };
}

function stableTextHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizePracticePowers(
  values: readonly unknown[]
): PrimaryPower[] {
  const seen = new Set<PrimaryPower>();
  for (const power of SHAPE_POWER_IDS) {
    if (values.includes(power)) seen.add(power);
  }
  return [...seen];
}

export function normalizePracticeSession(value: unknown): PracticeSession {
  if (Array.isArray(value)) {
    return {
      triedPowers: normalizePracticePowers(value),
      lastPower: null,
      lastPowerWasNew: false,
    };
  }
  if (typeof value !== 'object' || value === null) {
    return createPracticeSession();
  }
  const candidate = value as Partial<PracticeSession>;
  const triedPowers = normalizePracticePowers(
    Array.isArray(candidate.triedPowers) ? candidate.triedPowers : []
  );
  const lastPower = SHAPE_POWER_IDS.includes(
    candidate.lastPower as PrimaryPower
  )
    ? (candidate.lastPower as PrimaryPower)
    : null;
  return {
    triedPowers,
    lastPower,
    lastPowerWasNew: lastPower !== null && candidate.lastPowerWasNew === true,
  };
}

export function recordPracticeSessionPower(
  session: PracticeSession,
  power: PrimaryPower
): PracticeSession {
  const currentPowers = normalizePracticePowers(session.triedPowers);
  const lastPowerWasNew = !currentPowers.includes(power);
  return {
    triedPowers: normalizePracticePowers([...currentPowers, power]),
    lastPower: power,
    lastPowerWasNew,
  };
}

export function selectPracticeTargetPower(
  triedPowers: readonly PrimaryPower[],
  dayNumber: number,
  username: string | null
): PrimaryPower {
  const tried = new Set(normalizePracticePowers(triedPowers));
  const remaining = SHAPE_POWER_IDS.filter((power) => !tried.has(power));
  const candidates = remaining.length > 0 ? remaining : SHAPE_POWER_IDS;
  const stableDay = Number.isSafeInteger(dayNumber) ? dayNumber : 0;
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  return (
    candidates[
      stableTextHash(`${stableDay}:${stablePlayer}:${[...tried].join(',')}`) %
        candidates.length
    ] ?? 'inkquake'
  );
}

export function selectPracticeDoodleDare(
  triedPowers: readonly PrimaryPower[],
  dayNumber: number,
  username: string | null
): DoodleDare {
  const targetPower = selectPracticeTargetPower(
    triedPowers,
    dayNumber,
    username
  );
  const prompts = DOODLE_DARES.filter(
    (dare) => dare.suggestedPower === targetPower
  );
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  const prompt =
    prompts[
      stableTextHash(`${dayNumber}:${stablePlayer}:${targetPower}:prompt`) %
        prompts.length
    ];
  if (!prompt) throw new Error(`Practice prompt missing for ${targetPower}.`);
  return prompt;
}

export function practiceProgressCopy(
  triedPowers: readonly PrimaryPower[]
): string {
  const count = normalizePracticePowers(triedPowers).length;
  return `SERVER CHECKED  •  ${count}/4 POWERS`;
}

export function practiceChecklistCopy(
  triedPowers: readonly PrimaryPower[]
): string {
  const tried = new Set(normalizePracticePowers(triedPowers));
  const entries = SHAPE_POWER_IDS.map((power) => {
    const marker = tried.has(power) ? '✓' : '○';
    return `${marker} ${getShapePowerDisplayName(power)}`;
  });
  return `${entries.slice(0, 2).join('   ')}\n${entries.slice(2).join('   ')}`;
}

export function practiceResultCopy(session: PracticeSession): string {
  if (!session.lastPower) return 'SERVER CHECK COMPLETE';
  const powerName = getShapePowerDisplayName(session.lastPower).toUpperCase();
  return session.lastPowerWasNew
    ? `✓ NEW POWER: ${powerName}`
    : `${powerName} AGAIN • CHECKLIST UNCHANGED`;
}

export function practiceFoundPowerCopy(session: PracticeSession): string {
  if (!session.lastPower) return 'SERVER CHECK COMPLETE';
  return `SERVER FOUND: ${getShapePowerDisplayName(session.lastPower).toUpperCase()}`;
}

export function isPracticeSessionComplete(session: PracticeSession): boolean {
  return normalizePracticePowers(session.triedPowers).length ===
    SHAPE_POWER_IDS.length;
}

export function planPracticeOutcome(
  sessionValue: PracticeSession
): PracticeOutcomePlan {
  const session = normalizePracticeSession(sessionValue);
  const completed = isPracticeSessionComplete(session);
  return {
    completed,
    headline: completed
      ? '✦ ALL FOUR POWERS FOUND! ✦'
      : practiceFoundPowerCopy(session),
    result: completed
      ? 'LAB COMPLETE • SESSION MASTERED'
      : practiceResultCopy(session),
    progress: practiceProgressCopy(session.triedPowers),
    checklist: practiceChecklistCopy(session.triedPowers),
    primaryButton: completed
      ? '✏️ REMIX A FAVORITE →'
      : '✏️ DRAW ANOTHER SHAPE →',
    exitButton: completed
      ? 'END ON A HIGH NOTE · ARENA'
      : 'END PRACTICE · ARENA',
  };
}
