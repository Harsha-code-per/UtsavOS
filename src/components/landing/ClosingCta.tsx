import Link from "next/link";
import styles from "./ClosingCta.module.css";

/** The final call to action. */
export function ClosingCta() {
  return (
    <section className={styles.cta} aria-labelledby="cta-title">
      <div className={`container ${styles.ctaInner}`}>
        <h2 id="cta-title">Your next celebration starts with one sentence.</h2>
        <Link href="/plan/new" className="btn btn-ink">
          Plan a celebration
        </Link>
      </div>
    </section>
  );
}
