// Pure Scout Notebook presentation planning. The server owns every status,
// payout, forecast, pick snapshot, and replay flag; this module only renders it.

import type {
  Element,
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
  statusLabel: string;
  stamp: string;
  title: string;
  pickAvailable: boolean;
  pickLine: string;
  artistLine: string;
  forecastLine: string;
  payoutLine: string;
  cloutEarned: number;
  inkAwarded: number;
  authoredNote: string;
  actionKind: ScoutNotebookActionKind;
  actionLabel: string;
}>;

export type ScoutNotebookSummaryPlan = Readonly<{
  title: string;
  rangeLabel: string;
  overviewLine: string;
  lifetimeLine: string;
  recentFormLabel: string;
  recentFormDisclaimer: string;
  pageCount: number;
  pickedCount: number;
  resolvedPickCount: number;
  championPickCount: number;
  finalistPickCount: number;
  missedDayCount: number;
  pages: readonly ScoutNotebookPagePlan[];
}>;

type StatusPresentation = Readonly<{
  statusLabel: string;
  stamp: string;
  title: string;
}>;

export const SCOUT_NOTEBOOK_MAXIMUM_RENDERED_LINE_LENGTH = 82;

const STATUS_PRESENTATION: Readonly<
  Record<ScoutNotebookStatus, StatusPresentation>
> = Object.freeze({
  open: Object.freeze({
    statusLabel: 'OPEN',
    stamp: 'PICK OPEN',
    title: 'CHOOSE ONE CONTENDER',
  }),
  pending: Object.freeze({
    statusLabel: 'PENDING',
    stamp: 'PICK PINNED',
    title: "TONIGHT'S PICK IS FILED",
  }),
  champion: Object.freeze({
    statusLabel: 'CHAMPION',
    stamp: 'CHAMPION PICK',
    title: 'CHAMPION STATUS RECORDED',
  }),
  finalist: Object.freeze({
    statusLabel: 'FINALIST',
    stamp: 'FINALIST PICK',
    title: 'FINALIST STATUS RECORDED',
  }),
  no_clout: Object.freeze({
    statusLabel: 'NO CLOUT',
    stamp: 'RESULT FILED',
    title: 'NO CLOUT STATUS RECORDED',
  }),
  missed: Object.freeze({
    statusLabel: 'MISSED DAY',
    stamp: 'NO PICK',
    title: 'NO SCOUTING PICK RECORDED',
  }),
});

