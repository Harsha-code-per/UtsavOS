"use client";

import Link from "next/link";
import styles from "./status.module.css";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className={styles.page}>
      <div className={`container ${styles.body}`}>
        <h1 className={styles.title}>Something went wrong on this page.</h1>
        <p>Your plans are saved. Try again, and if it keeps happening, reload the page.</p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
