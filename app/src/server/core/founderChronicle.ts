import type {
  BattleReport,
  FounderChronicle,
  FounderChronicleBeat,
  FounderRivalryOutcome,
} from '../../shared/arena';
import {
  FOUNDING_SCRIBBIT_DEFINITIONS,
  getFoundingScribbitDefinition,
} from '../../shared/founders';
import type { ArenaStorage, ArenaTransaction } from './storage';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
} from './storage';

type StoredFounderRivalryThread = {
  founderId: `founding-${string}`;
  startedDay: number;
  playerWins: number;
  founderWins: number;
  reportIds: string[];
};

type StoredFounderRivalryResolution = StoredFounderRivalryThread & {
  resolvedDay: number;
  outcome: FounderRivalryOutcome;
};

export type StoredFounderChronicle = {
  schemaVersion: 2;
  activeRivalry: StoredFounderRivalryThread | null;
  resolvedRivalries: StoredFounderRivalryResolution[];
  lastAdvancedDay: number | null;
  legacyFounderIds: `founding-${string}`[];
};

export type StoredFounderChronicleParseResult =
  | { status: 'missing' }
  | { status: 'valid'; chronicle: StoredFounderChronicle }
  | { status: 'invalid' };

export type FounderChronicleBattleFact = {
  founderId: `founding-${string}`;
  reportId: string;
  day: number;
  playerWon: boolean;
};

type PendingFounderChronicleBattle = {
  ownedScribbitId: string;
  queuedAtMilliseconds: number;
};

type FounderChronicleAdvance = {
  chronicle: StoredFounderChronicle;
  beats: readonly FounderChronicleBeat[];
};

export type FounderChronicleBattleProjection = {
  reportId: string;
  founderChronicle: FounderChronicle;
  beat: FounderChronicleBeat;
};

type BattleReportLoader = (
  battleReportId: string
) => Promise<BattleReport | undefined>;

const maximumResolvedRivalries = FOUNDING_SCRIBBIT_DEFINITIONS.length;
const maximumPendingRepairsPerLoad = 12;
const pendingBattleTtlSeconds = 30 * 24 * 60 * 60;
const stalePendingBattleMilliseconds = 15 * 60 * 1_000;

export const getFounderChronicleKey = (userId: string): string => {
  return `user:${userId}:founder-chronicle:v2`;
};

export const getLegacyFounderChronicleKey = (userId: string): string => {
  return `user:${userId}:founder-chronicle`;
};

export const getPendingFounderChronicleKey = (userId: string): string => {
  return `user:${userId}:founder-chronicle:pending:v2`;
};

export const createEmptyFounderChronicle = (): StoredFounderChronicle => ({
  schemaVersion: 2,
  activeRivalry: null,
  resolvedRivalries: [],
  lastAdvancedDay: null,
  legacyFounderIds: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isArenaDay = (value: unknown): value is number => {
  return Number.isSafeInteger(value) && Number(value) >= 1;
};

const isScore = (value: unknown): value is number => {
  return (
    Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 2
  );
};

const isFounderId = (value: unknown): value is `founding-${string}` => {
  return (
    typeof value === 'string' && getFoundingScribbitDefinition(value) !== null
  );
};

const parseFounderIds = (value: unknown): `founding-${string}`[] | null => {
  if (!Array.isArray(value) || value.length > maximumResolvedRivalries) {
    return null;
  }
  if (value.some((founderId) => !isFounderId(founderId))) return null;
  const founderIds = value as `founding-${string}`[];
  return new Set(founderIds).size === founderIds.length
    ? [...founderIds]
    : null;
};

const parseReportIds = (value: unknown): string[] | null => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 3 ||
    value.some(
      (reportId) => typeof reportId !== 'string' || reportId.length < 1
    )
  ) {
    return null;
  }
  const reportIds = [...new Set(value)];
  return reportIds.length === value.length ? reportIds : null;
};

