import { z } from "zod";
import { AiError, getPlanner } from "@/lib/ai/planner";
import { createTtlCache } from "@/lib/api/cache";
import { errorResponse, json } from "@/lib/api/http";
import { guardedRoute } from "@/lib/api/route";
import { buildPlan, fallbackDraft } from "@/lib/domain/plan";
import { BriefSchema, type Brief, type PlanDraft } from "@/lib/domain/schema";
import { trustedToday } from "@/lib/domain/timeline";

export const maxDuration = 60;

const Body = z.object({ brief: BriefSchema, today: z.iso.date().optional() });

interface Drafted {
  draft: PlanDraft;
  source: "gemini" | "mock" | "template";
  /** Set when the plan is a starter template, saying why. */
  notice?: string;
}
const drafts = createTtlCache<Drafted>({ ttlMs: 30 * 60_000, max: 200 });

const starter = (brief: Brief, why: string): Drafted => ({
  draft: fallbackDraft(brief),
  source: "template",
  notice: why,
});

/** Gemini's draft (cached), or a starter template when AI is off or fails. */
async function draftFor(brief: Brief, today: string): Promise<Drafted> {
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

/** Drafts a full plan with Gemini; falls back to a starter template so planning never dead-ends. */
export const POST = guardedRoute({ schema: Body, limit: 8 }, async (body) => {
  const { brief } = body;
  const today = trustedToday(body.today);
  const { draft, source, notice } = await draftFor(brief, today);
  try {
    const plan = buildPlan(brief, draft, { id: crypto.randomUUID(), today, now: new Date() });
    return json({ plan, source, notice });
  } catch {
    return errorResponse(
      422,
      "This plan couldn't be built. Check the budget and date, then try again.",
    );
  }
});
