import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit, then blocks with a retry-after", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => now });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(true);
    now = 15_000;
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterSeconds: 45 });
  });

  it("opens again once the window has passed", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });
    limiter.check("a");
    now = 1000;
    expect(limiter.check("a").ok).toBe(true);
  });

  it("tracks each client separately", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("b").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });
});

describe("clientKey", () => {
  it("uses the first address in x-forwarded-for", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(req)).toBe("203.0.113.7");
  });

  it("falls back to a shared bucket when no address is present", () => {
    expect(clientKey(new Request("http://x"))).toBe("anonymous");
  });
});
