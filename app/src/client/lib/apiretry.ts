const BUSY_GET_RETRY_DELAYS_MILLISECONDS = [
  100, 250, 500, 1_000, 2_000,
] as const;

export function getBusyGetRetryDelay(retryIndex: number): number | undefined {
  if (!Number.isSafeInteger(retryIndex) || retryIndex < 0) return undefined;
  return (
    BUSY_GET_RETRY_DELAYS_MILLISECONDS[
      Math.min(retryIndex, BUSY_GET_RETRY_DELAYS_MILLISECONDS.length - 1)
    ] ?? 2_000
  );
}

export function waitForBusyGetRetryDelay(
  delayMilliseconds: number,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Request timed out.', 'AbortError'));
  }

  return new Promise((resolve, reject) => {
    const handleAbort = (): void => {
      clearTimeout(timer);
      reject(new DOMException('Request timed out.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMilliseconds);
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}
