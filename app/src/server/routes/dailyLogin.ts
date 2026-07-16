import type { Context as HonoContext, Handler } from 'hono';
import type {
  ArenaErrorResponse,
  DailyLoginClaimResponse,
} from '../../shared/arena';
import { claimDailyLoginReward } from '../core/dailyLogin';
import { formatUtcDateKey } from '../core/day';
import { getInkBalance } from '../core/inkStore';
import type { CurrentPlayer } from '../core/scribbit';
import type { ArenaStorage } from '../core/storage';

type DailyLoginRouteDependencies = Readonly<{
  storage: ArenaStorage;
  getCurrentPlayer: () => Promise<CurrentPlayer | undefined>;
  getWritableArenaDay: (currentDate: Date) => Promise<number | undefined>;
  now?: () => Date;
}>;

const errorResponse = (
  c: HonoContext,
  status: 401 | 409 | 500,
  code: ArenaErrorResponse['code'],
  message: string
) => c.json<ArenaErrorResponse>({ status: 'error', code, message }, status);

export const createDailyLoginRoute = ({
  storage,
  getCurrentPlayer,
  getWritableArenaDay,
  now = () => new Date(),
}: DailyLoginRouteDependencies): Handler => {
  return async (c) => {
    const player = await getCurrentPlayer();
    if (!player) {
      return errorResponse(
        c,
        401,
        'unauthorized',
        'Sign in to claim your daily login reward.'
      );
    }

    try {
      const currentDate = now();
      const dayNumber = await getWritableArenaDay(currentDate);
      if (!dayNumber) {
        return errorResponse(
          c,
          409,
          'conflict',
          'The Rumble is resolving. Try again in a moment.'
        );
      }
      const claim = await claimDailyLoginReward(storage, {
        userId: player.userId,
        currentDateKey: formatUtcDateKey(currentDate),
        claimedAtMs: currentDate.getTime(),
      });
      return c.json<DailyLoginClaimResponse>({
        dailyLogin: claim.dailyLogin,
        reward: claim.reward,
        ink: await getInkBalance(storage, player.userId),
      });
    } catch (error) {
      console.error('Daily login claim failed:', error);
      return errorResponse(
        c,
        500,
        'server_error',
        'Your daily reward would not open. Try again soon.'
      );
    }
  };
};
