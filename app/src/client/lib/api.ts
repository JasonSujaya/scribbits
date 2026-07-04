// Thin, typed fetch wrapper around the Scribbits REST contract.
// Every call is wrapped so callers get a typed result and never an unhandled
// rejection. UI-facing error messaging (toast + retry) is the caller's job.

import type {
  CatchAttemptRequest,
  CatchAttemptResponse,
  CatchParams,
  DexState,
  WildsState,
} from '../../shared/remonsta';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const DEFAULT_TIMEOUT_MS = 10000;

async function getJson<T>(url: string): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
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

async function postJson<TBody, TResponse>(
  url: string,
  body: TBody
): Promise<ApiResult<TResponse>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { ok: false, error: await serverErrorMessage(response) };
    }
    const data = (await response.json()) as TResponse;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  } finally {
    clearTimeout(timer);
  }
}

function friendlyError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The Wilds are slow to respond. Try again.';
  }
  return 'Could not reach the Wilds. Check your connection.';
}

export function fetchWilds(): Promise<ApiResult<WildsState>> {
  return getJson<WildsState>('/api/wilds');
}

export function fetchCatchParams(
  spawnId: string
): Promise<ApiResult<CatchParams>> {
  return getJson<CatchParams>(
    `/api/catch-params?spawnId=${encodeURIComponent(spawnId)}`
  );
}

export function submitCatch(
  request: CatchAttemptRequest
): Promise<ApiResult<CatchAttemptResponse>> {
  return postJson<CatchAttemptRequest, CatchAttemptResponse>(
    '/api/catch',
    request
  );
}

export function fetchDex(): Promise<ApiResult<DexState>> {
  return getJson<DexState>('/api/dex');
}
