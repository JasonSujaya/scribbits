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

// The feed view is static-first: JS only adds live creations, lightweight
// variety, the shared battle clip, and the expanded-view action.
const startButton = document.getElementById(
  'start-button'
) as HTMLButtonElement | null;
const creationSource = document.getElementById('creation-source');
const heroCreationImage = document.getElementById(
  'hero-creation-image'
) as HTMLImageElement | null;
const heroCreationName = document.getElementById('hero-creation-name');
const heroCreationArtist = document.getElementById('hero-creation-artist');
const battleHeroImage = document.getElementById(
  'battle-hero-image'
) as HTMLImageElement | null;
const battleRivalImage = document.getElementById(
  'battle-rival-image'
) as HTMLImageElement | null;
const battlePoster = document.getElementById('battle-poster');
const battleVideo = document.getElementById(
  'shared-battle-video'
) as HTMLVideoElement | null;
const battleProofStamp = document.getElementById('battle-proof-stamp');

type DisplayCreation = SplashCreation &
  Readonly<{
    isCommunityCreation: boolean;
  }>;

const bundledCreations: readonly DisplayCreation[] = [
  {
    id: 'mossmop',
    name: 'Mossmop',
    artist: 'Scribbits',
    imageUrl: new URL('./assets/splash-doodle-mossmop.png', import.meta.url)
      .href,
    isCommunityCreation: false,
  },
  {
    id: 'looplet',
    name: 'Looplet',
    artist: 'Scribbits',
    imageUrl: new URL('./assets/splash-doodle-looplet.png', import.meta.url)
      .href,
    isCommunityCreation: false,
  },
  {
    id: 'stormpuff',
    name: 'Stormpuff',
    artist: 'Scribbits',
    imageUrl: new URL('./assets/splash-doodle-stormpuff.png', import.meta.url)
      .href,
    isCommunityCreation: false,
  },
];

const initialPair = shuffledCreations(bundledCreations);
renderCreationStory(initialPair[0], initialPair[1]);
renderSharedBattleClip();

startButton?.addEventListener('click', async (event) => {
  startButton.disabled = true;
  startButton.dataset.expansionState = 'opening';
  try {
    await requestExpandedMode(event, 'game');
  } catch (error) {
    console.error('Could not open the Scribbits expanded view:', error);
    startButton.disabled = false;
    startButton.dataset.expansionState = 'error';
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

    if (!state.loggedIn) {
      startButton.textContent = translate('splash.action.enterArena');
    } else if (!state.hasCreatedScribbit) {
      startButton.textContent = translate('splash.action.drawToday');
    } else {
      startButton.textContent = translate('splash.action.continue');
    }
  } catch {
    // Bundled art and fallback copy remain complete if the API is unavailable.
  }
}

async function renderFeaturedCreationPair(
  featuredCreations: readonly SplashCreation[]
): Promise<void> {
  const randomizedCommunityCreations = shuffledCreations(featuredCreations);
  const loadedCommunityCreations = (
    await Promise.all(
      randomizedCommunityCreations
        .slice(0, 3)
        .map(async (creation) =>
          (await canLoadImage(creation.imageUrl))
            ? { ...creation, isCommunityCreation: true }
            : null
        )
    )
  ).filter((creation): creation is DisplayCreation => creation !== null);

  const usedIds = new Set(loadedCommunityCreations.map(({ id }) => id));
  const unusedBundledCreations = shuffledCreations(bundledCreations).filter(
    ({ id }) => !usedIds.has(id)
  );
  const candidates = [...loadedCommunityCreations, ...unusedBundledCreations];
  renderCreationStory(candidates[0], candidates[1]);
}

function renderCreationStory(
  hero: DisplayCreation | undefined,
  rival: DisplayCreation | undefined
): void {
  if (!hero || !rival) return;

  if (heroCreationImage) {
    heroCreationImage.src = hero.imageUrl;
    heroCreationImage.alt = hero.isCommunityCreation
      ? translate('splash.creation.communityAlt', {
          name: hero.name,
          artist: hero.artist,
        })
      : translate('splash.creation.fallbackAlt', { name: hero.name });
  }
  if (battleHeroImage) battleHeroImage.src = hero.imageUrl;
  if (battleRivalImage) battleRivalImage.src = rival.imageUrl;
  if (heroCreationName) heroCreationName.textContent = hero.name.toUpperCase();
  if (heroCreationArtist) {
    heroCreationArtist.textContent = hero.isCommunityCreation
      ? translate('splash.creation.communityArtist', { artist: hero.artist })
      : translate('splash.creation.fallbackArtist', { artist: hero.artist });
  }
  if (creationSource) {
    creationSource.textContent = translate(
      hero.isCommunityCreation
        ? 'splash.showcase.community'
        : 'splash.showcase.sketchbook'
    );
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
  if (!battleVideo || !battlePoster) return;
  let sharedData: string | undefined;
  try {
    sharedData = getShareData();
  } catch {
    return;
  }
  const sharedBattle = parseBattleShareData(sharedData);
  if (!sharedBattle) return;

  battleVideo.src = sharedBattle.clipUrl;
  battleVideo.hidden = false;
  battlePoster.hidden = true;
  if (battleProofStamp) {
    battleProofStamp.textContent = translate('splash.battle.shared');
  }
  battleVideo.addEventListener(
    'error',
    () => {
      battleVideo.hidden = true;
      battleVideo.removeAttribute('src');
      battlePoster.hidden = false;
      if (battleProofStamp) {
        battleProofStamp.textContent = translate('splash.battle.real');
      }
    },
    { once: true }
  );
  void battleVideo.play().catch(() => {
    // Muted autoplay is optional; native controls remain available.
  });
}

void loadSplashState();
