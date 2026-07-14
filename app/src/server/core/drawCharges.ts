import {
  DRAW_CHARGE_CAPACITY,
  DRAW_CHARGE_REFILL_INTERVAL_MS,
  type DrawChargeState,
} from '../../shared/arena';
import type { ArenaStorage } from './storage';

const availableField = 'available';
const refillAnchorField = 'refill-anchor-ms';

export type DrawChargeRecord = Readonly<{
  available: number;
  refillAnchorAt: number;
}>;

export type DrawChargeProjection = Readonly<{
  state: DrawChargeState;
  record: DrawChargeRecord;
}>;

export type DrawChargeConsumptionPlan =
  | Readonly<{
      status: 'consumed';
      state: DrawChargeState;
      record: DrawChargeRecord;
    }>
  | Readonly<{
      status: 'unavailable';
      state: DrawChargeState;
      record: DrawChargeRecord;
    }>;

const requireTimestamp = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer timestamp.`);
  }
};

const requireRecord = (record: DrawChargeRecord): void => {
  if (
    !Number.isSafeInteger(record.available) ||
    record.available < 0 ||
    record.available > DRAW_CHARGE_CAPACITY
  ) {
    throw new Error('Stored Draw Charge count is invalid.');
  }
  requireTimestamp(record.refillAnchorAt, 'Stored Draw Charge refill anchor');
};

const createState = (record: DrawChargeRecord): DrawChargeState => ({
  available: record.available,
  capacity: DRAW_CHARGE_CAPACITY,
  nextRefreshAt:
    record.available >= DRAW_CHARGE_CAPACITY
      ? null
      : record.refillAnchorAt + DRAW_CHARGE_REFILL_INTERVAL_MS,
});

const parseStoredRecord = (
  stored: Readonly<Record<string, string>>,
  nowMilliseconds: number
): DrawChargeRecord => {
  if (Object.keys(stored).length === 0) {
    return {
      available: DRAW_CHARGE_CAPACITY,
      refillAnchorAt: nowMilliseconds,
    };
  }

  const available = Number(stored[availableField]);
  const refillAnchorAt = Number(stored[refillAnchorField]);
  const record = { available, refillAnchorAt };
  requireRecord(record);
  return record;
};

export const getDrawChargeKey = (userId: string): string => {
  return `user:${userId}:draw-charges:v1`;
};

export const getDrawChargeRecordFields = (
  record: DrawChargeRecord
): Record<string, string> => {
  requireRecord(record);
  return {
    [availableField]: record.available.toString(),
    [refillAnchorField]: record.refillAnchorAt.toString(),
  };
};

export const projectDrawCharges = (
  record: DrawChargeRecord | undefined,
  nowMilliseconds: number
): DrawChargeProjection => {
  requireTimestamp(nowMilliseconds, 'Draw Charge projection time');
  const currentRecord = record ?? {
    available: DRAW_CHARGE_CAPACITY,
    refillAnchorAt: nowMilliseconds,
  };
  requireRecord(currentRecord);

  if (
    currentRecord.available >= DRAW_CHARGE_CAPACITY ||
    nowMilliseconds <= currentRecord.refillAnchorAt
  ) {
    return {
      record: currentRecord,
      state: createState(currentRecord),
    };
  }

  const elapsedMilliseconds = nowMilliseconds - currentRecord.refillAnchorAt;
  const elapsedIntervals = Math.floor(
    elapsedMilliseconds / DRAW_CHARGE_REFILL_INTERVAL_MS
  );
  if (elapsedIntervals === 0) {
    return {
      record: currentRecord,
      state: createState(currentRecord),
    };
  }

  const restoredCharges = Math.min(
    elapsedIntervals,
    DRAW_CHARGE_CAPACITY - currentRecord.available
  );
  const projectedRecord = {
    available: currentRecord.available + restoredCharges,
    refillAnchorAt:
      currentRecord.refillAnchorAt +
      restoredCharges * DRAW_CHARGE_REFILL_INTERVAL_MS,
  };
  return {
    record: projectedRecord,
    state: createState(projectedRecord),
  };
};

export const loadDrawCharges = async (
  storage: ArenaStorage,
  userId: string,
  nowMilliseconds: number
): Promise<DrawChargeProjection> => {
  requireTimestamp(nowMilliseconds, 'Draw Charge load time');
  const stored = await storage.hGetAll(getDrawChargeKey(userId));
  return projectDrawCharges(
    parseStoredRecord(stored, nowMilliseconds),
    nowMilliseconds
  );
};

export const planDrawChargeConsumption = (
  record: DrawChargeRecord | undefined,
  nowMilliseconds: number
): DrawChargeConsumptionPlan => {
  const projected = projectDrawCharges(record, nowMilliseconds);
  if (projected.record.available === 0) {
    return { status: 'unavailable', ...projected };
  }

  const consumedRecord = {
    available: projected.record.available - 1,
    // A full meter never banks refill time. Its next eight-hour interval starts
    // when the player spends a charge.
    refillAnchorAt:
      projected.record.available === DRAW_CHARGE_CAPACITY
        ? nowMilliseconds
        : projected.record.refillAnchorAt,
  };
  return {
    status: 'consumed',
    record: consumedRecord,
    state: createState(consumedRecord),
  };
};
