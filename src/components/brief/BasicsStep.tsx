import { EVENT_TYPE_LABEL, formatMoney, parseAmount } from "@/lib/domain/format";
import { BriefSchema, CURRENCIES, EVENT_TYPES, type Brief } from "@/lib/domain/schema";
import { localToday } from "@/lib/domain/timeline";
import styles from "./BriefWizard.module.css";
import { FieldError } from "./FieldError";
import type { StepProps } from "./step-props";

const TYPE_HINT: Record<Brief["type"], string> = {
  wedding: "Roka to reception",
  birthday: "First to fiftieth",
  community: "Pandals, meetups, drives",
  festival: "Diwali, Eid, Onam, Christmas",
};

/** Event types as native radios, styled as cards (arrow keys work out of the box). */
function EventTypePicker({
  value,
  onChange,
}: {
  value: Brief["type"];
  onChange: (type: Brief["type"]) => void;
}) {
  return (
    <fieldset className={styles.types}>
      <legend className="visually-hidden">Event type</legend>
      {EVENT_TYPES.map((type) => (
        <label key={type} className={styles.typeCard}>
          <input
            type="radio"
            name="type"
            value={type}
            checked={value === type}
            onChange={() => onChange(type)}
          />
          <span className={styles.typeLabel}>{EVENT_TYPE_LABEL[type]}</span>
          <span className={styles.typeHint}>{TYPE_HINT[type]}</span>
        </label>
      ))}
    </fieldset>
  );
}

function BudgetField({ form, set, errors, fieldProps }: Omit<StepProps, "headingRef">) {
  const amount = parseAmount(form.budget);
  return (
    <div className="field">
      <label htmlFor="brief-budget">Total budget</label>
      <div className={styles.money}>
        <label htmlFor="brief-currency" className="visually-hidden">
          Currency
        </label>
        <select
          className="input"
          {...fieldProps("currency")}
          value={form.currency}
          onChange={(e) => set("currency", BriefSchema.shape.currency.parse(e.target.value))}
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="input"
          inputMode="numeric"
          {...fieldProps("budget")}
          value={form.budget}
          onChange={(e) => set("budget", e.target.value)}
        />
      </div>
      {errors.budget ? (
        <FieldError field="budget" errors={errors} />
      ) : (
        amount > 0 && <p className="field-hint">{formatMoney(amount, form.currency)}</p>
      )}
    </div>
  );
}

/** Step 1: event type, name, date, city, guests and budget. */
export function BasicsStep({ form, set, errors, fieldProps, headingRef }: StepProps) {
  return (
    <>
      <h2 id="step-title" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
        What are we celebrating?
      </h2>
      <EventTypePicker
        value={form.type}
        onChange={(type) => {
          set("type", type);
          set("traditions", []);
        }}
      />
      <div className={styles.grid}>
        <div className={`field ${styles.span2}`}>
          <label htmlFor="brief-name">Event name</label>
          <input
            className="input"
            {...fieldProps("name")}
            value={form.name}
            maxLength={80}
            placeholder="Ananya and Rohan's wedding"
            onChange={(e) => set("name", e.target.value)}
          />
          <FieldError field="name" errors={errors} />
        </div>
        <div className="field">
          <label htmlFor="brief-date">Date</label>
          <input
            className="input"
            type="date"
            min={localToday()}
            {...fieldProps("date")}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
          <FieldError field="date" errors={errors} />
        </div>
        <div className="field">
          <label htmlFor="brief-city">City</label>
          <input
            className="input"
            {...fieldProps("city")}
            value={form.city}
            maxLength={60}
            autoComplete="address-level2"
            onChange={(e) => set("city", e.target.value)}
          />
          <FieldError field="city" errors={errors} />
        </div>
        <div className="field">
          <label htmlFor="brief-guests">Guests</label>
          <input
            className="input"
            inputMode="numeric"
            {...fieldProps("guests")}
            value={form.guests}
            onChange={(e) => set("guests", e.target.value)}
          />
          <FieldError field="guests" errors={errors} />
        </div>
        <BudgetField form={form} set={set} errors={errors} fieldProps={fieldProps} />
      </div>
      <div className={styles.actions}>
        <button type="submit" className="btn btn-ink">
          Continue to style
        </button>
      </div>
    </>
  );
}
