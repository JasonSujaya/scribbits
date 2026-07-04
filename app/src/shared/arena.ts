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

export type Mood = 'happy' | 'hungry' | 'sleepy' | 'pumped';
export type CareAction = 'feed' | 'pat' | 'train';

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
  // Tamagotchi layer — levels die with the scribbit; bonuses are small + capped
  level: number; // 1..MAX_LEVEL
  xp: number;
  mood: Mood; // derived from care state; cosmetic + tiny xp multiplier
  careDoneToday: CareAction[]; // each action once per scribbit per day
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
  rumbleResolvesAt: number; // epoch ms — client renders live countdown
  todayEntrants: Scribbit[]; // tonight's bracket (gallery + backing targets)
  myBackedScribbitId: string | null; // today's Back (bet), null if unused
  myClout: number; // lifetime talent-scout score
};

export type BackRequest = { scribbitId: string }; // one per user per day, final
export type CloutEntry = { username: string; clout: number };
export type CloutBoard = {
  top: CloutEntry[]; // top 20
  me: CloutEntry & { rank: number };
};
// Clout payout (nightly job): +3 backed the champion, +1 backed a finalist.

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
  stats: ScribbitStats; // deprecated: client preview only; server recomputes from PNG
  element: Element; // deprecated: client preview only; server recomputes from PNG
};

export type EnterRumbleRequest = { scribbitId: string };
export type CareRequest = { scribbitId: string; action: CareAction };
export type SparRequest = { scribbitId: string }; // exhibition vs a founding NPC
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

// Tamagotchi/level balance: bonuses must stay small enough that shape + matchup
// dominate. Level bonus dies with the scribbit. XP: care action = 1 (x2 when
// 'pumped'), rumble/boss win = 2, first spar win of the day = 1.
export const MAX_LEVEL = 5;
export const LEVEL_XP_THRESHOLDS = [0, 3, 7, 12, 18]; // xp needed for level 1..5
export const LEVEL_DAMAGE_BONUS_PER_LEVEL = 0.02; // +2%/level above 1, max +8%

// REST endpoints (Hono, JSON; errors = ArenaErrorResponse with 4xx/5xx):
// GET  /api/arena          -> ArenaState
// POST /api/scribbit       -> SubmitScribbitRequest -> Scribbit         (401 if logged out, 409 if drawnToday)
// POST /api/enter-rumble   -> EnterRumbleRequest -> { entered: true }   (409 if enteredToday)
// GET  /api/my-battles     -> BattleReport[]  (caller's battles, newest first, top 20)
// POST /api/believe        -> BelieveRequest -> { belief: number }      (one per user per scribbit per day)
// POST /api/boss-challenge -> BossChallengeRequest -> BattleReport      (instant resolve vs champion; one per user per day)
// POST /api/care           -> CareRequest -> Scribbit                   (each action once per scribbit per UTC day)
// POST /api/spar           -> SparRequest -> BattleReport               (exhibition vs random founding NPC; unlimited, xp only on first daily win)
// POST /api/back           -> BackRequest -> { backed: string }         (one per user per day, locks at rumble resolve)
// GET  /api/clout-board    -> CloutBoard
// GET  /api/legends        -> LegendsState
// GET  /api/drawing/:id    -> image/png bytes (only when redis-stored fallback is used)
