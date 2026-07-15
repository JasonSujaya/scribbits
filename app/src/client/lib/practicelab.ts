// Pure session content for the reward-free Practice Lab. A role enters this
// checklist only after the server returns an authoritative practice report.

import {
  COMBAT_ROLE_IDS,
  getCombatRoleContent,
  isCombatRole,
  toCurrentCombatRole,
} from '../../shared/combat/roles';
import type { CombatRole, PrimaryPower } from '../../shared/combat/types';
import { hashContentKey } from '../../shared/content/deterministic';
import { selectDoodleDareForPower } from '../../shared/content/doodledares';
import type { DoodleDare } from '../../shared/content/doodledares';

export const PRACTICE_HEADER_TITLE = 'PRACTICE LAB';
export const PRACTICE_SUBMIT_LABEL = 'TRY THIS STYLE';

export type PracticeSession = Readonly<{
  triedRoles: readonly CombatRole[];
  lastRole: CombatRole | null;
  lastRoleWasNew: boolean;
  attemptCount: number;
}>;

type PracticeOutcomePlan = Readonly<{
  completed: boolean;
  celebrateCompletion: boolean;
  headline: string;
  result: string;
  progress: string;
  checklist: string;
  primaryButton: string;
  exitButton: string;
}>;

export type PracticeRevealPlan = Readonly<{
  headline: string;
  roleName: string;
  roleDetail: string;
  progress: string;
  primaryButton: string;
}>;

const LEGACY_POWER_ROLE: Readonly<Record<PrimaryPower, CombatRole>> = {
  inkquake: 'brawler',
  nib_halo: 'longshot',
  smearstep: 'longshot',
  colorburst: 'mage',
};