const parseStoredRivalryThread = (
  value: unknown
): StoredFounderRivalryThread | null => {
  if (!isRecord(value)) return null;
  const reportIds = parseReportIds(value.reportIds);
  if (
    !isFounderId(value.founderId) ||
    !isArenaDay(value.startedDay) ||
    !isScore(value.playerWins) ||
    !isScore(value.founderWins) ||
    value.playerWins + value.founderWins < 1 ||
    value.playerWins + value.founderWins > 2 ||
    value.playerWins === 2 ||
    value.founderWins === 2 ||
    !reportIds ||
    reportIds.length !== value.playerWins + value.founderWins
  ) {
    return null;
  }
  return {
    founderId: value.founderId,
    startedDay: value.startedDay,
    playerWins: value.playerWins,
    founderWins: value.founderWins,
    reportIds,
  };
};

const parseStoredRivalryResolution = (
  value: unknown
): StoredFounderRivalryResolution | null => {
  if (!isRecord(value)) return null;
  const reportIds = parseReportIds(value.reportIds);
  const outcome = value.outcome;
  if (
    !isFounderId(value.founderId) ||
    !isArenaDay(value.startedDay) ||
    !isArenaDay(value.resolvedDay) ||
    value.resolvedDay < value.startedDay ||
    !isScore(value.playerWins) ||
    !isScore(value.founderWins) ||
    value.playerWins + value.founderWins < 2 ||
    value.playerWins + value.founderWins > 3 ||
    (value.playerWins !== 2 && value.founderWins !== 2) ||
    outcome !==
      (value.playerWins === 2 ? 'player_prevailed' : 'founder_prevailed') ||
    !reportIds ||
    reportIds.length !== value.playerWins + value.founderWins
  ) {
    return null;
  }
  return {
    founderId: value.founderId,
    startedDay: value.startedDay,
    resolvedDay: value.resolvedDay,
    playerWins: value.playerWins,
    founderWins: value.founderWins,
    outcome: outcome as FounderRivalryOutcome,
    reportIds,
  };
};

export const parseStoredFounderChronicle = (
  storedChronicle: string | undefined
): StoredFounderChronicleParseResult => {
  if (storedChronicle === undefined) return { status: 'missing' };
  try {
    const value: unknown = JSON.parse(storedChronicle);
    if (!isRecord(value) || value.schemaVersion !== 2) {
      return { status: 'invalid' };
    }
    const activeRivalry =
      value.activeRivalry === null
        ? null
        : parseStoredRivalryThread(value.activeRivalry);
    if (value.activeRivalry !== null && activeRivalry === null) {
      return { status: 'invalid' };
    }
    if (
      !Array.isArray(value.resolvedRivalries) ||
      value.resolvedRivalries.length > maximumResolvedRivalries
    ) {
      return { status: 'invalid' };
    }
    const resolvedRivalries = value.resolvedRivalries.map(
      parseStoredRivalryResolution
    );
    if (resolvedRivalries.some((rivalry) => rivalry === null)) {
      return { status: 'invalid' };
    }
    const completeRivalries =
      resolvedRivalries as StoredFounderRivalryResolution[];
    const founderIds = completeRivalries.map((rivalry) => rivalry.founderId);
    if (new Set(founderIds).size !== founderIds.length) {
      return { status: 'invalid' };
    }
    if (activeRivalry && founderIds.includes(activeRivalry.founderId)) {
      return { status: 'invalid' };
    }
    const lastAdvancedDay =
      value.lastAdvancedDay === null
        ? null
        : isArenaDay(value.lastAdvancedDay)
          ? value.lastAdvancedDay
          : undefined;
    if (lastAdvancedDay === undefined) return { status: 'invalid' };
    const legacyFounderIds =
      value.legacyFounderIds === undefined
        ? []
        : parseFounderIds(value.legacyFounderIds);
    if (legacyFounderIds === null) return { status: 'invalid' };
    return {
      status: 'valid',
      chronicle: {
        schemaVersion: 2,
        activeRivalry,
        resolvedRivalries: completeRivalries,
        lastAdvancedDay,
        legacyFounderIds,
      },
    };
  } catch {
    return { status: 'invalid' };
  }
};

