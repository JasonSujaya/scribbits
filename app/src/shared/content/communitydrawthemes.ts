import { hashContentKey } from './deterministic';

export type CommunityDrawTheme = Readonly<{
  id: string;
  prompt: string;
  category: CommunityDrawThemeCategory;
}>;

export const COMMUNITY_DRAW_THEME_CATEGORIES = Object.freeze([
  'animal',
  'character',
  'place-nature',
  'vehicle',
  'food',
  'object',
] as const);

export type CommunityDrawThemeCategory =
  (typeof COMMUNITY_DRAW_THEME_CATEGORIES)[number];

const communityDrawThemeCategorySet = new Set<string>(
  COMMUNITY_DRAW_THEME_CATEGORIES
);

export type CommunityDrawThemeSeason = Readonly<{
  version: number;
  startsOnArenaDay: number;
  themes: readonly CommunityDrawTheme[];
}>;

export type CommunityDrawThemeValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  themeCount: number;
  coverageDays: number;
  supportedThroughArenaDay: number;
}>;

export const COMMUNITY_DRAW_THEME_DAYS = 3;
export const COMMUNITY_DRAW_THEME_POOL_SIZE = 5;
export const COMMUNITY_DRAW_THEME_MINIMUM_COVERAGE_DAYS = 360;
const THEME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THEME_PROMPT_MAXIMUM_LENGTH = 52;
const THEME_PROMPT_MAXIMUM_WORDS = 4;

const defineTheme = (
  id: string,
  prompt: string,
  category: CommunityDrawThemeCategory
): CommunityDrawTheme => Object.freeze({ id, prompt, category });

