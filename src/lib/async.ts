export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Race a promise against a timeout (and optionally an AbortSignal).
 * Note: this cannot actually cancel the underlying promise; it only stops waiting.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  opts: { ms: number; message: string; signal?: AbortSignal }
): Promise<T> {
  const { ms, message, signal } = opts;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(message)), ms);

    if (signal) {
      onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
  }) as Promise<T>;
}

