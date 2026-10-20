"use client";

import { useEffect, useRef, useState } from "react";
import { TORAN_FLOWERS, Toran } from "@/components/brand/Toran";
import styles from "./GeneratingDialog.module.css";

interface Props {
  /** Stage descriptions, shown in order as the draft progresses. */
  stages: string[];
  /** Set when the plan has arrived: the garland completes before onFinished runs. */
  done: boolean;
  onFinished: () => void;
  onStop: () => void;
}

/** Modal shown while Gemini drafts the plan; the toran lights up as it goes. */
export function GeneratingDialog({ stages, done, onFinished, onStop }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState(0.04);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // One request has no real progress events, so ease toward 92% until it lands.
  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setProgress((p) => p + (0.92 - p) * 0.07), 350);
    return () => clearInterval(timer);
  }, [done]);

  useEffect(() => {
    if (!done) return;
    const finish = setTimeout(onFinished, 700);
    return () => clearTimeout(finish);
  }, [done, onFinished]);

  const shown = done ? 1 : progress;
  const stage = done
    ? "Your plan is ready."
    : stages[Math.min(stages.length - 1, Math.floor(shown * stages.length))];

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="generating-title"
      onCancel={(e) => {
        e.preventDefault();
        onStop();
      }}
    >
      <Toran lit={Math.round(shown * TORAN_FLOWERS)} className={styles.toran} />
      <div className={styles.body}>
        <h2 id="generating-title" className={styles.title}>
          Drafting your plan with Gemini
        </h2>
        <p className={styles.stage} role="status">
          {stage}
        </p>
        <progress className="visually-hidden" max={100} value={Math.round(shown * 100)}>
          {Math.round(shown * 100)}%
        </progress>
        {!done && (
          <button type="button" className="btn btn-outline btn-small" onClick={onStop}>
            Stop
          </button>
        )}
      </div>
    </dialog>
  );
}
