import type { Element, ScribbitStats } from './arena';
import { ELEMENTS } from './elements';

export type FoundingScribbitPersonality = Readonly<{
  epithet: string;
  challengeLine: string;
  openingLines: readonly [string, string];
  signatureReaction: string;
  victoryLine: string;
  defeatLine: string;
  rumbleLine: string;
}>;

export type FoundingScribbitDefinition = Readonly<{
  id: `founding-${string}`;
  name: string;
  artist: string;
  element: Element;
  stats: Readonly<ScribbitStats>;
  level: 1 | 2 | 3;
  imageUrl: `/creatures/creature-${string}.png`;
  personality: FoundingScribbitPersonality;
}>;

export type FoundingScribbitDefinitionsValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

const EXPECTED_FOUNDER_COUNT = 20;
const EXPECTED_FOUNDERS_PER_ELEMENT = 5;
const EXPECTED_PERSONALITY_STRING_COUNT = 8;
const EPITHET_MAXIMUM_LENGTH = 26;
const PERSONALITY_LINE_MAXIMUM_LENGTH = 52;

const PERSONALITY_KEYS: readonly string[] = Object.freeze([
  'epithet',
  'challengeLine',
  'openingLines',
  'signatureReaction',
  'victoryLine',
  'defeatLine',
  'rumbleLine',
]);

const freezeFoundingScribbitDefinition = (
  definition: FoundingScribbitDefinition
): FoundingScribbitDefinition => {
  const openingLines: readonly [string, string] = Object.freeze([
    definition.personality.openingLines[0],
    definition.personality.openingLines[1],
  ]);

  return Object.freeze({
    ...definition,
    stats: Object.freeze({ ...definition.stats }),
    personality: Object.freeze({
      ...definition.personality,
      openingLines,
    }),
  });
};

