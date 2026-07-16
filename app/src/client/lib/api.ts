// Thin, typed fetch wrapper around the Scribbits Arena REST contract
// (src/shared/arena.ts). Every call is wrapped so callers get a typed ApiResult
// and never an unhandled rejection. UI-facing error messaging (error panel +
// retry) is the caller's job.

import type {
  AcknowledgeMaturityRequest,
  AcknowledgeMaturityResponse,
  ArenaErrorCode,
  ArenaErrorResponse,
  ArenaState,
  BackRequest,
  BattleReport,
  BossChallengeRequest,
  CapsulePullResponse,
  CapsulePullRequest,
  CloutBoard,
  DirectBattleResponse,
  DailyLoginClaimResponse,
  Inventory,
  EquipTitleRequest,
  FreeDrawing,
  LegacyCardsState,
  LegendsState,
  MarkLegacySeenRequest,
  MergeGearRequest,
  MergeGearResponse,
  PracticeBattleRequest,
  PracticeBattleReport,
  ReportScribbitResponse,
  RetireScribbitRequest,
  RetireScribbitResponse,
  RivalRunState,
  SeasonBoard,
  SeasonPublicState,
  Scribbit,
  ScoutNotebookState,
  SparRivalSlate,
  SparBattleResponse,
  SparRequest,
  SubmitScribbitRequest,
  SubmitScribbitResponse,
  SubmitFreeDrawingRequest,
  VenueBoard,
  ChoosePowerUpRequest,
  ChoosePowerUpResponse,
} from '../../shared/arena';
import { PLAYER_MUTATION_BUSY_MESSAGE } from '../../shared/arena';
import type { EquipmentCategory } from '../../shared/equipment';
import type {
  BattleClipUploadRequest,
  BattleClipUploadResponse,
} from '../../shared/battleshare';
import { DEFAULT_LOCALE } from '../locales/catalogs';
import { getBusyGetRetryDelay, waitForBusyGetRetryDelay } from './apiretry';
import { getLocale, translate } from './localization';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const DEFAULT_TIMEOUT_MS = 12000;
const ARENA_TIMEOUT_MS = 28_000;
// Submissions carry base and rendered PNG data URLs, so they get a longer leash.
const SUBMIT_TIMEOUT_MS = 20000;
const MEDIA_UPLOAD_TIMEOUT_MS = 35000;

async function getJson<T>(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ApiResult<T>> {
  return request<T>(url, { method: 'GET' }, timeoutMs);
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
  let busyRetryIndex = 0;
  try {
    while (true) {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(init.headers ?? {}) },
      });
      if (!response.ok) {
        const serverError = await readServerError(response);
        const retryDelay =
          init.method === 'GET' && serverError.code === 'busy'
            ? getBusyGetRetryDelay(busyRetryIndex)
            : undefined;
        if (retryDelay !== undefined) {
          busyRetryIndex += 1;
          await waitForBusyGetRetryDelay(retryDelay, controller.signal);
          continue;
        }
        return { ok: false, error: serverError.message };
      }
      const data = (await response.json()) as T;
      return { ok: true, data };
    }
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  } finally {
    clearTimeout(timer);
  }
}

const ERROR_MESSAGE_KEY_BY_CODE = {
  bad_request: 'error.badRequest',
  unauthorized: 'error.unauthorized',
  not_found: 'error.notFound',
  conflict: 'error.conflict',
  busy: 'error.busy',
  too_many_requests: 'error.tooManyRequests',
  payload_too_large: 'error.payloadTooLarge',
  payment_required: 'error.paymentRequired',
  server_error: 'error.serverError',
} as const satisfies Record<ArenaErrorCode, Parameters<typeof translate>[0]>;

type ServerErrorDetails = Readonly<{
  message: string;
  code?: ArenaErrorCode;
}>;

