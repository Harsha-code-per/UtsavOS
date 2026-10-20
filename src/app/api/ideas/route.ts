import { z } from "zod";
import { AiError, getPlanner } from "@/lib/ai/planner";
import { errorResponse, json, rateLimited, readJson } from "@/lib/api/http";
import { BriefSchema } from "@/lib/domain/schema";
import { clientKey, createRateLimiter } from "@/lib/security/rate-limit";

export const maxDuration = 60;

const Body = z.object({ brief: BriefSchema });
const limiter = createRateLimiter({ limit: 8, windowMs: 60_000 });

/** Fresh personalized ideas, grounded in the event's city with Google Search. */
export async function POST(request: Request) {
  const limit = limiter.check(clientKey(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const body = await readJson(request, Body);
  if (!body.ok) return body.response;

  const planner = getPlanner();
  if (!planner) return errorResponse(503, "AI ideas aren't configured yet.");

  try {
    return json(await planner.ideas(body.data.brief));
  } catch (error) {
    if (error instanceof AiError) return errorResponse(502, error.message);
    throw error;
  }
}