// The launch catalog has six explicit subject families. Pool selection uses
// these categories directly, so a five-theme cycle always spans at least four
// families and contains at most two animals.
const YEAR_ONE_THEMES = Object.freeze([
  defineTheme('bear', 'a bear with honey', 'animal'),
  defineTheme('cat', 'a cat in boots', 'animal'),
  defineTheme('dog', 'a dog with balloon', 'animal'),
  defineTheme('rabbit', 'a rabbit with scarf', 'animal'),
  defineTheme('fox', 'a fox with flower', 'animal'),
  defineTheme('frog', 'a frog on leaves', 'animal'),
  defineTheme('fish', 'a fish with crown', 'animal'),
  defineTheme('whale', 'a whale under stars', 'animal'),
  defineTheme('shark', 'a shark brushing teeth', 'animal'),
  defineTheme('turtle', 'a turtle with backpack', 'animal'),
  defineTheme('snail', 'a racing snail', 'animal'),
  defineTheme('butterfly', 'a butterfly with spots', 'animal'),
  defineTheme('bee', 'a bee with glasses', 'animal'),
  defineTheme('ladybug', 'a ladybug on mushroom', 'animal'),
  defineTheme('spider', 'a spider knitting', 'animal'),
  defineTheme('octopus', 'an octopus waving', 'animal'),
  defineTheme('jellyfish', 'a glowing jellyfish', 'animal'),
  defineTheme('crab', 'a crab with hat', 'animal'),
  defineTheme('penguin', 'a penguin with cocoa', 'animal'),
  defineTheme('owl', 'an owl with book', 'animal'),
  defineTheme('duck', 'a duck in boots', 'animal'),
  defineTheme('chicken', 'a chicken with umbrella', 'animal'),
  defineTheme('cow', 'a cow jumping', 'animal'),
  defineTheme('pig', 'a pig with wings', 'animal'),
  defineTheme('sheep', 'a sheep in sweater', 'animal'),
  defineTheme('goat', 'a goat with bell', 'animal'),
  defineTheme('horse', 'a horse with ribbons', 'animal'),
  defineTheme('elephant', 'an elephant with flower', 'animal'),
  defineTheme('giraffe', 'a giraffe with bowtie', 'animal'),
  defineTheme('lion', 'a lion with crown', 'animal'),
  defineTheme('tiger', 'a tiger in pajamas', 'animal'),
  defineTheme('monkey', 'a monkey with banana', 'animal'),
  defineTheme('panda', 'a panda with kite', 'animal'),
  defineTheme('koala', 'a koala with teacup', 'animal'),
  defineTheme('kangaroo', 'a kangaroo with parcel', 'animal'),
  defineTheme('crocodile', 'a crocodile wearing sunglasses', 'animal'),

  defineTheme('dinosaur', 'a dinosaur with cupcake', 'character'),
  defineTheme('dragon', 'a dragon blowing bubbles', 'character'),
  defineTheme('unicorn', 'a unicorn on skates', 'character'),
  defineTheme('robot', 'a dancing robot', 'character'),
  defineTheme('alien', 'an alien waving', 'character'),
  defineTheme('ghost', 'a shy ghost', 'character'),
  defineTheme('monster', 'a tiny monster', 'character'),
  defineTheme('wizard', 'a wizard with toast', 'character'),
  defineTheme('pirate', 'a pirate with balloon', 'character'),
  defineTheme('astronaut', 'an astronaut with flower', 'character'),
  defineTheme('knight', 'a sleepy knight', 'character'),
  defineTheme('mermaid', 'a mermaid with sunglasses', 'character'),
  defineTheme('fairy', 'a fairy on skates', 'character'),

  defineTheme('cloud', 'a smiling cloud', 'place-nature'),
  defineTheme('castle', 'a castle with flag', 'place-nature'),
  defineTheme('house', 'a house with legs', 'place-nature'),
  defineTheme('tree', 'a tree with face', 'place-nature'),
  defineTheme('flower', 'a flower wearing glasses', 'place-nature'),
  defineTheme('mushroom', 'a mushroom with door', 'place-nature'),
  defineTheme('cactus', 'a cactus with hat', 'place-nature'),
  defineTheme('mountain', 'a mountain with face', 'place-nature'),
  defineTheme('volcano', 'a volcano with snow', 'place-nature'),
  defineTheme('island', 'an island with palm', 'place-nature'),
  defineTheme('moon', 'a sleepy moon', 'place-nature'),
  defineTheme('sun', 'a smiling sun', 'place-nature'),
  defineTheme('star', 'a star with face', 'place-nature'),
  defineTheme('rainbow', 'a rainbow with cloud', 'place-nature'),
  defineTheme('raindrop', 'a happy raindrop', 'place-nature'),
  defineTheme('snowman', 'a snowman with umbrella', 'place-nature'),
  defineTheme('seashell', 'a seashell with pearl', 'place-nature'),
  defineTheme('snowflake', 'a smiling snowflake', 'place-nature'),
  defineTheme('leaf', 'a leaf with face', 'place-nature'),
  defineTheme('acorn', 'an acorn with hat', 'place-nature'),
  defineTheme('pinecone', 'a pinecone with scarf', 'place-nature'),
  defineTheme('pebble', 'a pebble with eyes', 'place-nature'),
  defineTheme('waterfall', 'a waterfall with rainbow', 'place-nature'),
  defineTheme('cave', 'a cave with lantern', 'place-nature'),

  defineTheme('rocket', 'a rocket with window', 'vehicle'),
  defineTheme('airplane', 'an airplane with face', 'vehicle'),
  defineTheme('train', 'a train with flowers', 'vehicle'),
  defineTheme('car', 'a car with wings', 'vehicle'),
  defineTheme('boat', 'a boat under stars', 'vehicle'),
  defineTheme('bicycle', 'a bicycle with basket', 'vehicle'),
  defineTheme('balloon', 'a balloon with face', 'vehicle'),

  defineTheme('cake', 'a cake with candles', 'food'),
  defineTheme('donut', 'a donut with sprinkles', 'food'),
  defineTheme('pizza', 'a pizza with face', 'food'),
  defineTheme('apple', 'an apple with worm', 'food'),
  defineTheme('banana', 'a banana in pajamas', 'food'),
  defineTheme('strawberry', 'a strawberry with crown', 'food'),
  defineTheme('watermelon', 'a watermelon with sunglasses', 'food'),
  defineTheme('ice-cream', 'a melting ice cream', 'food'),
  defineTheme('sandwich', 'a sandwich with flag', 'food'),
  defineTheme('cookie', 'a cookie with face', 'food'),
  defineTheme('lollipop', 'a lollipop with bow', 'food'),

  defineTheme('kite', 'a kite with tail', 'object'),
  defineTheme('umbrella', 'an umbrella with eyes', 'object'),
  defineTheme('hat', 'a hat with feather', 'object'),
  defineTheme('shoe', 'a shoe with wings', 'object'),
  defineTheme('sock', 'a sock with face', 'object'),
  defineTheme('cup', 'a cup with steam', 'object'),
  defineTheme('teapot', 'a teapot with legs', 'object'),
  defineTheme('gift', 'a gift with legs', 'object'),
  defineTheme('crown', 'a crown with flowers', 'object'),
  defineTheme('key', 'a key with wings', 'object'),
  defineTheme('clock', 'a sleepy clock', 'object'),
  defineTheme('lamp', 'a lamp with face', 'object'),
  defineTheme('chair', 'a chair with slippers', 'object'),
  defineTheme('bed', 'a bed under stars', 'object'),
  defineTheme('book', 'a book with eyes', 'object'),
  defineTheme('pencil', 'a dancing pencil', 'object'),
  defineTheme('paintbrush', 'a paintbrush with rainbow', 'object'),
  defineTheme('camera', 'a camera with legs', 'object'),
  defineTheme('guitar', 'a guitar with wings', 'object'),
  defineTheme('drum', 'a drum with face', 'object'),
  defineTheme('bell', 'a bell with ribbon', 'object'),
  defineTheme('candle', 'a candle with smile', 'object'),
  defineTheme('lantern', 'a lantern with stars', 'object'),
  defineTheme('backpack', 'a backpack with ears', 'object'),
  defineTheme('suitcase', 'a suitcase with stickers', 'object'),
  defineTheme('treasure-chest', 'a tiny treasure chest', 'object'),
  defineTheme('magic-wand', 'a sparkling magic wand', 'object'),
  defineTheme('sword', 'a sword with ribbon', 'object'),
  defineTheme('shield', 'a shield with moon', 'object'),
]);

