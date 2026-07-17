import { context, reddit } from '@devvit/web/server';
import type { ArenaStorage } from './storage';

const mainPostKey = 'app:main-post:v3';
const mainPostClaimKey = 'app:main-post-publishing-claims';
const mainPostClaimField = 'main-v3';
const mainPostTitle = 'Draw a Scribbit. Watch it fight.';
const legacyMainPostTitle = 'Scribbits — Draw. Raise. Battle.';
const publishedMarkerPrefix = 'published:';
const claimTimeoutMs = 5 * 60 * 1000;
const legacyRumbleTitle = /^Rumble #\d+ —/;

const recoverMainPost = async (): Promise<{ id: string } | null> => {
  const recentPosts = await reddit
    .getNewPosts({
      subredditName: context.subredditName,
      limit: 1000,
      pageSize: 100,
    })
    .all();

  for (const post of recentPosts) {
    if (post.title !== mainPostTitle) continue;
    const postData = await post.getPostData().catch((error) => {
      console.warn(`Skipping unreadable Scribbits post ${post.id}: ${error}`);
      return undefined;
    });
    if (!postData) continue;
    if (postData?.surface === 'main' && postData.version === 3) {
      return { id: post.id };
    }
  }
  return null;
};

export const ensureMainAppPost = async (
  storage: ArenaStorage,
  options: Readonly<{ recoverExistingPost?: boolean }> = {}
): Promise<{ id: string }> => {
  const recoverExistingPost = options.recoverExistingPost ?? true;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existingPostId = await storage.get(mainPostKey);
    if (existingPostId) return { id: existingPostId };

    const existingClaim = await storage.hGet(
      mainPostClaimKey,
      mainPostClaimField
    );
    if (existingClaim?.startsWith(publishedMarkerPrefix)) {
      const recoveredPostId = existingClaim.slice(publishedMarkerPrefix.length);
      if (recoveredPostId) {
        await storage.set(mainPostKey, recoveredPostId);
        await storage.hDel(mainPostClaimKey, [mainPostClaimField]);
        return { id: recoveredPostId };
      }
    }

    const recoveredPost = recoverExistingPost ? await recoverMainPost() : null;
    if (recoveredPost) {
      await storage.set(mainPostKey, recoveredPost.id);
      await storage.hDel(mainPostClaimKey, [mainPostClaimField]);
      return recoveredPost;
    }

    const nowMs = Date.now();
    const claimedAtMs = Number(existingClaim);
    if (Number.isFinite(claimedAtMs)) {
      if (nowMs - claimedAtMs < claimTimeoutMs) {
        throw new Error('The Scribbits app post is already being published.');
      }
      await storage.hDel(mainPostClaimKey, [mainPostClaimField]);
    }

    if (
      (await storage.hSetNX(
        mainPostClaimKey,
        mainPostClaimField,
        nowMs.toString()
      )) !== 1
    ) {
      continue;
    }

    const post = await reddit.submitCustomPost({
      title: mainPostTitle,
      entry: 'default',
      postData: { surface: 'main', version: 3 },
      textFallback: {
        text: 'Your drawing becomes a fighter with its own powers, rivals, and story.',
      },
    });
    await storage.hSet(mainPostClaimKey, {
      [mainPostClaimField]: `${publishedMarkerPrefix}${post.id}`,
    });
    await storage.set(mainPostKey, post.id);
    await storage.hDel(mainPostClaimKey, [mainPostClaimField]);
    return post;
  }

  const publishedPostId = await storage.get(mainPostKey);
  if (publishedPostId) return { id: publishedPostId };
  throw new Error('The Scribbits app post could not claim publication.');
};

export const deleteObsoleteAppPosts = async (
  mainPostId: string
): Promise<number> => {
  const recentPosts = await reddit
    .getNewPosts({
      subredditName: context.subredditName,
      limit: 1000,
      pageSize: 100,
    })
    .all();
  let deletedPostCount = 0;

  for (const post of recentPosts) {
    if (post.id === mainPostId) continue;
    const postData = await post.getPostData().catch((error) => {
      console.warn(`Could not read obsolete post ${post.id}: ${error}`);
      return undefined;
    });
    const isLegacyRumblePost =
      legacyRumbleTitle.test(post.title) &&
      Number.isSafeInteger(postData?.dayNumber);
    const isLegacyMainPost =
      post.title === legacyMainPostTitle && postData?.surface === 'main';
    const isPreviousMainPost =
      post.title === mainPostTitle &&
      (postData?.surface === 'main' || post.authorName === context.appSlug);
    if (!isLegacyRumblePost && !isLegacyMainPost && !isPreviousMainPost) {
      continue;
    }
    try {
      await post.delete();
      deletedPostCount += 1;
    } catch (error) {
      console.warn(`Could not delete obsolete post ${post.id}: ${error}`);
    }
  }

  return deletedPostCount;
};
