import type { FixedVector } from './types';

export const DIRECTION_SCALE = 1_024;

export function clampInteger(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

/** Rounds halves away from zero and requires a positive integer divisor. */
export function divideRounded(numerator: number, divisor: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(divisor)) {
    throw new Error('Fixed-point division requires safe integers.');
  }
  if (divisor <= 0) {
    throw new Error('Fixed-point division requires a positive divisor.');
  }

  const sign = numerator < 0 ? -1 : 1;
  const magnitude = Math.abs(numerator);
  return sign * Math.floor((magnitude + Math.floor(divisor / 2)) / divisor);
}

/**
 * Integer square root: the largest integer whose square is no greater than the
 * input. Binary search avoids floating-point positions entering the state.
 */
export function integerSquareRoot(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Integer square root requires a non-negative safe integer.');
  }
  if (value < 2) {
    return value;
  }

  let lower = 1;
  let upper = Math.min(value, 94_906_265);
  let answer = 1;

  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2);
    const square = middle * middle;
    if (square === value) {
      return middle;
    }
    if (square < value) {
      answer = middle;
      lower = middle + 1;
    } else {
      upper = middle - 1;
    }
  }

  return answer;
}

export function squaredDistance(
  first: FixedVector,
  second: FixedVector
): number {
  const x = first.x - second.x;
  const y = first.y - second.y;
  return x * x + y * y;
}

export function vectorLength(vector: FixedVector): number {
  return integerSquareRoot(vector.x * vector.x + vector.y * vector.y);
}

export function normalizeVector(
  vector: FixedVector,
  requestedLength: number,
  fallback: FixedVector = { x: DIRECTION_SCALE, y: 0 }
): FixedVector {
  const length = vectorLength(vector);
  if (length === 0) {
    const fallbackLength = Math.max(1, vectorLength(fallback));
    return Object.freeze({
      x: divideRounded(fallback.x * requestedLength, fallbackLength),
      y: divideRounded(fallback.y * requestedLength, fallbackLength),
    });
  }

  return Object.freeze({
    x: divideRounded(vector.x * requestedLength, length),
    y: divideRounded(vector.y * requestedLength, length),
  });
}

export function clampVectorComponents(
  vector: FixedVector,
  maximumMagnitudePerAxis: number
): FixedVector {
  return Object.freeze({
    x: clampInteger(
      vector.x,
      -maximumMagnitudePerAxis,
      maximumMagnitudePerAxis
    ),
    y: clampInteger(
      vector.y,
      -maximumMagnitudePerAxis,
      maximumMagnitudePerAxis
    ),
  });
}

export function circlesOverlap(
  firstCenter: FixedVector,
  firstRadius: number,
  secondCenter: FixedVector,
  secondRadius: number
): boolean {
  const combinedRadius = firstRadius + secondRadius;
  return squaredDistance(firstCenter, secondCenter) <= combinedRadius ** 2;
}

export function expandingRingIntersectsCircle(
  ringCenter: FixedVector,
  ringOuterRadius: number,
  ringThickness: number,
  circleCenter: FixedVector,
  circleRadius: number
): boolean {
  const distance = integerSquareRoot(squaredDistance(ringCenter, circleCenter));
  const innerRadius = Math.max(0, ringOuterRadius - ringThickness);
  return (
    distance - circleRadius <= ringOuterRadius &&
    distance + circleRadius >= innerRadius
  );
}

/**
 * Integer cone test. The direction normally has DIRECTION_SCALE length. The
 * cosine is expressed in permille (819 is approximately cos(35 degrees)).
 */
export function circleCenterIsInsideCone(
  coneOrigin: FixedVector,
  coneDirection: FixedVector,
  coneRange: number,
  coneHalfAngleCosinePermille: number,
  circleCenter: FixedVector,
  circleRadius: number
): boolean {
  const relative = {
    x: circleCenter.x - coneOrigin.x,
    y: circleCenter.y - coneOrigin.y,
  };
  const distance = vectorLength(relative);
  if (distance > coneRange + circleRadius) {
    return false;
  }
  if (distance === 0) {
    return true;
  }

  const directionLength = Math.max(1, vectorLength(coneDirection));
  const forwardDot =
    relative.x * coneDirection.x + relative.y * coneDirection.y;
  if (forwardDot <= 0) {
    return false;
  }

  return (
    forwardDot * 1_000 >=
    distance * directionLength * coneHalfAngleCosinePermille
  );
}

export function midpoint(first: FixedVector, second: FixedVector): FixedVector {
  return Object.freeze({
    x: divideRounded(first.x + second.x, 2),
    y: divideRounded(first.y + second.y, 2),
  });
}

export function isFixedVector(value: FixedVector): boolean {
  return Number.isSafeInteger(value.x) && Number.isSafeInteger(value.y);
}
