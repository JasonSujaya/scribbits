import type {
  LegacyCardsState,
  LegacyReturnReceipt,
} from '../../shared/arena';
import {
  collectLegacyCards,
  encodeLegacyCardCursor,
  getNextLegacySeenThroughDay,
  legacyEntryIsOlderThanAnchor,
  parseLegacyCardCursor,
  projectLegacyReturnReceipt,
  type LegacyCardCursor,
  type LegacyCardIndexEntry,
} from '../../shared/legacycards';
import type { ArenaStorage } from './storage';
import {
  getUserLegacyCardsKey,
  getUserScribbitsKey,
  loadScribbits,
} from './scribbit';

const legacyIndexVersion = '1';

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

const loadLegacyIndexBatch = async (
  storage: ArenaStorage,
  userId: string,
  cursor: LegacyCardCursor,
  batchSize: number
): Promise<{ entries: LegacyCardIndexEntry[]; exhausted: boolean }> => {
  const indexKey = getUserLegacyCardsKey(userId);
  const requestedCount = batchSize + 1;
  let candidates: LegacyCardIndexEntry[];

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
    const storedAnchorScore = await storage.zScore(indexKey, cursor.member);
    const anchorRank =
      storedAnchorScore === cursor.score
        ? await storage.zRank(indexKey, cursor.member)
        : undefined;
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
      // Locate the deleted or score-mismatched anchor's insertion rank with a
      // bounded binary search. This preserves deep V1 cursors without reading
      // the whole deck and makes production match the in-memory paginator.
      let lowerRank = 0;
      let upperRank = await storage.zCard(indexKey);
      while (lowerRank < upperRank) {
        const middleRank = Math.floor((lowerRank + upperRank) / 2);
        const [middleEntry] = await storage.zRange(
          indexKey,
          middleRank,
          middleRank,
          { by: 'rank' }
        );
        if (!middleEntry) {
          upperRank = middleRank;
        } else if (legacyEntryIsOlderThanAnchor(middleEntry, cursor)) {
          lowerRank = middleRank + 1;
        } else {
          upperRank = middleRank;
        }
      }
      const insertionRank = lowerRank;
      candidates =
        insertionRank <= 0
          ? []
          : (
              await storage.zRange(
                indexKey,
                Math.max(0, insertionRank - requestedCount),
                insertionRank - 1,
                { by: 'rank' }
              )
            ).reverse();
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
  const parsedCursor = parseLegacyCardCursor(cursorValue);
  if (parsedCursor === undefined) {
    throw new Error('Invalid Legacy Card cursor.');
  }
  const visibleCards: Array<{
    card: LegacyCardsState['cards'][number];
    entry: LegacyCardIndexEntry;
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
        const lastReturnedEntry = returnedCards.at(-1)?.entry;
        const lastReturnedRank = lastReturnedEntry
          ? await storage.zRank(
              getUserLegacyCardsKey(userId),
              lastReturnedEntry.member
            )
          : undefined;
        return {
          cards: returnedCards.map((item) => item.card),
          nextCursor: lastReturnedEntry
            ? encodeLegacyCardCursor(lastReturnedEntry, lastReturnedRank)
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

  const cards = collectLegacyCards(
    await loadScribbits(
      storage,
      unseenEntries.map((entry) => entry.member)
    )
  );
  return projectLegacyReturnReceipt(cards, seenThroughDay);
};

export const markLegacyCardsSeen = async (
  storage: ArenaStorage,
  userId: string,
  throughArchivedDay: number
): Promise<number> => {
  const currentSeenDay = await readSeenThroughDay(storage, userId);
  const nextSeenDay = getNextLegacySeenThroughDay(
    currentSeenDay,
    throughArchivedDay
  );
  await storage.set(getLegacySeenDayKey(userId), nextSeenDay.toString());
  return nextSeenDay;
};
