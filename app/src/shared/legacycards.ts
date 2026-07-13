// Browser-safe Legacy Card contract shared by production, local mock, and tests.
// Redis owns storage; this module owns projection, cursors, limits, and ordering.

import type {
  LegacyCard,
  LegacyCardsState,
  LegacyReturnReceipt,
  Scribbit,
} from './arena';

export const LEGACY_CARDS_PAGE_SIZE_LIMIT = 24;
export const LEGACY_RETURN_PREVIEW_LIMIT = 3;
export const LEGACY_CURSOR_MAXIMUM_LENGTH = 440;
export const LEGACY_CURSOR_MEMBER_MAXIMUM_LENGTH = 256;

const legacyCursorPrefix = 'v2|';
const previousLegacyCursorPrefix = 'v1|';

export type LegacyCardCursor =
  | Readonly<{
      kind: 'anchor';
      member: string;
      score: number;
      rankHint?: number;
    }>
  | Readonly<{ kind: 'offset'; offset: number }>
  | null;

export type LegacyCardIndexEntry = Readonly<{
  member: string;
  score: number;
}>;

const isCanonicalNonNegativeIntegerText = (value: string): boolean => {
  return /^(0|[1-9][0-9]*)$/.test(value);
};

const createAnchorCursor = (
  scoreText: string,
  encodedMember: string,
  rankText?: string
): LegacyCardCursor | undefined => {
  if (
    !isCanonicalNonNegativeIntegerText(scoreText) ||
    (rankText !== undefined &&
      !isCanonicalNonNegativeIntegerText(rankText))
  ) {
    return undefined;
  }
  const score = Number(scoreText);
  const rankHint = rankText === undefined ? undefined : Number(rankText);
  let member: string;
  try {
    member = decodeURIComponent(encodedMember);
  } catch {
    return undefined;
  }
  if (
    !Number.isSafeInteger(score) ||
    score < 0 ||
    (rankHint !== undefined &&
      (!Number.isSafeInteger(rankHint) || rankHint < 0)) ||
    member.length < 1 ||
    member.length > LEGACY_CURSOR_MEMBER_MAXIMUM_LENGTH ||
    [...member].some((character) => character.charCodeAt(0) < 32)
  ) {
    return undefined;
  }
  return Object.freeze(
    rankHint === undefined
      ? { kind: 'anchor', member, score }
      : { kind: 'anchor', member, score, rankHint }
  );
};

export const parseLegacyCardCursor = (
  value: string | number | null
): LegacyCardCursor | undefined => {
  if (value === null) return null;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0
      ? Object.freeze({ kind: 'offset', offset: value })
      : undefined;
  }
  // Numeric offsets are a V0 compatibility cursor. Preserve leading-zero
  // forms accepted by the original route while all emitted cursors use V2.
  if (/^[0-9]+$/.test(value)) {
    const offset = Number(value);
    return Number.isSafeInteger(offset)
      ? Object.freeze({ kind: 'offset', offset })
      : undefined;
  }
  if (value.length > LEGACY_CURSOR_MAXIMUM_LENGTH) return undefined;

  if (value.startsWith(legacyCursorPrefix)) {
    const scoreSeparator = value.indexOf('|', legacyCursorPrefix.length);
    if (scoreSeparator < 0) return undefined;
    const rankSeparator = value.indexOf('|', scoreSeparator + 1);
    if (rankSeparator < 0) return undefined;
    return createAnchorCursor(
      value.slice(legacyCursorPrefix.length, scoreSeparator),
      value.slice(rankSeparator + 1),
      value.slice(scoreSeparator + 1, rankSeparator)
    );
  }

  if (value.startsWith(previousLegacyCursorPrefix)) {
    const separator = value.indexOf('|', previousLegacyCursorPrefix.length);
    if (separator < 0) return undefined;
    return createAnchorCursor(
      value.slice(previousLegacyCursorPrefix.length, separator),
      value.slice(separator + 1)
    );
  }

  return undefined;
};

export const isLegacyCardCursor = (value: string | null): boolean => {
  return parseLegacyCardCursor(value) !== undefined;
};

export const encodeLegacyCardCursor = (
  entry: LegacyCardIndexEntry,
  rankHint: number | undefined
): string => {
  const encodedMember = encodeURIComponent(entry.member);
  return rankHint === undefined
    ? `${previousLegacyCursorPrefix}${entry.score}|${encodedMember}`
    : `${legacyCursorPrefix}${entry.score}|${rankHint}|${encodedMember}`;
};

export const legacyEntryIsOlderThanAnchor = (
  entry: LegacyCardIndexEntry,
  anchor: Extract<LegacyCardCursor, { kind: 'anchor' }>
): boolean => {
  return (
    entry.score < anchor.score ||
    (entry.score === anchor.score && entry.member < anchor.member)
  );
};

