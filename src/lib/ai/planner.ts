import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import { fallbackDraft } from "@/lib/domain/plan";
import {
  BriefSchema,
  IDEA_KINDS,
  PlanDraftSchema,
  type Brief,
  type Plan,
  type PlanChange,
  type PlanDraft,
} from "@/lib/domain/schema";
import {
  BRIEF_SYSTEM,
  PLANNER_SYSTEM,
  briefPrompt,
  chatSystem,
  ideasPrompt,
  planPrompt,
} from "./prompts";
import { planTools, toChanges, toGeminiSchema } from "./tools";

export const DEFAULT_MODEL = "gemini-flash-latest";

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
export interface Source {
  uri: string;
  title: string;
}

export interface Planner {
  source: "gemini" | "mock";
  draftPlan(brief: Brief, today: string): Promise<PlanDraft>;
  parseBrief(description: string, today: string): Promise<BriefPatch>;
  chat(plan: Plan, messages: ChatMessage[]): Promise<{ reply: string; changes: PlanChange[] }>;
  ideas(brief: Brief): Promise<{ ideas: IdeaDraft[]; sources: Source[] }>;
}

/** Thrown for any model failure; its message is safe to show to the person. */
export class AiError extends Error {
  override name = "AiError";
}

interface GenerateResult {
  text?: string;
  functionCalls?: { name?: string; args?: Record<string, unknown> }[];
  candidates?: {
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
}
export type Generate = (params: GenerateContentParameters) => Promise<GenerateResult>;

const TIMEOUT_MS = 30_000;

function parseJson(text: string | undefined): unknown {
  try {
    return JSON.parse(text ?? "");
  } catch {
    throw new AiError("The planner returned an unreadable answer. Please try again.");
  }
}

export function createGeminiPlanner(generate: Generate, model: string): Planner {
  async function call(params: Omit<GenerateContentParameters, "model">): Promise<GenerateResult> {
    try {
      return await generate({
        model,
        ...params,
        config: { ...params.config, abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
      });
    } catch (error) {
      console.error("Gemini request failed", error);
      throw new AiError("Gemini is unavailable right now. Please try again in a moment.");
    }
  }

  return {
    source: "gemini",

    async draftPlan(brief, today) {
      const res = await call({
        contents: planPrompt(brief, today),
        config: {
          systemInstruction: PLANNER_SYSTEM,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(PlanDraftSchema),
          temperature: 0.8,
        },
      });
      const draft = PlanDraftSchema.safeParse(parseJson(res.text));
      if (!draft.success)
        throw new AiError("The planner's draft was incomplete. Please try again.");
      return draft.data;
    },

    async parseBrief(description, today) {
      const res = await call({
        contents: briefPrompt(description, today),
        config: {
          systemInstruction: BRIEF_SYSTEM,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(BriefSchema.partial()),
          temperature: 0.2,
        },
      });
      const raw = parseJson(res.text);
      if (typeof raw !== "object" || raw === null) return {};
      // Keep each field that validates on its own, so one bad guess doesn't lose the rest.
      const patch: Record<string, unknown> = {};
      for (const [key, field] of Object.entries(BriefSchema.shape)) {
        const value = field.safeParse((raw as Record<string, unknown>)[key]);
        if (value.success && value.data !== undefined) patch[key] = value.data;
      }
      return patch as BriefPatch;
    },

    async chat(plan, messages) {
      const res = await call({
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        config: {
          systemInstruction: chatSystem(plan, new Date().toISOString().slice(0, 10)),
          tools: [{ functionDeclarations: planTools }],
          temperature: 0.6,
        },
      });
      const changes = toChanges(res.functionCalls ?? []);
      const reply =
        res.text?.trim() ||
        (changes.length ? "Here is what I'd change. Review and apply when you're ready." : "");
      if (!reply) throw new AiError("The co-planner had no answer. Try rephrasing.");
      return { reply, changes };
    },

    async ideas(brief) {
      // Search grounding can't be combined with a response schema, so parse the JSON from text.
      const res = await call({
        contents: ideasPrompt(brief),
        config: { tools: [{ googleSearch: {} }], temperature: 0.9 },
      });
      const text = res.text ?? "";
      const raw = parseJson(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
      const ideas = z
        .array(z.unknown())
        .catch([])
        .parse(raw)
        .flatMap((item) => {
          const idea = IdeaDraftSchema.safeParse(item);
          return idea.success ? [idea.data] : [];
        });
      if (!ideas.length) throw new AiError("No ideas came back. Please try again.");

      const seen = new Set<string>();
      const sources = (res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).flatMap(
        ({ web }) => {
          if (!web?.uri || !/^https?:\/\//.test(web.uri) || seen.has(web.uri)) return [];
          seen.add(web.uri);
          return [{ uri: web.uri, title: web.title || new URL(web.uri).hostname }];
        },
      );
      return { ideas, sources };
    },
  };
}

/** Deterministic stand-in for Gemini, used in end-to-end tests (UTSAV_AI_MOCK=1). */
export const mockPlanner: Planner = {
  source: "mock",
  async draftPlan(brief) {
    return fallbackDraft(brief);
  },
  async parseBrief() {
    return {
      type: "birthday",
      name: "Meera's first birthday",
      city: "Pune",
      guests: 60,
      budget: 150_000,
    };
  },
  async chat(plan, messages) {
    const last = messages.at(-1)?.text ?? "";
    const [to, from] = [plan.budget[0], plan.budget.at(-1)];
    if (/budget|over|money/i.test(last) && to && from && from !== to && from.allocated >= 2) {
      const amount = Math.max(1, Math.floor(from.allocated / 4));
      return {
        reply: `Move ${amount} from ${from.category} to ${to.category}.`,
        changes: [{ op: "moveBudget", from: from.id, to: to.id, amount }],
      };
    }
    return {
      reply: "Happy to help. Ask me to move budget, add a task or suggest ideas.",
      changes: [],
    };
  },
  async ideas(brief) {
    return { ideas: fallbackDraft(brief).ideas, sources: [] };
  },
};

export function getPlanner(env: Record<string, string | undefined> = process.env): Planner | null {
  if (env.UTSAV_AI_MOCK === "1") return mockPlanner;
  if (!env.GEMINI_API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return createGeminiPlanner(
    (p) => ai.models.generateContent(p),
    env.GEMINI_MODEL || DEFAULT_MODEL,
  );
}
