import { z } from "zod";
import { AiError, getPlanner } from "@/lib/ai/planner";
import { createTtlCache } from "@/lib/api/cache";
import { errorResponse, json, rateLimited, readJson } from "@/lib/api/http";
import { buildPlan, fallbackDraft } from "@/lib/domain/plan";
import { BriefSchema, type PlanDraft } from "@/lib/domain/schema";
import { trustedToday } from "@/lib/domain/timeline";
import { clientKey, createRateLimiter } from "@/lib/security/rate-limit";

export const maxDuration = 60;

const Body = z.object({ brief: BriefSchema, today: z.iso.date().optional() });
const limiter = createRateLimiter({ limit: 8, windowMs: 60_000 });
const drafts = createTtlCache<{ draft: PlanDraft; source: "gemini" | "mock" }>({
  ttlMs: 30 * 60_000,
  max: 200,
});

/** Drafts a full plan with Gemini; falls back to a starter template so planning never dead-ends. */
export async function POST(request: Request) {
  const limit = limiter.check(clientKey(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const body = await readJson(request, Body);
  if (!body.ok) return body.response;
  const { brief } = body.data;
  const today = trustedToday(body.data.today);

  const planner = getPlanner();
  let draft = fallbackDraft(brief);
  let source: "gemini" | "mock" | "template" = "template";
  let notice: string | undefined = "AI drafting isn't configured, so this is a starter plan.";

  const cacheKey = `${today}|${JSON.stringify(brief)}`;
  const cached = drafts.get(cacheKey);

  if (cached) {
    ({ draft, source } = cached);
    notice = undefined;
  } else if (planner) {
    try {
      draft = await planner.draftPlan(brief, today);
      source = planner.source;
      notice = undefined;
      drafts.set(cacheKey, { draft, source: planner.source });
    } catch (error) {
      if (!(error instanceof AiError)) throw error;
      notice = `${error.message} Here's a starter plan in the meantime.`;
    }
  }

  try {
    const plan = buildPlan(brief, draft, { id: crypto.randomUUID(), today, now: new Date() });
    return json({ plan, source, notice });
  } catch {
    return errorResponse(
      422,
      "This plan couldn't be built. Check the budget and date, then try again.",
    );
  }
}
