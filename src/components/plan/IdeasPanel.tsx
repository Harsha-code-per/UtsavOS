"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import type { IdeaDraft, Source } from "@/lib/ai/planner";
import type { Plan } from "@/lib/domain/schema";
import type { ChangePlan } from "./PlanDashboard";
import styles from "./dashboard.module.css";

const KIND_LABEL: Record<IdeaDraft["kind"], string> = {
  theme: "Theme",
  decor: "Decor",
  menu: "Menu",
  activity: "Activity",
  gift: "Gift",
};

export function IdeasPanel({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  const [fresh, setFresh] = useState<{ ideas: IdeaDraft[]; sources: Source[] } | null>(null);
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [added, setAdded] = useState<string[]>([]);

  async function getIdeas() {
    setState({ busy: true });
    try {
      setFresh(await api.ideas(plan.brief));
      setAdded([]);
      setState({ busy: false });
    } catch (e) {
      setState({ busy: false, error: (e as Error).message });
    }
  }

  return (
    <div className={styles.stack}>
      <ul className={styles.ideas}>
        {plan.ideas.map((idea) => (
          <li key={idea.id} className={styles.idea} data-kind={idea.kind}>
            <p className={styles.ideaKind}>{KIND_LABEL[idea.kind]}</p>
            <h3>{idea.title}</h3>
            <p>{idea.description}</p>
          </li>
        ))}
      </ul>

      <section className={styles.fresh} aria-labelledby="fresh-title">
        <div className={styles.panelHead}>
          <h2 id="fresh-title" className={styles.panelTitle}>
            Fresh ideas for {plan.brief.city}
          </h2>
          <button
            type="button"
            className="btn btn-primary btn-small"
            disabled={state.busy}
            onClick={() => void getIdeas()}
          >
            {state.busy ? "Searching…" : fresh ? "Get more ideas" : "Get local ideas"}
          </button>
        </div>
        <p className="field-hint">
          Gemini searches Google for what&rsquo;s local and in season, then suggests ideas you can
          add to the plan.
        </p>
        <p role="status" className={styles.formResult}>
          {state.error}
        </p>
        {fresh && (
          <>
            <ul className={styles.ideas}>
              {fresh.ideas.map((idea) => {
                const isAdded = added.includes(idea.title);
                return (
                  <li key={idea.title} className={styles.idea} data-kind={idea.kind}>
                    <p className={styles.ideaKind}>{KIND_LABEL[idea.kind]}</p>
                    <h3>{idea.title}</h3>
                    <p>{idea.description}</p>
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      disabled={isAdded}
                      onClick={() => {
                        const error = onChange({ op: "addIdea", ...idea });
                        if (error) setState({ busy: false, error });
                        else setAdded((a) => [...a, idea.title]);
                      }}
                    >
                      {isAdded ? "Added to plan" : "Add to plan"}
                    </button>
                  </li>
                );
              })}
            </ul>
            {fresh.sources.length > 0 && (
              <div className={styles.sources}>
                <h3>Sources from Google Search</h3>
                <ul>
                  {fresh.sources.map((s) => (
                    <li key={s.uri}>
                      <a href={s.uri} target="_blank" rel="noopener noreferrer">
                        {s.title}
                        <span className="visually-hidden"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
