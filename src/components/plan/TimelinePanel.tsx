"use client";

import { localToday } from "@/lib/api/client";
import { formatDate } from "@/lib/domain/format";
import { googleCalendarUrl, planToIcs } from "@/lib/domain/ics";
import type { Milestone, Plan } from "@/lib/domain/schema";
import { slugify } from "@/lib/domain/slug";
import { daysUntil } from "@/lib/domain/timeline";
import { AddTaskForm } from "./AddTaskForm";
import type { ChangePlan } from "./PlanDashboard";
import panel from "./panel.module.css";
import styles from "./TimelinePanel.module.css";

const DUE_SOON_DAYS = 7;

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

function dueState(milestone: Milestone, today: string) {
  if (milestone.done) return "done";
  const days = daysUntil(milestone.due, today);
  if (days < 0) return "overdue";
  return days <= DUE_SOON_DAYS ? "soon" : "later";
}

const DUE_PREFIX = { overdue: "Overdue, ", soon: "This week, ", done: "", later: "" };

function MilestoneItem({
  milestone,
  plan,
  onChange,
}: {
  milestone: Milestone;
  plan: Plan;
  onChange: ChangePlan;
}) {
  const state = dueState(milestone, localToday());
  return (
    <li data-state={state}>
      <input
        type="checkbox"
        id={`m-${milestone.id}`}
        checked={milestone.done}
        onChange={() => onChange({ op: "toggleMilestone", id: milestone.id })}
      />
      <label htmlFor={`m-${milestone.id}`}>{milestone.title}</label>
      <span className={styles.due}>
        {DUE_PREFIX[state]}
        <time dateTime={milestone.due}>{formatDate(milestone.due)}</time>
      </span>
      <a
        className={styles.calLink}
        href={googleCalendarUrl({
          title: milestone.title,
          date: milestone.due,
          location: plan.brief.city,
        })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Add “${milestone.title}” to Google Calendar (opens in a new tab)`}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2.5" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3M10 10.5v4M8 12.5h4" />
        </svg>
      </a>
    </li>
  );
}

const TIME = /^\d{2}:\d{2}$/;

function RunSheet({ plan }: { plan: Plan }) {
  if (!plan.runSheet.length) return null;
  return (
    <section className={styles.runSheet} aria-labelledby="run-title">
      <h3 id="run-title">Run sheet for {formatDate(plan.brief.date)}</h3>
      <ol>
        {plan.runSheet.map((item) => (
          <li key={`${item.time}-${item.title}`}>
            <time dateTime={TIME.test(item.time) ? `${plan.brief.date}T${item.time}` : undefined}>
              {item.time}
            </time>
            {item.title}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Countdown milestones, calendar export, custom tasks and the day's run sheet. */
export function TimelinePanel({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  return (
    <div className={panel.stack}>
      <div className={panel.panelHead}>
        <h2 className={panel.panelTitle}>Countdown to {formatDate(plan.brief.date)}</h2>
        <button type="button" className="btn btn-ink btn-small" onClick={() => downloadIcs(plan)}>
          Download calendar (.ics)
        </button>
      </div>
      <ol className={styles.milestones}>
        {plan.milestones.map((m) => (
          <MilestoneItem key={m.id} milestone={m} plan={plan} onChange={onChange} />
        ))}
      </ol>
      <AddTaskForm plan={plan} onChange={onChange} />
      <RunSheet plan={plan} />
    </div>
  );
}
