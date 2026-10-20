import { readFileSync } from "node:fs";
import { createWeddingPlan, expect, test } from "./helpers";

test("brief validation explains what is missing", async ({ page }) => {
  await page.goto("/plan/new");
  await page.getByRole("button", { name: "Continue to style" }).click();
  await expect(page.getByText("Give the celebration a name.")).toBeVisible();
  await expect(page.getByLabel("Event name")).toBeFocused();
  await page.getByLabel("Guests").fill("0");
  await page.getByRole("button", { name: "Continue to style" }).click();
  await expect(page.getByText("Enter the number of guests, from 1 to 5,000.")).toBeVisible();
});

test("generates a plan whose budget matches the brief exactly", async ({ page }) => {
  await createWeddingPlan(page);
  await expect(page.getByText("₹25,00,000").first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Budget" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Saved on this device")).toBeVisible();
});

test("overspending is flagged and the co-planner's fix applies only after approval", async ({
  page,
}) => {
  await createWeddingPlan(page);

  await page.getByLabel("Category", { exact: true }).selectOption({ label: "Decor" });
  await page.getByLabel("Amount (INR)").fill("400000");
  await page.getByRole("button", { name: "Log payment" }).click();
  const alert = page.getByText("Decor is over by ₹1,00,000.", { exact: true });
  await expect(alert).toBeVisible();

  await page.getByRole("button", { name: "Ask the co-planner to rebalance" }).click();
  const apply = page.getByRole("button", { name: "Apply change" });
  await expect(apply).toBeVisible();
  await expect(alert).toBeVisible(); // nothing changes until approved

  await apply.click();
  await expect(page.getByText("Applied. Your plan is updated.")).toBeVisible();
  await expect(alert).toHaveCount(0);
});

test("timeline tasks can be completed, added and exported to a calendar", async ({ page }) => {
  await createWeddingPlan(page);
  await page.getByRole("tab", { name: "Timeline" }).click();

  const first = page.getByRole("checkbox").first();
  await first.check();
  await expect(page.getByText(/^1\/\d+$/)).toBeVisible();

  await page.getByLabel("Task", { exact: true }).fill("Sangeet rehearsal");
  await page
    .getByLabel("Due")
    .fill(new Date(Date.now() + 100 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Added “Sangeet rehearsal”.")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download calendar (.ics)" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const ics = readFileSync((await download.path())!, "utf8");
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).toContain("SUMMARY:Sangeet rehearsal");
});

test("vendors can be booked with a quote", async ({ page }) => {
  await createWeddingPlan(page);
  await page.getByRole("tab", { name: "Vendor checklist" }).click();
  await page.getByLabel("Status").first().selectOption("booked");
  await page
    .getByLabel(/^Quote/)
    .first()
    .fill("650000");
  await page.getByRole("button", { name: "Save quote" }).first().click();
  await expect(page.getByText("Quote saved: ₹6,50,000.")).toBeVisible();
  await expect(page.getByText(/^1\/\d+$/)).toBeVisible(); // vendors booked stat
});

test("plans persist across reloads and appear in My plans", async ({ page }) => {
  await createWeddingPlan(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Ananya and Rohan's wedding" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My plans" }).click();
  await expect(page.getByRole("link", { name: /Ananya and Rohan's wedding/ })).toBeVisible();
});

test("an unknown plan id explains what to do next", async ({ page }) => {
  await page.goto("/plan/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This plan isn’t on this device." }),
  ).toBeVisible();
});
