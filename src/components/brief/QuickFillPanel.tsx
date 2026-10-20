import styles from "./BriefWizard.module.css";
import type { QuickFillStatus } from "./useQuickFill";

interface Props {
  description: string;
  status: QuickFillStatus;
  onDescription: (text: string) => void;
  onRun: () => void;
}

/** Describe the celebration in any language; Gemini fills the form. */
export function QuickFillPanel({ description, status, onDescription, onRun }: Props) {
  return (
    <aside className={styles.side} aria-labelledby="quick-title">
      <h1 className={styles.title}>Tell us about the celebration.</h1>
      <p className={styles.lead}>
        Fill in the brief, or describe it and let Gemini fill it in. You can change anything later.
      </p>
      <form
        className={styles.quick}
        onSubmit={(e) => {
          e.preventDefault();
          onRun();
        }}
      >
        <h2 id="quick-title" className={styles.quickTitle}>
          Quick-fill with AI
        </h2>
        <label htmlFor="describe" className={styles.quickLabel}>
          Describe it in any language
        </label>
        <textarea
          id="describe"
          className={styles.quickInput}
          rows={4}
          maxLength={1000}
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="Beti ka pehla birthday, Pune mein, 60 log, 1.5 lakh budget, jungle theme"
        />
        <button type="submit" className="btn btn-primary" disabled={status.state === "busy"}>
          {status.state === "busy" ? "Reading your description…" : "Fill the form for me"}
        </button>
        <p
          className={styles.quickStatus}
          role="status"
          aria-live="polite"
          data-state={status.state}
        >
          {status.message}
        </p>
      </form>
    </aside>
  );
}
