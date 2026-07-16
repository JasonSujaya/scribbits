import { context, reddit } from '@devvit/web/server';
import {
  getCommunityDoodleDareCycleStartDay,
  selectCommunityDoodleDarePool,
} from '../../shared/content/communitydrawthemes';
import {
  buildArenaUpdateDraft,
  buildWeeklyFightDraft,
  type ArenaEventAnnouncement,
  type ArenaFinalAnnouncement,
  type CommunityPostDraft,
} from '../../shared/communityfeed';
import {
  getSeasonEventScoreMultiplier,
  isSeasonPausedOnArenaDay,
  type SeasonConfig,
} from '../../shared/season';
import { loadStrongestFightForArenaDays } from './communityPostCandidates';
import { ensureMainAppPost } from './post';
import { loadSeasonCatalog, loadSeasonFinalBoardEntries } from './season';
import type { ArenaStorage } from './storage';

const publicationStateKey = 'app:community-post-publications:v1';
const publishedMarkerPrefix = 'published:';
const recoverMarkerPrefix = 'recover:';
const publicationClaimTimeoutMilliseconds = 45_000;

const activeSeasonOnDay = (
  catalog: readonly SeasonConfig[],
  arenaDay: number
): SeasonConfig | null =>
  catalog.find(
    (season) =>
      season.lifecycle === 'scheduled' &&
      season.startArenaDay <= arenaDay &&
      season.endArenaDay >= arenaDay
  ) ?? null;

const eventAnnouncement = (
  season: SeasonConfig,
  event: SeasonConfig['events'][number]
): ArenaEventAnnouncement => ({
  name: event.name,
  seasonName: season.name,
  scoreMultiplier: getSeasonEventScoreMultiplier(event.ruleSetId),
});

const recoverPublishedPost = async (
  title: string
): Promise<{ id: string } | null> => {
  const recentPosts = await reddit
    .getNewPosts({
      subredditName: context.subredditName,
      limit: 1000,
      pageSize: 100,
    })
    .all();
  const matchingPost = recentPosts.find((post) => post.title === title);
  return matchingPost ? { id: matchingPost.id } : null;
};

const publishCommunityPost = async (
  storage: ArenaStorage,
  draft: CommunityPostDraft
): Promise<void> => {
  const existingState = await storage.hGet(publicationStateKey, draft.id);
  if (existingState?.startsWith(publishedMarkerPrefix)) return;

  if (existingState !== undefined) {
    const recoveredPost = await recoverPublishedPost(draft.title);
    if (recoveredPost) {
      await storage.hSet(publicationStateKey, {
        [draft.id]: `${publishedMarkerPrefix}${recoveredPost.id}`,
      });
      return;
    }
  }

  const nowMilliseconds = Date.now();
  const claimedAtMilliseconds = Number(existingState);
  if (
    Number.isFinite(claimedAtMilliseconds) &&
    nowMilliseconds - claimedAtMilliseconds <
      publicationClaimTimeoutMilliseconds
  ) {
    throw new Error(`Community post ${draft.id} is already being published.`);
  }
  if (existingState !== undefined) {
    await storage.hDel(publicationStateKey, [draft.id]);
  }
  if (
    (await storage.hSetNX(
      publicationStateKey,
      draft.id,
      nowMilliseconds.toString()
    )) !== 1
  ) {
    throw new Error(`Community post ${draft.id} could not claim publication.`);
  }

  let post: Awaited<ReturnType<typeof reddit.submitPost>>;
  try {
    post = await reddit.submitPost({
      subredditName: context.subredditName,
      title: draft.title,
      text: draft.body,
      sendreplies: false,
    });
  } catch (error) {
    // A retry first scans Reddit by exact title, so this is safe whether the
    // request failed before submission or its successful reply was lost.
    try {
      await storage.hSet(publicationStateKey, {
        [draft.id]: `${recoverMarkerPrefix}${nowMilliseconds}`,
      });
    } catch (recoveryStateError) {
      console.warn(
        `Community post ${draft.id} could not save recovery state:`,
        recoveryStateError
      );
    }
    throw error;
  }
  await storage.hSet(publicationStateKey, {
    [draft.id]: `${publishedMarkerPrefix}${post.id}`,
  });
};

