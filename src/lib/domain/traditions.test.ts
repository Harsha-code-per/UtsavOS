import { describe, expect, it } from "vitest";
import { EVENT_TYPES } from "./schema";
import { TRADITIONS } from "./traditions";

describe("TRADITIONS", () => {
  it.each(EVENT_TYPES)("suggests distinct, brief-sized traditions for a %s", (type) => {
    const list = TRADITIONS[type];
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(new Set(list).size).toBe(list.length);
    expect(list.every((t) => t.trim() === t && t.length > 0 && t.length <= 40)).toBe(true);
  });
});
