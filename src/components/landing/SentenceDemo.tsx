import styles from "./SentenceDemo.module.css";

// The sentence, split into plain text and the details Gemini picks out (`field`).
const SENTENCE = [
  { text: "A ", field: null },
  { text: "300-guest", field: "guests" },
  { text: " ", field: null },
  { text: "Telugu wedding", field: "type" },
  { text: " in ", field: null },
  { text: "Hyderabad", field: "city" },
  { text: " ", field: null },
  { text: "next February", field: "date" },
  { text: ", ", field: null },
  { text: "₹25 lakh", field: "budget" },
  { text: ", with ", field: null },
  { text: "haldi and sangeet", field: "traditions" },
  { text: ".", field: null },
] as const;

const BRIEF = [
  { field: "type", label: "Celebration", value: "Wedding" },
  { field: "guests", label: "Guests", value: "300" },
  { field: "city", label: "City", value: "Hyderabad" },
  { field: "date", label: "Date", value: "February 2027" },
  { field: "budget", label: "Budget", value: "₹25,00,000" },
  { field: "traditions", label: "Traditions", value: "Haldi, Sangeet" },
];

/**
 * A sentence and the brief Gemini reads from it. LandingMotion scrubs the highlight on scroll;
 * without it (or with reduced motion) the finished state shows.
 */
export function SentenceDemo() {
  return (
    <section className={styles.demo} aria-labelledby="demo-title" data-demo="">
      <div className={`container ${styles.demoInner}`}>
        <h2 id="demo-title" className={styles.demoTitle}>
          One sentence holds a whole brief.
        </h2>
        <p className={styles.demoLead}>
          Write it the way you&rsquo;d tell a friend, in English, Hindi or Hinglish. Gemini picks
          out the details and fills in your plan&rsquo;s starting point.
        </p>
        <p className={styles.sentence}>
          {SENTENCE.map((part, i) =>
            part.field ? (
              <mark key={i} data-token={part.field}>
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
        <dl className={styles.fields}>
          {BRIEF.map((f) => (
            <div key={f.field} data-field={f.field}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
