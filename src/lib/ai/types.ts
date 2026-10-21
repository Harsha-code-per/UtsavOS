import { z } from "zod";
import {
  IDEA_KINDS,
  type Brief,
  type Plan,
  type PlanChange,
  type PlanDraft,
} from "@/lib/domain/schema";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(2000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const IdeaDraftSchema = z.object({
  kind: z.enum(IDEA_KINDS),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(400),
});
export type IdeaDraft = z.infer<typeof IdeaDraftSchema>;

export type BriefPatch = Partial<Brief>;

export const SourceSchema = z.object({ uri: z.url(), title: z.string() });
export type Source = z.infer<typeof SourceSchema>;

export interface ChatResult {
  reply: string;
  changes: PlanChange[];
}

export interface IdeasResult {
  ideas: IdeaDraft[];
  sources: Source[];
}

/** Everything the app asks of a language model. Implemented by Gemini and by a test double. */
export interface Planner {
  source: "gemini" | "mock";
  draftPlan: (brief: Brief, today: string) => Promise<PlanDraft>;
  parseBrief: (description: string, today: string) => Promise<BriefPatch>;
  chat: (plan: Plan, messages: ChatMessage[]) => Promise<ChatResult>;
  ideas: (brief: Brief) => Promise<IdeasResult>;
}

/** Thrown for any model failure; its message is safe to show to the person. */
export class AiError extends Error {
  override name = "AiError";
}
