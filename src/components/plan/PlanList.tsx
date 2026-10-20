"use client";

import Link from "next/link";
import { localToday } from "@/lib/api/client";
import { formatDate } from "@/lib/domain/format";
import { daysUntil } from "@/lib/domain/timeline";
import { usePlanActions, usePlanList } from "@/lib/store/usePlans";
import { useAuth } from "@/components/app/AuthProvider";
import styles from "./PlanList.module.css";

export function PlanList() {
  const plans = usePlanList();
  const { remove } = usePlanActions();
  const { status } = useAuth();

  return (
    <main id="main" className={`container ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>My plans</h1>
        <Link href="/plan/new" className="btn btn-primary">
          Plan a celebration
        </Link>
      </div>

      {plans === null ? (
        <p role="status">Loading your plans…</p>
      ) : plans.length === 0 ? (
        <div className={styles.empty}>
          <p>No plans yet. Describe your celebration and Gemini will draft the first one.</p>
          {status === "signedOut" && (
            <p className="field-hint">
              Planned on another device? Sign in to bring those plans here.
            </p>
          )}
        </div>
      ) : (
        <ul className={styles.list}>
          {plans.map((plan) => {
            const days = daysUntil(plan.brief.date, localToday());
            return (
              <li key={plan.id} className={styles.item}>
                <Link href={`/plan/${plan.id}`} className={styles.link}>
                  <span className={styles.name} lang={plan.brief.language}>
                    {plan.brief.name}
                  </span>
                  <span className={styles.meta}>
                    {plan.brief.city}, {formatDate(plan.brief.date)}
                  </span>
                  <span className={styles.days}>
                    {days >= 0 ? `${days} days to go` : "Celebrated"}
                  </span>
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  aria-label={`Delete ${plan.brief.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete “${plan.brief.name}”? This can't be undone.`)) {
                      void remove(plan.id);
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
