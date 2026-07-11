// Immutable care flavor for a Scribbit's three-day life. These reactions are
// presentation-only: they never change progression, currency, or combat state.

import type { CareAction } from '../arena';
import { SHAPE_POWER_IDS } from '../combat/shapepowercontent';
import type { PrimaryPower } from '../combat/types';
import { hashContentKey } from './deterministic';

export type CareReactionLifeDay = 1 | 2 | 3;
export type CareReactionVariant = 1 | 2;

export type CareReaction = Readonly<{
  id: string;
  power: PrimaryPower;
  action: CareAction;
  lifeDay: CareReactionLifeDay;
  variant: CareReactionVariant;
  line: string;
}>;

export type CareReactionCatalogValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  entryCount: number;
  expectedEntryCount: number;
  coveredMatrixSlotCount: number;
}>;

type CareReactionLinePair = readonly [string, string];

type CareReactionMoment = Readonly<{
  power: PrimaryPower;
  action: CareAction;
  lifeDay: CareReactionLifeDay;
  lines: CareReactionLinePair;
}>;

export const CARE_REACTION_DECK_VERSION = 1;
export const CARE_REACTION_EXPECTED_ENTRY_COUNT = 72;
export const CARE_REACTION_MINIMUM_LINE_LENGTH = 32;
export const CARE_REACTION_MAXIMUM_LINE_LENGTH = 88;

export const CARE_REACTION_POWERS: readonly PrimaryPower[] = SHAPE_POWER_IDS;
export const CARE_REACTION_ACTIONS: readonly CareAction[] = Object.freeze([
  'feed',
  'pat',
  'train',
]);
export const CARE_REACTION_LIFE_DAYS: readonly CareReactionLifeDay[] =
  Object.freeze([1, 2, 3]);
export const CARE_REACTION_VARIANTS: readonly CareReactionVariant[] =
  Object.freeze([1, 2]);

const EXPECTED_POWER_COUNT = 4;
const EXPECTED_MOMENT_COUNT = 36;
const CARE_REACTION_ID_MAXIMUM_LENGTH = 64;
const CARE_REACTION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN_CARE_REACTION_CLAIM =
  /\b(?:rewards?|experience points?|xp|clout|prizes?|currency|payout|ink\s+(?:balance|wallet)|combat results?|damage|stats?|wins?|winning|won|loses?|losing|lost|victors?|victory|defeats?|champions?|odds|guarantee(?:d|s)?)\b/i;

const defineCareReactionMoment = (
  power: PrimaryPower,
  action: CareAction,
  lifeDay: CareReactionLifeDay,
  firstLine: string,
  secondLine: string
): CareReactionMoment => {
  const lines: CareReactionLinePair = [firstLine, secondLine];
  return Object.freeze({
    power,
    action,
    lifeDay,
    lines: Object.freeze(lines),
  });
};

