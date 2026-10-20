"use client";

import { useState } from "react";
import { summarizeBudget } from "@/lib/domain/budget";
import { formatMoney } from "@/lib/domain/format";
import type { Plan } from "@/lib/domain/schema";
import type { ChangePlan } from "./PlanDashboard";
import styles from "./dashboard.module.css";

interface Props {
  plan: Plan;
  onChange: ChangePlan;
  onAsk(question: string): void;
}

export function BudgetPanel({ plan, onChange, onAsk }: Props) {
  const money = (n: number) => formatMoney(n, plan.brief.currency);
  const summary = summarizeBudget(plan.budget);
  const [category, setCategory] = useState(plan.budget[0]!.id);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function logSpend(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(/[^\d]/g, ""));
    if (!value) return setResult({ ok: false, text: "Enter the amount you spent." });
    const error = onChange({ op: "logSpend", id: category, amount: value });
    const name = plan.budget.find((l) => l.id === category)?.category;
    setResult(
      error ? { ok: false, text: error } : { ok: true, text: `Logged ${money(value)} on ${name}.` },
    );
    if (!error) setAmount("");
  }

  return (
    <div className={styles.stack}>
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

      {summary.overruns.length > 0 && (
        <div className={styles.alert}>
          <p>
            {summary.overruns.map((o) => `${o.category} is over by ${money(o.over)}`).join(". ")}.
          </p>
          <button
            type="button"
            className="btn btn-ink btn-small"
            onClick={() =>
              onAsk(
                `${summary.overruns.map((o) => `${o.category} is over by ${money(o.over)}`).join(", ")}. Rebalance my budget without changing the total.`,
              )
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
            {plan.budget.map((line) => {
              const pct = line.allocated ? Math.round((line.spent / line.allocated) * 100) : 0;
              const over = line.spent > line.allocated;
              return (
                <tr key={line.id} data-over={over ? "" : undefined}>
                  <th scope="row">{line.category}</th>
                  <td>{money(line.allocated)}</td>
                  <td>{money(line.spent)}</td>
                  <td>
                    <span className={styles.usage}>
                      <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                        <rect width="100" height="8" rx="4" className={styles.track} />
                        <rect
                          width={Math.min(pct, 100)}
                          height="8"
                          rx="4"
                          className={styles.fill}
                        />
                      </svg>
                      <span>
                        {over ? `Over by ${money(line.spent - line.allocated)}` : `${pct}%`}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form className={styles.inlineForm} onSubmit={logSpend}>
        <h3 className={styles.formTitle}>Log a payment</h3>
        <div className="field">
          <label htmlFor="spend-category">Category</label>
          <select
            id="spend-category"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {plan.budget.map((l) => (
              <option key={l.id} value={l.id}>
                {l.category}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="spend-amount">Amount ({plan.brief.currency})</label>
          <input
            id="spend-amount"
            className="input"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-ink">
          Log payment
        </button>
        <p className={styles.formResult} role="status" data-ok={result?.ok ? "" : undefined}>
          {result?.text}
        </p>
      </form>
    </div>
  );
}
