"use client";

import { useState } from "react";
import type { Brief } from "@/lib/domain/schema";

const SPEECH_LANG: Record<Brief["language"], string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  te: "te-IN",
  ta: "ta-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
};

interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

function createRecognition(): Recognition | null {
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

interface Options {
  language: Brief["language"];
  onText: (text: string) => void;
  onError: (message: string) => void;
}

/** Browser speech-to-text in the plan's language, where the browser supports it. */
export function useSpeechInput({ language, onText, onError }: Options) {
  const [listening, setListening] = useState(false);

  function listen() {
    const recognition = createRecognition();
    if (!recognition) {
      onError("Voice input isn't available in this browser. Type your message instead.");
      return;
    }
    recognition.lang = SPEECH_LANG[language];
    recognition.interimResults = false;
    recognition.onresult = (e) => onText(e.results[0]?.[0]?.transcript ?? "");
    recognition.onerror = () =>
      onError("Couldn't hear that. Check microphone access and try again.");
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return { listening, listen };
}
