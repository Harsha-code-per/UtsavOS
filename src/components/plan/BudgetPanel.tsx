"use client";

import { summarizeBudget } from "@/lib/domain/budget";
import { formatMoney } from "@/lib/domain/format";
import type { BudgetLine, Plan } from "@/lib/domain/schema";
import { LogPaymentForm } from "./LogPaymentForm";
import type { ChangePlan } from "./change-plan";
import styles from "./BudgetPanel.module.css";
import panel from "./panel.module.css";

interface Props {
  plan: Plan;
  onChange: ChangePlan;
  onAsk: (question: string) => void;
}

function BudgetRow({ line, money }: { line: BudgetLine; money: (n: number) => string }) {
  const pct = line.allocated ? Math.round((line.spent / line.allocated) * 100) : 0;
  const over = line.spent > line.allocated;
  return (
    <tr data-over={over ? "" : undefined}>
      <th scope="row">{line.category}</th>
      <td>{money(line.allocated)}</td>
      <td>{money(line.spent)}</td>
      <td>
        <span className={styles.usage}>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
            <rect width="100" height="8" rx="4" className={styles.track} />
            <rect width={Math.min(pct, 100)} height="8" rx="4" className={styles.fill} />
          </svg>
          <span>{over ? `Over by ${money(line.spent - line.allocated)}` : `${pct}%`}</span>
        </span>
      </td>
    </tr>
  );
}

/** Budget totals, overspend alerts, the per-category table and payment logging. */
export function BudgetPanel({ plan, onChange, onAsk }: Props) {
  const money = (n: number) => formatMoney(n, plan.brief.currency);
  const summary = summarizeBudget(plan.budget);
  const overruns = summary.overruns.map((o) => `${o.category} is over by ${money(o.over)}`);

  return (
    <div className={panel.stack}>
      <dl className={styles.summary}>
        <div>
          <dt>Total budget</dt>
          <dd>{money(summary.allocated)}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>{money(summary.spent)}</dd>
        </div>
        <div>
          <dt>Left</dt>
          <dd data-negative={summary.remaining < 0 ? "" : undefined}>{money(summary.remaining)}</dd>
        </div>
      </dl>

      {overruns.length > 0 && (
        <div className={styles.alert}>
          <p>{overruns.join(". ")}.</p>
          <button
            type="button"
            className="btn btn-ink btn-small"
            onClick={() =>
              onAsk(`${overruns.join(", ")}. Rebalance my budget without changing the total.`)
            }
          >
            Ask the co-planner to rebalance
          </button>
        </div>
      )}

      {/* Scrolls sideways on phones, so it must be focusable for keyboard scrolling. */}
      <div className={styles.tableWrap} role="region" aria-label="Budget by category" tabIndex={0}>
        <table className={styles.table}>
          <caption className="visually-hidden">Budget by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Allocated</th>
              <th scope="col">Spent</th>
              <th scope="col">Used</th>
            </tr>
          </thead>
          <tbody>
            {plan.budget.map((line) => (
              <BudgetRow key={line.id} line={line} money={money} />
            ))}
          </tbody>
        </table>
      </div>

      <LogPaymentForm plan={plan} onChange={onChange} />
    </div>
  );
}
