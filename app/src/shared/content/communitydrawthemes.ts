export type CommunityDrawTheme = Readonly<{
  id: string;
  prompt: string;
}>;

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
export const COMMUNITY_DRAW_THEME_MINIMUM_COVERAGE_DAYS = 360;
const THEME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THEME_PROMPT_MAXIMUM_LENGTH = 52;
const THEME_PROMPT_MAXIMUM_WORDS = 4;

const defineTheme = (id: string, prompt: string): CommunityDrawTheme =>
  Object.freeze({ id, prompt });

// One easy subject plus at most one playful detail lasts for three days. These
// 120 themes cover 360 days without requiring a crowded scene.
const YEAR_ONE_THEMES = Object.freeze([
  defineTheme('bear', 'a bear with honey'),
  defineTheme('cloud', 'a smiling cloud'),
  defineTheme('cat', 'a cat in boots'),
  defineTheme('dog', 'a dog with balloon'),
  defineTheme('rabbit', 'a rabbit with scarf'),
  defineTheme('fox', 'a fox with flower'),
  defineTheme('frog', 'a frog on leaves'),
  defineTheme('fish', 'a fish with crown'),
  defineTheme('whale', 'a whale under stars'),
  defineTheme('shark', 'a shark brushing teeth'),
  defineTheme('turtle', 'a turtle with backpack'),
  defineTheme('snail', 'a racing snail'),
  defineTheme('butterfly', 'a butterfly with spots'),
  defineTheme('bee', 'a bee with glasses'),
  defineTheme('ladybug', 'a ladybug on mushroom'),
  defineTheme('spider', 'a spider knitting'),
  defineTheme('octopus', 'an octopus waving'),
  defineTheme('jellyfish', 'a glowing jellyfish'),
  defineTheme('crab', 'a crab with hat'),
  defineTheme('penguin', 'a penguin with cocoa'),
  defineTheme('owl', 'an owl with book'),
  defineTheme('duck', 'a duck in boots'),
  defineTheme('chicken', 'a chicken with umbrella'),
  defineTheme('cow', 'a cow jumping'),
  defineTheme('pig', 'a pig with wings'),
  defineTheme('sheep', 'a sheep in sweater'),
  defineTheme('goat', 'a goat with bell'),
  defineTheme('horse', 'a horse with ribbons'),
  defineTheme('elephant', 'an elephant with flower'),
  defineTheme('giraffe', 'a giraffe with bowtie'),
  defineTheme('lion', 'a lion with crown'),
  defineTheme('tiger', 'a tiger in pajamas'),
  defineTheme('monkey', 'a monkey with banana'),
  defineTheme('panda', 'a panda with kite'),
  defineTheme('koala', 'a koala with teacup'),
  defineTheme('kangaroo', 'a kangaroo with parcel'),
  defineTheme('crocodile', 'a crocodile wearing sunglasses'),
  defineTheme('dinosaur', 'a dinosaur with cupcake'),
  defineTheme('dragon', 'a dragon blowing bubbles'),
  defineTheme('unicorn', 'a unicorn on skates'),
  defineTheme('robot', 'a dancing robot'),
  defineTheme('alien', 'an alien waving'),
  defineTheme('ghost', 'a shy ghost'),
  defineTheme('monster', 'a tiny monster'),
  defineTheme('wizard', 'a wizard with toast'),
  defineTheme('pirate', 'a pirate with balloon'),
  defineTheme('astronaut', 'an astronaut with flower'),
  defineTheme('knight', 'a sleepy knight'),
  defineTheme('mermaid', 'a mermaid with sunglasses'),
  defineTheme('fairy', 'a fairy on skates'),
  defineTheme('castle', 'a castle with flag'),
  defineTheme('house', 'a house with legs'),
  defineTheme('tree', 'a tree with face'),
  defineTheme('flower', 'a flower wearing glasses'),
  defineTheme('mushroom', 'a mushroom with door'),
  defineTheme('cactus', 'a cactus with hat'),
  defineTheme('mountain', 'a mountain with face'),
  defineTheme('volcano', 'a volcano with snow'),
  defineTheme('island', 'an island with palm'),
  defineTheme('moon', 'a sleepy moon'),
  defineTheme('sun', 'a smiling sun'),
  defineTheme('star', 'a star with face'),
  defineTheme('rainbow', 'a rainbow with cloud'),
  defineTheme('raindrop', 'a happy raindrop'),
  defineTheme('snowman', 'a snowman with umbrella'),
  defineTheme('rocket', 'a rocket with window'),
  defineTheme('airplane', 'an airplane with face'),
  defineTheme('train', 'a train with flowers'),
  defineTheme('car', 'a car with wings'),
  defineTheme('boat', 'a boat under stars'),
  defineTheme('bicycle', 'a bicycle with basket'),
  defineTheme('balloon', 'a balloon with face'),
  defineTheme('kite', 'a kite with tail'),
  defineTheme('umbrella', 'an umbrella with eyes'),
  defineTheme('hat', 'a hat with feather'),
  defineTheme('shoe', 'a shoe with wings'),
  defineTheme('sock', 'a sock with face'),
  defineTheme('cup', 'a cup with steam'),
  defineTheme('teapot', 'a teapot with legs'),
  defineTheme('cake', 'a cake with candles'),
  defineTheme('donut', 'a donut with sprinkles'),
  defineTheme('pizza', 'a pizza with face'),
  defineTheme('apple', 'an apple with worm'),
  defineTheme('banana', 'a banana in pajamas'),
  defineTheme('strawberry', 'a strawberry with crown'),
  defineTheme('watermelon', 'a watermelon with sunglasses'),
  defineTheme('ice-cream', 'a melting ice cream'),
  defineTheme('sandwich', 'a sandwich with flag'),
  defineTheme('cookie', 'a cookie with face'),
  defineTheme('lollipop', 'a lollipop with bow'),
  defineTheme('gift', 'a gift with legs'),
  defineTheme('crown', 'a crown with flowers'),
  defineTheme('key', 'a key with wings'),
  defineTheme('clock', 'a sleepy clock'),
  defineTheme('lamp', 'a lamp with face'),
  defineTheme('chair', 'a chair with slippers'),
  defineTheme('bed', 'a bed under stars'),
  defineTheme('book', 'a book with eyes'),
  defineTheme('pencil', 'a dancing pencil'),
  defineTheme('paintbrush', 'a paintbrush with rainbow'),
  defineTheme('camera', 'a camera with legs'),
  defineTheme('guitar', 'a guitar with wings'),
  defineTheme('drum', 'a drum with face'),
  defineTheme('bell', 'a bell with ribbon'),
  defineTheme('candle', 'a candle with smile'),
  defineTheme('lantern', 'a lantern with stars'),
  defineTheme('backpack', 'a backpack with ears'),
  defineTheme('suitcase', 'a suitcase with stickers'),
  defineTheme('treasure-chest', 'a tiny treasure chest'),
  defineTheme('magic-wand', 'a sparkling magic wand'),
  defineTheme('sword', 'a sword with ribbon'),
  defineTheme('shield', 'a shield with moon'),
  defineTheme('seashell', 'a seashell with pearl'),
  defineTheme('snowflake', 'a smiling snowflake'),
  defineTheme('leaf', 'a leaf with face'),
  defineTheme('acorn', 'an acorn with hat'),
  defineTheme('pinecone', 'a pinecone with scarf'),
  defineTheme('pebble', 'a pebble with eyes'),
  defineTheme('waterfall', 'a waterfall with rainbow'),
  defineTheme('cave', 'a cave with lantern'),
]);

export const COMMUNITY_DRAW_THEME_SEASONS: readonly CommunityDrawThemeSeason[] =
  Object.freeze([
    Object.freeze({
      version: 1,
      startsOnArenaDay: 1,
      themes: YEAR_ONE_THEMES,
    }),
  ]);

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

    season.themes.forEach((theme) => {
      const label = theme.id || `season ${season.version} theme`;
      if (!THEME_ID_PATTERN.test(theme.id)) {
        errors.push(`${label} has an invalid id.`);
      }
      if (seenIds.has(theme.id)) errors.push(`${label} id is duplicated.`);
      seenIds.add(theme.id);
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

export function selectCommunityDoodleDare(
  dayNumber: number
): CommunityDrawTheme {
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
  const theme = selectedSeason.themes[blockNumber];
  if (!theme) {
    throw new Error(
      `Community Draw theme schedule ends before Arena day ${stableDay}; append the next season before this day launches.`
    );
  }
  return theme;
}
