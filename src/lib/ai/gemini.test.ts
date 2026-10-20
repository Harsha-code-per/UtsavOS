import { describe, expect, it } from "vitest";
import { attemptTimeout } from "./gemini";

describe("attemptTimeout", () => {
  it("keeps a short leash on models that have a fallback after them", () => {
    expect(attemptTimeout({ remaining: 50_000, isLast: false })).toBe(12_000);
  });

  it("gives the last model all the time that is left", () => {
    expect(attemptTimeout({ remaining: 38_000, isLast: true })).toBe(38_000);
  });

  it("never exceeds what is left of the budget", () => {
    expect(attemptTimeout({ remaining: 7_000, isLast: false })).toBe(7_000);
  });
});
