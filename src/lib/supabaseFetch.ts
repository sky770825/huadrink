/**
 * 自訂 fetch：為 Supabase 請求加上逾時，避免網路不穩時長時間卡住
 * 逾時後會拋出 DOMException (AbortError)，由 React Query retry 處理
 */
const REQUEST_TIMEOUT_MS = 15_000;

export function createFetchWithTimeout(timeoutMs = REQUEST_TIMEOUT_MS): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };
}
