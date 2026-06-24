/**
 * fetch() wrapper with configurable timeout via AbortController.
 * Prevents indefinite hangs on network issues or unresponsive servers.
 *
 * Usage:
 *   const res = await fetchWithTimeout(url, { method: "POST", ... }, 10_000);
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal
        ? AbortSignal.any([init.signal, controller.signal])
        : controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
