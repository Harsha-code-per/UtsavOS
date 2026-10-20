import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and joins words with single hyphens", () => {
    expect(slugify("  Food & Drinks ")).toBe("food-drinks");
  });

  it("keeps non-Latin letters so Hindi categories still get ids", () => {
    expect(slugify("सजावट और फूल")).toBe("सजावट-और-फूल");
  });

  it("returns an empty id for punctuation only and caps long ids at 60 characters", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("a".repeat(80))).toHaveLength(60);
  });
});
