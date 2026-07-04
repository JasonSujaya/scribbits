import type { DesignSubmission } from '../../shared/remonsta';
import { formatUtcDateKey, getUtcDayStartMs } from './spawnEngine';

export type DesignSubmissionDraft = {
  name: string;
  lore: string;
  imageUrl: string;
};

export type StoredDesignSubmission = DesignSubmission & {
  weekKey: string;
  submittedAt: number;
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const getDesignWeekKey = (date: Date): string => {
  const dayOfWeek = date.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const weekStartMs =
    getUtcDayStartMs(date) - daysSinceMonday * millisecondsPerDay;
  return formatUtcDateKey(new Date(weekStartMs));
};

export const getDesignWeekRedisKey = (weekKey: string): string => {
  return `design-week:${weekKey}`;
};

export const getDesignRedisKey = (designId: string): string => {
  return `design:${designId}`;
};

export const getDesignVotersRedisKey = (designId: string): string => {
  return `design-voters:${designId}`;
};

export const validateDesignSubmissionDraft = (
  value: unknown
): DesignSubmissionDraft | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const { name, lore, imageUrl } = value;
  if (
    typeof name !== 'string' ||
    typeof lore !== 'string' ||
    typeof imageUrl !== 'string'
  ) {
    return undefined;
  }

  const trimmedName = name.trim();
  const trimmedLore = lore.trim();
  const trimmedImageUrl = imageUrl.trim();

  if (
    trimmedName.length < 1 ||
    trimmedName.length > 40 ||
    trimmedLore.length < 1 ||
    trimmedLore.length > 160 ||
    trimmedImageUrl.length > 500
  ) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(trimmedImageUrl);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return {
    name: trimmedName,
    lore: trimmedLore,
    imageUrl: trimmedImageUrl,
  };
};

export const validateDesignVoteId = (value: unknown): string | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return undefined;
  }

  const designId = value.id.trim();
  if (!/^[a-z0-9-]{10,80}$/.test(designId)) {
    return undefined;
  }

  return designId;
};

export const isStoredDesignSubmission = (
  value: unknown
): value is StoredDesignSubmission => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.artist === 'string' &&
    typeof value.lore === 'string' &&
    typeof value.imageUrl === 'string' &&
    typeof value.votes === 'number' &&
    typeof value.weekKey === 'string' &&
    typeof value.submittedAt === 'number'
  );
};

export const parseStoredDesignSubmission = (
  storedDesign: string | undefined
): StoredDesignSubmission | undefined => {
  if (storedDesign === undefined) {
    return undefined;
  }

  try {
    const parsedDesign: unknown = JSON.parse(storedDesign);
    if (isStoredDesignSubmission(parsedDesign)) {
      return parsedDesign;
    }
  } catch (error) {
    console.error('Failed to parse stored design submission:', error);
  }

  return undefined;
};

export const toPublicDesignSubmission = (
  storedDesign: StoredDesignSubmission,
  votes: number
): DesignSubmission => {
  return {
    id: storedDesign.id,
    name: storedDesign.name,
    artist: storedDesign.artist,
    lore: storedDesign.lore,
    imageUrl: storedDesign.imageUrl,
    votes,
  };
};
