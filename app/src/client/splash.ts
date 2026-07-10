import { requestExpandedMode } from '@devvit/web/client';
import type { SplashState } from '../shared/arena';

// Splash is the inline feed view — deliberately light (no Phaser). The markup is
// fully static and visible without this script; JS only wires the button and
// upgrades the forecast line. Everything here is defensive so a failure in the
// sandboxed embed can never blank the (already-rendered) content.
const startButton = document.getElementById('start-button') as HTMLButtonElement | null;
const forecastText = document.querySelector<HTMLElement>('#forecast-line .fc-text');
const todayStatus = document.getElementById('today-status');

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
    const response = await fetch('/api/splash', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const state = (await response.json()) as SplashState;
    if (state.resolving) {
      if (forecastText) forecastText.textContent = 'The Rumble bell is ringing…';
      if (todayStatus) todayStatus.textContent = '⚔️ Results are being tallied right now';
      if (startButton) startButton.textContent = '⚔️ CHECK THE RESULTS';
      return;
    }
    if (forecastText && state.forecast?.blurb) {
      forecastText.textContent = state.forecast.blurb;
    }
    if (todayStatus) {
      const streak = state.loggedIn && state.playStreakDays > 0
        ? `🔥 ${state.playStreakDays}-day streak · `
        : '';
      todayStatus.textContent = `${streak}${state.rumbleEntrants} contenders · rumble in ${formatCountdown(
        state.rumbleResolvesAt - Date.now()
      )}`;
    }
    if (startButton) {
      if (!state.loggedIn) startButton.textContent = '▶ ENTER THE ARENA';
      else if (!state.drawnToday) startButton.textContent = "✏️ DRAW TODAY'S SCRIBBIT";
      else if (!state.backedToday) startButton.textContent = "🎟️ BACK TONIGHT'S CONTENDER";
      else startButton.textContent = '⚔️ CHECK THE ARENA';
    }
  } catch {
    // Keep the default copy on any failure.
  }
}

function formatCountdown(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

void loadForecast();
