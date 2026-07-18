import { context, requestExpandedMode, showToast } from '@devvit/web/client';
import '@fontsource/dynapuff/latin-400.css';
import '@fontsource/dynapuff/latin-700.css';
import {
  parseCommunityVisualPostData,
  type CommunityFightPostData,
  type CommunityUpdatePostData,
  type CommunityVisualPostData,
} from '../shared/communitypostdata';

const fallbackFight: CommunityFightPostData = {
  surface: 'community-fight',
  version: 1,
  reportId: 'preview-fight',
  weekStartArenaDay: 8,
  weekEndArenaDay: 14,
  fighterA: {
    name: 'Looplet',
    artist: 'scribbler',
    imageUrl: './assets/splash-doodle-looplet.png',
    element: 'storm',
    finalHealthPermille: 360,
    damageDealt: 248,
  },
  fighterB: {
    name: 'Moss Mop',
    artist: 'doodler',
    imageUrl: './assets/splash-doodle-mossmop.png',
    element: 'moss',
    finalHealthPermille: 0,
    damageDealt: 273,
  },
  winner: 'a',
  finish: 'knockout',
  durationSeconds: 11,
  totalDamage: 521,
  moments: [
    {
      atPermille: 90,
      attacker: 'a',
      targetHealthPermille: 850,
      damage: 42,
      critical: false,
      move: 'Nib Halo',
    },
    {
      atPermille: 210,
      attacker: 'b',
      targetHealthPermille: 810,
      damage: 54,
      critical: true,
      move: 'Inkquake',
    },
    {
      atPermille: 355,
      attacker: 'a',
      targetHealthPermille: 620,
      damage: 67,
      critical: true,
      move: 'Longshot Quill',
    },
    {
      atPermille: 510,
      attacker: 'b',
      targetHealthPermille: 590,
      damage: 61,
      critical: false,
      move: 'Brawler Slam',
    },
    {
      atPermille: 670,
      attacker: 'a',
      targetHealthPermille: 330,
      damage: 83,
      critical: true,
      move: 'Nib Halo',
    },
    {
      atPermille: 815,
      attacker: 'b',
      targetHealthPermille: 360,
      damage: 72,
      critical: false,
      move: 'Inkquake',
    },
    {
      atPermille: 960,
      attacker: 'a',
      targetHealthPermille: 0,
      damage: 96,
      critical: true,
      move: 'Longshot Quill',
    },
  ],
};

const fallbackUpdate: CommunityUpdatePostData = {
  surface: 'community-update',
  version: 1,
  arenaDay: 15,
  headline: 'Ink Rising begins',
  items: [
    {
      eyebrow: 'NEW SEASON',
      title: 'Ink Rising',
      detail: 'A fresh climb begins · Arena Days 15–42',
      tone: 'season',
    },
    {
      eyebrow: '2× SCORING',
      title: 'Opening Rumble',
      detail: 'Champion picks earn boosted standings points now.',
      tone: 'event',
    },
    {
      eyebrow: 'FINAL STANDINGS',
      title: 'u/paperchamp takes the crown',
      detail: '42 points · First Scribble',
      tone: 'final',
    },
  ],
};

const previewSurface = new URLSearchParams(window.location.search).get('type');
const fallbackData: CommunityVisualPostData =
  previewSurface === 'update' ? fallbackUpdate : fallbackFight;
const postData =
  parseCommunityVisualPostData(context?.postData) ?? fallbackData;

const fightCard = document.getElementById('fight-card');
const updateCard = document.getElementById('update-card');
const fightOpenButton = document.getElementById(
  'fight-open-button'
) as HTMLButtonElement | null;
const updateOpenButton = document.getElementById(
  'update-open-button'
) as HTMLButtonElement | null;
const replayButton = document.getElementById(
  'replay-button'
) as HTMLButtonElement | null;
let fightTimers: number[] = [];

const openExpandedGame = async (
  event: MouseEvent,
  button: HTMLButtonElement | null
): Promise<void> => {
  if (!button) return;
  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'OPENING…';
  try {
    await requestExpandedMode(event, 'game');
  } catch (error) {
    console.error('Could not open Scribbits:', error);
    button.disabled = false;
    button.textContent = previousLabel;
    showToast('Scribbits would not open. Try again.');
  }
};

fightOpenButton?.addEventListener('click', (event) => {
  void openExpandedGame(event, fightOpenButton);
});
updateOpenButton?.addEventListener('click', (event) => {
  void openExpandedGame(event, updateOpenButton);
});

