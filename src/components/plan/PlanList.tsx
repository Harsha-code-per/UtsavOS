"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/domain/format";
import { daysUntil, localToday } from "@/lib/domain/timeline";
import { usePlanActions, usePlanList } from "@/components/app/usePlans";
import { useAuth } from "@/components/app/AuthProvider";
import styles from "./PlanList.module.css";

/** Delete with an in-page confirmation; focus moves to the choice and back if it's cancelled. */
function DeletePlan({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [asking, setAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const answered = useRef(false);

  useEffect(() => {
    if (asking) confirmRef.current?.focus();
    else if (answered.current) askRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button
        ref={askRef}
        type="button"
        className="btn btn-outline btn-small"
        aria-label={`Delete ${name}`}
        onClick={() => setAsking(true)}
      >
        Delete
      </button>
    );
  }
  const question = `Delete “${name}”? This can't be undone.`;
  return (
    <div role="group" aria-label={question} className={styles.confirm}>
      <span aria-hidden="true">Delete for good?</span>
      <button ref={confirmRef} type="button" className="btn btn-ink btn-small" onClick={onDelete}>
        Delete plan
      </button>
      <button
        type="button"
        className="btn btn-outline btn-small"
        onClick={() => {
          answered.current = true;
          setAsking(false);
        }}
      >
        Keep
      </button>
    </div>
  );
}

/** Every saved plan, newest first, with a link to each dashboard. */
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
                <DeletePlan name={plan.brief.name} onDelete={() => void remove(plan.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
