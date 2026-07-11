// Immutable, repo-authored margin notes for the seven-day Scout Notebook.
// Selection is keyed only by Arena day and status, never by combat randomness.

import type { ScoutNotebookStatus } from '../arena';
import { hashContentKey } from './deterministic';

export type ScoutNoteContentValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  bankCount: number;
  lineCount: number;
}>;

export const SCOUT_NOTEBOOK_CONTENT_VERSION = 1;
export const SCOUT_NOTEBOOK_LINES_PER_STATUS = 8;
export const SCOUT_NOTEBOOK_LINE_COUNT = 48;
export const SCOUT_NOTEBOOK_MAXIMUM_LINE_LENGTH = 82;

const SCOUT_NOTEBOOK_STATUSES: readonly ScoutNotebookStatus[] = Object.freeze([
  'open',
  'pending',
  'champion',
  'finalist',
  'no_clout',
  'missed',
]);

const FORBIDDEN_PROMISE_OR_PREDICTION =
  /\b(?:assur(?:e|ed|es|ing)|certain(?:ly)?|definite(?:ly)?|destined|expect(?:ed|s|ing)?|favourit(?:e|es)|favorit(?:e|es)|guarantee(?:d|s|ing)?|likely|odds?|predict(?:ed|s|ing|ion|ions)?|promise(?:d|s|ing)?|shall|surely|will)\b/i;
const FORBIDDEN_ECONOMY_OR_REWARD_LANGUAGE =
  /\b(?:cash|clout|coins?|currency|earn(?:ed|s|ing)?|experience(?:\s+points?)?|ink|money|payouts?|prizes?|rewards?|tokens?|wallet|xp)\b/i;
const PROVEN_FINISH_CLAIM =
  /\b(?:champions?|crown(?:ed|s|ing)?|finalists?|first\s+place|runner[ -]?up|titleholder|victor(?:s|y|ies|ious)?|winner(?:s)?|winning|wins?|won)\b/i;
const CHAMPION_ONLY_CROSS_CLAIM =
  /\b(?:finalists?|runner[ -]?up|second\s+place|victor(?:s|y|ies|ious)?|winner(?:s)?|winning|wins?|won)\b/i;
const FINALIST_ONLY_CROSS_CLAIM =
  /\b(?:champions?|crown(?:ed|s|ing)?|first\s+place|titleholder|victor(?:s|y|ies|ious)?|winner(?:s)?|winning|wins?|won)\b/i;

function freezeLines(lines: readonly string[]): readonly string[] {
  return Object.freeze([...lines]);
}

export const SCOUT_NOTEBOOK_LINES: Readonly<
  Record<ScoutNotebookStatus, readonly string[]>
> = Object.freeze({
  open: freezeLines([
    'Fresh page: compare the shapes before circling a name.',
    'The bracket is copied; one pencil circle is still waiting.',
    "Scout's margin: note the silhouette, signature, and element.",
    "Tonight's card is clipped in with room beside every entrant.",
    'A clean page waits for one careful mark beside the roster.',
    'Study the taped portraits; the choice box remains unmarked.',
    'The entrants are listed in pencil, ready for a scouting mark.',
    'Open notebook: read the card, then pin one name before lock.',
  ]),
  pending: freezeLines([
    'Pick pinned; the bracket result has not been filed yet.',
    'One name is circled; the result box remains blank.',
    'The scouting mark is set, with the result page still open.',
    "Pencil down; tonight's chosen card is clipped to this page.",
    'Selection filed; the notebook is waiting on the bracket record.',
    'A firm circle marks the pick; no result stamp appears yet.',
    'The chosen portrait is taped in; the outcome line stays blank.',
    "Scout's note: pick recorded, bracket record not yet attached.",
  ]),
  champion: freezeLines([
    'Champion confirmed; the circled portrait carries the official stamp.',
    'Champion page filed; the penciled pick matches the bracket record.',
    'Champion confirmed; a gold paper seal marks the archived pick.',
    'Champion stamp set beside the exact name pinned on this page.',
    "Champion record copied neatly beneath the scout's original circle.",
    'Champion confirmed; the taped card now sits under a dated seal.',
    'Champion page complete; the chosen portrait bears the result stamp.',
    'Champion status filed beside the pick, artist, and day.',
  ]),
  finalist: freezeLines([
    'Finalist confirmed; the selected portrait carries the official stamp.',
    'Finalist page filed; the scouting mark matches the bracket record.',
    'Finalist confirmed; a silver paper seal marks the archived pick.',
    'Finalist stamp set beside the exact name copied on this page.',
    "Finalist record rests beneath the scout's original pencil circle.",
    'Finalist confirmed; the taped card now sits under a dated tab.',
    'Finalist page complete; the chosen portrait bears the result seal.',
    'Finalist status filed beside the selection, artist, and day.',
  ]),
  no_clout: freezeLines([
    'Result filed; the penciled pick finished outside the marked pair.',
    'The closed bracket leaves this scouting circle with a plain stamp.',
    "This pick's result is copied plainly, without a special status seal.",
    'The chosen portrait stays in the notebook as a studied miss.',
    'Result page complete; the original circle remains in the record.',
    "The scout's mark missed both noted finishes; the page stays honest.",
    'Bracket record attached; this pick carries a plain result tab.',
    'The page keeps the chosen name and result exactly as filed.',
  ]),
  missed: freezeLines([
    'No pick was pinned; this page keeps an empty scouting margin.',
    'The bracket passed without a circle beside any entrant.',
    'No selection was filed, so the portrait space remains blank.',
    "An untouched choice box records a quiet night at the scout's desk.",
    'This dated page has no pinned name or artist card.',
    'The roster was copied, but the scouting mark was left open.',
    'No portrait was taped here; only the day line was recorded.',
    'Blank margin filed: this Arena day carries no scout selection.',
  ]),
});