function normalizeRole(value: unknown): CombatRole | null {
  if (isCombatRole(value)) return toCurrentCombatRole(value);
  switch (value) {
    case 'inkquake':
    case 'nib_halo':
    case 'smearstep':
    case 'colorburst':
      return LEGACY_POWER_ROLE[value];
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createPracticeSession(): PracticeSession {
  return {
    triedRoles: [],
    lastRole: null,
    lastRoleWasNew: false,
    attemptCount: 0,
  };
}

function normalizePracticeRoles(values: readonly unknown[]): CombatRole[] {
  const normalized = values.flatMap((value) => {
    const role = normalizeRole(value);
    return role ? [role] : [];
  });
  return COMBAT_ROLE_IDS.filter((role) => normalized.includes(role));
}

export function normalizePracticeSession(value: unknown): PracticeSession {
  if (Array.isArray(value)) {
    const triedRoles = normalizePracticeRoles(value);
    return {
      triedRoles,
      lastRole: null,
      lastRoleWasNew: false,
      attemptCount: triedRoles.length,
    };
  }
  if (!isRecord(value)) {
    return createPracticeSession();
  }
  const candidate = value;
  const storedRoles = Array.isArray(candidate.triedRoles)
    ? candidate.triedRoles
    : Array.isArray(candidate.triedPowers)
      ? candidate.triedPowers
      : [];
  const triedRoles = normalizePracticeRoles(storedRoles);
  const lastRole = normalizeRole(candidate.lastRole ?? candidate.lastPower);
  const storedAttemptCount =
    Number.isSafeInteger(candidate.attemptCount) &&
    Number(candidate.attemptCount) >= 0
      ? Number(candidate.attemptCount)
      : triedRoles.length;
  return {
    triedRoles,
    lastRole,
    lastRoleWasNew:
      lastRole !== null &&
      (candidate.lastRoleWasNew === true || candidate.lastPowerWasNew === true),
    attemptCount: Math.max(triedRoles.length, storedAttemptCount),
  };
}

export function recordPracticeSessionRole(
  session: PracticeSession,
  role: CombatRole
): PracticeSession {
  const currentRoles = normalizePracticeRoles(session.triedRoles);
  const lastRoleWasNew = !currentRoles.includes(role);
  return {
    triedRoles: normalizePracticeRoles([...currentRoles, role]),
    lastRole: role,
    lastRoleWasNew,
    attemptCount: normalizePracticeSession(session).attemptCount + 1,
  };
}

export function selectPracticeTargetRole(
  triedRoles: readonly CombatRole[],
  dayNumber: number,
  username: string | null,
  attemptCount = normalizePracticeRoles(triedRoles).length
): CombatRole {
  const tried = new Set(normalizePracticeRoles(triedRoles));
  const remaining = COMBAT_ROLE_IDS.filter((role) => !tried.has(role));
  const candidates = remaining.length > 0 ? remaining : COMBAT_ROLE_IDS;
  const stableDay = Number.isSafeInteger(dayNumber) ? dayNumber : 0;
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  const baseIndex =
    hashContentKey(`${stableDay}:${stablePlayer}:${[...tried].join(',')}`) %
    candidates.length;
  const encoreOffset =
    remaining.length === 0
      ? Math.max(0, attemptCount - COMBAT_ROLE_IDS.length)
      : 0;
  return (
    candidates[(baseIndex + encoreOffset) % candidates.length] ?? 'brawler'
  );
}

export function selectPracticeDoodleDare(
  triedRoles: readonly CombatRole[],
  dayNumber: number,
  username: string | null,
  attemptCount = normalizePracticeRoles(triedRoles).length
): DoodleDare {
  const targetRole = selectPracticeTargetRole(
    triedRoles,
    dayNumber,
    username,
    attemptCount
  );
  const targetPower = getCombatRoleContent(targetRole).signaturePower;
  const stablePlayer = username?.trim().toLowerCase() || 'anonymous';
  return selectDoodleDareForPower(
    targetPower,
    `${dayNumber}:${stablePlayer}:${targetRole}:practice:${attemptCount}`
  );
}

export function practiceProgressCopy(
  triedRoles: readonly CombatRole[]
): string {
  const count = normalizePracticeRoles(triedRoles).length;
  return `SERVER CHECKED  •  ${count}/${COMBAT_ROLE_IDS.length} ROLES`;
}

export function planPracticeReveal(
  sessionValue: PracticeSession
): PracticeRevealPlan {
  const session = normalizePracticeSession(sessionValue);
  const role = getCombatRoleContent(session.lastRole ?? 'brawler');
  return {
    headline: 'STYLE READY!',
    roleName: role.displayName.toUpperCase(),
    roleDetail: `${role.rangeLabel} · ${role.weaponName.toUpperCase()} · ${role.signatureName.toUpperCase()}`,
    progress: `${session.triedRoles.length} OF ${COMBAT_ROLE_IDS.length} FOUND`,
    primaryButton: 'WATCH IT FIGHT',
  };
}

function practiceChecklistCopy(triedRoles: readonly CombatRole[]): string {
  const tried = new Set(normalizePracticeRoles(triedRoles));
  const entries = COMBAT_ROLE_IDS.map((role) => {
    const marker = tried.has(role) ? '✓' : '○';
    return `${marker} ${getCombatRoleContent(role).displayName}`;
  });
  return `${entries.slice(0, 2).join('   ')}\n${entries.slice(2).join('   ')}`;
}

function practiceResultCopy(session: PracticeSession): string {
  if (!session.lastRole) return 'SERVER CHECK COMPLETE';
  const roleName = getCombatRoleContent(
    session.lastRole
  ).displayName.toUpperCase();
  return session.lastRoleWasNew
    ? `✓ NEW ROLE: ${roleName}`
    : `${roleName} AGAIN • CHECKLIST UNCHANGED`;
}

function practiceFoundRoleCopy(session: PracticeSession): string {
  if (!session.lastRole) return 'SERVER CHECK COMPLETE';
  return `SERVER FOUND: ${getCombatRoleContent(session.lastRole).displayName.toUpperCase()}`;
}

function isPracticeSessionComplete(session: PracticeSession): boolean {
  return (
    normalizePracticeRoles(session.triedRoles).length === COMBAT_ROLE_IDS.length
  );
}

export function planPracticeOutcome(
  sessionValue: PracticeSession
): PracticeOutcomePlan {
  const session = normalizePracticeSession(sessionValue);
  const completed = isPracticeSessionComplete(session);
  return {
    completed,
    celebrateCompletion: completed && session.lastRoleWasNew,
    headline: completed
      ? `${COMBAT_ROLE_IDS.length}/${COMBAT_ROLE_IDS.length} ROLES FOUND`
      : practiceFoundRoleCopy(session),
    result: completed
      ? 'DRAW DIFFERENTLY • FIGHT DIFFERENTLY'
      : practiceResultCopy(session),
    progress: completed
      ? 'SESSION COMPLETE • NO REWARDS • NOT SAVED'
      : practiceProgressCopy(session.triedRoles),
    checklist: practiceChecklistCopy(session.triedRoles),
    primaryButton: completed ? 'DRAW ONE MORE' : 'DRAW ANOTHER SHAPE',
    exitButton: 'END PRACTICE · ARENA',
  };
}