export const FOUNDING_SCRIBBIT_DEFINITIONS: readonly FoundingScribbitDefinition[] =
  Object.freeze([
    freezeFoundingScribbitDefinition({
      id: 'founding-mosswhisk',
      name: 'Mosswhisk',
      artist: 'inkwell_kay',
      element: 'moss',
      stats: { chonk: 34, spike: 18, zip: 28, charm: 20 },
      level: 1,
      imageUrl: '/creatures/creature-mosswhisk.png',
      personality: {
        epithet: 'The Rootline Rumbler',
        challengeLine: 'Bring your boldest lines; my roots brought rhythm.',
        openingLines: [
          'Whiskers checked, moss laces tied.',
          'This page has room for a proper rootbeat.',
        ],
        signatureReaction: 'Rootquake rings through every penciled leaf!',
        victoryLine: 'A tidy thump, then tea beneath the ferns.',
        defeatLine: 'Good page! My whiskers need a fresh curl.',
        rumbleLine: 'Mosswhisk drums the margins with a rootbeat.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-fernibble',
      name: 'Fernibble',
      artist: 'crayon_bandit',
      element: 'moss',
      stats: { chonk: 22, spike: 30, zip: 34, charm: 14 },
      level: 2,
      imageUrl: '/creatures/creature-fernibble.png',
      personality: {
        epithet: 'The Fernside Flier',
        challengeLine: 'Race the curled path; I packed a leafy shortcut.',
        openingLines: [
          'Tiny bite, quick stride, fern cape ready.',
          'Mind the page corner; it tastes surprisingly crisp.',
        ],
        signatureReaction:
          'Nib Volley! Three green quills, no wasted scribble.',
        victoryLine: 'Shortcut found, fern fronds still perfectly folded.',
        defeatLine: 'Lovely lap! I took the scenic edge this time.',
        rumbleLine: 'Fernibble zips through the Rumble on leafy feet.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-barkbloom',
      name: 'Barkbloom',
      artist: 'marker_jules',
      element: 'moss',
      stats: { chonk: 48, spike: 16, zip: 12, charm: 24 },
      level: 3,
      imageUrl: '/creatures/creature-barkbloom.png',
      personality: {
        epithet: 'The Bloomwood Anchor',
        challengeLine: 'Set your stance; the old rings are keeping tempo.',
        openingLines: [
          'Bark polished, blossoms pinned, roots planted.',
          'I brought enough shade for the whole sideline.',
        ],
        signatureReaction: 'Rootquake! Every growth ring joins the chorus.',
        victoryLine: 'Firm footing, bright petals, splendid final stamp.',
        defeatLine: 'A fine shake-up; time to redraw my root map.',
        rumbleLine: 'Barkbloom holds center page like a flowered oak.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-gladepuff',
      name: 'Gladepuff',
      artist: 'doodle_ren',
      element: 'moss',
      stats: { chonk: 20, spike: 14, zip: 30, charm: 36 },
      level: 1,
      imageUrl: '/creatures/creature-gladepuff.png',
      personality: {
        epithet: 'The Meadow Confetti',
        challengeLine: 'Show me your colors; I brought meadow sparkle.',
        openingLines: [
          'Puff sleeves fluffed, petal palette open.',
          'Even the daisies reserved front-row doodles.',
        ],
        signatureReaction: 'Bloom Burst! The meadow echoes in full color.',
        victoryLine: 'Petals everywhere; that page deserved a parade.',
        defeatLine: "Sweet sketch! I'll fluff brighter for the next page.",
        rumbleLine: 'Gladepuff paints the rumble in pollen-bright arcs.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-elderglen',
      name: 'Elderglen',
      artist: 'smudge_sam',
      element: 'moss',
      stats: { chonk: 42, spike: 26, zip: 10, charm: 22 },
      level: 2,
      imageUrl: '/creatures/creature-elderglen.png',
      personality: {
        epithet: 'The Ancient Baseline',
        challengeLine: 'Take the center; these roots enjoy good company.',
        openingLines: [
          'Old rings awake, young leaves listening.',
          'I marked the margins before margins were cool.',
        ],
        signatureReaction: 'Rootquake rolls deep from the oldest pencil mark.',
        victoryLine: 'Steady roots, clean page, a tale for the grove.',
        defeatLine: 'Well drawn; even old bark learns a new rhythm.',
        rumbleLine: 'Elderglen turns the arena into a rooted drum.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-coalimp',
      name: 'Coalimp',
      artist: 'pastel_vin',
      element: 'ember',
      stats: { chonk: 18, spike: 38, zip: 28, charm: 16 },
      level: 1,
      imageUrl: '/creatures/creature-coalimp.png',
      personality: {
        epithet: 'The Drowsy Firetip',
        challengeLine: 'Wake the page gently; my charcoal points are warm.',
        openingLines: [
          'One yawn, three nibs, all present.',
          'I nap between sparks for professional reasons.',
        ],
        signatureReaction: 'Firetip Halo! The sleepy sparks found their orbit.',
        victoryLine: 'Warm marks, neat ring, now back to my coal pillow.',
        defeatLine: "Bright work; I'll sharpen after a tiny snooze.",
        rumbleLine: 'Coalimp circles the Rumble with ember-tipped nibs.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-cindercoil',
      name: 'Cindercoil',
      artist: 'graphite_jo',
      element: 'ember',
      stats: { chonk: 26, spike: 34, zip: 30, charm: 10 },
      level: 2,
      imageUrl: '/creatures/creature-cindercoil.png',
      personality: {
        epithet: 'The Spiral Spark',
        challengeLine: 'Follow the coil; every curve has a warm surprise.',
        openingLines: [
          'Spiral set, graphite glowing at the edges.',
          'Round and round makes excellent warm-up doodling.',
        ],
        signatureReaction: 'Firetip Halo spins from the heart of the coil!',
        victoryLine: 'That final curl lands with a cheerful little spark.',
        defeatLine: 'Fine flourish; my spiral wants one cleaner loop.',
        rumbleLine: 'Cindercoil winds bright nibs around center ink.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-ashwaddle',
      name: 'Ashwaddle',
      artist: 'eraser_vee',
      element: 'ember',
      stats: { chonk: 44, spike: 28, zip: 10, charm: 18 },
      level: 3,
      imageUrl: '/creatures/creature-ashwaddle.png',
      personality: {
        epithet: 'The Cinder Stomper',
        challengeLine: 'Bring a sturdy page; these ash boots love a beat.',
        openingLines: [
          'Boots dusted, belly braced, waddle engaged.',
          'Straight lines are optional for a proud waddle.',
        ],
        signatureReaction: 'Cinderquake! One warm stomp ripples the paper.',
        victoryLine: 'Big step, soft ash, excellent rhythm all around.',
        defeatLine: 'Nice footwork; my next waddle needs more bounce.',
        rumbleLine: 'Ashwaddle stamps a smoky rhythm across the rumble.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-flintstag',
      name: 'Flintstag',
      artist: 'sketchbook_max',
      element: 'ember',
      stats: { chonk: 30, spike: 32, zip: 24, charm: 14 },
      level: 1,
      imageUrl: '/creatures/creature-flintstag.png',
      personality: {
        epithet: 'The Antlered Fireline',
        challengeLine: 'Trace the antlers; every point catches a spark.',
        openingLines: [
          'Hooves squared, flint crown freshly crosshatched.',
          'The sidelines requested extra antler room.',
        ],
        signatureReaction: 'Firetip Halo crowns the page in three bright arcs!',
        victoryLine: 'A crisp finish, polished neatly on every tine.',
        defeatLine: "Sharp showing; I'll tune the angles in my crown.",
        rumbleLine: 'Flintstag frames the Rumble with sparking antlers.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-solarkiln',
      name: 'Solarkiln',
      artist: 'nib_and_nori',
      element: 'ember',
      stats: { chonk: 36, spike: 40, zip: 10, charm: 14 },
      level: 2,
      imageUrl: '/creatures/creature-solarkiln.png',
      personality: {
        epithet: 'The Sunbaked Sharpener',
        challengeLine: 'Warm up your lines; the kiln is humming in key.',
        openingLines: [
          'Sun dial set, kiln door glowing.',
          'Fresh pencils enter; golden points leave.',
        ],
        signatureReaction: 'Firetip Halo fires three kiln-bright strokes!',
        victoryLine: 'A golden firing, signed while the page is warm.',
        defeatLine: 'Clean craft; this kiln needs a calmer temperature.',
        rumbleLine: 'Solarkiln turns the rumble lines sun-gold.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-brinebutton',
      name: 'Brinebutton',
      artist: 'charcoal_zed',
      element: 'tide',
      stats: { chonk: 28, spike: 20, zip: 36, charm: 16 },
      level: 1,
      imageUrl: '/creatures/creature-brinebutton.png',
      personality: {
        epithet: 'The Buttoned Slipstream',
        challengeLine: 'Fasten your corners; the tide found a quick route.',
        openingLines: [
          'Button snug, salt trail sparkling.',
          'Small coat, enormous pocketful of sea breeze.',
        ],
        signatureReaction: 'Nib Volley! Three salty quills stitch up the page.',
        victoryLine: 'Neat passage; every button stayed shipshape.',
        defeatLine: "Smooth sailing; I'll resew that wandering dash.",
        rumbleLine: 'Brinebutton skims the Rumble on a silver wake.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-kelpkit',
      name: 'Kelpkit',
      artist: 'pixel_mara',
      element: 'tide',
      stats: { chonk: 24, spike: 18, zip: 32, charm: 26 },
      level: 2,
      imageUrl: '/creatures/creature-kelpkit.png',
      personality: {
        epithet: 'The Kelp-Cape Dasher',
        challengeLine: 'Chase the ribbon tide; my kelp cape knows the bends.',
        openingLines: [
          'Whiskers forward, sea ribbons untangled.',
          'The tidepool gave me permission to zoom.',
        ],
        signatureReaction: 'Nib Volley! Kelp-tipped quills cross the page.',
        victoryLine: 'Quick paws, clean wake, cape splendidly swishy.',
        defeatLine: 'Great run; my sea legs took the long curl.',
        rumbleLine: 'Kelpkit darts through the rumble on ribboned wakes.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-pearlmote',
      name: 'Pearlmote',
      artist: 'linework_luz',
      element: 'tide',
      stats: { chonk: 20, spike: 12, zip: 24, charm: 44 },
      level: 3,
      imageUrl: '/creatures/creature-pearlmote.png',
      personality: {
        epithet: 'The Pocket Pearlburst',
        challengeLine: 'Bring a bright palette; I saved a shimmer for you.',
        openingLines: [
          'Pearl polished, tiny spotlight located.',
          'Small mote, surprisingly roomy color wheel.',
        ],
        signatureReaction:
          'Splashback! A pearl-bright cone returns in ripples.',
        victoryLine: 'Shimmer filed, colors balanced, tiny bow complete.',
        defeatLine: "Lovely colors; I'll polish a softer second echo.",
        rumbleLine: 'Pearlmote glints across the Rumble in tidal color.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-coraloom',
      name: 'Coraloom',
      artist: 'sticker_tess',
      element: 'tide',
      stats: { chonk: 40, spike: 22, zip: 16, charm: 22 },
      level: 1,
      imageUrl: '/creatures/creature-coraloom.png',
      personality: {
        epithet: 'The Reefwoven Anchor',
        challengeLine: 'Plant your stance; this reef keeps a woven rhythm.',
        openingLines: [
          'Coral frame set, tide threads pulled snug.',
          'Every sturdy pattern starts with one patient knot.',
        ],
        signatureReaction: 'Tidal Thump! The woven reef sends a round wave.',
        victoryLine: 'Strong weave, even tide, pattern neatly finished.',
        defeatLine: 'Good pattern; one loose loop sent me drifting.',
        rumbleLine: 'Coraloom anchors the rumble in reef-woven rings.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-moonurchin',
      name: 'Moonurchin',
      artist: 'colorwheel_ivy',
      element: 'tide',
      stats: { chonk: 34, spike: 36, zip: 10, charm: 20 },
      level: 2,
      imageUrl: '/creatures/creature-moonurchin.png',
      personality: {
        epithet: 'The Lunar Quillkeeper',
        challengeLine: 'Mind the moonpoints; they prefer graceful circles.',
        openingLines: [
          'Tide low, moon high, quills counted.',
          'I chart each spine by the glow on the water.',
        ],
        signatureReaction: 'Riptide Halo! Three moonlit quills take orbit.',
        victoryLine: 'Tides aligned, quills tucked, moon chart complete.',
        defeatLine: "Bright orbit; I'll redraw the tide marks tonight.",
        rumbleLine: 'Moonurchin rolls lunar quills around the rumble.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-cloudpip',
      name: 'Cloudpip',
      artist: 'paperclip_noa',
      element: 'storm',
      stats: { chonk: 18, spike: 18, zip: 46, charm: 18 },
      level: 1,
      imageUrl: '/creatures/creature-cloudpip.png',
      personality: {
        epithet: 'The Pocket Bolt',
        challengeLine: 'Blink if you like; my cloud trail loves a quick lap.',
        openingLines: [
          'Pip charged, cloudlaces double-knotted.',
          'I travel light: one puff and several zigzags.',
        ],
        signatureReaction: 'Nib Volley! Three cloud-quills cross the page.',
        victoryLine: 'Quick lap logged, thunder kept neatly pocket-sized.',
        defeatLine: 'Good breeze; my second zig landed off the margin.',
        rumbleLine: 'Cloudpip flashes through the rumble in tiny thunder.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-gustling',
      name: 'Gustling',
      artist: 'inkdrop_milo',
      element: 'storm',
      stats: { chonk: 20, spike: 24, zip: 42, charm: 14 },
      level: 2,
      imageUrl: '/creatures/creature-gustling.png',
      personality: {
        epithet: 'The Margin Tailwind',
        challengeLine: 'Lean into the draft; I drew a lane through the sky.',
        openingLines: [
          'Tailwind ready, loose pages respectfully pinned.',
          'I whistle only when the crosshatch agrees.',
        ],
        signatureReaction: 'Nib Volley! The tailwind lines up every quill.',
        victoryLine: 'Lane traced, breeze bowed, pencils still airborne.',
        defeatLine: "Clever current; I'll study that curl in the wind.",
        rumbleLine: 'Gustling drafts a fast lane through the rumble.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-ribbonrook',
      name: 'Ribbonrook',
      artist: 'loopdoodle_ari',
      element: 'storm',
      stats: { chonk: 24, spike: 16, zip: 34, charm: 26 },
      level: 3,
      imageUrl: '/creatures/creature-ribbonrook.png',
      personality: {
        epithet: 'The Sky-Ribbon Rook',
        challengeLine: 'Pick a lane; my ribbons already mapped the corners.',
        openingLines: [
          'Wings squared, streamers combed, rook ready.',
          'Corners are invitations with sharper stationery.',
        ],
        signatureReaction: 'Nib Volley! Bright quills sweep the open file.',
        victoryLine: 'File crossed, ribbons crisp, corner signed.',
        defeatLine: 'Fine route; I folded one turn a square too soon.',
        rumbleLine: 'Ribbonrook sweeps the Rumble in checked streamers.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-thunderbud',
      name: 'Thunderbud',
      artist: 'washitape_kit',
      element: 'storm',
      stats: { chonk: 26, spike: 38, zip: 20, charm: 16 },
      level: 1,
      imageUrl: '/creatures/creature-thunderbud.png',
      personality: {
        epithet: 'The Crackling Bud',
        challengeLine: 'Open your sketch; this stormbud brought three tips.',
        openingLines: [
          'Petals tight, static crown gently buzzing.',
          'A little rain snack keeps the thunder round.',
        ],
        signatureReaction:
          'Static Crown! Three stormtips bloom around the bud.',
        victoryLine: 'Petals open, sparks tidy, storm garden applauding.',
        defeatLine: "Strong shower; I'll give these petals more room.",
        rumbleLine: 'Thunderbud blooms bright quills over the rumble.',
      },
    }),
    freezeFoundingScribbitDefinition({
      id: 'founding-aurorawing',
      name: 'Aurorawing',
      artist: 'prism_nell',
      element: 'storm',
      stats: { chonk: 22, spike: 26, zip: 28, charm: 24 },
      level: 2,
      imageUrl: '/creatures/creature-aurorawing.png',
      personality: {
        epithet: 'The Prism Glider',
        challengeLine: 'Share the sky lane; my colors follow every turn.',
        openingLines: [
          'Wings inked, prism trail tuned.',
          'Dawn left me a fresh ribbon across the clouds.',
        ],
        signatureReaction: 'Nib Volley! Aurora quills cross in color.',
        victoryLine: 'Skyline signed in color, wings folded with flair.',
        defeatLine: 'Beautiful turn; my prism trail needs a softer bend.',
        rumbleLine: 'Aurorawing paints the rumble with twin sky ribbons.',
      },
    }),
  ]);

type PersonalityString = Readonly<{
  field: string;
  value: string;
  maximumLength: number;
}>;

const getPersonalityStrings = (
  personality: FoundingScribbitPersonality
): readonly PersonalityString[] => {
  return [
    {
      field: 'epithet',
      value: personality.epithet,
      maximumLength: EPITHET_MAXIMUM_LENGTH,
    },
    {
      field: 'challengeLine',
      value: personality.challengeLine,
      maximumLength: PERSONALITY_LINE_MAXIMUM_LENGTH,
    },
    {
      field: 'openingLines[0]',
      value: personality.openingLines[0],
      maximumLength: PERSONALITY_LINE_MAXIMUM_LENGTH,
    },
    {
      field: 'openingLines[1]',
      value: personality.openingLines[1],
      maximumLength: PERSONALITY_LINE_MAXIMUM_LENGTH,
    },
    {
      field: 'signatureReaction',
      value: personality.signatureReaction,
      maximumLength: PERSONALITY_LINE_MAXIMUM_LENGTH,
    },
    {
      field: 'victoryLine',
      value: personality.victoryLine,
      maximumLength: PERSONALITY_LINE_MAXIMUM_LENGTH,
    },
    {
      field: 'defeatLine',
      value: personality.defeatLine,
      maximumLength: PERSONALITY_LINE_MAXIMUM_LENGTH,
    },
    {
      field: 'rumbleLine',
      value: personality.rumbleLine,
      maximumLength: PERSONALITY_LINE_MAXIMUM_LENGTH,
    },
  ];
};

const normalizedUniqueValue = (value: string): string => {
  return value.trim().toLowerCase();
};

const recordUniqueValue = (
  seenValues: Map<string, string>,
  value: string,
  description: string,
  errors: string[]
): void => {
  const normalizedValue = normalizedUniqueValue(value);
  const firstDescription = seenValues.get(normalizedValue);

  if (firstDescription) {
    errors.push(`${description} duplicates ${firstDescription}`);
    return;
  }

  seenValues.set(normalizedValue, description);
};

export const validateFoundingScribbitDefinitions =
  (): FoundingScribbitDefinitionsValidation => {
    const errors: string[] = [];
    const seenIds = new Map<string, string>();
    const seenNames = new Map<string, string>();
    const seenPersonalityStrings = new Map<string, string>();
    const founderCountByElement = new Map<Element, number>(
      ELEMENTS.map((element) => [element, 0])
    );
    let personalityStringCount = 0;

    if (FOUNDING_SCRIBBIT_DEFINITIONS.length !== EXPECTED_FOUNDER_COUNT) {
      errors.push(
        `Expected ${EXPECTED_FOUNDER_COUNT} founders, found ${FOUNDING_SCRIBBIT_DEFINITIONS.length}`
      );
    }

    for (const definition of FOUNDING_SCRIBBIT_DEFINITIONS) {
      const definitionLabel = `${definition.id} (${definition.name})`;
      recordUniqueValue(
        seenIds,
        definition.id,
        `${definitionLabel} id`,
        errors
      );
      recordUniqueValue(
        seenNames,
        definition.name,
        `${definitionLabel} name`,
        errors
      );

      const founderSlug = definition.id.startsWith('founding-')
        ? definition.id.slice('founding-'.length)
        : '';
      const expectedImageUrl = `/creatures/creature-${founderSlug}.png`;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(founderSlug)) {
        errors.push(`${definitionLabel} has an invalid founding id`);
      }
      if (definition.imageUrl !== expectedImageUrl) {
        errors.push(
          `${definitionLabel} image must be ${expectedImageUrl}, found ${definition.imageUrl}`
        );
      }

      const statValues = Object.values(definition.stats);
      if (
        statValues.some(
          (stat) =>
            !Number.isFinite(stat) || !Number.isInteger(stat) || stat < 0
        )
      ) {
        errors.push(`${definitionLabel} stats must be nonnegative integers`);
      }
      const statTotal = statValues.reduce((total, stat) => total + stat, 0);
      if (statTotal !== 100) {
        errors.push(
          `${definitionLabel} stats total ${statTotal}, expected 100`
        );
      }

      const currentElementCount = founderCountByElement.get(definition.element);
      if (currentElementCount === undefined) {
        errors.push(
          `${definitionLabel} has unknown element ${definition.element}`
        );
      } else {
        founderCountByElement.set(definition.element, currentElementCount + 1);
      }

      const personalityKeys = Object.keys(definition.personality);
      if (
        personalityKeys.length !== PERSONALITY_KEYS.length ||
        PERSONALITY_KEYS.some((key) => !personalityKeys.includes(key))
      ) {
        errors.push(`${definitionLabel} personality fields are incomplete`);
      }
      if (definition.personality.openingLines.length !== 2) {
        errors.push(`${definitionLabel} must have exactly two opening lines`);
      }

      const personalityStrings = getPersonalityStrings(definition.personality);
      personalityStringCount += personalityStrings.length;
      for (const personalityString of personalityStrings) {
        const copyLabel = `${definitionLabel} ${personalityString.field}`;
        const trimmedValue = personalityString.value.trim();
        if (trimmedValue.length === 0) {
          errors.push(`${copyLabel} must not be blank`);
        }
        if (personalityString.value.length > personalityString.maximumLength) {
          errors.push(
            `${copyLabel} is ${personalityString.value.length} characters; maximum is ${personalityString.maximumLength}`
          );
        }
        recordUniqueValue(
          seenPersonalityStrings,
          personalityString.value,
          copyLabel,
          errors
        );
      }
    }

    const expectedPersonalityStringTotal =
      EXPECTED_FOUNDER_COUNT * EXPECTED_PERSONALITY_STRING_COUNT;
    if (personalityStringCount !== expectedPersonalityStringTotal) {
      errors.push(
        `Expected ${expectedPersonalityStringTotal} personality strings, found ${personalityStringCount}`
      );
    }

    for (const element of ELEMENTS) {
      const founderCount = founderCountByElement.get(element) ?? 0;
      if (founderCount !== EXPECTED_FOUNDERS_PER_ELEMENT) {
        errors.push(
          `Expected ${EXPECTED_FOUNDERS_PER_ELEMENT} ${element} founders, found ${founderCount}`
        );
      }
    }

    const frozenErrors: readonly string[] = Object.freeze(errors);
    return Object.freeze({
      valid: frozenErrors.length === 0,
      errors: frozenErrors,
    });
  };

const foundingScribbitDefinitionsValidation =
  validateFoundingScribbitDefinitions();

if (!foundingScribbitDefinitionsValidation.valid) {
  throw new Error(
    `Invalid founding Scribbit definitions:\n${foundingScribbitDefinitionsValidation.errors.join('\n')}`
  );
}

const foundingScribbitDefinitionById: ReadonlyMap<
  string,
  FoundingScribbitDefinition
> = new Map(
  FOUNDING_SCRIBBIT_DEFINITIONS.map((definition) => [definition.id, definition])
);

export const getFoundingScribbitDefinition = (
  id: string
): FoundingScribbitDefinition | null => {
  return foundingScribbitDefinitionById.get(id) ?? null;
};