type ScoutNoteBankInput = Readonly<
  Partial<Record<ScoutNotebookStatus, readonly string[]>>
>;

export function validateScoutNoteContent(
  banks: ScoutNoteBankInput = SCOUT_NOTEBOOK_LINES
): ScoutNoteContentValidation {
  const errors: string[] = [];
  const expectedStatuses = new Set<string>(SCOUT_NOTEBOOK_STATUSES);
  const seenLines = new Map<string, string>();
  const actualStatuses = Object.keys(banks);
  let lineCount = 0;

  if (!Object.isFrozen(banks)) {
    errors.push('Scout Notebook line banks must be frozen.');
  }
  if (actualStatuses.length !== SCOUT_NOTEBOOK_STATUSES.length) {
    errors.push(
      `Scout Notebook needs exactly ${SCOUT_NOTEBOOK_STATUSES.length} status banks.`
    );
  }
  for (const actualStatus of actualStatuses) {
    if (!expectedStatuses.has(actualStatus)) {
      errors.push(
        `Scout Notebook has an unknown status bank: ${actualStatus}.`
      );
    }
  }

  for (const status of SCOUT_NOTEBOOK_STATUSES) {
    const lines = banks[status];
    if (!lines) {
      errors.push(`Scout Notebook is missing the ${status} bank.`);
      continue;
    }
    if (!Object.isFrozen(lines)) {
      errors.push(`Scout Notebook ${status} lines must be frozen.`);
    }
    if (lines.length !== SCOUT_NOTEBOOK_LINES_PER_STATUS) {
      errors.push(
        `Scout Notebook ${status} needs exactly ${SCOUT_NOTEBOOK_LINES_PER_STATUS} lines.`
      );
    }

    lines.forEach((line, index) => {
      lineCount += 1;
      const label = `Scout Notebook ${status} line ${index + 1}`;
      const trimmedLine = line.trim();
      const normalizedLine = trimmedLine.toLocaleLowerCase('en-US');

      if (trimmedLine.length === 0) errors.push(`${label} must not be blank.`);
      if (line !== trimmedLine) {
        errors.push(`${label} must not have outer whitespace.`);
      }
      if (line.length > SCOUT_NOTEBOOK_MAXIMUM_LINE_LENGTH) {
        errors.push(
          `${label} is ${line.length} characters; maximum is ${SCOUT_NOTEBOOK_MAXIMUM_LINE_LENGTH}.`
        );
      }

      const duplicateOwner = seenLines.get(normalizedLine);
      if (duplicateOwner) {
        errors.push(`${label} duplicates ${duplicateOwner}.`);
      } else {
        seenLines.set(normalizedLine, label);
      }
      if (FORBIDDEN_PROMISE_OR_PREDICTION.test(line)) {
        errors.push(`${label} makes a promise or prediction.`);
      }
      if (FORBIDDEN_ECONOMY_OR_REWARD_LANGUAGE.test(line)) {
        errors.push(`${label} uses economy or reward language.`);
      }

      if (status === 'champion') {
        if (!/\bchampion\b/i.test(line)) {
          errors.push(`${label} must identify the proven champion status.`);
        }
        if (CHAMPION_ONLY_CROSS_CLAIM.test(line)) {
          errors.push(`${label} adds a claim beyond champion status.`);
        }
      } else if (status === 'finalist') {
        if (!/\bfinalist\b/i.test(line)) {
          errors.push(`${label} must identify the proven finalist status.`);
        }
        if (FINALIST_ONLY_CROSS_CLAIM.test(line)) {
          errors.push(`${label} adds a claim beyond finalist status.`);
        }
      } else if (PROVEN_FINISH_CLAIM.test(line)) {
        errors.push(`${label} claims a finish that its status does not prove.`);
      }
    });
  }

  if (lineCount !== SCOUT_NOTEBOOK_LINE_COUNT) {
    errors.push(
      `Scout Notebook needs exactly ${SCOUT_NOTEBOOK_LINE_COUNT} total lines.`
    );
  }

  const frozenErrors = Object.freeze(errors);
  return Object.freeze({
    valid: frozenErrors.length === 0,
    errors: frozenErrors,
    bankCount: actualStatuses.length,
    lineCount,
  });
}

function normalizeArenaDay(dayNumber: number): number {
  return Number.isSafeInteger(dayNumber) && dayNumber >= 1 ? dayNumber : 1;
}

/**
 * Gives each status an eight-day permutation, so no line repeats for that
 * status inside any seven consecutive Arena days.
 */
export function selectScoutNoteLine(
  status: ScoutNotebookStatus,
  dayNumber: number
): string {
  const lines = SCOUT_NOTEBOOK_LINES[status];
  const statusOffset =
    hashContentKey(
      `scout-notebook:v${SCOUT_NOTEBOOK_CONTENT_VERSION}:${status}`
    ) % lines.length;
  const dayOffset = normalizeArenaDay(dayNumber) - 1;
  const line = lines[(statusOffset + dayOffset) % lines.length];
  if (!line)
    throw new Error(`Scout Notebook ${status} bank must not be empty.`);
  return line;
}

const scoutNoteContentValidation = validateScoutNoteContent();
if (!scoutNoteContentValidation.valid) {
  throw new Error(
    `Invalid Scout Notebook content:\n${scoutNoteContentValidation.errors.join('\n')}`
  );
}
