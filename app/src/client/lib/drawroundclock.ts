export const DRAW_ROUND_SECONDS = 60;
export const DRAW_ROUND_WARNING_SECONDS = 10;
export const DRAW_TIMER_SOUND_INTERVAL_SECONDS = 5;
export const DRAW_TIMER_CRITICAL_SOUND_SECONDS = 5;

const DRAW_ROUND_DURATION_MILLISECONDS = DRAW_ROUND_SECONDS * 1_000;

export type DrawRoundClock = Readonly<{
  started: boolean;
  deadlineMilliseconds: number | null;
  remainingMilliseconds: number;
  expired: boolean;
}>;

export type DrawRoundSnapshot = Readonly<{
  started: boolean;
  running: boolean;
  remainingSeconds: number;
  urgent: boolean;
  expired: boolean;
}>;

export type DrawRoundUrgencyMotion = Readonly<{
  intervalMilliseconds: number;
  angleDegrees: number;
  scale: number;
}>;

export type DrawTimerSfxCue = 'draw.timer' | 'draw.tick';

export function getDrawTimerSfxCue(
  remainingSeconds: number
): DrawTimerSfxCue | null {
  const wholeSeconds = Math.floor(remainingSeconds);
  if (wholeSeconds <= 0) return null;
  if (wholeSeconds <= DRAW_TIMER_CRITICAL_SOUND_SECONDS) return 'draw.tick';
  return wholeSeconds % DRAW_TIMER_SOUND_INTERVAL_SECONDS === 0
    ? 'draw.timer'
    : null;
}

export function createDrawRoundClock(): DrawRoundClock {
  return {
    started: false,
    deadlineMilliseconds: null,
    remainingMilliseconds: DRAW_ROUND_DURATION_MILLISECONDS,
    expired: false,
  };
}

export function startDrawRoundClock(
  clock: DrawRoundClock,
  nowMilliseconds: number
): DrawRoundClock {
  if (clock.expired || clock.deadlineMilliseconds !== null) return clock;
  return {
    ...clock,
    started: true,
    deadlineMilliseconds: nowMilliseconds + clock.remainingMilliseconds,
  };
}

export function pauseDrawRoundClock(
  clock: DrawRoundClock,
  nowMilliseconds: number
): DrawRoundClock {
  if (clock.deadlineMilliseconds === null) return clock;
  const remainingMilliseconds = Math.max(
    0,
    clock.deadlineMilliseconds - nowMilliseconds
  );
  return {
    started: clock.started,
    deadlineMilliseconds: null,
    remainingMilliseconds,
    expired: remainingMilliseconds === 0,
  };
}

export function expireDrawRoundClock(clock: DrawRoundClock): DrawRoundClock {
  return {
    started: clock.started,
    deadlineMilliseconds: null,
    remainingMilliseconds: 0,
    expired: true,
  };
}

export function readDrawRoundClock(
  clock: DrawRoundClock,
  nowMilliseconds: number
): DrawRoundSnapshot {
  const remainingMilliseconds = clock.expired
    ? 0
    : clock.deadlineMilliseconds === null
      ? clock.remainingMilliseconds
      : Math.max(0, clock.deadlineMilliseconds - nowMilliseconds);
  const remainingSeconds = Math.ceil(remainingMilliseconds / 1_000);
  const expired = clock.expired || remainingMilliseconds === 0;
  return {
    started: clock.started,
    running: clock.deadlineMilliseconds !== null && !expired,
    remainingSeconds,
    urgent:
      clock.started &&
      !expired &&
      remainingSeconds <= DRAW_ROUND_WARNING_SECONDS,
    expired,
  };
}

export function getDrawRoundUrgencyMotion(
  remainingSeconds: number
): DrawRoundUrgencyMotion | null {
  if (remainingSeconds <= 0 || remainingSeconds > DRAW_ROUND_WARNING_SECONDS) {
    return null;
  }
  const urgency =
    (DRAW_ROUND_WARNING_SECONDS - remainingSeconds + 1) /
    DRAW_ROUND_WARNING_SECONDS;
  return {
    intervalMilliseconds:
      remainingSeconds <= 3 ? 180 : remainingSeconds <= 6 ? 360 : 700,
    angleDegrees: Math.round((1.5 + urgency * 4) * 10) / 10,
    scale: Math.round((1.03 + urgency * 0.06) * 1_000) / 1_000,
  };
}
