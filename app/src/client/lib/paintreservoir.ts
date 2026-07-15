export type PaintReservoir = Readonly<{
  capacity: number;
  remaining: number;
}>;

export type PaintUseResult = Readonly<{
  accepted: boolean;
  reservoir: PaintReservoir;
}>;

const normalizeCapacity = (capacity: number): number => {
  return Number.isSafeInteger(capacity) && capacity > 0 ? capacity : 1;
};

export const createPaintReservoir = (capacity: number): PaintReservoir => {
  const normalizedCapacity = normalizeCapacity(capacity);
  return Object.freeze({
    capacity: normalizedCapacity,
    remaining: normalizedCapacity,
  });
};

export const tryUsePaint = (
  reservoir: PaintReservoir,
  requestedAmount: number
): PaintUseResult => {
  if (!Number.isFinite(requestedAmount)) {
    return Object.freeze({ accepted: false, reservoir });
  }
  const amount = Math.ceil(requestedAmount);
  if (amount <= 0) {
    return Object.freeze({ accepted: true, reservoir });
  }
  if (!Number.isSafeInteger(amount)) {
    return Object.freeze({ accepted: false, reservoir });
  }
  if (amount > reservoir.remaining) {
    return Object.freeze({ accepted: false, reservoir });
  }
  return Object.freeze({
    accepted: true,
    reservoir: Object.freeze({
      capacity: reservoir.capacity,
      remaining: reservoir.remaining - amount,
    }),
  });
};

export const returnPaint = (
  reservoir: PaintReservoir,
  returnedAmount: number
): PaintReservoir => {
  if (!Number.isFinite(returnedAmount)) return reservoir;
  const amount = Math.ceil(returnedAmount);
  if (amount <= 0 || !Number.isSafeInteger(amount)) return reservoir;
  const remaining = Math.min(reservoir.capacity, reservoir.remaining + amount);
  if (remaining === reservoir.remaining) return reservoir;
  return Object.freeze({ capacity: reservoir.capacity, remaining });
};

export const paintRemainingPercent = (reservoir: PaintReservoir): number => {
  return Math.round((reservoir.remaining / reservoir.capacity) * 100);
};
