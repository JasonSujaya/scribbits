// Scribbits Arena v3 shared contract — SOURCE OF TRUTH between client and server.
// Extend, never fork. Analyzer + balance invariants: plans/v3-scribbits-arena.md.

import type { BattleTranscript } from './combat';
import type { Element } from './elements';

export { ELEMENTS, isElement } from './elements';
export type { Element } from './elements';

// Always sums to exactly 100 after server normalization.
export type ScribbitStats = {
  chonk: number; // HP/body size + Inkquake identity
  spike: number; // contact damage + Nib Halo identity
  zip: number; // continuous movement + Smearstep identity
  charm: number; // crit chance + Colorburst identity
};

export const SCRIBBIT_STAT_KEYS = Object.freeze([
  'chonk',
  'spike',
  'zip',
  'charm',
] as const satisfies readonly (keyof ScribbitStats)[]);
export type ScribbitStatKey = (typeof SCRIBBIT_STAT_KEYS)[number];

export type ScribbitStatus = 'alive' | 'faded' | 'legend';
export type LegacyFinish = 'faded' | 'believed' | 'champion';
export type LegacyCosmeticSnapshot = {
  id: string;
  name: string;
  rarity: CapsuleRarity;
};

// Immutable final values captured when a living Scribbit leaves the active
// roster. The Scribbit record keeps its original drawing and identity; this
// stamp freezes the progression values used by the owner's Legacy Card.
export type ScribbitLegacy = {
  schemaVersion: 1;
  archivedDay: number;
  finish: LegacyFinish;
  creatorTitle: LegacyCosmeticSnapshot | null;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  belief: number;
  accessories: LegacyCosmeticSnapshot[];
};

export type Mood = 'happy' | 'hungry' | 'sleepy' | 'pumped';
export type CareAction = 'feed' | 'pat' | 'train';

export type Scribbit = {
  id: string;
  name: string; // player-given, 2-24 chars
  artist: string; // reddit username
  element: Element;
  stats: ScribbitStats;
  imageUrl: string; // Reddit-hosted in production; local mock fixtures may use /api/drawing/{id}
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
  legacy: ScribbitLegacy | null; // null while alive, immutable snapshot afterward
};

export type LegacyCard = {
  id: string;
  name: string;
  artist: string;
  element: Element;
  imageUrl: string;
  bornDay: number;
  expiresDay: number;
  status: 'faded' | 'legend';
  legendTitle: string | null;
  legacy: ScribbitLegacy;
};

export type Forecast = {
  day: number;
  boostedElement: Element; // +15% damage
  nerfedElement: Element; // -10% damage
  blurb: string; // "Storm winds howl across the arena..."
};

export type ScoutNotebookStatus =
  | 'open'
  | 'pending'
  | 'champion'
  | 'finalist'
  | 'no_clout'
  | 'missed';

export type ScoutNotebookPick = Readonly<{
  id: string;
  name: string;
  artist: string;
  element: Element;
  imageUrl: string;
  isFounding: boolean;
  stats: Readonly<ScribbitStats>;
}>;

export type ScoutNotebookEntry = Readonly<{
  day: number;
  forecast: Forecast;
  picked: boolean;
  pick: ScoutNotebookPick | null;
  status: ScoutNotebookStatus;
  cloutEarned: number;
  inkAwarded: number;
  replayAvailable: boolean;
}>;

export type ScoutNotebookState = Readonly<{
  currentDay: number;
  lifetimeClout: number;
  entries: readonly ScoutNotebookEntry[]; // today first, followed by up to six prior days
}>;

export type BackedRumbleReceipt = {
  kind: 'backed';
  resolvedDay: number;
  backedName: string;
  championName: string;
  cloutEarned: number;
  inkAwarded: number;
  replayAvailable: boolean; // server-selected last bout for the backed Scribbit
};

export type OwnedRumbleReceipt = {
  kind: 'owned';
  resolvedDay: number;
  entrant: Scribbit; // exact owned snapshot after the standing and XP commit
  wins: number;
  losses: number;
  xpAwarded: number;
  inkAwarded: number;
  isChampion: boolean;
  replayAvailable: boolean; // server-selected last bout for the owned entrant
};

export type DailyRumbleReceipt = BackedRumbleReceipt | OwnedRumbleReceipt;

