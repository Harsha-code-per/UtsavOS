import { expect, test } from "./helpers";

test("pages ship a nonce-based CSP and hardening headers", async ({ request }) => {
  const res = await request.get("/");
  const headers = res.headers();
  expect(headers["content-security-policy"]).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  );
  expect(headers["content-security-policy"]).not.toContain("unsafe-inline");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("each request gets a fresh nonce", async ({ request }) => {
  const nonce = async () =>
    (await request.get("/")).headers()["content-security-policy"]?.match(/nonce-([^']+)/)?.[1];
  expect(await nonce()).not.toBe(await nonce());
});

test("AI endpoints reject malformed input", async ({ request }) => {
  const res = await request.post("/api/plan", { data: { brief: { guests: -1 } } });
  expect(res.status()).toBe(400);
  const notJson = await request.post("/api/plan", {
    headers: { "content-type": "text/plain" },
    data: "hello",
  });
  expect(notJson.status()).toBe(415);
});

test("no console errors or CSP violations on the main flow pages", async ({ page }) => {
  const problems: string[] = [];
  // Only our own origin counts: third-party frames (Firebase's auth helper) log their own noise.
  const ours = (url: string) => url === "" || url.startsWith(new URL(page.url()).origin);
  page.on("console", (m) => {
    if (m.type() === "error" && ours(m.location().url)) problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  // Some blocked actions (like a library's guarded eval probe) never reach the console.
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  for (const path of ["/", "/plan/new", "/plans"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(problems).toEqual([]);
});
