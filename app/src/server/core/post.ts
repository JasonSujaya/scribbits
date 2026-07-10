import { reddit } from '@devvit/web/server';
import { T3 } from '@devvit/web/shared';
import type { Forecast, Scribbit } from '../../shared/arena';
import { formatUtcDateKey, getArenaDayNumber } from './day';
import { getArenaPostKey } from './arenaStore';
import type { ArenaStorage } from './scribbit';
import {
  formatRumbleResultComment,
  type RumbleResultSummary,
} from './resultComment';

export type CreateArenaPostOptions = {
  date?: Date;
  day?: number;
  forecast: Forecast;
  champion?: Scribbit | null;
};

const getChampionCopy = (champion: Scribbit | null | undefined): string => {
  if (!champion) {
    return 'No reigning Champion yet. The founding Scribbits are warming up.';
  }

  return `Current boss: ${champion.name}, ${champion.legendTitle ?? 'arena menace'} (${champion.element}).`;
};

export const createPost = async (options: CreateArenaPostOptions) => {
  const date = options.date ?? new Date();
  const dateKey = formatUtcDateKey(date);
  const dayNumber = options.day ?? getArenaDayNumber(date);

  return await reddit.submitCustomPost({
    title: `Rumble #${dayNumber} — ${options.forecast.blurb}`,
    entry: 'default',
    postData: {
      dateKey,
      dayNumber,
      forecast: options.forecast,
      champion: options.champion
        ? {
            name: options.champion.name,
            element: options.champion.element,
            legendTitle: options.champion.legendTitle,
          }
        : null,
    },
    textFallback: {
      text: `Scribbits Arena Rumble #${dayNumber}. ${options.forecast.blurb}. ${getChampionCopy(options.champion)}`,
    },
  });
};

export const getOrCreateArenaPost = async (
  storage: ArenaStorage,
  options: CreateArenaPostOptions
): Promise<{ id: string }> => {
  const day = options.day ?? getArenaDayNumber(options.date ?? new Date());
  const postKey = getArenaPostKey(day);
  const postClaimKey = 'arena:post-publishing-claims';
  const claimField = day.toString();
  const claimTimeoutMs = 5 * 60 * 1000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existingPostId = await storage.get(postKey);
    if (existingPostId) return { id: existingPostId };

    const nowMs = Date.now();
    const existingClaim = Number(
      await storage.hGet(postClaimKey, claimField)
    );
    if (Number.isFinite(existingClaim)) {
      if (nowMs - existingClaim < claimTimeoutMs) {
        throw new Error(`Arena post for day ${day} is already being published.`);
      }
      await storage.hDel(postClaimKey, [claimField]);
    }

    const claimed = await storage.hSetNX(
      postClaimKey,
      claimField,
      nowMs.toString()
    );
    if (claimed !== 1) continue;

    try {
      const post = await createPost({ ...options, day });
      await storage.set(postKey, post.id);
      await storage.hDel(postClaimKey, [claimField]);
      return post;
    } catch (error) {
      await storage.hDel(postClaimKey, [claimField]);
      throw error;
    }
  }

  const publishedPostId = await storage.get(postKey);
  if (publishedPostId) return { id: publishedPostId };
  throw new Error(`Arena post for day ${day} could not claim publication.`);
};

const resultCommentHashKey = 'arena:result-comments';
const publishingMarkerPrefix = 'publishing:';
const publishingClaimTimeoutMs = 5 * 60 * 1000;

export const publishRumbleResultComment = async (
  storage: ArenaStorage,
  summary: RumbleResultSummary
): Promise<string | null> => {
  const postId = await storage.get(getArenaPostKey(summary.resolvedDay));
  if (!postId) return null;

  const resultDay = String(summary.resolvedDay);
  const existingCommentId = await storage.hGet(
    resultCommentHashKey,
    resultDay
  );
  if (existingCommentId) {
    if (!existingCommentId.startsWith(publishingMarkerPrefix)) {
      return existingCommentId;
    }
    const claimedAtMs = Number(existingCommentId.slice(publishingMarkerPrefix.length));
    if (Number.isFinite(claimedAtMs) && Date.now() - claimedAtMs < publishingClaimTimeoutMs) {
      return null;
    }
    await storage.hDel(resultCommentHashKey, [resultDay]);
  }

  const publishingMarker = `${publishingMarkerPrefix}${Date.now()}`;

  const claimed = await storage.hSetNX(
    resultCommentHashKey,
    resultDay,
    publishingMarker
  );
  if (claimed !== 1) return null;

  try {
    const comment = await reddit.submitComment({
      id: T3(postId),
      text: formatRumbleResultComment(summary),
      runAs: 'APP',
    });
    await storage.hSet(resultCommentHashKey, {
      [resultDay]: comment.id,
    });
    // The result receipt also carries tonight's forecast, so keep it at the
    // top of the daily thread when the installation has moderator permission.
    // Publishing is already durably recorded above: a missing moderation
    // permission must never turn this into a duplicate-comment retry.
    try {
      await comment.distinguish(true);
    } catch (error) {
      console.warn('Rumble result comment could not be pinned:', error);
    }
    return comment.id;
  } catch (error) {
    await storage.hDel(resultCommentHashKey, [resultDay]);
    throw error;
  }
};
