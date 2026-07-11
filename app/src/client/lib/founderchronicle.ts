// Pure presentation planning for one best-of-three Founder Rival Thread.
// The server owns progression; this module only makes snapshots readable.

import type {
  BattleReport,
  Element,
  FounderChronicle,
  FounderChronicleBeat,
  FounderRivalryOutcome,
  Mood,
} from '../../shared/arena';
import {
  FOUNDING_SCRIBBIT_DEFINITIONS,
  getFoundingScribbitDefinition,
} from '../../shared/founders';
import type { FoundingScribbitDefinition } from '../../shared/founders';
import {
  getFounderRivalEpisodePage,
  getFounderRivalEpisodeResultLine,
} from '../../shared/content/founderrivalepisodes';
import type { FighterSlot } from '../../shared/combat/types';

const MAXIMUM_RESOLVED_MARGIN_NOTES = 3;
const BEST_OF_THREE_LINE = 'Best of three • first to 2';
const NO_ACTIVE_RIVALRY_LINE = 'Fight a founder to start a best-of-three.';

type NormalizedRivalry = Readonly<{
  founderId: `founding-${string}`;
  startedDay: number;
  playerWins: number;
  founderWins: number;
}>;

type NormalizedResolution = NormalizedRivalry &
  Readonly<{
    resolvedDay: number;
    outcome: FounderRivalryOutcome;
  }>;

type NormalizedChronicle = Readonly<{
  activeRivalry: NormalizedRivalry | null;
  resolvedRivalries: readonly NormalizedResolution[];
  resolutionByFounderId: ReadonlyMap<string, NormalizedResolution>;
  lastAdvancedDay: number | null;
  legacyFounderIds: readonly `founding-${string}`[];
}>;

export type FounderChronicleRivalPlan = Readonly<{
  founderId: `founding-${string}`;
  name: string;
  artist: string;
  element: Element;
  level: 1 | 2 | 3;
  mood: Mood;
  imageUrl: `/creatures/creature-${string}.png`;
  epithet: string;
  startedDay: number;
  playerWins: number;
  founderWins: number;
  scoreLine: string;
  formatLine: string;
  readyToday: boolean;
  returnDay: number | null;
  availabilityLine: string;
  quote: string;
  nextBoutNumber: 2 | 3;
  nextEpisodeTitle: string;
}>;

export type FounderChronicleResolvedNotePlan = Readonly<{
  founderId: `founding-${string}`;
  name: string;
  element: Element;
  imageUrl: `/creatures/creature-${string}.png`;
  epithet: string;
  startedDay: number;
  resolvedDay: number;
  playerWins: number;
  founderWins: number;
  outcome: FounderRivalryOutcome;
  headline: string;
  scoreLine: string;
  dayLine: string;
  quote: string;
}>;

export type FounderChroniclePlan = Readonly<{
  activeRivalry: FounderChronicleRivalPlan | null;
  resolvedNotes: readonly FounderChronicleResolvedNotePlan[];
  emptyLine: string | null;
  legacyEncounterCount: number;
}>;

export type FounderChronicleBeatCopy = Readonly<{
  headline: string;
  detail: string;
  quote: string;
}>;

export type FounderRivalryStakesKind =
  | 'opening'
  | 'player_match_point'
  | 'founder_match_point'
  | 'decider';

export type FounderRivalryStakesPlan = Readonly<{
  founderId: `founding-${string}`;
  founderName: string;
  kind: FounderRivalryStakesKind;
  boutNumber: 1 | 2 | 3;
  playerWins: number;
  founderWins: number;
  battleLabel: string;
  headline: string;
  detail: string;
  pageLabel: string;
  episodeTitle: string;
  episodeCue: string;
}>;

export type FounderRivalEpisodeReceiptPlan = Readonly<{
  founderId: `founding-${string}`;
  pageNumber: 1 | 2 | 3;
  headline: string;
  detail: string;
  resultLine: string;
  latestWinner: 'player' | 'founder';
  threadResolved: boolean;
}>;

const canonicalFounderIndexById: ReadonlyMap<string, number> = new Map(
  FOUNDING_SCRIBBIT_DEFINITIONS.map((founder, index) => [founder.id, index])
);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readArenaDay(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 1
    ? Number(value)
    : null;
}

function readSeriesScore(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : null;
}

