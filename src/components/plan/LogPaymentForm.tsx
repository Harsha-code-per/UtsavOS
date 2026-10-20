"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/domain/format";
import type { Plan } from "@/lib/domain/schema";
import { FormStatus, failure, outcome, type Status } from "./FormStatus";
import type { ChangePlan } from "./PlanDashboard";
import panel from "./panel.module.css";

/** Records a payment against one budget category. */
export function LogPaymentForm({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  const [category, setCategory] = useState(plan.budget[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount.replace(/[^\d]/g, ""));
    if (!value) {
      setStatus(failure("Enter the amount you spent."));
      return;
    }
    const error = onChange({ op: "logSpend", id: category, amount: value });
    const name = plan.budget.find((l) => l.id === category)?.category ?? category;
    setStatus(outcome(error, `Logged ${formatMoney(value, plan.brief.currency)} on ${name}.`));
    if (!error) setAmount("");
  }

  return (
    <form className={panel.inlineForm} onSubmit={submit}>
      <h3 className={panel.formTitle}>Log a payment</h3>
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
      <FormStatus status={status} />
    </form>
  );
}
