import { describe, expect, it } from "vitest";
import { weddingBrief } from "@/test/fixtures";
import { BriefSchema, PlanChangeSchema } from "./schema";

describe("BriefSchema", () => {
  it("accepts a complete brief and trims text", () => {
    const parsed = BriefSchema.parse({ ...weddingBrief, city: "  Hyderabad  " });
    expect(parsed.city).toBe("Hyderabad");
  });

  it.each([
    ["a blank name", { name: "   " }],
    ["a date that isn't ISO", { date: "14/02/2027" }],
    ["no guests", { guests: 0 }],
    ["more than 5,000 guests", { guests: 5001 }],
    ["a fractional budget", { budget: 1000.5 }],
    ["an unknown currency", { currency: "BTC" }],
    ["an unsupported language", { language: "fr" }],
    ["more than 12 traditions", { traditions: Array.from({ length: 13 }, (_, i) => `t${i}`) }],
  ])("rejects %s", (_label, override) => {
    expect(BriefSchema.safeParse({ ...weddingBrief, ...override }).success).toBe(false);
  });
});

describe("PlanChangeSchema", () => {
  it("accepts each known edit and rejects unknown ops or bad amounts", () => {
    expect(PlanChangeSchema.safeParse({ op: "logSpend", id: "venue", amount: 500 }).success).toBe(
      true,
    );
    expect(PlanChangeSchema.safeParse({ op: "deletePlan", id: "venue" }).success).toBe(false);
    expect(PlanChangeSchema.safeParse({ op: "logSpend", id: "venue", amount: -1 }).success).toBe(
      false,
    );
  });
});
