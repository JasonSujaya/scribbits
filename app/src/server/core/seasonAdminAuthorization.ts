import { context, reddit, settings } from '@devvit/web/server';
import type { SeasonActor } from './season';

const redditUserIdPattern = /^t2_[a-z0-9]+$/i;

export const parseSeasonAdminUserIds = (
  value: string | undefined
): ReadonlySet<string> | null => {
  const userIds = (value ?? '')
    .split(/[\s,]+/)
    .map((userId) => userId.trim())
    .filter(Boolean);
  if (
    userIds.length === 0 ||
    userIds.some((userId) => !redditUserIdPattern.test(userId))
  ) {
    return null;
  }
  return new Set(userIds);
};

export const getAuthorizedSeasonAdmin = async (): Promise<
  SeasonActor | undefined
> => {
  const actorUserId = context.userId;
  if (!actorUserId || !context.subredditName) return undefined;

  const allowedUserIds = parseSeasonAdminUserIds(
    await settings.get<string>('seasonAdminUserIds')
  );
  if (!allowedUserIds?.has(actorUserId)) return undefined;

  const actor = await reddit.getCurrentUser();
  if (!actor || actor.id !== actorUserId) return undefined;
  const matchingModerators = await reddit
    .getModerators({
      subredditName: context.subredditName,
      username: actor.username,
      limit: 1,
      pageSize: 1,
    })
    .get(1);
  if (!matchingModerators.some((moderator) => moderator.id === actorUserId)) {
    return undefined;
  }
  return { userId: actorUserId, username: actor.username };
};
