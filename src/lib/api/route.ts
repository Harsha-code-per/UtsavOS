import type { z } from "zod";
import { AiError, getPlanner, type Planner } from "@/lib/ai/planner";
import { clientKey, createRateLimiter } from "@/lib/security/rate-limit";
import { errorResponse, rateLimited, readJson } from "./http";

interface GuardOptions<S extends z.ZodType> {
  schema: S;
  /** Requests per client per minute. */
  limit: number;
  maxBytes?: number;
}

/** The shared front door of every API route: a per-client rate limit, then a validated body. */
export function guardedRoute<S extends z.ZodType>(
  { schema, limit, maxBytes }: GuardOptions<S>,
  handle: (body: z.infer<S>) => Promise<Response>,
) {
  const limiter = createRateLimiter({ limit, windowMs: 60_000 });
  return async (request: Request): Promise<Response> => {
    const check = limiter.check(clientKey(request));
    if (!check.ok) return rateLimited(check.retryAfterSeconds);
    const body = await readJson(request, schema, maxBytes);
    return body.ok ? handle(body.data) : body.response;
  };
}

interface AiRouteOptions<S extends z.ZodType> extends GuardOptions<S> {
  /** What to tell the person when no Gemini key is configured. */
  unconfigured: string;
}

/** A POST handler for a Gemini-backed endpoint. Gemini failures become a readable 502. */
export function aiRoute<S extends z.ZodType>(
  options: AiRouteOptions<S>,
  handle: (body: z.infer<S>, planner: Planner) => Promise<Response>,
) {
  return guardedRoute(options, async (body) => {
    const planner = getPlanner();
    if (!planner) return errorResponse(503, options.unconfigured);
    try {
      return await handle(body, planner);
    } catch (error) {
      if (error instanceof AiError) return errorResponse(502, error.message);
      throw error;
    }
  });
}