const buildFinalAnnouncement = async (
  storage: ArenaStorage,
  finalizedSeason: SeasonConfig | undefined
): Promise<ArenaFinalAnnouncement | null> => {
  if (!finalizedSeason) return null;
  const winner = (
    await loadSeasonFinalBoardEntries(storage, finalizedSeason.id)
  )?.[0];
  return {
    name: finalizedSeason.name,
    winnerUsername: winner?.username ?? null,
    winnerScore: winner?.score ?? null,
  };
};

const buildArenaUpdateForDay = async (
  storage: ArenaStorage,
  catalog: readonly SeasonConfig[],
  arenaDay: number,
  appUrl: string
): Promise<CommunityPostDraft | null> => {
  const activeSeason = activeSeasonOnDay(catalog, arenaDay);
  const previousSeason =
    catalog.find(
      (season) =>
        (season.lifecycle === 'scheduled' ||
          season.lifecycle === 'finalized') &&
        season.startArenaDay <= arenaDay - 1 &&
        season.endArenaDay >= arenaDay - 1
    ) ?? null;
  const startingSeason = catalog.find(
    (season) =>
      season.lifecycle === 'scheduled' && season.startArenaDay === arenaDay
  );
  const finalizedSeason = catalog.find(
    (season) =>
      season.lifecycle === 'finalized' && season.endArenaDay === arenaDay - 1
  );
  const themeCycleStarts =
    getCommunityDoodleDareCycleStartDay(arenaDay) === arenaDay;

  return buildArenaUpdateDraft({
    arenaDay,
    appUrl,
    themePool: themeCycleStarts
      ? selectCommunityDoodleDarePool(arenaDay)
      : null,
    startingSeason: startingSeason
      ? {
          name: startingSeason.name,
          campaignName: startingSeason.campaignName,
          startArenaDay: startingSeason.startArenaDay,
          endArenaDay: startingSeason.endArenaDay,
        }
      : null,
    finalizedSeason: await buildFinalAnnouncement(storage, finalizedSeason),
    startingEvents: activeSeason
      ? activeSeason.events
          .filter(
            (event) =>
              event.startArenaDay === arenaDay &&
              !isSeasonPausedOnArenaDay(activeSeason, arenaDay)
          )
          .map((event) => eventAnnouncement(activeSeason, event))
      : [],
    endedEvents: previousSeason
      ? previousSeason.events
          .filter((event) => event.endArenaDay === arenaDay - 1)
          .map((event) => eventAnnouncement(previousSeason, event))
      : [],
  });
};

export const publishArenaCommunityPosts = async (
  storage: ArenaStorage,
  input: Readonly<{
    currentArenaDay: number;
    resolvedArenaDays: readonly number[];
  }>
): Promise<void> => {
  const mainPost = await ensureMainAppPost(storage);
  const appUrl = `https://reddit.com/r/${context.subredditName}/comments/${mainPost.id}`;
  const catalog = await loadSeasonCatalog(storage);
  const enteredArenaDays =
    input.resolvedArenaDays.length > 0
      ? input.resolvedArenaDays.map((day) => day + 1)
      : [input.currentArenaDay];

  for (const arenaDay of new Set(enteredArenaDays)) {
    const updateDraft = await buildArenaUpdateForDay(
      storage,
      catalog,
      arenaDay,
      appUrl
    );
    if (updateDraft) await publishCommunityPost(storage, updateDraft);
  }

  for (const resolvedArenaDay of input.resolvedArenaDays) {
    if (resolvedArenaDay % 7 !== 0) continue;
    const weekStartArenaDay = resolvedArenaDay - 6;
    const arenaDays = Array.from(
      { length: 7 },
      (_, index) => weekStartArenaDay + index
    );
    const strongestFight = await loadStrongestFightForArenaDays(
      storage,
      arenaDays
    );
    if (!strongestFight) continue;
    await publishCommunityPost(
      storage,
      buildWeeklyFightDraft(
        strongestFight,
        weekStartArenaDay,
        resolvedArenaDay,
        appUrl
      )
    );
  }
};
