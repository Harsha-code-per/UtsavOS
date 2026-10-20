interface Options {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Fixed-window limiter keyed by client.
 * Limitation: in-memory, so each serverless instance counts separately; move to a shared store
 * (e.g. Upstash Redis) if abuse ever gets past per-instance limits.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: Options) {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      if (windows.size > 10_000) {
        for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k);
      }

      const current = windows.get(key);
      if (!current || t - current.start >= windowMs) {
        windows.set(key, { start: t, count: 1 });
        return { ok: true };
      }
      if (current.count < limit) {
        current.count += 1;
        return { ok: true };
      }
      return { ok: false, retryAfterSeconds: Math.ceil((current.start + windowMs - t) / 1000) };
    },
  };
}

/** Vercel puts the real client address first in x-forwarded-for. */
export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}
