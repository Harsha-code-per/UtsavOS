import type { Milestone } from "./schema";
import { slugify } from "./slug";

const DAY_MS = 86_400_000;

// ISO calendar dates are handled in UTC so DST and the server's timezone never shift a day.
const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The person's own calendar date (in the browser), which the server accepts within a day of its own. */
export const localToday = () => new Date().toLocaleDateString("en-CA");

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * DAY_MS);
}

export function daysUntil(iso: string, today: string): number {
  return Math.round((toUtc(iso) - toUtc(today)) / DAY_MS);
}

export interface MilestoneDraft {
  title: string;
  daysBefore: number;
}

/** Dates Gemini's "N days before" milestones, clamped to [today, event day], earliest first. */
export function scheduleMilestones(
  eventDate: string,
  today: string,
  drafts: MilestoneDraft[],
): Milestone[] {
  const seen = new Map<string, number>();
  const latestStart = today < eventDate ? today : eventDate;

  const milestones = drafts.map(({ title, daysBefore }) => {
    let due = addDays(eventDate, -Math.max(0, Math.round(daysBefore)));
    if (due < latestStart) due = latestStart;

    const base = slugify(title) || "task";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;

    return { id, title: title.trim(), due, done: false };
  });

  // Array.prototype.sort is stable, so same-day milestones keep the model's order.
  return milestones.sort((a, b) => a.due.localeCompare(b.due));
}

/** The client's local date (it may be a day ahead or behind UTC), if it is plausible. */
export function trustedToday(clientToday: string | undefined, now: Date = new Date()): string {
  const serverToday = now.toISOString().slice(0, 10);
  if (clientToday && Math.abs(daysUntil(clientToday, serverToday)) <= 1) return clientToday;
  return serverToday;
}
