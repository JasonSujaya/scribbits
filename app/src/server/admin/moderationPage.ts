export const moderationAdminHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/internal/moderation/assets/moderation.css" />
    <title>Scribbits Moderation Desk</title>
  </head>
  <body>
    <main class="shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">SCRIBBITS MODERATION DESK</span>
          <h1>Reported Scribbits</h1>
          <p>Review the drawing and name before taking action.</p>
        </div>
        <div class="summary" aria-live="polite">
          <strong id="report-count">0</strong>
          <span>open reports</span>
        </div>
      </header>

      <section class="notice notice-error" id="error" role="alert" hidden></section>
      <section class="notice" id="empty" hidden>
        <strong>The desk is clear</strong>
        <span>New player reports will appear here.</span>
      </section>
      <section class="report-list" id="report-list" aria-live="polite" aria-busy="true"></section>
      <div class="load-more-wrap">
        <button class="button button-neutral" id="load-more" type="button" hidden>Load more</button>
      </div>

      <section class="banned-section">
        <header class="section-header">
          <div>
            <span class="eyebrow">ACCESS CONTROL</span>
            <h2>Banned players</h2>
          </div>
          <strong id="ban-count">0</strong>
        </header>
        <section class="notice" id="bans-empty" hidden>No players are currently banned.</section>
        <section class="banned-list" id="banned-list" aria-live="polite" aria-busy="true"></section>
      </section>
    </main>

    <dialog id="confirmation-dialog" aria-labelledby="confirmation-title">
      <form method="dialog" class="confirmation-card">
        <span class="eyebrow">CONFIRM MODERATION ACTION</span>
        <h2 id="confirmation-title"></h2>
        <p id="confirmation-message"></p>
        <div class="confirmation-actions">
          <button class="button button-neutral" value="cancel">Cancel</button>
          <button class="button button-danger" id="confirm-action" value="confirm">Confirm</button>
        </div>
      </form>
    </dialog>
    <script type="module" src="/internal/moderation/assets/moderation.js"></script>
  </body>
