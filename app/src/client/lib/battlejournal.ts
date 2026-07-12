// Pure Battle Scrapbook planning. BattleReport owns the saved result, while a
// usable authoritative transcript owns replay motion and finish details.

import type { BattleKind, BattleReport, Scribbit } from '../../shared/arena';
import type { FighterSlot } from '../../shared/combat';
import { planBattleRecap, type BattleRecapPlan } from './battlerecap';
import { getUsableBattleTranscript } from './continuousreplay';

export type BattleJournalPerspective = 'win' | 'loss' | 'watch';

export type BattleJournalFinishKind =
  | 'knockout'
  | 'double-knockout'
  | 'decision'
  | 'archived';

export type BattleJournalEntryPlan = Readonly<{
  reportId: string;
  matchup: string;
  kindDayLabel: string;
  perspective: BattleJournalPerspective;
  finishKind: BattleJournalFinishKind;
  finishLabel: string;
  metadataLine: string;
  highlightLine: string | null;
  replayMotionAvailable: boolean;
  rowStatusLabel: string;
  actionLabel: 'REPLAY' | 'VIEW RESULT';
  accessibleLabel: string;
}>;

export type BattleJournalSummaryPlan = Readonly<{
  savedCount: number;
  ownedWins: number;
  ownedLosses: number;
  knockoutCount: number;
  decisionCount: number;
  archivedCount: number;
  savedLine: string;
  recordLine: string;
  finishLine: string;
}>;

function assertUnreachable(value: never): never {
  throw new Error(`Unhandled Battle Scrapbook value: ${String(value)}`);
}

function battleKindLabel(kind: BattleKind): string {
  switch (kind) {
    case 'rumble':
      return 'DAILY RUMBLE';
    case 'boss':
      return 'CHAMPION CHALLENGE';
    case 'exhibition':
      return 'EXHIBITION SPAR';
    case 'practice':
      return 'POWER PRACTICE';
    default:
      return assertUnreachable(kind);
  }
}

function battleKindPriority(kind: BattleKind): number {
  switch (kind) {
    case 'rumble':
      return 0;
    case 'boss':
      return 1;
    case 'exhibition':
      return 2;
    case 'practice':
      return 3;
    default:
      return assertUnreachable(kind);
  }
}

/** Clones and orders the archive without changing reports or their input list. */
export function orderBattleJournalReports(
  reports: readonly BattleReport[]
): readonly BattleReport[] {
  const indexedReports = reports.map((report, originalIndex) => ({
    report,
    originalIndex,
  }));

  indexedReports.sort((left, right) => {
    const dayDifference = right.report.day - left.report.day;
    if (dayDifference !== 0) return dayDifference;

    const kindDifference =
      battleKindPriority(left.report.kind) -
      battleKindPriority(right.report.kind);
    if (kindDifference !== 0) return kindDifference;

    return left.originalIndex - right.originalIndex;
  });

  return Object.freeze(indexedReports.map(({ report }) => report));
}

function boundedDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 24) || 'UNNAMED SCRIBBIT';
}

function dayLabel(day: number): string {
  return Number.isSafeInteger(day) && day >= 1 ? String(day) : '?';
}

function perspectiveLabel(perspective: BattleJournalPerspective): string {
  switch (perspective) {
    case 'win':
      return 'MY WIN';
    case 'loss':
      return 'MY LOSS';
    case 'watch':
      return 'WATCH';
    default:
      return assertUnreachable(perspective);
  }
}

function planRowAction(input: {
  matchup: string;
  perspective: BattleJournalPerspective;
  finishLabel: string;
  replayMotionAvailable: boolean;
  day: number;
}): Pick<
  BattleJournalEntryPlan,
  'rowStatusLabel' | 'actionLabel' | 'accessibleLabel'
> {
  const perspective = perspectiveLabel(input.perspective);
  const rowStatusLabel = `${perspective} • ${input.finishLabel} • D${dayLabel(input.day)}`;
  const actionLabel = input.replayMotionAvailable ? 'REPLAY' : 'VIEW RESULT';
  const accessibleLabel = input.replayMotionAvailable
    ? `Replay ${input.matchup}. ${perspective}, ${input.finishLabel}, D${dayLabel(input.day)}.`
    : `View ${input.matchup}. ${perspective}, archived, D${dayLabel(input.day)}. No motion.`;
  return Object.freeze({
    rowStatusLabel,
    actionLabel,
    accessibleLabel,
  });
}

function normalizedUsername(username: string | null | undefined): string {
  return username?.trim().toLowerCase() ?? '';
}

/** Living roster ids are strongest; artist ownership survives archival. */
export function isScribbitOwnedByViewer(
  scribbit: Pick<Scribbit, 'id' | 'artist'>,
  viewerUsername: string | null | undefined,
  livingOwnedIds?: readonly string[]
): boolean {
  if (livingOwnedIds?.includes(scribbit.id)) return true;

  const viewer = normalizedUsername(viewerUsername);
  return viewer.length > 0 && normalizedUsername(scribbit.artist) === viewer;
}

function planPerspective(
  report: BattleReport,
  winnerSlot: FighterSlot,
  viewerUsername: string | null | undefined,
  livingOwnedIds: readonly string[] | undefined
): BattleJournalPerspective {
  const ownsFighterA = isScribbitOwnedByViewer(
    report.a,
    viewerUsername,
    livingOwnedIds
  );
  const ownsFighterB = isScribbitOwnedByViewer(
    report.b,
    viewerUsername,
    livingOwnedIds
  );
  if (!ownsFighterA && !ownsFighterB) return 'watch';

  const ownsWinner = winnerSlot === 'a' ? ownsFighterA : ownsFighterB;
  return ownsWinner ? 'win' : 'loss';
}