function normalizeRivalry(value: unknown): NormalizedRivalry | null {
  if (!isObject(value)) return null;

  const founderId = value.founderId;
  const startedDay = readArenaDay(value.startedDay);
  const playerWins = readSeriesScore(value.playerWins);
  const founderWins = readSeriesScore(value.founderWins);
  if (
    typeof founderId !== 'string' ||
    !getFoundingScribbitDefinition(founderId) ||
    startedDay === null ||
    playerWins === null ||
    founderWins === null ||
    playerWins + founderWins < 1 ||
    playerWins >= 2 ||
    founderWins >= 2
  ) {
    return null;
  }

  return Object.freeze({
    founderId: founderId as `founding-${string}`,
    startedDay,
    playerWins,
    founderWins,
  });
}

function normalizeResolution(value: unknown): NormalizedResolution | null {
  if (!isObject(value)) return null;

  const founderId = value.founderId;
  const startedDay = readArenaDay(value.startedDay);
  const resolvedDay = readArenaDay(value.resolvedDay);
  const playerWins = readSeriesScore(value.playerWins);
  const founderWins = readSeriesScore(value.founderWins);
  const outcome = value.outcome;
  if (
    typeof founderId !== 'string' ||
    !getFoundingScribbitDefinition(founderId) ||
    startedDay === null ||
    resolvedDay === null ||
    resolvedDay < startedDay ||
    playerWins === null ||
    founderWins === null ||
    (outcome !== 'player_prevailed' && outcome !== 'founder_prevailed') ||
    (outcome === 'player_prevailed' &&
      (playerWins !== 2 || founderWins >= 2)) ||
    (outcome === 'founder_prevailed' && (founderWins !== 2 || playerWins >= 2))
  ) {
    return null;
  }

  return Object.freeze({
    founderId: founderId as `founding-${string}`,
    startedDay,
    resolvedDay,
    playerWins,
    founderWins,
    outcome,
  });
}

function normalizeChronicle(chronicle: FounderChronicle): NormalizedChronicle {
  const source: Record<string, unknown> = isObject(chronicle) ? chronicle : {};
  const rawResolutions = Array.isArray(source.resolvedRivalries)
    ? source.resolvedRivalries
    : [];
  const resolutionByFounderId = new Map<string, NormalizedResolution>();

  for (const rawResolution of rawResolutions) {
    const resolution = normalizeResolution(rawResolution);
    if (!resolution) continue;
    const existingResolution = resolutionByFounderId.get(resolution.founderId);
    if (
      !existingResolution ||
      resolution.resolvedDay > existingResolution.resolvedDay
    ) {
      resolutionByFounderId.set(resolution.founderId, resolution);
    }
  }

  const normalizedActiveRivalry = normalizeRivalry(source.activeRivalry);
  const activeRivalry =
    normalizedActiveRivalry &&
    !resolutionByFounderId.has(normalizedActiveRivalry.founderId)
      ? normalizedActiveRivalry
      : null;
  const rawLastAdvancedDay =
    source.lastAdvancedDay === null
      ? null
      : readArenaDay(source.lastAdvancedDay);
  const lastAdvancedDay = activeRivalry
    ? rawLastAdvancedDay !== null &&
      rawLastAdvancedDay >= activeRivalry.startedDay
      ? rawLastAdvancedDay
      : activeRivalry.startedDay
    : rawLastAdvancedDay;
  const legacyFounderIdSet = new Set(
    Array.isArray(source.legacyFounderIds)
      ? source.legacyFounderIds.filter(
          (founderId): founderId is `founding-${string}` =>
            typeof founderId === 'string' &&
            getFoundingScribbitDefinition(founderId) !== null
        )
      : []
  );
  const legacyFounderIds = FOUNDING_SCRIBBIT_DEFINITIONS.map(
    (founder) => founder.id
  ).filter((founderId) => legacyFounderIdSet.has(founderId));

  return {
    activeRivalry,
    resolvedRivalries: [...resolutionByFounderId.values()],
    resolutionByFounderId,
    lastAdvancedDay,
    legacyFounderIds,
  };
}

function formatScoreLine(
  founderName: string,
  playerWins: number,
  founderWins: number
): string {
  return `You ${playerWins}–${founderWins} ${founderName}`;
}

function nextArenaDay(day: number): number {
  return day < Number.MAX_SAFE_INTEGER ? day + 1 : day;
}

