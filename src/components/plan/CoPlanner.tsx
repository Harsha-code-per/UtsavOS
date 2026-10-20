"use client";

import { useEffect, useRef, useState } from "react";
import type { Plan } from "@/lib/domain/schema";
import { ChatTurn } from "./ChatTurn";
import type { ChangePlan } from "./PlanDashboard";
import styles from "./CoPlanner.module.css";
import { useCoPlannerChat } from "./useCoPlannerChat";
import { useSpeechInput } from "./useSpeechInput";

const SUGGESTIONS: Record<Plan["brief"]["type"], string[]> = {
  wedding: ["What's due this week?", "Suggest songs for the sangeet", "Where can we save money?"],
  birthday: ["What's due this week?", "Ideas for games by age", "Where can we save money?"],
  community: ["What's due this week?", "Plan the volunteer rota", "Where can we save money?"],
  festival: ["What's due this week?", "Easy sweets to make at home", "Where can we save money?"],
};

interface ComposerProps {
  value: string;
  busy: boolean;
  listening: boolean;
  onChange: (value: string) => void;
  onListen: () => void;
  onSubmit: () => void;
}

/** Message box with voice input and send. */
function Composer({ value, busy, listening, onChange, onListen, onSubmit }: ComposerProps) {
  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="coplanner-input" className="visually-hidden">
        Message the co-planner
      </label>
      <input
        id="coplanner-input"
        value={value}
        maxLength={2000}
        autoComplete="off"
        placeholder="Ask in any language…"
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className={styles.iconButton}
        aria-label={listening ? "Listening…" : "Speak your message"}
        aria-pressed={listening}
        onClick={onListen}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect x="7" y="2" width="6" height="10" rx="3" />
          <path d="M4 9.5a6 6 0 0 0 12 0M10 15.5V18" />
        </svg>
      </button>
      <button
        type="submit"
        className={styles.sendButton}
        aria-label="Send message"
        disabled={busy || !value.trim()}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="M3 10h13M11 5l5 5-5 5" />
        </svg>
      </button>
    </form>
  );
}

interface Props {
  plan: Plan;
  onChange: ChangePlan;
  /** A question sent from elsewhere on the page (e.g. "rebalance" on the budget). */
  question: { text: string; key: number } | null;
}

/** Chat with Gemini about the plan; proposed changes need the person's approval. */
export function CoPlanner({ plan, onChange, question }: Props) {
  const { turns, busy, error, setError, send, settle } = useCoPlannerChat(plan);
  const [input, setInput] = useState("");
  const speech = useSpeechInput({
    language: plan.brief.language,
    onText: setInput,
    onError: setError,
  });
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (question) void Promise.resolve().then(() => send(question.text));
  }, [question, send]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, busy]);

  const submit = (text: string) => {
    setInput("");
    void send(text);
  };

  return (
    <aside id="coplanner" className={styles.coplanner} aria-labelledby="coplanner-title">
      <div className={styles.coHead}>
        <h2 id="coplanner-title">Co-planner</h2>
        <span>Gemini</span>
      </div>

      <div
        ref={logRef}
        className={styles.log}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {turns.length === 0 && (
          <p className={styles.hello}>
            Ask anything about this plan, in any language. I can move budget, add tasks, update
            vendors and suggest ideas. You approve every change.
          </p>
        )}
        {turns.map((turn) => (
          <ChatTurn
            key={turn.id}
            turn={turn}
            plan={plan}
            onApply={(changes) => {
              const problem = onChange(...changes);
              settle(turn.id, problem ? { kind: "failed", reason: problem } : { kind: "applied" });
            }}
            onDismiss={() => settle(turn.id, { kind: "dismissed" })}
          />
        ))}
        {busy && (
          <p className={styles.thinking} role="status">
            Thinking…
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className={styles.coError}>
          {error}
        </p>
      )}

      <div className={styles.suggestions} aria-label="Suggested questions" role="group">
        {SUGGESTIONS[plan.brief.type].map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => submit(s)}>
            {s}
          </button>
        ))}
      </div>

      <Composer
        value={input}
        busy={busy}
        listening={speech.listening}
        onChange={setInput}
        onListen={speech.listen}
        onSubmit={() => submit(input)}
      />
    </aside>
  );
}
