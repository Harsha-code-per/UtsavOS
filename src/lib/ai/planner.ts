import { GoogleGenAI } from "@google/genai";
import { createGeminiPlanner } from "./gemini";
import { mockPlanner } from "./mock";
import type { Planner } from "./types";

// Public entry point of the AI layer.
export * from "./types";
export { createGeminiPlanner, type Generate } from "./gemini";
export { mockPlanner } from "./mock";

/**
 * Tried in order: a model that is overloaded, rate limited or retired hands over to the next.
 * Override with GEMINI_MODEL. ("gemini-flash-latest" is left out: it aliases the first entry.)
 */
export const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-flash-lite-latest"];

type Env = Record<string, string | undefined>;

export function modelChain(env: Env): string[] {
  const configured = env.GEMINI_MODEL?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_MODELS;
}

/** The mock in tests (UTSAV_AI_MOCK=1), Gemini when a key is set, otherwise nothing. */
export function getPlanner(env: Env = process.env): Planner | null {
  if (env.UTSAV_AI_MOCK === "1") return mockPlanner;
  if (!env.GEMINI_API_KEY) return null;
  // One quick SDK-level retry per model; the model chain handles longer outages.
  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: { retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2 } },
  });
  return createGeminiPlanner((params) => ai.models.generateContent(params), modelChain(env));
}
