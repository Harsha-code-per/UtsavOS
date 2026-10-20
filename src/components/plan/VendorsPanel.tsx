"use client";

import { useState } from "react";
import { formatMoney, parseAmount } from "@/lib/domain/format";
import { VENDOR_STATUSES, VendorSchema, type Plan, type Vendor } from "@/lib/domain/schema";
import { FormStatus, failure, outcome, type Status } from "./FormStatus";
import type { ChangePlan } from "./change-plan";
import panel from "./panel.module.css";
import styles from "./VendorsPanel.module.css";

const STATUS_LABEL: Record<Vendor["status"], string> = {
  todo: "To do",
  contacted: "Contacted",
  booked: "Booked",
};

interface RowProps {
  vendor: Vendor;
  plan: Plan;
  onChange: ChangePlan;
}

function QuoteForm({
  vendor,
  plan,
  onChange,
  onStatus,
}: RowProps & { onStatus: (s: Status) => void }) {
  const [quote, setQuote] = useState(vendor.quote?.toString() ?? "");

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = quote.trim() ? parseAmount(quote) : null;
    const error = onChange({
      op: "setVendorStatus",
      id: vendor.id,
      status: vendor.status,
      quote: value,
    });
    onStatus(
      outcome(
        error,
        value ? `Quote saved: ${formatMoney(value, plan.brief.currency)}.` : "Quote cleared.",
      ),
    );
  }

  return (
    <form className={styles.quoteForm} onSubmit={submit}>
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
  );
}

function VendorRow({ vendor, plan, onChange }: RowProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const changeStatus = (next: Vendor["status"]) => {
    const error = onChange({ op: "setVendorStatus", id: vendor.id, status: next });
    setStatus(error ? failure(error) : null);
  };

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
            onChange={(e) => changeStatus(VendorSchema.shape.status.parse(e.target.value))}
          >
            {VENDOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <QuoteForm vendor={vendor} plan={plan} onChange={onChange} onStatus={setStatus} />
      </div>
      <FormStatus status={status} />
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

function AddVendorForm({ onChange }: { onChange: ChangePlan }) {
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = category.trim();
    if (!name) {
      setStatus(failure("Name the kind of vendor, like Mehendi artist."));
      return;
    }
    const error = onChange({ op: "addVendor", category: name, questions: [] });
    setStatus(outcome(error, `Added ${name}.`));
    if (!error) setCategory("");
  }

  return (
    <form className={panel.inlineForm} onSubmit={submit}>
      <h3 className={panel.formTitle}>Add a vendor</h3>
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
      <FormStatus status={status} />
    </form>
  );
}

/** Every vendor with its booking status, quote and the questions to ask. */
export function VendorsPanel({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  return (
    <div className={panel.stack}>
      <h2 className="visually-hidden">Vendor checklist</h2>
      <ul className={styles.vendors}>
        {plan.vendors.map((v) => (
          <VendorRow key={v.id} vendor={v} plan={plan} onChange={onChange} />
        ))}
      </ul>
      <AddVendorForm onChange={onChange} />
    </div>
  );
}