function getEpisodeCopy(
  founderId: `founding-${string}`,
  boutNumber: 1 | 2 | 3
): Readonly<{
  pageLabel: string;
  episodeTitle: string;
  episodeCue: string;
}> {
  const episode = getFounderRivalEpisodePage(founderId, boutNumber);
  return Object.freeze({
    pageLabel: `PAGE ${boutNumber}/3`,
    episodeTitle: episode?.title ?? `RIVAL PAGE ${boutNumber}`,
    episodeCue: episode?.cue ?? 'The next rivalry page is ready.',
  });
}

export function planFounderRivalryStakes(
  chronicle: FounderChronicle,
  currentDay: number,
  opponentFounderId: string
): FounderRivalryStakesPlan | null {
  const safeCurrentDay = readArenaDay(currentDay);
  const founder = getFoundingScribbitDefinition(opponentFounderId);
  if (!founder || safeCurrentDay === null) return null;

  const normalized = normalizeChronicle(chronicle);
  if (
    normalized.lastAdvancedDay === safeCurrentDay ||
    normalized.resolutionByFounderId.has(founder.id)
  ) {
    return null;
  }

  const activeRivalry = normalized.activeRivalry;
  if (!activeRivalry) {
    const episode = getEpisodeCopy(founder.id, 1);
    return Object.freeze({
      founderId: founder.id,
      founderName: founder.name,
      kind: 'opening',
      boutNumber: 1,
      playerWins: 0,
      founderWins: 0,
      battleLabel: 'RIVAL BOUT 1/3',
      headline: 'NEW RIVAL THREAD',
      detail: `YOU 0–0 ${founder.name.toUpperCase()} • FIRST TO 2`,
      ...episode,
    });
  }

  if (activeRivalry.founderId !== founder.id) return null;
  const nextEligibleDay = nextArenaDay(
    normalized.lastAdvancedDay ?? activeRivalry.startedDay
  );
  if (safeCurrentDay < nextEligibleDay) return null;

  const boutsPlayed = activeRivalry.playerWins + activeRivalry.founderWins;
  if (boutsPlayed === 2) {
    const episode = getEpisodeCopy(founder.id, 3);
    return Object.freeze({
      founderId: founder.id,
      founderName: founder.name,
      kind: 'decider',
      boutNumber: 3,
      playerWins: activeRivalry.playerWins,
      founderWins: activeRivalry.founderWins,
      battleLabel: 'RIVAL DECIDER',
      headline: 'DECIDING BOUT',
      detail: `YOU 1–1 ${founder.name.toUpperCase()} • WINNER SIGNS THE MARGIN`,
      ...episode,
    });
  }

  const playerHasMatchPoint = activeRivalry.playerWins > 0;
  const episode = getEpisodeCopy(founder.id, 2);
  return Object.freeze({
    founderId: founder.id,
    founderName: founder.name,
    kind: playerHasMatchPoint ? 'player_match_point' : 'founder_match_point',
    boutNumber: 2,
    playerWins: activeRivalry.playerWins,
    founderWins: activeRivalry.founderWins,
    battleLabel: 'RIVAL BOUT 2/3',
    headline: playerHasMatchPoint
      ? 'YOUR MATCH POINT'
      : `${founder.name.toUpperCase()} MATCH POINT`,
    detail: playerHasMatchPoint
      ? `YOU 1–0 ${founder.name.toUpperCase()} • WIN TO SIGN THE MARGIN`
      : `YOU 0–1 ${founder.name.toUpperCase()} • WIN TO FORCE A DECIDER`,
    ...episode,
  });
}

