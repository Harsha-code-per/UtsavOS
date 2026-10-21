import { getPlanner } from "@/lib/ai/planner";
import { AiError } from "@/lib/ai/types";
import type { Brief, PlanDraft } from "@/lib/domain/schema";
import { fallbackDraft } from "@/lib/domain/templates";
import { createTtlCache } from "./cache";

export interface Drafted {
  draft: PlanDraft;
  source: "gemini" | "offline" | "template";
  /** Set when the plan is a starter template, saying why. */
  notice?: string;
}

const drafts = createTtlCache<Drafted>({ ttlMs: 30 * 60_000, max: 200 });

const starter = (brief: Brief, why: string): Drafted => ({
  draft: fallbackDraft(brief),
  source: "template",
  notice: why,
});

/** Gemini's draft (cached for identical briefs), or a starter template when AI is off or fails. */
export async function draftOrStarter(brief: Brief, today: string): Promise<Drafted> {
  const key = `${today}|${JSON.stringify(brief)}`;
  const cached = drafts.get(key);
  if (cached) return cached;

  const planner = getPlanner();
  if (!planner) return starter(brief, "AI drafting isn't configured, so this is a starter plan.");
  try {
    const drafted = { draft: await planner.draftPlan(brief, today), source: planner.source };
    drafts.set(key, drafted);
    return drafted;
  } catch (error) {
    if (!(error instanceof AiError)) throw error;
    return starter(brief, `${error.message} Here's a starter plan in the meantime.`);
  }
}
