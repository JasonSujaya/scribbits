import type { FreeDrawing } from '../../shared/arena';
import {
  discardWatchedTransaction,
  MAX_WATCH_TRANSACTION_ATTEMPTS,
  type ArenaStorage,
  type ArenaTransaction,
} from './storage';
import { createVersionedJsonCodec } from './versionedJson';

const FREE_DRAWING_SCHEMA_VERSION = 1;
const FREE_DRAWING_DAY_TTL_SECONDS = 8 * 24 * 60 * 60;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const decodeFreeDrawing = (value: unknown): FreeDrawing | undefined => {
  if (!isRecord(value) || value.schemaVersion !== FREE_DRAWING_SCHEMA_VERSION) {
    return undefined;
  }
  if (
    typeof value.id !== 'string' ||
    value.id.length < 4 ||
    typeof value.name !== 'string' ||
    value.name.length < 2 ||
    value.name.length > 24 ||
    typeof value.artist !== 'string' ||
    value.artist.length === 0 ||
    typeof value.imageUrl !== 'string' ||
    value.imageUrl.length === 0 ||
    !Number.isSafeInteger(value.createdDay) ||
    Number(value.createdDay) < 1 ||
    !Number.isSafeInteger(value.createdAtMilliseconds) ||
    Number(value.createdAtMilliseconds) < 0
  ) {
    return undefined;
  }
  return {
    id: value.id,
    name: value.name,
    artist: value.artist,
    imageUrl: value.imageUrl,
    createdDay: Number(value.createdDay),
    createdAtMilliseconds: Number(value.createdAtMilliseconds),
  };
};

const freeDrawingCodec = createVersionedJsonCodec<FreeDrawing>({
  currentVersion: FREE_DRAWING_SCHEMA_VERSION,
  decodeCurrent: decodeFreeDrawing,
  encodeCurrent: (drawing) => ({
    schemaVersion: FREE_DRAWING_SCHEMA_VERSION,
    ...drawing,
  }),
});

export const getFreeDrawingKey = (drawingId: string): string => {
  return `free-drawing:v1:${drawingId}`;
};

export const getFreeDrawingOwnerKey = (drawingId: string): string => {
  return `free-drawing:v1:${drawingId}:owner`;
};

export const getUserFreeDrawingsKey = (userId: string): string => {
  return `user:${userId}:free-drawings:v1`;
};

export const getUserFreeDrawingDayKey = (
  userId: string,
  day: number
): string => {
  return `user:${userId}:free-drawings:v1:day:${day}`;
};

export const loadFreeDrawing = async (
  storage: ArenaStorage,
  drawingId: string
): Promise<FreeDrawing | undefined> => {
  const parsed = freeDrawingCodec.parse(
    await storage.get(getFreeDrawingKey(drawingId))
  );
  return parsed.status === 'valid' ? parsed.value : undefined;
};

export const getFreeDrawingOwner = async (
  storage: ArenaStorage,
  drawingId: string
): Promise<string | undefined> => {
  return await storage.get(getFreeDrawingOwnerKey(drawingId));
};

export const loadFreeDrawingForDay = async (
  storage: ArenaStorage,
  userId: string,
  day: number
): Promise<FreeDrawing | undefined> => {
  if (!Number.isSafeInteger(day) || day < 1) return undefined;
  const drawingId = await storage.get(getUserFreeDrawingDayKey(userId, day));
  if (!drawingId) return undefined;

  const [drawing, owner] = await Promise.all([
    loadFreeDrawing(storage, drawingId),
    getFreeDrawingOwner(storage, drawingId),
  ]);
  if (
    !drawing ||
    owner !== userId ||
    drawing.id !== drawingId ||
    drawing.createdDay !== day
  ) {
    return undefined;
  }
  return drawing;
};

export const hasFreeDrawingForDay = async (
  storage: ArenaStorage,
  userId: string,
  day: number
): Promise<boolean> => {
  return (
    (await storage.get(getUserFreeDrawingDayKey(userId, day))) !== undefined
  );
};

