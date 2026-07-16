import { context, requestExpandedMode, showToast } from '@devvit/web/client';
import '@fontsource/dynapuff/latin-400.css';
import '@fontsource/dynapuff/latin-700.css';
import {
  createCommunityChallengePostData,
  parseCommunityChallengePostData,
  type CommunityChallengePostData,
  type CommunityChallengeProgress,
} from '../shared/communitychallenge';
import type { CommunityDrawTheme } from '../shared/content/communitydrawthemes';

const previewDay = Number(
  new URLSearchParams(window.location.search).get('day') ?? 13
);
const fallbackDay =
  Number.isSafeInteger(previewDay) && previewDay >= 1 ? previewDay : 13;
const fallbackPostData = createCommunityChallengePostData(fallbackDay);
const postData =
  parseCommunityChallengePostData(context?.postData) ?? fallbackPostData;

const drawButton = document.getElementById(
  'draw-button'
) as HTMLButtonElement | null;
const dayRange = document.getElementById('day-range');
const progressLabel = document.getElementById('progress-label');
const challengeRule = document.getElementById('challenge-rule');
const freshNote = document.getElementById('fresh-note');
const announcementStrip = document.getElementById('announcement-strip');
const announcementCopy = document.getElementById('announcement-copy');
const dareCards = Array.from(
  document.querySelectorAll<HTMLElement>('.dare-card')
);

renderChallenge(postData, createPreviewProgress(postData));
void loadChallengeProgress(postData);

drawButton?.addEventListener('click', async (event) => {
  drawButton.disabled = true;
  const previousLabel = drawButton.textContent;
  drawButton.textContent = 'OPENING CANVAS…';
  try {
    await requestExpandedMode(event, 'game');
  } catch (error) {
    console.error('Could not open the Scribbits canvas:', error);
    drawButton.disabled = false;
    drawButton.textContent = previousLabel;
    showToast('The canvas would not open. Try again.');
  }
});

