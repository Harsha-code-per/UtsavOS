"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { BriefPatch } from "@/lib/ai/types";
import { takeDescription } from "@/lib/store/handoff";

export interface QuickFillStatus {
  state: "idle" | "busy" | "done" | "error";
  message?: string;
}

const filledMessage = (count: number) =>
  count
    ? `Filled ${count} field${count === 1 ? "" : "s"} from your description. Check them below.`
    : "Couldn't find details to fill. Try adding the date, city or guest count.";

/** Gemini quick-fill: turns a free-text description into brief fields. */
export function useQuickFill(fill: (patch: BriefPatch) => number, fromDescription: boolean) {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<QuickFillStatus>({ state: "idle" });

  const run = useCallback(
    async (text: string) => {
      if (text.trim().length < 3) {
        setStatus({ state: "error", message: "Describe the celebration in a few words first." });
        return;
      }
      setStatus({ state: "busy" });
      try {
        const { patch } = await api.parseBrief(text);
        setStatus({ state: "done", message: filledMessage(fill(patch)) });
      } catch (e) {
        setStatus({ state: "error", message: (e as Error).message });
      }
    },
    [fill],
  );

  // Arriving from the landing page with a description: fill the form straight away.
  useEffect(() => {
    if (!fromDescription) return;
    const text = takeDescription();
    if (!text) return;
    void Promise.resolve().then(() => {
      setDescription(text);
      return run(text);
    });
  }, [fromDescription, run]);

  return { description, setDescription, status, run };
}
