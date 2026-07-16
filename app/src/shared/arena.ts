// Scribbits Arena v3 shared contract — SOURCE OF TRUTH between client and server.
// Extend, never fork. Analyzer + balance invariants: plans/v3-scribbits-arena.md.

import type { BattleTranscript } from './combat';
import type { CombatRole } from './combat/types';
import type { CombatRoleMatchupRead } from './combat/roles';
import type {
  BattleArenaChallengeProgress,
  BattleArenaId,
  NextBattleArenaUnlock,
} from './battlearena';
import type { ScribbitUpgrade } from './combat/upgrades';
import type { PowerUpId, PowerUpOffer } from './combat/powerups';
import type { Element } from './elements';
import type { EquipmentLoadout } from './equipment';
import type { SparRewardReceipt } from './sparreward';
import type { SeasonPublicState } from './season';
import type { PaintBucketState } from './paintbucket';
import type { DailyLoginState } from './dailylogin';
import type { CommunityDrawTheme } from './content/communitydrawthemes';
import {
  cloneEquipmentLoadout,
  createEmptyEquipmentLoadout,
  parseEquipmentLoadout,
} from './equipment';

export { ELEMENTS, isElement } from './elements';
export type { Element } from './elements';
export type { EquipGearRequest } from './equipment';
export type { SparRewardReceipt } from './sparreward';
export type { PaintBucketState } from './paintbucket';
export type {
  DailyLoginClaimResponse,
  DailyLoginReward,
  DailyLoginState,
} from './dailylogin';
export type { PowerUpId } from './combat/powerups';
export type {
  ChoosePowerUpRequest,
  ChoosePowerUpResponse,
  PowerUpOffer,
} from './combat/powerups';
export type {
  SeasonBoard,
  SeasonBoardEntry,
  SeasonEventSummary,
  SeasonPlayerStanding,
  SeasonPublicState,
  SeasonRewardReceipt,
  SeasonSummary,
} from './season';
export {
  LEVEL_DAMAGE_BONUS_PER_LEVEL,
  LEVEL_XP_THRESHOLDS,
  MAX_LEVEL,
} from './progression';

// Always sums to exactly 100 after server normalization.
export type ScribbitStats = {
  chonk: number; // HP/body size + Inkquake identity
  spike: number; // long-range physical identity
  zip: number; // gun movement and burst identity
  charm: number; // crit chance + Colorburst identity
};

export const SCRIBBIT_STAT_KEYS = Object.freeze([
  'chonk',
  'spike',
  'zip',
  'charm',
] as const satisfies readonly (keyof ScribbitStats)[]);

export type ScribbitStatus = 'alive' | 'faded' | 'legend';
export type ScribbitLifecycleStage = 'growing' | 'mature' | 'archived';
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
  schemaVersion: 1 | 2 | 3;
  archivedDay: number;
  finish: LegacyFinish;
  creatorTitle: LegacyCosmeticSnapshot | null;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  belief: number;
  accessories: LegacyCosmeticSnapshot[];
  upgrades: ScribbitUpgrade[];
};

export type Scribbit = {
  id: string;
  name: string; // player-given, 2-24 chars
  artist: string; // reddit username
  element: Element;
  stats: ScribbitStats;
  imageUrl: string; // Reddit-hosted in production; local mock fixtures may use /api/drawing/{id}
  drawingThemeId: string | null; // immutable community-theme category; null for founders and older records
  bornDay: number;
  expiresDay: number; // maturity day: bornDay + 3 (legacy field name)
  belief: number;
  wins: number;
  losses: number;
  status: ScribbitStatus;
  legendTitle: string | null; // e.g. "Champion of Day 12"
  isFounding: boolean; // NPC founding roster
  accessories: string[]; // accessory catalog ids welded to this scribbit
  gearRanks?: Record<string, GearRank>; // presentation snapshot for welded/equipped Gear; old records default to rank 1
  equipmentLoadout: EquipmentLoadout; // two server-authoritative slots per Gear category
  // Legacy v1 progression retained only so archived reports/cards remain
  // readable. New fights and player-facing progression use Power-Ups.
  upgrades: ScribbitUpgrade[];
  powerUpIds?: PowerUpId[]; // up to five behavioral rewards; Gear owns raw stats
  level: number; // 1..MAX_LEVEL
  xp: number;
  legacy: ScribbitLegacy | null; // null while alive, immutable snapshot afterward
};

