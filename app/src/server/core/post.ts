import { context, reddit } from '@devvit/web/server';
import { T3 } from '@devvit/web/shared';
import type { Forecast, Scribbit } from '../../shared/arena';
import { formatUtcDateKey, getArenaDayNumber } from './day';
import {
  ensureCurrentArenaDay,
  ensureForecastForDay,
  getArenaPostKey,
  getCurrentChampion,
} from './arenaStore';
import { replaceHashFieldIfEqual, type ArenaStorage } from './storage';
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

const createPost = async (options: CreateArenaPostOptions) => {
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
  const publishedMarkerPrefix = 'published:';

  const recoverPublishedPost = async (): Promise<{ id: string } | null> => {
    const recentPosts = await reddit
      .getNewPosts({
        subredditName: context.subredditName,
        limit: 100,
        pageSize: 100,
      })
      .all();
    const titlePrefix = `Rumble #${day} —`;
    for (const recentPost of recentPosts) {
      if (!recentPost.title.startsWith(titlePrefix)) continue;
      const postData = await recentPost.getPostData();
      if (postData?.dayNumber === day) return { id: recentPost.id };
    }
    return null;
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existingPostId = await storage.get(postKey);
    if (existingPostId) return { id: existingPostId };

    const nowMs = Date.now();
    const existingClaim = await storage.hGet(postClaimKey, claimField);
    if (existingClaim?.startsWith(publishedMarkerPrefix)) {
      const recoveredPostId = existingClaim.slice(publishedMarkerPrefix.length);
      if (recoveredPostId) {
        await storage.set(postKey, recoveredPostId);
        await storage.hDel(postClaimKey, [claimField]);
        return { id: recoveredPostId };
      }
    }

    const recoveredPost = await recoverPublishedPost();
    if (recoveredPost) {
      await storage.set(postKey, recoveredPost.id);
      await storage.hDel(postClaimKey, [claimField]);
      return recoveredPost;
    }

    const claimedAtMs = Number(existingClaim);
    if (Number.isFinite(claimedAtMs)) {
      if (nowMs - claimedAtMs < claimTimeoutMs) {
        throw new Error(
          `Arena post for day ${day} is already being published.`
        );
      }
      await storage.hDel(postClaimKey, [claimField]);
    }

    const claimed = await storage.hSetNX(
      postClaimKey,
      claimField,
      nowMs.toString()
    );
    if (claimed !== 1) continue;

    // Any failure below intentionally leaves the claim. Reddit submission may
    // have committed even when this request or its Redis receipt failed; the
    // next attempt reconciles by marker or postData before it may publish again.
    const post = await createPost({ ...options, day });
    await storage.hSet(postClaimKey, {
      [claimField]: `${publishedMarkerPrefix}${post.id}`,
    });
    await storage.set(postKey, post.id);
    await storage.hDel(postClaimKey, [claimField]);
    return post;
  }

  const publishedPostId = await storage.get(postKey);
  if (publishedPostId) return { id: publishedPostId };
  throw new Error(`Arena post for day ${day} could not claim publication.`);
};

export const ensureCurrentArenaPost = async (
  storage: ArenaStorage,
  now: Date
): Promise<{ id: string }> => {
  const day = await ensureCurrentArenaDay(storage, now);
  const forecast = await ensureForecastForDay(storage, day);
  const champion = await getCurrentChampion(storage);
  return getOrCreateArenaPost(storage, {
    date: now,
    day,
    forecast,
    champion,
  });
};

const resultCommentHashKey = 'arena:result-comments';
const claimingMarkerPrefix = 'claiming:';
const submittingMarkerPrefix = 'submitting:';
const legacyPublishingMarkerPrefix = 'publishing:';
const publishingClaimTimeoutMs = 5 * 60 * 1000;

export const publishRumbleResultComment = async (
  storage: ArenaStorage,
  summary: RumbleResultSummary
): Promise<string | null> => {
  const postId = await storage.get(getArenaPostKey(summary.resolvedDay));
  if (!postId) return null;

  const resultDay = String(summary.resolvedDay);
  const resultText = formatRumbleResultComment(summary);
  const recoverPublishedComment = async (): Promise<string | null> => {
    const comments = await reddit
      .getComments({
        postId: T3(postId),
        limit: 1000,
        pageSize: 100,
        sort: 'new',
      })
      .all();
    return comments.find((comment) => comment.body === resultText)?.id ?? null;
  };
  let claimingMarker: string | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existingCommentId = await storage.hGet(
      resultCommentHashKey,
      resultDay
    );
    if (existingCommentId) {
      const isClaiming = existingCommentId.startsWith(claimingMarkerPrefix);
      const isSubmitting =
        existingCommentId.startsWith(submittingMarkerPrefix) ||
        existingCommentId.startsWith(legacyPublishingMarkerPrefix);
      if (!isClaiming && !isSubmitting) return existingCommentId;

      const recoveredCommentId = await recoverPublishedComment();
      if (recoveredCommentId) {
        await storage.hSet(resultCommentHashKey, {
          [resultDay]: recoveredCommentId,
        });
        return recoveredCommentId;
      }

      // Once external submission may have started, never auto-expire the
      // marker. At-most-once publication is safer than a duplicate result;
      // reconciliation or an explicit operator repair restores liveness.
      if (isSubmitting) return null;

      const claimedAtMs = Number(
        existingCommentId.slice(claimingMarkerPrefix.length)
      );
      if (
        Number.isFinite(claimedAtMs) &&
        Date.now() - claimedAtMs < publishingClaimTimeoutMs
      ) {
        return null;
      }

      const replacement = `${claimingMarkerPrefix}${Date.now()}`;
      if (
        await replaceHashFieldIfEqual(
          storage,
          resultCommentHashKey,
          resultDay,
          existingCommentId,
          replacement,
          'Rumble result comment claim'
        )
      ) {
        claimingMarker = replacement;
        break;
      }
      continue;
    }

    const recoveredCommentId = await recoverPublishedComment();
    if (recoveredCommentId) {
      await storage.hSet(resultCommentHashKey, {
        [resultDay]: recoveredCommentId,
      });
      return recoveredCommentId;
    }

    const marker = `${claimingMarkerPrefix}${Date.now()}`;
    if ((await storage.hSetNX(resultCommentHashKey, resultDay, marker)) === 1) {
      claimingMarker = marker;
      break;
    }
  }
  if (!claimingMarker) return null;

  const submittingMarker = `${submittingMarkerPrefix}${Date.now()}`;
  const promoted = await replaceHashFieldIfEqual(
    storage,
    resultCommentHashKey,
    resultDay,
    claimingMarker,
    submittingMarker,
    'Rumble result comment submission'
  );
  if (!promoted) return null;

  // Any failure below intentionally leaves the claim. Reddit submission may
  // have committed even when this request or its Redis receipt failed; the
  // next attempt reconciles the exact deterministic body before publishing.
  const comment = await reddit.submitComment({
    id: T3(postId),
    text: resultText,
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
};