export const COMMUNITY_DRAW_THEME_SEASONS: readonly CommunityDrawThemeSeason[] =
  Object.freeze([
    Object.freeze({
      version: 1,
      startsOnArenaDay: 1,
      themes: YEAR_ONE_THEMES,
    }),
  ]);

export const COMMUNITY_DRAW_THEME_CATEGORY_COUNTS = Object.freeze(
  COMMUNITY_DRAW_THEME_CATEGORIES.reduce(
    (counts, category) => {
      counts[category] = COMMUNITY_DRAW_THEME_SEASONS.reduce(
        (total, season) =>
          total +
          season.themes.filter((theme) => theme.category === category).length,
        0
      );
      return counts;
    },
    {} as Record<CommunityDrawThemeCategory, number>
  )
);

export function validateCommunityDrawThemeSeasons(
  seasons: readonly CommunityDrawThemeSeason[] = COMMUNITY_DRAW_THEME_SEASONS
): CommunityDrawThemeValidation {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenPrompts = new Set<string>();
  let themeCount = 0;
  let supportedThroughArenaDay = 0;

  if (seasons.length === 0)
    errors.push('At least one community theme season is required.');

  seasons.forEach((season, seasonIndex) => {
    const previousSeason = seasons[seasonIndex - 1];
    const expectedVersion = previousSeason ? previousSeason.version + 1 : 1;
    const expectedStart = seasonIndex === 0 ? 1 : supportedThroughArenaDay + 1;
    if (!Number.isSafeInteger(season.version) || season.version < 1) {
      errors.push(`Season ${seasonIndex + 1} has an invalid version.`);
    }
    if (season.version !== expectedVersion) {
      errors.push(
        `Season version ${season.version} is invalid; expected version ${expectedVersion}.`
      );
    }
    if (season.startsOnArenaDay !== expectedStart) {
      errors.push(
        `Season ${season.version} starts on day ${season.startsOnArenaDay}; expected day ${expectedStart}.`
      );
    }
    if ((season.startsOnArenaDay - 1) % COMMUNITY_DRAW_THEME_DAYS !== 0) {
      errors.push(
        `Season ${season.version} does not start on a theme boundary.`
      );
    }
    if (season.themes.length === 0) {
      errors.push(`Season ${season.version} must contain at least one theme.`);
    }
    if (season.themes.length % COMMUNITY_DRAW_THEME_POOL_SIZE !== 0) {
      errors.push(
        `Season ${season.version} theme count must be divisible by ${COMMUNITY_DRAW_THEME_POOL_SIZE}.`
      );
    }

    season.themes.forEach((theme) => {
      const label = theme.id || `season ${season.version} theme`;
      if (!THEME_ID_PATTERN.test(theme.id)) {
        errors.push(`${label} has an invalid id.`);
      }
      if (seenIds.has(theme.id)) errors.push(`${label} id is duplicated.`);
      seenIds.add(theme.id);
      if (!communityDrawThemeCategorySet.has(theme.category)) {
        errors.push(`${label} has an invalid category.`);
      }
      const normalizedPrompt = theme.prompt.trim().toLowerCase();
      if (!normalizedPrompt) errors.push(`${label} prompt must not be blank.`);
      if (theme.prompt !== theme.prompt.trim()) {
        errors.push(`${label} prompt must not have outer whitespace.`);
      }
      if (theme.prompt.length > THEME_PROMPT_MAXIMUM_LENGTH) {
        errors.push(
          `${label} prompt is ${theme.prompt.length} characters; maximum is ${THEME_PROMPT_MAXIMUM_LENGTH}.`
        );
      }
      const promptWordCount = normalizedPrompt.split(/\s+/).length;
      if (promptWordCount > THEME_PROMPT_MAXIMUM_WORDS) {
        errors.push(
          `${label} prompt has ${promptWordCount} words; maximum is ${THEME_PROMPT_MAXIMUM_WORDS}.`
        );
      }
      if (seenPrompts.has(normalizedPrompt)) {
        errors.push(`${label} prompt is duplicated.`);
      }
      seenPrompts.add(normalizedPrompt);
      themeCount += 1;
    });

    supportedThroughArenaDay =
      season.startsOnArenaDay +
      season.themes.length * COMMUNITY_DRAW_THEME_DAYS -
      1;
  });

  const coverageDays = supportedThroughArenaDay;
  if (coverageDays < COMMUNITY_DRAW_THEME_MINIMUM_COVERAGE_DAYS) {
    errors.push(
      `Community theme coverage is ${coverageDays} days; minimum is ${COMMUNITY_DRAW_THEME_MINIMUM_COVERAGE_DAYS}.`
    );
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    themeCount,
    coverageDays,
    supportedThroughArenaDay,
  });
}

