#!/usr/bin/env node

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 8902);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = join(repoRoot, 'dist', 'client');
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw5l6wAAAABJRU5ErkJggg==',
  'base64'
);

const elements = ['ember', 'tide', 'moss', 'storm'];
const careActions = ['feed', 'pat', 'train'];
const levelThresholds = [0, 3, 7, 12, 18];

const nextUtcMidnightMs = () => {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
};

const levelForXp = (xp) => {
  let level = 1;
  for (let index = 0; index < levelThresholds.length; index += 1) {
    if (xp >= levelThresholds[index]) {
      level = index + 1;
    }
  }
  return Math.min(5, level);
};

const moodFromCare = (careDoneToday) => {
  if (careDoneToday.length <= 0) return 'hungry';
  if (careDoneToday.length === 1) return 'sleepy';
  if (careDoneToday.length === 2) return 'happy';
  return 'pumped';
};

const cloneScribbit = (scribbit) => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    careDoneToday: [...scribbit.careDoneToday],
  };
};

const makeScribbit = (options) => {
  return {
    id: options.id,
    name: options.name,
    artist: options.artist,
    element: options.element,
    stats: options.stats,
    imageUrl: options.imageUrl ?? `/api/drawing/${options.id}`,
    bornDay: options.bornDay ?? 8,
    expiresDay: options.expiresDay ?? 11,
    belief: options.belief ?? 0,
    wins: options.wins ?? 0,
    losses: options.losses ?? 0,
    status: options.status ?? 'alive',
    legendTitle: options.legendTitle ?? null,
    isFounding: options.isFounding ?? false,
    level: options.level ?? levelForXp(options.xp ?? 0),
    xp: options.xp ?? 0,
    mood: options.mood ?? 'hungry',
    careDoneToday: options.careDoneToday ? [...options.careDoneToday] : [],
  };
};

const makeForecast = (day) => {
  return {
    day,
    boostedElement: 'storm',
    nerfedElement: 'moss',
    blurb: 'Storm winds whip loose paper across the arena',
  };
};

let battleCounter = 0;

const createBattleReport = (kind, fighterA, fighterB) => {
  battleCounter += 1;
  const day = memory.dayNumber;
  const winner = battleCounter % 2 === 0 ? 'a' : 'b';
  let hpA = 120 + fighterA.stats.chonk * 2;
  let hpB = 120 + fighterB.stats.chonk * 2;
  const events = [
    {
      type: 'intro',
      actor: 'a',
      move: null,
      damage: null,
      hpA,
      hpB,
      text: `${fighterA.name} and ${fighterB.name} tumble into the arena.`,
    },
    {
      type: 'weather',
      actor: 'a',
      move: null,
      damage: null,
      hpA,
      hpB,
      text: memory.forecast.blurb,
    },
  ];

  for (let index = 0; index < 9; index += 1) {
    const actor = index % 2 === 0 ? 'a' : 'b';
    const damage = 10 + ((battleCounter + index) % 9);
    if (actor === 'a') {
      hpB = Math.max(winner === 'a' && index === 8 ? 0 : 1, hpB - damage);
    } else {
      hpA = Math.max(winner === 'b' && index === 7 ? 0 : 1, hpA - damage);
    }
    events.push({
      type: index % 4 === 0 ? 'crit' : 'hit',
      actor,
      move: actor === 'a' ? 'Marker Mash' : 'Sticker Slam',
      damage,
      hpA,
      hpB,
      text:
        actor === 'a'
          ? `${fighterA.name} lands Marker Mash for ${damage}.`
          : `${fighterB.name} lands Sticker Slam for ${damage}.`,
    });
  }

  if (winner === 'a') {
    hpB = 0;
  } else {
    hpA = 0;
  }

  events.push({
    type: 'faint',
    actor: winner === 'a' ? 'b' : 'a',
    move: null,
    damage: null,
    hpA,
    hpB,
    text:
      winner === 'a'
        ? `${fighterB.name} flops into a dramatic doodle pile.`
        : `${fighterA.name} flops into a dramatic doodle pile.`,
  });

  return {
    id: `mock-battle-${kind}-${Date.now()}-${battleCounter}`,
    kind,
    day,
    a: cloneScribbit(fighterA),
    b: cloneScribbit(fighterB),
    winner,
    events,
  };
};

