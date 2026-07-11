import type {
  BattleReport,
  FounderChronicle,
  FounderChronicleMilestone,
  FounderChronicleUnlock,
} from '../../shared/arena';
import {
  FOUNDING_SCRIBBIT_DEFINITIONS,
  getFoundingScribbitDefinition,
} from '../../shared/founders';
import type { ArenaStorage } from './scribbit';

const milestoneOrder: readonly FounderChronicleMilestone[] = [
  'met',
  'respected',
  'rematched',
];

export const getFounderChronicleKey = (userId: string): string => {
  return `user:${userId}:founder-chronicle`;
};

const getMilestoneField = (
  founderId: string,
  milestone: FounderChronicleMilestone
): string => {
  return `${founderId}:${milestone}`;
};

const parseArenaDay = (storedDay: string | undefined): number | null => {
  if (storedDay === undefined) return null;
  const day = Number(storedDay);
  return Number.isSafeInteger(day) && day >= 1 ? day : null;
};

export const loadFounderChronicle = async (
  storage: ArenaStorage,
  userId: string
): Promise<FounderChronicle> => {
  const storedMilestones = await storage.hGetAll(
    getFounderChronicleKey(userId)
  );
  const entries: FounderChronicle['entries'] = [];

  for (const founder of FOUNDING_SCRIBBIT_DEFINITIONS) {
    const storedMetDay = parseArenaDay(
      storedMilestones[getMilestoneField(founder.id, 'met')]
    );
    const storedRespectedDay = parseArenaDay(
      storedMilestones[getMilestoneField(founder.id, 'respected')]
    );
    const storedRematchedDay = parseArenaDay(
      storedMilestones[getMilestoneField(founder.id, 'rematched')]
    );
    // Recover monotonically from a partial old write: either later milestone
    // proves that a real first meeting happened no later than that day.
    const metDay =
      storedMetDay ?? storedRespectedDay ?? storedRematchedDay ?? null;
    if (metDay === null) continue;

    entries.push({
      founderId: founder.id,
      metDay,
      respectedDay:
        storedRespectedDay !== null && storedRespectedDay >= metDay
          ? storedRespectedDay
          : null,
      rematchedDay:
        storedRematchedDay !== null && storedRematchedDay > metDay
          ? storedRematchedDay
          : null,
    });
  }

  return { entries };
};

const addMilestoneOnce = async (
  storage: ArenaStorage,
  userId: string,
  founderId: `founding-${string}`,
  milestone: FounderChronicleMilestone,
  day: number,
  unlocks: FounderChronicleUnlock[]
): Promise<boolean> => {
  const added = await storage.hSetNX(
    getFounderChronicleKey(userId),
    getMilestoneField(founderId, milestone),
    day.toString()
  );
  if (added !== 1) return false;
  unlocks.push({ founderId, milestone, day });
  return true;
};

// Only direct exhibition and Champion fights count. Passive overnight Rumble
// pairings do not pretend the player personally met a founder. Every write is a
// monotonic first-only stamp, so request retries cannot inflate progress.
export const recordFounderChronicleBattle = async (
  storage: ArenaStorage,
  userId: string,
  report: BattleReport,
  ownedScribbitId: string
): Promise<readonly FounderChronicleUnlock[]> => {
  if (report.kind !== 'exhibition' && report.kind !== 'boss') return [];
  if (!Number.isSafeInteger(report.day) || report.day < 1) return [];

  const ownedSlot =
    report.a.id === ownedScribbitId
      ? 'a'
      : report.b.id === ownedScribbitId
        ? 'b'
        : null;
  if (ownedSlot === null) return [];

  const opponent = ownedSlot === 'a' ? report.b : report.a;
  const founder = getFoundingScribbitDefinition(opponent.id);
  if (!founder) return [];

  const unlocks: FounderChronicleUnlock[] = [];
  const key = getFounderChronicleKey(userId);
  const metField = getMilestoneField(founder.id, 'met');
  let firstMetDay = parseArenaDay(await storage.hGet(key, metField));

  if (firstMetDay === null) {
    const addedMet = await addMilestoneOnce(
      storage,
      userId,
      founder.id,
      'met',
      report.day,
      unlocks
    );
    firstMetDay = addedMet
      ? report.day
      : parseArenaDay(await storage.hGet(key, metField));
  }

  if (report.winner === ownedSlot) {
    await addMilestoneOnce(
      storage,
      userId,
      founder.id,
      'respected',
      report.day,
      unlocks
    );
  }

  if (firstMetDay !== null && report.day > firstMetDay) {
    await addMilestoneOnce(
      storage,
      userId,
      founder.id,
      'rematched',
      report.day,
      unlocks
    );
  }

  return milestoneOrder.flatMap((milestone) =>
    unlocks.filter((unlock) => unlock.milestone === milestone)
  );
};
