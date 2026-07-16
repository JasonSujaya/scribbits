import type { Context as HonoContext, Handler } from 'hono';
import type {
  ArenaErrorResponse,
  LegacyCardsState,
  LegendsState,
  Scribbit,
} from '../../shared/arena';
import {
  isLegacyCardCursor,
  parseLegacyCardsPageSize,
} from '../../shared/legacycards';
import { loadLegacyCardPage, markLegacyCardsSeen } from '../core/legacy';
import { getHiddenScribbitIds } from '../core/moderation';
import {
  getLegendIds,
  loadScribbits,
  type CurrentPlayer,
} from '../core/scribbit';
import type { ArenaStorage } from '../core/storage';

const maximumLegendsPageSize = 50;

type LegacyRouteDependencies = Readonly<{
  storage: ArenaStorage;
  getCurrentPlayer: () => Promise<CurrentPlayer | undefined>;
  getWritableArenaDay: (now: Date) => Promise<number | undefined>;
  now?: () => Date;
}>;

export type LegacyRouteHandlers = Readonly<{
  legacyCards: Handler;
  markLegacyCardsSeen: Handler;
  legends: Handler;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readJsonBody = async (c: HonoContext): Promise<unknown> => {
  try {
    return (await c.req.json()) as unknown;
  } catch {
    return undefined;
  }
};

const errorResponse = (
  c: HonoContext,
  code: ArenaErrorResponse['code'],
  message: string,
  status: 400 | 401 | 409 | 500
) => c.json<ArenaErrorResponse>({ status: 'error', code, message }, status);

const readPageNumber = (
  value: string | undefined,
  fallback: number,
  maximum?: number
): number | undefined => {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return undefined;

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) return undefined;
  return maximum === undefined ? parsedValue : Math.min(parsedValue, maximum);
};

export const createLegacyRouteHandlers = ({
  storage,
  getCurrentPlayer,
  getWritableArenaDay,
  now = () => new Date(),
}: LegacyRouteDependencies): LegacyRouteHandlers => {
  const loadVisibleLegendPage = async (
    hiddenScribbitIds: Set<string>,
    offset: number,
    limit: number
  ): Promise<LegendsState> => {
    const legends: Scribbit[] = [];
    const scanBatchSize = Math.min(
      maximumLegendsPageSize,
      Math.max(8, limit + 1)
    );
    let scanOffset = offset;

    while (true) {
      const batchStartOffset = scanOffset;
      const legendIds = await getLegendIds(
        storage,
        scanBatchSize,
        batchStartOffset
      );
      if (legendIds.length === 0) break;
      const loadedLegends = new Map(
        (await loadScribbits(storage, legendIds))
          .filter((scribbit) => scribbit.status === 'legend')
          .map((scribbit) => [scribbit.id, scribbit])
      );

      for (let index = 0; index < legendIds.length; index += 1) {
        const scribbitOffset = batchStartOffset + index;
        scanOffset = scribbitOffset + 1;
        const scribbitId = legendIds[index];
        if (!scribbitId) continue;
        const scribbit = loadedLegends.get(scribbitId);
        // Missing/non-Legend rows are stale zset members. Consume their raw
        // rank so the next cursor cannot duplicate or skip a valid Scribbit.
        if (!scribbit) continue;
        if (hiddenScribbitIds.has(scribbit.id)) continue;

        // Point at, rather than past, the first visible item on the next page.
        // Hidden rows are consumed once and never shorten the previous page.
        if (legends.length === limit) {
          return { legends, nextCursor: String(scribbitOffset) };
        }
        legends.push(scribbit);
      }

      if (legendIds.length < scanBatchSize) break;
    }

    return { legends, nextCursor: null };
  };

  const legacyCards: Handler = async (c) => {
    const cursor = c.req.query('cursor') ?? null;
    const requestedLimit = parseLegacyCardsPageSize(c.req.query('limit'));
    if (
      !isLegacyCardCursor(cursor) ||
      requestedLimit === undefined ||
      requestedLimit < 1
    ) {
      return errorResponse(
        c,
        'bad_request',
        'Use a valid Legacy Deck cursor and page size.',
        400
      );
    }

    try {
      const player = await getCurrentPlayer();
      if (!player) {
        return c.json<LegacyCardsState>({ cards: [], nextCursor: null });
      }
      return c.json<LegacyCardsState>(
        await loadLegacyCardPage(storage, player.userId, cursor, requestedLimit)
      );
    } catch (error) {
      console.error('Legacy Cards route failed:', error);
      return errorResponse(
        c,
        'server_error',
        'Your Legacy Deck is stuck between pages.',
        500
      );
    }
  };

  const markLegacyCardsSeenHandler: Handler = async (c) => {
    const player = await getCurrentPlayer();
    if (!player) {
      return errorResponse(
        c,
        'unauthorized',
        'Sign in to file away Legacy Cards.',
        401
      );
    }

    const body = await readJsonBody(c);
    if (
      !isRecord(body) ||
      !Number.isSafeInteger(body.throughArchivedDay) ||
      Number(body.throughArchivedDay) < 0
    ) {
      return errorResponse(
        c,
        'bad_request',
        'Choose a valid archived day to file away.',
        400
      );
    }
    const throughArchivedDay = Number(body.throughArchivedDay);

    try {
      const currentDay = await getWritableArenaDay(now());
      if (!currentDay) {
        return errorResponse(
          c,
          'conflict',
          'The Rumble is resolving. Try again in a moment.',
          409
        );
      }
      if (throughArchivedDay > currentDay) {
        return errorResponse(
          c,
          'bad_request',
          'That Legacy Card has not been archived yet.',
          400
        );
      }
      const seenThroughDay = await markLegacyCardsSeen(
        storage,
        player.userId,
        throughArchivedDay
      );
      return c.json({ seenThroughDay });
    } catch (error) {
      console.error('Mark Legacy Cards seen route failed:', error);
      return errorResponse(
        c,
        'server_error',
        'The archive stamp missed the page. Try again.',
        500
      );
    }
  };

  const legends: Handler = async (c) => {
    const cursorOffset = readPageNumber(c.req.query('cursor'), 0);
    const requestedLimit = readPageNumber(
      c.req.query('limit'),
      maximumLegendsPageSize,
      maximumLegendsPageSize
    );
    if (
      cursorOffset === undefined ||
      requestedLimit === undefined ||
      requestedLimit < 1
    ) {
      return errorResponse(
        c,
        'bad_request',
        'Use a valid Legends cursor and a positive page size.',
        400
      );
    }

    try {
      const player = await getCurrentPlayer();
      const hiddenScribbitIds = player
        ? await getHiddenScribbitIds(storage, player.userId)
        : new Set<string>();
      return c.json<LegendsState>(
        await loadVisibleLegendPage(
          hiddenScribbitIds,
          cursorOffset,
          requestedLimit
        )
      );
    } catch (error) {
      console.error('Legends route failed:', error);
      return errorResponse(
        c,
        'server_error',
        'The Hall of Legends is dusty right now.',
        500
      );
    }
  };

  return Object.freeze({
    legacyCards,
    markLegacyCardsSeen: markLegacyCardsSeenHandler,
    legends,
  });
};