export function planFounderRivalEpisodeReceipt(
  stakes: FounderRivalryStakesPlan | null,
  beat: FounderChronicleBeat | null,
  report: Pick<BattleReport, 'a' | 'b'>,
  playerSlot: FighterSlot | null,
  winnerSlot: FighterSlot
): FounderRivalEpisodeReceiptPlan | null {
  if (!stakes || !beat || !playerSlot) return null;
  if (
    beat.founderId !== stakes.founderId ||
    beat.playerWins + beat.founderWins !== stakes.boutNumber
  ) {
    return null;
  }

  const founderSlot =
    report.a.id === stakes.founderId
      ? 'a'
      : report.b.id === stakes.founderId
        ? 'b'
        : null;
  if (
    founderSlot === null ||
    founderSlot === playerSlot ||
    (winnerSlot !== founderSlot && winnerSlot !== playerSlot)
  ) {
    return null;
  }

  const founder = getFoundingScribbitDefinition(stakes.founderId);
  const episode = getFounderRivalEpisodePage(
    stakes.founderId,
    stakes.boutNumber
  );
  const latestWinner = winnerSlot === playerSlot ? 'player' : 'founder';
  const resultLine = getFounderRivalEpisodeResultLine(
    stakes.founderId,
    stakes.boutNumber,
    latestWinner
  );
  if (!founder || !episode || !resultLine) return null;

  const threadResolved = beat.kind === 'rivalry_resolved';
  return Object.freeze({
    founderId: founder.id,
    pageNumber: stakes.boutNumber,
    headline: `PAGE ${stakes.boutNumber}/3 · ${episode.title}`,
    detail: `${threadResolved ? 'MARGIN SIGNED' : 'THREAD CONTINUES'} · YOU ${beat.playerWins}–${beat.founderWins} ${founder.name.toUpperCase()}`,
    resultLine,
    latestWinner,
    threadResolved,
  });
}

function getActiveRivalryQuote(
  founder: FoundingScribbitDefinition,
  rivalry: NormalizedRivalry,
  readyToday: boolean
): string {
  const boutsPlayed = rivalry.playerWins + rivalry.founderWins;
  if (readyToday) {
    return boutsPlayed === 0
      ? founder.personality.openingLines[0]
      : founder.personality.challengeLine;
  }
  if (rivalry.playerWins > rivalry.founderWins) {
    return founder.personality.defeatLine;
  }
  if (rivalry.founderWins > rivalry.playerWins) {
    return founder.personality.victoryLine;
  }
  return (
    founder.personality.openingLines[Math.min(boutsPlayed, 1)] ??
    founder.personality.openingLines[0]
  );
}

function planActiveRivalry(
  rivalry: NormalizedRivalry,
  lastAdvancedDay: number | null,
  currentDay: number
): FounderChronicleRivalPlan | null {
  const founder = getFoundingScribbitDefinition(rivalry.founderId);
  if (!founder) return null;

  const nextEligibleDay =
    lastAdvancedDay === null
      ? rivalry.startedDay
      : nextArenaDay(lastAdvancedDay);
  const safeCurrentDay = readArenaDay(currentDay);
  const readyToday =
    safeCurrentDay !== null && safeCurrentDay >= nextEligibleDay;
  const returnDay = readyToday ? null : nextEligibleDay;
  const boutsPlayed = rivalry.playerWins + rivalry.founderWins;
  const nextBoutNumber = Math.min(3, boutsPlayed + 1) as 2 | 3;
  const nextEpisode = getEpisodeCopy(founder.id, nextBoutNumber);

  return Object.freeze({
    founderId: founder.id,
    name: founder.name,
    artist: founder.artist,
    element: founder.element,
    level: founder.level,
    mood: founder.mood,
    imageUrl: founder.imageUrl,
    epithet: founder.personality.epithet,
    startedDay: rivalry.startedDay,
    playerWins: rivalry.playerWins,
    founderWins: rivalry.founderWins,
    scoreLine: formatScoreLine(
      founder.name,
      rivalry.playerWins,
      rivalry.founderWins
    ),
    formatLine: BEST_OF_THREE_LINE,
    readyToday,
    returnDay,
    availabilityLine: readyToday ? 'Ready today' : `Return Day ${returnDay}`,
    quote: getActiveRivalryQuote(founder, rivalry, readyToday),
    nextBoutNumber,
    nextEpisodeTitle: nextEpisode.episodeTitle,
  });
}

function resolvedRivalryDayLine(
  startedDay: number,
  resolvedDay: number
): string {
  return startedDay === resolvedDay
    ? `Day ${resolvedDay}`
    : `Days ${startedDay}–${resolvedDay}`;
}

function planResolvedNote(
  resolution: NormalizedResolution
): FounderChronicleResolvedNotePlan | null {
  const founder = getFoundingScribbitDefinition(resolution.founderId);
  if (!founder) return null;

  const playerPrevailed = resolution.outcome === 'player_prevailed';
  return Object.freeze({
    founderId: founder.id,
    name: founder.name,
    element: founder.element,
    imageUrl: founder.imageUrl,
    epithet: founder.personality.epithet,
    startedDay: resolution.startedDay,
    resolvedDay: resolution.resolvedDay,
    playerWins: resolution.playerWins,
    founderWins: resolution.founderWins,
    outcome: resolution.outcome,
    headline: playerPrevailed ? 'You prevailed' : `${founder.name} prevailed`,
    scoreLine: formatScoreLine(
      founder.name,
      resolution.playerWins,
      resolution.founderWins
    ),
    dayLine: resolvedRivalryDayLine(
      resolution.startedDay,
      resolution.resolvedDay
    ),
    quote: playerPrevailed
      ? founder.personality.defeatLine
      : founder.personality.victoryLine,
  });
}