const requireStoredFounderChronicle = (
  storedChronicle: string | undefined
): StoredFounderChronicle => {
  const parsed = parseStoredFounderChronicle(storedChronicle);
  if (parsed.status === 'missing') return createEmptyFounderChronicle();
  if (parsed.status === 'valid') return parsed.chronicle;
  throw new Error('Stored Founder Chronicle is invalid.');
};

const cloneStoredRivalryThread = (
  rivalry: StoredFounderRivalryThread
): StoredFounderRivalryThread => ({
  ...rivalry,
  reportIds: [...rivalry.reportIds],
});

const cloneStoredRivalryResolution = (
  rivalry: StoredFounderRivalryResolution
): StoredFounderRivalryResolution => ({
  ...rivalry,
  reportIds: [...rivalry.reportIds],
});

const hasProcessedReport = (
  chronicle: StoredFounderChronicle,
  reportId: string
): boolean => {
  return (
    chronicle.activeRivalry?.reportIds.includes(reportId) === true ||
    chronicle.resolvedRivalries.some((rivalry) =>
      rivalry.reportIds.includes(reportId)
    )
  );
};

const createBeat = (
  fact: FounderChronicleBattleFact,
  kind: FounderChronicleBeat['kind'],
  playerWins: number,
  founderWins: number,
  outcome: FounderRivalryOutcome | null
): FounderChronicleBeat => ({
  founderId: fact.founderId,
  kind,
  day: fact.day,
  playerWins,
  founderWins,
  outcome,
});

// Pure production reducer also bundled into the browser mock. It is the only
// home for series scoring, one-beat-per-day pacing, and first-to-two closure.
export const advanceFounderChronicle = (
  currentChronicle: StoredFounderChronicle,
  fact: FounderChronicleBattleFact
): FounderChronicleAdvance => {
  const chronicle: StoredFounderChronicle = {
    schemaVersion: 2,
    activeRivalry: currentChronicle.activeRivalry
      ? cloneStoredRivalryThread(currentChronicle.activeRivalry)
      : null,
    resolvedRivalries: currentChronicle.resolvedRivalries.map(
      cloneStoredRivalryResolution
    ),
    lastAdvancedDay: currentChronicle.lastAdvancedDay,
    legacyFounderIds: [...currentChronicle.legacyFounderIds],
  };
  if (
    hasProcessedReport(chronicle, fact.reportId) ||
    (chronicle.lastAdvancedDay !== null &&
      fact.day <= chronicle.lastAdvancedDay)
  ) {
    return { chronicle, beats: [] };
  }

  const alreadyResolved = chronicle.resolvedRivalries.some(
    (rivalry) => rivalry.founderId === fact.founderId
  );
  if (!chronicle.activeRivalry) {
    if (alreadyResolved) return { chronicle, beats: [] };
    const playerWins = fact.playerWon ? 1 : 0;
    const founderWins = fact.playerWon ? 0 : 1;
    chronicle.activeRivalry = {
      founderId: fact.founderId,
      startedDay: fact.day,
      playerWins,
      founderWins,
      reportIds: [fact.reportId],
    };
    chronicle.lastAdvancedDay = fact.day;
    return {
      chronicle,
      beats: [
        createBeat(fact, 'rivalry_started', playerWins, founderWins, null),
      ],
    };
  }

  if (chronicle.activeRivalry.founderId !== fact.founderId) {
    return { chronicle, beats: [] };
  }

  const activeRivalry = chronicle.activeRivalry;
  if (fact.playerWon) activeRivalry.playerWins += 1;
  else activeRivalry.founderWins += 1;
  activeRivalry.reportIds.push(fact.reportId);
  chronicle.lastAdvancedDay = fact.day;

  if (activeRivalry.playerWins < 2 && activeRivalry.founderWins < 2) {
    return {
      chronicle,
      beats: [
        createBeat(
          fact,
          'rivalry_advanced',
          activeRivalry.playerWins,
          activeRivalry.founderWins,
          null
        ),
      ],
    };
  }

  const outcome: FounderRivalryOutcome =
    activeRivalry.playerWins === 2 ? 'player_prevailed' : 'founder_prevailed';
  const resolution: StoredFounderRivalryResolution = {
    ...cloneStoredRivalryThread(activeRivalry),
    resolvedDay: fact.day,
    outcome,
  };
  chronicle.activeRivalry = null;
  chronicle.resolvedRivalries = [
    resolution,
    ...chronicle.resolvedRivalries.filter(
      (rivalry) => rivalry.founderId !== resolution.founderId
    ),
  ].slice(0, maximumResolvedRivalries);
  return {
    chronicle,
    beats: [
      createBeat(
        fact,
        'rivalry_resolved',
        resolution.playerWins,
        resolution.founderWins,
        outcome
      ),
    ],
  };
};