const scheduleValidation = validateCommunityDrawThemeSeasons();
if (!scheduleValidation.valid) {
  throw new Error(
    `Invalid community Draw theme schedule:\n${scheduleValidation.errors.join('\n')}`
  );
}

export const COMMUNITY_DRAW_THEME_COUNT = scheduleValidation.themeCount;
export const COMMUNITY_DRAW_THEME_COVERAGE_DAYS =
  scheduleValidation.coverageDays;

const communityThemeIds = new Set(
  COMMUNITY_DRAW_THEME_SEASONS.flatMap((season) =>
    season.themes.map((theme) => theme.id)
  )
);

export function isCommunityDrawThemeId(value: unknown): value is string {
  return typeof value === 'string' && communityThemeIds.has(value);
}

type CommunityThemeCycle = Readonly<{
  blockNumber: number;
  cycleStartDay: number;
  season: CommunityDrawThemeSeason;
}>;

const getCommunityThemeCycle = (dayNumber: number): CommunityThemeCycle => {
  const stableDay =
    Number.isSafeInteger(dayNumber) && dayNumber >= 1 ? dayNumber : 1;
  let selectedSeason = COMMUNITY_DRAW_THEME_SEASONS[0];
  for (const season of COMMUNITY_DRAW_THEME_SEASONS) {
    if (season.startsOnArenaDay > stableDay) break;
    selectedSeason = season;
  }
  if (!selectedSeason) {
    throw new Error('Community Draw theme schedule must not be empty.');
  }
  const blockNumber = Math.floor(
    (stableDay - selectedSeason.startsOnArenaDay) / COMMUNITY_DRAW_THEME_DAYS
  );
  if (blockNumber >= selectedSeason.themes.length) {
    throw new Error(
      `Community Draw theme schedule ends before Arena day ${stableDay}; append the next season before this day launches.`
    );
  }
  return Object.freeze({
    blockNumber,
    cycleStartDay:
      selectedSeason.startsOnArenaDay + blockNumber * COMMUNITY_DRAW_THEME_DAYS,
    season: selectedSeason,
  });
};

export function getCommunityDoodleDareCycleStartDay(dayNumber: number): number {
  return getCommunityThemeCycle(dayNumber).cycleStartDay;
}

const communityThemePoolCache = new Map<
  string,
  readonly (readonly CommunityDrawTheme[])[]
>();

