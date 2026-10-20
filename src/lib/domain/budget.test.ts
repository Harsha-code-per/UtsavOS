import { describe, expect, it } from "vitest";
import { allocateBudget, moveBudget, summarizeBudget } from "./budget";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("allocateBudget", () => {
  it("splits the total by percent into whole currency units", () => {
    const lines = allocateBudget(1000, [
      { category: "Venue", percent: 60 },
      { category: "Catering", percent: 40 },
    ]);
    expect(lines.map((l) => [l.category, l.allocated, l.spent])).toEqual([
      ["Venue", 600, 0],
      ["Catering", 400, 0],
    ]);
  });

  it("always sums exactly to the total, even when rounding is uneven", () => {
    const lines = allocateBudget(100, [
      { category: "A", percent: 33.3 },
      { category: "B", percent: 33.3 },
      { category: "C", percent: 33.4 },
    ]);
    expect(sum(lines.map((l) => l.allocated))).toBe(100);
    expect(lines.every((l) => Number.isInteger(l.allocated))).toBe(true);
  });

  it("normalizes percents that do not add up to 100 (model output is not trusted)", () => {
    const lines = allocateBudget(2_500_000, [
      { category: "Venue", percent: 30 },
      { category: "Catering", percent: 30 },
      { category: "Decor", percent: 15 },
    ]);
    expect(sum(lines.map((l) => l.allocated))).toBe(2_500_000);
    expect(lines[0]!.allocated).toBe(1_000_000);
  });

  it("merges duplicate categories and gives each line a stable unique id", () => {
    const lines = allocateBudget(1000, [
      { category: "Decor", percent: 10 },
      { category: "decor ", percent: 10 },
      { category: "Food & Drinks", percent: 80 },
    ]);
    expect(lines.map((l) => l.id)).toEqual(["decor", "food-drinks"]);
    expect(lines[0]!.allocated).toBe(200);
  });

  it("rejects an empty split or a non-positive total", () => {
    expect(() => allocateBudget(1000, [])).toThrow(/at least one/i);
    expect(() => allocateBudget(0, [{ category: "A", percent: 100 }])).toThrow(/positive/i);
  });
});

describe("summarizeBudget", () => {
  it("totals allocations and spends and lists overruns", () => {
    const summary = summarizeBudget([
      { id: "venue", category: "Venue", allocated: 700, spent: 650 },
      { id: "decor", category: "Decor", allocated: 300, spent: 340 },
    ]);
    expect(summary).toEqual({
      allocated: 1000,
      spent: 990,
      remaining: 10,
      overruns: [{ id: "decor", category: "Decor", over: 40 }],
    });
  });
});

describe("moveBudget", () => {
  const lines = [
    { id: "ent", category: "Entertainment", allocated: 125, spent: 0 },
    { id: "decor", category: "Decor", allocated: 300, spent: 340 },
  ];

  it("moves money between categories and keeps the total unchanged", () => {
    const next = moveBudget(lines, { from: "ent", to: "decor", amount: 25 });
    expect(next.find((l) => l.id === "ent")!.allocated).toBe(100);
    expect(next.find((l) => l.id === "decor")!.allocated).toBe(325);
    expect(sum(next.map((l) => l.allocated))).toBe(425);
  });

  it("does not mutate the input", () => {
    moveBudget(lines, { from: "ent", to: "decor", amount: 25 });
    expect(lines[0]!.allocated).toBe(125);
  });

  it("refuses moves that are impossible", () => {
    expect(() => moveBudget(lines, { from: "ent", to: "decor", amount: 500 })).toThrow(/only/i);
    expect(() => moveBudget(lines, { from: "ent", to: "decor", amount: 0 })).toThrow(/positive/i);
    expect(() => moveBudget(lines, { from: "ent", to: "ent", amount: 5 })).toThrow(/different/i);
    expect(() => moveBudget(lines, { from: "nope", to: "decor", amount: 5 })).toThrow(/unknown/i);
  });
});
