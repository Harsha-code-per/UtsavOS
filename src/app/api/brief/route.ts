import { z } from "zod";
import { json } from "@/lib/api/http";
import { aiRoute } from "@/lib/api/route";
import { trustedToday } from "@/lib/domain/timeline";

export const maxDuration = 30;

const Body = z.object({
  description: z.string().trim().min(3).max(1000),
  today: z.iso.date().optional(),
});

/** Quick-fill: turns a free-text description (any language) into brief fields. */
export const POST = aiRoute(
  {
    schema: Body,
    limit: 15,
    maxBytes: 8_000,
    unconfigured: "AI quick-fill isn't configured. Fill the form by hand.",
  },
  async ({ description, today }, planner) =>
    json({ patch: await planner.parseBrief(description, trustedToday(today)) }),
);