const buildCommunityDoodleDarePools = (
  season: CommunityDrawThemeSeason,
  catalogPass: number
): readonly (readonly CommunityDrawTheme[])[] => {
  const cacheKey = `${season.version}:${catalogPass}`;
  const cachedPools = communityThemePoolCache.get(cacheKey);
  if (cachedPools) return cachedPools;

  const poolCount = season.themes.length / COMMUNITY_DRAW_THEME_POOL_SIZE;
  const mutablePools = Array.from(
    { length: poolCount },
    () => [] as CommunityDrawTheme[]
  );
  const categoryGroups = COMMUNITY_DRAW_THEME_CATEGORIES.map(
    (category, categoryOrder) => ({
      category,
      categoryOrder,
      themes: season.themes
        .filter((theme) => theme.category === category)
        .sort((left, right) => {
          const leftRank = hashContentKey(
            `community-theme-pool:v4:${season.version}:${catalogPass}:${category}:${left.id}`
          );
          const rightRank = hashContentKey(
            `community-theme-pool:v4:${season.version}:${catalogPass}:${category}:${right.id}`
          );
          return leftRank === rightRank
            ? left.id.localeCompare(right.id)
            : leftRank - rightRank;
        }),
    })
  ).sort(
    (left, right) =>
      right.themes.length - left.themes.length ||
      left.categoryOrder - right.categoryOrder
  );

  for (const group of categoryGroups) {
    for (const theme of group.themes) {
      const destination = mutablePools
        .map((pool, poolIndex) => ({ pool, poolIndex }))
        .filter(({ pool }) => pool.length < COMMUNITY_DRAW_THEME_POOL_SIZE)
        .sort((left, right) => {
          const leftAlreadyHasCategory = Number(
            left.pool.some(
              (pooledTheme) => pooledTheme.category === group.category
            )
          );
          const rightAlreadyHasCategory = Number(
            right.pool.some(
              (pooledTheme) => pooledTheme.category === group.category
            )
          );
          if (leftAlreadyHasCategory !== rightAlreadyHasCategory) {
            return leftAlreadyHasCategory - rightAlreadyHasCategory;
          }
          if (left.pool.length !== right.pool.length) {
            return left.pool.length - right.pool.length;
          }
          const leftRank = hashContentKey(
            `community-theme-pool-slot:v4:${season.version}:${catalogPass}:${group.category}:${left.poolIndex}`
          );
          const rightRank = hashContentKey(
            `community-theme-pool-slot:v4:${season.version}:${catalogPass}:${group.category}:${right.poolIndex}`
          );
          return leftRank === rightRank
            ? left.poolIndex - right.poolIndex
            : leftRank - rightRank;
        })[0];
      if (!destination) {
        throw new Error('Community Draw theme pools ran out of room.');
      }
      destination.pool.push(theme);
    }
  }

  const pools = Object.freeze(
    mutablePools.map((pool, poolIndex) => {
      const categoryCount = new Set(pool.map((theme) => theme.category)).size;
      const animalCount = pool.filter(
        (theme) => theme.category === 'animal'
      ).length;
      if (
        pool.length !== COMMUNITY_DRAW_THEME_POOL_SIZE ||
        categoryCount < 4 ||
        animalCount > 2
      ) {
        throw new Error(
          `Community Draw pool ${poolIndex + 1} cannot meet the variety rules.`
        );
      }
      return Object.freeze(pool);
    })
  );
  communityThemePoolCache.set(cacheKey, pools);
  return pools;
};

export function selectCommunityDoodleDarePool(
  dayNumber: number
): readonly CommunityDrawTheme[] {
  const { blockNumber, season } = getCommunityThemeCycle(dayNumber);
  const poolsPerCatalogPass =
    season.themes.length / COMMUNITY_DRAW_THEME_POOL_SIZE;
  const catalogPass = Math.floor(blockNumber / poolsPerCatalogPass);
  const blockWithinPass = blockNumber % poolsPerCatalogPass;
  const themePool = buildCommunityDoodleDarePools(season, catalogPass)[
    blockWithinPass
  ];
  if (!themePool) {
    throw new Error('Community Draw theme pool is missing.');
  }
  return themePool;
}

export function selectCommunityDoodleDare(
  dayNumber: number,
  playerKey: string | null = null,
  completedDrawCount = 0
): CommunityDrawTheme {
  const { blockNumber, season } = getCommunityThemeCycle(dayNumber);
  const pool = selectCommunityDoodleDarePool(dayNumber);
  const normalizedPlayerKey = playerKey?.trim().toLowerCase() || 'guest';
  const stableCompletedDrawCount =
    Number.isSafeInteger(completedDrawCount) && completedDrawCount >= 0
      ? completedDrawCount
      : 0;
  const playerThemeOrder = [...pool].sort((left, right) => {
    const leftRank = hashContentKey(
      `community-theme-player:v3:${season.version}:${blockNumber}:${normalizedPlayerKey}:${left.id}`
    );
    const rightRank = hashContentKey(
      `community-theme-player:v3:${season.version}:${blockNumber}:${normalizedPlayerKey}:${right.id}`
    );
    return leftRank === rightRank
      ? left.id.localeCompare(right.id)
      : leftRank - rightRank;
  });
  const assignedTheme =
    playerThemeOrder[stableCompletedDrawCount % COMMUNITY_DRAW_THEME_POOL_SIZE];
  if (!assignedTheme) {
    throw new Error('Community Draw theme pool must contain five themes.');
  }
  return assignedTheme;
}
