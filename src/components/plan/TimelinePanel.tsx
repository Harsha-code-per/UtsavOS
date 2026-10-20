"use client";

import { useState } from "react";
import { localToday } from "@/lib/api/client";
import { formatDate } from "@/lib/domain/format";
import { googleCalendarUrl, planToIcs } from "@/lib/domain/ics";
import type { Plan } from "@/lib/domain/schema";
import { slugify } from "@/lib/domain/slug";
import { daysUntil } from "@/lib/domain/timeline";
import type { ChangePlan } from "./PlanDashboard";
import styles from "./dashboard.module.css";

function downloadIcs(plan: Plan) {
  const url = URL.createObjectURL(
    new Blob([planToIcs(plan, new Date())], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(plan.brief.name) || "utsavos-plan"}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function TimelinePanel({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  const today = localToday();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !due) return setResult({ ok: false, text: "Add a task name and a date." });
    const error = onChange({ op: "addMilestone", title: title.trim(), due });
    setResult(error ? { ok: false, text: error } : { ok: true, text: `Added “${title.trim()}”.` });
    if (!error) setTitle("");
  }

  return (
    <div className={styles.stack}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Countdown to {formatDate(plan.brief.date)}</h2>
        <button type="button" className="btn btn-ink btn-small" onClick={() => downloadIcs(plan)}>
          Download calendar (.ics)
        </button>
      </div>

      <ol className={styles.milestones}>
        {plan.milestones.map((m) => {
          const days = daysUntil(m.due, today);
          const state = m.done ? "done" : days < 0 ? "overdue" : days <= 7 ? "soon" : "later";
          return (
            <li key={m.id} data-state={state}>
              <input
                type="checkbox"
                id={`m-${m.id}`}
                checked={m.done}
                onChange={() => onChange({ op: "toggleMilestone", id: m.id })}
              />
              <label htmlFor={`m-${m.id}`}>{m.title}</label>
              <span className={styles.due}>
                {state === "overdue" ? "Overdue, " : state === "soon" ? "This week, " : ""}
                <time dateTime={m.due}>{formatDate(m.due)}</time>
              </span>
              <a
                className={styles.calLink}
                href={googleCalendarUrl({ title: m.title, date: m.due, location: plan.brief.city })}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Add “${m.title}” to Google Calendar (opens in a new tab)`}
              >
                <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                  <rect x="3" y="4" width="14" height="13" rx="2.5" />
                  <path d="M3 8h14M7 2.5v3M13 2.5v3M10 10.5v4M8 12.5h4" />
                </svg>
              </a>
            </li>
          );
        })}
      </ol>

      <form className={styles.inlineForm} onSubmit={addTask}>
        <h3 className={styles.formTitle}>Add a task</h3>
        <div className="field">
          <label htmlFor="task-title">Task</label>
          <input
            id="task-title"
            className="input"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="task-due">Due</label>
          <input
            id="task-due"
            className="input"
            type="date"
            max={plan.brief.date}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-ink">
          Add task
        </button>
        <p className={styles.formResult} role="status" data-ok={result?.ok ? "" : undefined}>
          {result?.text}
        </p>
      </form>

      {plan.runSheet.length > 0 && (
        <section className={styles.runSheet} aria-labelledby="run-title">
          <h3 id="run-title">Run sheet for {formatDate(plan.brief.date)}</h3>
          <ol>
            {plan.runSheet.map((item) => (
              <li key={`${item.time}-${item.title}`}>
                <time>{item.time}</time>
                {item.title}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
