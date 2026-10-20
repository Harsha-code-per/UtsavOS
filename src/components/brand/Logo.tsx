import Link from "next/link";
import styles from "./Logo.module.css";

/** Diya mark and wordmark; links home. */
export function Logo({ tone = "night" }: { tone?: "night" | "ivory" }) {
  return (
    <Link href="/" className={styles.logo} data-tone={tone}>
      <svg width="30" height="30" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <path
          d="M17 3c3 6 9 9 9 16a9 9 0 0 1-18 0c0-7 6-10 9-16Z"
          className={styles.flame}
          strokeWidth="2.2"
        />
        <path
          d="M17 15c1.5 3 4 4.5 4 7.5a4 4 0 0 1-8 0c0-3 2.5-4.5 4-7.5Z"
          className={styles.wick}
        />
      </svg>
      UtsavOS
    </Link>
  );
}
