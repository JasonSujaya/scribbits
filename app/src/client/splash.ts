import { requestExpandedMode } from '@devvit/web/client';
import type { WildsState } from '../shared/remonsta';

// Splash is the inline feed view — deliberately light (no Phaser). It shows the
// logo, tagline, an optional community Dex %, and the button that expands into
// the full game entrypoint.
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const dexLine = document.getElementById('dex-line');

startButton.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});

// Cheaply fetch the community Dex % if the endpoint is ready. Failures are
// silent — the splash must never block or error in the feed.
async function loadDexPercent(): Promise<void> {
  try {
    const response = await fetch('/api/wilds', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const state = (await response.json()) as WildsState;
    if (dexLine && typeof state.communityDexPercent === 'number') {
      dexLine.textContent = `Community Dex: ${Math.round(state.communityDexPercent)}% discovered together`;
    }
  } catch {
    // Keep the default "stirring" copy on any failure.
  }
}

void loadDexPercent();
