"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api/client";
import type { Plan } from "@/lib/domain/schema";
import styles from "./StarterNotice.module.css";

const STARTER_TEXT =
  "Gemini was busy, so this is a starter plan from proven templates. Redraft it once Gemini is free, or ask the co-planner to tailor it.";

/** Shown for template plans: offers to redraft the same brief with Gemini. */
export function StarterNotice({
  plan,
  starter,
  onRedrafted,
}: {
  plan: Plan;
  starter: boolean;
  onRedrafted: (plan: Plan) => void;
}) {
  const [state, setState] = useState<{ busy: boolean; message?: string }>({ busy: false });

  async function redraft() {
    setState({ busy: true });
    try {
      const { plan: fresh, notice } = await api.draftPlan(plan.brief);
      if (notice) {
        setState({ busy: false, message: notice });
        return;
      }
      onRedrafted({ ...fresh, id: plan.id });
      setState({ busy: false, message: "Redrafted with Gemini." });
    } catch (e) {
      setState({ busy: false, message: errorMessage(e) });
    }
  }

  if (!starter && !state.message) return null;
  return (
    <div className={styles.notice} lang="en">
      <p role="status">{state.message ?? STARTER_TEXT}</p>
      <button
        type="button"
        className="btn btn-ink btn-small"
        disabled={state.busy}
        onClick={() => void redraft()}
      >
        {state.busy ? "Redrafting…" : "Redraft with Gemini"}
      </button>
    </div>
  );
}
