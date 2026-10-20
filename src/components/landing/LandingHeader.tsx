import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Toran } from "@/components/brand/Toran";
import styles from "./LandingHeader.module.css";

/** The garland unfurling over the logo and primary navigation. */
export function LandingHeader() {
  return (
    <>
      <Toran unfurl className={styles.toran} />
      <header className={`container ${styles.header}`}>
        <Logo />
        <nav aria-label="Primary" className={styles.nav}>
          <a href="#how">How it works</a>
          <a href="#coplanner">Co-planner</a>
          <Link href="/plans">My plans</Link>
          <Link href="/plan/new" className="btn btn-primary btn-small">
            Plan a celebration
          </Link>
        </nav>
      </header>
    </>
  );
}