export type SaveFreeDrawingResult =
  | Readonly<{ status: 'saved'; drawing: FreeDrawing }>
  | Readonly<{ status: 'existing'; drawing: FreeDrawing }>
  | Readonly<{ status: 'already-drawn' }>
  | Readonly<{ status: 'id-collision' }>;

const recoverFreeDrawingSave = async (
  storage: ArenaStorage,
  userId: string,
  drawing: FreeDrawing
): Promise<SaveFreeDrawingResult | undefined> => {
  const [storedDrawing, storedOwner, drawingForDay] = await Promise.all([
    loadFreeDrawing(storage, drawing.id),
    getFreeDrawingOwner(storage, drawing.id),
    storage.get(getUserFreeDrawingDayKey(userId, drawing.createdDay)),
  ]);
  if (storedDrawing && storedOwner === userId) {
    return { status: 'existing', drawing: storedDrawing };
  }
  if (storedDrawing || storedOwner) return { status: 'id-collision' };
  if (drawingForDay !== undefined && drawingForDay !== drawing.id) {
    return { status: 'already-drawn' };
  }
  return undefined;
};

export const saveFreeDrawing = async (
  storage: ArenaStorage,
  userId: string,
  drawing: FreeDrawing
): Promise<SaveFreeDrawingResult> => {
  if (!storage.watch) {
    throw new Error('Atomic Free Draw storage requires transaction support.');
  }
  const drawingKey = getFreeDrawingKey(drawing.id);
  const ownerKey = getFreeDrawingOwnerKey(drawing.id);
  const userIndexKey = getUserFreeDrawingsKey(userId);
  const dayKey = getUserFreeDrawingDayKey(userId, drawing.createdDay);

  for (
    let attempt = 0;
    attempt < MAX_WATCH_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    let transaction: ArenaTransaction | undefined;
    try {
      transaction = await storage.watch(
        drawingKey,
        ownerKey,
        userIndexKey,
        dayKey
      );
      const recovered = await recoverFreeDrawingSave(storage, userId, drawing);
      if (recovered) {
        await transaction.unwatch();
        return recovered;
      }

      await transaction.multi();
      await transaction.set(drawingKey, freeDrawingCodec.serialize(drawing));
      await transaction.set(ownerKey, userId);
      await transaction.zAdd(userIndexKey, {
        member: drawing.id,
        score: drawing.createdAtMilliseconds,
      });
      await transaction.set(dayKey, drawing.id);
      await transaction.expire(dayKey, FREE_DRAWING_DAY_TTL_SECONDS);
      const result = await transaction.exec();
      if (Array.isArray(result) && result.length >= 5) {
        return { status: 'saved', drawing };
      }
    } catch (error) {
      await discardWatchedTransaction(transaction, 'Free Draw save');
      const recovered = await recoverFreeDrawingSave(storage, userId, drawing);
      if (recovered) return recovered;
      throw error;
    }
  }
  throw new Error('Free Draw storage changed too often to save safely.');
};

export const deleteFreeDrawingsForUser = async (
  storage: ArenaStorage,
  userId: string
): Promise<number> => {
  const userIndexKey = getUserFreeDrawingsKey(userId);
  const entries = await storage.zRange(userIndexKey, 0, -1, { by: 'rank' });
  const drawings = await Promise.all(
    entries.map(({ member }) => loadFreeDrawing(storage, member))
  );
  const keys = entries.flatMap(({ member }) => [
    getFreeDrawingKey(member),
    getFreeDrawingOwnerKey(member),
  ]);
  const dayKeys = drawings.flatMap((drawing) =>
    drawing ? [getUserFreeDrawingDayKey(userId, drawing.createdDay)] : []
  );
  await storage.del(userIndexKey, ...keys, ...dayKeys);
  return entries.length;
};
