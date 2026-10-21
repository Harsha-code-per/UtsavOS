import { z } from "zod";
import { IdeaDraftSchema, SourceSchema, type ChatMessage } from "@/lib/ai/types";
import {
  BriefSchema,
  PlanChangeSchema,
  PlanSchema,
  type Brief,
  type Plan,
} from "@/lib/domain/schema";
import { localToday } from "@/lib/domain/timeline";

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** What to show for a failed call: the error's own words when it has them. */
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : GENERIC_ERROR;

/** True for a request the person (or a newer request) cancelled on purpose. */
export const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

/** The JSON responses of this app's own API, checked before the UI trusts them. */
const Responses = {
  plan: z.object({ plan: PlanSchema, source: z.string(), notice: z.string().optional() }),
  brief: z.object({ patch: BriefSchema.partial() }),
  chat: z.object({ reply: z.string(), changes: z.array(PlanChangeSchema) }),
  ideas: z.object({ ideas: z.array(IdeaDraftSchema), sources: z.array(SourceSchema) }),
};
const ErrorBody = z.object({ error: z.string() });

async function send(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new Error("You seem to be offline. Check your connection and try again.");
  }
}

async function post<S extends z.ZodType>(
  path: string,
  schema: S,
  { body, signal }: { body: unknown; signal?: AbortSignal },
): Promise<z.infer<S>> {
  const res = await send(path, body, signal);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(ErrorBody.safeParse(data).data?.error ?? GENERIC_ERROR);
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error(GENERIC_ERROR);
  return parsed.data;
}

export const api = {
  draftPlan: (brief: Brief, signal?: AbortSignal) =>
    post("/api/plan", Responses.plan, { body: { brief, today: localToday() }, signal }),
  parseBrief: (description: string) =>
    post("/api/brief", Responses.brief, { body: { description, today: localToday() } }),
  chat: (plan: Plan, messages: ChatMessage[]) =>
    post("/api/chat", Responses.chat, { body: { plan, messages } }),
  ideas: (brief: Brief) => post("/api/ideas", Responses.ideas, { body: { brief } }),
};