const CARE_REACTION_MOMENTS: readonly CareReactionMoment[] = Object.freeze([
  // Inkquake: broad, weighty movement with soft page-thumps and ripples.
  defineCareReactionMoment(
    'inkquake',
    'feed',
    1,
    'It plants both feet and squashes the crumb into a tiny moon.',
    'Its round belly bumps the snack across three pencil lines.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'feed',
    2,
    'It stomps once; cracker crumbs hop in a neat paper ring.',
    'It sits on the biscuit, then peels it free with great ceremony.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'feed',
    3,
    'One happy belly thump sends toast specks around the page.',
    'It hugs the snack close enough to crease the paper beneath.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'pat',
    1,
    'A gentle pat makes its broad outline wobble like jelly.',
    'It flattens under your palm, then pops back with a soft thump.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'pat',
    2,
    'Its shoulders sink; a round ripple wrinkles the paper.',
    'It leans into the pat until both feet leave pencil dents.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'pat',
    3,
    'It rolls onto its back and drums the page with stubby heels.',
    'Your pat sends one slow wobble from its ears to its toes.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'train',
    1,
    'It practices tiny stomps around a bottle-cap marker.',
    'It braces wide and nudges a paper wad across the margin.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'train',
    2,
    'Three careful footfalls make the practice scraps bounce.',
    'It circles a drawn X, landing each step with a page-thump.'
  ),
  defineCareReactionMoment(
    'inkquake',
    'train',
    3,
    'It balances a cardboard square, then stamps beside it.',
    'It marches the crease line until every loose scrap jiggles.'
  ),

  // Nib Halo: careful quills, sharp corners, and precise paper handling.
  defineCareReactionMoment(
    'nib_halo',
    'feed',
    1,
    'It spears a berry crumb on one tiny quill and admires it.',
    'Its sharp corners cradle the snack like a crooked paper bowl.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'feed',
    2,
    'Three crumbs perch on its nibs before it nibbles them in order.',
    'It rolls the treat around its halo, choosing the crispest edge.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'feed',
    3,
    'It carves the biscuit into a star, then crunches every point.',
    'Its quills click together and catch each tumbling oat.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'pat',
    1,
    'Your pat smooths one spike; two others spring up proudly.',
    'It tilts its halo away, then offers one careful corner.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'pat',
    2,
    'Its quills fold flat beneath your hand like a paper fan.',
    'A scratch between the nibs makes its whole outline purr.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'pat',
    3,
    'It bows each sharp point in turn beneath your fingertips.',
    'Your palm circles its halo; every quill follows like a compass.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'train',
    1,
    'It threads three quills through holes in a paper leaf.',
    'It practices turning sideways through a narrow card gate.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'train',
    2,
    'Its halo carries bottle caps around a penciled spiral.',
    'It stacks scrap triangles neatly on every waiting nib.'
  ),
  defineCareReactionMoment(
    'nib_halo',
    'train',
    3,
    'It traces a jagged maze without brushing either paper wall.',
    'Three quills pass a paper ring around without dropping it.'
  ),

  // Smearstep: quick loops, skids, and soft pencil trails.
  defineCareReactionMoment(
    'smearstep',
    'feed',
    1,
    'It zips past the snack, then skids back for a tiny bite.',
    'A crumb lands; it leaves two pencil streaks getting there.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'feed',
    2,
    'It loops the saucer twice before snatching one raisin.',
    'Its quick feet shuffle cracker bits into a tidy comet tail.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'feed',
    3,
    'It catches each falling oat before the first one settles.',
    'One swift lap turns the snack wrapper into a paper pinwheel.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'pat',
    1,
    'Your hand arrives late; it scoots back under for the pat.',
    'It darts in a circle, then parks its head beneath your palm.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'pat',
    2,
    'A quick pat sends its tail scribbling loops across the page.',
    'It melts into a happy streak, then gathers itself by your thumb.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'pat',
    3,
    'It races your fingertips along the margin and noses ahead.',
    'Your pat starts a blur that settles into two neat footprints.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'train',
    1,
    'It dashes between three erasers without touching a corner.',
    'It follows a zigzag pencil trail, leaving a softer echo.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'train',
    2,
    'Two quick laps curl the practice ribbon into a spiral.',
    'It skims under a paper bridge and stops on the drawn dot.'
  ),
  defineCareReactionMoment(
    'smearstep',
    'train',
    3,
    'It weaves through standing crayons with barely a rustle.',
    'A final skid parks all four feet inside a postage stamp.'
  ),

  // Colorburst: patchwork color, bright sorting, and paper confetti.
  defineCareReactionMoment(
    'colorburst',
    'feed',
    1,
    'It sorts the crumbs by color before making a rainbow mouthful.',
    'A berry smudge blooms across its patchwork cheeks as it chews.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'feed',
    2,
    'It rolls peas through painted spots and eats them by shade.',
    'Each bite leaves a different crayon-colored dot on its bib.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'feed',
    3,
    'It folds the wrapper into a bright crown between mouthfuls.',
    'Its patchwork belly glows like stained paper after the snack.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'pat',
    1,
    'Your pat makes three bright patches swap places with a flicker.',
    'It presses a paint-speckled cheek warmly against your palm.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'pat',
    2,
    'A soft stroke sends color rippling through every paper patch.',
    'It rolls over, revealing a new crayon shade on each side.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'pat',
    3,
    'Your fingers trace its patches; each one flutters like a flag.',
    'It fans its bright tail across the page and waits for another.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'train',
    1,
    'It matches colored paper scraps to spots along its back.',
    'It hops between crayon circles in a careful rainbow order.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'train',
    2,
    'It carries four bright buttons across a patchwork path.',
    'A painted ribbon follows each turn of its practice dance.'
  ),
  defineCareReactionMoment(
    'colorburst',
    'train',
    3,
    'It arranges paper squares into a prism around its feet.',
    'It spins once, scattering colored tabs into a tidy sunburst.'
  ),
]);

const createCareReactionId = (
  power: PrimaryPower,
  action: CareAction,
  lifeDay: CareReactionLifeDay,
  variant: CareReactionVariant
): string =>
  `${power.replaceAll('_', '-')}-${action}-day-${lifeDay}-variant-${variant}`;

