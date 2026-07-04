import { requestExpandedMode } from '@devvit/web/client';
import type { ArenaState } from '../shared/arena';

// Splash is the inline feed view — deliberately light (no Phaser). It shows the
// logo, tagline, tonight's forecast blurb (if cheap), and the button that
// expands into the full game entrypoint.
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const forecastLine = document.getElementById('forecast-line');

startButton.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});

// Cheaply fetch tonight's forecast blurb if the endpoint is ready. Failures are
// silent — the splash must never block or error in the feed.
async function loadForecast(): Promise<void> {
  try {
    const response = await fetch('/api/arena', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const state = (await response.json()) as ArenaState;
    if (forecastLine && state.forecast?.blurb) {
      forecastLine.textContent = `⛅ ${state.forecast.blurb}`;
    }
  } catch {
    // Keep the default copy on any failure.
  }
}

void loadForecast();
