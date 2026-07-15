import {
  getCommunityDoodleDareCycleStartDay,
} from '../../shared/content/communitydrawthemes';
import {
  getScribbitOwner,
  getUserScribbitsKey,
  loadScribbits,
} from './scribbit';
import type { ArenaStorage } from './storage';

export const getUserCommunityThemeCompletionsKey = (
  userId: string
): string => `user:${userId}:community-theme-completions`;

export const loadCompletedCommunityThemeDrawCount = async (
  storage: ArenaStorage,
  userId: string,
  dayNumber: number
): Promise<number> => {
  const cycleStartDay = getCommunityDoodleDareCycleStartDay(dayNumber);
  const completionKey = getUserCommunityThemeCompletionsKey(userId);
  const [completionEntries, indexedScribbits] = await Promise.all([
    storage.zRange(completionKey, cycleStartDay, dayNumber, { by: 'score' }),
    storage.zRange(getUserScribbitsKey(userId), cycleStartDay, dayNumber, {
      by: 'score',
    }),
  ]);
  const completedScribbitIds = new Set(
    completionEntries.map((entry) => entry.member)
  );
  const scribbits = await loadScribbits(
    storage,
    indexedScribbits.map((entry) => entry.member)
  );
  const ownedScribbits = await Promise.all(
    scribbits.map(async (scribbit) => ({
      scribbit,
      owner: await getScribbitOwner(storage, scribbit.id),
    }))
  );
  const legacyCompletions = ownedScribbits.filter(
    ({ owner, scribbit }) =>
      owner === userId &&
      !scribbit.isFounding &&
      scribbit.drawingThemeId !== null &&
      scribbit.bornDay >= cycleStartDay &&
      scribbit.bornDay <= dayNumber
  );
  const missingCompletionEntries = legacyCompletions
    .filter(({ scribbit }) => !completedScribbitIds.has(scribbit.id))
    .map(({ scribbit }) => ({
      member: scribbit.id,
      score: scribbit.bornDay,
    }));
  if (missingCompletionEntries.length > 0) {
    await storage.zAdd(completionKey, ...missingCompletionEntries);
    for (const entry of missingCompletionEntries) {
      completedScribbitIds.add(entry.member);
    }
  }
  return completedScribbitIds.size;
};