export const parseLegacyCardsPageSize = (
  value: string | null | undefined
): number | undefined => {
  if (value === null || value === undefined) {
    return LEGACY_CARDS_PAGE_SIZE_LIMIT;
  }
  if (!isCanonicalNonNegativeIntegerText(value)) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return undefined;
  return Math.min(parsed, LEGACY_CARDS_PAGE_SIZE_LIMIT);
};

export const toLegacyCard = (scribbit: Scribbit): LegacyCard | undefined => {
  if (scribbit.status === 'alive' || !scribbit.legacy) return undefined;
  return {
    id: scribbit.id,
    name: scribbit.name,
    artist: scribbit.artist,
    element: scribbit.element,
    imageUrl: scribbit.imageUrl,
    bornDay: scribbit.bornDay,
    expiresDay: scribbit.expiresDay,
    status: scribbit.status,
    legendTitle: scribbit.legendTitle,
    legacy: {
      ...scribbit.legacy,
      creatorTitle: scribbit.legacy.creatorTitle
        ? { ...scribbit.legacy.creatorTitle }
        : null,
      accessories: scribbit.legacy.accessories.map((accessory) => ({
        ...accessory,
      })),
      upgrades: scribbit.legacy.upgrades.map((upgrade) => ({ ...upgrade })),
    },
  };
};

export const collectLegacyCards = (
  scribbits: readonly Scribbit[]
): LegacyCard[] => {
  return scribbits
    .map(toLegacyCard)
    .filter((card): card is LegacyCard => card !== undefined);
};

export const sortLegacyCardsNewestFirst = (
  cards: readonly LegacyCard[]
): LegacyCard[] => {
  return [...cards].sort((left, right) => {
    const dayDifference =
      right.legacy.archivedDay - left.legacy.archivedDay;
    if (dayDifference !== 0) return dayDifference;
    if (left.id === right.id) return 0;
    return left.id < right.id ? 1 : -1;
  });
};

export const getLegacyCardCursorOffset = (
  cursorValue: string | number | null,
  cardsNewestFirst: readonly LegacyCard[]
): number | undefined => {
  const cursor = parseLegacyCardCursor(cursorValue);
  if (cursor === undefined) return undefined;
  if (cursor === null) return 0;
  if (cursor.kind === 'offset') return cursor.offset;

  const exactIndex = cardsNewestFirst.findIndex(
    (card) =>
      card.id === cursor.member &&
      card.legacy.archivedDay === cursor.score
  );
  if (exactIndex >= 0) return exactIndex + 1;
  const nextIndex = cardsNewestFirst.findIndex((card) =>
    legacyEntryIsOlderThanAnchor(
      { member: card.id, score: card.legacy.archivedDay },
      cursor
    )
  );
  return nextIndex < 0 ? cardsNewestFirst.length : nextIndex;
};

export const paginateLegacyCards = (
  cardsNewestFirst: readonly LegacyCard[],
  cursorValue: string | number | null,
  limit: number
): LegacyCardsState | undefined => {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > LEGACY_CARDS_PAGE_SIZE_LIMIT
  ) {
    return undefined;
  }
  const cursorOffset = getLegacyCardCursorOffset(
    cursorValue,
    cardsNewestFirst
  );
  if (cursorOffset === undefined) return undefined;

  const cards = cardsNewestFirst.slice(cursorOffset, cursorOffset + limit);
  const nextOffset = cursorOffset + cards.length;
  const lastCard = cards.at(-1);
  return {
    cards,
    nextCursor:
      nextOffset < cardsNewestFirst.length && lastCard
        ? encodeLegacyCardCursor(
            {
              member: lastCard.id,
              score: lastCard.legacy.archivedDay,
            },
            Math.max(0, cardsNewestFirst.length - nextOffset)
          )
        : null,
  };
};

export const projectLegacyReturnReceipt = (
  cards: readonly LegacyCard[],
  seenThroughDay: number
): LegacyReturnReceipt | null => {
  const unseenCards = sortLegacyCardsNewestFirst(cards).filter(
    (card) => card.legacy.archivedDay > seenThroughDay
  );
  if (unseenCards.length === 0) return null;
  return {
    cards: unseenCards.slice(0, LEGACY_RETURN_PREVIEW_LIMIT),
    total: unseenCards.length,
    newestArchivedDay: Math.max(
      ...unseenCards.map((card) => card.legacy.archivedDay)
    ),
  };
};

export const getNextLegacySeenThroughDay = (
  currentSeenDay: number,
  requestedDay: number
): number => {
  return Math.max(
    Number.isSafeInteger(currentSeenDay) && currentSeenDay >= 0
      ? currentSeenDay
      : 0,
    Number.isFinite(requestedDay) ? Math.max(0, Math.floor(requestedDay)) : 0
  );
};