export type LegacyReturnReceipt = {
  cards: LegacyCard[]; // newest cards first, bounded for the return ceremony
  total: number; // all unseen cards, including cards beyond the preview stack
  newestArchivedDay: number;
};

// Permanent, player-level relationship progress with the fixed founding cast.
// Exactly one best-of-three thread may be active, and at most one story beat
// advances per Arena day. It grants no combat power or currency.
export type FounderRivalryOutcome = 'player_prevailed' | 'founder_prevailed';
export type FounderRivalryThread = {
  founderId: `founding-${string}`;
  startedDay: number;
  playerWins: number;
  founderWins: number;
};
export type FounderRivalryResolution = FounderRivalryThread & {
  resolvedDay: number;
  outcome: FounderRivalryOutcome;
};
export type FounderChronicle = {
  activeRivalry: FounderRivalryThread | null;
  resolvedRivalries: FounderRivalryResolution[]; // one note per canonical founder
  lastAdvancedDay: number | null;
  // Encounters from the retired checklist Chronicle are preserved as an
  // archive only. They never grant score, combat power, or a resolved thread.
  legacyFounderIds?: `founding-${string}`[];
};
export type FounderChronicleBeat = {
  founderId: `founding-${string}`;
  kind: 'rivalry_started' | 'rivalry_advanced' | 'rivalry_resolved';
  day: number;
  playerWins: number;
  founderWins: number;
  outcome: FounderRivalryOutcome | null;
};

export type CapsuleProgress = {
  pullCount: number;
  pityRemaining: number;
  discoveredCount: number;
  collectionTotal: number;
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
  bossChallengedToday: boolean; // one authoritative Champion Challenge used
  rumbleEntrants: number;
  communityLegendCount: number;
  rumbleResolvesAt: number; // epoch ms — client renders live countdown
  todayEntrants: Scribbit[]; // tonight's Rumble field (gallery + Back targets)
  myBackedScribbitId: string | null; // today's Back, null if unused
  playStreakDays: number; // consecutive UTC days with an expanded game session
  myClout: number; // lifetime talent-scout score
  myInk: number; // Mystery Ink balance
  myPens: string[]; // unlocked palette pen ids
  nextCapsuleCost: number; // authoritative current price (daily discount already applied)
  capsuleProgress: CapsuleProgress;
  founderChronicle: FounderChronicle;
  lastRumbleReceipt: DailyRumbleReceipt | null; // yesterday's Back payoff, otherwise the player's owned entrant result
  legacyReturnReceipt: LegacyReturnReceipt | null; // unseen expiry payoff, cleared explicitly
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
  equippedTitle: string | null; // one owned title displayed on future Legacy Cards
  discovered: string[]; // permanent catalog discoveries, including consumed accessories
};
export type CapsulePullResponse = {
  pull: CapsulePull;
  ink: number;
  inventory: Inventory;
  nextCost: number;
  progress: CapsuleProgress;
};
export type CapsulePullRequest = { operationId: string };
export type EquipTitleRequest = { titleId: string | null };
export type MarkLegacySeenRequest = { throughArchivedDay: number };
// Cosmetic accessory attached during drawing; consumed from inventory at submit.
// Coordinates in 512x512 canvas space; client bakes visuals into the rendered PNG.
export const ACCESSORY_BASE_SIZE = 120;
export const MIN_ACCESSORY_SCALE = 0.5;
export const MAX_ACCESSORY_SCALE = 2;
export const MIN_ACCESSORY_ROTATION = -Math.PI;
export const MAX_ACCESSORY_ROTATION = Math.PI;
export type AttachedAccessory = {
  id: string;
  x: number;
  y: number;
  scale: number; // MIN_ACCESSORY_SCALE..MAX_ACCESSORY_SCALE
  rotation: number; // MIN_ACCESSORY_ROTATION..MAX_ACCESSORY_ROTATION radians
};
export const MAX_ACCESSORIES_PER_SCRIBBIT = 2;
export const INK_REWARDS = {
  care: 1,
  sparWin: 2,
  rumbleWin: 5,
  backedChampion: 5,
  dailyDraw: 2,
} as const;
export const XP_REWARDS = {
  care: 1,
  carePumped: 2,
  sparWin: 1,
  rumbleWin: 2,
  championWin: 2,
} as const;
export const CAPSULE_COST = 10;
export const CAPSULE_FIRST_DAILY_COST = 5; // first pull each day is discounted
export const CAPSULE_PITY = 10; // epic guaranteed within N pulls
export const CAPSULE_RARITY_PERCENTAGES = {
  common: 70,
  rare: 25,
  epic: 5,
} as const;
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