const myScribbits = [
  makeScribbit({
    id: 'mine-paper-spark',
    name: 'Paper Spark',
    artist: 'mock_player',
    element: 'ember',
    stats: { chonk: 22, spike: 36, zip: 28, charm: 14 },
    bornDay: 8,
    expiresDay: 11,
    belief: 6,
    wins: 3,
    losses: 1,
    level: 4,
    xp: 13,
    mood: 'pumped',
    careDoneToday: ['feed', 'pat', 'train'],
  }),
  makeScribbit({
    id: 'mine-moss-bun',
    name: 'Moss Bun',
    artist: 'mock_player',
    element: 'moss',
    stats: { chonk: 42, spike: 16, zip: 18, charm: 24 },
    bornDay: 7,
    expiresDay: 10,
    belief: 2,
    wins: 1,
    losses: 2,
    level: 2,
    xp: 4,
    mood: 'happy',
    careDoneToday: ['feed', 'pat'],
  }),
  makeScribbit({
    id: 'mine-nap-cloud',
    name: 'Nap Cloud',
    artist: 'mock_player',
    element: 'storm',
    stats: { chonk: 24, spike: 20, zip: 42, charm: 14 },
    bornDay: 6,
    expiresDay: 9,
    belief: 9,
    wins: 2,
    losses: 3,
    level: 1,
    xp: 1,
    mood: 'sleepy',
    careDoneToday: ['pat'],
  }),
];

const todayEntrants = [
  makeScribbit({
    id: 'community-bristle',
    name: 'Bristle',
    artist: 'crayon_lia',
    element: 'ember',
    stats: { chonk: 26, spike: 34, zip: 24, charm: 16 },
    belief: 12,
    wins: 4,
    losses: 2,
    level: 3,
    xp: 8,
    mood: 'happy',
  }),
  makeScribbit({
    id: 'community-kelploaf',
    name: 'Kelploaf',
    artist: 'ink_mo',
    element: 'tide',
    stats: { chonk: 38, spike: 18, zip: 24, charm: 20 },
    belief: 4,
    wins: 2,
    losses: 2,
    level: 2,
    xp: 4,
    mood: 'hungry',
  }),
  makeScribbit({
    id: 'community-rootwink',
    name: 'Rootwink',
    artist: 'paper_ren',
    element: 'moss',
    stats: { chonk: 32, spike: 20, zip: 18, charm: 30 },
    belief: 17,
    wins: 5,
    losses: 1,
    level: 4,
    xp: 13,
    mood: 'pumped',
  }),
  makeScribbit({
    id: 'community-staticjam',
    name: 'Static Jam',
    artist: 'marker_tao',
    element: 'storm',
    stats: { chonk: 20, spike: 28, zip: 40, charm: 12 },
    belief: 7,
    wins: 3,
    losses: 3,
    level: 2,
    xp: 5,
    mood: 'sleepy',
  }),
  makeScribbit({
    id: 'founding-coalimp',
    name: 'Coalimp',
    artist: 'pastel_vin',
    element: 'ember',
    stats: { chonk: 18, spike: 38, zip: 28, charm: 16 },
    belief: 3,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 1,
    xp: 0,
    mood: 'sleepy',
  }),
  makeScribbit({
    id: 'founding-kelpkit',
    name: 'Kelpkit',
    artist: 'pixel_mara',
    element: 'tide',
    stats: { chonk: 24, spike: 18, zip: 32, charm: 26 },
    belief: 5,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 2,
    xp: 3,
    mood: 'pumped',
  }),
  makeScribbit({
    id: 'founding-barkbloom',
    name: 'Barkbloom',
    artist: 'marker_jules',
    element: 'moss',
    stats: { chonk: 48, spike: 16, zip: 12, charm: 24 },
    belief: 2,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 3,
    xp: 7,
    mood: 'hungry',
  }),
  makeScribbit({
    id: 'founding-cloudpip',
    name: 'Cloudpip',
    artist: 'paperclip_noa',
    element: 'storm',
    stats: { chonk: 18, spike: 18, zip: 46, charm: 18 },
    belief: 8,
    wins: 0,
    losses: 0,
    isFounding: true,
    level: 1,
    xp: 0,
    mood: 'happy',
  }),
];

