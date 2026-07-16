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
import { drawFoundingCharacter } from './lib/foundercharacterart';

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
const featuredCreationArt = document.querySelector<HTMLElement>(
  '.featured-creation-art'
);
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
const reducedMotionQuery = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
);
const FEATURED_CREATION_ROTATION_MILLISECONDS = 6_500;
let featuredCreationPool: DisplayCreation[] = [];
let featuredCreationIndex = -1;
let featuredCreationRotationTimer: number | undefined;
let currentFeaturedCreationId: string | undefined;
let featuredCreationMotionSequence = 0;

type DisplayCreation = SplashCreation &
  Readonly<{
    isCommunityCreation: boolean;
  }>;

const foundingCreation = (
  id: `founding-${string}`,
  name: string,
  element: 'moss' | 'ember' | 'tide' | 'storm'
): DisplayCreation => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context || !drawFoundingCharacter(context, id, element)) {
    throw new Error(`Founding character art is missing for ${id}.`);
  }
  return {
    id,
    name,
    artist: 'Founding Cast',
    imageUrl: canvas.toDataURL('image/png'),
    isCommunityCreation: false,
  };
};

const bundledCreations: readonly DisplayCreation[] = [
  foundingCreation('founding-gladepuff', 'Gladepuff', 'moss'),
  foundingCreation('founding-coraloom', 'Coraloom', 'tide'),
  foundingCreation('founding-ribbonrook', 'Ribbonrook', 'storm'),
];

setFeaturedCreationPool(bundledCreations);
renderSharedBattleClip();

reducedMotionQuery.addEventListener('change', syncFeaturedCreationRotation);
document.addEventListener('visibilitychange', syncFeaturedCreationRotation);

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
    // The authored founding cast and primary CTA remain complete without the API.
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
  }

  setFeaturedCreationPool(
    [...loadedCommunityCreations, ...bundledCreations],
    loadedCommunityCreations[0]?.id ?? currentFeaturedCreationId
  );
}

function setFeaturedCreationPool(
  creations: readonly DisplayCreation[],
  preferredCreationId?: string
): void {
  const creationById = new Map(
    creations.map((creation) => [creation.id, creation])
  );
  featuredCreationPool = shuffledCreations([...creationById.values()]);
  featuredCreationIndex = preferredCreationId
    ? featuredCreationPool.findIndex(
        (creation) => creation.id === preferredCreationId
      )
    : 0;
  if (featuredCreationIndex < 0) featuredCreationIndex = 0;

  renderFeaturedCreation(featuredCreationPool[featuredCreationIndex]);
  syncFeaturedCreationRotation();
}

function showNextFeaturedCreation(): void {
  if (sharedBattleActive || featuredCreationPool.length < 2) return;
  featuredCreationIndex =
    (featuredCreationIndex + 1) % featuredCreationPool.length;
  renderFeaturedCreation(featuredCreationPool[featuredCreationIndex]);
}

function syncFeaturedCreationRotation(): void {
  stopFeaturedCreationRotation();
  if (
    sharedBattleActive ||
    reducedMotionQuery.matches ||
    document.hidden ||
    featuredCreationPool.length < 2
  ) {
    return;
  }

  featuredCreationRotationTimer = window.setInterval(
    showNextFeaturedCreation,
    FEATURED_CREATION_ROTATION_MILLISECONDS
  );
}

function stopFeaturedCreationRotation(): void {
  if (featuredCreationRotationTimer === undefined) return;
  window.clearInterval(featuredCreationRotationTimer);
  featuredCreationRotationTimer = undefined;
}

function renderFeaturedCreation(creation: DisplayCreation | undefined): void {
  if (!creation) return;

  if (featuredCreationImage) {
    applyRandomFeaturedCreationMotion(featuredCreationImage);
    featuredCreationImage.hidden = false;
    featuredCreationImage.src = creation.imageUrl;
    featuredCreationImage.alt = creation.isCommunityCreation
      ? translate('splash.creation.communityAlt', {
          name: creation.name,
          artist: creation.artist,
        })
      : translate('splash.creation.fallbackAlt', { name: creation.name });
  }
  currentFeaturedCreationId = creation.id;
  if (featuredCreationArt && !reducedMotionQuery.matches) {
    featuredCreationArt.animate([{ opacity: 0.58 }, { opacity: 1 }], {
      duration: 320,
      easing: 'ease-out',
    });
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

function applyRandomFeaturedCreationMotion(image: HTMLImageElement): void {
  const direction = randomUnit() < 0.5 ? -1 : 1;
  const horizontalDrift = direction * (1.2 + randomUnit() * 1.8);
  const verticalDrift = -(2 + randomUnit() * 2);
  const rotation = direction * (0.35 + randomUnit() * 0.55);
  const duration = 4.8 + randomUnit() * 2.2;

  image.style.setProperty(
    '--doodle-x-a',
    `${(-horizontalDrift * 0.4).toFixed(2)}px`
  );
  image.style.setProperty(
    '--doodle-y-a',
    `${(randomUnit() * 0.8).toFixed(2)}px`
  );
  image.style.setProperty(
    '--doodle-rotation-a',
    `${(-rotation * 0.45).toFixed(2)}deg`
  );
  image.style.setProperty('--doodle-x-b', `${horizontalDrift.toFixed(2)}px`);
  image.style.setProperty('--doodle-y-b', `${verticalDrift.toFixed(2)}px`);
  image.style.setProperty('--doodle-rotation-b', `${rotation.toFixed(2)}deg`);
  image.style.setProperty('--doodle-duration', `${duration.toFixed(2)}s`);
  image.style.setProperty(
    '--doodle-delay',
    `${(-randomUnit() * duration).toFixed(2)}s`
  );
  featuredCreationMotionSequence += 1;
  image.dataset.motionSequence = String(featuredCreationMotionSequence);
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
  stopFeaturedCreationRotation();
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
      syncFeaturedCreationRotation();
    },
    { once: true }
  );
  void battleVideo.play().catch(() => {
    // Muted autoplay is optional; native controls remain available.
  });
}

void loadSplashState();
