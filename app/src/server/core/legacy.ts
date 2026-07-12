import type {
  LegacyCard,
  LegacyCardsState,
  LegacyReturnReceipt,
} from '../../shared/arena';
import type { Scribbit } from '../../shared/arena';
import type { ArenaStorage } from './storage';
import {
  getUserLegacyCardsKey,
  getUserScribbitsKey,
  loadScribbits,
} from './scribbit';

const legacyIndexVersion = '1';
const legacyReturnPreviewLimit = 3;

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
    },
  };
};

const collectLegacyCards = (scribbits: Scribbit[]): LegacyCard[] => {
  return scribbits
    .map(toLegacyCard)
    .filter((card): card is LegacyCard => card !== undefined);
};

export const getLegacyIndexVersionKey = (userId: string): string => {
  return `user:${userId}:scribbits:legacy-index-version`;
};

export const getLegacySeenDayKey = (userId: string): string => {
  return `user:${userId}:scribbits:legacy-seen-day`;
};

// Existing faded records predate the dedicated Legacy Deck index. Rebuild it
// once from the permanent owner index, then every future expiry updates the
// small per-user Legacy zset directly.
export const ensureLegacyCardIndex = async (
  storage: ArenaStorage,
  userId: string
): Promise<void> => {
  const versionKey = getLegacyIndexVersionKey(userId);
  if ((await storage.get(versionKey)) === legacyIndexVersion) return;

  const ownerEntries = await storage.zRange(
    getUserScribbitsKey(userId),
    0,
    -1,
    { by: 'rank', reverse: true }
  );
  const scribbits = await loadScribbits(
    storage,
    ownerEntries.map((entry) => entry.member)
  );
  const legacyCards = collectLegacyCards(scribbits);
  if (legacyCards.length > 0) {
    await storage.zAdd(
      getUserLegacyCardsKey(userId),
      ...legacyCards.map((card) => ({
        member: card.id,
        score: card.legacy.archivedDay,
      }))
    );
  }
  await storage.set(versionKey, legacyIndexVersion);
};

type LegacyCursor =
  | {
      kind: 'anchor';
      member: string;
      score: number;
      rankHint?: number;
    }
  | { kind: 'offset'; offset: number }
  | null;

type LegacyIndexEntry = {
  member: string;
  score: number;
};

const legacyCursorPrefix = 'v2|';
const previousLegacyCursorPrefix = 'v1|';

const createAnchorCursor = (
  scoreText: string,
  encodedMember: string,
  rankHint?: number
): LegacyCursor | undefined => {
  const score = Number(scoreText);
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
    member.length > 256 ||
    [...member].some((character) => character.charCodeAt(0) < 32)
  ) {
    return undefined;
  }
  return { kind: 'anchor', member, score, rankHint };
};

