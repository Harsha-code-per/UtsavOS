import styles from "./CoPlannerShowcase.module.css";
import shared from "./landing.module.css";

/** An example co-planner conversation, in English and Hindi. */
export function CoPlannerShowcase() {
  return (
    <section id="coplanner" className={styles.coplanner} aria-labelledby="co-title">
      <div className={`container ${styles.coInner}`}>
        <div>
          <h2 id="co-title" className={shared.sectionTitle}>
            A co-planner that edits the plan, not just the chat.
          </h2>
          <p className={styles.coLead}>
            Ask in your own language. It reads your whole plan, proposes specific changes, and
            applies them only when you say yes.
          </p>
        </div>
        <div className={styles.chat} aria-label="Example conversation">
          <p className={styles.you}>
            Decor is ₹40,000 over. Can we fix it without touching catering?
          </p>
          <div className={styles.them}>
            <p>
              Take ₹25,000 from entertainment and ₹15,000 from contingency. Catering stays at ₹7.5
              lakh.
            </p>
            <ul className={styles.proposal}>
              <li>Move ₹25,000 from Entertainment to Decor</li>
              <li>Move ₹15,000 from Contingency to Decor</li>
            </ul>
          </div>
          <p className={styles.you} lang="hi">
            संगीत के लिए कुछ गाने सुझाओ
          </p>
          <p className={styles.them} lang="hi">
            दूल्हा-दुल्हन की एंट्री के लिए एक धीमा गाना, फिर परिवार के डांस के लिए तेज़ बीट वाले
            गाने। संगीत रिहर्सल को टाइमलाइन में जोड़ दूँ?
          </p>
        </div>
      </div>
    </section>
  );
}