export const projectFounderChronicle = (
  chronicle: StoredFounderChronicle
): FounderChronicle => ({
  activeRivalry: chronicle.activeRivalry
    ? {
        founderId: chronicle.activeRivalry.founderId,
        startedDay: chronicle.activeRivalry.startedDay,
        playerWins: chronicle.activeRivalry.playerWins,
        founderWins: chronicle.activeRivalry.founderWins,
      }
    : null,
  resolvedRivalries: chronicle.resolvedRivalries.map((rivalry) => ({
    founderId: rivalry.founderId,
    startedDay: rivalry.startedDay,
    resolvedDay: rivalry.resolvedDay,
    playerWins: rivalry.playerWins,
    founderWins: rivalry.founderWins,
    outcome: rivalry.outcome,
  })),
  lastAdvancedDay: chronicle.lastAdvancedDay,
  ...(chronicle.legacyFounderIds.length > 0
    ? { legacyFounderIds: [...chronicle.legacyFounderIds] }
    : {}),
});

const legacyMilestoneNames = ['met', 'respected', 'rematched'] as const;

const parseLegacyFounderIds = (
  storedMilestones: Readonly<Record<string, string>>
): `founding-${string}`[] => {
  return FOUNDING_SCRIBBIT_DEFINITIONS.filter((founder) =>
    legacyMilestoneNames.some((milestone) =>
      isArenaDay(Number(storedMilestones[`${founder.id}:${milestone}`]))
    )
  ).map((founder) => founder.id);
};

const mergeLegacyFounderIds = (
  chronicle: StoredFounderChronicle,
  storedMilestones: Readonly<Record<string, string>>
): StoredFounderChronicle => {
  const founderIds = new Set([
    ...chronicle.legacyFounderIds,
    ...parseLegacyFounderIds(storedMilestones),
  ]);
  return {
    ...chronicle,
    legacyFounderIds: FOUNDING_SCRIBBIT_DEFINITIONS.map(
      (founder) => founder.id
    ).filter((founderId) => founderIds.has(founderId)),
  };
};

