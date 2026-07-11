// Repo-authored narrative content for the daily Founder Rival Thread.
// Runtime scores stay in Redis; these immutable three-page arcs are safe to
// batch-author, validate, and reuse without adding progression state.

import {
  FOUNDING_SCRIBBIT_DEFINITIONS,
  getFoundingScribbitDefinition,
} from '../founders';

export type FounderRivalEpisodePageNumber = 1 | 2 | 3;

export type FounderRivalEpisodeResultLines = Readonly<{
  playerWon: string;
  founderWon: string;
}>;

export type FounderRivalEpisodePage = Readonly<{
  pageNumber: FounderRivalEpisodePageNumber;
  title: string;
  cue: string;
  resultLines: FounderRivalEpisodeResultLines;
}>;

export type FounderRivalEpisodeArc = Readonly<{
  founderId: `founding-${string}`;
  pages: readonly [
    FounderRivalEpisodePage,
    FounderRivalEpisodePage,
    FounderRivalEpisodePage,
  ];
}>;

export type FounderRivalEpisodeValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  arcCount: number;
  pageCount: number;
  resultLineCount: number;
}>;

const EXPECTED_PAGE_COUNT = 3;
const TITLE_MAXIMUM_LENGTH = 30;
const CUE_MAXIMUM_LENGTH = 88;
const RESULT_LINE_MAXIMUM_LENGTH = 88;
const FORBIDDEN_OUTCOME_OR_REWARD_CLAIM =
  /\b(?:win|wins|winning|won|winner|lose|loses|losing|lost|loss|victor|victory|defeat|defeated|prevail|prevailed|champion|standing|signed|odds|guaranteed|reward|ink|xp|clout)\b/i;
const FORBIDDEN_RESULT_REWARD_CLAIM =
  /\b(?:odds|guaranteed|reward|ink|xp|clout|currency|prize)\b/i;

const freezeEpisodeArc = (
  arc: FounderRivalEpisodeArc
): FounderRivalEpisodeArc => {
  const pages = arc.pages.map((page) =>
    Object.freeze({
      ...page,
      resultLines: Object.freeze({ ...page.resultLines }),
    })
  ) as [
    FounderRivalEpisodePage,
    FounderRivalEpisodePage,
    FounderRivalEpisodePage,
  ];
  return Object.freeze({
    founderId: arc.founderId,
    pages: Object.freeze(pages),
  });
};

