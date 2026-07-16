export const feedbackAdminHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/internal/feedback/assets/feedback.css" />
    <title>Scribbits Player Feedback</title>
  </head>
  <body>
    <main class="shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">INTERNAL ADMIN</span>
          <h1>Player feedback</h1>
          <p>What players are telling us, newest first.</p>
        </div>
        <div class="summary" aria-live="polite">
          <strong id="feedback-count">0</strong>
          <span>loaded</span>
        </div>
      </header>

      <section class="notice notice-error" id="error" role="alert" hidden></section>
      <section class="notice" id="empty" hidden>
        <strong>No feedback yet</strong>
        <span>New player messages will appear here.</span>
      </section>
      <section class="feedback-list" id="feedback-list" aria-live="polite" aria-busy="true"></section>
      <div class="load-more-wrap">
        <button id="load-more" type="button" hidden>Load more feedback</button>
      </div>
    </main>
    <script type="module" src="/internal/feedback/assets/feedback.js"></script>
  </body>
</html>`;

export const feedbackAdminCss = `
:root {
  color: #25221f;
  background: #f5f2ea;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
}
* { box-sizing: border-box; }
body { min-width: 320px; min-height: 100vh; margin: 0; background: #f5f2ea; }
button { font: inherit; }
.shell { width: min(940px, calc(100% - 40px)); margin: 0 auto; padding: 48px 0 64px; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; margin-bottom: 32px; }
.eyebrow { color: #777066; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
h1 { margin: 8px 0 6px; font-size: clamp(36px, 7vw, 62px); line-height: .98; letter-spacing: -.045em; }
p { margin: 0; color: #716a62; font-size: 15px; }
.summary { display: grid; flex: 0 0 auto; min-width: 104px; padding: 15px 18px; background: #fffdf8; border: 1px solid #dcd5c9; border-radius: 14px; box-shadow: 0 4px 18px rgba(45, 37, 27, .05); }
.summary strong { font-size: 27px; line-height: 1; }
.summary span { margin-top: 5px; color: #777066; font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.feedback-list { display: grid; gap: 12px; }
.feedback-card { padding: 20px 22px; background: #fffdf8; border: 1px solid #dcd5c9; border-radius: 15px; box-shadow: 0 5px 22px rgba(45, 37, 27, .045); }
.feedback-card header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 13px; }
.identity { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.category { padding: 5px 9px; color: #335746; background: #e4f1e8; border: 1px solid #c2ddca; border-radius: 999px; font-size: 10px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.username { overflow: hidden; color: #5f5850; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
time { flex: 0 0 auto; color: #827a70; font-size: 12px; }
.message { margin: 0; color: #25221f; font-size: 16px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.metadata { margin: 12px 0 0; color: #8a8278; font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.notice { display: grid; gap: 5px; padding: 24px; color: #6d665e; background: #fffdf8; border: 1px dashed #cfc6b8; border-radius: 14px; text-align: center; }
.notice strong { color: #302c28; }
.notice-error { margin-bottom: 16px; color: #8b2f2b; background: #fff4f2; border-style: solid; border-color: #e8b9b4; text-align: left; }
.load-more-wrap { display: flex; justify-content: center; margin-top: 20px; }
button { min-height: 46px; padding: 0 22px; color: #fff; background: #25221f; border: 1px solid #25221f; border-radius: 10px; cursor: pointer; font-weight: 750; }
button:hover { background: #3b3733; }
button:focus-visible { outline: 3px solid rgba(53, 111, 81, .28); outline-offset: 2px; }
button:disabled { cursor: wait; opacity: .58; }
[hidden] { display: none !important; }
@media (max-width: 600px) {
  .shell { width: calc(100% - 24px); padding: 28px 0 44px; }
  .page-header { align-items: flex-start; margin-bottom: 24px; }
  .summary { min-width: 84px; padding: 12px 14px; }
  .feedback-card { padding: 17px; }
  .feedback-card header { align-items: flex-start; flex-direction: column; gap: 9px; }
  time { font-size: 11px; }
}
`;

export const feedbackAdminJavaScript = `
const byId = (id) => document.getElementById(id);
const feedbackList = byId('feedback-list');
const errorNotice = byId('error');
const emptyNotice = byId('empty');
const feedbackCount = byId('feedback-count');
const loadMoreButton = byId('load-more');
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});
let nextCursor;
let loadedCount = 0;

const formatCategory = (category) => String(category)
  .replaceAll('_', ' ')
  .replace(/\\b\\w/g, (letter) => letter.toUpperCase());

const createFeedbackCard = (feedback) => {
  const card = document.createElement('article');
  card.className = 'feedback-card';

  const header = document.createElement('header');
  const identity = document.createElement('div');
  identity.className = 'identity';
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = formatCategory(feedback.category);
  const username = document.createElement('span');
  username.className = 'username';
  username.textContent = feedback.username;
  identity.append(category, username);

  const submittedAt = document.createElement('time');
  const timestamp = new Date(feedback.createdAtMs);
  submittedAt.dateTime = timestamp.toISOString();
  submittedAt.textContent = dateFormatter.format(timestamp);
  header.append(identity, submittedAt);

  const message = document.createElement('p');
  message.className = 'message';
  message.textContent = feedback.message;
  const metadata = document.createElement('p');
  metadata.className = 'metadata';
  const source = feedback.sourceScene ? 'Screen: ' + feedback.sourceScene : '';
  const version = feedback.appVersion ? 'Version: ' + feedback.appVersion : '';
  metadata.textContent = [source, version].filter(Boolean).join(' · ');
  metadata.hidden = !metadata.textContent;
  card.append(header, message, metadata);
  return card;
};

async function loadFeedback() {
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = loadedCount === 0 ? 'Loading feedback…' : 'Loading more…';
  errorNotice.hidden = true;
  feedbackList.setAttribute('aria-busy', 'true');
  try {
    const params = new URLSearchParams();
    if (nextCursor) params.set('cursor', nextCursor);
    const query = params.size > 0 ? '?' + params : '';
    const response = await fetch('/internal/feedback/query' + query, {
      headers: { Accept: 'application/json' }
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body && body.message ? body.message : 'Feedback could not be loaded.');
    }
    feedbackList.append(...body.entries.map(createFeedbackCard));
    loadedCount += body.entries.length;
    feedbackCount.textContent = new Intl.NumberFormat().format(loadedCount);
    nextCursor = body.nextCursor;
    emptyNotice.hidden = loadedCount !== 0;
    loadMoreButton.hidden = !nextCursor;
  } catch (caught) {
    errorNotice.textContent = caught instanceof Error ? caught.message : 'Feedback could not be loaded.';
    errorNotice.hidden = false;
    loadMoreButton.hidden = false;
  } finally {
    feedbackList.setAttribute('aria-busy', 'false');
    loadMoreButton.disabled = false;
    loadMoreButton.textContent = loadedCount === 0 ? 'Try again' : 'Load more feedback';
  }
}

loadMoreButton.addEventListener('click', () => { void loadFeedback(); });
void loadFeedback();
`;
