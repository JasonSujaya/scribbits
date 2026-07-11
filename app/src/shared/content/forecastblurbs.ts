// Daily public flavor shared by the splash, Arena, Reddit post, and result
// comment. The 32-day rotation is deterministic and cannot change combat rolls.

export type ForecastBlurbValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  blurbCount: number;
}>;

const EXPECTED_BLURB_COUNT = 32;
const BLURB_MAXIMUM_LENGTH = 72;
const FORBIDDEN_FORECAST_CLAIM =
  /\b(?:win|winner|odds|guaranteed|reward|xp|clout|prize)\b/i;

export const FORECAST_BLURBS: readonly string[] = Object.freeze([
  'Cinder gusts make tiny heroes feel enormous',
  'Bubble fog rolls in with suspicious confidence',
  'Moss thunder drums under the arena floor',
  'Storm static turns every doodle extra dramatic',
  'Warm sparks chase shadows off the brackets',
  'Tide spray has everyone yelling like captains',
  'Rooty winds smell like wet crayons and adventure',
  'Cloudbursts keep trying to referee the fights',
  'The arena floor woke up squeaky and brave',
  'A weird breeze keeps chanting for underdogs',
  'The forecast says bring snacks and a helmet',
  'Moonlit drizzle turns every splash silver',
  'Sun-warm paper curls at the arena edges',
  'A leafy squall is teaching the crowd to duck',
  'Tiny hailstones keep bouncing off the bell',
  "Crayon fog has swallowed the judges' pencils",
  'Paper birds are circling the loudest corner',
  "A saltwind keeps stealing the scorekeeper's hat",
  'Firefly sparks are gathering above center page',
  'The roots below the ring are humming in harmony',
  'A violet breeze is folding clouds into crowns',
  'The tide left glittering footprints on every lane',
  'Toasty smoke is drawing faces in the rafters',
  'Thunderclouds arrived wearing very small boots',
  'The mossy bleachers are growing extra cushions',
  'Dawn light keeps changing the color of the tape',
  'A pocket tornado is heckling both corners',
  "The moon has drawn a ring around tonight's bell",
  'Sea foam confetti is sticking to every banner',
  'Golden dust is making the whole bracket sparkle',
  'A cool gust keeps flipping to the dramatic page',
  'The arena pencils are vibrating with anticipation',
]);

export const validateForecastBlurbs = (
  blurbs: readonly string[] = FORECAST_BLURBS
): ForecastBlurbValidation => {
  const errors: string[] = [];
  const seenBlurbs = new Set<string>();
  if (blurbs.length !== EXPECTED_BLURB_COUNT) {
    errors.push(
      `Expected ${EXPECTED_BLURB_COUNT} forecast blurbs, found ${blurbs.length}`
    );
  }

  blurbs.forEach((blurb, index) => {
    const label = `Forecast blurb ${index + 1}`;
    const normalizedBlurb = blurb.trim().toLowerCase();
    if (normalizedBlurb.length === 0) errors.push(`${label} must not be blank`);
    if (blurb !== blurb.trim()) {
      errors.push(`${label} must not have outer whitespace`);
    }
    if (blurb.length > BLURB_MAXIMUM_LENGTH) {
      errors.push(
        `${label} is ${blurb.length} characters; maximum is ${BLURB_MAXIMUM_LENGTH}`
      );
    }
    if (seenBlurbs.has(normalizedBlurb)) {
      errors.push(`${label} duplicates an earlier blurb`);
    }
    seenBlurbs.add(normalizedBlurb);
    if (FORBIDDEN_FORECAST_CLAIM.test(blurb)) {
      errors.push(`${label} predicts an outcome or promises a reward`);
    }
  });

  const frozenErrors = Object.freeze(errors);
  return Object.freeze({
    valid: frozenErrors.length === 0,
    errors: frozenErrors,
    blurbCount: blurbs.length,
  });
};

const catalogValidation = validateForecastBlurbs();
if (!catalogValidation.valid) {
  throw new Error(
    `Invalid forecast flavor content:\n${catalogValidation.errors.join('\n')}`
  );
}

export const selectDailyForecastBlurb = (dayNumber: number): string => {
  const stableDay =
    Number.isSafeInteger(dayNumber) && dayNumber >= 1 ? dayNumber : 1;
  const blurb = FORECAST_BLURBS[(stableDay - 1) % FORECAST_BLURBS.length];
  if (!blurb) throw new Error('Forecast flavor catalog must not be empty.');
  return blurb;
};