const champion = makeScribbit({
  id: 'legend-solar-kiln',
  name: 'Solar Kiln',
  artist: 'nib_and_nori',
  element: 'ember',
  stats: { chonk: 36, spike: 40, zip: 10, charm: 14 },
  bornDay: 5,
  expiresDay: 8,
  belief: 31,
  wins: 9,
  losses: 2,
  status: 'legend',
  legendTitle: 'Champion of Day 8',
  level: 5,
  xp: 20,
  mood: 'happy',
});

const legends = [
  champion,
  makeScribbit({
    id: 'legend-inky-moon',
    name: 'Inky Moon',
    artist: 'linework_luz',
    element: 'tide',
    stats: { chonk: 28, spike: 22, zip: 26, charm: 24 },
    belief: 28,
    wins: 7,
    losses: 3,
    status: 'legend',
    legendTitle: 'Believed by 28 arena weirdos',
    level: 4,
    xp: 14,
  }),
  makeScribbit({
    id: 'legend-gale-pin',
    name: 'Gale Pin',
    artist: 'washitape_kit',
    element: 'storm',
    stats: { chonk: 24, spike: 32, zip: 28, charm: 16 },
    belief: 33,
    wins: 8,
    losses: 4,
    status: 'legend',
    legendTitle: 'Champion of Day 5',
    level: 5,
    xp: 22,
  }),
  makeScribbit({
    id: 'legend-moss-opera',
    name: 'Moss Opera',
    artist: 'smudge_sam',
    element: 'moss',
    stats: { chonk: 44, spike: 18, zip: 12, charm: 26 },
    belief: 27,
    wins: 5,
    losses: 4,
    status: 'legend',
    legendTitle: 'Believed by 27 arena weirdos',
    level: 3,
    xp: 9,
  }),
  makeScribbit({
    id: 'legend-bubble-vice',
    name: 'Bubble Vice',
    artist: 'charcoal_zed',
    element: 'tide',
    stats: { chonk: 30, spike: 26, zip: 24, charm: 20 },
    belief: 29,
    wins: 6,
    losses: 2,
    status: 'legend',
    legendTitle: 'Champion of Day 3',
    level: 4,
    xp: 15,
  }),
  makeScribbit({
    id: 'legend-cinder-pip',
    name: 'Cinder Pip',
    artist: 'graphite_jo',
    element: 'ember',
    stats: { chonk: 20, spike: 38, zip: 28, charm: 14 },
    belief: 26,
    wins: 6,
    losses: 5,
    status: 'legend',
    legendTitle: 'Believed by 26 arena weirdos',
    level: 3,
    xp: 10,
  }),
];

const myFaded = [
  makeScribbit({
    id: 'faded-pencil-puddle',
    name: 'Pencil Puddle',
    artist: 'mock_player',
    element: 'tide',
    stats: { chonk: 28, spike: 18, zip: 30, charm: 24 },
    bornDay: 3,
    expiresDay: 6,
    belief: 4,
    wins: 1,
    losses: 5,
    status: 'faded',
    level: 2,
    xp: 4,
  }),
  makeScribbit({
    id: 'faded-eraser-bite',
    name: 'Eraser Bite',
    artist: 'mock_player',
    element: 'moss',
    stats: { chonk: 40, spike: 22, zip: 12, charm: 26 },
    bornDay: 2,
    expiresDay: 5,
    belief: 8,
    wins: 2,
    losses: 4,
    status: 'faded',
    level: 2,
    xp: 5,
  }),
];

const memory = {
  dayNumber: 9,
  forecast: makeForecast(9),
  champion,
  myScribbits,
  todayEntrants,
  legends,
  myFaded,
  drawnToday: false,
  enteredToday: false,
  myBackedScribbitId: null,
  myClout: 14,
  beliefVotes: new Set(),
  cloutBoard: {
    top: [
      { username: 'inkwell_kay', clout: 42 },
      { username: 'marker_jules', clout: 34 },
      { username: 'mock_player', clout: 14 },
      { username: 'pixel_mara', clout: 13 },
      { username: 'crayon_lia', clout: 11 },
      { username: 'paper_ren', clout: 8 },
      { username: 'washitape_kit', clout: 5 },
      { username: 'smudge_sam', clout: 3 },
    ],
    me: { username: 'mock_player', clout: 14, rank: 3 },
  },
  myBattles: [],
};

