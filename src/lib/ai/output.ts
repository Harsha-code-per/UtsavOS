import { z } from "zod";
import { BriefSchema, LooseObject, type Brief } from "@/lib/domain/schema";
import { AiError, IdeaDraftSchema, type BriefPatch, type IdeaDraft, type Source } from "./types";

// Model output is untrusted: everything here validates or cleans it before the app uses it.

export function parseJson(text: string | undefined): unknown {
  try {
    return JSON.parse(text ?? "") as unknown;
  } catch {
    throw new AiError("The planner returned an unreadable answer. Please try again.");
  }
}

/** The JSON array inside a text answer (grounded answers can't use a response schema). */
export const jsonArrayIn = (text: string) =>
  parseJson(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));

/** Keeps each brief field that validates on its own, so one bad guess doesn't lose the rest. */
export function validBriefPatch(raw: unknown): BriefPatch {
  const parsed = LooseObject.safeParse(raw);
  if (!parsed.success) return {};
  const source = parsed.data;
  const patch: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(BriefSchema.shape)) {
    const value = field.safeParse(source[key]);
    if (value.success) patch[key] = value.data;
  }
  return patch;
}

export function validIdeas(raw: unknown): IdeaDraft[] {
  return z
    .array(z.unknown())
    .catch([])
    .parse(raw)
    .flatMap((item) => {
      const idea = IdeaDraftSchema.safeParse(item);
      return idea.success ? [idea.data] : [];
    });
}

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

/** Cited web pages from a grounded answer: http(s) only, de-duplicated. */
export function groundingSources(chunks: GroundingChunk[] = []): Source[] {
  const seen = new Set<string>();
  return chunks.flatMap(({ web }) => {
    if (!web?.uri || !/^https?:\/\//.test(web.uri) || seen.has(web.uri)) return [];
    seen.add(web.uri);
    return [{ uri: web.uri, title: web.title || new URL(web.uri).hostname }];
  });
}

/** The chat renders plain text, so drop Markdown bold/italic markers the model may still add. */
export const stripEmphasis = (text: string) =>
  text
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|\s)[*_](\S(?:.*?\S)?)[*_](?=\s|[.,!?]|$)/gm, "$1$2")
    .trim();

// Used when Gemini proposes changes without any text, in the language the person is using.
const PROPOSAL_REPLY: Record<Brief["language"], string> = {
  en: "Here is what I'd change. Review and apply when you're ready.",
  hi: "मेरे सुझाए बदलाव ये हैं। देखकर ठीक लगें तो लागू करें।",
  bn: "আমার প্রস্তাবিত পরিবর্তনগুলো এখানে। দেখে ঠিক মনে হলে প্রয়োগ করুন।",
  mr: "मी सुचवलेले बदल हे आहेत. तपासून योग्य वाटल्यास लागू करा.",
  te: "నేను సూచించే మార్పులు ఇవి. చూసి సరైనవి అనిపిస్తే వర్తింపజేయండి.",
  ta: "நான் பரிந்துரைக்கும் மாற்றங்கள் இவை. பார்த்து சரியெனில் பயன்படுத்துங்கள்.",
  gu: "મારા સૂચવેલા ફેરફારો આ છે. જોઈને યોગ્ય લાગે તો લાગુ કરો.",
  kn: "ನಾನು ಸೂಚಿಸುವ ಬದಲಾವಣೆಗಳು ಇವು. ನೋಡಿ ಸರಿ ಅನಿಸಿದರೆ ಅನ್ವಯಿಸಿ.",
  ml: "ഞാൻ നിർദ്ദേശിക്കുന്ന മാറ്റങ്ങൾ ഇവയാണ്. പരിശോധിച്ച് ശരിയെന്ന് തോന്നിയാൽ പ്രയോഗിക്കുക.",
  pa: "ਮੇਰੇ ਸੁਝਾਏ ਬਦਲਾਅ ਇਹ ਹਨ। ਦੇਖ ਕੇ ਠੀਕ ਲੱਗਣ ਤਾਂ ਲਾਗੂ ਕਰੋ।",
};

/** English if the person wrote in Latin script, otherwise the plan's language. */
export const proposalReply = (language: Brief["language"], lastMessage: string) =>
  PROPOSAL_REPLY[/^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]*$/u.test(lastMessage) ? "en" : language];
