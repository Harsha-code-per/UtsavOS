"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { Brief, Plan } from "@/lib/domain/schema";
import { usePlanActions } from "@/lib/store/usePlans";

interface Generating {
  done: boolean;
  plan?: Plan;
  notice?: string;
}

/** Drafts the plan with Gemini, saves it, and opens it once the garland completes. */
export function usePlanGeneration() {
  const router = useRouter();
  const { save } = usePlanActions();
  const [generating, setGenerating] = useState<Generating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function start(brief: Brief) {
    setError(null);
    const controller = new AbortController();
    abort.current = controller;
    setGenerating({ done: false });
    try {
      const { plan, notice } = await api.draftPlan(brief, controller.signal);
      save(plan);
      setGenerating({ done: true, plan, notice });
    } catch (e) {
      setGenerating(null);
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    }
  }

  const finish = useCallback(() => {
    if (!generating?.plan) return;
    router.push(`/plan/${generating.plan.id}${generating.notice ? "?starter=1" : ""}`);
  }, [generating, router]);

  const stop = () => {
    abort.current?.abort();
    setGenerating(null);
  };

  return { generating, error, start, finish, stop };
}