const parseLegacyCursor = (
  value: string | number | null
): LegacyCursor | undefined => {
  if (value === null) return null;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0
      ? { kind: 'offset', offset: value }
      : undefined;
  }
  if (/^\d+$/.test(value)) {
    const offset = Number(value);
    return Number.isSafeInteger(offset) && offset >= 0
      ? { kind: 'offset', offset }
      : undefined;
  }
  if (value.length > 440) {
    return undefined;
  }
  if (value.startsWith(legacyCursorPrefix)) {
    const scoreSeparator = value.indexOf('|', legacyCursorPrefix.length);
    if (scoreSeparator < 0) return undefined;
    const rankSeparator = value.indexOf('|', scoreSeparator + 1);
    if (rankSeparator < 0) return undefined;
    const rankHint = Number(value.slice(scoreSeparator + 1, rankSeparator));
    return createAnchorCursor(
      value.slice(legacyCursorPrefix.length, scoreSeparator),
      value.slice(rankSeparator + 1),
      rankHint
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
  return parseLegacyCursor(value) !== undefined;
};

const encodeLegacyCursor = (
  entry: LegacyIndexEntry,
  rankHint: number | undefined
): string => {
  if (rankHint === undefined) {
    return `${previousLegacyCursorPrefix}${entry.score}|${encodeURIComponent(entry.member)}`;
  }
  return `${legacyCursorPrefix}${entry.score}|${rankHint}|${encodeURIComponent(entry.member)}`;
};

const loadLegacyIndexBatch = async (
  storage: ArenaStorage,
  userId: string,
  cursor: LegacyCursor,
  batchSize: number
): Promise<{ entries: LegacyIndexEntry[]; exhausted: boolean }> => {
  const indexKey = getUserLegacyCardsKey(userId);
  const requestedCount = batchSize + 1;
  let candidates: LegacyIndexEntry[];

  if (cursor === null) {
    candidates = await storage.zRange(indexKey, 0, requestedCount - 1, {
      by: 'rank',
      reverse: true,
    });
  } else if (cursor.kind === 'offset') {
    candidates = await storage.zRange(
      indexKey,
      cursor.offset,
      cursor.offset + requestedCount - 1,
      { by: 'rank', reverse: true }
    );
  } else {
    const anchorRank = await storage.zRank(indexKey, cursor.member);
    if (anchorRank !== undefined) {
      const oldestIncludedRank = Math.max(0, anchorRank - requestedCount);
      candidates =
        anchorRank <= 0
          ? []
          : (
              await storage.zRange(
                indexKey,
                oldestIncludedRank,
                anchorRank - 1,
                { by: 'rank' }
              )
            ).reverse();
    } else {
      // Rare stale-anchor recovery stays rank-bounded even for forged input.
      // V2 carries the anchor's ascending rank, so deletion can resume near
      // the exact place without scanning a user's whole archive.
      const recoveryCount = Math.min(200, Math.max(32, requestedCount * 2));
      const recoveryEntries =
        cursor.rankHint === undefined
          ? await storage.zRange(indexKey, 0, recoveryCount - 1, {
              by: 'rank',
              reverse: true,
            })
          : cursor.rankHint <= 0
            ? []
            : (
                await storage.zRange(
                  indexKey,
                  Math.max(0, cursor.rankHint - recoveryCount),
                  cursor.rankHint - 1,
                  { by: 'rank' }
                )
              ).reverse();
      candidates = recoveryEntries.filter(
        (entry) =>
          entry.score < cursor.score ||
          (entry.score === cursor.score && entry.member < cursor.member)
      );
    }
  }

  return {
    entries: candidates.slice(0, batchSize),
    exhausted: candidates.length <= batchSize,
  };
};

export const loadLegacyCardPage = async (
  storage: ArenaStorage,
  userId: string,
  cursorValue: string | number | null,
  limit: number
): Promise<LegacyCardsState> => {
  await ensureLegacyCardIndex(storage, userId);
  const parsedCursor = parseLegacyCursor(cursorValue);
  if (parsedCursor === undefined) {
    throw new Error('Invalid Legacy Card cursor.');
  }
  const visibleCards: Array<{
    card: LegacyCard;
    entry: LegacyIndexEntry;
  }> = [];
  const scanBatchSize = Math.min(50, Math.max(8, limit + 1));
  let scanCursor = parsedCursor;

  while (true) {
    const batch = await loadLegacyIndexBatch(
      storage,
      userId,
      scanCursor,
      scanBatchSize
    );
    if (batch.entries.length === 0) break;
    const loadedCards = new Map(
      collectLegacyCards(
        await loadScribbits(
          storage,
          batch.entries.map((entry) => entry.member)
        )
      ).map((card) => [card.id, card])
    );

    for (const entry of batch.entries) {
      scanCursor = { kind: 'anchor', ...entry };
      const card = loadedCards.get(entry.member);
      if (!card) continue;
      visibleCards.push({ card, entry });
      if (visibleCards.length > limit) {
        const returnedCards = visibleCards.slice(0, limit);
        const lastReturnedEntry =
          returnedCards[returnedCards.length - 1]?.entry;
        const lastReturnedRank = lastReturnedEntry
          ? await storage.zRank(
              getUserLegacyCardsKey(userId),
              lastReturnedEntry.member
            )
          : undefined;
        return {
          cards: returnedCards.map((item) => item.card),
          nextCursor: lastReturnedEntry
            ? encodeLegacyCursor(lastReturnedEntry, lastReturnedRank)
            : null,
        };
      }
    }

    if (batch.exhausted) break;
  }

  return {
    cards: visibleCards.map((item) => item.card),
    nextCursor: null,
  };
};

const readSeenThroughDay = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  const storedDay = Number(await storage.get(getLegacySeenDayKey(userId)));
  return Number.isSafeInteger(storedDay) && storedDay >= 0 ? storedDay : 0;
};

export const loadLegacyReturnReceipt = async (
  storage: ArenaStorage,
  userId: string
): Promise<LegacyReturnReceipt | null> => {
  await ensureLegacyCardIndex(storage, userId);
  const seenThroughDay = await readSeenThroughDay(storage, userId);
  const unseenEntries = await storage.zRange(
    getUserLegacyCardsKey(userId),
    seenThroughDay + 1,
    Number.MAX_SAFE_INTEGER,
    { by: 'score', reverse: true }
  );
  if (unseenEntries.length === 0) return null;

  const loadedCards = await loadScribbits(
    storage,
    unseenEntries.map((entry) => entry.member)
  );
  const cards = collectLegacyCards(loadedCards);
  if (cards.length === 0) return null;

  return {
    cards: cards.slice(0, legacyReturnPreviewLimit),
    total: cards.length,
    newestArchivedDay: Math.max(
      ...cards.map((card) => card.legacy.archivedDay)
    ),
  };
};

export const markLegacyCardsSeen = async (
  storage: ArenaStorage,
  userId: string,
  throughArchivedDay: number
): Promise<number> => {
  const currentSeenDay = await readSeenThroughDay(storage, userId);
  const nextSeenDay = Math.max(
    currentSeenDay,
    Math.max(0, Math.floor(throughArchivedDay))
  );
  await storage.set(getLegacySeenDayKey(userId), nextSeenDay.toString());
  return nextSeenDay;
};
