// The Walrus Memory relayer limits each key to 180 weighted requests a minute and answers 429 with retry_after_seconds.
// A limit is a pause, not a failure: wait the stated time (capped) and try again. Anything else is rethrown at once.
export const isRateLimit = (e: unknown) => /\b429\b|rate limit/i.test(String((e as Error)?.message ?? e));
export const retryAfterMs = (e: unknown, capMs = 45_000) => {
  const m = String((e as Error)?.message ?? e).match(/retry_after_seconds\\?"?\s*:\s*\\?"?(\d+)/);
  return Math.min(capMs, (m ? Number(m[1]) : 20) * 1000 + 500);
};
export async function withRateLimitRetry<T>(fn: () => Promise<T>, o: { attempts?: number; capMs?: number; deadline?: number; sleep?: (ms: number) => Promise<void> } = {}): Promise<T> {
  const attempts = o.attempts ?? 3; const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (!isRateLimit(e) || i >= attempts - 1) throw e;
      const wait = retryAfterMs(e, o.capMs);
      if (o.deadline && Date.now() + wait > o.deadline) throw e; // out of time budget: the caller defers to the next tick
      await sleep(wait);
    }
  }
}
