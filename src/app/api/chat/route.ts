import { z } from "zod";
import { ChatMessageSchema } from "@/lib/ai/types";
import { json } from "@/lib/api/http";
import { aiRoute } from "@/lib/api/route";
import { applicableChanges } from "@/lib/domain/plan";
import { PlanSchema } from "@/lib/domain/schema";

export const maxDuration = 60;

const Body = z.object({
  plan: PlanSchema,
  messages: z
    .array(ChatMessageSchema)
    .min(1)
    .max(16)
    .refine((m) => m.at(-1)?.role === "user", "must end with your message"),
});

/** Co-planner turn: Gemini replies and proposes plan changes via function calling. */
export const POST = aiRoute(
  {
    schema: Body,
    limit: 20,
    maxBytes: 200_000,
    unconfigured: "The co-planner isn't configured yet.",
  },
  async ({ plan, messages }, planner) => {
    const { reply, changes } = await planner.chat(plan, messages);
    // Only propose what actually applies to this plan, so every Apply button works.
    return json({ reply, changes: applicableChanges(plan, changes) });
  },
);
