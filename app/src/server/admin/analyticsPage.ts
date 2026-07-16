export const analyticsAdminHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/internal/analytics/assets/analytics.css" />
    <title>Scribbits Internal Analytics</title>
  </head>
  <body>
    <main class="shell">
      <header class="page-header">
        <div>
          <span class="environment">INTERNAL ADMIN</span>
          <h1>Scribbits Analytics</h1>
          <p>Backend-only progression metrics. No player app entrypoint.</p>
        </div>
        <span class="status" id="status" data-state="loading">LOADING</span>
      </header>

      <form class="query" id="query-form">
        <label>From UTC<input id="from-date" type="date" required /></label>
        <label>To UTC<input id="to-date" type="date" required /></label>
        <label>Metric<select id="metric"></select></label>
        <button id="run-query" type="submit">Run query</button>
      </form>

      <section class="error" id="error" role="alert" hidden></section>
      <section id="results" hidden>
        <div class="cards">
          <article><span>Events in range</span><strong id="event-total">0</strong></article>
          <article><span>Active player-days</span><strong id="player-days">0</strong></article>
          <article><span>Session-days</span><strong id="session-days">0</strong></article>
          <article><span>Draw completion</span><strong id="draw-rate">—</strong></article>
        </div>

        <div class="grid">
          <article class="panel">
            <header><div><span>DAILY TREND</span><h2 id="chart-title"></h2></div><strong id="chart-total">0</strong></header>
            <div class="chart" id="chart" role="img"></div>
          </article>
          <article class="panel">
            <header><div><span>EVENT FUNNELS</span><h2>Progression steps</h2></div></header>
            <div class="funnels" id="funnels"></div>
          </article>
        </div>

        <article class="panel events">
          <header>
            <div><span>EVENT EXPLORER</span><h2>Recorded events</h2></div>
            <input id="search" type="search" placeholder="Filter events" aria-label="Filter events" />
          </header>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>Range</th><th>Lifetime</th></tr></thead>
              <tbody id="event-rows"></tbody>
            </table>
          </div>
          <p class="note">Daily aggregates start with analytics v2. Lifetime totals include earlier progression events.</p>
        </article>
      </section>
    </main>
    <script type="module" src="/internal/analytics/assets/analytics.js"></script>
  </body>
