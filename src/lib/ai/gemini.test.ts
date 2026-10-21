import { describe, expect, it } from "vitest";
import { attemptTimeout } from "./gemini";

describe("attemptTimeout", () => {
  it("gives a model with a fallback behind it enough time to draft a full plan", () => {
    // A full wedding plan takes Gemini 3.5 Flash about 15 s.
    expect(attemptTimeout({ remaining: 50_000, isLast: false })).toBe(25_000);
  });

  it("gives the last model all the time that is left", () => {
    expect(attemptTimeout({ remaining: 38_000, isLast: true })).toBe(38_000);
  });

  it("never exceeds what is left of the budget", () => {
    expect(attemptTimeout({ remaining: 7_000, isLast: false })).toBe(7_000);
  });
});
