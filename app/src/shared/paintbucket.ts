export const DEFAULT_PAINT_BUCKET_LEVEL = 1 as const;

export const PAINT_BUCKET_LEVELS = Object.freeze([
  Object.freeze({ level: 1, capacity: 60_000 }),
  Object.freeze({ level: 2, capacity: 85_000 }),
  Object.freeze({ level: 3, capacity: 120_000 }),
  Object.freeze({ level: 4, capacity: 170_000 }),
] as const);

export type PaintBucketLevel =
  (typeof PAINT_BUCKET_LEVELS)[number]['level'];

export type PaintBucketState = Readonly<{
  level: PaintBucketLevel;
  capacity: number;
}>;

export const isPaintBucketLevel = (
  value: number
): value is PaintBucketLevel => {
  return PAINT_BUCKET_LEVELS.some(({ level }) => level === value);
};

export const getPaintBucketState = (
  level: number = DEFAULT_PAINT_BUCKET_LEVEL
): PaintBucketState => {
  const resolvedLevel = isPaintBucketLevel(level)
    ? level
    : DEFAULT_PAINT_BUCKET_LEVEL;
  const definition = PAINT_BUCKET_LEVELS.find(
    (candidate) => candidate.level === resolvedLevel
  );
  if (!definition) {
    throw new Error('Default Paint Bucket level is not configured.');
  }
  return Object.freeze({
    level: definition.level,
    capacity: definition.capacity,
  });
};
