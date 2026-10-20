import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

let client = 0;

/**
 * Each test acts as a different client address so the API's per-client rate limits (a real
 * security control) don't make tests interfere with each other.
 */
export const test = base.extend({
  page: async ({ page }, provide, testInfo) => {
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `198.51.100.${(testInfo.workerIndex * 50 + ++client) % 250}`,
    });
    await provide(page);
  },
});
export { expect };

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** Fills the brief through the UI and generates a plan (the server runs the mock planner). */
export async function createWeddingPlan(page: Page) {
  await page.goto("/plan/new");
  await page.getByRole("radio", { name: /Wedding/ }).check();
  await page.getByLabel("Event name").fill("Ananya and Rohan's wedding");
  await page.getByLabel("Date").fill(inDays(120));
  await page.getByLabel("City").fill("Hyderabad");
  await page.getByLabel("Guests").fill("300");
  await page.getByLabel("Total budget").fill("2500000");
  await page.getByRole("button", { name: "Continue to style" }).click();

  await page.getByRole("button", { name: "Haldi" }).click();
  await page.getByRole("button", { name: "Sangeet" }).click();
  await page.getByRole("button", { name: "Generate my plan" }).click();

  await page.waitForURL(/\/plan\/[\w-]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ananya and Rohan's wedding" }),
  ).toBeVisible();
}

/** Fails with a readable list of WCAG 2.2 AA violations, if any. */
export async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}
