"use client";

import Link from "next/link";
import { useState } from "react";
import { api, localToday } from "@/lib/api/client";
import { summarizeBudget } from "@/lib/domain/budget";
import { formatDate } from "@/lib/domain/format";
import type { Plan, PlanChange } from "@/lib/domain/schema";
import { daysUntil } from "@/lib/domain/timeline";
import { usePlanActions, usePlanList, type SaveState } from "@/lib/store/usePlans";
import { BudgetPanel } from "./BudgetPanel";
import { CoPlanner } from "./CoPlanner";
import { IdeasPanel } from "./IdeasPanel";
import { Tabs, type TabId } from "./Tabs";
import { TimelinePanel } from "./TimelinePanel";
import { VendorsPanel } from "./VendorsPanel";
import styles from "./dashboard.module.css";

const TYPE_LABEL: Record<Plan["brief"]["type"], string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
  festival: "Festival",
};

const SAVE_LABEL: Record<SaveState, string> = {
  device: "Saved on this device",
  saving: "Saving…",
  saved: "Saved to your account",
  error: "Couldn't reach your account. Saved on this device.",
};

/** Applies plan changes; returns an error message to show, or null on success. */
export type ChangePlan = (...changes: PlanChange[]) => string | null;

export function PlanDashboard({ id, starter }: { id: string; starter: boolean }) {
  const plans = usePlanList();
  const { apply, save, saveState } = usePlanActions();
  const [tab, setTab] = useState<TabId>("budget");
  const [question, setQuestion] = useState<{ text: string; key: number } | null>(null);
  const [redraft, setRedraft] = useState<{ busy: boolean; message?: string }>({ busy: false });

  if (plans === null) {
    return (
      <main id="main" className={`container ${styles.empty}`}>
        <p role="status">Opening your plan…</p>
      </main>
    );
  }

  const plan = plans.find((p) => p.id === id);
  if (!plan) {
    return (
      <main id="main" className={`container ${styles.empty}`}>
        <h1 className={styles.emptyTitle}>This plan isn&rsquo;t on this device.</h1>
        <p>Sign in with the Google account you planned with to load it, or start a new plan.</p>
        <div className={styles.emptyActions}>
          <Link href="/plan/new" className="btn btn-primary">
            Plan a celebration
          </Link>
          <Link href="/plans" className="btn btn-outline">
            See my plans
          </Link>
        </div>
      </main>
    );
  }

  const change: ChangePlan = (...changes) => {
    try {
      apply(plan, ...changes);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "That change couldn't be applied.";
    }
  };

  const ask = (text: string) => setQuestion({ text, key: Date.now() });

  async function redraftWithGemini(current: Plan) {
    setRedraft({ busy: true });
    try {
      const { plan: fresh, notice } = await api.draftPlan(current.brief);
      if (notice) return setRedraft({ busy: false, message: notice });
      save({ ...fresh, id: current.id });
      setRedraft({ busy: false, message: "Redrafted with Gemini." });
    } catch (e) {
      setRedraft({ busy: false, message: (e as Error).message });
    }
  }

  const { brief } = plan;
  const budget = summarizeBudget(plan.budget);
  const days = daysUntil(brief.date, localToday());
  const done = plan.milestones.filter((m) => m.done).length;
  const booked = plan.vendors.filter((v) => v.status === "booked").length;

  return (
    <main id="main" className={`container ${styles.page}`} lang={brief.language}>
      <header className={styles.head} lang="en">
        <div>
          <p className={styles.meta}>
            {TYPE_LABEL[brief.type]} in {brief.city} on {formatDate(brief.date)}, for{" "}
            {brief.guests.toLocaleString("en-IN")} guests
          </p>
          <h1 className={styles.title} lang={brief.language}>
            {brief.name}
          </h1>
          <p className={styles.save} role="status" data-state={saveState}>
            {SAVE_LABEL[saveState]}
          </p>
        </div>
        <dl className={styles.stats}>
          <div>
            <dt>{days >= 0 ? "Days to go" : "Days since"}</dt>
            <dd>{Math.abs(days)}</dd>
          </div>
          <div>
            <dt>Budget used</dt>
            <dd>{budget.allocated ? Math.round((budget.spent / budget.allocated) * 100) : 0}%</dd>
          </div>
          <div>
            <dt>Tasks done</dt>
            <dd>
              {done}/{plan.milestones.length}
            </dd>
          </div>
          <div>
            <dt>Vendors booked</dt>
            <dd>
              {booked}/{plan.vendors.length}
            </dd>
          </div>
        </dl>
      </header>

      {(starter || redraft.message) && (
        <div className={styles.notice} role="status" lang="en">
          <p>
            {redraft.message ??
              "Gemini was busy, so this is a starter plan from proven templates. Redraft it once Gemini is free, or ask the co-planner to tailor it."}
          </p>
          <button
            type="button"
            className="btn btn-ink btn-small"
            disabled={redraft.busy}
            onClick={() => void redraftWithGemini(plan)}
          >
            {redraft.busy ? "Redrafting…" : "Redraft with Gemini"}
          </button>
        </div>
      )}

      <div className={styles.workspace}>
        <div className={styles.main}>
          <Tabs active={tab} onChange={setTab} />
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className={styles.panel}
          >
            {tab === "budget" && <BudgetPanel plan={plan} onChange={change} onAsk={ask} />}
            {tab === "timeline" && <TimelinePanel plan={plan} onChange={change} />}
            {tab === "vendors" && <VendorsPanel plan={plan} onChange={change} />}
            {tab === "ideas" && <IdeasPanel plan={plan} onChange={change} />}
          </div>
        </div>
        <CoPlanner plan={plan} onChange={change} question={question} />
      </div>
    </main>
  );
}