const migrateLegacyFounderChronicle = async (
  storage: ArenaStorage,
  userId: string
): Promise<StoredFounderChronicle> => {
  const chronicleKey = getFounderChronicleKey(userId);
  const legacyKey = getLegacyFounderChronicleKey(userId);
  const existingChronicle = await storage.get(chronicleKey);
  const legacyMilestones = await storage.hGetAll(legacyKey);
  if (Object.keys(legacyMilestones).length === 0) {
    return requireStoredFounderChronicle(existingChronicle);
  }

  if (!storage.watch) {
    const currentChronicle = requireStoredFounderChronicle(
      await storage.get(chronicleKey)
    );
    const currentLegacyMilestones = await storage.hGetAll(legacyKey);
    const migratedChronicle = mergeLegacyFounderIds(
      currentChronicle,
      currentLegacyMilestones
    );
    await storage.set(chronicleKey, JSON.stringify(migratedChronicle));
    await storage.del(legacyKey);
    return migratedChronicle;
  }

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(chronicleKey);
      const currentChronicle = requireStoredFounderChronicle(
        await storage.get(chronicleKey)
      );
      const currentLegacyMilestones = await storage.hGetAll(legacyKey);
      if (Object.keys(currentLegacyMilestones).length === 0) {
        await transaction.unwatch();
        return currentChronicle;
      }
      const nextChronicle = mergeLegacyFounderIds(
        currentChronicle,
        currentLegacyMilestones
      );
      await transaction.multi();
      await transaction.set(chronicleKey, JSON.stringify(nextChronicle));
      await transaction.del(legacyKey);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return nextChronicle;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Founder Chronicle');
      throw error;
    }
  }
  throw new Error('Founder Chronicle migration changed too often to finish.');
};

export const loadStoredFounderChronicle = async (
  storage: ArenaStorage,
  userId: string
): Promise<StoredFounderChronicle> => {
  return migrateLegacyFounderChronicle(storage, userId);
};

export const loadFounderChronicle = async (
  storage: ArenaStorage,
  userId: string
): Promise<FounderChronicle> =>
  projectFounderChronicle(await loadStoredFounderChronicle(storage, userId));

export const getFounderChronicleBattleFact = (
  report: BattleReport,
  ownedScribbitId: string
): FounderChronicleBattleFact | null => {
  if (report.kind !== 'exhibition' && report.kind !== 'boss') return null;
  if (
    !isArenaDay(report.day) ||
    typeof report.id !== 'string' ||
    report.id.length < 1 ||
    (report.winner !== 'a' && report.winner !== 'b')
  ) {
    return null;
  }
  const ownedSlot =
    report.a.id === ownedScribbitId
      ? 'a'
      : report.b.id === ownedScribbitId
        ? 'b'
        : null;
  if (ownedSlot === null) return null;
  const opponent = ownedSlot === 'a' ? report.b : report.a;
  const founder = getFoundingScribbitDefinition(opponent.id);
  if (!founder) return null;
  return {
    founderId: founder.id,
    reportId: report.id,
    day: report.day,
    playerWon: report.winner === ownedSlot,
  };
};

const createStoredChronicleProjection = (
  founderChronicle: FounderChronicle
): StoredFounderChronicle => ({
  schemaVersion: 2,
  activeRivalry: founderChronicle.activeRivalry
    ? { ...founderChronicle.activeRivalry, reportIds: [] }
    : null,
  resolvedRivalries: founderChronicle.resolvedRivalries.map((rivalry) => ({
    ...rivalry,
    reportIds: [],
  })),
  lastAdvancedDay: founderChronicle.lastAdvancedDay,
  legacyFounderIds: [...(founderChronicle.legacyFounderIds ?? [])],
});

export const projectFounderChronicleBattle = (
  preBattleChronicle: FounderChronicle,
  report: BattleReport,
  ownedScribbitId: string
): FounderChronicleBattleProjection | null => {
  const fact = getFounderChronicleBattleFact(report, ownedScribbitId);
  if (!fact) return null;

  // Public Chronicle state intentionally omits report ids. This transient
  // reducer input is never stored; the exact current report is verified again
  // against the durable state before its projected beat can be recovered.
  const advanced = advanceFounderChronicle(
    createStoredChronicleProjection(preBattleChronicle),
    fact
  );
  const beat = advanced.beats.at(0);
  if (advanced.beats.length !== 1 || !beat) return null;
  return {
    reportId: fact.reportId,
    founderChronicle: projectFounderChronicle(advanced.chronicle),
    beat,
  };
};

