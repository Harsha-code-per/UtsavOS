import Link from "next/link";
import { Toran } from "@/components/brand/Toran";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main id="main" className={styles.page}>
      <Toran lit={9} />
      <div className={`container ${styles.body}`}>
        <h1 className={styles.title}>This page wandered off from the celebration.</h1>
        <p>The link may be old or mistyped. Start a new plan, or open the ones you already have.</p>
        <div className={styles.actions}>
          <Link href="/plan/new" className="btn btn-primary">
            Plan a celebration
          </Link>
          <Link href="/plans" className="btn btn-outline">
            My plans
          </Link>
        </div>
      </div>
    </main>
  );
}
