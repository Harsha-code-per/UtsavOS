import styles from "./Toran.module.css";

const WIDTH = 1200;
const SEGMENTS = 4;
const SPAN = WIDTH / SEGMENTS;
const TOP = 12;
const SAG = 64;

// Point on segment k's quadratic swag at t (0..1).
function swag(k: number, t: number) {
  const x0 = k * SPAN;
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * (x0 + SPAN / 2) + t * t * (x0 + SPAN),
    y: u * u * TOP + 2 * u * t * (TOP + SAG) + t * t * TOP,
  };
}

const string = Array.from(
  { length: SEGMENTS },
  (_, k) => `Q${k * SPAN + SPAN / 2} ${TOP + SAG} ${(k + 1) * SPAN} ${TOP}`,
).join(" ");

// Flowers along each swag, plus a short hanging strand at every hook between swags.
const flowers = [
  ...Array.from({ length: SEGMENTS }, (_, k) =>
    [0.14, 0.32, 0.5, 0.68, 0.86].map((t) => ({ ...swag(k, t), r: 9 })),
  ).flat(),
  ...Array.from({ length: SEGMENTS - 1 }, (_, k) => {
    const x = (k + 1) * SPAN;
    return [22, 42, 62].map((dy, i) => ({ x, y: TOP + dy, r: 8 - i }));
  }).flat(),
].sort((a, b) => a.x - b.x);

export const TORAN_FLOWERS = flowers.length;

interface Props {
  /** How many flowers are lit, left to right. Omit for a fully lit garland. */
  lit?: number;
  /** Play the unfurl sequence on first paint (CSS only, skipped for reduced motion). */
  unfurl?: boolean;
  className?: string;
}

/** The marigold toran: UtsavOS's signature, and its progress indicator while planning. */
export function Toran({ lit = flowers.length, unfurl = false, className }: Props) {
  return (
    <svg
      className={`${styles.toran} ${className ?? ""}`}
      viewBox={`0 0 ${WIDTH} 110`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      data-unfurl={unfurl ? "" : undefined}
    >
      <path className={styles.string} d={`M0 ${TOP} ${string}`} pathLength={1} />
      {Array.from({ length: SEGMENTS + 1 }, (_, k) => (
        <g key={k} className={styles.leaves} transform={`translate(${k * SPAN} ${TOP})`}>
          <path d="M0 0 C -14 6 -18 18 -10 26 C -4 16 -2 8 0 0Z" />
          <path d="M0 0 C 14 6 18 18 10 26 C 4 16 2 8 0 0Z" />
        </g>
      ))}
      <g className={styles.flowers}>
        {flowers.map((f, i) => (
          <g
            key={i}
            className={styles.flower}
            data-lit={i < lit ? "" : undefined}
            data-tone={i % 3 === 1 ? "sindoor" : "marigold"}
            transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})`}
          >
            <circle className={styles.ruffle} r={f.r} />
            <circle className={styles.petals} r={f.r - 2.5} />
            <circle className={styles.core} r={f.r / 3} />
          </g>
        ))}
      </g>
    </svg>
  );
}