export function planFounderChronicle(
  chronicle: FounderChronicle,
  currentDay: number
): FounderChroniclePlan {
  const normalized = normalizeChronicle(chronicle);
  const activeRivalry = normalized.activeRivalry
    ? planActiveRivalry(
        normalized.activeRivalry,
        normalized.lastAdvancedDay,
        currentDay
      )
    : null;
  const resolvedNotes = normalized.resolvedRivalries
    .slice()
    .sort((left, right) => {
      if (left.resolvedDay !== right.resolvedDay) {
        return right.resolvedDay - left.resolvedDay;
      }
      return (
        (canonicalFounderIndexById.get(left.founderId) ?? 0) -
        (canonicalFounderIndexById.get(right.founderId) ?? 0)
      );
    })
    .slice(0, MAXIMUM_RESOLVED_MARGIN_NOTES)
    .map(planResolvedNote)
    .filter((note): note is FounderChronicleResolvedNotePlan => note !== null);

  return Object.freeze({
    activeRivalry,
    resolvedNotes: Object.freeze(resolvedNotes),
    emptyLine: activeRivalry
      ? null
      : normalized.legacyFounderIds.length > 0
        ? `${NO_ACTIVE_RIVALRY_LINE} ${normalized.legacyFounderIds.length} earlier founder encounter${normalized.legacyFounderIds.length === 1 ? '' : 's'} archived.`
        : NO_ACTIVE_RIVALRY_LINE,
    legacyEncounterCount: normalized.legacyFounderIds.length,
  });
}

function hasScoreRegression(
  previous: NormalizedRivalry,
  next: NormalizedRivalry
): boolean {
  return (
    next.startedDay !== previous.startedDay ||
    next.playerWins < previous.playerWins ||
    next.founderWins < previous.founderWins
  );
}

function createBeat(
  founderId: `founding-${string}`,
  kind: FounderChronicleBeat['kind'],
  day: number,
  playerWins: number,
  founderWins: number,
  outcome: FounderRivalryOutcome | null
): FounderChronicleBeat {
  return Object.freeze({
    founderId,
    kind,
    day,
    playerWins,
    founderWins,
    outcome,
  });
}

function findNewResolutionBeats(
  previous: NormalizedChronicle,
  next: NormalizedChronicle
): FounderChronicleBeat[] {
  const beats: FounderChronicleBeat[] = [];
  for (const resolution of next.resolvedRivalries) {
    if (previous.resolutionByFounderId.has(resolution.founderId)) continue;

    const previousActive = previous.activeRivalry;
    if (
      previousActive?.founderId === resolution.founderId &&
      hasScoreRegression(previousActive, resolution)
    ) {
      continue;
    }
    beats.push(
      createBeat(
        resolution.founderId,
        'rivalry_resolved',
        resolution.resolvedDay,
        resolution.playerWins,
        resolution.founderWins,
        resolution.outcome
      )
    );
  }
  return beats;
}

function findActiveRivalryBeat(
  previous: NormalizedChronicle,
  next: NormalizedChronicle,
  resolvedFounderIds: ReadonlySet<string>
): FounderChronicleBeat | null {
  const nextActive = next.activeRivalry;
  if (!nextActive || resolvedFounderIds.has(nextActive.founderId)) return null;

  const previousActive = previous.activeRivalry;
  if (!previousActive) {
    return createBeat(
      nextActive.founderId,
      'rivalry_started',
      nextActive.startedDay,
      nextActive.playerWins,
      nextActive.founderWins,
      null
    );
  }

  if (previousActive.founderId !== nextActive.founderId) {
    if (!resolvedFounderIds.has(previousActive.founderId)) return null;
    const previousRivalryResolution = next.resolutionByFounderId.get(
      previousActive.founderId
    );
    if (
      previousRivalryResolution &&
      nextActive.startedDay <= previousRivalryResolution.resolvedDay
    ) {
      return null;
    }
    return createBeat(
      nextActive.founderId,
      'rivalry_started',
      nextActive.startedDay,
      nextActive.playerWins,
      nextActive.founderWins,
      null
    );
  }

  if (hasScoreRegression(previousActive, nextActive)) return null;
  const scoreIncrease =
    nextActive.playerWins +
    nextActive.founderWins -
    previousActive.playerWins -
    previousActive.founderWins;
  if (scoreIncrease !== 1 || next.lastAdvancedDay === null) return null;
  if (
    previous.lastAdvancedDay !== null &&
    next.lastAdvancedDay <= previous.lastAdvancedDay
  ) {
    return null;
  }

  return createBeat(
    nextActive.founderId,
    'rivalry_advanced',
    next.lastAdvancedDay,
    nextActive.playerWins,
    nextActive.founderWins,
    null
  );
}

