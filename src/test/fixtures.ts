import { buildPlan } from "@/lib/domain/plan";
import type { Brief } from "@/lib/domain/schema";
import { fallbackDraft } from "@/lib/domain/templates";

export const weddingBrief: Brief = {
  type: "wedding",
  name: "Ananya & Rohan",
  date: "2027-02-14",
  city: "Hyderabad",
  guests: 300,
  budget: 2_500_000,
  currency: "INR",
  vibe: "Marigold and moonlight",
  traditions: ["Haldi", "Sangeet"],
  diet: "Veg + non-veg",
  language: "en",
};

export const weddingPlan = buildPlan(weddingBrief, fallbackDraft(weddingBrief), {
  id: "plan-1",
  today: "2026-10-20",
  now: new Date("2026-10-20T08:00:00Z"),
});

let ip = 0;
/** A JSON POST from a fresh client address, so rate limits don't leak between tests. */
export function postJson(body: unknown, address = `198.51.100.${++ip % 250}`): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": address },
    body: JSON.stringify(body),
  });
}

/** The item at `index`, failing the test with a clear message if the fixture is shorter. */
export function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Expected an item at index ${index}`);
  return item;
}
