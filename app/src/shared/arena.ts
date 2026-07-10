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
  accessories: string[]; // accessory catalog ids welded to this scribbit
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

export type DailyRumbleReceipt = {
  resolvedDay: number;
  backedName: string;
  championName: string;
  cloutEarned: number;
  inkAwarded: number;
};

export type ArenaState = {
  dayNumber: number;
  loggedIn: boolean;
  myUsername: string | null;
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
  playStreakDays: number; // consecutive UTC days with an expanded game session
  myClout: number; // lifetime talent-scout score
  myInk: number; // Mystery Ink balance
  myPens: string[]; // unlocked palette pen ids
  nextCapsuleCost: number; // authoritative current price (daily discount already applied)
  lastRumbleReceipt: DailyRumbleReceipt | null; // yesterday's Back payoff, if the player made a pick
};

// Lightweight, read-only inline feed contract. It deliberately excludes
// rosters, inventories, drawings, and the full entrant gallery.
export type SplashState = {
  loggedIn: boolean;
  resolving: boolean;
  forecast: Forecast;
  rumbleEntrants: number;
  rumbleResolvesAt: number;
  drawnToday: boolean;
  backedToday: boolean;
  playStreakDays: number;
};

export type BackRequest = { scribbitId: string }; // one per user per day, final
export type RemoveScribbitRequest = { scribbitId: string };
export type ReportScribbitRequest = { scribbitId: string };
export type ReportScribbitResponse = {
  hidden: string;
  removedForEveryone: boolean;
};

// Mystery Ink gacha — earned currency only. Pulls grant ONE-TIME-USE items:
// accessories are consumed on attach (welded to that scribbit for life, and
// lost with it). Duplicates simply stack in inventory. Pens are consumable
// palette boosts too? No — pens remain permanent unlocks (small part of pool);
// accessories are the stars and are per-copy consumables.
export type CapsuleRarity = 'common' | 'rare' | 'epic';
export type CapsuleItemKind = 'accessory' | 'pen' | 'title';
export type CapsulePull = {
  rarity: CapsuleRarity;
  kind: CapsuleItemKind;
  id: string;
  name: string; // "Golden Crown"
  description: string;
  isNew: boolean; // first copy ever pulled (dupes still stack for accessories)
  ownedCount: number; // count in inventory after this pull
};
export type Inventory = {
  items: Record<string, number>; // catalog id -> unattached copies owned
  pens: string[]; // permanent palette unlocks
  titles: string[];
};
export type CapsulePullResponse = {
  pull: CapsulePull;
  ink: number;
  inventory: Inventory;
  nextCost: number;
};
export type CapsulePullRequest = { operationId: string };
// Accessory attached during drawing; consumed from inventory at submit.
// Coordinates in 512x512 canvas space; client bakes visuals into the PNG.
export const MIN_ACCESSORY_SCALE = 0.5;
export const MAX_ACCESSORY_SCALE = 2;
export type AttachedAccessory = {
  id: string;
  x: number;
  y: number;
  scale: number; // MIN_ACCESSORY_SCALE..MAX_ACCESSORY_SCALE
  rotation: number; // radians
};
export const MAX_ACCESSORIES_PER_SCRIBBIT = 2;
export const INK_REWARDS = {
  care: 1,
  sparWin: 2,
  rumbleWin: 5,
  backedChampion: 5,
  dailyDraw: 2,
} as const;
export const CAPSULE_COST = 10;
export const CAPSULE_FIRST_DAILY_COST = 5; // first pull each day is discounted
export const CAPSULE_PITY = 10; // epic guaranteed within N pulls
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
  inkAwarded?: number; // actual reward attached by the resolving action, never inferred by the client
  events: BattleEvent[]; // 6-14 events, replayable
};

export type SubmitScribbitRequest = {
  name: string;
  imageDataUrl: string; // png data URL from canvas (accessories baked in), 512x512, <=400KB
  stats: ScribbitStats; // deprecated: client preview only; server recomputes from PNG
  element: Element; // deprecated: client preview only; server recomputes from PNG
  accessories?: AttachedAccessory[]; // max 2; server validates ownership + consumes copies
};

export type EnterRumbleRequest = { scribbitId: string };
export type CareRequest = { scribbitId: string; action: CareAction };
export type SparRequest = { scribbitId: string }; // exhibition vs a founding NPC
export type BelieveRequest = { scribbitId: string };
export type BossChallengeRequest = { scribbitId: string };

export type LegendsState = {
  legends: Scribbit[]; // newest first, one server-bounded page
  nextCursor: string | null; // server-issued continuation token; null on the final page
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
// POST /api/remove-scribbit -> RemoveScribbitRequest -> { removed: string } (owner removal)
// POST /api/report-scribbit -> ReportScribbitRequest -> ReportScribbitResponse (hide + safety report)
// GET  /api/clout-board    -> CloutBoard
// POST /api/capsule        -> CapsulePullResponse                       (spends ink; seeded random + pity; duplicate accessories stack)
// GET  /api/inventory      -> Inventory
// GET  /api/legends?cursor&limit -> LegendsState (limit defaults to and is capped at 50)
