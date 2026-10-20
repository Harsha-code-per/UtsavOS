import styles from "./PlanPreview.module.css";

const LEGEND = [
  { swatch: "ink", label: "Catering", amount: "₹7.5L" },
  { swatch: "sindoor", label: "Venue", amount: "₹7L" },
  { swatch: "marigold", label: "Decor", amount: "₹3L" },
  { swatch: "track", label: "Everything else", amount: "₹7.5L" },
];

// Donut segments as [class, dash length, offset] on a circle of circumference ~340.
const SEGMENTS = [
  [styles.donutInk, "102 238", "0"],
  [styles.donutSindoor, "95 245", "-102"],
  [styles.donutMarigold, "41 299", "-197"],
] as const;

/** A tilted example plan card: budget split and the next few tasks. */
export function PlanPreview() {
  return (
    <aside className={styles.preview} aria-label="Example of a drafted plan">
      <div className={styles.previewHead}>
        <div>
          <p className={styles.previewMeta}>Wedding in Hyderabad</p>
          <p className={styles.previewTitle}>Ananya &amp; Rohan</p>
        </div>
        <p className={styles.countdown}>
          <strong>117</strong> days to go
        </p>
      </div>
      <div className={styles.previewBudget}>
        <svg
          viewBox="0 0 132 132"
          className={styles.donut}
          role="img"
          aria-label="Budget split: catering 30%, venue 28%, decor 12%, everything else 30%"
        >
          <circle cx="66" cy="66" r="54" className={styles.donutTrack} />
          {SEGMENTS.map(([className, dash, offset]) => (
            <circle
              key={className}
              cx="66"
              cy="66"
              r="54"
              className={className}
              strokeDasharray={dash}
              strokeDashoffset={offset}
              transform="rotate(-90 66 66)"
            />
          ))}
          <text x="66" y="74" textAnchor="middle" className={styles.donutLabel}>
            ₹25L
          </text>
        </svg>
        <dl className={styles.legend}>
          {LEGEND.map((item) => (
            <div key={item.label} data-swatch={item.swatch}>
              <dt>{item.label}</dt>
              <dd>{item.amount}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ol className={styles.previewTasks}>
        <li data-state="done">
          Book the venue<span>Done</span>
        </li>
        <li data-state="due">
          Caterer tasting, 3 shortlisted<span>This week</span>
        </li>
        <li>
          Book the mehendi artist<span>December</span>
        </li>
      </ol>
      <p className={styles.previewFoot}>Drafted by Gemini, edited by you</p>
    </aside>
  );
}