// One dependency-free copy boundary for storage, combat reports, Rumble,
// founding opponents, and the local mock. Keep every mutable nested field
// isolated so adding a Scribbit field cannot silently create aliasing in one
// subsystem while another remains safe.
export const cloneScribbit = (scribbit: Scribbit): Scribbit => {
  const equipmentLoadout =
    parseEquipmentLoadout(scribbit.equipmentLoadout) ??
    createEmptyEquipmentLoadout();

  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    drawingThemeId: scribbit.drawingThemeId ?? null,
    accessories: [...scribbit.accessories],
    gearRanks: { ...(scribbit.gearRanks ?? {}) },
    equipmentLoadout: cloneEquipmentLoadout(equipmentLoadout),
    // Old in-memory battle fixtures predate Ink Mods. Storage validation still
    // rejects missing runtime authority before writes; cloning preserves the
    // battle facade's finite read compatibility by projecting no mods.
    upgrades: (scribbit.upgrades ?? []).map((upgrade) => ({ ...upgrade })),
    powerUpIds: [...(scribbit.powerUpIds ?? [])],
    legacy: scribbit.legacy
      ? {
          ...scribbit.legacy,
          creatorTitle: scribbit.legacy.creatorTitle
            ? { ...scribbit.legacy.creatorTitle }
            : null,
          accessories: scribbit.legacy.accessories.map((accessory) => ({
            ...accessory,
          })),
          upgrades: scribbit.legacy.upgrades.map((upgrade) => ({ ...upgrade })),
        }
      : null,
  };
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

export type RumbleReturnFighter = Pick<
  Scribbit,
  'id' | 'name' | 'element' | 'stats' | 'imageUrl' | 'isFounding'
>;