// New servers return a stable code for client-side localization. English keeps
// the detailed compatibility message; translated locales use the stable code.
async function readServerError(
  response: Response
): Promise<ServerErrorDetails> {
  try {
    const body = (await response.json()) as Partial<ArenaErrorResponse>;
    // During a staged deploy, a cached server may still label this one
    // transient lease response as a generic conflict. Preserve compatibility
    // without retrying any other conflict.
    const code =
      response.status === 409 &&
      body.code === 'conflict' &&
      body.message === PLAYER_MUTATION_BUSY_MESSAGE
        ? 'busy'
        : body.code;
    if (
      getLocale() !== DEFAULT_LOCALE &&
      code &&
      code in ERROR_MESSAGE_KEY_BY_CODE
    ) {
      return { message: translate(ERROR_MESSAGE_KEY_BY_CODE[code]), code };
    }
    if (typeof body.message === 'string' && body.message.length > 0) {
      return code && code in ERROR_MESSAGE_KEY_BY_CODE
        ? { message: body.message, code }
        : { message: body.message };
    }
    if (code && code in ERROR_MESSAGE_KEY_BY_CODE) {
      return { message: translate(ERROR_MESSAGE_KEY_BY_CODE[code]), code };
    }
  } catch {
    // fall through to the generic message
  }
  return {
    message: translate('error.requestFailed', { status: response.status }),
  };
}

function friendlyError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return translate('error.timeout');
  }
  return translate('error.connection');
}

// --- Contract endpoints -----------------------------------------------------

export function fetchArena(): Promise<ApiResult<ArenaState>> {
  return getJson<ArenaState>('/api/arena', ARENA_TIMEOUT_MS);
}

export function claimDailyLogin(): Promise<ApiResult<DailyLoginClaimResponse>> {
  return postJson<Record<string, never>, DailyLoginClaimResponse>(
    '/api/daily-login/claim',
    {}
  );
}

export function acknowledgeMaturity(
  scribbitId: string
): Promise<ApiResult<AcknowledgeMaturityResponse>> {
  return postJson<AcknowledgeMaturityRequest, AcknowledgeMaturityResponse>(
    '/api/maturity/acknowledge',
    { scribbitId }
  );
}

export function fetchSeason(): Promise<ApiResult<SeasonPublicState>> {
  return getJson<SeasonPublicState>('/api/season');
}

export function fetchSeasonBoard(): Promise<ApiResult<SeasonBoard>> {
  return getJson<SeasonBoard>('/api/season-board');
}

export function fetchVenueBoard(): Promise<ApiResult<VenueBoard>> {
  return getJson<VenueBoard>('/api/venue-board');
}

export function uploadBattleClip(
  request: BattleClipUploadRequest
): Promise<ApiResult<BattleClipUploadResponse>> {
  return postJson<BattleClipUploadRequest, BattleClipUploadResponse>(
    '/api/battle-clip',
    request,
    MEDIA_UPLOAD_TIMEOUT_MS
  );
}

export function submitScribbit(
  request: SubmitScribbitRequest
): Promise<ApiResult<SubmitScribbitResponse>> {
  return postJson<SubmitScribbitRequest, SubmitScribbitResponse>(
    '/api/scribbit',
    request,
    SUBMIT_TIMEOUT_MS
  );
}

export function submitFreeDrawing(
  request: SubmitFreeDrawingRequest
): Promise<ApiResult<FreeDrawing>> {
  return postJson<SubmitFreeDrawingRequest, FreeDrawing>(
    '/api/free-drawing',
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

// The server authors a stable daily rival slate for this living Scribbit. The
// client may choose only from that slate; it never chooses a result or seed.
export function fetchSparRivals(
  scribbitId: string
): Promise<ApiResult<SparRivalSlate>> {
  const query = new URLSearchParams({ scribbitId });
  return getJson<SparRivalSlate>(`/api/spar-rivals?${query.toString()}`);
}

// Exhibition spar vs a server-approved founding NPC. Birth uses no opponentId
// for one immediate random matchup; Arena rematches pass an explicit Rival Run.
export function spar(
  scribbitId: string,
  opponentId?: string,
  rivalRun?: RivalRunState,
  firstBattle = false
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
    ...(firstBattle ? { firstBattle: true } : {}),
  });
}

export function choosePowerUp(
  request: ChoosePowerUpRequest
): Promise<ApiResult<ChoosePowerUpResponse>> {
  return postJson<ChoosePowerUpRequest, ChoosePowerUpResponse>(
    '/api/power-up/choose',
    request
  );
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

export function retireScribbit(
  scribbitId: string
): Promise<ApiResult<RetireScribbitResponse>> {
  return postJson<RetireScribbitRequest, RetireScribbitResponse>(
    '/api/retire-scribbit',
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
