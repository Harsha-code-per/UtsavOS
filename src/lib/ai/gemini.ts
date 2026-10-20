import { ThinkingLevel, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import { sanitizeDraft } from "@/lib/domain/plan";
import { BriefSchema, PlanDraftSchema, type Brief, type Plan } from "@/lib/domain/schema";
import {
  groundingSources,
  jsonArrayIn,
  parseJson,
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

const ATTEMPT_TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 50_000; // stays inside the routes' 60 s maxDuration
const MIN_ATTEMPT_MS = 5_000;
// Errors another model might not have: retired (404), timeout, rate limit, overload.
const FALL_THROUGH = new Set([404, 408, 429, 500, 502, 503, 504]);

function shouldTryNextModel(error: unknown): boolean {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return true;
  }
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && FALL_THROUGH.has(status);
}

/** Tries each model in turn within one time budget; a model that is down hands over to the next. */
function modelChainCaller(generate: Generate, models: string[]): Call {
  return async (params) => {
    const started = Date.now();
    for (const model of models) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
      if (remaining < MIN_ATTEMPT_MS) break;
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
  const draft = sanitizeDraft(parseJson(res.text));
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
  return validBriefPatch(parseJson(res.text));
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
  const plain = validIdeas(parseJson(res.text));
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
