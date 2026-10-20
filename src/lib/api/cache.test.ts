import { describe, expect, it } from "vitest";
import { createTtlCache } from "./cache";

describe("createTtlCache", () => {
  it("returns a stored value until it expires", () => {
    let now = 0;
    const cache = createTtlCache<string>({ ttlMs: 1000, max: 10, now: () => now });
    cache.set("k", "v");
    now = 999;
    expect(cache.get("k")).toBe("v");
    now = 1000;
    expect(cache.get("k")).toBeUndefined();
  });

  it("evicts the oldest entry when full", () => {
    const cache = createTtlCache<number>({ ttlMs: 1000, max: 2, now: () => 0 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });
});
