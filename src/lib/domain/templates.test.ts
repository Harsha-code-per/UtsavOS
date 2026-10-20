import { describe, expect, it } from "vitest";
import { weddingBrief } from "@/test/fixtures";
import { EVENT_TYPES, PlanDraftSchema } from "./schema";
import { fallbackDraft } from "./templates";

describe("fallbackDraft", () => {
  it.each(EVENT_TYPES)("gives a %s a valid starter plan whose budget adds up to 100%%", (type) => {
    const draft = fallbackDraft({ ...weddingBrief, type, traditions: [] });
    expect(PlanDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.budget.reduce((sum, line) => sum + line.percent, 0)).toBe(100);
    expect(draft.vendors.length).toBeGreaterThan(0);
    expect(draft.ideas.length).toBeGreaterThan(0);
  });

  it("adds a planning task for each chosen tradition", () => {
    const draft = fallbackDraft({ ...weddingBrief, traditions: ["Haldi", "Sangeet"] });
    expect(draft.milestones).toEqual(
      expect.arrayContaining([
        { title: "Plan the Haldi", daysBefore: 30 },
        { title: "Plan the Sangeet", daysBefore: 30 },
      ]),
    );
  });
});