const buildCareReactionDeck = (): readonly CareReaction[] => {
  const reactions: CareReaction[] = [];

  for (const moment of CARE_REACTION_MOMENTS) {
    for (const variant of CARE_REACTION_VARIANTS) {
      const line = moment.lines[variant - 1];
      if (line === undefined) {
        throw new Error(`Care Reaction moment is missing variant ${variant}.`);
      }
      reactions.push(
        Object.freeze({
          id: createCareReactionId(
            moment.power,
            moment.action,
            moment.lifeDay,
            variant
          ),
          power: moment.power,
          action: moment.action,
          lifeDay: moment.lifeDay,
          variant,
          line,
        })
      );
    }
  }

  return Object.freeze(reactions);
};

export const CARE_REACTION_DECK: readonly CareReaction[] =
  buildCareReactionDeck();

const isCareReactionPower = (value: unknown): value is PrimaryPower =>
  typeof value === 'string' &&
  CARE_REACTION_POWERS.some((power) => power === value);

const isCareReactionAction = (value: unknown): value is CareAction =>
  typeof value === 'string' &&
  CARE_REACTION_ACTIONS.some((action) => action === value);

const isCareReactionLifeDay = (value: unknown): value is CareReactionLifeDay =>
  typeof value === 'number' &&
  CARE_REACTION_LIFE_DAYS.some((lifeDay) => lifeDay === value);

const isCareReactionVariant = (value: unknown): value is CareReactionVariant =>
  typeof value === 'number' &&
  CARE_REACTION_VARIANTS.some((variant) => variant === value);

const createMatrixSlotKey = (
  power: PrimaryPower,
  action: CareAction,
  lifeDay: CareReactionLifeDay,
  variant: CareReactionVariant
): string => `${power}:${action}:${lifeDay}:${variant}`;

export const validateCareReactionCatalog = (
  reactions: readonly CareReaction[] = CARE_REACTION_DECK
): CareReactionCatalogValidation => {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenLines = new Set<string>();
  const matrixSlotCounts = new Map<string, number>();

  if (CARE_REACTION_POWERS.length !== EXPECTED_POWER_COUNT) {
    errors.push(
      `Expected ${EXPECTED_POWER_COUNT} Care Reaction powers, found ${CARE_REACTION_POWERS.length}`
    );
  }
  if (CARE_REACTION_MOMENTS.length !== EXPECTED_MOMENT_COUNT) {
    errors.push(
      `Expected ${EXPECTED_MOMENT_COUNT} care moments, found ${CARE_REACTION_MOMENTS.length}`
    );
  }
  if (reactions.length !== CARE_REACTION_EXPECTED_ENTRY_COUNT) {
    errors.push(
      `Expected ${CARE_REACTION_EXPECTED_ENTRY_COUNT} Care Reactions, found ${reactions.length}`
    );
  }
  if (!Object.isFrozen(reactions)) {
    errors.push('Care Reaction catalog must be frozen');
  }

  reactions.forEach((reaction, index) => {
    const label = reaction.id || `Care Reaction ${index + 1}`;

    if (!Object.isFrozen(reaction)) {
      errors.push(`${label} must be frozen`);
    }

    const normalizedId = reaction.id.trim().toLowerCase();
    if (!CARE_REACTION_ID_PATTERN.test(reaction.id)) {
      errors.push(`${label} has an invalid content id`);
    }
    if (reaction.id.length > CARE_REACTION_ID_MAXIMUM_LENGTH) {
      errors.push(
        `${label} id is ${reaction.id.length} characters; maximum is ${CARE_REACTION_ID_MAXIMUM_LENGTH}`
      );
    }
    if (seenIds.has(normalizedId)) {
      errors.push(`${label} id is duplicated`);
    }
    seenIds.add(normalizedId);

    const normalizedLine = reaction.line.trim().toLowerCase();
    if (reaction.line !== reaction.line.trim()) {
      errors.push(`${label} line must not have outer whitespace`);
    }
    if (reaction.line.length < CARE_REACTION_MINIMUM_LINE_LENGTH) {
      errors.push(
        `${label} line is ${reaction.line.length} characters; minimum is ${CARE_REACTION_MINIMUM_LINE_LENGTH}`
      );
    }
    if (reaction.line.length > CARE_REACTION_MAXIMUM_LINE_LENGTH) {
      errors.push(
        `${label} line is ${reaction.line.length} characters; maximum is ${CARE_REACTION_MAXIMUM_LINE_LENGTH}`
      );
    }
    if (seenLines.has(normalizedLine)) {
      errors.push(`${label} line is duplicated`);
    }
    seenLines.add(normalizedLine);
    if (FORBIDDEN_CARE_REACTION_CLAIM.test(reaction.line)) {
      errors.push(`${label} line makes a progression or outcome claim`);
    }

    const powerAllowed = isCareReactionPower(reaction.power);
    const actionAllowed = isCareReactionAction(reaction.action);
    const lifeDayAllowed = isCareReactionLifeDay(reaction.lifeDay);
    const variantAllowed = isCareReactionVariant(reaction.variant);

    if (!powerAllowed) errors.push(`${label} has an unknown Primary Power`);
    if (!actionAllowed) errors.push(`${label} has an unknown care action`);
    if (!lifeDayAllowed) errors.push(`${label} has an invalid life day`);
    if (!variantAllowed) errors.push(`${label} has an invalid variant`);

    if (powerAllowed && actionAllowed && lifeDayAllowed && variantAllowed) {
      const slotKey = createMatrixSlotKey(
        reaction.power,
        reaction.action,
        reaction.lifeDay,
        reaction.variant
      );
      matrixSlotCounts.set(slotKey, (matrixSlotCounts.get(slotKey) ?? 0) + 1);
    }
  });

  for (const power of CARE_REACTION_POWERS) {
    for (const action of CARE_REACTION_ACTIONS) {
      for (const lifeDay of CARE_REACTION_LIFE_DAYS) {
        for (const variant of CARE_REACTION_VARIANTS) {
          const slotKey = createMatrixSlotKey(power, action, lifeDay, variant);
          const slotCount = matrixSlotCounts.get(slotKey) ?? 0;
          if (slotCount !== 1) {
            errors.push(`${slotKey} has ${slotCount} entries; expected 1`);
          }
        }
      }
    }
  }

  const coveredMatrixSlotCount = [...matrixSlotCounts.values()].filter(
    (slotCount) => slotCount === 1
  ).length;
  const frozenErrors: readonly string[] = Object.freeze(errors);
  return Object.freeze({
    valid: frozenErrors.length === 0,
    errors: frozenErrors,
    entryCount: reactions.length,
    expectedEntryCount: CARE_REACTION_EXPECTED_ENTRY_COUNT,
    coveredMatrixSlotCount,
  });
};

