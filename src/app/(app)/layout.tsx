import Link from "next/link";
import { AuthButton } from "@/components/app/AuthButton";
import { AuthProvider } from "@/components/app/AuthProvider";
import { Logo } from "@/components/brand/Logo";
import styles from "./app.module.css";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthProvider>
      <header className={styles.bar}>
        <div className={`container ${styles.barInner}`}>
          <Logo />
          <nav aria-label="App" className={styles.nav}>
            <Link href="/plans">My plans</Link>
            <Link href="/plan/new">New plan</Link>
            <AuthButton />
          </nav>
        </div>
      </header>
      {children}
    </AuthProvider>
  );
}
