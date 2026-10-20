import { useState } from "react";
import { LANGUAGES, type Brief } from "@/lib/domain/schema";
import { TRADITIONS } from "@/lib/domain/traditions";
import { DIETS, addTradition, toggleTradition } from "./brief-form";
import styles from "./BriefWizard.module.css";
import type { StepProps } from "./step-props";

interface PickerProps {
  type: Brief["type"];
  selected: string[];
  onChange: (traditions: string[]) => void;
}

/** Suggested traditions for the event type as toggle chips, plus free-text additions. */
function TraditionPicker({ type, selected, onChange }: PickerProps) {
  const [custom, setCustom] = useState("");
  const options = [...new Set([...TRADITIONS[type], ...selected])];
  const addCustom = () => {
    onChange(addTradition(selected, custom));
    setCustom("");
  };

  return (
    <>
      <div className={styles.chips} role="group" aria-label="Traditions">
        {options.map((t) => (
          <button
            key={t}
            type="button"
            className="chip"
            aria-pressed={selected.includes(t)}
            onClick={() => onChange(toggleTradition(selected, t))}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={styles.addTradition}>
        <label htmlFor="custom-tradition" className="visually-hidden">
          Add your own tradition
        </label>
        <input
          id="custom-tradition"
          className="input"
          placeholder="Add your own, like Annaprashan"
          maxLength={40}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            addCustom();
          }}
        />
        <button type="button" className="btn btn-outline btn-small" onClick={addCustom}>
          Add
        </button>
      </div>
    </>
  );
}

function StyleFields({ form, set, fieldProps }: Pick<StepProps, "form" | "set" | "fieldProps">) {
  return (
    <div className={styles.grid}>
      <div className={`field ${styles.span2}`}>
        <label htmlFor="brief-vibe">Vibe</label>
        <input
          className="input"
          {...fieldProps("vibe")}
          value={form.vibe}
          maxLength={200}
          placeholder="Marigolds and moonlight, intimate, lots of music"
          onChange={(e) => set("vibe", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="brief-diet">Food</label>
        <select
          className="input"
          {...fieldProps("diet")}
          value={form.diet}
          onChange={(e) => set("diet", e.target.value)}
        >
          {[...new Set([...DIETS, form.diet])].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="brief-language">Plan language</label>
        <select
          className="input"
          {...fieldProps("language")}
          value={form.language}
          onChange={(e) => set("language", e.target.value as Brief["language"])}
        >
          {Object.entries(LANGUAGES).map(([code, label]) => (
            <option key={code} value={code} lang={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Step 2: traditions, vibe, food and the plan's language. */
export function StyleStep({
  form,
  set,
  fieldProps,
  headingRef,
  submitError,
  onBack,
}: StepProps & { submitError: string | null; onBack: () => void }) {
  return (
    <>
      <h2 id="step-title" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
        Traditions and moments to plan for
      </h2>
      <p className="field-hint">
        Each one becomes timeline tasks, vendors and budget lines. Pick all that apply.
      </p>
      <TraditionPicker
        type={form.type}
        selected={form.traditions}
        onChange={(t) => set("traditions", t)}
      />
      <StyleFields form={form} set={set} fieldProps={fieldProps} />
      {submitError && (
        <p role="alert" className={styles.submitError}>
          {submitError}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className="btn btn-outline" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn btn-primary">
          Generate my plan
        </button>
      </div>
    </>
  );
}