const rivalryThreadsMatch = (
  left: FounderChronicle['activeRivalry'],
  right: FounderChronicle['activeRivalry']
): boolean => {
  if (left === null || right === null) return left === right;
  return (
    left.founderId === right.founderId &&
    left.startedDay === right.startedDay &&
    left.playerWins === right.playerWins &&
    left.founderWins === right.founderWins
  );
};

const founderChroniclesMatch = (
  left: FounderChronicle,
  right: FounderChronicle
): boolean => {
  const leftLegacyFounderIds = left.legacyFounderIds ?? [];
  const rightLegacyFounderIds = right.legacyFounderIds ?? [];
  return (
    left.lastAdvancedDay === right.lastAdvancedDay &&
    rivalryThreadsMatch(left.activeRivalry, right.activeRivalry) &&
    left.resolvedRivalries.length === right.resolvedRivalries.length &&
    left.resolvedRivalries.every((leftRivalry, index) => {
      const rightRivalry = right.resolvedRivalries[index];
      return (
        rightRivalry !== undefined &&
        rivalryThreadsMatch(leftRivalry, rightRivalry) &&
        leftRivalry.resolvedDay === rightRivalry.resolvedDay &&
        leftRivalry.outcome === rightRivalry.outcome
      );
    }) &&
    leftLegacyFounderIds.length === rightLegacyFounderIds.length &&
    leftLegacyFounderIds.every(
      (founderId, index) => founderId === rightLegacyFounderIds[index]
    )
  );
};

export const recoverProjectedFounderChronicleBeat = (
  projection: FounderChronicleBattleProjection | null,
  reloadedChronicle: StoredFounderChronicle
): FounderChronicleBeat | null => {
  if (
    !projection ||
    !founderChroniclesMatch(
      projection.founderChronicle,
      projectFounderChronicle(reloadedChronicle)
    )
  ) {
    return null;
  }

  const advancedRivalry =
    projection.beat.kind === 'rivalry_resolved'
      ? reloadedChronicle.resolvedRivalries.find(
          (rivalry) => rivalry.founderId === projection.beat.founderId
        )
      : reloadedChronicle.activeRivalry;
  if (
    !advancedRivalry ||
    advancedRivalry.founderId !== projection.beat.founderId ||
    advancedRivalry.reportIds.at(-1) !== projection.reportId
  ) {
    return null;
  }
  return projection.beat;
};

export const recordFounderChronicleBattle = async (
  storage: ArenaStorage,
  userId: string,
  report: BattleReport,
  ownedScribbitId: string
): Promise<readonly FounderChronicleBeat[]> => {
  const fact = getFounderChronicleBattleFact(report, ownedScribbitId);
  if (!fact) return [];
  if (!storage.watch) {
    throw new Error('Founder Chronicle updates require transaction support.');
  }
  await migrateLegacyFounderChronicle(storage, userId);
  const chronicleKey = getFounderChronicleKey(userId);
  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(chronicleKey);
      const current = requireStoredFounderChronicle(
        await storage.get(chronicleKey)
      );
      const advanced = advanceFounderChronicle(current, fact);
      if (advanced.beats.length === 0) {
        await transaction.unwatch();
        return [];
      }
      await transaction.multi();
      await transaction.set(chronicleKey, JSON.stringify(advanced.chronicle));
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length > 0) return advanced.beats;
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Founder Chronicle');
      throw error;
    }
  }
  throw new Error('Founder Chronicle changed too often to update safely.');
};

const parsePendingBattle = (
  storedPendingBattle: string
): PendingFounderChronicleBattle | null => {
  try {
    const value: unknown = JSON.parse(storedPendingBattle);
    if (
      !isRecord(value) ||
      typeof value.ownedScribbitId !== 'string' ||
      value.ownedScribbitId.length < 1 ||
      !Number.isSafeInteger(value.queuedAtMilliseconds) ||
      Number(value.queuedAtMilliseconds) < 0
    ) {
      return null;
    }
    return {
      ownedScribbitId: value.ownedScribbitId,
      queuedAtMilliseconds: Number(value.queuedAtMilliseconds),
    };
  } catch {
    return null;
  }
};

