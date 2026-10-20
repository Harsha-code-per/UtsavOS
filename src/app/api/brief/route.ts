import { z } from "zod";
import { AiError, getPlanner } from "@/lib/ai/planner";
import { errorResponse, json, rateLimited, readJson } from "@/lib/api/http";
import { trustedToday } from "@/lib/domain/timeline";
import { clientKey, createRateLimiter } from "@/lib/security/rate-limit";

export const maxDuration = 30;

const Body = z.object({
  description: z.string().trim().min(3).max(1000),
  today: z.iso.date().optional(),
});
const limiter = createRateLimiter({ limit: 15, windowMs: 60_000 });

/** Quick-fill: turns a free-text description (any language) into brief fields. */
export async function POST(request: Request) {
  const limit = limiter.check(clientKey(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const body = await readJson(request, Body, 8_000);
  if (!body.ok) return body.response;

  const planner = getPlanner();
  if (!planner) return errorResponse(503, "AI quick-fill isn't configured. Fill the form by hand.");

  try {
    const patch = await planner.parseBrief(body.data.description, trustedToday(body.data.today));
    return json({ patch });
  } catch (error) {
    if (error instanceof AiError) return errorResponse(502, error.message);
    throw error;
  }
}
