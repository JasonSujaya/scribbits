import type { Handler } from 'hono';
import type {
  ArenaErrorResponse,
  SeasonBoard,
  SeasonPublicState,
} from '../../shared/arena';
import { ensureCurrentArenaDay } from '../core/arenaStore';
import {
  ensureInitialSeason,
  loadSeasonBoard,
  loadSeasonPublicState,
} from '../core/season';
import type { CurrentPlayer } from '../core/scribbit';
import type { ArenaStorage } from '../core/storage';

type SeasonRouteDependencies = Readonly<{
  storage: ArenaStorage;
  getCurrentPlayer: () => Promise<CurrentPlayer | undefined>;
  now?: () => Date;
}>;

export type SeasonRouteHandlers = Readonly<{
  season: Handler;
  seasonBoard: Handler;
}>;

export const createSeasonRouteHandlers = ({
  storage,
  getCurrentPlayer,
  now = () => new Date(),
}: SeasonRouteDependencies): SeasonRouteHandlers => {
  const ensureSeasonForRequest = async (): Promise<number> => {
    const currentDate = now();
    const dayNumber = await ensureCurrentArenaDay(storage, currentDate);
    await ensureInitialSeason(storage, dayNumber, currentDate.getTime());
    return dayNumber;
  };

  const season: Handler = async (c) => {
    try {
      const dayNumber = await ensureSeasonForRequest();
      const player = await getCurrentPlayer();
      return c.json<SeasonPublicState>(
        await loadSeasonPublicState(storage, dayNumber, player?.userId)
      );
    } catch (error) {
      console.error('Season route failed:', error);
      return c.json<ArenaErrorResponse>(
        {
          status: 'error',
          code: 'server_error',
          message: 'The season board is unavailable. Try again soon.',
        },
        500
      );
    }
  };

  const seasonBoard: Handler = async (c) => {
    try {
      const dayNumber = await ensureSeasonForRequest();
      const player = await getCurrentPlayer();
      const board = await loadSeasonBoard(storage, dayNumber, player);
      if (!board) {
        return c.json<ArenaErrorResponse>(
          {
            status: 'error',
            code: 'not_found',
            message: 'No Scribbits season is available.',
          },
          404
        );
      }
      return c.json<SeasonBoard>(board);
    } catch (error) {
      console.error('Season board route failed:', error);
      return c.json<ArenaErrorResponse>(
        {
          status: 'error',
          code: 'server_error',
          message: 'The season board is unavailable. Try again soon.',
        },
        500
      );
    }
  };

  return Object.freeze({ season, seasonBoard });
};