export const FOUNDER_RIVAL_EPISODE_ARCS: readonly FounderRivalEpisodeArc[] =
  Object.freeze([
    freezeEpisodeArc({
      founderId: 'founding-mosswhisk',
      pages: [
        {
          pageNumber: 1,
          title: 'ROOTBEAT INTRO',
          cue: 'Mosswhisk taps a first rhythm along the fern-lined margin.',
          resultLines: {
            playerWon: 'Mosswhisk nods as your mark takes the opening beat.',
            founderWon:
              'Mosswhisk keeps the opening beat humming beneath the roots.',
          },
        },
        {
          pageNumber: 2,
          title: 'ROOTS REMEMBER',
          cue: 'Mosswhisk returns to the beat and redraws where the next thump lands.',
          resultLines: {
            playerWon:
              "Mosswhisk hears your offbeat turn the grove's old rhythm.",
            founderWon:
              'Mosswhisk settles the rematch into a steadier rootbeat.',
          },
        },
        {
          pageNumber: 3,
          title: 'THE LAST ROOTBEAT',
          cue: 'Mosswhisk plants both feet for the page that closes the rhythm.',
          resultLines: {
            playerWon: 'Mosswhisk bows as your last mark closes the rootbeat.',
            founderWon:
              'Mosswhisk lands the final thump and leaves room for your name.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-fernibble',
      pages: [
        {
          pageNumber: 1,
          title: 'THE CURLED SHORTCUT',
          cue: 'Fernibble marks a quick route through the crispest corner.',
          resultLines: {
            playerWon:
              'Fernibble grins as your shortcut reaches the corner first.',
            founderWon:
              'Fernibble curls through the shortcut and claims the opening leaf.',
          },
        },
        {
          pageNumber: 2,
          title: 'THE SCENIC EDGE',
          cue: 'Fernibble abandons the easy lane and traces the long leafy bend.',
          resultLines: {
            playerWon:
              'Fernibble watches your long route find the cleaner edge.',
            founderWon:
              'Fernibble traces the scenic edge before your line can catch it.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST LEAF HOME',
          cue: 'Fernibble lines up one final lap beside the waiting margin.',
          resultLines: {
            playerWon:
              'Fernibble salutes as your final lap reaches the waiting margin.',
            founderWon:
              'Fernibble completes the last leaf lap and signs the margin.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-barkbloom',
      pages: [
        {
          pageNumber: 1,
          title: 'RINGS AT CENTER',
          cue: 'Barkbloom plants an old growth ring at the center of the page.',
          resultLines: {
            playerWon:
              'Barkbloom studies the line your mark cut through the oldest ring.',
            founderWon:
              'Barkbloom holds the center and adds one calm ring around it.',
          },
        },
        {
          pageNumber: 2,
          title: 'SHADE HOLDS',
          cue: 'Barkbloom widens the canopy and asks the paper to hold steady.',
          resultLines: {
            playerWon:
              'Barkbloom lifts the shade where your brighter mark broke through.',
            founderWon:
              'Barkbloom keeps the canopy steady through the whole rematch.',
          },
        },
        {
          pageNumber: 3,
          title: 'FINAL GROWTH RING',
          cue: 'Barkbloom sets the oldest ring against the last open margin.',
          resultLines: {
            playerWon:
              'Barkbloom carves your name beside the final growth ring.',
            founderWon:
              'Barkbloom closes the oldest ring and signs inside the bark.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-gladepuff',
      pages: [
        {
          pageNumber: 1,
          title: 'PETAL PARADE',
          cue: 'Gladepuff tosses the first bright petals across the rivalry page.',
          resultLines: {
            playerWon:
              'Gladepuff showers your opening mark with bright paper petals.',
            founderWon:
              'Gladepuff catches the opening page in a neat petal burst.',
          },
        },
        {
          pageNumber: 2,
          title: 'MEADOW ENCORE',
          cue: 'Gladepuff returns with a louder palette and a tighter puff.',
          resultLines: {
            playerWon:
              'Gladepuff spins as your rematch mark outshines the meadow.',
            founderWon:
              'Gladepuff fills the rematch margin with a louder petal puff.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST CONFETTI',
          cue: 'Gladepuff saves the brightest petal burst for the closing page.',
          resultLines: {
            playerWon:
              'Gladepuff crowns your closing mark with the last confetti.',
            founderWon:
              'Gladepuff seals the final page beneath a bright petal storm.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-elderglen',
      pages: [
        {
          pageNumber: 1,
          title: 'OLDEST MARK',
          cue: 'Elderglen opens a groove where the first pencil line once rested.',
          resultLines: {
            playerWon:
              'Elderglen traces the bold new groove your mark left behind.',
            founderWon:
              'Elderglen settles the opening page into its oldest groove.',
          },
        },
        {
          pageNumber: 2,
          title: 'ROOTED REVISION',
          cue: 'Elderglen studies the earlier marks and redraws the rhythm.',
          resultLines: {
            playerWon:
              'Elderglen accepts the revision your rematch wrote into the roots.',
            founderWon:
              'Elderglen restores the old rhythm with one patient redraw.',
          },
        },
        {
          pageNumber: 3,
          title: "GROVE'S LAST WORD",
          cue: "Elderglen leaves one clear space for the grove's final answer.",
          resultLines: {
            playerWon:
              "Elderglen leaves your answer beside the grove's last word.",
            founderWon:
              "Elderglen lets the grove's final answer fill the signed margin.",
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-coalimp',
      pages: [
        {
          pageNumber: 1,
          title: 'ONE EYE OPEN',
          cue: 'Coalimp wakes three warm points and yawns onto the rivalry page.',
          resultLines: {
            playerWon:
              'Coalimp opens the other eye when your mark lands first.',
            founderWon:
              'Coalimp keeps one eye shut and still catches the opening page.',
          },
        },
        {
          pageNumber: 2,
          title: 'NAP INTERRUPTED',
          cue: 'Coalimp returns sharper, though the charcoal pillow still waits.',
          resultLines: {
            playerWon:
              'Coalimp blinks awake as your rematch scatters the charcoal pillow.',
            founderWon:
              'Coalimp tucks the rematch beneath one warm charcoal spark.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST SPARK BEFORE BED',
          cue: 'Coalimp saves one bright orbit before the page goes quiet.',
          resultLines: {
            playerWon:
              'Coalimp yawns and circles your name with the last warm spark.',
            founderWon:
              'Coalimp banks the final spark and signs before drifting off.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-cindercoil',
      pages: [
        {
          pageNumber: 1,
          title: 'FIRST WARM LOOP',
          cue: 'Cindercoil draws a glowing spiral around the opening bout.',
          resultLines: {
            playerWon:
              'Cindercoil loosens the spiral where your opening mark broke free.',
            founderWon:
              'Cindercoil closes the first warm loop around the page.',
          },
        },
        {
          pageNumber: 2,
          title: 'TIGHTER SPIRAL',
          cue: 'Cindercoil closes the loop and warms every penciled curve.',
          resultLines: {
            playerWon:
              'Cindercoil glows brighter where your rematch crossed the spiral.',
            founderWon:
              'Cindercoil tightens the rematch into one unbroken curve.',
          },
        },
        {
          pageNumber: 3,
          title: 'THE FINAL CURL',
          cue: 'Cindercoil brings the whole rivalry back to one last glowing turn.',
          resultLines: {
            playerWon:
              'Cindercoil curls a warm underline beneath your final mark.',
            founderWon:
              'Cindercoil closes the final curl and seals the glowing margin.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-ashwaddle',
      pages: [
        {
          pageNumber: 1,
          title: 'BOOTS ON PAPER',
          cue: 'Ashwaddle dusts both boots and stomps into the opening page.',
          resultLines: {
            playerWon:
              'Ashwaddle dusts off both boots after your mark takes the page.',
            founderWon:
              'Ashwaddle plants two smoky bootprints across the opening margin.',
          },
        },
        {
          pageNumber: 2,
          title: 'BIGGER BOUNCE',
          cue: 'Ashwaddle redraws the waddle with a bolder cinder rhythm.',
          resultLines: {
            playerWon:
              'Ashwaddle applauds the bigger bounce in your rematch line.',
            founderWon:
              'Ashwaddle bounces the rematch back beneath two ash-dark boots.',
          },
        },
        {
          pageNumber: 3,
          title: 'FINAL ASH-BOOT WADDLE',
          cue: 'Ashwaddle braces for the final page with both ash boots planted.',
          resultLines: {
            playerWon:
              'Ashwaddle stamps a smoky salute beside your closing mark.',
            founderWon:
              'Ashwaddle waddles across the final line and signs in ash.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-flintstag',
      pages: [
        {
          pageNumber: 1,
          title: 'CROWN OF SPARKS',
          cue: 'Flintstag clears room for every bright point in the antler crown.',
          resultLines: {
            playerWon:
              'Flintstag lowers the spark crown toward your opening mark.',
            founderWon:
              'Flintstag catches the opening page between two bright tines.',
          },
        },
        {
          pageNumber: 2,
          title: 'SHARPER TINES',
          cue: 'Flintstag returns with each angle tuned to a cleaner fireline.',
          resultLines: {
            playerWon:
              'Flintstag sees your rematch line slip between the sharper tines.',
            founderWon:
              'Flintstag locks the rematch inside a clean crown of sparks.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST LIGHT ON ANTLERS',
          cue: 'Flintstag lowers the glowing crown toward the closing margin.',
          resultLines: {
            playerWon:
              'Flintstag bows the last antler light over your signed mark.',
            founderWon:
              'Flintstag signs the closing margin beneath the final antler glow.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-solarkiln',
      pages: [
        {
          pageNumber: 1,
          title: 'WARM FIRST FIRING',
          cue: 'Solarkiln heats the first page until every pencil point gleams.',
          resultLines: {
            playerWon:
              'Solarkiln cools the page around your bright opening mark.',
            founderWon:
              'Solarkiln fires the opening page into one clear golden edge.',
          },
        },
        {
          pageNumber: 2,
          title: 'GOLDEN TEMPER',
          cue: 'Solarkiln lowers the heat and sharpens the rivalry edge.',
          resultLines: {
            playerWon:
              'Solarkiln admires the clean temper in your rematch line.',
            founderWon:
              'Solarkiln tempers the rematch until its golden edge holds.',
          },
        },
        {
          pageNumber: 3,
          title: 'FINAL KILN MARK',
          cue: 'Solarkiln opens the kiln for one last sun-bright impression.',
          resultLines: {
            playerWon:
              'Solarkiln presses your name into the final sun-warm clay.',
            founderWon:
              'Solarkiln seals the last kiln mark into the signed margin.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-brinebutton',
      pages: [
        {
          pageNumber: 1,
          title: 'BUTTONED FOR TIDE',
          cue: 'Brinebutton fastens every corner before the first saltwind arrives.',
          resultLines: {
            playerWon:
              'Brinebutton straightens the coat beside your opening mark.',
            founderWon:
              'Brinebutton buttons the opening page against the saltwind.',
          },
        },
        {
          pageNumber: 2,
          title: 'LOOSE THREAD, FAST WAKE',
          cue: 'Brinebutton restitches the coat and follows a quicker silver trail.',
          resultLines: {
            playerWon:
              'Brinebutton follows the loose thread your rematch pulled free.',
            founderWon:
              'Brinebutton restitches the rematch into one tidy silver wake.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST BUTTON HOME',
          cue: 'Brinebutton checks every seam before the tide closes the page.',
          resultLines: {
            playerWon:
              'Brinebutton fastens the last button beside your signed name.',
            founderWon:
              'Brinebutton closes every seam and signs above the final tide.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-kelpkit',
      pages: [
        {
          pageNumber: 1,
          title: 'CAPE IN THE CURRENT',
          cue: 'Kelpkit lets the kelp cape choose the first ribboned route.',
          resultLines: {
            playerWon:
              'Kelpkit flicks the cape toward your quicker opening route.',
            founderWon:
              'Kelpkit sweeps the opening page beneath one ribboned current.',
          },
        },
        {
          pageNumber: 2,
          title: 'TIDEPOOL TURNAROUND',
          cue: 'Kelpkit knots the loose ribbons and cuts across a fresher current.',
          resultLines: {
            playerWon:
              'Kelpkit watches your turnaround cut across the tidepool.',
            founderWon: 'Kelpkit knots the rematch into a swift tidepool turn.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST SWISH ASHORE',
          cue: 'Kelpkit squares the whiskers for one final dash toward the margin.',
          resultLines: {
            playerWon:
              'Kelpkit swishes the cape beneath your shorebound signature.',
            founderWon:
              'Kelpkit reaches the margin first and signs with one last swish.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-pearlmote',
      pages: [
        {
          pageNumber: 1,
          title: 'POCKETFUL OF SHIMMER',
          cue: 'Pearlmote opens a tiny color wheel across the first tide-lit page.',
          resultLines: {
            playerWon:
              'Pearlmote adds a small shimmer beside your opening mark.',
            founderWon:
              'Pearlmote gathers the opening page into a pocket of color.',
          },
        },
        {
          pageNumber: 2,
          title: 'SECOND ECHO, SOFTER',
          cue: 'Pearlmote polishes every hue and listens for the returning ripple.',
          resultLines: {
            playerWon:
              'Pearlmote hears your softer rematch echo cross the tide.',
            founderWon:
              'Pearlmote catches the returning echo in a polished pearl.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST PEARL OF LIGHT',
          cue: 'Pearlmote holds one final shimmer against the closing blue margin.',
          resultLines: {
            playerWon:
              'Pearlmote sets the last pearl of light beside your name.',
            founderWon:
              'Pearlmote signs the blue margin with one final shimmer.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-coraloom',
      pages: [
        {
          pageNumber: 1,
          title: 'FIRST REEF KNOT',
          cue: 'Coraloom anchors the opening page with one patient woven loop.',
          resultLines: {
            playerWon:
              'Coraloom loosens the first reef knot around your opening mark.',
            founderWon:
              'Coraloom anchors the opening page inside one patient loop.',
          },
        },
        {
          pageNumber: 2,
          title: 'PATTERN UNDER TIDE',
          cue: 'Coraloom tightens the reef pattern as the current crosses it.',
          resultLines: {
            playerWon:
              'Coraloom follows the new pattern your rematch drew under tide.',
            founderWon:
              'Coraloom tightens the rematch into the older reef pattern.',
          },
        },
        {
          pageNumber: 3,
          title: 'THE CLOSING WEAVE',
          cue: 'Coraloom draws every loose strand into the final rivalry pattern.',
          resultLines: {
            playerWon:
              'Coraloom weaves your signature through the final loose strand.',
            founderWon:
              'Coraloom closes the weave and knots the signed margin.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-moonurchin',
      pages: [
        {
          pageNumber: 1,
          title: 'MOONPOINTS RISE',
          cue: 'Moonurchin counts three silver quills beneath the opening tide.',
          resultLines: {
            playerWon:
              'Moonurchin charts your opening mark between the silver points.',
            founderWon:
              'Moonurchin keeps the opening tide beneath three moonlit quills.',
          },
        },
        {
          pageNumber: 2,
          title: 'ORBIT RECHARTED',
          cue: 'Moonurchin redraws the moon chart around the marks already made.',
          resultLines: {
            playerWon: 'Moonurchin redraws the orbit around your rematch mark.',
            founderWon:
              'Moonurchin returns the rematch to its patient lunar orbit.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST TIDE BY MOONLIGHT',
          cue: 'Moonurchin aligns every spine for the closing lunar page.',
          resultLines: {
            playerWon:
              'Moonurchin aligns the last moonpoint beneath your signature.',
            founderWon:
              'Moonurchin signs the closing tide under a silver moon.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-cloudpip',
      pages: [
        {
          pageNumber: 1,
          title: 'POCKET THUNDER LAP',
          cue: 'Cloudpip zips a tiny bolt around the first open corner.',
          resultLines: {
            playerWon:
              'Cloudpip crackles approval as your mark clears the first corner.',
            founderWon:
              'Cloudpip pockets the opening page inside one tiny thunder lap.',
          },
        },
        {
          pageNumber: 2,
          title: 'ZIGZAG REDRAWN',
          cue: 'Cloudpip folds the old route into a quicker cloud-lined lane.',
          resultLines: {
            playerWon:
              'Cloudpip chases the sharper zigzag in your rematch line.',
            founderWon:
              'Cloudpip redraws the rematch into a quicker bolt-blue lane.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST FLASH IN MARGIN',
          cue: 'Cloudpip charges one final zigzag beside the waiting signature.',
          resultLines: {
            playerWon:
              'Cloudpip flashes once beside your name in the closing margin.',
            founderWon:
              'Cloudpip signs the margin with one last pocket-sized flash.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-gustling',
      pages: [
        {
          pageNumber: 1,
          title: 'TAILWIND OPENS',
          cue: 'Gustling pins the loose pages and whistles up the first fast lane.',
          resultLines: {
            playerWon: 'Gustling lifts the tailwind beneath your opening mark.',
            founderWon:
              'Gustling sweeps the opening page down one clean sky lane.',
          },
        },
        {
          pageNumber: 2,
          title: 'CROSSHATCH CURRENT',
          cue: 'Gustling bends the tailwind around every mark from the earlier bout.',
          resultLines: {
            playerWon:
              'Gustling follows the crosshatch current your rematch opened.',
            founderWon:
              'Gustling bends the rematch back into the waiting tailwind.',
          },
        },
        {
          pageNumber: 3,
          title: 'THE CLOSING DRAFT',
          cue: 'Gustling draws one final sky lane through the narrowing page.',
          resultLines: {
            playerWon:
              'Gustling pins your signature where the closing draft settles.',
            founderWon:
              'Gustling signs the final sky lane with a steady tailwind.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-ribbonrook',
      pages: [
        {
          pageNumber: 1,
          title: 'CORNER FILE',
          cue: 'Ribbonrook maps the first square turn with streamers held crisp.',
          resultLines: {
            playerWon:
              'Ribbonrook files your opening mark beside the cleanest corner.',
            founderWon:
              'Ribbonrook folds the opening page into one exact square turn.',
          },
        },
        {
          pageNumber: 2,
          title: 'RIBBONS RECHECKED',
          cue: 'Ribbonrook studies each corner and refolds the route.',
          resultLines: {
            playerWon:
              'Ribbonrook rechecks the route your rematch drew through the file.',
            founderWon:
              'Ribbonrook refolds the rematch and keeps every corner crisp.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST MOVE ON THE FILE',
          cue: 'Ribbonrook sweeps the final ribbon across the open margin.',
          resultLines: {
            playerWon:
              'Ribbonrook clips your signature to the final corner file.',
            founderWon:
              'Ribbonrook signs the last square and closes the ribbon file.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-thunderbud',
      pages: [
        {
          pageNumber: 1,
          title: 'STATIC IN BLOOM',
          cue: 'Thunderbud opens one crackling petal above the rivalry page.',
          resultLines: {
            playerWon:
              'Thunderbud opens a bright petal beside your first mark.',
            founderWon:
              'Thunderbud catches the opening page inside one static bloom.',
          },
        },
        {
          pageNumber: 2,
          title: 'STORM GARDEN WAKES',
          cue: 'Thunderbud gives every charged petal more room to unfold.',
          resultLines: {
            playerWon:
              'Thunderbud watches your rematch wake the whole storm garden.',
            founderWon:
              'Thunderbud fills the rematch with a wider crown of static petals.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST PETAL OF THUNDER',
          cue: 'Thunderbud holds the full static crown over the closing page.',
          resultLines: {
            playerWon:
              'Thunderbud presses the last bright petal beside your name.',
            founderWon:
              'Thunderbud signs the closing page beneath a thunder crown.',
          },
        },
      ],
    }),
    freezeEpisodeArc({
      founderId: 'founding-aurorawing',
      pages: [
        {
          pageNumber: 1,
          title: 'FIRST PRISM GLIDE',
          cue: 'Aurorawing paints the opening sky lane with a thin ribbon of dawn.',
          resultLines: {
            playerWon:
              'Aurorawing glides beneath the brighter trail your mark left.',
            founderWon:
              'Aurorawing carries the opening page along one dawn-lit ribbon.',
          },
        },
        {
          pageNumber: 2,
          title: 'DAWN BENDS TWICE',
          cue: 'Aurorawing follows the old trail, then turns the colors a new way.',
          resultLines: {
            playerWon:
              'Aurorawing follows the new color bend in your rematch trail.',
            founderWon:
              'Aurorawing folds the rematch into a second ribbon of dawn.',
          },
        },
        {
          pageNumber: 3,
          title: 'LAST COLOR IN THE SKY',
          cue: 'Aurorawing folds both wings around the final bright rivalry line.',
          resultLines: {
            playerWon:
              'Aurorawing frames your signature with the last sky color.',
            founderWon:
              'Aurorawing signs the final line beneath both prism wings.',
          },
        },
      ],
    }),
  ]);

const recordUniqueCopy = (
  seenCopy: Map<string, string>,
  value: string,
  label: string,
  errors: string[]
): void => {
  const normalizedValue = value.trim().toLowerCase();
  const existingLabel = seenCopy.get(normalizedValue);
  if (existingLabel) {
    errors.push(`${label} duplicates ${existingLabel}`);
    return;
  }
  seenCopy.set(normalizedValue, label);
};

export const validateFounderRivalEpisodeArcs = (
  arcs: readonly FounderRivalEpisodeArc[] = FOUNDER_RIVAL_EPISODE_ARCS
): FounderRivalEpisodeValidation => {
  const errors: string[] = [];
  const expectedFounderIds = new Set(
    FOUNDING_SCRIBBIT_DEFINITIONS.map((founder) => founder.id)
  );
  const seenFounderIds = new Set<string>();
  const seenTitles = new Map<string, string>();
  const seenCues = new Map<string, string>();
  const seenResultLines = new Map<string, string>();
  let pageCount = 0;
  let resultLineCount = 0;

  if (arcs.length !== expectedFounderIds.size) {
    errors.push(
      `Expected ${expectedFounderIds.size} rivalry arcs, found ${arcs.length}`
    );
  }

  for (const arc of arcs) {
    const founder = getFoundingScribbitDefinition(arc.founderId);
    const arcLabel = `${arc.founderId} rivalry arc`;
    if (!founder || !expectedFounderIds.has(arc.founderId)) {
      errors.push(`${arcLabel} does not belong to a canonical founder`);
      continue;
    }
    if (seenFounderIds.has(arc.founderId)) {
      errors.push(`${arcLabel} is duplicated`);
    }
    seenFounderIds.add(arc.founderId);
    if (arc.pages.length !== EXPECTED_PAGE_COUNT) {
      errors.push(
        `${arcLabel} has ${arc.pages.length} pages; expected ${EXPECTED_PAGE_COUNT}`
      );
    }

    for (let index = 0; index < arc.pages.length; index += 1) {
      const page = arc.pages[index];
      if (!page) continue;
      pageCount += 1;
      const expectedPageNumber = (index + 1) as FounderRivalEpisodePageNumber;
      const pageLabel = `${arc.founderId} page ${expectedPageNumber}`;
      if (page.pageNumber !== expectedPageNumber) {
        errors.push(
          `${pageLabel} stores page number ${page.pageNumber}; expected ${expectedPageNumber}`
        );
      }
      if (page.title.trim().length === 0) {
        errors.push(`${pageLabel} title must not be blank`);
      }
      if (page.title.length > TITLE_MAXIMUM_LENGTH) {
        errors.push(
          `${pageLabel} title is ${page.title.length} characters; maximum is ${TITLE_MAXIMUM_LENGTH}`
        );
      }
      if (page.cue.trim().length === 0) {
        errors.push(`${pageLabel} cue must not be blank`);
      }
      if (page.cue.length > CUE_MAXIMUM_LENGTH) {
        errors.push(
          `${pageLabel} cue is ${page.cue.length} characters; maximum is ${CUE_MAXIMUM_LENGTH}`
        );
      }
      if (!page.cue.toLowerCase().includes(founder.name.toLowerCase())) {
        errors.push(`${pageLabel} cue must name ${founder.name}`);
      }
      if (FORBIDDEN_OUTCOME_OR_REWARD_CLAIM.test(page.title)) {
        errors.push(
          `${pageLabel} title predicts an outcome or promises a reward`
        );
      }
      if (FORBIDDEN_OUTCOME_OR_REWARD_CLAIM.test(page.cue)) {
        errors.push(
          `${pageLabel} cue predicts an outcome or promises a reward`
        );
      }
      recordUniqueCopy(seenTitles, page.title, `${pageLabel} title`, errors);
      recordUniqueCopy(seenCues, page.cue, `${pageLabel} cue`, errors);
      const resultEntries = [
        ['playerWon', page.resultLines.playerWon],
        ['founderWon', page.resultLines.founderWon],
      ] as const;
      for (const [resultKind, resultLine] of resultEntries) {
        resultLineCount += 1;
        const resultLabel = `${pageLabel} ${resultKind} result`;
        if (resultLine.trim().length === 0) {
          errors.push(`${resultLabel} must not be blank`);
        }
        if (resultLine.length > RESULT_LINE_MAXIMUM_LENGTH) {
          errors.push(
            `${resultLabel} is ${resultLine.length} characters; maximum is ${RESULT_LINE_MAXIMUM_LENGTH}`
          );
        }
        if (!resultLine.toLowerCase().includes(founder.name.toLowerCase())) {
          errors.push(`${resultLabel} must name ${founder.name}`);
        }
        if (resultKind === 'playerWon' && !/\byou(?:r)?\b/i.test(resultLine)) {
          errors.push(`${resultLabel} must acknowledge the player's result`);
        }
        if (FORBIDDEN_RESULT_REWARD_CLAIM.test(resultLine)) {
          errors.push(`${resultLabel} must not promise an economy reward`);
        }
        recordUniqueCopy(seenResultLines, resultLine, resultLabel, errors);
      }
    }
  }

  for (const founderId of expectedFounderIds) {
    if (!seenFounderIds.has(founderId)) {
      errors.push(`${founderId} is missing a rivalry arc`);
    }
  }

  const frozenErrors = Object.freeze(errors);
  return Object.freeze({
    valid: frozenErrors.length === 0,
    errors: frozenErrors,
    arcCount: arcs.length,
    pageCount,
    resultLineCount,
  });
};

const founderRivalEpisodeValidation = validateFounderRivalEpisodeArcs();
if (!founderRivalEpisodeValidation.valid) {
  throw new Error(
    `Invalid Founder Rival episode content:\n${founderRivalEpisodeValidation.errors.join('\n')}`
  );
}

const episodeArcByFounderId: ReadonlyMap<string, FounderRivalEpisodeArc> =
  new Map(FOUNDER_RIVAL_EPISODE_ARCS.map((arc) => [arc.founderId, arc]));

export const getFounderRivalEpisodePage = (
  founderId: string,
  pageNumber: number
): FounderRivalEpisodePage | null => {
  if (
    !Number.isSafeInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > EXPECTED_PAGE_COUNT
  ) {
    return null;
  }
  return episodeArcByFounderId.get(founderId)?.pages[pageNumber - 1] ?? null;
};

export const getFounderRivalEpisodeResultLine = (
  founderId: string,
  pageNumber: number,
  winner: 'player' | 'founder'
): string | null => {
  const page = getFounderRivalEpisodePage(founderId, pageNumber);
  if (!page) return null;
  return winner === 'player'
    ? page.resultLines.playerWon
    : page.resultLines.founderWon;
};
