import { context, reddit } from '@devvit/web/server';

export type SubredditModerator = Readonly<{
  userId: string;
  username: string;
}>;

export const getCurrentSubredditModerator = async (): Promise<
  SubredditModerator | undefined
> => {
  const userId = context.userId;
  if (!userId || !context.subredditName) return undefined;

  const currentUser = await reddit.getCurrentUser();
  if (!currentUser || currentUser.id !== userId) return undefined;

  const moderators = await reddit
    .getModerators({
      subredditName: context.subredditName,
      username: currentUser.username,
      limit: 1,
      pageSize: 1,
    })
    .get(1);
  if (!moderators.some((moderator) => moderator.id === userId)) {
    return undefined;
  }

  return { userId, username: currentUser.username };
};