if (postData.surface === 'community-fight') {
  fightCard?.removeAttribute('hidden');
  renderFight(postData);
} else {
  updateCard?.removeAttribute('hidden');
  renderUpdate(postData);
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderFight(fight: CommunityFightPostData): void {
  setText(
    'fight-day-range',
    `DAYS ${fight.weekStartArenaDay}–${fight.weekEndArenaDay}`
  );
  renderFighter('a', fight.fighterA);
  renderFighter('b', fight.fighterB);
  const winner = fight.winner === 'a' ? fight.fighterA : fight.fighterB;
  setText('winner-name', `${winner.name.toUpperCase()} WINS!`);
  setText(
    'fight-summary',
    `${fight.totalDamage} DAMAGE · ${fight.durationSeconds} SEC · ${fight.finish.toUpperCase()}`
  );
  replayButton?.addEventListener('click', () => playFight(fight));
  playFight(fight);
}

function renderFighter(
  slot: 'a' | 'b',
  fighter: CommunityFightPostData['fighterA']
): void {
  const container = document.getElementById(`fighter-${slot}`);
  const image = document.getElementById(
    `fighter-${slot}-image`
  ) as HTMLImageElement | null;
  if (container) container.dataset.element = fighter.element;
  if (image) {
    image.src = fighter.imageUrl;
    image.alt = `${fighter.name}, drawn by u/${fighter.artist}`;
  }
  setText(`fighter-${slot}-name`, fighter.name.toUpperCase());
  setText(`fighter-${slot}-artist`, `u/${fighter.artist}`);
  setText(`fighter-${slot}-damage`, `${fighter.damageDealt} DMG`);
  document
    .getElementById(`fighter-${slot}-health`)
    ?.parentElement?.setAttribute('aria-label', `${fighter.name} health`);
}

function clearFightTimers(): void {
  fightTimers.forEach((timer) => window.clearTimeout(timer));
  fightTimers = [];
}

function queueFightAction(action: () => void, delay: number): void {
  fightTimers.push(window.setTimeout(action, delay));
}

function playFight(fight: CommunityFightPostData): void {
  clearFightTimers();
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const result = document.getElementById('fight-result');
  const fighterA = document.getElementById('fighter-a');
  const fighterB = document.getElementById('fighter-b');
  const healthA = document.getElementById('fighter-a-health');
  const healthB = document.getElementById('fighter-b-health');
  const damageBurst = document.getElementById('damage-burst');
  result?.setAttribute('hidden', '');
  fighterA?.removeAttribute('data-hit');
  fighterA?.removeAttribute('data-attacking');
  fighterB?.removeAttribute('data-hit');
  fighterB?.removeAttribute('data-attacking');
  damageBurst?.removeAttribute('data-visible');
  if (healthA) healthA.style.width = '100%';
  if (healthB) healthB.style.width = '100%';
  setText('fight-commentary', reducedMotion ? 'FINAL RESULT' : 'READY… FIGHT!');

  const finishFight = (): void => {
    if (healthA)
      healthA.style.width = `${fight.fighterA.finalHealthPermille / 10}%`;
    if (healthB)
      healthB.style.width = `${fight.fighterB.finalHealthPermille / 10}%`;
    result?.removeAttribute('hidden');
    setText(
      'fight-commentary',
      `${fight.totalDamage} TOTAL DAMAGE IN ${fight.durationSeconds} SECONDS`
    );
  };

  if (reducedMotion || fight.moments.length === 0) {
    finishFight();
    return;
  }

  const playbackMilliseconds = 4_300;
  fight.moments.forEach((moment) => {
    queueFightAction(
      () => {
        const attackerSlot = moment.attacker;
        const targetSlot = attackerSlot === 'a' ? 'b' : 'a';
        const attacker = attackerSlot === 'a' ? fighterA : fighterB;
        const target = targetSlot === 'a' ? fighterA : fighterB;
        const targetHealth = targetSlot === 'a' ? healthA : healthB;
        attacker?.setAttribute('data-attacking', 'true');
        target?.setAttribute('data-hit', 'true');
        if (targetHealth) {
          targetHealth.style.width = `${moment.targetHealthPermille / 10}%`;
        }
        if (damageBurst) {
          damageBurst.textContent = `${moment.critical ? 'CRIT ' : ''}-${moment.damage}`;
          damageBurst.setAttribute('data-visible', 'true');
        }
        const attackerName =
          attackerSlot === 'a' ? fight.fighterA.name : fight.fighterB.name;
        const targetName =
          targetSlot === 'a' ? fight.fighterA.name : fight.fighterB.name;
        setText(
          'fight-commentary',
          `${attackerName.toUpperCase()} · ${moment.move.toUpperCase()} · ${moment.damage} TO ${targetName.toUpperCase()}`
        );
        queueFightAction(() => {
          attacker?.removeAttribute('data-attacking');
          target?.removeAttribute('data-hit');
          damageBurst?.removeAttribute('data-visible');
        }, 320);
      },
      240 + (moment.atPermille / 1_000) * playbackMilliseconds
    );
  });
  queueFightAction(finishFight, playbackMilliseconds + 650);
}

function renderUpdate(update: CommunityUpdatePostData): void {
  setText('update-day', `ARENA DAY ${update.arenaDay}`);
  setText('update-headline', update.headline.toUpperCase());
  const list = document.getElementById('update-list');
  if (!list) return;
  update.items.forEach((item, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'update-item';
    listItem.dataset.tone = item.tone;
    listItem.style.animationDelay = `${Math.min(index * 70, 350)}ms`;

    const badge = document.createElement('span');
    badge.className = 'update-item-badge';
    badge.textContent = item.eyebrow;

    const copy = document.createElement('span');
    copy.className = 'update-item-copy';
    const title = document.createElement('strong');
    title.textContent = item.title;
    const detail = document.createElement('span');
    detail.textContent = item.detail;
    copy.append(title, detail);
    listItem.append(badge, copy);
    list.append(listItem);
  });
}
