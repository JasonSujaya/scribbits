// Thin, typed fetch wrapper around the Scribbits Arena REST contract
// (src/shared/arena.ts). Every call is wrapped so callers get a typed ApiResult
// and never an unhandled rejection. UI-facing error messaging (error panel +
// retry) is the caller's job.

import type {
  ArenaState,
  BackRequest,
  BattleReport,
  BossChallengeRequest,
  CapsulePullResponse,
  CareAction,
  CareRequest,
  CloutBoard,
  EnterRumbleRequest,
  Inventory,
  LegendsState,
  Scribbit,
  SparRequest,
  SubmitScribbitRequest,
} from '../../shared/arena';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const DEFAULT_TIMEOUT_MS = 12000;
// Submissions carry a PNG data URL, so they get a longer leash.
const SUBMIT_TIMEOUT_MS = 20000;

async function getJson<T>(url: string): Promise<ApiResult<T>> {
  return request<T>(url, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
}

async function postJson<TBody, TResponse>(
  url: string,
  body: TBody,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ApiResult<TResponse>> {
  return request<TResponse>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    timeoutMs
  );
}

async function request<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
    });
    if (!response.ok) {
      return { ok: false, error: await serverErrorMessage(response) };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  } finally {
    clearTimeout(timer);
  }
}

// Server routes return { status: 'error', message } with friendly copy —
// surface that message instead of a bare status code when present.
async function serverErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message;
    }
  } catch {
    // fall through to the generic message
  }
  return `Request failed (${response.status})`;
}

function friendlyError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The arena is slow to respond. Try again.';
  }
  return 'Could not reach the arena. Check your connection.';
}

// --- Contract endpoints -----------------------------------------------------

export function fetchArena(): Promise<ApiResult<ArenaState>> {
  return getJson<ArenaState>('/api/arena');
}

export function submitScribbit(
  request: SubmitScribbitRequest
): Promise<ApiResult<Scribbit>> {
  return postJson<SubmitScribbitRequest, Scribbit>(
    '/api/scribbit',
    request,
    SUBMIT_TIMEOUT_MS
  );
}

export function enterRumble(
  scribbitId: string
): Promise<ApiResult<{ entered: true }>> {
  return postJson<EnterRumbleRequest, { entered: true }>('/api/enter-rumble', {
    scribbitId,
  });
}

export function fetchMyBattles(): Promise<ApiResult<BattleReport[]>> {
  return getJson<BattleReport[]>('/api/my-battles');
}

export function believe(
  scribbitId: string
): Promise<ApiResult<{ belief: number }>> {
  return postJson<{ scribbitId: string }, { belief: number }>('/api/believe', {
    scribbitId,
  });
}

export function bossChallenge(
  scribbitId: string
): Promise<ApiResult<BattleReport>> {
  return postJson<BossChallengeRequest, BattleReport>('/api/boss-challenge', {
    scribbitId,
  });
}

export function fetchLegends(): Promise<ApiResult<LegendsState>> {
  return getJson<LegendsState>('/api/legends');
}

// Tamagotchi care: feed/pat/train a scribbit once each per UTC day. Returns the
// updated scribbit (new xp/level/mood). 409 when that action is already done.
export function careForScribbit(
  scribbitId: string,
  action: CareAction
): Promise<ApiResult<Scribbit>> {
  return postJson<CareRequest, Scribbit>('/api/care', { scribbitId, action });
}

// Exhibition spar vs a random founding NPC. Unlimited; xp only on first daily win.
export function spar(scribbitId: string): Promise<ApiResult<BattleReport>> {
  return postJson<SparRequest, BattleReport>('/api/spar', { scribbitId });
}

// Back one of tonight's rumble entrants (a bet). One per user per day, final; it
// locks when the rumble resolves. Returns the id you backed for confirmation.
export function backScribbit(
  scribbitId: string
): Promise<ApiResult<{ backed: string }>> {
  return postJson<BackRequest, { backed: string }>('/api/back', { scribbitId });
}

// The talent-scout leaderboard: top 20 by lifetime clout plus the caller's rank.
export function fetchCloutBoard(): Promise<ApiResult<CloutBoard>> {
  return getJson<CloutBoard>('/api/clout-board');
}

// Mystery Ink gacha: spend ink to pull an accessory, pen, or title. The server
// does the seeded random + pity, then returns the final ink/inventory snapshot.
export function pullCapsule(): Promise<ApiResult<CapsulePullResponse>> {
  return postJson<Record<string, never>, CapsulePullResponse>('/api/capsule', {});
}

// The caller's unlocked pens + titles (drives the palette + locked slots).
export function fetchInventory(): Promise<ApiResult<Inventory>> {
  return getJson<Inventory>('/api/inventory');
}