const careReactionCatalogValidation = validateCareReactionCatalog();
if (!careReactionCatalogValidation.valid) {
  throw new Error(
    `Invalid Care Reaction content:\n${careReactionCatalogValidation.errors.join('\n')}`
  );
}

const careReactionByMatrixSlot: ReadonlyMap<string, CareReaction> = new Map(
  CARE_REACTION_DECK.map((reaction) => [
    createMatrixSlotKey(
      reaction.power,
      reaction.action,
      reaction.lifeDay,
      reaction.variant
    ),
    reaction,
  ])
);

const clampCareReactionLifeDay = (lifeDay: number): CareReactionLifeDay => {
  if (!Number.isFinite(lifeDay)) return lifeDay > 0 ? 3 : 1;

  const roundedLifeDay = Math.round(lifeDay);
  if (roundedLifeDay <= 1) return 1;
  if (roundedLifeDay >= 3) return 3;
  return 2;
};

export function selectCareReaction(
  power: PrimaryPower,
  action: CareAction,
  lifeDay: number,
  stableScribbitKey: string
): CareReaction {
  const clampedLifeDay = clampCareReactionLifeDay(lifeDay);
  const selectionKey = [
    `care-reaction-v${CARE_REACTION_DECK_VERSION}`,
    stableScribbitKey.length,
    stableScribbitKey,
    power,
    action,
    clampedLifeDay,
  ].join(':');
  const variantIndex =
    hashContentKey(selectionKey) % CARE_REACTION_VARIANTS.length;
  const variant = CARE_REACTION_VARIANTS[variantIndex];
  if (variant === undefined) {
    throw new Error('Care Reaction variants must not be empty.');
  }

  const reaction = careReactionByMatrixSlot.get(
    createMatrixSlotKey(power, action, clampedLifeDay, variant)
  );
  if (!reaction) {
    throw new Error(
      `Care Reaction catalog is missing ${power}:${action}:${clampedLifeDay}:${variant}.`
    );
  }
  return reaction;
}