export type BackedRumbleReceipt = {
  kind: 'backed';
  resolvedDay: number;
  backedName: string;
  championName: string;
  pick: RumbleReturnFighter | null;
  opponent: RumbleReturnFighter | null;
  opponentIsChampion: boolean;
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

export const DRAW_CHARGE_CAPACITY = 3;
export const DRAW_CHARGE_REFILL_INTERVAL_MS = 8 * 60 * 60 * 1_000;

export type DrawChargeState = {
  available: number;
  capacity: number;
  nextRefreshAt: number | null;
};

export type ArenaState = {
  dayNumber: number;
  loggedIn: boolean;
  hasCreatedScribbit: boolean;
  hasCompletedBattle: boolean;
  myUsername: string | null;
  communityDrawTheme: CommunityDrawTheme | null; // server-assigned, stable for this player and three-day cycle
  forecast: Forecast;
  champion: Scribbit | null; // frozen snapshot, today's boss
  myScribbits: Scribbit[]; // growing + mature, newest first, max 12
  pendingMaturityScribbitIds: string[]; // mature transitions not yet presented
  discoveredPowerUpIds?: PowerUpId[]; // permanent player-wide Power-Up discoveries
  pendingPowerUpOffers?: PowerUpOffer[]; // server-persisted choices recoverable after reload
  drawCharges: DrawChargeState; // server-owned birth energy, lazily refilled
  paintBucket: PaintBucketState; // persistent capacity; each drawing starts full
  drawnToday: boolean;
  todayFreeDrawing: FreeDrawing | null; // non-null only for this exact Arena day
  enteredToday: boolean; // rumble entry used
  bossChallengedToday: boolean; // one authoritative Champion Challenge used
  rumbleEntrants: number;
  communityLegendCount: number;
  rumbleResolvesAt: number; // epoch ms — client renders live countdown
  season: SeasonPublicState; // authoritative 60-day campaign, event, and player rank
  venueStamp: VenueStampState; // caller's best result in today's rotating venue
  todayEntrants: Scribbit[]; // tonight's Rumble field (gallery + Back targets)
  myBackedScribbitId: string | null; // today's Back, null if unused
  playStreakDays: number; // consecutive UTC days with an expanded game session
  activePlayDays: number; // lifetime distinct UTC play days; never resets
  dailyLogin: DailyLoginState; // server-owned seven-login starter track + daily reward
  myClout: number; // lifetime talent-scout score
  myInk: number; // Mystery Ink balance
  myPens: string[]; // unlocked palette pen ids
  myDrawingSupplies?: Record<string, number>; // consumable drawing-ink and brush charges
  nextCapsuleCost: number; // authoritative current Mystery Ink chest price
  capsuleProgress: CapsuleProgress;
  founderChronicle: FounderChronicle;
  lastRumbleReceipt: DailyRumbleReceipt | null; // yesterday's Back payoff, otherwise the player's owned entrant result
  legacyReturnReceipt: LegacyReturnReceipt | null; // unseen expiry payoff, cleared explicitly
};

export type VenueStampState = Readonly<{
  arenaId: BattleArenaId;
  arenaName: string;
  challengeLabel: string;
  progress: number;
  target: number;
  cleared: boolean;
  bestClearMilliseconds: number | null;
  dailyRank: number | null;
  clearCount: number;
  nextUnlock: NextBattleArenaUnlock | null;
  tourClearedArenaIds: readonly BattleArenaId[];
  tourClearedCount: number;
  tourTotal: number;
  tourComplete: boolean;
  tourEffort: number;
  tourEffortTarget: number;
}>;

export type VenueBoardEntry = Readonly<{
  username: string;
  rank: number;
  clearMilliseconds: number;
}>;

export type VenueBoard = Readonly<{
  dayNumber: number;
  arenaId: BattleArenaId;
  arenaName: string;
  challengeLabel: string;
  clearCount: number;
  top: readonly VenueBoardEntry[];
  me: VenueBoardEntry | null;
}>;

export type SplashCreation = Readonly<
  Pick<Scribbit, 'id' | 'name' | 'artist' | 'imageUrl'>
>;

// Lightweight, read-only inline feed contract. It deliberately excludes
// rosters, inventories, and the full entrant gallery. The bounded creation
// previews give the static splash real community art without exposing combat
// or progression data.
export type SplashState = {
  loggedIn: boolean;
  hasCreatedScribbit: boolean;
  featuredCreations: SplashCreation[];
};

export type BackRequest = { scribbitId: string }; // one per user per day, final
export type AcknowledgeMaturityRequest = Readonly<{ scribbitId: string }>;
export type AcknowledgeMaturityResponse = Readonly<{ scribbitId: string }>;
export type RetireScribbitRequest = { scribbitId: string };
export type RetireScribbitResponse = { retired: Scribbit };
export type ReportScribbitResponse = {
  hidden: string;
  removedForEveryone: boolean;
};

// Mystery Ink gacha — earned currency only. Pulls grant ONE-TIME-USE items:
// accessories are consumed on attach (welded to that scribbit for life, and
// lost with it). Duplicates simply stack in inventory. Pens are consumable
// palette boosts too? No — pens remain permanent unlocks (small part of pool);
// accessories are the stars and are per-copy consumables.
export const CAPSULE_RARITIES = Object.freeze([
  'common',
  'rare',
  'epic',
  'legendary',
] as const);
export type CapsuleRarity = (typeof CAPSULE_RARITIES)[number];
export const isCapsuleRarity = (value: unknown): value is CapsuleRarity => {
  return CAPSULE_RARITIES.includes(value as CapsuleRarity);
};
export const capsuleRarityRank = (rarity: CapsuleRarity): number => {
  return CAPSULE_RARITIES.indexOf(rarity);
};
export const isEpicOrBetterCapsuleRarity = (rarity: CapsuleRarity): boolean => {
  return capsuleRarityRank(rarity) >= capsuleRarityRank('epic');
};
export type CapsuleItemKind =
  | 'accessory'
  | 'pen'
  | 'title'
  | 'drawing-ink'
  | 'brush';
export const MAX_NORMAL_GEAR_RANK = 5 as const;
export const RED_STAR_GEAR_RANK = 6 as const;
export const NORMAL_GEAR_STAR_COUNT = MAX_NORMAL_GEAR_RANK;
export const SPECIAL_GEAR_RANK = RED_STAR_GEAR_RANK;
export const GEAR_RANKS = Object.freeze([1, 2, 3, 4, 5, 6] as const);
export type GearRank = (typeof GEAR_RANKS)[number];
export const MAX_GEAR_RANK: GearRank = SPECIAL_GEAR_RANK;
export const GEAR_MERGE_COPY_COST = 3;
export const getGearMergeCopyCost = (_fromRank: GearRank): number => {
  return GEAR_MERGE_COPY_COST;
};
export const isGearRank = (value: unknown): value is GearRank => {
  return typeof value === 'number' && GEAR_RANKS.includes(value as GearRank);
};
export const isSpecialGearRank = (rank: GearRank): boolean => {
  return rank === SPECIAL_GEAR_RANK;
};
export const getAttachedGearRank = (
  scribbit: Pick<Scribbit, 'gearRanks'>,
  gearId: string
): GearRank => {
  const rank = scribbit.gearRanks?.[gearId];
  return isGearRank(rank) ? rank : 1;
};
export type GearInventoryEntry = {
  rank: GearRank;
  copies: number; // loose accessory copies that can be attached or merged
  rarity: CapsuleRarity; // catalog-derived, returned so clients never guess
};
export type CapsulePull = {
  rarity: CapsuleRarity;
  kind: CapsuleItemKind;
  id: string;
  name: string; // "Golden Crown"
  description: string;
  isNew: boolean; // first copy ever pulled (dupes still stack for accessories)
  ownedCount: number; // count in inventory after this pull
  gearRank: GearRank | null; // accessory rank after this pull
  mergeReady: boolean; // server-owned convenience flag for the reveal ceremony
};
export type Inventory = {
  items: Record<string, number>; // consumable catalog id -> available copies or paint charges
  gear: Record<string, GearInventoryEntry>; // discovered accessories, including zero-copy gear
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
export type MergeGearRequest = { operationId: string; gearId: string };
export type MergeGearResponse = {
  gearId: string;
  fromRank: GearRank;
  toRank: GearRank;
  copiesSpent: number;
  inventory: Inventory;
};
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
export type DrawingSupplySelection = {
  drawingInkId: string | null;
  brushId: string | null;
};
export const MAX_ACCESSORIES_PER_SCRIBBIT = 2;
export const INK_REWARDS = {
  sparWin: 2,
  rumbleWin: 5,
  backedChampion: 5,
  dailyDraw: 7,
} as const;
export const XP_REWARDS = {
  sparWin: 1,
  rumbleWin: 2,
  championWin: 2,
} as const;
// The core Daily Draw loop should immediately fund one chest. Battle rewards
// remain valuable because they can fund additional opens.
export const CAPSULE_COST = 7;
// Kept as a separate transport constant while older daily-pull records age out.
// The earned-Ink chest now has one honest price instead of urgency pricing.
export const CAPSULE_FIRST_DAILY_COST = CAPSULE_COST;
export const CAPSULE_MAX_BATCH_SIZE = 10;
export const CAPSULE_PITY = 10; // epic-or-better guaranteed within N pulls
export const CAPSULE_RARITY_PERCENTAGES = {
  common: 70,
  rare: 25,
  epic: 4,
  legendary: 1,
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
  | { kind: 'player_ability_activations'; target: 3 }
  | { kind: 'player_shape_power_hit_bouts'; target: 2 }
  | { kind: 'player_late_shape_power_activations'; target: 1 }
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
  matchup: CombatRoleMatchupRead;
};

export type BattleReport = {
  id: string;
  kind: BattleKind;
  day: number;
  a: Scribbit;
  b: Scribbit;
  winner: 'a' | 'b';
  battleArenaId?: BattleArenaId; // absent only on historical reports
  arenaChallenge?: BattleArenaChallengeProgress;
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
  powerUpOffer?: PowerUpOffer | null;
};

export type SparBattleResponse = DirectBattleResponse & {
  rewardReceipt: SparRewardReceipt | null;
  powerUpOffer: PowerUpOffer | null;
};

export type PracticeBattleRequest = {
  name: string;
  baseImageDataUrl: string;
  /** @deprecated Server derives style from the submitted drawing colors. */
  fighterStyle?: CombatRole;
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
  submissionId: string; // client operation id; retries return the exact same birth
  name: string;
  baseImageDataUrl: string; // undecorated PNG checked for real drawing ink, 512x512, <=400KB
  imageDataUrl: string; // rendered PNG uploaded/displayed, 512x512, <=400KB
  stats: ScribbitStats; // deprecated: client preview only; server derives canonical color stats
  element: Element; // deprecated: client preview only; server recomputes from PNG
  /** @deprecated Server derives role from the submitted drawing colors. */
  fighterStyle?: CombatRole;
  accessories?: AttachedAccessory[]; // max 2; server validates ownership + consumes copies
  // Server validates both ids and spends one charge from each selected supply
  // only inside the atomic successful Scribbit-birth transaction.
  drawingSupplies?: DrawingSupplySelection;
};

export type SubmitScribbitResponse = {
  scribbit: Scribbit;
  drawCharges: DrawChargeState;
  enteredRumble: boolean;
  powerUpOffer: PowerUpOffer | null;
};

// Free Draws are private, untimed creations. They deliberately do not carry
// theme, combat, reward, or Rumble fields from the Scribbit record.
export type FreeDrawing = {
  id: string;
  name: string;
  artist: string;
  imageUrl: string;
  createdDay: number;
  createdAtMilliseconds: number;
};

export type SubmitFreeDrawingRequest = {
  submissionId: string;
  name: string;
  baseImageDataUrl: string;
  imageDataUrl: string;
  accessories?: AttachedAccessory[];
  drawingSupplies?: DrawingSupplySelection;
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
  firstBattle?: true; // newborn-only request; server verifies the player's first completed battle
};
export type BossChallengeRequest = { scribbitId: string };

export type LegendsState = {
  legends: Scribbit[]; // newest first, one server-bounded page
  nextCursor: string | null; // server-issued continuation token; null on the final page
};

export type LegacyCardsState = {
  cards: LegacyCard[]; // caller-owned, immutable expiry snapshots, newest first
  nextCursor: string | null;
};

export const ARENA_ERROR_CODES = [
  'bad_request',
  'unauthorized',
  'not_found',
  'conflict',
  'busy',
  'too_many_requests',
  'payload_too_large',
  'payment_required',
  'server_error',
] as const;
export type ArenaErrorCode = (typeof ARENA_ERROR_CODES)[number];
export const PLAYER_MUTATION_BUSY_MESSAGE =
  'Another game action is finishing. Try again.';
export type ArenaErrorResponse = {
  status: 'error';
  code: ArenaErrorCode;
  /** English compatibility fallback for older clients and operational logs. */
  message: string;
};

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
export const SCRIBBIT_ROSTER_CAPACITY = {
  growing: 3,
  mature: 3,
} as const;
export const MAX_GROWING_PER_USER = SCRIBBIT_ROSTER_CAPACITY.growing;
export const MAX_MATURE_PER_USER = SCRIBBIT_ROSTER_CAPACITY.mature;
export const MAX_ALIVE_PER_USER = MAX_GROWING_PER_USER + MAX_MATURE_PER_USER;

export const getScribbitLifecycleStage = (
  scribbit: Pick<Scribbit, 'status' | 'expiresDay'>,
  currentArenaDay: number
): ScribbitLifecycleStage => {
  if (scribbit.status !== 'alive') return 'archived';
  return currentArenaDay >= scribbit.expiresDay ? 'mature' : 'growing';
};

// Tamagotchi/level balance: growth should be visible without letting an older
// Scribbit invalidate a better drawing. Levels 2-5 each unlock one small,
// deterministic Ink Mod, plus the existing capped 1.5% mastery bonus. Shape,
// power matchup, and authored forecast remain dominant. All growth dies with
// the Scribbit. XP awards live in XP_REWARDS above.
// REST endpoints (Hono, JSON; errors = ArenaErrorResponse with 4xx/5xx):
// GET  /api/arena          -> ArenaState
// GET  /api/venue-board    -> VenueBoard (today's fastest authoritative challenge clears)
// POST /api/daily-login/claim -> DailyLoginClaimResponse
// GET  /api/scout-notebook -> ScoutNotebookState (signed-in caller, today + six prior days)
// POST /api/scribbit       -> SubmitScribbitRequest -> SubmitScribbitResponse (401 logged out, 409 no charge/full roster)
// GET  /api/my-battles     -> BattleReport[]  (caller's battles, newest first, top 20)
// GET  /api/rumble-replay?day -> BattleReport (server-selected bout for caller's Back)
// POST /api/believe        -> { scribbitId: string } -> { belief: number } (one per user per scribbit per day)
// POST /api/boss-challenge -> BossChallengeRequest -> DirectBattleResponse (instant resolve vs champion; one per user per day)
// POST /api/practice-battle -> PracticeBattleRequest -> BattleReport    (ephemeral, server-analyzed, no rewards or persistence)
// GET  /api/spar-rivals?scribbitId -> SparRivalSlate                    (owned living challenger; stable server slate per UTC day)
// POST /api/spar           -> SparRequest -> DirectBattleResponse       (chosen opponentId must be in that exact slate; omitted stays server-random)
// POST /api/back           -> BackRequest -> { backed: string }         (one per user per day, locks at rumble resolve)
// POST /api/retire-scribbit -> RetireScribbitRequest -> RetireScribbitResponse (owner moves an active Scribbit to Archived)
// POST /api/remove-scribbit -> { scribbitId: string } -> { removed: string } (owner removal)
// POST /api/report-scribbit -> { scribbitId: string } -> ReportScribbitResponse (hide + safety report)
// GET  /api/clout-board    -> CloutBoard
// POST /api/capsule        -> CapsulePullResponse                       (spends ink; seeded random + pity; duplicate accessories stack)
// GET  /api/inventory      -> Inventory
// POST /api/equip-gear     -> EquipGearRequest -> Scribbit              (owned living Scribbit + discovered Gear)
// POST /api/equip-title    -> EquipTitleRequest -> Inventory
// GET  /api/legends?cursor&limit -> LegendsState (limit defaults to and is capped at 50)
// GET  /api/legacy-cards?cursor&limit -> LegacyCardsState (owner-only deck)
// POST /api/legacy-cards/seen -> MarkLegacySeenRequest -> { seenThroughDay: number }
