import type { BriefPatch, ChatMessage, IdeaDraft, Source } from "@/lib/ai/planner";
import type { Brief, Plan, PlanChange } from "@/lib/domain/schema";

/** The person's own calendar date, which the server accepts within a day of its own. */
export const localToday = () => new Date().toLocaleDateString("en-CA");

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new Error("You seem to be offline. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export const api = {
  draftPlan: (brief: Brief, signal?: AbortSignal) =>
    post<{ plan: Plan; source: string; notice?: string }>(
      "/api/plan",
      { brief, today: localToday() },
      signal,
    ),
  parseBrief: (description: string) =>
    post<{ patch: BriefPatch }>("/api/brief", { description, today: localToday() }),
  chat: (plan: Plan, messages: ChatMessage[]) =>
    post<{ reply: string; changes: PlanChange[] }>("/api/chat", { plan, messages }),
  ideas: (brief: Brief) => post<{ ideas: IdeaDraft[]; sources: Source[] }>("/api/ideas", { brief }),
};