const beatKindOrder: Readonly<Record<FounderChronicleBeat['kind'], number>> =
  Object.freeze({
    rivalry_started: 2,
    rivalry_advanced: 1,
    rivalry_resolved: 0,
  });

export function findFounderChronicleBeats(
  previous: FounderChronicle,
  next: FounderChronicle
): readonly FounderChronicleBeat[] {
  const normalizedPrevious = normalizeChronicle(previous);
  const normalizedNext = normalizeChronicle(next);
  const beats = findNewResolutionBeats(normalizedPrevious, normalizedNext);
  const resolvedFounderIds = new Set(beats.map((beat) => beat.founderId));
  const activeBeat = findActiveRivalryBeat(
    normalizedPrevious,
    normalizedNext,
    resolvedFounderIds
  );
  if (activeBeat) beats.push(activeBeat);

  beats.sort((left, right) => {
    if (left.day !== right.day) return left.day - right.day;
    const kindOrder = beatKindOrder[left.kind] - beatKindOrder[right.kind];
    if (kindOrder !== 0) return kindOrder;
    const founderOrder =
      (canonicalFounderIndexById.get(left.founderId) ?? 0) -
      (canonicalFounderIndexById.get(right.founderId) ?? 0);
    return founderOrder;
  });
  const oneBeatPerDay = beats.filter(
    (beat, index) => index === 0 || beat.day !== beats[index - 1]?.day
  );
  return Object.freeze(oneBeatPerDay);
}

function getBeatQuote(
  founder: FoundingScribbitDefinition,
  beat: FounderChronicleBeat
): string {
  if (beat.kind === 'rivalry_started') {
    return founder.personality.openingLines[0];
  }
  if (beat.kind === 'rivalry_resolved') {
    return beat.outcome === 'player_prevailed'
      ? founder.personality.defeatLine
      : founder.personality.victoryLine;
  }
  if (beat.playerWins > beat.founderWins) {
    return founder.personality.defeatLine;
  }
  if (beat.founderWins > beat.playerWins) {
    return founder.personality.victoryLine;
  }
  return founder.personality.challengeLine;
}

export function getFounderChronicleBeatCopy(
  beat: FounderChronicleBeat
): FounderChronicleBeatCopy {
  const founder = getFoundingScribbitDefinition(beat.founderId);
  if (!founder) {
    return Object.freeze({
      headline: 'Rivalry updated',
      detail: 'A Founder Rival Thread changed.',
      quote: 'The next page waits in the Arena.',
    });
  }

  const scoreLine = formatScoreLine(
    founder.name,
    beat.playerWins,
    beat.founderWins
  );
  const pageNumber = beat.playerWins + beat.founderWins;
  const episode = getFounderRivalEpisodePage(founder.id, pageNumber);
  const pageHeadline = episode
    ? `Page ${pageNumber} · ${episode.title}`
    : 'Rivalry updated';
  if (beat.kind === 'rivalry_started') {
    return Object.freeze({
      headline: pageHeadline,
      detail: scoreLine,
      quote: getBeatQuote(founder, beat),
    });
  }
  if (beat.kind === 'rivalry_advanced') {
    return Object.freeze({
      headline: pageHeadline,
      detail: scoreLine,
      quote: getBeatQuote(founder, beat),
    });
  }

  return Object.freeze({
    headline: episode
      ? `Margin signed · ${episode.title}`
      : beat.outcome === 'player_prevailed'
        ? 'You prevailed'
        : `${founder.name} prevailed`,
    detail: `Final • ${scoreLine}`,
    quote: getBeatQuote(founder, beat),
  });
}
