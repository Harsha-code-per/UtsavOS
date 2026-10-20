import { expect, test } from "./helpers";

test("tells visitors what UtsavOS does and covers every part of the brief", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Every celebration/);
  for (const feature of ["Budgets", "Timelines", "Vendor checklists", "Personalized ideas"]) {
    await expect(page.getByRole("heading", { level: 3, name: feature })).toBeVisible();
  }
});

test("turns a one-line description into a filled brief", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Describe your celebration").fill("Beti ka pehla birthday, Pune, 60 log");
  await page.getByRole("button", { name: "Draft my plan" }).click();

  await page.waitForURL("**/plan/new**");
  await expect(page.getByText(/Filled \d+ fields from your description/)).toBeVisible();
  await expect(page.getByLabel("City")).toHaveValue("Pune");
  await expect(page.getByLabel("Guests")).toHaveValue("60");
  // The description travels via sessionStorage, never the URL.
  expect(page.url()).not.toContain("Pune");
});

test("is fully usable from the keyboard: skip link lands on the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