for (let index = 0; index < 10; index += 1) {
  const fighterA = myScribbits[index % myScribbits.length];
  const fighterB = todayEntrants[index % todayEntrants.length];
  memory.myBattles.push(createBattleReport('exhibition', fighterA, fighterB));
}

const visibleLists = () => [
  memory.myScribbits,
  memory.todayEntrants,
  memory.legends,
  memory.myFaded,
  [memory.champion],
];

const findVisibleScribbit = (scribbitId) => {
  for (const list of visibleLists()) {
    const scribbit = list.find((entry) => entry.id === scribbitId);
    if (scribbit) return scribbit;
  }
  return undefined;
};

const mutateVisibleScribbit = (scribbitId, mutate) => {
  for (const list of visibleLists()) {
    for (const scribbit of list) {
      if (scribbit.id === scribbitId) {
        mutate(scribbit);
      }
    }
  }
};

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
};

const sendError = (response, status, message) => {
  sendJson(response, status, { status: 'error', message });
};

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
};

const readScribbitId = (body) => {
  return typeof body?.scribbitId === 'string' ? body.scribbitId.trim() : '';
};

const arenaState = () => {
  return {
    dayNumber: memory.dayNumber,
    loggedIn: true,
    forecast: memory.forecast,
    champion: cloneScribbit(memory.champion),
    myScribbits: memory.myScribbits.map(cloneScribbit),
    drawnToday: memory.drawnToday,
    enteredToday: memory.enteredToday,
    rumbleEntrants: memory.todayEntrants.length,
    communityLegendCount: memory.legends.length,
    rumbleResolvesAt: nextUtcMidnightMs(),
    todayEntrants: memory.todayEntrants.map(cloneScribbit),
    myBackedScribbitId: memory.myBackedScribbitId,
    myClout: memory.myClout,
  };
};

