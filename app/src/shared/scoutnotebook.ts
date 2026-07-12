import type {
  Element,
  Forecast,
  ScoutNotebookEntry,
  ScoutNotebookPick,
  ScoutNotebookState,
  ScoutNotebookStatus,
  ScribbitStats,
} from './arena';
import {
  INK_REWARDS,
  SCRIBBIT_STAT_KEYS,
  STAT_BUDGET,
  STAT_MAX,
  STAT_MIN,
} from './arena';
import { isElement } from './elements';

export const SCOUT_NOTEBOOK_MAXIMUM_ENTRIES = 7;

export const isScoutNotebookReplayDay = (
  currentDay: number,
  requestedDay: number
): boolean => {
  if (
    !Number.isSafeInteger(currentDay) ||
    currentDay < 1 ||
    !Number.isSafeInteger(requestedDay) ||
    requestedDay < 1
  ) {
    return false;
  }
  const oldestNotebookDay = Math.max(
    1,
    currentDay - (SCOUT_NOTEBOOK_MAXIMUM_ENTRIES - 1)
  );
  return requestedDay >= oldestNotebookDay && requestedDay < currentDay;
};

type ScoutNotebookPickSource = Readonly<{
  id: string;
  name: string;
  artist: string;
  element: Element;
  imageUrl: string;
  isFounding: boolean;
  stats: Readonly<ScribbitStats>;
}>;

type ScoutNotebookEntrySource = Readonly<{
  day: number;
  forecast: Readonly<Forecast>;
  picked: boolean;
  pick: ScoutNotebookPickSource | null;
  status: ScoutNotebookStatus;
  cloutEarned: number;
  inkAwarded: number;
  replayAvailable: boolean;
}>;

type ScoutNotebookStateSource = Readonly<{
  currentDay: number;
  lifetimeClout: number;
  entries: readonly ScoutNotebookEntrySource[];
}>;

const isScoutNotebookStatus = (
  value: unknown
): value is ScoutNotebookStatus => {
  return (
    value === 'open' ||
    value === 'pending' ||
    value === 'champion' ||
    value === 'finalist' ||
    value === 'no_clout' ||
    value === 'missed'
  );
};

const requireNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Scout Notebook ${field} must be a non-empty string.`);
  }
  return value;
};

const requireNonNegativeInteger = (value: unknown, field: string): number => {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`Scout Notebook ${field} must be a non-negative integer.`);
  }
  return Number(value);
};

const requirePositiveDay = (value: unknown, field: string): number => {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`Scout Notebook ${field} must be a positive integer.`);
  }
  return Number(value);
};

const projectStats = (
  stats: Readonly<ScribbitStats>
): Readonly<ScribbitStats> => {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
    throw new Error('Scout Notebook pick stats must be an object.');
  }

  const projectedStats = {} as ScribbitStats;
  let total = 0;
  for (const statName of SCRIBBIT_STAT_KEYS) {
    const value: unknown = stats[statName];
    if (
      !Number.isSafeInteger(value) ||
      Number(value) < STAT_MIN ||
      Number(value) > STAT_MAX
    ) {
      throw new Error(
        `Scout Notebook pick stat ${statName} must be an integer from ${STAT_MIN} to ${STAT_MAX}.`
      );
    }
    projectedStats[statName] = Number(value);
    total += Number(value);
  }

  if (total !== STAT_BUDGET) {
    throw new Error(
      `Scout Notebook pick stats must total exactly ${STAT_BUDGET}.`
    );
  }
  return Object.freeze(projectedStats);
};

export const projectScoutNotebookPick = (
  pick: ScoutNotebookPickSource
): ScoutNotebookPick => {
  if (!pick || typeof pick !== 'object' || Array.isArray(pick)) {
    throw new Error('Scout Notebook pick must be an object.');
  }
  if (!isElement(pick.element)) {
    throw new Error('Scout Notebook pick element is invalid.');
  }
  if (typeof pick.isFounding !== 'boolean') {
    throw new Error('Scout Notebook pick isFounding must be a boolean.');
  }

  return Object.freeze({
    id: requireNonEmptyString(pick.id, 'pick id'),
    name: requireNonEmptyString(pick.name, 'pick name'),
    artist: requireNonEmptyString(pick.artist, 'pick artist'),
    element: pick.element,
    imageUrl: requireNonEmptyString(pick.imageUrl, 'pick imageUrl'),
    isFounding: pick.isFounding,
    stats: projectStats(pick.stats),
  });
};

const projectForecast = (
  forecast: Readonly<Forecast>,
  day: number
): Forecast => {
  if (!forecast || typeof forecast !== 'object' || Array.isArray(forecast)) {
    throw new Error(
      `Scout Notebook forecast for Day ${day} must be an object.`
    );
  }
  if (forecast.day !== day) {
    throw new Error(`Scout Notebook forecast must match entry Day ${day}.`);
  }
  if (
    !isElement(forecast.boostedElement) ||
    !isElement(forecast.nerfedElement) ||
    forecast.boostedElement === forecast.nerfedElement
  ) {
    throw new Error(`Scout Notebook forecast for Day ${day} is invalid.`);
  }

  return Object.freeze({
    day,
    boostedElement: forecast.boostedElement,
    nerfedElement: forecast.nerfedElement,
    blurb: requireNonEmptyString(forecast.blurb, `Day ${day} forecast blurb`),
  });
};

const assertCurrentEntry = (entry: ScoutNotebookEntrySource): void => {
  if (entry.status !== 'open' && entry.status !== 'pending') {
    throw new Error(
      'The current Scout Notebook entry must be open or pending.'
    );
  }
  if (entry.status === 'open' && entry.picked) {
    throw new Error('An open Scout Notebook entry cannot have a pick.');
  }
  if (entry.status === 'pending' && !entry.picked) {
    throw new Error('A pending Scout Notebook entry must have a pick.');
  }
  if (entry.cloutEarned !== 0 || entry.inkAwarded !== 0) {
    throw new Error('The current Scout Notebook entry cannot have a payout.');
  }
  if (entry.replayAvailable) {
    throw new Error('The current Scout Notebook entry cannot have a replay.');
  }
};

const historicalPayouts: Record<
  Exclude<ScoutNotebookStatus, 'open' | 'pending' | 'missed'>,
  Readonly<{ clout: number; ink: number }>
> = {
  champion: { clout: 3, ink: INK_REWARDS.backedChampion },
  finalist: { clout: 1, ink: 0 },
  no_clout: { clout: 0, ink: 0 },
};

const assertHistoricalEntry = (entry: ScoutNotebookEntrySource): void => {
  if (entry.status === 'open' || entry.status === 'pending') {
    throw new Error(
      'Historical Scout Notebook entries must be missed or resolved.'
    );
  }

  if (entry.status === 'missed') {
    if (entry.picked || entry.pick !== null) {
      throw new Error('A missed Scout Notebook entry cannot have a pick.');
    }
    if (entry.cloutEarned !== 0 || entry.inkAwarded !== 0) {
      throw new Error('A missed Scout Notebook entry cannot have a payout.');
    }
    if (entry.replayAvailable) {
      throw new Error('A missed Scout Notebook entry cannot have a replay.');
    }
    return;
  }

  if (!entry.picked) {
    throw new Error(
      'A resolved Scout Notebook entry must record that a pick was made.'
    );
  }
  const expectedPayout = historicalPayouts[entry.status];
  if (
    entry.cloutEarned !== expectedPayout.clout ||
    entry.inkAwarded !== expectedPayout.ink
  ) {
    throw new Error(
      `Scout Notebook ${entry.status} payout must be ${expectedPayout.clout} Clout and ${expectedPayout.ink} Ink.`
    );
  }
};

const projectEntry = (
  entry: ScoutNotebookEntrySource,
  currentDay: number
): ScoutNotebookEntry => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Each Scout Notebook entry must be an object.');
  }
  const day = requirePositiveDay(entry.day, 'entry day');
  if (!isScoutNotebookStatus(entry.status)) {
    throw new Error(`Scout Notebook status for Day ${day} is invalid.`);
  }
  if (typeof entry.picked !== 'boolean') {
    throw new Error(`Scout Notebook picked for Day ${day} must be a boolean.`);
  }
  if (typeof entry.replayAvailable !== 'boolean') {
    throw new Error(
      `Scout Notebook replayAvailable for Day ${day} must be a boolean.`
    );
  }
  if (
    entry.pick !== null &&
    (!entry.pick || typeof entry.pick !== 'object' || Array.isArray(entry.pick))
  ) {
    throw new Error(
      `Scout Notebook pick for Day ${day} must be an object or null.`
    );
  }
  const cloutEarned = requireNonNegativeInteger(
    entry.cloutEarned,
    `Day ${day} cloutEarned`
  );
  const inkAwarded = requireNonNegativeInteger(
    entry.inkAwarded,
    `Day ${day} inkAwarded`
  );
  const projectedEntry: ScoutNotebookEntrySource = {
    ...entry,
    day,
    cloutEarned,
    inkAwarded,
  };

  if (day === currentDay) {
    assertCurrentEntry(projectedEntry);
  } else {
    assertHistoricalEntry(projectedEntry);
  }

  if (!entry.picked && entry.pick !== null) {
    throw new Error(
      `Scout Notebook Day ${day} cannot expose an unpicked Scribbit.`
    );
  }
  if (entry.replayAvailable && entry.pick === null) {
    throw new Error(
      `Scout Notebook Day ${day} replay requires a visible pick.`
    );
  }

  return Object.freeze({
    day,
    forecast: projectForecast(entry.forecast, day),
    picked: entry.picked,
    pick: entry.pick ? projectScoutNotebookPick(entry.pick) : null,
    status: entry.status,
    cloutEarned,
    inkAwarded,
    replayAvailable: entry.replayAvailable,
  });
};

export const createScoutNotebookState = (
  source: ScoutNotebookStateSource
): ScoutNotebookState => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Scout Notebook state must be an object.');
  }

  const currentDay = requirePositiveDay(source.currentDay, 'currentDay');
  const lifetimeClout = requireNonNegativeInteger(
    source.lifetimeClout,
    'lifetimeClout'
  );
  if (!Array.isArray(source.entries)) {
    throw new Error('Scout Notebook entries must be an array.');
  }

  const expectedEntryCount = Math.min(
    SCOUT_NOTEBOOK_MAXIMUM_ENTRIES,
    currentDay
  );
  if (source.entries.length !== expectedEntryCount) {
    throw new Error(
      `Scout Notebook must contain ${expectedEntryCount} contiguous entries for Day ${currentDay}.`
    );
  }

  const entries = Object.freeze(
    source.entries.map((entry, index) => {
      const expectedDay = currentDay - index;
      if (!entry || typeof entry !== 'object' || entry.day !== expectedDay) {
        throw new Error(
          `Scout Notebook entries must descend contiguously; expected Day ${expectedDay} at index ${index}.`
        );
      }
      return projectEntry(entry, currentDay);
    })
  );

  return Object.freeze({
    currentDay,
    lifetimeClout,
    entries,
  });
};
