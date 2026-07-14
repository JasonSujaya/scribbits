import {
  DEFAULT_PAINT_BUCKET_LEVEL,
  getPaintBucketState,
  isPaintBucketLevel,
  type PaintBucketState,
} from '../../shared/paintbucket';
import type { ArenaStorage } from './storage';

export const getPaintBucketKey = (userId: string): string => {
  return `user:${userId}:paint-bucket:v1`;
};

export const loadPaintBucket = async (
  storage: ArenaStorage,
  userId: string
): Promise<PaintBucketState> => {
  const storedLevel = Number(await storage.get(getPaintBucketKey(userId)));
  return getPaintBucketState(
    isPaintBucketLevel(storedLevel)
      ? storedLevel
      : DEFAULT_PAINT_BUCKET_LEVEL
  );
};
