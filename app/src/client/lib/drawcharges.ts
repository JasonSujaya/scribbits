import type { DrawChargeState } from '../../shared/arena';

const MINUTE_MILLISECONDS = 60 * 1_000;
const HOUR_MINUTES = 60;

const normalizedChargeCount = (
  chargeState: Pick<DrawChargeState, 'available' | 'capacity'>
): number => {
  const capacity = Math.max(0, Math.floor(chargeState.capacity));
  return Math.min(capacity, Math.max(0, Math.floor(chargeState.available)));
};

export const formatDrawChargeCountdown = (
  nextRefreshAt: number | null,
  nowMilliseconds: number = Date.now()
): string => {
  if (nextRefreshAt === null || nextRefreshAt <= nowMilliseconds) {
    return 'READY';
  }

  const totalMinutes = Math.max(
    1,
    Math.ceil((nextRefreshAt - nowMilliseconds) / MINUTE_MILLISECONDS)
  );
  const hours = Math.floor(totalMinutes / HOUR_MINUTES);
  const minutes = totalMinutes % HOUR_MINUTES;
  if (hours === 0) return `${minutes}M`;
  return `${hours}H ${minutes.toString().padStart(2, '0')}M`;
};

export const drawChargeCountLabel = (
  chargeState: Pick<DrawChargeState, 'available' | 'capacity'>
): string => {
  const capacity = Math.max(0, Math.floor(chargeState.capacity));
  return `${normalizedChargeCount(chargeState)}/${capacity}`;
};

export const drawChargeRefreshLabel = (
  chargeState: DrawChargeState,
  nowMilliseconds: number = Date.now()
): string => {
  const capacity = Math.max(0, Math.floor(chargeState.capacity));
  if (capacity === 0) return 'UNAVAILABLE';
  if (normalizedChargeCount(chargeState) >= capacity) return 'FULL';
  if (
    chargeState.nextRefreshAt === null ||
    chargeState.nextRefreshAt <= nowMilliseconds
  ) {
    return '+1 READY';
  }
  return `+1 IN ${formatDrawChargeCountdown(
    chargeState.nextRefreshAt,
    nowMilliseconds
  )}`;
};
