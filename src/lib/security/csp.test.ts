import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  it("allows scripts only by nonce in production, never unsafe-inline or unsafe-eval", () => {
    const csp = buildCsp("abc123", { isDev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("blocks framing, plugins and foreign form posts", () => {
    const csp = buildCsp("n", { isDev: false });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it("allows the Firebase auth domain as a frame source when configured", () => {
    expect(buildCsp("n", { isDev: false, authDomain: "demo.firebaseapp.com" })).toContain(
      "https://demo.firebaseapp.com",
    );
  });

  it("relaxes only what React dev tooling needs in development", () => {
    const csp = buildCsp("n", { isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
