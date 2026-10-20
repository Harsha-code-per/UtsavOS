interface Options {
  ttlMs: number;
  max: number;
  now?: () => number;
}

/**
 * Small in-memory TTL cache so repeated identical AI requests don't spend Gemini quota.
 * Limitation: one cache per serverless instance; move to a shared store (e.g. Upstash) if hit
 * rates ever matter.
 */
export function createTtlCache<V>({ ttlMs, max, now = Date.now }: Options) {
  const entries = new Map<string, { value: V; expires: number }>();

  return {
    get(key: string): V | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (now() >= entry.expires) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: V): void {
      entries.delete(key);
      entries.set(key, { value, expires: now() + ttlMs });
      const oldest = entries.keys().next();
      if (entries.size > max && !oldest.done) entries.delete(oldest.value);
    },
  };
}
