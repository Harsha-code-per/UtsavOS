import styles from "./Features.module.css";
import shared from "./landing.module.css";

const BUDGET_LINES = [
  { name: "Venue", used: 93, note: "93% used", over: false },
  { name: "Catering", used: 27, note: "27% used", over: false },
  { name: "Decor", used: 100, note: "Over by ₹40,000", over: true },
];

const TIMELINE = [
  { date: "2026-11-14", label: "14 Nov", task: "Send invitations" },
  { date: "2027-01-31", label: "31 Jan", task: "Final headcount to caterer" },
  { date: "2027-02-14", label: "14 Feb", task: "Pheras at 18:30" },
];

const VENDORS = [
  { name: "Photography", status: "booked", label: "Booked" },
  { name: "Decor", status: "contacted", label: "Contacted" },
  { name: "Mehendi artist", status: "todo", label: "To do" },
];

const IDEAS = [
  "Marigold & moonlight mandap",
  "Irani chai counter at the sangeet",
  "Seed-paper thank-you cards",
];

function BudgetFeature() {
  return (
    <article className={`${styles.feature} ${styles.featureWide}`}>
      <h3>Budgets</h3>
      <p>
        A split sized to your guest count, city and traditions. Log what you spend and overruns show
        up at once, with a rebalance one question away.
      </p>
      <ul className={styles.miniBudget} aria-label="Example budget lines">
        {BUDGET_LINES.map((line) => (
          <li key={line.name} data-over={line.over ? "" : undefined}>
            <span>{line.name}</span>
            <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
              <rect width="100" height="8" rx="4" className={styles.barTrack} />
              <rect width={line.used} height="8" rx="4" className={styles.barFill} />
            </svg>
            <span>{line.note}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function TimelineFeature() {
  return (
    <article className={styles.feature}>
      <h3>Timelines</h3>
      <p>
        Tasks counted back from your date, plus a run sheet for the day itself. Send it all to
        Google Calendar in one click.
      </p>
      <ul className={styles.miniTimeline} aria-label="Example timeline">
        {TIMELINE.map((item) => (
          <li key={item.date}>
            <time dateTime={item.date}>{item.label}</time>
            {item.task}
          </li>
        ))}
      </ul>
    </article>
  );
}

function VendorFeature() {
  return (
    <article className={styles.feature}>
      <h3>Vendor checklists</h3>
      <p>
        Every vendor you need, tracked from first call to booked, with the questions to ask before
        you pay an advance.
      </p>
      <ul className={styles.miniVendors} aria-label="Example vendors">
        {VENDORS.map((v) => (
          <li key={v.name}>
            <span>{v.name}</span>
            <span data-status={v.status}>{v.label}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function IdeasFeature() {
  return (
    <article className={`${styles.feature} ${styles.featureDark} ${styles.featureWide}`}>
      <h3>Personalized ideas</h3>
      <p>
        Themes, decor, menus, music and return gifts tuned to your traditions, vibe and budget, and
        grounded in what&rsquo;s local to your city with Google Search.
      </p>
      <ul className={styles.miniIdeas} aria-label="Example ideas">
        {IDEAS.map((idea) => (
          <li key={idea}>{idea}</li>
        ))}
      </ul>
    </article>
  );
}

/** The four parts of every plan the challenge asks for, each with a small example. */
export function Features() {
  return (
    <section className={styles.features} aria-labelledby="features-title">
      <div className="container">
        <h2 id="features-title" className={shared.sectionTitle}>
          Everything a celebration needs, in one living plan.
        </h2>
        <div className={styles.featureGrid}>
          <BudgetFeature />
          <TimelineFeature />
          <VendorFeature />
          <IdeasFeature />
        </div>
      </div>
    </section>
  );
}