async function loadChallengeProgress(
  challenge: CommunityChallengePostData
): Promise<void> {
  try {
    const response = await fetch(
      `/api/community-challenge?day=${challenge.arenaDay}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return;
    renderChallenge(
      challenge,
      (await response.json()) as CommunityChallengeProgress
    );
  } catch {
    // The immutable post snapshot remains a complete playable invitation.
  }
}

function createPreviewProgress(
  challenge: CommunityChallengePostData
): CommunityChallengeProgress {
  return {
    arenaDay: challenge.arenaDay,
    endsArenaDay: challenge.endsArenaDay,
    currentArenaDay: challenge.arenaDay,
    loggedIn: false,
    status: 'active',
    orderedThemeIds: challenge.themes.map((theme) => theme.id),
    completedThemeIds: [],
    nextThemeId: challenge.themes[0]?.id ?? null,
  };
}

function renderChallenge(
  challenge: CommunityChallengePostData,
  progress: CommunityChallengeProgress
): void {
  if (dayRange) {
    dayRange.textContent = `DAYS ${challenge.arenaDay}–${challenge.endsArenaDay}`;
  }
  if (progressLabel) {
    progressLabel.textContent = `${progress.completedThemeIds.length} / 5 DRAWN`;
  }
  renderAnnouncement(challenge.announcements);

  const orderedThemes = progress.orderedThemeIds
    .map((themeId) => challenge.themes.find((theme) => theme.id === themeId))
    .filter((theme): theme is CommunityDrawTheme => theme !== undefined);
  orderedThemes.forEach((theme, index) =>
    renderDareCard(theme, index, progress)
  );
  renderAction(progress);
}

function renderAnnouncement(announcements: readonly string[]): void {
  if (!announcementStrip || !announcementCopy || announcements.length === 0) {
    if (announcementStrip) announcementStrip.hidden = true;
    return;
  }
  announcementCopy.textContent = announcements.join(' · ');
  announcementStrip.hidden = false;
}

function renderDareCard(
  theme: CommunityDrawTheme,
  index: number,
  progress: CommunityChallengeProgress
): void {
  const card = dareCards[index];
  if (!card) return;
  const label = card.querySelector('strong');
  const stateLabel = card.querySelector<HTMLElement>('.dare-state');
  const canvas = card.querySelector('canvas');
  const state = progress.completedThemeIds.includes(theme.id)
    ? 'done'
    : progress.nextThemeId === theme.id
      ? 'open'
      : 'locked';
  card.dataset.state = state;
  if (label) label.textContent = theme.prompt.toUpperCase();
  if (stateLabel) {
    stateLabel.textContent =
      state === 'done' ? 'DRAWN' : state === 'open' ? 'DRAW NOW' : 'LOCKED';
  }
  if (canvas) drawThemeDoodle(canvas, theme);
}

function renderAction(progress: CommunityChallengeProgress): void {
  if (!drawButton || !challengeRule || !freshNote) return;
  const completedCount = progress.completedThemeIds.length;
  if (progress.status === 'upcoming') {
    drawButton.textContent = "DRAW TODAY'S DARE";
    challengeRule.textContent = `THIS DROP OPENS ON ARENA DAY ${progress.arenaDay}.`;
    freshNote.textContent = 'COME BACK WHEN THE NEXT FIVE DARES OPEN.';
    return;
  }
  if (progress.status === 'ended') {
    drawButton.textContent = "DRAW TODAY'S DARE";
    challengeRule.textContent =
      'THIS DROP IS IN THE SKETCHBOOK. TODAY HAS FIVE NEW DARES.';
    freshNote.textContent = `THIS DROP RAN ON DAYS ${progress.arenaDay}–${progress.endsArenaDay}.`;
    return;
  }
  if (completedCount >= 5) {
    drawButton.textContent = 'ALL FIVE DONE — DRAW AGAIN';
    challengeRule.textContent =
      'YOU DREW THE WHOLE DROP. FREE DRAW IS STILL OPEN.';
    return;
  }
  drawButton.textContent =
    completedCount === 0
      ? 'START DARE 1'
      : `NEXT DARE · ${5 - completedCount} LEFT`;
  challengeRule.textContent = progress.loggedIn
    ? 'YOUR OPEN DARE IS HIGHLIGHTED. FINISH IT TO UNLOCK THE NEXT.'
    : 'ONE OPENS NOW. SIGN IN TO SAVE EACH UNLOCK.';
}

function drawThemeDoodle(
  canvas: HTMLCanvasElement,
  theme: CommunityDrawTheme
): void {
  const drawing = canvas.getContext('2d');
  if (!drawing) return;
  const seed = [...theme.id].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
  const accent =
    ['#ef654c', '#36a3ba', '#ffd65c', '#70aa70'][seed % 4] ?? '#ef654c';
  drawing.clearRect(0, 0, 96, 96);
  drawing.lineWidth = 5;
  drawing.lineCap = 'round';
  drawing.lineJoin = 'round';
  drawing.strokeStyle = '#2b2016';
  drawing.fillStyle = accent;

  if (theme.category === 'animal' || theme.category === 'character') {
    drawing.beginPath();
    drawing.arc(48, 52, 27, 0, Math.PI * 2);
    drawing.fill();
    drawing.stroke();
    drawing.beginPath();
    drawing.moveTo(28, 32);
    drawing.lineTo(24, 15);
    drawing.lineTo(40, 29);
    drawing.moveTo(56, 29);
    drawing.lineTo(72, 15);
    drawing.lineTo(68, 34);
    drawing.stroke();
  } else if (theme.category === 'place-nature') {
    drawing.beginPath();
    drawing.arc(48, 48, 25, 0, Math.PI * 2);
    drawing.fill();
    drawing.stroke();
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (ray / 8) * Math.PI * 2;
      drawing.beginPath();
      drawing.moveTo(48 + Math.cos(angle) * 33, 48 + Math.sin(angle) * 33);
      drawing.lineTo(48 + Math.cos(angle) * 41, 48 + Math.sin(angle) * 41);
      drawing.stroke();
    }
  } else if (theme.category === 'vehicle') {
    drawing.fillRect(18, 35, 60, 31);
    drawing.strokeRect(18, 35, 60, 31);
    drawing.beginPath();
    drawing.arc(31, 71, 9, 0, Math.PI * 2);
    drawing.arc(66, 71, 9, 0, Math.PI * 2);
    drawing.fill();
    drawing.stroke();
  } else if (theme.category === 'food') {
    drawing.beginPath();
    drawing.arc(48, 54, 27, 0, Math.PI * 2);
    drawing.fill();
    drawing.stroke();
    drawing.beginPath();
    drawing.moveTo(48, 27);
    drawing.quadraticCurveTo(56, 10, 66, 20);
    drawing.stroke();
  } else {
    drawing.beginPath();
    drawing.roundRect(22, 24, 52, 54, 12);
    drawing.fill();
    drawing.stroke();
  }

  drawing.fillStyle = '#2b2016';
  drawing.beginPath();
  drawing.arc(39, 50, 3.5, 0, Math.PI * 2);
  drawing.arc(58, 50, 3.5, 0, Math.PI * 2);
  drawing.fill();
  drawing.beginPath();
  drawing.arc(48, 56, 11, 0.15, Math.PI - 0.15);
  drawing.stroke();
}
