import type { FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import { LooseObject, PlanChangeSchema, type PlanChange } from "@/lib/domain/schema";

const DESCRIPTIONS: Record<PlanChange["op"], string> = {
  moveBudget: "Move money from one budget category to another. The total budget stays the same.",
  logSpend: "Record money already spent against a budget category.",
  addMilestone: "Add a task to the timeline with a due date on or before the event.",
  toggleMilestone: "Mark a timeline task as done, or as not done if it already is.",
  addVendor: "Add a vendor category to the checklist, with questions to ask them.",
  setVendorStatus:
    "Update a vendor's booking status (todo, contacted, booked) and optionally its quote.",
  addIdea: "Add a personalized idea (theme, decor, menu, activity or gift) to the plan.",
};

/** JSON Schema for Gemini: drop keys its schema subset rejects; zod re-validates the output. */
const UNSUPPORTED = new Set(["$schema", "pattern", "minItems", "maxItems", "additionalProperties"]);

export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const cleaned: unknown = JSON.parse(
    JSON.stringify(z.toJSONSchema(schema)),
    (key: string, value: unknown) => (UNSUPPORTED.has(key) ? undefined : value),
  );
  return LooseObject.parse(cleaned);
}

export const planTools: FunctionDeclaration[] = PlanChangeSchema.options.map((option) => {
  const name = option.shape.op.value;
  return {
    name,
    description: DESCRIPTIONS[name],
    parametersJsonSchema: toGeminiSchema(z.object(option.shape).omit({ op: true })),
  };
});

/** Validates the model's function calls; anything unknown or malformed is dropped. */
export function toChanges(
  calls: { name?: string; args?: Record<string, unknown> }[],
): PlanChange[] {
  return calls.flatMap((call) => {
    const parsed = PlanChangeSchema.safeParse({ ...call.args, op: call.name });
    return parsed.success ? [parsed.data] : [];
  });
}