function finishKindFromRecap(
  recap: BattleRecapPlan
): Exclude<BattleJournalFinishKind, 'archived'> {
  switch (recap.finishPresentation) {
    case 'knockout':
      return 'knockout';
    case 'double-knockout':
      return 'double-knockout';
    case 'decision':
      return 'decision';
    default:
      return assertUnreachable(recap.finishPresentation);
  }
}

function finishLabel(finishKind: BattleJournalFinishKind): string {
  switch (finishKind) {
    case 'knockout':
      return 'KO';
    case 'double-knockout':
      return 'DOUBLE KO';
    case 'decision':
      return 'DECISION';
    case 'archived':
      return 'ARCHIVED RESULT';
    default:
      return assertUnreachable(finishKind);
  }
}

/** Plans one immutable scrapbook row without changing the saved report. */
export function planBattleJournalEntry(
  report: BattleReport,
  viewerUsername?: string | null,
  livingOwnedIds?: readonly string[]
): BattleJournalEntryPlan {
  const fighterAName = boundedDisplayName(report.a.name);
  const fighterBName = boundedDisplayName(report.b.name);
  const transcript = getUsableBattleTranscript(report);

  if (!transcript) {
    const winnerSlot = report.winner;
    const winnerName = winnerSlot === 'a' ? fighterAName : fighterBName;
    const archivedFinish: BattleJournalFinishKind = 'archived';

    const matchup = `${fighterAName} vs ${fighterBName}`;
    const kindDayLabel = `${battleKindLabel(report.kind)} • DAY ${dayLabel(report.day)}`;
    const perspective = planPerspective(
      report,
      winnerSlot,
      viewerUsername,
      livingOwnedIds
    );
    const plannedFinishLabel = finishLabel(archivedFinish);
    return Object.freeze({
      reportId: report.id,
      matchup,
      kindDayLabel,
      perspective,
      finishKind: archivedFinish,
      finishLabel: plannedFinishLabel,
      metadataLine: `WINNER ${winnerName} • RESULT SAVED • NO MOTION REPLAY`,
      highlightLine: null,
      replayMotionAvailable: false,
      ...planRowAction({
        matchup,
        perspective,
        finishLabel: plannedFinishLabel,
        replayMotionAvailable: false,
        day: report.day,
      }),
    });
  }

  const recap = planBattleRecap(transcript);
  const plannedFinish = finishKindFromRecap(recap);

  const matchup = `${fighterAName} vs ${fighterBName}`;
  const kindDayLabel = `${battleKindLabel(report.kind)} • DAY ${dayLabel(report.day)}`;
  const perspective = planPerspective(
    report,
    recap.winnerSlot,
    viewerUsername,
    livingOwnedIds
  );
  const plannedFinishLabel = finishLabel(plannedFinish);
  return Object.freeze({
    reportId: report.id,
    matchup,
    kindDayLabel,
    perspective,
    finishKind: plannedFinish,
    finishLabel: plannedFinishLabel,
    metadataLine: recap.verdictLine,
    highlightLine: recap.highlight
      ? `${recap.highlight.label} • ${recap.highlight.text}`
      : recap.tapeLine,
    replayMotionAvailable: true,
    ...planRowAction({
      matchup,
      perspective,
      finishLabel: plannedFinishLabel,
      replayMotionAvailable: true,
      day: report.day,
    }),
  });
}

function pluralizedCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 'S'}`;
}

/** Summarizes only transcript-proven finishes; archived results stay separate. */
export function planBattleJournalSummary(
  reports: readonly BattleReport[],
  viewerUsername?: string | null,
  livingOwnedIds?: readonly string[]
): BattleJournalSummaryPlan {
  let ownedWins = 0;
  let ownedLosses = 0;
  let knockoutCount = 0;
  let decisionCount = 0;
  let archivedCount = 0;

  for (const report of reports) {
    const entry = planBattleJournalEntry(
      report,
      viewerUsername,
      livingOwnedIds
    );
    if (entry.perspective === 'win') ownedWins += 1;
    if (entry.perspective === 'loss') ownedLosses += 1;

    switch (entry.finishKind) {
      case 'knockout':
      case 'double-knockout':
        knockoutCount += 1;
        break;
      case 'decision':
        decisionCount += 1;
        break;
      case 'archived':
        archivedCount += 1;
        break;
      default:
        assertUnreachable(entry.finishKind);
    }
  }

  const savedCount = reports.length;
  const ownershipIsKnown =
    normalizedUsername(viewerUsername).length > 0 ||
    (livingOwnedIds?.length ?? 0) > 0;
  const recordLine = ownershipIsKnown
    ? `YOUR REEL • ${ownedWins} W–${ownedLosses} L`
    : 'WATCH MODE • OWNED RECORD NOT SHOWN';
  const archivedCopy = archivedCount > 0 ? ` • ${archivedCount} ARCHIVED` : '';

  return Object.freeze({
    savedCount,
    ownedWins,
    ownedLosses,
    knockoutCount,
    decisionCount,
    archivedCount,
    savedLine: pluralizedCount(savedCount, 'SAVED BATTLE'),
    recordLine,
    finishLine: `${knockoutCount} KO • ${decisionCount} DECISION${archivedCopy}`,
  });
}
