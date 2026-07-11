// Pure session content for the reward-free Practice Lab. A power enters this
// checklist only after the server returns an authoritative practice report.

import type { PrimaryPower } from '../../shared/combat/types';
import { SHAPE_POWER_IDS } from '../../shared/combat/shapepowercontent';
import { getShapePowerDisplayName } from '../../shared/combat/shapepowercontent';
import { hashContentKey } from '../../shared/content/deterministic';
import { selectDoodleDareForPower } from '../../shared/content/doodledares';
import type { DoodleDare } from '../../shared/content/doodledares';

export const PRACTICE_HEADER_TITLE = 'PRACTICE LAB';
export const PRACTICE_PROMISE =
  "NOT TODAY'S SCRIBBIT  •  NOT SAVED  •  NO REWARDS";
export const PRACTICE_SUBMIT_LABEL = 'TEST THIS SHAPE →';

export type PracticeSession = Readonly<{
  triedPowers: readonly PrimaryPower[];
  lastPower: PrimaryPower | null;
  lastPowerWasNew: boolean;
  attemptCount: number;
}>;

export type PracticeOutcomePlan = Readonly<{
  completed: boolean;
  celebrateCompletion: boolean;
  headline: string;
  result: string;
  progress: string;
  checklist: string;
  primaryButton: string;
  exitButton: string;
}>;

export function createPracticeSession(): PracticeSession {
  return {
    triedPowers: [],
    lastPower: null,
    lastPowerWasNew: false,
    attemptCount: 0,
  };
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
    const triedPowers = normalizePracticePowers(value);
    return {
      triedPowers,
      lastPower: null,
      lastPowerWasNew: false,
      attemptCount: triedPowers.length,
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
  const storedAttemptCount =
    Number.isSafeInteger(candidate.attemptCount) &&
    Number(candidate.attemptCount) >= 0
      ? Number(candidate.attemptCount)
      : triedPowers.length;
  return {
    triedPowers,
    lastPower,
    lastPowerWasNew: lastPower !== null && candidate.lastPowerWasNew === true,
    attemptCount: Math.max(triedPowers.length, storedAttemptCount),
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
    attemptCount: normalizePracticeSession(session).attemptCount + 1,
  };
}

export function selectPracticeTargetPower(
  triedPowers: readonly PrimaryPower[],
  dayNumber: number,
  username: string | null,
  attemptCount = normalizePracticePowers(triedPowers).length
): PrimaryPower {
  const tried = new Set(normalizePracticePowers(triedPowers));
  const remaining = SHAPE_POWER_IDS.filter((power) => !tried.has(power));
  const candidates = remaining.length > 0 ? remaining : SHAPE_POWER_IDS;
  const stableDay = Number.isSafeInteger(dayNumber) ? dayNumber : 0;
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  const baseIndex =
    hashContentKey(`${stableDay}:${stablePlayer}:${[...tried].join(',')}`) %
    candidates.length;
  const encoreOffset =
    remaining.length === 0
      ? Math.max(0, attemptCount - SHAPE_POWER_IDS.length)
      : 0;
  return (
    candidates[(baseIndex + encoreOffset) % candidates.length] ?? 'inkquake'
  );
}

export function selectPracticeDoodleDare(
  triedPowers: readonly PrimaryPower[],
  dayNumber: number,
  username: string | null,
  attemptCount = normalizePracticePowers(triedPowers).length
): DoodleDare {
  const targetPower = selectPracticeTargetPower(
    triedPowers,
    dayNumber,
    username,
    attemptCount
  );
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  return selectDoodleDareForPower(
    targetPower,
    `${dayNumber}:${stablePlayer}:${targetPower}:practice:${attemptCount}`
  );
}

export function practiceProgressCopy(
  triedPowers: readonly PrimaryPower[]
): string {
  const count = normalizePracticePowers(triedPowers).length;
  return `SERVER CHECKED  •  ${count}/${SHAPE_POWER_IDS.length} POWERS`;
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
  return (
    normalizePracticePowers(session.triedPowers).length ===
    SHAPE_POWER_IDS.length
  );
}

export function planPracticeOutcome(
  sessionValue: PracticeSession
): PracticeOutcomePlan {
  const session = normalizePracticeSession(sessionValue);
  const completed = isPracticeSessionComplete(session);
  return {
    completed,
    celebrateCompletion: completed && session.lastPowerWasNew,
    headline: completed
      ? `✦ ${SHAPE_POWER_IDS.length}/${SHAPE_POWER_IDS.length} POWERS FOUND! ✦`
      : practiceFoundPowerCopy(session),
    result: completed
      ? 'DRAW DIFFERENTLY • FIGHT DIFFERENTLY'
      : practiceResultCopy(session),
    progress: completed
      ? 'SESSION COMPLETE • NO REWARDS • NOT SAVED'
      : practiceProgressCopy(session.triedPowers),
    checklist: practiceChecklistCopy(session.triedPowers),
    primaryButton: completed ? '✏️ DRAW ONE MORE →' : '✏️ DRAW ANOTHER SHAPE →',
    exitButton: 'END PRACTICE · ARENA',
  };
}
