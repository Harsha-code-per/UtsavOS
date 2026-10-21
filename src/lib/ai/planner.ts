import { GoogleGenAI } from "@google/genai";
import { createGeminiPlanner } from "./gemini";
import { offlinePlanner } from "./offline";
import type { Planner } from "./types";

/**
 * Tried in order: a model that is overloaded, rate limited or retired hands over to the next.
 * 3.5 Flash leads because it drafts a full plan in about 15 s; in testing (Oct 2026) 3.8 Flash
 * often took longer than the whole request budget. Override the chain with GEMINI_MODEL.
 */
export const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-flash-lite-latest"];

type Env = Record<string, string | undefined>;

export function modelChain(env: Env): string[] {
  const configured = env.GEMINI_MODEL?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_MODELS;
}

/** The offline planner when UTSAV_AI_OFFLINE=1, Gemini when a key is set, otherwise nothing. */
export function getPlanner(env: Env = process.env): Planner | null {
  if (env.UTSAV_AI_OFFLINE === "1") return offlinePlanner;
  if (!env.GEMINI_API_KEY) return null;
  // One quick SDK-level retry per model; the model chain handles longer outages.
  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: { retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2 } },
  });
  return createGeminiPlanner((params) => ai.models.generateContent(params), modelChain(env));
}
