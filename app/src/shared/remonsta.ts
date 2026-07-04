// Shared contract between client and server. This file is the source of truth —
// both sides code against it; extend it rather than defining parallel types.

export type Biome = 'forest' | 'ember' | 'tidepool' | 'sky';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Weather = 'quiet' | 'lively' | 'stormy';

export type Species = {
  id: string;
  name: string;
  artist: string; // reddit username, 'remonsta' for launch species
  rarity: Rarity;
  biome: Biome;
  lore: string; // one line
  spriteKey: string; // client asset key
};

export type ActiveSpawn = {
  spawnId: string;
  speciesId: string;
  expiresAt: number; // epoch ms
  seed: number; // deterministic catch-minigame seed
};

export type WildsState = {
  dayNumber: number; // Wilds #N
  weather: Weather;
  spawns: ActiveSpawn[];
  huntersOnline: number;
  communityDexPercent: number;
  species: Species[]; // registry snapshot for rendering
  loggedIn: boolean; // client gates the catch flow on this
};

// Catch minigame determinism: a focus ring shrinks from radius 100 to 0 over
// durationMs(seed, rarity). Player must tap while the ring is inside the sweet
// zone [sweetMin, sweetMax], `tapsRequired` times. Client sends tap timestamps
// (ms since minigame start); server replays them against the same params.
export type CatchParams = {
  durationMs: number;
  sweetMin: number; // ring radius lower bound
  sweetMax: number;
  tapsRequired: number;
};

export type CatchAttemptRequest = { spawnId: string; tapTimesMs: number[] };
export type CatchAttemptResponse = {
  caught: boolean;
  species: Species;
  isFirstCatch: boolean;
  totalCatchesOfSpecies: number;
  personalDexPercent: number;
  communityDexPercent: number;
};

export type DexEntry = {
  species: Species;
  caughtCount: number; // by this user
  discoveredByCommunity: boolean;
  firstCaughtBy: string | null;
};
export type DexState = {
  entries: DexEntry[];
  personalPercent: number;
  communityPercent: number;
  streakDays: number;
  eggProgress: number; // 0..7 days
};

export type DesignSubmission = {
  id: string;
  name: string;
  artist: string;
  lore: string;
  imageUrl: string;
  votes: number;
};

export type DesignSubmissionRequest = {
  name: string;
  lore: string;
  imageUrl: string;
};
export type DesignVoteRequest = { id: string };
export type RemonstaErrorResponse = { status: 'error'; message: string };

// REST endpoints (Hono, JSON):
// GET  /api/wilds  -> WildsState
// GET  /api/catch-params?spawnId= -> CatchParams  (derived from spawn seed)
// POST /api/catch  -> body CatchAttemptRequest -> CatchAttemptResponse
// GET  /api/dex    -> DexState
// POST /api/design -> body {name, lore, imageUrl} -> DesignSubmission
// GET  /api/designs -> DesignSubmission[] (current week, sorted by votes)
// POST /api/design-vote -> body {id} -> {votes: number}
