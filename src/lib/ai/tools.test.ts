import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PlanChangeSchema } from "@/lib/domain/schema";
import { planTools, toChanges, toGeminiSchema } from "./tools";

describe("planTools", () => {
  it("declares one Gemini function per plan change, with a description and JSON schema", () => {
    const names = planTools.map((t) => t.name);
    expect(names).toEqual(PlanChangeSchema.options.map((o) => o.shape.op.value));
    for (const tool of planTools) {
      expect(tool.description!.length).toBeGreaterThan(10);
      expect(tool.parametersJsonSchema).toMatchObject({ type: "object" });
      expect(JSON.stringify(tool.parametersJsonSchema)).not.toContain("$schema");
      expect(JSON.stringify(tool.parametersJsonSchema)).not.toContain('"op"');
    }
  });
});

describe("toChanges", () => {
  it("turns valid function calls into typed plan changes", () => {
    const changes = toChanges([
      { name: "moveBudget", args: { from: "entertainment", to: "decor", amount: 25000 } },
    ]);
    expect(changes).toEqual([
      { op: "moveBudget", from: "entertainment", to: "decor", amount: 25000 },
    ]);
  });

  it("drops unknown functions and invalid arguments rather than trusting the model", () => {
    const changes = toChanges([
      { name: "deletePlan", args: {} },
      { name: "moveBudget", args: { from: "a", to: "b", amount: -5 } },
      { name: "toggleMilestone", args: { id: "book-venue" } },
      { args: { id: "x" } },
    ]);
    expect(changes).toEqual([{ op: "toggleMilestone", id: "book-venue" }]);
  });
});

describe("toGeminiSchema", () => {
  it("drops keywords Gemini's response schema rejects (zod still enforces them afterwards)", () => {
    const schema = JSON.stringify(
      toGeminiSchema(z.object({ list: z.array(z.string().regex(/a/)).min(1).max(3) })),
    );
    for (const key of ["$schema", "pattern", "minItems", "maxItems", "additionalProperties"]) {
      expect(schema).not.toContain(key);
    }
  });
});
