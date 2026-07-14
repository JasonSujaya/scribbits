import type { Scribbit } from '../../shared/arena';

const MINUTE_MILLISECONDS = 60 * 1_000;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 24 * HOUR_MINUTES;
const DAY_MILLISECONDS = DAY_MINUTES * MINUTE_MILLISECONDS;

export const maturityDeadlineMilliseconds = (
  scribbit: Pick<Scribbit, 'expiresDay'>,
  currentArenaDay: number,
  nextArenaDayStartsAt: number
): number => {
  const fullDaysAfterNextArenaDay = Math.max(
    0,
    scribbit.expiresDay - currentArenaDay - 1
  );
  return nextArenaDayStartsAt + fullDaysAfterNextArenaDay * DAY_MILLISECONDS;
};

export const maturityCountdownHeadline = (
  scribbit: Pick<Scribbit, 'expiresDay'>,
  currentArenaDay: number,
  nextArenaDayStartsAt: number,
  nowMilliseconds: number = Date.now()
): string => {
  if (scribbit.expiresDay <= currentArenaDay) {
    return 'MATURE • STATS LOCKED';
  }

  const remainingMilliseconds =
    maturityDeadlineMilliseconds(
      scribbit,
      currentArenaDay,
      nextArenaDayStartsAt
    ) - nowMilliseconds;
  if (remainingMilliseconds <= 0) return 'MATURE • STATS LOCKED';

  const totalMinutes = Math.max(
    1,
    Math.ceil(remainingMilliseconds / MINUTE_MILLISECONDS)
  );
  const days = Math.floor(totalMinutes / DAY_MINUTES);
  const hours = Math.floor((totalMinutes % DAY_MINUTES) / HOUR_MINUTES);
  const minutes = totalMinutes % HOUR_MINUTES;
  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  return `MATURES IN ${days}D ${paddedHours}H ${paddedMinutes}M`;
};
