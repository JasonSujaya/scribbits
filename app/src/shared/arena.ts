// Scribbits Arena v3 shared contract — SOURCE OF TRUTH between client and server.
// Extend, never fork. Analyzer + balance invariants: plans/v3-scribbits-arena.md.

export type Element = 'ember' | 'tide' | 'moss' | 'storm';

// Always sums to exactly 100 after server normalization.
export type ScribbitStats = {
  chonk: number; // HP pool
  spike: number; // attack
  zip: number; // speed (turn order)
  charm: number; // crit chance scaling
};

export type ScribbitStatus = 'alive' | 'faded' | 'legend';

export type Scribbit = {
  id: string;
  name: string; // player-given, 2-24 chars
  artist: string; // reddit username
  element: Element;
  stats: ScribbitStats;
  imageUrl: string; // reddit-hosted media URL or /api/drawing/{id}
  bornDay: number;
  expiresDay: number; // bornDay + 3
  belief: number;
  wins: number;
  losses: number;
  status: ScribbitStatus;
  legendTitle: string | null; // e.g. "Champion of Day 12"
  isFounding: boolean; // NPC founding roster
};

export type Forecast = {
  day: number;
  boostedElement: Element; // +15% damage
  nerfedElement: Element; // -10% damage
  blurb: string; // "Storm winds howl across the arena..."
};

export type ArenaState = {
  dayNumber: number;
  loggedIn: boolean;
  forecast: Forecast;
  champion: Scribbit | null; // frozen snapshot, today's boss
  myScribbits: Scribbit[]; // alive, newest first, max 3
  drawnToday: boolean;
  enteredToday: boolean; // rumble entry used
  rumbleEntrants: number;
  communityLegendCount: number;
};

export type BattleEventType =
  | 'intro'
  | 'move'
  | 'hit'
  | 'crit'
  | 'miss'
  | 'weather' // forecast modifier moment
  | 'faint';

export type BattleEvent = {
  type: BattleEventType;
  actor: 'a' | 'b';
  move: string | null;
  damage: number | null;
  hpA: number; // running HP after this event
  hpB: number;
  text: string; // announcer line, ready to render
};

export type BattleKind = 'rumble' | 'boss' | 'exhibition';

export type BattleReport = {
  id: string;
  kind: BattleKind;
  day: number;
  a: Scribbit;
  b: Scribbit;
  winner: 'a' | 'b';
  events: BattleEvent[]; // 6-14 events, replayable
};

export type SubmitScribbitRequest = {
  name: string;
  imageDataUrl: string; // png data URL from canvas, 512x512, <=400KB
  stats: ScribbitStats; // client analyzer output; server clamps + normalizes
  element: Element;
};

export type EnterRumbleRequest = { scribbitId: string };
export type BelieveRequest = { scribbitId: string };
export type BossChallengeRequest = { scribbitId: string };

export type LegendsState = {
  legends: Scribbit[]; // newest first, top 50
  myFaded: Scribbit[]; // caller's sketchbook (faded), newest first, top 30
};

export type ArenaErrorResponse = { status: 'error'; message: string };

// Move pools per element: [base move, power move, belief-unlocked move (belief>=10)]
export const MOVES_BY_ELEMENT: Record<Element, [string, string, string]> = {
  ember: ['Cinder Snap', 'Blaze Tackle', 'Supernova Sneeze'],
  tide: ['Bubble Jab', 'Riptide Slam', 'Abyssal Cannonball'],
  moss: ['Leaf Flick', 'Root Wallop', 'Ancient Chomp'],
  storm: ['Static Zap', 'Thunder Pounce', 'Hurricane Yeet'],
};

// Element triangle: attacker deals +25% to prey, -25% to predator.
// ember > moss > storm > tide > ember
export const ELEMENT_PREY: Record<Element, Element> = {
  ember: 'moss',
  moss: 'storm',
  storm: 'tide',
  tide: 'ember',
};

export const STAT_BUDGET = 100;
export const STAT_MIN = 10;
export const STAT_MAX = 55;
export const LIFESPAN_DAYS = 3;
export const BELIEF_LEGEND_THRESHOLD = 25;
export const BELIEF_MOVE_UNLOCK = 10;
export const MAX_ALIVE_PER_USER = 3;

// REST endpoints (Hono, JSON; errors = ArenaErrorResponse with 4xx/5xx):
// GET  /api/arena          -> ArenaState
// POST /api/scribbit       -> SubmitScribbitRequest -> Scribbit         (401 if logged out, 409 if drawnToday)
// POST /api/enter-rumble   -> EnterRumbleRequest -> { entered: true }   (409 if enteredToday)
// GET  /api/my-battles     -> BattleReport[]  (caller's battles, newest first, top 20)
// POST /api/believe        -> BelieveRequest -> { belief: number }      (one per user per scribbit per day)
// POST /api/boss-challenge -> BossChallengeRequest -> BattleReport      (instant resolve vs champion; one per user per day)
// GET  /api/legends        -> LegendsState
// GET  /api/drawing/:id    -> image/png bytes (only when redis-stored fallback is used)
