"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlanActions, usePlanList } from "@/components/app/usePlans";
import type { Plan } from "@/lib/domain/schema";
import { BudgetPanel } from "./BudgetPanel";
import type { ChangePlan } from "./change-plan";
import { CoPlanner } from "./CoPlanner";
import { IdeasPanel } from "./IdeasPanel";
import styles from "./PlanDashboard.module.css";
import { PlanHeader } from "./PlanHeader";
import { StarterNotice } from "./StarterNotice";
import { Tabs, type TabId } from "./Tabs";
import { TimelinePanel } from "./TimelinePanel";
import { useCoPlannerChat } from "./useCoPlannerChat";
import { VendorsPanel } from "./VendorsPanel";

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
function Workspace({ plan, starter }: { plan: Plan; starter: boolean }) {
  const { apply, save, saveState } = usePlanActions();
  const [tab, setTab] = useState<TabId>("budget");
  const chat = useCoPlannerChat(plan);

  const change: ChangePlan = (...changes) => {
    try {
      apply(plan, ...changes);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "That change couldn't be applied.";
    }
  };
  const ask = (text: string) => void chat.send(text);
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
            tabIndex={0}
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className={styles.panel}
          >
            {panels[tab]}
          </div>
        </div>
        <CoPlanner plan={plan} onChange={change} chat={chat} />
      </div>
    </main>
  );
}

/** Opens a saved plan by id, explaining what to do when it isn't on this device. */
export function PlanDashboard({ id, starter }: { id: string; starter: boolean }) {
  const plans = usePlanList();
  if (plans === null) return <Loading />;
  const plan = plans.find((p) => p.id === id);
  return plan ? <Workspace plan={plan} starter={starter} /> : <NotOnDevice />;
}
