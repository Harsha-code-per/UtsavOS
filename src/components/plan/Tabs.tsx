"use client";

import { useRef } from "react";
import styles from "./Tabs.module.css";

export const TABS = [
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
  { id: "vendors", label: "Vendor checklist" },
  { id: "ideas", label: "Ideas" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

const KEY_MOVES: Record<string, (index: number) => number> = {
  ArrowRight: (i) => (i + 1) % TABS.length,
  ArrowLeft: (i) => (i - 1 + TABS.length) % TABS.length,
  Home: () => 0,
  End: () => TABS.length - 1,
};

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

/** WAI-ARIA tabs: arrow keys, Home and End move between tabs (roving tabindex). */
export function Tabs({ active, onChange }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const move = KEY_MOVES[event.key];
    const next = move ? TABS[move(index)] : undefined;
    if (!move || !next) return;
    event.preventDefault();
    onChange(next.id);
    refs.current[TABS.indexOf(next)]?.focus();
  }

  return (
    <div role="tablist" aria-label="Plan sections" className={styles.tabs}>
      {TABS.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={active === tab.id}
          // Only the active panel is rendered, so only its tab points at it.
          aria-controls={active === tab.id ? `panel-${tab.id}` : undefined}
          tabIndex={active === tab.id ? 0 : -1}
          className={styles.tab}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