</html>`;

export const analyticsAdminCss = `
:root { color: #e7edf5; background: #0d1117; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
* { box-sizing: border-box; }
body { min-width: 320px; min-height: 100vh; margin: 0; background: #0d1117; }
button, input, select { font: inherit; }
.shell { width: min(1400px, calc(100% - 40px)); margin: 30px auto; }
.page-header, .panel header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.environment, .panel header span { color: #8b9bb0; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
h1 { margin: 8px 0 6px; font-size: clamp(32px, 5vw, 58px); letter-spacing: -.04em; }
h2 { margin: 4px 0 0; font-size: 20px; }
p { margin: 0; color: #8b9bb0; }
.status { padding: 9px 13px; color: #9ee6b8; background: #173d2a; border: 1px solid #2a6b48; border-radius: 8px; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.status[data-state='loading'] { color: #ffd38a; background: #3f3218; border-color: #725b25; }
.status[data-state='error'] { color: #ffaaa3; background: #401f24; border-color: #7b333b; }
.query { display: grid; grid-template-columns: 180px 180px minmax(240px, 1fr) auto; gap: 12px; margin: 28px 0 18px; padding: 16px; background: #161b22; border: 1px solid #30363d; border-radius: 12px; }
.query label { display: grid; gap: 7px; color: #8b9bb0; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
input, select { width: 100%; min-height: 44px; padding: 0 12px; color: #e7edf5; background: #0d1117; border: 1px solid #3a4655; border-radius: 7px; outline: none; }
input:focus, select:focus, button:focus-visible { border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(88, 166, 255, .18); }
button { align-self: end; min-height: 44px; padding: 0 22px; color: white; background: #2878c8; border: 1px solid #58a6ff; border-radius: 7px; cursor: pointer; font-weight: 750; }
button:disabled { cursor: wait; opacity: .55; }
.error { margin-bottom: 18px; padding: 14px 16px; color: #ffb4ae; background: #351b20; border: 1px solid #7b333b; border-radius: 8px; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.cards article, .panel { background: #161b22; border: 1px solid #30363d; border-radius: 12px; }
.cards article { padding: 20px; }
.cards span { display: block; min-height: 2em; color: #8b9bb0; font-size: 11px; font-weight: 750; letter-spacing: .05em; text-transform: uppercase; }
.cards strong { display: block; margin-top: 12px; font-size: clamp(28px, 4vw, 44px); }
.grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, .8fr); gap: 12px; margin-top: 12px; }
.panel { padding: 20px; }
.panel header > strong { font-size: 28px; }
.chart { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(25px, 1fr); align-items: end; gap: 7px; height: 260px; margin-top: 20px; padding: 22px 4px 0; overflow-x: auto; border-bottom: 1px solid #3a4655; }
.bar-column { display: grid; grid-template-rows: 1fr auto; align-items: end; gap: 7px; height: 100%; min-width: 25px; }
.bar { position: relative; min-height: 2px; background: #2878c8; border-radius: 4px 4px 0 0; }
.bar b { position: absolute; bottom: calc(100% + 4px); left: 50%; font: 10px ui-monospace, monospace; transform: translateX(-50%); }
.bar-column time { color: #8b9bb0; font: 9px ui-monospace, monospace; text-align: center; }
.funnels { display: grid; gap: 18px; margin-top: 24px; }
.funnel-label { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 7px; font-size: 12px; }
.track { height: 10px; overflow: hidden; background: #28313c; border-radius: 99px; }
.fill { height: 100%; background: #45b879; }
.events { margin-top: 12px; }
.events header input { width: min(320px, 100%); }
.table-wrap { margin-top: 16px; overflow-x: auto; border: 1px solid #30363d; border-radius: 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 14px; border-bottom: 1px solid #30363d; text-align: right; }
th:first-child, td:first-child { text-align: left; }
th { color: #8b9bb0; background: #1c222b; font-size: 11px; letter-spacing: .06em; }
td { font: 12px ui-monospace, monospace; }
tbody tr:last-child td { border-bottom: 0; }
.note { margin-top: 12px; font: 11px/1.5 ui-monospace, monospace; }
@media (max-width: 900px) { .query, .cards { grid-template-columns: repeat(2, 1fr); } .grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .shell { width: calc(100% - 20px); margin: 15px auto; } .page-header, .panel header { flex-direction: column; } .query, .cards { grid-template-columns: 1fr; } }
`;

export const analyticsAdminJavaScript = `
const eventNames = [
  'draw_started', 'draw_submitted', 'power_up_offer_shown', 'power_up_chosen',
  'founding_replay_started', 'founding_replay_completed', 'permanent_reward_earned',
  'maturity_shown', 'maturity_acknowledged', 'mature_competition_entered',
  'progress_receipt', 'screen_exit_without_next_action'
];
const funnels = [
  ['Draw started to submitted', 'draw_started', 'draw_submitted'],
  ['Power-Up shown to chosen', 'power_up_offer_shown', 'power_up_chosen'],
  ['Replay started to completed', 'founding_replay_started', 'founding_replay_completed'],
  ['Maturity shown to acknowledged', 'maturity_shown', 'maturity_acknowledged']
];
const byId = (id) => document.getElementById(id);
const label = (name) => name.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
const number = (value) => new Intl.NumberFormat('en-US').format(value);
const rate = (done, started) => started > 0 ? Math.round(done / started * 100) + '%' : '—';
const form = byId('query-form');
const fromInput = byId('from-date');
const toInput = byId('to-date');
const metric = byId('metric');
const search = byId('search');
let current = null;

for (const name of eventNames) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = label(name);
  option.selected = name === 'draw_submitted';
  metric.append(option);
}
const today = new Date();
const start = new Date(today);
start.setUTCDate(start.getUTCDate() - 13);
fromInput.value = start.toISOString().slice(0, 10);
toInput.value = today.toISOString().slice(0, 10);

function renderChart(data) {
  const name = metric.value;
  const values = data.days.map((day) => day.eventCounts[name]);
  const maximum = Math.max(1, ...values);
  const chart = byId('chart');
  chart.replaceChildren(...data.days.map((day) => {
    const column = document.createElement('div');
    column.className = 'bar-column';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = Math.max(2, day.eventCounts[name] / maximum * 100) + '%';
    bar.title = day.date + ': ' + number(day.eventCounts[name]);
    const value = document.createElement('b');
    value.textContent = number(day.eventCounts[name]);
    bar.append(value);
    const date = document.createElement('time');
    date.textContent = day.date.slice(5);
    column.append(bar, date);
    return column;
  }));
  byId('chart-title').textContent = label(name);
  byId('chart-total').textContent = number(data.rangeEventCounts[name]);
  chart.setAttribute('aria-label', label(name) + ' by UTC date');
}

function renderFunnels(data) {
  byId('funnels').replaceChildren(...funnels.map(([name, startedName, doneName]) => {
    const started = data.rangeEventCounts[startedName];
    const done = data.rangeEventCounts[doneName];
    const row = document.createElement('div');
    const heading = document.createElement('div');
    heading.className = 'funnel-label';
    const text = document.createElement('span');
    text.textContent = name;
    const value = document.createElement('strong');
    value.textContent = rate(done, started);
    heading.append(text, value);
    const track = document.createElement('div');
    track.className = 'track';
    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.width = (started > 0 ? Math.min(100, done / started * 100) : 0) + '%';
    track.append(fill);
    row.append(heading, track);
    return row;
  }));
}

function renderRows(data) {
  const query = search.value.trim().toLowerCase();
  const names = eventNames.filter((name) => label(name).toLowerCase().includes(query));
  byId('event-rows').replaceChildren(...names.map((name) => {
    const row = document.createElement('tr');
    for (const value of [label(name), number(data.rangeEventCounts[name]), number(data.lifetimeEventCounts[name])]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    return row;
  }));
}

function render(data) {
  current = data;
  const total = Object.values(data.rangeEventCounts).reduce((sum, value) => sum + value, 0);
  byId('event-total').textContent = number(total);
  byId('player-days').textContent = number(data.activePlayerDays);
  byId('session-days').textContent = number(data.sessionDays);
  byId('draw-rate').textContent = rate(data.rangeEventCounts.draw_submitted, data.rangeEventCounts.draw_started);
  renderChart(data);
  renderFunnels(data);
  renderRows(data);
  byId('results').hidden = false;
}

async function runQuery() {
  const button = byId('run-query');
  const status = byId('status');
  const error = byId('error');
  error.hidden = true;
  button.disabled = true;
  button.textContent = 'Querying…';
  status.dataset.state = 'loading';
  status.textContent = 'LOADING';
  try {
    const params = new URLSearchParams({ from: fromInput.value, to: toInput.value });
    const response = await fetch('/internal/analytics/query?' + params, { headers: { Accept: 'application/json' } });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body && body.message ? body.message : 'Analytics query failed.');
    render(body);
    status.dataset.state = 'ready';
    status.textContent = 'LIVE DATA';
  } catch (caught) {
    byId('results').hidden = true;
    error.textContent = caught instanceof Error ? caught.message : 'Analytics query failed.';
    error.hidden = false;
    status.dataset.state = 'error';
    status.textContent = 'ERROR';
  } finally {
    button.disabled = false;
    button.textContent = 'Run query';
  }
}
form.addEventListener('submit', (event) => { event.preventDefault(); void runQuery(); });
metric.addEventListener('change', () => { if (current) renderChart(current); });
search.addEventListener('input', () => { if (current) renderRows(current); });
void runQuery();
`;
