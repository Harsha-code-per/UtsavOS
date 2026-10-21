import { z } from "zod";
import type { Planner } from "@/lib/ai/types";
import { createTtlCache } from "@/lib/api/cache";
import { json } from "@/lib/api/http";
import { aiRoute } from "@/lib/api/route";
import { BriefSchema } from "@/lib/domain/schema";

export const maxDuration = 60;

const Body = z.object({ brief: BriefSchema });
const results = createTtlCache<Awaited<ReturnType<Planner["ideas"]>>>({
  ttlMs: 30 * 60_000,
  max: 200,
});

/** Fresh personalized ideas, grounded in the event's city with Google Search. */
export const POST = aiRoute(
  { schema: Body, limit: 8, unconfigured: "AI ideas aren't configured yet." },
  async ({ brief }, planner) => {
    const key = JSON.stringify(brief);
    const result = results.get(key) ?? (await planner.ideas(brief));
    results.set(key, result);
    return json(result);
  },
);
