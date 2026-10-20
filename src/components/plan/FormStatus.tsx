import styles from "./FormStatus.module.css";

export interface Status {
  ok: boolean;
  text: string;
}

/** Turns the result of a plan change (an error message, or null) into a status line. */
export const outcome = (error: string | null, success: string): Status =>
  error ? { ok: false, text: error } : { ok: true, text: success };

export const failure = (text: string): Status => ({ ok: false, text });

/** The live result line under a form: success in green, problems in red. */
export function FormStatus({ status }: { status: Status | null }) {
  return (
    <p className={styles.formResult} role="status" data-ok={status?.ok ? "" : undefined}>
      {status?.text}
    </p>
  );
}