const handleApi = async (request, response, url) => {
  const method = request.method ?? 'GET';
  const path = url.pathname;

  if (method === 'GET' && path === '/api/arena') {
    sendJson(response, 200, arenaState());
    return;
  }

  if (method === 'GET' && path === '/api/my-battles') {
    sendJson(response, 200, memory.myBattles.map((report) => ({ ...report })));
    return;
  }

  if (method === 'GET' && path === '/api/legends') {
    sendJson(response, 200, {
      legends: memory.legends.map(cloneScribbit),
      myFaded: memory.myFaded.map(cloneScribbit),
    });
    return;
  }

  if (method === 'GET' && path === '/api/clout-board') {
    sendJson(response, 200, memory.cloutBoard);
    return;
  }

  if (method === 'GET' && path.startsWith('/api/drawing/')) {
    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=60',
    });
    response.end(transparentPng);
    return;
  }

  if (method === 'POST' && path === '/api/care') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const action = typeof body?.action === 'string' ? body.action : '';
    const scribbit = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!scribbit || !careActions.includes(action)) {
      sendError(response, 400, 'Choose a valid Scribbit and care action.');
      return;
    }

    if (scribbit.careDoneToday.includes(action)) {
      sendError(response, 409, 'You already used that care action today.');
      return;
    }

    scribbit.careDoneToday.push(action);
    scribbit.mood = moodFromCare(scribbit.careDoneToday);
    scribbit.xp += scribbit.mood === 'pumped' ? 2 : 1;
    scribbit.level = levelForXp(scribbit.xp);
    sendJson(response, 200, cloneScribbit(scribbit));
    return;
  }

  if (method === 'POST' && path === '/api/back') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);

    if (!memory.todayEntrants.some((entry) => entry.id === scribbitId)) {
      sendError(response, 400, 'Back one of tonight\'s Rumble entrants.');
      return;
    }

    if (memory.myBackedScribbitId) {
      sendError(response, 409, 'You already backed a Scribbit today.');
      return;
    }

    memory.myBackedScribbitId = scribbitId;
    sendJson(response, 200, { backed: scribbitId });
    return;
  }

  if (method === 'POST' && path === '/api/believe') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = findVisibleScribbit(scribbitId);

    if (!scribbit) {
      sendError(response, 404, 'That Scribbit cannot collect belief right now.');
      return;
    }

    if (scribbit.artist === 'mock_player') {
      sendError(response, 400, 'believe in someone else\'s doodle');
      return;
    }

    if (memory.beliefVotes.has(scribbitId)) {
      sendError(response, 409, 'You already believed in that Scribbit today.');
      return;
    }

    memory.beliefVotes.add(scribbitId);
    mutateVisibleScribbit(scribbitId, (entry) => {
      entry.belief += 1;
    });
    sendJson(response, 200, { belief: findVisibleScribbit(scribbitId).belief });
    return;
  }

  if (method === 'POST' && path === '/api/spar') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const challenger = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!challenger) {
      sendError(response, 404, 'That living Scribbit is not ready to spar.');
      return;
    }

    const opponent =
      memory.todayEntrants.find((entry) => entry.artist !== 'mock_player') ??
      memory.todayEntrants[0];
    const report = createBattleReport('exhibition', challenger, opponent);
    memory.myBattles.unshift(report);
    sendJson(response, 200, report);
    return;
  }

  if (method === 'POST' && path === '/api/boss-challenge') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const challenger = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!challenger) {
      sendError(response, 404, 'That living Scribbit is not ready to fight.');
      return;
    }

    const report = createBattleReport('boss', challenger, memory.champion);
    memory.myBattles.unshift(report);
    sendJson(response, 200, report);
    return;
  }

  if (method === 'POST' && path === '/api/enter-rumble') {
    const body = await readJsonBody(request);
    const scribbitId = readScribbitId(body);
    const scribbit = memory.myScribbits.find((entry) => entry.id === scribbitId);

    if (!scribbit) {
      sendError(response, 404, 'That living Scribbit is not in your sketchbook.');
      return;
    }

    if (memory.enteredToday) {
      sendError(response, 409, 'You already entered today\'s Rumble.');
      return;
    }

    memory.enteredToday = true;
    if (!memory.todayEntrants.some((entry) => entry.id === scribbit.id)) {
      memory.todayEntrants.push(scribbit);
    }
    sendJson(response, 200, { entered: true });
    return;
  }

  if (method === 'POST' && path === '/api/scribbit') {
    const body = await readJsonBody(request);
    const name =
      typeof body?.name === 'string' && body.name.trim().length >= 2
        ? body.name.trim().slice(0, 24)
        : 'Fresh Scribbit';
    const id = `mock-submitted-${Date.now()}`;
    const scribbit = makeScribbit({
      id,
      name,
      artist: 'mock_player',
      element: elements[battleCounter % elements.length],
      stats: { chonk: 25, spike: 25, zip: 25, charm: 25 },
      bornDay: memory.dayNumber,
      expiresDay: memory.dayNumber + 3,
      belief: 0,
      level: 1,
      xp: 0,
      mood: 'hungry',
    });

    memory.myScribbits.unshift(scribbit);
    memory.todayEntrants.push(scribbit);
    memory.drawnToday = true;
    memory.enteredToday = true;
    sendJson(response, 201, cloneScribbit(scribbit));
    return;
  }

  sendError(response, 404, `No mock endpoint for ${method} ${path}`);
};

const contentTypeFor = (filePath) => {
  switch (extname(filePath)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
};

const serveStatic = async (request, response, url) => {
  const requestedPath = url.pathname === '/' ? '/game.html' : url.pathname;
  const relativePath = normalize(decodeURIComponent(requestedPath)).replace(
    /^(\.\.[/\\])+/,
    ''
  );
  const filePath = join(clientRoot, relativePath);

  if (!filePath.startsWith(clientRoot) || !existsSync(filePath)) {
    const fallbackPath = join(clientRoot, 'game.html');
    if (existsSync(fallbackPath)) {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(await readFile(fallbackPath));
      return;
    }
    sendError(
      response,
      404,
      'dist/client is missing. Run npm run build before npm run mock.'
    );
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypeFor(filePath),
    'Cache-Control': 'no-store',
  });
  response.end(await readFile(filePath));
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://localhost:${port}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(request, response, url);
  } catch (error) {
    console.error('Mock server failed:', error);
    sendError(response, 500, 'Mock server failed.');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Scribbits mock server running at http://localhost:${port}`);
});
