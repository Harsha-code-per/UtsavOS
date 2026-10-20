import { describe, expect, it } from "vitest";
import { putDescription, takeDescription } from "./handoff";

describe("description hand-off", () => {
  it("passes the text once, then forgets it", () => {
    putDescription("A Diwali party for 20");
    expect(takeDescription()).toBe("A Diwali party for 20");
    expect(takeDescription()).toBe("");
  });
});
