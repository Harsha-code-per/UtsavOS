"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/domain/format";
import { VENDOR_STATUSES, type Plan, type Vendor } from "@/lib/domain/schema";
import type { ChangePlan } from "./PlanDashboard";
import styles from "./dashboard.module.css";

const STATUS_LABEL: Record<Vendor["status"], string> = {
  todo: "To do",
  contacted: "Contacted",
  booked: "Booked",
};

function VendorRow({
  vendor,
  plan,
  onChange,
}: {
  vendor: Vendor;
  plan: Plan;
  onChange: ChangePlan;
}) {
  const [quote, setQuote] = useState(vendor.quote?.toString() ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function saveQuote(event: React.FormEvent) {
    event.preventDefault();
    const value = quote.trim() ? Number(quote.replace(/[^\d]/g, "")) : null;
    const error = onChange({
      op: "setVendorStatus",
      id: vendor.id,
      status: vendor.status,
      quote: value,
    });
    setMessage(
      error ??
        (value ? `Quote saved: ${formatMoney(value, plan.brief.currency)}.` : "Quote cleared."),
    );
  }

  return (
    <li className={styles.vendor}>
      <div className={styles.vendorHead}>
        <h3>{vendor.category}</h3>
        <span data-status={vendor.status}>{STATUS_LABEL[vendor.status]}</span>
      </div>
      <div className={styles.vendorControls}>
        <div className="field">
          <label htmlFor={`status-${vendor.id}`}>Status</label>
          <select
            id={`status-${vendor.id}`}
            className="input"
            value={vendor.status}
            onChange={(e) =>
              setMessage(
                onChange({
                  op: "setVendorStatus",
                  id: vendor.id,
                  status: e.target.value as Vendor["status"],
                }),
              )
            }
          >
            {VENDOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <form className={styles.quoteForm} onSubmit={saveQuote}>
          <div className="field">
            <label htmlFor={`quote-${vendor.id}`}>Quote ({plan.brief.currency})</label>
            <input
              id={`quote-${vendor.id}`}
              className="input"
              inputMode="numeric"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-outline btn-small">
            Save quote
          </button>
        </form>
      </div>
      <p className={styles.formResult} role="status">
        {message}
      </p>
      {vendor.questions.length > 0 && (
        <details className={styles.questions}>
          <summary>Questions to ask before you pay an advance</summary>
          <ul>
            {vendor.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export function VendorsPanel({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function addVendor(event: React.FormEvent) {
    event.preventDefault();
    const name = category.trim();
    if (!name)
      return setResult({ ok: false, text: "Name the kind of vendor, like Mehendi artist." });
    const error = onChange({ op: "addVendor", category: name, questions: [] });
    setResult(error ? { ok: false, text: error } : { ok: true, text: `Added ${name}.` });
    if (!error) setCategory("");
  }

  return (
    <div className={styles.stack}>
      <ul className={styles.vendors}>
        {plan.vendors.map((v) => (
          <VendorRow key={v.id} vendor={v} plan={plan} onChange={onChange} />
        ))}
      </ul>
      <form className={styles.inlineForm} onSubmit={addVendor}>
        <h3 className={styles.formTitle}>Add a vendor</h3>
        <div className="field">
          <label htmlFor="vendor-category">Kind of vendor</label>
          <input
            id="vendor-category"
            className="input"
            maxLength={60}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-ink">
          Add vendor
        </button>
        <p className={styles.formResult} role="status" data-ok={result?.ok ? "" : undefined}>
          {result?.text}
        </p>
      </form>
    </div>
  );
}