const ELEMENT_LABEL: Readonly<Record<Element, string>> = Object.freeze({
  ember: 'EMBER',
  tide: 'TIDE',
  moss: 'MOSS',
  storm: 'STORM',
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

function pickCopy(entry: ScoutNotebookEntry): Readonly<{
  pickAvailable: boolean;
  pickLine: string;
  artistLine: string;
}> {
  if (!entry.picked) {
    return Object.freeze({
      pickAvailable: false,
      pickLine: boundedRenderedLine(
        entry.status === 'open' ? 'PICK • NOT FILED YET' : 'PICK • NOT FILED'
      ),
      artistLine: boundedRenderedLine('ARTIST • NOT FILED'),
    });
  }

  if (!entry.pick) {
    return Object.freeze({
      pickAvailable: false,
      pickLine: boundedRenderedLine('PICK • UNAVAILABLE'),
      artistLine: boundedRenderedLine('ARTIST • UNAVAILABLE'),
    });
  }

  const pickName = boundedIdentity(entry.pick.name, 'UNNAMED SCRIBBIT');
  const artist = boundedIdentity(
    entry.pick.artist.replace(/^u\//i, ''),
    'UNAVAILABLE'
  );
  return Object.freeze({
    pickAvailable: true,
    pickLine: boundedRenderedLine(`PICK • ${pickName}`),
    artistLine: boundedRenderedLine(`ARTIST • u/${artist}`),
  });
}

function payoutLine(entry: ScoutNotebookEntry): string {
  const payoutState =
    entry.status === 'open' || entry.status === 'pending'
      ? 'PAYOUT NOT FILED'
      : entry.status === 'champion' || entry.status === 'finalist'
        ? 'PAYOUT FILED'
        : entry.status === 'no_clout'
          ? 'RESULT FILED'
          : 'NO PAYOUT';
  // Values come straight from the DTO. Status never substitutes fixed amounts.
  return boundedRenderedLine(
    `${payoutState} • +${entry.cloutEarned} CLOUT • +${entry.inkAwarded} INK`
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
      actionLabel: 'WATCH SAVED REPLAY',
    });
  }
  if (entry.status === 'pending') {
    return Object.freeze({
      actionKind: 'none',
      actionLabel: 'RESULT NOT FILED',
    });
  }
  if (entry.status === 'missed') {
    return Object.freeze({
      actionKind: 'none',
      actionLabel: 'NO PICK TO REPLAY',
    });
  }
  return Object.freeze({
    actionKind: 'none',
    actionLabel: 'REPLAY UNAVAILABLE',
  });
}

/** Plans one page without deriving a result from payout, pick, or replay data. */
export function planScoutNotebookPage(
  entry: ScoutNotebookEntry,
  currentDay: number
): ScoutNotebookPagePlan {
  const isTonight = entry.day === currentDay;
  const presentation = STATUS_PRESENTATION[entry.status];
  const displayedPick = pickCopy(entry);
  const action = actionForEntry(entry);

  return Object.freeze({
    day: entry.day,
    isTonight,
    dayLabel: boundedRenderedLine(
      isTonight ? `TONIGHT • DAY ${entry.day}` : `DAY ${entry.day}`
    ),
    status: entry.status,
    statusLabel: boundedRenderedLine(presentation.statusLabel),
    stamp: boundedRenderedLine(presentation.stamp),
    title: boundedRenderedLine(presentation.title),
    pickAvailable: displayedPick.pickAvailable,
    pickLine: displayedPick.pickLine,
    artistLine: displayedPick.artistLine,
    forecastLine: boundedRenderedLine(
      `FORECAST • BOOST ${ELEMENT_LABEL[entry.forecast.boostedElement]} • NERF ${ELEMENT_LABEL[entry.forecast.nerfedElement]}`
    ),
    payoutLine: payoutLine(entry),
    cloutEarned: entry.cloutEarned,
    inkAwarded: entry.inkAwarded,
    authoredNote: boundedRenderedLine(
      selectScoutNoteLine(entry.status, entry.day)
    ),
    actionKind: action.actionKind,
    actionLabel: boundedRenderedLine(action.actionLabel),
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
  const oldestDay = state.entries.at(-1)?.day ?? state.currentDay;
  const newestDay = state.entries[0]?.day ?? state.currentDay;

  return Object.freeze({
    title: boundedRenderedLine('SCOUT NOTEBOOK'),
    rangeLabel: boundedRenderedLine(
      oldestDay === newestDay
        ? `TONIGHT • DAY ${newestDay}`
        : `DAY ${oldestDay}–DAY ${newestDay} • ${pages.length} PAGES`
    ),
    overviewLine: boundedRenderedLine(
      `${pickedCount} PICKS • ${resolvedPickCount} RESOLVED • ${missedDayCount} MISSED`
    ),
    lifetimeLine: boundedRenderedLine(
      `LIFETIME SCOUT RECORD • ${state.lifetimeClout} CLOUT`
    ),
    recentFormLabel: boundedRenderedLine(
      `RECENT FORM • ${championPickCount} CHAMPION • ${finalistPickCount} FINALIST • ${resolvedPickCount} RESOLVED`
    ),
    recentFormDisclaimer: boundedRenderedLine(
      'DESCRIPTIVE ONLY • NOT A STORED REWARD OR TITLE'
    ),
    pageCount: pages.length,
    pickedCount,
    resolvedPickCount,
    championPickCount,
    finalistPickCount,
    missedDayCount,
    pages,
  });
}
