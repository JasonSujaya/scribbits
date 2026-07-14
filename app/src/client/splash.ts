import { requestExpandedMode } from '@devvit/web/client';
import '@fontsource/dynapuff/latin-400.css';
import '@fontsource/dynapuff/latin-700.css';
import type { SplashCreation, SplashState } from '../shared/arena';
import {
  initializeLocalization,
  localizeDocument,
  translate,
} from './lib/localization';

initializeLocalization();
localizeDocument();

// Splash is the inline feed view — deliberately light (no Phaser). The markup is
// fully static and visible without this script; JS only wires the button and
// upgrades community/state data. Everything here is defensive so a failure in the
// sandboxed embed can never blank the (already-rendered) content.
const startButton = document.getElementById(
  'start-button'
) as HTMLButtonElement | null;
const showcaseLabel = document.getElementById('showcase-label');

type ShowcaseSlot = Readonly<{
  container: HTMLElement;
  image: HTMLImageElement;
  name: HTMLElement;
  artist: HTMLElement;
  fallbackName: string;
  fallbackArtist: string;
  fallbackSource: string;
}>;

const showcaseSlots: ShowcaseSlot[] = [];
for (const container of document.querySelectorAll<HTMLElement>(
  '[data-showcase-slot]'
)) {
  const image = container.querySelector<HTMLImageElement>('.showcase-image');
  const name = container.querySelector<HTMLElement>('.showcase-name');
  const artist = container.querySelector<HTMLElement>('.showcase-artist');
  const fallbackName = container.dataset.fallbackName;
  const fallbackArtist = container.dataset.fallbackArtist;
  const fallbackSource = image?.getAttribute('src');
  if (
    !image ||
    !name ||
    !artist ||
    !fallbackName ||
    !fallbackArtist ||
    !fallbackSource
  ) {
    continue;
  }
  showcaseSlots.push({
    container,
    image,
    name,
    artist,
    fallbackName,
    fallbackArtist,
    fallbackSource,
  });
}
showcaseSlots.forEach(resetShowcaseSlot);

startButton?.addEventListener('click', (event) => {
  try {
    requestExpandedMode(event, 'game');
  } catch {
    // If expand isn't available (e.g. preview), fail silently — the feed handles it.
  }
});

// Cheaply fetch live community/state data if the endpoint is ready. Failures
// are silent — the splash keeps its static defaults and never blocks or errors.
async function loadSplashState(): Promise<void> {
  try {
    const response = await fetch('/api/splash', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;
    const state = (await response.json()) as SplashState;
    renderFeaturedCreations(state.featuredCreations ?? []);
    if (startButton) {
      if (!state.loggedIn) {
        startButton.textContent = translate('splash.action.enterArena');
      } else if (!state.hasCreatedScribbit) {
        startButton.textContent = translate('splash.action.drawToday');
      } else {
        startButton.textContent = translate('splash.action.continue');
      }
    }
  } catch {
    // Keep the default copy on any failure.
  }
}

function resetShowcaseSlot(slot: ShowcaseSlot): void {
  slot.image.src = slot.fallbackSource;
  slot.image.alt = translate('splash.creation.fallbackAlt', {
    name: slot.fallbackName,
  });
  slot.name.textContent = slot.fallbackName.toUpperCase();
  slot.artist.textContent = translate('splash.creation.fallbackArtist', {
    artist: slot.fallbackArtist.toUpperCase(),
  });
}

function renderFeaturedCreations(
  featuredCreations: readonly SplashCreation[]
): void {
  showcaseSlots.forEach(resetShowcaseSlot);
  if (showcaseLabel) {
    showcaseLabel.textContent = translate('splash.showcase.sketchbook');
  }

  let loadedCreationCount = 0;
  featuredCreations
    .slice(0, showcaseSlots.length)
    .forEach((creation, index) => {
      const slot = showcaseSlots[index];
      if (!slot) return;
      const candidateImage = new Image();
      candidateImage.decoding = 'async';
      candidateImage.addEventListener(
        'load',
        () => {
          slot.image.src = creation.imageUrl;
          slot.image.alt = translate('splash.creation.communityAlt', {
            name: creation.name,
            artist: creation.artist,
          });
          slot.name.textContent = creation.name.toUpperCase();
          slot.artist.textContent = translate(
            'splash.creation.communityArtist',
            { artist: creation.artist }
          );
          loadedCreationCount += 1;
          if (showcaseLabel && loadedCreationCount > 0) {
            showcaseLabel.textContent = translate('splash.showcase.community');
          }
        },
        { once: true }
      );
      candidateImage.src = creation.imageUrl;
    });
}

void loadSplashState();
