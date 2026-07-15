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
const heroImage = document.getElementById(
  'battle-hero-image'
) as HTMLImageElement | null;
const rivalImage = document.getElementById(
  'battle-rival-image'
) as HTMLImageElement | null;
const heroName = document.getElementById('hero-creation-name');
const rivalName = document.getElementById('rival-creation-name');
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

renderFighterPair(shuffledCreations(bundledCreations));
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
    startButton.textContent = translate('splash.action.enterArena');
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
      startButton.textContent = translate('splash.action.keepFighting');
    }
  } catch {
    // Bundled fighters and the primary CTA remain complete without the API.
  }
}

async function renderFeaturedCreationPair(
  featuredCreations: readonly SplashCreation[]
): Promise<void> {
  const loadedCommunityCreations: DisplayCreation[] = [];
  for (const creation of shuffledCreations(featuredCreations).slice(0, 3)) {
    if (await canLoadImage(creation.imageUrl)) {
      loadedCommunityCreations.push({
        ...creation,
        isCommunityCreation: true,
      });
    }
    if (loadedCommunityCreations.length === 2) break;
  }

  const usedIds = new Set(loadedCommunityCreations.map(({ id }) => id));
  const bundledFallbacks = shuffledCreations(bundledCreations).filter(
    ({ id }) => !usedIds.has(id)
  );
  renderFighterPair([...loadedCommunityCreations, ...bundledFallbacks]);
}

function renderFighterPair(creations: readonly DisplayCreation[]): void {
  const hero = creations[0];
  const rival = creations[1];
  if (!hero || !rival) return;

  renderFighter(heroImage, heroName, hero);
  renderFighter(rivalImage, rivalName, rival);
}

function renderFighter(
  image: HTMLImageElement | null,
  name: HTMLElement | null,
  creation: DisplayCreation
): void {
  if (image) {
    image.src = creation.imageUrl;
    image.alt = creation.isCommunityCreation
      ? translate('splash.creation.communityAlt', {
          name: creation.name,
          artist: creation.artist,
        })
      : translate('splash.creation.fallbackAlt', { name: creation.name });
  }
  if (name) name.textContent = creation.name.toUpperCase();
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
        battleProofStamp.textContent = translate('splash.hook.shapeStats');
      }
    },
    { once: true }
  );
  void battleVideo.play().catch(() => {
    // Muted autoplay is optional; native controls remain available.
  });
}

void loadSplashState();
