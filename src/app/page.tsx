import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Toran } from "@/components/brand/Toran";
import { HeroBrief } from "@/components/landing/HeroBrief";
import { LandingMotion } from "@/components/landing/LandingMotion";
import styles from "./page.module.css";

const DEMO = [
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

const DEMO_FIELDS = [
  { field: "type", label: "Celebration", value: "Wedding" },
  { field: "guests", label: "Guests", value: "300" },
  { field: "city", label: "City", value: "Hyderabad" },
  { field: "date", label: "Date", value: "February 2027" },
  { field: "budget", label: "Budget", value: "₹25,00,000" },
  { field: "traditions", label: "Traditions", value: "Haldi, Sangeet" },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.night}>
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

        <main id="main">
          <section className={`container ${styles.hero}`} aria-labelledby="hero-title">
            <p className={styles.watermark} aria-hidden="true" lang="hi">
              उत्सव
            </p>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>An AI celebration planner, powered by Gemini</p>
              <h1 id="hero-title" className={styles.title}>
                <span className={styles.line}>
                  <span>Every celebration,</span>
                </span>
                <span className={styles.line}>
                  <span>beautifully</span>
                </span>
                <span className={styles.line}>
                  <span>choreographed.</span>
                </span>
              </h1>
              <p className={styles.lead}>
                Weddings, birthdays and community events. Describe yours in a sentence and UtsavOS
                drafts the budget, timeline, vendor checklist and ideas, then refines them with you,
                in your language.
              </p>
              <HeroBrief />
            </div>

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
                  <circle
                    cx="66"
                    cy="66"
                    r="54"
                    className={styles.donutInk}
                    strokeDasharray="102 238"
                    transform="rotate(-90 66 66)"
                  />
                  <circle
                    cx="66"
                    cy="66"
                    r="54"
                    className={styles.donutSindoor}
                    strokeDasharray="95 245"
                    strokeDashoffset="-102"
                    transform="rotate(-90 66 66)"
                  />
                  <circle
                    cx="66"
                    cy="66"
                    r="54"
                    className={styles.donutMarigold}
                    strokeDasharray="41 299"
                    strokeDashoffset="-197"
                    transform="rotate(-90 66 66)"
                  />
                  <text x="66" y="74" textAnchor="middle" className={styles.donutLabel}>
                    ₹25L
                  </text>
                </svg>
                <dl className={styles.legend}>
                  <div data-swatch="ink">
                    <dt>Catering</dt>
                    <dd>₹7.5L</dd>
                  </div>
                  <div data-swatch="sindoor">
                    <dt>Venue</dt>
                    <dd>₹7L</dd>
                  </div>
                  <div data-swatch="marigold">
                    <dt>Decor</dt>
                    <dd>₹3L</dd>
                  </div>
                  <div data-swatch="track">
                    <dt>Everything else</dt>
                    <dd>₹7.5L</dd>
                  </div>
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
          </section>

          <section className={styles.demo} aria-labelledby="demo-title" data-demo="">
            <div className={`container ${styles.demoInner}`}>
              <h2 id="demo-title" className={styles.demoTitle}>
                One sentence holds a whole brief.
              </h2>
              <p className={styles.demoLead}>
                Write it the way you&rsquo;d tell a friend, in English, Hindi or Hinglish. Gemini
                picks out the details and fills in your plan&rsquo;s starting point.
              </p>
              <p className={styles.sentence}>
                {DEMO.map((part, i) =>
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
                {DEMO_FIELDS.map((f) => (
                  <div key={f.field} data-field={f.field}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </main>
      </div>

      <section className={styles.features} aria-labelledby="features-title">
        <div className="container">
          <h2 id="features-title" className={styles.sectionTitle}>
            Everything a celebration needs, in one living plan.
          </h2>
          <div className={styles.featureGrid}>
            <article className={`${styles.feature} ${styles.featureWide}`}>
              <h3>Budgets</h3>
              <p>
                A split sized to your guest count, city and traditions. Log what you spend and
                overruns show up at once, with a rebalance one question away.
              </p>
              <ul className={styles.miniBudget} aria-label="Example budget lines">
                {[
                  { name: "Venue", used: 93, note: "93% used" },
                  { name: "Catering", used: 27, note: "27% used" },
                  { name: "Decor", used: 100, note: "Over by ₹40,000", over: true },
                ].map((line) => (
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
            <article className={styles.feature}>
              <h3>Timelines</h3>
              <p>
                Tasks counted back from your date, plus a run sheet for the day itself. Send it all
                to Google Calendar in one click.
              </p>
              <ul className={styles.miniTimeline} aria-label="Example timeline">
                <li>
                  <time dateTime="2026-11-14">14 Nov</time>Send invitations
                </li>
                <li>
                  <time dateTime="2027-01-31">31 Jan</time>Final headcount to caterer
                </li>
                <li>
                  <time dateTime="2027-02-14">14 Feb</time>Pheras at 18:30
                </li>
              </ul>
            </article>
            <article className={styles.feature}>
              <h3>Vendor checklists</h3>
              <p>
                Every vendor you need, tracked from first call to booked, with the questions to ask
                before you pay an advance.
              </p>
              <ul className={styles.miniVendors} aria-label="Example vendors">
                <li>
                  <span>Photography</span>
                  <span data-status="booked">Booked</span>
                </li>
                <li>
                  <span>Decor</span>
                  <span data-status="contacted">Contacted</span>
                </li>
                <li>
                  <span>Mehendi artist</span>
                  <span data-status="todo">To do</span>
                </li>
              </ul>
            </article>
            <article className={`${styles.feature} ${styles.featureDark} ${styles.featureWide}`}>
              <h3>Personalized ideas</h3>
              <p>
                Themes, decor, menus, music and return gifts tuned to your traditions, vibe and
                budget, and grounded in what&rsquo;s local to your city with Google Search.
              </p>
              <ul className={styles.miniIdeas} aria-label="Example ideas">
                <li>Marigold &amp; moonlight mandap</li>
                <li>Irani chai counter at the sangeet</li>
                <li>Seed-paper thank-you cards</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="how" className={styles.how} aria-labelledby="how-title">
        <div className={`container ${styles.howInner}`}>
          <h2 id="how-title" className={styles.sectionTitle}>
            From a sentence to a plan you can run.
          </h2>
          <ol className={styles.steps}>
            <li>
              <h3>Describe it</h3>
              <p>Type your idea in any of ten languages, or fill in the brief yourself.</p>
            </li>
            <li>
              <h3>Get a full draft</h3>
              <p>Budget, timeline, vendors and ideas arrive together, shaped by your details.</p>
            </li>
            <li>
              <h3>Refine it together</h3>
              <p>Ask the co-planner to move money or add a task. You approve every change.</p>
            </li>
            <li>
              <h3>Run the day</h3>
              <p>Export the timeline to Google Calendar and share the run sheet with family.</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="coplanner" className={styles.coplanner} aria-labelledby="co-title">
        <div className={`container ${styles.coInner}`}>
          <div>
            <h2 id="co-title" className={styles.sectionTitle}>
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

      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={`container ${styles.ctaInner}`}>
          <h2 id="cta-title">Your next celebration starts with one sentence.</h2>
          <Link href="/plan/new" className="btn btn-ink">
            Plan a celebration
          </Link>
        </div>
      </section>

      <footer className={`container ${styles.footer}`}>
        <p>UtsavOS, built with Gemini, Firebase and Next.js for PromptWars Virtual.</p>
        <p>Plans stay on your device until you sign in. Then only you can read them.</p>
      </footer>
      <LandingMotion />
    </div>
  );
}
