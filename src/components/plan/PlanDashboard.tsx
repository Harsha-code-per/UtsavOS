"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlanChange } from "@/lib/domain/schema";
import { usePlanActions, usePlanList } from "@/lib/store/usePlans";
import { BudgetPanel } from "./BudgetPanel";
import { CoPlanner } from "./CoPlanner";
import { IdeasPanel } from "./IdeasPanel";
import { PlanHeader } from "./PlanHeader";
import styles from "./PlanDashboard.module.css";
import { StarterNotice } from "./StarterNotice";
import { Tabs, type TabId } from "./Tabs";
import { TimelinePanel } from "./TimelinePanel";
import { VendorsPanel } from "./VendorsPanel";

/** Applies plan changes; returns an error message to show, or null on success. */
export type ChangePlan = (...changes: PlanChange[]) => string | null;

function Loading() {
  return (
    <main id="main" className={`container ${styles.empty}`}>
      <p role="status">Opening your plan…</p>
    </main>
  );
}

function NotOnDevice() {
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

/** The plan workspace: header, tabbed panels and the co-planner. */
export function PlanDashboard({ id, starter }: { id: string; starter: boolean }) {
  const plans = usePlanList();
  const { apply, save, saveState } = usePlanActions();
  const [tab, setTab] = useState<TabId>("budget");
  const [question, setQuestion] = useState<{ text: string; key: number } | null>(null);

  if (plans === null) return <Loading />;
  const plan = plans.find((p) => p.id === id);
  if (!plan) return <NotOnDevice />;

  const change: ChangePlan = (...changes) => {
    try {
      apply(plan, ...changes);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "That change couldn't be applied.";
    }
  };
  const ask = (text: string) => setQuestion({ text, key: Date.now() });
  const panels: Record<TabId, React.ReactNode> = {
    budget: <BudgetPanel plan={plan} onChange={change} onAsk={ask} />,
    timeline: <TimelinePanel plan={plan} onChange={change} />,
    vendors: <VendorsPanel plan={plan} onChange={change} />,
    ideas: <IdeasPanel plan={plan} onChange={change} />,
  };

  return (
    <main id="main" className={`container ${styles.page}`} lang={plan.brief.language}>
      <PlanHeader plan={plan} saveState={saveState} />
      <StarterNotice plan={plan} starter={starter} onRedrafted={save} />
      <div className={styles.workspace}>
        <div className={styles.main}>
          <Tabs active={tab} onChange={setTab} />
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className={styles.panel}
          >
            {panels[tab]}
          </div>
        </div>
        <CoPlanner plan={plan} onChange={change} question={question} />
      </div>
    </main>
  );
}
