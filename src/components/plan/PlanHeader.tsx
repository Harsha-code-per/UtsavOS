import { localToday } from "@/lib/api/client";
import { summarizeBudget } from "@/lib/domain/budget";
import { formatDate } from "@/lib/domain/format";
import type { Plan } from "@/lib/domain/schema";
import { daysUntil } from "@/lib/domain/timeline";
import type { SaveState } from "@/lib/store/usePlans";
import styles from "./PlanDashboard.module.css";

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

/** Event summary, save status and the four headline stats. */
export function PlanHeader({ plan, saveState }: { plan: Plan; saveState: SaveState }) {
  const { brief } = plan;
  const budget = summarizeBudget(plan.budget);
  const days = daysUntil(brief.date, localToday());
  const used = budget.allocated ? Math.round((budget.spent / budget.allocated) * 100) : 0;
  const done = plan.milestones.filter((m) => m.done).length;
  const booked = plan.vendors.filter((v) => v.status === "booked").length;
  const stats = [
    { label: days >= 0 ? "Days to go" : "Days since", value: String(Math.abs(days)) },
    { label: "Budget used", value: `${used}%` },
    { label: "Tasks done", value: `${done}/${plan.milestones.length}` },
    { label: "Vendors booked", value: `${booked}/${plan.vendors.length}` },
  ];

  return (
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
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