export type BattleKind = 'rumble' | 'boss' | 'exhibition' | 'practice';

export const RIVAL_RUN_LENGTH = 3;
export type RivalRunStatus = 'active' | 'complete';
export type RivalRunTier = 'safe' | 'even' | 'risky';
export type RivalRunWinPoints = 1 | 2 | 3;
export type RivalRunChallengeCondition =
  | { kind: 'minimum_wins'; target: 2 | 3 }
  | { kind: 'minimum_score'; target: 5 | 6 | 9 }
  | { kind: 'tier_picks'; tier: RivalRunTier; target: 3 }
  | { kind: 'tier_wins'; tier: RivalRunTier; target: 1 | 2 }
  | { kind: 'tier_set'; targetMask: 7 }
  | { kind: 'outcome_sequence'; sequence: 'loss-win-win' }
  | { kind: 'final_win' }
  | { kind: 'finish_run' };
export type RivalRunChallenge = {
  id: string; // versioned immutable content id
  name: string;
  premise: string;
  goal: string;
  stamp: string;
  condition: RivalRunChallengeCondition;
  progress: number;
  completionAchieved: boolean;
};
export type RivalRunState = {
  id: string;
  dayNumber: number;
  challengerId: string;
  boutsCompleted: number;
  wins: number;
  losses: number;
  score: number;
  opponentIds: string[];
  status: RivalRunStatus;
  challenge: RivalRunChallenge;
};
export type RivalRunReceipt = RivalRunState & {
  boutNumber: number;
  outcome: 'win' | 'loss';
  tier: RivalRunTier;
  winPoints: RivalRunWinPoints;
  pointsAwarded: 0 | RivalRunWinPoints;
};
export type RivalRunChoice = {
  rival: Scribbit;
  tier: RivalRunTier;
  winPoints: RivalRunWinPoints;
};

export type BattleReport = {
  id: string;
  kind: BattleKind;
  day: number;
  a: Scribbit;
  b: Scribbit;
  winner: 'a' | 'b';
  inkAwarded?: number; // actual reward attached by the resolving action, never inferred by the client
  rivalRun?: RivalRunReceipt; // immutable server receipt for a chosen three-bout Rival Run fight
  // Read-only compatibility for old Redis records. New reports omit this
  // turn-style projection and store only the authoritative simulation.
  events?: BattleEvent[];
  simulation?: BattleTranscript;
};

export type DirectBattleResponse = {
  report: BattleReport;
  founderChronicle: FounderChronicle;
  founderChronicleBeat: FounderChronicleBeat | null;
};

export type PracticeBattleRequest = {
  name: string;
  baseImageDataUrl: string;
};

export type PracticeBattleReport = Omit<
  BattleReport,
  'kind' | 'simulation' | 'inkAwarded' | 'events'
> & {
  kind: 'practice';
  simulation: BattleTranscript;
  inkAwarded?: never;
  events?: never;
};

export type SubmitScribbitRequest = {
  name: string;
  baseImageDataUrl: string; // undecorated PNG analyzed for stats, 512x512, <=400KB
  imageDataUrl: string; // rendered PNG uploaded/displayed, 512x512, <=400KB
  stats: ScribbitStats; // deprecated: client preview only; server recomputes from PNG
  element: Element; // deprecated: client preview only; server recomputes from PNG
  accessories?: AttachedAccessory[]; // max 2; server validates ownership + consumes copies
};

