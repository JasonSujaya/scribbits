import {
  getShareData,
  requestExpandedMode,
  showToast,
} from '@devvit/web/client';
import '@fontsource/dynapuff/latin-400.css';
import '@fontsource/dynapuff/latin-700.css';
import type { SplashCreation, SplashState } from '../shared/arena';
import { parseBattleShareData } from '../shared/battleshare';
import {
  initializeLocalization,
  localizeDocument,
  translate,
} from './lib/localization';

initializeLocalization();
localizeDocument();

// Inline stays static-first and light. JavaScript only swaps in community art,
// personalizes the single CTA, and opens the separate expanded entrypoint.
const startButton = document.getElementById(
  'start-button'
) as HTMLButtonElement | null;
const featuredCreationImage = document.getElementById(
  'featured-creation-image'
) as HTMLImageElement | null;
const featuredCreationName = document.getElementById('featured-creation-name');
const featuredCreationCredit = document.getElementById(
  'featured-creation-credit'
);
const creationLabel = document.getElementById('creation-label');
const creationPoster = document.getElementById('creation-poster');
const battleVideo = document.getElementById(
  'shared-battle-video'
) as HTMLVideoElement | null;

let startButtonLabelKey:
  | 'splash.action.drawYours'
  | 'splash.action.backToYours' = 'splash.action.drawYours';
let featuredCreationLabelKey:
  | 'splash.showcase.sketchbook'
  | 'splash.showcase.community' = 'splash.showcase.sketchbook';
let sharedBattleActive = false;

type DisplayCreation = SplashCreation &
  Readonly<{
    isCommunityCreation: boolean;
  }>;

const bundledCreations: readonly DisplayCreation[] = [
  {
    id: 'mossmop',
    name: 'Mossmop',
    artist: 'Scribbits',
    imageUrl: new URL('./assets/splash-doodle-mossmop.webp', import.meta.url)
      .href,
    isCommunityCreation: false,
  },
  {
    id: 'looplet',
    name: 'Looplet',
    artist: 'Scribbits',
    imageUrl: new URL('./assets/splash-doodle-looplet.webp', import.meta.url)
      .href,
    isCommunityCreation: false,
  },
  {
    id: 'stormpuff',
    name: 'Stormpuff',
    artist: 'Scribbits',
    imageUrl: new URL('./assets/splash-doodle-stormpuff.webp', import.meta.url)
      .href,
    isCommunityCreation: false,
  },
];

renderFeaturedCreation(shuffledCreations(bundledCreations)[0]);
renderSharedBattleClip();

startButton?.addEventListener('click', async (event) => {
  startButton.disabled = true;
  startButton.dataset.expansionState = 'opening';
  startButton.textContent = translate('splash.action.opening');
  try {
    await requestExpandedMode(event, 'game');
  } catch (error) {
    console.error('Could not open the Scribbits expanded view:', error);
    startButton.disabled = false;
    startButton.dataset.expansionState = 'error';
    startButton.textContent = translate(startButtonLabelKey);
    showToast(translate('splash.error.expand'));
  }
});

async function loadSplashState(): Promise<void> {
  try {
    const response = await fetch('/api/splash', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;
    const state = (await response.json()) as SplashState;
    await renderFeaturedCreationPair(state.featuredCreations ?? []);
    if (!startButton) return;

    startButtonLabelKey = state.hasCreatedScribbit
      ? 'splash.action.backToYours'
      : 'splash.action.drawYours';
    startButton.textContent = translate(startButtonLabelKey);
  } catch {
    // Bundled fighters and the primary CTA remain complete without the API.
  }
}

async function renderFeaturedCreationPair(
  featuredCreations: readonly SplashCreation[]
): Promise<void> {
  let loadedCommunityCreation: DisplayCreation | undefined;
  for (const creation of shuffledCreations(featuredCreations).slice(0, 3)) {
    if (await canLoadImage(creation.imageUrl)) {
      loadedCommunityCreation = {
        ...creation,
        isCommunityCreation: true,
      };
      break;
    }
  }

  renderFeaturedCreation(
    loadedCommunityCreation ?? shuffledCreations(bundledCreations)[0]
  );
}

function renderFeaturedCreation(creation: DisplayCreation | undefined): void {
  if (!creation) return;

  if (featuredCreationImage) {
    featuredCreationImage.src = creation.imageUrl;
    featuredCreationImage.alt = creation.isCommunityCreation
      ? translate('splash.creation.communityAlt', {
          name: creation.name,
          artist: creation.artist,
        })
      : translate('splash.creation.fallbackAlt', { name: creation.name });
  }
  if (featuredCreationName) {
    featuredCreationName.textContent = creation.name.toUpperCase();
  }
  if (featuredCreationCredit) {
    featuredCreationCredit.textContent = translate(
      creation.isCommunityCreation
        ? 'splash.creation.communityArtist'
        : 'splash.creation.fallbackArtist',
      { artist: creation.artist }
    );
  }
  featuredCreationLabelKey = creation.isCommunityCreation
    ? 'splash.showcase.community'
    : 'splash.showcase.sketchbook';
  if (creationLabel && !sharedBattleActive) {
    creationLabel.textContent = translate(featuredCreationLabelKey);
  }
}

function shuffledCreations<T>(creations: readonly T[]): T[] {
  const shuffled = [...creations];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(randomUnit() * (index + 1));
    const currentCreation = shuffled[index];
    const randomCreation = shuffled[randomIndex];
    if (currentCreation === undefined || randomCreation === undefined) continue;
    shuffled[index] = randomCreation;
    shuffled[randomIndex] = currentCreation;
  }
  return shuffled;
}

function randomUnit(): number {
  try {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    return (randomValues[0] ?? 0) / 4_294_967_296;
  } catch {
    return Math.random();
  }
}

function canLoadImage(source: string): Promise<boolean> {
  return new Promise((resolve) => {
    const candidateImage = new Image();
    candidateImage.decoding = 'async';
    candidateImage.addEventListener('load', () => resolve(true), {
      once: true,
    });
    candidateImage.addEventListener('error', () => resolve(false), {
      once: true,
    });
    candidateImage.src = source;
  });
}

function renderSharedBattleClip(): void {
  if (!battleVideo || !creationPoster) return;
  let sharedData: string | undefined;
  try {
    sharedData = getShareData();
  } catch {
    return;
  }
  const sharedBattle = parseBattleShareData(sharedData);
  if (!sharedBattle) return;

  sharedBattleActive = true;
  battleVideo.src = sharedBattle.clipUrl;
  battleVideo.hidden = false;
  creationPoster.hidden = true;
  if (creationLabel) {
    creationLabel.textContent = translate('splash.showcase.shared');
  }
  battleVideo.addEventListener(
    'error',
    () => {
      sharedBattleActive = false;
      battleVideo.hidden = true;
      battleVideo.removeAttribute('src');
      creationPoster.hidden = false;
      if (creationLabel) {
        creationLabel.textContent = translate(featuredCreationLabelKey);
      }
    },
    { once: true }
  );
  void battleVideo.play().catch(() => {
    // Muted autoplay is optional; native controls remain available.
  });
}

void loadSplashState();
