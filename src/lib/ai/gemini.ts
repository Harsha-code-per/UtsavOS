import { ThinkingLevel, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import { sanitizeDraft } from "@/lib/domain/plan";
import { BriefSchema, PlanDraftSchema, type Brief, type Plan } from "@/lib/domain/schema";
import {
  groundingSources,
  jsonArrayIn,
  parseModelJson,
  proposalReply,
  stripEmphasis,
  validBriefPatch,
  validIdeas,
} from "./output";
import {
  BRIEF_SYSTEM,
  PLANNER_SYSTEM,
  briefPrompt,
  chatSystem,
  ideasPrompt,
  planPrompt,
} from "./prompts";
import { planTools, toChanges, toGeminiSchema } from "./tools";
import {
  AiError,
  IdeaDraftSchema,
  type ChatMessage,
  type ChatResult,
  type IdeasResult,
  type Planner,
} from "./types";

interface GenerateResult {
  text?: string;
  functionCalls?: { name?: string; args?: Record<string, unknown> }[];
  candidates?: {
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
}
export type Generate = (params: GenerateContentParameters) => Promise<GenerateResult>;
type Call = (params: Omit<GenerateContentParameters, "model">) => Promise<GenerateResult>;

// A full plan takes a healthy Flash model about 15 s; one with a fallback behind it is cut off
// at 25 s so the next model still has time.
const FALLBACK_ATTEMPT_MS = 25_000;
const TOTAL_BUDGET_MS = 50_000; // stays inside the routes' 60 s maxDuration
const MIN_ATTEMPT_MS = 5_000;
// Errors another model might not have: retired (404), timeout, rate limit, overload.
const FALL_THROUGH = new Set([404, 408, 429, 500, 502, 503, 504]);

/** Time allowed for one model: short if another can take over, otherwise all that is left. */
export function attemptTimeout({ remaining, isLast }: { remaining: number; isLast: boolean }) {
  return isLast ? remaining : Math.min(FALLBACK_ATTEMPT_MS, remaining);
}

/** A loggable reason with no request content: the HTTP status, or the error's name. */
function failureReason(error: unknown): number | string {
  if (typeof error === "object" && error !== null && "status" in error) {
    if (typeof error.status === "number") return error.status;
  }
  return error instanceof Error ? error.name : "unknown";
}

function shouldTryNextModel(error: unknown): boolean {
  const reason = failureReason(error);
  if (typeof reason === "number") return FALL_THROUGH.has(reason);
  return reason === "TimeoutError" || reason === "AbortError";
}

/** Tries each model in turn within one time budget; a model that is down hands over to the next. */
function modelChainCaller(generate: Generate, models: string[]): Call {
  return async (params) => {
    const started = Date.now();
    for (const [index, model] of models.entries()) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
      const isLast = index === models.length - 1;
      if (remaining < MIN_ATTEMPT_MS) break;
      try {
        return await generate({
          model,
          ...params,
          config: {
            // Planning needs little deliberation; low thinking cuts latency several-fold.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...params.config,
            abortSignal: AbortSignal.timeout(attemptTimeout({ remaining, isLast })),
          },
        });
      } catch (error) {
        // Log what failed, never the request itself (it carries the person's brief).
        console.error("gemini_request_failed", { model, reason: failureReason(error) });
        if (!shouldTryNextModel(error)) break;
      }
    }
    throw new AiError("Gemini is unavailable right now. Please try again in a moment.");
  };
}

async function draftPlan(call: Call, brief: Brief, today: string) {
  const res = await call({
    contents: planPrompt(brief, today),
    config: {
      systemInstruction: PLANNER_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(PlanDraftSchema),
      temperature: 0.8,
    },
  });
  const draft = sanitizeDraft(parseModelJson(res.text));
  if (!draft) throw new AiError("The planner's draft was incomplete. Please try again.");
  return draft;
}

async function parseBrief(call: Call, description: string, today: string) {
  const res = await call({
    contents: briefPrompt(description, today),
    config: {
      systemInstruction: BRIEF_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(BriefSchema.partial()),
      temperature: 0.2,
    },
  });
  return validBriefPatch(parseModelJson(res.text));
}

async function chat(call: Call, plan: Plan, messages: ChatMessage[]): Promise<ChatResult> {
  const res = await call({
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      systemInstruction: chatSystem(plan, new Date().toISOString().slice(0, 10)),
      tools: [{ functionDeclarations: planTools }],
      temperature: 0.6,
    },
  });
  const changes = toChanges(res.functionCalls ?? []);
  const fallback = changes.length
    ? proposalReply(plan.brief.language, messages.at(-1)?.text ?? "")
    : "";
  const reply = stripEmphasis(res.text ?? "") || fallback;
  if (!reply) throw new AiError("The co-planner had no answer. Try rephrasing.");
  return { reply, changes };
}

/** Ideas grounded with Google Search, with their sources; null when grounding gives nothing. */
async function groundedIdeas(call: Call, brief: Brief): Promise<IdeasResult | null> {
  try {
    const res = await call({
      contents: ideasPrompt(brief, true),
      config: { tools: [{ googleSearch: {} }], temperature: 0.9 },
    });
    const ideas = validIdeas(jsonArrayIn(res.text ?? ""));
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks;
    return ideas.length ? { ideas, sources: groundingSources(chunks) } : null;
  } catch (error) {
    // Grounding has its own (small) free-tier quota; the caller falls back to plain ideas.
    if (error instanceof AiError) return null;
    throw error;
  }
}

async function ideas(call: Call, brief: Brief): Promise<IdeasResult> {
  const grounded = await groundedIdeas(call, brief);
  if (grounded) return grounded;
  const res = await call({
    contents: ideasPrompt(brief, false),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(z.array(IdeaDraftSchema)),
      temperature: 0.9,
    },
  });
  const plain = validIdeas(parseModelJson(res.text));
  if (!plain.length) throw new AiError("No ideas came back. Please try again.");
  return { ideas: plain, sources: [] };
}

export function createGeminiPlanner(generate: Generate, models: string[]): Planner {
  const call = modelChainCaller(generate, models);
  return {
    source: "gemini",
    draftPlan: (brief, today) => draftPlan(call, brief, today),
    parseBrief: (description, today) => parseBrief(call, description, today),
    chat: (plan, messages) => chat(call, plan, messages),
    ideas: (brief) => ideas(call, brief),
  };
}
