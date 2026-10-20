"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { putDescription } from "@/lib/store/handoff";
import styles from "./HeroBrief.module.css";

const TYPES = [
  { type: "wedding", label: "Wedding" },
  { type: "birthday", label: "Birthday" },
  { type: "community", label: "Community event" },
  { type: "festival", label: "Festival" },
];

export function HeroBrief() {
  const router = useRouter();
  const [text, setText] = useState("");

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = text.trim();
    if (description) putDescription(description);
    router.push(description ? "/plan/new?from=description" : "/plan/new");
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={submit}>
        <label htmlFor="hero-brief" className="visually-hidden">
          Describe your celebration
        </label>
        <input
          id="hero-brief"
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          autoComplete="off"
          placeholder="A 300-guest Telugu wedding in Hyderabad next February, ₹25 lakh"
        />
        <button type="submit" className="btn btn-primary">
          Draft my plan
        </button>
      </form>
      <nav aria-label="Start from an event type" className={styles.types}>
        <span>Or start from</span>
        {TYPES.map((t) => (
          <Link key={t.type} href={`/plan/new?type=${t.type}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
