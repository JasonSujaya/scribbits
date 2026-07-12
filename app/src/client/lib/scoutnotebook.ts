// Pure Scout Notebook presentation planning. The server owns every status,
// payout, forecast, pick snapshot, and replay flag; this module only renders it.

import type {
  ScoutNotebookEntry,
  ScoutNotebookState,
  ScoutNotebookStatus,
} from '../../shared/arena';
import { selectScoutNoteLine } from '../../shared/content/scoutnotes';

export type ScoutNotebookActionKind = 'pick' | 'replay' | 'none';

export type ScoutNotebookPagePlan = Readonly<{
  day: number;
  isTonight: boolean;
  dayLabel: string;
  status: ScoutNotebookStatus;
  stamp: string;
  pickAvailable: boolean;
  pickLine: string;
  artistLine: string;
  payoutLine: string;
  cloutEarned: number;
  inkAwarded: number;
  authoredNote: string;
  actionKind: ScoutNotebookActionKind;
  actionLabel: string;
  actionAccessibleLabel: string;
  tabLabel: string;
  tabStatusLabel: string;
  tabAccessibleLabel: string;
  pageAccessibleLabel: string;
}>;

export type ScoutNotebookSummaryPlan = Readonly<{
  lifetimeClout: number;
  pageCount: number;
  pickedCount: number;
  resolvedPickCount: number;
  championPickCount: number;
  finalistPickCount: number;
  missedDayCount: number;
  pages: readonly ScoutNotebookPagePlan[];
  formLine: string;
  lifetimeLine: string;
}>;

export const SCOUT_NOTEBOOK_MAXIMUM_RENDERED_LINE_LENGTH = 82;

const STATUS_STAMP: Readonly<Record<ScoutNotebookStatus, string>> =
  Object.freeze({
    open: 'PICK OPEN',
    pending: 'LOCKED IN',
    champion: 'CHAMPION',
    finalist: 'FINALIST',
    no_clout: 'NO CLOUT',
    missed: 'MISSED',
  });

const TAB_STATUS: Readonly<Record<ScoutNotebookStatus, string>> = Object.freeze({
  open: 'OPEN',
  pending: 'LOCKED',
  champion: 'WIN',
  finalist: 'FINAL',
  no_clout: '0 PT',
  missed: 'MISSED',
});

function boundedRenderedLine(value: string): string {
  const normalizedValue = value.trim().replace(/\s+/g, ' ');
  if (normalizedValue.length <= SCOUT_NOTEBOOK_MAXIMUM_RENDERED_LINE_LENGTH) {
    return normalizedValue;
  }
  return `${normalizedValue
    .slice(0, SCOUT_NOTEBOOK_MAXIMUM_RENDERED_LINE_LENGTH - 1)
    .trimEnd()}…`;
}

function boundedIdentity(value: string, fallback: string): string {
  const normalizedValue = value.trim().replace(/\s+/g, ' ');
  return boundedRenderedLine(normalizedValue || fallback);
}

function boundedAccessibleSummary(value: string): string {
  const normalizedValue = value.trim().replace(/\s+/g, ' ');
  return normalizedValue.length <= 240
    ? normalizedValue
    : `${normalizedValue.slice(0, 239).trimEnd()}…`;
}

