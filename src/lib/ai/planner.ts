import { GoogleGenAI, ThinkingLevel, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import { fallbackDraft, sanitizeDraft } from "@/lib/domain/plan";
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

/** Tried in order: a model that is overloaded, rate limited or retired hands over to the next. */
// ("gemini-flash-latest" is left out: it aliases the newest Flash, i.e. the first entry.)
export const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-flash-lite-latest"];

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

const ATTEMPT_TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 50_000; // stays inside the routes' 60 s maxDuration
// Errors another model might not have: retired (404), timeout, rate limit, overload.
const FALL_THROUGH = new Set([404, 408, 429, 500, 502, 503, 504]);

function shouldTryNextModel(error: unknown): boolean {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return true;
  }
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && FALL_THROUGH.has(status);
}

function parseJson(text: string | undefined): unknown {
  try {
    return JSON.parse(text ?? "");
  } catch {
    throw new AiError("The planner returned an unreadable answer. Please try again.");
  }
}

function validIdeas(raw: unknown): IdeaDraft[] {
  return z
    .array(z.unknown())
    .catch([])
    .parse(raw)
    .flatMap((item) => {
      const idea = IdeaDraftSchema.safeParse(item);
      return idea.success ? [idea.data] : [];
    });
}

/** Cited web pages from a grounded answer: http(s) only, de-duplicated. */
function groundingSources(res: GenerateResult): Source[] {
  const seen = new Set<string>();
  return (res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).flatMap(({ web }) => {
    if (!web?.uri || !/^https?:\/\//.test(web.uri) || seen.has(web.uri)) return [];
    seen.add(web.uri);
    return [{ uri: web.uri, title: web.title || new URL(web.uri).hostname }];
  });
}

export function createGeminiPlanner(generate: Generate, models: string[]): Planner {
  async function call(params: Omit<GenerateContentParameters, "model">): Promise<GenerateResult> {
    const started = Date.now();
    for (const model of models) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
      if (remaining < 5_000) break;
      try {
        return await generate({
          model,
          ...params,
          config: {
            // Planning needs little deliberation; low thinking cuts latency several-fold.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...params.config,
            abortSignal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
          },
        });
      } catch (error) {
        console.error(`Gemini request failed on ${model}`, error);
        if (!shouldTryNextModel(error)) break;
      }
    }
    throw new AiError("Gemini is unavailable right now. Please try again in a moment.");
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
      const draft = sanitizeDraft(parseJson(res.text));
      if (!draft) throw new AiError("The planner's draft was incomplete. Please try again.");
      return draft;
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
      try {
        // Search grounding can't be combined with a response schema, so parse JSON from text.
        const res = await call({
          contents: ideasPrompt(brief, true),
          config: { tools: [{ googleSearch: {} }], temperature: 0.9 },
        });
        const text = res.text ?? "";
        const ideas = validIdeas(
          parseJson(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)),
        );
        if (ideas.length) return { ideas, sources: groundingSources(res) };
      } catch (error) {
        if (!(error instanceof AiError)) throw error;
        // Grounding has its own (small) free-tier quota; fall back to plain structured ideas.
      }
      const res = await call({
        contents: ideasPrompt(brief, false),
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(z.array(IdeaDraftSchema)),
          temperature: 0.9,
        },
      });
      const ideas = validIdeas(parseJson(res.text));
      if (!ideas.length) throw new AiError("No ideas came back. Please try again.");
      return { ideas, sources: [] };
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
    if (/budget|over|money|rebalance/i.test(last)) {
      const room = (l: Plan["budget"][number]) => l.allocated - l.spent;
      const over = plan.budget.find((l) => l.spent > l.allocated);
      const to = over ?? plan.budget[0]!;
      const from = plan.budget.filter((l) => l.id !== to.id).sort((a, b) => room(b) - room(a))[0];
      const amount = Math.min(
        over ? over.spent - over.allocated : Math.floor((from?.allocated ?? 0) / 4),
        from ? room(from) : 0,
      );
      if (from && amount > 0) {
        return {
          reply: `Move ${amount} from ${from.category} to ${to.category}.`,
          changes: [{ op: "moveBudget", from: from.id, to: to.id, amount }],
        };
      }
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

type Env = Record<string, string | undefined>;

export function modelChain(env: Env): string[] {
  const configured = env.GEMINI_MODEL?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_MODELS;
}

export function getPlanner(env: Env = process.env): Planner | null {
  if (env.UTSAV_AI_MOCK === "1") return mockPlanner;
  if (!env.GEMINI_API_KEY) return null;
  // One quick SDK-level retry per model; the model chain handles longer outages.
  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: { retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2 } },
  });
  return createGeminiPlanner((p) => ai.models.generateContent(p), modelChain(env));
}
