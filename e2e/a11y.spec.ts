import { createWeddingPlan, expectNoA11yViolations, test } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("landing page has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/");
  await expectNoA11yViolations(page);
});

test("brief wizard has no violations, including with errors showing", async ({ page }) => {
  await page.goto("/plan/new");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Continue to style" }).click();
  await expectNoA11yViolations(page);
});

test("every dashboard tab has no violations", async ({ page }) => {
  await createWeddingPlan(page);
  for (const tab of ["Budget", "Timeline", "Vendor checklist", "Ideas"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expectNoA11yViolations(page);
  }
});

test("my plans page has no violations", async ({ page }) => {
  await page.goto("/plans");
  await expectNoA11yViolations(page);
});