function elementName(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function pickCopy(entry: ScoutNotebookEntry): Readonly<{
  pickAvailable: boolean;
  pickLine: string;
  artistLine: string;
}> {
  if (!entry.picked) {
    return Object.freeze({
      pickAvailable: false,
      pickLine: boundedRenderedLine(
        entry.status === 'open' ? 'PICK OPEN' : 'NO PICK'
      ),
      artistLine: '',
    });
  }

  if (!entry.pick) {
    return Object.freeze({
      pickAvailable: false,
      pickLine: boundedRenderedLine('PICK HIDDEN'),
      artistLine: '',
    });
  }

  const pickName = boundedIdentity(entry.pick.name, 'UNNAMED SCRIBBIT');
  const artist = boundedIdentity(
    entry.pick.artist.replace(/^u\//i, ''),
    'UNAVAILABLE'
  );
  return Object.freeze({
    pickAvailable: true,
    pickLine: pickName,
    artistLine: boundedRenderedLine(`u/${artist}`),
  });
}

function payoutLine(entry: ScoutNotebookEntry): string {
  if (entry.status === 'open' || entry.status === 'pending') {
    return 'PAYOUT PENDING';
  }
  if (entry.status === 'missed') return 'NO PAYOUT';
  // Values come straight from the DTO. Status never substitutes fixed amounts.
  return boundedRenderedLine(
    `+${entry.cloutEarned} CLOUT · +${entry.inkAwarded} INK`
  );
}

function actionForEntry(entry: ScoutNotebookEntry): Readonly<{
  actionKind: ScoutNotebookActionKind;
  actionLabel: string;
}> {
  if (entry.status === 'open') {
    return Object.freeze({
      actionKind: 'pick',
      actionLabel: 'PICK A CONTENDER',
    });
  }
  if (entry.replayAvailable) {
    return Object.freeze({
      actionKind: 'replay',
      actionLabel: 'WATCH REPLAY',
    });
  }
  if (entry.status === 'pending') {
    return Object.freeze({
      actionKind: 'none',
      actionLabel: 'RESULT PENDING',
    });
  }
  if (entry.status === 'missed') {
    return Object.freeze({
      actionKind: 'none',
      actionLabel: 'NO REPLAY',
    });
  }
  return Object.freeze({
    actionKind: 'none',
    actionLabel: 'NO REPLAY',
  });
}

/** Plans one page without deriving a result from payout, pick, or replay data. */
export function planScoutNotebookPage(
  entry: ScoutNotebookEntry,
  currentDay: number
): ScoutNotebookPagePlan {
  const isTonight = entry.day === currentDay;
  const statusStamp = STATUS_STAMP[entry.status];
  const displayedPick = pickCopy(entry);
  const action = actionForEntry(entry);
  const plannedPayoutLine = payoutLine(entry);
  const authoredNote = boundedRenderedLine(
    selectScoutNoteLine(entry.status, entry.day)
  );
  const spokenNote = authoredNote.replace(/[.!?]+$/, '');
  const dayName = isTonight ? `Tonight, day ${entry.day}` : `Day ${entry.day}`;
  const actionAccessibleLabel =
    action.actionKind === 'pick'
      ? 'Pick a contender for tonight'
      : action.actionKind === 'replay'
        ? `Watch Day ${entry.day} replay`
        : action.actionLabel;
  const artistDetail = displayedPick.artistLine
    ? ` by ${displayedPick.artistLine}`
    : '';
  const pageAccessibleLabel = boundedAccessibleSummary(
    `${dayName}. ${statusStamp}. ${displayedPick.pickLine}${artistDetail}. Forecast: ${elementName(entry.forecast.boostedElement)} up 15 percent; ${elementName(entry.forecast.nerfedElement)} down 10 percent. ${plannedPayoutLine}. ${spokenNote}. ${actionAccessibleLabel}.`
  );

  return Object.freeze({
    day: entry.day,
    isTonight,
    dayLabel: boundedRenderedLine(
      isTonight ? `TONIGHT · D${entry.day}` : `DAY ${entry.day}`
    ),
    status: entry.status,
    stamp: boundedRenderedLine(statusStamp),
    pickAvailable: displayedPick.pickAvailable,
    pickLine: displayedPick.pickLine,
    artistLine: displayedPick.artistLine,
    payoutLine: plannedPayoutLine,
    cloutEarned: entry.cloutEarned,
    inkAwarded: entry.inkAwarded,
    authoredNote,
    actionKind: action.actionKind,
    actionLabel: boundedRenderedLine(action.actionLabel),
    actionAccessibleLabel: boundedRenderedLine(actionAccessibleLabel),
    tabLabel: `D${entry.day}`,
    tabStatusLabel: TAB_STATUS[entry.status],
    tabAccessibleLabel: boundedRenderedLine(`${dayName}. ${statusStamp}.`),
    pageAccessibleLabel,
  });
}

/** Plans the bounded seven-page view from server-authored notebook facts. */
export function planScoutNotebookSummary(
  state: ScoutNotebookState
): ScoutNotebookSummaryPlan {
  const pages = Object.freeze(
    state.entries.map((entry) => planScoutNotebookPage(entry, state.currentDay))
  );
  const pickedCount = state.entries.filter((entry) => entry.picked).length;
  // These counts use explicit server statuses; payout values never infer them.
  const championPickCount = state.entries.filter(
    (entry) => entry.status === 'champion'
  ).length;
  const finalistPickCount = state.entries.filter(
    (entry) => entry.status === 'finalist'
  ).length;
  const noCloutPickCount = state.entries.filter(
    (entry) => entry.status === 'no_clout'
  ).length;
  const missedDayCount = state.entries.filter(
    (entry) => entry.status === 'missed'
  ).length;
  const resolvedPickCount =
    championPickCount + finalistPickCount + noCloutPickCount;
  return Object.freeze({
    lifetimeClout: state.lifetimeClout,
    pageCount: pages.length,
    pickedCount,
    resolvedPickCount,
    championPickCount,
    finalistPickCount,
    missedDayCount,
    pages,
    formLine: boundedRenderedLine(
      `7 DAYS • ${championPickCount} WIN${championPickCount === 1 ? '' : 'S'} • ${finalistPickCount} FINAL${finalistPickCount === 1 ? '' : 'S'}`
    ),
    lifetimeLine: `${state.lifetimeClout} TOTAL CLOUT`,
  });
}
