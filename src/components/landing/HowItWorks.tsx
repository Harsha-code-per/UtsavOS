import styles from "./HowItWorks.module.css";
import shared from "./landing.module.css";

const STEPS = [
  {
    title: "Describe it",
    text: "Type your idea in any of ten languages, or fill in the brief yourself.",
  },
  {
    title: "Get a full draft",
    text: "Budget, timeline, vendors and ideas arrive together, shaped by your details.",
  },
  {
    title: "Refine it together",
    text: "Ask the co-planner to move money or add a task. You approve every change.",
  },
  {
    title: "Run the day",
    text: "Export the timeline to Google Calendar, with the day's run sheet ready to follow.",
  },
];

/** Four numbered steps from sentence to finished plan. */
export function HowItWorks() {
  return (
    <section id="how" className={styles.how} aria-labelledby="how-title">
      <div className={`container ${styles.howInner}`}>
        <h2 id="how-title" className={shared.sectionTitle}>
          From a sentence to a plan you can run.
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
