import { z } from "zod";
import { AiError, ChatMessageSchema, getPlanner } from "@/lib/ai/planner";
import { errorResponse, json, rateLimited, readJson } from "@/lib/api/http";
import { applyChange } from "@/lib/domain/plan";
import { PlanSchema, type PlanChange } from "@/lib/domain/schema";
import { clientKey, createRateLimiter } from "@/lib/security/rate-limit";

export const maxDuration = 60;

const Body = z.object({
  plan: PlanSchema,
  messages: z
    .array(ChatMessageSchema)
    .min(1)
    .max(16)
    .refine((m) => m.at(-1)?.role === "user", "must end with your message"),
});
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

/** Co-planner turn: Gemini replies and proposes plan changes via function calling. */
export async function POST(request: Request) {
  const limit = limiter.check(clientKey(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const body = await readJson(request, Body, 200_000);
  if (!body.ok) return body.response;
  const { plan, messages } = body.data;

  const planner = getPlanner();
  if (!planner) return errorResponse(503, "The co-planner isn't configured yet.");

  try {
    const result = await planner.chat(plan, messages);

    // Only propose changes that actually apply, in order, to this plan.
    let working = plan;
    const changes: PlanChange[] = [];
    for (const change of result.changes) {
      try {
        working = applyChange(working, change);
        changes.push(change);
      } catch {
        // The model referenced something that doesn't exist or broke a rule; skip it.
      }
    }
    return json({ reply: result.reply, changes });
  } catch (error) {
    if (error instanceof AiError) return errorResponse(502, error.message);
    throw error;
  }
}
