import {
  COMMUNITY_DRAW_THEME_DAYS,
  COMMUNITY_DRAW_THEME_POOL_SIZE,
  getCommunityDoodleDareCycleStartDay,
  selectCommunityDoodleDare,
  selectCommunityDoodleDarePool,
  type CommunityDrawTheme,
} from './content/communitydrawthemes';

export type CommunityChallengePostData = Readonly<{
  surface: 'community-challenge';
  version: 1;
  arenaDay: number;
  endsArenaDay: number;
  themes: readonly CommunityDrawTheme[];
  announcements: readonly string[];
}>;

export type CommunityChallengeStatus = 'upcoming' | 'active' | 'ended';

export type CommunityChallengeProgress = Readonly<{
  arenaDay: number;
  endsArenaDay: number;
  currentArenaDay: number;
  loggedIn: boolean;
  status: CommunityChallengeStatus;
  orderedThemeIds: readonly string[];
  completedThemeIds: readonly string[];
  nextThemeId: string | null;
}>;

const postDataMatchesCanonicalThemes = (
  arenaDay: number,
  themes: unknown
): themes is readonly CommunityDrawTheme[] => {
  if (
    !Array.isArray(themes) ||
    themes.length !== COMMUNITY_DRAW_THEME_POOL_SIZE
  ) {
    return false;
  }
  try {
    if (getCommunityDoodleDareCycleStartDay(arenaDay) !== arenaDay) {
      return false;
    }
    const canonicalThemes = selectCommunityDoodleDarePool(arenaDay);
    return canonicalThemes.every((canonicalTheme, index) => {
      const theme = themes[index];
      return (
        typeof theme === 'object' &&
        theme !== null &&
        !Array.isArray(theme) &&
        'id' in theme &&
        'prompt' in theme &&
        'category' in theme &&
        theme.id === canonicalTheme.id &&
        theme.prompt === canonicalTheme.prompt &&
        theme.category === canonicalTheme.category
      );
    });
  } catch {
    return false;
  }
};

export const createCommunityChallengePostData = (
  arenaDay: number,
  announcements: readonly string[] = []
): CommunityChallengePostData => {
  if (getCommunityDoodleDareCycleStartDay(arenaDay) !== arenaDay) {
    throw new Error(
      'Community challenge posts must start on a theme boundary.'
    );
  }
  const themes = selectCommunityDoodleDarePool(arenaDay);
  return Object.freeze({
    surface: 'community-challenge',
    version: 1,
    arenaDay,
    endsArenaDay: arenaDay + COMMUNITY_DRAW_THEME_DAYS - 1,
    themes,
    announcements: Object.freeze(
      announcements
        .map((announcement) => announcement.trim().slice(0, 48))
        .filter(Boolean)
        .slice(0, 4)
    ),
  });
};

export const parseCommunityChallengePostData = (
  value: unknown
): CommunityChallengePostData | null => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('surface' in value) ||
    !('version' in value) ||
    !('arenaDay' in value) ||
    !('endsArenaDay' in value) ||
    !('themes' in value) ||
    !('announcements' in value) ||
    value.surface !== 'community-challenge' ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.arenaDay) ||
    Number(value.arenaDay) < 1 ||
    value.endsArenaDay !==
      Number(value.arenaDay) + COMMUNITY_DRAW_THEME_DAYS - 1 ||
    !Array.isArray(value.announcements) ||
    value.announcements.length > 4 ||
    !value.announcements.every(
      (announcement) =>
        typeof announcement === 'string' &&
        announcement.length >= 1 &&
        announcement.length <= 48
    ) ||
    !postDataMatchesCanonicalThemes(Number(value.arenaDay), value.themes)
  ) {
    return null;
  }
  return createCommunityChallengePostData(
    Number(value.arenaDay),
    value.announcements
  );
};

export const createCommunityChallengeProgress = (input: {
  arenaDay: number;
  currentArenaDay: number;
  playerKey: string | null;
  completedDrawCount: number;
}): CommunityChallengeProgress => {
  const endsArenaDay = input.arenaDay + COMMUNITY_DRAW_THEME_DAYS - 1;
  const status: CommunityChallengeStatus =
    input.currentArenaDay < input.arenaDay
      ? 'upcoming'
      : input.currentArenaDay > endsArenaDay
        ? 'ended'
        : 'active';
  const completedDrawCount = Math.min(
    COMMUNITY_DRAW_THEME_POOL_SIZE,
    Number.isSafeInteger(input.completedDrawCount) &&
      input.completedDrawCount > 0
      ? input.completedDrawCount
      : 0
  );
  const orderedThemeIds = Array.from(
    { length: COMMUNITY_DRAW_THEME_POOL_SIZE },
    (_, index) =>
      selectCommunityDoodleDare(input.arenaDay, input.playerKey, index).id
  );
  const completedThemeIds = orderedThemeIds.slice(0, completedDrawCount);
  return Object.freeze({
    arenaDay: input.arenaDay,
    endsArenaDay,
    currentArenaDay: input.currentArenaDay,
    loggedIn: input.playerKey !== null,
    status,
    orderedThemeIds: Object.freeze(orderedThemeIds),
    completedThemeIds: Object.freeze(completedThemeIds),
    nextThemeId:
      status === 'active'
        ? (orderedThemeIds[completedDrawCount] ?? null)
        : null,
  });
};
