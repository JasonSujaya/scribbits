import { requestExpandedMode } from '@devvit/web/client';
import type { ArenaState } from '../shared/arena';

// Splash is the inline feed view — deliberately light (no Phaser). The markup is
// fully static and visible without this script; JS only wires the button and
// upgrades the forecast line. Everything here is defensive so a failure in the
// sandboxed embed can never blank the (already-rendered) content.
const startButton = document.getElementById('start-button') as HTMLButtonElement | null;
const forecastText = document.querySelector<HTMLElement>('#forecast-line .fc-text');

startButton?.addEventListener('click', (event) => {
  try {
    requestExpandedMode(event, 'game');
  } catch {
    // If expand isn't available (e.g. preview), fail silently — the feed handles it.
  }
});

// Cheaply fetch tonight's forecast blurb if the endpoint is ready. Failures are
// silent — the splash keeps its default copy and never blocks or errors.
async function loadForecast(): Promise<void> {
  try {
    const response = await fetch('/api/arena', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const state = (await response.json()) as ArenaState;
    if (forecastText && state.forecast?.blurb) {
      forecastText.textContent = state.forecast.blurb;
    }
  } catch {
    // Keep the default copy on any failure.
  }
}

void loadForecast();
