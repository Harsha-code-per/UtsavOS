"use client";

import { useRef } from "react";
import styles from "./dashboard.module.css";

export const TABS = [
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
  { id: "vendors", label: "Vendor checklist" },
  { id: "ideas", label: "Ideas" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

/** WAI-ARIA tabs: arrow keys, Home and End move between tabs (roving tabindex). */
export function Tabs({ active, onChange }: { active: TabId; onChange(tab: TabId): void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(TABS[next]!.id);
    refs.current[next]?.focus();
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
          aria-controls={`panel-${tab.id}`}
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