export type EnterRumbleRequest = { scribbitId: string };
export type CareRequest = { scribbitId: string; action: CareAction };
export type CareResponse = {
  scribbit: Scribbit;
  inkAwarded: number; // exact committed side effect; zero when non-critical award fails
};
export type SparRivalSlate = {
  challenger: Scribbit; // current server snapshot after any just-earned XP
  choices: RivalRunChoice[]; // one safe/even/risky server-ranked choice
  founderChronicle: FounderChronicle;
  dayNumber: number; // authoritative current Arena day for rivalry readiness
  forecast: Forecast; // authoritative forecast used by the next server fight
  rivalRun: RivalRunState; // current three-bout run; completed runs roll into a fresh slate
};
export type SparRivalRunAttempt = {
  id: string;
  expectedBoutsCompleted: number;
};
export type SparRequest = {
  scribbitId: string;
  opponentId?: string; // when present, must be in this challenger's current server-authored slate
  rivalRun?: SparRivalRunAttempt; // optional quick spars remain outside Rival Runs
};
export type BelieveRequest = { scribbitId: string };
export type BossChallengeRequest = { scribbitId: string };

export type LegendsState = {
  legends: Scribbit[]; // newest first, one server-bounded page
  nextCursor: string | null; // server-issued continuation token; null on the final page
  /** @deprecated Use GET /api/legacy-cards for the complete personal deck. */
  myFaded: Scribbit[];
};

export type LegacyCardsState = {
  cards: LegacyCard[]; // caller-owned, immutable expiry snapshots, newest first
  nextCursor: string | null;
};

export type ArenaErrorResponse = { status: 'error'; message: string };

// Legacy relation retained for archived-report compatibility helpers only.
// Fixed-tick combat does not apply this +/-25% triangle; elements now provide
// Ember burn, Tide knockback, Moss barrier, and Storm timing payloads.
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
export const MAX_ALIVE_PER_USER = 3;

// Tamagotchi/level balance: growth should be visible without letting an older
// Scribbit invalidate a better drawing. The full level 1 -> 5 journey adds only
// 1.5% damage; shape, power matchup, and authored forecast remain dominant.
// Level bonus dies with the Scribbit. XP awards live in XP_REWARDS above.
export const MAX_LEVEL = 5;
export const LEVEL_XP_THRESHOLDS = [0, 3, 7, 12, 18]; // xp needed for level 1..5
export const LEVEL_DAMAGE_BONUS_PER_LEVEL = 0.00375; // +0.375%/level above 1, max +1.5%

// REST endpoints (Hono, JSON; errors = ArenaErrorResponse with 4xx/5xx):
// GET  /api/arena          -> ArenaState
// GET  /api/scout-notebook -> ScoutNotebookState (signed-in caller, today + six prior days)
// POST /api/scribbit       -> SubmitScribbitRequest -> Scribbit         (401 if logged out, 409 if drawnToday)
// POST /api/enter-rumble   -> EnterRumbleRequest -> { entered: true }   (409 if enteredToday)
// GET  /api/my-battles     -> BattleReport[]  (caller's battles, newest first, top 20)
// GET  /api/rumble-replay?day -> BattleReport (server-selected bout for caller's Back)
// POST /api/believe        -> BelieveRequest -> { belief: number }      (one per user per scribbit per day)
// POST /api/boss-challenge -> BossChallengeRequest -> DirectBattleResponse (instant resolve vs champion; one per user per day)
// POST /api/care           -> CareRequest -> CareResponse               (each action once per scribbit per UTC day)
// POST /api/practice-battle -> PracticeBattleRequest -> BattleReport    (ephemeral, server-analyzed, no rewards or persistence)
// GET  /api/spar-rivals?scribbitId -> SparRivalSlate                    (owned living challenger; stable server slate per UTC day)
// POST /api/spar           -> SparRequest -> DirectBattleResponse       (chosen opponentId must be in that exact slate; omitted stays server-random)
// POST /api/back           -> BackRequest -> { backed: string }         (one per user per day, locks at rumble resolve)
// POST /api/remove-scribbit -> RemoveScribbitRequest -> { removed: string } (owner removal)
// POST /api/report-scribbit -> ReportScribbitRequest -> ReportScribbitResponse (hide + safety report)
// GET  /api/clout-board    -> CloutBoard
// POST /api/capsule        -> CapsulePullResponse                       (spends ink; seeded random + pity; duplicate accessories stack)
// GET  /api/inventory      -> Inventory
// POST /api/equip-title    -> EquipTitleRequest -> Inventory
// GET  /api/legends?cursor&limit -> LegendsState (limit defaults to and is capped at 50)
// GET  /api/legacy-cards?cursor&limit -> LegacyCardsState (owner-only deck)
// POST /api/legacy-cards/seen -> MarkLegacySeenRequest -> { seenThroughDay: number }
