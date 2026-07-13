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
export const COMMUNITY_DRAW_THEME_MINIMUM_COVERAGE_DAYS = 365;
const THEME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THEME_PROMPT_MAXIMUM_LENGTH = 52;

const defineTheme = (id: string, prompt: string): CommunityDrawTheme =>
  Object.freeze({ id, prompt });

// This launch block is owned here so Practice edits cannot move or rewrite an
// already-published community day.
const launchCommunityThemes = Object.freeze([
  defineTheme('moon-dumpling', 'a moon dumpling with stompy feet'),
  defineTheme('volcano-frog', 'a round volcano frog'),
  defineTheme('cloud-bear', 'a giant sleepy cloud bear'),
  defineTheme('pebble-ogre', 'a chunky pebble ogre'),
  defineTheme('pillow-golem', 'a pillow golem with tiny boots'),
  defineTheme('planet-crab', 'a sleepy planet crab'),
  defineTheme('bread-troll', 'a bread loaf troll with heavy feet'),
  defineTheme('boulder-penguin', 'a boulder penguin wearing mittens'),
  defineTheme('thunder-porcupine', 'a thunder porcupine'),
  defineTheme('cactus-dragon', 'a cactus dragon with too many spikes'),
  defineTheme('crown-moth', 'a moth wearing a thorn crown'),
  defineTheme('toothy-star', 'a star monster made of teeth'),
  defineTheme('lantern-bat', 'a lantern bat with needle wings'),
  defineTheme('crystal-hedgehog', 'a crystal hedgehog knight'),
  defineTheme('royal-urchin', 'a sea urchin in a royal cape'),
  defineTheme('lightning-flower', 'a lightning flower with sharp petals'),
  defineTheme('comet-mouse', 'a tiny comet mouse'),
  defineTheme('paper-fox', 'a folded-paper fox'),
  defineTheme('pocket-ufo', 'a pocket-sized UFO with legs'),
  defineTheme('racing-snail', "the world's fastest tiny snail"),
  defineTheme('roller-flea', 'a wind-up flea on roller skates'),
  defineTheme('rocket-tadpole', 'a tiny rocket tadpole'),
  defineTheme('stamp-cheetah', 'a postage-stamp cheetah'),
  defineTheme('runaway-teacup', 'a runaway teacup with sneakers'),
  defineTheme('disco-jellyfish', 'a disco jellyfish'),
  defineTheme('candy-volcano', 'a candy volcano in four colors'),
  defineTheme('patchwork-ghost', 'a patchwork rainbow ghost'),
  defineTheme('paint-squid', 'a colorful squid'),
  defineTheme('glass-axolotl', 'a stained-glass axolotl'),
  defineTheme('confetti-phoenix', 'a confetti phoenix chick'),
  defineTheme('neon-slug', 'a neon garden slug'),
  defineTheme('crayon-coral', 'a crayon coral castle'),
]);

