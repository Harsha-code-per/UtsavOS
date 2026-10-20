"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { ChatMessage } from "@/lib/ai/planner";
import { describeChange } from "@/lib/domain/format";
import type { Plan, PlanChange } from "@/lib/domain/schema";
import type { ChangePlan } from "./PlanDashboard";
import styles from "./dashboard.module.css";

interface Turn extends ChatMessage {
  changes?: PlanChange[];
  outcome?: "applied" | "dismissed" | string;
}

const SPEECH_LANG: Record<Plan["brief"]["language"], string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  te: "te-IN",
  ta: "ta-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
};

const SUGGESTIONS: Record<Plan["brief"]["type"], string[]> = {
  wedding: ["What's due this week?", "Suggest songs for the sangeet", "Where can we save money?"],
  birthday: ["What's due this week?", "Ideas for games by age", "Where can we save money?"],
  community: ["What's due this week?", "Plan the volunteer rota", "Where can we save money?"],
  festival: ["What's due this week?", "Easy sweets to make at home", "Where can we save money?"],
};

interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
}

function createRecognition(): Recognition | null {
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

interface Props {
  plan: Plan;
  onChange: ChangePlan;
  /** A question sent from elsewhere on the page (e.g. "rebalance" on the budget). */
  question: { text: string; key: number } | null;
}

export function CoPlanner({ plan, onChange, question }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const planRef = useRef(plan);
  const turnsRef = useRef(turns);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    planRef.current = plan;
    turnsRef.current = turns;
  });

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message) return;
    const history: Turn[] = [...turnsRef.current, { role: "user", text: message }];
    setTurns(history);
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const { reply, changes } = await api.chat(
        planRef.current,
        history.slice(-12).map(({ role, text }) => ({ role, text })),
      );
      setTurns((t) => [...t, { role: "model", text: reply, changes }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (question) void Promise.resolve().then(() => send(question.text));
  }, [question, send]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, busy]);

  function settle(index: number, outcome: Turn["outcome"]) {
    setTurns((t) => t.map((turn, i) => (i === index ? { ...turn, outcome } : turn)));
  }

  function listen() {
    const recognition = createRecognition();
    if (!recognition) {
      setError("Voice input isn't available in this browser. Type your message instead.");
      return;
    }
    recognition.lang = SPEECH_LANG[plan.brief.language];
    recognition.interimResults = false;
    recognition.onresult = (e) => setInput(e.results[0]?.[0]?.transcript ?? "");
    recognition.onerror = () =>
      setError("Couldn't hear that. Check microphone access and try again.");
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

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
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? styles.you : styles.them}>
            <p>{turn.text}</p>
            {turn.changes && turn.changes.length > 0 && (
              <div className={styles.proposal}>
                <ul>
                  {turn.changes.map((c, j) => (
                    <li key={j}>{describeChange(c, plan)}</li>
                  ))}
                </ul>
                {!turn.outcome ? (
                  <div className={styles.proposalActions}>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={() => {
                        const problem = onChange(...turn.changes!);
                        settle(i, problem ?? "applied");
                      }}
                    >
                      Apply{" "}
                      {turn.changes.length === 1 ? "change" : `${turn.changes.length} changes`}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() => settle(i, "dismissed")}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <p
                    className={styles.outcome}
                    data-ok={turn.outcome === "applied" ? "" : undefined}
                  >
                    {turn.outcome === "applied"
                      ? "Applied. Your plan is updated."
                      : turn.outcome === "dismissed"
                        ? "Dismissed."
                        : `Couldn't apply: ${turn.outcome}`}
                  </p>
                )}
              </div>
            )}
          </div>
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
          <button key={s} type="button" disabled={busy} onClick={() => void send(s)}>
            {s}
          </button>
        ))}
      </div>

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="coplanner-input" className="visually-hidden">
          Message the co-planner
        </label>
        <input
          id="coplanner-input"
          value={input}
          maxLength={2000}
          autoComplete="off"
          placeholder="Ask in any language…"
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="button"
          className={styles.iconButton}
          aria-label={listening ? "Listening…" : "Speak your message"}
          aria-pressed={listening}
          onClick={listen}
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
          disabled={busy || !input.trim()}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M3 10h13M11 5l5 5-5 5" />
          </svg>
        </button>
      </form>
    </aside>
  );
}
