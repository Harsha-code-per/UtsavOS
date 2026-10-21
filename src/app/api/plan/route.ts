import { z } from "zod";
import { draftOrStarter } from "@/lib/api/draft";
import { errorResponse, json } from "@/lib/api/http";
import { guardedRoute } from "@/lib/api/route";
import { buildPlan } from "@/lib/domain/plan";
import { BriefSchema } from "@/lib/domain/schema";
import { trustedToday } from "@/lib/domain/timeline";

export const maxDuration = 60;

const Body = z.object({ brief: BriefSchema, today: z.iso.date().optional() });

/** Drafts a full plan with Gemini; falls back to a starter template so planning never dead-ends. */
export const POST = guardedRoute({ schema: Body, limit: 8 }, async (body) => {
  const today = trustedToday(body.today);
  const { draft, source, notice } = await draftOrStarter(body.brief, today);
  try {
    const plan = buildPlan(body.brief, draft, { id: crypto.randomUUID(), today, now: new Date() });
    return json({ plan, source, notice });
  } catch {
    return errorResponse(
      422,
      "This plan couldn't be built. Check the budget and date, then try again.",
    );
  }
});