// Extend the published calendar by appending here. Never reorder, delete, or
// reuse ids from a shipped season; add a new season below for the next year.
const YEAR_ONE_THEME_EXTENSION = Object.freeze([
  defineTheme('acorn-yak', 'an acorn yak with muddy boots'),
  defineTheme('thorny-owl', 'a thorny owl with a moon-shaped mask'),
  defineTheme('scooter-sparrow', 'a scooter sparrow delivering a letter'),
  defineTheme('watercolor-tiger', 'a watercolor tiger with drippy stripes'),
  defineTheme('marshmallow-rhino', 'a marshmallow rhino in rain boots'),
  defineTheme('needle-lizard', 'a needle lizard guarding a button'),
  defineTheme('zipper-lizard', 'a zipper lizard racing its own tail'),
  defineTheme('mosaic-whale', 'a mosaic whale floating over rooftops'),
  defineTheme('teapot-hippo', 'a teapot hippo pouring a tiny river'),
  defineTheme('crown-scorpion', 'a crown scorpion with jeweled claws'),
  defineTheme('jetpack-bunny', 'a jetpack bunny chasing a paper plane'),
  defineTheme('rainbow-raccoon', 'a rainbow raccoon painting the night'),
  defineTheme('mountain-hamster', 'a mountain hamster carrying a cabin'),
  defineTheme('crystal-rooster', 'a crystal rooster with a jagged crown'),
  defineTheme('skating-gecko', 'a skating gecko crossing a frozen puddle'),
  defineTheme('polka-dot-kraken', 'a polka-dot kraken having a tea party'),
  defineTheme('pumpkin-bison', 'a pumpkin bison with leafy horns'),
  defineTheme('spear-narwhal', 'a spear narwhal sailing through clouds'),
  defineTheme('comet-beetle', 'a comet beetle leaving a curly trail'),
  defineTheme('sunset-zebra', 'a sunset zebra with glowing hooves'),
  defineTheme('castle-turtle', 'a sleepy castle turtle carrying three towers'),
  defineTheme('pinecone-wolf', 'a pinecone wolf with a prickly mane'),
  defineTheme('sprinting-mushroom', 'a sprinting mushroom late for breakfast'),
  defineTheme('paint-splash-panda', 'a paint-splash panda juggling colors'),
  defineTheme('dumpling-elephant', 'a dumpling elephant with a heavy backpack'),
  defineTheme('star-antelope', 'a star antelope with sparkling antlers'),
  defineTheme('windmill-weasel', 'a windmill weasel spinning through town'),
  defineTheme('confetti-crocodile', 'a confetti crocodile at a quiet picnic'),
  defineTheme('mossy-mammoth', 'a mossy mammoth with mushroom slippers'),
  defineTheme('cactus-knight', 'a cactus knight holding a tiny shield'),
  defineTheme('yo-yo-falcon', 'a yo-yo falcon looping around a tower'),
  defineTheme('kaleidoscope-koala', 'a kaleidoscope koala in a bright tree'),
  defineTheme('barrel-badger', 'a barrel badger rolling up a hill'),
  defineTheme('coral-lion', 'a coral lion with a spiky sea mane'),
  defineTheme('racing-raindrop', 'a racing raindrop wearing goggles'),
  defineTheme(
    'striped-moon-rabbit',
    'a striped moon rabbit hopping through stars'
  ),
  defineTheme('cookie-gorilla', 'a cookie gorilla guarding a crumb castle'),
  defineTheme('icicle-rabbit', 'an icicle rabbit with crystal ears'),
  defineTheme('rocket-skunk', 'a rocket skunk zooming past the moon'),
  defineTheme(
    'glowing-garden-golem',
    'a glowing garden golem covered in flowers'
  ),
  defineTheme('snowball-buffalo', 'a snowball buffalo with woolly boots'),
  defineTheme('porcupine-prince', 'a porcupine prince with a needle cape'),
  defineTheme('origami-crane', 'a bouncing origami crane on one foot'),
  defineTheme('pastel-sea-serpent', 'a pastel sea serpent wearing ribbons'),
  defineTheme('coconut-boar', 'a coconut boar building a sand fort'),
  defineTheme('jagged-koi', 'a jagged koi swimming through the sky'),
  defineTheme('turbo-tortoise', 'a turbo tortoise with checkered shoes'),
  defineTheme(
    'checkerboard-chameleon',
    'a checkerboard chameleon changing colors'
  ),
  defineTheme('brick-toad', 'a brick toad sitting on a sturdy throne'),
  defineTheme('shard-gecko', 'a shard gecko with a glassy tail'),
  defineTheme('kite-kangaroo', 'a kite kangaroo bouncing above the trees'),
  defineTheme('tie-dye-toucan', 'a tie-dye toucan with a rainbow beak'),
  defineTheme('pancake-bear', 'a pancake bear carrying a syrup jar'),
  defineTheme(
    'compass-spider',
    'a compass spider pointing in eight directions'
  ),
  defineTheme('skipping-shark', 'a skipping shark crossing a puddle'),
  defineTheme('stained-glass-fawn', 'a stained-glass fawn in a sunny forest'),
  defineTheme('potato-minotaur', 'a potato minotaur lost in a tiny maze'),
  defineTheme('bramble-swan', 'a bramble swan with thorny feathers'),
  defineTheme('runaway-sock', 'a runaway sock escaping the laundry'),
  defineTheme('flower-firework-fox', 'a flower-firework fox under the stars'),
  defineTheme('anvil-duck', 'an anvil duck with surprisingly tiny wings'),
  defineTheme('arrowhead-fox', 'an arrowhead fox with a pointed tail'),
  defineTheme('pinwheel-puma', 'a pinwheel puma chasing a gust of wind'),
  defineTheme('bubblegum-dragon', 'a bubblegum dragon blowing square bubbles'),
  defineTheme('suitcase-walrus', 'a suitcase walrus packed for a long trip'),
  defineTheme('sunburst-goat', 'a sunburst goat with radiant horns'),
  defineTheme(
    'roller-centipede',
    'a roller-coaster centipede with a tiny helmet'
  ),
  defineTheme('lantern-koi', 'a lantern koi glowing beneath lily pads'),
  defineTheme('pudding-dinosaur', 'a pudding dinosaur wobbling through town'),
  defineTheme('thistle-griffin', 'a thistle griffin with prickly wings'),
  defineTheme('whirlwind-chicken', 'a whirlwind chicken late for school'),
  defineTheme(
    'rainbow-capybara',
    'a rainbow capybara relaxing in bright water'
  ),
  defineTheme('fortress-beetle', 'a fortress beetle carrying a drawbridge'),
  defineTheme('sawtooth-seal', 'a sawtooth seal balancing an icicle'),
  defineTheme(
    'spring-loaded-otter',
    'a spring-loaded otter bouncing over rocks'
  ),
  defineTheme(
    'patchwork-peacock',
    'a patchwork peacock opening a colorful fan'
  ),
  defineTheme('turnip-titan', 'a turnip titan lifting a garden shed'),
  defineTheme('prism-mantis', 'a prism mantis with shining blade arms'),
  defineTheme('speedy-scarecrow', 'a speedy scarecrow chasing runaway hats'),
  defineTheme('neon-noodle-worm', 'a neon noodle worm in a glowing garden'),
  defineTheme('woolly-whale', 'a woolly whale with four sturdy legs'),
  defineTheme('spire-cat', 'a spire cat perched on a needle tower'),
  defineTheme('flying-toaster', 'a flying toaster flapping past breakfast'),
  defineTheme('candy-cloud-kitten', 'a candy-cloud kitten in a pastel storm'),
  defineTheme('chunky-chimera', 'a chunky chimera sharing one small chair'),
  defineTheme(
    'spike-shell-snail',
    'a spike-shell snail climbing a castle wall'
  ),
  defineTheme(
    'tiny-train-dragon',
    'a tiny train dragon speeding around a cake'
  ),
  defineTheme('crayon-jungle-king', 'a crayon jungle king with scribbly fur'),
  defineTheme('meteor-mole', 'a meteor mole digging through a mountain'),
  defineTheme('lightning-kiwi', 'a lightning kiwi with a crown of sparks'),
]);

const yearOneThemes = Object.freeze([
  ...launchCommunityThemes,
  ...YEAR_ONE_THEME_EXTENSION,
]);

export const COMMUNITY_DRAW_THEME_SEASONS: readonly CommunityDrawThemeSeason[] =
  Object.freeze([
    Object.freeze({
      version: 1,
      startsOnArenaDay: 1,
      themes: yearOneThemes,
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