export const queueFounderChronicleBattle = async (
  storage: ArenaStorage,
  userId: string,
  report: BattleReport,
  ownedScribbitId: string,
  queuedAtMilliseconds: number
): Promise<boolean> => {
  if (!getFounderChronicleBattleFact(report, ownedScribbitId)) return false;
  if (!Number.isSafeInteger(queuedAtMilliseconds) || queuedAtMilliseconds < 0) {
    throw new Error('Founder Chronicle queue time is invalid.');
  }
  const key = getPendingFounderChronicleKey(userId);
  await storage.hSet(key, {
    [report.id]: JSON.stringify({
      ownedScribbitId,
      queuedAtMilliseconds,
    } satisfies PendingFounderChronicleBattle),
  });
  await storage.expire(key, pendingBattleTtlSeconds);
  return true;
};

export const completeFounderChronicleBattle = async (
  storage: ArenaStorage,
  userId: string,
  report: BattleReport,
  ownedScribbitId: string
): Promise<readonly FounderChronicleBeat[]> => {
  const beats = await recordFounderChronicleBattle(
    storage,
    userId,
    report,
    ownedScribbitId
  );
  await storage.hDel(getPendingFounderChronicleKey(userId), [report.id]);
  return beats;
};

export const repairPendingFounderChronicleBattles = async (
  storage: ArenaStorage,
  userId: string,
  nowMilliseconds: number,
  loadBattleReport: BattleReportLoader
): Promise<void> => {
  const pendingKey = getPendingFounderChronicleKey(userId);
  const pendingBattles: Array<{
    reportId: string;
    pendingBattle: PendingFounderChronicleBattle;
  }> = [];
  for (const [reportId, storedPendingBattle] of Object.entries(
    await storage.hGetAll(pendingKey)
  )) {
    const pendingBattle = parsePendingBattle(storedPendingBattle);
    if (!pendingBattle) {
      await storage.hDel(pendingKey, [reportId]);
      continue;
    }
    pendingBattles.push({ reportId, pendingBattle });
  }
  pendingBattles.sort((left, right) => {
    if (
      left.pendingBattle.queuedAtMilliseconds !==
      right.pendingBattle.queuedAtMilliseconds
    ) {
      return (
        left.pendingBattle.queuedAtMilliseconds -
        right.pendingBattle.queuedAtMilliseconds
      );
    }
    return left.reportId.localeCompare(right.reportId);
  });

  const repairableBattles: Array<{
    report: BattleReport;
    pendingBattle: PendingFounderChronicleBattle;
  }> = [];
  for (const { reportId, pendingBattle } of pendingBattles.slice(
    0,
    maximumPendingRepairsPerLoad
  )) {
    const report = await loadBattleReport(reportId);
    if (!report) {
      if (
        nowMilliseconds - pendingBattle.queuedAtMilliseconds >=
        stalePendingBattleMilliseconds
      ) {
        await storage.hDel(pendingKey, [reportId]);
        continue;
      }
      // A fresh earlier receipt may be waiting for its committed report. Do
      // not let later receipts advance the one-beat-per-day story past it.
      break;
    }
    repairableBattles.push({ report, pendingBattle });
  }

  repairableBattles.sort((left, right) => {
    if (left.report.day !== right.report.day) {
      return left.report.day - right.report.day;
    }
    if (
      left.pendingBattle.queuedAtMilliseconds !==
      right.pendingBattle.queuedAtMilliseconds
    ) {
      return (
        left.pendingBattle.queuedAtMilliseconds -
        right.pendingBattle.queuedAtMilliseconds
      );
    }
    return left.report.id.localeCompare(right.report.id);
  });
  for (const { report, pendingBattle } of repairableBattles) {
    await completeFounderChronicleBattle(
      storage,
      userId,
      report,
      pendingBattle.ownedScribbitId
    );
  }
};
