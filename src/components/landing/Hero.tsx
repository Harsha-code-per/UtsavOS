import styles from "./Hero.module.css";
import { HeroBrief } from "./HeroBrief";
import { PlanPreview } from "./PlanPreview";

const HEADLINE = ["Every celebration,", "beautifully", "choreographed."];

/** Headline, one-line brief input and an example plan. */
export function Hero() {
  return (
    <section className={`container ${styles.hero}`} aria-labelledby="hero-title">
      <p className={styles.watermark} aria-hidden="true" lang="hi">
        उत्सव
      </p>
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>An AI celebration planner, powered by Gemini</p>
        <h1 id="hero-title" className={styles.title}>
          {HEADLINE.map((line) => (
            <span key={line} className={styles.line}>
              <span>{line}</span>
            </span>
          ))}
        </h1>
        <p className={styles.lead}>
          Weddings, birthdays and community events. Describe yours in a sentence and UtsavOS drafts
          the budget, timeline, vendor checklist and ideas, then refines them with you, in your
          language.
        </p>
        <HeroBrief />
      </div>
      <PlanPreview />
    </section>
  );
}
