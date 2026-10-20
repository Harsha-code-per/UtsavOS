import { ClosingCta } from "@/components/landing/ClosingCta";
import { CoPlannerShowcase } from "@/components/landing/CoPlannerShowcase";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { SentenceDemo } from "@/components/landing/SentenceDemo";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.night}>
        <LandingHeader />
        <main id="main">
          <Hero />
          <SentenceDemo />
        </main>
      </div>
      <Features />
      <HowItWorks />
      <CoPlannerShowcase />
      <ClosingCta />
      <footer className={`container ${styles.footer}`}>
        <p>UtsavOS, built with Gemini, Firebase and Next.js for PromptWars Virtual.</p>
        <p>Plans stay on your device until you sign in. Then only you can read them.</p>
      </footer>
      <LandingMotion />
    </div>
  );
}
