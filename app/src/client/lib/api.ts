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
  CareResponse,
  CapsulePullRequest,
  CloutBoard,
  DirectBattleResponse,
  Inventory,
  EquipTitleRequest,
  LegacyCardsState,
  LegendsState,
  MarkLegacySeenRequest,
  MergeGearRequest,
  MergeGearResponse,
  PracticeBattleRequest,
  PracticeBattleReport,
  ReportScribbitResponse,
  RivalRunState,
  Scribbit,
  ScoutNotebookState,
  SparRivalSlate,
  SparBattleResponse,
  SparRequest,
  SubmitScribbitRequest,
} from '../../shared/arena';
import type { EquipmentCategory } from '../../shared/equipment';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const DEFAULT_TIMEOUT_MS = 12000;
// Submissions carry base and rendered PNG data URLs, so they get a longer leash.
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

// Reward-free shape practice. The server decodes and re-analyzes the PNG,
// authors the opponent, and returns an ephemeral replay without saving it.
export function practiceBattle(
  request: PracticeBattleRequest
): Promise<ApiResult<PracticeBattleReport>> {
  return postJson<PracticeBattleRequest, PracticeBattleReport>(
    '/api/practice-battle',
    request,
    SUBMIT_TIMEOUT_MS
  );
}

export function fetchMyBattles(): Promise<ApiResult<BattleReport[]>> {
  return getJson<BattleReport[]>('/api/my-battles');
}

export function fetchScoutNotebook(): Promise<ApiResult<ScoutNotebookState>> {
  return getJson<ScoutNotebookState>('/api/scout-notebook');
}

export function fetchRumbleReplay(
  resolvedDay: number
): Promise<ApiResult<BattleReport>> {
  const query = new URLSearchParams({ day: String(resolvedDay) });
  return getJson<BattleReport>(`/api/rumble-replay?${query.toString()}`);
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
): Promise<ApiResult<DirectBattleResponse>> {
  return postJson<BossChallengeRequest, DirectBattleResponse>(
    '/api/boss-challenge',
    { scribbitId }
  );
}

export function fetchLegends(
  cursor?: string | null,
  limit?: number
): Promise<ApiResult<LegendsState>> {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', cursor);
  if (limit !== undefined) query.set('limit', String(limit));
  const queryString = query.toString();
  return getJson<LegendsState>(
    `/api/legends${queryString ? `?${queryString}` : ''}`
  );
}

// Tamagotchi care: feed/pat/train a scribbit once each per UTC day. Returns the
// updated Scribbit plus the exact committed Ink award. 409 when already done.
export function careForScribbit(
  scribbitId: string,
  action: CareAction
): Promise<ApiResult<CareResponse>> {
  return postJson<CareRequest, CareResponse>('/api/care', {
    scribbitId,
    action,
  });
}

// The server authors a stable daily rival slate for this living Scribbit. The
// client may choose only from that slate; it never chooses a result or seed.
export function fetchSparRivals(
  scribbitId: string
): Promise<ApiResult<SparRivalSlate>> {
  const query = new URLSearchParams({ scribbitId });
  return getJson<SparRivalSlate>(`/api/spar-rivals?${query.toString()}`);
}

// Exhibition spar vs a server-approved founding NPC. Player-facing scenes pass
// an explicit Rival Run choice; omitted opponentId is compatibility-only.
export function spar(
  scribbitId: string,
  opponentId?: string,
  rivalRun?: RivalRunState
): Promise<ApiResult<SparBattleResponse>> {
  return postJson<SparRequest, SparBattleResponse>('/api/spar', {
    scribbitId,
    ...(opponentId ? { opponentId } : {}),
    ...(rivalRun
      ? {
          rivalRun: {
            id: rivalRun.id,
            expectedBoutsCompleted: rivalRun.boutsCompleted,
          },
        }
      : {}),
  });
}

// Pick one of tonight's Rumble entrants. One per user per day, final; it
// locks when the Rumble resolves. The legacy transport returns the picked id.
export function backScribbit(
  scribbitId: string
): Promise<ApiResult<{ backed: string }>> {
  return postJson<BackRequest, { backed: string }>('/api/back', { scribbitId });
}

export function removeScribbit(
  scribbitId: string
): Promise<ApiResult<{ removed: string }>> {
  return postJson<{ scribbitId: string }, { removed: string }>(
    '/api/remove-scribbit',
    { scribbitId }
  );
}

export function reportScribbit(
  scribbitId: string
): Promise<ApiResult<ReportScribbitResponse>> {
  return postJson<{ scribbitId: string }, ReportScribbitResponse>(
    '/api/report-scribbit',
    { scribbitId }
  );
}

export function deleteMyData(): Promise<
  ApiResult<{ deleted: true; removedScribbits: number }>
> {
  return postJson<
    Record<string, never>,
    { deleted: true; removedScribbits: number }
  >('/api/delete-my-data', {});
}

// The talent-scout leaderboard: top 20 by lifetime clout plus the caller's rank.
export function fetchCloutBoard(): Promise<ApiResult<CloutBoard>> {
  return getJson<CloutBoard>('/api/clout-board');
}

// Mystery Ink gacha: spend ink to pull an accessory, pen, or title. The server
// does the seeded random + pity, then returns the final ink/inventory snapshot.
export function pullCapsule(
  operationId: string
): Promise<ApiResult<CapsulePullResponse>> {
  return postJson<CapsulePullRequest, CapsulePullResponse>('/api/capsule', {
    operationId,
  });
}

// The caller's unlocked pens + titles (drives the palette + locked slots).
export function fetchInventory(): Promise<ApiResult<Inventory>> {
  return getJson<Inventory>('/api/inventory');
}

export function mergeGear(
  gearId: string,
  operationId: string
): Promise<ApiResult<MergeGearResponse>> {
  return postJson<MergeGearRequest, MergeGearResponse>('/api/merge-gear', {
    gearId,
    operationId,
  });
}

export function equipGear(
  scribbitId: string,
  category: EquipmentCategory,
  slotIndex: 0 | 1,
  gearId: string | null
): Promise<ApiResult<Scribbit>> {
  return postJson<
    {
      scribbitId: string;
      category: EquipmentCategory;
      slotIndex: 0 | 1;
      gearId: string | null;
    },
    Scribbit
  >('/api/equip-gear', { scribbitId, category, slotIndex, gearId });
}

// The caller's immutable personal archive. Cursor paging stays separate from
// the public Legends feed so a large Legacy Book never inflates gallery reads.
export function fetchLegacyCards(
  cursor?: string | null,
  limit?: number
): Promise<ApiResult<LegacyCardsState>> {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', cursor);
  if (limit !== undefined) query.set('limit', String(limit));
  const queryString = query.toString();
  return getJson<LegacyCardsState>(
    `/api/legacy-cards${queryString ? `?${queryString}` : ''}`
  );
}

export function equipTitle(
  titleId: string | null
): Promise<ApiResult<Inventory>> {
  return postJson<EquipTitleRequest, Inventory>('/api/equip-title', {
    titleId,
  });
}

export function markLegacyCardsSeen(
  throughArchivedDay: number
): Promise<ApiResult<{ seenThroughDay: number }>> {
  return postJson<MarkLegacySeenRequest, { seenThroughDay: number }>(
    '/api/legacy-cards/seen',
    { throughArchivedDay }
  );
}
