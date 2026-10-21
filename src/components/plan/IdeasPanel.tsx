"use client";

import { useState } from "react";
import type { IdeaDraft, IdeasResult } from "@/lib/ai/types";
import { api, errorMessage } from "@/lib/api/client";
import type { Plan } from "@/lib/domain/schema";
import type { ChangePlan } from "./change-plan";
import styles from "./IdeasPanel.module.css";
import panel from "./panel.module.css";

const KIND_LABEL: Record<IdeaDraft["kind"], string> = {
  theme: "Theme",
  decor: "Decor",
  menu: "Menu",
  activity: "Activity",
  gift: "Gift",
};

function IdeaCard({ idea, children }: { idea: IdeaDraft; children?: React.ReactNode }) {
  return (
    <li className={styles.idea} data-kind={idea.kind}>
      <p className={styles.ideaKind}>{KIND_LABEL[idea.kind]}</p>
      <h3>{idea.title}</h3>
      <p>{idea.description}</p>
      {children}
    </li>
  );
}

function Sources({ sources }: { sources: IdeasResult["sources"] }) {
  if (!sources.length) return null;
  return (
    <div className={styles.sources}>
      <h3>Sources from Google Search</h3>
      <ul>
        {sources.map((s) => (
          <li key={s.uri}>
            <a href={s.uri} target="_blank" rel="noopener noreferrer">
              {s.title}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fetches fresh local ideas from Gemini; each one can be added to the plan. */
function FreshIdeas({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  const [fresh, setFresh] = useState<IdeasResult | null>(null);
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [added, setAdded] = useState<string[]>([]);

  async function getIdeas() {
    setState({ busy: true });
    try {
      setFresh(await api.ideas(plan.brief));
      setAdded([]);
      setState({ busy: false });
    } catch (e) {
      setState({ busy: false, error: errorMessage(e) });
    }
  }

  function add(idea: IdeaDraft) {
    const error = onChange({ op: "addIdea", ...idea });
    if (error) setState({ busy: false, error });
    else setAdded((list) => [...list, idea.title]);
  }

  return (
    <section className={styles.fresh} aria-labelledby="fresh-title">
      <div className={panel.panelHead}>
        <h2 id="fresh-title" className={panel.panelTitle}>
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
        Gemini suggests ideas for what&rsquo;s local and in season, using Google Search when it can.
        Add the ones you like to the plan.
      </p>
      {state.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      {fresh && (
        <>
          <ul className={styles.ideas}>
            {fresh.ideas.map((idea) => (
              <IdeaCard key={idea.title} idea={idea}>
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  disabled={added.includes(idea.title)}
                  onClick={() => add(idea)}
                >
                  {added.includes(idea.title) ? "Added to plan" : "Add to plan"}
                </button>
              </IdeaCard>
            ))}
          </ul>
          <Sources sources={fresh.sources} />
        </>
      )}
    </section>
  );
}

/** The plan's ideas, plus fresh suggestions on request. */
export function IdeasPanel({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  return (
    <div className={panel.stack}>
      <h2 className="visually-hidden">Ideas in your plan</h2>
      <ul className={styles.ideas}>
        {plan.ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </ul>
      <FreshIdeas plan={plan} onChange={onChange} />
    </div>
  );
}