</html>`;

export const moderationAdminCss = `
:root {
  color: #2a211c;
  background: #efe6d4;
  font-family: "Trebuchet MS", ui-rounded, system-ui, sans-serif;
  font-synthesis: none;
}
* { box-sizing: border-box; }
body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at 20% 0%, rgba(255,255,255,.7), transparent 28rem),
    #efe6d4;
}
button { font: inherit; }
.shell { width: min(1040px, calc(100% - 40px)); margin: 0 auto; padding: 48px 0 72px; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; margin-bottom: 30px; }
.eyebrow { color: #76675b; font-size: 11px; font-weight: 900; letter-spacing: .15em; }
h1 { margin: 9px 0 7px; font-size: clamp(38px, 7vw, 66px); line-height: .94; letter-spacing: -.045em; }
h2 { margin: 10px 0 8px; font-size: 25px; line-height: 1.05; }
p { margin: 0; color: #76675b; font-size: 15px; line-height: 1.5; }
.summary {
  display: grid;
  flex: 0 0 auto;
  min-width: 126px;
  padding: 16px 19px;
  background: #fffaf0;
  border: 3px solid #2a211c;
  border-radius: 13px 18px 12px 16px;
  box-shadow: 5px 6px 0 rgba(42,33,28,.16);
  transform: rotate(1deg);
}
.summary strong { font-size: 30px; line-height: 1; }
.summary span { margin-top: 5px; color: #76675b; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.report-list { display: grid; gap: 18px; }
.report-card {
  display: grid;
  grid-template-columns: 178px 1fr;
  min-height: 210px;
  overflow: hidden;
  background: #fffaf0;
  border: 3px solid #2a211c;
  border-radius: 16px 13px 19px 14px;
  box-shadow: 6px 7px 0 rgba(42,33,28,.13);
}
.drawing-wrap { display: grid; min-height: 210px; padding: 13px; background: #ddd0b7; border-right: 3px solid #2a211c; place-items: center; }
.drawing { width: 100%; aspect-ratio: 1; object-fit: contain; background: #fff; border: 2px solid #2a211c; border-radius: 11px; }
.report-body { display: grid; gap: 15px; padding: 20px 22px; }
.report-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.identity { min-width: 0; }
.scribbit-name { margin: 0 0 4px; overflow-wrap: anywhere; font-size: 25px; line-height: 1; }
.username { color: #66584d; font-size: 13px; font-weight: 800; }
.report-badge { flex: 0 0 auto; padding: 7px 10px; color: #7e2925; background: #f9d9d4; border: 2px solid #aa4a43; border-radius: 999px; font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
.reason-list { display: flex; flex-wrap: wrap; gap: 7px; }
.reason { padding: 5px 9px; color: #55483d; background: #eee3ce; border: 1px solid #c9b99d; border-radius: 999px; font-size: 11px; font-weight: 800; }
.report-time { color: #89796b; font-size: 11px; font-weight: 700; }
.actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: auto; }
.button { min-height: 44px; padding: 0 16px; border-radius: 10px 13px 9px 12px; cursor: pointer; font-weight: 900; }
.button:hover { transform: translateY(-1px); }
.button:focus-visible { outline: 4px solid rgba(49,104,142,.28); outline-offset: 2px; }
.button:disabled { cursor: wait; opacity: .55; transform: none; }
.button-neutral { color: #2a211c; background: #fffaf0; border: 2px solid #2a211c; }
.button-delete { color: #7e2925; background: #fff1ee; border: 2px solid #aa4a43; }
.button-danger { color: #fff; background: #8f302b; border: 2px solid #70231f; }
.notice { display: grid; gap: 5px; padding: 26px; color: #6d5f54; background: #fffaf0; border: 2px dashed #b8a68d; border-radius: 14px; text-align: center; }
.notice strong { color: #2a211c; }
.notice-error { margin-bottom: 16px; color: #8b2f2b; background: #fff1ee; border-style: solid; border-color: #c76d65; text-align: left; }
.load-more-wrap { display: flex; justify-content: center; margin-top: 24px; }
.banned-section { margin-top: 52px; padding-top: 28px; border-top: 3px dashed #b8a68d; }
.section-header { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.section-header h2 { margin-bottom: 0; font-size: 30px; }
.section-header > strong { min-width: 40px; padding: 7px 10px; text-align: center; background: #fffaf0; border: 2px solid #2a211c; border-radius: 999px; }
.banned-list { display: grid; gap: 10px; }
.banned-player { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 15px 17px; background: #fffaf0; border: 2px solid #2a211c; border-radius: 12px 16px 11px 14px; }
.banned-player-copy { display: grid; gap: 3px; min-width: 0; }
.banned-player-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.banned-player-copy span { color: #76675b; font-size: 11px; }
dialog { width: min(480px, calc(100% - 28px)); padding: 0; background: transparent; border: 0; }
dialog::backdrop { background: rgba(29,22,18,.72); }
.confirmation-card { padding: 26px; background: #fffaf0; border: 4px solid #2a211c; border-radius: 17px 13px 20px 14px; box-shadow: 9px 10px 0 rgba(0,0,0,.25); }
.confirmation-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
[hidden] { display: none !important; }
@media (max-width: 640px) {
  .shell { width: calc(100% - 24px); padding: 28px 0 48px; }
  .page-header { align-items: flex-start; gap: 16px; }
  .summary { min-width: 92px; padding: 12px 14px; }
  .report-card { grid-template-columns: 112px 1fr; min-height: 176px; }
  .drawing-wrap { min-height: 176px; padding: 8px; }
  .report-body { padding: 15px; }
  .report-header { align-items: flex-start; flex-direction: column; gap: 9px; }
  .scribbit-name { font-size: 21px; }
  .actions { display: grid; grid-template-columns: 1fr; }
  .banned-player { align-items: stretch; flex-direction: column; }
}
`;

export const moderationAdminJavaScript = `
const byId = (id) => document.getElementById(id);
const reportList = byId('report-list');
const errorNotice = byId('error');
const emptyNotice = byId('empty');
const reportCount = byId('report-count');
const loadMoreButton = byId('load-more');
const bannedList = byId('banned-list');
const bansEmpty = byId('bans-empty');
const banCount = byId('ban-count');
const confirmationDialog = byId('confirmation-dialog');
const confirmationTitle = byId('confirmation-title');
const confirmationMessage = byId('confirmation-message');
const confirmActionButton = byId('confirm-action');
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
let nextCursor;
let loadedCount = 0;
let pendingAction = null;

const actionCopy = {
  dismiss: {
    title: 'Dismiss this report?',
    message: 'The Scribbit stays visible to everyone except players who already hid it.',
    confirm: 'Dismiss report'
  },
  'delete-scribbit': {
    title: 'Delete this Scribbit?',
    message: 'This permanently removes the drawing and its related battle records. The player is not banned.',
    confirm: 'Delete Scribbit'
  },
  'ban-player': {
    title: 'Ban this player?',
    message: 'This bans the player from Scribbits and the subreddit, then permanently removes all of their Scribbits.',
    confirm: 'Ban Player'
  }
};

const setError = (message) => {
  errorNotice.textContent = message;
  errorNotice.hidden = !message;
};

const createText = (tagName, className, text) => {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
};

const formatReason = (reason) => String(reason)
  .replaceAll('-', ' ')
  .replace(/\\b\\w/g, (letter) => letter.toUpperCase());

const requestConfirmation = (request) => {
  pendingAction = request;
  confirmationTitle.textContent = request.title;
  confirmationMessage.textContent = request.message;
  confirmActionButton.textContent = request.confirm;
  confirmationDialog.showModal();
};

const createActionButton = (entry, card, action, label, className) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button ' + className;
  button.textContent = label;
  button.addEventListener('click', () => {
    const copy = actionCopy[action];
    requestConfirmation({
      title: copy.title,
      message: copy.message + ' Target: ' + entry.scribbit.name + ' by u/' + entry.scribbit.artist + '.',
      confirm: copy.confirm,
      endpoint: '/internal/moderation/action',
      body: { scribbitId: entry.scribbit.id, action },
      card,
      kind: 'report',
      affectedUsername: entry.scribbit.artist
    });
  });
  return button;
};

const createReportCard = (entry) => {
  const card = document.createElement('article');
  card.className = 'report-card';
  card.dataset.scribbitId = entry.scribbit.id;
  card.dataset.artist = entry.scribbit.artist;

  const drawingWrap = document.createElement('div');
  drawingWrap.className = 'drawing-wrap';
  const drawing = document.createElement('img');
  drawing.className = 'drawing';
  drawing.src = entry.scribbit.imageUrl;
  drawing.alt = entry.scribbit.name + ' by u/' + entry.scribbit.artist;
  drawing.loading = 'lazy';
  drawing.addEventListener('error', () => { drawing.hidden = true; });
  drawingWrap.append(drawing);

  const body = document.createElement('div');
  body.className = 'report-body';
  const header = document.createElement('header');
  header.className = 'report-header';
  const identity = document.createElement('div');
  identity.className = 'identity';
  identity.append(
    createText('h2', 'scribbit-name', entry.scribbit.name),
    createText('span', 'username', 'u/' + entry.scribbit.artist)
  );
  const badgeLabel = entry.reportCount === 1 ? '1 report' : entry.reportCount + ' reports';
  header.append(identity, createText('span', 'report-badge', badgeLabel));

  const reasons = document.createElement('div');
  reasons.className = 'reason-list';
  Object.entries(entry.reasons).forEach(([reason, count]) => {
    reasons.append(createText('span', 'reason', formatReason(reason) + ' · ' + count));
  });
  const submittedAt = document.createElement('time');
  submittedAt.className = 'report-time';
  const timestamp = new Date(entry.latestReportedAtMs);
  submittedAt.dateTime = timestamp.toISOString();
  submittedAt.textContent = 'Latest report ' + dateFormatter.format(timestamp);

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(
    createActionButton(entry, card, 'dismiss', 'Dismiss', 'button-neutral'),
    createActionButton(entry, card, 'delete-scribbit', 'Delete Scribbit', 'button-delete'),
    createActionButton(entry, card, 'ban-player', entry.playerBanned ? 'Player Banned' : 'Ban Player', 'button-danger')
  );
  if (entry.playerBanned) actions.lastElementChild.disabled = true;

  body.append(header, reasons, submittedAt, actions);
  card.append(drawingWrap, body);
  return card;
};

async function performPendingAction() {
  if (!pendingAction) return;
  const { endpoint, body: requestBody, card, kind, affectedUsername } = pendingAction;
  confirmActionButton.disabled = true;
  setError('');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body && body.message ? body.message : 'The moderation action failed.');
    if (kind === 'report') {
      const removedCards = requestBody.action === 'ban-player'
        ? [...reportList.querySelectorAll('.report-card')].filter((candidate) => candidate.dataset.artist === affectedUsername)
        : [card];
      removedCards.forEach((candidate) => candidate.remove());
      loadedCount = Math.max(0, loadedCount - removedCards.length);
      reportCount.textContent = new Intl.NumberFormat().format(loadedCount);
      emptyNotice.hidden = reportList.childElementCount !== 0;
      if (requestBody.action === 'ban-player') void loadBannedPlayers();
    } else {
      card.remove();
      banCount.textContent = new Intl.NumberFormat().format(bannedList.childElementCount);
      bansEmpty.hidden = bannedList.childElementCount !== 0;
    }
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : 'The moderation action failed.');
  } finally {
    confirmActionButton.disabled = false;
    pendingAction = null;
  }
}

const createBannedPlayerCard = (entry) => {
  const card = document.createElement('article');
  card.className = 'banned-player';
  const copy = document.createElement('div');
  copy.className = 'banned-player-copy';
  copy.append(
    createText('strong', '', 'u/' + entry.username),
    createText('span', '', 'Banned ' + dateFormatter.format(new Date(entry.bannedAtMs)) + ' by u/' + entry.moderatorUsername)
  );
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button-neutral';
  button.textContent = 'Unban Player';
  button.addEventListener('click', () => requestConfirmation({
    title: 'Unban this player?',
    message: 'This restores access to Scribbits and removes the subreddit ban for u/' + entry.username + '.',
    confirm: 'Unban Player',
    endpoint: '/internal/moderation/unban',
    body: { userId: entry.userId },
    card,
    kind: 'ban'
  }));
  card.append(copy, button);
  return card;
};

async function loadBannedPlayers() {
  bannedList.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/internal/moderation/bans', { headers: { Accept: 'application/json' } });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body && body.message ? body.message : 'Banned players could not be loaded.');
    bannedList.replaceChildren(...body.entries.map(createBannedPlayerCard));
    banCount.textContent = new Intl.NumberFormat().format(body.entries.length);
    bansEmpty.hidden = body.entries.length !== 0;
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : 'Banned players could not be loaded.');
  } finally {
    bannedList.setAttribute('aria-busy', 'false');
  }
}

confirmationDialog.addEventListener('close', () => {
  if (confirmationDialog.returnValue === 'confirm') void performPendingAction();
  else pendingAction = null;
});

async function loadReports() {
  loadMoreButton.disabled = true;
  setError('');
  reportList.setAttribute('aria-busy', 'true');
  try {
    const params = new URLSearchParams();
    if (nextCursor) params.set('cursor', nextCursor);
    const query = params.size > 0 ? '?' + params : '';
    const response = await fetch('/internal/moderation/query' + query, { headers: { Accept: 'application/json' } });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body && body.message ? body.message : 'Reports could not be loaded.');
    reportList.append(...body.entries.map(createReportCard));
    loadedCount += body.entries.length;
    reportCount.textContent = new Intl.NumberFormat().format(loadedCount);
    nextCursor = body.nextCursor;
    emptyNotice.hidden = loadedCount !== 0;
    loadMoreButton.hidden = !nextCursor;
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : 'Reports could not be loaded.');
    loadMoreButton.hidden = false;
  } finally {
    reportList.setAttribute('aria-busy', 'false');
    loadMoreButton.disabled = false;
    loadMoreButton.textContent = loadedCount === 0 ? 'Try again' : 'Load more';
  }
}

loadMoreButton.addEventListener('click', () => { void loadReports(); });
void loadReports();
void loadBannedPlayers();
`;
